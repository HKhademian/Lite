#!/usr/bin/env node
/** Build the static public showcase site and playground into dist/site/. */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCCompiler, compileTs } from '../compiler/host.ts';
import { sourceModuleIdentity } from '../compiler/source.ts';
import { heroSample, playgroundDefaultSample, sampleGroups, showcaseSamples, type ShowcaseSample } from './groups.ts';
import { escapeHtml, highlightLite, highlightTs } from './highlight.ts';
import { playgroundWorkerJs } from './playground-worker.ts';
import { siteCss } from './styles.ts';

type RenderedSample = ShowcaseSample & Readonly<{
  source: string;
  sourceHtml: string;
  generatedTs: string;
  tsHtml: string;
  output: string;
}>;

export type BuildSiteOptions = Readonly<{
  lightSwitchShine?: boolean;
}>;

type SourceRevision = Readonly<{
  commit: string;
  timestamp: string;
}>;

const root = dirname(import.meta.dirname);
const outputDir = join(root, 'dist', 'site');
const entryPath = fileURLToPath(new URL('../compiler/entry.ts', import.meta.url));
const brandWordmark = readFileSync(join(root, 'brand', 'lite-wordmark.svg'), 'utf8').trim();
const proseLite = '<span class="prose-lite"><span class="brand-l">l</span>ite</span>';

function readRepositoryUrl(): string {
  const configured = process.env['GITHUB_REPOSITORY']?.trim();
  if (configured !== undefined && configured !== '') {
    return `https://github.com/${configured}`;
  }
  const result = spawnSync('git', ['remote', 'get-url', 'github'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) return '';
  const match = result.stdout.trim().match(/(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/);
  return match === null ? '' : `https://github.com/${match[1]}`;
}

function readSourceRevision(): SourceRevision {
  const commitResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (commitResult.error !== undefined) throw commitResult.error;
  if (commitResult.status !== 0) throw new Error('could not read the source commit');
  const timeResult = spawnSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (timeResult.error !== undefined) throw timeResult.error;
  if (timeResult.status !== 0) throw new Error('could not read the commit timestamp');
  return {
    commit: commitResult.stdout.trim(),
    timestamp: timeResult.stdout.trim(),
  };
}

function compileAndRunSample(sample: ShowcaseSample): RenderedSample {
  const fullPath = resolve(root, sample.file);
  const source = readFileSync(fullPath, 'utf8');
  const compiled = compileTs({ text: source, name: sample.file, cwd: root });
  if (compiled.status !== 0) {
    throw new Error(`failed to compile ${sample.file}:\n${compiled.stderr.toString('utf8')}`);
  }
  const generatedTs = compiled.stdout.toString('utf8');

  const scratch = mkdtempSync(join(tmpdir(), 'lite-site-sample-'));
  try {
    const artifact = join(scratch, 'sample.ts');
    writeFileSync(artifact, generatedTs);
    const run = spawnSync(process.execPath, [entryPath, artifact, ...sample.args], {
      cwd: root,
      input: sample.stdin,
      encoding: 'utf8',
      timeout: 30_000,
    });
    if (run.error !== undefined) throw run.error;
    if (run.status !== 0) {
      throw new Error(`failed to run ${sample.file} (exit ${String(run.status)}):\n${run.stderr}`);
    }
    return {
      ...sample,
      source,
      sourceHtml: highlightLite(source.trimEnd()),
      generatedTs,
      tsHtml: highlightTs(generatedTs.trimEnd()),
      output: run.stdout,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function renderHeader(basePath: string, active: 'home' | 'playground' | 'gallery', repoUrl: string, lightSwitchShine: boolean): string {
  const docsHref = repoUrl ? `${repoUrl}/blob/main/docs/README.md` : '#';
  const repoHref = repoUrl || '#';
  const toggleClass = lightSwitchShine ? 'theme-toggle theme-toggle-shine' : 'theme-toggle';
  return `<header class="site-header">
  <div class="container header-inner">
    <a class="brand-link" href="${basePath}index.html" aria-label="Lite home">
      ${brandWordmark}
      <span class="brand-badge">Alpha</span>
    </a>
    <nav class="site-nav" aria-label="Main navigation">
      <a href="${basePath}index.html"${active === 'home' ? ' class="active"' : ''}>Overview</a>
      <a href="${basePath}playground/"${active === 'playground' ? ' class="active"' : ''}>Play</a>
      <a href="${basePath}gallery/"${active === 'gallery' ? ' class="active"' : ''}>Gallery</a>
      <a href="${escapeHtml(docsHref)}">Docs</a>
      <a href="${escapeHtml(repoHref)}">GitHub</a>
      <button id="theme-toggle" class="${toggleClass}" type="button" aria-label="Toggle light/dark theme" title="Switch theme">
        <svg class="theme-icon icon-sun" viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="lite-sun-grad" cx="38%" cy="35%" r="68%">
              <stop offset="0%" stop-color="#FFFDF0"/>
              <stop offset="35%" stop-color="#FEF08A"/>
              <stop offset="72%" stop-color="#FBBF24"/>
              <stop offset="100%" stop-color="#D97706"/>
            </radialGradient>
            <radialGradient id="lite-sun-corona" cx="50%" cy="50%" r="50%">
              <stop offset="68%" stop-color="#FDE047" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="16" cy="16" r="15" fill="url(#lite-sun-corona)"/>
          <circle cx="16" cy="16" r="10.5" fill="url(#lite-sun-grad)" stroke="#F59E0B" stroke-opacity="0.55" stroke-width="0.75"/>
          <circle cx="12.5" cy="12" r="3.2" fill="#FFFFFF" fill-opacity="0.28"/>
        </svg>
        <svg class="theme-icon icon-moon" viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="lite-moon-grad" cx="35%" cy="32%" r="70%">
              <stop offset="0%" stop-color="#F8FAFC"/>
              <stop offset="55%" stop-color="#CBD5E1"/>
              <stop offset="100%" stop-color="#64748B"/>
            </radialGradient>
            <clipPath id="lite-moon-clip">
              <circle cx="16" cy="16" r="10.5"/>
            </clipPath>
          </defs>
          <g clip-path="url(#lite-moon-clip)">
            <circle cx="16" cy="16" r="10.5" fill="url(#lite-moon-grad)"/>
            <path d="M20.8 5.2A11 11 0 0 1 11.2 26.8 11 11 0 0 0 20.8 5.2Z" fill="#1E293B" fill-opacity="0.28"/>
            <circle cx="12.2" cy="11.4" r="2.1" fill="#64748B" fill-opacity="0.26"/>
            <circle cx="18.2" cy="14.5" r="1.35" fill="#475569" fill-opacity="0.24"/>
            <circle cx="13.2" cy="19.6" r="2.4" fill="#64748B" fill-opacity="0.22"/>
            <circle cx="18.8" cy="20.4" r="1.05" fill="#475569" fill-opacity="0.22"/>
          </g>
          <circle cx="16" cy="16" r="10.5" stroke="#E2E8F0" stroke-opacity="0.45" stroke-width="0.75"/>
        </svg>
      </button>
    </nav>
  </div>
</header>`;
}

function renderFooter(rev: SourceRevision, repoUrl: string): string {
  const short = rev.commit.slice(0, 12);
  const rest = rev.commit.slice(12);
  const hashInner = `<code><strong>${escapeHtml(short)}</strong>${escapeHtml(rest)}</code>`;
  const commitHtml = repoUrl
    ? `<a class="commit-hash" href="${escapeHtml(`${repoUrl}/commit/${rev.commit}`)}" title="Committed ${escapeHtml(rev.timestamp)}">${hashInner}</a>`
    : `<span class="commit-hash" title="Committed ${escapeHtml(rev.timestamp)}">${hashInner}</span>`;
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <span>${proseLite} is licensed under Apache-2.0.</span>
    <span>Revision ${commitHtml}</span>
  </div>
</footer>`;
}

function renderSampleCard(sample: RenderedSample, basePath: string, includeNote = true): string {
  const inputParts: string[] = [];
  if (sample.args.length > 0) inputParts.push(`args: ${sample.args.join(' ')}`);
  if (sample.stdin !== '') inputParts.push(`stdin: ${JSON.stringify(sample.stdin)}`);
  const metaText = inputParts.length > 0 ? inputParts.join(' · ') : sample.file;
  const noteBlock = includeNote
    ? `<p class="sample-note">${escapeHtml(sample.note)}</p>`
    : '';
  const outputBlock = sample.showOutput === true
    ? `<div class="output-block">
    <div class="output-label">Output</div>
    <pre>${escapeHtml(sample.output.trimEnd())}</pre>
  </div>`
    : '';

  return `<article class="code-card" id="sample-${escapeHtml(sample.id)}">
  <div class="code-card-head">
    <span class="code-card-title">${escapeHtml(sample.title)}</span>
    <span class="code-card-meta">${escapeHtml(metaText)}</span>
  </div>
  ${noteBlock}
  <pre class="code-block"><code>${sample.sourceHtml}</code></pre>
  ${outputBlock}
  <footer class="sample-foot">
    <a href="${basePath}playground/?sample=${escapeHtml(sample.id)}">Play &rarr;</a>
  </footer>
</article>`;
}

function renderPage(options: Readonly<{
  title: string;
  basePath: string;
  active: 'home' | 'playground' | 'gallery';
  repoUrl: string;
  rev: SourceRevision;
  body: string;
  bodyClass?: string;
  mainClass?: string;
  lightSwitchShine?: boolean;
}>): string {
  const bodyAttr = options.bodyClass ? ` class="${escapeHtml(options.bodyClass)}"` : '';
  const mainAttr = ` class="${escapeHtml(options.mainClass ?? 'container')}"`;
  const lightSwitchShine = options.lightSwitchShine ?? true;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
  <link rel="icon" type="image/svg+xml" href="${options.basePath}favicon.svg">
  <script>
    (function () {
      try {
        var t = localStorage.getItem("lite-theme");
        if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
      } catch (e) {}
    })();
  </script>
  <link rel="stylesheet" href="${options.basePath}style.css">
</head>
<body${bodyAttr}>
${renderHeader(options.basePath, options.active, options.repoUrl, lightSwitchShine)}
<main${mainAttr}>
${options.body}
</main>
${renderFooter(options.rev, options.repoUrl)}
<script>
  (function () {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    function currentTheme() {
      var explicit = document.documentElement.dataset.theme;
      if (explicit === "light" || explicit === "dark") return explicit;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    function syncIcon() {
      var dark = currentTheme() === "dark";
      btn.title = dark ? "Night mode (moonshine) — switch to sun mode" : "Light mode (sunshine) — switch to moon mode";
      btn.setAttribute("aria-label", btn.title);
      btn.setAttribute("aria-pressed", String(dark));
    }
    btn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("lite-theme", next); } catch (e) {}
      syncIcon();
    });
    syncIcon();
  })();
</script>
</body>
</html>
`;
}

function renderHomePage(rendered: ReadonlyMap<string, RenderedSample>, repoUrl: string, rev: SourceRevision, lightSwitchShine: boolean): string {
  const hero = rendered.get(heroSample.id);
  if (hero === undefined) throw new Error('missing rendered hero sample');
  const featuredIds = ['double-sum', 'factorial', 'decisions', 'script-arguments'];
  const featuredCards = featuredIds
    .map(id => rendered.get(id))
    .filter((s): s is RenderedSample => s !== undefined)
    .map(s => renderSampleCard(s, ''))
    .join('\n');

  const cloneUrl = repoUrl ? `${repoUrl}.git` : '<repository-url>';
  const docsStart = repoUrl ? `${repoUrl}/blob/main/docs/start-here.md` : 'gallery/';

  const body = `<section class="hero">
  <div>
    <div class="hero-display">
      ${brandWordmark}
      <h1>is light.</h1>
    </div>
    <p class="hero-lead">
      A small, explicit language and self-hosted compiler designed for low runtime weight,
      clear consequences, and readable code.
    </p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="playground/">Play online</a>
      <a class="btn" href="${escapeHtml(docsStart)}">Get started</a>
    </div>
    <div class="quickstart" role="region" aria-label="Quickstart shell commands">
      <div class="quickstart-head">
        <span class="quickstart-dots" aria-hidden="true"><span></span><span></span><span></span></span>
        <span class="quickstart-label">shell</span>
      </div>
      <pre class="quickstart-body"><code><span class="shell-line"><span class="shell-cmd">git</span> clone ${escapeHtml(cloneUrl)}</span>
<span class="shell-line"><span class="shell-cmd">cd</span> LiteScript</span>
<span class="shell-line"><span class="shell-cmd">./bin/lite</span> run ${escapeHtml(heroSample.file)}</span></code></pre>
    </div>
  </div>
  ${renderSampleCard(hero, '', false)}
</section>

<section class="section">
  <div class="section-head">
    <h2>Design Principles</h2>
  </div>
  <div class="pillars">
    <div class="pillar">
      <h3>Explicit Behavior</h3>
      <p>Consequential operations—prompts, output, mutation, and imports—are always visible in source.</p>
    </div>
    <div class="pillar">
      <h3>Low Runtime Weight</h3>
      <p>Generated artifacts run cleanly with minimal support code today and target native C ahead.</p>
    </div>
    <div class="pillar">
      <h3>Verified Toolchain</h3>
      <p>Every showcased example is compiled and executed by the ${proseLite} compiler at build time.</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="section-head">
    <h2>Featured Examples</h2>
    <a href="gallery/">Explore Gallery (${String(rendered.size)} samples) &rarr;</a>
  </div>
  <div class="sample-grid">
    ${featuredCards}
  </div>
</section>`;

  return renderPage({
    title: 'Lite — LiteLang & LiteScript',
    basePath: '',
    active: 'home',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

function renderGalleryCard(sample: RenderedSample, basePath: string): string {
  return `<article class="code-card" id="sample-${escapeHtml(sample.id)}">
  <div class="code-card-head">
    <span class="code-card-title">${escapeHtml(sample.title)}</span>
    <span class="code-card-meta">${escapeHtml(sample.file)}</span>
  </div>
  <p class="sample-note" style="flex: 1;">${escapeHtml(sample.note)}</p>
  <details class="gallery-code">
    <summary>Source</summary>
    <pre class="code-block"><code>${sample.sourceHtml}</code></pre>
  </details>
  <footer class="sample-foot">
    <a href="${basePath}playground/?sample=${escapeHtml(sample.id)}">Play &rarr;</a>
  </footer>
</article>`;
}

function renderGalleryPage(rendered: ReadonlyMap<string, RenderedSample>, repoUrl: string, rev: SourceRevision, lightSwitchShine: boolean): string {
  const sections = sampleGroups.map(group => {
    const cards = showcaseSamples
      .filter(s => s.group === group.id)
      .map(s => rendered.get(s.id))
      .filter((s): s is RenderedSample => s !== undefined)
      .map(s => renderGalleryCard(s, '../'))
      .join('\n');
    return `<section class="section" id="group-${escapeHtml(group.id)}">
  <div class="section-head">
    <h2>${escapeHtml(group.title)}</h2>
  </div>
  <p class="section-note">${escapeHtml(group.description)}</p>
  <div class="sample-grid">
    ${cards}
  </div>
</section>`;
  }).join('\n');

  const body = `<section style="padding: 2rem 0 1rem;">
  <h1 style="margin: 0 0 0.5rem;">Gallery</h1>
  <p class="hero-lead" style="margin: 0;">
    All ${String(rendered.size)} examples below are compiled and executed by the ${proseLite} compiler during the site build.
  </p>
</section>
${sections}`;

  return renderPage({
    title: 'Gallery — Lite',
    basePath: '../',
    active: 'gallery',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

function renderPlaygroundPage(rendered: ReadonlyMap<string, RenderedSample>, repoUrl: string, rev: SourceRevision, lightSwitchShine: boolean): string {
  const optionsHtml = sampleGroups.map(group => {
    const items = showcaseSamples
      .filter(s => s.group === group.id)
      .map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`)
      .join('');
    return `<optgroup label="${escapeHtml(group.title)}">${items}</optgroup>`;
  }).join('') + `<optgroup label="Visual Stage"><option value="canvas-bounce">ℓite Canvas Stage</option></optgroup>`;

  const payload = Array.from(rendered.values()).map(s => ({
    id: s.id,
    title: s.title,
    file: s.file,
    showOutput: s.showOutput === true,
    canvas: false,
  }));
  payload.push({
    id: 'canvas-bounce',
    title: 'ℓite Canvas Stage',
    file: 'playground/canvas-stage',
    showOutput: false,
    canvas: true,
  });
  const serialized = JSON.stringify(payload).replaceAll('<', '\\u003c');

  const body = `<div class="workbench">
  <section class="pane" aria-label="Source editor">
    <div class="pane-head">
      <div class="sample-picker">
        <select id="pg-samples" class="pg-select" aria-label="Choose a sample">${optionsHtml}</select>
        <button id="pg-reset" class="btn" type="button">Reset</button>
      </div>
      <div class="pg-actions">
        <button id="pg-compile" class="btn" type="button">Compile</button>
        <button id="pg-play" class="btn btn-primary" type="button">&#9654; Play</button>
      </div>
    </div>
    <div class="pg-editor-wrap">
      <pre class="pg-editor-pre" aria-hidden="true"><code id="pg-source"></code></pre>
      <textarea id="pg-editor" class="pg-editor-input" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Lite source editor"></textarea>
    </div>
    <div class="pg-io-strip">
      <label class="pg-io-field">args <input id="pg-args" type="text" placeholder="optional args"></label>
      <label class="pg-io-field">stdin <input id="pg-stdin" type="text" placeholder="optional stdin"></label>
      <span id="pg-file" class="pg-status"></span>
    </div>
  </section>

  <section class="pane" aria-label="Compiler and output inspector">
    <div class="pane-head">
      <div class="pg-tabs" role="tablist">
        <button class="pg-tab" role="tab" data-tab="output" aria-selected="true" type="button">Output</button>
        <button class="pg-tab" role="tab" data-tab="ts" aria-selected="false" type="button">Generated TS</button>
        <button class="pg-tab" role="tab" data-tab="c" aria-selected="false" type="button">Generated C</button>
        <button id="tab-canvas" class="pg-tab" role="tab" data-tab="canvas" aria-selected="false" type="button" hidden>Canvas</button>
      </div>
      <span id="pg-status" class="pg-status">Ready</span>
    </div>

    <div id="pg-code-modes" class="code-modes" role="group" aria-label="Generated code view" hidden>
      <button id="mode-program" class="code-mode-btn" type="button" data-mode="program" aria-pressed="true">Program</button>
      <button id="mode-portable" class="code-mode-btn" type="button" data-mode="portable" aria-pressed="false">Portable</button>
      <button id="mode-full" class="code-mode-btn" type="button" data-mode="full" aria-pressed="false">Full</button>
    </div>

    <div id="panel-output" class="pg-panel" role="tabpanel">
      <pre class="code-block"><code id="pg-output"></code></pre>
    </div>

    <div id="panel-ts" class="pg-panel" role="tabpanel" hidden>
      <pre class="code-block"><code id="pg-ts"></code></pre>
    </div>

    <div id="panel-c" class="pg-panel" role="tabpanel" hidden>
      <pre class="code-block"><code id="pg-c"></code></pre>
    </div>

    <div id="panel-canvas" class="pg-panel" role="tabpanel" hidden>
      <div class="pg-canvas-wrap">
        <canvas id="pg-canvas" class="pg-canvas" width="460" height="260"></canvas>
        <span id="pg-fps" class="pg-status">0.0 fps &middot; 0.0 ms</span>
      </div>
    </div>
  </section>
</div>

<script type="module">
  import { formatCodeView } from "./code-view.js";
  import { highlightLite, highlightTs, highlightC } from "./highlight.js";
  const samples = ${serialized};
  const byId = new Map(samples.map(s => [s.id, s]));
  const cache = new Map();
  const select = document.getElementById("pg-samples");
  const resetBtn = document.getElementById("pg-reset");
  const compileBtn = document.getElementById("pg-compile");
  const playBtn = document.getElementById("pg-play");
  const statusEl = document.getElementById("pg-status");
  const fileEl = document.getElementById("pg-file");
  const editorEl = document.getElementById("pg-editor");
  const sourceEl = document.getElementById("pg-source");
  const argsEl = document.getElementById("pg-args");
  const stdinEl = document.getElementById("pg-stdin");
  const outputEl = document.getElementById("pg-output");
  const tsEl = document.getElementById("pg-ts");
  const cEl = document.getElementById("pg-c");
  const codeModesBar = document.getElementById("pg-code-modes");
  const modeButtons = Array.from(document.querySelectorAll(".code-mode-btn"));
  const tabCanvas = document.getElementById("tab-canvas");
  const fpsEl = document.getElementById("pg-fps");
  const tabs = Array.from(document.querySelectorAll(".pg-tab"));
  const panels = {
    output: document.getElementById("panel-output"),
    ts: document.getElementById("panel-ts"),
    c: document.getElementById("panel-c"),
    canvas: document.getElementById("panel-canvas"),
  };

  let activeTab = "output";
  let codeMode = "program";
  let rawTs = "";
  let rawC = "";
  let cMessage = "";
  let currentSample = null;
  let lastCSource = null;
  let animFrame = 0;
  let lastFrameAt = 0;

  function renderCodeViews() {
    tsEl.innerHTML = rawTs ? highlightTs(formatCodeView(rawTs, "ts", codeMode)) : "";
    cEl.innerHTML = rawC ? highlightC(formatCodeView(rawC, "c", codeMode)) : highlightC(cMessage);
  }

  for (const btn of modeButtons) {
    btn.addEventListener("click", () => {
      codeMode = btn.dataset.mode || "program";
      for (const b of modeButtons) {
        b.setAttribute("aria-pressed", b.dataset.mode === codeMode ? "true" : "false");
      }
      renderCodeViews();
    });
  }

  function showTab(name) {
    activeTab = name;
    for (const tab of tabs) {
      tab.setAttribute("aria-selected", tab.dataset.tab === name ? "true" : "false");
    }
    for (const [key, panel] of Object.entries(panels)) {
      panel.hidden = key !== name;
    }
    codeModesBar.hidden = name !== "ts" && name !== "c";
    if (name === "canvas") startCanvas();
    else stopCanvas();
    if (name === "c") void compileCForEditor();
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => showTab(tab.dataset.tab));
  }

  editorEl.addEventListener("input", () => {
    sourceEl.innerHTML = highlightLite(editorEl.value) + "\\n";
    statusEl.textContent = "Modified";
  });

  editorEl.addEventListener("scroll", () => {
    const pre = sourceEl.parentElement;
    if (pre) {
      pre.scrollTop = editorEl.scrollTop;
      pre.scrollLeft = editorEl.scrollLeft;
    }
  });

  async function fetchSample(id) {
    if (cache.has(id)) return cache.get(id);
    const res = await fetch("./samples/" + encodeURIComponent(id) + ".json");
    if (!res.ok) throw new Error("Failed to load sample " + id);
    const data = await res.json();
    cache.set(id, data);
    return data;
  }

  async function loadSample(id, mode) {
    const meta = byId.get(id) ?? samples[0];
    if (!meta) return;
    select.value = meta.id;
    fileEl.textContent = meta.file;
    statusEl.textContent = "Loading " + meta.file + "...";

    const url = new URL(window.location.href);
    url.searchParams.set("sample", meta.id);
    window.history.replaceState({}, "", url);

    if (meta.canvas) {
      const demoSource = "/* Interactive ℓite Canvas Stage */\\nio := import \\"core/io\\";\\nio.outputLine(\\"Rendering ℓite mark on canvas...\\");";
      const demoHtml = highlightLite(demoSource);
      currentSample = { id: meta.id, source: demoSource, sourceHtml: demoHtml, tsHtml: "// Canvas stage runs directly in browser", output: "Canvas stage active\\n", args: [], stdin: "" };
      editorEl.value = demoSource;
      sourceEl.innerHTML = demoHtml + "\\n";
      tsEl.textContent = "// Canvas stage runs directly in browser";
      argsEl.value = "";
      stdinEl.value = "";
      tabCanvas.hidden = false;
      showTab("canvas");
      return;
    }

    tabCanvas.hidden = true;
    if (activeTab === "canvas") showTab("output");

    const sample = await fetchSample(meta.id);
    currentSample = sample;
    editorEl.value = sample.source;
    sourceEl.innerHTML = sample.sourceHtml + "\\n";
    editorEl.scrollTop = 0;
    editorEl.scrollLeft = 0;
    if (sourceEl.parentElement) {
      sourceEl.parentElement.scrollTop = 0;
      sourceEl.parentElement.scrollLeft = 0;
    }
    rawTs = sample.ts ?? "";
    rawC = "";
    cMessage = "/* Press Compile or open Generated C to emit C. */";
    lastCSource = null;
    renderCodeViews();
    if (activeTab === "c") void compileCForEditor();
    argsEl.value = sample.args.join(" ");
    stdinEl.value = sample.stdin.replaceAll("\\n", "\\\\n");

    if (mode === "compile") {
      showTab("ts");
      statusEl.textContent = "Compiled to TypeScript";
    } else if (mode === "play") {
      showTab("output");
      outputEl.textContent = "";
      statusEl.textContent = "Running " + meta.file + "...";
      setTimeout(() => {
        outputEl.textContent = sample.output;
        statusEl.textContent = "Exited 0 (verified)";
      }, 100);
    } else if (meta.showOutput) {
      outputEl.textContent = sample.output;
      statusEl.textContent = "Verified output ready";
    } else {
      outputEl.textContent = "(Press Play to run)";
      statusEl.textContent = "Ready — press Play";
    }
  }

  function parseStdin() {
    return stdinEl.value.replaceAll("\\\\n", "\\n");
  }

  function parseArgs() {
    const raw = argsEl.value.trim();
    return raw ? raw.split(/\\s+/) : [];
  }

  let worker = null;
  let nextReqId = 1;
  const pending = new Map();

  function getWorker() {
    if (!worker) {
      worker = new Worker("./worker.js", { type: "module" });
      worker.addEventListener("message", (event) => {
        const msg = event.data;
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        entry.resolve(msg);
      });
      worker.addEventListener("error", (err) => {
        for (const entry of pending.values()) {
          entry.reject(new Error(err.message || "Worker error"));
        }
        pending.clear();
        worker = null;
      });
    }
    return worker;
  }

  function runInWorker(action, source, stdin, args) {
    return new Promise((resolve, reject) => {
      const id = nextReqId++;
      pending.set(id, { resolve, reject });
      getWorker().postMessage({ id, action, source, stdin, args });
    });
  }

  function formatCOutput(c, cError) {
    if (c) return c;
    const msg = (cError || "C backend does not support this program yet.").trim();
    return "/* " + msg.replaceAll("*/", "* /") + " */";
  }

  async function compileCForEditor() {
    const source = editorEl.value;
    if (lastCSource === source) return;
    rawC = "";
    cMessage = "/* Compiling C in browser... */";
    renderCodeViews();
    try {
      const res = await runInWorker("compile-c", source, "", []);
      if (editorEl.value !== source) return;
      lastCSource = source;
      if (res.c) {
        rawC = res.c;
        cMessage = "";
      } else {
        rawC = "";
        cMessage = formatCOutput("", res.stderr);
      }
      renderCodeViews();
    } catch (err) {
      rawC = "";
      cMessage = "/* " + (err instanceof Error ? err.message : String(err)) + " */";
      renderCodeViews();
    }
  }

  async function runAction(action) {
    const meta = byId.get(select.value);
    if (action === "play" && meta && meta.canvas) {
      showTab("canvas");
      statusEl.textContent = "Canvas stage active";
      return;
    }
    const source = editorEl.value;
    const stdin = parseStdin();
    const args = parseArgs();
    statusEl.textContent = action === "compile" ? "Compiling in browser..." : "Running in browser...";
    if (action === "play") {
      showTab("output");
      outputEl.textContent = "";
    }
    try {
      const res = await runInWorker(action, source, stdin, args);
      if (res.ts) rawTs = res.ts;
      if (action === "compile" && (res.c !== undefined || res.cError !== undefined)) {
        lastCSource = source;
        if (res.c) {
          rawC = res.c;
          cMessage = "";
        } else {
          rawC = "";
          cMessage = formatCOutput("", res.cError);
        }
      }
      renderCodeViews();
      if (!res.ok) {
        showTab("output");
        outputEl.textContent = (res.stdout ? res.stdout + "\\n" : "") + (res.stderr || "Execution failed.");
        statusEl.textContent = res.ts ? "Runtime error" : "Compile error";
        return;
      }
      if (action === "compile") {
        if (activeTab !== "c") showTab("ts");
        statusEl.textContent = "Compiled to TypeScript" + (res.c ? " & C" : "");
      } else {
        showTab("output");
        outputEl.textContent = res.stdout + (res.stderr ? (res.stdout ? "\\n" : "") + res.stderr : "");
        statusEl.textContent = "Exited 0 (in browser)";
      }
    } catch (err) {
      showTab("output");
      outputEl.textContent = err instanceof Error ? err.message : String(err);
      statusEl.textContent = "Worker error";
    }
  }

  select.addEventListener("change", () => loadSample(select.value, "load"));
  resetBtn.addEventListener("click", () => loadSample(select.value, "load"));
  compileBtn.addEventListener("click", () => runAction("compile"));
  playBtn.addEventListener("click", () => runAction("play"));

  // Full-panel bouncing ℓite logo mark with FPS / frametime reporting
  const canvas = document.getElementById("pg-canvas");
  const ctx = canvas.getContext("2d");
  const markMain = new Path2D("M2.2 10C5 7.9 8.6 5 8.5 3C8.4 1.7 6.9 1.7 5.9 3.1C4.6 4.9 4.2 8 4.4 10.4C4.6 12.2 5.8 13 7.4 13C8.6 13 9.5 12.4 10.2 11.4");
  const markBar = new Path2D("M4.7 9.4C6.3 9.1 7.4 8.5 8.1 7.6");
  let bx = 48, by = 48, vx = 2.4, vy = 1.8;

  function drawFrame(now) {
    if (lastFrameAt !== 0) {
      const dt = Math.max(now - lastFrameAt, 0.1);
      const fps = 1000 / dt;
      fpsEl.textContent = fps.toFixed(1) + " fps · " + dt.toFixed(1) + " ms";
    }
    lastFrameAt = now;

    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    ctx.fillStyle = "#0B0C0E";
    ctx.fillRect(0, 0, w, h);

    const scale = 4;
    const markSize = 14 * scale;
    bx += vx; by += vy;
    if (bx <= 4) { bx = 4; vx = Math.abs(vx); }
    else if (bx + markSize >= w - 4) { bx = Math.max(4, w - 4 - markSize); vx = -Math.abs(vx); }
    if (by <= 4) { by = 4; vy = Math.abs(vy); }
    else if (by + markSize >= h - 4) { by = Math.max(4, h - 4 - markSize); vy = -Math.abs(vy); }

    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#F0B45A";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.stroke(markMain);
    ctx.lineWidth = 1.3;
    ctx.stroke(markBar);
    ctx.restore();

    animFrame = requestAnimationFrame(drawFrame);
  }

  function startCanvas() {
    lastFrameAt = 0;
    if (!animFrame) animFrame = requestAnimationFrame(drawFrame);
    statusEl.textContent = "Canvas stage active";
  }

  function stopCanvas() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = 0; }
    lastFrameAt = 0;
  }

  const initial = new URLSearchParams(window.location.search).get("sample") ?? "${escapeHtml(playgroundDefaultSample.id)}";
  loadSample(initial, "load");
</script>`;

  return renderPage({
    title: 'Playground — Lite',
    basePath: '../',
    active: 'playground',
    repoUrl,
    rev,
    body,
    bodyClass: 'playground-page',
    mainClass: 'playground-main',
    lightSwitchShine,
  });
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
  const repoUrl = readRepositoryUrl();
  const rev = readSourceRevision();
  const rendered = new Map<string, RenderedSample>();

  for (const sample of showcaseSamples) {
    rendered.set(sample.id, compileAndRunSample(sample));
  }

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(join(outputDir, 'gallery'), { recursive: true });
  mkdirSync(join(outputDir, 'playground', 'samples'), { recursive: true });

  writeFileSync(join(outputDir, 'style.css'), siteCss);
  cpSync(join(root, 'brand', 'lite-favicon.svg'), join(outputDir, 'favicon.svg'));
  writeFileSync(join(outputDir, 'index.html'), renderHomePage(rendered, repoUrl, rev, lightSwitchShine));
  writeFileSync(join(outputDir, 'gallery', 'index.html'), renderGalleryPage(rendered, repoUrl, rev, lightSwitchShine));
  writeFileSync(join(outputDir, 'playground', 'index.html'), renderPlaygroundPage(rendered, repoUrl, rev, lightSwitchShine));
  const compilerTs = readFileSync(join(root, 'compiler', 'bootstrap', 'compiler.ts'), 'utf8');
  writeFileSync(join(outputDir, 'playground', 'compiler.js'), stripTypeScriptTypes(compilerTs, { mode: 'strip' }));
  const compilerCTs = readFileSync(buildCCompiler().path, 'utf8');
  writeFileSync(join(outputDir, 'playground', 'compiler-c.js'), stripTypeScriptTypes(compilerCTs, { mode: 'strip' }));
  const stripTs = readFileSync(join(root, 'site', 'strip-ts.ts'), 'utf8');
  writeFileSync(join(outputDir, 'playground', 'strip-ts.js'), stripTypeScriptTypes(stripTs, { mode: 'strip' }));
  const codeViewTs = readFileSync(join(root, 'site', 'code-view.ts'), 'utf8');
  writeFileSync(join(outputDir, 'playground', 'code-view.js'), stripTypeScriptTypes(codeViewTs, { mode: 'strip' }));
  const highlightTsSrc = readFileSync(join(root, 'site', 'highlight.ts'), 'utf8');
  writeFileSync(join(outputDir, 'playground', 'highlight.js'), stripTypeScriptTypes(highlightTsSrc, { mode: 'strip' }));
  writeFileSync(join(outputDir, 'playground', 'worker.js'), playgroundWorkerJs);
  const coreDir = join(root, 'lib', 'core');
  const stdlib: Record<string, Readonly<{ path: string; display: string; identity: string; text: string }>> = {};
  for (const name of readdirSync(coreDir).filter(f => f.endsWith('.lts')).sort()) {
    const relPath = `lib/core/${name}`;
    const text = readFileSync(join(coreDir, name), 'utf8');
    const modName = `core/${name.slice(0, -4)}`;
    stdlib[modName] = { path: relPath, display: relPath, identity: sourceModuleIdentity(text), text };
  }
  writeFileSync(join(outputDir, 'playground', 'stdlib.json'), JSON.stringify(stdlib));
  for (const sample of rendered.values()) {
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
  writeFileSync(
    join(outputDir, 'build.json'),
    JSON.stringify({ commit: rev.commit, shortCommit: rev.commit.slice(0, 12), timestamp: rev.timestamp, samples: rendered.size, lightSwitchShine }, null, 2) + '\n',
  );

  console.log(`Built Lite site (${String(rendered.size)} verified samples) -> dist/site/`);
}

if (import.meta.main) {
  buildSite(parseBuildArgs(process.argv.slice(2)));
}
