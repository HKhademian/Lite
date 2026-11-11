#!/usr/bin/env node
/** Validate self-contained statements, case files, item counts and reference metadata. */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BENCH, readJson, readJsonl, text, counts, fail, type Item, type Meta, type TestCase } from './common.ts';
const index = readJson<{ total: number; sources: Record<string, number> }>(join(BENCH, 'index.json')), rows = readJsonl<Item>(join(BENCH, 'items.jsonl'));
const ids = new Set(rows.map(r => r.id)); if (ids.size !== rows.length) fail('duplicate benchmark ids');
if (index.total !== rows.length) fail('benchmark/index.json total mismatch');
if (Object.values(index.sources).reduce((a, b) => a + b, 0) !== rows.length) fail('benchmark source counts mismatch');
const dirs = readdirSync(join(BENCH, 'items'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
if (dirs.length !== ids.size || dirs.some(id => !ids.has(id))) fail('item directories differ from items.jsonl');
let publicTotal = 0, hiddenTotal = 0; const formats: string[] = [];
for (const row of rows) {
  const item = join(BENCH, 'items', row.id), metaPath = join(item, 'meta.json'); if (!existsSync(metaPath)) fail(`${row.id}: missing meta.json`);
  const meta = readJson<Meta>(metaPath); if (meta.id !== row.id || meta.source !== row.source) fail(`${row.id}: metadata identity mismatch`);
  if (!['single-answer', 'stdio', 'function'].includes(meta.harness)) fail(`${row.id}: unsupported harness ${meta.harness}`); formats.push(meta.harness);
  const statement = join(item, meta.statement); if (!existsSync(statement) || text(statement).trim().length < 50) fail(`${row.id}: statement missing or too short`);
  if (!meta.reference_solutions?.length) fail(`${row.id}: missing reference solution metadata`);
  for (const ref of meta.reference_solutions) if (!(ref.url ?? '').startsWith('https://')) fail(`${row.id}: bad reference url`);
  if (!(meta.url ?? '').startsWith('https://')) fail(`${row.id}: bad source url`);
  const tests = meta.tests; if (tests.public_path === undefined) fail(`${row.id}: missing public_path`);
  if (meta.harness === 'single-answer') { const answer = join(item, tests.public_path); if (!existsSync(answer) || !text(answer).trim()) fail(`${row.id}: missing public answer`); publicTotal++; }
  else {
    const publicCases = readJson<TestCase[]>(join(item, tests.public_path)); if (tests.hidden_path === undefined) fail(`${row.id}: missing hidden_path`);
    const hiddenPath = join(item, tests.hidden_path), hidden = existsSync(hiddenPath) ? readJson<TestCase[]>(hiddenPath) : [];
    if (publicCases.length !== tests.public || hidden.length !== tests.hidden) fail(`${row.id}: case count mismatch`);
    for (const c of [...publicCases, ...hidden]) for (const key of ['name', 'input', 'output'] as const) if (!String(c[key] ?? '').trim()) fail(`${row.id}: empty ${key} in test case`);
    publicTotal += publicCases.length; hiddenTotal += hidden.length;
  }
}
console.log(`OK: ${rows.length} benchmark items\n    formats: ${JSON.stringify(counts(formats))}\n    public cases: ${publicTotal}  hidden cases: ${hiddenTotal}\n    sources: ${JSON.stringify(index.sources)}`);
