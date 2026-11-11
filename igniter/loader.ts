import { readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

/** Whole-line build splice retained for test drivers and generated source bundles. */
const flatDirective = /^\s*importFlatAll\s+"([^"]*)"\s*;\s*$/;
const sourceImport = /^\s*import\s+"([^"\\]*)"\s*;\s*$/;

/** Bootstrap target named by a manifest. */
export type BundleTarget = 'ts' | 'c';

/** One flattened line's original source path and 1-based line number. */
export type LineMapEntry = Readonly<{ path: string; line: number }>;

/** Validated ordered manifest: one target and its relative source paths. */
export type Manifest = Readonly<{ target: BundleTarget; files: readonly string[] }>;

/** Flattened bundle text, line map, manifest roots and every opened dependency. */
export type Bundle = Readonly<{
  target: BundleTarget;
  text: string;
  lineMap: readonly LineMapEntry[];
  files: readonly string[];
  dependencies: readonly string[];
}>;

/** One source file expanded through top-level imports, with dependency order and original locations. */
export type LoadedSource = Readonly<{ text: string; lineMap: readonly LineMapEntry[]; dependencies: readonly string[] }>;

/**
 * Loads one UTF-8 Lite source file and expands top-level `import` declarations
 * plus the temporary `importFlatAll` build directive. Repeated imports and
 * source-import cycles terminate when a path is first opened.
 */
export function loadSource(path: string): string {
  return loadSourceDetails(path).text;
}

/** Loads one source root and retains source locations plus canonical dependency order. */
export function loadSourceDetails(path: string): LoadedSource {
  const absolute = resolve(path);
  const root = dirname(absolute);
  const lines: string[] = [];
  const lineMap: LineMapEntry[] = [];
  const dependencies: string[] = [];
  expandBundleFile(absolute, root, [], new Set<string>(), lines, lineMap, false, dependencies);
  return { text: lines.length === 0 ? '' : `${lines.join('\n')}\n`, lineMap, dependencies };
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
  dependencies: string[],
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
  dependencies.push(display);
  const text = readUtf8(path, 'source');
  const fileLines = sourceLines(text);
  const nextStack = [...stack, path];
  let inBlockComment = false;
  let inString = false;
  let braceDepth = 0;
  for (const [index, line] of fileLines.entries()) {
    const startsInString = inString;
    const startsInCode = !inBlockComment && !inString;
    const scanned = scanLine(line, inBlockComment, inString);
    inBlockComment = scanned.inBlockComment;
    inString = scanned.inString;
    if (startsInCode) {
      const imported = sourceImport.exec(scanned.code);
      const flattened = flatDirective.exec(scanned.code);
      if (braceDepth !== 0 && /^\s*import\b/.test(scanned.code)) {
        throw new Error(`${display}:${index + 1}: import is only allowed at top level`);
      }
      if (imported !== null || flattened !== null) {
        const spec = (imported ?? flattened)![1] ?? '';
        const kind = imported === null ? 'importFlatAll' : 'import';
        if (spec === '') throw new Error(`${display}:${index + 1}: ${kind} requires a path`);
        if (spec.startsWith('/') || spec.includes('\\') || /^[A-Za-z]:[\\/]/.test(spec)) {
          throw new Error(`${display}:${index + 1}: ${kind} requires a relative path using "/" separators`);
        }
        const child = resolve(dirname(path), spec);
        if (imported === null && nextStack.includes(child)) {
          throw new Error(`bundle cycle: ${[...nextStack, child].map(item => displayPath(root, item)).join(' -> ')}`);
        }
        // Source imports mark a canonical path visited as it opens. This makes
        // repeated edges and import cycles finite without hiding dependency order.
        if (imported !== null && included.has(child)) continue;
        expandBundleFile(child, root, nextStack, included, lines, lineMap, false, dependencies);
        continue;
      }
    }
    lines.push(line);
    lineMap.push({ path: display, line: index + 1 });
    braceDepth = updateBraceDepth(scanned.code, braceDepth, startsInString);
  }
}

/** Updates lexical brace depth while ignoring braces inside strings. */
function updateBraceDepth(code: string, initial: number, startsInString: boolean): number {
  let depth = initial;
  let inString = startsInString;
  for (let index = 0; index < code.length; index += 1) {
    const ch = code[index] ?? '';
    if (inString) {
      if (ch === '\\') index += 1;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') depth = Math.max(0, depth - 1);
  }
  return depth;
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
  const dependencies: string[] = [];
  const files: string[] = [];
  for (const item of resolved) {
    files.push(displayPath(root, item));
    expandBundleFile(item, root, stack, included, lines, lineMap, true, dependencies);
  }
  return {
    target: manifest.target,
    text: lines.length === 0 ? '' : `${lines.join('\n')}\n`,
    lineMap,
    files,
    dependencies,
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
