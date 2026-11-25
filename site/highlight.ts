/** Lightweight HTML-safe syntax highlighter for LiteLang and generated TypeScript. */

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const liteKeywords = new Set([
  'as', 'and', 'break', 'continue', 'else', 'enum', 'false', 'finally', 'fn', 'if',
  'import', 'loop', 'match', 'mut', 'not', 'or', 'pub', 'record', 'return',
  'self', 'then', 'true', 'type', 'var', 'while',
]);

const liteTypes = new Set([
  'Bool', 'Int', 'Int8', 'Int16', 'Int32', 'Int64', 'Float', 'Float32', 'Float64', 'Double', 'String', 'Unit', 'Void', 'Never', 'List', 'Map', 'Set', 'Array', 'Self',
]);

const liteMetaProps = new Set([
  'item', 'index', 'count', 'value', 'collected',
]);

const tsKeywords = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const',
  'continue', 'declare', 'default', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
  'interface', 'let', 'new', 'null', 'of', 'readonly', 'return',
  'switch', 'throw', 'true', 'try', 'type', 'typeof', 'undefined',
  'var', 'void', 'while',
]);

const cKeywords = new Set([
  'break', 'case', 'const', 'continue', 'default', 'do', 'else', 'enum',
  'extern', 'false', 'for', 'goto', 'if', 'inline', 'return', 'sizeof',
  'static', 'struct', 'switch', 'true', 'typedef', 'union', 'volatile', 'while',
]);

const cTypes = new Set([
  'bool', 'char', 'double', 'float', 'int', 'int8_t', 'int16_t', 'int32_t',
  'int64_t', 'long', 'short', 'size_t', 'uint8_t', 'uint16_t', 'uint32_t',
  'uint64_t', 'void', '_Noreturn',
]);

const IDENT_START_RE = /^[\p{XID_Start}_$]/u;
const IDENT_CONT_RE = /^[\p{XID_Continue}$]/u;

function identStartStep(source: string, index: number, allowDollar = true): number {
  if (index >= source.length) return 0;
  const c = source.charCodeAt(index);
  if (c < 128) {
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || (allowDollar && c === 36)) return 1;
    return 0;
  }
  const cp = source.codePointAt(index)!;
  const ch = String.fromCodePoint(cp);
  return IDENT_START_RE.test(ch) ? ch.length : 0;
}

function consumeIdent(source: string, startAfterFirst: number, allowDollar = true): number {
  let j = startAfterFirst;
  const n = source.length;
  while (j < n) {
    const c = source.charCodeAt(j);
    if (c < 128) {
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95 || (allowDollar && c === 36)) {
        j += 1;
        continue;
      }
      break;
    }
    const cp = source.codePointAt(j)!;
    if (cp === 0x200c || cp === 0x200d) break;
    const ch = String.fromCodePoint(cp);
    if (!IDENT_CONT_RE.test(ch)) break;
    j += ch.length;
  }
  return j;
}

function highlightCode(source: string, keywords: ReadonlySet<string>, types: ReadonlySet<string>, highlightTags = false): string {
  const out: string[] = [];
  let i = 0;
  const n = source.length;

  while (i < n) {
    const ch = source[i]!;

    // Block comment /* ... */
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      const slice = end === -1 ? source.slice(i) : source.slice(i, end + 2);
      out.push(`<span class="tok-comment">${escapeHtml(slice)}</span>`);
      i += slice.length;
      continue;
    }

    // Line comment // ...
    if (ch === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i + 2);
      const slice = end === -1 ? source.slice(i) : source.slice(i, end);
      out.push(`<span class="tok-comment">${escapeHtml(slice)}</span>`);
      i += slice.length;
      continue;
    }

    // Preprocessor directive (#include, #define, etc.)
    if (ch === '#' && (i === 0 || source[i - 1] === '\n')) {
      const end = source.indexOf('\n', i + 1);
      const slice = end === -1 ? source.slice(i) : source.slice(i, end);
      out.push(`<span class="tok-keyword">${escapeHtml(slice)}</span>`);
      i += slice.length;
      continue;
    }

    // String literal "..." or '...'
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === ch) { j += 1; break; }
        j += 1;
      }
      out.push(`<span class="tok-string">${escapeHtml(source.slice(i, j))}</span>`);
      i = j;
      continue;
    }

    // Numbers
    if (ch >= '0' && ch <= '9') {
      let j = i + 1;
      while (j < n && /[0-9_a-zA-Z.]/.test(source[j]!)) j += 1;
      out.push(`<span class="tok-number">${escapeHtml(source.slice(i, j))}</span>`);
      i = j;
      continue;
    }

    // Tagged control-flow labels (@tag) in LiteScript
    if (highlightTags && ch === '@' && i + 1 < n) {
      const tagStartStep = identStartStep(source, i + 1, false);
      if (tagStartStep > 0) {
        const j = consumeIdent(source, i + 1 + tagStartStep, false);
        out.push(`<span class="tok-keyword">${escapeHtml(source.slice(i, j))}</span>`);
        i = j;
        continue;
      }
    }

    // Loop metadata and built-in collection/string properties (.item, .collected, .length, .size, .isEmpty)
    if (highlightTags && ch === '.' && i + 1 < n) {
      const propStartStep = identStartStep(source, i + 1, false);
      if (propStartStep > 0) {
        const j = consumeIdent(source, i + 1 + propStartStep, false);
        const prop = source.slice(i + 1, j);
        if (liteMetaProps.has(prop)) {
          out.push(`.<span class="tok-type">${escapeHtml(prop)}</span>`);
          i = j;
          continue;
        }
      }
    }

    // Identifiers, keywords, built-in types
    const idStartStep = identStartStep(source, i, true);
    if (idStartStep > 0) {
      const j = consumeIdent(source, i + idStartStep, true);
      const word = source.slice(i, j);
      if (keywords.has(word)) {
        out.push(`<span class="tok-keyword">${escapeHtml(word)}</span>`);
      } else if (types.has(word)) {
        out.push(`<span class="tok-type">${escapeHtml(word)}</span>`);
      } else {
        out.push(escapeHtml(word));
      }
      i = j;
      continue;
    }

    // Multi-char operators
    const two = source.slice(i, i + 2);
    const three = source.slice(i, i + 3);
    if (['===', '!==', '=!=', ':/=', ':%=', '<!=', '>!='].includes(three)) {
      out.push(`<span class="tok-op">${escapeHtml(three)}</span>`);
      i += 3;
      continue;
    }
    if ([':=', '==', '!=', '<=', '>=', '=>', '->', '**', ':/', ':%', '+=', '-=', '*=', '/=', '%=', '<!', '>!'].includes(two)) {
      out.push(`<span class="tok-op">${escapeHtml(two)}</span>`);
      i += 2;
      continue;
    }

    out.push(escapeHtml(ch));
    i += 1;
  }

  return out.join('');
}

export function highlightLite(source: string): string {
  return highlightCode(source, liteKeywords, liteTypes, true);
}

export function highlightTs(source: string): string {
  return highlightCode(source, tsKeywords, new Set(['bigint', 'boolean', 'number', 'string', 'void', 'never', 'unknown']));
}

export function highlightC(source: string): string {
  return highlightCode(source, cKeywords, cTypes);
}
