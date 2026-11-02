#!/usr/bin/env node
/** Extract official public examples; later official examples become explicitly held-out cases. */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE, DATA, readJson, readJsonl, writeJson, writeJsonl, text, unescapeHtml, counts, csv, type Challenge, type Question, type TestCase, type Tests } from './common.ts';

type RawCase = [string, string, string | null];
const cleanBlock = (fragment: string): string => unescapeHtml(fragment.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/^\n+|\n+$/g, '');
function leetcodeExample(value: string): RawCase | undefined {
  const m = /Input:\s*(.*?)\n\s*Output:\s*(.*?)(?:\n\s*Explanation:\s*(.*))?$/s.exec(value.replaceAll('\r\n', '\n').trim());
  return m?.[1]?.trim() && m[2]?.trim() ? [m[1].trim(), m[2].trim(), m[3]?.trim() || null] : undefined;
}
function cses(page: string): RawCase[] {
  const start = page.indexOf('id="example"'); if (start < 0) return [];
  const section = page.slice(start);
  const pairs = [...section.matchAll(/<p>Input:<\/p>\s*<pre>(.*?)<\/pre>\s*<p>Output:<\/p>\s*<pre>(.*?)<\/pre>/gs)].map(m => [m[1]!, m[2]!] as const);
  const blocks = [...section.matchAll(/<pre>(.*?)<\/pre>/gs)];
  if (!pairs.length && blocks.length >= 2) pairs.push([blocks[0]![1]!, blocks[1]![1]!]);
  return pairs.map(([a, b]) => [cleanBlock(a), cleanBlock(b), null]);
}
function atcoder(page: string): RawCase[] {
  const inputs = new Map([...page.matchAll(/<h3>Sample Input (\d+)<\/h3>\s*<pre>(.*?)<\/pre>/gs)].map(m => [Number(m[1]), cleanBlock(m[2]!)]));
  const outputs = new Map([...page.matchAll(/<h3>Sample Output (\d+)<\/h3>\s*<pre>(.*?)<\/pre>/gs)].map(m => [Number(m[1]), cleanBlock(m[2]!)]));
  return [...inputs].sort((a, b) => a[0] - b[0]).filter(([n]) => outputs.has(n)).map(([n, input]) => [input, outputs.get(n)!, null]);
}
function rosalind(page: string): RawCase[] {
  const input = /<h2 id="sample-dataset">.*?<\/h2>.*?<pre>(.*?)<\/pre>/s.exec(page)?.[1];
  const output = /<h2 id="sample-output">.*?<\/h2>.*?<pre>(.*?)<\/pre>/s.exec(page)?.[1];
  return input !== undefined && output !== undefined ? [[cleanBlock(input), cleanBlock(output), null]] : [];
}
function format(challenge: Challenge): string {
  const kinds: Record<string, string> = { cses: 'stdio', atcoder: 'stdio', 'advent-of-code': 'stdio', rosalind: 'stdio', codeforces: 'stdio', 'project-euler': 'single-answer', cryptopals: 'programming', 'jane-street': 'puzzle' };
  return kinds[challenge.source] ?? (challenge.formats.includes('sql') ? 'sql' : challenge.formats.includes('shell') ? 'shell' : 'function');
}
const challenges = readJsonl<Challenge>(join(DATA, 'challenges.jsonl')), meta = new Map<string, Question>();
for (const q of readJson<{ questions: Question[] }>(join(CACHE, 'leetcode/merged.json')).questions) { meta.set(String(q.frontend_id), q); meta.set(q.problem_slug, q); }
const records: Tests[] = challenges.map(challenge => {
  const source = challenge.source, fmt = format(challenge); let raw: RawCase[] = [], note: string | null = null;
  if (source === 'leetcode') {
    raw = (meta.get(challenge.native_id)?.examples ?? []).flatMap(e => { const value = leetcodeExample(e.example_text ?? ''); return value ? [value] : []; });
    if (!raw.length) note = challenge.premium ? 'Premium problem; examples may require a subscription.' : 'No parseable examples in the public metadata mirror.';
  } else if (['cses', 'atcoder', 'rosalind'].includes(source)) {
    const path = join(CACHE, 'tests', source, `${challenge.id}.html`);
    if (existsSync(path)) { const page = text(path); raw = source === 'cses' ? cses(page) : source === 'atcoder' ? atcoder(page) : rosalind(page); if (!raw.length) note = 'No sample section found on the problem page.'; }
    else note = 'Sample page was not downloaded; run tools/fetch_tests.ts.';
  } else {
    const notes: Record<string, string> = {
      codeforces: 'Official samples are not retrievable: codeforces.com returns HTTP 403 to automated requests.',
      'project-euler': 'Project Euler asks for one numeric answer; there is no input/output test contract.',
      'advent-of-code': 'Puzzle inputs are per-user and examples are prose, so there are no canonical public test cases.',
      cryptopals: 'Fixed cryptographic exercises without a uniform stdin/stdout contract.', 'jane-street': 'One-off puzzle with no automated input/output contract.',
    }; note = notes[source] ?? null;
  }
  raw = raw.filter(([input, output]) => input.trim() && output.trim());
  const cases: TestCase[] = raw.map(([input, output, explanation], i) => ({ name: i === 0 ? (fmt === 'function' ? 'example-1' : 'sample-1') : `held-out-${i}`, kind: i === 0 ? (fmt === 'function' ? 'example' : 'sample') : (fmt === 'function' ? 'held-out-example' : 'held-out-sample'), input, output, explanation: i === 0 ? explanation : null }));
  const publicCases = cases.slice(0, 1), hidden = cases.slice(1), notApplicable = ['project-euler', 'advent-of-code', 'cryptopals', 'jane-street'].includes(source);
  return { challenge_id: challenge.id, url: challenge.url, source, format: fmt, status: publicCases.length ? (hidden.length ? 'public+hidden' : 'public-only') : notApplicable ? 'not-applicable' : 'none', public: publicCases, hidden, hidden_policy: hidden.length ? 'held-out-official-samples' : 'none', note };
});
if (new Set(records.map(r => r.challenge_id)).size !== records.length || records.length !== challenges.length) throw new Error('test/challenge id mismatch');
writeJsonl(join(DATA, 'tests.jsonl'), records);
writeFileSync(join(DATA, 'tests.csv'), csv([['challenge_id', 'source', 'status', 'format', 'public_count', 'hidden_count', 'hidden_policy'], ...records.map(r => [r.challenge_id, r.source, r.status, r.format, r.public.length, r.hidden.length, r.hidden_policy])]));
const bySource: Record<string, { challenges: number; with_public: number; with_hidden: number; public_cases: number; hidden_cases: number }> = {};
for (const r of records) { const bucket = bySource[r.source] ??= { challenges: 0, with_public: 0, with_hidden: 0, public_cases: 0, hidden_cases: 0 }; bucket.challenges++; bucket.with_public += Number(r.public.length > 0); bucket.with_hidden += Number(r.hidden.length > 0); bucket.public_cases += r.public.length; bucket.hidden_cases += r.hidden.length; }
const summary = { total: records.length, with_public: records.filter(r => r.public.length).length, with_hidden: records.filter(r => r.hidden.length).length, public_cases: records.reduce((n, r) => n + r.public.length, 0), hidden_cases: records.reduce((n, r) => n + r.hidden.length, 0), by_status: counts(records.map(r => r.status)), by_source: Object.fromEntries(Object.entries(bySource).sort()) };
const indexPath = join(DATA, 'index.json'); if (existsSync(indexPath)) writeJson(indexPath, { ...readJson<Record<string, unknown>>(indexPath), tests: summary });
console.log(`wrote ${records.length} test records\n  with public cases: ${summary.with_public}\n  with hidden cases: ${summary.with_hidden}\n  public cases: ${summary.public_cases}  hidden cases: ${summary.hidden_cases}`);
for (const [source, value] of Object.entries(bySource).sort()) console.log(`  ${source.padEnd(16)} public ${String(value.with_public).padStart(5)}  hidden ${String(value.with_hidden).padStart(5)}`);
