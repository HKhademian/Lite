/** The run adapter executes from a real temporary artifact and removes it afterwards. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('lite run executes a script from a temporary artifact and removes the directory', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'lite-run-probe-'));
  try {
    const result = spawnSync(process.execPath, [join(root, 'bin/lite-run'), 'language/examples/020-script-arguments.lts', 'hello'], {
      cwd: root, env: { ...process.env, TMPDIR: scratch }, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'hello\n');
    assert.deepEqual(readdirSync(scratch), [], 'temporary run directory was not removed');
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

test('lite compile, check and run resolve top-level Lite source imports', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-command-'));
  try {
    const main = join(directory, 'main.lts');
    writeFileSync(main, 'import "lib.lts";\noutputLine(answer);\n');
    writeFileSync(join(directory, 'lib.lts'), 'answer := 42;\n');
    const compile = spawnSync(process.execPath, [join(root, 'compiler/cli.ts'), 'ts', main], {
      cwd: root, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(compile.status, 0, compile.stderr);
    assert.equal(compile.stderr, '');

    const check = spawnSync(process.execPath, [join(root, 'bin/lite-check'), main], {
      cwd: root, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(check.status, 0, check.stderr);

    const run = spawnSync(process.execPath, [join(root, 'bin/lite-run'), main], {
      cwd: root, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, '42\n');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
