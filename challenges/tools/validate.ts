#!/usr/bin/env node
/** Validate generated challenge data, topic vocabulary, tests and list references. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, DATA, readJson, readJsonl, fail, type Challenge, type List, type Tests } from './common.ts';
const records = readJsonl<Challenge>(join(DATA, 'challenges.jsonl')), lists = readJsonl<List>(join(DATA, 'lists.jsonl'));
const index = readJson<{ total: number; sources: { count: number }[] }>(join(DATA, 'index.json'));
const taxonomy = readJson<{ topics: { id: string }[] }>(join(ROOT, 'schema/taxonomy.json'));
const topics = new Set(taxonomy.topics.map(t => t.id)), ids = new Set(records.map(r => r.id)), used = new Set<string>();
const sources = new Set(['advent-of-code', 'project-euler', 'leetcode', 'codeforces', 'cses', 'atcoder', 'rosalind', 'cryptopals', 'jane-street']);
const categories = new Set(['algorithms', 'data-structures', 'mathematics', 'databases', 'shell', 'concurrency', 'javascript', 'data-analysis', 'security', 'bioinformatics', 'puzzles', 'frontend', 'system-design']);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(x => typeof x === 'string');
if (ids.size !== records.length) fail('duplicate ids');
for (const r of records) {
  const required = ['id', 'title', 'source', 'url', 'native_id', 'category', 'topics', 'raw_topics', 'tags', 'difficulty', 'formats', 'languages', 'topics_source', 'premium', 'status'];
  for (const key of required) if (!(key in r)) fail(`${r.id ?? '<missing id>'}: missing field ${key}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(r.id)) fail(`${r.id}: bad id`);
  if (!r.title.trim()) fail(`${r.id}: empty title`);
  if (!sources.has(r.source)) fail(`${r.id}: unknown source ${r.source}`);
  if (!r.url.startsWith('https://')) fail(`${r.id}: bad url ${r.url}`);
  if (!categories.has(r.category)) fail(`${r.id}: unknown category ${r.category}`);
  if (!['source', 'section', 'curated', 'none'].includes(r.topics_source)) fail(`${r.id}: invalid topics_source`);
  if (!['verified', 'partial'].includes(r.status)) fail(`${r.id}: invalid status`);
  if (typeof r.premium !== 'boolean') fail(`${r.id}: premium must be bool`);
  for (const key of ['formats', 'languages', 'raw_topics', 'tags'] as const) if (!strings(r[key])) fail(`${r.id}: ${key} must be a string array`);
  if (!strings(r.topics)) fail(`${r.id}: topics must be an array of strings`);
  for (const topic of r.topics) { if (!/^[a-z0-9][a-z0-9-]*$/.test(topic)) fail(`${r.id}: bad topic ${topic}`); if (!topics.has(topic)) fail(`${r.id}: topic ${topic} not in schema/taxonomy.json`); used.add(topic); }
  if (typeof r.difficulty !== 'object' || r.difficulty === null) fail(`${r.id}: difficulty must be an object`);
  if (r.difficulty.scale == null || !('raw' in r.difficulty)) fail(`${r.id}: difficulty needs scale and raw`);
  if (typeof r.difficulty.normalized !== 'number' || !(r.difficulty.normalized >= 1 && r.difficulty.normalized <= 10)) fail(`${r.id}: normalized difficulty out of range`);
  if (r.primary_topic !== (r.topics[0] ?? null)) fail(`${r.id}: primary_topic must be topics[0] or null for empty topics`);
}
for (const list of lists) {
  if (list.count !== list.challenge_ids.length) fail(`list ${list.id}: count does not match challenge_ids`);
  for (const id of [...list.challenge_ids, ...(list.groups ?? []).flatMap(g => g.challenge_ids)]) if (!ids.has(id)) fail(`list ${list.id}: unknown challenge ${id}`);
}
const tests = existsSync(join(DATA, 'tests.jsonl')) ? readJsonl<Tests>(join(DATA, 'tests.jsonl')) : [];
if (existsSync(join(DATA, 'tests.jsonl'))) {
  const testIds = new Set(tests.map(t => t.challenge_id));
  if (testIds.size !== tests.length) fail('duplicate test records');
  if (testIds.size !== ids.size || [...testIds].some(id => !ids.has(id))) fail('test records do not match challenges');
  for (const t of tests) {
    for (const c of [...t.public, ...t.hidden]) if (!c.input.trim() || !c.output.trim() || !c.name) fail(`${t.challenge_id}: empty or unnamed test case`);
    if (t.status === 'public+hidden' && (!t.public.length || !t.hidden.length)) fail(`${t.challenge_id}: status says public+hidden but cases are missing`);
    if (t.status === 'public-only' && (!t.public.length || t.hidden.length)) fail(`${t.challenge_id}: status says public-only but cases are wrong`);
    if (['none', 'not-applicable'].includes(t.status) && (t.public.length || t.hidden.length)) fail(`${t.challenge_id}: status ${t.status} but cases exist`);
    if (t.hidden.length && t.hidden_policy !== 'held-out-official-samples') fail(`${t.challenge_id}: hidden cases without held-out policy`);
  }
}
if (index.total !== records.length) fail('index.total does not match challenges.jsonl');
if (index.sources.reduce((n, s) => n + s.count, 0) !== records.length) fail('index source counts do not sum to total');
console.log(`OK: ${records.length} challenges, ${lists.length} lists, ${topics.size} topics, ${used.size} used`);
if (tests.length) console.log(`    tests: ${tests.filter(t => t.public.length).length} with public cases, ${tests.filter(t => t.hidden.length).length} with held-out cases`);
