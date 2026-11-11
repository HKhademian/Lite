#!/usr/bin/env node
/** Reserved C target command; the public C backend is not implemented yet. */
import { versions } from '../tools/project.ts';

if (process.argv[2] === '--version') {
  console.log(`lite-compile-c ${versions().compiler ?? 'unassigned'}`);
  process.exit(0);
}
process.stderr.write('lite-compile-c: C output is deferred until after the TS compiler migration\n');
process.exit(2);
