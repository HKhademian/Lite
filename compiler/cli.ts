/** Internal default compiler CLI. Both targets run Lite-generated compilers, without T00. */
import { readFileSync, writeSync } from 'node:fs';
import { compileTarget } from './host.ts';

const [target, path] = process.argv.slice(2);
if ((target !== 'ts' && target !== 'c') || path === undefined) {
  process.stderr.write('Usage: node compiler/cli.ts ts|c file.lts\n');
  process.exitCode = 2;
} else {
  let source: string | undefined;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path));
  } catch (error: unknown) {
    const invalidUtf8 = error instanceof TypeError;
    process.stderr.write(`${path}: ${invalidUtf8 ? 'InputFault: cannot read input: invalid UTF-8' : error instanceof Error ? error.message : String(error)}\n`);
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
