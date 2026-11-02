/** Internal default compiler CLI. Both targets run Lite-generated compilers, without T00. */
import { writeSync } from 'node:fs';
import { compileTarget } from './host.ts';
import { loadSource } from '../igniter/loader.ts';

const [target, path] = process.argv.slice(2);
if ((target !== 'ts' && target !== 'c') || path === undefined) {
  process.stderr.write('Usage: node compiler/cli.ts ts|c file.lts\n');
  process.exitCode = 2;
} else {
  let source: string | undefined;
  try {
    source = loadSource(path);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const invalidUtf8 = message.includes('source is not valid UTF-8');
    process.stderr.write(invalidUtf8 ? `${path}: InputFault: cannot read input: invalid UTF-8\n`
      : `${message.startsWith(path + ':') ? message : path + ': ' + message}\n`);
    process.exitCode = invalidUtf8 ? 1 : 2;
  }
  if (source !== undefined) {
    try {
      const result = compileTarget(target, { text: source, name: path });
      if (result.stdout.length > 0) writeSync(1, result.stdout);
      if (result.stderr.length > 0) writeSync(2, result.stderr);
      process.exitCode = result.status;
    } catch (error: unknown) {
      process.stderr.write(`litec: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  }
}
