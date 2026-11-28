#!/usr/bin/env node
/** Build the static public showcase site and playground into dist/site/. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { buildCCompiler, buildTsCompiler, compileBuiltCompiler, spawnTool, type CompilerBuild } from '../igniter/artifacts.ts';
import { academyClientJs } from './academy-state.ts';
import { extractModules } from './docs-client.ts';
import {
  brandWordmark,
  proseLite,
  readRepositoryUrl,
  readSourceRevision,
  renderPage,
} from './chrome.ts';
import { captureCanvasPreview } from './canvas-preview.ts';
import { buildDocsSection, discoverDocsPayload } from './docs-pages.ts';
import { heroSample, playgroundDefaultSample, sampleGroups, showcaseSamples, type ShowcaseSample } from './groups.ts';
import { highlightLite, highlightTs } from './highlight.ts';
import { buildGymSection } from './gym-pages.ts';
import type { GymCatalog } from './gym-verify.ts';
import { buildLearnSection, type LearnCatalog } from './learn-pages.ts';
import { buildLiteAcademyGraph, collectHtmlIds, validateBuiltSiteReferences } from './lite-uri.ts';
import { buildModulesSection } from './modules-pages.ts';
import { playGroups, playSamples, type PlaySample } from './play-samples.ts';
import { appendPlayKeepalive, stripPlayKeepaliveTs } from './play-keepalive.ts';
import { renderPlaygroundClientScript } from './playground-client.ts';
import { collectPlaygroundLibrary } from './playground-library.ts';
import { coiServiceWorkerJs, playgroundWorkerJs } from './playground-worker.ts';
import { renderCodeEditorBlock, renderGeneratedToolbar } from './ui-blocks.ts';
import { searchClientJs, type SearchEntry } from './search.ts';
import { snipsClientJs } from './snips.ts';
import { siteCss } from './styles.ts';
import { buildToolsSection } from './tools-page.ts';

type AnySample = ShowcaseSample | PlaySample;

type RenderedSample = AnySample & Readonly<{
  source: string;
  sourceHtml: string;
  generatedTs: string;
  tsHtml: string;
  output: string;
  previewSvg?: string;
  badge?: string;
}>;

export type BuildSiteOptions = Readonly<{
  lightSwitchShine?: boolean;
  tsCompiler?: CompilerBuild;
  verbose?: boolean;
}>;

const root = dirname(import.meta.dirname);
const outputDir = join(root, 'dist', 'site');

function coreModuleIdentity(relPath: string): string {
  switch (relPath) {
    case 'lib/core/io.lt': return 'lite.core.io.v1';
    case 'lib/core/int.lt': return 'lite.core.int.v1';
    case 'lib/core/list.lt': return 'lite.core.list.v1';
    case 'lib/core/map.lt': return 'lite.core.map.v1';
    case 'lib/core/set.lt': return 'lite.core.set.v1';
    case 'lib/core/text.lt': return 'lite.core.text.v1';
    case 'lib/core/file.lt': return 'lite.core.file.v1';
    case 'lib/core/process.lt': return 'lite.core.process.v1';
    case 'lib/core/crypto.lt': return 'lite.core.crypto.v1';
    case 'lib/core/time.lt': return 'lite.core.time.v1';
    case 'lib/gfx/surface.lt': return 'lite.gfx.surface.v1';
    default: return '';
  }
}

function computeSampleCacheSalt(tsCompiler: CompilerBuild): string {
  const h = createHash('sha256');
  h.update('v1\0');
  h.update(readFileSync(tsCompiler.path));
  for (const rel of ['site/play-keepalive.ts', 'site/canvas-preview.ts', 'lib/gfx/canvas.lt', 'lib/gfx/board.lt', 'lib/gfx/surface.lt', 'lib/gfx/color.lt', 'lib/media/audio.lt', 'lib/core/timer.lt', 'lib/math/scalar.lt', 'lib/math/random.lt', 'lib/ds/pool.lt', 'lib/ds/arena.lt', 'lib/ds/sparse.lt']) {
    const p = resolve(root, rel);
    if (existsSync(p)) { h.update('\0' + rel + '\0'); h.update(readFileSync(p)); }
  }
  return h.digest('hex').slice(0, 24);
}

function compileAndRunSample(sample: AnySample, tsCompiler: CompilerBuild, badge?: string, cacheSalt?: string): Readonly<{ sample: RenderedSample; cached: boolean }> {
  const fullPath = resolve(root, sample.file);
  const source = readFileSync(fullPath, 'utf8');
  let cacheFile: string | undefined;
  if (cacheSalt !== undefined && process.env['LITE_SITE_NO_CACHE'] !== '1') {
    const key = createHash('sha256')
      .update(cacheSalt)
      .update('\0').update(sample.id)
      .update('\0').update(sample.file)
      .update('\0').update(source)
      .update('\0').update(JSON.stringify(sample.args))
      .update('\0').update(sample.stdin)
      .update('\0').update(badge ?? '')
      .digest('hex').slice(0, 32);
    const cacheDir = join(root, 'dist', 'cache', 'site-samples');
    cacheFile = join(cacheDir, `${key}.json`);
    if (existsSync(cacheFile)) {
      try {
        return { sample: JSON.parse(readFileSync(cacheFile, 'utf8')) as RenderedSample, cached: true };
      } catch {
        /* ignore corrupt cache entry and rebuild */
      }
    }
  }
  const keepaliveSource = appendPlayKeepalive(source);
  let compiled = compileBuiltCompiler(tsCompiler, {
    text: keepaliveSource ?? source,
    name: sample.file,
    cwd: root,
  });
  let generatedTs: string;
  if (keepaliveSource !== null && compiled.status === 0) {
    generatedTs = stripPlayKeepaliveTs(compiled.stdout.toString('utf8'));
  } else {
    if (keepaliveSource !== null) {
      compiled = compileBuiltCompiler(tsCompiler, { text: source, name: sample.file, cwd: root });
    }
    if (compiled.status !== 0) {
      throw new Error(`failed to compile ${sample.file}:\n${compiled.stderr.toString('utf8')}`);
    }
    generatedTs = compiled.stdout.toString('utf8');
  }

  const scratch = mkdtempSync(join(tmpdir(), 'lite-site-sample-'));
  try {
    const artifact = join(scratch, 'sample.ts');
    const runner = join(scratch, 'runner.ts');
    writeFileSync(artifact, generatedTs);
    writeFileSync(runner, [
      "import { writeSync } from 'node:fs';",
      "import { main } from './sample.ts';",
      'process.argv = [process.execPath, process.argv[1]!, ...process.argv.slice(2)];',
      "const out = main((text: string): void => { writeSync(1, text); });",
      "if (typeof out === 'string' && out.length > 0) writeSync(1, out);",
    ].join('\n') + '\n');
    const run = spawnSync(process.execPath, [runner, ...sample.args], {
      cwd: root,
      input: sample.stdin,
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, LITE_CANVAS_HEADLESS: '1' },
    });
    if (run.error !== undefined) throw run.error;
    if (run.status !== 0) {
      throw new Error(`failed to run ${sample.file} (exit ${String(run.status)}):\n${run.stderr}`);
    }
    const previewSvg = captureCanvasPreview(generatedTs, sample.title);
    const renderedSample: RenderedSample = {
      ...sample,
      source,
      sourceHtml: highlightLite(source.trimEnd()),
      generatedTs,
      tsHtml: highlightTs(generatedTs.trimEnd()),
      output: run.stdout,
      ...(previewSvg !== undefined ? { previewSvg } : {}),
      ...(badge !== undefined ? { badge } : {}),
    };
    if (cacheFile !== undefined) {
      mkdirSync(dirname(cacheFile), { recursive: true });
      writeFileSync(cacheFile, JSON.stringify(renderedSample));
    }
    return { sample: renderedSample, cached: false };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

type EcosystemCounts = Readonly<{
  lessons: number;
  tutorials: number;
  drills: number;
  workouts: number;
  docsPages: number;
  modules: number;
}>;

/** Generates `/`, `/gallery/`, and `/playground/` page bodies via `tools/src/site-pages.lts`. */
function buildSitePages(options: Readonly<{
  rendered: ReadonlyMap<string, RenderedSample>;
  renderedPlay: ReadonlyMap<string, RenderedSample>;
  repoUrl: string;
  counts: EcosystemCounts;
}>): Readonly<{ homeBody: string; galleryBody: string; playgroundBody: string }> {
  const { rendered, renderedPlay, repoUrl, counts } = options;
  if (!rendered.has(heroSample.id)) throw new Error("missing rendered hero sample");
  const pgPayload = [
    ...Array.from(rendered.values()).map(s => ({
      id: s.id,
      title: s.title,
      file: s.file,
      showOutput: s.showOutput === true,
      play: false,
    })),
    ...Array.from(renderedPlay.values()).map(s => ({
      id: s.id,
      title: s.title,
      file: s.file,
      showOutput: false,
      play: true,
    })),
  ];
  const serialized = JSON.stringify(pgPayload).replaceAll("<", "\\u003c");
  const pgScriptHtml = renderPlaygroundClientScript(serialized, playgroundDefaultSample.id);

  const mapSample = (s: RenderedSample) => ({
    id: s.id,
    group: s.group,
    title: s.title,
    note: s.note,
    file: s.file,
    args: s.args,
    stdin: s.stdin,
    showOutput: s.showOutput === true,
    sourceHtml: s.sourceHtml,
    output: s.output,
    badge: s.badge ?? "",
    previewSvg: s.previewSvg ?? "",
  });

  const result = spawnTool("site-pages", [], {
    cwd: root,
    target: "ts",
    input: JSON.stringify({
      repoUrl,
      brandWordmark,
      proseLite,
      heroSampleId: heroSample.id,
      heroSampleFile: heroSample.file,
      defaultSampleTitle: playgroundDefaultSample.title,
      counts,
      sampleGroups: sampleGroups.map(g => ({ id: g.id, title: g.title, description: g.description, folder: g.folder ?? "" })),
      playGroups: playGroups.map(g => ({ id: g.id, title: g.title, description: g.description, folder: g.folder })),
      renderedSamples: showcaseSamples.map(s => rendered.get(s.id)).filter((s): s is RenderedSample => s !== undefined).map(mapSample),
      renderedPlaySamples: playSamples.map(s => renderedPlay.get(s.id)).filter((s): s is RenderedSample => s !== undefined).map(mapSample),
      pgEditorBlockHtml: renderCodeEditorBlock({
        textareaId: "pg-editor",
        ariaLabel: "Lite source editor",
        preCodeId: "pg-source",
        gutterId: "pg-editor-gutter",
      }),
      pgCodeModeBarHtml: renderGeneratedToolbar({
        id: "pg-code-modes",
        buttonIdPrefix: "mode-",
        ariaLabel: "Portability view",
      }),
      pgScriptHtml,
    }),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite site-pages failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as { homeBody: string; galleryBody: string; playgroundBody: string };
}

export function parseBuildArgs(argv: readonly string[]): BuildSiteOptions {
  let lightSwitchShine = true;
  let verbose: boolean | undefined;
  for (const arg of argv) {
    if (arg === '--no-light-switch-shine' || arg === '--light-switch-shine=false') {
      lightSwitchShine = false;
    } else if (arg === '--light-switch-shine' || arg === '--light-switch-shine=true') {
      lightSwitchShine = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--quiet' || arg === '-q') {
      verbose = false;
    } else {
      throw new Error(`unknown site build flag: ${arg}`);
    }
  }
  return verbose === undefined ? { lightSwitchShine } : { lightSwitchShine, verbose };
}

export function buildSite(options?: BuildSiteOptions): void {
  const buildStart = performance.now();
  const verbose =
    options?.verbose ??
    (process.env['CI'] === 'true' ||
      process.env['GITHUB_ACTIONS'] === 'true' ||
      process.env['LITE_SITE_VERBOSE'] === '1');
  const totalPhases = 13;
  let phaseIndex = 0;
  const phaseMs: string[] = [];
  const logProgress = (message: string): void => {
    if (!verbose) return;
    const elapsed = ((performance.now() - buildStart) / 1000).toFixed(1);
    const rssMb = (process.memoryUsage().rss / 1048576).toFixed(0);
    process.stdout.write(`[site +${elapsed}s | ${rssMb}MB] ${message}\n`);
  };
  const timePhase = <T>(label: string, fn: () => T, describeResult?: (value: T) => string): T => {
    phaseIndex += 1;
    const stepTag = `[${String(phaseIndex)}/${String(totalPhases)}] ${label}`;
    logProgress(`${stepTag}: starting...`);
    const t0 = performance.now();
    const res = fn();
    const elapsedMs = Math.round(performance.now() - t0);
    phaseMs.push(`${label}=${String(elapsedMs)}ms`);
    const extra = describeResult ? ` (${describeResult(res)})` : '';
    logProgress(`${stepTag}: done in ${(elapsedMs / 1000).toFixed(2)}s${extra}`);
    return res;
  };
  const lightSwitchShine = options?.lightSwitchShine ?? true;
  const repoUrl = readRepositoryUrl();
  const rev = readSourceRevision();
  logProgress(
    `Starting Lite site build (${String(showcaseSamples.length)} showcase + ${String(playSamples.length)} play samples, rev=${rev.commit.slice(0, 12)})`,
  );
  const tsCompiler = timePhase('compiler', () => options?.tsCompiler ?? buildTsCompiler());
  const rendered = new Map<string, RenderedSample>();
  const renderedPlay = new Map<string, RenderedSample>();

  const playBadgeByGroup = new Map(playGroups.map(group => [group.id, group.badge]));
  timePhase(
    'samples',
    () => {
      const sampleSalt = computeSampleCacheSalt(tsCompiler);
      const totalSamples = showcaseSamples.length + playSamples.length;
      let done = 0;
      let cacheHits = 0;
      const reportSample = (sampleFile: string, cached: boolean): void => {
        done += 1;
        if (cached) cacheHits += 1;
        if (done % 5 === 0 || done === totalSamples) {
          logProgress(
            `  samples ${String(done)}/${String(totalSamples)} (${String(cacheHits)} cached, ${String(done - cacheHits)} built; last=${sampleFile})`,
          );
        }
      };
      for (const sample of showcaseSamples) {
        const res = compileAndRunSample(sample, tsCompiler, undefined, sampleSalt);
        rendered.set(sample.id, res.sample);
        reportSample(sample.file, res.cached);
      }
      for (const sample of playSamples) {
        const res = compileAndRunSample(sample, tsCompiler, playBadgeByGroup.get(sample.group), sampleSalt);
        renderedPlay.set(sample.id, res.sample);
        reportSample(sample.file, res.cached);
      }
      return { total: totalSamples, cached: cacheHits, built: totalSamples - cacheHits };
    },
    (s) => `${String(s.total)} total, ${String(s.cached)} cached, ${String(s.built)} built`,
  );

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(join(outputDir, 'runtime'), { recursive: true });
  mkdirSync(join(outputDir, 'gallery'), { recursive: true });
  mkdirSync(join(outputDir, 'playground', 'samples'), { recursive: true });

  writeFileSync(join(outputDir, 'style.css'), siteCss);
  cpSync(join(root, 'brand', 'lite-favicon.svg'), join(outputDir, 'favicon.svg'));
  mkdirSync(join(outputDir, 'brand'), { recursive: true });
  for (const svgFile of ['lite-wordmark.svg', 'lite-mark.svg', 'lite-mark-minimal.svg', 'lite-favicon.svg', 'identity-in-use.svg']) {
    const srcSvg = join(root, 'brand', svgFile);
    if (existsSync(srcSvg)) cpSync(srcSvg, join(outputDir, 'brand', svgFile));
  }

  const compilerJs = stripTypeScriptTypes(readFileSync(tsCompiler.path, 'utf8'), { mode: 'strip' });
  const compilerCJs = timePhase('compiler-c', () => stripTypeScriptTypes(readFileSync(buildCCompiler().path, 'utf8'), { mode: 'strip' }));
  const stripTsJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'strip-ts.ts'), 'utf8'), { mode: 'strip' });
  const playKeepaliveJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'play-keepalive.ts'), 'utf8'), { mode: 'strip' });
  const codeViewJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'code-view.ts'), 'utf8'), { mode: 'strip' });
  const editorClientJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'editor-client.ts'), 'utf8'), { mode: 'strip' });
  const highlightJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'highlight.ts'), 'utf8'), { mode: 'strip' });
  const playStageJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'play-stage.ts'), 'utf8'), { mode: 'strip' });

  const stdlib: Record<string, Readonly<{ path: string; display: string; identity: string; text: string }>> = {};
  const collectStdlibDir = (ns: string, dir: string, modPrefix: string, relPrefix: string): void => {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (ent.isDirectory()) {
        collectStdlibDir(ns, join(dir, ent.name), `${modPrefix}/${ent.name}`, `${relPrefix}/${ent.name}`);
      } else if (ent.name.endsWith('.lt')) {
        const relPath = `${relPrefix}/${ent.name}`;
        const text = readFileSync(join(dir, ent.name), 'utf8');
        const modName = `${modPrefix}/${ent.name.slice(0, -3)}`;
        stdlib[modName] = { path: relPath, display: relPath, identity: coreModuleIdentity(relPath), text };
      }
    }
  };
  for (const ns of ['core', 'math', 'ds', 'data', 'gfx', 'media'] as const) {
    collectStdlibDir(ns, join(root, 'lib', ns), ns, `lib/${ns}`);
  }
  const preloadRelPath = 'lib/$preload.lt';
  stdlib['$preload'] = {
    path: preloadRelPath,
    display: preloadRelPath,
    identity: coreModuleIdentity(preloadRelPath),
    text: readFileSync(join(root, preloadRelPath), 'utf8')
  };
  const stdlibJson = JSON.stringify(stdlib);

  for (const targetDir of [join(outputDir, 'runtime'), join(outputDir, 'playground')]) {
    writeFileSync(join(targetDir, 'compiler.js'), compilerJs);
    writeFileSync(join(targetDir, 'compiler-c.js'), compilerCJs);
    writeFileSync(join(targetDir, 'strip-ts.js'), stripTsJs);
    writeFileSync(join(targetDir, 'play-keepalive.js'), playKeepaliveJs);
    writeFileSync(join(targetDir, 'code-view.js'), codeViewJs);
    writeFileSync(join(targetDir, 'editor-client.js'), editorClientJs);
    writeFileSync(join(targetDir, 'highlight.js'), highlightJs);
    writeFileSync(join(targetDir, 'play-stage.js'), playStageJs);
    writeFileSync(join(targetDir, 'worker.js'), playgroundWorkerJs);
    writeFileSync(join(targetDir, 'stdlib.json'), stdlibJson);
  }
  writeFileSync(join(outputDir, 'playground', 'coi-serviceworker.js'), coiServiceWorkerJs);
  writeFileSync(join(outputDir, 'runtime', 'academy.js'), academyClientJs);
  writeFileSync(join(outputDir, 'runtime', 'search.js'), searchClientJs);
  writeFileSync(join(outputDir, 'runtime', 'snips.js'), snipsClientJs);

  const extractedModules = timePhase('extract-modules', () => extractModules(root), (m) => `${String(m.length)} modules`);
  const playgroundLibrary = timePhase('library', () => collectPlaygroundLibrary({
    rootDir: root,
    samples: [...showcaseSamples, ...playSamples],
  }), (lib) => `${String(lib.length)} entries`);
  const discoveredDocs = timePhase('discover-docs', () => discoverDocsPayload(), (d) => `${String(d.rendered.length)} docs`);
  const renderedDocByPath = new Map(discoveredDocs.rendered.map((d) => [d.path, d]));
  const learnCatalog = JSON.parse(readFileSync(join(root, 'language', 'learn', 'catalog.json'), 'utf8')) as LearnCatalog;
  const gymCatalog = JSON.parse(readFileSync(join(root, 'language', 'gym', 'catalog.json'), 'utf8')) as GymCatalog;

  const graph = buildLiteAcademyGraph({
    rootDir: root,
    repoUrl,
    docs: discoveredDocs.metas.map((m) => {
      const ren = renderedDocByPath.get(m.sourcePath);
      return {
        ...m,
        title: ren?.title ?? m.navLabel,
        ...(ren ? { anchors: collectHtmlIds(ren.html) } : {}),
      };
    }),
    modules: extractedModules,
    learnLessons: learnCatalog.tracks.flatMap((tr) =>
      tr.lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        kind: l.kind,
        trackId: tr.id,
        trackTitle: tr.title,
        environment: l.environment,
        guideFile: l.guideFile,
        sourceFile: l.sourceFile,
        docs: l.docs,
      })),
    ),
    gymExercises: gymCatalog.exercises.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      mode: e.mode,
      belt: e.belt,
      domain: e.domain,
      subGroup: e.subGroup,
      promptFile: e.promptFile,
      solutionFile: e.solutionFile,
      relatedDocs: e.relatedDocs,
      relatedLessons: e.relatedLessons,
    })),
    showcaseSamples,
    playSamples,
    playGroups,
    playgroundLibrary,
  });

  const toolsOut = timePhase('tools', () => buildToolsSection({ repoUrl, rev, lightSwitchShine }));
  mkdirSync(join(outputDir, 'tools'), { recursive: true });
  writeFileSync(join(outputDir, 'tools', 'index.html'), toolsOut.html);

  const learnOut = timePhase('learn', () => buildLearnSection({
    tsCompiler,
    modules: extractedModules,
    showcaseSamples,
    playSamples,
    repoUrl,
    rev,
    lightSwitchShine,
    graph,
  }), (out) => `${String(out.lessonCount)} lessons, ${String(out.tutorialCount)} tutorials`);
  for (const [relPath, html] of learnOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }

  const gymOut = timePhase('gym', () => buildGymSection({
    tsCompiler,
    modules: extractedModules,
    showcaseSamples,
    playSamples,
    repoUrl,
    rev,
    lightSwitchShine,
    graph,
  }), (out) => `${String(out.exerciseCount)} exercises`);
  for (const [relPath, content] of gymOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }

  const docsOut = timePhase('docs', () => buildDocsSection({
    showcaseSamples,
    playSamples,
    repoUrl,
    rev,
    lightSwitchShine,
    discovered: discoveredDocs,
    graph,
  }), (out) => `${String(out.files.size)} pages`);
  for (const [relPath, html] of docsOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }

  const modulesOut = timePhase('modules', () => buildModulesSection({
    modules: extractedModules,
    showcaseSamples,
    playSamples,
    playGroups,
    repoUrl,
    rev,
    lightSwitchShine,
    graph,
  }), (out) => `${String(out.files.size)} pages`);
  for (const [relPath, html] of modulesOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }

  writeFileSync(join(outputDir, 'link-graph.json'), graph.toJson());

  const searchEntries: SearchEntry[] = [
    { kind: 'learn', title: 'Learn Lite', subtitle: 'Guided ability course, Quickstart, and project tutorials', href: 'learn/', keywords: 'learn course tour tutorials' },
    { kind: 'gym', title: 'Lite Gym', subtitle: 'Interactive drills and multi-test coding katas', href: 'gym/', keywords: 'gym exercises katas practice' },
    { kind: 'handbook', title: 'Lite Handbook & Docs', subtitle: 'Shipped language handbook, specification, and design reference', href: 'docs/', keywords: 'docs handbook reference spec' },
    { kind: 'module', title: 'Standard & Play Modules', subtitle: 'Core utilities and Play Canvas/Audio libraries', href: 'modules/', keywords: 'modules stdlib core extra api' },
    { kind: 'tool', title: 'Lite Tools & CLI', subtitle: 'CLI commands, formatter, VS Code extension, and self-hosting', href: 'tools/', keywords: 'tools cli fmt verify doctor vscode' },
    { kind: 'gallery', title: 'Sample & Play Gallery', subtitle: 'Verified language programs, canvas art, audio, and games', href: 'gallery/', keywords: 'gallery examples samples canvas audio games' },
    { kind: 'tool', title: 'Browser Playground', subtitle: 'Write, compile to TypeScript or C, and run Lite in your browser', href: 'playground/', keywords: 'playground sandbox compile run' },
    ...learnOut.searchEntries,
    ...gymOut.searchEntries,
    ...docsOut.searchEntries,
    ...modulesOut.searchEntries,
    ...toolsOut.searchEntries,
  ];
  const tagsBySampleId = new Map<string, readonly string[]>();
  for (const item of playgroundLibrary) {
    if (item.sampleId && item.tags.length > 0) {
      tagsBySampleId.set(item.sampleId, item.tags);
    }
  }
  for (const sample of [...rendered.values(), ...renderedPlay.values()]) {
    const extraKeywords = new Set<string>([
      sample.id,
      sample.group,
      sample.file,
      ...(tagsBySampleId.get(sample.id) ?? []),
      ...('keywords' in sample && sample.keywords ? sample.keywords : []),
    ]);
    searchEntries.push({
      kind: 'gallery',
      title: sample.title,
      subtitle: `${sample.note} (${sample.file})`,
      href: `playground/?sample=${encodeURIComponent(sample.id)}`,
      keywords: Array.from(extraKeywords).join(' '),
      badge: sample.badge ?? 'sample',
    });
  }
  writeFileSync(join(outputDir, 'search-index.json'), JSON.stringify(searchEntries));

  for (const sample of [...rendered.values(), ...renderedPlay.values()]) {
    writeFileSync(
      join(outputDir, 'playground', 'samples', `${sample.id}.json`),
      JSON.stringify({
        id: sample.id,
        args: sample.args,
        stdin: sample.stdin,
        source: sample.source,
        sourceHtml: sample.sourceHtml,
        ts: sample.generatedTs,
        tsHtml: sample.tsHtml,
        output: sample.output,
      }),
    );
  }
  writeFileSync(join(outputDir, 'playground', 'library.json'), JSON.stringify(playgroundLibrary));

  const sitePages = timePhase('pages', () => buildSitePages({
    rendered,
    renderedPlay,
    repoUrl,
    counts: {
      lessons: learnOut.lessonCount,
      tutorials: learnOut.tutorialCount,
      drills: gymOut.drillCount,
      workouts: gymOut.kataCount,
      docsPages: docsOut.files.size,
      modules: extractedModules.length,
    },
  }));
  writeFileSync(
    join(outputDir, 'index.html'),
    renderPage({
      title: 'Lite — LiteLang & LiteScript',
      basePath: '',
      active: 'home',
      repoUrl,
      rev,
      body: sitePages.homeBody,
      lightSwitchShine,
    }),
  );
  writeFileSync(
    join(outputDir, 'gallery', 'index.html'),
    renderPage({
      title: 'Gallery — Lite',
      description: 'Verified Lite language examples and category-grouped canvas, audio, and game showcases.',
      basePath: '../',
      active: 'gallery',
      repoUrl,
      rev,
      body: sitePages.galleryBody,
      lightSwitchShine,
    }),
  );
  writeFileSync(
    join(outputDir, 'playground', 'index.html'),
    renderPage({
      title: 'Playground — Lite',
      description: 'Write, compile to TypeScript or C, and run Lite programs in your browser.',
      basePath: '../',
      active: 'playground',
      repoUrl,
      rev,
      body: sitePages.playgroundBody,
      bodyClass: 'playground-page',
      mainClass: 'playground-main',
      lightSwitchShine,
    }),
  );
  writeFileSync(
    join(outputDir, 'build.json'),
    JSON.stringify(
      {
        commit: rev.commit,
        shortCommit: rev.commit.slice(0, 12),
        timestamp: rev.timestamp,
        samples: rendered.size,
        lessons: learnOut.lessonCount,
        tutorials: learnOut.tutorialCount,
        gymExercises: gymOut.exerciseCount,
        docsPages: docsOut.files.size,
        modules: extractedModules.length,
        lightSwitchShine,
      },
      null,
      2,
    ) + '\n',
  );

  const refReport = timePhase(
    'validate',
    () => validateBuiltSiteReferences(outputDir),
    (r) => `${String(r.htmlFiles)} HTML files, ${String(r.localLinksChecked)} links, ${String(r.fragmentsChecked)} fragments`,
  );
  if (refReport.violations.length > 0) {
    const sample = refReport.violations
      .slice(0, 15)
      .map(v => `- [${v.reason}] ${v.source} -> ${v.target}`)
      .join('\n');
    throw new Error(
      `Built site reference validation failed (${String(refReport.violations.length)} violations across ${String(refReport.htmlFiles)} HTML files):\n${sample}`,
    );
  }

  const totalSec = ((performance.now() - buildStart) / 1000).toFixed(2);
  const rssMb = (process.memoryUsage().rss / 1048576).toFixed(1);
  console.log(
    `Built Lite site (${String(rendered.size)} verified samples, ${String(refReport.localLinksChecked)} local links, ${String(refReport.fragmentsChecked)} fragments verified) -> dist/site/ [${totalSec}s, rss=${rssMb}MB | ${phaseMs.join(' ')}]`,
  );
}

if (import.meta.main) {
  buildSite(parseBuildArgs(process.argv.slice(2)));
}
