#!/usr/bin/env node
/** Host entrypoint for Lite-implemented CI tasks (`tools/src/ci.lts` -> `dist/tools/ci.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

if (import.meta.main) await runIgnitedTool('ci');
