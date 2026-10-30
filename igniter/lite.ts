// Disposable igniter: no JS eval, emitted JavaScript, or compiler framework.
export type Position = Readonly<{ line: number; column: number }>;
type Token = Readonly<{ kind: 'id' | 'number' | 'string' | 'symbol' | 'eof'; text: string; at: Position }>;
type Operator = '+' | '-' | '*' | '/';
type Type = 'Int' | 'Float' | 'String' | 'Unit';
export type Value =
  | Readonly<{ kind: 'Int'; value: bigint }>
  | Readonly<{ kind: 'Float'; value: number }>
  | Readonly<{ kind: 'String'; value: string }>
  | Readonly<{ kind: 'Unit' }>;
type Builtin = 'inputInt' | 'inputFloat' | 'inputLine' | 'inputWord' | 'report' | 'reportError' | 'exit';
type Raw = Readonly<{ at: Position }> & (
  | { kind: 'number'; text: string }
  | { kind: 'string'; text: string }
  | { kind: 'name'; name: string }
  | { kind: 'unit' }
  | { kind: 'unary'; op: '+' | '-'; input: Raw }
  | { kind: 'binary'; op: Operator; left: Raw; right: Raw }
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
  | { kind: 'unary'; op: '+' | '-'; input: Expr }
  | { kind: 'binary'; op: Operator; left: Expr; right: Expr }
  | { kind: 'call'; name: Builtin; args: readonly Expr[] }
);
type Item =
  | Readonly<{ kind: 'store'; binding: Binding; input: Expr }>
  | Readonly<{ kind: 'expression'; input: Expr }>;
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
      const pair = text.slice(offset, offset + 2);
      if ([':=', '+=', '-=', '*=', '/=', '==', '**', '_/', '_%'].includes(pair)) {
        advance(2);
        tokens.push({ kind: 'symbol', text: pair, at: start });
      } else if ('+-*/=();,'.includes(ch)) {
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
    if (token.kind !== (text === 'var' ? 'id' : 'symbol') || token.text !== text) return false;
    this.take(); return true;
  }
  expect(text: string): void {
    if (!this.accept(text)) source(`expected ${JSON.stringify(text)}`, this.peek().at);
  }
  parse(): readonly RawItem[] {
    const items: RawItem[] = [];
    while (this.peek().kind !== 'eof') {
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
      if (this.peek().kind !== 'eof') this.expect(';');
    }
    return items;
  }
  expression(minimum = 0): Raw {
    let left = this.prefix();
    while (true) {
      const token = this.peek();
      const op = token.text;
      if (token.kind !== 'symbol') break;
      if (op !== '+' && op !== '-' && op !== '*' && op !== '/') break;
      const precedence = op === '+' || op === '-' ? 1 : 2;
      if (precedence < minimum) break;
      this.take();
      left = { kind: 'binary', op, left, right: this.expression(precedence + 1), at: token.at };
    }
    return left;
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
    if (token.kind === 'id') {
      if (['fn', 'loop', 'if', 'return', 'mut', 'true', 'false', 'import', 'using', 'record', 'type'].includes(token.text)) {
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
function checkExpression(raw: Raw, names: ReadonlyMap<string, Binding>): Expr {
  const at = raw.at;
  switch (raw.kind) {
    case 'number': {
      const value = numericLiteral(raw.text, at);
      return { kind: 'literal', value, type: value.kind, at };
    }
    case 'string': return { kind: 'literal', value: { kind: 'String', value: raw.text }, type: 'String', at };
    case 'unit': return { kind: 'literal', value: UNIT, type: 'Unit', at };
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
      const input = checkExpression(raw.input, names);
      if (input.type !== 'Int' && input.type !== 'Float') typeError('unary arithmetic requires a number', at);
      return { kind: 'unary', op: raw.op, input, type: input.type, at };
    }
    case 'binary': {
      const left = checkExpression(raw.left, names);
      const right = checkExpression(raw.right, names);
      if ((left.type !== 'Int' && left.type !== 'Float') || (right.type !== 'Int' && right.type !== 'Float')) {
        typeError('arithmetic requires numeric operands', at);
      }
      if (raw.op !== '/' && left.type !== right.type) {
        typeError('mixed Int/Float arithmetic other than division is not supported yet', at);
      }
      const type = left.type === 'Float' || right.type === 'Float' ? 'Float' : 'Int';
      return { kind: 'binary', op: raw.op, left, right, type, at };
    }
    case 'call': {
      if (names.has(raw.name)) typeError('calling stored/user-defined functions is not supported yet', at);
      const name = builtin(raw.name);
      if (name === undefined) typeError(`unknown helper ${raw.name}`, at);
      const args = raw.args.map(arg => checkExpression(arg, names));
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

export function compile(text: string): Program {
  const parsed = new Parser(tokenize(text)).parse();
  const names = new Map<string, Binding>();
  const items: Item[] = [];
  let slots = 0;
  for (const item of parsed) {
    const input = checkExpression(item.input, names);
    switch (item.kind) {
      case 'declare': {
        const binding = { name: item.name, mutable: item.mutable, slot: slots++, type: input.type };
        names.set(item.name, binding);
        items.push({ kind: 'store', binding, input });
        break;
      }
      case 'assign': {
        const binding = names.get(item.name);
        if (binding === undefined) typeError(`unknown binding ${item.name}`, item.at);
        if (!binding.mutable) typeError(`${item.name} is fixed; replacement requires var`, item.at);
        if (binding.type !== input.type) typeError(`cannot replace ${binding.type} with ${input.type}`, item.at);
        items.push({ kind: 'store', binding, input });
        break;
      }
      case 'expression': items.push({ kind: 'expression', input }); break;
      default: unreachable(item);
    }
  }
  return { items };
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

export function execute(program: Program, io: IO): number {
  const values: Value[] = [];
  const input = new Input(io.read);
  const evaluate = (expr: Expr): Value => {
    switch (expr.kind) {
      case 'literal': return expr.value;
      case 'read': {
        const value = values[expr.binding.slot];
        if (value === undefined) throw new Error('igniter invariant: uninitialized checked binding');
        return value;
      }
      case 'unary': {
        const value = evaluate(expr.input);
        if (expr.op === '+') return value;
        if (value.kind === 'Int') return integer(-value.value, expr.at);
        if (value.kind === 'Float') return floating(-value.value, expr.at);
        throw new Error('igniter invariant: nonnumeric unary input');
      }
      case 'binary': return arithmetic(expr.op, evaluate(expr.left), evaluate(expr.right), expr.at);
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
  try {
    for (const item of program.items) {
      if (item.kind === 'store') values[item.binding.slot] = evaluate(item.input);
      else evaluate(item.input);
    }
    return 0;
  } catch (error: unknown) {
    if (error instanceof EndRun) return error.code;
    throw error;
  }
}
