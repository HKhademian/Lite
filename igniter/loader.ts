import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Whole-line temporary directive that splices a relative, declaration-only
 * source file. This is a loader workaround, not language syntax.
 */
const directive = /^\s*importFlatAll\s+"([^"]*)"\s*;\s*$/;

/**
 * Loads one UTF-8 Lite source file and expands temporary `importFlatAll`
 * directives. Each resolved file is included at most once; cycles, absolute
 * paths, missing files and invalid UTF-8 throw.
 */
export function loadSource(path: string): string {
  return flatten(resolve(path), [], new Set<string>());
}

/**
 * Recursively expands one file. `stack` detects cycles, while `included` keeps
 * a file from being spliced twice in the same load. Imported text replaces the
 * directive line; all other lines are preserved.
 */
function flatten(path: string, stack: readonly string[], included: Set<string>): string {
  if (stack.includes(path)) {
    throw new Error(`importFlatAll cycle: ${[...stack, path].join(' -> ')}`);
  }
  if (included.has(path)) return '';
  included.add(path);
  const bytes = readFileSync(path);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${path}: source is not valid UTF-8`);
  }
  const nextStack = [...stack, path];
  const lines = text.split(/\r?\n/);
  const output: string[] = [];
  let inBlockComment = false;
  let inString = false;
  for (const [index, line] of lines.entries()) {
    const startsInCode = !inBlockComment && !inString;
    const scanned = scanLine(line, inBlockComment, inString);
    inBlockComment = scanned.inBlockComment;
    inString = scanned.inString;
    if (startsInCode) {
      const match = directive.exec(scanned.code);
      if (match !== null) {
        const spec = match[1] ?? '';
        if (spec === '') throw new Error(`${path}:${index + 1}: importFlatAll requires a path`);
        if (spec.startsWith('/') || /^[A-Za-z]:[\\/]/.test(spec)) {
          throw new Error(`${path}:${index + 1}: importFlatAll requires a relative path`);
        }
        const child = flatten(resolve(dirname(path), spec), nextStack, included);
        if (child !== '') output.push(child.replace(/\n$/, ''));
        continue;
      }
    }
    output.push(line);
  }
  return output.join('\n');
}

/** Per-line scanner result: code outside comments plus carried block/string state. */
type Scan = Readonly<{ code: string; inBlockComment: boolean; inString: boolean }>;

/**
 * Removes comment text from one line while tracking block-comment and
 * multiline-string state across lines. Used only to recognize directives in
 * code context, not to tokenize Lite source.
 */
function scanLine(line: string, startBlockComment: boolean, startString: boolean): Scan {
  let inBlockComment = startBlockComment;
  let inString = startString;
  let code = '';
  let index = 0;
  while (index < line.length) {
    const ch = line[index] ?? '';
    const next = line[index + 1] ?? '';
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; index += 2; continue; }
      index += 1;
      continue;
    }
    if (inString) {
      code += ch;
      if (ch === '\\') { code += next; index += 2; continue; }
      if (ch === '"') inString = false;
      index += 1;
      continue;
    }
    if (ch === '/' && next === '/') break;
    if (ch === '/' && next === '*') { inBlockComment = true; index += 2; continue; }
    if (ch === '"') { inString = true; code += ch; index += 1; continue; }
    code += ch;
    index += 1;
  }
  return { code, inBlockComment, inString };
}
