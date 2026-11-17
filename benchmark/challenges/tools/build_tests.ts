#!/usr/bin/env node
/** Extract official public examples; later official examples become explicitly held-out cases (`tools/src/challenge-build-tests.lts`). */
import { runIgnitedTool } from '../../../igniter/ignite.ts';

await runIgnitedTool('challenge-build-tests');
