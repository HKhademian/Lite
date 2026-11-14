#!/usr/bin/env node
/** Host entrypoint for the Lite-implemented verifier command (tools/src/verify.lts -> tools/generated/verify.ts). */
import { writeSync } from 'node:fs';

if (import.meta.main) {
  const entry = new URL('./generated/verify.ts', import.meta.url).href;
  const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}
