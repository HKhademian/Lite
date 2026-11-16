/** Collects Samples, Examples, Cases, and Pieces into `dist/site/playground/library.json`. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { sourceModuleIdentity } from '../compiler/source.ts';
import type { ShowcaseSample } from './groups.ts';
import type { GymCatalog } from './gym-verify.ts';
import type { LearnCatalog } from './learn-pages.ts';
import type { PlaySample } from './play-samples.ts';

export type LibraryCategory = 'sample' | 'example' | 'case' | 'piece';

export type PlaygroundExtraModule = Readonly<{
  path: string;
  display: string;
  identity: string;
  text: string;
}>;

export type PlaygroundLibraryItem = Readonly<{
  id: string;
  slug: string;
  category: LibraryCategory;
  badge: string;
  title: string;
  file: string;
  source: string;
  stdin: string;
  args: readonly string[];
  environment?: 'universal' | 'play' | 'cli';
  extraModules?: Readonly<Record<string, PlaygroundExtraModule>>;
  sampleId?: string;
}>;

function detectSourceEnvironment(source: string): 'universal' | 'play' | 'cli' {
  if (/import\s+"core\/(file|path|process|time)"/.test(source)) return 'cli';
  if (/import\s+"extra\/(canvas|audio|board)"/.test(source)) return 'play';
  return 'universal';
}

function collectRelativeModules(
  rootDir: string,
  entryRelFile: string,
  entrySource: string,
): Record<string, PlaygroundExtraModule> | undefined {
  const modules: Record<string, PlaygroundExtraModule> = {};
  const queue: Array<{ fromFile: string; text: string }> = [{ fromFile: entryRelFile, text: entrySource }];
  const seenFiles = new Set<string>([entryRelFile]);
  const importRe = /import\s+"(\.[^"]+)"/g;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDir = posix.dirname(current.fromFile);
    importRe.lastIndex = 0;
    for (let m = importRe.exec(current.text); m !== null; m = importRe.exec(current.text)) {
      const spec = m[1]!;
      const resolvedRel = posix.normalize(posix.join(currentDir, spec));
      const fullPath = join(rootDir, resolvedRel);
      if (!existsSync(fullPath)) continue;
      const modText = readFileSync(fullPath, 'utf8');
      modules[spec] = {
        path: resolvedRel,
        display: resolvedRel,
        identity: sourceModuleIdentity(modText),
        text: modText,
      };
      if (!seenFiles.has(resolvedRel)) {
        seenFiles.add(resolvedRel);
        queue.push({ fromFile: resolvedRel, text: modText });
      }
    }
  }

  return Object.keys(modules).length > 0 ? modules : undefined;
}

function walkLtsFiles(dir: string, relBase: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, entry.name);
    const rel = `${relBase}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walkLtsFiles(abs, rel));
    else if (entry.name.endsWith('.lts')) out.push(rel);
  }
  return out;
}

function walkMarkdownFiles(dir: string, relBase: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, entry.name);
    const rel = `${relBase}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walkMarkdownFiles(abs, rel));
    else if (entry.name.endsWith('.md')) out.push(rel);
  }
  return out;
}

function slugToTitle(relPath: string): string {
  const base = posix.basename(relPath, '.lts');
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function allocateSlug(used: Set<string>, preferred: string): string {
  const clean = preferred.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  let candidate = clean;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${clean}-${String(suffix)}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function extractHandbookPieces(rootDir: string, usedSlugs: Set<string>): PlaygroundLibraryItem[] {
  const items: PlaygroundLibraryItem[] = [];
  const mdFiles = walkMarkdownFiles(join(rootDir, 'language', 'learn', 'handbook'), 'language/learn/handbook');
  const fenceRe = /^```(lite|lts)\r?\n([\s\S]*?)^```/gm;

  for (const relPath of mdFiles) {
    const raw = readFileSync(join(rootDir, relPath), 'utf8');
    const lines = raw.split(/\r?\n/);
    const chapterSlug = posix.basename(relPath, '.md');
    let match: RegExpExecArray | null;
    let index = 0;
    fenceRe.lastIndex = 0;
    while ((match = fenceRe.exec(raw)) !== null) {
      const code = (match[2] ?? '').replace(/\n$/, '');
      if (code.trim() === '') continue;
      const prefixLines = raw.slice(0, match.index).split(/\r?\n/).length;
      let heading = slugToTitle(`${chapterSlug}.lts`);
      for (let i = Math.min(prefixLines - 1, lines.length - 1); i >= 0; i -= 1) {
        const line = lines[i] ?? '';
        const hMatch = /^#{1,4}\s+(.+)$/.exec(line);
        if (hMatch?.[1]) {
          heading = hMatch[1].replace(/`/g, '').trim();
          break;
        }
      }
      const slug = allocateSlug(usedSlugs, `${chapterSlug}-${String(index)}`);
      items.push({
        id: `piece/${slug}`,
        slug,
        category: 'piece',
        badge: 'Handbook',
        title: heading,
        file: relPath,
        source: code,
        stdin: '',
        args: [],
      });
      index += 1;
    }
  }
  return items;
}

/** Collects Samples, Examples, Cases, and Pieces for Playground's unified Open explorer. */
export function collectPlaygroundLibrary(options: Readonly<{
  rootDir: string;
  samples: readonly (ShowcaseSample | PlaySample)[];
}>): readonly PlaygroundLibraryItem[] {
  const { rootDir, samples } = options;
  const items: PlaygroundLibraryItem[] = [];
  const usedByCat: Record<LibraryCategory, Set<string>> = {
    sample: new Set(),
    example: new Set(),
    case: new Set(),
    piece: new Set(),
  };

  for (const sample of samples) {
    const isPlaySample = sample.file.startsWith('samples/graphics/') || sample.file.startsWith('samples/games/');
    const slug = allocateSlug(usedByCat.sample, sample.id);
    items.push({
      id: `sample/${slug}`,
      slug,
      category: 'sample',
      badge: isPlaySample ? 'Play' : 'Sample',
      title: sample.title,
      file: sample.file,
      source: readFileSync(join(rootDir, sample.file), 'utf8'),
      stdin: sample.stdin,
      args: sample.args,
      sampleId: sample.id,
    });
  }

  for (const relPath of [
    ...walkLtsFiles(join(rootDir, 'language', 'examples'), 'language/examples'),
    ...walkLtsFiles(join(rootDir, 'language', 'showcases'), 'language/showcases'),
  ]) {
    if (relPath.includes('/helpers/')) continue;
    const base = posix.basename(relPath, '.lts');
    const preferred = relPath.startsWith('language/showcases/') ? `showcase-${base}` : base;
    const slug = allocateSlug(usedByCat.example, preferred);
    const src = readFileSync(join(rootDir, relPath), 'utf8');
    const extraModules = collectRelativeModules(rootDir, relPath, src);
    const environment = detectSourceEnvironment(src);
    items.push({
      id: `example/${slug}`,
      slug,
      category: 'example',
      badge: relPath.startsWith('language/showcases/') ? 'Showcase' : 'Example',
      title: slugToTitle(relPath),
      file: relPath,
      source: src,
      stdin: '',
      args: [],
      ...(environment !== 'universal' ? { environment } : {}),
      ...(extraModules !== undefined ? { extraModules } : {}),
    });
  }

  for (const relPath of walkLtsFiles(join(rootDir, 'language', 'cases'), 'language/cases')) {
    const slug = allocateSlug(usedByCat.case, posix.basename(relPath, '.lts'));
    const src = readFileSync(join(rootDir, relPath), 'utf8');
    items.push({
      id: `case/${slug}`,
      slug,
      category: 'case',
      badge: posix.basename(relPath).startsWith('reject-') ? 'Reject Case' : 'Case',
      title: slugToTitle(relPath),
      file: relPath,
      source: src,
      stdin: '',
      args: [],
    });
  }

  const learnCatalogPath = join(rootDir, 'language', 'learn', 'catalog.json');
  if (existsSync(learnCatalogPath)) {
    const learnCatalog = JSON.parse(readFileSync(learnCatalogPath, 'utf8')) as LearnCatalog;
    for (const track of [...learnCatalog.tracks].sort((a, b) => a.order - b.order)) {
      for (const lesson of track.lessons) {
        const slug = allocateSlug(usedByCat.piece, lesson.slug);
        const src = readFileSync(join(rootDir, lesson.sourceFile), 'utf8');
        const extraModules = collectRelativeModules(rootDir, lesson.sourceFile, src);
        items.push({
          id: `piece/${slug}`,
          slug,
          category: 'piece',
          badge: lesson.kind === 'tutorial' ? 'Tutorial' : 'Lesson',
          title: lesson.title,
          file: lesson.sourceFile,
          source: src,
          stdin: lesson.stdin,
          args: lesson.args,
          ...(lesson.environment !== 'universal' ? { environment: lesson.environment } : {}),
          ...(extraModules !== undefined ? { extraModules } : {}),
        });
      }
    }
  }

  const gymCatalogPath = join(rootDir, 'language', 'gym', 'catalog.json');
  if (existsSync(gymCatalogPath)) {
    const gymCatalog = JSON.parse(readFileSync(join(rootDir, 'language', 'gym', 'catalog.json'), 'utf8')) as GymCatalog;
    for (const ex of gymCatalog.exercises) {
      const firstCase = ex.visibleCases[0];
      const slug = allocateSlug(usedByCat.piece, `gym-${ex.slug}`);
      items.push({
        id: `piece/${slug}`,
        slug,
        category: 'piece',
        badge: ex.mode === 'drill' ? 'Drill' : 'Workout',
        title: `${ex.title} (Starter)`,
        file: ex.starterFile,
        source: readFileSync(join(rootDir, ex.starterFile), 'utf8'),
        stdin: firstCase?.stdin ?? '',
        args: firstCase?.args ?? [],
      });
    }
  }

  items.push(...extractHandbookPieces(rootDir, usedByCat.piece));
  return items;
}
