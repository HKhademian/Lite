#!/usr/bin/env node
/** Host entrypoint for compiler build metadata (`tools/src/compiler-build.lts` -> `dist/tools/compiler-build.ts`). */
import { runIgnitedTool } from '../../igniter/ignite.ts';

await runIgnitedTool('compiler-build');
