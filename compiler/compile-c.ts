#!/usr/bin/env node
/** Host entrypoint for deferred C compiler command (tools/src/compile-c.lts -> tools/generated/compile-c.ts). */
import { writeSync } from 'node:fs';

const entry = new URL('../tools/generated/compile-c.ts', import.meta.url).href;
const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
mod.main((text: string): void => {
  writeSync(1, text);
});
