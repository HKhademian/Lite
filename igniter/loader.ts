import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Bootstrap target named by a manifest. */
export type BundleTarget = 'ts' | 'c';

/** Validated ordered manifest: one target and its relative source paths. */
export type Manifest = Readonly<{ target: BundleTarget; files: readonly string[] }>;

/** Reads one strict UTF-8 manifest. */
function readUtf8(path: string): string {
  const bytes = readFileSync(path);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${path}: manifest is not valid UTF-8`);
  }
}

/**
 * Validates one manifest path: nonempty, relative, `/`-separated and without a
 * Windows drive prefix. Traversal is allowed for compiler source roots under
 * `lib/`.
 */
function checkManifestPath(path: string, label: string): void {
  if (path.length === 0) throw new Error(`${label}: empty path`);
  if (path.startsWith('/')) throw new Error(`${label}: absolute path`);
  if (/^[A-Za-z]:/.test(path)) throw new Error(`${label}: drive-letter path`);
  if (path.includes('\\')) throw new Error(`${label}: path must use "/" separators`);
}

/** Loads and validates manifest metadata without opening or assembling source files. */
export function loadManifest(path: string): Manifest {
  const manifestPath = resolve(path);
  const text = readUtf8(manifestPath);
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
