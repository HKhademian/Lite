#!/usr/bin/env node
/** Repository CLI entry; command implementations remain ordinary TypeScript files. */
import { basename } from 'node:path';
import { versions } from './project.ts';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generatedTestFiles, referenceTestFiles } from '../igniter/test-suites.ts';

const args = process.argv.slice(2);
const executable = basename(process.argv[1] ?? 'lite');
const command = executable.startsWith('lite-') ? executable.slice(5) : args.shift();
const componentNames = { check: 'checker', test: 'tester', verify: 'verifier', docs: 'docs', doctor: 'doctor', compile: 'compiler' } as const;
if (command === '--version' || args[0] === '--version') {
  const current = versions();
  const key = command === '--version' ? 'cli' : componentNames[command as keyof typeof componentNames];
  if (key === undefined || (command === '--version' ? args.length !== 0 : args.length !== 1)) {
    process.stderr.write('lite: invalid version request\n'); process.exit(2);
  }
  process.stdout.write(`lite ${command === '--version' ? 'cli' : command} ${current[key] ?? 'unassigned'}\n`);
  process.exit(0);
}
const usage = [
  'Usage: ./lite <command> [options]', '', 'Commands:',
  '  check file.lts                            Check source only',
  '  compile [--target ts] file.lts            Compile to a TS artifact',
  '  verify [--all|--update|--coverage]        Verify TS artifacts (--reference for T00)',
  '  test [--fast|--full] [--reference]        Test generated TS (or explicit T00 reference)',
  '  docs [QUERY|--json|--check]                 Browse and search documentation',
  '  doctor [--docs]                           Check repository consistency',
  '  --version                                 Show CLI version',
  '  help                                      Show this help', '',
  'Compiler entry points: ./ltc, ./litec, ./lite compile',
  'Execute artifacts: node compiler/entry.ts program.ts [argument ...]',
  'C output is deferred until after the TS compiler migration.',
  'Reserved names: ./ltl/lite link, lite fmt', '',
].join('\n');

/** Preserves inherited streams, child exit status and signal termination. */
function run(path: string, argv: string[]): never {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(path, import.meta.url)), ...argv], {
    stdio: 'inherit',
  });
  if (result.error !== undefined) { process.stderr.write(`${result.error.message}\n`); process.exit(1); }
  if (result.signal !== null) { process.kill(process.pid, result.signal); process.exit(1); }
  process.exit(result.status ?? 1);
}

switch (command) {
  case 'help': case '--help': case '-h': process.stdout.write(usage); break;
  case 'docs': run('docs.ts', args);
  case 'doctor': run('check.ts', args);
  case 'compile': run('../compiler/launcher.ts', args);
  case 'verify': run('../igniter/verify.ts', args);
  case 'test': {
    let mode: '--fast' | '--full' | undefined;
    let reference = false;
    for (const arg of args) {
      if ((arg === '--fast' || arg === '--full') && mode === undefined) mode = arg;
      else if (arg === '--reference' && !reference) reference = true;
      else { process.stderr.write('Usage: ./lite test [--fast|--full] [--reference]\n'); process.exit(2); }
    }
    const testEnv: NodeJS.ProcessEnv = { ...process.env, LITE_SKIP_NATIVE: '1',
      ...(mode === '--fast' ? { LITE_SKIP_HEAVY: '1' } : {}) };
    // A CLI invoked from a Node test must launch an independent test coordinator.
    delete testEnv['NODE_TEST_CONTEXT'];
    // Reference tests never enter the default route or provide a fallback.
    const files = reference ? referenceTestFiles : generatedTestFiles;
    const result = spawnSync(process.execPath, ['--test', ...files], {
      cwd: fileURLToPath(new URL('../igniter/', import.meta.url)), stdio: 'inherit',
      // Native C work resumes after TS migration; full still retains the generated source sweeps.
      env: testEnv,
    });
    if (result.error !== undefined) { process.stderr.write(`${result.error.message}\n`); process.exit(1); }
    if (result.signal !== null) { process.kill(process.pid, result.signal); process.exit(1); }
    process.exit(result.status ?? 1);
  }
  case 'check':
    if (args.length === 0) { process.stderr.write('Usage: ./lite check file.lts\n'); process.exit(2); }
    run('../igniter/check.ts', args);
  default: process.stderr.write(usage); process.exitCode = 2;
}
