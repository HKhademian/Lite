import { readFileSync, readSync, writeSync } from 'node:fs';
import { compile, execute, LiteFault } from './lite.ts';

const args = process.argv.slice(2);
const checkOnly = args[0] === '--check';
const path = args[checkOnly ? 1 : 0];
if (path === undefined || args.length !== (checkOnly ? 2 : 1)) {
  process.stderr.write('Usage: node igniter/cli.ts [--check] file.lts\n');
  process.exitCode = 2;
} else {
  try {
    const source = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path));
    const program = compile(source);
    if (!checkOnly) {
      const byte = Buffer.alloc(1);
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let ended = false;
      process.exitCode = execute(program, {
        read: () => {
          if (ended) return null;
          while (true) {
            if (readSync(0, byte) === 0) { ended = true; return decoder.decode() || null; }
            const text = decoder.decode(byte, { stream: true });
            if (text !== '') return text;
          }
        },
        report: text => { writeSync(1, text); },
        reportError: text => { writeSync(2, text); },
      });
    }
  } catch (error: unknown) {
    if (error instanceof LiteFault) {
      process.stderr.write(`${path}:${error.at.line}:${error.at.column}: ${error.category}: ${error.message}\n`);
    } else if (error instanceof RangeError) {
      process.stderr.write(`${path}: igniter resource/nesting limit exceeded\n`);
    } else {
      process.stderr.write(`${path}: ${error instanceof Error ? error.message : String(error)}\n`);
    }
    process.exitCode = 1;
  }
}
