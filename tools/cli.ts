#!/usr/bin/env node
/** Lite CLI router; operation behavior lives in the dedicated tool commands. */
import { join } from 'node:path';
import { forward } from './forward.ts';
import { root } from './project.ts';
import { showToolVersion } from './tool-version.ts';

const args = process.argv.slice(2);
if (showToolVersion('cli', 'cli')) process.exit(0);

const command = args.shift();
const usage = [
  'Usage: ./bin/lite <command> [options]', '', 'Commands:',
  '  check file.lts                            Check source only',
  '  compile [--target ts] file.lts            Compile to a TS artifact',
  '  run file.lts [-- argument ...]            Compile to a temporary artifact and execute it',
  '  verify [--all|--update|--coverage]        Verify generated TS artifacts',
  '  test [--smoke|--fast|--full] [--verbose|--mute|--silence]  Fast, quiet smoke by default',
  '  docs [QUERY|--json|--check]               Browse and search documentation',
  '  doctor [--docs]                           Check repository consistency',
  '  test --cases [FILTER|FILE.case.json]      Run declarative cases',
  '  verify FILE.case.json                     Verify one declarative manifest',
  '  bench OUTPUT [FILTER]                     Benchmark verified cases',
  '  release OUTPUT [TAG]                      Package a verified source snapshot',
  '  help                                      Show this help', '',
  'Compiler entry points: ./bin/lite-compile, ./bin/lite compile',
  'Target commands: ./bin/lite-compile-ts, ./bin/lite-compile-c',
  'C output is deferred until after the TS compiler migration.',
  'Reserved names: ./ltl/lite link, lite fmt', '',
].join('\n');

if (command === 'help' || command === '--help' || command === '-h') {
  process.stdout.write(usage);
  process.exit(0);
}
if (command === undefined) {
  process.stderr.write(usage);
  process.exit(2);
}

const routes: Record<string, string> = {
  check: 'lite-check',
  compile: 'lite-compile',
  run: 'lite-run',
  verify: 'lite-verify',
  test: 'lite-test',
  docs: 'lite-docs',
  doctor: 'lite-doctor',
  bench: 'lite-bench',
  release: 'lite-release',
};
const target = routes[command];
if (target === undefined) {
  process.stderr.write(usage);
  process.exit(2);
}
forward(join(root, 'bin', target), args);
