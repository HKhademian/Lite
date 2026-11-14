/** Host entrypoint and library adapter for Lite-implemented declarative case runner (`tools/src/test.lts` -> `tools/generated/test.ts`). */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './project.ts';

const generatedUrl = new URL('./generated/test.ts', import.meta.url);
const generatedPath = fileURLToPath(generatedUrl);

/** Runs declarative language and tool cases matching `filter` or single manifest `file`, returning summary counts. */
export function testCases(filter = '', file?: string): { count: number; failures: number; pending: number } {
  const work = mkdtempSync(join(tmpdir(), 'lite-test-summary-'));
  const summaryPath = join(work, 'summary.json');
  const args = file !== undefined ? [file] : filter !== '' ? [filter] : [];
  try {
    const result = spawnSync(process.execPath, [generatedPath, ...args], {
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

if (import.meta.main) {
  const mod = (await import(generatedUrl.href)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}
