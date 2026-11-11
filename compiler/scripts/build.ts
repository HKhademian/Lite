#!/usr/bin/env node
/** Selects/rebuilds the generated TS compiler and its TS-hosted C emitter. */
import { buildCompiler } from '../host.ts';
try {
  process.stdout.write(JSON.stringify({ ts: buildCompiler('ts'), c: buildCompiler('c') }, null, 2) + '\n');
} catch (error) {
  process.stderr.write(`compiler build: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
