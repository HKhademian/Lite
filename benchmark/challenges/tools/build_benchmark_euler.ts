#!/usr/bin/env node
/** Build statement/answer items while linking the original reference solutions (`tools/src/challenge-build-euler.lts`). */
import { runIgnitedTool } from '../../../igniter/ignite.ts';

await runIgnitedTool('challenge-build-euler');
