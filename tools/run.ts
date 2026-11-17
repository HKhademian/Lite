#!/usr/bin/env node
/** Host entrypoint for the Lite-implemented script runner (`tools/src/run.lts` -> `dist/tools/run.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

if (import.meta.main) await runIgnitedTool('run');
