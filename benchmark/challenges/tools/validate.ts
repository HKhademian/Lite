#!/usr/bin/env node
/** Validate generated challenge data, topic vocabulary, tests and list references (`tools/src/challenge-validate.lts`). */
import { runIgnitedTool } from '../../../igniter/ignite.ts';

await runIgnitedTool('challenge-validate');
