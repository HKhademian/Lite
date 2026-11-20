/** Generates `/learn/` interactive ability curriculum, project tutorials, and live lesson runner pages. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compileBuiltCompiler, type CompilerBuild } from '../igniter/artifacts.ts';
import { renderDocuments, type ModuleApiDoc, type RenderedDocument } from './docs-client.ts';
import { captureCanvasPreview } from './canvas-preview.ts';
import { renderPage, rootDir, type SourceRevision } from './chrome.ts';
import { buildDocOutMap, postprocessMarkdownHtml } from './docs-pages.ts';
import type { ShowcaseSample } from './groups.ts';
import { escapeHtml, highlightLite } from './highlight.ts';
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

type CompiledLesson = Readonly<{
  track: LearnTrackSpec;
  lesson: LearnLessonSpec;
  outPath: string;
  guideTitle: string;
  guideHtml: string;
  source: string;
  sourceHtml: string;
  generatedTs: string;
  output: string;
  previewSvg?: string;
  extraModules: Readonly<Record<string, Readonly<{ path: string; display: string; identity: string; text: string }>>>;
}>;

export type LearnBuildOutput = Readonly<{
  files: ReadonlyMap<string, string>;
  searchEntries: readonly SearchEntry[];
  lessonCount: number;
  tutorialCount: number;
}>;

const ENV_LABELS: Readonly<Record<LearnLessonSpec['environment'], Readonly<{ label: string; pillClass: string }>>> = {
  universal: { label: 'Browser + CLI', pillClass: 'status-pill-universal' },
  play: { label: 'Lite Play', pillClass: 'status-pill-play' },
  cli: { label: 'CLI / Host OS', pillClass: 'status-pill-cli' },
};

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
    const modRecord = {
      path: hm.file,
      display: hm.file,
      identity: '',
      text: helperText,
    };
    extraModules[hm.spec] = modRecord;
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
  return {
    source,
    generatedTs,
    output,
    ...(previewSvg !== undefined ? { previewSvg } : {}),
    extraModules,
  };
}

function renderLearnIndexPage(
  catalog: LearnCatalog,
  compiledList: readonly CompiledLesson[],
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const byId = new Map(compiledList.map((c) => [c.lesson.id, c]));
  const totalCount = compiledList.length;

  const trackSections = [...catalog.tracks]
    .sort((a, b) => a.order - b.order)
    .map((track) => {
      const cards = track.lessons
        .map((lesson) => {
          const item = byId.get(lesson.id)!;
          const envMeta = ENV_LABELS[lesson.environment];
          const href = `${track.id}/${lesson.slug}.html`;
          const preview = item.previewSvg ?? '';
          const tags = lesson.teaches
            .slice(0, 4)
            .map((t) => `<code>${escapeHtml(t)}</code>`)
            .join(' ');
          const searchBlob = `${lesson.title} ${lesson.teaches.join(' ')} ${track.title} ${lesson.sourceFile}`.toLowerCase();
          return `<article class="portal-card learn-index-card" data-lesson-id="${escapeHtml(lesson.id)}" data-env="${escapeHtml(lesson.environment)}" data-search="${escapeHtml(searchBlob)}">
  <div class="portal-card-head">
    <h3><a href="${escapeHtml(href)}">${escapeHtml(lesson.title)}</a></h3>
    <span class="status-pill ${envMeta.pillClass}">${escapeHtml(envMeta.label)}</span>
  </div>
  ${preview}
  <div class="module-sym-preview">${tags}</div>
  <div class="portal-card-foot">
    <span class="learn-status-label code-card-meta" data-status-for="${escapeHtml(lesson.id)}">Not started</span>
    <a href="${escapeHtml(href)}">${lesson.kind === 'tutorial' ? 'Build Tutorial' : 'Start Lesson'} &rarr;</a>
  </div>
</article>`;
        })
        .join('\n');

      return `<section class="section" id="track-${escapeHtml(track.id)}" data-learn-track="${escapeHtml(track.id)}">
  <div class="section-head">
    <h2>${escapeHtml(track.title)}</h2>
    <span class="code-card-meta" data-track-progress="${escapeHtml(track.id)}">0 / ${String(track.lessons.length)} done &middot; ${String(track.lessons.length)} ${track.id === 'tutorials' ? 'projects' : 'lessons'}</span>
  </div>
  <p class="section-note">${escapeHtml(track.summary)}</p>
  <div class="portal-grid">
    ${cards}
  </div>
</section>`;
    })
    .join('\n');

  const orderedHrefs = compiledList.map((c) => ({
    id: c.lesson.id,
    trackId: c.track.id,
    href: `${c.track.id}/${c.lesson.slug}.html`,
    title: c.lesson.title,
  }));

  const envCounts = {
    universal: compiledList.filter((c) => c.lesson.environment === 'universal').length,
    play: compiledList.filter((c) => c.lesson.environment === 'play').length,
    cli: compiledList.filter((c) => c.lesson.environment === 'cli').length,
  };

  const body = `<section class="page-hero">
  <h1>Learn Lite</h1>
  <p class="hero-lead">
    <strong>Lite Academy</strong> brings together Docs, References, Gym, and Play &mdash; start from your first
    interactive I/O script and progress through parallel wiring, trace safety, closures, modules, and complete
    browser-runnable projects.
  </p>
  <div class="learn-progress-banner">
    <div class="learn-progress-stats">
      <strong id="learn-progress-text">0 / ${String(totalCount)} completed</strong>
      <div class="learn-bar-track"><div id="learn-progress-fill" class="learn-bar-fill" style="width: 0%;"></div></div>
    </div>
    <div class="hero-actions" style="margin: 0;">
      <a id="learn-continue-btn" class="btn btn-primary" href="${escapeHtml(orderedHrefs[0]?.href ?? 'getting-started/hello-lite.html')}">Start Learning &rarr;</a>
      <a class="btn" href="../docs/handbook/overview-and-setup.html">Read Handbook</a>
    </div>
  </div>
</section>
<section class="gym-filters" aria-label="Filter curriculum">
  <input id="learn-search" class="filter-input" type="search" placeholder="Filter lessons, tutorials, or topics..." aria-label="Filter Learn lessons">
  <div class="gym-filter-group" role="group" aria-label="Environment filter">
    <button class="gym-filter-btn" type="button" data-learn-env="all" aria-pressed="true">All (${String(totalCount)})</button>
    <button class="gym-filter-btn" type="button" data-learn-env="universal" aria-pressed="false">Browser + CLI (${String(envCounts.universal)})</button>
    <button class="gym-filter-btn" type="button" data-learn-env="play" aria-pressed="false">Lite Play (${String(envCounts.play)})</button>
    <button class="gym-filter-btn" type="button" data-learn-env="cli" aria-pressed="false">CLI / Host OS (${String(envCounts.cli)})</button>
  </div>
  <div class="gym-filter-group">
    <button id="learn-filter-incomplete" class="gym-filter-btn" type="button" aria-pressed="false">Incomplete Only</button>
    <span id="learn-visible-count" class="code-card-meta">Showing ${String(totalCount)} / ${String(totalCount)}</span>
  </div>
</section>
${trackSections}
<script>
  (function () {
    var lessons = ${JSON.stringify(orderedHrefs)};
    var activeEnv = "all";
    var incompleteOnly = false;
    var searchInput = document.getElementById("learn-search");

    function loadCompleted() {
      var completed = {};
      try {
        var raw = localStorage.getItem("lite-learn-progress-v1");
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") completed = parsed;
        }
      } catch (e) {}
      return completed;
    }

    function applyLearnFilter(completed) {
      var q = searchInput ? searchInput.value.trim().toLowerCase() : "";
      var cards = document.querySelectorAll(".learn-index-card");
      var shown = 0;
      for (var i = 0; i < cards.length; i += 1) {
        var card = cards[i];
        var id = card.getAttribute("data-lesson-id") || "";
        var env = card.getAttribute("data-env") || "";
        var blob = card.getAttribute("data-search") || "";
        var vis = (activeEnv === "all" || env === activeEnv) &&
          (!incompleteOnly || !completed[id]) &&
          (!q || blob.indexOf(q) >= 0);
        card.hidden = !vis;
        if (vis) shown += 1;
      }
      var tracks = document.querySelectorAll("[data-learn-track]");
      for (var t = 0; t < tracks.length; t += 1) {
        var sec = tracks[t];
        sec.hidden = sec.querySelector(".learn-index-card:not([hidden])") === null;
      }
      var countEl = document.getElementById("learn-visible-count");
      if (countEl) countEl.textContent = "Showing " + shown + " / " + lessons.length;
    }

    var completed = loadCompleted();
    var doneCount = 0;
    var firstIncomplete = null;
    var trackDone = {};
    var trackTotal = {};
    for (var i = 0; i < lessons.length; i += 1) {
      var item = lessons[i];
      trackTotal[item.trackId] = (trackTotal[item.trackId] || 0) + 1;
      var isDone = Boolean(completed[item.id]);
      if (isDone) {
        doneCount += 1;
        trackDone[item.trackId] = (trackDone[item.trackId] || 0) + 1;
      } else if (!firstIncomplete) {
        firstIncomplete = item;
      }
      var label = document.querySelector('[data-status-for="' + item.id + '"]');
      if (label) {
        label.textContent = isDone ? "Completed" : "Not started";
        if (isDone) label.classList.add("learn-done-label");
      }
    }
    var trackBadges = document.querySelectorAll("[data-track-progress]");
    for (var tb = 0; tb < trackBadges.length; tb += 1) {
      var trId = trackBadges[tb].getAttribute("data-track-progress");
      if (!trId) continue;
      var tot = trackTotal[trId] || 0;
      var dn = trackDone[trId] || 0;
      var unit = trId === "tutorials" ? "projects" : "lessons";
      trackBadges[tb].textContent = dn + " / " + tot + " done · " + tot + " " + unit;
    }
    var txt = document.getElementById("learn-progress-text");
    var fill = document.getElementById("learn-progress-fill");
    var cont = document.getElementById("learn-continue-btn");
    if (txt) txt.textContent = doneCount + " / " + lessons.length + " completed";
    if (fill) fill.style.width = (lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0) + "%";
    if (cont) {
      if (firstIncomplete && doneCount > 0) {
        cont.href = firstIncomplete.href;
        cont.textContent = "Continue: " + firstIncomplete.title + " ->";
      } else if (doneCount === lessons.length && lessons.length > 0) {
        cont.href = "../gym/";
        cont.textContent = "Course Complete! Enter Lite Gym ->";
      }
    }

    var envBtns = document.querySelectorAll("[data-learn-env]");
    for (var eb = 0; eb < envBtns.length; eb += 1) {
      envBtns[eb].addEventListener("click", function () {
        activeEnv = this.getAttribute("data-learn-env") || "all";
        for (var j = 0; j < envBtns.length; j += 1) {
          envBtns[j].setAttribute("aria-pressed", envBtns[j] === this ? "true" : "false");
        }
        applyLearnFilter(loadCompleted());
      });
    }
    var incBtn = document.getElementById("learn-filter-incomplete");
    if (incBtn) {
      incBtn.addEventListener("click", function () {
        incompleteOnly = !incompleteOnly;
        this.setAttribute("aria-pressed", incompleteOnly ? "true" : "false");
        applyLearnFilter(loadCompleted());
      });
    }
    if (searchInput) {
      searchInput.addEventListener("input", function () { applyLearnFilter(loadCompleted()); });
    }
    applyLearnFilter(completed);
  })();
</script>`;

  return renderPage({
    title: 'Learn — Lite',
    description: 'Interactive Lite language curriculum, showcase guides, and browser-runnable project tutorials.',
    basePath: '../',
    active: 'learn',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

function renderLessonPage(
  item: CompiledLesson,
  idx: number,
  allItems: readonly CompiledLesson[],
  catalog: LearnCatalog,
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
  graph?: LiteAcademyGraph,
): string {
  const { lesson, track } = item;
  const envMeta = ENV_LABELS[lesson.environment];
  const prev = idx > 0 ? allItems[idx - 1] : undefined;
  const next = idx + 1 < allItems.length ? allItems[idx + 1] : undefined;
  const isPlay = lesson.environment === 'play';
  const isCli = lesson.environment === 'cli';

  const sidebarGroups = [...catalog.tracks]
    .sort((a, b) => a.order - b.order)
    .map((tr) => {
      const openAttr = tr.id === track.id ? ' open' : '';
      const lis = tr.lessons
        .map((ls) => {
          const href = `../${tr.id}/${ls.slug}.html`;
          const cls = ls.id === lesson.id ? ' class="active"' : '';
          return `<li><a href="${escapeHtml(href)}"${cls} data-nav-lesson="${escapeHtml(ls.id)}"><span>${escapeHtml(ls.title)}</span><span class="learn-done-dot" aria-hidden="true"></span></a></li>`;
        })
        .join('\n          ');
      return `<details class="portal-nav-group"${openAttr}>
        <summary>${escapeHtml(tr.title)}</summary>
        <ul class="portal-nav-list">
          ${lis}
        </ul>
      </details>`;
    })
    .join('\n      ');

  const sourceHref = repoUrl ? `${repoUrl}/blob/main/${lesson.sourceFile}` : '#';
  const helperList = lesson.helperModules.length > 0
    ? `<p class="code-card-meta">Bundled helper modules: ${lesson.helperModules.map((h) => `<code>${escapeHtml(h.spec)}</code>`).join(', ')}</p>`
    : '';

  const prevLink = prev
    ? `<a class="btn" href="../${escapeHtml(prev.track.id)}/${escapeHtml(prev.lesson.slug)}.html">&larr; ${escapeHtml(prev.lesson.title)}</a>`
    : '<a class="btn" href="../">&larr; Track Index</a>';
  const nextLink = next
    ? `<a class="btn btn-primary" href="../${escapeHtml(next.track.id)}/${escapeHtml(next.lesson.slug)}.html">${escapeHtml(next.lesson.title)} &rarr;</a>`
    : '<a class="btn btn-primary" href="../../gym/">Practice in Gym &rarr;</a>';
  const relatedHtml = graph
    ? renderAcademyCrosslinks({
        heading: 'Continue Practicing & References',
        fromOutPath: item.outPath,
        buckets: graph.getRelatedBuckets(`lite://learn/${lesson.slug}`),
        wrapperClass: 'docs-crosslinks',
        sections: [
          { kind: 'gym', label: 'Lite Gym', badgeKind: 'gym', limit: 8 },
          { kind: 'handbook', label: 'Handbook', limit: 6 },
          { kind: 'module', label: 'Module', limit: 8 },
          { kind: 'play', label: 'Play', limit: 4 },
          { kind: 'doc', label: 'Design Spec', limit: 4 },
        ],
      })
    : '';

  const body = `<div id="ln-workbench" class="learn-workbench has-split" data-academy-visit-path="${escapeHtml(item.outPath)}" data-academy-visit-title="${escapeHtml(lesson.title)}" data-academy-visit-section="Learn">
  <aside class="portal-sidebar learn-sidebar" aria-label="Curriculum">
    <p class="portal-sidebar-title"><a href="../">All Tracks (${String(allItems.length)})</a></p>
    ${sidebarGroups}
  </aside>

  <article class="md-prose learn-guide">
    <div class="portal-mobile-bar">
      <button class="btn" type="button" data-drawer-toggle="sidebar">Tracks &amp; Lessons</button>
    </div>
    <div class="portal-card-head" style="margin-bottom: 0.65rem;">
      <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
        <button id="ln-sidebar-toggle" class="btn" type="button" aria-pressed="false" title="Collapse or expand tracks sidebar">Hide Tracks</button>
        <span class="code-card-meta"><a href="../">Learn</a> / ${escapeHtml(track.title)}</span>
      </div>
      <span class="status-pill ${envMeta.pillClass}">${escapeHtml(envMeta.label)}</span>
    </div>
    ${item.guideHtml}
    ${helperList}
    ${relatedHtml}
    <div class="learn-complete-row">
      <button id="ln-complete" class="btn" type="button" aria-pressed="false">Mark Lesson Complete</button>
      <a class="code-card-meta" href="${escapeHtml(sourceHref)}">Source: <code>${escapeHtml(lesson.sourceFile)}</code></a>
    </div>
    <nav class="docs-pager" aria-label="Lesson navigation">
      ${prevLink}
      ${nextLink}
    </nav>
  </article>

  ${renderSplitHandle({
    id: 'ln-split',
    ariaLabel: 'Resize guide and runner panes',
    initialPct: 50,
  })}

  <section class="pane learn-runner" aria-label="Interactive Lite runner">
    <div class="pane-head">
      <div class="sample-picker">
        <strong>Try Live</strong>
        <span class="code-card-meta">${escapeHtml(lesson.sourceFile)}</span>
      </div>
      <div class="pg-actions">
        <button id="ln-reset" class="btn" type="button">Reset</button>
        <button id="ln-open-play" class="btn" type="button" title="Save sketch and open in Playground">Open in Play &rarr;</button>
        <button id="ln-run" class="btn btn-primary" type="button" title="Ctrl/Cmd + Enter">${isCli ? 'Compile TS' : 'Run'}</button>
      </div>
    </div>
    ${renderCodeEditorBlock({
      textareaId: 'ln-editor',
      ariaLabel: 'Lite lesson source editor',
      preId: 'ln-editor-pre',
      gutterId: 'ln-editor-gutter',
      minHeight: '290px',
      initialSource: item.source,
      initialHtml: item.sourceHtml,
    })}
    <div class="pg-io-strip">
      <label class="pg-io-field">Stdin <input id="ln-stdin" type="text" value="${escapeHtml(lesson.stdin.replace(/\n/g, '\\n'))}" placeholder="line1\\nline2"></label>
      <label class="pg-io-field">Args <input id="ln-args" type="text" value="${escapeHtml(lesson.args.join(' '))}" placeholder="arg1 arg2"></label>
      <span id="ln-cursor" class="ed-cursor-meta">Ln 1, Col 1</span>
      <span id="ln-status" class="pg-status">${isCli ? 'Verified CLI output loaded (browser runs Compile TS)' : 'Verified output loaded — edit & Run'}</span>
    </div>
    <div class="pane-head">
      <div class="pg-tabs" role="tablist" aria-label="Runner panels">
        <button id="ln-tab-output" class="pg-tab" type="button" role="tab" data-tab="output" aria-selected="${isPlay ? 'false' : 'true'}">Output</button>
        <button id="ln-tab-canvas" class="pg-tab" type="button" role="tab" data-tab="canvas" aria-selected="${isPlay ? 'true' : 'false'}"${isPlay ? '' : ' hidden'}>Canvas</button>
        <button id="ln-tab-ts" class="pg-tab" type="button" role="tab" data-tab="ts" aria-selected="false">Generated TS</button>
        <button id="ln-tab-c" class="pg-tab" type="button" role="tab" data-tab="c" aria-selected="false">Generated C</button>
      </div>
      <div class="pg-actions">
        <button id="ln-pause" class="pg-pause-btn" type="button" aria-pressed="false" hidden>
          <span class="pg-icon-playing">&#9646;&#9646;</span>
          <span class="pg-icon-paused">&#9654;</span>
        </button>
        <button id="ln-copy" class="pg-copy-btn" type="button" aria-label="Copy runner output">Copy</button>
      </div>
    </div>
    ${renderCodeModeBar({ id: 'ln-code-modes', buttonIdPrefix: 'ln-mode-' })}
    <pre id="ln-output" class="code-block pg-panel"${isPlay ? ' hidden' : ''}>${escapeHtml(item.output || '(no stdout output)')}</pre>
    <div id="ln-canvas-wrap" class="pg-panel pg-canvas-wrap"${isPlay ? '' : ' hidden'}>
      <div class="pg-canvas-bar">
        <span id="ln-canvas-title" class="pg-canvas-title">${escapeHtml(lesson.title)}</span>
        <span class="pg-canvas-tools">
          <span id="ln-fps">0.0 fps · 0.0 ms</span>
          <span class="pg-sep">·</span>
          <span id="ln-canvas-size">0×0</span>
          <button id="ln-mute" class="pg-mute-btn" type="button" aria-pressed="false" aria-label="Toggle sound">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path class="pg-sound-body" d="M2 6h3l4-3v10l-4-3H2z"/>
              <path class="pg-sound-wave" d="M11.5 5.2a4 4 0 0 1 0 5.6M13.5 3.4a6.5 6.5 0 0 1 0 9.2"/>
              <path class="pg-sound-slash" d="M11 5.5l4 5M15 5.5l-4 5"/>
            </svg>
          </button>
        </span>
      </div>
      <div class="pg-canvas-stage">
        <canvas id="ln-canvas" class="pg-canvas" width="240" height="160" tabindex="0"></canvas>
      </div>
    </div>
    <pre id="ln-ts" class="code-block pg-panel" hidden><code></code></pre>
    <pre id="ln-c" class="code-block pg-panel" hidden><code></code></pre>
  </section>
</div>
<script type="module">
  import { formatCodeView } from "../../runtime/code-view.js";
  import { bindCodeModeButtons, bindLiteEditor, bindSplitPane } from "../../runtime/editor-client.js";
  import { highlightC, highlightLite, highlightTs } from "../../runtime/highlight.js";
  import { createPlayStage, createWorkerClient } from "../../runtime/play-stage.js";

  const lessonId = ${JSON.stringify(lesson.id)};
  const lessonSlug = ${JSON.stringify(lesson.slug)};
  const isCliLesson = ${JSON.stringify(isCli)};
  const isPlayLesson = ${JSON.stringify(isPlay)};
  const lessonEnvironment = ${JSON.stringify(lesson.environment)};
  const initialExtraModules = ${JSON.stringify(item.extraModules).replaceAll('<', '\\u003c')};

  const workbenchEl = document.getElementById("ln-workbench");
  const splitEl = document.getElementById("ln-split");
  const sidebarToggleBtn = document.getElementById("ln-sidebar-toggle");
  const editorEl = document.getElementById("ln-editor");
  const editorGutterEl = document.getElementById("ln-editor-gutter");
  const editorPreEl = document.getElementById("ln-editor-pre").querySelector("code");
  const cursorEl = document.getElementById("ln-cursor");
  const stdinEl = document.getElementById("ln-stdin");
  const argsEl = document.getElementById("ln-args");
  const statusEl = document.getElementById("ln-status");
  const runBtn = document.getElementById("ln-run");
  const resetBtn = document.getElementById("ln-reset");
  const copyBtn = document.getElementById("ln-copy");
  const completeBtn = document.getElementById("ln-complete");
  const outputEl = document.getElementById("ln-output");
  const tsEl = document.getElementById("ln-ts").querySelector("code");
  const cEl = document.getElementById("ln-c").querySelector("code");
  const tabOutput = document.getElementById("ln-tab-output");
  const tabCanvas = document.getElementById("ln-tab-canvas");
  const tabTs = document.getElementById("ln-tab-ts");
  const tabC = document.getElementById("ln-tab-c");
  const codeModesEl = document.getElementById("ln-code-modes");
  const canvasWrap = document.getElementById("ln-canvas-wrap");
  const canvas = document.getElementById("ln-canvas");
  const canvasTitleEl = document.getElementById("ln-canvas-title");
  const canvasSizeEl = document.getElementById("ln-canvas-size");
  const fpsEl = document.getElementById("ln-fps");
  const pauseBtn = document.getElementById("ln-pause");
  const muteBtn = document.getElementById("ln-mute");

  let payloadData = null;
  let activeTab = isPlayLesson ? "canvas" : "output";
  let codeMode = "program";
  let lastRawTs = "";
  let lastRawC = "";

  const SIDEBAR_COLLAPSE_KEY = "lite.learn.sidebar";
  function applySidebarCollapsed(collapsed, save) {
    if (workbenchEl) workbenchEl.classList.toggle("is-sidebar-collapsed", collapsed);
    if (sidebarToggleBtn) {
      sidebarToggleBtn.setAttribute("aria-pressed", collapsed ? "true" : "false");
      sidebarToggleBtn.textContent = collapsed ? "Show Tracks" : "Hide Tracks";
    }
    if (save) {
      try { localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "1" : "0"); } catch {}
    }
  }
  try {
    if (localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1") applySidebarCollapsed(true, false);
  } catch {}
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", () => {
      const next = !(workbenchEl && workbenchEl.classList.contains("is-sidebar-collapsed"));
      applySidebarCollapsed(next, true);
    });
  }

  if (splitEl && workbenchEl) {
    bindSplitPane({
      splitEl,
      containerEl: workbenchEl,
      cssVar: "--ln-split",
      storageKey: "lite.learn.split",
      defaultPct: 50,
      minPct: 28,
      maxPct: 72,
    });
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem("lite-learn-progress-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
    return {};
  }

  function syncProgressUi() {
    const progress = loadProgress();
    const done = Boolean(progress[lessonId]);
    completeBtn.setAttribute("aria-pressed", done ? "true" : "false");
    completeBtn.textContent = done ? "Completed (Click to Unmark)" : "Mark Lesson Complete";
    for (const el of document.querySelectorAll("[data-nav-lesson]")) {
      const id = el.getAttribute("data-nav-lesson");
      if (id && progress[id]) el.classList.add("is-completed");
      else el.classList.remove("is-completed");
    }
    if (window.LiteAcademy && typeof window.LiteAcademy.refresh === "function") {
      window.LiteAcademy.refresh();
    }
  }

  completeBtn.addEventListener("click", () => {
    const progress = loadProgress();
    if (progress[lessonId]) delete progress[lessonId];
    else progress[lessonId] = true;
    try { localStorage.setItem("lite-learn-progress-v1", JSON.stringify(progress)); } catch {}
    syncProgressUi();
  });
  syncProgressUi();

  const workerClient = createWorkerClient("../../runtime/worker.js");
  const stage = createPlayStage({
    canvas,
    workerClient,
    sizeEl: canvasSizeEl,
    titleEl: canvasTitleEl,
    fpsEl,
    pauseBtn,
    muteBtn,
    isCanvasVisible: () => activeTab === "canvas",
    onStatus: (s) => { statusEl.textContent = s; },
    onError: (stderr) => {
      statusEl.textContent = "Play error";
      outputEl.textContent = stderr || "Canvas update failed.";
      showTab("output");
    },
  });

  const editorCtrl = bindLiteEditor({
    editor: editorEl,
    preCode: editorPreEl,
    highlight: highlightLite,
    indent: "    ",
    gutter: editorGutterEl,
    cursorEl,
    autoIndent: true,
    onInput: () => {
      lastRawC = "";
    },
    onRun: () => {
      stage.unlockAudio();
      void executeCurrent();
    },
  });

  function renderCodeTabs() {
    tsEl.innerHTML = lastRawTs ? highlightTs(formatCodeView(lastRawTs, "ts", codeMode)) : "";
    cEl.innerHTML = lastRawC ? highlightC(formatCodeView(lastRawC, "c", codeMode)) : "";
  }

  function showTab(tab) {
    activeTab = tab;
    outputEl.hidden = tab !== "output";
    canvasWrap.hidden = tab !== "canvas";
    document.getElementById("ln-ts").hidden = tab !== "ts";
    document.getElementById("ln-c").hidden = tab !== "c";
    codeModesEl.hidden = tab !== "ts" && tab !== "c";
    if (copyBtn) copyBtn.hidden = tab === "canvas";
    tabOutput.setAttribute("aria-selected", tab === "output" ? "true" : "false");
    tabCanvas.setAttribute("aria-selected", tab === "canvas" ? "true" : "false");
    tabTs.setAttribute("aria-selected", tab === "ts" ? "true" : "false");
    tabC.setAttribute("aria-selected", tab === "c" ? "true" : "false");
    if (tab === "ts" || tab === "c") renderCodeTabs();
    stage.syncPauseUi(tab === "canvas", false);
    if (tab === "canvas") stage.resumeLoop();
    else stage.pauseLoop();
  }
  tabOutput.addEventListener("click", () => showTab("output"));
  tabCanvas.addEventListener("click", () => showTab("canvas"));
  tabTs.addEventListener("click", () => showTab("ts"));
  tabC.addEventListener("click", () => {
    showTab("c");
    if (!lastRawC) void requestCompileC();
  });

  bindCodeModeButtons({
    buttons: document.querySelectorAll("#ln-code-modes .code-mode-btn"),
    onChange: (mode) => {
      codeMode = mode;
      renderCodeTabs();
    },
  });

  if (copyBtn) {
    let copyTimer = 0;
    copyBtn.addEventListener("click", () => {
      const txt = activeTab === "ts" ? (tsEl.textContent || "") : activeTab === "c" ? (cEl.textContent || "") : (outputEl.textContent || "");
      if (!txt || !navigator.clipboard || !navigator.clipboard.writeText) return;
      navigator.clipboard.writeText(txt).then(() => {
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("copied");
        if (copyTimer) window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(() => {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("copied");
        }, 1500);
      }, () => {});
    });
  }

  async function requestCompileC() {
    const res = await workerClient.call("compile-c", {
      source: editorEl.value,
      extraModules: payloadData ? payloadData.extraModules : initialExtraModules,
    });
    if (res.ok && res.c) {
      lastRawC = String(res.c);
      renderCodeTabs();
    } else if (res.stderr) {
      lastRawC = "/* " + res.stderr + " */";
      renderCodeTabs();
    }
  }

  async function executeCurrent() {
    stage.stop();
    editorCtrl.clearErrors();
    const stdinDecoded = stdinEl.value.replaceAll("\\\\n", "\\n");
    const argsList = argsEl.value.trim() ? argsEl.value.trim().split(/\\s+/) : [];
    const extraModules = payloadData ? payloadData.extraModules : initialExtraModules;
    statusEl.textContent = isCliLesson ? "Compiling TS..." : "Running...";
    lastRawC = "";

    const action = isCliLesson ? "compile" : "run";
    const res = await workerClient.call(action, {
      source: editorEl.value,
      stdin: stdinDecoded,
      args: argsList,
      extraModules,
    });
    lastRawTs = res.ts ? String(res.ts) : "";
    renderCodeTabs();

    if (!res.ok) {
      editorCtrl.setErrorFromStderr(res.stderr || "");
      statusEl.textContent = "Error";
      outputEl.textContent = res.stderr || "Compilation or execution failed.";
      showTab("output");
      return;
    }

    if (isCliLesson) {
      statusEl.textContent = "Compiled TS cleanly (run locally with ./bin/lite run for host I/O)";
      return;
    }

    if (Array.isArray(res.tones) && res.tones.length > 0) stage.playTones(res.tones);
    const frame = res.play || res.canvas;
    if (frame && frame.width > 0 && frame.height > 0) {
      tabCanvas.hidden = false;
      stage.startSession(frame, Boolean(res.play));
      showTab("canvas");
      stage.syncPauseUi(true, true);
      statusEl.textContent = res.play ? "Play frame active" : "Canvas rendered";
      return;
    }

    tabCanvas.hidden = true;
    outputEl.textContent = res.stdout || (res.stderr ? res.stderr : "(no output)");
    if (res.stderr && res.stdout) outputEl.textContent += "\\n[stderr]\\n" + res.stderr;
    statusEl.textContent = "Ran in browser";
    showTab("output");
  }

  const openPlayBtn = document.getElementById("ln-open-play");
  if (openPlayBtn) {
    openPlayBtn.addEventListener("click", () => {
      if (window.LiteSnips && typeof window.LiteSnips.openInPlayground === "function") {
        const bundledModules = payloadData && payloadData.extraModules ? payloadData.extraModules : initialExtraModules;
        window.LiteSnips.openInPlayground({
          title: ${JSON.stringify(lesson.title)},
          code: editorEl.value,
          stdin: stdinEl.value.replaceAll("\\\\n", "\\n"),
          args: argsEl.value,
          origin: "learn:" + lessonId,
          extraModules: bundledModules && Object.keys(bundledModules).length > 0 ? bundledModules : null,
          environment: lessonEnvironment,
        });
      }
    });
  }

  runBtn.addEventListener("click", () => { stage.unlockAudio(); void executeCurrent(); });
  resetBtn.addEventListener("click", () => {
    if (!payloadData) return;
    stage.stop();
    editorCtrl.clearErrors();
    stdinEl.value = (payloadData.stdin || "").replace(/\\n/g, "\\\\n");
    argsEl.value = (payloadData.args || []).join(" ");
    outputEl.textContent = payloadData.output || "(no stdout output)";
    lastRawTs = payloadData.ts || "";
    lastRawC = "";
    editorCtrl.setValue(payloadData.source);
    renderCodeTabs();
    statusEl.textContent = "Reset to lesson source";
  });

  fetch("../payloads/" + encodeURIComponent(lessonSlug) + ".json")
    .then((r) => r.json())
    .then((data) => {
      payloadData = data;
      lastRawTs = data.ts || "";
      renderCodeTabs();
      if (isPlayLesson) void executeCurrent();
    })
    .catch(() => {});
</script>`;

  return renderPage({
    title: `${lesson.title} — Learn — Lite`,
    description: `${track.title}: ${lesson.title}`,
    basePath: '../../',
    active: 'learn',
    mainClass: 'learn-main',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
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

  const allLessons: readonly { track: LearnTrackSpec; lesson: LearnLessonSpec }[] = [...catalog.tracks]
    .sort((a, b) => a.order - b.order)
    .flatMap((track) => track.lessons.map((lesson) => ({ track, lesson })));

  const renderedGuides = renderDocuments(allLessons.map((item) => item.lesson.guideFile), rootDir);
  const guideByPath = new Map<string, RenderedDocument>(renderedGuides.map((d) => [d.path, d]));

  const compiledList: CompiledLesson[] = [];
  for (const { track, lesson } of allLessons) {
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
    compiledList.push({
      track,
      lesson,
      outPath,
      guideTitle: rendered.title || lesson.title,
      guideHtml,
      source: compiled.source,
      sourceHtml: highlightLite(compiled.source.trimEnd()),
      generatedTs: compiled.generatedTs,
      output: compiled.output,
      ...(compiled.previewSvg !== undefined ? { previewSvg: compiled.previewSvg } : {}),
      extraModules: compiled.extraModules,
    });
  }

  const files = new Map<string, string>();
  files.set('learn/index.html', renderLearnIndexPage(catalog, compiledList, repoUrl, rev, lightSwitchShine));

  const searchEntries: SearchEntry[] = [];
  let lessonCount = 0;
  let tutorialCount = 0;

  for (let i = 0; i < compiledList.length; i += 1) {
    const item = compiledList[i]!;
    if (item.lesson.kind === 'tutorial') tutorialCount += 1;
    else lessonCount += 1;

    files.set(
      item.outPath,
      renderLessonPage(item, i, compiledList, catalog, repoUrl, rev, lightSwitchShine, graph),
    );
    files.set(
      `learn/payloads/${item.lesson.slug}.json`,
      JSON.stringify({
        id: item.lesson.id,
        slug: item.lesson.slug,
        trackId: item.track.id,
        title: item.lesson.title,
        environment: item.lesson.environment,
        source: item.source,
        ts: item.generatedTs,
        output: item.output,
        stdin: item.lesson.stdin,
        args: item.lesson.args,
        extraModules: item.extraModules,
      }),
    );

    searchEntries.push({
      kind: 'learn',
      title: item.lesson.title,
      subtitle: `${item.track.title} · ${item.lesson.teaches.join(', ')}`,
      href: item.outPath,
      keywords: `${item.lesson.slug} ${item.track.id} ${item.lesson.teaches.join(' ')} ${item.lesson.sourceFile}`,
      badge: item.lesson.kind === 'tutorial' ? 'Tutorial' : 'Lesson',
    });
  }

  return {
    files,
    searchEntries,
    lessonCount,
    tutorialCount,
  };
}
