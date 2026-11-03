/** Offline documentation discovery and local Markdown integrity checks. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { root } from './project.ts';

export type Document = { path: string; title: string; headings: string[] };
const ignored = new Set(['.git', '.cache', 'node_modules', 'dist', '.agent']);
const prose = (text: string): string => text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');

export function documents(directory = root): Document[] {
  const entries: Document[] = [];
  function visit(path: string): void {
    for (const item of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      if (ignored.has(item.name) || item.isSymbolicLink()) continue;
      const file = join(path, item.name);
      if (item.isDirectory()) visit(file);
      else if (extname(file) === '.md') {
        const text = prose(readFileSync(file, 'utf8'));
        const headings = [...text.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)].map(match => match[1]!);
        entries.push({ path: relative(directory, file), title: headings[0] ?? item.name, headings });
      }
    }
  }
  visit(directory);
  return entries;
}

/** GitHub-style heading anchors, including duplicates and explicit HTML anchors. */
function anchors(text: string): Set<string> {
  const found = new Set<string>();
  const counts = new Map<string, number>();
  for (const match of prose(text).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const slug = match[1]!.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').replace(/\s/g, '-');
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1); found.add(slug + (count ? `-${count}` : ''));
  }
  for (const match of text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) found.add(match[1]!);
  return found;
}

export function checkDocuments(directory = root): string[] {
  const failures: string[] = [];
  const cache = new Map<string, Set<string>>();
  for (const doc of documents(directory)) {
    const file = join(directory, doc.path);
    const text = readFileSync(file, 'utf8');
    let fence: string | undefined;
    for (const line of text.split('\n')) {
      const match = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (!match) continue;
      if (fence === undefined) fence = match[1]!;
      else if (match[1]![0] === fence[0] && match[1]!.length >= fence.length) fence = undefined;
    }
    if (fence) failures.push(`${doc.path}: unclosed code fence`);
    const links = prose(text).replace(/(`+)[^\n]*?\1/g, '');
    for (const match of links.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      let target = match[1]!.replace(/^<|>$/g, '');
      if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(target)) continue;
      try { target = decodeURIComponent(target); } catch { failures.push(`${doc.path}: invalid link ${target}`); continue; }
      const [name, fragment] = target.split('#');
      const path = resolve(dirname(file), name || '.');
      const destination = name ? path : file;
      if (!existsSync(destination)) { failures.push(`${doc.path}: missing link ${target}`); continue; }
      if (fragment && extname(destination) === '.md' && statSync(destination).isFile()) {
        let values = cache.get(destination);
        if (!values) { values = anchors(readFileSync(destination, 'utf8')); cache.set(destination, values); }
        if (!values.has(fragment)) failures.push(`${doc.path}: missing fragment ${target}`);
      }
    }
  }
  return failures;
}

export function showDocuments(args: string[]): void {
  if (args.length === 1 && args[0] === '--check') {
    const failures = checkDocuments();
    if (failures.length) throw new Error(failures.join('\n'));
    console.log('Documentation links, fragments and fences passed.'); return;
  }
  const json = args[0] === '--json';
  const query = (json ? args.slice(1) : args).join(' ').toLowerCase();
  const selected = documents().filter(doc => !query || [doc.path, doc.title, ...doc.headings].some(value => value.toLowerCase().includes(query)));
  if (json) console.log(JSON.stringify(selected, null, 2));
  else if (!query) console.log('Start: docs/start-here.md\nTour: docs/tour.md\nReference: docs/README.md\nStatus: compiler/transition-plan.md\nContribute: CONTRIBUTING.md\nSearch: lite docs QUERY | --json [QUERY] | --check');
  else { if (!selected.length) throw new Error(`no documentation matches: ${query}`); for (const doc of selected) console.log(`${doc.title}\n  ${doc.path}`); }
}

if (import.meta.main) {
  try { showDocuments(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
