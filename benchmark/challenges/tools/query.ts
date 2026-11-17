#!/usr/bin/env node
/** Query the challenge corpus without extra runtime dependencies (`tools/src/challenge-query.lts`). */
import { runIgnitedTool } from '../../../igniter/ignite.ts';

await runIgnitedTool('challenge-query');
