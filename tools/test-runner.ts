#!/usr/bin/env node
/** Standalone generated test command; `lite test` routes here. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generatedTestFiles } from '../igniter/test-suites.ts';
import { forward } from './forward.ts';
import { showToolVersion } from './tool-version.ts';

/** Short feedback loop: command routing, tool contracts, docs, and source layout. */
const fastTestFiles = [
  '../tools/cli.test.ts', '../tools/run.test.ts', '../tools/docs.test.ts',
  '../tools/release.test.ts', '../compiler/scripts/release-streams.test.ts',
  '../site/build.test.ts', 'source-files.test.ts',
] as const;

if (!showToolVersion('tester', 'test')) {
  const args = process.argv.slice(2);
  if (args[0] === '--cases') {
    forward(fileURLToPath(new URL('./test.ts', import.meta.url)), args.slice(1));
  }

  let requestedMode: '--smoke' | '--fast' | '--full' | undefined;
  let outputMode: '--verbose' | '--mute' | '--silence' | undefined;
  for (const arg of args) {
    if ((arg === '--smoke' || arg === '--fast' || arg === '--full') && requestedMode === undefined) requestedMode = arg;
    else if ((arg === '--verbose' || arg === '--mute' || arg === '--silence') && outputMode === undefined) outputMode = arg;
    else {
      process.stderr.write('Usage: ./bin/lite test [--smoke|--fast|--full] [--verbose|--mute|--silence]\n');
      process.exit(2);
    }
  }
  const mode = requestedMode ?? '--smoke';
  const reporter = outputMode === '--verbose' ? 'spec' : 'dot';
  const quiet = outputMode === '--mute' || outputMode === '--silence';

  const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    LITE_SKIP_NATIVE: '1',
    ...(mode === '--fast' ? { LITE_SKIP_HEAVY: '1' } : {}),
  };
  delete testEnv['NODE_TEST_CONTEXT'];
  const files = mode === '--smoke' ? fastTestFiles : generatedTestFiles;
  const result = spawnSync(process.execPath, ['--test', `--test-reporter=${reporter}`, ...files], {
    cwd: fileURLToPath(new URL('../igniter/', import.meta.url)),
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: quiet ? 'utf8' : undefined,
    env: testEnv,
  });
  if (result.error !== undefined) {
    if (outputMode !== '--silence') process.stderr.write(`${result.error.message}\n`);
    process.exit(1);
  }
  if (result.signal !== null) { process.kill(process.pid, result.signal); process.exit(1); }
  if (outputMode === '--mute') {
    if (result.status === 0) process.stdout.write('Tests passed.\n');
    else { process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? ''); }
  }
  process.exit(result.status ?? 1);
}
