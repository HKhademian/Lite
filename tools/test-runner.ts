#!/usr/bin/env node
/** Host entrypoint for the Lite-implemented generated test command (tools/src/test-runner.lts -> tools/generated/test-runner.ts). */
import { writeSync } from 'node:fs';

if (import.meta.main) {
  const entry = new URL('./generated/test-runner.ts', import.meta.url).href;
  const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}
