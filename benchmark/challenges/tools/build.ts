#!/usr/bin/env node
/** Normalize the cached public challenge sources; all generated outputs remain data (`tools/src/challenge-build.lts`). */
import { runIgnitedTool } from '../../../igniter/ignite.ts';

await runIgnitedTool('challenge-build');
