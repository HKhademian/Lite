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
  '../tools/release.test.ts', '../compiler/scripts/release-streams.test.ts', 'source-files.test.ts',
] as const;

if (!showToolVersion('tester', 'test')) {
  const args = process.argv.slice(2);
  if (args[0] === '--cases') {
    forward(fileURLToPath(new URL('./test.ts', import.meta.url)), args.slice(1));
  }

  let requestedMode: '--smoke' | '--fast' | '--full' | undefined;
  for (const arg of args) {
    if ((arg === '--smoke' || arg === '--fast' || arg === '--full') && requestedMode === undefined) requestedMode = arg;
    else {
      process.stderr.write('Usage: ./bin/lite test [--smoke|--fast|--full]\n');
      process.exit(2);
    }
  }
  const mode = requestedMode ?? '--smoke';

  const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    LITE_SKIP_NATIVE: '1',
    ...(mode === '--fast' ? { LITE_SKIP_HEAVY: '1' } : {}),
  };
  delete testEnv['NODE_TEST_CONTEXT'];
  const files = mode === '--smoke' ? fastTestFiles : generatedTestFiles;
  const result = spawnSync(process.execPath, ['--test', ...files], {
    cwd: fileURLToPath(new URL('../igniter/', import.meta.url)),
    stdio: 'inherit',
    env: testEnv,
  });
  if (result.error !== undefined) { process.stderr.write(`${result.error.message}\n`); process.exit(1); }
  if (result.signal !== null) { process.kill(process.pid, result.signal); process.exit(1); }
  process.exit(result.status ?? 1);
}
