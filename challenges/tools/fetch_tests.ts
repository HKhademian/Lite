#!/usr/bin/env node
/** Cache official sample pages; unavailable private judge tests are never invented. */
import { join } from 'node:path';
import { DATA, CACHE, readJsonl, type Challenge } from './common.ts';
import { pool, type Job } from './download.ts';
if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log('Usage: node tools/fetch_tests.ts'); process.exit(0); }
const grouped = new Map<string, Job[]>();
for (const r of readJsonl<Challenge>(join(DATA, 'challenges.jsonl'))) if (['cses', 'atcoder', 'rosalind'].includes(r.source)) grouped.set(r.source, [...grouped.get(r.source) ?? [], { url: r.url + (r.source === 'atcoder' && !r.url.includes('?') ? '?lang=en' : ''), path: join(CACHE, 'tests', r.source, r.id + '.html') }]);
console.log(`fetching ${[...grouped.values()].reduce((n, jobs) => n + jobs.length, 0)} sample pages`); let failed = 0;
for (const [source, jobs] of grouped) { const workers = source === 'atcoder' ? 1 : 5; console.log(`  ${source}: ${jobs.length} page(s), ${workers} worker(s)`); failed += (await pool(jobs, workers, { retries: 5, timeoutMs: 45000, delayMs: source === 'atcoder' ? 1200 : 0, rateLimit: true }, 50)).failures; }
console.log(`cached ${join(CACHE, 'tests')}`); if (failed) console.error(`warning: ${failed} page(s) failed; those challenges will have no tests`);
