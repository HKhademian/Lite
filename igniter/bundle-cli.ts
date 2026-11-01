/** Internal manifest-backed compiler driver used by litec. Not a public command. */

import { readFileSync, writeSync } from 'node:fs';
import { loadCompiler } from './bootstrap.ts';
import type { RunResult } from './bootstrap.ts';

const args = process.argv.slice(2);
const target = args[0];
const path = args[1];
if ((target !== 'ts' && target !== 'c') || path === undefined) {
  process.stderr.write('Usage: node igniter/bundle-cli.ts ts|c file.lts\n');
  process.exitCode = 2;
} else {
  const manifest = new URL(`../compiler/manifests/${target}.json`, import.meta.url).pathname;
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path));
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      process.stderr.write(`${path}: InputFault: cannot read input: invalid UTF-8\n`);
      process.exitCode = 1;
    } else {
      process.stderr.write(`${path}: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 2;
    }
    source = '';
  }
  if (process.exitCode === undefined) {
    const result: RunResult = loadCompiler(manifest).compile({ text: source, name: path });
    if (result.stdout.length > 0) writeSync(1, result.stdout);
    if (result.stderr.length > 0) writeSync(2, result.stderr);
    process.exitCode = result.status;
  }
}
