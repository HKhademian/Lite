#!/usr/bin/env node
/** Standalone generated test command; `lite test` routes here. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generatedTestFiles } from '../igniter/test-suites.ts';
import { forward } from './forward.ts';
import { showToolVersion } from './tool-version.ts';

if (!showToolVersion('tester', 'test')) {
  const args = process.argv.slice(2);
  if (args[0] === '--cases') {
    forward(fileURLToPath(new URL('./test.ts', import.meta.url)), args.slice(1));
  }

  let mode: '--fast' | '--full' | undefined;
  for (const arg of args) {
    if ((arg === '--fast' || arg === '--full') && mode === undefined) mode = arg;
    else {
      process.stderr.write('Usage: ./bin/lite test [--fast|--full]\n');
      process.exit(2);
    }
  }

  const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    LITE_SKIP_NATIVE: '1',
    ...(mode === '--fast' ? { LITE_SKIP_HEAVY: '1' } : {}),
  };
  delete testEnv['NODE_TEST_CONTEXT'];
  const result = spawnSync(process.execPath, ['--test', ...generatedTestFiles], {
    cwd: fileURLToPath(new URL('../igniter/', import.meta.url)),
    stdio: 'inherit',
    env: testEnv,
  });
  if (result.error !== undefined) { process.stderr.write(`${result.error.message}\n`); process.exit(1); }
  if (result.signal !== null) { process.kill(process.pid, result.signal); process.exit(1); }
  process.exit(result.status ?? 1);
}
