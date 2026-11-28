/** Host adapter collecting Playground library items via the ignited Lite tool (`tools/src/site-library.lts`). */
import { spawnTool } from '../igniter/artifacts.ts';
import type { ShowcaseSample } from './groups.ts';
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
  tags: readonly string[];
  environment?: 'universal' | 'play' | 'cli';
  extraModules?: Readonly<Record<string, PlaygroundExtraModule>>;
  sampleId?: string;
}>;

const FOLDER_STOPWORDS = new Set([
  'samples', 'language', 'examples', 'showcases', 'cases', 'pieces', 'docs', 'learn', 'gym', 'core', 'extra',
]);

/** Derives concise searchable topic tags for a Playground library item from its APIs, I/O, and path. */
export function deriveLibraryTags(
  item: Omit<PlaygroundLibraryItem, 'tags'>,
  extraKeywords?: readonly string[],
): readonly string[] {
  const tags = new Set<string>();
  const src = item.source ?? '';
  const fileLower = (item.file ?? '').toLowerCase();
  const titleLower = (item.title ?? '').toLowerCase();
  const badgeLower = (item.badge ?? '').toLowerCase();

  if (extraKeywords) {
    for (const kw of extraKeywords) {
      const clean = kw.trim().toLowerCase();
      if (clean) tags.add(clean);
    }
  }

  if (/import\s+"gfx\/canvas"/.test(src) || /\bcanvas\.(create|play|clear|fillRect|setPixel)\b/.test(src)) tags.add('canvas');
  if (/import\s+"gfx\/surface"/.test(src) || /\bSurface\.open\b/.test(src)) {
    tags.add('surface');
    tags.add('play');
  }
  if (/import\s+"media\/audio"/.test(src) || /\baudio\.(tone|playNote)\b/.test(src)) tags.add('audio');
  if (/import\s+"gfx\/board"/.test(src) || /\bboard\./.test(src)) tags.add('board');
  if (/import\s+"gfx\/color"/.test(src)) tags.add('color');
  if (/import\s+"gfx\/(camera|scene)"/.test(src)) {
    tags.add('3d');
    tags.add('graphics');
  }
  if (/import\s+"ui\/im"/.test(src)) tags.add('ui');
  if (
    item.environment === 'play' ||
    /\bcanvas\.play\s*\(/.test(src) ||
    /\bonCanvasUpdate\b/.test(src) ||
    fileLower.includes('/play/')
  ) {
    tags.add('play');
  }
  if (
    fileLower.includes('/games/') ||
    /\b(game|snake|pong|tetris|breakout|flappy|minesweeper|sokoban|maze|arcade|invaders|shooter|platformer)\b/.test(titleLower + ' ' + fileLower + ' ' + badgeLower)
  ) {
    tags.add('game');
  }
  if (
    item.stdin.length > 0 ||
    /\bio\.input(Line|Int|Text)\b/.test(src) ||
    /\bio\.stdinReader\b/.test(src)
  ) {
    tags.add('input');
  }
  if (
    item.args.length > 0 ||
    /\bio\.inputArgs\b/.test(src) ||
    /\bprocess\.args\b/.test(src)
  ) {
    tags.add('args');
  }
  if (/\bio\.output(Line)?\b/.test(src) || /\bio\.stdoutWriter\b/.test(src)) {
    tags.add('output');
  }
  if (/import\s+"core\/(file|path)"/.test(src)) tags.add('file');
  if (item.environment === 'cli' || /import\s+"core\/process"/.test(src)) tags.add('cli');
  if (/import\s+"math\/(scalar|vector|matrix|geom|transform)"/.test(src)) tags.add('math');
  if (/import\s+"math\/random"/.test(src)) tags.add('random');
  if (/import\s+"core\/crypto"/.test(src)) tags.add('crypto');
  if (/import\s+"type\/string"/.test(src) || /import\s+"core\/text-builder"/.test(src)) tags.add('text');
  if (/import\s+"type\/string"/.test(src)) {
    tags.add('char');
    tags.add('character');
  }
  if (
    /import\s+"type\/string"/.test(src) ||
    /\b(unicode|utf-?8)\b/.test(titleLower + ' ' + fileLower) ||
    /\b(utf8Encode|fromUtf8Strict|fromUtf8Lossy|utf8DecodeStrict|utf16Encode|fromUtf16Strict|isValidUtf8|toCodePoints|fromCodePoints|fromCodePoint|codePointAt)\b/.test(src)
  ) {
    tags.add('unicode');
    tags.add('utf8');
    tags.add('char');
    tags.add('character');
  }

  const addScriptMeta = (scriptTags: readonly string[]): void => {
    for (const t of scriptTags) tags.add(t);
    tags.add('language');
    tags.add('script');
    tags.add('unicode');
    tags.add('utf8');
    tags.add('char');
    tags.add('character');
  };
  if (/\p{Script=Arabic}/u.test(src) || /\bpersian\b/.test(titleLower)) addScriptMeta(['persian']);
  if (/\p{Script=Han}/u.test(src) || /\bchinese\b/.test(titleLower)) addScriptMeta(['chinese']);
  if (/\p{Script=Greek}/u.test(src) || /\bgreek\b/.test(titleLower)) addScriptMeta(['greek']);
  if (/\p{Script=Cyrillic}/u.test(src) || /\b(russian|cyrillic)\b/.test(titleLower)) addScriptMeta(['russian', 'cyrillic']);
  if (/\p{Script=Armenian}/u.test(src) || /\barmenian\b/.test(titleLower)) addScriptMeta(['armenian']);
  if (/\p{Script=Georgian}/u.test(src) || /\bgeorgian\b/.test(titleLower)) addScriptMeta(['georgian']);

  if (/import\s+"(core\/(list|map|set)|extra\/(deque|heap|ring|grid|pool|arena|lru|bitset|sparse))"/.test(src)) tags.add('collections');
  if (/\bloop\b/.test(src)) tags.add('loops');
  if (item.extraModules && Object.keys(item.extraModules).length > 0) tags.add('modules');

  const pathSegs = fileLower.split('/').slice(0, -1);
  for (const seg of pathSegs) {
    const clean = seg.replace(/[^a-z0-9-]/g, '');
    if (clean.length >= 3 && !FOLDER_STOPWORDS.has(clean)) {
      tags.add(clean === 'games' ? 'game' : clean);
    }
  }

  return Array.from(tags).sort();
}

/** Collects Samples, Examples, Cases, and Pieces for Playground's unified Open explorer. */
export function collectPlaygroundLibrary(options: Readonly<{
  rootDir: string;
  samples: readonly (ShowcaseSample | PlaySample)[];
}>): readonly PlaygroundLibraryItem[] {
  const keywordsBySampleId = new Map<string, readonly string[]>();
  for (const sample of options.samples) {
    if ('keywords' in sample && sample.keywords && sample.keywords.length > 0) {
      keywordsBySampleId.set(sample.id, sample.keywords);
    }
  }
  const result = spawnTool('site-library', [options.rootDir], {
    cwd: options.rootDir,
    input: JSON.stringify(options.samples),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite site-library failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  const rawItems = JSON.parse(result.stdout) as Omit<PlaygroundLibraryItem, 'tags'>[];
  return rawItems.map((item) => ({
    ...item,
    tags: deriveLibraryTags(item, item.sampleId ? keywordsBySampleId.get(item.sampleId) : undefined),
  }));
}
