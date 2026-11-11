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
const readSource = (importer: string, spec: string): Readonly<{ path: string; text: string }> => {
  if (spec.length === 0 || spec.startsWith('/') || spec.includes('\\') || /^[A-Za-z]:/.test(spec)) {
    throw new Error(`${importer}: import path must be nonempty, relative, and use "/" separators`);
  }
  const path = realpathSync(resolve(dirname(importer), spec));
  const bytes = readFileSync(path);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${path}: source is not valid UTF-8`);
  }
  return { path, text };
};
const output: unknown = imported.main((text: string): void => { writeSync(1, text); }, readSource);
if (typeof output !== 'string') throw new Error('compiler entry: main did not return text');
process.stdout.write(output);
