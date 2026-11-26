/** Generates `/learn/` interactive ability curriculum, project tutorials, and live lesson runner pages via `tools/src/site-learn.lts`. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { compileBuiltCompiler, spawnTool, type CompilerBuild } from '../igniter/artifacts.ts';
import { renderDocuments, type ModuleApiDoc, type RenderedDocument } from './docs-client.ts';
import { captureCanvasPreview } from './canvas-preview.ts';
import { renderPage, rootDir, type SourceRevision } from './chrome.ts';
import { buildDocOutMap, postprocessMarkdownHtml } from './docs-pages.ts';
import type { ShowcaseSample } from './groups.ts';
import { highlightLite } from './highlight.ts';
import { renderAcademyCrosslinks, type LiteAcademyGraph } from './lite-uri.ts';
import { appendPlayKeepalive, stripPlayKeepaliveTs } from './play-keepalive.ts';
import type { PlaySample } from './play-samples.ts';
import type { SearchEntry } from './search.ts';
import { renderCodeEditorBlock, renderCodeModeBar, renderSplitHandle } from './ui-blocks.ts';

export type LearnHelperModule = Readonly<{
  spec: string;
  file: string;
}>;

export type LearnLessonSpec = Readonly<{
  id: string;
  slug: string;
  title: string;
  kind: 'lesson' | 'tutorial';
  domain: string;
  subGroup: string;
  environment: 'universal' | 'play' | 'cli';
  guideFile: string;
  sourceFile: string;
  helperModules: readonly LearnHelperModule[];
  stdin: string;
  args: readonly string[];
  teaches: readonly string[];
  docs: readonly string[];
}>;

export type LearnTrackSpec = Readonly<{
  id: string;
  order: number;
  title: string;
  summary: string;
  lessons: readonly LearnLessonSpec[];
}>;

export type LearnCatalog = Readonly<{
  schemaVersion: number;
  title: string;
  description: string;
  tracks: readonly LearnTrackSpec[];
}>;

export type LearnBuildOutput = Readonly<{
  files: ReadonlyMap<string, string>;
  searchEntries: readonly SearchEntry[];
  lessonCount: number;
  tutorialCount: number;
}>;

function compileAndRunLessonSource(
  lesson: LearnLessonSpec,
  tsCompiler: CompilerBuild,
): Readonly<{
  source: string;
  generatedTs: string;
  output: string;
  previewSvg?: string;
  extraModules: Readonly<Record<string, Readonly<{ path: string; display: string; identity: string; text: string }>>>;
}> {
  const fullPath = resolve(rootDir, lesson.sourceFile);
  const source = readFileSync(fullPath, 'utf8');
  let cacheFile: string | undefined;
  if (process.env['LITE_SITE_NO_CACHE'] !== '1') {
    const hasher = createHash('sha256')
      .update('site-learn-v1\0')
      .update(tsCompiler.artifactSha256)
      .update('\0')
      .update(lesson.sourceFile)
      .update('\0')
      .update(lesson.title)
      .update('\0')
      .update(source)
      .update('\0')
      .update(lesson.stdin)
      .update('\0')
      .update(JSON.stringify(lesson.args));
    for (const hm of lesson.helperModules) {
      hasher.update('\0').update(hm.spec).update('\0').update(hm.file).update('\0').update(readFileSync(resolve(rootDir, hm.file), 'utf8'));
    }
    cacheFile = join(rootDir, 'dist', 'cache', 'site-learn', `${hasher.digest('hex')}.json`);
    if (existsSync(cacheFile)) {
      try {
        return JSON.parse(readFileSync(cacheFile, 'utf8'));
      } catch {
        /* ignore corrupt cache entry and rebuild */
      }
    }
  }
  const keepalive = appendPlayKeepalive(source);
  let compiled = compileBuiltCompiler(tsCompiler, {
    text: keepalive ?? source,
    name: lesson.sourceFile,
    cwd: rootDir,
  });
  let generatedTs: string;
  if (keepalive !== null && compiled.status === 0) {
    generatedTs = stripPlayKeepaliveTs(compiled.stdout.toString('utf8'));
  } else {
    if (keepalive !== null) {
      compiled = compileBuiltCompiler(tsCompiler, { text: source, name: lesson.sourceFile, cwd: rootDir });
    }
    if (compiled.status !== 0) {
      throw new Error(`failed to compile learn source ${lesson.sourceFile}:\n${compiled.stderr.toString('utf8')}`);
    }
    generatedTs = compiled.stdout.toString('utf8');
  }

  const extraModules: Record<string, Readonly<{ path: string; display: string; identity: string; text: string }>> = {};
  for (const hm of lesson.helperModules) {
    const helperText = readFileSync(resolve(rootDir, hm.file), 'utf8');
    extraModules[hm.spec] = {
      path: hm.file,
      display: hm.file,
      identity: '',
      text: helperText,
    };
  }

  const scratch = mkdtempSync(join(tmpdir(), 'lite-learn-sample-'));
  let output = '';
  try {
    const artifact = join(scratch, 'lesson.ts');
    const runner = join(scratch, 'runner.ts');
    writeFileSync(artifact, generatedTs);
    writeFileSync(runner, [
      "import { writeSync } from 'node:fs';",
      "import { main } from './lesson.ts';",
      'process.argv = [process.execPath, process.argv[1]!, ...process.argv.slice(2)];',
      "const out = main((text: string): void => { writeSync(1, text); });",
      "if (typeof out === 'string' && out.length > 0) writeSync(1, out);",
    ].join('\n') + '\n');
    const run = spawnSync(process.execPath, [runner, ...lesson.args], {
      cwd: rootDir,
      input: lesson.stdin,
      encoding: 'utf8',
      timeout: 30_000,
    });
    if (run.error !== undefined) throw run.error;
    if (run.status !== 0) {
      throw new Error(`learn source ${lesson.sourceFile} exited ${String(run.status)}:\n${run.stderr}`);
    }
    output = run.stdout;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  const previewSvg = captureCanvasPreview(generatedTs, lesson.title);
  const result = {
    source,
    generatedTs,
    output,
    ...(previewSvg !== undefined ? { previewSvg } : {}),
    extraModules,
  };
  if (cacheFile !== undefined) {
    mkdirSync(dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(result));
  }
  return result;
}

/** Builds `/learn/` index, 23 lesson/tutorial pages, JSON payloads, and search entries. */
export function buildLearnSection(options: Readonly<{
  tsCompiler: CompilerBuild;
  modules: readonly ModuleApiDoc[];
  showcaseSamples: readonly ShowcaseSample[];
  playSamples: readonly PlaySample[];
  repoUrl: string;
  rev: SourceRevision;
  lightSwitchShine: boolean;
  graph?: LiteAcademyGraph;
}>): LearnBuildOutput {
  const { tsCompiler, modules, showcaseSamples, playSamples, repoUrl, rev, lightSwitchShine, graph } = options;
  const catalogPath = join(rootDir, 'language', 'learn', 'catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as LearnCatalog;

  const docOutBySource = new Map<string, string>(buildDocOutMap({ modulesBase: modules }));
  for (const track of catalog.tracks) {
    for (const lesson of track.lessons) {
      docOutBySource.set(lesson.guideFile, `learn/${track.id}/${lesson.slug}.html`);
    }
  }
  const samplesByFile = new Map<string, string>();
  for (const s of [...showcaseSamples, ...playSamples]) {
    samplesByFile.set(s.file, s.id);
  }

  const sortedTracks = [...catalog.tracks].sort((a, b) => a.order - b.order);
  const allLessons: readonly { track: LearnTrackSpec; lesson: LearnLessonSpec }[] = sortedTracks
    .flatMap((track) => track.lessons.map((lesson) => ({ track, lesson })));

  const renderedGuides = renderDocuments(allLessons.map((item) => item.lesson.guideFile), rootDir);
  const guideByPath = new Map<string, RenderedDocument>(renderedGuides.map((d) => [d.path, d]));

  const itemsPayload = allLessons.map(({ track, lesson }) => {
    const outPath = `learn/${track.id}/${lesson.slug}.html`;
    const rendered = guideByPath.get(lesson.guideFile);
    if (rendered === undefined) {
      throw new Error(`missing rendered learn guide ${lesson.guideFile}`);
    }
    const fromUri = `lite://learn/${lesson.slug}`;
    const guideHtml = postprocessMarkdownHtml({
      rawHtml: rendered.html,
      sourcePath: lesson.guideFile,
      outPath,
      docOutBySource,
      samplesByFile,
      snippets: new Map(),
      repoUrl,
      ...(graph !== undefined ? { graph, fromUri } : {}),
    });
    const compiled = compileAndRunLessonSource(lesson, tsCompiler);
    const sourceHtml = highlightLite(compiled.source.trimEnd());
    const builtinPlayHref = graph
      ? graph.resolveUri(`lite://play/piece/${lesson.slug}`, outPath).href
      : `../../playground/?piece=${encodeURIComponent(lesson.slug)}`;
    const relatedHtml = graph
      ? renderAcademyCrosslinks({
          heading: 'Continue Practicing & References',
          fromOutPath: outPath,
          buckets: graph.getRelatedBuckets(fromUri),
          wrapperClass: 'docs-crosslinks',
          sections: [
            { kind: 'gym', label: 'Lite Gym', badgeKind: 'gym', limit: 8 },
            { kind: 'handbook', label: 'Handbook', limit: 6 },
            { kind: 'module', label: 'Module', limit: 8 },
            { kind: 'play', label: 'Play', limit: 4 },
            { kind: 'doc', label: 'Docs', limit: 4 },
          ],
        })
      : '';
    return {
      id: lesson.id,
      slug: lesson.slug,
      trackId: track.id,
      trackTitle: track.title,
      title: lesson.title,
      kind: lesson.kind,
      environment: lesson.environment,
      sourceFile: lesson.sourceFile,
      outPath,
      guideHtml,
      source: compiled.source,
      sourceHtml,
      generatedTs: compiled.generatedTs,
      output: compiled.output,
      previewSvg: compiled.previewSvg ?? '',
      builtinPlayHref,
      relatedHtml,
      editorBlockHtml: renderCodeEditorBlock({
        textareaId: 'ln-editor',
        ariaLabel: 'Lite lesson source editor',
        preId: 'ln-editor-pre',
        gutterId: 'ln-editor-gutter',
        minHeight: '290px',
        initialSource: compiled.source,
        initialHtml: sourceHtml,
      }),
      splitHandleHtml: renderSplitHandle({
        id: 'ln-split',
        ariaLabel: 'Resize guide and runner panes',
        initialPct: 50,
      }),
      codeModeBarHtml: renderCodeModeBar({ id: 'ln-code-modes', buttonIdPrefix: 'ln-mode-' }),
      stdin: lesson.stdin,
      stdinDisplay: lesson.stdin.replace(/\n/g, '\\n'),
      args: lesson.args,
      argsDisplay: lesson.args.join(' '),
      helperSpecs: lesson.helperModules.map((h) => h.spec),
      teaches: lesson.teaches,
      extraModules: compiled.extraModules,
    };
  });

  const tracksPayload = sortedTracks.map((track) => ({
    id: track.id,
    title: track.title,
    summary: track.summary,
    lessonIds: track.lessons.map((l) => l.id),
  }));

  const result = spawnTool('site-learn', [], {
    cwd: rootDir,
    input: JSON.stringify({ repoUrl, tracks: tracksPayload, items: itemsPayload }),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite site-learn failed (${result.status ?? result.signal}): ${result.stderr}`);
  }

  const payload = JSON.parse(result.stdout) as {
    lessonCount: number;
    tutorialCount: number;
    pages: Array<{ relPath: string; title: string; description: string; basePath: string; mainClass: string; body: string }>;
    payloads: Array<{ relPath: string; content: string }>;
    searchEntries: SearchEntry[];
  };

  const files = new Map<string, string>();
  for (const page of payload.pages) {
    files.set(
      page.relPath,
      renderPage({
        title: page.title,
        description: page.description,
        basePath: page.basePath,
        active: 'learn',
        ...(page.mainClass !== '' ? { mainClass: page.mainClass } : {}),
        repoUrl,
        rev,
        body: page.body,
        lightSwitchShine,
      }),
    );
  }
  for (const p of payload.payloads) {
    files.set(p.relPath, p.content);
  }

  return {
    files,
    searchEntries: payload.searchEntries,
    lessonCount: payload.lessonCount,
    tutorialCount: payload.tutorialCount,
  };
}
