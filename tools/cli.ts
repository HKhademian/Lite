#!/usr/bin/env node
/** Host entrypoint for the Lite CLI router (tools/src/cli.lts -> tools/generated/cli.ts). */
import { writeSync } from 'node:fs';

const entry = new URL('./generated/cli.ts', import.meta.url).href;
const mod = (await import(entry)) as { main: (write?: (text: string) => void) => string };
mod.main((text: string): void => {
  writeSync(1, text);
});
