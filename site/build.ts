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

function readSourceCommit(): string {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) throw new Error('could not read the source commit');
  return result.stdout.trim();
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
      <a href="${basePath}playground/index.html"${active === 'playground' ? ' class="active"' : ''}>Playground</a>
      <a href="${basePath}samples/index.html"${active === 'samples' ? ' class="active"' : ''}>Samples</a>
      <a href="${escapeHtml(docsHref)}">Docs</a>
      <a href="${escapeHtml(repoHref)}">GitHub</a>
    </nav>
  </div>
</header>`;
}

function renderFooter(commit: string, repoUrl: string): string {
  const short = commit.slice(0, 12);
  const commitHtml = repoUrl
    ? `<a class="commit-pill" href="${escapeHtml(`${repoUrl}/commit/${commit}`)}">${escapeHtml(short)}</a>`
    : `<span class="commit-pill">${escapeHtml(short)}</span>`;
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <span>Lite is licensed under Apache-2.0.</span>
    <span>Revision ${commitHtml}</span>
  </div>
</footer>`;
}

function renderSampleCard(sample: RenderedSample, basePath: string): string {
  const inputParts: string[] = [];
  if (sample.args.length > 0) inputParts.push(`args: ${sample.args.join(' ')}`);
  if (sample.stdin !== '') inputParts.push(`stdin: ${JSON.stringify(sample.stdin)}`);
  const metaText = inputParts.length > 0 ? inputParts.join(' · ') : sample.file;

  return `<article class="code-card" id="sample-${escapeHtml(sample.id)}">
  <div class="code-card-head">
    <span class="code-card-title">${escapeHtml(sample.title)}</span>
    <span class="code-card-meta">${escapeHtml(metaText)}</span>
  </div>
  <p class="sample-note">${escapeHtml(sample.note)}</p>
  <pre class="code-block"><code>${sample.sourceHtml}</code></pre>
  <div class="output-block">
    <div class="output-label">Output</div>
    <pre>${escapeHtml(sample.output.trimEnd())}</pre>
  </div>
  <footer class="sample-foot">
    <a href="${basePath}playground/index.html?sample=${escapeHtml(sample.id)}">Open in playground &rarr;</a>
  </footer>
</article>`;
}

function renderPage(options: Readonly<{
  title: string;
  basePath: string;
  active: 'home' | 'playground' | 'samples';
  repoUrl: string;
  commit: string;
  body: string;
}>): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
  <link rel="icon" type="image/svg+xml" href="${options.basePath}favicon.svg">
  <link rel="stylesheet" href="${options.basePath}style.css">
</head>
<body>
${renderHeader(options.basePath, options.active, options.repoUrl)}
<main class="container">
${options.body}
</main>
${renderFooter(options.commit, options.repoUrl)}
</body>
</html>
`;
}

function renderHomePage(rendered: ReadonlyMap<string, RenderedSample>, repoUrl: string, commit: string): string {
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
    <h1>Lite is light.</h1>
    <p class="hero-lead">
      A small, explicit language and self-hosted compiler designed for low runtime weight,
      clear consequences, and readable code.
    </p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="playground/index.html">Try the playground</a>
      <a class="btn" href="${escapeHtml(docsStart)}">Get started</a>
    </div>
    <div class="quickstart"><pre>git clone ${escapeHtml(cloneUrl)}
cd LiteScript
./bin/lite run ${escapeHtml(heroSample.file)}</pre></div>
  </div>
  ${renderSampleCard(hero, '')}
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
      <p>Every showcased example is compiled and executed by the generated T13 compiler at build time.</p>
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
    commit,
    body,
  });
}

function renderSamplesPage(rendered: ReadonlyMap<string, RenderedSample>, repoUrl: string, commit: string): string {
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

  const body = `<section style="padding: 2.25rem 0 1rem;">
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
    commit,
    body,
  });
}

function renderPlaygroundPage(rendered: ReadonlyMap<string, RenderedSample>, repoUrl: string, commit: string): string {
  const optionsHtml = sampleGroups.map(group => {
    const items = showcaseSamples
      .filter(s => s.group === group.id)
      .map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`)
      .join('');
    return `<optgroup label="${escapeHtml(group.title)}">${items}</optgroup>`;
  }).join('');

  const payload = Array.from(rendered.values()).map(s => ({
    id: s.id,
    title: s.title,
    note: s.note,
    file: s.file,
    args: s.args,
    stdin: s.stdin,
    sourceHtml: s.sourceHtml,
    tsHtml: s.tsHtml,
    output: s.output,
  }));
  const serialized = JSON.stringify(payload).replaceAll('<', '\\u003c');

  const body = `<section class="pg-bar">
  <div class="pg-controls">
    <label for="pg-samples" class="code-card-title">Sample:</label>
    <select id="pg-samples" class="pg-select">${optionsHtml}</select>
    <button id="pg-play" class="btn btn-primary" type="button">&#9654; Play</button>
    <button id="pg-canvas-btn" class="btn" type="button">Canvas</button>
  </div>
  <span id="pg-status" class="pg-status">Ready</span>
</section>

<section class="pg-grid">
  <div class="pg-pane">
    <div class="pg-pane-head">
      <span id="pg-file" class="code-card-title"></span>
      <span id="pg-note" class="code-card-meta"></span>
    </div>
    <pre class="code-block"><code id="pg-source"></code></pre>
    <div id="pg-io" class="pg-io-strip"></div>
  </div>

  <div class="pg-pane">
    <div class="pg-pane-head">
      <div class="pg-tabs" role="tablist">
        <button class="pg-tab" role="tab" data-tab="output" aria-selected="true" type="button">Output</button>
        <button class="pg-tab" role="tab" data-tab="ts" aria-selected="false" type="button">Generated TypeScript</button>
        <button class="pg-tab" role="tab" data-tab="c" aria-selected="false" type="button">Generated C</button>
        <button class="pg-tab" role="tab" data-tab="canvas" aria-selected="false" type="button">Canvas</button>
      </div>
    </div>

    <div id="panel-output" class="pg-panel" role="tabpanel">
      <pre class="code-block"><code id="pg-output"></code></pre>
    </div>

    <div id="panel-ts" class="pg-panel" role="tabpanel" hidden>
      <pre class="code-block"><code id="pg-ts"></code></pre>
    </div>

    <div id="panel-c" class="pg-panel" role="tabpanel" hidden>
      <div style="padding: 1.25rem; color: var(--ink-muted); font-size: 0.92rem;">
        <p style="margin-top: 0;"><strong>C backend status:</strong> C11 emission and native self-hosting are scheduled after the TypeScript compiler migration.</p>
        <p style="margin-bottom: 0;">Run <code>./bin/lite-compile-c &lt;file.lts&gt;</code> locally to test the C emitter slot as coverage expands.</p>
      </div>
    </div>

    <div id="panel-canvas" class="pg-panel" role="tabpanel" hidden>
      <div class="pg-canvas-wrap">
        <canvas id="pg-canvas" class="pg-canvas" width="420" height="240"></canvas>
        <span class="code-card-meta">Lite Canvas Stage — bouncing ℓite mark</span>
      </div>
    </div>
  </div>
</section>

<script type="module">
  const samples = ${serialized};
  const byId = new Map(samples.map(s => [s.id, s]));
  const select = document.getElementById("pg-samples");
  const playBtn = document.getElementById("pg-play");
  const canvasBtn = document.getElementById("pg-canvas-btn");
  const statusEl = document.getElementById("pg-status");
  const fileEl = document.getElementById("pg-file");
  const noteEl = document.getElementById("pg-note");
  const sourceEl = document.getElementById("pg-source");
  const ioEl = document.getElementById("pg-io");
  const outputEl = document.getElementById("pg-output");
  const tsEl = document.getElementById("pg-ts");
  const tabs = Array.from(document.querySelectorAll(".pg-tab"));
  const panels = {
    output: document.getElementById("panel-output"),
    ts: document.getElementById("panel-ts"),
    c: document.getElementById("panel-c"),
    canvas: document.getElementById("panel-canvas"),
  };

  let activeTab = "output";
  let animFrame = 0;

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

  function loadSample(id, replay) {
    const sample = byId.get(id) ?? samples[0];
    if (!sample) return;
    select.value = sample.id;
    fileEl.textContent = sample.file;
    noteEl.textContent = sample.title;
    sourceEl.innerHTML = sample.sourceHtml;
    tsEl.innerHTML = sample.tsHtml;
    const ioParts = [];
    if (sample.args.length) ioParts.push("args: " + sample.args.join(" "));
    if (sample.stdin) ioParts.push("stdin: " + JSON.stringify(sample.stdin));
    ioEl.textContent = ioParts.length ? ioParts.join("  |  ") : "no stdin or args required";
    outputEl.textContent = replay ? "" : sample.output;

    const url = new URL(window.location.href);
    url.searchParams.set("sample", sample.id);
    window.history.replaceState({}, "", url);

    if (replay) {
      statusEl.textContent = "Running " + sample.file + "...";
      setTimeout(() => {
        outputEl.textContent = sample.output;
        statusEl.textContent = "Exited 0 (verified)";
      }, 120);
    } else {
      statusEl.textContent = "Verified output loaded";
    }
  }

  select.addEventListener("change", () => loadSample(select.value, false));
  playBtn.addEventListener("click", () => {
    if (activeTab === "canvas") startCanvas();
    else {
      showTab("output");
      loadSample(select.value, true);
    }
  });
  canvasBtn.addEventListener("click", () => showTab("canvas"));

  // Bouncing Lite Canvas Stage
  const canvas = document.getElementById("pg-canvas");
  const ctx = canvas.getContext("2d");
  let bx = 40, by = 40, vx = 2.2, vy = 1.7, hue = 35;

  function drawFrame() {
    ctx.fillStyle = "#14120f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle pixel grid
    ctx.strokeStyle = "rgba(240, 180, 90, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    bx += vx; by += vy;
    const boxW = 92, boxH = 44;
    if (bx <= 8 || bx + boxW >= canvas.width - 8) { vx = -vx; hue = (hue + 25) % 360; }
    if (by <= 8 || by + boxH >= canvas.height - 8) { vy = -vy; hue = (hue + 25) % 360; }

    ctx.fillStyle = "rgba(240, 180, 90, 0.14)";
    ctx.strokeStyle = "#f0b45a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f3efe8";
    ctx.font = "bold 24px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ℓite", bx + boxW / 2, by + boxH / 2 + 1);

    animFrame = requestAnimationFrame(drawFrame);
  }

  function startCanvas() {
    if (!animFrame) animFrame = requestAnimationFrame(drawFrame);
    statusEl.textContent = "Canvas stage active";
  }

  function stopCanvas() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = 0; }
  }

  const initial = new URLSearchParams(window.location.search).get("sample") ?? "${escapeHtml(heroSample.id)}";
  loadSample(initial, false);
</script>`;

  return renderPage({
    title: 'Playground — Lite',
    basePath: '../',
    active: 'playground',
    repoUrl,
    commit,
    body,
  });
}

export function buildSite(): void {
  const repoUrl = readRepositoryUrl();
  const commit = readSourceCommit();
  const rendered = new Map<string, RenderedSample>();

  for (const sample of showcaseSamples) {
    rendered.set(sample.id, compileAndRunSample(sample));
  }

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(join(outputDir, 'samples'), { recursive: true });
  mkdirSync(join(outputDir, 'playground'), { recursive: true });

  writeFileSync(join(outputDir, 'style.css'), siteCss);
  cpSync(join(root, 'brand', 'lite-favicon.svg'), join(outputDir, 'favicon.svg'));
  writeFileSync(join(outputDir, 'index.html'), renderHomePage(rendered, repoUrl, commit));
  writeFileSync(join(outputDir, 'samples', 'index.html'), renderSamplesPage(rendered, repoUrl, commit));
  writeFileSync(join(outputDir, 'playground', 'index.html'), renderPlaygroundPage(rendered, repoUrl, commit));
  writeFileSync(
    join(outputDir, 'build.json'),
    JSON.stringify({ commit, shortCommit: commit.slice(0, 12), samples: rendered.size }, null, 2) + '\n',
  );

  console.log(`Built Lite site (${String(rendered.size)} verified samples) -> dist/site/`);
}

if (import.meta.main) {
  buildSite();
}
