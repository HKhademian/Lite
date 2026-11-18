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
import { appendPlayKeepalive, stripPlayKeepaliveTs } from './play-keepalive.ts';
import type { PlaySample } from './play-samples.ts';
import type { SearchEntry } from './search.ts';
import { renderCodeEditorBlock, renderCodeModeBar } from './ui-blocks.ts';

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
          return `<article class="portal-card learn-index-card" data-lesson-id="${escapeHtml(lesson.id)}">
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

      return `<section class="section" id="track-${escapeHtml(track.id)}">
  <div class="section-head">
    <h2>${escapeHtml(track.title)}</h2>
    <span class="code-card-meta">${String(track.lessons.length)} ${track.id === 'tutorials' ? 'projects' : 'lessons'}</span>
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
    href: `${c.track.id}/${c.lesson.slug}.html`,
    title: c.lesson.title,
  }));

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
${trackSections}
<script>
  (function () {
    var lessons = ${JSON.stringify(orderedHrefs)};
    var completed = {};
    try {
      var raw = localStorage.getItem("lite-learn-progress-v1");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") completed = parsed;
      }
    } catch (e) {}
    var doneCount = 0;
    var firstIncomplete = null;
    for (var i = 0; i < lessons.length; i += 1) {
      var item = lessons[i];
      var isDone = Boolean(completed[item.id]);
      if (isDone) {
        doneCount += 1;
      } else if (!firstIncomplete) {
        firstIncomplete = item;
      }
      var label = document.querySelector('[data-status-for="' + item.id + '"]');
      if (label) {
        label.textContent = isDone ? "Completed" : "Not started";
        if (isDone) label.classList.add("learn-done-label");
      }
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

  const body = `<div class="learn-workbench">
  <aside class="portal-sidebar learn-sidebar" aria-label="Curriculum">
    <p class="portal-sidebar-title"><a href="../">All Tracks (${String(allItems.length)})</a></p>
    ${sidebarGroups}
  </aside>

  <article class="md-prose learn-guide">
    <div class="portal-card-head" style="margin-bottom: 0.65rem;">
      <span class="code-card-meta"><a href="../">Learn</a> / ${escapeHtml(track.title)}</span>
      <span class="status-pill ${envMeta.pillClass}">${escapeHtml(envMeta.label)}</span>
    </div>
    ${item.guideHtml}
    ${helperList}
    <div class="learn-complete-row">
      <button id="ln-complete" class="btn" type="button" aria-pressed="false">Mark Lesson Complete</button>
      <a class="code-card-meta" href="${escapeHtml(sourceHref)}">Source: <code>${escapeHtml(lesson.sourceFile)}</code></a>
    </div>
    <nav class="docs-pager" aria-label="Lesson navigation">
      ${prevLink}
      ${nextLink}
    </nav>
  </article>

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
      minHeight: '290px',
      initialSource: item.source,
      initialHtml: item.sourceHtml,
    })}
    <div class="pg-io-strip">
      <label class="pg-io-field">Stdin <input id="ln-stdin" type="text" value="${escapeHtml(lesson.stdin.replace(/\n/g, '\\n'))}" placeholder="line1\\nline2"></label>
      <label class="pg-io-field">Args <input id="ln-args" type="text" value="${escapeHtml(lesson.args.join(' '))}" placeholder="arg1 arg2"></label>
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
  import { bindCodeModeButtons, bindLiteEditor } from "../../runtime/editor-client.js";
  import { highlightC, highlightLite, highlightTs } from "../../runtime/highlight.js";

  const lessonId = ${JSON.stringify(lesson.id)};
  const lessonSlug = ${JSON.stringify(lesson.slug)};
  const isCliLesson = ${JSON.stringify(isCli)};
  const isPlayLesson = ${JSON.stringify(isPlay)};
  const lessonEnvironment = ${JSON.stringify(lesson.environment)};
  const initialExtraModules = ${JSON.stringify(item.extraModules).replaceAll('<', '\\u003c')};

  const editorEl = document.getElementById("ln-editor");
  const editorPreEl = document.getElementById("ln-editor-pre").querySelector("code");
  const stdinEl = document.getElementById("ln-stdin");
  const argsEl = document.getElementById("ln-args");
  const statusEl = document.getElementById("ln-status");
  const runBtn = document.getElementById("ln-run");
  const resetBtn = document.getElementById("ln-reset");
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
  const ctx2d = canvas.getContext("2d");
  const canvasSizeEl = document.getElementById("ln-canvas-size");
  const fpsEl = document.getElementById("ln-fps");
  const pauseBtn = document.getElementById("ln-pause");
  const muteBtn = document.getElementById("ln-mute");

  let payloadData = null;
  let activeTab = isPlayLesson ? "canvas" : "output";
  let codeMode = "program";
  let lastRawTs = "";
  let lastRawC = "";
  let worker = null;
  let nextReqId = 1;
  const pending = new Map();
  let stageWidth = 0;
  let stageHeight = 0;
  let stageBuffer = null;
  let stageImage = null;
  let activePlay = false;
  let canvasPaused = false;
  let animFrame = 0;
  let lastFrameAt = 0;
  let playInFlight = false;
  let muted = false;

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
  }

  completeBtn.addEventListener("click", () => {
    const progress = loadProgress();
    if (progress[lessonId]) delete progress[lessonId];
    else progress[lessonId] = true;
    try { localStorage.setItem("lite-learn-progress-v1", JSON.stringify(progress)); } catch {}
    syncProgressUi();
  });
  syncProgressUi();

  const editorCtrl = bindLiteEditor({
    editor: editorEl,
    preCode: editorPreEl,
    highlight: highlightLite,
    indent: "    ",
    onRun: () => void executeCurrent(),
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
    tabOutput.setAttribute("aria-selected", tab === "output" ? "true" : "false");
    tabCanvas.setAttribute("aria-selected", tab === "canvas" ? "true" : "false");
    tabTs.setAttribute("aria-selected", tab === "ts" ? "true" : "false");
    tabC.setAttribute("aria-selected", tab === "c" ? "true" : "false");
    if (tab === "ts" || tab === "c") renderCodeTabs();
  }
  tabOutput.addEventListener("click", () => showTab("output"));
  tabCanvas.addEventListener("click", () => showTab("canvas"));
  tabTs.addEventListener("click", () => showTab("ts"));
  tabC.addEventListener("click", () => {
    showTab("c");
    if (!lastRawC && worker) void requestCompileC();
  });

  bindCodeModeButtons({
    buttons: document.querySelectorAll("#ln-code-modes .code-mode-btn"),
    onChange: (mode) => {
      codeMode = mode;
      renderCodeTabs();
    },
  });

  function getWorker() {
    if (!worker) {
      worker = new Worker("../../runtime/worker.js", { type: "module" });
      worker.addEventListener("message", (event) => {
        const msg = event.data ?? {};
        const entry = pending.get(msg.id);
        if (entry) {
          pending.delete(msg.id);
          entry.resolve(msg);
        }
      });
    }
    return worker;
  }

  function callWorker(action, extra = {}) {
    return new Promise((resolve, reject) => {
      const id = nextReqId++;
      pending.set(id, { resolve, reject });
      getWorker().postMessage({ id, action, ...extra });
    });
  }

  function applyFrame(frame) {
    if (!frame || frame.width <= 0 || frame.height <= 0) return;
    if (stageWidth !== frame.width || stageHeight !== frame.height) {
      stageWidth = frame.width;
      stageHeight = frame.height;
      canvas.width = stageWidth;
      canvas.height = stageHeight;
      stageBuffer = new Uint32Array(stageWidth * stageHeight);
      stageImage = ctx2d.createImageData(stageWidth, stageHeight);
      canvasSizeEl.textContent = stageWidth + "×" + stageHeight;
    }
    if (Array.isArray(frame.ops)) {
      const ops = frame.ops;
      let i = 0;
      while (i < ops.length) {
        const op = ops[i];
        if (op === 1 && i + 1 < ops.length) {
          const argb = ops[i + 1] >>> 0;
          const rgba = (((argb & 0xFF) << 24) | (((argb >> 8) & 0xFF) << 16) | (((argb >> 16) & 0xFF) << 8) | ((argb >> 24) & 0xFF)) >>> 0;
          stageBuffer.fill(rgba);
          i += 2;
        } else if (op === 2 && i + 5 < ops.length) {
          const x0 = Math.max(0, ops[i + 1] | 0);
          const y0 = Math.max(0, ops[i + 2] | 0);
          const x1 = Math.min(stageWidth, (ops[i + 1] | 0) + (ops[i + 3] | 0));
          const y1 = Math.min(stageHeight, (ops[i + 2] | 0) + (ops[i + 4] | 0));
          const argb = ops[i + 5] >>> 0;
          const a = (argb >>> 24) & 255;
          const r = (argb >>> 16) & 255;
          const g = (argb >>> 8) & 255;
          const b = argb & 255;
          for (let y = y0; y < y1; y += 1) {
            const row = y * stageWidth;
            for (let x = x0; x < x1; x += 1) {
              if (a === 255) {
                stageBuffer[row + x] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
              } else if (a > 0) {
                const dst = stageBuffer[row + x] >>> 0;
                const dr = dst & 255;
                const dg = (dst >>> 8) & 255;
                const db = (dst >>> 16) & 255;
                const inv = 255 - a;
                const nr = ((r * a + dr * inv) / 255) | 0;
                const ng = ((g * a + dg * inv) | 0) / 255 | 0;
                const nb = ((b * a + db * inv) / 255) | 0;
                stageBuffer[row + x] = ((255 << 24) | (nb << 16) | (ng << 8) | nr) >>> 0;
              }
            }
          }
          i += 6;
        } else {
          break;
        }
      }
    }
    stageImage.data.set(new Uint8ClampedArray(stageBuffer.buffer));
    ctx2d.putImageData(stageImage, 0, 0);
  }

  async function stepLoop(now) {
    animFrame = 0;
    if (!activePlay || canvasPaused) return;
    if (playInFlight) { animFrame = requestAnimationFrame(stepLoop); return; }
    const dtMs = lastFrameAt === 0 ? 16.667 : Math.max(now - lastFrameAt, 1);
    if (lastFrameAt !== 0) fpsEl.textContent = (1000 / dtMs).toFixed(1) + " fps · " + dtMs.toFixed(1) + " ms";
    lastFrameAt = now;
    playInFlight = true;
    try {
      const res = await callWorker("step", { dt: Math.min(dtMs / 1000, 0.1) });
      playInFlight = false;
      if (res.frame) applyFrame(res.frame);
      if (res.ok && res.status === 0 && activePlay && !canvasPaused) {
        animFrame = requestAnimationFrame(stepLoop);
      }
    } catch {
      playInFlight = false;
      activePlay = false;
    }
  }

  pauseBtn.addEventListener("click", () => {
    canvasPaused = !canvasPaused;
    pauseBtn.setAttribute("aria-pressed", canvasPaused ? "true" : "false");
    if (!canvasPaused && activePlay && !animFrame) {
      lastFrameAt = 0;
      animFrame = requestAnimationFrame(stepLoop);
    }
  });
  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
  });
  canvas.addEventListener("keydown", (event) => {
    if (!activePlay || canvasPaused) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
    void callWorker("keydown", { key: event.key }).then((res) => { if (res.frame) applyFrame(res.frame); });
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!activePlay || canvasPaused || !stageWidth || !stageHeight) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(stageWidth - 1, Math.floor(((event.clientX - rect.left) / rect.width) * stageWidth)));
    const y = Math.max(0, Math.min(stageHeight - 1, Math.floor(((event.clientY - rect.top) / rect.height) * stageHeight)));
    void callWorker("pointermove", { x, y }).then((res) => { if (res.frame) applyFrame(res.frame); });
  });

  async function requestCompileC() {
    const res = await callWorker("compile-c", {
      source: editorEl.value,
      extraModules: payloadData ? payloadData.extraModules : null,
    });
    if (res.ok && res.c) {
      lastRawC = res.c;
      renderCodeTabs();
    } else if (res.stderr) {
      lastRawC = "/* " + res.stderr + " */";
      renderCodeTabs();
    }
  }

  async function executeCurrent() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = 0; }
    activePlay = false;
    const stdinDecoded = stdinEl.value.replaceAll("\\\\n", "\\n");
    const argsList = argsEl.value.trim() ? argsEl.value.trim().split(/\\s+/) : [];
    const extraModules = payloadData ? payloadData.extraModules : null;
    statusEl.textContent = isCliLesson ? "Compiling TS..." : "Running...";
    lastRawC = "";

    const action = isCliLesson ? "compile" : "run";
    const res = await callWorker(action, {
      source: editorEl.value,
      stdin: stdinDecoded,
      args: argsList,
      extraModules,
    });
    lastRawTs = res.ts || "";
    renderCodeTabs();

    if (!res.ok) {
      statusEl.textContent = "Error";
      outputEl.textContent = res.stderr || "Compilation or execution failed.";
      showTab("output");
      return;
    }

    if (isCliLesson) {
      statusEl.textContent = "Compiled TS cleanly (run locally with ./bin/lite run for host I/O)";
      return;
    }

    if (res.play || res.canvas) {
      tabCanvas.hidden = false;
      const frame = res.play || res.canvas;
      applyFrame(frame);
      if (res.play) {
        activePlay = true;
        canvasPaused = false;
        pauseBtn.hidden = false;
        pauseBtn.setAttribute("aria-pressed", "false");
        lastFrameAt = 0;
        animFrame = requestAnimationFrame(stepLoop);
      }
      showTab("canvas");
      statusEl.textContent = "Play frame active";
      return;
    }

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

  runBtn.addEventListener("click", () => void executeCurrent());
  resetBtn.addEventListener("click", () => {
    if (!payloadData) return;
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
}>): LearnBuildOutput {
  const { tsCompiler, modules, showcaseSamples, playSamples, repoUrl, rev, lightSwitchShine } = options;
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
    const guideHtml = postprocessMarkdownHtml({
      rawHtml: rendered.html,
      sourcePath: lesson.guideFile,
      outPath,
      docOutBySource,
      samplesByFile,
      snippets: new Map(),
      repoUrl,
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
      renderLessonPage(item, i, compiledList, catalog, repoUrl, rev, lightSwitchShine),
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
