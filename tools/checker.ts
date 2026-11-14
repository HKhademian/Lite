#!/usr/bin/env node
/** Host entrypoint for the Lite-implemented source check command (tools/src/checker.lts -> tools/generated/checker.ts). */
import { writeSync } from 'node:fs';

if (import.meta.main) {
  const entry = new URL('./generated/checker.ts', import.meta.url).href;
  const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}
