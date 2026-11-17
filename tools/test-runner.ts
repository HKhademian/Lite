#!/usr/bin/env node
/** Host entrypoint for the Lite-implemented generated test command (`tools/src/test-runner.lts` -> `dist/tools/test-runner.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

if (import.meta.main) await runIgnitedTool('test-runner');
