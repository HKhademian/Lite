#!/usr/bin/env node
/** Cache Euler statements and published answers; reference solution code stays linked. */
import { join } from 'node:path';
import { CACHE, readJson, fail, type Tree } from './common.ts';
import { download, pool } from './download.ts';
if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log('Usage: node tools/fetch_benchmark_euler.ts'); process.exit(0); }
const cache = join(CACHE, 'benchmark/euler');
await download('https://api.github.com/repos/nayuki/Project-Euler-solutions/git/trees/master?recursive=1', join(cache, 'tree.json'), { timeoutMs: 45000 });
await download('https://raw.githubusercontent.com/nayuki/Project-Euler-solutions/master/Answers.txt', join(cache, 'Answers.txt'), { timeoutMs: 45000 });
const numbers = readJson<Tree>(join(cache, 'tree.json')).tree.flatMap(e => { const m = /^python\/p(\d{3})\.py$/.exec(e.path); return e.type === 'blob' && m ? [Number(m[1])] : []; }).sort((a, b) => a - b);
console.log(`public Python solutions: ${numbers.length}`);
const result = await pool(numbers.map(n => ({ url: `https://projecteuler.net/problem=${n}`, path: join(cache, 'statements', `problem-${String(n).padStart(3, '0')}.html`) })), 3, { timeoutMs: 45000, delayMs: 150 });
console.log(`cached ${cache}`); if (result.failures) fail(`${result.failures} statement page(s) failed`);
