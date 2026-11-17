#!/usr/bin/env node
/** Host entrypoint for corpus parity verifier (`tools/src/corpus-parity.lts` -> `dist/tools/corpus-parity.ts`). */
import { runIgnitedTool } from '../../igniter/ignite.ts';

await runIgnitedTool('corpus-parity');
