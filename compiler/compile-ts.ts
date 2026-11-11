#!/usr/bin/env node
/** TypeScript target command for the Lite compiler. */
import { statSync } from 'node:fs';
import { versions } from '../tools/project.ts';

if (process.argv[2] === '--version') {
  console.log(`lite-compile-ts ${versions().compiler ?? 'unassigned'}`);
  process.exit(0);
}

const args = process.argv.slice(2);
if (args[0] === '--target' && args[1] === 'ts') args.splice(0, 2);
else if (args[0] === '--target=ts') args.shift();
const source = args[0];
if (args.length !== 1 || source === undefined || !source.endsWith('.lts')) {
  process.stderr.write('Usage: ./bin/lite-compile-ts file.lts\n');
  process.exit(2);
}
try {
  if (!statSync(source).isFile()) throw new Error('not a file');
} catch {
  process.stderr.write(`lite-compile-ts: cannot read ${source}\n`);
  process.exit(2);
}
process.argv = [process.execPath, process.argv[1] ?? 'lite-compile-ts', 'ts', source];
await import('./cli.ts');
