#!/usr/bin/env node
/** Host entrypoint for Lite-implemented declarative benchmark runner (`tools/src/bench.lts` -> `tools/generated/bench.ts`). */
import { writeSync } from 'node:fs';

if (import.meta.main) {
  const entry = new URL('./generated/bench.ts', import.meta.url).href;
  const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}
