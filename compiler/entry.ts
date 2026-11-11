/** Thin process adapter for one generated TS compiler; source arrives on stdin. */
import { pathToFileURL } from 'node:url';
import { readFileSync, realpathSync, writeSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const artifact = process.argv[2];
if (artifact === undefined) throw new Error('compiler entry: missing artifact path');
const imported: unknown = await import(pathToFileURL(artifact).href);
if (typeof imported !== 'object' || imported === null || !('main' in imported) || typeof imported.main !== 'function') {
  throw new Error('compiler entry: artifact has no main function');
}
process.argv = [process.execPath, artifact, ...process.argv.slice(3)];
const sourceCache = new Map<string, Readonly<{ path: string; text: string }>>();
class SourceReadFailure extends Error {}
const readSource = (importer: string, spec: string): Readonly<{ path: string; text: string }> => {
  if (spec.length === 0 || spec.startsWith('/') || spec.includes('\\') || /^[A-Za-z]:/.test(spec)) {
    throw new SourceReadFailure(`${importer}: import path must be nonempty, relative, and use "/" separators`);
  }
  let text: string;
  try {
    const path = realpathSync(resolve(dirname(importer), spec));
    const cached = sourceCache.get(path);
    if (cached !== undefined) return cached;
    const bytes = readFileSync(path);
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const loaded = { path, text };
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
  process.exit(2);
}
if (typeof output !== 'string') throw new Error('compiler entry: main did not return text');
process.stdout.write(output);
