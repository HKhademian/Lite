#!/usr/bin/env node
/** Normalize the cached public challenge sources; all generated outputs remain data. */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, CACHE, DATA, readJson, text, optionalText, writeJson, writeJsonl, clean, slugify, unique, round, counts, csv, normalizedText, fail, type Challenge, type Difficulty, type List, type Group, type Question } from './common.ts';

type Catalog = {
  CATEGORIES: Record<string, string>; LC_TOPICS: Record<string, string>; CF_TAGS: Record<string, string>;
  CSES_SECTIONS: Record<string, [string[], number]>; CRYPTOPALS_SETS: Record<string, [string, string[]]>;
  TOPIC_GROUPS: Record<string, string>; TOPIC_LABELS: Record<string, string>; DIFFICULTY_BANDS: unknown[];
  SOURCE_INFO: [string, string, string, string][]; SOURCE_ORDER: string[];
};
export const catalog = readJson<Catalog>(fileURLToPath(new URL('catalog.json', import.meta.url)));
const { CATEGORIES, LC_TOPICS, CF_TAGS, CSES_SECTIONS, CRYPTOPALS_SETS, TOPIC_GROUPS, TOPIC_LABELS, DIFFICULTY_BANDS, SOURCE_INFO, SOURCE_ORDER } = catalog;
type RecordInput = Pick<Challenge, 'id' | 'title' | 'source' | 'url' | 'category' | 'difficulty'> & Partial<Omit<Challenge, 'native_id'>> & { native_id: string | number };
function record(input: RecordInput): Challenge {
  const topics = unique(input.topics ?? []);
  return { id: input.id, title: input.title, source: input.source, url: input.url, native_id: String(input.native_id), set: input.set ?? null,
    number: input.number ?? null, category: input.category, primary_topic: topics[0] ?? null, topics, raw_topics: (input.raw_topics ?? []).map(String), tags: unique(input.tags ?? []),
    difficulty: input.difficulty, formats: input.formats ?? [], languages: input.languages?.length ? input.languages : ['any'], topics_source: input.topics_source ?? 'source',
    popularity: input.popularity ?? null, premium: input.premium ?? false, status: input.status ?? 'verified' };
}
function difficulty(scale: string, raw: string | number, value: number): Difficulty { return { scale, raw, normalized: round(Math.min(10, Math.max(1, value)), 1) }; }
function pages(folder: string, pattern: RegExp): string[] { return readdirSync(join(CACHE, folder)).filter(name => pattern.test(name)).sort().map(name => join(CACHE, folder, name)); }

function leetcode(): Challenge[] {
  type Pair = { stat: { frontend_question_id?: number; question_id: number; question__title_slug: string; question__title: string; total_submitted?: number; total_acs?: number }; difficulty: { level: number }; paid_only: boolean };
  const api = readJson<{ stat_status_pairs: Pair[] }>(join(CACHE, 'leetcode/api-all.json')).stat_status_pairs;
  const meta = new Map<string, Question>();
  for (const q of readJson<{ questions: Question[] }>(join(CACHE, 'leetcode/merged.json')).questions) { meta.set(String(q.frontend_id), q); meta.set(q.problem_slug, q); }
  const level: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  const normalized: Record<string, number> = { Easy: 2, Medium: 5, Hard: 8 };
  return api.map(pair => {
    const stat = pair.stat, qid = String(stat.frontend_question_id || stat.question_id);
    const info = meta.get(qid) ?? meta.get(stat.question__title_slug), raw = info?.topics ?? [];
    const topics = unique(raw.map(t => LC_TOPICS[t] ?? slugify(t))), diff = level[pair.difficulty.level]!;
    const attempts = stat.total_submitted || 0, solved = stat.total_acs || 0;
    const categories = [['databases', 'databases'], ['shell', 'shell'], ['concurrency', 'concurrency'], ['javascript', 'javascript'], ['pandas', 'data-analysis']] as const;
    return record({ id: `leetcode-${qid}`, title: clean(stat.question__title), source: 'leetcode', url: `https://leetcode.com/problems/${stat.question__title_slug}/`, native_id: qid,
      number: /^\d+$/.test(qid) ? Number(qid) : null, category: categories.find(([topic]) => topics.includes(topic))?.[1] ?? 'algorithms', topics, raw_topics: raw,
      tags: ['leetcode', diff.toLowerCase(), ...(pair.paid_only ? ['premium'] : [])], difficulty: difficulty('leetcode', diff, normalized[diff]!),
      formats: [topics.includes('databases') ? 'sql' : topics.includes('shell') ? 'shell' : 'function'],
      languages: [topics.includes('databases') ? 'sql' : topics.includes('shell') ? 'bash' : topics.includes('pandas') ? 'python' : 'any'],
      topics_source: topics.length ? 'source' : 'none', popularity: { attempts, solved, acceptance: attempts ? round(solved / attempts, 4) : null }, premium: pair.paid_only, status: topics.length ? 'verified' : 'partial' });
  });
}
function codeforces(limit = 800): Challenge[] {
  type Problem = { contestId: number; index: string; name: string; type?: string; rating?: number; tags?: string[] };
  const payload = readJson<{ result: { problems: Problem[]; problemStatistics: { contestId: number; index: string; solvedCount?: number }[] } }>(join(CACHE, 'codeforces/problemset.json')).result;
  const stats = new Map(payload.problemStatistics.map(p => [`${p.contestId}/${p.index}`, p.solvedCount ?? 0]));
  const candidates = payload.problems.filter(p => p.rating && p.rating >= 800 && p.rating <= 3000 && (p.type ?? 'PROGRAMMING') === 'PROGRAMMING')
    .map(p => ({ p, solved: stats.get(`${p.contestId}/${p.index}`) ?? 0 })).filter(p => p.solved > 0);
  const compare = (a: typeof candidates[number], b: typeof candidates[number]): number => b.solved - a.solved || a.p.contestId - b.p.contestId || a.p.index.localeCompare(b.p.index, 'en');
  const selected: typeof candidates = [], seen = new Set<string>();
  const add = (entry: typeof candidates[number]): void => { const key = `${entry.p.contestId}/${entry.p.index}`; if (!seen.has(key)) { seen.add(key); selected.push(entry); } };
  for (const [low, high] of [[800, 1199], [1200, 1599], [1600, 1999], [2000, 3000]] as const) {
    for (const entry of candidates.filter(({ p }) => p.rating! >= low && p.rating! <= high).sort(compare).slice(0, Math.max(1, Math.floor(limit / 4)))) add(entry);
  }
  if (selected.length < limit) for (const entry of candidates.sort(compare)) { add(entry); if (selected.length >= limit) break; }
  return selected.slice(0, limit).map(({ p, solved }) => record({ id: `codeforces-${p.contestId}${p.index}`.toLowerCase(), title: clean(p.name), source: 'codeforces', url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
    native_id: `${p.contestId}${p.index}`, set: `contest-${p.contestId}`, category: 'algorithms', topics: unique((p.tags ?? []).map(t => CF_TAGS[t] ?? slugify(t))), raw_topics: p.tags ?? [],
    tags: ['codeforces', `rating-${p.rating}`, `contest-${p.contestId}`, `index-${p.index.toLowerCase()}`], difficulty: difficulty('codeforces-rating', p.rating!, 1 + (p.rating! - 800) / 250), formats: ['stdin-stdout'], popularity: { solved } }));
}
function cses(): Challenge[] {
  const out: Challenge[] = [], counters = new Map<string, number>(); let section = '';
  for (const m of text(join(CACHE, 'cses/problemset.html')).matchAll(/<h2>([^<]+)<\/h2>|href="\/problemset\/task\/(\d+)">([^<]+)<\/a>/g)) {
    if (m[1]) { section = clean(m[1]); continue; } if (!section) continue;
    const [topics, base] = CSES_SECTIONS[section] ?? [['mixed'], 5]; const n = (counters.get(section) ?? 0) + 1; counters.set(section, n);
    out.push(record({ id: `cses-${m[2]}`, title: clean(m[3]!), source: 'cses', url: `https://cses.fi/problemset/task/${m[2]}`, native_id: m[2]!, set: section, number: n,
      category: 'algorithms', topics, tags: ['cses', slugify(section)], difficulty: difficulty('cses-section', section, base), formats: ['stdin-stdout'], topics_source: 'section' }));
  } return out;
}
function aoc(): Challenge[] {
  const out: Challenge[] = [];
  for (let year = 2015; year <= 2025; year++) for (let day = 1; day <= 25; day++) {
    const m = /<h2>--- Day (\d+): (.*?) ---<\/h2>/s.exec(optionalText(join(CACHE, `aoc/${year}/day${String(day).padStart(2, '0')}.html`))); if (!m) continue;
    out.push(record({ id: `aoc-${year}-${String(day).padStart(2, '0')}`, title: clean(m[2]!), source: 'advent-of-code', url: `https://adventofcode.com/${year}/day/${day}`, native_id: `${year}/${day}`,
      set: String(year), number: day, category: 'puzzles', topics: [], tags: ['advent-of-code', String(year), `day-${day}`], difficulty: difficulty('aoc-day', `Day ${day}`, 1 + (day - 1) / 24 * 8), formats: ['stdin-stdout', 'two-part'], topics_source: 'none' }));
  } return out;
}
function euler(): Challenge[] {
  const seen = new Map<number, string>();
  for (const path of pages('project-euler', /^page.*\.html$/)) for (const m of text(path).matchAll(/href="problem=(\d+)"[^>]*>(.*?)<\/a>/gs)) if (!seen.has(Number(m[1]))) seen.set(Number(m[1]), clean(m[2]!));
  return [...seen].sort((a, b) => a[0] - b[0]).map(([n, title]) => {
    const base = n <= 25 ? 1.5 : n <= 50 ? 2 : n <= 100 ? 3 : n <= 200 ? 4 : n <= 350 ? 5 : n <= 500 ? 6 : n <= 700 ? 7 : 8;
    return record({ id: `project-euler-${String(n).padStart(3, '0')}`, title, source: 'project-euler', url: `https://projecteuler.net/problem=${n}`, native_id: n, set: 'Project Euler', number: n,
      category: 'mathematics', topics: ['math'], tags: ['project-euler', `tier-${Math.trunc(base)}`], difficulty: difficulty('project-euler-number', n, base), formats: ['stdin-stdout', 'single-answer'], topics_source: 'curated' });
  });
}
function rosalind(): Challenge[] {
  const out: Challenge[] = [];
  for (const row of text(join(CACHE, 'rosalind/list.html')).matchAll(/<tr>(.*?)<\/tr>/gs)) {
    const m = /href="\/problems\/([^/"\s]+)\/"[^>]*>([^<]+)<\/a>/.exec(row[1]!); if (!m) continue;
    const solved = Number(/\/recent\/">(\d+)<\/a>/.exec(row[1]!)?.[1] ?? 0), ratioText = /([\d.]+)% of all attempts/.exec(row[1]!)?.[1]; const ratio = ratioText === undefined ? null : Number(ratioText) / 100;
    out.push(record({ id: `rosalind-${m[1]}`, title: clean(m[2]!), source: 'rosalind', url: `https://rosalind.info/problems/${m[1]}/`, native_id: m[1]!, set: 'Bioinformatics Stronghold', category: 'bioinformatics', topics: ['bioinformatics'], tags: ['rosalind', m[1]!],
      difficulty: difficulty('acceptance-proxy', ratio === null ? 'unknown' : `${(ratio * 100).toFixed(1)}% correct`, ratio === null ? 4 : 1 + (1 - ratio) * 8), formats: ['stdin-stdout'], topics_source: 'curated', popularity: { solved, acceptance: ratio === null ? null : round(ratio, 4) } }));
  } return out;
}
function cryptopals(): Challenge[] {
  const out: Challenge[] = [];
  for (const [setNo, [name, topics]] of Object.entries(CRYPTOPALS_SETS)) for (const m of optionalText(join(CACHE, `cryptopals/set${setNo}.html`)).matchAll(new RegExp(`href=['"]/sets/${setNo}/challenges/(\\d+)(\\.txt)?['"][^>]*>([^<]+)</a>`, 'g'))) {
    out.push(record({ id: `cryptopals-${m[1]!.padStart(2, '0')}`, title: clean(m[3]!), source: 'cryptopals', url: `https://cryptopals.com/sets/${setNo}/challenges/${m[1]}${m[2] ?? ''}`, native_id: m[1]!, set: `Set ${setNo}: ${name}`, number: Number(m[1]), category: 'security', topics, tags: ['cryptopals', `set-${setNo}`], difficulty: difficulty('cryptopals-set', `Set ${setNo}`, 1 + Number(setNo)), formats: ['programming'], topics_source: 'curated' }));
  } return out;
}
function janeStreet(): Challenge[] {
  const out = new Map<string, Challenge>();
  for (const path of pages('jane-street', /^archive.*\.html$/)) for (const m of text(path).matchAll(/<div class="row puzzle-row archive-list">(.*?)<\/div>\s*<\/div>/gs)) {
    const body = m[1]!, name = /<span class="name">([^<]+)<\/span>/.exec(body)?.[1], link = /class="puzzle-link" href="([^"]+)"/.exec(body)?.[1]; if (!name || !link) continue;
    const slug = link.replace(/^\/+|\/+$/g, '').split('/').at(-1)!.replace(/-index$/, ''); if (out.has(slug)) continue;
    const when = /<span class="date">([^<]+)<\/span>/.exec(body)?.[1], month = when ? clean(when).replace(/:+$/, '') : null;
    out.set(slug, record({ id: `jane-street-${slug}`, title: clean(name), source: 'jane-street', url: 'https://www.janestreet.com' + link, native_id: slug, set: month, category: 'puzzles', topics: [], tags: ['jane-street', ...(month ? [slugify(month)] : [])], difficulty: difficulty('editorial', 'Puzzle', 7), formats: ['puzzle'], topics_source: 'none' }));
  } return [...out.values()];
}
function atcoder(limit = 350): Challenge[] {
  type Problem = { id: string; contest_id: string; name: string };
  const problems = readJson<Problem[]>(join(CACHE, 'atcoder/problems.json'));
  const models = readJson<Record<string, { is_experimental?: boolean; difficulty?: number; irt_users?: number }>>(join(CACHE, 'atcoder/models.json'));
  const candidates = problems.flatMap(p => { const prefix = /^[a-z]+/.exec(p.contest_id)?.[0], model = models[p.id]; return prefix && ['abc', 'arc', 'agc'].includes(prefix) && model && !model.is_experimental && model.difficulty !== undefined ? [{ p, prefix, raw: model.difficulty, users: model.irt_users ?? 0 }] : []; });
  return candidates.sort((a, b) => b.users - a.users).slice(0, limit).map(({ p, prefix, raw, users }) => record({ id: `atcoder-${p.id.replaceAll('_', '-').toLowerCase()}`, title: clean(p.name), source: 'atcoder', url: `https://atcoder.jp/contests/${p.contest_id}/tasks/${p.id}`, native_id: p.id, set: p.contest_id, category: 'algorithms', topics: [], tags: ['atcoder', prefix, `contest-${p.contest_id}`], difficulty: difficulty('atcoder-difficulty', raw, 1 + (Math.max(raw, 400) - 400) / 320), formats: ['stdin-stdout'], topics_source: 'none', popularity: { users } }));
}

/** Read the downloaded roadmap's limited groups/name/problems TOML shape. */
function roadmap(path: string): { name: string; problems: string[] }[] {
  const groups: { name: string; problems: string[] }[] = [];
  for (const block of optionalText(path).split(/^\[\[groups\]\]\s*$/m).slice(1)) {
    const name = /^name\s*=\s*("(?:[^"\\]|\\.)*")/m.exec(block)?.[1];
    const problems = /^problems\s*=\s*\[([\s\S]*?)\]/m.exec(block)?.[1];
    if (name === undefined || problems === undefined) fail(`unsupported roadmap group in ${path}`);
    groups.push({ name: JSON.parse(name) as string, problems: [...problems.matchAll(/"(?:[^"\\]|\\.)*"/g)].map(m => JSON.parse(m[0]) as string) });
  } return groups;
}
function buildLists(records: Challenge[]): List[] {
  const byId = new Set(records.map(r => r.id)), lists: List[] = [];
  function add(id: string, title: string, kind: string, source: string, url: string, description: string, ids: string[], groups?: Group[]): void {
    const filtered = unique(ids).filter(id => byId.has(id)), entry: List = { id, title, kind, source, url, description, count: filtered.length, challenge_ids: filtered };
    if (groups?.length) { const seen = new Set<string>(); entry.groups = groups.flatMap(group => { const ids = group.challenge_ids.filter(id => byId.has(id) && !seen.has(id)); ids.forEach(id => seen.add(id)); return ids.length ? [{ name: group.name, challenge_ids: ids }] : []; }); }
    lists.push(entry);
  }
  for (const [id, title, filename, url, description] of [
    ['blind-75', 'Blind 75', 'blind_75.toml', 'https://leetcode.com/discuss/general-discussion/460599/blind-75', 'The classic 75-question interview list, grouped by pattern.'],
    ['neetcode-150', 'NeetCode 150', 'neetcode_150.toml', 'https://neetcode.io/practice', "NeetCode's curated 150-question roadmap, grouped by pattern."],
  ] as const) {
    const path = join(CACHE, 'roadmaps', filename); if (!existsSync(path)) continue;
    const groups = roadmap(path).flatMap(g => { const ids = unique(g.problems.flatMap(p => { const prefix = p.split('_')[0]!; return /^\d+$/.test(prefix) && byId.has(`leetcode-${Number(prefix)}`) ? [`leetcode-${Number(prefix)}`] : []; })); return ids.length ? [{ name: g.name, challenge_ids: ids }] : []; });
    add(id, title, 'roadmap', 'leetcode', url, description, unique(groups.flatMap(g => g.challenge_ids)), groups);
  }
  for (let year = 2015; year <= 2025; year++) { const ids = records.filter(r => r.source === 'advent-of-code' && r.set === String(year)).map(r => r.id); if (ids.length) add(`aoc-${year}`, `Advent of Code ${year}`, 'event', 'advent-of-code', `https://adventofcode.com/${year}`, `All ${ids.length} puzzles from Advent of Code ${year}.`, ids); }
  const sections = new Map<string, string[]>(); for (const r of records.filter(r => r.source === 'cses')) sections.set(r.set!, [...sections.get(r.set!) ?? [], r.id]);
  for (const [section, ids] of sections) add(`cses-${slugify(section)}`, `CSES · ${section}`, 'section', 'cses', 'https://cses.fi/problemset/', `CSES “${section}” section (${ids.length} tasks).`, ids);
  for (const [n, [name]] of Object.entries(CRYPTOPALS_SETS)) { const ids = records.filter(r => r.source === 'cryptopals' && r.set?.startsWith(`Set ${n}:`)).map(r => r.id); if (ids.length) add(`cryptopals-set-${n}`, `Cryptopals · Set ${n}: ${name}`, 'set', 'cryptopals', `https://cryptopals.com/sets/${n}`, `${ids.length} crypto challenges from set ${n}.`, ids); }
  add('project-euler-first-100', 'Project Euler · First 100', 'collection', 'project-euler', 'https://projecteuler.net/archives', 'The classic first hundred Project Euler problems; a common starting target.', records.filter(r => r.source === 'project-euler' && r.number !== null && r.number <= 100).map(r => r.id));
  for (const [category, title, description] of [['databases', 'LeetCode · Database', 'All SQL/database problems in the corpus; good for SQL interview prep.'], ['concurrency', 'LeetCode · Concurrency', 'Threads, locks and synchronization problems.'], ['shell', 'LeetCode · Shell', 'Unix shell and command-line problems.']] as const) {
    const ids = records.filter(r => r.source === 'leetcode' && r.category === category).map(r => r.id); if (ids.length) add(`leetcode-${category}`, title, 'collection', 'leetcode', 'https://leetcode.com/problemset/', description, ids);
  } return lists;
}
function validate(records: Challenge[], lists: List[]): void {
  const known = new Set(records.map(r => r.id)); if (known.size !== records.length) fail('duplicate challenge ids');
  for (const r of records) { if (!r.title || !r.url.startsWith('https://') || !(r.category in CATEGORIES) || !(r.difficulty.normalized >= 1 && r.difficulty.normalized <= 10) || r.topics.some(t => !/^[a-z0-9][a-z0-9-]*$/.test(t))) fail(`invalid challenge ${r.id}`); }
  for (const list of lists) if (list.challenge_ids.some(id => !known.has(id))) fail(`list ${list.id} references unknown ids`);
}
export function main(): void {
  if (!existsSync(CACHE)) fail('no cache; run tools/fetch_sources.ts first');
  const records = [...aoc(), ...euler(), ...leetcode(), ...codeforces(), ...cses(), ...atcoder(), ...rosalind(), ...cryptopals(), ...janeStreet()];
  const order = new Map(SOURCE_ORDER.map((s, i) => [s, i]));
  records.sort((a, b) => (order.get(a.source) ?? 99) - (order.get(b.source) ?? 99) || (a.number ?? 0) - (b.number ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const lists = buildLists(records); validate(records, lists); mkdirSync(DATA, { recursive: true });
  writeJsonl(join(DATA, 'challenges.jsonl'), records); writeJsonl(join(DATA, 'lists.jsonl'), lists);
  writeFileSync(join(DATA, 'challenges.csv'), csv([['id', 'title', 'source', 'category', 'primary_topic', 'topics', 'raw_topics', 'tags', 'difficulty', 'difficulty_normalized', 'topics_source', 'formats', 'premium', 'url'], ...records.map(r => [r.id, r.title, r.source, r.category, r.primary_topic, r.topics.join(';'), r.raw_topics.join(';'), r.tags.join(';'), r.difficulty.raw, normalizedText(r), r.topics_source, r.formats.join(';'), r.premium, r.url])]));
  const bySource = counts(records.map(r => r.source)), byTopic = counts(records.flatMap(r => r.topics));
  writeJson(join(DATA, 'index.json'), { total: records.length, built: new Date().toLocaleDateString('en-CA'), sources: SOURCE_INFO.map(([id, name, homepage, description]) => ({ id, name, homepage, description, count: bySource[id] ?? 0 })), categories: counts(records.map(r => r.category)), difficulty: counts(records.map(r => String(Math.trunc(r.difficulty.normalized)))), topics: byTopic, topics_source: counts(records.map(r => r.topics_source)), status: counts(records.map(r => r.status)), lists: lists.map(({ id, title, count }) => ({ id, title, count })) });
  writeJson(join(ROOT, 'schema/taxonomy.json'), { version: 1, note: 'Generated by tools/build.ts from the topics present in the corpus.', categories: Object.entries(CATEGORIES).map(([id, description]) => ({ id, description })), topics: Object.keys(byTopic).sort().map(id => ({ id, label: TOPIC_LABELS[id] ?? id.replaceAll('-', ' ').replace(/\b\w/g, x => x.toUpperCase()), group: TOPIC_GROUPS[id] ?? 'other' })), difficulty: { scale: 'normalized 1-10', bands: DIFFICULTY_BANDS }, sources: SOURCE_INFO.map(([id, name, homepage, description]) => ({ id, name, homepage, description })) });
  console.log(`wrote ${records.length} challenges, ${lists.length} lists`);
  for (const id of [...SOURCE_ORDER, 'TOTAL']) console.log(`  ${id.padEnd(16)} ${String(id === 'TOTAL' ? records.length : bySource[id] ?? 0).padStart(5)}`);
  console.log(`  topics: ${Object.keys(byTopic).length}   categories: ${Object.keys(counts(records.map(r => r.category))).length}`);
}
main();
