import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { buildTsCompiler, compileBuiltCompiler, type CompilerBuild } from '../igniter/artifacts.ts';
import { academyClientJs } from './academy-state.ts';
import { buildSite, parseBuildArgs } from './build.ts';
import { formatCodeView } from './code-view.ts';
import {
  bindCodeModeButtons,
  bindLiteEditor,
  bindSplitPane,
  computeAutoIndent,
  computeCursorLineCol,
  computeOutdent,
  decodeSharePayload,
  encodeSharePayload,
  parseErrorLines,
  renderLineNumbersHtml,
} from './editor-client.ts';
import { heroSample, sampleGroups, showcaseSamples } from './groups.ts';
import { escapeHtml, highlightC, highlightLite, highlightTs } from './highlight.ts';
import { extractLiteUrisFromMarkdown, LiteAcademyGraph, parseLiteUri, relativeWebHref, rewriteLiteUriHtml, validateBuiltSiteReferences } from './lite-uri.ts';
import { appendPlayKeepalive, stripPlayKeepaliveTs } from './play-keepalive.ts';
import { createPlayStage, createWorkerClient, mapPointerToCell, renderFrameToImageData } from './play-stage.ts';
import { playGroups, playSamples } from './play-samples.ts';
import { stripLiteTs } from './strip-ts.ts';
import { renderCodeEditorBlock, renderCodeModeBar, renderSplitHandle } from './ui-blocks.ts';

const root = dirname(import.meta.dirname);
let cachedTsCompiler: CompilerBuild | undefined;

function sharedTsCompiler(): CompilerBuild {
  if (cachedTsCompiler === undefined) cachedTsCompiler = buildTsCompiler();
  return cachedTsCompiler;
}

test('showcase sample groups and files are valid and unique', () => {
  const groupIds = new Set(sampleGroups.map(g => g.id));
  const sampleIds = new Set<string>();
  assert(groupIds.has(heroSample.group));

  for (const sample of showcaseSamples) {
    assert(!sampleIds.has(sample.id), `duplicate sample id: ${sample.id}`);
    sampleIds.add(sample.id);
    assert(groupIds.has(sample.group), `unknown group ${sample.group} for ${sample.id}`);
    assert(existsSync(resolve(root, sample.file)), `missing sample file: ${sample.file}`);
  }
  assert(sampleIds.has(heroSample.id), 'hero sample must be included in showcaseSamples');
});

test('syntax highlighter escapes HTML and marks keywords, strings, and comments', () => {
  assert.equal(escapeHtml('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
  const liteHtml = highlightLite('/* hi */ fn(x: Int) { "ok" < 1 }');
  assert(liteHtml.includes('<span class="tok-comment">/* hi */</span>'));
  assert(liteHtml.includes('<span class="tok-keyword">fn</span>'));
  assert(liteHtml.includes('<span class="tok-type">Int</span>'));
  assert(liteHtml.includes('<span class="tok-string">&quot;ok&quot;</span>'));
  assert(liteHtml.includes('&lt;'));

  const tsHtml = highlightTs('const x: bigint = 1n;');
  assert(tsHtml.includes('<span class="tok-keyword">const</span>'));
  assert(tsHtml.includes('<span class="tok-type">bigint</span>'));

  const cHtml = highlightC('#include <stdio.h>\nint main(void) { return 0; }');
  assert(cHtml.includes('<span class="tok-keyword">#include &lt;stdio.h&gt;</span>'));
  assert(cHtml.includes('<span class="tok-type">int</span>'));
  assert(cHtml.includes('<span class="tok-keyword">return</span>'));
});

test('buildSite generates static pages and metadata in dist/site', () => {
  buildSite({ tsCompiler: sharedTsCompiler() });
  const out = join(root, 'dist', 'site');
  for (const rel of [
    'index.html',
    'style.css',
    'favicon.svg',
    'build.json',
    'link-graph.json',
    'search-index.json',
    'runtime/compiler.js',
    'runtime/compiler-c.js',
    'runtime/worker.js',
    'runtime/stdlib.json',
    'runtime/search.js',
    'runtime/snips.js',
    'runtime/academy.js',
    'runtime/play-stage.js',
    'playground/play-stage.js',
    'runtime/highlight.js',
    'runtime/code-view.js',
    'runtime/strip-ts.js',
    'runtime/play-keepalive.js',
    'playground/play-keepalive.js',
    'learn/index.html',
    'gym/index.html',
    'docs/index.html',
    'modules/index.html',
    'tools/index.html',
    'gallery/index.html',
    'playground/index.html',
  ]) {
    assert(existsSync(join(out, rel)), `missing generated site file: ${rel}`);
  }
  const searchIndex = JSON.parse(readFileSync(join(out, 'search-index.json'), 'utf8')) as Array<{ kind: string; title: string; href: string }>;
  assert(searchIndex.length > showcaseSamples.length + 100);
  assert(searchIndex.some((entry) => entry.kind === 'module' && entry.href === 'modules/core/text.html'));
  assert(searchIndex.some((entry) => entry.kind === 'symbol' && entry.title === 'extra/canvas.fillRect'));
  assert(searchIndex.some((entry) => entry.kind === 'tool' && entry.title === 'lite fmt'));

  for (const modRel of [
    'modules/core/crypto.html',
    'modules/core/diag.html',
    'modules/core/file.html',
    'modules/core/format.html',
    'modules/core/int.html',
    'modules/core/io.html',
    'modules/core/list.html',
    'modules/core/path.html',
    'modules/core/process.html',
    'modules/core/source.html',
    'modules/core/test.html',
    'modules/core/text.html',
    'modules/core/time.html',
    'modules/core/unicode.html',
    'modules/extra/audio.html',
    'modules/extra/board.html',
    'modules/extra/canvas.html',
  ]) {
    assert(existsSync(join(out, modRel)), `missing module detail page: ${modRel}`);
  }
  const modulesIndex = readFileSync(join(out, 'modules/index.html'), 'utf8');
  assert(modulesIndex.includes('Standard &amp; Play Modules'));
  assert(modulesIndex.includes('Provisional Module Surface'));
  assert(modulesIndex.includes('Browser + CLI'));
  assert(modulesIndex.includes('Lite Play'));
  assert(modulesIndex.includes('CLI / Host OS'));
  const coreTextHtml = readFileSync(join(out, 'modules/core/text.html'), 'utf8');
  assert(coreTextHtml.includes('Host-backed'));
  assert(coreTextHtml.includes('<span class="tok-keyword">pub</span>'));
  assert(coreTextHtml.includes('Browser + CLI'));
  assert(coreTextHtml.includes('Used in Showcases &amp; Gallery'));
  const coreFileHtml = readFileSync(join(out, 'modules/core/file.html'), 'utf8');
  assert(coreFileHtml.includes('CLI / Host OS'));
  const extraCanvasHtml = readFileSync(join(out, 'modules/extra/canvas.html'), 'utf8');
  assert(extraCanvasHtml.includes('Lite Play'));
  assert(extraCanvasHtml.includes('id="fillRect"'));
  assert(extraCanvasHtml.includes('Used in Showcases &amp; Gallery'));
  const coreListHtml = readFileSync(join(out, 'modules/core/list.html'), 'utf8');
  assert(coreListHtml.includes('Used Across Lite Academy'));
  assert(coreListHtml.includes('Used in Showcases &amp; Gallery'));
  assert(coreListHtml.includes('data-drawer-toggle="sidebar"'));
  const coreUnicodeHtml = readFileSync(join(out, 'modules/core/unicode.html'), 'utf8');
  assert(coreUnicodeHtml.includes('utf8-roundtrip-count'));

  const toolsHtml = readFileSync(join(out, 'tools/index.html'), 'utf8');
  assert(toolsHtml.includes('./bin/lite run'));
  assert(toolsHtml.includes('./bin/lite fmt'));
  assert(toolsHtml.includes('editors/vscode'));
  assert(toolsHtml.includes('node compiler/scripts/self-host.ts'));
  assert(toolsHtml.includes('onCanvasUpdate'));

  for (const docRel of [
    'docs/index.html',
    'docs/spec/index.html',
    'docs/handbook/single-page.html',
    'docs/handbook/overview-and-setup.html',
    'docs/handbook/bindings-and-mutability.html',
    'docs/handbook/numbers-operators-and-strings.html',
    'docs/handbook/conditionals-match-and-loops.html',
    'docs/handbook/tuples-arrays-lists-and-aliases.html',
    'docs/handbook/blocks-wiring-and-closures.html',
    'docs/handbook/imports-visibility-and-io.html',
    'docs/design/overview.html',
    'docs/design/start-here.html',
    'docs/proposals/LP-0001-operation-specific-panic-recovery.html',
    'docs/compiler/overview.html',
    'docs/brand/overview.html',
    'docs/brand/name.html',
    'docs/brand/investigation.html',
    'brand/lite-wordmark.svg',
  ]) {
    assert(existsSync(join(out, docRel)), `missing docs page: ${docRel}`);
  }
  const handbookSingle = readFileSync(join(out, 'docs/handbook/single-page.html'), 'utf8');
  assert(handbookSingle.includes('The Lite Handbook (Single-Page Edition)'));
  assert(handbookSingle.includes('id="chapter-bindings-and-mutability"'));
  assert(handbookSingle.includes('Continue to <a href="#chapter-bindings-and-mutability"'));
  assert(handbookSingle.includes('#h5-nominal-record-types--name-shorthand'));
  assert(handbookSingle.includes('data-play-href="../../playground/?piece=bindings-and-mutability-0"'));
  const bindingsHbHtml = readFileSync(join(out, 'docs/handbook/bindings-and-mutability.html'), 'utf8');
  assert(bindingsHbHtml.includes('data-play-href="../../playground/?piece=bindings-and-mutability-0"'));
  const playLibItems = JSON.parse(readFileSync(join(out, 'playground/library.json'), 'utf8')) as Array<{ category: string; slug: string }>;
  const libPieceSlugs = new Set(playLibItems.filter(it => it.category === 'piece').map(it => it.slug));
  for (const hbFile of [...readdirSync(join(out, 'docs/handbook')).filter(f => f.endsWith('.html')).map(f => join(out, 'docs/handbook', f))]) {
    const hbHtml = readFileSync(hbFile, 'utf8');
    const preMatches = [...hbHtml.matchAll(/<pre class="code-block"([^>]*)>/g)];
    for (const pm of preMatches) {
      if (pm[1]!.includes('data-runnable="true"')) {
        const hrefMatch = /data-play-href="([^"]+)"/.exec(pm[1]!);
        assert(hrefMatch, `missing data-play-href on runnable block in ${hbFile}`);
        const qPiece = /\?piece=([a-z0-9-]+)/.exec(hrefMatch[1]!);
        assert(qPiece && libPieceSlugs.has(qPiece[1]!), `unmapped piece slug ${hrefMatch[1]} in ${hbFile}`);
      }
    }
  }
  const startHereHtml = readFileSync(join(out, 'docs/design/start-here.html'), 'utf8');
  assert(startHereHtml.includes('Open in Play &rarr;'));
  assert(startHereHtml.includes('href="../../playground/?sample=double-sum"'));
  assert(startHereHtml.includes('Verified in TS'));
  const tourHtml = readFileSync(join(out, 'docs/design/tour.html'), 'utf8');
  assert(tourHtml.includes('href="../../playground/?case=mutable-accumulator"'));
  assert(tourHtml.includes('Open in Play &rarr;'));
  const modPkgHtml = readFileSync(join(out, 'docs/design/modules-and-packages.html'), 'utf8');
  assert(modPkgHtml.includes('data-runnable="false"'));
  assert(!modPkgHtml.includes('data-play-href='));
  const lpHtml = readFileSync(join(out, 'docs/proposals/LP-0001-operation-specific-panic-recovery.html'), 'utf8');
  assert(lpHtml.includes('Working Proposal'));
  const tuplesHbHtml = readFileSync(join(out, 'docs/handbook/tuples-arrays-lists-and-aliases.html'), 'utf8');
  assert(tuplesHbHtml.includes('<body class="docs-page"'));
  assert(tuplesHbHtml.includes('id="handbook-sidebar-filter"'));
  assert(tuplesHbHtml.includes('id="hb-toggle-topics"'));
  assert(tuplesHbHtml.includes('id="hb-progress-label"'));
  assert(tuplesHbHtml.includes('conditionals-match-and-loops.html#subjectless-boolean-match'));
  assert(tuplesHbHtml.includes('bindings-and-mutability.html#reserved-storage'));
  assert(tuplesHbHtml.includes('class="hb-roadmap"'));
  assert(tuplesHbHtml.includes('class="docs-pager-card'));
  assert(tuplesHbHtml.includes('data-pager-prev'));
  assert(tuplesHbHtml.includes('data-pager-next'));
  assert(tuplesHbHtml.includes('data-handbook-slug="tuples-arrays-lists-and-aliases"'));
  assert(tuplesHbHtml.includes('data-handbook-nav-slug="tuples-arrays-lists-and-aliases"'));
  assert(tuplesHbHtml.includes('data-runnable="true"'));
  assert(tuplesHbHtml.includes('class="md-heading-anchor"'));
  assert(tuplesHbHtml.includes('class="docs-crosslinks"'));
  const tocMatch = tuplesHbHtml.match(/<aside class="portal-toc"[\s\S]*?<\/aside>/);
  assert(tocMatch && tocMatch[0].includes('<code>'), 'expected inline code rendering inside handbook TOC');
  assert(tocMatch && !tocMatch[0].includes('`'), 'unexpected raw backtick inside handbook TOC');
  assert(tocMatch && !tocMatch[0].includes('Next Chapter'), 'redundant Next Chapter should be omitted from handbook TOC');
  const hbTreeMatch = tuplesHbHtml.match(/<div id="hb-nav-tree"[\s\S]*?<div class="hb-sidebar-foot">/);
  assert(hbTreeMatch && !hbTreeMatch[0].includes('Next Chapter'), 'redundant Next Chapter should be omitted from handbook sidebar topics');
  const designOverviewHtml = readFileSync(join(out, 'docs/design/overview.html'), 'utf8');
  assert(designOverviewHtml.includes('id="docs-sidebar-filter"'));
  assert(designOverviewHtml.includes('id="docs-sidebar-count"'));

  const collectHtml = (dir: string): string[] => {
    const outFiles: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) outFiles.push(...collectHtml(full));
      else if (entry.name.endsWith('.html')) outFiles.push(full);
    }
    return outFiles;
  };
  for (const htmlFile of [...collectHtml(join(out, 'docs')), ...collectHtml(join(out, 'learn')), ...collectHtml(join(out, 'gym')), ...collectHtml(join(out, 'modules'))]) {
    const content = readFileSync(htmlFile, 'utf8');
    assert(!content.includes(' data-md-href='), `unresolved data-md-href in ${htmlFile}`);
    assert(!content.includes(' data-lite-uri='), `unresolved data-lite-uri in ${htmlFile}`);
    assert(!content.includes('playground?'), `missing trailing slash before ? in playground href in ${htmlFile}`);
    const hrefRe = /href="([^"]+)"/g;
    for (let m = hrefRe.exec(content); m !== null; m = hrefRe.exec(content)) {
      const raw = m[1]!;
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#') || raw.startsWith('mailto:')) {
        continue;
      }
      const noFrag = raw.split('#')[0]!.split('?')[0]!;
      if (noFrag === '') continue;
      const resolvedTarget = resolve(dirname(htmlFile), noFrag);
      const fileCandidate = noFrag.endsWith('/') ? join(resolvedTarget, 'index.html') : resolvedTarget;
      assert(existsSync(fileCandidate), `broken local href "${raw}" in ${htmlFile}`);
    }
  }
  const learnIndex = readFileSync(join(out, 'learn/index.html'), 'utf8');
  assert(learnIndex.includes('0 / 28 completed'));
  assert(learnIndex.includes('Track 0 — Getting Started'));
  assert(learnIndex.includes('Track 7 — Standalone Project Tutorials'));
  assert(learnIndex.includes('id="learn-search"'));
  assert(learnIndex.includes('data-learn-env="play"'));
  for (const learnRel of [
    'learn/getting-started/hello-lite.html',
    'learn/foundations/bindings-and-mutability.html',
    'learn/control/subject-match-and-patterns.html',
    'learn/types/typed-maps.html',
    'learn/types/typed-sets.html',
    'learn/types/value-enums.html',
    'learn/types/records-and-patterns.html',
    'learn/modules/modules-and-visibility.html',
    'learn/tutorials/expression-evaluator.html',
    'learn/tutorials/text-manifest-digest.html',
    'learn/tutorials/orb-catcher-game.html',
    'learn/payloads/hello-lite.json',
    'learn/payloads/modules-and-visibility.json',
    'learn/payloads/orb-catcher-game.json',
  ]) {
    assert(existsSync(join(out, learnRel)), `missing learn artifact: ${learnRel}`);
  }
  const orbPage = readFileSync(join(out, 'learn/tutorials/orb-catcher-game.html'), 'utf8');
  assert(orbPage.includes('id="ln-canvas"'));
  assert(orbPage.includes('../../runtime/worker.js'));
  assert(orbPage.includes('../../runtime/play-stage.js'));
  assert(orbPage.includes('id="ln-editor-gutter"'));
  assert(orbPage.includes('id="ln-split"'));
  assert(orbPage.includes('id="ln-copy"'));
  assert(orbPage.includes('class="docs-crosslinks"'));
  const helloLearnHtml = readFileSync(join(out, 'learn/getting-started/hello-lite.html'), 'utf8');
  assert(helloLearnHtml.includes('id="ln-open-play" class="btn" href="../../playground/?piece=hello-lite"'));

  const gymIndex = readFileSync(join(out, 'gym/index.html'), 'utf8');
  assert(gymIndex.includes('0 / 53 solved'));
  assert(gymIndex.includes('Concept Drills (24)'));
  assert(gymIndex.includes('Problem Workouts (29)'));
  assert(gymIndex.includes('Export JSON'));
  assert(gymIndex.includes('Import JSON'));
  assert(gymIndex.includes('id="gym-search"'));
  assert(gymIndex.includes('data-filter-domain='));
  assert(!gymIndex.includes('42 browser-graded'));
  for (const gymRel of [
    'gym/drills/immutable-vs-var.html',
    'gym/drills/map-mut-grant.html',
    'gym/drills/set-mut-grant.html',
    'gym/drills/enum-exhaustive-match.html',
    'gym/drills/subject-match-guard.html',
    'gym/drills/record-shorthand-destructure.html',
    'gym/drills/named-tuple-and-array-destructure.html',
    'gym/workouts/word-frequency-counter.html',
    'gym/workouts/unique-visitor-count.html',
    'gym/workouts/traffic-signal-cycle.html',
    'gym/workouts/order-invoice-summary.html',
    'gym/workouts/ticket-pricing-router.html',
    'gym/workouts/expression-ast-eval.html',
    'gym/payloads/immutable-vs-var.json',
    'gym/payloads/expression-ast-eval.json',
  ]) {
    assert(existsSync(join(out, gymRel)), `missing gym artifact: ${gymRel}`);
  }
  const astDojo = readFileSync(join(out, 'gym/workouts/expression-ast-eval.html'), 'utf8');
  assert(astDojo.includes('Submit &amp; Grade'));
  assert(astDojo.includes('../../runtime/worker.js'));
  assert(astDojo.includes('../../runtime/play-stage.js'));
  assert(astDojo.includes('class="md-prose doc-prose"'));
  assert(astDojo.includes('id="gym-editor-gutter"'));
  assert(astDojo.includes('id="gym-split"'));
  assert(astDojo.includes('id="gym-tab-scratch"'));
  assert(astDojo.includes('gym-sidebar'));
  assert(astDojo.includes('Reveal Reference Solution'));
  const drillDojo = readFileSync(join(out, 'gym/drills/immutable-vs-var.html'), 'utf8');
  assert(drillDojo.includes('<textarea id="gym-editor" class="pg-editor-input"'));
  assert(drillDojo.includes('<pre id="gym-editor-pre" class="pg-editor-pre"'));
  assert(drillDojo.includes('id="gym-open-play" class="pg-copy-btn" href="../../playground/?piece=gym-immutable-vs-var"'));
  assert(!drillDojo.includes('?draft=gym'));
  assert(!drillDojo.includes('class="pg-editor"'));
  assert(!drillDojo.includes('class="pg-pane"'));
  assert(!drillDojo.includes('class="pg-pane-head"'));
  const gallery = readFileSync(join(out, 'gallery/index.html'), 'utf8');
  assert(gallery.includes('<title>Gallery — Lite</title>'));
  assert(gallery.includes('class="gallery-jumps"'));
  assert(gallery.includes('Play &rarr;'));
  assert(gallery.includes('<details class="gallery-code">'));
  assert(!gallery.includes('<details class="gallery-code" open>'));
  const index = readFileSync(join(out, 'index.html'), 'utf8');
  assert(index.includes('is light.'));
  assert(index.includes('Lite Academy'));
  assert(index.includes('Start Learning'));
  assert(index.includes('Enter Gym'));
  assert(index.includes('References &rarr;'));
  assert(index.includes('<meta name="color-scheme" content="light dark">'));
  const buildMeta = JSON.parse(readFileSync(join(out, 'build.json'), 'utf8')) as {
    samples: number;
    lessons: number;
    tutorials: number;
    gymExercises: number;
    docsPages: number;
    modules: number;
  };
  assert.equal(buildMeta.samples, showcaseSamples.length);
  assert.equal(buildMeta.lessons, 25);
  assert.equal(buildMeta.tutorials, 3);
  assert.equal(buildMeta.gymExercises, 53);
  assert.equal(buildMeta.modules, 19);
  assert(buildMeta.docsPages >= 200);
  assert(existsSync(join(out, 'docs/design/site-architecture.html')));
  assert(existsSync(join(out, 'docs/design/maps.html')));
  assert(existsSync(join(out, 'docs/design/sets.html')));
  assert(existsSync(join(out, 'modules/core/map.html')));
  assert(existsSync(join(out, 'modules/core/set.html')));
  const refReport = validateBuiltSiteReferences(out);
  assert.deepEqual(refReport.violations, []);
  assert(refReport.htmlFiles >= 300);
  assert(refReport.localLinksChecked >= 10000);
  assert(refReport.fragmentsChecked >= 5000);
  assert(refReport.searchEntriesChecked >= 2000);
  assert(refReport.graphNodesChecked >= 500);
  assert(refReport.graphEdgesChecked >= 3000);
  assert(index.includes('<meta name="description"'));
  assert(index.includes('Play &rarr;'));
  assert(!index.includes('Inspect generated TypeScript'));
  assert(index.includes('commit-hash'));
  assert(index.includes('title="Committed '));
  assert(index.includes('class="theme-toggle theme-toggle-shine"'));
  assert(index.includes('class="theme-icon icon-auto"'));
  assert(index.includes('class="theme-icon icon-sun"'));
  assert(index.includes('class="theme-icon icon-moon"'));
  assert(index.includes('Auto mode (system: '));
  assert(index.includes('class="quickstart-head"'));
  assert(index.includes('class="shell-line"'));
  assert(index.includes('id="quickstart-copy"'));
  assert(!index.includes('cd</span> LiteScript'));
  for (const navLabel of ['Overview', 'Learn', 'Gym', 'Docs', 'Modules', 'Tools', 'Gallery', 'Play']) {
    assert(index.includes(`>${navLabel}</a>`), `missing nav link ${navLabel}`);
  }
  assert(index.includes('id="site-search-btn"'));
  assert(index.includes('id="mobile-nav-toggle"'));
  assert(index.includes('class="nav-academy-group"'));
  assert(index.includes('id="academy-resume-bar"'));
  assert(index.includes('class="academy-pillar-grid"'));
  assert(index.includes('class="academy-ref-strip"'));
  assert(index.includes('runtime/search.js'));
  assert(index.includes('runtime/academy.js'));
  const searchJs = readFileSync(join(out, 'runtime', 'search.js'), 'utf8');
  assert(searchJs.includes('data-search-kind'));
  const academyJs = readFileSync(join(out, 'runtime', 'academy.js'), 'utf8');
  assert(academyJs.includes('window.LiteAcademy'));
  const styleCss = readFileSync(join(out, 'style.css'), 'utf8');
  assert(styleCss.includes('.theme-toggle.theme-toggle-shine'));
  assert(styleCss.includes('.shell-line::before'));
  assert(styleCss.includes('.quickstart-copy'));
  assert(!styleCss.includes('var(--bg-elev)'));
  assert(styleCss.includes('scroll-margin-top: 76px;'));
  assert(styleCss.includes('@media (max-width: 640px)'));
  assert(styleCss.includes('.pg-panel { min-height: 240px; }'));
  const playground = readFileSync(join(out, 'playground/index.html'), 'utf8');
  assert(playground.includes('playground-page'));
  assert(playground.includes('id="pg-workbench"'));
  assert(playground.includes('id="pg-split"'));
  assert(playground.includes('bindLiteEditor('));
  assert(playground.includes('bindCodeModeButtons('));
  assert(playground.includes('Generated TS'));
  assert(playground.includes('id="pg-compile"'));
  assert(playground.includes('id="pg-play"'));
  assert(playground.includes('id="pg-save-snip"'));
  assert(playground.includes('id="pg-sketches-btn"'));
  assert(playground.includes('id="pg-sketches-modal"'));
  assert(playground.includes('id="pg-sketches-cat-tabs"'));
  assert(playground.includes('data-cat="piece"'));
  assert(playground.includes('id="pg-copy"'));
  assert(index.includes('runtime/snips.js'));
  assert(existsSync(join(out, 'playground', 'library.json')));
  const lib = JSON.parse(readFileSync(join(out, 'playground', 'library.json'), 'utf8')) as Array<{ id: string; slug: string; category: string }>;
  const libCats = new Set(lib.map(item => item.category));
  for (const cat of ['sample', 'example', 'case', 'piece']) {
    assert(libCats.has(cat), `missing library.json category: ${cat}`);
  }
  for (const item of lib) {
    assert.match(item.slug, /^[a-z0-9._-]+$/, `invalid slug for ${item.id}: ${item.slug}`);
  }
  assert(lib.some(item => item.category === 'piece' && item.slug === 'hello-lite'));
  const editorClientJs = readFileSync(join(out, 'playground', 'editor-client.js'), 'utf8');
  assert(editorClientJs.includes('highlight(editor.value)'));
  assert(editorClientJs.includes("event.key === 'Tab'"));
  assert(playground.includes('id="pg-c"'));
  assert(playground.includes('id="pg-share"'));
  assert(playground.includes('id="pg-opt-level"'));
  assert(playground.includes('<option value="1" selected>-O1</option>'));
  assert(playground.includes('<option value="3">-O3</option>'));
  const workerJs = readFileSync(join(out, 'playground', 'worker.js'), 'utf8');
  assert(workerJs.includes("'-O' + String(level)"));
  assert(playground.includes('id="pg-editor-gutter"'));
  assert(playground.includes('id="pg-canvas-fullscreen"'));
  assert(playground.includes('id="mode-program"'));
  assert(playground.includes('id="mode-portable"'));
  assert(playground.includes('id="mode-full"'));
  assert(playground.includes('createWorkerClient("./worker.js"'));
  assert(readFileSync(join(out, 'playground', 'play-stage.js'), 'utf8').includes("new ctor(workerUrl, { type: 'module' })"));
  assert(existsSync(join(out, 'playground', 'code-view.js')));
  assert(existsSync(join(out, 'playground', 'editor-client.js')));
  assert(existsSync(join(out, 'runtime', 'editor-client.js')));
  assert(existsSync(join(out, 'playground', 'highlight.js')));
  assert(playground.includes('id="tab-canvas"'));
  assert(playground.includes('id="pg-pause"'));
  assert(playground.includes('id="pg-canvas-title"'));
  assert(playground.includes('id="pg-canvas-size"'));
  assert(playground.includes('id="pg-mute"'));
  assert(playground.includes('class="pg-sound-wave"'));
  assert(playground.includes('class="pg-sound-slash"'));
  assert(playground.includes('id="pg-fps"'));
  const sizePos = playground.indexOf('id="pg-canvas-size"');
  const fpsPos = playground.indexOf('id="pg-fps"');
  const mutePos = playground.indexOf('id="pg-mute"');
  assert(fpsPos > 0 && fpsPos < sizePos && sizePos < mutePos, 'canvas tools order must be fps · size · mute');
  for (const group of playGroups) {
    assert(gallery.includes(`id="group-${group.id}"`), `missing gallery play category ${group.id}`);
  }
  assert(gallery.includes('class="play-preview-svg"'), 'missing gallery SVG preview thumbnails');
  const stdlib = JSON.parse(readFileSync(join(out, 'playground', 'stdlib.json'), 'utf8')) as Record<string, unknown>;
  assert('extra/canvas' in stdlib);
  assert('extra/board' in stdlib);
  assert('extra/audio' in stdlib);
  for (const sample of showcaseSamples) {
    assert(existsSync(join(out, 'playground', 'samples', `${sample.id}.json`)), `missing playground payload for ${sample.id}`);
  }
  assert(!playground.includes('id="pg-samples"'), 'playground should not render redundant sample <select> dropdown');
  for (const sample of playSamples) {
    assert(existsSync(join(out, 'playground', 'samples', `${sample.id}.json`)), `missing play payload for ${sample.id}`);
    assert(playground.includes(`"id":"${sample.id}"`), `missing playground sample metadata for ${sample.id}`);
    assert(gallery.includes(`sample-${sample.id}`), `missing gallery card for ${sample.id}`);
  }
  const buildInfo = JSON.parse(readFileSync(join(out, 'build.json'), 'utf8')) as { samples: number; shortCommit: string; timestamp: string; lightSwitchShine: boolean };
  assert.equal(buildInfo.samples, showcaseSamples.length);
  assert.equal(buildInfo.shortCommit.length, 12);
  assert(buildInfo.timestamp.length > 0);
  assert.equal(buildInfo.lightSwitchShine, true);
});

test('light-switch shine build flag defaults to active and can be disabled', () => {
  assert.deepEqual(parseBuildArgs([]), { lightSwitchShine: true });
  assert.deepEqual(parseBuildArgs(['--light-switch-shine']), { lightSwitchShine: true });
  assert.deepEqual(parseBuildArgs(['--light-switch-shine=true']), { lightSwitchShine: true });
  assert.deepEqual(parseBuildArgs(['--no-light-switch-shine']), { lightSwitchShine: false });
  assert.deepEqual(parseBuildArgs(['--light-switch-shine=false']), { lightSwitchShine: false });
  assert.throws(() => parseBuildArgs(['--unknown-flag']), /unknown site build flag/);

  buildSite({ lightSwitchShine: false, tsCompiler: sharedTsCompiler() });
  const out = join(root, 'dist', 'site');
  const indexDisabled = readFileSync(join(out, 'index.html'), 'utf8');
  assert(indexDisabled.includes('class="theme-toggle"'));
  assert(!indexDisabled.includes('theme-toggle-shine'));
  const buildInfoDisabled = JSON.parse(readFileSync(join(out, 'build.json'), 'utf8')) as { lightSwitchShine: boolean };
  assert.equal(buildInfoDisabled.lightSwitchShine, false);

  // Restore default active build output in dist/site.
  buildSite({ tsCompiler: sharedTsCompiler() });
});

test('stripLiteTs produces runnable JS matching compiler output for all showcase samples', () => {
  const out = join(root, 'dist', 'site');
  const tsCompiler = sharedTsCompiler();
  const encoder = new TextEncoder();

  for (const sample of showcaseSamples) {
    const payload = JSON.parse(
      readFileSync(join(out, 'playground', 'samples', `${sample.id}.json`), 'utf8')
    ) as { stdin?: string; args?: string[]; output: string };
    const source = readFileSync(resolve(root, sample.file), 'utf8');
    const compiled = compileBuiltCompiler(tsCompiler, { text: source, name: sample.file, cwd: root });
    assert.equal(compiled.status, 0, compiled.stderr.toString('utf8'));
    const ts = compiled.stdout.toString('utf8');
    const js = stripLiteTs(ts);
    const stdinBytes = encoder.encode(payload.stdin ?? '');
    let offset = 0;
    let stdout = '';
    const fakeProcess = {
      argv: ['node', 'playground.js', ...(payload.args ?? [])],
      exit(code: number): never {
        throw new Error(`EXIT:${code}`);
      },
      getBuiltinModule(name: string) {
        assert.equal(name, 'node:fs');
        return {
          readSync(_fd: number, buf: Uint8Array, bufOffset: number, length: number): number {
            if (offset >= stdinBytes.length) return 0;
            const n = Math.min(length, stdinBytes.length - offset);
            buf.set(stdinBytes.subarray(offset, offset + n), bufOffset);
            offset += n;
            return n;
          },
          writeSync(fd: number, text: string): number {
            if (fd === 1) stdout += text;
            return text.length;
          },
        };
      },
    };
    const fn = new Function('process', `${js.replace(/export function main\b/, 'function main')}\nreturn main();`) as (p: typeof fakeProcess) => string | undefined;
    const ret = fn(fakeProcess);
    assert.equal(stdout + (ret ?? ''), payload.output, `runtime parity mismatch for ${sample.id}`);
  }
});

test('emitted playground compiler.js and stdlib.json compile and run Lite code', async () => {
  const out = join(root, 'dist', 'site');
  const compilerUrl = pathToFileURL(join(out, 'playground', 'compiler.js')).href;
  const stdlib = JSON.parse(readFileSync(join(out, 'playground', 'stdlib.json'), 'utf8')) as Record<string, { path: string; display: string; identity: string; text: string }>;
  assert(existsSync(join(out, 'playground', 'compiler.js')));
  assert('core/io' in stdlib);

  const imported = await import(compilerUrl) as { main: (w?: (t: string) => void) => string };
  const sample = JSON.parse(readFileSync(join(out, 'playground', 'samples', 'double-sum.json'), 'utf8')) as { source: string; stdin: string; output: string };
  const stdinBytes = new TextEncoder().encode(sample.source);
  const vfsFiles = new Map<string, Uint8Array>();
  const vfsDirs = new Set<string>(['/project', '/project/lib', '/project/lib/core', '/project/lib/extra']);
  for (const entry of Object.values(stdlib)) {
    const p = `/project/${entry.path}`;
    vfsFiles.set(p, new TextEncoder().encode(entry.text));
  }
  vfsFiles.set('/project/playground.lts', stdinBytes);
  const normVfs = (p: string): string => {
    const raw = String(p).startsWith('/') ? String(p) : `/project/${String(p)}`;
    const segs: string[] = [];
    for (const seg of raw.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') segs.pop();
      else segs.push(seg);
    }
    return `/${segs.join('/')}`;
  };
  let offset = 0;
  let stdout = '';
  let stderr = '';
  const prevProcess = globalThis.process;
  const stubProcess = {
    argv: ['node', '/project/compiler.js', '--stdin', '--name', 'playground.lts', '--root', '/project/playground.lts'],
    platform: 'linux',
    cwd(): string { return '/project'; },
    exit(code: number): never {
      throw new Error(`EXIT:${code}:${stderr}`);
    },
    getBuiltinModule(name: string) {
      assert.equal(name, 'node:fs');
      return {
        statSync(p: string) {
          const k = normVfs(p);
          if (vfsFiles.has(k)) return { isFile: () => true, isDirectory: () => false };
          if (vfsDirs.has(k)) return { isFile: () => false, isDirectory: () => true };
          throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
        },
        realpathSync(p: string): string {
          const k = normVfs(p);
          if (vfsFiles.has(k) || vfsDirs.has(k)) return k;
          throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
        },
        readFileSync(p: string): Uint8Array {
          const k = normVfs(p);
          const data = vfsFiles.get(k);
          if (data !== undefined) return data;
          throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
        },
        readSync(_fd: number, buf: Uint8Array, bufOffset: number, length: number): number {
          if (offset >= stdinBytes.length) return 0;
          const n = Math.min(length, stdinBytes.length - offset);
          buf.set(stdinBytes.subarray(offset, offset + n), bufOffset);
          offset += n;
          return n;
        },
        writeSync(fd: number, text: string): number {
          if (fd === 1) stdout += text;
          else stderr += text;
          return text.length;
        },
      };
    },
  };
  (globalThis as unknown as { process: typeof stubProcess }).process = stubProcess;
  try {
    const ret = imported.main((t) => { stdout += t; });
    const compiledTs = stdout + (ret ?? '');
    assert(compiledTs.includes('export function main'));
    assert.equal(stderr, '');
  } finally {
    globalThis.process = prevProcess;
  }
});

test('emitted playground worker.js compiles and runs edited Lite code', async () => {
  const out = join(root, 'dist', 'site');
  const workerPath = join(out, 'playground', 'worker.js');
  const stdlibPath = join(out, 'playground', 'stdlib.json');
  assert(existsSync(workerPath));
  assert(existsSync(join(out, 'playground', 'strip-ts.js')));

  const messages: Array<{ id: number; ok: boolean; ts?: string; c?: string; stdout?: string; stderr: string }> = [];
  let waiter: (() => void) | undefined;
  const prevSelf = (globalThis as unknown as { self?: unknown }).self;
  const prevFetch = globalThis.fetch;

  const mockSelf: { onmessage?: (e: { data: unknown }) => Promise<void>; postMessage: (msg: { id: number; ok: boolean; ts?: string; c?: string; stdout?: string; stderr: string }) => void } = {
    postMessage(msg) {
      messages.push(msg);
      waiter?.();
    },
  };
  const compilerPath = join(out, 'playground', 'compiler.js');
  const compilerCPath = join(out, 'playground', 'compiler-c.js');
  assert(existsSync(compilerCPath));
  (globalThis as unknown as { self: unknown }).self = mockSelf;
  globalThis.fetch = (async (url: string | URL) => {
    const target = String(url);
    if (target.endsWith('stdlib.json')) {
      return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(stdlibPath, 'utf8')) };
    }
    if (target.endsWith('compiler-c.js')) {
      return { ok: true, status: 200, text: async () => readFileSync(compilerCPath, 'utf8') };
    }
    if (target.endsWith('compiler.js')) {
      return { ok: true, status: 200, text: async () => readFileSync(compilerPath, 'utf8') };
    }
    return { ok: false, status: 404 };
  }) as unknown as typeof fetch;

  try {
    await import(pathToFileURL(workerPath).href);
    assert(typeof mockSelf.onmessage === 'function');

    const send = async (data: unknown) => {
      const done = new Promise<void>((resolve) => { waiter = resolve; });
      await mockSelf.onmessage!({ data });
      await done;
      return messages.at(-1)!;
    };

    const runRes = await send({
      id: 1,
      action: 'run',
      source: 'io := import "core/io";\nio.outputLine(21 * 2);',
      stdin: '',
      args: [],
    });
    assert.equal(runRes.id, 1);
    assert.equal(runRes.ok, true);
    assert(runRes.ts?.includes('export function main'));
    assert.equal(runRes.stdout, '42\n');
    assert.equal(runRes.stderr, '');

    const cRes = await send({
      id: 2,
      action: 'compile-c',
      source: 'io := import "core/io";\nio.outputLine(21 * 2);',
      stdin: '',
      args: [],
    });
    assert.equal(cRes.id, 2);
    assert.equal(cRes.ok, true);
    assert(cRes.c?.includes('#include <stdio.h>'));
    assert(cRes.c?.includes('int main(void)'));

    const errRes = await send({
      id: 3,
      action: 'compile',
      source: 'io := import "core/io";\nio.outputLine(unknownVar);',
      stdin: '',
      args: [],
    });
    assert.equal(errRes.id, 3);
    assert.equal(errRes.ok, false);
    assert(errRes.stderr.includes('unknownVar'));

    const staticRes = await send({
      id: 4,
      action: 'run',
      source: [
        'canvas := import "extra/canvas";',
        'ctx := canvas.create(width = 8, height = 6, title = "Static");',
        'canvas.clear(canvas.rgba(10, 20, 30, 128));',
        'canvas.setPixel(2, 3, canvas.rgb(255, 0, 0));',
      ].join('\n'),
      stdin: '',
      args: [],
    }) as unknown as {
      ok: boolean;
      play: unknown;
      canvas: { width: number; height: number; title: string; ops: number[] } | null;
    };
    assert.equal(staticRes.ok, true);
    assert.equal(staticRes.play, null);
    assert(staticRes.canvas !== null);
    assert.equal(staticRes.canvas.width, 8);
    assert.equal(staticRes.canvas.height, 6);
    assert.equal(staticRes.canvas.title, 'Static');
    assert.equal(staticRes.canvas.ops[0], 1);

    const playRes = await send({
      id: 5,
      action: 'run',
      source: [
        'audio := import "extra/audio";',
        'canvas := import "extra/canvas";',
        'ctx := canvas.play(width = 16, height = 12, title = "Live");',
        'bg := canvas.rgb(0, 0, 0);',
        'var x := 1;',
        'onCanvasInit := fn(): Unit { canvas.clear(bg); }',
        'onCanvasUpdate := fn(dt: Float): Int { voidDt := dt; canvas.clear(bg); canvas.setPixel(x, 2, canvas.rgb(255, 255, 255)); 0 }',
        'onCanvasKeyDown := fn(key: String): Unit { if key == "ArrowRight" { x += 1; audio.tone(440, 100, 20); } }',
        'onCanvasPointerDown := fn(col: Int, row: Int, button: Int): Unit { voidBtn := button; canvas.setPixel(col, row, canvas.rgba(0, 255, 0, 180)); audio.tone(523, 80, 15); }',
      ].join('\n'),
      stdin: '',
      args: [],
    }) as unknown as {
      ok: boolean;
      play: { width: number; height: number; title: string; hasUpdate: boolean; status: number; ops: number[] } | null;
      tones: number[];
    };
    assert.equal(playRes.ok, true);
    assert(playRes.play !== null);
    assert.equal(playRes.play.width, 16);
    assert.equal(playRes.play.height, 12);
    assert.equal(playRes.play.hasUpdate, true);
    assert.equal(playRes.play.status, 0);

    const stepRes = await send({ id: 6, action: 'step', dt: 0.016 }) as unknown as {
      ok: boolean;
      action: string;
      status: number;
      frame: { ops: number[] };
    };
    assert.equal(stepRes.ok, true);
    assert.equal(stepRes.action, 'step');
    assert.equal(stepRes.status, 0);
    assert.equal(stepRes.frame.ops[0], 1);

    const keyRes = await send({ id: 7, action: 'keydown', key: 'ArrowRight' }) as unknown as {
      ok: boolean;
      tones: number[];
    };
    assert.equal(keyRes.ok, true);
    assert.deepEqual(keyRes.tones, [440, 100, 20]);

    const ptrRes = await send({ id: 8, action: 'pointerdown', x: 5, y: 4, button: 0 }) as unknown as {
      ok: boolean;
      frame: { ops: number[] };
      tones: number[];
    };
    assert.equal(ptrRes.ok, true);
    assert.equal(ptrRes.frame.ops[0], 2);
    assert.equal(ptrRes.frame.ops[1], 5);
    assert.equal(ptrRes.frame.ops[2], 4);
    assert.deepEqual(ptrRes.tones, [523, 80, 15]);

    await mockSelf.onmessage!({ data: { action: 'stop' } });

    const aliasRes = await send({
      id: 9,
      action: 'run',
      source: [
        'canvas := import "extra/canvas";',
        'ctx := canvas.play(width = 4, height = 4, title = "Alias");',
        'canvas_onUpdate := fn(dt: Float): Int { voidDt := dt; canvas.clear(canvas.rgb(1, 2, 3)); 0 }',
      ].join('\n'),
      stdin: '',
      args: [],
    }) as unknown as { ok: boolean; play: { hasUpdate: boolean; ops: number[] } | null };
    assert.equal(aliasRes.ok, true);
    assert.equal(aliasRes.play?.hasUpdate, true);
    assert.equal(aliasRes.play?.ops[0], 1);
    await mockSelf.onmessage!({ data: { action: 'stop' } });

    const modPayload = JSON.parse(readFileSync(join(out, 'learn/payloads/modules-and-visibility.json'), 'utf8')) as {
      source: string;
      output: string;
      extraModules: Record<string, unknown>;
    };
    const modRes = await send({
      id: 10,
      action: 'run',
      source: modPayload.source,
      stdin: '',
      args: [],
      extraModules: modPayload.extraModules,
    }) as unknown as { ok: boolean; stdout?: string; stderr: string };
    assert.equal(modRes.ok, true, modRes.stderr);
    assert.equal(modRes.stdout, modPayload.output);

    const gradePass = await send({
      id: 11,
      action: 'grade',
      source: 'io := import "core/io";\nn := io.inputInt();\nio.outputLine(n * 2);',
      cases: [
        { name: 'vis-5', stdin: '5\n', args: [], expectedStdout: '10\n', hidden: false },
        { name: 'hid-neg3', stdin: '-3\n', args: [], expectedStdout: '-6\n', hidden: true },
      ],
    }) as unknown as {
      ok: boolean;
      action: string;
      allPassed: boolean;
      results: Array<{ passed: boolean; hidden: boolean; expectedStdout?: string; actualStdout?: string }>;
    };
    assert.equal(gradePass.ok, true);
    assert.equal(gradePass.action, 'grade');
    assert.equal(gradePass.allPassed, true);
    assert.equal(gradePass.results.length, 2);
    assert.equal(gradePass.results[0]?.passed, true);
    assert.equal(gradePass.results[0]?.expectedStdout, '10\n');
    assert.equal(gradePass.results[0]?.actualStdout, '10\n');
    assert.equal(gradePass.results[1]?.passed, true);
    assert.equal(gradePass.results[1]?.hidden, true);
    assert(!('expectedStdout' in (gradePass.results[1] ?? {})));
    assert(!('actualStdout' in (gradePass.results[1] ?? {})));

    const gradeFail = await send({
      id: 12,
      action: 'grade',
      source: 'io := import "core/io";\nn := io.inputInt();\nio.outputLine(n * 2);',
      cases: [
        { name: 'vis-wrong', stdin: '5\n', args: [], expectedStdout: '99\n', hidden: false },
      ],
    }) as unknown as { ok: boolean; allPassed: boolean; results: Array<{ passed: boolean; actualStdout?: string }> };
    assert.equal(gradeFail.ok, true);
    assert.equal(gradeFail.allPassed, false);
    assert.equal(gradeFail.results[0]?.passed, false);
    assert.equal(gradeFail.results[0]?.actualStdout, '10\n');

    const gradeErr = await send({
      id: 13,
      action: 'grade',
      source: 'io := import "core/io";\nio.outputLine(nope);',
      cases: [
        { name: 'vis-err', stdin: '', args: [], expectedStdout: '0\n', hidden: false },
      ],
    }) as unknown as { ok: boolean; allPassed: boolean; stderr: string };
    assert.equal(gradeErr.ok, false);
    assert.equal(gradeErr.allPassed, false);
    assert(gradeErr.stderr.includes('nope'));
  } finally {
    (globalThis as unknown as { self?: unknown }).self = prevSelf;
    globalThis.fetch = prevFetch;
  }
});

test('formatCodeView filters TS and C output for Program, Portable, and Full modes', () => {
  const out = join(root, 'dist', 'site');
  const sample = JSON.parse(readFileSync(join(out, 'playground', 'samples', 'scan-arithmetic.json'), 'utf8')) as { ts: string };

  const programTs = formatCodeView(sample.ts, 'ts', 'program');
  assert(!programTs.includes('declare const process'));
  assert(!programTs.includes('liteFn$lib$core$int$intAdd'));
  assert(!programTs.includes('let lite$out = "";'));
  assert(programTs.includes('function isDigit('));
  assert(programTs.includes('const line'));
  assert(!programTs.includes('function liteFn_isDigit'));
  assert(!programTs.includes('const lite_line'));

  const portableTs = formatCodeView(sample.ts, 'ts', 'portable');
  assert(!portableTs.includes('declare const process'));
  assert(portableTs.includes('export function main'));
  assert(portableTs.includes('function liteFn_isDigit('));
  assert(portableTs.includes('const lite_line'));

  const sumLoop = JSON.parse(readFileSync(join(out, 'playground', 'samples', 'sum-loop.json'), 'utf8')) as { ts: string };
  const sumProgram = formatCodeView(sumLoop.ts, 'ts', 'program');
  assert(sumProgram.includes('while (true)'));
  assert(!sumProgram.includes('Boolean(true)'));
  assert(sumProgram.includes('if (sum === 15n)'));
  assert(sumProgram.includes('lite$emit("sum(1..5) =" + " " + sum.toString(), "\\n")'));
  const sumPortable = formatCodeView(sumLoop.ts, 'ts', 'portable');
  assert(sumPortable.includes('if (lite_sum === 15n)'));

  assert.equal(formatCodeView(sample.ts, 'ts', 'full'), sample.ts);

  const sampleC = [
    '#include <stdio.h>',
    'static const size_t lt_int_lines[] = {0, 10};',
    'static const char *lt_int_source = "a.lts:";',
    'int main(void) {',
    '    int64_t lite_x = INT64_C(42);',
    '    (void)lite_x;',
    '    return 0;',
    '}',
  ].join('\n');
  const programC = formatCodeView(sampleC, 'c', 'program');
  assert(!programC.includes('#include'));
  assert(!programC.includes('(void)lite_x;'));
  assert(programC.startsWith('int main(void) {'));
  assert(programC.includes('int64_t x = INT64_C(42);'));

  const portableC = formatCodeView(sampleC, 'c', 'portable');
  assert(portableC.includes('#include <stdio.h>'));
  assert(!portableC.includes('(void)lite_x;'));
  assert(portableC.includes('int64_t lite_x = INT64_C(42);'));
  assert.equal(formatCodeView(sampleC, 'c', 'full'), sampleC);
});

test('formatCodeView simplifies Program identifiers without collisions on TS and C', () => {
  const tsSource = [
    'declare const process: { exit(code: number): never };',
    'function liteFn$left$util$tag(): string { return "L"; }',
    'function liteFn$right$util$tag(): string { return "R"; }',
    'export function main(lite$write?: (text: string) => void): string {',
    '    let lite$out = "";',
    '    function lite$emit(text: string): void {',
    '        if (lite$write === undefined) lite$out += text;',
    '        else lite$write(text);',
    '    }',
    '    void lite$emit;',
    '    const lite$m$left$util$val = 10n;',
    '    void lite$m$left$util$val;',
    '    const lite$m$right$util$val = 20n;',
    '    void lite$m$right$util$val;',
    '    function liteFn$left$util$tag(): string { return "L"; }',
    '    void liteFn$left$util$tag;',
    '    const lite_x = 1n;',
    '    const lite_x_2 = 2n;',
    '    const lite_class = 3n;',
    '    const lite_Number = 4n;',
    '    const lite_pair = { x: lite_x, y: 1n };',
    '    {',
    '        const lite_x$2 = 5n;',
    '        const lite_msg = "lite_x liteFn_foo lt_s2_x";',
    '        lite$emit((lite_x$2 + lite_x_2 + lite_class + lite_Number + lite_pair.x + lite$m$left$util$val + lite$m$right$util$val).toString() + liteFn$left$util$tag() + liteFn$right$util$tag() + lite_msg + "\\n");',
    '    }',
    '    return lite$out;',
    '}',
  ].join('\n');

  const tsProgram = formatCodeView(tsSource, 'ts', 'program');
  assert(!tsProgram.includes('lite$m$left$util$val = 10n'));
  assert(!tsProgram.includes('lite$m$right$util$val = 20n'));
  assert(tsProgram.includes('const x = 1n;'));
  assert(tsProgram.includes('const x_2 = 2n;'));
  assert(tsProgram.includes('const x_3 = 5n;'));
  assert(tsProgram.includes('const class_2 = 3n;'));
  assert(tsProgram.includes('const Number_2 = 4n;'));
  assert(tsProgram.includes('const pair = { x: x, y: 1n };'));
  assert(tsProgram.includes('const msg = "lite_x liteFn_foo lt_s2_x";'));
  assert(tsProgram.includes('util$val + util$val_2'));
  assert(tsProgram.includes('util$tag() + util$tag_2()'));
  assert(tsProgram.includes('pair.x'));

  const tsPortable = formatCodeView(tsSource, 'ts', 'portable');
  assert(tsPortable.includes('const lite$m$left$util$val = 10n;'));
  assert(tsPortable.includes('const lite_x = 1n;'));
  assert(tsPortable.includes('const lite_x$2 = 5n;'));

  const cSource = [
    '#include <stdio.h>',
    'static int64_t lite_divide_int(int64_t left, int64_t right, size_t at) { (void)at; return left / right; }',
    'static const char *lite_concat(const char *left, const char *right) { (void)left; return right; }',
    'int main(void) {',
    '    int status = 0;',
    '    int64_t lt_m_left_s_util__val = INT64_C(10);',
    '    (void)lt_m_left_s_util__val;',
    '    int64_t lt_m_right_s_util__val = INT64_C(20);',
    '    (void)lt_m_right_s_util__val;',
    '    int64_t lite_x = INT64_C(1);',
    '    int64_t lite_x_2 = INT64_C(2);',
    '    int64_t lite_double = INT64_C(3);',
    '    int64_t lite_status = INT64_C(4);',
    '    int64_t lite_printf = INT64_C(5);',
    '    {',
    '        int64_t lt_s2_x = INT64_C(6);',
    '        const char *lite_msg = "lite_x liteFn_foo lt_s2_x";',
    '        const char *lite_concat = lite_concat("a", lite_msg);',
    '        printf("%" PRId64 "%s\\n", lite_divide_int(lt_s2_x + lite_x_2 + lite_double + lite_status + lite_printf + lt_m_left_s_util__val + lt_m_right_s_util__val, 2, 10), lite_concat);',
    '    }',
    '    return status;',
    '}',
  ].join('\n');

  const cProgram = formatCodeView(cSource, 'c', 'program');
  assert(!cProgram.includes('lt_m_left_s_util__val ='));
  assert(!cProgram.includes('lt_m_right_s_util__val ='));
  assert(cProgram.includes('int64_t x = INT64_C(1);'));
  assert(cProgram.includes('int64_t x_2 = INT64_C(2);'));
  assert(cProgram.includes('int64_t x_3 = INT64_C(6);'));
  assert(cProgram.includes('int64_t double_2 = INT64_C(3);'));
  assert(cProgram.includes('int64_t status_2 = INT64_C(4);'));
  assert(cProgram.includes('int64_t printf_2 = INT64_C(5);'));
  assert(cProgram.includes('util_val + util_val_2'));
  assert(cProgram.includes('"lite_x liteFn_foo lt_s2_x"'));
  assert(cProgram.includes('lite_divide_int(x_3'));

  const cDivHelperOnly = [
    'int main(void) {',
    '    int status = 0;',
    '    int64_t lite_a = lite_divide_int(INT64_C(6), INT64_C(2), 10);',
    '    (void)lite_a;',
    '    const char *lite_b = lite_concat("x", "y");',
    '    (void)lite_b;',
    '    return status;',
    '}',
  ].join('\n');
  const cHelperProgram = formatCodeView(cDivHelperOnly, 'c', 'program');
  assert(cHelperProgram.includes('int64_t a = lite_divide_int('));
  assert(cHelperProgram.includes('const char *b = lite_concat('));

  const cPortable = formatCodeView(cSource, 'c', 'portable');
  assert(cPortable.includes('int64_t lt_m_left_s_util__val = INT64_C(10);'));
  assert(cPortable.includes('int64_t lt_s2_x = INT64_C(6);'));
});

test('playground inline module initializes without TDZ or ReferenceError', async () => {
  const html = readFileSync(join(root, 'dist', 'site', 'playground', 'index.html'), 'utf8');
  const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert(scriptMatch, 'missing playground inline module script');
  const scriptBody = (scriptMatch[1] ?? '')
    .replace(/^\s*import\s+\{[^}]+\}\s+from\s+"\.\/code-view\.js";\s*/m, '')
    .replace(/^\s*import\s+\{[^}]+\}\s+from\s+"\.\/editor-client\.js";\s*/m, '')
    .replace(/^\s*import\s+\{[^}]+\}\s+from\s+"\.\/highlight\.js";\s*/m, '')
    .replace(/^\s*import\s+\{[^}]+\}\s+from\s+"\.\/play-stage\.js";\s*/m, '');

  const makeEl = (id = '') => {
    const attrs = new Map<string, string>();
    const classes = new Set<string>();
    const listeners = new Map<string, Array<(ev: unknown) => void>>();
    const el = {
      id,
      value: '',
      hidden: false,
      textContent: '',
      innerHTML: '',
      title: '',
      width: 320,
      height: 200,
      scrollTop: 0,
      scrollLeft: 0,
      selectionStart: 0,
      selectionEnd: 0,
      dataset: { tab: 'output', mode: 'program' } as Record<string, string>,
      style: { setProperty() {} },
      classList: {
        add(c: string) { classes.add(c); },
        remove(c: string) { classes.delete(c); },
        contains(c: string) { return classes.has(c); },
        toggle(c: string, force?: boolean) {
          const next = force ?? !classes.has(c);
          if (next) classes.add(c); else classes.delete(c);
          return next;
        },
      },
      setAttribute(k: string, v: string) { attrs.set(k, String(v)); },
      getAttribute(k: string) { return attrs.get(k) ?? null; },
      addEventListener(type: string, fn: (ev: unknown) => void) {
        const list = listeners.get(type) ?? [];
        list.push(fn);
        listeners.set(type, list);
      },
      trigger(type: string, ev: unknown = {}) {
        for (const fn of listeners.get(type) ?? []) fn(ev);
      },
      focus() {},
      closest() { return makeEl('closest'); },
      querySelector() { return makeEl('qs'); },
      querySelectorAll() { return []; },
      getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 400 }; },
      getContext() {
        return {
          createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
          putImageData() {},
        };
      },
      setPointerCapture() {},
      hasPointerCapture() { return false; },
      releasePointerCapture() {},
      setRangeText() {},
    };
    return el;
  };

  const els = new Map<string, ReturnType<typeof makeEl>>();
  const docEl = {
    body: makeEl('body'),
    getElementById(id: string) {
      let el = els.get(id);
      if (!el) { el = makeEl(id); els.set(id, el); }
      return el;
    },
    addEventListener() {},
    querySelector() { return makeEl('doc-qs'); },
    querySelectorAll(sel: string) {
      if (sel === '.pg-tab') return ['output', 'ts', 'c', 'canvas'].map(tab => {
        const el = makeEl(`tab-${tab}`);
        el.dataset = { tab };
        return el;
      });
      if (sel === '.code-mode-btn') return ['program', 'portable', 'full'].map(mode => {
        const el = makeEl(`mode-${mode}`);
        el.dataset = { mode };
        return el;
      });
      return [];
    },
  };

  const sampleJsonPath = join(root, 'dist', 'site', 'playground', 'samples');
  const firstSampleId = showcaseSamples[0]!.id;
  const replacedUrls: string[] = [];
  const storedSnips: Array<{ id: string; title: string; code: string; stdin: string; args: string; origin: string }> = [];
  const mockWin = {
    location: { href: `https://example.test/playground/?sample=${firstSampleId}`, search: `?sample=${firstSampleId}`, hash: '' },
    history: {
      replaceState(_state: unknown, _title: string, url: URL | string) {
        replacedUrls.push(String(url));
      },
    },
    localStorage: { getItem: () => null, setItem() {} },
    LiteSnips: {
      list: () => storedSnips,
      get: (id: string) => storedSnips.find(s => s.id === id) ?? null,
      saveNew: (d: { title: string; code: string; stdin?: string; args?: string; origin?: string }) => {
        const entry = {
          id: '019335a1-0000-7000-8000-000000000001',
          title: d.title,
          code: d.code,
          stdin: d.stdin ?? '',
          args: d.args ?? '',
          origin: d.origin ?? 'playground',
        };
        storedSnips.unshift(entry);
        return entry;
      },
      update: (id: string, p: { title?: string; code?: string; stdin?: string; args?: string }) => {
        const hit = storedSnips.find(s => s.id === id);
        if (!hit) return null;
        if (p.title !== undefined) hit.title = p.title;
        if (p.code !== undefined) hit.code = p.code;
        if (p.stdin !== undefined) hit.stdin = p.stdin;
        if (p.args !== undefined) hit.args = p.args;
        return hit;
      },
      remove: () => false,
      clear: () => { storedSnips.length = 0; },
    },
    navigator: {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    setTimeout,
    clearTimeout,
  };

  const sandbox = {
    bindCodeModeButtons,
    bindLiteEditor,
    bindSplitPane,
    encodeSharePayload,
    decodeSharePayload,
    createPlayStage,
    createWorkerClient,
    formatCodeView,
    highlightLite,
    highlightTs,
    highlightC,
    document: docEl,
    window: mockWin,
    navigator: mockWin.navigator,
    URL,
    URLSearchParams,
    Map,
    Set,
    Array,
    Number,
    String,
    Boolean,
    Math,
    Object,
    Promise,
    Error,
    BigInt,
    Uint8ClampedArray,
    Uint32Array,
    performance: { now: () => 0 },
    requestAnimationFrame: mockWin.requestAnimationFrame,
    cancelAnimationFrame: mockWin.cancelAnimationFrame,
    setTimeout,
    clearTimeout,
    Worker: class { addEventListener() {} postMessage() {} },
    fetch: async (url: string) => {
      const m = String(url).match(/\/([^/]+\.json)$/);
      const sampleFile = m?.[1];
      if (sampleFile !== undefined && existsSync(join(sampleJsonPath, sampleFile))) {
        return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(join(sampleJsonPath, sampleFile), 'utf8')) };
      }
      return { ok: false, status: 404 };
    },
  };

  runInNewContext(`(async () => {\n${scriptBody}\n})()`, sandbox);
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(els.get('pg-pause')?.getAttribute('aria-pressed'), 'false');
  const saveBtn = els.get('pg-save-snip');
  const resetBtnEl = els.get('pg-reset');
  const editor = els.get('pg-editor');
  assert(saveBtn && resetBtnEl && editor);
  assert.equal(saveBtn.hidden, true, 'Save button should stay hidden when editor matches loaded sample');
  assert.equal(resetBtnEl.hidden, true, 'Reset button should stay hidden when editor matches loaded sample');
  editor.value += '\n/* edited */\n';
  editor.trigger('input');
  assert.equal(saveBtn.hidden, false, 'Save button should appear once code is modified');
  assert.equal(resetBtnEl.hidden, false, 'Reset button should appear once code is modified');
  saveBtn.trigger('click');
  assert.equal(saveBtn.hidden, true, 'Save button should hide again right after saving');
  assert.equal(resetBtnEl.hidden, true, 'Reset button should hide again right after saving');
  assert.equal(storedSnips.length, 1);
  assert(
    replacedUrls.at(-1)?.includes('?snip=019335a1-0000-7000-8000-000000000001'),
    `expected URL to switch to saved UUIDv7 snip, got ${replacedUrls.at(-1)}`,
  );
  els.get('pg-share')?.trigger('click');
  assert(replacedUrls.at(-1)?.includes('#code='), `expected share button to encode #code= URL, got ${replacedUrls.at(-1)}`);
});

test('shared UI blocks and editor client bind highlighting, scroll sync, Tab indentation, and mode buttons', () => {
  const blockHtml = renderCodeEditorBlock({
    textareaId: 'demo-editor',
    ariaLabel: 'Demo editor',
    preId: 'demo-pre',
    preCodeId: 'demo-code',
    minHeight: '290px',
    initialSource: 'x := 1 < 2',
    initialHtml: highlightLite('x := 1 < 2'),
  });
  assert(blockHtml.includes('class="pg-editor-wrap" style="min-height: 290px;"'));
  assert(blockHtml.includes('<pre id="demo-pre" class="pg-editor-pre" aria-hidden="true"><code id="demo-code">'));
  assert(blockHtml.includes('<textarea id="demo-editor" class="pg-editor-input" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Demo editor">x := 1 &lt; 2</textarea>'));

  const modesHtml = renderCodeModeBar({ id: 'demo-modes', buttonIdPrefix: 'demo-' });
  assert(modesHtml.includes('id="demo-modes" class="code-modes" hidden'));
  assert(modesHtml.includes('id="demo-program"'));
  assert(modesHtml.includes('data-mode="portable" aria-pressed="false"'));
  assert(modesHtml.includes('id="demo-full"'));

  const listeners = new Map<string, Array<(ev: unknown) => void>>();
  const preParent = { scrollTop: 0, scrollLeft: 0 };
  const preCode = { innerHTML: '', parentElement: preParent };
  const editor = {
    value: 'x := 1',
    scrollTop: 0,
    scrollLeft: 0,
    selectionStart: 6,
    selectionEnd: 6,
    setRangeText(rep: string, s: number, e: number) {
      this.value = this.value.slice(0, s) + rep + this.value.slice(e);
      this.selectionStart = s + rep.length;
      this.selectionEnd = this.selectionStart;
    },
    addEventListener(type: string, fn: (ev: unknown) => void) {
      const list = listeners.get(type) ?? [];
      list.push(fn);
      listeners.set(type, list);
    },
  };
  const emit = (type: string, ev: unknown = {}) => {
    for (const fn of listeners.get(type) ?? []) fn(ev);
  };

  let runs = 0;
  let shiftRuns = 0;
  let inputs: Array<[string, boolean]> = [];
  const ctrl = bindLiteEditor({
    editor,
    preCode,
    highlight: highlightLite,
    indent: '    ',
    onInput: (src, fromTab) => { inputs.push([src, fromTab]); },
    onRun: () => { runs += 1; },
    onShiftRun: () => { shiftRuns += 1; },
  });

  ctrl.setValue('a := 10');
  assert(preCode.innerHTML.includes('10'));
  editor.scrollTop = 42;
  editor.scrollLeft = 12;
  emit('scroll');
  assert.equal(preParent.scrollTop, 42);
  assert.equal(preParent.scrollLeft, 12);

  editor.selectionStart = 7;
  editor.selectionEnd = 7;
  let prevented = false;
  emit('keydown', { key: 'Tab', preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(editor.value, 'a := 10    ');
  assert.deepEqual(inputs, [['a := 10    ', true]]);

  emit('keydown', { key: 'Enter', metaKey: true, preventDefault() {} });
  emit('keydown', { key: 'Enter', ctrlKey: true, shiftKey: true, preventDefault() {} });
  assert.equal(runs, 1);
  assert.equal(shiftRuns, 1);

  const modeClicks = new Map<string, () => void>();
  const modeAttrs = new Map<string, Record<string, string>>();
  const buttons = ['program', 'portable', 'full'].map(mode => ({
    dataset: { mode },
    setAttribute(k: string, v: string) {
      const rec = modeAttrs.get(mode) ?? {};
      rec[k] = v;
      modeAttrs.set(mode, rec);
    },
    addEventListener(type: string, fn: () => void) {
      if (type === 'click') modeClicks.set(mode, fn);
    },
  }));
  let selectedMode = 'program';
  bindCodeModeButtons({ buttons, onChange: (m) => { selectedMode = m; } });
  modeClicks.get('portable')?.();
  assert.equal(selectedMode, 'portable');
  assert.equal(modeAttrs.get('portable')?.['aria-pressed'], 'true');
  assert.equal(modeAttrs.get('program')?.['aria-pressed'], 'false');
});

test('runtime/snips.js manages UUIDv7 localStorage sketches and enhances doc code blocks', () => {
  const snipsPath = join(root, 'dist', 'site', 'runtime', 'snips.js');
  const snipsJs = readFileSync(snipsPath, 'utf8');
  const storage = new Map<string, string>();
  const createdBars: Array<{ className: string; buttons: Array<{ tagName: string; href: string; textContent: string; className: string; click: () => void }> }> = [];

  const mockPre = {
    tagName: 'PRE',
    textContent: 'io := import "core/io";\nio.outputLine("Hi!");\n',
    dataset: {} as Record<string, string>,
    previousElementSibling: { tagName: 'H2', textContent: 'Your First Program' },
    parentElement: { tagName: 'DIV', previousElementSibling: null, querySelector: () => null, parentElement: { tagName: 'MAIN' } },
    getAttribute: (name: string) => (name === 'data-lang' ? 'lite' : null),
    closest: (sel: string) => (sel.includes('.doc-prose') ? { tagName: 'DIV' } : null),
    insertAdjacentElement: (_pos: string, bar: { className: string; buttons: Array<{ tagName: string; href: string; textContent: string; className: string; click: () => void }> }) => {
      createdBars.push(bar);
    },
  };

  const mockBuiltinPre = {
    tagName: 'PRE',
    textContent: 'course := "LiteLang";\n',
    dataset: {} as Record<string, string>,
    previousElementSibling: { tagName: 'H2', textContent: 'Immutable Bindings' },
    parentElement: { tagName: 'DIV', previousElementSibling: null, querySelector: () => null, parentElement: { tagName: 'MAIN' } },
    getAttribute: (name: string) => {
      if (name === 'data-lang') return 'lite';
      if (name === 'data-runnable') return 'true';
      if (name === 'data-play-href') return '../../playground/?piece=bindings-and-mutability-0';
      return null;
    },
    closest: (sel: string) => (sel.includes('.doc-prose') ? { tagName: 'DIV' } : null),
    insertAdjacentElement: (_pos: string, bar: { className: string; buttons: Array<{ tagName: string; href: string; textContent: string; className: string; click: () => void }> }) => {
      createdBars.push(bar);
    },
  };

  const mockNonRunnablePre = {
    tagName: 'PRE',
    textContent: 'math := import "./math";\n',
    dataset: {} as Record<string, string>,
    previousElementSibling: null,
    parentElement: { tagName: 'DIV', previousElementSibling: null, querySelector: () => null, parentElement: { tagName: 'MAIN' } },
    getAttribute: (name: string) => {
      if (name === 'data-lang') return 'lite';
      if (name === 'data-runnable') return 'false';
      return null;
    },
    closest: (sel: string) => (sel.includes('.doc-prose') ? { tagName: 'DIV' } : null),
    insertAdjacentElement: (_pos: string, bar: { className: string; buttons: Array<{ tagName: string; href: string; textContent: string; className: string; click: () => void }> }) => {
      createdBars.push(bar);
    },
  };

  const mockWin = {
    location: { href: 'https://example.test/docs/handbook/overview-and-setup.html', pathname: '/docs/handbook/overview-and-setup.html' },
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v); },
      removeItem: (k: string) => { storage.delete(k); },
    },
    dispatchEvent() {},
    setTimeout,
    LiteSnips: undefined as unknown as {
      STORAGE_KEY: string;
      uuidv7: () => string;
      list: () => Array<{ id: string; title: string; code: string; origin: string; environment?: string; extraModules?: Record<string, { text: string }> }>;
      get: (id: string) => { id: string; title: string; code: string; origin: string; environment?: string; extraModules?: Record<string, { text: string }> } | null;
      saveNew: (d: { title: string; code: string; origin?: string; environment?: string; extraModules?: Record<string, unknown> | null }) => { id: string; title: string; environment?: string; extraModules?: Record<string, { text: string }> };
      update: (id: string, p: { title?: string; code?: string; environment?: string; extraModules?: Record<string, unknown> | null }) => { id: string; title: string; code: string; environment?: string; extraModules?: Record<string, { text: string }> } | null;
      remove: (id: string) => boolean;
      clear: () => void;
    },
  };

  const makeMockNode = (tag: string) => {
    const children: unknown[] = [];
    const listeners: Record<string, Array<() => void>> = {};
    const node = {
      tagName: tag.toUpperCase(),
      type: '',
      href: '',
      className: '',
      textContent: '',
      dataset: {} as Record<string, string>,
      buttons: children,
      classList: { add() {}, remove() {} },
      appendChild(ch: unknown) { children.push(ch); },
      addEventListener(ev: string, fn: () => void) {
        (listeners[ev] ??= []).push(fn);
      },
      click() {
        for (const fn of listeners['click'] ?? []) fn();
      },
    };
    return node;
  };

  const sandbox = {
    window: mockWin,
    document: {
      readyState: 'complete',
      title: 'Overview & Setup — Docs — Lite',
      body: { dataset: { basePath: '../../' } },
      querySelector: () => ({ textContent: 'Overview & Setup' }),
      querySelectorAll: (sel: string) => (sel === 'pre.code-block' ? [mockPre, mockBuiltinPre, mockNonRunnablePre] : []),
      createElement: (tag: string) => makeMockNode(tag),
      addEventListener() {},
    },
    navigator: {},
    crypto: globalThis.crypto,
    CustomEvent: class {
      type: string;
      init: unknown;
      constructor(type: string, init?: unknown) {
        this.type = type;
        this.init = init;
      }
    },
    URLSearchParams,
    Uint8Array,
    Date,
    Math,
    Array,
    String,
    JSON,
    setTimeout,
  };

  runInNewContext(snipsJs, sandbox);
  const api = mockWin.LiteSnips;
  assert(api, 'window.LiteSnips should be initialized');
  const id = api.uuidv7();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  const saved = api.saveNew({
    title: 'First',
    code: 'h := import "./helpers/math-stats.lts";',
    origin: 'learn:learn.modules.visibility.modules-and-visibility',
    environment: 'cli',
    extraModules: { './helpers/math-stats.lts': { path: 'helpers/math-stats.lts', display: 'helpers/math-stats.lts', identity: 'id1', text: 'pub X := 1;\n' } },
  });
  assert.match(saved.id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(api.get(saved.id)?.environment, 'cli');
  assert.equal(api.get(saved.id)?.extraModules?.['./helpers/math-stats.lts']?.text, 'pub X := 1;\n');
  api.update(saved.id, { title: 'Renamed First', code: 'io.outputLine(1);' });
  assert.equal(api.get(saved.id)?.title, 'Renamed First');
  assert.equal(api.get(saved.id)?.code, 'io.outputLine(1);');
  assert.equal(api.get(saved.id)?.extraModules?.['./helpers/math-stats.lts']?.text, 'pub X := 1;\n');

  const libJson = JSON.parse(readFileSync(join(root, 'dist', 'site', 'playground', 'library.json'), 'utf8')) as Array<{
    slug: string;
    file: string;
    environment?: string;
    extraModules?: Record<string, unknown>;
  }>;
  const modEx = libJson.find(entry => entry.file === 'language/examples/modules/core/modules-and-hashing.lts');
  assert(modEx?.extraModules && './helpers/stats-module.lts' in modEx.extraModules, 'expected modules-and-hashing helper extraModules in library.json');
  const cliLesson = libJson.find(entry => entry.file === 'language/showcases/modules/filesystem/files-paths-and-cleanup.lts');
  assert.equal(cliLesson?.environment, 'cli', 'expected files-paths-and-cleanup to carry environment=cli in library.json');

  assert.equal(createdBars.length, 3);
  const runBtn = createdBars[0]!.buttons.find(b => b.textContent.includes('Run'));
  const copyBtn = createdBars[0]!.buttons.find(b => b.textContent === 'Copy');
  const saveBtn = createdBars[0]!.buttons.find(b => b.textContent === 'Save');
  const playBtn = createdBars[0]!.buttons.find(b => b.textContent.includes('Open in Play'));
  assert(runBtn, 'expected inline Run button on Lite code block');
  assert(copyBtn, 'expected Copy button on Lite code block');
  assert(saveBtn, 'expected Save button on Lite code block');
  assert(playBtn, 'expected Open in Play button on fallback Lite code block');
  assert.equal(playBtn.tagName, 'BUTTON');

  const builtinBar = createdBars[1]!;
  const builtinPlayLink = builtinBar.buttons.find(b => b.textContent.includes('Open in Play'));
  assert(builtinPlayLink, 'expected Open in Play link on builtin Docs/Handbook code block');
  assert.equal(builtinPlayLink.tagName, 'A');
  assert.equal(builtinPlayLink.href, '../../playground/?piece=bindings-and-mutability-0');
  assert.equal(api.list().length, 1, 'builtin Play link must not create localStorage ?snip= sketches');

  const nonRunnableBar = createdBars[2]!;
  assert.deepEqual(nonRunnableBar.buttons.map(b => b.textContent), ['Copy']);

  playBtn.click();
  assert(mockWin.location.href.startsWith('../../playground/?snip='), mockWin.location.href);
  const loadedId = decodeURIComponent(mockWin.location.href.split('?snip=')[1]!);
  assert.equal(api.get(loadedId)?.title, 'Your First Program');
  assert(api.get(loadedId)?.code.includes('io.outputLine("Hi!");'));

  assert.equal(api.remove(saved.id), true);
  assert.equal(api.list().length, 1);
  api.clear();
  assert.equal(api.list().length, 0);
});

test('stripLiteTs and formatCodeView handle construct-level finally and abrupt unwinding', () => {
  const compiler = sharedTsCompiler();
  const runStripped = (tsSource: string) => {
    const js = stripLiteTs(tsSource);
    let stdout = '';
    let stderr = '';
    const fakeProcess = {
      argv: ['node', 'playground.js'],
      exit(code: number): never {
        throw new Error(`EXIT:${code}`);
      },
      getBuiltinModule(name: string) {
        assert.equal(name, 'node:fs');
        return {
          readSync: () => 0,
          writeSync(fd: number, text: string): number {
            if (fd === 1) stdout += text;
            else if (fd === 2) stderr += text;
            return text.length;
          },
        };
      },
    };
    const fn = new Function('process', `${js.replace(/export function main\b/, 'function main')}\nreturn main();`) as (
      p: typeof fakeProcess,
    ) => string | undefined;
    try {
      const ret = fn(fakeProcess);
      return { exitCode: null as number | null, stdout: stdout + (ret ?? ''), stderr };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('EXIT:')) {
        return { exitCode: Number(msg.slice(5)), stdout, stderr };
      }
      throw err;
    }
  };

  const cleanupSource = readFileSync(join(root, 'language/verifications/features/control/unwinding/finally-cleanup.lts'), 'utf8');
  const cleanupTs = compileBuiltCompiler(compiler, { name: 'finally-cleanup.lts', text: cleanupSource });
  assert.equal(cleanupTs.status, 0, cleanupTs.stderr.toString());
  const cleanupRes = runStripped(cleanupTs.stdout.toString());
  assert.equal(cleanupRes.exitCode, null);
  assert.equal(cleanupRes.stdout, '1\n2\nthen\nfinally\ncond\n1\nreturn-cleanup\n5\n');
  assert.equal(cleanupRes.stderr, '');

  const faultSource = [
    'io := import "core/io";',
    'var zero := 0;',
    '{',
    '    { io.outputLine(1 / zero); } finally { io.outputLine("inner"); }',
    '} finally {',
    '    io.outputLine("outer");',
    '}',
    '',
  ].join('\n');
  const faultCompiled = compileBuiltCompiler(compiler, { name: 'fault.lts', text: faultSource });
  assert.equal(faultCompiled.status, 0, faultCompiled.stderr.toString());
  const faultTs = faultCompiled.stdout.toString();

  const programView = formatCodeView(faultTs, 'ts', 'program');
  assert(!programView.includes('lite$abrupt'), programView);
  assert(!programView.includes('return lite$out;'), programView);

  const faultRes = runStripped(faultTs);
  assert.equal(faultRes.exitCode, 1);
  assert.equal(faultRes.stdout, 'inner\nouter\n');
  assert.equal(faultRes.stderr, 'fault.lts:4:23: ArithmeticPanic: division by zero\n');
});

test('editor-client helpers: line numbers, error parsing, auto-indent, outdent, share codec, and split pane', () => {
  assert.deepEqual(parseErrorLines('playground.lts:4:9: unknown name\nplayground.lts:12:1: mismatch\nplayground.lts:4:10: dup'), [4, 12]);
  assert.deepEqual(parseErrorLines('Syntax error on line 7'), [7]);
  assert.deepEqual(parseErrorLines(''), []);

  const gutterHtml = renderLineNumbersHtml(4, [3], 2);
  assert(gutterHtml.includes('<span class="ed-ln">1</span>'));
  assert(gutterHtml.includes('<span class="ed-ln is-active">2</span>'));
  assert(gutterHtml.includes('<span class="ed-ln is-error">3</span>'));
  assert(gutterHtml.includes('<span class="ed-ln">4</span>'));

  assert.deepEqual(computeCursorLineCol('ab\ncde\nf', 5), { line: 2, col: 3 });

  const openBrace = computeAutoIndent('main := fn() {}', 14, '    ');
  assert.equal(openBrace.text, '\n    \n');
  assert.equal(openBrace.cursorOffset, 5);

  const afterBrace = computeAutoIndent('    if ok {', 11, '    ');
  assert.equal(afterBrace.text, '\n        ');

  const outdented = computeOutdent('    a := 1;\n        b := 2;', 4, 18, '    ');
  assert(outdented !== null);
  assert.equal(outdented.value, 'a := 1;\n    b := 2;');

  const encoded = encodeSharePayload({ title: 'Demo Aé', code: 'io.outputLine("Hi!");', stdin: '1\n', args: 'x' });
  assert(!encoded.includes('+') && !encoded.includes('/') && !encoded.includes('='));
  assert.deepEqual(decodeSharePayload(encoded), { title: 'Demo Aé', code: 'io.outputLine("Hi!");', stdin: '1\n', args: 'x' });
  assert.equal(decodeSharePayload('!!!bad!!!'), null);

  const splitHandleHtml = renderSplitHandle({ id: 'demo-split', ariaLabel: 'Resize demo' });
  assert(splitHandleHtml.includes('id="demo-split"'));
  assert(splitHandleHtml.includes('role="separator"'));

  const listeners = new Map<string, Array<(ev: unknown) => void>>();
  const attrs = new Map<string, string>();
  const props = new Map<string, string>();
  const stored = new Map<string, string>([['demo.split', '62']]);
  const splitCtrl = bindSplitPane({
    splitEl: {
      classList: { add() {}, remove() {} },
      setAttribute(k, v) { attrs.set(k, v); },
      addEventListener(type, fn) { (listeners.get(type) ?? (() => { const a: Array<(ev: unknown) => void> = []; listeners.set(type, a); return a; })()).push(fn); },
    },
    containerEl: {
      style: { setProperty(k, v) { props.set(k, v); } },
      getBoundingClientRect: () => ({ left: 0, width: 1000 }),
    },
    storageKey: 'demo.split',
    storage: {
      getItem: (k) => stored.get(k) ?? null,
      setItem: (k, v) => { stored.set(k, v); },
    },
  });
  assert.equal(props.get('--pg-split'), '62%');
  assert.equal(attrs.get('aria-valuenow'), '62');
  splitCtrl.setPct(99, true);
  assert.equal(props.get('--pg-split'), '78%');
  assert.equal(stored.get('demo.split'), '78');
});

test('play-stage helpers: renderFrameToImageData and mapPointerToCell', () => {
  const buf = new Uint8ClampedArray(4 * 4 * 4);
  renderFrameToImageData({ width: 4, height: 4, ops: [1, 0xff112233, 2, 1, 1, 2, 2, 0xff445566] }, buf, 4, 4);
  // Clear pixel (0, 0) ARGB 0xff112233 -> RGBA (0x11, 0x22, 0x33, 0xff)
  assert.deepEqual([buf[0], buf[1], buf[2], buf[3]], [0x11, 0x22, 0x33, 0xff]);
  // Rect pixel (1, 1) -> offset (1 * 4 + 1) * 4 = 20 -> RGBA (0x44, 0x55, 0x66, 0xff)
  assert.deepEqual([buf[20], buf[21], buf[22], buf[23]], [0x44, 0x55, 0x66, 0xff]);

  renderFrameToImageData({ width: 2, height: 2, pixels: [0x80aabbcc, 0, 0, 0] }, buf, 2, 2);
  assert.deepEqual([buf[0], buf[1], buf[2], buf[3]], [0xaa, 0xbb, 0xcc, 0x80]);

  const cell = mapPointerToCell(150, 100, { left: 0, top: 0, width: 300, height: 200 }, 30, 20);
  assert.deepEqual(cell, { x: 15, y: 10 });
  const letterboxed = mapPointerToCell(100, 100, { left: 0, top: 0, width: 400, height: 200 }, 20, 20);
  assert.deepEqual(letterboxed, { x: 0, y: 10 });
});

test('academy-state runtime initializes window.LiteAcademy and aggregates progress', () => {
  const storage = new Map<string, string>([
    ['lite-learn-progress-v1', JSON.stringify({ 'learn.a': true, 'learn.b': false })],
    ['lite-gym-progress-v1', JSON.stringify({ solved: { 'gym.1': true, 'gym.2': true }, drafts: {} })],
    ['lite.snips.v1', JSON.stringify([{ id: '1', code: 'x' }])],
  ]);
  const hbNav = {
    attrs: new Map<string, string>([['data-handbook-nav-slug', 'tuples-arrays-lists-and-aliases']]),
    classes: new Set<string>(),
    getAttribute(k: string) { return this.attrs.get(k) ?? null; },
    classList: {
      add(c: string) { hbNav.classes.add(c); },
      remove(c: string) { hbNav.classes.delete(c); },
    },
    addEventListener() {},
  };
  const resumeBar = { hidden: true };
  const lessonsStat = { textContent: '' };
  const gymStat = { textContent: '' };
  const hbStat = { textContent: '' };
  const hbProgLabel = { textContent: '' };
  const hbProgFill = { style: { width: '' } };
  const snipsStat = { textContent: '' };
  const mockWin: Record<string, unknown> = {
    location: { href: 'https://example.test/docs/handbook/tuples-arrays-lists-and-aliases.html' },
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v); },
    },
  };
  const mockDoc = {
    readyState: 'complete',
    title: 'Tuples',
    body: { dataset: { basePath: '../../' }, classList: { add() {}, remove() {}, contains: () => false } },
    querySelector(sel: string) {
      if (sel === '[data-handbook-slug]') {
        return {
          getAttribute: () => 'tuples-arrays-lists-and-aliases',
          querySelector: () => ({ textContent: 'Tuples, Arrays, Lists & Aliases' }),
        };
      }
      return null;
    },
    querySelectorAll(sel: string) {
      if (sel === '[data-handbook-nav-slug]') return [hbNav];
      return [];
    },
    getElementById(id: string) {
      if (id === 'academy-resume-bar') return resumeBar;
      if (id === 'academy-stat-lessons') return lessonsStat;
      if (id === 'academy-stat-gym') return gymStat;
      if (id === 'academy-stat-handbook') return hbStat;
      if (id === 'hb-progress-label') return hbProgLabel;
      if (id === 'hb-progress-fill') return hbProgFill;
      if (id === 'academy-stat-snips') return snipsStat;
      return null;
    },
    addEventListener() {},
  };
  runInNewContext(academyClientJs, {
    window: mockWin,
    document: mockDoc,
    navigator: {},
    Date,
    Array,
    JSON,
    Set,
    setTimeout,
  });
  const academy = mockWin['LiteAcademy'] as {
    getSummary: () => { lessonsDone: number; gymSolved: number; handbookReadCount: number; snipsCount: number };
  };
  assert(academy);
  const summary = academy.getSummary();
  assert.equal(summary.lessonsDone, 1);
  assert.equal(summary.gymSolved, 2);
  assert.equal(summary.handbookReadCount, 1);
  assert.equal(summary.snipsCount, 1);
  assert(hbNav.classes.has('is-completed'));
  assert.equal(resumeBar.hidden, false);
  assert.equal(lessonsStat.textContent, '1');
  assert.equal(gymStat.textContent, '2');
  assert.equal(hbStat.textContent, '1');
  assert.equal(hbProgLabel.textContent, '1 / 7 chapters read');
  assert.equal(hbProgFill.style.width, '14%');
});

test('lite:// internal URI parser, resolver, broken-link rejection, and link-graph.json integrity', () => {
  assert.deepEqual(parseLiteUri('lite://play/double-sum'), { raw: 'lite://play/double-sum', ns: 'play', target: 'double-sum', fragment: '' });
  assert.deepEqual(parseLiteUri('lite:/doc/handbook/tuples-arrays-lists-and-aliases#tuples-labels--name-shorthand'), {
    raw: 'lite:/doc/handbook/tuples-arrays-lists-and-aliases#tuples-labels--name-shorthand',
    ns: 'handbook',
    target: 'tuples-arrays-lists-and-aliases',
    fragment: 'tuples-labels--name-shorthand',
  });
  assert.deepEqual(parseLiteUri('lite://modules/core/list#pushBack'), { raw: 'lite://modules/core/list#pushBack', ns: 'module', target: 'core/list', fragment: 'pushBack' });
  assert.equal(parseLiteUri('lite://unknown/item'), null);

  assert.equal(
    relativeWebHref('docs/handbook/tuples-arrays-lists-and-aliases.html', 'playground/?sample=nominal-records'),
    '../../playground/?sample=nominal-records',
  );

  const g = new LiteAcademyGraph({ rootDir: root, repoUrl: 'https://github.com/example/Lite' });
  g.registerNode({ uri: 'lite://handbook/tuples-arrays-lists-and-aliases', kind: 'handbook', title: 'Tuples', outPath: 'docs/handbook/tuples-arrays-lists-and-aliases.html' });
  g.setDocAnchors('lite://handbook/tuples-arrays-lists-and-aliases', ['nominal-record-types--name-shorthand']);
  g.registerNode({ uri: 'lite://doc/spec-overview', kind: 'doc', title: 'Spec', outPath: 'docs/design/spec-overview.html' });
  g.setDocAnchors('lite://doc/spec-overview', ['ls-001--source-syntax-and-evaluation']);
  g.registerNode({ uri: 'lite://brand/name', kind: 'brand', title: 'The Lite name', outPath: 'docs/brand/name.html' });
  g.setDocAnchors('lite://brand/name', ['decision']);
  g.registerNode({ uri: 'lite://brand/lite-wordmark.svg', kind: 'brand', title: 'lite-wordmark.svg', outPath: 'brand/lite-wordmark.svg' });
  g.registerNode({ uri: 'lite://learn/records-and-patterns', kind: 'learn', title: 'Records', outPath: 'learn/types/records-and-patterns.html' });
  g.registerNode({ uri: 'lite://gym/record-shorthand-destructure', kind: 'gym', title: 'Drill', outPath: 'gym/drills/record-shorthand-destructure.html' });
  g.registerNode({ uri: 'lite://play/double-sum', kind: 'play', title: 'Double', outPath: 'playground/?sample=double-sum' });
  g.registerNode({ uri: 'lite://module/core/list', kind: 'module', title: 'core/list', outPath: 'modules/core/list.html' });
  g.setModuleSymbols('lite://module/core/list', ['pushBack']);
  g.registerNode({ uri: 'lite://tool/fmt', kind: 'tool', title: 'lite fmt', outPath: 'tools/#cmd-fmt' });

  const rewritten = rewriteLiteUriHtml({
    html: '<a href="lite://play/double-sum" data-lite-uri="lite://play/double-sum">Play</a> <a href="lite:/doc/handbook/tuples-arrays-lists-and-aliases#nominal-record-types--name-shorthand" data-lite-uri="lite:/doc/handbook/tuples-arrays-lists-and-aliases#nominal-record-types--name-shorthand">Hb</a> <a href="lite://module/core/list#pushBack" data-lite-uri="lite://module/core/list#pushBack">Mod</a> <a href="lite://spec#ls-001--source-syntax-and-evaluation" data-lite-uri="lite://spec#ls-001--source-syntax-and-evaluation">Spec</a> <a href="lite://brand/name#decision" data-lite-uri="lite://brand/name#decision">Brand</a> <a href="lite://brand/lite-wordmark.svg" data-lite-uri="lite://brand/lite-wordmark.svg">Svg</a> <a href="lite://repo/igniter/.node-version" data-lite-uri="lite://repo/igniter/.node-version">Node</a>',
    outPath: 'learn/types/records-and-patterns.html',
    graph: g,
    fromUri: 'lite://learn/records-and-patterns',
  });
  assert(rewritten.includes('href="../../playground/?sample=double-sum" data-lite-kind="play"'));
  assert(rewritten.includes('href="../../docs/handbook/tuples-arrays-lists-and-aliases.html#nominal-record-types--name-shorthand" data-lite-kind="handbook"'));
  assert(rewritten.includes('href="../../modules/core/list.html#pushBack" data-lite-kind="module"'));
  assert(rewritten.includes('href="../../docs/design/spec-overview.html#ls-001--source-syntax-and-evaluation" data-lite-kind="doc"'));
  assert(rewritten.includes('href="../../docs/brand/name.html#decision" data-lite-kind="brand"'));
  assert(rewritten.includes('href="../../brand/lite-wordmark.svg" data-lite-kind="brand"'));
  assert(rewritten.includes('href="https://github.com/example/Lite/blob/main/igniter/.node-version" data-lite-kind="repo" target="_blank" rel="noopener"'));
  assert.throws(() => g.resolveUri('lite://repo/does-not-exist.txt', 'docs/index.html'), /Unresolved lite:\/\/repo target/);
  assert.throws(() => g.resolveUri('lite://repo/../secret.txt', 'docs/index.html'), /Invalid lite:\/\/repo URI/);
  assert.throws(() => g.resolveUri('lite://brand/name#missing', 'docs/index.html'), /Missing heading fragment/);
  assert.equal(g.getBacklinks('lite://module/core/list').length, 1);

  assert.deepEqual(
    extractLiteUrisFromMarkdown([
      '```markdown',
      '[ignored-fence](lite://bogus/fence)',
      '```',
      '',
      'Inline `[ignored](lite://bogus/inline)` and [`./bin/lite check`](lite://tool/check).',
      'Angle <<lite://doc/overview>> wait no: [Doc](<lite://doc/overview#frag> "Title") and [Play](lite:/play/double-sum).',
    ].join('\n')),
    ['lite://tool/check', 'lite://doc/overview#frag', 'lite:/play/double-sum'],
  );

  g.registerNode({ uri: 'lite://learn/hello-lite', kind: 'learn', title: 'Hello', outPath: 'learn/getting-started/hello-lite.html' });
  g.recordLiteUrisFromMarkdown(
    'lite://learn/hello-lite',
    'Try [`double-sum`](lite://play/double-sum) and [`fmt`](lite://tool/fmt) then [`pushBack`](lite://module/core/list#pushBack).',
    'learn/getting-started/hello-lite.html',
  );
  assert.equal(g.getBacklinks('lite://tool/fmt').length, 1);
  assert.equal(g.getBacklinks('lite://module/core/list').length, 2);
  rewriteLiteUriHtml({
    html: '<a href="lite://tool/fmt" data-lite-uri="lite://tool/fmt">fmt</a>',
    outPath: 'learn/getting-started/hello-lite.html',
    graph: g,
    fromUri: 'lite://learn/hello-lite',
  });
  assert.equal(g.getBacklinks('lite://tool/fmt').length, 1);

  assert.throws(() => g.resolveUri('lite://bogus/x', 'docs/index.html'), /Invalid lite URI/);
  assert.throws(() => g.resolveUri('lite://learn/missing', 'docs/index.html'), /Unresolved lite URI target/);
  assert.throws(() => g.resolveUri('lite://handbook/tuples-arrays-lists-and-aliases#nope', 'docs/index.html'), /Missing heading fragment/);
  assert.throws(() => g.resolveUri('lite://module/core/list#missingFn', 'docs/index.html'), /Missing module symbol/);

  const builtGraph = JSON.parse(readFileSync(join(root, 'dist', 'site', 'link-graph.json'), 'utf8')) as {
    schemaVersion: number;
    stats: { nodes: number; edges: number; byKind: Record<string, number> };
    edges: Array<{ from: string; to: string; kind: string; fragment?: string }>;
  };
  assert.equal(builtGraph.schemaVersion, 1);
  for (const kind of ['handbook', 'doc', 'brand', 'learn', 'gym', 'play', 'module', 'tool', 'gallery']) {
    assert((builtGraph.stats.byKind[kind] ?? 0) >= 1, `expected nodes for ${kind} in link-graph.json`);
  }
  assert((builtGraph.stats.byKind['brand'] ?? 0) >= 3);
  assert.equal(builtGraph.edges.filter(e => e.kind === 'markdown-link').length, 0);
  assert(builtGraph.edges.filter(e => e.kind === 'lite-uri').length >= 3000);
  assert(builtGraph.edges.some(e => e.from === 'lite://brand/name' && e.to === 'lite://doc/versioning-and-naming' && e.kind === 'lite-uri' && e.fragment === '1-canonical-names'));
  assert(builtGraph.edges.some(e => e.from === 'lite://doc/versioning-and-naming' && e.to === 'lite://brand/name' && e.kind === 'lite-uri'));
  assert(builtGraph.edges.some(e => e.from === 'lite://brand' && e.to === 'lite://brand/lite-wordmark.svg' && e.kind === 'lite-uri'));
  assert(builtGraph.edges.some(e => e.from === 'lite://doc/spec-overview' && e.to === 'lite://doc/unambiguous-meaning' && e.kind === 'lite-uri'));
  assert(builtGraph.edges.some(e => e.from === 'lite://handbook/overview-and-setup' && e.to === 'lite://play/double-sum' && e.kind === 'lite-uri'));
  assert(builtGraph.edges.some(e => e.from === 'lite://handbook/overview-and-setup' && e.to === 'lite://tool/check' && e.kind === 'lite-uri'));
  assert(builtGraph.edges.some(e => e.from === 'lite://handbook/tuples-arrays-lists-and-aliases' && e.to === 'lite://module/core/list' && e.kind === 'lite-uri' && e.fragment === 'pushBack'));
  assert(builtGraph.edges.some(e => e.from === 'lite://learn/named-calls-and-recursion' && e.to === 'lite://module/core/text' && e.kind === 'lite-uri' && e.fragment === 'textToInt'));
  assert(builtGraph.edges.some(e => e.from === 'lite://learn/arrays-and-lists' && e.to === 'lite://learn/records-and-patterns' && e.kind === 'lite-uri'));
  assert(builtGraph.edges.some(e => e.from === 'lite://learn/orb-catcher-game' && e.to === 'lite://play/play-paddle-pong' && e.kind === 'lite-uri'));
  assert(builtGraph.edges.some(e => e.from === 'lite://gym/utf8-roundtrip-count' && e.to === 'lite://module/core/unicode' && e.kind === 'lite-uri' && e.fragment === 'utf8Encode'));
  assert(builtGraph.edges.some(e => e.from === 'lite://handbook/tuples-arrays-lists-and-aliases' && e.to === 'lite://module/core/list' && e.kind === 'module-import'));
  assert(builtGraph.edges.some(e => e.from === 'lite://gym/record-shorthand-destructure' && e.to === 'lite://learn/records-and-patterns' && e.kind === 'catalog-ref'));
  assert(builtGraph.edges.some(e => e.from === 'lite://learn/records-and-patterns' && e.to === 'lite://handbook/tuples-arrays-lists-and-aliases' && e.kind === 'catalog-ref'));
});

test('validateBuiltSiteReferences catches broken files, missing fragments, unresolved attributes, search entries, and dangling graph edges', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'lite-site-refs-'));
  try {
    mkdirSync(join(scratch, 'docs'), { recursive: true });
    mkdirSync(join(scratch, 'playground'), { recursive: true });
    writeFileSync(
      join(scratch, 'index.html'),
      '<!doctype html><a href="docs/page.html#ok">Ok</a>',
    );
    writeFileSync(
      join(scratch, 'playground', 'index.html'),
      '<!doctype html><h1>Playground</h1>',
    );
    writeFileSync(
      join(scratch, 'playground', 'library.json'),
      JSON.stringify([
        { id: 'piece/valid-piece', slug: 'valid-piece', category: 'piece' },
      ]),
    );
    writeFileSync(
      join(scratch, 'docs', 'page.html'),
      '<!doctype html><h2 id="ok">Ok</h2>' +
        '<a href="../playground/?piece=valid-piece">Valid play</a>' +
        '<pre class="code-block" data-play-href="../playground/?piece=does-not-exist"></pre>' +
        '<a href="missing.html">Missing file</a>' +
        '<a href="#missing-id">Missing frag</a>' +
        '<a href="page.html#ok" data-lite-uri="lite://learn/nope">Unresolved</a>',
    );
    writeFileSync(
      join(scratch, 'search-index.json'),
      JSON.stringify([
        { kind: 'doc', title: 'Ok', subtitle: '', href: 'docs/page.html#ok', keywords: '' },
        { kind: 'doc', title: 'Bad', subtitle: '', href: 'docs/page.html#nope', keywords: '' },
      ]),
    );
    writeFileSync(
      join(scratch, 'link-graph.json'),
      JSON.stringify({
        schemaVersion: 1,
        nodes: [
          { uri: 'lite://doc/page', kind: 'doc', title: 'Page', outPath: 'docs/page.html' },
        ],
        edges: [
          { from: 'lite://doc/page', to: 'lite://doc/missing', kind: 'lite-uri' },
          { from: 'lite://doc/page', to: 'lite://doc/page', kind: 'lite-uri', fragment: 'bad-edge-frag' },
        ],
      }),
    );

    const report = validateBuiltSiteReferences(scratch);
    const reasons = report.violations.map(v => v.reason).sort();
    assert.deepEqual(
      reasons,
      [
        'dangling-graph-edge',
        'missing-file',
        'missing-fragment',
        'missing-fragment',
        'missing-graph-fragment',
        'missing-play-target',
        'unresolved-lite-uri',
      ],
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('unified Markdown docs under brand, docs, compiler, language, and repo guides use zero raw relative file links', () => {
  const skipDirs = new Set(['node_modules', 'dist', '.git']);
  const collectMd = (dirAbs: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
      if (skipDirs.has(entry.name)) continue;
      const full = join(dirAbs, entry.name);
      if (entry.isDirectory()) collectMd(full, out);
      else if (entry.name.endsWith('.md')) out.push(full);
    }
    return out;
  };

  const skipCodeSpan = (input: string, pos: number): number => {
    let run = 1;
    while (pos + run < input.length && input.charAt(pos + run) === '`') run += 1;
    let scan = pos + run;
    while (scan < input.length) {
      if (input.charAt(scan) === '\n' && input.charAt(scan + 1) === '\n') return -1;
      if (input.charAt(scan) === '`') {
        let cRun = 1;
        while (scan + cRun < input.length && input.charAt(scan + cRun) === '`') cRun += 1;
        if (cRun === run) return scan + cRun;
        scan += cRun;
        continue;
      }
      scan += 1;
    }
    return -1;
  };

  const findBracketEnd = (input: string, openPos: number): number => {
    let i = openPos + 1;
    let depth = 1;
    while (i < input.length) {
      const ch = input.charAt(i);
      if (ch === '\\' && i + 1 < input.length) { i += 2; continue; }
      if (ch === '\n' && input.charAt(i + 1) === '\n') return -1;
      if (ch === '`') {
        const end = skipCodeSpan(input, i);
        if (end >= 0) { i = end; continue; }
        while (i < input.length && input.charAt(i) === '`') i += 1;
        continue;
      }
      if (ch === '[') { depth += 1; i += 1; continue; }
      if (ch === ']') {
        depth -= 1;
        if (depth === 0) return i;
        i += 1;
        continue;
      }
      i += 1;
    }
    return -1;
  };

  const extractRawRelativeLinks = (markdown: string): string[] => {
    const lines = markdown.split(/\r?\n/);
    const kept: string[] = [];
    let fenceChar = '';
    let fenceLen = 0;
    for (const line of lines) {
      if (fenceLen === 0) {
        const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
        if (m) {
          const marker = m[1] ?? '';
          const rest = m[2] ?? '';
          const ch = marker.charAt(0);
          if (ch === '~' || !rest.includes('`')) {
            fenceChar = ch;
            fenceLen = marker.length;
            continue;
          }
        }
        kept.push(line);
      } else {
        const cm = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
        if (cm && (cm[1] ?? '').charAt(0) === fenceChar && (cm[1] ?? '').length >= fenceLen) {
          fenceChar = '';
          fenceLen = 0;
        }
      }
    }
    const prose = kept.join('\n');
    const rawRel: string[] = [];
    let i = 0;
    while (i < prose.length) {
      const ch = prose.charAt(i);
      if (ch === '\\' && i + 1 < prose.length) { i += 2; continue; }
      if (ch === '`') {
        const end = skipCodeSpan(prose, i);
        if (end >= 0) { i = end; continue; }
        while (i < prose.length && prose.charAt(i) === '`') i += 1;
        continue;
      }
      if (ch === '!' && prose.charAt(i + 1) === '[') {
        const imgEnd = findBracketEnd(prose, i + 1);
        if (imgEnd >= 0 && prose.charAt(imgEnd + 1) === '(') {
          i = imgEnd + 2;
          continue;
        }
        i += 2;
        continue;
      }
      if (ch === '[') {
        const labelEnd = findBracketEnd(prose, i);
        if (labelEnd >= 0 && prose.charAt(labelEnd + 1) === '(') {
          let p = labelEnd + 2;
          while (p < prose.length && (prose.charAt(p) === ' ' || prose.charAt(p) === '\t')) p += 1;
          let dest = '';
          if (prose.charAt(p) === '<') {
            p += 1;
            const start = p;
            while (p < prose.length && prose.charAt(p) !== '>' && prose.charAt(p) !== '\n') p += 1;
            dest = prose.slice(start, p);
          } else {
            const start = p;
            let depth = 0;
            while (p < prose.length) {
              const c = prose.charAt(p);
              if (c === '\\' && p + 1 < prose.length) { p += 2; continue; }
              if (c === '(') { depth += 1; p += 1; continue; }
              if (c === ')') {
                if (depth === 0) break;
                depth -= 1;
                p += 1;
                continue;
              }
              if (c === ' ' || c === '\t' || c === '\n' || c === '\r') break;
              p += 1;
            }
            dest = prose.slice(start, p);
          }
          if (
            dest !== '' &&
            !dest.startsWith('#') &&
            !dest.startsWith('lite://') &&
            !dest.startsWith('lite:/') &&
            !dest.startsWith('//') &&
            !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(dest)
          ) {
            rawRel.push(dest);
          }
          i = labelEnd + 1;
          continue;
        }
      }
      i += 1;
    }
    return rawRel;
  };

  const mdFiles = [
    ...collectMd(join(root, 'brand')),
    ...collectMd(join(root, 'docs')),
    ...collectMd(join(root, 'compiler')),
    ...collectMd(join(root, 'language')),
    ...collectMd(join(root, 'igniter')),
    join(root, 'samples', 'README.md'),
    join(root, 'lib', 'README.md'),
    join(root, 'editors', 'vscode', 'README.md'),
    join(root, 'CONTRIBUTING.md'),
    join(root, 'TASKS.md'),
    join(root, 'ISSUES-BY-TOPIC.md'),
  ].sort();

  const leftovers: string[] = [];
  for (const fullPath of mdFiles) {
    const rawRels = extractRawRelativeLinks(readFileSync(fullPath, 'utf8'));
    for (const dest of rawRels) {
      leftovers.push(`${fullPath.slice(root.length + 1)} -> ${dest}`);
    }
  }
  assert.deepEqual(leftovers, [], `Found non-lite:// relative links:\n${leftovers.join('\n')}`);
});

test('play keepalive preserves Play bridge exports and callbacks across -O0..-O3 without leaking', () => {
  const snake = playSamples.find(s => s.id === 'play-grid-snake');
  assert(snake !== undefined, 'missing play-grid-snake sample');
  const src = readFileSync(resolve(root, snake.file), 'utf8');
  const ka = appendPlayKeepalive(src);
  assert(ka !== null, 'expected Play keepalive wrapper');
  const compiler = buildTsCompiler();
  for (const lv of [0, 1, 2, 3]) {
    const res = compileBuiltCompiler(compiler, { text: ka, name: snake.file, cwd: root, options: [`-O${lv}`] });
    assert.equal(res.status, 0, `-O${lv} compile failed: ${res.stderr.toString('utf8')}`);
    const stripped = stripPlayKeepaliveTs(res.stdout.toString('utf8'));
    assert.match(stripped, /\bfunction liteFn\$[a-zA-Z0-9_$]+\$litePlayCanvasSnapshot\b/, `-O${lv} missing litePlayCanvasSnapshot`);
    assert.match(stripped, /\bfunction liteFn\$[a-zA-Z0-9_$]+\$litePlayCanvasPixels\b/, `-O${lv} missing litePlayCanvasPixels`);
    assert.match(stripped, /\bfunction liteFn\$[a-zA-Z0-9_$]+\$litePlayCanvasTakeOps\b/, `-O${lv} missing litePlayCanvasTakeOps`);
    assert.match(stripped, /\bfunction liteFn\$[a-zA-Z0-9_$]+\$litePlayAudioDrain\b/, `-O${lv} missing litePlayAudioDrain`);
    assert.match(stripped, /\bfunction liteFn_onCanvasInit\b/, `-O${lv} missing onCanvasInit`);
    assert(!stripped.includes('litePlayKeepalive99'), `-O${lv} leaked litePlayKeepalive99`);
    assert(!stripped.includes('if (false)'), `-O${lv} leaked if (false) keepalive block`);
  }
});
