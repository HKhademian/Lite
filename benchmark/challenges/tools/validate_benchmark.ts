#!/usr/bin/env node
/** Validate self-contained statements, case files, item counts and reference metadata (`tools/src/challenge-validate-benchmark.lts`). */
import { runIgnitedTool } from '../../../igniter/ignite.ts';

await runIgnitedTool('challenge-validate-benchmark');
