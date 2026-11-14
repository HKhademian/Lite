/** Filters generated TypeScript and C into Program, Portable, and Full views. */

export type CodeViewMode = 'program' | 'portable' | 'full';

function skipBraceBlock(lines: readonly string[], startIndex: number): number {
  let depth = 0;
  let sawOpen = false;
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i]!;
    for (let j = 0; j < line.length; j += 1) {
      const ch = line[j]!;
      if (ch === '"' || ch === "'") {
        const quote = ch;
        j += 1;
        while (j < line.length) {
          if (line[j] === '\\') { j += 2; continue; }
          if (line[j] === quote) break;
          j += 1;
        }
        continue;
      }
      if (ch === '{') {
        depth += 1;
        sawOpen = true;
      } else if (ch === '}') {
        depth -= 1;
      }
    }
    if (sawOpen && depth <= 0) return i + 1;
  }
  return lines.length;
}

function dedent(line: string, spaces = 4): string {
  let i = 0;
  while (i < spaces && i < line.length && line[i] === ' ') i += 1;
  return line.slice(i);
}

function extractTsProgram(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const mainIndex = lines.findIndex((line) => line.startsWith('export function main('));
  if (mainIndex === -1) return source;

  const mainEnd = skipBraceBlock(lines, mainIndex);
  const body = lines.slice(mainIndex + 1, mainEnd - 1);
  const out: string[] = [];

  for (let i = 0; i < body.length; ) {
    const line = body[i]!;
    const trimmed = line.trim();

    if (trimmed === 'let lite$out = "";' || trimmed === 'return lite$out;') {
      i += 1;
      continue;
    }
    if (trimmed.startsWith('function lite$emit(')) {
      i = skipBraceBlock(body, i);
      continue;
    }
    if (/^void\s+(?:lite\$emit|lite\$tuple(?:\$\d+)?|lite\$item(?:\$\d+)?|lite\$m\$[a-zA-Z0-9_$]+|lite_[a-zA-Z0-9_$]+|liteFn(?:\$|[a-zA-Z0-9_])[a-zA-Z0-9_$]*);$/.test(trimmed)) {
      i += 1;
      continue;
    }
    if (/^function\s+liteFn\$/.test(trimmed)) {
      i = skipBraceBlock(body, i);
      continue;
    }
    if (/^(?:(?:const|let)\s+)?lite\$m\$[a-zA-Z0-9_$]+(?:\s*:[^=]+)?\s*=/.test(trimmed)) {
      i = !trimmed.endsWith(';') && trimmed.includes('{') ? skipBraceBlock(body, i) : i + 1;
      continue;
    }

    out.push(dedent(line));
    i += 1;
  }

  while (out.length > 0 && out[0] === '') out.shift();
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out.length > 0 ? out.join('\n') : '// (empty program)';
}

function extractTsPortable(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; ) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed.startsWith('declare ')) {
      if (trimmed.endsWith(';')) {
        i += 1;
        continue;
      }
      i = skipBraceBlock(lines, i);
      continue;
    }
    if (/^void\s+(?:lite\$emit|lite\$tuple(?:\$\d+)?|lite\$item(?:\$\d+)?|lite\$m\$[a-zA-Z0-9_$]+|lite_[a-zA-Z0-9_$]+|liteFn(?:\$|[a-zA-Z0-9_])[a-zA-Z0-9_$]*);$/.test(trimmed)) {
      i += 1;
      continue;
    }
    out.push(line);
    i += 1;
  }

  while (out.length > 0 && out[0] === '') out.shift();
  return out.join('\n');
}

function extractCProgram(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const mainIndex = lines.findIndex((line) => line.startsWith('int main('));
  if (mainIndex === -1) return source;
  const mainEnd = skipBraceBlock(lines, mainIndex);
  return lines
    .slice(mainIndex, mainEnd)
    .filter((line) => {
      const trimmed = line.trim();
      if (/^\(void\)(?:lite_|lt_m_|lt_s\d+_)[a-zA-Z0-9_]+;$/.test(trimmed)) return false;
      if (/^(?:(?:int64_t|const char \*|double|bool)\s+)?lt_m_[a-zA-Z0-9_]+\s*=.*;$/.test(trimmed)) return false;
      return true;
    })
    .join('\n');
}

function extractCPortable(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  return lines
    .filter((line) => !/^\(void\)(?:lite_|lt_m_|lt_s\d+_)[a-zA-Z0-9_]+;$/.test(line.trim()))
    .join('\n');
}

interface CodeToken {
  text: string;
  start: number;
  end: number;
  prevNonWs: string;
  nextNonWs: string;
}

const COMPILER_PREFIX_RE = /^(?:lite_|liteFn|lite\$|lt_)/;

const TS_RESERVED = new Set([
  'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
  'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import',
  'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'implements', 'interface',
  'package', 'private', 'protected', 'public', 'as', 'async', 'of', 'type', 'declare', 'namespace',
  'bigint', 'string', 'boolean', 'number', 'never', 'readonly', 'unknown', 'any', 'object', 'symbol',
  'Boolean', 'Number', 'BigInt', 'String', 'Object', 'Array', 'Math', 'Error', 'RangeError', 'TypeError',
  'Uint8Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
  'JSON', 'Promise', 'Map', 'Set', 'RegExp', 'Date', 'Symbol', 'Function', 'Reflect', 'Proxy',
  'console', 'process', 'Buffer', 'globalThis', 'Infinity', 'NaN', 'undefined', 'main', 'arguments', 'eval',
]);

const C_RESERVED = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'restrict', 'return',
  'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
  'volatile', 'while', '_Alignas', '_Alignof', '_Atomic', '_Bool', '_Complex', '_Generic', '_Imaginary',
  '_Noreturn', '_Static_assert', '_Thread_local', 'bool', 'true', 'false', 'NULL', 'size_t',
  'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t',
  'INT64_MIN', 'INT64_MAX', 'INT64_C', 'INT8_MIN', 'INT8_MAX', 'INT16_MIN', 'INT16_MAX', 'INT32_MIN', 'INT32_MAX',
  'PRId64', 'INFINITY', 'NAN', 'EOF', 'FILE', 'stdin', 'stdout', 'stderr', 'printf', 'fprintf', 'snprintf',
  'puts', 'fputs', 'putchar', 'getchar', 'fread', 'fwrite', 'fflush', 'malloc', 'calloc', 'realloc', 'free',
  'memcpy', 'memmove', 'memset', 'memcmp', 'strlen', 'strcmp', 'strncmp', 'strcpy', 'strtod', 'strtoll',
  'exit', 'abort', 'fabs', 'fabsf', 'fmod', 'pow', 'sqrt', 'isnan', 'isinf', 'isfinite', 'main', 'argc',
  'argv', 'status', 'errno',
]);

const C_RUNTIME_HELPERS = new Set([
  'lite_divide_int',
  'lite_remainder_int',
  'lite_floor_divide_int',
  'lite_floor_modulo_int',
  'lite_concat',
]);

function peekNextNonWs(source: string, index: number): string {
  let i = index;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i + 1 < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    return ch;
  }
  return '';
}

function scanCodeTokens(source: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let lastNonWs = '';
  for (let i = 0; i < source.length; ) {
    const ch = source[i]!;
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i + 1 < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === '\\') { i += 2; continue; }
        if (source[i] === quote) { i += 1; break; }
        i += 1;
      }
      lastNonWs = quote;
      continue;
    }
    if (ch >= '0' && ch <= '9') {
      while (i < source.length && /[A-Za-z0-9_.]/.test(source[i]!)) i += 1;
      lastNonWs = '0';
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < source.length && /[A-Za-z0-9_$]/.test(source[i]!)) i += 1;
      const text = source.slice(start, i);
      const prevNonWs = lastNonWs;
      const nextNonWs = peekNextNonWs(source, i);
      lastNonWs = text[text.length - 1]!;
      if (prevNonWs === '.') continue;
      if ((prevNonWs === '{' || prevNonWs === ',' || prevNonWs === ';') && nextNonWs === ':' && !COMPILER_PREFIX_RE.test(text)) {
        continue;
      }
      tokens.push({ text, start, end: i, prevNonWs, nextNonWs });
      continue;
    }
    lastNonWs = ch;
    i += 1;
  }
  return tokens;
}

function decodeModuleLeaf(slug: string, target: 'ts' | 'c'): string {
  const sep = target === 'ts' ? '$' : '_s_';
  const raw = slug.split(sep).filter(Boolean).pop() ?? 'mod';
  let leaf = raw.replace(
    target === 'ts' ? /_u_|__|_p_|_a\d+_|_z_/g : /_u_|_d_|_p_|_a\d+_|_z_/g,
    '_',
  );
  if (!leaf) leaf = 'mod';
  if (/^[0-9]/.test(leaf)) leaf = `_${leaf}`;
  return leaf;
}

function allocateName(base: string, used: Set<string>, startSuffix = 2, preferBare = true): string {
  if (preferBare && !used.has(base)) {
    used.add(base);
    return base;
  }
  let k = startSuffix;
  while (used.has(`${base}_${k}`)) k += 1;
  const allocated = `${base}_${k}`;
  used.add(allocated);
  return allocated;
}

function applyTokenMap(source: string, tokens: readonly CodeToken[], map: ReadonlyMap<string, string>): string {
  if (map.size === 0) return source;
  const out: string[] = [];
  let cursor = 0;
  for (const token of tokens) {
    const replacement = map.get(token.text);
    if (replacement === undefined) continue;
    out.push(source.slice(cursor, token.start), replacement);
    cursor = token.end;
  }
  if (cursor === 0) return source;
  out.push(source.slice(cursor));
  return out.join('');
}

function allocateProgramNames(
  source: string,
  tokens: readonly CodeToken[],
  used: Set<string>,
  seen: readonly string[],
  primary: ReadonlyMap<string, string>,
  shadowed: readonly { raw: string; base: string; suffix: number }[],
  modules: readonly { raw: string; leafBase: string }[],
): string {
  const map = new Map<string, string>();
  for (const name of seen) {
    const base = primary.get(name);
    if (base !== undefined) map.set(name, allocateName(base, used, 2, true));
  }
  for (const item of shadowed) {
    map.set(item.raw, allocateName(item.base, used, item.suffix, false));
  }
  for (const item of modules) {
    map.set(item.raw, allocateName(item.leafBase, used, 2, true));
  }
  return applyTokenMap(source, tokens, map);
}

/** Rewrites TS runtime identifiers into concise, collision-free Program view names. */
function simplifyTsProgramNames(source: string): string {
  const tokens = scanCodeTokens(source);
  const used = new Set(TS_RESERVED);
  const visited = new Set<string>();
  const seen: string[] = [];
  const primary = new Map<string, string>();
  const shadowed: Array<{ raw: string; base: string; suffix: number }> = [];
  const modules: Array<{ raw: string; leafBase: string }> = [];

  for (const token of tokens) {
    const name = token.text;
    if (used.has(name) || visited.has(name)) continue;
    visited.add(name);

    const fnMatch = /^liteFn_([A-Za-z0-9_]+)$/.exec(name);
    if (fnMatch) {
      seen.push(name);
      primary.set(name, fnMatch[1]!);
      continue;
    }
    const localMatch = /^lite_([A-Za-z0-9_]+)$/.exec(name);
    if (localMatch) {
      seen.push(name);
      primary.set(name, localMatch[1]!);
      continue;
    }
    const shadowMatch = /^lite_([A-Za-z0-9_]+)\$(\d+)$/.exec(name);
    if (shadowMatch) {
      shadowed.push({ raw: name, base: shadowMatch[1]!, suffix: Math.max(2, Number(shadowMatch[2]!)) });
      continue;
    }
    const modFnMatch = /^liteFn\$(.+)\$([A-Za-z0-9_]+)$/.exec(name);
    if (modFnMatch) {
      modules.push({ raw: name, leafBase: `${decodeModuleLeaf(modFnMatch[1]!, 'ts')}$${modFnMatch[2]!}` });
      continue;
    }
    const modValMatch = /^lite\$m\$(.+)\$([A-Za-z0-9_]+)$/.exec(name);
    if (modValMatch) {
      modules.push({ raw: name, leafBase: `${decodeModuleLeaf(modValMatch[1]!, 'ts')}$${modValMatch[2]!}` });
      continue;
    }
    used.add(name);
  }

  return allocateProgramNames(source, tokens, used, seen, primary, shadowed, modules);
}

/** Rewrites C runtime identifiers into concise, collision-free Program view names. */
function simplifyCProgramNames(source: string): string {
  const declaredLiteLocals = new Set<string>();
  const declRe = /(?:int64_t\s+|const char\s*\*\s*|double\s+|bool\s+)(lite_[A-Za-z0-9_]+)\b/g;
  for (let m = declRe.exec(source); m !== null; m = declRe.exec(source)) {
    declaredLiteLocals.add(m[1]!);
  }

  const tokens = scanCodeTokens(source);
  const used = new Set(C_RESERVED);
  const visited = new Set<string>();
  const seen: string[] = [];
  const primary = new Map<string, string>();
  const shadowed: Array<{ raw: string; base: string; suffix: number }> = [];
  const modules: Array<{ raw: string; leafBase: string }> = [];

  for (const token of tokens) {
    const name = token.text;
    if (used.has(name) || visited.has(name)) continue;
    visited.add(name);

    if (C_RUNTIME_HELPERS.has(name) && !declaredLiteLocals.has(name)) {
      used.add(name);
      continue;
    }
    const fnMatch = /^lt_fn__([A-Za-z0-9_]+)$/.exec(name);
    if (fnMatch) {
      seen.push(name);
      primary.set(name, fnMatch[1]!);
      continue;
    }
    const localMatch = /^lite_([A-Za-z0-9_]+)$/.exec(name);
    if (localMatch) {
      seen.push(name);
      primary.set(name, localMatch[1]!);
      continue;
    }
    const shadowMatch = /^lt_s(\d+)_([A-Za-z0-9_]+)$/.exec(name);
    if (shadowMatch) {
      shadowed.push({ raw: name, base: shadowMatch[2]!, suffix: Math.max(2, Number(shadowMatch[1]!)) });
      continue;
    }
    const modMatch = /^lt_(?:fn|m)_((?:[A-Za-z0-9]|_(?:s|d|u|p|z|a\d+)_)+)__([A-Za-z_][A-Za-z0-9_]*)$/.exec(name)
      ?? /^lt_(?:fn|m)_(.+)__([A-Za-z0-9_]+)$/.exec(name);
    if (modMatch) {
      modules.push({ raw: name, leafBase: `${decodeModuleLeaf(modMatch[1]!, 'c')}_${modMatch[2]!}` });
      continue;
    }
    used.add(name);
  }

  return allocateProgramNames(source, tokens, used, seen, primary, shadowed, modules);
}

function simplifyTsDisplay(source: string): string {
  // Replace outside string literals by splitting on quoted strings first.
  const parts = source.split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g);
  for (let i = 0; i < parts.length; i += 2) {
    let chunk = parts[i]!;
    chunk = chunk.replace(/\bBoolean\((true|false)\)/g, '$1');
    // Unwrap `(atom)` only when NOT preceded by an identifier/call (so `fn(x)` stays `fn(x)`)
    chunk = chunk.replace(/(^|[^a-zA-Z0-9_$.)\]])(\(([a-zA-Z_$][a-zA-Z0-9_$]*|\d+n?)\))(?=\s*(?:===|!==|<=|>=|<|>|\+|-|\*|\/|%|\)|&&|\|\||\.toString\b))/g, '$1$3');
    // Collapse redundant double parens in if ((...)) / while ((...))
    let prev: string;
    do {
      prev = chunk;
      chunk = chunk.replace(/\b(if|while)\s*\(\(([^()\n]+)\)\)/g, '$1 ($2)');
    } while (chunk !== prev);
    parts[i] = chunk;
  }
  // Format `lite$emit(expr + "\n")` -> `lite$emit(expr, "\n")`
  return parts.join('').replace(/lite\$emit\(([^\n;]+?)\s*\+\s*"\\n"\)/g, 'lite$emit($1, "\\n")');
}

/** Formats generated TypeScript or C according to the selected playground view mode. */
export function formatCodeView(source: string, lang: 'ts' | 'c', mode: CodeViewMode): string {
  if (!source || mode === 'full') return source;
  if (lang === 'c') {
    return mode === 'program' ? simplifyCProgramNames(extractCProgram(source)) : extractCPortable(source);
  }
  return mode === 'program'
    ? simplifyTsDisplay(simplifyTsProgramNames(extractTsProgram(source)))
    : simplifyTsDisplay(extractTsPortable(source));
}
