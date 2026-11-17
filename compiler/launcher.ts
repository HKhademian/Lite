#!/usr/bin/env node
/** Host entrypoint for compiler router (`tools/src/compile.lts` -> `dist/tools/compile.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

await runIgnitedTool('compile');
