#!/usr/bin/env node
/** Public compiler argument adapter shared by litec, ltc and lite compile. */
import { statSync } from 'node:fs';

function usage(): never {
  process.stderr.write('Usage: ./ltc --target ts|c file.lts\n       ./litec --target ts|c file.lts\n       ./lite compile --target ts|c file.lts\n');
  process.exit(2);
}
const args = process.argv.slice(2);
let target: string | undefined;
while (args.length > 0) {
  const arg = args[0];
  if (arg === '--target') { args.shift(); target = args.shift(); if (target === undefined) usage(); }
  else if (arg?.startsWith('--target=')) { target = args.shift()?.slice(9); }
  else if (arg === 'ts' || arg === 'c') { if (target !== undefined) usage(); target = args.shift(); }
  else { if (arg === '--') args.shift(); break; }
}
const path = args[0];
if ((target !== 'ts' && target !== 'c') || args.length !== 1 || path === undefined) usage();
if (!path.endsWith('.lts')) { process.stderr.write('litec: source must be a .lts file\n'); process.exit(2); }
try { if (!statSync(path).isFile()) throw new Error('not a file'); }
catch { process.stderr.write(`litec: cannot read ${path}\n`); process.exit(2); }
process.argv = [process.execPath, process.argv[1] ?? 'litec', target, path];
await import('./cli.ts');
