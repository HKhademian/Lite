#!/usr/bin/env node
/** Host entrypoint for the Lite-implemented formatter (`tools/src/fmt.lts` -> `dist/tools/fmt.ts`). */
import { spawnSync } from 'node:child_process';
import { ensureTool, runIgnitedTool } from '../igniter/ignite.ts';

/** Formats Lite source text cleanly and idempotently via the compiled Lite formatter. */
export function formatLite(source: string): string {
  const result = spawnSync(process.execPath, [ensureTool('fmt'), '-'], {
    input: source,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite fmt failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return result.stdout;
}

if (import.meta.main) {
  await runIgnitedTool('fmt');
}
