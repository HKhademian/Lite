#!/usr/bin/env node
/** Selects/rebuilds the current TS compiler using the verified T11 seed, never T00. */
import { buildTsCompiler } from '../host.ts';
try {
  process.stdout.write(JSON.stringify(buildTsCompiler(), null, 2) + '\n');
} catch (error) {
  process.stderr.write(`compiler build: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
