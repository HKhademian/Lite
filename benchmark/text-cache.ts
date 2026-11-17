#!/usr/bin/env node
/** Fresh-process comparison of two TS compiler artifacts (`tools/src/text-cache.lts` -> `dist/tools/text-cache.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

await runIgnitedTool('text-cache');
