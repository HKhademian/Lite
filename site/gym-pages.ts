/** Generates `/gym/` interactive coding dojo index, drill/workout pages, and grading payloads via `tools/src/site-gym.lts`. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { spawnTool, type CompilerBuild } from '../igniter/artifacts.ts';
import { renderDocuments, type ModuleApiDoc, type RenderedDocument } from './docs-client.ts';
import { renderPage, rootDir, type SourceRevision } from './chrome.ts';
import { buildDocOutMap, postprocessMarkdownHtml } from './docs-pages.ts';
import type { ShowcaseSample } from './groups.ts';
import { type GymCatalog, type GymExerciseSpec, verifyGymCorpus } from './gym-verify.ts';
import { escapeHtml, highlightLite } from './highlight.ts';
import type { LearnCatalog } from './learn-pages.ts';
import { renderAcademyCrosslinks, type LiteAcademyGraph } from './lite-uri.ts';
import type { PlaySample } from './play-samples.ts';
import type { SearchEntry } from './search.ts';
import { renderCodeEditorBlock, renderCodeModeBar, renderSplitHandle } from './ui-blocks.ts';

export type GymBuildOutput = Readonly<{
  files: ReadonlyMap<string, string>;
  searchEntries: readonly SearchEntry[];
  exerciseCount: number;
  drillCount: number;
  kataCount: number;
}>;

type RelatedTarget = Readonly<{
  label: string;
  href: string;
}>;

function exerciseOutPath(ex: GymExerciseSpec): string {
  const folder = ex.mode === 'drill' ? 'drills' : 'workouts';
  return `gym/${folder}/${ex.slug}.html`;
}

function relativeHref(fromOutPath: string, toOutPath: string): string {
  const rel = posix.relative(posix.dirname(fromOutPath), toOutPath);
  return rel === '' ? posix.basename(toOutPath) : rel;
}

function extractHeadingLabel(docPath: string): string {
  if (docPath.startsWith('lib/') && docPath.endsWith('.lts')) {
    return `Module: ${docPath.slice(4, -4)}`;
  }
  const abs = join(rootDir, docPath);
  if (existsSync(abs) && docPath.endsWith('.md')) {
    const raw = readFileSync(abs, 'utf8');
    const heading = /^#\s+(.+)$/m.exec(raw);
    if (heading?.[1]) return heading[1].trim();
  }
  return posix.basename(docPath, posix.extname(docPath));
}

/** Builds `/gym/` index, interactive drill/workout dojo pages, payloads, and search entries. */
export function buildGymSection(options: Readonly<{
  tsCompiler: CompilerBuild;
  modules: readonly ModuleApiDoc[];
  showcaseSamples: readonly ShowcaseSample[];
  playSamples: readonly PlaySample[];
  repoUrl: string;
  rev: SourceRevision;
  lightSwitchShine: boolean;
  graph?: LiteAcademyGraph;
}>): GymBuildOutput {
  const { tsCompiler, modules, showcaseSamples, playSamples, repoUrl, rev, lightSwitchShine, graph } = options;
  const verified = verifyGymCorpus(tsCompiler);
  const catalog = JSON.parse(readFileSync(join(rootDir, 'language', 'gym', 'catalog.json'), 'utf8')) as GymCatalog;
  const learnCatalog = JSON.parse(readFileSync(join(rootDir, 'language', 'learn', 'catalog.json'), 'utf8')) as LearnCatalog;

  const docOutBySource = new Map<string, string>(buildDocOutMap({ modulesBase: modules }));
  const learnById = new Map<string, Readonly<{ title: string; outPath: string }>>();
  for (const track of learnCatalog.tracks) {
    for (const lesson of track.lessons) {
      const out = `learn/${track.id}/${lesson.slug}.html`;
      docOutBySource.set(lesson.guideFile, out);
      learnById.set(lesson.id, { title: lesson.title, outPath: out });
    }
  }
  for (const ex of catalog.exercises) {
    docOutBySource.set(ex.promptFile, exerciseOutPath(ex));
  }

  const samplesByFile = new Map<string, string>();
  for (const s of [...showcaseSamples, ...playSamples]) {
    if (!samplesByFile.has(s.file)) samplesByFile.set(s.file, s.id);
  }

  const renderedPrompts = renderDocuments(catalog.exercises.map((e) => e.promptFile), rootDir);
  const promptByPath = new Map<string, RenderedDocument>(renderedPrompts.map((d) => [d.path, d]));

  const itemsPayload = catalog.exercises.map((ex) => {
    const outPath = exerciseOutPath(ex);
    const rendered = promptByPath.get(ex.promptFile);
    if (rendered === undefined) {
      throw new Error(`missing rendered gym prompt ${ex.promptFile}`);
    }
    const fromUri = `lite://gym/${ex.slug}`;
    const promptHtml = postprocessMarkdownHtml({
      rawHtml: rendered.html,
      sourcePath: ex.promptFile,
      outPath,
      docOutBySource,
      samplesByFile,
      snippets: new Map(),
      repoUrl,
      highlightUnmarkedAsLite: true,
      ...(graph !== undefined ? { graph, fromUri } : {}),
    });
    const compiled = verified.compiledSolutions.get(ex.id);
    if (compiled === undefined) {
      throw new Error(`missing verified compilation for gym exercise ${ex.id}`);
    }

    const relatedLinks: RelatedTarget[] = [];
    for (const docPath of ex.relatedDocs) {
      const targetOut = docOutBySource.get(docPath);
      if (targetOut === undefined) {
        throw new Error(`gym exercise ${ex.id} references unmapped doc ${docPath}`);
      }
      relatedLinks.push({
        label: extractHeadingLabel(docPath),
        href: relativeHref(outPath, targetOut),
      });
    }
    for (const lessonId of ex.relatedLessons) {
      const lessonMeta = learnById.get(lessonId);
      if (lessonMeta === undefined) {
        throw new Error(`gym exercise ${ex.id} references unknown lesson ${lessonId}`);
      }
      relatedLinks.push({
        label: `Lesson: ${lessonMeta.title}`,
        href: relativeHref(outPath, lessonMeta.outPath),
      });
    }

    const graphRelatedHtml = graph
      ? renderAcademyCrosslinks({
          heading: 'Related Handbook, Lessons & Modules',
          fromOutPath: outPath,
          buckets: graph.getRelatedBuckets(fromUri),
          wrapperClass: 'docs-crosslinks',
          sections: [
            { kind: 'handbook', label: 'Handbook', limit: 6 },
            { kind: 'learn', label: 'Learn', badgeKind: 'lesson', limit: 6 },
            { kind: 'module', label: 'Module', limit: 8 },
            { kind: 'doc', label: 'Design Spec', limit: 4 },
          ],
        })
      : '';
    const relatedHtml = graphRelatedHtml || (relatedLinks.length > 0
      ? `<section class="docs-crosslinks gym-related">
  <h2>Related Docs &amp; Lessons</h2>
  <ul>
    ${relatedLinks.map((r) => `<li><a href="${escapeHtml(r.href)}">${escapeHtml(r.label)}</a></li>`).join('\n    ')}
  </ul>
</section>`
      : '');

    const starterClean = compiled.starterSource.trimEnd();
    const solutionClean = compiled.solutionSource.trimEnd();
    const builtinPlayHref = graph
      ? graph.resolveUri(`lite://play/piece/gym-${ex.slug}`, outPath).href
      : `../../playground/?piece=${encodeURIComponent(`gym-${ex.slug}`)}`;

    return {
      id: ex.id,
      slug: ex.slug,
      title: ex.title,
      mode: ex.mode,
      belt: ex.belt,
      domain: ex.domain,
      subGroup: ex.subGroup,
      outPath,
      promptHtml,
      starterSource: compiled.starterSource,
      starterClean,
      solutionSource: compiled.solutionSource,
      solutionHtml: highlightLite(solutionClean),
      builtinPlayHref,
      relatedHtml,
      editorBlockHtml: renderCodeEditorBlock({
        textareaId: 'gym-editor',
        ariaLabel: 'Lite solution code editor',
        preId: 'gym-editor-pre',
        gutterId: 'gym-editor-gutter',
        minHeight: '290px',
        initialSource: starterClean,
        initialHtml: highlightLite(starterClean),
      }),
      splitHandleHtml: renderSplitHandle({
        id: 'gym-split',
        ariaLabel: 'Resize prompt and editor panes',
        initialPct: 49,
      }),
      codeModeBarHtml: renderCodeModeBar({ id: 'gym-code-modes' }),
      hints: ex.hints,
      visibleCases: ex.visibleCases,
      hiddenCases: ex.hiddenCases,
    };
  });

  const result = spawnTool('site-gym', [], {
    cwd: rootDir,
    input: JSON.stringify({ description: catalog.description, items: itemsPayload }),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite site-gym failed (${result.status ?? result.signal}): ${result.stderr}`);
  }

  const payload = JSON.parse(result.stdout) as {
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
        active: 'gym',
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
    exerciseCount: verified.exerciseCount,
    drillCount: verified.drillCount,
    kataCount: verified.kataCount,
  };
}
