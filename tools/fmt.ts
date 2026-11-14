#!/usr/bin/env node
/** Host entrypoint for the Lite-implemented formatter (tools/src/fmt.lts -> tools/generated/fmt.ts). */
import { spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const generatedUrl = new URL('./generated/fmt.ts', import.meta.url);
const generatedPath = fileURLToPath(generatedUrl);

/** Formats Lite source text cleanly and idempotently via the compiled Lite formatter. */
export function formatLite(source: string): string {
  const result = spawnSync(process.execPath, [generatedPath, '-'], {
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
  // Load via computed specifier so igniter/tsconfig.json checks this wrapper without merging ambient artifact globals.
  const entry = generatedUrl.href;
  const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}
