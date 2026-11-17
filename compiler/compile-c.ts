#!/usr/bin/env node
/** Host entrypoint for deferred C compiler command (`tools/src/compile-c.lts` -> `dist/tools/compile-c.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

await runIgnitedTool('compile-c');
