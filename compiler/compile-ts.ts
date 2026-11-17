#!/usr/bin/env node
/** Host entrypoint for TypeScript compiler target (`tools/src/compile-ts.lts` -> `dist/tools/compile-ts.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

await runIgnitedTool('compile-ts');
