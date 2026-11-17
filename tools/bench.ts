#!/usr/bin/env node
/** Host entrypoint for Lite-implemented declarative benchmark runner (`tools/src/bench.lts` -> `dist/tools/bench.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

if (import.meta.main) await runIgnitedTool('bench');
