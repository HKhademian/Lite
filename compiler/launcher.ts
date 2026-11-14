#!/usr/bin/env node
/** Host entrypoint for compiler router (tools/src/compile.lts -> tools/generated/compile.ts). */
import { writeSync } from 'node:fs';

const entry = new URL('../tools/generated/compile.ts', import.meta.url).href;
const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
mod.main((text: string): void => {
  writeSync(1, text);
});
