#!/usr/bin/env node
/** Build the static public showcase site and playground into dist/site/. */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTs } from '../compiler/host.ts';
import { heroSample, sampleGroups, showcaseSamples, type ShowcaseSample } from './groups.ts';
import { escapeHtml, highlightLite, highlightTs } from './highlight.ts';
import { siteCss } from './styles.ts';

type RenderedSample = ShowcaseSample & Readonly<{
  source: string;
  sourceHtml: string;
  generatedTs: string;
  tsHtml: string;
  output: string;
}>;

type SourceRevision = Readonly<{
  commit: string;
  timestamp: string;
}>;

const root = dirname(import.meta.dirname);
const outputDir = join(root, 'dist', 'site');
const entryPath = fileURLToPath(new URL('../compiler/entry.ts', import.meta.url));
const brandWordmark = readFileSync(join(root, 'brand', 'lite-wordmark.svg'), 'utf8').trim();

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

function renderHeader(basePath: string, active: 'home' | 'playground' | 'samples', repoUrl: string): string {
  const docsHref = repoUrl ? `${repoUrl}/blob/main/docs/README.md` : '#';
  const repoHref = repoUrl || '#';
  return `<header class="site-header">
  <div class="container header-inner">
    <a class="brand-link" href="${basePath}index.html" aria-label="Lite home">
      ${brandWordmark}
      <span class="brand-badge">Alpha</span>
    </a>
    <nav class="site-nav" aria-label="Main navigation">
      <a href="${basePath}index.html"${active === 'home' ? ' class="active"' : ''}>Overview</a>
      <a href="${basePath}playground/index.html"${active === 'playground' ? ' class="active"' : ''}>Play</a>
      <a href="${basePath}samples/index.html"${active === 'samples' ? ' class="active"' : ''}>Samples</a>
      <a href="${escapeHtml(docsHref)}">Docs</a>
      <a href="${escapeHtml(repoHref)}">GitHub</a>
    </nav>
  </div>
</header>`;
}

function renderFooter(rev: SourceRevision, repoUrl: string): string {
  const short = rev.commit.slice(0, 12);
  const rest = rev.commit.slice(12);
  const hashInner = `<code><strong>${escapeHtml(short)}</strong>${escapeHtml(rest)}</code>`;
  const commitHtml = repoUrl
    ? `<a class="commit-hash" href="${escapeHtml(`${repoUrl}/commit/${rev.commit}`)}" title="Released ${escapeHtml(rev.timestamp)}">${hashInner}</a>`
    : `<span class="commit-hash" title="Released ${escapeHtml(rev.timestamp)}">${hashInner}</span>`;
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <span>Lite is licensed under Apache-2.0.</span>
    <div class="footer-commit">
      <div>Revision ${commitHtml}</div>
      <time class="commit-time" datetime="${escapeHtml(rev.timestamp)}">Committed ${escapeHtml(rev.timestamp)}</time>
    </div>
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
    <a href="${basePath}playground/index.html?sample=${escapeHtml(sample.id)}">Play &rarr;</a>
  </footer>
</article>`;
}

function renderPage(options: Readonly<{
  title: string;
  basePath: string;
  active: 'home' | 'playground' | 'samples';
  repoUrl: string;
  rev: SourceRevision;
  body: string;
  bodyClass?: string;
  mainClass?: string;
}>): string {
  const bodyAttr = options.bodyClass ? ` class="${escapeHtml(options.bodyClass)}"` : '';
  const mainAttr = ` class="${escapeHtml(options.mainClass ?? 'container')}"`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
  <link rel="icon" type="image/svg+xml" href="${options.basePath}favicon.svg">
  <link rel="stylesheet" href="${options.basePath}style.css">
</head>
<body${bodyAttr}>
${renderHeader(options.basePath, options.active, options.repoUrl)}
<main${mainAttr}>
${options.body}
</main>
${renderFooter(options.rev, options.repoUrl)}
</body>
</html>
`;
}

function renderHomePage(rendered: ReadonlyMap<string, RenderedSample>, repoUrl: string, rev: SourceRevision): string {
  const hero = rendered.get(heroSample.id);
  if (hero === undefined) throw new Error('missing rendered hero sample');
  const featuredIds = ['double-sum', 'factorial', 'decisions', 'script-arguments'];
  const featuredCards = featuredIds
    .map(id => rendered.get(id))
    .filter((s): s is RenderedSample => s !== undefined)
    .map(s => renderSampleCard(s, ''))
    .join('\n');

  const cloneUrl = repoUrl ? `${repoUrl}.git` : '<repository-url>';
  const docsStart = repoUrl ? `${repoUrl}/blob/main/docs/start-here.md` : 'samples/index.html';

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
      <a class="btn btn-primary" href="playground/index.html">Play online</a>
      <a class="btn" href="${escapeHtml(docsStart)}">Get started</a>
    </div>
    <div class="quickstart"><pre>git clone ${escapeHtml(cloneUrl)}
cd LiteScript
./bin/lite run ${escapeHtml(heroSample.file)}</pre></div>
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
      <p>Every showcased example is compiled and executed by the Lite compiler at build time.</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="section-head">
    <h2>Featured Examples</h2>
    <a href="samples/index.html">View all ${String(rendered.size)} verified samples &rarr;</a>
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
  });
}

function renderSamplesPage(rendered: ReadonlyMap<string, RenderedSample>, repoUrl: string, rev: SourceRevision): string {
  const sections = sampleGroups.map(group => {
    const cards = showcaseSamples
      .filter(s => s.group === group.id)
      .map(s => rendered.get(s.id))
      .filter((s): s is RenderedSample => s !== undefined)
      .map(s => renderSampleCard(s, '../'))
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
  <h1 style="margin: 0 0 0.5rem;">Verified Samples</h1>
  <p class="hero-lead" style="margin: 0;">
    All ${String(rendered.size)} examples below are compiled and executed by the generated Lite compiler during the site build.
  </p>
</section>
${sections}`;

  return renderPage({
    title: 'Samples — Lite',
    basePath: '../',
    active: 'samples',
    repoUrl,
    rev,
    body,
  });
}

function renderPlaygroundPage(rendered: ReadonlyMap<string, RenderedSample>, repoUrl: string, rev: SourceRevision): string {
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

    <div id="panel-output" class="pg-panel" role="tabpanel">
      <pre class="code-block"><code id="pg-output"></code></pre>
    </div>

    <div id="panel-ts" class="pg-panel" role="tabpanel" hidden>
      <pre class="code-block"><code id="pg-ts"></code></pre>
    </div>

    <div id="panel-c" class="pg-panel" role="tabpanel" hidden>
      <div style="padding: 1.25rem; color: var(--ink-muted); font-size: 0.92rem;">
        <p style="margin-top: 0;"><strong>C output is not available yet.</strong></p>
        <p style="margin-bottom: 0;">Use <code>Generated TS</code> or run <code>./bin/lite run</code> locally.</p>
      </div>
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
  let currentSample = null;
  let animFrame = 0;
  let lastFrameAt = 0;

  function escapeHtml(text) {
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  const liteKeywords = new Set([
    "as", "and", "break", "continue", "else", "false", "fn", "if",
    "import", "loop", "mut", "not", "or", "pub", "return", "self",
    "true", "type", "var", "while",
  ]);
  const liteTypes = new Set(["Bool", "Int", "Float", "String", "Void", "List", "Array"]);

  function highlightLite(source) {
    const out = [];
    let i = 0;
    const n = source.length;
    while (i < n) {
      const ch = source[i];
      if (ch === "/" && source[i + 1] === "*") {
        const end = source.indexOf("*/", i + 2);
        const slice = end === -1 ? source.slice(i) : source.slice(i, end + 2);
        out.push('<span class="tok-comment">' + escapeHtml(slice) + "</span>");
        i += slice.length;
        continue;
      }
      if (ch === "/" && source[i + 1] === "/") {
        const end = source.indexOf("\\n", i + 2);
        const slice = end === -1 ? source.slice(i) : source.slice(i, end);
        out.push('<span class="tok-comment">' + escapeHtml(slice) + "</span>");
        i += slice.length;
        continue;
      }
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < n) {
          if (source[j] === "\\\\") { j += 2; continue; }
          if (source[j] === ch) { j += 1; break; }
          j += 1;
        }
        out.push('<span class="tok-string">' + escapeHtml(source.slice(i, j)) + "</span>");
        i = j;
        continue;
      }
      if (ch >= "0" && ch <= "9") {
        let j = i + 1;
        while (j < n && /[0-9_a-zA-Z.]/.test(source[j])) j += 1;
        out.push('<span class="tok-number">' + escapeHtml(source.slice(i, j)) + "</span>");
        i = j;
        continue;
      }
      if (/[a-zA-Z_$]/.test(ch)) {
        let j = i + 1;
        while (j < n && /[a-zA-Z0-9_$]/.test(source[j])) j += 1;
        const word = source.slice(i, j);
        if (liteKeywords.has(word)) out.push('<span class="tok-keyword">' + escapeHtml(word) + "</span>");
        else if (liteTypes.has(word)) out.push('<span class="tok-type">' + escapeHtml(word) + "</span>");
        else out.push(escapeHtml(word));
        i = j;
        continue;
      }
      const three = source.slice(i, i + 3);
      const two = source.slice(i, i + 2);
      if (three === "===" || three === "!==" || three === "= !=" || three === "=!=") {
        out.push('<span class="tok-op">' + escapeHtml(three) + "</span>");
        i += 3;
        continue;
      }
      if (two === ":=" || two === "==" || two === "!=" || two === "<=" || two === ">=" || two === "=>" || two === "->") {
        out.push('<span class="tok-op">' + escapeHtml(two) + "</span>");
        i += 2;
        continue;
      }
      out.push(escapeHtml(ch));
      i += 1;
    }
    return out.join("");
  }

  function showTab(name) {
    activeTab = name;
    for (const tab of tabs) {
      tab.setAttribute("aria-selected", tab.dataset.tab === name ? "true" : "false");
    }
    for (const [key, panel] of Object.entries(panels)) {
      panel.hidden = key !== name;
    }
    if (name === "canvas") startCanvas();
    else stopCanvas();
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
    sourceEl.innerHTML = sample.sourceHtml;
    tsEl.innerHTML = sample.tsHtml;
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

  select.addEventListener("change", () => loadSample(select.value, "load"));
  resetBtn.addEventListener("click", () => loadSample(select.value, "load"));
  compileBtn.addEventListener("click", () => loadSample(select.value, "compile"));
  playBtn.addEventListener("click", () => loadSample(select.value, "play"));

  // Bouncing ℓite Canvas Stage with FPS / frametime reporting
  const canvas = document.getElementById("pg-canvas");
  const ctx = canvas.getContext("2d");
  let bx = 48, by = 48, vx = 2.4, vy = 1.8;

  function drawFrame(now) {
    if (lastFrameAt !== 0) {
      const dt = Math.max(now - lastFrameAt, 0.1);
      const fps = 1000 / dt;
      fpsEl.textContent = fps.toFixed(1) + " fps · " + dt.toFixed(1) + " ms";
    }
    lastFrameAt = now;

    ctx.fillStyle = "#14120f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(240, 180, 90, 0.07)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    bx += vx; by += vy;
    const boxW = 96, boxH = 46;
    if (bx <= 8 || bx + boxW >= canvas.width - 8) vx = -vx;
    if (by <= 8 || by + boxH >= canvas.height - 8) vy = -vy;

    ctx.fillStyle = "rgba(240, 180, 90, 0.14)";
    ctx.strokeStyle = "#f0b45a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 24px ui-monospace, Menlo, monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.fillStyle = "#f0b45a";
    ctx.fillText("ℓ", bx + boxW / 2 - 12, by + boxH / 2 + 1);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f3efe8";
    ctx.fillText("ite", bx + boxW / 2 - 10, by + boxH / 2 + 1);

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

  const initial = new URLSearchParams(window.location.search).get("sample") ?? "${escapeHtml(heroSample.id)}";
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
  });
}

export function buildSite(): void {
  const repoUrl = readRepositoryUrl();
  const rev = readSourceRevision();
  const rendered = new Map<string, RenderedSample>();

  for (const sample of showcaseSamples) {
    rendered.set(sample.id, compileAndRunSample(sample));
  }

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(join(outputDir, 'samples'), { recursive: true });
  mkdirSync(join(outputDir, 'playground', 'samples'), { recursive: true });

  writeFileSync(join(outputDir, 'style.css'), siteCss);
  cpSync(join(root, 'brand', 'lite-favicon.svg'), join(outputDir, 'favicon.svg'));
  writeFileSync(join(outputDir, 'index.html'), renderHomePage(rendered, repoUrl, rev));
  writeFileSync(join(outputDir, 'samples', 'index.html'), renderSamplesPage(rendered, repoUrl, rev));
  writeFileSync(join(outputDir, 'playground', 'index.html'), renderPlaygroundPage(rendered, repoUrl, rev));
  for (const sample of rendered.values()) {
    writeFileSync(
      join(outputDir, 'playground', 'samples', `${sample.id}.json`),
      JSON.stringify({
        id: sample.id,
        args: sample.args,
        stdin: sample.stdin,
        source: sample.source,
        sourceHtml: sample.sourceHtml,
        tsHtml: sample.tsHtml,
        output: sample.output,
      }),
    );
  }
  writeFileSync(
    join(outputDir, 'build.json'),
    JSON.stringify({ commit: rev.commit, shortCommit: rev.commit.slice(0, 12), timestamp: rev.timestamp, samples: rendered.size }, null, 2) + '\n',
  );

  console.log(`Built Lite site (${String(rendered.size)} verified samples) -> dist/site/`);
}

if (import.meta.main) {
  buildSite();
}
