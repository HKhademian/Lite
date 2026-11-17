#!/usr/bin/env node
/** Host entrypoint for the Lite-implemented source check command (`tools/src/checker.lts` -> `dist/tools/checker.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

if (import.meta.main) await runIgnitedTool('checker');
