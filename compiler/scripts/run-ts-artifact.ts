#!/usr/bin/env node
/** Host entrypoint for generated-artifact runner (`tools/src/run-ts-artifact.lts` -> `dist/tools/run-ts-artifact.ts`). */
import { runIgnitedTool } from '../../igniter/ignite.ts';

await runIgnitedTool('run-ts-artifact');
