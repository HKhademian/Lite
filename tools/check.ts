#!/usr/bin/env node
/** Host entrypoint for Lite-implemented repository checks (tools/src/check.lts -> tools/generated/check.ts). */
import { writeSync } from 'node:fs';

if (import.meta.main) {
  const entry = new URL('./generated/check.ts', import.meta.url).href;
  const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}
