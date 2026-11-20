/** Shared HTML header, footer, page shell, and SVG wordmark helpers for dist/site/. */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { escapeHtml } from './highlight.ts';

export type ActiveNavSection =
  | 'home'
  | 'learn'
  | 'gym'
  | 'docs'
  | 'modules'
  | 'tools'
  | 'gallery'
  | 'playground';

export type SourceRevision = Readonly<{
  commit: string;
  timestamp: string;
}>;

export const rootDir = dirname(import.meta.dirname);
export const brandWordmark = readFileSync(join(rootDir, 'brand', 'lite-wordmark.svg'), 'utf8').trim();
export const proseLite = '<span class="prose-lite"><span class="brand-l">l</span>ite</span>';

export function readRepositoryUrl(): string {
  const configured = process.env['GITHUB_REPOSITORY']?.trim();
  if (configured !== undefined && configured !== '') {
    return `https://github.com/${configured}`;
  }
  const result = spawnSync('git', ['remote', 'get-url', 'github'], { cwd: rootDir, encoding: 'utf8' });
  if (result.status !== 0) return '';
  const match = result.stdout.trim().match(/(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/);
  return match === null ? '' : `https://github.com/${match[1]}`;
}

export function readSourceRevision(): SourceRevision {
  const commitResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' });
  if (commitResult.error !== undefined) throw commitResult.error;
  if (commitResult.status !== 0) throw new Error('could not read the source commit');
  const timeResult = spawnSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: rootDir, encoding: 'utf8' });
  if (timeResult.error !== undefined) throw timeResult.error;
  if (timeResult.status !== 0) throw new Error('could not read the commit timestamp');
  return {
    commit: commitResult.stdout.trim(),
    timestamp: timeResult.stdout.trim(),
  };
}

export function renderHeader(
  basePath: string,
  active: ActiveNavSection,
  repoUrl: string,
  lightSwitchShine: boolean,
): string {
  const repoHref = repoUrl || '#';
  const toggleClass = lightSwitchShine ? 'theme-toggle theme-toggle-shine' : 'theme-toggle';
  const link = (key: ActiveNavSection, relHref: string, label: string) =>
    `<a href="${basePath}${relHref}"${active === key ? ' class="active"' : ''}>${label}</a>`;

  return `<header class="site-header">
  <div class="container header-inner">
    <a class="brand-link" href="${basePath}index.html" aria-label="Lite home">
      ${brandWordmark}
      <span class="brand-badge">Alpha</span>
    </a>
    <button id="mobile-nav-toggle" class="mobile-nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Toggle navigation menu">
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <path d="M3 5h14M3 10h14M3 15h14"/>
      </svg>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main navigation">
      ${link('home', 'index.html', 'Overview')}
      <div class="nav-academy-group" role="group" aria-label="Lite Academy">
        ${link('learn', 'learn/', 'Learn')}
        ${link('gym', 'gym/', 'Gym')}
        ${link('docs', 'docs/', 'Docs')}
        ${link('playground', 'playground/', 'Play')}
      </div>
      ${link('modules', 'modules/', 'Modules')}
      ${link('tools', 'tools/', 'Tools')}
      ${link('gallery', 'gallery/', 'Gallery')}
      <button id="site-search-btn" class="search-trigger" type="button" aria-label="Search docs, modules, learn, and gym (/)" title="Search (/ or Cmd/Ctrl+K)">
        <span>Search</span><kbd>/</kbd>
      </button>
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

export function renderFooter(rev: SourceRevision, repoUrl: string): string {
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

export function renderPage(options: Readonly<{
  title: string;
  description?: string;
  basePath: string;
  active: ActiveNavSection;
  repoUrl: string;
  rev: SourceRevision;
  body: string;
  bodyClass?: string;
  mainClass?: string;
  lightSwitchShine?: boolean;
}>): string {
  const classAttr = options.bodyClass ? ` class="${escapeHtml(options.bodyClass)}"` : '';
  const baseAttr = ` data-base-path="${escapeHtml(options.basePath)}"`;
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
  <script defer src="${options.basePath}runtime/snips.js"></script>
  <script defer src="${options.basePath}runtime/academy.js"></script>
</head>
<body${classAttr}${baseAttr}>
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
<script defer src="${options.basePath}runtime/search.js"></script>
</body>
</html>
`;
}
