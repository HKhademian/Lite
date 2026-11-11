#!/usr/bin/env node
/** Compiler command router. Target implementations have their own commands. */
import { join } from 'node:path';
import { forward } from '../tools/forward.ts';
import { root, versions } from '../tools/project.ts';

function usage(): never {
  process.stderr.write('Usage: ./bin/lite-compile [--target ts|c] file.lts\n');
  process.exit(2);
}

if (process.argv[2] === '--version') {
  console.log(`lite-compile ${versions().compiler ?? 'unassigned'}`);
  process.exit(0);
}

const args = process.argv.slice(2);
let target = 'ts';
if (args[0] === 'ts' || args[0] === 'c') target = args.shift()!;
else if (args[0] === '--target') {
  args.shift();
  const value = args.shift();
  if (value !== 'ts' && value !== 'c') usage();
  target = value;
} else if (args[0]?.startsWith('--target=')) {
  target = args.shift()!.slice('--target='.length);
}
if (target !== 'ts' && target !== 'c') usage();
forward(join(root, 'bin', `lite-compile-${target}`), args);
