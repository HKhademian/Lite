// Disposable igniter: no JS eval, emitted JavaScript, or compiler framework.
export type Position = Readonly<{ line: number; column: number }>;
type Token = Readonly<{ kind: 'id' | 'number' | 'string' | 'symbol' | 'eof'; text: string; at: Position }>;
type Operator = '+' | '-' | '*' | '/';
type Type = 'Int' | 'Float' | 'String' | 'Bool' | 'Unit';
type Comparison = '==' | '=!=' | '<' | '<!' | '<=' | '<!=' | '>' | '>!' | '>=' | '>!=';
type Use = 'value' | 'discard';
export type Value =
  | Readonly<{ kind: 'Int'; value: bigint }>
  | Readonly<{ kind: 'Float'; value: number }>
  | Readonly<{ kind: 'String'; value: string }>
  | Readonly<{ kind: 'Bool'; value: boolean }>
  | Readonly<{ kind: 'Unit' }>;
type Builtin = 'inputInt' | 'inputFloat' | 'inputLine' | 'inputWord' | 'report' | 'reportError' | 'exit';
type Raw = Readonly<{ at: Position }> & (
  | { kind: 'number'; text: string }
  | { kind: 'string'; text: string }
  | { kind: 'name'; name: string }
  | { kind: 'unit' }
  | { kind: 'bool'; value: boolean }
  | { kind: 'boolLeader'; input: Raw }
  | { kind: 'unary'; op: '+' | '-' | 'not'; input: Raw }
  | { kind: 'binary'; op: Operator; left: Raw; right: Raw }
  | { kind: 'logic'; op: 'and' | 'or'; left: Raw; right: Raw }
  | { kind: 'compare'; first: Raw; rest: readonly Readonly<{ op: Comparison; right: Raw }>[] }
  | { kind: 'block'; items: readonly RawItem[] }
  | { kind: 'if'; condition: Raw; body: Raw; otherwise: Raw | undefined }
  | { kind: 'loop'; condition: Raw | undefined; body: Raw }
  | { kind: 'loopExit'; op: 'break' | 'continue' }
  | { kind: 'call'; name: string; args: readonly Raw[] }
);
type RawItem = Readonly<{ at: Position }> & (
  | { kind: 'declare'; name: string; mutable: boolean; input: Raw }
  | { kind: 'assign'; name: string; input: Raw }
  | { kind: 'expression'; input: Raw }
);
type Binding = Readonly<{ slot: number; name: string; type: Type; mutable: boolean }>;
type Expr = Readonly<{ at: Position; type: Type }> & (
  | { kind: 'literal'; value: Value }
  | { kind: 'read'; binding: Binding }
  | { kind: 'unary'; op: '+' | '-' | 'not'; input: Expr }
  | { kind: 'binary'; op: Operator; left: Expr; right: Expr }
  | { kind: 'logic'; op: 'and' | 'or'; left: Expr; right: Expr }
  | { kind: 'compare'; first: Expr; rest: readonly Readonly<{ op: Comparison; right: Expr }>[] }
  | { kind: 'block'; block: Block }
  | { kind: 'if'; condition: Expr; body: Expr; otherwise: Expr | undefined }
  | { kind: 'loop'; condition: Expr | undefined; body: Expr }
  | { kind: 'loopExit'; op: 'break' | 'continue' }
  | { kind: 'call'; name: Builtin; args: readonly Expr[] }
);
type Item =
  | Readonly<{ kind: 'store'; binding: Binding; input: Expr }>
  | Readonly<{ kind: 'expression'; input: Expr }>;
type Block = Readonly<{ items: readonly Item[]; type: Type }>;
export type Program = Readonly<{ items: readonly Item[] }>;
export type IO = Readonly<{
  read: () => string | null;
  report: (text: string) => void;
  reportError: (text: string) => void;
}>;
const MIN = -(1n << 63n);
const MAX = (1n << 63n) - 1n;
const UNIT: Value = { kind: 'Unit' };
const NUMBER = /^(?:[0-9]+(?:\.[0-9]+)?)(?:[eE][+-]?[0-9]+)?/;
const INPUT_NUMBER = /^[+-]?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;
const INPUT_INTEGER = /^[+-]?[0-9]+$/;
const SPACE = /^[ \t\n\r\f\v]$/;
const KEYWORDS = new Set(['var', 'true', 'false', 'if', 'else', 'and', 'or', 'not',
  'fn', 'loop', 'break', 'continue', 'return', 'mut', 'import', 'using', 'record', 'type', 'then', 'finally']);

export class LiteFault extends Error {
  readonly at: Position;
  readonly category: 'SourceError' | 'TypeError' | 'InputFault' | 'ArithmeticPanic';
  constructor(category: LiteFault['category'], message: string, at: Position) {
    super(message);
    this.name = category;
    this.category = category;
    this.at = at;
  }
}
class EndRun extends Error {
  readonly code: number;
  constructor(code: number) { super('explicit exit'); this.code = code; }
}
class LoopTransfer extends Error {
  readonly op: 'break' | 'continue';
  constructor(op: 'break' | 'continue') { super(op); this.op = op; }
}
function unreachable(value: never): never { throw new Error(`igniter invariant: ${String(value)}`); }
function source(message: string, at: Position): never { throw new LiteFault('SourceError', message, at); }
function typeError(message: string, at: Position): never { throw new LiteFault('TypeError', message, at); }
function integer(value: bigint, at: Position, literal = false): Value {
  if (value < MIN || value > MAX) {
    throw new LiteFault(literal ? 'SourceError' : 'ArithmeticPanic', 'integer outside signed 64-bit range', at);
  }
  return { kind: 'Int', value };
}
function floating(value: number, at: Position, literal = false): Value {
  if (!Number.isFinite(value)) {
    throw new LiteFault(literal ? 'SourceError' : 'ArithmeticPanic', 'non-finite floating value', at);
  }
  return { kind: 'Float', value };
}
function builtin(name: string): Builtin | undefined {
  switch (name) {
    case 'inputInt': case 'inputFloat': case 'inputLine': case 'inputWord':
    case 'report': case 'reportError': case 'exit': return name;
    default: return undefined;
  }
}
function comparison(text: string): Comparison | undefined {
  switch (text) {
    case '==': case '=!=': case '<': case '<!': case '<=': case '<!=':
    case '>': case '>!': case '>=': case '>!=': return text;
    default: return undefined;
  }
}

function tokenize(text: string): readonly Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;
  const at = (): Position => ({ line, column });
  const advance = (count = 1): void => {
    for (let n = 0; n < count; n++) {
      if (text[offset] === '\n') { line++; column = 1; } else { column++; }
      offset++;
    }
  };
  const comment = (): void => {
    const start = at();
    let depth = 0;
    do {
      if (text.startsWith('/*', offset)) {
        advance(2);
        let hashes = 0;
        while (text[offset] === '#') { hashes++; advance(); }
        if (hashes > 0) {
          const close = '#'.repeat(hashes) + '*/';
          while (offset < text.length && !(text.startsWith(close, offset) && text[offset - 1] !== '#')) advance();
          if (offset === text.length) source('unterminated raw comment', start);
          advance(close.length);
        } else { depth++; }
      } else if (text.startsWith('*/', offset)) { advance(2); depth--; }
      else if (offset === text.length) { source('unterminated comment', start); }
      else { advance(); }
    } while (depth > 0);
  };
  while (offset < text.length) {
    const ch = text[offset];
    if (ch === undefined) throw new Error('igniter invariant: missing source character');
    if (/\s/u.test(ch)) { advance(); continue; }
    if (text.startsWith('/*', offset)) { comment(); continue; }
    const start = at();
    if (ch === '"') {
      advance();
      let value = '';
      while (offset < text.length && text[offset] !== '"') {
        const current = text[offset];
        if (current === undefined) source('unterminated string', start);
        if (current === '\\') {
          advance();
          switch (text[offset]) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            case '"': value += '"'; break;
            case '\\': value += '\\'; break;
            default: source('unsupported or incomplete string escape', at());
          }
        } else { value += current; }
        advance();
      }
      if (text[offset] !== '"') source('unterminated string', start);
      advance();
      tokens.push({ kind: 'string', text: value, at: start });
    } else if (/[0-9]/.test(ch)) {
      const match = NUMBER.exec(text.slice(offset));
      const spelling = match?.[0];
      if (spelling === undefined) source('invalid number', start);
      advance(spelling.length);
      tokens.push({ kind: 'number', text: spelling, at: start });
    } else if (/[_\p{ID_Start}]/u.test(ch)) {
      const begin = offset;
      do { advance(); } while (offset < text.length && /[_\p{ID_Continue}]/u.test(text[offset] ?? ''));
      tokens.push({ kind: 'id', text: text.slice(begin, offset), at: start });
    } else {
      const operator = ['=!=', '>!=', '<!=', ':=', '+=', '-=', '*=', '/=', '==', '**', '_/', '_%',
        '>=', '<=', '>!', '<!'].find(candidate => text.startsWith(candidate, offset));
      if (operator !== undefined) {
        advance(operator.length);
        tokens.push({ kind: 'symbol', text: operator, at: start });
      } else if ('+-*/=();,{}<>'.includes(ch)) {
        advance();
        tokens.push({ kind: 'symbol', text: ch, at: start });
      } else { source(`unsupported token ${JSON.stringify(ch)}`, start); }
    }
  }
  tokens.push({ kind: 'eof', text: '', at: at() });
  return tokens;
}

class Parser {
  readonly tokens: readonly Token[];
  index = 0;
  constructor(tokens: readonly Token[]) { this.tokens = tokens; }
  peek(distance = 0): Token {
    const token = this.tokens[this.index + distance];
    if (token === undefined) throw new Error('igniter invariant: token past EOF');
    return token;
  }
  take(): Token { const token = this.peek(); this.index++; return token; }
  accept(text: string): boolean {
    const token = this.peek();
    if (token.kind !== (/^[a-z]+$/.test(text) ? 'id' : 'symbol') || token.text !== text) return false;
    this.take(); return true;
  }
  expect(text: string): void {
    if (!this.accept(text)) source(`expected ${JSON.stringify(text)}`, this.peek().at);
  }
  parse(close = false): readonly RawItem[] {
    const items: RawItem[] = [];
    while (this.peek().kind !== 'eof') {
      if (close && this.peek().kind === 'symbol' && this.peek().text === '}') break;
      if (this.accept(';')) continue;
      const start = this.peek();
      if (this.accept('var')) {
        const name = this.take();
        if (name.kind !== 'id') source('expected binding name after var', name.at);
        this.expect(':=');
        items.push({ kind: 'declare', name: name.text, mutable: true, input: this.expression(), at: start.at });
      } else if (start.kind === 'id' && [':=', '='].includes(this.peek(1).text)) {
        this.take();
        const op = this.take();
        const input = this.expression();
        items.push(op.text === ':='
          ? { kind: 'declare', name: start.text, mutable: false, input, at: start.at }
          : { kind: 'assign', name: start.text, input, at: start.at });
      } else { items.push({ kind: 'expression', input: this.expression(), at: start.at }); }
      const previous = this.tokens[this.index - 1];
      const endedBlock = previous?.kind === 'symbol' && previous.text === '}';
      const atClose = close && this.peek().kind === 'symbol' && this.peek().text === '}';
      if (this.peek().kind !== 'eof' && !atClose && !endedBlock) this.expect(';');
    }
    return items;
  }
  expression(minimum = 0): Raw {
    let leader: Token | undefined;
    if (minimum === 0 && this.peek().kind === 'id' && ['and', 'or'].includes(this.peek().text)) {
      leader = this.take(); // One optional presentation leader; still requires Bool.
    }
    let left = this.prefix();
    while (true) {
      const previous = this.tokens[this.index - 1];
      if (previous?.kind === 'symbol' && previous.text === '}') break;
      const token = this.peek();
      const op = token.text;
      if (token.kind === 'id' && (op === 'and' || op === 'or')) {
        const precedence = op === 'or' ? 1 : 2;
        if (precedence < minimum) break;
        this.take();
        left = { kind: 'logic', op, left, right: this.expression(precedence + 1), at: token.at };
        continue;
      }
      if (token.kind !== 'symbol') break;
      if (comparison(op) !== undefined) {
        if (4 < minimum) break;
        const rest: Readonly<{ op: Comparison; right: Raw }>[] = [];
        while (this.peek().kind === 'symbol') {
          const previous = this.tokens[this.index - 1];
          if (previous?.kind === 'symbol' && previous.text === '}') break;
          const next = this.peek();
          const compare = comparison(next.text);
          if (compare === undefined) break;
          this.take();
          rest.push({ op: compare, right: this.expression(5) });
        }
        left = { kind: 'compare', first: left, rest, at: token.at };
        continue;
      }
      if (op !== '+' && op !== '-' && op !== '*' && op !== '/') break;
      const precedence = op === '+' || op === '-' ? 5 : 6;
      if (precedence < minimum) break;
      this.take();
      left = { kind: 'binary', op, left, right: this.expression(precedence + 1), at: token.at };
    }
    return leader === undefined ? left : { kind: 'boolLeader', input: left, at: leader.at };
  }
  prefix(): Raw {
    const token = this.take();
    if (token.kind === 'symbol' && (token.text === '+' || token.text === '-')) {
      return { kind: 'unary', op: token.text, input: this.prefix(), at: token.at };
    }
    if (token.kind === 'number') return { kind: 'number', text: token.text, at: token.at };
    if (token.kind === 'string') {
      let text = token.text;
      while (this.peek().kind === 'string') text += this.take().text;
      return { kind: 'string', text, at: token.at };
    }
    if (token.kind === 'symbol' && token.text === '(') {
      if (this.accept(')')) return { kind: 'unit', at: token.at };
      const value = this.expression(); this.expect(')'); return value;
    }
    if (token.kind === 'symbol' && token.text === '{') {
      const items = this.parse(true); this.expect('}');
      return { kind: 'block', items, at: token.at };
    }
    if (token.kind === 'id') {
      if (token.text === 'true' || token.text === 'false') return { kind: 'bool', value: token.text === 'true', at: token.at };
      if (token.text === 'not') return { kind: 'unary', op: 'not', input: this.expression(3), at: token.at };
      if (token.text === 'break' || token.text === 'continue') {
        return { kind: 'loopExit', op: token.text, at: token.at };
      }
      if (token.text === 'loop') {
        const next = this.peek();
        const condition = next.kind === 'symbol' && next.text === '{' ? undefined : this.expression();
        if (this.peek().kind !== 'symbol' || this.peek().text !== '{') source('loop requires a braced body', this.peek().at);
        return { kind: 'loop', condition, body: this.prefix(), at: token.at };
      }
      if (token.text === 'if') {
        const condition = this.expression();
        if (this.peek().kind !== 'symbol' || this.peek().text !== '{') source('if requires a braced body', this.peek().at);
        const body = this.prefix();
        let otherwise: Raw | undefined;
        if (this.accept('else')) {
          const next = this.peek();
          if (!((next.kind === 'symbol' && next.text === '{') || (next.kind === 'id' && next.text === 'if'))) {
            source('else requires a braced body or else if', next.at);
          }
          otherwise = this.prefix();
        }
        return { kind: 'if', condition, body, otherwise, at: token.at };
      }
      if (['fn', 'return', 'mut', 'import', 'using', 'record', 'type', 'and', 'or', 'else', 'then', 'finally'].includes(token.text)) {
        source(`${token.text} is not supported by this igniter yet`, token.at);
      }
      if (!this.accept('(')) return { kind: 'name', name: token.text, at: token.at };
      const args: Raw[] = [];
      if (!this.accept(')')) {
        do { args.push(this.expression()); } while (this.accept(',') && this.peek().text !== ')');
        this.expect(')');
      }
      return { kind: 'call', name: token.text, args, at: token.at };
    }
    return source('expected expression (or unsupported feature)', token.at);
  }
}

function numericLiteral(text: string, at: Position): Value {
  return /[.eE]/.test(text) ? floating(Number(text), at, true) : integer(BigInt(text), at, true);
}
type CheckState = { nextSlot: number; loopDepth: number };
function checkExpression(raw: Raw, names: ReadonlyMap<string, Binding>, state: CheckState, use: Use = 'value'): Expr {
  const at = raw.at;
  switch (raw.kind) {
    case 'number': {
      const value = numericLiteral(raw.text, at);
      return { kind: 'literal', value, type: value.kind, at };
    }
    case 'string': return { kind: 'literal', value: { kind: 'String', value: raw.text }, type: 'String', at };
    case 'bool': return { kind: 'literal', value: { kind: 'Bool', value: raw.value }, type: 'Bool', at };
    case 'boolLeader': {
      const input = checkExpression(raw.input, names, state);
      if (input.type !== 'Bool') typeError('a leading and/or expression must be Bool', at);
      return input;
    }
    case 'unit': return { kind: 'literal', value: UNIT, type: 'Unit', at };
    case 'block': {
      const block = checkBlock(raw.items, names, state, use);
      return { kind: 'block', block, type: block.type, at };
    }
    case 'if': {
      const condition = checkExpression(raw.condition, names, state);
      if (condition.type !== 'Bool') typeError('if condition must be Bool; there is no implicit truthiness', condition.at);
      if (raw.otherwise === undefined && use === 'value') {
        typeError('partial conditional values and guarded initializers/assignments are not supported yet; add else', at);
      }
      const body = checkExpression(raw.body, names, state, use);
      const otherwise = raw.otherwise === undefined ? undefined : checkExpression(raw.otherwise, names, state, use);
      if (otherwise !== undefined && use === 'value' && otherwise.type !== body.type) {
        typeError('conditional branch-result unions are not supported yet; use the same result type in each branch', at);
      }
      return { kind: 'if', condition, body, otherwise, type: use === 'discard' ? 'Unit' : body.type, at };
    }
    case 'loop': {
      if (use !== 'discard') typeError('value-producing loops are not supported yet; use loop as an action', at);
      // Transfers from a source expression are outside this bounded body-exit implementation.
      const enclosingDepth = state.loopDepth;
      let condition: Expr | undefined;
      state.loopDepth = 0;
      try { condition = raw.condition === undefined ? undefined : checkExpression(raw.condition, names, state); }
      finally { state.loopDepth = enclosingDepth; }
      if (condition !== undefined && condition.type !== 'Bool') {
        typeError('loop source must be Bool in this igniter; iterables are not supported yet', condition.at);
      }
      state.loopDepth++;
      let body: Expr;
      try { body = checkExpression(raw.body, names, state, 'discard'); }
      finally { state.loopDepth--; }
      return { kind: 'loop', condition, body, type: 'Unit', at };
    }
    case 'loopExit':
      if (state.loopDepth === 0) typeError(`${raw.op} requires an enclosing loop`, at);
      if (use !== 'discard') typeError('loop exits in value expressions and exit payloads are not supported yet', at);
      return { kind: 'loopExit', op: raw.op, type: 'Unit', at };
    case 'name': {
      const binding = names.get(raw.name);
      if (binding !== undefined) return { kind: 'read', binding, type: binding.type, at };
      if (raw.name === 'Unit') return { kind: 'literal', value: UNIT, type: 'Unit', at };
      return typeError(`unknown value ${raw.name}`, at);
    }
    case 'unary': {
      // Admit -2^63 without first requiring positive 2^63 to fit in Int.
      if (raw.op === '-' && raw.input.kind === 'number') {
        const value = numericLiteral(`-${raw.input.text}`, at);
        return { kind: 'literal', value, type: value.kind, at };
      }
      const input = checkExpression(raw.input, names, state);
      if (raw.op === 'not') {
        if (input.type !== 'Bool') typeError('not requires Bool', at);
        return { kind: 'unary', op: raw.op, input, type: 'Bool', at };
      }
      if (input.type !== 'Int' && input.type !== 'Float') typeError('unary arithmetic requires a number', at);
      return { kind: 'unary', op: raw.op, input, type: input.type, at };
    }
    case 'binary': {
      const left = checkExpression(raw.left, names, state);
      const right = checkExpression(raw.right, names, state);
      if ((left.type !== 'Int' && left.type !== 'Float') || (right.type !== 'Int' && right.type !== 'Float')) {
        typeError('arithmetic requires numeric operands', at);
      }
      if (raw.op !== '/' && left.type !== right.type) {
        typeError('mixed Int/Float arithmetic other than division is not supported yet', at);
      }
      const type = left.type === 'Float' || right.type === 'Float' ? 'Float' : 'Int';
      return { kind: 'binary', op: raw.op, left, right, type, at };
    }
    case 'logic': {
      const left = checkExpression(raw.left, names, state);
      const right = checkExpression(raw.right, names, state);
      if (left.type !== 'Bool' || right.type !== 'Bool') typeError('and/or require Bool operands', at);
      return { kind: 'logic', op: raw.op, left, right, type: 'Bool', at };
    }
    case 'compare': {
      const first = checkExpression(raw.first, names, state);
      const rest = raw.rest.map(pair => ({ op: pair.op, right: checkExpression(pair.right, names, state) }));
      let previous = first;
      for (const pair of rest) {
        if (previous.type !== pair.right.type) typeError('mixed-type comparisons are not supported yet', pair.right.at);
        if (pair.op !== '==' && pair.op !== '=!=' && previous.type !== 'Int' && previous.type !== 'Float') {
          typeError('ordered comparisons currently require Int or Float', pair.right.at);
        }
        previous = pair.right;
      }
      return { kind: 'compare', first, rest, type: 'Bool', at };
    }
    case 'call': {
      if (names.has(raw.name)) typeError('calling stored/user-defined functions is not supported yet', at);
      const name = builtin(raw.name);
      if (name === undefined) typeError(`unknown helper ${raw.name}`, at);
      const args = raw.args.map(arg => checkExpression(arg, names, state));
      let type: Type;
      switch (name) {
        case 'inputInt': type = 'Int'; break;
        case 'inputFloat': type = 'Float'; break;
        case 'inputLine': case 'inputWord': type = 'String'; break;
        case 'report': case 'reportError': case 'exit': type = 'Unit'; break;
        default: return unreachable(name);
      }
      const count = name === 'report' || name === 'reportError' ? 1 : 0;
      if (name === 'exit') {
        if (args.length > 1 || (args[0] !== undefined && args[0].type !== 'Int')) {
          typeError('exit accepts zero arguments or one Int code', at);
        }
      } else if (args.length !== count) { typeError(`${name} expects ${count} argument(s)`, at); }
      return { kind: 'call', name, args, type, at };
    }
    default: return unreachable(raw);
  }
}

function checkBlock(parsed: readonly RawItem[], outer: ReadonlyMap<string, Binding>, state: CheckState, use: Use): Block {
  const names = new Map(outer);
  const items: Item[] = [];
  let type: Type = 'Unit';
  for (const [index, item] of parsed.entries()) {
    const context = item.kind === 'expression' && index === parsed.length - 1 ? use : 'discard';
    const input = checkExpression(item.input, names, state, item.kind === 'expression' ? context : 'value');
    switch (item.kind) {
      case 'declare': {
        if (KEYWORDS.has(item.name)) source('keyword binding names are not supported by this igniter', item.at);
        const binding = { name: item.name, mutable: item.mutable, slot: state.nextSlot++, type: input.type };
        names.set(item.name, binding);
        items.push({ kind: 'store', binding, input });
        type = 'Unit';
        break;
      }
      case 'assign': {
        const binding = names.get(item.name);
        if (binding === undefined) typeError(`unknown binding ${item.name}`, item.at);
        if (!binding.mutable) typeError(`${item.name} is fixed; replacement requires var`, item.at);
        if (binding.type !== input.type) typeError(`cannot replace ${binding.type} with ${input.type}`, item.at);
        items.push({ kind: 'store', binding, input });
        type = 'Unit';
        break;
      }
      case 'expression': items.push({ kind: 'expression', input }); type = input.type; break;
      default: unreachable(item);
    }
  }
  return { items, type: use === 'discard' ? 'Unit' : type };
}

export function compile(text: string): Program {
  const parsed = new Parser(tokenize(text)).parse();
  return checkBlock(parsed, new Map(), { nextSlot: 0, loopDepth: 0 }, 'discard');
}

class Input {
  readonly read: IO['read'];
  pending: string | null | undefined;
  constructor(read: IO['read']) { this.read = read; }
  peek(): string | null { if (this.pending === undefined) this.pending = this.read(); return this.pending; }
  take(): string | null { const value = this.peek(); this.pending = undefined; return value; }
  word(): string | null {
    let ch = this.peek();
    while (ch !== null && SPACE.test(ch)) { this.take(); ch = this.peek(); }
    if (ch === null) return null;
    let value = '';
    while (ch !== null && !SPACE.test(ch)) { value += this.take(); ch = this.peek(); }
    return value;
  }
  line(): string | null {
    let value = '';
    let ch = this.take();
    if (ch === null) return null;
    while (ch !== null && ch !== '\n') { value += ch; ch = this.take(); }
    return ch === '\n' && value.endsWith('\r') ? value.slice(0, -1) : value;
  }
}
function format(value: Value): string {
  switch (value.kind) {
    case 'Int': return value.value.toString();
    case 'Float': return String(value.value);
    case 'String': return value.value;
    case 'Bool': return value.value ? 'true' : 'false';
    case 'Unit': return 'Unit';
    default: return unreachable(value);
  }
}
function arithmetic(op: Operator, left: Value, right: Value, at: Position): Value {
  if (left.kind === 'Int' && right.kind === 'Int') {
    switch (op) {
      case '+': return integer(left.value + right.value, at);
      case '-': return integer(left.value - right.value, at);
      case '*': return integer(left.value * right.value, at);
      case '/':
        if (right.value === 0n) throw new LiteFault('ArithmeticPanic', 'division by zero', at);
        return integer(left.value / right.value, at);
      default: return unreachable(op);
    }
  }
  if ((left.kind !== 'Int' && left.kind !== 'Float') || (right.kind !== 'Int' && right.kind !== 'Float')) {
    throw new Error('igniter invariant: nonnumeric arithmetic after checking');
  }
  const a = Number(left.value);
  const b = Number(right.value);
  switch (op) {
    case '+': return floating(a + b, at);
    case '-': return floating(a - b, at);
    case '*': return floating(a * b, at);
    case '/':
      if (b === 0) throw new LiteFault('ArithmeticPanic', 'division by zero', at);
      return floating(a / b, at);
    default: return unreachable(op);
  }
}

function sameValue(left: Value, right: Value): boolean {
  switch (left.kind) {
    case 'Int': return right.kind === 'Int' && left.value === right.value;
    case 'Float': return right.kind === 'Float' && left.value === right.value;
    case 'String': return right.kind === 'String' && left.value === right.value;
    case 'Bool': return right.kind === 'Bool' && left.value === right.value;
    case 'Unit': return right.kind === 'Unit';
    default: return unreachable(left);
  }
}
function compare(op: Comparison, left: Value, right: Value): boolean {
  if (op === '==') return sameValue(left, right);
  if (op === '=!=') return !sameValue(left, right);
  let order: number;
  if (left.kind === 'Int' && right.kind === 'Int') {
    order = left.value < right.value ? -1 : left.value > right.value ? 1 : 0;
  } else if (left.kind === 'Float' && right.kind === 'Float') {
    order = left.value < right.value ? -1 : left.value > right.value ? 1 : 0;
  } else { throw new Error('igniter invariant: nonnumeric ordered comparison'); }
  switch (op) {
    case '<': return order < 0;
    case '<!': return !(order < 0);
    case '<=': return order <= 0;
    case '<!=': return !(order <= 0);
    case '>': return order > 0;
    case '>!': return !(order > 0);
    case '>=': return order >= 0;
    case '>!=': return !(order >= 0);
    default: return unreachable(op);
  }
}
function boolean(value: Value): boolean {
  if (value.kind !== 'Bool') throw new Error('igniter invariant: non-Bool after checking');
  return value.value;
}

export function execute(program: Program, io: IO): number {
  const values: Value[] = [];
  const input = new Input(io.read);
  const evaluate = (expr: Expr): Value => {
    switch (expr.kind) {
      case 'literal': return expr.value;
      case 'block': return evaluateBlock(expr.block.items);
      case 'if':
        if (boolean(evaluate(expr.condition))) return evaluate(expr.body);
        // This missing branch is permitted only where its contribution is discarded.
        return expr.otherwise === undefined ? UNIT : evaluate(expr.otherwise);
      case 'loop':
        while (expr.condition === undefined || boolean(evaluate(expr.condition))) {
          try { evaluate(expr.body); }
          catch (error: unknown) {
            if (!(error instanceof LoopTransfer)) throw error;
            if (error.op === 'break') break;
            // Continue returns to this loop's header, not to the body tail.
          }
        }
        return UNIT; // Only action-position loops are admitted by the checker.
      case 'loopExit': throw new LoopTransfer(expr.op);
      case 'read': {
        const value = values[expr.binding.slot];
        if (value === undefined) throw new Error('igniter invariant: uninitialized checked binding');
        return value;
      }
      case 'unary': {
        const value = evaluate(expr.input);
        if (expr.op === 'not') return { kind: 'Bool', value: !boolean(value) };
        if (expr.op === '+') return value;
        if (value.kind === 'Int') return integer(-value.value, expr.at);
        if (value.kind === 'Float') return floating(-value.value, expr.at);
        throw new Error('igniter invariant: nonnumeric unary input');
      }
      case 'binary': return arithmetic(expr.op, evaluate(expr.left), evaluate(expr.right), expr.at);
      case 'logic': {
        const left = boolean(evaluate(expr.left));
        const value = expr.op === 'and' ? left && boolean(evaluate(expr.right)) : left || boolean(evaluate(expr.right));
        return { kind: 'Bool', value };
      }
      case 'compare': {
        let left = evaluate(expr.first);
        for (const pair of expr.rest) {
          const right = evaluate(pair.right);
          if (!compare(pair.op, left, right)) return { kind: 'Bool', value: false };
          left = right;
        }
        return { kind: 'Bool', value: true };
      }
      case 'call': {
        const args = expr.args.map(evaluate);
        switch (expr.name) {
          case 'report': case 'reportError': {
            const value = args[0];
            if (value === undefined) throw new Error('igniter invariant: missing report argument');
            const writer = expr.name === 'report' ? io.report : io.reportError;
            writer(format(value) + '\n'); return UNIT;
          }
          case 'exit': {
            const value = args[0];
            const code = value === undefined ? 0n : value.kind === 'Int' ? value.value : -1n;
            if (code < 0n || code > 255n) typeError('temporary exit code must be between 0 and 255', expr.at);
            throw new EndRun(Number(code));
          }
          case 'inputInt': case 'inputFloat': case 'inputLine': case 'inputWord': {
            let text: string | null;
            try { text = expr.name === 'inputLine' ? input.line() : input.word(); }
            catch (error: unknown) {
              if (error instanceof LiteFault) throw error;
              throw new LiteFault('InputFault', `cannot read input: ${error instanceof Error ? error.message : String(error)}`, expr.at);
            }
            if (text === null) throw new LiteFault('InputFault', `EOF before ${expr.name} value`, expr.at);
            if (expr.name === 'inputLine' || expr.name === 'inputWord') return { kind: 'String', value: text };
            if (expr.name === 'inputInt') {
              if (!INPUT_INTEGER.test(text)) throw new LiteFault('InputFault', 'expected an integer token', expr.at);
              const value = BigInt(text);
              if (value < MIN || value > MAX) throw new LiteFault('InputFault', 'input outside signed 64-bit range', expr.at);
              return { kind: 'Int', value };
            }
            const value = Number(text);
            if (!INPUT_NUMBER.test(text) || !Number.isFinite(value)) {
              throw new LiteFault('InputFault', 'expected a finite floating token', expr.at);
            }
            return { kind: 'Float', value };
          }
          default: return unreachable(expr.name);
        }
      }
      default: return unreachable(expr);
    }
  };
  const evaluateBlock = (items: readonly Item[]): Value => {
    let result: Value = UNIT;
    for (const item of items) {
      if (item.kind === 'store') { values[item.binding.slot] = evaluate(item.input); result = UNIT; }
      else result = evaluate(item.input);
    }
    return result;
  };
  try {
    evaluateBlock(program.items);
    return 0;
  } catch (error: unknown) {
    if (error instanceof EndRun) return error.code;
    throw error;
  }
}
