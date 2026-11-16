#!/usr/bin/env node
/** Build the static public showcase site and playground into dist/site/. */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCCompiler, buildTsCompiler, compileBuiltCompiler, type CompilerBuild } from '../compiler/host.ts';
import { sourceModuleIdentity } from '../compiler/source.ts';
import { extractModules } from '../tools/docs.ts';
import {
  brandWordmark,
  proseLite,
  readRepositoryUrl,
  readSourceRevision,
  renderPage,
  type SourceRevision,
} from './chrome.ts';
import { captureCanvasPreview } from './canvas-preview.ts';
import { buildDocsSection } from './docs-pages.ts';
import { heroSample, playgroundDefaultSample, sampleGroups, showcaseSamples, type ShowcaseSample } from './groups.ts';
import { escapeHtml, highlightLite, highlightTs } from './highlight.ts';
import { buildGymSection } from './gym-pages.ts';
import { buildLearnSection } from './learn-pages.ts';
import { buildModulesSection } from './modules-pages.ts';
import { playGroups, playSamples, type PlaySample } from './play-samples.ts';
import { appendPlayKeepalive, stripPlayKeepaliveTs } from './play-keepalive.ts';
import { playgroundWorkerJs } from './playground-worker.ts';
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
const entryPath = fileURLToPath(new URL('../compiler/entry.ts', import.meta.url));

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

type EcosystemCounts = Readonly<{
  lessons: number;
  tutorials: number;
  drills: number;
  workouts: number;
  docsPages: number;
  modules: number;
}>;

function renderHomePage(
  rendered: ReadonlyMap<string, RenderedSample>,
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
  counts: EcosystemCounts,
): string {
  const hero = rendered.get(heroSample.id);
  if (hero === undefined) throw new Error('missing rendered hero sample');
  const featuredIds = ['double-sum', 'factorial', 'decisions', 'script-arguments'];
  const featuredCards = featuredIds
    .map(id => rendered.get(id))
    .filter((s): s is RenderedSample => s !== undefined)
    .map(s => renderSampleCard(s, ''))
    .join('\n');

  const cloneUrl = repoUrl ? `${repoUrl}.git` : '<repository-url>';
  const cloneDir = repoUrl ? (repoUrl.split('/').pop() || 'Lite') : 'Lite';

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
      <a class="btn" href="learn/">Start Learning</a>
    </div>
    <div class="quickstart" role="region" aria-label="Quickstart shell commands">
      <div class="quickstart-head">
        <span class="quickstart-title">
          <span class="quickstart-dots" aria-hidden="true"><span></span><span></span><span></span></span>
          <span class="quickstart-label">shell</span>
        </span>
        <button id="quickstart-copy" class="quickstart-copy" type="button" aria-label="Copy shell commands">Copy</button>
      </div>
      <pre class="quickstart-body"><code><span class="shell-line"><span class="shell-cmd">git</span> clone ${escapeHtml(cloneUrl)}</span>
<span class="shell-line"><span class="shell-cmd">cd</span> ${escapeHtml(cloneDir)}</span>
<span class="shell-line"><span class="shell-cmd">./bin/lite</span> run ${escapeHtml(heroSample.file)}</span></code></pre>
    </div>
    <script>
      (function () {
        var copyBtn = document.getElementById("quickstart-copy");
        if (!copyBtn) return;
        var timer = 0;
        copyBtn.addEventListener("click", function () {
          var lines = Array.prototype.map.call(
            document.querySelectorAll(".quickstart-body .shell-line"),
            function (el) { return el.textContent || ""; }
          );
          var text = lines.join("\\n");
          function markCopied() {
            copyBtn.textContent = "Copied";
            copyBtn.classList.add("copied");
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(function () {
              copyBtn.textContent = "Copy";
              copyBtn.classList.remove("copied");
            }, 1600);
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(markCopied, function () {});
          } else {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try { if (document.execCommand("copy")) markCopied(); } catch (e) {}
            document.body.removeChild(ta);
          }
        });
      })();
    </script>
  </div>
  ${renderSampleCard(hero, '', false)}
</section>

<section class="section">
  <div class="section-head">
    <h2>Explore the Ecosystem</h2>
  </div>
  <div class="portal-grid">
    <article class="portal-card">
      <div class="portal-card-head">
        <h3><a href="learn/">Learn Lite</a></h3>
        <span class="badge">${String(counts.lessons)} lessons &middot; ${String(counts.tutorials)} tutorials</span>
      </div>
      <p>Guided curriculum across 7 domain tracks plus runnable browser &amp; Play tutorials.</p>
      <div class="portal-card-foot">
        <a href="learn/">Start Learning &rarr;</a>
      </div>
    </article>
    <article class="portal-card">
      <div class="portal-card-head">
        <h3><a href="gym/">Lite Gym</a></h3>
        <span class="badge">${String(counts.drills)} drills &middot; ${String(counts.workouts)} workouts</span>
      </div>
      <p>Litelings diagnostic drills and belt-ranked multi-test katas graded in-browser.</p>
      <div class="portal-card-foot">
        <a href="gym/">Enter Gym &rarr;</a>
      </div>
    </article>
    <article class="portal-card">
      <div class="portal-card-head">
        <h3><a href="docs/">Handbook &amp; Spec</a></h3>
        <span class="badge">${String(counts.docsPages)} pages</span>
      </div>
      <p>7-chapter runnable Shipped Handbook alongside status-badged design &amp; compiler docs.</p>
      <div class="portal-card-foot">
        <a href="docs/">Read Docs &rarr;</a>
      </div>
    </article>
    <article class="portal-card">
      <div class="portal-card-head">
        <h3><a href="modules/">Modules &amp; Tools</a></h3>
        <span class="badge">${String(counts.modules)} modules</span>
      </div>
      <p>Auto-generated <code>core/*</code> &amp; <code>extra/*</code> API reference, CLI guide, VS Code extension, and self-hosting ladder.</p>
      <div class="portal-card-foot">
        <a href="modules/">Modules &rarr;</a>
        <a href="tools/">Tools &rarr;</a>
      </div>
    </article>
  </div>
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
  const badgeHtml = sample.badge
    ? `<span class="gallery-badge">${escapeHtml(sample.badge)}</span>`
    : `<span class="code-card-meta">${escapeHtml(sample.file)}</span>`;
  const previewBlock = sample.previewSvg ?? '';
  return `<article class="code-card" id="sample-${escapeHtml(sample.id)}">
  <div class="code-card-head">
    <span class="code-card-title">${escapeHtml(sample.title)}</span>
    ${badgeHtml}
  </div>
  ${previewBlock}
  <p class="sample-note" style="flex: 1;">${escapeHtml(sample.note)}</p>
  <details class="gallery-code">
    <summary>Source (${escapeHtml(sample.file)})</summary>
    <pre class="code-block"><code>${sample.sourceHtml}</code></pre>
  </details>
  <footer class="sample-foot">
    <a href="${basePath}playground/?sample=${escapeHtml(sample.id)}">Play &rarr;</a>
  </footer>
</article>`;
}

function renderGalleryPage(
  rendered: ReadonlyMap<string, RenderedSample>,
  renderedPlay: ReadonlyMap<string, RenderedSample>,
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const languageJumps = sampleGroups.map(group => {
    const count = showcaseSamples.filter(s => s.group === group.id && rendered.has(s.id)).length;
    return `<a class="gallery-jump" href="#group-${escapeHtml(group.id)}">${escapeHtml(group.title)} <span>${String(count)}</span></a>`;
  }).join('\n      ');

  const playJumps = playGroups.map(group => {
    const count = playSamples.filter(s => s.group === group.id && renderedPlay.has(s.id)).length;
    return `<a class="gallery-jump" href="#group-${escapeHtml(group.id)}">${escapeHtml(group.title)} <span>${String(count)}</span></a>`;
  }).join('\n      ');

  const languageSections = sampleGroups.map(group => {
    const cards = showcaseSamples
      .filter(s => s.group === group.id)
      .map(s => rendered.get(s.id))
      .filter((s): s is RenderedSample => s !== undefined)
      .map(s => renderGalleryCard(s, '../'))
      .join('\n');
    const badge = group.folder ? `<span class="gallery-badge">${escapeHtml(group.folder)}/</span>` : '';
    return `<section class="section" id="group-${escapeHtml(group.id)}">
  <div class="section-head">
    <h2>${escapeHtml(group.title)}</h2>
    ${badge}
  </div>
  <p class="section-note">${escapeHtml(group.description)}</p>
  <div class="sample-grid">
    ${cards}
  </div>
</section>`;
  }).join('\n');

  const playSections = playGroups.map(group => {
    const cards = playSamples
      .filter(s => s.group === group.id)
      .map(s => renderedPlay.get(s.id))
      .filter((s): s is RenderedSample => s !== undefined)
      .map(s => renderGalleryCard(s, '../'))
      .join('\n');
    return `<section class="section" id="group-${escapeHtml(group.id)}">
  <div class="section-head">
    <h2>${escapeHtml(group.title)}</h2>
    <span class="gallery-badge">${escapeHtml(group.folder)}/</span>
  </div>
  <p class="section-note">${escapeHtml(group.description)}</p>
  <div class="sample-grid">
    ${cards}
  </div>
</section>`;
  }).join('\n');

  const body = `<section style="padding: 2rem 0 1.25rem;">
  <h1 style="margin: 0 0 0.5rem;">Gallery</h1>
  <p class="hero-lead" style="margin: 0 0 1rem;">
    All ${String(rendered.size)} core &amp; program examples and ${String(renderedPlay.size)} folder-grouped canvas, audio, and game showcases below are compiled and executed by the ${proseLite} compiler during the site build.
  </p>
  <nav class="gallery-jumps" aria-label="Gallery categories">
    <div class="gallery-tier-line">
      <span class="gallery-tier-label">Language &amp; Programs</span>
      ${languageJumps}
    </div>
    <div class="gallery-tier-line">
      <span class="gallery-tier-label">Play &mdash; Canvas, Audio &amp; Games</span>
      ${playJumps}
    </div>
  </nav>
</section>
${languageSections}
${playSections}`;

  return renderPage({
    title: 'Gallery — Lite',
    description: 'Verified Lite language examples and category-grouped canvas, audio, and game showcases.',
    basePath: '../',
    active: 'gallery',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

function renderPlaygroundPage(
  rendered: ReadonlyMap<string, RenderedSample>,
  renderedPlay: ReadonlyMap<string, RenderedSample>,
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const optionsHtml = sampleGroups.map(group => {
    const items = showcaseSamples
      .filter(s => s.group === group.id)
      .map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`)
      .join('');
    return `<optgroup label="${escapeHtml(group.title)}">${items}</optgroup>`;
  }).join('') + playGroups.map(group => {
    const items = playSamples
      .filter(s => s.group === group.id)
      .map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`)
      .join('');
    return `<optgroup label="Play — ${escapeHtml(group.title)}">${items}</optgroup>`;
  }).join('');

  const payload = [
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
  const serialized = JSON.stringify(payload).replaceAll('<', '\\u003c');

  const body = `<div id="pg-workbench" class="workbench">
  <section class="pane" aria-label="Source editor">
    <div class="pane-head">
      <div class="sample-picker">
        <select id="pg-samples" class="pg-select" aria-label="Choose a sample">${optionsHtml}</select>
        <button id="pg-reset" class="btn" type="button">Reset</button>
      </div>
      <div class="pg-actions">
        <button id="pg-save-snip" class="btn" type="button" title="Save current code as a UUIDv7 sketch in localStorage">Save</button>
        <button id="pg-sketches-btn" class="btn" type="button" title="Explore, rename, or clear saved localStorage sketches">Sketches <span id="pg-sketches-count" class="badge">0</span></button>
        <button id="pg-compile" class="btn" type="button">Compile</button>
        <button id="pg-play" class="btn btn-primary" type="button" title="Run (Ctrl/Cmd + Enter)">&#9654; Play</button>
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

  <div id="pg-split" class="pg-split" role="separator" aria-orientation="vertical" aria-label="Resize editor and inspector panes" aria-valuemin="20" aria-valuemax="80" aria-valuenow="50" tabindex="0" title="Drag to resize panes (double-click to reset 50/50)"></div>

  <section class="pane" aria-label="Compiler and output inspector">
    <div class="pane-head">
      <div class="pg-tabs" role="tablist">
        <button class="pg-tab" role="tab" data-tab="output" aria-selected="true" type="button">Output</button>
        <button class="pg-tab" role="tab" data-tab="ts" aria-selected="false" type="button">Generated TS</button>
        <button class="pg-tab" role="tab" data-tab="c" aria-selected="false" type="button">Generated C</button>
        <button id="tab-canvas" class="pg-tab" role="tab" data-tab="canvas" aria-selected="false" type="button" hidden>Canvas</button>
      </div>
      <div class="pg-actions">
        <span id="pg-status" class="pg-status" aria-live="polite">Ready</span>
        <button id="pg-pause" class="pg-pause-btn" type="button" aria-pressed="false" title="Playing — click to pause canvas events" hidden>
          <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true">
            <path class="pg-icon-playing" d="M4 2.5v11l9-5.5-9-5.5Z"/>
            <g class="pg-icon-paused"><rect x="3" y="2.5" width="3.5" height="11" rx="0.8"/><rect x="9.5" y="2.5" width="3.5" height="11" rx="0.8"/></g>
          </svg>
          <span id="pg-pause-label">Playing</span>
        </button>
        <button id="pg-copy" class="pg-copy-btn" type="button" aria-label="Copy inspector content">Copy</button>
      </div>
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
        <div class="pg-canvas-bar">
          <span id="pg-canvas-title" class="pg-canvas-title">Canvas Stage</span>
          <div class="pg-canvas-tools">
            <span id="pg-fps" class="pg-status">0.0 fps &middot; 0.0 ms</span>
            <span class="pg-sep" aria-hidden="true">&middot;</span>
            <span id="pg-canvas-size" class="pg-status">(320x200)</span>
            <span class="pg-sep" aria-hidden="true">&middot;</span>
            <button id="pg-mute" class="pg-mute-btn" type="button" aria-pressed="false" aria-label="Sound on — click to mute" title="Sound on — click to mute">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path class="pg-sound-body" d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4V5Z" fill="currentColor" fill-opacity="0.16"/>
                <path class="pg-sound-wave" d="M15.5 8.5a5 5 0 0 1 0 7"/>
                <path class="pg-sound-wave" d="M18.5 5.5a9 9 0 0 1 0 13"/>
                <line class="pg-sound-slash" x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke-width="2.2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="pg-canvas-stage">
          <canvas id="pg-canvas" class="pg-canvas" tabindex="0" width="320" height="200" aria-label="Lite Play canvas stage"></canvas>
        </div>
      </div>
    </div>
  </section>
</div>

<div id="pg-sketches-modal" class="snips-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pg-sketches-title" hidden>
  <div class="snips-modal">
    <div class="snips-modal-head">
      <h2 id="pg-sketches-title">Saved Sketches (localStorage · UUIDv7)</h2>
      <div class="pg-actions">
        <button id="pg-sketches-new" class="btn btn-primary" type="button">+ New Sketch</button>
        <button id="pg-sketches-clear" class="btn" type="button">Clear All</button>
        <button id="pg-sketches-close" class="btn" type="button" aria-label="Close sketches explorer">Close</button>
      </div>
    </div>
    <div class="snips-modal-tools">
      <input id="pg-sketches-filter" type="search" placeholder="Filter saved sketches by title, origin, or UUIDv7..." aria-label="Filter saved sketches">
      <span id="pg-sketches-summary" class="code-card-meta">0 saved</span>
    </div>
    <div id="pg-sketches-list" class="snips-list"></div>
  </div>
</div>

<script type="module">
  import { formatCodeView } from "./code-view.js";
  import { highlightLite, highlightTs, highlightC } from "./highlight.js";
  const samples = ${serialized};
  const byId = new Map(samples.map(s => [s.id, s]));
  const cache = new Map();
  const select = document.getElementById("pg-samples");
  const workbenchEl = document.getElementById("pg-workbench");
  const splitEl = document.getElementById("pg-split");
  const resetBtn = document.getElementById("pg-reset");
  const compileBtn = document.getElementById("pg-compile");
  const playBtn = document.getElementById("pg-play");
  const pauseBtn = document.getElementById("pg-pause");
  const pauseLabelEl = document.getElementById("pg-pause-label");
  const copyBtn = document.getElementById("pg-copy");
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
  const canvas = document.getElementById("pg-canvas");
  const ctx = canvas.getContext("2d");
  const canvasTitleEl = document.getElementById("pg-canvas-title");
  const canvasSizeEl = document.getElementById("pg-canvas-size");
  const muteBtn = document.getElementById("pg-mute");
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
  let playInFlight = false;
  let activePlay = false;
  let activeCanvas = false;
  let playableCanvas = false;
  let canvasPaused = false;
  let playExitStatus = 0;
  let audioMuted = false;
  let audioContext = null;
  let stageImage = null;
  let stageWidth = 0;
  let stageHeight = 0;
  let hasPlayLoop = false;
  let lastPointerMoveAt = 0;
  let worker = null;
  let nextReqId = 1;
  const pending = new Map();
  const snipsApi = typeof window !== "undefined" && window.LiteSnips ? window.LiteSnips : null;
  let activeSnipId = null;
  let snipSaveTimer = 0;

  function syncSnipsBadge() {
    const badge = document.getElementById("pg-sketches-count");
    if (badge && snipsApi) badge.textContent = String(snipsApi.list().length);
  }

  function scheduleSnipAutosave() {
    if (!snipsApi || !activeSnipId) return;
    if (snipSaveTimer) window.clearTimeout(snipSaveTimer);
    snipSaveTimer = window.setTimeout(() => {
      snipSaveTimer = 0;
      if (!activeSnipId) return;
      snipsApi.update(activeSnipId, {
        code: editorEl.value,
        stdin: stdinEl.value.replaceAll("\\\\n", "\\n"),
        args: argsEl.value,
      });
    }, 250);
  }

  const SPLIT_KEY = "lite.pg.split";
  let splitPct = 50;
  function applySplit(pct, save) {
    const clamped = Math.max(20, Math.min(80, Math.round(pct * 10) / 10));
    splitPct = clamped;
    workbenchEl.style.setProperty("--pg-split", clamped + "%");
    splitEl.setAttribute("aria-valuenow", String(Math.round(clamped)));
    if (save) {
      try { window.localStorage.setItem(SPLIT_KEY, String(clamped)); } catch {}
    }
  }
  try {
    const savedSplit = Number(window.localStorage.getItem(SPLIT_KEY));
    if (Number.isFinite(savedSplit) && savedSplit >= 20 && savedSplit <= 80) {
      applySplit(savedSplit, false);
    }
  } catch {}

  let dragSplitId = null;
  splitEl.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    dragSplitId = event.pointerId;
    splitEl.setPointerCapture(event.pointerId);
    splitEl.classList.add("dragging");
    document.body.classList.add("pg-resizing");
  });
  splitEl.addEventListener("pointermove", (event) => {
    if (dragSplitId !== event.pointerId) return;
    const rect = workbenchEl.getBoundingClientRect();
    if (!rect.width) return;
    applySplit(((event.clientX - rect.left) / rect.width) * 100, false);
  });
  function stopSplitDrag(event) {
    if (dragSplitId !== event.pointerId) return;
    dragSplitId = null;
    if (splitEl.hasPointerCapture(event.pointerId)) {
      splitEl.releasePointerCapture(event.pointerId);
    }
    splitEl.classList.remove("dragging");
    document.body.classList.remove("pg-resizing");
    applySplit(splitPct, true);
  }
  splitEl.addEventListener("pointerup", stopSplitDrag);
  splitEl.addEventListener("pointercancel", stopSplitDrag);
  splitEl.addEventListener("dblclick", () => { applySplit(50, true); });
  splitEl.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 5 : 2;
    if (event.key === "ArrowLeft") { event.preventDefault(); applySplit(splitPct - step, true); }
    else if (event.key === "ArrowRight") { event.preventDefault(); applySplit(splitPct + step, true); }
    else if (event.key === "Home") { event.preventDefault(); applySplit(20, true); }
    else if (event.key === "End") { event.preventDefault(); applySplit(80, true); }
    else if (event.key === "0") { event.preventDefault(); applySplit(50, true); }
  });

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
    const showPause = name === "canvas" && playableCanvas;
    codeModesBar.hidden = name !== "ts" && name !== "c";
    copyBtn.hidden = name === "canvas";
    pauseBtn.hidden = !showPause;
    statusEl.hidden = showPause && statusEl.textContent !== "Modified";
    if (name === "canvas") resumeCanvasLoop();
    else pauseCanvasLoop();
    if (name === "c") void compileCForEditor();
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      showTab(tab.dataset.tab);
      if (tab.dataset.tab === "canvas") canvas.focus({ preventScroll: true });
    });
  }

  editorEl.addEventListener("input", () => {
    pauseCanvasLoop();
    sourceEl.innerHTML = highlightLite(editorEl.value) + "\\n";
    statusEl.textContent = activeSnipId ? "Modified (autosaving sketch)" : "Modified";
    statusEl.hidden = false;
    scheduleSnipAutosave();
  });
  stdinEl.addEventListener("input", scheduleSnipAutosave);
  argsEl.addEventListener("input", scheduleSnipAutosave);

  editorEl.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      unlockAudio();
      void runAction("play");
      return;
    }
    if (event.key === "Tab" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      const start = editorEl.selectionStart;
      const end = editorEl.selectionEnd;
      editorEl.setRangeText("  ", start, end, "end");
      sourceEl.innerHTML = highlightLite(editorEl.value) + "\\n";
      statusEl.textContent = "Modified";
    }
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
    activeSnipId = null;
    stopPlay(true);
    select.value = meta.id;
    fileEl.textContent = meta.file;
    statusEl.textContent = "Loading " + meta.file + "...";

    const url = new URL(window.location.href);
    url.searchParams.delete("snip");
    url.searchParams.delete("draft");
    url.searchParams.set("sample", meta.id);
    window.history.replaceState({}, "", url);

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
    } else if (meta.play) {
      await runAction("play");
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

  function runInWorker(action, source, stdin, args, extra) {
    return new Promise((resolve, reject) => {
      const id = nextReqId++;
      pending.set(id, { resolve, reject });
      getWorker().postMessage({ id, action, source, stdin, args, ...(extra || {}) });
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
    stopPlay(false);
    const source = editorEl.value;
    const stdin = parseStdin();
    const args = parseArgs();
    statusEl.hidden = false;
    statusEl.textContent = action === "compile" ? "Compiling in browser..." : "Running in browser...";
    if (action === "play") {
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
        tabCanvas.hidden = true;
        showTab("output");
        outputEl.textContent = (res.stdout ? res.stdout + "\\n" : "") + (res.stderr || "Execution failed.");
        statusEl.textContent = res.ts ? "Runtime error" : "Compile error";
        return;
      }
      if (action === "compile") {
        if (activeTab !== "c") showTab("ts");
        statusEl.textContent = "Compiled to TypeScript" + (res.c ? " & C" : "");
        return;
      }

      outputEl.textContent = res.stdout + (res.stderr ? (res.stdout ? "\\n" : "") + res.stderr : "");
      if (Array.isArray(res.tones) && res.tones.length > 0) playToneEvents(res.tones);

      const frame = res.play || res.canvas;
      if (frame && frame.width > 0 && frame.height > 0) {
        applyPlayFrame(frame);
        tabCanvas.hidden = false;
        activeCanvas = true;
        canvasPaused = false;
        if (res.play) {
          hasPlayLoop = Boolean(res.play.hasUpdate);
          playExitStatus = Number(res.play.status ?? 0);
          activePlay = hasPlayLoop && playExitStatus === 0;
          playableCanvas = true;
          showTab("canvas");
          syncPauseUi(true);
          canvas.focus({ preventScroll: true });
        } else {
          hasPlayLoop = false;
          playExitStatus = 0;
          activePlay = false;
          playableCanvas = false;
          syncPauseUi(false);
          statusEl.textContent = "Rendered canvas (in browser)";
          showTab("canvas");
        }
      } else {
        playableCanvas = false;
        syncPauseUi(false);
        tabCanvas.hidden = true;
        showTab("output");
        statusEl.textContent = "Exited 0 (in browser)";
      }
    } catch (err) {
      tabCanvas.hidden = true;
      showTab("output");
      outputEl.textContent = err instanceof Error ? err.message : String(err);
      statusEl.textContent = "Worker error";
    }
  }

  select.addEventListener("change", () => { unlockAudio(); void loadSample(select.value, "load"); });
  resetBtn.addEventListener("click", () => { unlockAudio(); void loadSample(select.value, "load"); });
  compileBtn.addEventListener("click", () => { void runAction("compile"); });
  playBtn.addEventListener("click", () => { unlockAudio(); void runAction("play"); });

  function playReadyStatus() {
    if (activePlay) return "Playing";
    if (hasPlayLoop && playExitStatus !== 0) return "Stopped (" + playExitStatus + ")";
    return "Interactive";
  }

  function syncPauseUi(updateStatus) {
    const showPause = activeTab === "canvas" && playableCanvas;
    pauseBtn.hidden = !showPause;
    pauseBtn.setAttribute("aria-pressed", canvasPaused ? "true" : "false");
    const stateText = canvasPaused ? "Paused" : playReadyStatus();
    pauseLabelEl.textContent = stateText;
    const tip = canvasPaused
      ? "Paused — click to resume canvas events"
      : stateText + " — click to pause canvas events";
    pauseBtn.title = tip;
    pauseBtn.setAttribute("aria-label", tip);
    if (updateStatus && playableCanvas) {
      statusEl.textContent = canvasPaused ? "Paused" : (stateText === "Interactive" ? "Interactive ready" : stateText);
    }
    statusEl.hidden = showPause && statusEl.textContent !== "Modified";
  }
  syncPauseUi(false);

  pauseBtn.addEventListener("click", () => {
    if (!activeCanvas || !playableCanvas) return;
    canvasPaused = !canvasPaused;
    if (canvasPaused) {
      pauseCanvasLoop();
      fpsEl.textContent = "0.0 fps · 0.0 ms";
    } else if (activeTab === "canvas") {
      unlockAudio();
      resumeCanvasLoop();
      canvas.focus({ preventScroll: true });
    }
    syncPauseUi(true);
  });

  function syncMuteUi() {
    muteBtn.setAttribute("aria-pressed", audioMuted ? "true" : "false");
    const label = audioMuted ? "Sound off — click to turn sound on" : "Sound on — click to mute";
    muteBtn.title = label;
    muteBtn.setAttribute("aria-label", label);
  }
  syncMuteUi();

  muteBtn.addEventListener("click", () => {
    audioMuted = !audioMuted;
    syncMuteUi();
    if (!audioMuted) unlockAudio();
  });

  let copyTimer = 0;
  copyBtn.addEventListener("click", () => {
    const target = activeTab === "ts" ? tsEl : activeTab === "c" ? cEl : outputEl;
    const text = target.textContent || "";
    if (!text) return;
    const markCopied = () => {
      copyBtn.textContent = "Copied";
      copyBtn.classList.add("copied");
      if (copyTimer) window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("copied");
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(markCopied, () => {});
    }
  });

  function unlockAudio() {
    if (audioMuted) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioContext) audioContext = new AudioCtx();
    if (audioContext.state === "suspended") {
      const resumed = audioContext.resume();
      if (resumed && resumed.catch) resumed.catch(() => {});
    }
  }

  function playToneEvents(values) {
    if (audioMuted || !Array.isArray(values) || values.length < 3) return;
    unlockAudio();
    if (!audioContext || audioContext.state !== "running") return;
    let index = 0;
    while (index + 2 < values.length) {
      const frequency = Number(values[index]);
      const durationMs = Number(values[index + 1]);
      const volumePercent = Number(values[index + 2]);
      index += 3;
      if (!Number.isFinite(frequency) || frequency < 20 || frequency > 20000
        || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 3000
        || !Number.isFinite(volumePercent) || volumePercent <= 0 || volumePercent > 100) {
        continue;
      }
      const duration = durationMs / 1000;
      const volume = (volumePercent / 100) * 0.45;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startAt = audioContext.currentTime;
      const ramp = Math.min(duration / 4, 0.01);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(volume, startAt + ramp);
      gain.gain.setValueAtTime(volume, Math.max(startAt + ramp, startAt + duration - ramp));
      gain.gain.linearRampToValueAtTime(0, startAt + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
    }
  }

  function setStagePixel(idx, r, g, b, a) {
    const data = stageImage.data;
    const off = idx * 4;
    if (a >= 255) {
      data[off] = r;
      data[off + 1] = g;
      data[off + 2] = b;
      data[off + 3] = 255;
      return;
    }
    if (a <= 0) return;
    const inv = 255 - a;
    const dstA = data[off + 3];
    if (dstA === 0) {
      data[off] = r;
      data[off + 1] = g;
      data[off + 2] = b;
      data[off + 3] = a;
    } else {
      data[off] = Math.round((r * a + data[off] * inv) / 255);
      data[off + 1] = Math.round((g * a + data[off + 1] * inv) / 255);
      data[off + 2] = Math.round((b * a + data[off + 2] * inv) / 255);
      data[off + 3] = Math.min(255, dstA + Math.round((a * inv) / 255));
    }
  }

  function applyPlayFrame(frame) {
    if (!frame || frame.width < 1 || frame.height < 1) return;
    if (stageWidth !== frame.width || stageHeight !== frame.height || !stageImage) {
      stageWidth = frame.width;
      stageHeight = frame.height;
      canvas.width = stageWidth;
      canvas.height = stageHeight;
      stageImage = ctx.createImageData(stageWidth, stageHeight);
    }
    canvasSizeEl.textContent = "(" + stageWidth + "x" + stageHeight + ")";
    if (typeof frame.title === "string") {
      canvasTitleEl.textContent = frame.title || "Canvas Stage";
      canvas.title = frame.title || "Canvas Stage";
    }
    if (Array.isArray(frame.pixels)) {
      const data = stageImage.data;
      if (frame.pixels.length === 0) {
        data.fill(0);
      } else {
        const count = Math.min(frame.pixels.length, stageWidth * stageHeight);
        for (let i = 0; i < count; i += 1) {
          const c = Number(frame.pixels[i]) >>> 0;
          const off = i * 4;
          data[off] = (c >>> 16) & 255;
          data[off + 1] = (c >>> 8) & 255;
          data[off + 2] = c & 255;
          data[off + 3] = (c >>> 24) & 255;
        }
      }
    }
    const ops = frame.ops;
    if (Array.isArray(ops) && ops.length > 0) {
      let idx = 0;
      while (idx < ops.length) {
        const op = Number(ops[idx++]);
        if (op === 1 && idx < ops.length) {
          const c = Number(ops[idx++]) >>> 0;
          const a = (c >>> 24) & 255;
          const r = (c >>> 16) & 255;
          const g = (c >>> 8) & 255;
          const b = c & 255;
          const data = stageImage.data;
          for (let off = 0; off < data.length; off += 4) {
            data[off] = r;
            data[off + 1] = g;
            data[off + 2] = b;
            data[off + 3] = a;
          }
        } else if (op === 2 && idx + 4 < ops.length) {
          const rx = Number(ops[idx++]);
          const ry = Number(ops[idx++]);
          const rw = Number(ops[idx++]);
          const rh = Number(ops[idx++]);
          const c = Number(ops[idx++]) >>> 0;
          const a = (c >>> 24) & 255;
          const r = (c >>> 16) & 255;
          const g = (c >>> 8) & 255;
          const b = c & 255;
          const x0 = Math.max(0, Math.trunc(rx));
          const y0 = Math.max(0, Math.trunc(ry));
          const x1 = Math.min(stageWidth, Math.trunc(rx + rw));
          const y1 = Math.min(stageHeight, Math.trunc(ry + rh));
          for (let py = y0; py < y1; py += 1) {
            const rowOff = py * stageWidth;
            for (let px = x0; px < x1; px += 1) {
              setStagePixel(rowOff + px, r, g, b, a);
            }
          }
        } else {
          break;
        }
      }
    }
    ctx.putImageData(stageImage, 0, 0);
  }

  function pauseCanvasLoop() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = 0; }
    playInFlight = false;
    lastFrameAt = 0;
  }

  function resumeCanvasLoop() {
    if (activePlay && hasPlayLoop && !canvasPaused && !animFrame) {
      lastFrameAt = 0;
      animFrame = requestAnimationFrame(stepCanvasFrame);
    }
  }

  function stopPlay(hideTab) {
    pauseCanvasLoop();
    activePlay = false;
    activeCanvas = false;
    hasPlayLoop = false;
    playableCanvas = false;
    canvasPaused = false;
    playExitStatus = 0;
    fpsEl.textContent = "0.0 fps · 0.0 ms";
    syncPauseUi(false);
    if (worker) worker.postMessage({ action: "stop" });
    if (hideTab) {
      tabCanvas.hidden = true;
      if (activeTab === "canvas") showTab("output");
    }
  }

  async function sendPlayInteraction(action, payload) {
    if (!activeCanvas || canvasPaused) return;
    try {
      const res = await new Promise((resolve, reject) => {
        const id = nextReqId++;
        pending.set(id, { resolve, reject });
        getWorker().postMessage({ id, action, ...payload });
      });
      if (!activeCanvas || canvasPaused) return;
      if (Array.isArray(res.tones) && res.tones.length > 0) playToneEvents(res.tones);
      if (res.frame) applyPlayFrame(res.frame);
    } catch {
      // Ignore superseded interaction replies
    }
  }

  async function stepCanvasFrame(now) {
    animFrame = 0;
    if (!activePlay || canvasPaused || activeTab !== "canvas") return;
    if (playInFlight) {
      animFrame = requestAnimationFrame(stepCanvasFrame);
      return;
    }
    const dtMs = lastFrameAt === 0 ? 16.667 : Math.max(now - lastFrameAt, 1);
    const dtSec = Math.min(dtMs / 1000, 0.1);
    if (lastFrameAt !== 0) {
      fpsEl.textContent = (1000 / dtMs).toFixed(1) + " fps · " + dtMs.toFixed(1) + " ms";
    }
    lastFrameAt = now;
    playInFlight = true;
    try {
      const res = await runInWorker("step", "", "", [], { dt: dtSec });
      playInFlight = false;
      if (!activePlay || canvasPaused) return;
      if (Array.isArray(res.tones) && res.tones.length > 0) playToneEvents(res.tones);
      if (res.frame) applyPlayFrame(res.frame);
      if (!res.ok) {
        activePlay = false;
        statusEl.textContent = "Play error";
        outputEl.textContent = res.stderr || "Canvas update failed.";
        showTab("output");
        return;
      }
      if (res.status === 0) {
        if (activeTab === "canvas") animFrame = requestAnimationFrame(stepCanvasFrame);
      } else {
        activePlay = false;
        playExitStatus = res.status;
        syncPauseUi(true);
      }
    } catch {
      playInFlight = false;
      activePlay = false;
    }
  }

  function getCanvasCell(event) {
    const bounds = canvas.getBoundingClientRect();
    const cw = stageWidth || canvas.width;
    const ch = stageHeight || canvas.height;
    if (!bounds.width || !bounds.height || !cw || !ch) return { x: 0, y: 0 };
    const scale = Math.min(bounds.width / cw, bounds.height / ch);
    const drawW = cw * scale;
    const drawH = ch * scale;
    const left = bounds.left + (bounds.width - drawW) / 2;
    const top = bounds.top + (bounds.height - drawH) / 2;
    const x = Math.max(0, Math.min(cw - 1, Math.floor((event.clientX - left) / scale)));
    const y = Math.max(0, Math.min(ch - 1, Math.floor((event.clientY - top) / scale)));
    return { x, y };
  }

  canvas.addEventListener("keydown", (event) => {
    if (!activeCanvas || canvasPaused) return;
    unlockAudio();
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
      event.preventDefault();
    }
    void sendPlayInteraction("keydown", { key: event.key });
  });

  canvas.addEventListener("keyup", (event) => {
    if (!activeCanvas || canvasPaused) return;
    void sendPlayInteraction("keyup", { key: event.key });
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!activeCanvas || canvasPaused) return;
    const now = performance.now();
    if (now - lastPointerMoveAt < 16) return;
    lastPointerMoveAt = now;
    const cell = getCanvasCell(event);
    void sendPlayInteraction("pointermove", cell);
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!activeCanvas || canvasPaused) return;
    unlockAudio();
    canvas.focus({ preventScroll: true });
    const cell = getCanvasCell(event);
    void sendPlayInteraction("pointerdown", { ...cell, button: event.button });
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!activeCanvas || canvasPaused) return;
    const cell = getCanvasCell(event);
    void sendPlayInteraction("pointerup", { ...cell, button: event.button });
  });

  function loadSnip(id) {
    if (!snipsApi) return false;
    const snip = snipsApi.get(id);
    if (!snip) return false;
    stopPlay(true);
    activeSnipId = snip.id;
    currentSample = null;
    editorEl.value = snip.code;
    sourceEl.innerHTML = highlightLite(snip.code) + "\\n";
    editorEl.scrollTop = 0;
    editorEl.scrollLeft = 0;
    stdinEl.value = String(snip.stdin || "").replaceAll("\\n", "\\\\n");
    argsEl.value = String(snip.args || "");
    fileEl.textContent = snip.title + " · " + snip.id.slice(0, 8);
    rawTs = "";
    rawC = "";
    cMessage = "/* Press Compile or open Generated C to emit C. */";
    lastCSource = null;
    renderCodeViews();
    outputEl.textContent = "(Press Play to run)";
    statusEl.textContent = "Loaded sketch: " + snip.title;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("sample");
    nextUrl.searchParams.delete("draft");
    nextUrl.searchParams.set("snip", snip.id);
    window.history.replaceState({}, "", nextUrl);
    syncSnipsBadge();
    return true;
  }

  const saveSnipBtn = document.getElementById("pg-save-snip");
  const sketchesBtn = document.getElementById("pg-sketches-btn");
  const sketchesModal = document.getElementById("pg-sketches-modal");
  const sketchesClose = document.getElementById("pg-sketches-close");
  const sketchesNew = document.getElementById("pg-sketches-new");
  const sketchesClear = document.getElementById("pg-sketches-clear");
  const sketchesFilter = document.getElementById("pg-sketches-filter");
  const sketchesSummary = document.getElementById("pg-sketches-summary");
  const sketchesList = document.getElementById("pg-sketches-list");
  let clearArmed = false;

  function renderSketchesList() {
    if (!snipsApi || !sketchesList) return;
    const all = snipsApi.list();
    const q = sketchesFilter ? sketchesFilter.value.trim().toLowerCase() : "";
    const filtered = q
      ? all.filter((item) =>
          item.title.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.origin.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q),
        )
      : all;
    if (sketchesSummary) {
      sketchesSummary.textContent = filtered.length + " of " + all.length + " saved";
    }
    sketchesList.innerHTML = "";
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "gym-result-empty";
      empty.textContent = all.length === 0
        ? "No saved sketches yet. Click Save on any program or Open in Play from Docs, Learn, or Gym."
        : "No saved sketches match your filter.";
      sketchesList.appendChild(empty);
      return;
    }

    for (const item of filtered) {
      const row = document.createElement("article");
      row.className = "snips-item" + (item.id === activeSnipId ? " active" : "");

      const head = document.createElement("div");
      head.className = "snips-item-head";

      const titleSpan = document.createElement("span");
      titleSpan.className = "snips-item-title";
      titleSpan.textContent = item.title;
      head.appendChild(titleSpan);

      const meta = document.createElement("div");
      meta.className = "snips-item-meta";
      const idCode = document.createElement("code");
      idCode.textContent = item.id;
      const originSpan = document.createElement("span");
      originSpan.className = "badge";
      originSpan.textContent = item.origin || "custom";
      const dateSpan = document.createElement("span");
      dateSpan.textContent = String(item.updatedAt || "").slice(0, 16).replace("T", " ");
      meta.appendChild(idCode);
      meta.appendChild(originSpan);
      meta.appendChild(dateSpan);

      const preview = document.createElement("pre");
      preview.className = "snips-preview";
      preview.textContent = (item.code.split("\\n").find((l) => l.trim() !== "") || "(empty)").trim();

      const actions = document.createElement("div");
      actions.className = "snips-item-actions";

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "btn btn-primary";
      openBtn.textContent = item.id === activeSnipId ? "Loaded" : "Open";
      openBtn.addEventListener("click", () => {
        loadSnip(item.id);
        if (sketchesModal) sketchesModal.hidden = true;
      });

      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.className = "btn";
      renameBtn.textContent = "Rename";
      renameBtn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "snips-rename-input";
        input.value = item.title;
        input.setAttribute("aria-label", "New title for sketch");
        const saveTitleBtn = document.createElement("button");
        saveTitleBtn.type = "button";
        saveTitleBtn.className = "btn btn-primary";
        saveTitleBtn.textContent = "Save Title";
        const wrap = document.createElement("div");
        wrap.className = "snips-rename-row";
        wrap.appendChild(input);
        wrap.appendChild(saveTitleBtn);
        head.replaceChild(wrap, titleSpan);
        input.focus();
        input.select();
        const commitRename = () => {
          const nextTitle = input.value.trim();
          if (nextTitle) {
            snipsApi.update(item.id, { title: nextTitle });
            if (item.id === activeSnipId) {
              fileEl.textContent = nextTitle + " · " + item.id.slice(0, 8);
            }
          }
          renderSketchesList();
        };
        saveTitleBtn.addEventListener("click", commitRename);
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") { ev.preventDefault(); commitRename(); }
          else if (ev.key === "Escape") { ev.preventDefault(); renderSketchesList(); }
        });
      });

      const dupBtn = document.createElement("button");
      dupBtn.type = "button";
      dupBtn.className = "btn";
      dupBtn.textContent = "Duplicate";
      dupBtn.addEventListener("click", () => {
        snipsApi.saveNew({
          title: item.title + " (copy)",
          code: item.code,
          stdin: item.stdin,
          args: item.args,
          origin: item.origin,
        });
        syncSnipsBadge();
        renderSketchesList();
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        snipsApi.remove(item.id);
        if (item.id === activeSnipId) activeSnipId = null;
        syncSnipsBadge();
        renderSketchesList();
      });

      actions.appendChild(openBtn);
      actions.appendChild(renameBtn);
      actions.appendChild(dupBtn);
      actions.appendChild(delBtn);

      row.appendChild(head);
      row.appendChild(meta);
      row.appendChild(preview);
      row.appendChild(actions);
      sketchesList.appendChild(row);
    }
  }

  if (saveSnipBtn && snipsApi) {
    saveSnipBtn.addEventListener("click", () => {
      const cleanStdin = stdinEl.value.replaceAll("\\\\n", "\\n");
      if (activeSnipId) {
        const updated = snipsApi.update(activeSnipId, {
          code: editorEl.value,
          stdin: cleanStdin,
          args: argsEl.value,
        });
        if (updated) {
          statusEl.textContent = "Saved sketch (" + updated.id.slice(0, 8) + ")";
          syncSnipsBadge();
          return;
        }
      }
      const defaultTitle = currentSample && currentSample.id
        ? (byId.get(currentSample.id)?.title ?? currentSample.id)
        : "Custom Sketch";
      const created = snipsApi.saveNew({
        title: defaultTitle,
        code: editorEl.value,
        stdin: cleanStdin,
        args: argsEl.value,
        origin: currentSample ? "sample:" + currentSample.id : "playground",
      });
      if (created) {
        activeSnipId = created.id;
        fileEl.textContent = created.title + " · " + created.id.slice(0, 8);
        statusEl.textContent = "Saved new sketch (" + created.id.slice(0, 8) + ")";
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("sample");
        nextUrl.searchParams.set("snip", created.id);
        window.history.replaceState({}, "", nextUrl);
        syncSnipsBadge();
      }
    });
  }

  if (sketchesBtn && sketchesModal) {
    sketchesBtn.addEventListener("click", () => {
      clearArmed = false;
      if (sketchesClear) sketchesClear.textContent = "Clear All";
      renderSketchesList();
      sketchesModal.hidden = false;
      if (sketchesFilter) sketchesFilter.focus();
    });
    if (sketchesClose) {
      sketchesClose.addEventListener("click", () => { sketchesModal.hidden = true; });
    }
    sketchesModal.addEventListener("click", (ev) => {
      if (ev.target === sketchesModal) sketchesModal.hidden = true;
    });
    if (sketchesFilter) {
      sketchesFilter.addEventListener("input", renderSketchesList);
    }
    if (sketchesNew && snipsApi) {
      sketchesNew.addEventListener("click", () => {
        const created = snipsApi.saveNew({
          title: "Custom Sketch",
          code: 'io := import "core/io";\\n\\nio.outputLine("Hello from Lite!");\\n',
          stdin: "",
          args: "",
          origin: "custom",
        });
        if (created) {
          loadSnip(created.id);
          sketchesModal.hidden = true;
        }
      });
    }
    if (sketchesClear && snipsApi) {
      sketchesClear.addEventListener("click", () => {
        if (!clearArmed) {
          clearArmed = true;
          sketchesClear.textContent = "Confirm Clear All";
          return;
        }
        clearArmed = false;
        sketchesClear.textContent = "Clear All";
        snipsApi.clear();
        activeSnipId = null;
        syncSnipsBadge();
        renderSketchesList();
        statusEl.textContent = "Cleared saved sketches";
      });
    }
  }
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("lite:snips-changed", syncSnipsBadge);
  }
  syncSnipsBadge();

  const urlParams = new URLSearchParams(window.location.search);
  const initial = urlParams.get("sample") ?? "${escapeHtml(playgroundDefaultSample.id)}";
  const snipIdParam = urlParams.get("snip");
  let loadedDraft = Boolean(snipIdParam && loadSnip(snipIdParam));
  if (!loadedDraft && urlParams.get("draft") === "gym" && typeof sessionStorage !== "undefined") {
    try {
      const rawDraft = sessionStorage.getItem("lite-playground-draft-v1");
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft && typeof draft.source === "string") {
          editorEl.value = draft.source;
          sourceEl.innerHTML = highlightLite(draft.source) + "\\n";
          stdinEl.value = String(draft.stdin || "").replaceAll("\\n", "\\\\n");
          argsEl.value = "";
          fileEl.textContent = (draft.title || "gym") + ".lts";
          rawTs = "";
          rawC = "";
          cMessage = "/* Press Compile or open Generated C to emit C. */";
          lastCSource = null;
          renderCodeViews();
          outputEl.textContent = "(Press Play to run)";
          statusEl.textContent = "Loaded from Lite Gym — press Play";
          loadedDraft = true;
        }
      }
    } catch {}
  }
  if (!loadedDraft) void loadSample(initial, "load");
</script>`;

  return renderPage({
    title: 'Playground — Lite',
    description: 'Write, compile to TypeScript or C, and run Lite programs in your browser.',
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
  writeFileSync(join(outputDir, 'gallery', 'index.html'), renderGalleryPage(rendered, renderedPlay, repoUrl, rev, lightSwitchShine));
  writeFileSync(join(outputDir, 'playground', 'index.html'), renderPlaygroundPage(rendered, renderedPlay, repoUrl, rev, lightSwitchShine));

  const compilerJs = stripTypeScriptTypes(readFileSync(join(root, 'compiler', 'bootstrap', 'compiler.ts'), 'utf8'), { mode: 'strip' });
  const compilerCJs = stripTypeScriptTypes(readFileSync(buildCCompiler().path, 'utf8'), { mode: 'strip' });
  const stripTsJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'strip-ts.ts'), 'utf8'), { mode: 'strip' });
  const playKeepaliveJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'play-keepalive.ts'), 'utf8'), { mode: 'strip' });
  const codeViewJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'code-view.ts'), 'utf8'), { mode: 'strip' });
  const highlightJs = stripTypeScriptTypes(readFileSync(join(root, 'site', 'highlight.ts'), 'utf8'), { mode: 'strip' });

  const stdlib: Record<string, Readonly<{ path: string; display: string; identity: string; text: string }>> = {};
  for (const ns of ['core', 'extra'] as const) {
    const libDir = join(root, 'lib', ns);
    for (const name of readdirSync(libDir).filter(f => f.endsWith('.lts')).sort()) {
      const relPath = `lib/${ns}/${name}`;
      const text = readFileSync(join(libDir, name), 'utf8');
      const modName = `${ns}/${name.slice(0, -4)}`;
      stdlib[modName] = { path: relPath, display: relPath, identity: sourceModuleIdentity(text), text };
    }
  }
  const stdlibJson = JSON.stringify(stdlib);

  for (const targetDir of [join(outputDir, 'runtime'), join(outputDir, 'playground')]) {
    writeFileSync(join(targetDir, 'compiler.js'), compilerJs);
    writeFileSync(join(targetDir, 'compiler-c.js'), compilerCJs);
    writeFileSync(join(targetDir, 'strip-ts.js'), stripTsJs);
    writeFileSync(join(targetDir, 'play-keepalive.js'), playKeepaliveJs);
    writeFileSync(join(targetDir, 'code-view.js'), codeViewJs);
    writeFileSync(join(targetDir, 'highlight.js'), highlightJs);
    writeFileSync(join(targetDir, 'worker.js'), playgroundWorkerJs);
    writeFileSync(join(targetDir, 'stdlib.json'), stdlibJson);
  }
  writeFileSync(join(outputDir, 'runtime', 'search.js'), searchClientJs);
  writeFileSync(join(outputDir, 'runtime', 'snips.js'), snipsClientJs);

  const extractedModules = extractModules(root);
  const modulesOut = buildModulesSection({
    modules: extractedModules,
    showcaseSamples,
    playSamples,
    playGroups,
    repoUrl,
    rev,
    lightSwitchShine,
  });
  for (const [relPath, html] of modulesOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }

  const toolsOut = buildToolsSection({ repoUrl, rev, lightSwitchShine });
  mkdirSync(join(outputDir, 'tools'), { recursive: true });
  writeFileSync(join(outputDir, 'tools', 'index.html'), toolsOut.html);

  const docsOut = buildDocsSection({
    showcaseSamples,
    playSamples,
    repoUrl,
    rev,
    lightSwitchShine,
  });
  for (const [relPath, html] of docsOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }

  const learnOut = buildLearnSection({
    tsCompiler,
    modules: extractedModules,
    showcaseSamples,
    playSamples,
    repoUrl,
    rev,
    lightSwitchShine,
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
  });
  for (const [relPath, content] of gymOut.files) {
    const dest = join(outputDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }

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
  writeFileSync(
    join(outputDir, 'index.html'),
    renderHomePage(rendered, repoUrl, rev, lightSwitchShine, {
      lessons: learnOut.lessonCount,
      tutorials: learnOut.tutorialCount,
      drills: gymOut.drillCount,
      workouts: gymOut.kataCount,
      docsPages: docsOut.files.size,
      modules: extractedModules.length,
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

  console.log(`Built Lite site (${String(rendered.size)} verified samples) -> dist/site/`);
}

if (import.meta.main) {
  buildSite(parseBuildArgs(process.argv.slice(2)));
}
