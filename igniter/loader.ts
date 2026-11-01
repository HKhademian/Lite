import { readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

/**
 * Whole-line temporary directive that splices a relative, declaration-only
 * source file. This is a loader workaround, not language syntax.
 */
const directive = /^\s*importFlatAll\s+"([^"]*)"\s*;\s*$/;

/** Bootstrap target named by a manifest. */
export type BundleTarget = 'ts' | 'c';

/** One flattened line's original source path and 1-based line number. */
export type LineMapEntry = Readonly<{ path: string; line: number }>;

/** Validated ordered manifest: one target and its relative source paths. */
export type Manifest = Readonly<{ target: BundleTarget; files: readonly string[] }>;

/** Flattened bundle text, line map and the manifest's top-level files. */
export type Bundle = Readonly<{
  target: BundleTarget;
  text: string;
  lineMap: readonly LineMapEntry[];
  files: readonly string[];
}>;

/**
 * Loads one UTF-8 Lite source file and expands temporary `importFlatAll`
 * directives. Each resolved file is included at most once; cycles, absolute
 * paths, missing files and invalid UTF-8 throw.
 */
export function loadSource(path: string): string {
  return flatten(resolve(path), [], new Set<string>());
}

/**
 * Reads one strict UTF-8 file. The label distinguishes source and manifest
 * diagnostics without changing the decoded text.
 */
function readUtf8(path: string, kind: 'source' | 'manifest'): string {
  const bytes = readFileSync(path);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${path}: ${kind} is not valid UTF-8`);
  }
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
  const text = readUtf8(path, 'source');
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

/**
 * Validates one manifest path: nonempty, relative, `/`-separated and without a
 * Windows drive prefix. Traversal outside the manifest directory is allowed so
 * manifests under `compiler/manifests/` can name `lib/` sources.
 */
function checkManifestPath(path: string, label: string): void {
  if (path.length === 0) throw new Error(`${label}: empty path`);
  if (path.startsWith('/')) throw new Error(`${label}: absolute path`);
  if (/^[A-Za-z]:/.test(path)) throw new Error(`${label}: drive-letter path`);
  if (path.includes('\\')) throw new Error(`${label}: path must use "/" separators`);
}

/**
 * Loads and validates one manifest without flattening its sources. Unknown keys,
 * invalid targets, duplicate entries and non-relative paths throw.
 */
export function loadManifest(path: string): Manifest {
  const manifestPath = resolve(path);
  const text = readUtf8(manifestPath, 'manifest');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error: unknown) {
    throw new Error(`${manifestPath}: invalid manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${manifestPath}: manifest must be a JSON object`);
  }
  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== 'target' && key !== 'files') throw new Error(`${manifestPath}: unexpected manifest key ${key}`);
  }
  const target = record['target'];
  if (target !== 'ts' && target !== 'c') throw new Error(`${manifestPath}: target must be "ts" or "c"`);
  const filesValue = record['files'];
  if (!Array.isArray(filesValue) || filesValue.length === 0) {
    throw new Error(`${manifestPath}: files must be a nonempty array`);
  }
  const files: string[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of filesValue.entries()) {
    const label = `${manifestPath}: files[${index}]`;
    if (typeof entry !== 'string') throw new Error(`${label}: must be a string`);
    checkManifestPath(entry, label);
    if (seen.has(entry)) throw new Error(`${label}: duplicate file ${entry}`);
    seen.add(entry);
    files.push(entry);
  }
  return { target, files };
}

/** Normalizes an absolute path to a manifest-relative `/`-separated path. */
function displayPath(root: string, path: string): string {
  return relative(root, path).split(sep).join('/');
}

/**
 * Splits bundle source into lines without inventing a trailing empty line. A
 * final newline terminates the last line; `\r` stays in the line content so a
 * CRLF source is preserved.
 */
function sourceLines(text: string): readonly string[] {
  const lines = text.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Appends one file's lines and mappings in manifest order. A directive line is
 * replaced by its child file. Included files are spliced once; an explicit
 * duplicate manifest entry is an error, while a repeated nested include is
 * skipped.
 */
function expandBundleFile(
  path: string,
  root: string,
  stack: readonly string[],
  included: Set<string>,
  lines: string[],
  lineMap: LineMapEntry[],
  explicit: boolean,
): void {
  const display = displayPath(root, path);
  if (stack.includes(path)) {
    throw new Error(`bundle cycle: ${[...stack, path].map(item => displayPath(root, item)).join(' -> ')}`);
  }
  if (included.has(path)) {
    if (explicit) throw new Error(`${display}: file is included more than once`);
    return;
  }
  included.add(path);
  const text = readUtf8(path, 'source');
  const fileLines = sourceLines(text);
  const nextStack = [...stack, path];
  let inBlockComment = false;
  let inString = false;
  for (const [index, line] of fileLines.entries()) {
    const startsInCode = !inBlockComment && !inString;
    const scanned = scanLine(line, inBlockComment, inString);
    inBlockComment = scanned.inBlockComment;
    inString = scanned.inString;
    if (startsInCode) {
      const match = directive.exec(scanned.code);
      if (match !== null) {
        const spec = match[1] ?? '';
        if (spec === '') throw new Error(`${display}:${index + 1}: importFlatAll requires a path`);
        if (spec.startsWith('/') || /^[A-Za-z]:[\\/]/.test(spec)) {
          throw new Error(`${display}:${index + 1}: importFlatAll requires a relative path`);
        }
        const child = resolve(dirname(path), spec);
        if (nextStack.includes(child)) {
          throw new Error(`bundle cycle: ${[...nextStack, child].map(item => displayPath(root, item)).join(' -> ')}`);
        }
        expandBundleFile(child, root, nextStack, included, lines, lineMap, false);
        continue;
      }
    }
    lines.push(line);
    lineMap.push({ path: display, line: index + 1 });
  }
}

/**
 * Loads a manifest and flattens its ordered sources. The returned text ends with
 * one newline and `lineMap[N - 1]` describes flattened 1-based line `N`.
 */
export function loadBundle(path: string): Bundle {
  const manifestPath = resolve(path);
  const manifest = loadManifest(manifestPath);
  const root = dirname(manifestPath);
  const resolved = manifest.files.map(entry => resolve(root, entry));
  const explicit = new Set<string>();
  for (const [index, item] of resolved.entries()) {
    if (explicit.has(item)) throw new Error(`${manifestPath}: files[${index}]: duplicate resolved file ${manifest.files[index] ?? ''}`);
    explicit.add(item);
  }
  const included = new Set<string>();
  const stack: string[] = [];
  const lines: string[] = [];
  const lineMap: LineMapEntry[] = [];
  const files: string[] = [];
  for (const item of resolved) {
    files.push(displayPath(root, item));
    expandBundleFile(item, root, stack, included, lines, lineMap, true);
  }
  return {
    target: manifest.target,
    text: lines.length === 0 ? '' : `${lines.join('\n')}\n`,
    lineMap,
    files,
  };
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
