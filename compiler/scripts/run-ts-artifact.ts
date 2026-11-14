#!/usr/bin/env node
/** Host entrypoint for generated-artifact runner (`tools/src/run-ts-artifact.lts` -> `tools/generated/run-ts-artifact.ts`). */
import { writeSync } from 'node:fs';

const entry = new URL('../../tools/generated/run-ts-artifact.ts', import.meta.url).href;
const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
mod.main((text: string): void => {
  writeSync(1, text);
});
