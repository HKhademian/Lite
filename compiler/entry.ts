/** Thin process adapter for one generated TS compiler; source arrives on stdin. */
import { pathToFileURL } from 'node:url';
import { writeSync } from 'node:fs';

const artifact = process.argv[2];
if (artifact === undefined) throw new Error('compiler entry: missing artifact path');
const imported: unknown = await import(pathToFileURL(artifact).href);
if (typeof imported !== 'object' || imported === null || !('main' in imported) || typeof imported.main !== 'function') {
  throw new Error('compiler entry: artifact has no main function');
}
process.argv = [process.execPath, artifact, ...process.argv.slice(3)];
const output: unknown = imported.main((text: string): void => { writeSync(1, text); });
if (typeof output !== 'string') throw new Error('compiler entry: main did not return text');
process.stdout.write(output);
