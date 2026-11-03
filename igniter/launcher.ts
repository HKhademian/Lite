#!/usr/bin/env node
/** Repository CLI entry; command implementations remain ordinary TypeScript files. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generatedTestFiles, referenceTestFiles } from './test-suites.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const command = args.shift();
const usage = [
  'Usage: ./lite <command> [options]', '', 'Commands:',
  '  check file.lts                            Check source only',
  '  compile [--target ts] file.lts            Compile to a TS artifact',
  '  verify [--all|--update|--coverage]        Verify TS artifacts (--reference for T00)',
  '  test [--fast|--full] [--reference]        Test generated TS (or explicit T00 reference)',
  '  docs                                      Show documentation paths',
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
  case 'docs':
    if (args.length > 0) {
      process.stderr.write(`lite docs: unknown topic ${args[0]}\nRun ./lite docs for the complete list.\n`);
      process.exitCode = 2;
    } else {
      process.stdout.write('Lite documentation:\n' + [
        'docs/README.md', 'docs/spec/README.md', 'compiler/README.md', 'examples/README.md',
        'samples/list.md', 'igniter/README.md', 'igniter/tests/README.md', 'verifications/README.md', 'investigations/TOPICS.md',
      ].map(path => `  ${root}${path}\n`).join(''));
    }
    break;
  case 'compile': run('../compiler/launcher.ts', args);
  case 'verify': run('verify.ts', args);
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
      cwd: fileURLToPath(new URL('.', import.meta.url)), stdio: 'inherit',
      // Native C work resumes after TS migration; full still retains the generated source sweeps.
      env: testEnv,
    });
    if (result.error !== undefined) { process.stderr.write(`${result.error.message}\n`); process.exit(1); }
    if (result.signal !== null) { process.kill(process.pid, result.signal); process.exit(1); }
    process.exit(result.status ?? 1);
  }
  case 'check':
    if (args.length === 0) { process.stderr.write('Usage: ./lite check file.lts\n'); process.exit(2); }
    run('check.ts', args);
  default: process.stderr.write(usage); process.exitCode = 2;
}
