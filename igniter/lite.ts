// Disposable igniter: no JS eval, emitted JavaScript, or compiler framework.
export type Position = Readonly<{ line: number; column: number }>;
type Token = Readonly<{ kind: 'id' | 'number' | 'string' | 'symbol' | 'eof'; text: string; at: Position }>;
type Operator = '+' | '-' | '*' | '/' | '%' | ':/' | ':%' | '**';
type ScalarType = 'Int' | 'Float' | 'String' | 'Bool' | 'Unit';
type TupleMember = Readonly<{ label: string | undefined; type: ScalarType }>;
type TupleType = Readonly<{ kind: 'Tuple'; items: readonly TupleMember[] }>;
type ElementType = ScalarType | TupleType;
type ArrayType = Readonly<{ kind: 'Array'; element: ElementType; length: bigint }>;
type ListType = Readonly<{ kind: 'List'; element: ElementType }>;
type DataType = ElementType | ArrayType | ListType;
type EndOperation = 'push_front' | 'push_back' | 'pop_front' | 'pop_back';
type Parameter = Readonly<{ name: string; type: DataType }>;
type FunctionType = Readonly<{ kind: 'Function'; parameters: readonly Parameter[]; result: DataType }>;
// Never is internal flow information, not a new source-level type.
type Type = DataType | FunctionType | 'Never';
type RawType = Readonly<{ at: Position }> & (
  | { kind: 'named'; name: string }
  | { kind: 'unit' }
  | { kind: 'tuple'; items: readonly Readonly<{ label: string | undefined; type: RawType }>[] }
  | { kind: 'array'; element: RawType; length: bigint }
  | { kind: 'list'; element: RawType }
);
type Comparison = '==' | '=!=' | '<' | '<!' | '<=' | '<!=' | '>' | '>!' | '>=' | '>!=';
type Use = 'value' | 'discard';
export type Value =
  | Readonly<{ kind: 'Int'; value: bigint }>
  | Readonly<{ kind: 'Float'; value: number }>
  | Readonly<{ kind: 'String'; value: string }>
  | Readonly<{ kind: 'Bool'; value: boolean }>
  | Readonly<{ kind: 'Unit' }>
  | Readonly<{ kind: 'Tuple'; items: readonly Value[] }>
  | Readonly<{ kind: 'Array'; items: readonly Value[] }>
  | Readonly<{ kind: 'List'; items: readonly Value[] }>
  | FunctionValue;
type Frame = Readonly<{ parent: Frame | undefined; values: Map<number, Value> }>;
type FunctionCode = Readonly<{ parameters: readonly Binding[]; body: Expr }>;
type FunctionValue = Readonly<{ kind: 'Function'; code: FunctionCode; environment: Frame }>;
type Builtin = 'inputInt' | 'inputFloat' | 'inputLine' | 'inputWord' | 'inputAll' | 'inputArgs' | 'report' | 'reportError' | 'exit'
  | 'textLength' | 'textAt' | 'textSlice';
type Raw = Readonly<{ at: Position }> & (
  | { kind: 'number'; text: string }
  | { kind: 'string'; text: string }
  | { kind: 'name'; name: string }
  | { kind: 'grouped'; input: Raw }
  | { kind: 'grant'; name: string }
  | { kind: 'unit' }
  | { kind: 'array'; items: readonly Raw[] }
  | { kind: 'index'; input: Raw; index: Raw }
  | { kind: 'tuple'; items: readonly Readonly<{ label: string | undefined; input: Raw }>[] }
  | { kind: 'position'; input: Raw; index: bigint }
  | { kind: 'member'; input: Raw; name: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'boolLeader'; input: Raw }
  | { kind: 'unary'; op: '+' | '-' | 'not'; input: Raw }
  | { kind: 'binary'; op: Operator; left: Raw; right: Raw }
  | { kind: 'logic'; op: 'and' | 'or'; left: Raw; right: Raw }
  | { kind: 'compare'; first: Raw; rest: readonly Readonly<{ op: Comparison; right: Raw }>[] }
  | { kind: 'block'; items: readonly RawItem[] }
  | { kind: 'if'; condition: Raw; body: Raw; otherwise: Raw | undefined }
  | { kind: 'loop'; condition: Raw | undefined; item: Token | undefined; body: Raw }
  | { kind: 'loopExit'; op: 'break' | 'continue' }
  | { kind: 'function'; parameters: readonly Readonly<{ name: string; type: RawType }>[]; result: RawType; body: Raw }
  | { kind: 'return'; input: Raw | undefined }
  | { kind: 'call'; name: string; args: readonly Readonly<{ label: string | undefined; input: Raw }>[] }
);
type RawItem = Readonly<{ at: Position }> & (
  | { kind: 'declare'; name: string; mutable: boolean; writable: boolean; input: Raw }
  | { kind: 'typedDeclare'; name: string; mutable: boolean; writable: boolean; annotation: RawType; input: Raw }
  | { kind: 'typeAlias'; name: string; target: RawType }
  | { kind: 'assign'; name: string; input: Raw }
  | { kind: 'destructure'; names: readonly Token[]; input: Raw }
  | { kind: 'expression'; input: Raw }
);
type Binding = Readonly<{ slot: number; name: string; type: Type; mutable: boolean; writable: boolean; owner: number }>;
type ScopeEntry =
  | { kind: 'value'; binding: Binding }
  | { kind: 'type'; type: DataType };
type Expr = Readonly<{ at: Position; type: Type }> & (
  | { kind: 'literal'; value: Value }
  | { kind: 'array'; items: readonly Expr[] }
  | { kind: 'list'; items: readonly Expr[] }
  | { kind: 'listEnd'; op: EndOperation; target: Binding; input: Expr | undefined }
  | { kind: 'index'; input: Expr; index: Expr }
  | { kind: 'tuple'; items: readonly Expr[] }
  | { kind: 'position'; input: Expr; index: number }
  | { kind: 'read'; binding: Binding }
  | { kind: 'unary'; op: '+' | '-' | 'not'; input: Expr }
  | { kind: 'binary'; op: Operator; left: Expr; right: Expr }
  | { kind: 'logic'; op: 'and' | 'or'; left: Expr; right: Expr }
  | { kind: 'compare'; first: Expr; rest: readonly Readonly<{ op: Comparison; right: Expr }>[] }
  | { kind: 'block'; block: Block }
  | { kind: 'if'; condition: Expr; body: Expr; otherwise: Expr | undefined }
  | { kind: 'loop'; condition: Expr | undefined; body: Expr }
  | { kind: 'sequenceLoop'; input: Expr; item: Binding | undefined; body: Expr }
  | { kind: 'loopExit'; op: 'break' | 'continue' }
  | { kind: 'function'; code: FunctionCode }
  | { kind: 'return'; input: Expr }
  | { kind: 'self' }
  | { kind: 'invoke'; callee: Expr; args: readonly Expr[]; slots: readonly number[] }
  | { kind: 'call'; name: Builtin; args: readonly Expr[] }
);
type Item =
  | Readonly<{ kind: 'store'; binding: Binding; input: Expr; declare: boolean }>
  | Readonly<{ kind: 'destructure'; bindings: readonly Binding[]; input: Expr }>
  | Readonly<{ kind: 'expression'; input: Expr }>;
type Block = Readonly<{ items: readonly Item[]; type: Type }>;
export type Program = Readonly<{ items: readonly Item[] }>;
export type IO = Readonly<{
  args?: readonly string[];
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
  readonly category: 'SourceError' | 'TypeError' | 'InputFault' | 'ArithmeticPanic' | 'BoundPanic';
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
class ReturnTransfer extends Error {
  readonly value: Value;
  constructor(value: Value) { super('function return'); this.value = value; }
}
function unreachable(value: never): never { throw new Error(`igniter invariant: ${String(value)}`); }
function source(message: string, at: Position): never { throw new LiteFault('SourceError', message, at); }
function typeError(message: string, at: Position): never { throw new LiteFault('TypeError', message, at); }
function scalarType(name: string, at: Position): ScalarType {
  switch (name) {
    case 'Int': case 'Float': case 'String': case 'Bool': case 'Unit': return name;
    default: return typeError('function annotations currently require Int, Float, String, Bool, or Unit', at);
  }
}
function sameType(left: Type, right: Type): boolean {
  if (typeof left === 'string' || typeof right === 'string') return left === right;
  if (left.kind === 'Array') return right.kind === 'Array' && left.length === right.length && sameType(left.element, right.element);
  if (left.kind === 'List') return right.kind === 'List' && sameType(left.element, right.element);
  if (left.kind === 'Tuple') {
    return right.kind === 'Tuple' && left.items.length === right.items.length && left.items.every((item, index) => {
      const other = right.items[index];
      return other !== undefined && item.label === other.label && item.type === other.type;
    });
  }
  if (right.kind !== 'Function') return false;
  return sameType(left.result, right.result) && left.parameters.length === right.parameters.length &&
    left.parameters.every((parameter, index) => {
      const other = right.parameters[index];
      return other !== undefined && parameter.name === other.name && sameType(parameter.type, other.type);
    });
}
function fits(actual: Type, expected: Type): boolean { return actual === 'Never' || sameType(actual, expected); }
function typeName(type: Type): string {
  if (typeof type === 'string') return type;
  if (type.kind === 'Array') return `[${typeName(type.element)}; ${type.length}]`;
  if (type.kind === 'List') return `List<${typeName(type.element)}>`;
  if (type.kind === 'Tuple') return `(${type.items.map(item => `${item.label ?? ''}: ${item.type}`).join(', ')}${type.items.length === 1 && type.items[0]?.label === undefined ? ',' : ''})`;
  return `fn (${type.parameters.map(p => `${p.name}: ${typeName(p.type)}`).join(', ')}): ${typeName(type.result)}`;
}
function isScalar(type: Type): type is ScalarType {
  return typeof type === 'string' && type !== 'Never';
}
function isElement(type: Type): type is ElementType {
  return isScalar(type) || (typeof type !== 'string' && type.kind === 'Tuple');
}
function resolveType(raw: RawType, scope: ReadonlyMap<string, ScopeEntry>): DataType {
  switch (raw.kind) {
    case 'unit': return 'Unit';
    case 'named': {
      const entry = scope.get(raw.name);
      if (entry !== undefined) {
        if (entry.kind === 'value') typeError(`binding ${raw.name} does not denote a type`, raw.at);
        return entry.type;
      }
      return scalarType(raw.name, raw.at);
    }
    case 'list': {
      const element = resolveType(raw.element, scope);
      if (!isElement(element)) typeError('List elements must be scalars or flat scalar tuples', raw.at);
      return { kind: 'List', element };
    }
    case 'array': {
      const element = resolveType(raw.element, scope);
      if (!isElement(element)) typeError('nested collection element types are not supported yet', raw.at);
      return { kind: 'Array', element, length: raw.length };
    }
    case 'tuple': {
      const items = raw.items.map(item => {
        const type = resolveType(item.type, scope);
        if (typeof type !== 'string') typeError('nested tuple annotations are not supported yet', item.type.at);
        return { label: item.label, type };
      });
      return { kind: 'Tuple', items };
    }
    default: return unreachable(raw);
  }
}
function resolveFunctionSignature(raw: Extract<Raw, { kind: 'function' }>, scope: ReadonlyMap<string, ScopeEntry>): FunctionType {
  const parameters = raw.parameters.map(parameter => ({
    name: parameter.name,
    type: resolveType(parameter.type, scope),
  }));
  const result = resolveType(raw.result, scope);
  return { kind: 'Function', parameters, result };
}
function freshTuple(expr: Expr): boolean {
  if (expr.kind === 'tuple') return true;
  if (expr.kind === 'block') {
    const last = expr.block.items.at(-1);
    return last?.kind === 'expression' && freshTuple(last.input);
  }
  return expr.kind === 'if' && (expr.body.type === 'Never' || freshTuple(expr.body)) &&
    expr.otherwise !== undefined && (expr.otherwise.type === 'Never' || freshTuple(expr.otherwise));
}
function requireCompatible(input: Expr, expected: Type, message: string, at: Position): void {
  if (fits(input.type, expected)) return;
  if (typeof input.type !== 'string' && input.type.kind === 'Tuple' &&
      typeof expected !== 'string' && expected.kind === 'Tuple' && freshTuple(input) &&
      expected.items.every(item => item.label !== undefined) && input.type.items.length === expected.items.length) {
    const actual = input.type.items;
    const positional = actual.every((item, index) => item.label === undefined && item.type === expected.items[index]?.type);
    const reordered = actual.every(item => item.label !== undefined &&
      expected.items.some(other => item.label === other.label && item.type === other.type));
    if (positional || reordered) typeError('contextual tuple constructor routing is not supported yet; construct matching labels in destination order', at);
  }
  typeError(message, at);
}
function integer(value: bigint, at: Position, literal = false): Extract<Value, { kind: 'Int' }> {
  if (value < MIN || value > MAX) {
    throw new LiteFault(literal ? 'SourceError' : 'ArithmeticPanic', 'integer outside signed 64-bit range', at);
  }
  return { kind: 'Int', value };
}
function floating(value: number, at: Position, literal = false): Extract<Value, { kind: 'Float' }> {
  if (!Number.isFinite(value)) {
    throw new LiteFault(literal ? 'SourceError' : 'ArithmeticPanic', 'non-finite floating value', at);
  }
  return { kind: 'Float', value };
}
function builtin(name: string): Builtin | undefined {
  switch (name) {
    case 'inputInt': case 'inputFloat': case 'inputLine': case 'inputWord': case 'inputAll': case 'inputArgs':
    case 'report': case 'reportError': case 'exit':
    case 'textLength': case 'textAt': case 'textSlice': return name;
    default: return undefined;
  }
}
function endOperation(name: string): EndOperation | undefined {
  switch (name) {
    case 'push_front': case 'push_back': case 'pop_front': case 'pop_back': return name;
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
      const operator = ['=!=', '>!=', '<!=', ':/=', ':%=', ':=', '+=', '-=', '*=', '/=', '%=', '==', '**', ':/', ':%',
        '>=', '<=', '>!', '<!'].find(candidate => text.startsWith(candidate, offset));
      if (operator !== undefined) {
        advance(operator.length);
        tokens.push({ kind: 'symbol', text: operator, at: start });
      } else if ('+-*/%=();,{}<>:.[]'.includes(ch)) {
        advance();
        tokens.push({ kind: 'symbol', text: ch, at: start });
      } else { source(`unsupported token ${JSON.stringify(ch)}`, start); }
    }
  }
  tokens.push({ kind: 'eof', text: '', at: at() });
  return tokens;
}

type Pattern = Readonly<{ kind: 'name'; token: Token }> | Readonly<{ kind: 'tuple'; items: readonly Pattern[] }>;
class Parser {
  readonly tokens: Token[];
  index = 0;
  constructor(tokens: readonly Token[]) { this.tokens = [...tokens]; }
  peek(distance = 0): Token {
    const token = this.tokens[this.index + distance];
    if (token === undefined) throw new Error('igniter invariant: token past EOF');
    return token;
  }
  take(): Token { const token = this.peek(); this.index++; return token; }
  isSymbol(text: string): boolean {
    const token = this.peek();
    return token.kind === 'symbol' && token.text === text;
  }
  accept(text: string): boolean {
    const token = this.peek();
    if (token.kind !== (/^[a-z]+$/.test(text) ? 'id' : 'symbol') || token.text !== text) return false;
    this.take(); return true;
  }
  expect(text: string): void {
    if (!this.accept(text)) source(`expected ${JSON.stringify(text)}`, this.peek().at);
  }
  rawType(): RawType {
    if (this.peek().kind === 'id' && this.peek().text === 'List') {
      const at = this.take().at;
      this.expect('<');
      const element = this.rawType();
      // A grammatical type close can precede an initializer without whitespace.
      const close = this.peek();
      if (close.kind === 'symbol' && close.text === '>=') {
        this.tokens.splice(this.index, 1, { ...close, text: '>' },
          { kind: 'symbol', text: '=', at: { line: close.at.line, column: close.at.column + 1 } });
      }
      this.expect('>');
      return { kind: 'list', element, at };
    }
    if (this.accept('[')) {
      const at = this.tokens[this.index - 1]!.at;
      const element = this.rawType();
      this.expect(';');
      const length = this.take();
      if (length.kind !== 'number' || !/^[0-9]+$/.test(length.text)) source('fixed array extent must be a nonnegative integer literal', length.at);
      this.expect(']');
      return { kind: 'array', element, length: BigInt(length.text), at };
    }
    if (!this.accept('(')) {
      const token = this.take();
      if (token.kind !== 'id') source('expected a scalar, fixed tuple or fixed array type', token.at);
      return { kind: 'named', name: token.text, at: token.at };
    }
    const openAt = this.tokens[this.index - 1]!.at;
    if (this.accept(')')) return { kind: 'unit', at: openAt };
    if (!(this.peek().text === ':' || (this.peek().kind === 'id' && this.peek(1).text === ':'))) {
      const grouped = this.rawType(); this.expect(')'); return grouped;
    }
    const items: Readonly<{ label: string | undefined; type: RawType }>[] = [];
    const labels = new Set<string>();
    while (true) {
      let label: string | undefined;
      if (!this.accept(':')) {
        const name = this.label();
        label = name.text;
        if (labels.has(label)) source(`duplicate tuple label ${label}`, name.at);
        labels.add(label);
        this.expect(':');
      }
      const type = this.rawType();
      items.push({ label, type });
      if (!this.accept(',')) {
        if (items.length === 1 && label === undefined) source('an unnamed singleton tuple type requires a comma: (:Int,)', this.peek().at);
        this.expect(')'); break;
      }
      if (this.accept(')')) break;
    }
    return { kind: 'tuple', items, at: openAt };
  }
  label(): Token {
    const token = this.take();
    if (token.kind !== 'id' || KEYWORDS.has(token.text) || token.text === 'self') {
      source('this igniter supports ordinary identifier field names only', token.at);
    }
    return token;
  }
  typedDeclaration(name: Token, mutable: boolean): RawItem {
    this.expect(':');
    const writable = this.accept('mut');
    const annotation = this.rawType();
    this.expect('=');
    return { kind: 'typedDeclare', name: name.text, mutable, writable, annotation, input: this.expression(), at: name.at };
  }
  tupleEntry(): Readonly<{ label: string | undefined; input: Raw }> {
    if (this.accept('=')) {
      const name = this.label();
      return { label: name.text, input: { kind: 'name', name: name.text, at: name.at } };
    }
    if (this.peek().kind === 'id' && this.peek(1).kind === 'symbol' && this.peek(1).text === '=') {
      const name = this.label(); this.expect('=');
      return { label: name.text, input: this.expression() };
    }
    return { label: undefined, input: this.expression() };
  }
  startsPatternDeclaration(): boolean {
    let depth = 0;
    for (let index = this.index; index < this.tokens.length; index++) {
      const token = this.tokens[index];
      if (token?.kind !== 'symbol') continue;
      if (token.text === '(') depth++;
      if (token.text === ')' && --depth === 0) return this.tokens[index + 1]?.text === ':=';
    }
    return false;
  }
  pattern(): Pattern {
    if (!this.accept('(')) {
      const token = this.take();
      if (token.kind !== 'id') source('expected a positional binding name', token.at);
      return { kind: 'name', token };
    }
    if (this.accept(')')) return { kind: 'tuple', items: [] };
    const first = this.pattern();
    if (!this.accept(',')) { this.expect(')'); return first; }
    const items = [first];
    if (!this.accept(')')) {
      do { items.push(this.pattern()); } while (this.accept(',') && !this.isSymbol(')'));
      this.expect(')');
    }
    return { kind: 'tuple', items };
  }
  parse(close = false): readonly RawItem[] {
    const items: RawItem[] = [];
    while (this.peek().kind !== 'eof') {
      if (close && this.peek().kind === 'symbol' && this.peek().text === '}') break;
      if (this.accept(';')) continue;
      const start = this.peek();
      if (this.accept('var')) {
        const writable = this.accept('mut');
        const name = this.take();
        if (name.kind !== 'id') source('expected binding name after var', name.at);
        if (this.peek().text === ':') {
          if (writable) source('typed declarations place mut after the colon', name.at);
          items.push(this.typedDeclaration(name, true));
        } else {
          this.expect(':=');
          if (this.peek().kind === 'id' && this.peek().text === 'type') {
            source('type aliases cannot be declared with var', start.at);
          }
          items.push({ kind: 'declare', name: name.text, mutable: true, writable, input: this.expression(), at: start.at });
        }
      } else if (this.accept('mut')) {
        const name = this.take();
        if (name.kind !== 'id') source('expected binding name after mut', name.at);
        if (this.peek().text === ':') source('typed declarations place mut after the colon', name.at);
        this.expect(':=');
        items.push({ kind: 'declare', name: name.text, mutable: false, writable: true,
          input: this.expression(), at: start.at });
      } else if (start.kind === 'id' && this.peek(1).text === ':=' && this.peek(2).kind === 'id' && this.peek(2).text === 'type') {
        this.take();
        this.take();
        this.take();
        const target = this.rawType();
        items.push({ kind: 'typeAlias', name: start.text, target, at: start.at });
      } else if (start.kind === 'id' && this.peek(1).text === ':') {
        this.take();
        items.push(this.typedDeclaration(start, false));
      } else if (start.kind === 'id' && [':=', '=', '+=', '-=', '*=', '/=', '%=', ':/=', ':%=',].includes(this.peek(1).text)) {
        this.take();
        const op = this.take();
        const right = this.expression();
        if (op.text === ':=') {
          items.push({ kind: 'declare', name: start.text, mutable: false, writable: false, input: right, at: start.at });
        } else if (op.text === '=') {
          items.push({ kind: 'assign', name: start.text, input: right, at: start.at });
        } else {
          const operator = op.text.slice(0, -1) as Operator;
          const input: Raw = { kind: 'binary', op: operator,
            left: { kind: 'name', name: start.text, at: start.at }, right, at: start.at };
          items.push({ kind: 'assign', name: start.text, input, at: start.at });
        }
      } else if (start.kind === 'symbol' && start.text === '(' && this.startsPatternDeclaration()) {
        const pattern = this.pattern();
        this.expect(':=');
        const input = this.expression();
        if (pattern.kind === 'name') {
          items.push({ kind: 'declare', name: pattern.token.text, mutable: false, writable: false, input, at: start.at });
        } else {
          const names = pattern.items.map(item => {
            if (item.kind !== 'name') source('nested tuple patterns are not supported yet', start.at);
            return item.token;
          });
          items.push({ kind: 'destructure', names, input, at: start.at });
        }
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
      if (op !== '+' && op !== '-' && op !== '*' && op !== '/' && op !== '%' && op !== ':/' && op !== ':%' && op !== '**') break;
      const precedence = op === '**' ? 7 : op === '+' || op === '-' ? 5 : 6;
      if (precedence < minimum) break;
      if (op === '**' && left.kind === 'unary' && left.op === '-') {
        source('group a negative power base as (-base) or negate the completed power as -(base ** exponent)', token.at);
      }
      this.take();
      left = { kind: 'binary', op, left, right: this.expression(op === '**' ? 7 : precedence + 1), at: token.at };
    }
    return leader === undefined ? left : { kind: 'boolLeader', input: left, at: leader.at };
  }
  prefix(): Raw {
    let input = this.atom();
    while (true) {
      const previous = this.tokens[this.index - 1];
      if (previous?.kind === 'symbol' && previous.text === '}') break;
      if (this.accept('[')) {
        const at = this.peek().at;
        const index = this.expression(); this.expect(']');
        input = { kind: 'index', input, index, at };
        continue;
      }
      if (!this.accept('.')) break;
      if (this.peek().kind === 'id') {
        const name = this.label();
        input = { kind: 'member', input, name: name.text, at: name.at };
        continue;
      }
      const index = this.take();
      if (index.kind !== 'number' || !/^[0-9]+$/.test(index.text)) {
        source('only literal fixed tuple positions such as value.0 are supported here', index.at);
      }
      input = { kind: 'position', input, index: BigInt(index.text), at: index.at };
    }
    return input;
  }
  atom(): Raw {
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
      const value = this.tupleEntry();
      if (!this.accept(',')) {
        this.expect(')');
        return value.label === undefined ? { kind: 'grouped', input: value.input, at: token.at } : { kind: 'tuple', items: [value], at: token.at };
      }
      const items = [value];
      if (!this.accept(')')) {
        do { items.push(this.tupleEntry()); } while (this.accept(',') && !this.isSymbol(')'));
        this.expect(')');
      }
      return { kind: 'tuple', items, at: token.at };
    }
    if (token.kind === 'symbol' && token.text === '[') {
      const items: Raw[] = [];
      if (!this.accept(']')) {
        do { items.push(this.expression()); } while (this.accept(',') && !this.isSymbol(']'));
        this.expect(']');
      }
      return { kind: 'array', items, at: token.at };
    }
    if (token.kind === 'symbol' && token.text === '{') {
      const items = this.parse(true); this.expect('}');
      return { kind: 'block', items, at: token.at };
    }
    if (token.kind === 'id') {
      if (token.text === 'fn') {
        this.expect('(');
        const parameters: Readonly<{ name: string; type: RawType }>[] = [];
        if (!this.accept(')')) {
          do {
            const name = this.take();
            if (name.kind !== 'id' || KEYWORDS.has(name.text) || name.text === 'self') {
              source('expected an ordinary parameter name (self is unsupported as a binding name)', name.at);
            }
            if (parameters.some(p => p.name === name.text)) source(`duplicate parameter ${name.text}`, name.at);
            this.expect(':');
            parameters.push({ name: name.text, type: this.rawType() });
          } while (this.accept(',') && !this.isSymbol(')'));
          this.expect(')');
        }
        this.expect(':');
        const result = this.rawType();
        if (this.peek().kind !== 'symbol' || this.peek().text !== '{') source('fn requires a braced body', this.peek().at);
        return { kind: 'function', parameters, result, body: this.prefix(), at: token.at };
      }
      if (token.text === 'return') {
        const next = this.peek();
        const empty = next.kind === 'eof' || (next.kind === 'symbol' && [';', '}'].includes(next.text));
        return { kind: 'return', input: empty ? undefined : this.expression(), at: token.at };
      }
      if (token.text === 'true' || token.text === 'false') return { kind: 'bool', value: token.text === 'true', at: token.at };
      if (token.text === 'not') return { kind: 'unary', op: 'not', input: this.expression(3), at: token.at };
      if (token.text === 'break' || token.text === 'continue') {
        return { kind: 'loopExit', op: token.text, at: token.at };
      }
      if (token.text === 'loop') {
        const next = this.peek();
        const condition = next.kind === 'symbol' && next.text === '{' ? undefined : this.expression();
        const item = this.accept('as') ? this.label() : undefined;
        if (this.peek().kind !== 'symbol' || this.peek().text !== '{') source('loop requires a braced body', this.peek().at);
        return { kind: 'loop', condition, item, body: this.prefix(), at: token.at };
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
      if (token.text === 'mut') {
        const target = this.label();
        return { kind: 'grant', name: target.text, at: token.at };
      }
      if (['import', 'using', 'record', 'type', 'and', 'or', 'else', 'then', 'finally'].includes(token.text)) {
        source(`${token.text} is not supported by this igniter yet`, token.at);
      }
      if (!this.accept('(')) return { kind: 'name', name: token.text, at: token.at };
      const args: Readonly<{ label: string | undefined; input: Raw }>[] = [];
      if (!this.accept(')')) {
        do { args.push(this.tupleEntry()); } while (this.accept(',') && !this.isSymbol(')'));
        this.expect(')');
      }
      return { kind: 'call', name: token.text, args, at: token.at };
    }
    return source('expected expression (or unsupported feature)', token.at);
  }
}

function numericLiteral(text: string, at: Position): Extract<Value, { kind: 'Int' | 'Float' }> {
  return /[.eE]/.test(text) ? floating(Number(text), at, true) : integer(BigInt(text), at, true);
}
type FunctionContext = Readonly<{ id: number; signature: FunctionType }>;
type CheckState = { nextSlot: number; nextFunction: number; loopDepth: number; current: FunctionContext | undefined; activeGrant: number | undefined };
function readBinding(binding: Binding, state: CheckState, at: Position): Expr {
  if (state.activeGrant === binding.slot) typeError('overlapping list access during mut argument preparation is not supported yet', at);
  if (binding.owner !== (state.current?.id ?? 0) && (typeof binding.type === 'string' || binding.type.kind !== 'Function')) {
    typeError(`surrounding runtime data capture (${binding.name}) is not supported yet; pass it as an argument`, at);
  }
  return { kind: 'read', binding, type: binding.type, at };
}
function checkFunction(raw: Extract<Raw, { kind: 'function' }>, names: ReadonlyMap<string, ScopeEntry>, state: CheckState): Expr {
  const signature = resolveFunctionSignature(raw, names);
  const enclosing = state.current;
  const depth = state.loopDepth;
  const id = state.nextFunction++;
  const local = new Map(names);
  const parameters = signature.parameters.map(parameter => {
    const binding: Binding = { ...parameter, mutable: false, writable: false, slot: state.nextSlot++, owner: id };
    local.set(parameter.name, { kind: 'value', binding });
    return binding;
  });
  state.current = { id, signature };
  state.loopDepth = 0;
  let body: Expr;
  try { body = checkExpression(raw.body, local, state); }
  finally { state.current = enclosing; state.loopDepth = depth; }
  requireCompatible(body, signature.result, `function body produces ${typeName(body.type)}; expected ${typeName(signature.result)}`, raw.body.at);
  return { kind: 'function', code: { parameters, body }, type: signature, at: raw.at };
}
function checkExpression(raw: Raw, names: ReadonlyMap<string, ScopeEntry>, state: CheckState, use: Use = 'value'): Expr {
  const at = raw.at;
  switch (raw.kind) {
    case 'grouped': return checkExpression(raw.input, names, state, use);
    case 'grant': return typeError('mut arguments currently require a direct named list target in a sequence end operation', at);
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
    case 'array': {
      if (raw.items.length === 0) typeError('empty array construction and element-type inference are not supported yet', at);
      const items = raw.items.map(item => checkExpression(item, names, state));
      const first = items[0];
      if (first === undefined) throw new Error('igniter invariant: missing nonempty array element');
      if (!isElement(first.type)) typeError('array elements must be scalars or flat scalar tuples in this igniter', first.at);
      const element = first.type;
      for (const item of items) {
        if (!isElement(item.type)) typeError('array elements must be scalars or flat scalar tuples in this igniter', item.at);
        if (!sameType(item.type, element)) typeError('heterogeneous arrays and union-element inference are not supported yet', item.at);
      }
      return { kind: 'array', items, type: { kind: 'Array', element, length: BigInt(items.length) }, at };
    }
    case 'index': {
      const input = checkExpression(raw.input, names, state);
      const index = checkExpression(raw.index, names, state);
      if (typeof input.type === 'string' || (input.type.kind !== 'Array' && input.type.kind !== 'List')) typeError('bracket reads currently require a fixed array or list', at);
      if (index.type !== 'Int') typeError('sequence index must be Int', at);
      return { kind: 'index', input, index, type: input.type.element, at };
    }
    case 'tuple': {
      const labels = new Set<string>();
      for (const item of raw.items) {
        if (item.label === undefined) continue;
        if (labels.has(item.label)) source(`duplicate tuple label ${item.label}`, at);
        labels.add(item.label);
      }
      const items = raw.items.map(item => checkExpression(item.input, names, state));
      const types = items.map((item, index) => {
        if (!isScalar(item.type)) typeError('only scalar components in flat fixed tuples are supported yet', item.at);
        return { label: raw.items[index]?.label, type: item.type };
      });
      return { kind: 'tuple', items, type: { kind: 'Tuple', items: types }, at };
    }
    case 'position': {
      const input = checkExpression(raw.input, names, state);
      if (typeof input.type !== 'string' && input.type.kind === 'Array') {
        if (raw.index >= input.type.length) typeError('array position outside its static extent', at);
        return { kind: 'position', input, index: Number(raw.index), type: input.type.element, at };
      }
      if (typeof input.type === 'string' || input.type.kind !== 'Tuple') typeError('fixed positional access requires a tuple', at);
      if (raw.index >= BigInt(input.type.items.length)) typeError('tuple position outside its static shape', at);
      const index = Number(raw.index);
      const member = input.type.items[index];
      if (member === undefined) throw new Error('igniter invariant: checked tuple position absent');
      return { kind: 'position', input, index, type: member.type, at };
    }
    case 'member': {
      const input = checkExpression(raw.input, names, state);
      if (typeof input.type === 'string' || input.type.kind !== 'Tuple') typeError('named field access requires a tuple', at);
      const index = input.type.items.findIndex(item => item.label === raw.name);
      const member = input.type.items[index];
      if (member === undefined) typeError(`unknown tuple field ${raw.name}`, at);
      return { kind: 'position', input, index, type: member.type, at };
    }
    case 'function': return checkFunction(raw, names, state);
    case 'return': {
      if (state.current === undefined) typeError('return requires an enclosing function', at);
      const input = raw.input === undefined ? { kind: 'literal', value: UNIT, type: 'Unit', at } satisfies Expr
        : checkExpression(raw.input, names, state);
      requireCompatible(input, state.current.signature.result, `return produces ${typeName(input.type)}; expected ${typeName(state.current.signature.result)}`, at);
      return { kind: 'return', input, type: 'Never', at };
    }
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
      if (otherwise !== undefined && use === 'value' && !fits(otherwise.type, body.type) && !fits(body.type, otherwise.type)) {
        typeError('conditional branch-result unions are not supported yet; use the same result type in each branch', at);
      }
      const type = body.type === 'Never' && otherwise !== undefined ? otherwise.type : body.type;
      return { kind: 'if', condition, body, otherwise,
        type: body.type === 'Never' && otherwise?.type === 'Never' ? 'Never' : use === 'discard' ? 'Unit' : type, at };
    }
    case 'loop': {
      if (use !== 'discard') typeError('value-producing loops are not supported yet; use loop as an action', at);
      // Transfers from a source expression are outside this bounded body-exit implementation.
      const enclosingDepth = state.loopDepth;
      let condition: Expr | undefined;
      state.loopDepth = 0;
      try { condition = raw.condition === undefined ? undefined : checkExpression(raw.condition, names, state); }
      finally { state.loopDepth = enclosingDepth; }
      const array = condition !== undefined && typeof condition.type !== 'string' &&
        (condition.type.kind === 'Array' || condition.type.kind === 'List') ? condition.type : undefined;
      if (condition !== undefined && condition.type !== 'Bool' && array === undefined) typeError('loop source must be Bool or a supported array/list', condition.at);
      if (raw.item !== undefined && array === undefined) typeError('named receivers for non-sequence loops are not supported yet', raw.item.at);
      const item: Binding | undefined = raw.item === undefined || array === undefined ? undefined
        : { name: raw.item.text, type: array.element, mutable: false, writable: false, slot: state.nextSlot++, owner: state.current?.id ?? 0 };
      const bodyNames = item === undefined ? names : new Map(names).set(item.name, { kind: 'value', binding: item });
      state.loopDepth++;
      let body: Expr;
      try { body = checkExpression(raw.body, bodyNames, state, 'discard'); }
      finally { state.loopDepth--; }
      if (array !== undefined && condition !== undefined) return { kind: 'sequenceLoop', input: condition, item, body, type: 'Unit', at };
      return { kind: 'loop', condition, body, type: 'Unit', at };
    }
    case 'loopExit':
      if (state.loopDepth === 0) typeError(`${raw.op} requires an enclosing loop`, at);
      if (use !== 'discard') typeError('loop exits in value expressions and exit payloads are not supported yet', at);
      return { kind: 'loopExit', op: raw.op, type: 'Unit', at };
    case 'name': {
      if (raw.name === 'self') typeError('only self(...) calls are supported; first-class self remains open', at);
      const entry = names.get(raw.name);
      if (entry !== undefined) {
        if (entry.kind === 'type') typeError(`type alias ${raw.name} cannot be used as a value`, at);
        return readBinding(entry.binding, state, at);
      }
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
      if (raw.op === '+' && left.type === 'String' && right.type === 'String') {
        return { kind: 'binary', op: raw.op, left, right, type: 'String', at };
      }
      if ((left.type !== 'Int' && left.type !== 'Float') || (right.type !== 'Int' && right.type !== 'Float')) {
        typeError('arithmetic requires numeric operands', at);
      }
      if ((raw.op === '%' || raw.op === ':/' || raw.op === ':%') && (left.type !== 'Int' || right.type !== 'Int')) {
        typeError(`${raw.op} requires Int operands`, at);
      }
      if (raw.op === '**') {
        return { kind: 'binary', op: raw.op, left, right, type: 'Float', at };
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
        if (typeof previous.type !== 'string' || typeof pair.right.type !== 'string') {
          typeError('aggregate/function-value comparisons are not supported yet', pair.right.at);
        }
        if (!sameType(previous.type, pair.right.type)) typeError('mixed-type comparisons are not supported yet', pair.right.at);
        if (pair.op !== '==' && pair.op !== '=!=' && previous.type !== 'Int' && previous.type !== 'Float') {
          typeError('ordered comparisons currently require Int or Float', pair.right.at);
        }
        previous = pair.right;
      }
      return { kind: 'compare', first, rest, type: 'Bool', at };
    }
    case 'call': {
      const entry = names.get(raw.name);
      if (entry !== undefined && entry.kind === 'type') typeError(`type alias ${raw.name} is not callable`, at);
      const binding = entry?.kind === 'value' ? entry.binding : undefined;
      if (binding !== undefined || raw.name === 'self') {
        let callee: Expr;
        if (raw.name === 'self') {
          if (state.current === undefined) typeError('self(...) requires an enclosing function', at);
          callee = { kind: 'self', type: state.current.signature, at };
        } else {
          if (binding === undefined) throw new Error('igniter invariant: missing callee binding');
          callee = readBinding(binding, state, at);
        }
        if (typeof callee.type === 'string' || callee.type.kind !== 'Function') typeError(`${raw.name} is not callable`, at);
        const signature = callee.type;
        const args = raw.args.map(arg => checkExpression(arg.input, names, state));
        const slots: (number | undefined)[] = signature.parameters.map(() => undefined);
        const labels = new Set<string>();
        for (const [index, entry] of raw.args.entries()) {
          let slot: number;
          if (entry.label === undefined) {
            slot = slots.findIndex(value => value === undefined);
            if (slot === -1) typeError('no unfilled parameter remains for positional argument', entry.input.at);
          } else {
            if (labels.has(entry.label)) typeError(`duplicate explicit argument label ${entry.label}`, entry.input.at);
            labels.add(entry.label);
            slot = signature.parameters.findIndex(parameter => parameter.name === entry.label);
            if (slot === -1) typeError(`unknown argument label ${entry.label}`, entry.input.at);
          }
          slots[slot] = index;
        }
        const routed = slots.map((index, slot) => {
          if (index === undefined) typeError(`missing required argument ${signature.parameters[slot]?.name}`, at);
          return index;
        });
        for (const [index, parameter] of signature.parameters.entries()) {
          const contribution = routed[index];
          const arg = contribution === undefined ? undefined : args[contribution];
          if (arg === undefined) throw new Error('igniter invariant: missing checked argument');
          requireCompatible(arg, parameter.type, `argument ${parameter.name} must be ${typeName(parameter.type)}`, arg.at);
        }
        return { kind: 'invoke', callee, args, slots: routed, type: signature.result, at };
      }
      const operation = endOperation(raw.name);
      if (operation !== undefined) {
        if (state.activeGrant !== undefined) typeError('simultaneous/reentrant list mutation during argument preparation is not supported yet', at);
        if (raw.args.some(arg => arg.label !== undefined)) typeError('list operations currently accept positional arguments only', at);
        const push = operation === 'push_front' || operation === 'push_back';
        if (raw.args.length !== (push ? 2 : 1)) typeError(`${operation} expects ${push ? 2 : 1} argument(s)`, at);
        const first = raw.args[0]?.input;
        if (first?.kind !== 'grant') typeError(`${operation} requires an explicit mut grant to a named list binding`, at);
        const targetEntry = names.get(first.name);
        if (targetEntry === undefined) typeError(`unknown binding ${first.name}`, first.at);
        if (targetEntry.kind === 'type') typeError(`type alias ${first.name} cannot be mutated`, first.at);
        const target = targetEntry.binding;
        readBinding(target, state, first.at); // Retain the ordinary surrounding-data boundary.
        if (!target.writable) typeError(`${first.name} requires a mut List declaration for held-data mutation`, first.at);
        if (typeof target.type === 'string' || target.type.kind !== 'List') typeError('sequence end operations require a growable list', first.at);
        let input: Expr | undefined;
        const supplied = raw.args[1];
        state.activeGrant = target.slot;
        try {
          if (supplied !== undefined) {
            input = checkExpression(supplied.input, names, state);
            requireCompatible(input, target.type.element, `list element must be ${typeName(target.type.element)}`, input.at);
          }
        } finally { state.activeGrant = undefined; }
        return { kind: 'listEnd', op: operation, target, input, type: push ? 'Unit' : target.type.element, at };
      }
      const name = builtin(raw.name);
      if (name === undefined) typeError(`unknown helper/function ${raw.name}; forward function lookup is not supported yet`, at);
      if (raw.args.some(arg => arg.label !== undefined)) typeError('named arguments for temporary builtin helpers are not supported; public labels are not selected', at);
      const args = raw.args.map(arg => checkExpression(arg.input, names, state));
      let type: Type;
      switch (name) {
        case 'inputArgs': type = { kind: 'List', element: 'String' }; break;
        case 'inputInt': case 'textLength': type = 'Int'; break;
        case 'inputFloat': type = 'Float'; break;
        case 'inputLine': case 'inputWord': case 'inputAll': case 'textAt': case 'textSlice': type = 'String'; break;
        case 'report': case 'reportError': type = 'Unit'; break;
        case 'exit': type = 'Never'; break;
        default: return unreachable(name);
      }
      const count = name === 'reportError' ? 1 : 0;
      if (name === 'textLength' || name === 'textAt' || name === 'textSlice') {
        const parameters: readonly ScalarType[] = name === 'textLength' ? ['String']
          : name === 'textAt' ? ['String', 'Int'] : ['String', 'Int', 'Int'];
        if (args.length !== parameters.length) typeError(`${name} expects ${parameters.length} argument(s)`, at);
        for (const [index, parameter] of parameters.entries()) {
          const arg = args[index];
          if (arg === undefined || !fits(arg.type, parameter)) typeError(`${name} argument ${index + 1} must be ${parameter}`, arg?.at ?? at);
        }
      } else if (name === 'inputInt' || name === 'inputAll') {
        if (args.length > 1 || (args[0] !== undefined && !fits(args[0].type, 'String'))) {
          typeError(`${name} accepts zero arguments or one String prompt`, at);
        }
      } else if (name === 'report') {
        if (args.length === 0) typeError('report expects at least one value', at);
      } else if (name === 'exit') {
        if (args.length > 1 || (args[0] !== undefined && args[0].type !== 'Int')) {
          typeError('exit accepts zero arguments or one Int code', at);
        }
      } else if (args.length !== count) { typeError(`${name} expects ${count} argument(s)`, at); }
      if (args.some(arg => typeof arg.type !== 'string')) typeError('helpers do not accept aggregate/function values yet; report scalar components', at);
      return { kind: 'call', name, args, type, at };
    }
    default: return unreachable(raw);
  }
}

function checkBlock(parsed: readonly RawItem[], outer: ReadonlyMap<string, ScopeEntry>, state: CheckState, use: Use): Block {
  const names = new Map(outer);
  const items: Item[] = [];
  let type: Type = 'Unit';
  let exits = false;
  for (const [index, item] of parsed.entries()) {
    if (item.kind === 'typeAlias') {
      if (KEYWORDS.has(item.name) || item.name === 'self') source('keyword/self binding names are not supported by this igniter', item.at);
      const resolved = resolveType(item.target, names);
      names.set(item.name, { kind: 'type', type: resolved });
      type = 'Unit';
      continue;
    }
    const context = item.kind === 'expression' && index === parsed.length - 1 ? use : 'discard';
    // Only the direct, no-earlier-target declaration is visible to its own deferred body.
    const fnInput = item.kind === 'declare' && item.input.kind === 'function' ? item.input : undefined;
    const ownSignature = fnInput !== undefined
      ? resolveFunctionSignature(fnInput, names)
      : undefined;
    const own: Binding | undefined = ownSignature !== undefined && item.kind === 'declare'
      ? { name: item.name, mutable: item.mutable, writable: item.writable, slot: state.nextSlot++, type: ownSignature, owner: state.current?.id ?? 0 }
      : undefined;
    const bodyNames = own !== undefined && !names.has(own.name)
      ? new Map(names).set(own.name, { kind: 'value', binding: own })
      : names;
    let input: Expr;
    if (item.kind === 'typedDeclare') {
      const destination = resolveType(item.annotation, bodyNames);
      if (typeof destination === 'string' || (destination.kind !== 'Tuple' && destination.kind !== 'List')) {
        source('explicit receiving declarations currently support flat tuple or List types only', item.at);
      }
      if (item.writable && destination.kind !== 'List') typeError('held-data mut declarations currently support lists only', item.at);
      if (destination.kind === 'List' && item.input.kind === 'array') {
        const element = destination.element;
        const entries = item.input.items.map(entry => checkExpression(entry, bodyNames, state));
        for (const entry of entries) requireCompatible(entry, element, `list element must be ${typeName(element)}`, entry.at);
        input = { kind: 'list', items: entries, type: destination, at: item.input.at };
      } else input = checkExpression(item.input, bodyNames, state, 'value');
    } else input = checkExpression(item.input, bodyNames, state, item.kind === 'expression' ? context : 'value');
    exits ||= input.type === 'Never';
    switch (item.kind) {
      case 'destructure': {
        let types: readonly ScalarType[];
        if (input.type === 'Unit') types = [];
        else if (typeof input.type !== 'string' && input.type.kind === 'Tuple') types = input.type.items.map(item => item.type);
        else typeError('a positional tuple pattern requires a known tuple or Unit shape', item.at);
        if (types.length !== item.names.length) typeError('tuple pattern requires exact static arity', item.at);
        const bindings = item.names.map((name, index) => {
          if (KEYWORDS.has(name.text) || name.text === 'self') source('keyword/self binding names are not supported by this igniter', name.at);
          const type = types[index];
          if (type === undefined) throw new Error('igniter invariant: missing pattern component type');
          const binding: Binding = { name: name.text, mutable: false, writable: false, slot: state.nextSlot++, type, owner: state.current?.id ?? 0 };
          names.set(name.text, { kind: 'value', binding });
          return binding;
        });
        items.push({ kind: 'destructure', bindings, input });
        type = 'Unit';
        break;
      }
      case 'typedDeclare': case 'declare': {
        if (KEYWORDS.has(item.name) || item.name === 'self') source('keyword/self binding names are not supported by this igniter', item.at);
        if (item.kind === 'declare' && item.writable &&
            (typeof input.type === 'string' || input.type.kind !== 'List')) {
          typeError('held-data mut declarations currently support lists only', item.at);
        }
        let declared = input.type;
        if (item.kind === 'typedDeclare') {
          const destination = resolveType(item.annotation, names);
          declared = destination;
          if (typeof destination !== 'string' && destination.kind === 'List') {
            requireCompatible(input, destination, 'list initialization requires the same List element contract; construct literals at the typed declaration', input.at);
          } else if (input.type !== 'Never' && !sameType(input.type, declared)) {
            if (freshTuple(input)) typeError('contextual tuple constructor routing is not supported yet at typed declarations; use a stored tuple for positional label conversion', input.at);
            if (typeof input.type === 'string' || input.type.kind !== 'Tuple' ||
                typeof destination === 'string' || destination.kind !== 'Tuple' ||
                input.type.items.length !== destination.items.length ||
                !input.type.items.every((member, index) => member.type === destination.items[index]?.type)) {
              typeError('tuple label conversion requires the same ordered shape and component types', input.at);
            }
          }
        }
        const binding: Binding = own ?? { name: item.name, mutable: item.mutable,
          writable: item.writable, slot: state.nextSlot++, type: declared, owner: state.current?.id ?? 0 };
        names.set(item.name, { kind: 'value', binding });
        items.push({ kind: 'store', binding, input, declare: true });
        type = 'Unit';
        break;
      }
      case 'assign': {
        const entry = names.get(item.name);
        if (entry === undefined) typeError(`unknown binding ${item.name}`, item.at);
        if (entry.kind === 'type') typeError(`type alias ${item.name} cannot be assigned`, item.at);
        const binding = entry.binding;
        if (state.activeGrant === binding.slot) typeError('replacement of a list during its mut argument preparation is not supported yet', item.at);
        if (binding.owner !== (state.current?.id ?? 0)) typeError('replacement of surrounding runtime bindings is not supported yet', item.at);
        if (!binding.mutable) typeError(`${item.name} is fixed; replacement requires var`, item.at);
        requireCompatible(input, binding.type, `cannot replace ${typeName(binding.type)} with ${typeName(input.type)}`, item.at);
        items.push({ kind: 'store', binding, input, declare: false });
        type = 'Unit';
        break;
      }
      case 'expression': items.push({ kind: 'expression', input }); type = input.type; break;
      default: unreachable(item);
    }
  }
  return { items, type: exits ? 'Never' : use === 'discard' ? 'Unit' : type };
}

export function compile(text: string): Program {
  const parsed = new Parser(tokenize(text)).parse();
  return checkBlock(parsed, new Map(), { nextSlot: 0, nextFunction: 1, loopDepth: 0, current: undefined, activeGrant: undefined }, 'discard');
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
  all(): string {
    let value = '';
    for (let ch = this.take(); ch !== null; ch = this.take()) value += ch;
    return value;
  }
}
function format(value: Value): string {
  switch (value.kind) {
    case 'Int': return value.value.toString();
    case 'Float': return String(value.value);
    case 'String': return value.value;
    case 'Bool': return value.value ? 'true' : 'false';
    case 'Unit': return 'Unit';
    case 'Tuple': throw new Error('igniter invariant: formatting a checked tuple');
    case 'Array': throw new Error('igniter invariant: formatting a checked array');
    case 'List': throw new Error('igniter invariant: formatting a checked list');
    case 'Function': throw new Error('igniter invariant: formatting a checked function');
    default: return unreachable(value);
  }
}
function arithmetic(op: Operator, left: Value, right: Value, at: Position): Value {
  if (op === '+' && left.kind === 'String' && right.kind === 'String') {
    return { kind: 'String', value: left.value + right.value };
  }
  if (left.kind === 'Int' && right.kind === 'Int') {
    switch (op) {
      case '+': return integer(left.value + right.value, at);
      case '-': return integer(left.value - right.value, at);
      case '*': return integer(left.value * right.value, at);
      case '/':
        if (right.value === 0n) throw new LiteFault('ArithmeticPanic', 'division by zero', at);
        return integer(left.value / right.value, at);
      case '%':
        if (right.value === 0n) throw new LiteFault('ArithmeticPanic', 'remainder by zero', at);
        return integer(left.value % right.value, at);
      case ':/': {
        if (right.value === 0n) throw new LiteFault('ArithmeticPanic', 'division by zero', at);
        let quotient = left.value / right.value;
        if (left.value % right.value !== 0n && (left.value < 0n) !== (right.value < 0n)) quotient -= 1n;
        return integer(quotient, at);
      }
      case ':%': {
        if (right.value === 0n) throw new LiteFault('ArithmeticPanic', 'modulo by zero', at);
        let remainder = left.value % right.value;
        if (remainder !== 0n && (remainder < 0n) !== (right.value < 0n)) remainder += right.value;
        return integer(remainder, at);
      }
      case '**': return power(left, right, at); // Unreachable after the Float-default type split; kept for exhaustiveness.
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
    case '%': case ':/': case ':%': throw new Error('igniter invariant: remainder/floor requires Int operands');
    case '**': return power(left, right, at);
    default: return unreachable(op);
  }
}

function power(left: Value, right: Value, at: Position): Value {
  if ((left.kind !== 'Int' && left.kind !== 'Float') || (right.kind !== 'Int' && right.kind !== 'Float')) {
    throw new Error('igniter invariant: nonnumeric power operands after checking');
  }
  const exponent = Number(right.value);
  if (!Number.isFinite(exponent) || exponent <= 0) {
    throw new LiteFault('ArithmeticPanic', 'power exponent must be positive in this checkpoint', at);
  }
  return floating(Math.pow(Number(left.value), exponent), at);
}

function sameValue(left: Value, right: Value): boolean {
  switch (left.kind) {
    case 'Int': return right.kind === 'Int' && left.value === right.value;
    case 'Float': return right.kind === 'Float' && left.value === right.value;
    case 'String': return right.kind === 'String' && left.value === right.value;
    case 'Bool': return right.kind === 'Bool' && left.value === right.value;
    case 'Unit': return right.kind === 'Unit';
    case 'Tuple': throw new Error('igniter invariant: comparing a checked tuple');
    case 'Array': throw new Error('igniter invariant: comparing a checked array');
    case 'List': throw new Error('igniter invariant: comparing a checked list');
    case 'Function': throw new Error('igniter invariant: comparing a checked function');
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
  const input = new Input(io.read);
  const argumentValues = (io.args ?? []).map((value): Value => ({ kind: 'String', value }));
  const findFrame = (frame: Frame, slot: number): Frame => {
    for (let current: Frame | undefined = frame; current !== undefined; current = current.parent) {
      if (current.values.has(slot)) return current;
    }
    throw new Error('igniter invariant: uninitialized checked binding');
  };
  const evaluate = (expr: Expr, frame: Frame, self: FunctionValue | undefined): Value => {
    const evaluateHere = (child: Expr): Value => evaluate(child, frame, self);
    switch (expr.kind) {
      case 'literal': return expr.value;
      case 'array': return { kind: 'Array', items: expr.items.map(evaluateHere) };
      case 'list': return { kind: 'List', items: expr.items.map(evaluateHere) };
      case 'listEnd': {
        const target = findFrame(frame, expr.target.slot);
        const list = target.values.get(expr.target.slot);
        if (list?.kind !== 'List') throw new Error('igniter invariant: non-list checked mutation');
        const input = expr.input === undefined ? undefined : evaluateHere(expr.input);
        // Publish a new immutable sequence only after successful preparation.
        // Earlier reads/copies and traversal snapshots retain their values.
        if (expr.op === 'push_front' || expr.op === 'push_back') {
          if (input === undefined) throw new Error('igniter invariant: missing push value');
          const items = expr.op === 'push_front' ? [input, ...list.items] : [...list.items, input];
          target.values.set(expr.target.slot, { kind: 'List', items });
          return UNIT;
        }
        if (list.items.length === 0) throw new LiteFault('BoundPanic', `${expr.op} on an empty list`, expr.at);
        const value = expr.op === 'pop_front' ? list.items[0] : list.items.at(-1);
        if (value === undefined) throw new Error('igniter invariant: missing nonempty pop value');
        const items = expr.op === 'pop_front' ? list.items.slice(1) : list.items.slice(0, -1);
        target.values.set(expr.target.slot, { kind: 'List', items });
        return value;
      }
      case 'index': {
        const input = evaluateHere(expr.input);
        const index = evaluateHere(expr.index);
        if ((input.kind !== 'Array' && input.kind !== 'List') || index.kind !== 'Int') throw new Error('igniter invariant: invalid checked index input');
        if (index.value < 0n || index.value >= BigInt(input.items.length)) throw new LiteFault('BoundPanic', `${input.kind === 'List' ? 'list' : 'array'} index outside its extent`, expr.at);
        const value = input.items[Number(index.value)];
        if (value === undefined) throw new Error('igniter invariant: missing bounded array element');
        return value;
      }
      case 'tuple': return { kind: 'Tuple', items: expr.items.map(evaluateHere) };
      case 'position': {
        const input = evaluateHere(expr.input);
        if (input.kind !== 'Tuple' && input.kind !== 'Array') throw new Error('igniter invariant: non-aggregate checked access');
        const value = input.items[expr.index];
        if (value === undefined) throw new Error('igniter invariant: missing checked tuple component');
        return value;
      }
      case 'block': return evaluateBlock(expr.block.items, frame, self);
      case 'function': return { kind: 'Function', code: expr.code, environment: frame };
      case 'self': {
        if (self === undefined) throw new Error('igniter invariant: self outside checked function');
        return self;
      }
      case 'return': throw new ReturnTransfer(evaluateHere(expr.input));
      case 'invoke': {
        // Select once before evaluating arguments, even if an argument replaces its source binding.
        const callee = evaluateHere(expr.callee);
        if (callee.kind !== 'Function') throw new Error('igniter invariant: non-function checked call');
        const args = expr.args.map(evaluateHere);
        const activation: Frame = { parent: callee.environment, values: new Map() };
        for (const [index, parameter] of callee.code.parameters.entries()) {
          const contribution = expr.slots[index];
          const value = contribution === undefined ? undefined : args[contribution];
          if (value === undefined) throw new Error('igniter invariant: missing checked argument');
          activation.values.set(parameter.slot, value);
        }
        try { return evaluate(callee.code.body, activation, callee); }
        catch (error: unknown) {
          if (error instanceof ReturnTransfer) return error.value;
          throw error;
        }
      }
      case 'if':
        if (boolean(evaluateHere(expr.condition))) return evaluateHere(expr.body);
        // This missing branch is permitted only where its contribution is discarded.
        return expr.otherwise === undefined ? UNIT : evaluateHere(expr.otherwise);
      case 'loop':
        while (expr.condition === undefined || boolean(evaluateHere(expr.condition))) {
          try { evaluateHere(expr.body); }
          catch (error: unknown) {
            if (!(error instanceof LoopTransfer)) throw error;
            if (error.op === 'break') break;
            // Continue returns to this loop's header, not to the body tail.
          }
        }
        return UNIT; // Only action-position loops are admitted by the checker.
      case 'loopExit': throw new LoopTransfer(expr.op);
      case 'sequenceLoop': {
        const input = evaluateHere(expr.input);
        if (input.kind !== 'Array' && input.kind !== 'List') throw new Error('igniter invariant: non-sequence checked traversal');
        for (const value of input.items) {
          const iteration: Frame = { parent: frame, values: new Map() };
          if (expr.item !== undefined) iteration.values.set(expr.item.slot, value);
          try { evaluate(expr.body, iteration, self); }
          catch (error: unknown) {
            if (!(error instanceof LoopTransfer)) throw error;
            if (error.op === 'break') break;
          }
        }
        return UNIT;
      }
      case 'read': {
        const value = findFrame(frame, expr.binding.slot).values.get(expr.binding.slot);
        if (value === undefined) throw new Error('igniter invariant: uninitialized checked binding');
        return value;
      }
      case 'unary': {
        const value = evaluateHere(expr.input);
        if (expr.op === 'not') return { kind: 'Bool', value: !boolean(value) };
        if (expr.op === '+') return value;
        if (value.kind === 'Int') return integer(-value.value, expr.at);
        if (value.kind === 'Float') return floating(-value.value, expr.at);
        throw new Error('igniter invariant: nonnumeric unary input');
      }
      case 'binary': return arithmetic(expr.op, evaluateHere(expr.left), evaluateHere(expr.right), expr.at);
      case 'logic': {
        const left = boolean(evaluateHere(expr.left));
        const value = expr.op === 'and' ? left && boolean(evaluateHere(expr.right)) : left || boolean(evaluateHere(expr.right));
        return { kind: 'Bool', value };
      }
      case 'compare': {
        let left = evaluateHere(expr.first);
        for (const pair of expr.rest) {
          const right = evaluateHere(pair.right);
          if (!compare(pair.op, left, right)) return { kind: 'Bool', value: false };
          left = right;
        }
        return { kind: 'Bool', value: true };
      }
      case 'call': {
        const args = expr.args.map(evaluateHere);
        switch (expr.name) {
          case 'inputArgs': return { kind: 'List', items: argumentValues };
          case 'textLength': case 'textAt': case 'textSlice': {
            const text = args[0];
            if (text?.kind !== 'String') throw new Error('igniter invariant: missing checked text');
            // Temporary explicit code-point view; no generic String indexing or native layout claim.
            const points = Array.from(text.value);
            const length = BigInt(points.length);
            if (expr.name === 'textLength') return integer(length, expr.at);
            const start = args[1];
            if (start?.kind !== 'Int') throw new Error('igniter invariant: missing checked text index');
            if (expr.name === 'textAt') {
              if (start.value < 0n || start.value >= length) {
                throw new LiteFault('BoundPanic', 'textAt index outside text', expr.at);
              }
              const point = points[Number(start.value)];
              if (point === undefined) throw new Error('igniter invariant: checked text index absent');
              return { kind: 'String', value: point };
            }
            const end = args[2];
            if (end?.kind !== 'Int') throw new Error('igniter invariant: missing checked text end');
            if (start.value < 0n || end.value < start.value || end.value > length) {
              throw new LiteFault('BoundPanic', 'textSlice requires 0 <= start <= end <= textLength(text)', expr.at);
            }
            return { kind: 'String', value: points.slice(Number(start.value), Number(end.value)).join('') };
          }
          case 'report': case 'reportError': {
            if (args.length === 0) throw new Error('igniter invariant: missing report argument');
            const writer = expr.name === 'report' ? io.report : io.reportError;
            writer(args.map(format).join(' ') + '\n'); return UNIT;
          }
          case 'exit': {
            const value = args[0];
            const code = value === undefined ? 0n : value.kind === 'Int' ? value.value : -1n;
            if (code < 0n || code > 255n) typeError('temporary exit code must be between 0 and 255', expr.at);
            throw new EndRun(Number(code));
          }
          case 'inputInt': case 'inputFloat': case 'inputLine': case 'inputWord': case 'inputAll': {
            if ((expr.name === 'inputInt' || expr.name === 'inputAll') && args[0] !== undefined) {
              const prompt = args[0];
              if (prompt.kind !== 'String') throw new Error('igniter invariant: non-String checked prompt');
              io.report(prompt.value);
            }
            let text: string | null;
            try { text = expr.name === 'inputAll' ? input.all() : expr.name === 'inputLine' ? input.line() : input.word(); }
            catch (error: unknown) {
              if (error instanceof LiteFault) throw error;
              throw new LiteFault('InputFault', `cannot read input: ${error instanceof Error ? error.message : String(error)}`, expr.at);
            }
            if (text === null) throw new LiteFault('InputFault', `EOF before ${expr.name} value`, expr.at);
            if (expr.name === 'inputLine' || expr.name === 'inputWord' || expr.name === 'inputAll') return { kind: 'String', value: text };
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
  const evaluateBlock = (items: readonly Item[], parent: Frame | undefined, self: FunctionValue | undefined): Value => {
    const frame: Frame = { parent, values: new Map() };
    let result: Value = UNIT;
    for (const item of items) {
      if (item.kind === 'store') {
        const value = evaluate(item.input, frame, self);
        const target = item.declare ? frame : findFrame(frame, item.binding.slot);
        target.values.set(item.binding.slot, value);
        result = UNIT;
      } else if (item.kind === 'destructure') {
        const input = evaluate(item.input, frame, self);
        if (input.kind !== 'Unit' && input.kind !== 'Tuple') throw new Error('igniter invariant: checked pattern source shape');
        const components = input.kind === 'Unit' ? [] : input.items;
        for (const [index, binding] of item.bindings.entries()) {
          const value = components[index];
          if (value === undefined) throw new Error('igniter invariant: missing checked pattern value');
          frame.values.set(binding.slot, value);
        }
        result = UNIT;
      } else result = evaluate(item.input, frame, self);
    }
    return result;
  };
  try {
    evaluateBlock(program.items, undefined, undefined);
    return 0;
  } catch (error: unknown) {
    if (error instanceof EndRun) return error.code;
    throw error;
  }
}
