#!/usr/bin/env node
/** Query the challenge corpus without extra runtime dependencies. */
import { join } from 'node:path';
import { DATA, readJsonl, options, counts, band, csv, normalizedText, fail, type Challenge, type List } from './common.ts';
const args = options(process.argv.slice(2), { '--source': 'value', '--category': 'value', '--topic': 'repeat', '--difficulty': 'value', '--topics-source': 'value', '--status': 'value', '--premium': 'value', '--list': 'value', '--search': 'value', '--sort': 'value', '--desc': 'flag', '--limit': 'value', '--all': 'flag', '--json': 'flag', '--csv': 'flag', '--group-by': 'value', '--stats': 'flag', '--help': 'flag', '-h': 'flag' });
if (args.has('--help') || args.has('-h')) { console.log('Usage: node tools/query.ts [--source ids] [--category ids] [--topic ids] [--difficulty 1-10|4-7] [--list ids] [--search text] [--sort source|id|title|difficulty|popularity] [--desc] [--limit N|--all] [--json|--csv] [--group-by source|category|topic|difficulty|topics_source|status] [--stats]'); process.exit(0); }
const get = (name: string, fallback = ''): string => args.get(name)?.[0] ?? fallback;
const split = (name: string): string[] => get(name).split(',').map(x => x.trim()).filter(Boolean);
let records = readJsonl<Challenge>(join(DATA, 'challenges.jsonl')); const lists = new Map(readJsonl<List>(join(DATA, 'lists.jsonl')).map(l => [l.id, l]));
const field = (r: Challenge, key: string): string => { switch (key) { case 'source': return r.source; case 'category': return r.category; case 'difficulty': return band(r.difficulty.normalized); case 'topics_source': return r.topics_source; case 'status': return r.status; default: return fail(`unknown grouping ${key}`); } };
if (args.has('--stats')) { console.log(`total: ${records.length}`); for (const key of ['source', 'category', 'difficulty', 'topics_source', 'status']) { console.log(`\n${key}:`); for (const [name, n] of Object.entries(counts(records.map(r => field(r, key))))) console.log(`  ${name.padEnd(22)} ${String(n).padStart(5)}`); } process.exit(0); }
let selected: string[] | undefined;
if (get('--list')) { selected = []; for (const id of new Set(split('--list'))) { const list = lists.get(id); if (!list) fail(`unknown list(s): ${id}`); selected.push(...list.challenge_ids); } }
if (get('--source')) records = records.filter(r => split('--source').includes(r.source));
if (get('--category')) records = records.filter(r => split('--category').includes(r.category));
if (args.has('--topic')) { const topics = args.get('--topic')!.flatMap(t => t.split(',').map(t => t.trim()).filter(Boolean)); records = records.filter(r => topics.every(t => r.topics.includes(t))); }
if (get('--difficulty')) { const values = get('--difficulty').split('-').map(Number), low = values[0]!, high = values[1] ?? low; if (!Number.isFinite(low) || !Number.isFinite(high)) fail('invalid difficulty range'); records = records.filter(r => r.difficulty.normalized >= low && r.difficulty.normalized <= high); }
for (const [option, key] of [['--topics-source', 'topics_source'], ['--status', 'status']] as const) if (get(option)) records = records.filter(r => r[key] === get(option));
const premium = get('--premium', 'include'); if (!['include', 'exclude', 'only'].includes(premium)) fail('invalid --premium');
if (premium !== 'include') records = records.filter(r => premium === 'only' ? r.premium : !r.premium);
if (get('--search')) records = records.filter(r => r.title.toLowerCase().includes(get('--search').toLowerCase()));
if (selected !== undefined) { const order = new Map(selected.map((id, i) => [id, i])); records = records.filter(r => order.has(r.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!); }
if (get('--group-by')) { const key = get('--group-by'); for (const [name, n] of Object.entries(counts(key === 'topic' ? records.flatMap(r => r.topics) : records.map(r => field(r, key))))) console.log(`${name.padEnd(24)} ${String(n).padStart(5)}`); console.log(`${'TOTAL'.padEnd(24)} ${String(records.length).padStart(5)}`); process.exit(0); }
const sort = get('--sort', 'source'); if (!['source', 'id', 'title', 'difficulty', 'popularity'].includes(sort)) fail('invalid --sort');
const compareText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
if (selected === undefined) records.sort((a, b) => (sort === 'difficulty' ? a.difficulty.normalized - b.difficulty.normalized : sort === 'title' ? compareText(a.title.toLowerCase(), b.title.toLowerCase()) : sort === 'popularity' ? (a.popularity?.solved ?? 0) - (b.popularity?.solved ?? 0) : sort === 'id' ? compareText(a.id, b.id) : compareText(a.source, b.source) || (a.number ?? 0) - (b.number ?? 0) || compareText(a.id, b.id)) * (args.has('--desc') ? -1 : 1));
const total = records.length, limit = Number(get('--limit', '25')); if (!Number.isInteger(limit)) fail('invalid --limit'); if (!args.has('--all')) records = records.slice(0, limit);
if (args.has('--json')) { for (const r of records) console.log(JSON.stringify(r)); }
else if (args.has('--csv')) process.stdout.write(csv([['id', 'title', 'source', 'category', 'difficulty', 'topics', 'url'], ...records.map(r => [r.id, r.title, r.source, r.category, normalizedText(r), r.topics.join(';'), r.url])]));
else { console.log(`${'ID'.padEnd(28)} ${'DIFF'.padStart(4)}  ${'SOURCE'.padEnd(14)} TITLE\n${'-'.repeat(110)}`); for (const r of records) console.log(`${r.id.padEnd(28)} ${r.difficulty.normalized.toFixed(1).padStart(4)}  ${r.source.padEnd(14)} ${r.title.length <= 52 ? r.title : r.title.slice(0, 49) + '...'}`); console.log(`\n${records.length} shown of ${total} matching challenge(s)`); }
