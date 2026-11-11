#!/usr/bin/env node
/** Cache only the public reference-tree metadata needed by the benchmark builder. */
import { join } from 'node:path';
import { CACHE } from './common.ts';
import { download } from './download.ts';
if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log('Usage: node tools/fetch_benchmark_leetcode.ts'); process.exit(0); }
const path = join(CACHE, 'benchmark/leetcode/tree.json');
await download('https://api.github.com/repos/doocs/leetcode/git/trees/main?recursive=1', path, { retries: 1, timeoutMs: 60000 });
console.log(`cached ${path}`);
