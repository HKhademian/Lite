#!/usr/bin/env node
/** Host entrypoint for compiler performance measurements (`tools/src/compiler-performance.lts` -> `dist/tools/compiler-performance.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

await runIgnitedTool('compiler-performance');
