#!/usr/bin/env node
/** Host entrypoint for compiler/C release packaging (`tools/src/compiler-release.lts` -> `dist/tools/compiler-release.ts`). */
import { runIgnitedTool } from '../../igniter/ignite.ts';

await runIgnitedTool('compiler-release');
