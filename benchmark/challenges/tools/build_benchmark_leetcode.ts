#!/usr/bin/env node
/** Select usable roadmap entries, then popular entries, preserving the 500-item benchmark (`tools/src/challenge-build-leetcode.lts`). */
import { runIgnitedTool } from '../../../igniter/ignite.ts';

await runIgnitedTool('challenge-build-leetcode');
