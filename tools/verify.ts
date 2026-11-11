#!/usr/bin/env node
/** Standalone verifier command for compiler cases and tool case manifests. */
import { fileURLToPath } from 'node:url';
import { forward } from './forward.ts';
import { showToolVersion } from './tool-version.ts';

if (!showToolVersion('verifier', 'verify')) {
  const args = process.argv.slice(2);
  const path = args.length === 1 && args[0]?.endsWith('.json')
    ? fileURLToPath(new URL('./test.ts', import.meta.url))
    : fileURLToPath(new URL('../igniter/verify.ts', import.meta.url));
  forward(path, args);
}
