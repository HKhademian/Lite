#!/usr/bin/env node
/** Build statement/answer items while linking the original reference solutions. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, CACHE, BENCH, readJson, readJsonl, writeJson, writeJsonl, text, unescapeHtml, counts, type Challenge, type Tree, type Item, type Meta } from './common.ts';
const cache = join(CACHE, 'benchmark/euler');
const challenges = new Map(readJsonl<Challenge>(join(ROOT, 'data/challenges.jsonl')).filter(r => r.source === 'project-euler').map(r => [r.number, r]));
const answers = new Map([...text(join(cache, 'Answers.txt')).matchAll(/^Problem (\d+):\s*(\S+)/gm)].map(m => [Number(m[1]), m[2]!]));
const numbers = readJson<Tree>(join(cache, 'tree.json')).tree.flatMap(e => { const m = /^python\/p(\d{3})\.py$/.exec(e.path); return e.type === 'blob' && m ? [Number(m[1])] : []; }).sort((a, b) => a - b);
const written: Item[] = [];
for (const n of numbers) {
  const challenge = challenges.get(n), answer = answers.get(n), path = join(cache, 'statements', `problem-${String(n).padStart(3, '0')}.html`);
  if (!challenge || !answer || !existsSync(path)) continue;
  const page = text(path), body = /<div class="problem_content" role="problem">(.*?)<\/div>\s*<br>/s.exec(page)?.[1]; if (!body) continue;
  const title = unescapeHtml((/<h2>(.*?)<\/h2>/s.exec(page)?.[1] ?? '').replace(/<[^>]+>/g, '')).trim() || challenge.title;
  const statement = unescapeHtml(body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').trim(); if (!statement) continue;
  const item = join(BENCH, 'items', challenge.id); mkdirSync(join(item, 'tests/public'), { recursive: true });
  writeFileSync(join(item, 'problem.md'), `# ${title}\n\n**Source:** [Project Euler #${n}](${challenge.url})  \n**Answer type:** one number  \n**Difficulty:** ${Number.isInteger(challenge.difficulty.normalized) ? challenge.difficulty.normalized.toFixed(1) : challenge.difficulty.normalized}/10 (${challenge.difficulty.raw})\n\n## Problem\n\n${statement}\n\n## Output\n\nPrint the single numeric answer.\n`);
  writeFileSync(join(item, 'tests/public/answer.txt'), answer + '\n');
  const meta: Meta = { id: challenge.id, source: 'project-euler', title, url: challenge.url, category: challenge.category, topics: challenge.topics, difficulty: challenge.difficulty, harness: 'single-answer', statement: 'problem.md',
    tests: { public: 1, hidden: 0, public_path: 'tests/public/answer.txt', hidden_kind: 'none' }, reference_solutions: [{ language: 'python', url: `https://github.com/nayuki/Project-Euler-solutions/blob/master/python/p${String(n).padStart(3, '0')}.py`, license: 'All rights reserved; link only', verified_answer: true }], answer_sha256: createHash('sha256').update(answer).digest('hex'), license_note: 'Statement remains Project Euler copyright; reference code remains Project Nayuki copyright.' };
  writeJson(join(item, 'meta.json'), meta);
  written.push({ id: challenge.id, source: 'project-euler', title, url: challenge.url, harness: 'single-answer', tests: { public: 1, hidden: 0 }, reference: meta.reference_solutions[0]!.url });
}
const manifestPath = join(BENCH, 'items.jsonl'); const rows = [...(existsSync(manifestPath) ? readJsonl<Item>(manifestPath).filter(r => r.source !== 'project-euler') : []), ...written].sort((a, b) => a.source < b.source ? -1 : a.source > b.source ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
writeJsonl(manifestPath, rows); writeJson(join(BENCH, 'index.json'), { total: rows.length, sources: counts(rows.map(r => r.source)) });
console.log(`wrote ${written.length} Project Euler items; total ${rows.length}`);
