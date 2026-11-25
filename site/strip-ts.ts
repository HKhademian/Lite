/** Lightweight, string-aware TypeScript type stripper for Lite's emitted TypeScript. */

const IDENT_CONT_RE = /^[\p{XID_Continue}$]/u;

function isAsciiIdentStart(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95 || code === 36;
}

function isAsciiIdentCont(code: number): boolean {
  return isAsciiIdentStart(code) || (code >= 48 && code <= 57);
}

function isIdentContAt(source: string, index: number): boolean {
  if (index < 0 || index >= source.length) return false;
  const code = source.charCodeAt(index);
  if (code < 128) return isAsciiIdentCont(code);
  const cp = source.codePointAt(index)!;
  return cp !== 0x200c && cp !== 0x200d && IDENT_CONT_RE.test(String.fromCodePoint(cp));
}

function identCharStep(source: string, index: number): number {
  const code = source.charCodeAt(index);
  if (code < 128) return 1;
  return source.codePointAt(index)! > 0xffff ? 2 : 1;
}

function identContBackStep(source: string, endIndex: number): number {
  if (endIndex <= 0) return 0;
  const code = source.charCodeAt(endIndex - 1);
  if (code < 128) return 1;
  if (code >= 0xdc00 && code <= 0xdfff && endIndex >= 2) {
    const hi = source.charCodeAt(endIndex - 2);
    if (hi >= 0xd800 && hi <= 0xdbff) return 2;
  }
  return 1;
}

function isIdentContBefore(source: string, index: number): boolean {
  if (index <= 0) return false;
  return isIdentContAt(source, index - identContBackStep(source, index));
}

function isIdentOrDotBefore(source: string, index: number): boolean {
  return index > 0 && (source[index - 1] === '.' || isIdentContBefore(source, index));
}

function skipString(source: string, start: number): number {
  const quote = source[start]!;
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === '\\') { i += 2; continue; }
    if (source[i] === quote) return i + 1;
    i += 1;
  }
  return source.length;
}

function skipBalanced(source: string, start: number, open: string, close: string): number {
  let depth = 0;
  let i = start;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(source, i);
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  return source.length;
}

function skipGenericArgs(source: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(source, i);
      continue;
    }
    if (ch === ';' || ch === '{' || ch === '}' || ch === '\n') return -1;
    if (ch === '<') depth += 1;
    else if (ch === '>' && source[i - 1] !== '=') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  return -1;
}

function findArrowReturnTypeEnd(source: string, start: number): number {
  let i = start;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let angle = 0;

  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(source, i);
      continue;
    }
    if (paren === 0 && brace === 0 && bracket === 0 && angle === 0) {
      if (ch === '=' && source[i + 1] === '>') return i;
      if (ch === ';' || ch === '=' || ch === '?' || ch === ')' || ch === '}' || ch === ']' || ch === ',') {
        return -1;
      }
    }
    if (ch === '(') paren += 1;
    else if (ch === ')' && paren > 0) paren -= 1;
    else if (ch === '{') brace += 1;
    else if (ch === '}' && brace > 0) brace -= 1;
    else if (ch === '[') bracket += 1;
    else if (ch === ']' && bracket > 0) bracket -= 1;
    else if (ch === '<') angle += 1;
    else if (ch === '>' && source[i - 1] !== '=' && angle > 0) angle -= 1;
    i += 1;
  }
  return -1;
}

function skipTypeAnnotation(source: string, start: number, stopChars: ReadonlySet<string>): number {
  let i = start;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let angle = 0;

  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(source, i);
      continue;
    }
    if (ch === '=' && source[i + 1] === '>') {
      i += 2;
      continue;
    }
    if (paren === 0 && brace === 0 && bracket === 0 && angle === 0 && stopChars.has(ch)) {
      return i;
    }
    if (ch === '(') paren += 1;
    else if (ch === ')' && paren > 0) paren -= 1;
    else if (ch === '{') brace += 1;
    else if (ch === '}' && brace > 0) brace -= 1;
    else if (ch === '[') bracket += 1;
    else if (ch === ']' && bracket > 0) bracket -= 1;
    else if (ch === '<') angle += 1;
    else if (ch === '>' && source[i - 1] !== '=' && angle > 0) angle -= 1;
    i += 1;
  }
  return source.length;
}

function stripParamList(params: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < params.length) {
    // Copy parameter name (and optional ?)
    while (i < params.length && /\s/.test(params[i]!)) { out.push(params[i]!); i += 1; }
    if (i >= params.length) break;
    while (i < params.length && isIdentContAt(params, i)) {
      const step = identCharStep(params, i);
      out.push(params.slice(i, i + step));
      i += step;
    }
    while (i < params.length && /\s/.test(params[i]!)) { out.push(params[i]!); i += 1; }
    if (params[i] === '?') i += 1;
    while (i < params.length && /\s/.test(params[i]!)) { out.push(params[i]!); i += 1; }
    if (params[i] === ':') {
      i = skipTypeAnnotation(params, i + 1, new Set([',', '=']));
    }
    if (params[i] === '=') {
      const end = skipTypeAnnotation(params, i, new Set([',']));
      out.push(params.slice(i, end));
      i = end;
    }
    if (params[i] === ',') {
      out.push(',');
      i += 1;
    } else if (i < params.length) {
      out.push(params[i]!);
      i += 1;
    }
  }
  return out.join('');
}

const JS_EXPR_PREFIX_KEYWORDS = new Set([
  'return', 'throw', 'case', 'typeof', 'void', 'delete',
  'new', 'await', 'yield', 'else', 'do', 'in', 'of', 'instanceof',
]);

/** Strip TypeScript-only syntax from Lite's emitted TypeScript into browser-runnable JS. */
export function stripLiteTs(source: string): string {
  const out: string[] = [];
  let i = 0;
  const n = source.length;
  let depth = 0;
  const declListDepths: number[] = [];

  while (i < n) {
    const ch = source[i]!;

    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(source, i);
      out.push(source.slice(i, end));
      i = end;
      continue;
    }

    if (ch === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i + 2);
      const slice = end === -1 ? source.slice(i) : source.slice(i, end);
      out.push(slice);
      i += slice.length;
      continue;
    }

    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      const slice = end === -1 ? source.slice(i) : source.slice(i, end + 2);
      out.push(slice);
      i += slice.length;
      continue;
    }

    // `declare ...;`
    if (source.startsWith('declare ', i) && !isIdentContBefore(source, i)) {
      let j = i + 8;
      while (j < n && source[j] !== ';') {
        if (source[j] === '{') j = skipBalanced(source, j, '{', '}');
        else if (source[j] === '"' || source[j] === "'") j = skipString(source, j);
        else j += 1;
      }
      if (source[j] === ';') j += 1;
      i = j;
      continue;
    }

    // Top-level `type Name[<...>] = ...;`
    if (
      depth === 0 &&
      source.startsWith('type ', i) &&
      !isIdentOrDotBefore(source, i) &&
      /^type\s+[\p{XID_Start}_$][\p{XID_Continue}$]*(?:\s*<[^>]*>)?\s*=/u.test(source.slice(i, i + 160))
    ) {
      let j = i + 5;
      while (j < n && source[j] !== ';') {
        if (source[j] === '{') j = skipBalanced(source, j, '{', '}');
        else if (source[j] === '(') j = skipBalanced(source, j, '(', ')');
        else if (source[j] === '[') j = skipBalanced(source, j, '[', ']');
        else if (source[j] === '"' || source[j] === "'" || source[j] === '`') j = skipString(source, j);
        else j += 1;
      }
      if (source[j] === ';') j += 1;
      i = j;
      continue;
    }

    // Top-level `interface Name[<...>] [extends ...] { ... }`
    if (
      depth === 0 &&
      source.startsWith('interface ', i) &&
      !isIdentOrDotBefore(source, i) &&
      /^interface\s+[\p{XID_Start}_$][\p{XID_Continue}$]*(?:\s*<[^>]*>)?(?:\s+extends\s+[^{]+)?\s*\{/u.test(source.slice(i, i + 200))
    ) {
      const braceAt = source.indexOf('{', i + 10);
      if (braceAt !== -1) {
        let j = skipBalanced(source, braceAt, '{', '}');
        if (source[j] === ';') j += 1;
        i = j;
        continue;
      }
    }

    // `if ((import.meta as ...).main === true) { ... }` Node CLI entrypoint wrapper
    if (
      source.startsWith('if ', i) &&
      !isIdentContBefore(source, i) &&
      /^if\s*\(\s*\(?\s*import\.meta\b/.test(source.slice(i, i + 64))
    ) {
      const parenStart = source.indexOf('(', i + 2);
      const parenEnd = skipBalanced(source, parenStart, '(', ')');
      let bodyStart = parenEnd;
      while (bodyStart < n && /\s/.test(source[bodyStart]!)) bodyStart += 1;
      if (source[bodyStart] === '{') {
        i = skipBalanced(source, bodyStart, '{', '}');
        while (i < n && (source[i] === '\n' || source[i] === '\r')) i += 1;
        continue;
      }
    }

    // `function [name][<T>](...) : ReturnType {`
    if (
      source.startsWith('function', i) &&
      !isIdentContBefore(source, i) &&
      (source[i + 8] === ' ' || source[i + 8] === '\t' || source[i + 8] === '\n' || source[i + 8] === '(' || source[i + 8] === '<')
    ) {
      const fnHead = /^function(?:\s+[\p{XID_Start}_$][\p{XID_Continue}$]*)?/u.exec(source.slice(i));
      if (fnHead !== null) {
        let afterName = i + fnHead[0]!.length;
        while (afterName < n && /\s/.test(source[afterName]!)) afterName += 1;
        if (source[afterName] === '<') {
          const genericEnd = skipGenericArgs(source, afterName);
          if (genericEnd !== -1) afterName = genericEnd;
        }
        while (afterName < n && /\s/.test(source[afterName]!)) afterName += 1;
        if (source[afterName] === '(') {
          const parenStart = afterName;
          const parenEnd = skipBalanced(source, parenStart, '(', ')');
          out.push(`${fnHead[0]!}(`);
          out.push(stripParamList(source.slice(parenStart + 1, parenEnd - 1)));
          out.push(')');
          i = parenEnd;
          while (i < n && /\s/.test(source[i]!)) { out.push(source[i]!); i += 1; }
          if (source[i] === ':') {
            i = skipTypeAnnotation(source, i + 1, new Set(['{']));
            while (source[i] === '{') {
              const afterBrace = skipBalanced(source, i, '{', '}');
              const nextStop = skipTypeAnnotation(source, afterBrace, new Set(['{', ';', '\n']));
              if (source[nextStop] === '{') {
                i = nextStop;
              } else {
                break;
              }
            }
          }
          continue;
        }
      }
    }

    // Generic type arguments on calls/constructors: `Map<K, V>(`
    if (ch === '<' && isIdentContBefore(source, i)) {
      const angleEnd = skipGenericArgs(source, i);
      if (angleEnd !== -1 && source[angleEnd] === '(') {
        i = angleEnd;
        continue;
      }
    }

    // Arrow function `(...): ReturnType =>` or `(...) =>`
    if (ch === '(') {
      const parenEnd = skipBalanced(source, i, '(', ')');
      let after = parenEnd;
      while (after < n && /\s/.test(source[after]!)) after += 1;
      if (source[after] === '=' && source[after + 1] === '>') {
        out.push('(');
        out.push(stripParamList(source.slice(i + 1, parenEnd - 1)));
        out.push(')');
        out.push(source.slice(parenEnd, after + 2));
        i = after + 2;
        continue;
      }
      if (source[after] === ':') {
        const arrowAt = findArrowReturnTypeEnd(source, after + 1);
        if (arrowAt !== -1) {
          out.push('(');
          out.push(stripParamList(source.slice(i + 1, parenEnd - 1)));
          out.push(') ');
          out.push('=>');
          i = arrowAt + 2;
          continue;
        }
      }
    }

    // `const/let/var name[: Type] = ...[, name2[: Type] = ...];` and `let name!: Type;`
    const declMatch = /^(const|let|var)\s+([\p{XID_Start}_$][\p{XID_Continue}$]*)/u.exec(source.slice(i));
    if (declMatch !== null && !isIdentOrDotBefore(source, i)) {
      declListDepths.push(depth);
      out.push(`${declMatch[1]!} ${declMatch[2]!}`);
      i += declMatch[0]!.length;
      const typeMatch = /^\s*!?\s*:/.exec(source.slice(i));
      if (typeMatch !== null) {
        i += typeMatch[0]!.length;
        i = skipTypeAnnotation(source, i, new Set(['=', ',', ';']));
        if (source[i] === '=') out.push(' ');
      }
      continue;
    }

    // Subsequent comma-separated declarators in an active `const`/`let`/`var` list
    if (ch === ',' && declListDepths.length > 0 && declListDepths[declListDepths.length - 1] === depth) {
      out.push(',');
      i += 1;
      while (i < n && /\s/.test(source[i]!)) { out.push(source[i]!); i += 1; }
      const nextDecl = /^([\p{XID_Start}_$][\p{XID_Continue}$]*)\s*!?\s*:/u.exec(source.slice(i));
      if (nextDecl !== null) {
        out.push(nextDecl[1]!);
        i += nextDecl[0]!.length;
        i = skipTypeAnnotation(source, i, new Set(['=', ',', ';']));
        if (source[i] === '=') out.push(' ');
      }
      continue;
    }

    // `expr as Type` before `;`, `,`, `)`, or `]`
    if (i > 0 && !isIdentContBefore(source, i) && /^as\s+[\p{XID_Start}_$({[]/u.test(source.slice(i))) {
      i = skipTypeAnnotation(source, i + 2, new Set([';', ',', ')', ']']));
      continue;
    }

    // Postfix TypeScript non-null assertion `expr!` (must not strip prefix logical `!expr` or `!==`/`!=`).
    if (ch === '!' && source[i + 1] !== '=' && i > 0) {
      const prev = source[i - 1]!;
      if (prev === ']') {
        i += 1;
        continue;
      }
      if (isIdentContBefore(source, i)) {
        let wordStart = i - identContBackStep(source, i);
        while (wordStart > 0 && isIdentContBefore(source, wordStart)) {
          wordStart -= identContBackStep(source, wordStart);
        }
        if (!JS_EXPR_PREFIX_KEYWORDS.has(source.slice(wordStart, i))) {
          i += 1;
          continue;
        }
      } else if (prev === ')') {
        let next = i + 1;
        while (next < n && /\s/.test(source[next]!)) next += 1;
        const nextCh = source[next] ?? '';
        if (nextCh !== '' && '.[(;,)}:)?=*/%&|<>^'.includes(nextCh)) {
          i += 1;
          continue;
        }
      }
    }

    if (ch === '(' || ch === '{' || ch === '[') {
      depth += 1;
    } else if (ch === ')' || ch === '}' || ch === ']') {
      while (declListDepths.length > 0 && declListDepths[declListDepths.length - 1] === depth) {
        declListDepths.pop();
      }
      if (depth > 0) depth -= 1;
    } else if (ch === ';') {
      while (declListDepths.length > 0 && declListDepths[declListDepths.length - 1] === depth) {
        declListDepths.pop();
      }
    }

    out.push(ch);
    i += 1;
  }

  return out.join('');
}
