/** Thin process adapter for one generated TS compiler; source arrives on stdin. */
import { pathToFileURL } from 'node:url';
import { readFileSync, realpathSync, writeSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { displaySourcePath, resolveImportPath, sourceModuleIdentity } from './source.ts';

const artifact = process.argv[2];
if (artifact === undefined) throw new Error('compiler entry: missing artifact path');
const imported: unknown = await import(pathToFileURL(artifact).href);
if (typeof imported !== 'object' || imported === null || !('main' in imported) || typeof imported.main !== 'function') {
  throw new Error('compiler entry: artifact has no main function');
}
process.argv = [process.execPath, artifact, ...process.argv.slice(3)];
const unnamedRootPath = process.argv[2] === '' && process.argv[4] !== undefined
  ? resolve(process.argv[4]) : undefined;
const sourceCache = new Map<string, Readonly<{ path: string; display: string; identity: string; text: string }>>();
const sourceReads: { path: string; sha256: string }[] = [];
const sourceEdges: { importer: string; spec: string; path: string }[] = [];
class SourceReadFailure extends Error {}
const sourceFailure = (path: string, message: string): SourceReadFailure => {
  const sourceName = path === unnamedRootPath ? '' : displaySourcePath(path);
  return new SourceReadFailure(`${sourceName === '' ? '' : `${sourceName}: `}${message}`);
};
const readSource = (importer: string, spec: string): Readonly<{ path: string; display: string; identity: string; text: string }> => {
  const importerPath = isAbsolute(importer) ? importer : resolve(process.cwd(), importer || '__lite_stdin__.lts');
  let unresolved: string;
  try {
    unresolved = resolveImportPath(importerPath, spec, process.cwd());
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'invalid import path';
    throw sourceFailure(importerPath, reason);
  }
  let path: string;
  try {
    path = realpathSync(unresolved);
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : 'resolve error';
    throw sourceFailure(importerPath, `cannot read imported source ${spec} (${code})`);
  }
  if (!sourceEdges.some(item => item.importer === importerPath && item.spec === spec && item.path === path)) {
    sourceEdges.push({ importer: importerPath, spec, path });
  }
  const cached = sourceCache.get(path);
  if (cached !== undefined) return cached;
  let bytes: Buffer;
  try {
    bytes = readFileSync(path);
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : 'read error';
    throw sourceFailure(importerPath, `cannot read imported source ${spec} (${code})`);
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw sourceFailure(importerPath, `imported source ${spec} is not valid UTF-8`);
  }
  if (!sourceReads.some(item => item.path === path)) {
    sourceReads.push({ path, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const loaded = { path, display: displaySourcePath(path), identity: sourceModuleIdentity(bytes), text };
  sourceCache.set(path, loaded);
  return loaded;
};
let output: unknown;
try {
  output = imported.main((text: string): void => { writeSync(1, text); }, readSource);
} catch (error: unknown) {
  if (!(error instanceof SourceReadFailure)) throw error;
  writeSync(2, Buffer.from(`${error.message}\n`));
  process.exitCode = 2;
}
if (process.env['LITE_SOURCE_TRACE'] === '1') writeSync(3, Buffer.from(JSON.stringify({ files: sourceReads, edges: sourceEdges })));
if (output === undefined) {
  process.exitCode = 2;
} else {
  if (typeof output !== 'string') throw new Error('compiler entry: main did not return text');
  process.stdout.write(output);
}
