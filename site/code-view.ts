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

    if (trimmed === 'let lite_out = "";' || trimmed === 'return lite_out;') {
      i += 1;
      continue;
    }
    if (trimmed.startsWith('function lite$emit(')) {
      i = skipBraceBlock(body, i);
      continue;
    }
    if (/^void\s+(?:lite\$emit|lite_[a-zA-Z0-9_$]+|liteFn_[a-zA-Z0-9_$]+);$/.test(trimmed)) {
      i += 1;
      continue;
    }
    if (/^function\s+liteFn_m\d+_/.test(trimmed)) {
      i = skipBraceBlock(body, i);
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
    if (/^void\s+(?:lite\$emit|lite_[a-zA-Z0-9_$]+|liteFn_[a-zA-Z0-9_$]+);$/.test(trimmed)) {
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
    .filter((line) => !/^\(void\)lite_[a-zA-Z0-9_]+;$/.test(line.trim()))
    .join('\n');
}

function extractCPortable(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  return lines
    .filter((line) => !/^\(void\)lite_[a-zA-Z0-9_]+;$/.test(line.trim()))
    .join('\n');
}

/** Formats generated TypeScript or C according to the selected playground view mode. */
export function formatCodeView(source: string, lang: 'ts' | 'c', mode: CodeViewMode): string {
  if (!source || mode === 'full') return source;
  if (lang === 'c') {
    return mode === 'program' ? extractCProgram(source) : extractCPortable(source);
  }
  return mode === 'program' ? extractTsProgram(source) : extractTsPortable(source);
}
