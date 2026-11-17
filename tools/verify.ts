#!/usr/bin/env node
/** Host entrypoint for the Lite-implemented verifier command (`tools/src/verify.lts` -> `dist/tools/verify.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

if (import.meta.main) await runIgnitedTool('verify');
