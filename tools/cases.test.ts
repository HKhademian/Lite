/** Shared schema boundaries and the maintained declarative command suite. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ensureTool, repoRoot as root } from '../igniter/artifacts.ts';

/** Runs declarative language and tool cases matching `filter` or single manifest `file`, returning summary counts. */
function testCases(filter = '', file?: string): { count: number; failures: number; pending: number } {
  const work = mkdtempSync(join(tmpdir(), 'lite-test-summary-'));
  const summaryPath = join(work, 'summary.json');
  const args = file !== undefined ? [file] : filter !== '' ? [filter] : [];
  try {
    const result = spawnSync(process.execPath, [ensureTool('test'), ...args], {
      cwd: root,
      env: { ...process.env, LITE_TEST_SUMMARY_FILE: summaryPath },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    if (result.error) throw result.error;
    if (result.signal !== null) throw new Error(`lite test terminated by signal ${result.signal}`);
    if (!existsSync(summaryPath)) {
      throw new Error(`lite test exited with status ${result.status}`);
    }
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8')) as { count: number; failures: number; pending: number };
    if (result.status !== 0) process.exitCode = result.status;
    return summary;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

test('declarative tool and language cases preserve their recorded contracts', () => {
  const result = testCases();
  assert.equal(result.failures, 0);
  assert(result.count > 0);
});
