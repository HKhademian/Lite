#!/usr/bin/env node
/** Build the static public showcase site and playground into dist/site/. */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { buildCCompiler, buildTsCompiler, compileBuiltCompiler, ensureTool, type CompilerBuild } from '../igniter/artifacts.ts';
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
import { playgroundWorkerJs } from './playground-worker.ts';
import { renderCodeEditorBlock, renderCodeModeBar } from './ui-blocks.ts';
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
}>;

const root = dirname(import.meta.dirname);
const outputDir = join(root, 'dist', 'site');

function coreModuleIdentity(relPath: string): string {
  switch (relPath) {
    case 'lib/core/io.lts': return 'lite.core.io.v1';
    case 'lib/core/int.lts': return 'lite.core.int.v1';
    case 'lib/core/list.lts': return 'lite.core.list.v1';
    case 'lib/core/text.lts': return 'lite.core.text.v1';
    case 'lib/core/file.lts': return 'lite.core.file.v1';
    case 'lib/core/process.lts': return 'lite.core.process.v1';
    case 'lib/core/crypto.lts': return 'lite.core.crypto.v1';
    case 'lib/core/time.lts': return 'lite.core.time.v1';
    case 'lib/core/unicode.lts': return 'lite.core.unicode.v1';
    default: return '';
  }
}

function compileAndRunSample(sample: AnySample, tsCompiler: CompilerBuild, badge?: string): RenderedSample {
  const fullPath = resolve(root, sample.file);
  const source = readFileSync(fullPath, 'utf8');
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
    });
    if (run.error !== undefined) throw run.error;
    if (run.status !== 0) {
      throw new Error(`failed to run ${sample.file} (exit ${String(run.status)}):\n${run.stderr}`);
    }
    const previewSvg = captureCanvasPreview(generatedTs, sample.title);
    return {
      ...sample,
      source,
      sourceHtml: highlightLite(source.trimEnd()),
      generatedTs,
      tsHtml: highlightTs(generatedTs.trimEnd()),
      output: run.stdout,
      ...(previewSvg !== undefined ? { previewSvg } : {}),
      ...(badge !== undefined ? { badge } : {}),
    };
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

  const result = spawnSync(process.execPath, [ensureTool("site-pages")], {
    cwd: root,
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
      pgCodeModeBarHtml: renderCodeModeBar({
        id: "pg-code-modes",
        buttonIdPrefix: "mode-",
        ariaLabel: "Generated code view",
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
  for (const arg of argv) {
    if (arg === '--no-light-switch-shine' || arg === '--light-switch-shine=false') {
      lightSwitchShine = false;
    } else if (arg === '--light-switch-shine' || arg === '--light-switch-shine=true') {
      lightSwitchShine = true;
    } else {
      throw new Error(`unknown site build flag: ${arg}`);
    }
  }
  return { lightSwitchShine };
}

export function buildSite(options?: BuildSiteOptions): void {
  const lightSwitchShine = options?.lightSwitchShine ?? true;
  const tsCompiler = options?.tsCompiler ?? buildTsCompiler();
  const repoUrl = readRepositoryUrl();
  const rev = readSourceRevision();
  const rendered = new Map<string, RenderedSample>();
  const renderedPlay = new Map<string, RenderedSample>();

  const playBadgeByGroup = new Map(playGroups.map(group => [group.id, group.badge]));
  for (const sample of showcaseSamples) {
    rendered.set(sample.id, compileAndRunSample(sample, tsCompiler));
  }
  for (const sample of playSamples) {
    renderedPlay.set(sample.id, compileAndRunSample(sample, tsCompiler, playBadgeByGroup.get(sample.group)));
  }

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
  const compilerCJs = stripTypeScriptTypes(readFileSync(buildCCompiler().path, 'utf8'), { mode: 'strip' });
  const stripTsJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'strip-ts.ts'), 'utf8'), { mode: 'strip' });
  const playKeepaliveJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'play-keepalive.ts'), 'utf8'), { mode: 'strip' });
  const codeViewJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'code-view.ts'), 'utf8'), { mode: 'strip' });
  const editorClientJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'editor-client.ts'), 'utf8'), { mode: 'strip' });
  const highlightJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'highlight.ts'), 'utf8'), { mode: 'strip' });
  const playStageJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'play-stage.ts'), 'utf8'), { mode: 'strip' });

  const stdlib: Record<string, Readonly<{ path: string; display: string; identity: string; text: string }>> = {};
  for (const ns of ['core', 'extra'] as const) {
    const libDir = join(root, 'lib', ns);
    for (const name of readdirSync(libDir).filter(f => f.endsWith('.lts')).sort()) {
      const relPath = `lib/${ns}/${name}`;
      const text = readFileSync(join(libDir, name), 'utf8');
      const modName = `${ns}/${name.slice(0, -4)}`;
      stdlib[modName] = { path: relPath, display: relPath, identity: coreModuleIdentity(relPath), text };
    }
  }
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
  writeFileSync(join(outputDir, 'runtime', 'academy.js'), academyClientJs);
  writeFileSync(join(outputDir, 'runtime', 'search.js'), searchClientJs);
  writeFileSync(join(outputDir, 'runtime', 'snips.js'), snipsClientJs);

  const extractedModules = extractModules(root);
  const playgroundLibrary = collectPlaygroundLibrary({
    rootDir: root,
    samples: [...showcaseSamples, ...playSamples],
  });
  const discoveredDocs = discoverDocsPayload();
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

  const toolsOut = buildToolsSection({ repoUrl, rev, lightSwitchShine });
  mkdirSync(join(outputDir, 'tools'), { recursive: true });
  writeFileSync(join(outputDir, 'tools', 'index.html'), toolsOut.html);

  const learnOut = buildLearnSection({
    tsCompiler,
    modules: extractedModules,
    showcaseSamples,
    playSamples,
    repoUrl,
    rev,
    lightSwitchShine,
    graph,
  });
  for (const [relPath, html] of learnOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }

  const gymOut = buildGymSection({
    tsCompiler,
    modules: extractedModules,
    showcaseSamples,
    playSamples,
    repoUrl,
    rev,
    lightSwitchShine,
    graph,
  });
  for (const [relPath, content] of gymOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }

  const docsOut = buildDocsSection({
    showcaseSamples,
    playSamples,
    repoUrl,
    rev,
    lightSwitchShine,
    discovered: discoveredDocs,
    graph,
  });
  for (const [relPath, html] of docsOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }

  const modulesOut = buildModulesSection({
    modules: extractedModules,
    showcaseSamples,
    playSamples,
    playGroups,
    repoUrl,
    rev,
    lightSwitchShine,
    graph,
  });
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
  for (const sample of [...rendered.values(), ...renderedPlay.values()]) {
    searchEntries.push({
      kind: 'gallery',
      title: sample.title,
      subtitle: `${sample.note} (${sample.file})`,
      href: `playground/?sample=${encodeURIComponent(sample.id)}`,
      keywords: `${sample.id} ${sample.group} ${sample.file}`,
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

  const sitePages = buildSitePages({
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
  });
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

  const refReport = validateBuiltSiteReferences(outputDir);
  if (refReport.violations.length > 0) {
    const sample = refReport.violations
      .slice(0, 15)
      .map(v => `- [${v.reason}] ${v.source} -> ${v.target}`)
      .join('\n');
    throw new Error(
      `Built site reference validation failed (${String(refReport.violations.length)} violations across ${String(refReport.htmlFiles)} HTML files):\n${sample}`,
    );
  }

  console.log(
    `Built Lite site (${String(rendered.size)} verified samples, ${String(refReport.localLinksChecked)} local links, ${String(refReport.fragmentsChecked)} fragments verified) -> dist/site/`,
  );
}

if (import.meta.main) {
  buildSite(parseBuildArgs(process.argv.slice(2)));
}
