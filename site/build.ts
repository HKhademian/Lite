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
import { heroSample, playgroundDefaultSample, sampleGroups, showcaseSamples, type ShowcaseSample } from './groups.ts';
import { escapeHtml, highlightLite, highlightTs } from './highlight.ts';
import { playGroups, playSamples, type PlaySample } from './play-samples.ts';
import { playgroundWorkerJs } from './playground-worker.ts';
import { stripLiteTs } from './strip-ts.ts';
import { siteCss } from './styles.ts';

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

function decodeArgb(packed: bigint): Readonly<{ fill: string; alphaAttr: string }> {
  const value = Number(packed & 0xffffffffn);
  const a = (value >>> 24) & 255;
  const r = (value >>> 16) & 255;
  const g = (value >>> 8) & 255;
  const b = value & 255;
  const fill = `rgb(${String(r)},${String(g)},${String(b)})`;
  const alphaAttr = a < 255 ? ` fill-opacity="${(a / 255).toFixed(3)}"` : '';
  return { fill, alphaAttr };
}

function renderOpsSvg(width: number, height: number, ops: readonly bigint[], title: string): string {
  if (width <= 0 || height <= 0) return '';
  let rects: string[] = [];
  let i = 0;
  while (i < ops.length) {
    const op = Number(ops[i]);
    if (op === 1 && i + 1 < ops.length) {
      const { fill, alphaAttr } = decodeArgb(ops[i + 1]!);
      rects = [`<rect width="${String(width)}" height="${String(height)}" fill="${fill}"${alphaAttr}/>`];
      i += 2;
    } else if (op === 2 && i + 5 < ops.length) {
      const x = Number(ops[i + 1]!);
      const y = Number(ops[i + 2]!);
      const w = Number(ops[i + 3]!);
      const h = Number(ops[i + 4]!);
      const { fill, alphaAttr } = decodeArgb(ops[i + 5]!);
      rects.push(`<rect x="${String(x)}" y="${String(y)}" width="${String(w)}" height="${String(h)}" fill="${fill}"${alphaAttr}/>`);
      i += 6;
    } else {
      break;
    }
  }
  return `<svg class="play-preview-svg" viewBox="0 0 ${String(width)} ${String(height)}" shape-rendering="crispEdges" role="img" aria-label="Initial frame preview for ${escapeHtml(title)}">${rects.join('')}</svg>`;
}

function captureCanvasPreview(generatedTs: string, title: string, badge?: string): string | undefined {
  const snapFn = generatedTs.match(/\bfunction (liteFn\$[a-zA-Z0-9_$]+\$litePlayCanvasSnapshot)\b/)?.[1];
  const opsFn = generatedTs.match(/\bfunction (liteFn\$[a-zA-Z0-9_$]+\$litePlayCanvasTakeOps)\b/)?.[1];
  if (snapFn === undefined || opsFn === undefined) return undefined;

  let runnable = stripLiteTs(generatedTs);
  const tailReturn = /return lite\$out;\s*\}\s*$/;
  if (!tailReturn.test(runnable)) return undefined;
  runnable = runnable.replace(tailReturn, [
    'const __pick = (a, b) => (typeof a === "function" ? a : typeof b === "function" ? b : null);',
    'const __init = __pick(typeof liteFn_onCanvasInit !== "undefined" ? liteFn_onCanvasInit : undefined, typeof liteFn_canvas_onInit !== "undefined" ? liteFn_canvas_onInit : undefined);',
    'if (__init) __init();',
    `const __snap = ${snapFn}();`,
    `const __ops = ${opsFn}();`,
    'return { width: Number(__snap.width), height: Number(__snap.height), ops: __ops };',
    '}',
  ].join('\n'));
  runnable = runnable.replace(/\bexport function main\b/, 'function main') + '\nreturn main(() => {});';

  const prevProcess = (globalThis as unknown as { process: unknown }).process;
  const stubProcess = {
    argv: ['node', 'preview.js'],
    exit: () => { throw new Error('unexpected exit'); },
    getBuiltinModule: () => ({ readSync: () => 0, writeSync: (_fd: number, text: string) => text.length }),
  };
  try {
    (globalThis as unknown as { process: unknown }).process = stubProcess;
    const frame = (new Function('process', runnable) as (proc: unknown) => { width: number; height: number; ops: bigint[] })(stubProcess);
    const svg = renderOpsSvg(frame.width, frame.height, frame.ops, title);
    if (!svg) return undefined;
    return badge ? `<div class="play-preview">${svg}</div>` : `<div class="play-preview">${svg}</div>`;
  } finally {
    (globalThis as unknown as { process: unknown }).process = prevProcess;
  }
}

function compileAndRunSample(sample: AnySample, tsCompiler: CompilerBuild, badge?: string): RenderedSample {
  const fullPath = resolve(root, sample.file);
  const source = readFileSync(fullPath, 'utf8');
  const compiled = compileBuiltCompiler(tsCompiler, { text: source, name: sample.file, cwd: root });
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
    const previewSvg = captureCanvasPreview(generatedTs, sample.title, badge);
    return {
      ...sample,
      source,
      sourceHtml: highlightLite(source.trimEnd()),
      generatedTs,
      tsHtml: highlightTs(generatedTs.trimEnd()),
      output: run.stdout,
      previewSvg,
      badge,
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
      <button id="theme-toggle" class="${toggleClass}" type="button" aria-label="Auto mode — switch to moon mode" title="Auto mode — switch to moon mode">
        <svg class="theme-icon icon-auto" viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="lite-auto-sun" cx="32%" cy="28%" r="72%">
              <stop offset="0%" stop-color="#FFFDF0"/>
              <stop offset="35%" stop-color="#FEF08A"/>
              <stop offset="75%" stop-color="#FBBF24"/>
              <stop offset="100%" stop-color="#D97706"/>
            </radialGradient>
            <radialGradient id="lite-auto-moon" cx="62%" cy="62%" r="72%">
              <stop offset="0%" stop-color="#E2E8F0"/>
              <stop offset="58%" stop-color="#94A3B8"/>
              <stop offset="100%" stop-color="#475569"/>
            </radialGradient>
            <clipPath id="lite-auto-clip">
              <circle cx="16" cy="16" r="15.5"/>
            </clipPath>
          </defs>
          <g clip-path="url(#lite-auto-clip)">
            <path d="M0 0H32L0 32Z" fill="url(#lite-auto-sun)"/>
            <path d="M32 0V32H0Z" fill="url(#lite-auto-moon)"/>
            <circle cx="10.5" cy="9.5" r="3.6" fill="#FFFFFF" fill-opacity="0.28"/>
            <circle cx="21.5" cy="19.5" r="2.7" fill="#334155" fill-opacity="0.26"/>
            <circle cx="15.5" cy="24.5" r="1.8" fill="#1E293B" fill-opacity="0.24"/>
            <circle cx="25.2" cy="13.5" r="1.4" fill="#334155" fill-opacity="0.22"/>
            <line x1="30" y1="2" x2="2" y2="30" stroke="#FFFFFF" stroke-opacity="0.32" stroke-width="0.9"/>
          </g>
        </svg>
        <svg class="theme-icon icon-sun" viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="lite-sun-grad" cx="36%" cy="32%" r="70%">
              <stop offset="0%" stop-color="#FFFDF0"/>
              <stop offset="32%" stop-color="#FEF08A"/>
              <stop offset="72%" stop-color="#FBBF24"/>
              <stop offset="100%" stop-color="#D97706"/>
            </radialGradient>
          </defs>
          <circle cx="16" cy="16" r="15.5" fill="url(#lite-sun-grad)"/>
          <circle cx="11.8" cy="11.2" r="4.6" fill="#FFFFFF" fill-opacity="0.28"/>
        </svg>
        <svg class="theme-icon icon-moon" viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="lite-moon-grad" cx="34%" cy="30%" r="72%">
              <stop offset="0%" stop-color="#F8FAFC"/>
              <stop offset="55%" stop-color="#CBD5E1"/>
              <stop offset="100%" stop-color="#64748B"/>
            </radialGradient>
            <clipPath id="lite-moon-clip">
              <circle cx="16" cy="16" r="15.5"/>
            </clipPath>
          </defs>
          <g clip-path="url(#lite-moon-clip)">
            <circle cx="16" cy="16" r="15.5" fill="url(#lite-moon-grad)"/>
            <path d="M23.1 0.1A16.2 16.2 0 0 1 8.9 31.9 16.2 16.2 0 0 0 23.1 0.1Z" fill="#1E293B" fill-opacity="0.28"/>
            <circle cx="10.4" cy="9.4" r="3.1" fill="#64748B" fill-opacity="0.26"/>
            <circle cx="19.2" cy="13.8" r="2" fill="#475569" fill-opacity="0.24"/>
            <circle cx="11.8" cy="21.2" r="3.5" fill="#64748B" fill-opacity="0.22"/>
            <circle cx="20.2" cy="22.4" r="1.5" fill="#475569" fill-opacity="0.22"/>
          </g>
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
  description?: string;
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
  const description = options.description ?? 'Lite is a small, explicit language and self-hosted compiler designed for low runtime weight, clear consequences, and readable code.';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(options.title)}</title>
  <link rel="icon" type="image/svg+xml" href="${options.basePath}favicon.svg">
  <script>
    (function () {
      try {
        var t = localStorage.getItem("lite-theme");
        if (t === "light" || t === "dark") {
          document.documentElement.dataset.theme = t;
          document.documentElement.style.colorScheme = t;
        }
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
    function currentMode() {
      var explicit = document.documentElement.dataset.theme;
      if (explicit === "light" || explicit === "dark") return explicit;
      return "system";
    }
    function resolvedTheme() {
      var mode = currentMode();
      if (mode === "light" || mode === "dark") return mode;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    function nextModeFor(mode) {
      if (mode === "light") return "system";
      if (mode === "system") return "dark";
      return "light";
    }
    function syncIcon() {
      var mode = currentMode();
      var title = mode === "system"
        ? "Auto mode (system: " + resolvedTheme() + ") — switch to moon mode"
        : mode === "light"
          ? "Sun mode (sunshine) — switch to auto mode"
          : "Moon mode (moonshine) — switch to sun mode";
      btn.title = title;
      btn.setAttribute("aria-label", title);
      btn.dataset.mode = mode;
      document.documentElement.style.colorScheme = mode === "system" ? "" : mode;
    }
    btn.addEventListener("click", function () {
      var root = document.documentElement;
      var next = nextModeFor(currentMode());
      root.dataset.themeSwitching = "true";
      if (next === "system") {
        delete root.dataset.theme;
        try { localStorage.removeItem("lite-theme"); } catch (e) {}
      } else {
        root.dataset.theme = next;
        try { localStorage.setItem("lite-theme", next); } catch (e) {}
      }
      syncIcon();
      window.setTimeout(function () {
        delete root.dataset.themeSwitching;
      }, 360);
    });
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    if (media.addEventListener) {
      media.addEventListener("change", syncIcon);
    }
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
  const cloneDir = repoUrl ? (repoUrl.split('/').pop() || 'Lite') : 'Lite';
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

  const body = `<div class="workbench">
  <section class="pane" aria-label="Source editor">
    <div class="pane-head">
      <div class="sample-picker">
        <select id="pg-samples" class="pg-select" aria-label="Choose a sample">${optionsHtml}</select>
        <button id="pg-reset" class="btn" type="button">Reset</button>
      </div>
      <div class="pg-actions">
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
            <span id="pg-canvas-size" class="pg-status">(320x200)</span>
            <span class="pg-sep" aria-hidden="true">&middot;</span>
            <span id="pg-fps" class="pg-status">0.0 fps &middot; 0.0 ms</span>
            <span class="pg-sep" aria-hidden="true">&middot;</span>
            <button id="pg-mute" class="pg-mute-btn" type="button" aria-pressed="false" title="Toggle Web Audio tones">Sound: On</button>
          </div>
        </div>
        <div class="pg-canvas-stage">
          <canvas id="pg-canvas" class="pg-canvas" tabindex="0" width="320" height="200" aria-label="Lite Play canvas stage"></canvas>
        </div>
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
  let audioMuted = false;
  let audioContext = null;

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
    copyBtn.hidden = name === "canvas";
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
    statusEl.textContent = "Modified";
  });

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
    stopPlay(true);
    select.value = meta.id;
    fileEl.textContent = meta.file;
    statusEl.textContent = "Loading " + meta.file + "...";

    const url = new URL(window.location.href);
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
        if (res.play) {
          hasPlayLoop = Boolean(res.play.hasUpdate);
          activePlay = hasPlayLoop && res.play.status === 0;
          statusEl.textContent = activePlay ? "Playing" : (hasPlayLoop ? "Stopped (" + res.play.status + ")" : "Interactive ready");
          showTab("canvas");
          canvas.focus({ preventScroll: true });
        } else {
          hasPlayLoop = false;
          activePlay = false;
          statusEl.textContent = "Rendered canvas (in browser)";
          showTab("canvas");
        }
      } else {
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

  muteBtn.addEventListener("click", () => {
    audioMuted = !audioMuted;
    muteBtn.setAttribute("aria-pressed", audioMuted ? "true" : "false");
    muteBtn.textContent = audioMuted ? "Sound: Muted" : "Sound: On";
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

  // Web Audio tone player + RGBA pixel stage for Lite Play programs
  const canvas = document.getElementById("pg-canvas");
  const ctx = canvas.getContext("2d");
  let stageImage = null;
  let stageWidth = 0;
  let stageHeight = 0;
  let hasPlayLoop = false;
  let lastPointerMoveAt = 0;

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
    if (activePlay && hasPlayLoop && !animFrame) {
      lastFrameAt = 0;
      animFrame = requestAnimationFrame(stepCanvasFrame);
    }
  }

  function stopPlay(hideTab) {
    pauseCanvasLoop();
    activePlay = false;
    activeCanvas = false;
    hasPlayLoop = false;
    fpsEl.textContent = "0.0 fps · 0.0 ms";
    if (worker) worker.postMessage({ action: "stop" });
    if (hideTab) {
      tabCanvas.hidden = true;
      if (activeTab === "canvas") showTab("output");
    }
  }

  async function sendPlayInteraction(action, payload) {
    if (!activeCanvas) return;
    try {
      const res = await new Promise((resolve, reject) => {
        const id = nextReqId++;
        pending.set(id, { resolve, reject });
        getWorker().postMessage({ id, action, ...payload });
      });
      if (!activeCanvas) return;
      if (Array.isArray(res.tones) && res.tones.length > 0) playToneEvents(res.tones);
      if (res.frame) applyPlayFrame(res.frame);
    } catch {
      // Ignore superseded interaction replies
    }
  }

  async function stepCanvasFrame(now) {
    animFrame = 0;
    if (!activePlay || activeTab !== "canvas") return;
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
      if (!activePlay) return;
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
        animFrame = requestAnimationFrame(stepCanvasFrame);
      } else {
        activePlay = false;
        statusEl.textContent = "Stopped (" + res.status + ")";
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
    if (!activeCanvas) return;
    unlockAudio();
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
      event.preventDefault();
    }
    void sendPlayInteraction("keydown", { key: event.key });
  });

  canvas.addEventListener("keyup", (event) => {
    if (!activeCanvas) return;
    void sendPlayInteraction("keyup", { key: event.key });
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!activeCanvas) return;
    const now = performance.now();
    if (now - lastPointerMoveAt < 16) return;
    lastPointerMoveAt = now;
    const cell = getCanvasCell(event);
    void sendPlayInteraction("pointermove", cell);
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!activeCanvas) return;
    unlockAudio();
    canvas.focus({ preventScroll: true });
    const cell = getCanvasCell(event);
    void sendPlayInteraction("pointerdown", { ...cell, button: event.button });
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!activeCanvas) return;
    const cell = getCanvasCell(event);
    void sendPlayInteraction("pointerup", { ...cell, button: event.button });
  });

  const initial = new URLSearchParams(window.location.search).get("sample") ?? "${escapeHtml(playgroundDefaultSample.id)}";
  void loadSample(initial, "load");
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
  mkdirSync(join(outputDir, 'gallery'), { recursive: true });
  mkdirSync(join(outputDir, 'playground', 'samples'), { recursive: true });

  writeFileSync(join(outputDir, 'style.css'), siteCss);
  cpSync(join(root, 'brand', 'lite-favicon.svg'), join(outputDir, 'favicon.svg'));
  writeFileSync(join(outputDir, 'index.html'), renderHomePage(rendered, repoUrl, rev, lightSwitchShine));
  writeFileSync(join(outputDir, 'gallery', 'index.html'), renderGalleryPage(rendered, renderedPlay, repoUrl, rev, lightSwitchShine));
  writeFileSync(join(outputDir, 'playground', 'index.html'), renderPlaygroundPage(rendered, renderedPlay, repoUrl, rev, lightSwitchShine));
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
  writeFileSync(join(outputDir, 'playground', 'stdlib.json'), JSON.stringify(stdlib));
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
    join(outputDir, 'build.json'),
    JSON.stringify({ commit: rev.commit, shortCommit: rev.commit.slice(0, 12), timestamp: rev.timestamp, samples: rendered.size, lightSwitchShine }, null, 2) + '\n',
  );

  console.log(`Built Lite site (${String(rendered.size)} verified samples) -> dist/site/`);
}

if (import.meta.main) {
  buildSite(parseBuildArgs(process.argv.slice(2)));
}
