/** Lightweight, string-aware TypeScript type stripper for Lite's emitted TypeScript. */

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
    while (i < params.length && /[a-zA-Z0-9_$]/.test(params[i]!)) { out.push(params[i]!); i += 1; }
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

/** Strip TypeScript-only syntax from Lite's emitted TypeScript into browser-runnable JS. */
export function stripLiteTs(source: string): string {
  const out: string[] = [];
  let i = 0;
  const n = source.length;

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
    if (source.startsWith('declare ', i) && (i === 0 || !/[a-zA-Z0-9_$]/.test(source[i - 1]!))) {
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

    // `function name(...) : ReturnType {`
    if (source.startsWith('function ', i) && (i === 0 || !/[a-zA-Z0-9_$]/.test(source[i - 1]!))) {
      const parenStart = source.indexOf('(', i + 9);
      if (parenStart !== -1) {
        const parenEnd = skipBalanced(source, parenStart, '(', ')');
        out.push(source.slice(i, parenStart + 1));
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

    // Generic type arguments on calls/constructors: `Map<K, V>(`
    if (ch === '<' && i > 0 && /[a-zA-Z0-9_$]/.test(source[i - 1]!)) {
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

    // `const/let/var name: Type = ...;`
    const declMatch = /^(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.exec(source.slice(i));
    if (declMatch !== null && (i === 0 || !/[a-zA-Z0-9_$]/.test(source[i - 1]!))) {
      out.push(`${declMatch[1]!} ${declMatch[2]!}`);
      i += declMatch[0]!.length;
      i = skipTypeAnnotation(source, i, new Set(['=', ';']));
      if (source[i] === '=') out.push(' ');
      continue;
    }

    out.push(ch);
    i += 1;
  }

  return out.join('');
}
