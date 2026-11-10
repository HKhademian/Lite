#!/usr/bin/env node
/** Standalone source-check command; `lite check` routes here. */
import { fileURLToPath } from 'node:url';
import { forward } from './forward.ts';
import { showToolVersion } from './tool-version.ts';

if (!showToolVersion('checker', 'check')) {
  const path = fileURLToPath(new URL('../igniter/check.ts', import.meta.url));
  forward(path, process.argv.slice(2));
}
