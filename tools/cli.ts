#!/usr/bin/env node
/** Host entrypoint for the Lite CLI router (`tools/src/cli.lts` -> `dist/tools/cli.ts`). */
import { runIgnitedTool } from '../igniter/ignite.ts';

await runIgnitedTool('cli');
