#!/usr/bin/env node
/** Repository CLI entry; command implementations remain ordinary TypeScript files. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const command = args.shift();
const usage = [
  'Usage: ./lite <command> [options]', '', 'Commands:',
  '  run [--check] file.lts [-- argument ...]  Run a Lite source',
  '  check file.lts                            Check source only',
  '  compile --target ts|c file.lts            Compile to TS or C',
  '  verify [--all|--update|--coverage]        Verify changed cases (--all for everything)',
  '  test [--fast|--full]                      Run the project test suite',
  '  docs                                      Show documentation paths',
  '  help                                      Show this help', '',
  'Compiler entry points: ./ltc, ./litec, ./lite compile',
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
    const mode = args.shift();
    if (mode !== undefined && mode !== '--fast' && mode !== '--full') {
      process.stderr.write(`lite test: unknown option ${mode}\n`); process.exit(2);
    }
    if (args.length > 0) { process.stderr.write('Usage: ./lite test [--fast|--full]\n'); process.exit(2); }
    // Node's test flags precede the files rather than the script position used by run().
    const result = spawnSync(process.execPath, ['--test', 'test.ts', '../compiler/tests/host.test.ts', 'source-files.test.ts', '../challenges/tools/tools.test.ts'], {
      cwd: fileURLToPath(new URL('.', import.meta.url)), stdio: 'inherit',
      env: mode === '--fast' ? { ...process.env, LITE_SKIP_NATIVE: '1', LITE_SKIP_HEAVY: '1' } : process.env,
    });
    if (result.error !== undefined) { process.stderr.write(`${result.error.message}\n`); process.exit(1); }
    if (result.signal !== null) { process.kill(process.pid, result.signal); process.exit(1); }
    process.exit(result.status ?? 1);
  }
  case 'check':
    if (args.length === 0) { process.stderr.write('Usage: ./lite check file.lts\n'); process.exit(2); }
    run('cli.ts', ['--check', ...args]);
  case 'run':
    if (args.length === 0) { process.stderr.write(usage); process.exit(2); }
    run('cli.ts', args);
  default: process.stderr.write(usage); process.exitCode = 2;
}
