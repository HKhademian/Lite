/** The run adapter executes from a real temporary artifact and removes it afterwards. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('lite run executes a script from a temporary artifact and removes the directory', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'lite-run-probe-'));
  try {
    const result = spawnSync(process.execPath, [join(root, 'bin/lite-run'), 'examples/020-script-arguments.lts', 'hello'], {
      cwd: root, env: { ...process.env, TMPDIR: scratch }, encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'hello\n');
    assert.deepEqual(readdirSync(scratch), [], 'temporary run directory was not removed');
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});
