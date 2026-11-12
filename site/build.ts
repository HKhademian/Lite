#!/usr/bin/env node
/** Build the static public showcase site into dist/site/. */
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
  generatedTs: string;
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
      generatedTs,
      output: run.stdout,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function renderHeader(basePath: string, active: 'home' | 'samples', repoUrl: string): string {
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

function renderSampleCard(sample: RenderedSample, showTsDetails: boolean): string {
  const inputParts: string[] = [];
  if (sample.args.length > 0) inputParts.push(`args: ${sample.args.join(' ')}`);
  if (sample.stdin !== '') inputParts.push(`stdin: ${JSON.stringify(sample.stdin)}`);
  const metaText = inputParts.length > 0 ? inputParts.join(' · ') : sample.file;

  const tsBlock = showTsDetails
    ? `<details class="ts-inspect">
      <summary>Inspect generated TypeScript</summary>
      <pre class="code-block"><code>${highlightTs(sample.generatedTs.trimEnd())}</code></pre>
    </details>`
    : '';

  return `<article class="code-card" id="sample-${escapeHtml(sample.id)}">
  <div class="code-card-head">
    <span class="code-card-title">${escapeHtml(sample.title)}</span>
    <span class="code-card-meta">${escapeHtml(metaText)}</span>
  </div>
  <p class="sample-note">${escapeHtml(sample.note)}</p>
  <pre class="code-block"><code>${highlightLite(sample.source.trimEnd())}</code></pre>
  <div class="output-block">
    <div class="output-label">Verified Output</div>
    <pre>${escapeHtml(sample.output.trimEnd())}</pre>
  </div>
  ${tsBlock}
</article>`;
}

function renderPage(options: Readonly<{
  title: string;
  basePath: string;
  active: 'home' | 'samples';
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
    .map(s => renderSampleCard(s, true))
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
      <a class="btn btn-primary" href="samples/index.html">Explore Samples</a>
      <a class="btn" href="${escapeHtml(docsStart)}">Get Started</a>
    </div>
    <div class="quickstart"><pre>git clone ${escapeHtml(cloneUrl)}
cd LiteScript
./bin/lite run ${escapeHtml(heroSample.file)}</pre></div>
  </div>
  ${renderSampleCard(hero, true)}
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
    <a href="samples/index.html">View all ${String(rendered.size)} verified samples →</a>
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
      .map(s => renderSampleCard(s, true))
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

export function buildSite(): void {
  const repoUrl = readRepositoryUrl();
  const commit = readSourceCommit();
  const rendered = new Map<string, RenderedSample>();

  for (const sample of showcaseSamples) {
    rendered.set(sample.id, compileAndRunSample(sample));
  }

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(join(outputDir, 'samples'), { recursive: true });

  writeFileSync(join(outputDir, 'style.css'), siteCss);
  cpSync(join(root, 'brand', 'lite-favicon.svg'), join(outputDir, 'favicon.svg'));
  writeFileSync(join(outputDir, 'index.html'), renderHomePage(rendered, repoUrl, commit));
  writeFileSync(join(outputDir, 'samples', 'index.html'), renderSamplesPage(rendered, repoUrl, commit));
  writeFileSync(
    join(outputDir, 'build.json'),
    JSON.stringify({ commit, shortCommit: commit.slice(0, 12), samples: rendered.size }, null, 2) + '\n',
  );

  console.log(`Built Lite site (${String(rendered.size)} verified samples) -> dist/site/`);
}

if (import.meta.main) {
  buildSite();
}
