#!/usr/bin/env node
/** Host entrypoint for Lite-implemented repository checks (`tools/src/check.lts` -> `dist/tools/check.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

if (import.meta.main) await runIgnitedTool('check');
