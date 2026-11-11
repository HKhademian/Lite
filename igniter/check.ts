/** Public check-only adapter: compile with generated Lite, then strictly check the TS artifact. */
import { writeSync } from 'node:fs';
import { compileTs } from '../compiler/host.ts';
import { checkTsArtifact } from './artifacts.ts';
import { loadSourceDetails } from './loader.ts';

const [path, ...extra] = process.argv.slice(2);
if (path === undefined || extra.length !== 0) {
  process.stderr.write('Usage: ./lite check file.lts\n');
  process.exitCode = 2;
} else {
  try {
    const loaded = loadSourceDetails(path);
    const result = loaded.dependencies.length === 1
      ? compileTs({ text: loaded.text, name: path })
      : compileTs({ text: loaded.text, lineMap: loaded.lineMap });
    if (result.status !== 0) {
      if (result.stderr.length > 0) writeSync(2, result.stderr);
      process.exitCode = 1;
    } else {
      const checked = checkTsArtifact(result.stdout.toString('utf8'));
      if (checked.status !== 0 || checked.signal !== null) {
        process.stderr.write(`${path}: generated TS failed strict checking\n`);
        if (checked.stdout.length > 0) writeSync(2, checked.stdout);
        if (checked.stderr.length > 0) writeSync(2, checked.stderr);
        process.exitCode = 1;
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message.startsWith(path + ':') ? message : path + ': ' + message}\n`);
    process.exitCode = 1;
  }
}
