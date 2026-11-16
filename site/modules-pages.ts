/** Generates `/modules/` index and detail reference pages from `extractModules()`. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ModuleApiDoc, ModuleSymbolDoc } from '../tools/docs.ts';
import { renderPage, rootDir, type SourceRevision } from './chrome.ts';
import type { ShowcaseSample } from './groups.ts';
import { escapeHtml, highlightLite } from './highlight.ts';
import type { PlayGroup, PlaySample } from './play-samples.ts';
import type { SearchEntry } from './search.ts';

type SampleRef = Readonly<{
  id: string;
  title: string;
  file: string;
  badge?: string;
}>;

export type ModulesBuildOutput = Readonly<{
  files: ReadonlyMap<string, string>;
  searchEntries: readonly SearchEntry[];
  moduleCount: number;
  symbolCount: number;
}>;

const ENV_META: Readonly<Record<ModuleApiDoc['environment'], Readonly<{ label: string; pillClass: string }>>> = {
  universal: { label: 'Browser + CLI', pillClass: 'status-pill-universal' },
  play: { label: 'Lite Play', pillClass: 'status-pill-play' },
  cli: { label: 'CLI / Host OS', pillClass: 'status-pill-cli' },
};

function formatInlineDoc(text: string): string {
  const parts = text.split(/(`[^`]+`)/g);
  return parts
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      return escapeHtml(part);
    })
    .join('');
}

function defaultAliasForModule(name: string): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return name;
  return 'mod';
}

function collectModuleUsages(
  modules: readonly ModuleApiDoc[],
  samples: readonly SampleRef[],
): ReadonlyMap<string, readonly SampleRef[]> {
  const usageMap = new Map<string, SampleRef[]>();
  for (const mod of modules) {
    usageMap.set(mod.id, []);
  }
  for (const sample of samples) {
    let source = '';
    try {
      source = readFileSync(resolve(rootDir, sample.file), 'utf8');
    } catch {
      continue;
    }
    const importRe = /import\s+"([^"]+)"/g;
    const seen = new Set<string>();
    for (let m = importRe.exec(source); m !== null; m = importRe.exec(source)) {
      const modId = m[1]!;
      if (seen.has(modId)) continue;
      seen.add(modId);
      const bucket = usageMap.get(modId);
      if (bucket !== undefined) bucket.push(sample);
    }
  }
  return usageMap;
}

function renderSymbolCard(
  mod: ModuleApiDoc,
  sym: ModuleSymbolDoc,
  repoUrl: string,
): string {
  const hostBadge = sym.isHostDeclaration
    ? '<span class="status-pill status-pill-cli">Host-backed</span>'
    : '';
  const lineLink = repoUrl
    ? `<a class="code-card-meta" href="${escapeHtml(`${repoUrl}/blob/main/${mod.file}#L${String(sym.line)}`)}">L${String(sym.line)}</a>`
    : `<span class="code-card-meta">L${String(sym.line)}</span>`;
  const docHtml = sym.doc
    ? `<p class="module-sym-doc">${formatInlineDoc(sym.doc)}</p>`
    : '';

  return `<article class="portal-card module-symbol-card" id="${escapeHtml(sym.name)}">
  <div class="portal-card-head">
    <div class="module-sym-title">
      <a class="module-sym-anchor" href="#${escapeHtml(sym.name)}" aria-label="Link to ${escapeHtml(sym.name)}">#</a>
      <code>${escapeHtml(sym.name)}</code>
      <span class="status-pill">${escapeHtml(sym.kind)}</span>
      ${hostBadge}
    </div>
    ${lineLink}
  </div>
  <pre class="code-block"><code>${highlightLite(sym.signature)}</code></pre>
  ${docHtml}
</article>`;
}

function renderModuleSidebar(
  modules: readonly ModuleApiDoc[],
  activeId: string,
  baseFromDetail = true,
): string {
  const prefix = baseFromDetail ? '../../modules/' : '';
  const groups: readonly { ns: string; label: string }[] = [
    { ns: 'core', label: 'Core Modules (core/*)' },
    { ns: 'extra', label: 'Play & Extra (extra/*)' },
  ];
  const groupHtml = groups
    .map((group) => {
      const items = modules
        .filter((m) => m.namespace === group.ns)
        .map((m) => {
          const href = `${prefix}${encodeURIComponent(m.namespace)}/${encodeURIComponent(m.name)}.html`;
          const cls = m.id === activeId ? ' class="active"' : '';
          return `<li><a href="${href}"${cls}><span>${escapeHtml(m.id)}</span><span>${String(m.symbols.length)}</span></a></li>`;
        })
        .join('\n          ');
      return `<details class="portal-nav-group" open>
        <summary>${escapeHtml(group.label)}</summary>
        <ul class="portal-nav-list">
          ${items}
        </ul>
      </details>`;
    })
    .join('\n      ');

  return `<aside class="portal-sidebar" aria-label="Modules navigation">
      <p class="portal-sidebar-title">Modules (${String(modules.length)})</p>
      ${groupHtml}
    </aside>`;
}

function renderModulesIndexPage(
  modules: readonly ModuleApiDoc[],
  usageMap: ReadonlyMap<string, readonly SampleRef[]>,
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const coreMods = modules.filter((m) => m.namespace === 'core');
  const extraMods = modules.filter((m) => m.namespace === 'extra');
  const totalSymbols = modules.reduce((acc, m) => acc + m.symbols.length, 0);

  const renderGroupGrid = (list: readonly ModuleApiDoc[]): string =>
    list
      .map((mod) => {
        const meta = ENV_META[mod.environment];
        const previewSyms = mod.symbols
          .slice(0, 5)
          .map((s) => `<code>${escapeHtml(s.name)}</code>`)
          .join(' ');
        const moreCount = mod.symbols.length > 5 ? ` <span class="code-card-meta">+${String(mod.symbols.length - 5)} more</span>` : '';
        const usages = usageMap.get(mod.id)?.length ?? 0;
        const usageText = usages > 0 ? ` · ${String(usages)} sample${usages === 1 ? '' : 's'}` : '';
        const searchBlob = `${mod.id} ${mod.summary} ${mod.symbols.map((s) => s.name).join(' ')}`.toLowerCase();
        return `<article class="portal-card module-index-card" data-env="${escapeHtml(mod.environment)}" data-search="${escapeHtml(searchBlob)}">
  <div class="portal-card-head">
    <h2><a href="${escapeHtml(mod.namespace)}/${escapeHtml(mod.name)}.html"><code>${escapeHtml(mod.id)}</code></a></h2>
    <span class="status-pill ${meta.pillClass}">${escapeHtml(meta.label)}</span>
  </div>
  <p>${formatInlineDoc(mod.summary || `${mod.id} utilities.`)}</p>
  <div class="module-sym-preview">${previewSyms}${moreCount}</div>
  <div class="portal-card-foot">
    <span class="code-card-meta">${String(mod.symbols.length)} symbol${mod.symbols.length === 1 ? '' : 's'}${usageText}</span>
    <a href="${escapeHtml(mod.namespace)}/${escapeHtml(mod.name)}.html">Inspect API &rarr;</a>
  </div>
</article>`;
      })
      .join('\n');

  const body = `<section class="page-hero">
  <h1>Standard &amp; Play Modules</h1>
  <p class="hero-lead">
    Reference documentation extracted directly from all ${String(modules.length)} shipped Lite modules
    (${String(coreMods.length)} <code>core/*</code>, ${String(extraMods.length)} <code>extra/*</code>; ${String(totalSymbols)} public symbols).
  </p>
  <div class="md-alert">
    <div class="md-alert-title">Provisional Module Surface</div>
    <p>
      <code>lib/core/*</code> and <code>lib/extra/*</code> are provisional compiler, library, and Play support modules used today
      (see <a href="../docs/">Documentation</a> for full language stabilization status).
    </p>
  </div>
  <div class="filter-pills" role="group" aria-label="Filter modules by environment">
    <button class="filter-pill" type="button" data-filter-env="all" aria-pressed="true">All (${String(modules.length)})</button>
    <button class="filter-pill" type="button" data-filter-env="universal" aria-pressed="false">Browser + CLI</button>
    <button class="filter-pill" type="button" data-filter-env="play" aria-pressed="false">Lite Play</button>
    <button class="filter-pill" type="button" data-filter-env="cli" aria-pressed="false">CLI / Host OS</button>
    <input id="modules-filter-input" class="filter-input" type="search" placeholder="Filter modules or symbol names..." aria-label="Filter modules or symbols">
  </div>
</section>

<section class="section" id="core-modules">
  <div class="section-head">
    <h2>Core Modules (<code>core/*</code>)</h2>
    <span class="code-card-meta">${String(coreMods.length)} modules</span>
  </div>
  <div class="portal-grid">
    ${renderGroupGrid(coreMods)}
  </div>
</section>

<section class="section" id="extra-modules">
  <div class="section-head">
    <h2>Play &amp; Extra Modules (<code>extra/*</code>)</h2>
    <span class="code-card-meta">${String(extraMods.length)} modules</span>
  </div>
  <div class="portal-grid">
    ${renderGroupGrid(extraMods)}
  </div>
</section>

<script>
  (function () {
    var activeEnv = "all";
    var filterInput = document.getElementById("modules-filter-input");
    var cards = Array.prototype.slice.call(document.querySelectorAll(".module-index-card"));
    var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-filter-env]"));
    function applyFilter() {
      var q = filterInput ? filterInput.value.trim().toLowerCase() : "";
      for (var i = 0; i < cards.length; i += 1) {
        var card = cards[i];
        var envMatch = activeEnv === "all" || card.getAttribute("data-env") === activeEnv;
        var textMatch = !q || (card.getAttribute("data-search") || "").indexOf(q) >= 0;
        card.hidden = !(envMatch && textMatch);
      }
    }
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener("click", function () {
        activeEnv = this.getAttribute("data-filter-env") || "all";
        for (var j = 0; j < buttons.length; j += 1) {
          buttons[j].setAttribute("aria-pressed", buttons[j] === this ? "true" : "false");
        }
        applyFilter();
      });
    }
    if (filterInput) filterInput.addEventListener("input", applyFilter);
  })();
</script>`;

  return renderPage({
    title: 'Modules — Lite',
    description: 'Reference documentation for Lite core/* and extra/* modules and their public APIs.',
    basePath: '../',
    active: 'modules',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

function renderModuleDetailPage(
  mod: ModuleApiDoc,
  allModules: readonly ModuleApiDoc[],
  usages: readonly SampleRef[],
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const meta = ENV_META[mod.environment];
  const alias = defaultAliasForModule(mod.name);
  const types = mod.symbols.filter((s) => s.kind === 'type');
  const consts = mod.symbols.filter((s) => s.kind === 'const');
  const fns = mod.symbols.filter((s) => s.kind === 'fn');

  const sourceLink = repoUrl
    ? `<a href="${escapeHtml(`${repoUrl}/blob/main/${mod.file}`)}">View source (<code>${escapeHtml(mod.file)}</code>) &rarr;</a>`
    : `<code>${escapeHtml(mod.file)}</code>`;

  const renderSection = (id: string, title: string, list: readonly ModuleSymbolDoc[]): string => {
    if (list.length === 0) return '';
    return `<section class="section" id="${id}">
      <div class="section-head">
        <h2>${escapeHtml(title)}</h2>
        <span class="code-card-meta">${String(list.length)}</span>
      </div>
      <div class="module-symbol-list">
        ${list.map((sym) => renderSymbolCard(mod, sym, repoUrl)).join('\n')}
      </div>
    </section>`;
  };

  const usagesSection = usages.length > 0
    ? `<section class="section" id="used-in-samples">
      <div class="section-head">
        <h2>Used in Showcases &amp; Gallery</h2>
        <span class="code-card-meta">${String(usages.length)}</span>
      </div>
      <div class="portal-grid-2">
        ${usages
          .map((sample) => `<article class="portal-card">
          <div class="portal-card-head">
            <strong>${escapeHtml(sample.title)}</strong>
            <span class="status-pill">${escapeHtml(sample.badge ?? 'sample')}</span>
          </div>
          <p><code>${escapeHtml(sample.file)}</code></p>
          <div class="portal-card-foot">
            <a href="../../gallery/#sample-${escapeHtml(sample.id)}">Gallery</a>
            <a href="../../playground/?sample=${escapeHtml(sample.id)}">Open in Play &rarr;</a>
          </div>
        </article>`)
          .join('\n')}
      </div>
    </section>`
    : '';

  const tocItems: string[] = ['<li><a href="#overview">Overview</a></li>'];
  if (types.length > 0) {
    tocItems.push('<li><a href="#types">Types</a></li>');
    for (const s of types) tocItems.push(`<li class="toc-l3"><a href="#${escapeHtml(s.name)}">${escapeHtml(s.name)}</a></li>`);
  }
  if (consts.length > 0) {
    tocItems.push('<li><a href="#constants">Constants</a></li>');
    for (const s of consts) tocItems.push(`<li class="toc-l3"><a href="#${escapeHtml(s.name)}">${escapeHtml(s.name)}</a></li>`);
  }
  if (fns.length > 0) {
    tocItems.push('<li><a href="#functions">Functions</a></li>');
    for (const s of fns) tocItems.push(`<li class="toc-l3"><a href="#${escapeHtml(s.name)}">${escapeHtml(s.name)}</a></li>`);
  }
  if (usages.length > 0) {
    tocItems.push('<li><a href="#used-in-samples">Used in Samples</a></li>');
  }

  const body = `<div class="portal-layout">
  ${renderModuleSidebar(allModules, mod.id, true)}
  <article class="md-prose">
    <section id="overview">
      <div class="portal-card-head" style="margin-bottom: 0.5rem;">
        <span class="code-card-meta"><a href="../">Modules</a> / ${escapeHtml(mod.id)}</span>
        <span class="status-pill ${meta.pillClass}">${escapeHtml(meta.label)}</span>
      </div>
      <h1><code>${escapeHtml(mod.id)}</code></h1>
      <p class="hero-lead">${formatInlineDoc(mod.summary || `${mod.id} module.`)}</p>
      <pre class="code-block"><code>${highlightLite(`${alias} := import "${mod.id}";`)}</code></pre>
      <p style="margin-top: 0.75rem; font-size: 0.88rem; color: var(--ink-muted);">${sourceLink}</p>
    </section>
    ${renderSection('types', 'Types', types)}
    ${renderSection('constants', 'Constants', consts)}
    ${renderSection('functions', 'Functions', fns)}
    ${usagesSection}
  </article>
  <aside class="portal-toc" aria-label="Symbols on this page">
    <p class="portal-toc-title">On This Page</p>
    <ul>
      ${tocItems.join('\n      ')}
    </ul>
  </aside>
</div>`;

  return renderPage({
    title: `${mod.id} — Modules — Lite`,
    description: mod.summary || `API reference for Lite module ${mod.id}.`,
    basePath: '../../',
    active: 'modules',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

/** Builds `modules/index.html`, all `modules/<ns>/<name>.html` pages, and module/symbol search entries. */
export function buildModulesSection(options: Readonly<{
  modules: readonly ModuleApiDoc[];
  showcaseSamples: readonly ShowcaseSample[];
  playSamples: readonly PlaySample[];
  playGroups: readonly PlayGroup[];
  repoUrl: string;
  rev: SourceRevision;
  lightSwitchShine: boolean;
}>): ModulesBuildOutput {
  const { modules, showcaseSamples, playSamples, playGroups, repoUrl, rev, lightSwitchShine } = options;
  const playBadgeMap = new Map(playGroups.map((group) => [group.id, group.badge]));
  const allSamples: SampleRef[] = [
    ...showcaseSamples.map((s) => ({ id: s.id, title: s.title, file: s.file, badge: 'showcase' })),
    ...playSamples.map((s) => ({ id: s.id, title: s.title, file: s.file, badge: playBadgeMap.get(s.group) ?? 'play' })),
  ];
  const usageMap = collectModuleUsages(modules, allSamples);

  const files = new Map<string, string>();
  files.set('modules/index.html', renderModulesIndexPage(modules, usageMap, repoUrl, rev, lightSwitchShine));

  const searchEntries: SearchEntry[] = [];
  let symbolCount = 0;

  for (const mod of modules) {
    const relPath = `modules/${mod.namespace}/${mod.name}.html`;
    const usages = usageMap.get(mod.id) ?? [];
    files.set(relPath, renderModuleDetailPage(mod, modules, usages, repoUrl, rev, lightSwitchShine));
    searchEntries.push({
      kind: 'module',
      title: mod.id,
      subtitle: `${mod.summary || mod.id} (${String(mod.symbols.length)} symbols)`,
      href: relPath,
      keywords: `${mod.id} ${mod.namespace} ${mod.name} ${mod.environment} ${mod.file}`,
      badge: ENV_META[mod.environment].label,
    });
    for (const sym of mod.symbols) {
      symbolCount += 1;
      searchEntries.push({
        kind: 'symbol',
        title: `${mod.id}.${sym.name}`,
        subtitle: sym.doc || sym.signature,
        href: `${relPath}#${encodeURIComponent(sym.name)}`,
        keywords: `${mod.id} ${sym.name} ${sym.signature} ${sym.doc}`,
        badge: sym.kind,
      });
    }
  }

  return {
    files,
    searchEntries,
    moduleCount: modules.length,
    symbolCount,
  };
}
