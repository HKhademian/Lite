#!/usr/bin/env node
/** Host entrypoint for three-generation TS self-host ladder (`tools/src/self-host.lts` -> `dist/tools/self-host.ts`). */
import { runIgnitedTool } from '../../igniter/ignite.ts';

await runIgnitedTool('self-host');
