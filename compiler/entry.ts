/** Thin process adapter for one generated TS compiler; source arrives on stdin. */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync, realpathSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

const artifact = process.argv[2];
if (artifact === undefined) throw new Error('compiler entry: missing artifact path');
const projectRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const imported: unknown = await import(pathToFileURL(artifact).href);
if (typeof imported !== 'object' || imported === null || !('main' in imported) || typeof imported.main !== 'function') {
  throw new Error('compiler entry: artifact has no main function');
}
process.argv = [process.execPath, artifact, ...process.argv.slice(3)];
const sourceCache = new Map<string, Readonly<{ path: string; text: string }>>();
const sourceReads: { path: string; sha256: string }[] = [];
const sourceEdges: { importer: string; spec: string; path: string }[] = [];
class SourceReadFailure extends Error {}
const readSource = (importer: string, spec: string): Readonly<{ path: string; text: string }> => {
  if (spec.length === 0 || spec.startsWith('/') || spec.includes('\\') || /^[A-Za-z]:/.test(spec)) {
    throw new SourceReadFailure(`${importer}: import path must be nonempty, relative, and use "/" separators`);
  }
  let text: string;
  try {
    const repositorySource = importer.startsWith('compiler/') || importer.startsWith('lib/');
    const importerPath = isAbsolute(importer) ? importer : resolve(repositorySource ? projectRoot : process.cwd(), importer);
    const canonicalImporter = importerPath;
    const path = realpathSync(resolve(dirname(importerPath), spec));
    if (!sourceEdges.some(item => item.importer === canonicalImporter && item.spec === spec && item.path === path)) {
      sourceEdges.push({ importer: canonicalImporter, spec, path });
    }
    const cached = sourceCache.get(path);
    if (cached !== undefined) return cached;
    const bytes = readFileSync(path);
    if (!sourceReads.some(item => item.path === path)) {
      sourceReads.push({ path, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const projectRelative = relative(projectRoot, path);
    const identity = projectRelative === '..' || projectRelative.startsWith(`..${sep}`) || isAbsolute(projectRelative)
      ? path : projectRelative.split(sep).join('/');
    const loaded = { path: identity, text };
    sourceCache.set(path, loaded);
    return loaded;
  } catch {
    throw new SourceReadFailure(`${importer}: cannot read imported source ${spec}`);
  }
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
