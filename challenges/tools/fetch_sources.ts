#!/usr/bin/env node
/** Cache upstream metadata; normalization is performed separately by build.ts. */
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE, text, options, fail } from './common.ts';
import { download, pool, type Job } from './download.ts';
const args = options(process.argv.slice(2), { '--force': 'flag', '--only': 'value', '--help': 'flag', '-h': 'flag' });
if (args.has('--help') || args.has('-h')) { console.log('Usage: node tools/fetch_sources.ts [--force] [--only leetcode,codeforces,cses,aoc,pe,rosalind,cryptopals,jane-street,atcoder,roadmaps]'); process.exit(0); }
const force = args.has('--force');
async function fetch(url: string, path: string): Promise<void> { await download(url, join(CACHE, path), { force }); }
const sources: Record<string, () => Promise<void>> = {
  leetcode: async () => { await fetch('https://leetcode.com/api/problems/all/', 'leetcode/api-all.json'); await fetch('https://raw.githubusercontent.com/neenza/leetcode-problems/master/merged_problems.json', 'leetcode/merged.json'); },
  codeforces: async () => { await fetch('https://codeforces.com/api/problemset.problems', 'codeforces/problemset.json'); },
  cses: async () => { await fetch('https://cses.fi/problemset/', 'cses/problemset.html'); },
  aoc: async () => {
    const jobs: Job[] = []; for (let year = 2015; year <= 2025; year++) { jobs.push({ url: `https://adventofcode.com/${year}`, path: join(CACHE, `aoc/${year}/index.html`) }); for (let day = 1; day <= 25; day++) jobs.push({ url: `https://adventofcode.com/${year}/day/${day}`, path: join(CACHE, `aoc/${year}/day${String(day).padStart(2, '0')}.html`) }); }
    const result = await pool(jobs, 4, { allowMissing: true }); if (result.skipped) console.log(`  skipped ${result.skipped} unavailable page(s)`); if (result.failures) fail(`${result.failures} downloads failed`);
  },
  pe: async () => { for (let n = 1; n <= 24; n++) { const path = `project-euler/page${String(n).padStart(2, '0')}.html`; await fetch(`https://projecteuler.net/archives;page=${n}`, path); if (!text(join(CACHE, path)).includes('problem=')) break; } },
  rosalind: async () => { await fetch('https://rosalind.info/problems/list-view/', 'rosalind/list.html'); },
  cryptopals: async () => { for (let n = 1; n <= 8; n++) await fetch(`https://cryptopals.com/sets/${n}`, `cryptopals/set${n}.html`); },
  'jane-street': async () => { for (let n = 1; n <= 5; n++) { const path = `jane-street/archive${n}.html`; await fetch(`https://www.janestreet.com/puzzles/archive/?page=${n}`, path); if (statSync(join(CACHE, path)).size < 5000) break; } },
  atcoder: async () => { await fetch('https://kenkoooo.com/atcoder/resources/problems.json', 'atcoder/problems.json'); await fetch('https://kenkoooo.com/atcoder/resources/problem-models.json', 'atcoder/models.json'); },
  roadmaps: async () => { for (const name of ['blind_75', 'neetcode_150']) await fetch(`https://raw.githubusercontent.com/lufftw/neetcode/main/roadmaps/${name}.toml`, `roadmaps/${name}.toml`); },
};
const selected = args.get('--only')?.[0]?.split(',').map(x => x.trim()).filter(Boolean) ?? Object.keys(sources);
for (const name of selected) if (!(name in sources)) fail(`unknown sources: ${name}`);
for (const name of selected) { console.log(name === 'aoc' ? 'advent of code' : name === 'pe' ? 'project euler' : name === 'jane-street' ? 'jane street' : name === 'roadmaps' ? 'interview roadmaps' : name); await sources[name]!(); }
console.log(`\ncache: ${CACHE}`);
