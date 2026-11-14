/** Internal default compiler CLI. Both targets run Lite-generated compilers, without T00. */
import { writeSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileTarget, type CompilerInput } from './host.ts';
import { displaySourcePath, readSourceInput } from './source.ts';

const rawArgs = process.argv.slice(2);
const options: string[] = [];
const positional: string[] = [];
let optionError = false;
for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i]!;
  if (arg === '--builtin-mode') {
    const val = rawArgs[i + 1];
    if (val === undefined) {
      optionError = true;
      break;
    }
    options.push(arg, val);
    i += 1;
  } else if (arg.startsWith('--builtin-mode=')) {
    options.push(arg);
  } else {
    positional.push(arg);
  }
}
const [target, path] = positional;
if (optionError || (target !== 'ts' && target !== 'c') || path === undefined || positional.length !== 2) {
  process.stderr.write('Usage: node compiler/cli.ts ts|c [--builtin-mode SPEC]... file.lts\n');
  process.exitCode = 2;
} else {
  let input: CompilerInput | undefined;
  try {
    const source = readSourceInput(path);
    input = { text: source.text, name: displaySourcePath(resolve(path)), rootPath: source.path, options };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const invalidUtf8 = message.includes('source is not valid UTF-8');
    process.stderr.write(invalidUtf8 ? `${path}: InputFault: cannot read input: invalid UTF-8\n`
      : `${message.startsWith(path + ':') ? message : path + ': ' + message}\n`);
    process.exitCode = invalidUtf8 ? 1 : 2;
  }
  if (input !== undefined) {
    try {
      const result = compileTarget(target, input);
      if (result.stdout.length > 0) writeSync(1, result.stdout);
      if (result.stderr.length > 0) writeSync(2, result.stderr);
      process.exitCode = result.status;
    } catch (error: unknown) {
      process.stderr.write(`lite-compile-ts: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  }
}
