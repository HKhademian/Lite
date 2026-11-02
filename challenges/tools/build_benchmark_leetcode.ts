#!/usr/bin/env node
/** Select usable roadmap entries, then popular entries, preserving the 500-item benchmark. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, CACHE, BENCH, readJson, readJsonl, writeJson, writeJsonl, counts, unique, type Challenge, type Question, type List, type Tests, type Tree, type Item, type Meta } from './common.ts';
const challenges = new Map(readJsonl<Challenge>(join(DATA, 'challenges.jsonl')).map(r => [r.id, r]));
const tests = new Map(readJsonl<Tests>(join(DATA, 'tests.jsonl')).map(r => [r.challenge_id, r]));
const merged = new Map(readJson<{ questions: Question[] }>(join(CACHE, 'leetcode/merged.json')).questions.map(q => [String(q.frontend_id), q]));
const lists = new Map(readJsonl<List>(join(DATA, 'lists.jsonl')).map(r => [r.id, r]));
const paths = new Map<number, string>();
for (const e of readJson<Tree>(join(CACHE, 'benchmark/leetcode/tree.json')).tree) { const m = /^solution\/\d+-\d+\/(\d+)\./.exec(e.path); if (e.type === 'blob' && m && e.path.endsWith('/Solution.py') && !paths.has(Number(m[1]))) paths.set(Number(m[1]), e.path); }
function usable(id: string): boolean { const r = challenges.get(id); return !!r && !r.premium && r.category === 'algorithms' && !r.topics.includes('design') && merged.has(r.native_id) && paths.has(Number(r.native_id)) && (tests.get(id)?.public.length ?? 0) > 0; }
const curated = unique(['blind-75', 'neetcode-150'].flatMap(id => lists.get(id)?.challenge_ids ?? []));
const selected: [string, string][] = curated.filter(usable).map(id => [id, 'curated']);
const already = new Set(selected.map(([id]) => id));
const fill = [...challenges.values()].filter(r => r.source === 'leetcode' && !already.has(r.id) && !curated.includes(r.id) && usable(r.id)).sort((a, b) => (b.popularity?.solved ?? 0) - (a.popularity?.solved ?? 0));
const candidates: [string, string][] = [...selected, ...fill.map(r => [r.id, 'popular'] as [string, string])], written: Item[] = [];
for (const [id, origin] of candidates) {
  if (written.length >= 298) break;
  const challenge = challenges.get(id)!, test = tests.get(id)!, q = merged.get(challenge.native_id)!;
  const description = (q.description ?? '').trim().split(/\n\s*Example\s+1\s*:/)[0]!.trim().replace(/\n\s*Constraints:\s*$/, '').trim(); if (description.length < 40) continue;
  const n = Number(challenge.native_id), githubPath = paths.get(n)!.split('/').map(p => encodeURIComponent(p).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');
  const item = join(BENCH, 'items', id); mkdirSync(join(item, 'tests'), { recursive: true });
  writeFileSync(join(item, 'problem.md'), `# ${challenge.title}\n\n**Source:** [LeetCode #${n}](${challenge.url})  \n**Difficulty:** ${Number.isInteger(challenge.difficulty.normalized) ? challenge.difficulty.normalized.toFixed(1) : challenge.difficulty.normalized}/10 (${challenge.difficulty.raw})  \n**Topics:** ${challenge.topics.join(', ') || '—'}  \n**Harness:** function-style inputs (\`name = value\` pairs)\n\n## Problem\n\n${description}\n\n## Public examples\n\n${test.public.map(c => `### ${c.name}\n\n\`\`\`text\nInput: ${c.input}\nOutput: ${c.output}\n\`\`\``).join('\n\n')}\n`);
  writeJson(join(item, 'tests/public.json'), test.public); writeJson(join(item, 'tests/hidden.json'), test.hidden);
  const meta: Meta = { id, source: 'leetcode', title: challenge.title, url: challenge.url, category: challenge.category, topics: challenge.topics, difficulty: challenge.difficulty, harness: 'function', input_format: 'text', statement: 'problem.md', selection: origin,
    tests: { public: test.public.length, hidden: test.hidden.length, public_path: 'tests/public.json', hidden_path: 'tests/hidden.json', hidden_kind: 'held-out-official-examples' }, reference_solutions: [{ language: 'python', url: `https://github.com/doocs/leetcode/blob/main/${githubPath}`, license: 'CC-BY-SA-4.0', status: 'linked-not-executed' }], license_note: 'Statement metadata from LeetCode; reference code remains doocs/leetcode CC-BY-SA-4.0.' };
  writeJson(join(item, 'meta.json'), meta); written.push({ id, source: 'leetcode', title: meta.title, url: meta.url, harness: 'function', selection: origin, tests: meta.tests, reference: meta.reference_solutions[0]!.url });
}
const manifestPath = join(BENCH, 'items.jsonl'), rows = [...(existsSync(manifestPath) ? readJsonl<Item>(manifestPath).filter(r => r.source !== 'leetcode') : []), ...written].sort((a, b) => a.source < b.source ? -1 : a.source > b.source ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
writeJsonl(manifestPath, rows); writeJson(join(BENCH, 'index.json'), { total: rows.length, sources: counts(rows.map(r => r.source)) });
console.log(`wrote ${written.length} LeetCode items; total ${rows.length}`);
