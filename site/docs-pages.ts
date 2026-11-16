/** Generates the two-layer `/docs/` portal: Shipped Lite Handbook + Design Specification & Proposals. */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { renderDocuments, type RenderedDocument } from '../tools/docs.ts';
import { renderPage, rootDir, type SourceRevision } from './chrome.ts';
import type { ShowcaseSample } from './groups.ts';
import { escapeHtml, highlightC, highlightLite, highlightTs } from './highlight.ts';
import type { PlaySample } from './play-samples.ts';
import type { SearchEntry } from './search.ts';

export type DocLayer = 'handbook' | 'spec';

type DocMeta = Readonly<{
  sourcePath: string;
  outPath: string;
  layer: DocLayer;
  group: 'handbook' | 'start' | 'design' | 'proposals' | 'compiler';
  navLabel: string;
  summary?: string;
  chapterSlug?: string;
  verifiedInTs: boolean;
}>;

type RenderedDocEntry = Readonly<{
  meta: DocMeta;
  rendered: RenderedDocument;
  processedHtml: string;
}>;

export type DocsBuildOutput = Readonly<{
  files: ReadonlyMap<string, string>;
  searchEntries: readonly SearchEntry[];
  docsPageCount: number;
  handbookCount: number;
  specCount: number;
}>;

const HANDBOOK_CHAPTERS: readonly { sourcePath: string; slug: string; navLabel: string; summary: string }[] = [
  {
    sourcePath: 'language/learn/handbook/getting-started/overview-and-setup.md',
    slug: 'overview-and-setup',
    navLabel: '1. Overview & Setup',
    summary: 'Explicit imports, running CLI scripts with ./bin/lite, file kinds, and nestable comments.',
  },
  {
    sourcePath: 'language/learn/handbook/foundations/bindings-and-mutability.md',
    slug: 'bindings-and-mutability',
    navLabel: '2. Bindings & Mutability',
    summary: 'Immutable := defaults, zero-value storage, reserved = ?, var updates, and mut lists.',
  },
  {
    sourcePath: 'language/learn/handbook/foundations/numbers-operators-and-strings.md',
    slug: 'numbers-operators-and-strings',
    navLabel: '3. Numbers, Operators & Strings',
    summary: 'Int8..Int64, Float/Float32, / % vs :/ :%, **, =!=, chained comparisons, and core/text.',
  },
  {
    sourcePath: 'language/learn/handbook/control/conditionals-match-and-loops.md',
    slug: 'conditionals-match-and-loops',
    navLabel: '4. Conditionals, Match & Loops',
    summary: 'Expression if/else, subjectless match, sequence loops, .index/.count/.value, then, @tag, and finally.',
  },
  {
    sourcePath: 'language/learn/handbook/types/tuples-arrays-lists-and-aliases.md',
    slug: 'tuples-arrays-lists-and-aliases',
    navLabel: '5. Tuples, Arrays, Lists & Aliases',
    summary: 'Unnamed/named/mixed tuples, =name shorthand, [T; N] arrays, List<T> snapshots, and type aliases.',
  },
  {
    sourcePath: 'language/learn/handbook/execution/blocks-wiring-and-closures.md',
    slug: 'blocks-wiring-and-closures',
    navLabel: '6. Blocks, Wiring & Closures',
    summary: 'Final-item block values, DCE pruning, parallel wiring, execution trace safety, self, and closures.',
  },
  {
    sourcePath: 'language/learn/handbook/modules/imports-visibility-and-io.md',
    slug: 'imports-visibility-and-io',
    navLabel: '7. Imports, Visibility & I/O',
    summary: 'Namespace imports, pub boundaries, Browser + CLI vs Host OS modules, and core/io streams.',
  },
];

const START_SPEC_ORDER: readonly string[] = [
  'docs/README.md',
  'docs/start-here.md',
  'docs/tour.md',
  'docs/white-paper.md',
  'docs/principles.md',
  'docs/decisions-and-open-questions.md',
  'docs/spec/README.md',
  'docs/normative-pages.md',
  'docs/grammar-sketch.md',
];

function unescapeHtmlEntities(raw: string): string {
  return raw
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

function discoverSpecDocs(verifiedSet: ReadonlySet<string>): readonly DocMeta[] {
  const metas: DocMeta[] = [];
  const usedOut = new Set<string>();

  const claimOut = (preferred: string): string => {
    let candidate = preferred;
    let idx = 2;
    while (usedOut.has(candidate)) {
      candidate = preferred.replace(/\.html$/, `-${String(idx)}.html`);
      idx += 1;
    }
    usedOut.add(candidate);
    return candidate;
  };

  const docsDir = join(rootDir, 'docs');
  const docsFiles = readdirSync(docsDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => `docs/${f}`);

  const orderedStart = START_SPEC_ORDER.filter((p) => existsSync(join(rootDir, p)));
  const startSet = new Set(orderedStart);

  for (const src of orderedStart) {
    const base = src === 'docs/README.md'
      ? 'overview.html'
      : src === 'docs/spec/README.md'
        ? 'spec-overview.html'
        : `${posix.basename(src, '.md')}.html`;
    metas.push({
      sourcePath: src,
      outPath: claimOut(`docs/design/${base}`),
      layer: 'spec',
      group: 'start',
      navLabel: posix.basename(src, '.md'),
      verifiedInTs: verifiedSet.has(src),
    });
  }

  for (const src of docsFiles) {
    if (startSet.has(src)) continue;
    metas.push({
      sourcePath: src,
      outPath: claimOut(`docs/design/${posix.basename(src, '.md')}.html`),
      layer: 'spec',
      group: 'design',
      navLabel: posix.basename(src, '.md'),
      verifiedInTs: verifiedSet.has(src),
    });
  }

  for (const file of readdirSync(join(rootDir, 'docs', 'spec')).filter((f) => f.endsWith('.md')).sort()) {
    const src = `docs/spec/${file}`;
    if (startSet.has(src)) continue;
    metas.push({
      sourcePath: src,
      outPath: claimOut(`docs/design/spec-${posix.basename(file, '.md')}.html`),
      layer: 'spec',
      group: 'design',
      navLabel: `spec/${posix.basename(file, '.md')}`,
      verifiedInTs: verifiedSet.has(src),
    });
  }

  for (const file of readdirSync(join(rootDir, 'docs', 'research')).filter((f) => f.endsWith('.md')).sort()) {
    const src = `docs/research/${file}`;
    metas.push({
      sourcePath: src,
      outPath: claimOut(`docs/design/research-${posix.basename(file, '.md')}.html`),
      layer: 'spec',
      group: 'design',
      navLabel: `research/${posix.basename(file, '.md')}`,
      verifiedInTs: verifiedSet.has(src),
    });
  }

  for (const file of readdirSync(join(rootDir, 'docs', 'proposals')).filter((f) => f.endsWith('.md')).sort()) {
    const src = `docs/proposals/${file}`;
    metas.push({
      sourcePath: src,
      outPath: claimOut(`docs/proposals/${posix.basename(file, '.md')}.html`),
      layer: 'spec',
      group: 'proposals',
      navLabel: posix.basename(file, '.md'),
      verifiedInTs: verifiedSet.has(src),
    });
  }

  const compilerOrder = ['compiler/README.md', 'compiler/transition-plan.md', 'compiler/parity.md', 'compiler/gaps.md'];
  const compilerSeen = new Set<string>();
  const compilerAll = [
    ...compilerOrder.filter((p) => existsSync(join(rootDir, p))),
    ...readdirSync(join(rootDir, 'compiler'))
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => `compiler/${f}`)
      .filter((p) => !compilerOrder.includes(p)),
  ];
  for (const src of compilerAll) {
    if (compilerSeen.has(src)) continue;
    compilerSeen.add(src);
    const outName = src === 'compiler/README.md' ? 'overview.html' : `${posix.basename(src, '.md')}.html`;
    metas.push({
      sourcePath: src,
      outPath: claimOut(`docs/compiler/${outName}`),
      layer: 'spec',
      group: 'compiler',
      navLabel: src === 'compiler/README.md' ? 'compiler overview' : posix.basename(src, '.md'),
      verifiedInTs: verifiedSet.has(src),
    });
  }

  for (const [src, outName, label] of [
    ['compiler/bootstrap/README.md', 'bootstrap-readme.html', 'compiler/bootstrap'],
    ['compiler/manifests/README.md', 'manifests-readme.html', 'compiler/manifests'],
    ['igniter/tests/README.md', 'igniter-tests.html', 'igniter/tests'],
    ['CONTRIBUTING.md', 'contributing.html', 'CONTRIBUTING'],
  ] as const) {
    if (existsSync(join(rootDir, src))) {
      metas.push({
        sourcePath: src,
        outPath: claimOut(`docs/compiler/${outName}`),
        layer: 'spec',
        group: 'compiler',
        navLabel: label,
        verifiedInTs: verifiedSet.has(src),
      });
    }
  }

  return metas;
}

export type DocOutMapOptions = Readonly<{
  docOutBySource: ReadonlyMap<string, string>;
  samplesByFile: ReadonlyMap<string, string>;
}>;

/** Builds the global source-path -> output-HTML map covering Handbook, Spec, and lib module docs. */
export function buildDocOutMap(options: Readonly<{
  modulesBase?: readonly { file: string; namespace: string; name: string }[];
}>): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const ch of HANDBOOK_CHAPTERS) {
    map.set(ch.sourcePath, `docs/handbook/${ch.slug}.html`);
  }
  const verified = loadVerifiedDocsSet();
  for (const m of discoverSpecDocs(verified)) {
    map.set(m.sourcePath, m.outPath);
  }
  for (const mod of options.modulesBase ?? []) {
    map.set(mod.file, `modules/${mod.namespace}/${mod.name}.html`);
  }
  return map;
}

function loadVerifiedDocsSet(): ReadonlySet<string> {
  const verified = new Set<string>(['docs/start-here.md', 'docs/tour.md']);
  const catalogPath = join(rootDir, 'language', 'showcases', 'catalog.json');
  if (!existsSync(catalogPath)) return verified;
  const parsed = JSON.parse(readFileSync(catalogPath, 'utf8')) as {
    chapters?: Array<{ topics?: Array<{ docs?: string[] }> }>;
  };
  for (const ch of parsed.chapters ?? []) {
    for (const topic of ch.topics ?? []) {
      for (const docPath of topic.docs ?? []) {
        verified.add(docPath);
      }
    }
  }
  return verified;
}

type RegisteredSnippet = Readonly<{
  sampleId?: string;
  sourcePath: string;
}>;

function loadSnippetMap(
  samplesByFile: ReadonlyMap<string, string>,
): ReadonlyMap<string, RegisteredSnippet> {
  const map = new Map<string, RegisteredSnippet>();
  const cfgPath = join(rootDir, 'config', 'documentation.json');
  if (!existsSync(cfgPath)) return map;
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8')) as {
    snippets?: Array<{ document?: string; source?: string; fence?: number }>;
  };
  for (const s of cfg.snippets ?? []) {
    if (typeof s.document === 'string' && typeof s.source === 'string' && typeof s.fence === 'number') {
      const sampleId = samplesByFile.get(s.source);
      map.set(`${s.document}#${String(s.fence)}`, {
        ...(sampleId !== undefined ? { sampleId } : {}),
        sourcePath: s.source,
      });
    }
  }
  return map;
}

function relativeHref(fromOutPath: string, toOutPath: string): string {
  const rel = posix.relative(posix.dirname(fromOutPath), toOutPath);
  return rel === '' ? posix.basename(toOutPath) : rel;
}

export function postprocessMarkdownHtml(options: Readonly<{
  rawHtml: string;
  sourcePath: string;
  outPath: string;
  docOutBySource: ReadonlyMap<string, string>;
  samplesByFile: ReadonlyMap<string, string>;
  snippets: ReadonlyMap<string, RegisteredSnippet>;
  repoUrl: string;
  highlightUnmarkedAsLite?: boolean;
}>): string {
  const {
    rawHtml,
    sourcePath,
    outPath,
    docOutBySource,
    samplesByFile,
    snippets,
    repoUrl,
    highlightUnmarkedAsLite = false,
  } = options;

  let html = rawHtml.replace(
    /<pre class="md-code" data-lang="([^"]*)" data-fence="(\d+)"><code>([\s\S]*?)<\/code><\/pre>/g,
    (_full, rawLang: string, fenceStr: string, innerEscaped: string) => {
      const lang = unescapeHtmlEntities(rawLang).trim().toLowerCase();
      const rawCode = unescapeHtmlEntities(innerEscaped).replace(/\n$/, '');
      const snippet = snippets.get(`${sourcePath}#${fenceStr}`);

      let codeHtml: string;
      if (lang === 'lite' || lang === 'lts' || (lang === 'text' && snippet !== undefined) || (lang === '' && highlightUnmarkedAsLite)) {
        codeHtml = highlightLite(rawCode);
      } else if (lang === 'ts' || lang === 'typescript') {
        codeHtml = highlightTs(rawCode);
      } else if (lang === 'c') {
        codeHtml = highlightC(rawCode);
      } else {
        codeHtml = escapeHtml(rawCode);
      }

      const preBlock = `<pre class="code-block" data-lang="${escapeHtml(lang || 'text')}" data-fence="${fenceStr}"><code>${codeHtml}</code></pre>`;
      if (snippet !== undefined) {
        if (snippet.sampleId !== undefined) {
          const playHref = `${relativeHref(outPath, 'playground/')}?sample=${encodeURIComponent(snippet.sampleId)}`;
          return `<div class="code-card md-snippet-card">${preBlock}<div class="sample-foot"><span class="code-card-meta"><code>${escapeHtml(snippet.sourcePath)}</code></span><a href="${escapeHtml(playHref)}">Open in Play &rarr;</a></div></div>`;
        }
        const srcHref = repoUrl ? `${repoUrl}/blob/main/${snippet.sourcePath}` : '#';
        return `<div class="code-card md-snippet-card">${preBlock}<div class="sample-foot"><span class="code-card-meta">Verified snippet</span><a href="${escapeHtml(srcHref)}"><code>${escapeHtml(snippet.sourcePath)}</code></a></div></div>`;
      }
      return preBlock;
    },
  );

  html = html.replace(
    /<a href="([^"]*)" data-md-href="([^"]*)"([^>]*)>/g,
    (_full, _hrefAttr: string, rawTargetAttr: string, restAttrs: string) => {
      const decodedTarget = unescapeHtmlEntities(rawTargetAttr);
      const hashIdx = decodedTarget.indexOf('#');
      const rawPathPart = hashIdx >= 0 ? decodedTarget.slice(0, hashIdx) : decodedTarget;
      const frag = hashIdx >= 0 ? decodedTarget.slice(hashIdx + 1) : '';
      const resolvedRepo = rawPathPart === ''
        ? sourcePath
        : posix.normalize(posix.join(posix.dirname(sourcePath), decodeURIComponentSafe(rawPathPart)));

      const mappedOut = docOutBySource.get(resolvedRepo);
      if (mappedOut !== undefined) {
        const finalHref = mappedOut === outPath
          ? (frag ? `#${frag}` : posix.basename(outPath))
          : (frag ? `${relativeHref(outPath, mappedOut)}#${frag}` : relativeHref(outPath, mappedOut));
        return `<a href="${escapeHtml(finalHref)}"${restAttrs}>`;
      }

      const readmeCandidate = `${resolvedRepo.replace(/\/+$/, '')}/README.md`;
      const mappedDirReadme = docOutBySource.get(readmeCandidate);
      if (mappedDirReadme !== undefined) {
        const finalHref = frag ? `${relativeHref(outPath, mappedDirReadme)}#${frag}` : relativeHref(outPath, mappedDirReadme);
        return `<a href="${escapeHtml(finalHref)}"${restAttrs}>`;
      }

      const playSampleId = samplesByFile.get(resolvedRepo);
      if (playSampleId !== undefined) {
        const playHref = `${relativeHref(outPath, 'playground/')}?sample=${encodeURIComponent(playSampleId)}`;
        return `<a href="${escapeHtml(playHref)}"${restAttrs}>`;
      }

      if (repoUrl !== '') {
        const diskPath = resolve(rootDir, resolvedRepo);
        let isDir = resolvedRepo.endsWith('/');
        try {
          if (existsSync(diskPath) && statSync(diskPath).isDirectory()) isDir = true;
        } catch {
          // ignore
        }
        const cleanRepo = resolvedRepo.replace(/^\/+|\/+$/g, '');
        const blobOrTree = isDir ? 'tree' : 'blob';
        const ghHref = `${repoUrl}/${blobOrTree}/main/${cleanRepo}${frag ? `#${frag}` : ''}`;
        const relAttr = restAttrs.includes('rel=') ? '' : ' target="_blank" rel="noopener"';
        return `<a href="${escapeHtml(ghHref)}"${relAttr}${restAttrs}>`;
      }

      return `<a href="#top"${restAttrs}>`;
    },
  );

  return html;
}

function decodePercentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeURIComponentSafe(value: string): string {
  return decodePercentSafe(value);
}

function statusPillForDoc(meta: DocMeta, rawStatus: string): Readonly<{
  filterKey: string;
  label: string;
  pillClass: string;
}> {
  if (meta.layer === 'handbook') {
    return { filterKey: 'shipped', label: 'Verified in TS', pillClass: 'status-pill-shipped' };
  }
  const effective = meta.group === 'proposals' ? 'proposal' : rawStatus;
  if (effective === 'historical') {
    return { filterKey: 'historical', label: 'Historical', pillClass: 'status-pill-historical' };
  }
  if (effective === 'proposal') {
    return { filterKey: 'proposal', label: 'Working Proposal', pillClass: 'status-pill-proposal' };
  }
  if (effective === 'open') {
    return { filterKey: 'open', label: 'Open Question', pillClass: 'status-pill-open' };
  }
  return { filterKey: 'selected', label: 'Selected Design', pillClass: 'status-pill-selected' };
}

function renderDocsSidebar(
  layer: DocLayer,
  activeOutPath: string,
  handbookEntries: readonly RenderedDocEntry[],
  specEntries: readonly RenderedDocEntry[],
): string {
  const relFromActive = (targetOut: string): string =>
    targetOut === activeOutPath ? posix.basename(targetOut) : relativeHref(activeOutPath, targetOut);

  if (layer === 'handbook') {
    const items = handbookEntries
      .map((entry) => {
        const href = relFromActive(entry.meta.outPath);
        const cls = entry.meta.outPath === activeOutPath ? ' class="active"' : '';
        return `<li><a href="${escapeHtml(href)}"${cls}>${escapeHtml(entry.meta.navLabel)}</a></li>`;
      })
      .join('\n          ');
    const singleHref = relFromActive('docs/handbook/single-page.html');
    const singleCls = activeOutPath === 'docs/handbook/single-page.html' ? ' class="active"' : '';
    const specHref = relFromActive('docs/spec/index.html');
    return `<aside class="portal-sidebar" aria-label="Handbook navigation">
      <div class="docs-layer-switch">
        <span class="status-pill status-pill-shipped">Shipped Handbook</span>
        <a href="${escapeHtml(specHref)}">Spec &rarr;</a>
      </div>
      <details class="portal-nav-group" open>
        <summary>Chapters (7)</summary>
        <ul class="portal-nav-list">
          ${items}
          <li><a href="${escapeHtml(singleHref)}"${singleCls}>Single-Page View</a></li>
        </ul>
      </details>
    </aside>`;
  }

  const groups: readonly { id: RenderedDocEntry['meta']['group']; title: string }[] = [
    { id: 'start', title: 'Start & Overview' },
    { id: 'design', title: 'Design Reference' },
    { id: 'proposals', title: 'Proposals (LP)' },
    { id: 'compiler', title: 'Compiler & Contribute' },
  ];
  const groupHtml = groups
    .map((group) => {
      const items = specEntries.filter((e) => e.meta.group === group.id);
      if (items.length === 0) return '';
      const hasActive = items.some((e) => e.meta.outPath === activeOutPath) || group.id === 'start';
      const openAttr = hasActive ? ' open' : '';
      const lis = items
        .map((e) => {
          const href = relFromActive(e.meta.outPath);
          const cls = e.meta.outPath === activeOutPath ? ' class="active"' : '';
          return `<li data-verified="${e.meta.verifiedInTs ? 'true' : 'false'}"><a href="${escapeHtml(href)}"${cls}>${escapeHtml(e.meta.navLabel)}</a></li>`;
        })
        .join('\n            ');
      return `<details class="portal-nav-group"${openAttr}>
        <summary>${escapeHtml(group.title)} (${String(items.length)})</summary>
        <ul class="portal-nav-list">
          ${lis}
        </ul>
      </details>`;
    })
    .filter(Boolean)
    .join('\n      ');

  const handbookHref = relFromActive('docs/handbook/overview-and-setup.html');
  return `<aside class="portal-sidebar" aria-label="Specification navigation">
      <div class="docs-layer-switch">
        <a href="${escapeHtml(handbookHref)}">&larr; Handbook</a>
        <span class="status-pill status-pill-selected">Design Spec</span>
      </div>
      <label class="docs-verified-toggle">
        <input id="docs-verified-only" type="checkbox">
        <span>Verified in TS only</span>
      </label>
      ${groupHtml}
    </aside>`;
}

function renderSpecLandingPage(
  specEntries: readonly RenderedDocEntry[],
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const sidebar = renderDocsSidebar('spec', 'docs/spec/index.html', [], specEntries);
  const startCards = specEntries
    .filter((e) => e.meta.group === 'start')
    .map((entry) => {
      const pill = statusPillForDoc(entry.meta, entry.rendered.status);
      const href = relativeHref('docs/spec/index.html', entry.meta.outPath);
      const verifiedTag = entry.meta.verifiedInTs
        ? '<span class="status-pill status-pill-shipped">Verified in TS</span>'
        : '';
      return `<article class="portal-card">
        <div class="portal-card-head">
          <h3><a href="${escapeHtml(href)}">${escapeHtml(entry.rendered.title || entry.meta.navLabel)}</a></h3>
          <div>${verifiedTag} <span class="status-pill ${pill.pillClass}">${escapeHtml(pill.label)}</span></div>
        </div>
        <p><code>${escapeHtml(entry.meta.sourcePath)}</code></p>
      </article>`;
    })
    .join('\n');

  const body = `<div class="portal-layout-2col">
  ${sidebar}
  <article class="md-prose">
    <h1>Full Design Specification, Proposals &amp; Compiler Docs</h1>
    <p class="hero-lead">
      Browse all ${String(specEntries.length)} design documents, language proposals (<code>LP-0001..LP-0010</code>),
      and compiler architecture guides with explicit status labels distinguishing shipped TS behavior from selected design and open proposals.
    </p>
    <div class="portal-grid-2">
      ${startCards}
    </div>
  </article>
</div>
${specSidebarFilterScript()}`;

  return renderPage({
    title: 'Design Specification — Docs — Lite',
    description: 'LiteLang design specification, proposals, and compiler documentation index.',
    basePath: '../../',
    active: 'docs',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

function specSidebarFilterScript(): string {
  return `<script>
  (function () {
    var box = document.getElementById("docs-verified-only");
    if (!box) return;
    box.addEventListener("change", function () {
      var onlyVerified = Boolean(box.checked);
      var items = document.querySelectorAll('.portal-nav-list li[data-verified]');
      for (var i = 0; i < items.length; i += 1) {
        var li = items[i];
        li.hidden = onlyVerified && li.getAttribute("data-verified") !== "true";
      }
    });
  })();
</script>`;
}

function renderSinglePageHandbook(
  handbookEntries: readonly RenderedDocEntry[],
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const chapterHrefByOut = new Map(
    handbookEntries.map((e) => [e.meta.outPath, `#chapter-${e.meta.chapterSlug ?? e.meta.navLabel}`]),
  );

  const chapterBlocks = handbookEntries.map((entry, idx) => {
    const chSlug = entry.meta.chapterSlug ?? `ch-${String(idx + 1)}`;
    const anchorPrefix = `h${String(idx + 1)}-`;
    let html = entry.processedHtml
      .replace(/\bid="([^"]+)"/g, (_m, idVal: string) => `id="${anchorPrefix}${idVal}"`)
      .replace(/<a href="#([^"]+)"/g, (_m, fragVal: string) => `<a href="#${anchorPrefix}${fragVal}"`)
      .replace(/<a href="([^"#]+)(#[^"]*)?"/g, (full, fileHref: string) => {
        const resolved = posix.normalize(posix.join('docs/handbook', fileHref));
        const jump = chapterHrefByOut.get(resolved);
        return jump ? `<a href="${escapeHtml(jump)}"` : full;
      });
    return `<section class="section handbook-single-chapter" id="chapter-${escapeHtml(chSlug)}">
      <div class="portal-card-head" style="margin-bottom: 0.5rem;">
        <span class="code-card-meta">Chapter ${String(idx + 1)}</span>
        <span class="status-pill status-pill-shipped">Verified in TS</span>
      </div>
      ${html}
    </section>`;
  }).join('\n');

  const tocItems = handbookEntries.map((e, idx) => {
    const chSlug = e.meta.chapterSlug ?? `ch-${String(idx + 1)}`;
    return `<li><a href="#chapter-${escapeHtml(chSlug)}">${escapeHtml(e.meta.navLabel)}</a></li>`;
  }).join('\n      ');

  const body = `<div class="portal-layout">
  ${renderDocsSidebar('handbook', 'docs/handbook/single-page.html', handbookEntries, [])}
  <article class="md-prose">
    <div class="portal-card-head" style="margin-bottom: 0.5rem;">
      <span class="code-card-meta"><a href="../">Docs</a> / Handbook / Single-Page View</span>
      <span class="status-pill status-pill-shipped">100% Runnable in TS</span>
    </div>
    <h1>The Lite Handbook (Single-Page Edition)</h1>
    <p class="hero-lead">All seven Shipped Handbook chapters on one page for fast reading, search, or printing.</p>
    ${chapterBlocks}
  </article>
  <aside class="portal-toc" aria-label="Chapters">
    <p class="portal-toc-title">Chapters</p>
    <ul>
      ${tocItems}
    </ul>
  </aside>
</div>`;

  return renderPage({
    title: 'Single-Page Handbook — Docs — Lite',
    description: 'Complete Shipped Lite Handbook on a single searchable page.',
    basePath: '../../',
    active: 'docs',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

function renderDocsLandingPage(
  handbookEntries: readonly RenderedDocEntry[],
  specEntries: readonly RenderedDocEntry[],
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const handbookCards = handbookEntries
    .map((entry) => {
      const href = relativeHref('docs/index.html', entry.meta.outPath);
      return `<article class="portal-card">
      <div class="portal-card-head">
        <h3><a href="${escapeHtml(href)}">${escapeHtml(entry.meta.navLabel)}</a></h3>
        <span class="status-pill status-pill-shipped">Verified in TS</span>
      </div>
      <p>${escapeHtml(entry.meta.summary ?? '')}</p>
      <div class="portal-card-foot">
        <span class="code-card-meta">Handbook</span>
        <a href="${escapeHtml(href)}">Read &rarr;</a>
      </div>
    </article>`;
    })
    .join('\n');

  const specHighlights = specEntries
    .filter((e) => e.meta.group === 'start' || e.meta.sourcePath === 'compiler/README.md')
    .slice(0, 6)
    .map((entry) => {
      const pill = statusPillForDoc(entry.meta, entry.rendered.status);
      const href = relativeHref('docs/index.html', entry.meta.outPath);
      return `<article class="portal-card">
      <div class="portal-card-head">
        <h3><a href="${escapeHtml(href)}">${escapeHtml(entry.rendered.title || entry.meta.navLabel)}</a></h3>
        <span class="status-pill ${pill.pillClass}">${escapeHtml(pill.label)}</span>
      </div>
      <p><code>${escapeHtml(entry.meta.sourcePath)}</code></p>
      <div class="portal-card-foot">
        <span class="code-card-meta">${entry.meta.verifiedInTs ? 'Backed by showcased cases' : 'Reference document'}</span>
        <a href="${escapeHtml(href)}">Open &rarr;</a>
      </div>
    </article>`;
    })
    .join('\n');

  const body = `<section class="page-hero">
  <h1>Documentation</h1>
  <p class="hero-lead">
    Structured into two clear layers: the <strong>Shipped Lite Handbook</strong> (100% runnable today) and the full
    <strong>Design Specification &amp; Proposals</strong> archive (${String(specEntries.length)} documents).
  </p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="handbook/overview-and-setup.html">Start Handbook</a>
    <a class="btn" href="handbook/single-page.html">Single-Page Handbook</a>
    <a class="btn" href="spec/">Browse Design Spec (${String(specEntries.length)} docs)</a>
  </div>
</section>

<section class="section" id="handbook">
  <div class="section-head">
    <h2>Layer 1 — Shipped Lite Handbook</h2>
    <span class="status-pill status-pill-shipped">Verified in TS</span>
  </div>
  <p class="section-note">Seven sequential chapters covering every language feature, collection type, and module supported by the compiler right now.</p>
  <div class="portal-grid">
    ${handbookCards}
  </div>
</section>

<section class="section" id="design-spec">
  <div class="section-head">
    <h2>Layer 2 — Design Specification, Proposals &amp; Compiler</h2>
    <a href="spec/">All ${String(specEntries.length)} spec docs &rarr;</a>
  </div>
  <p class="section-note">
    Normative language contracts (<span class="status-pill status-pill-selected">Selected Design</span>),
    pending designs (<span class="status-pill status-pill-proposal">Working Proposal</span>),
    open questions (<span class="status-pill status-pill-open">Open Question</span>), and dated archives (<span class="status-pill status-pill-historical">Historical</span>).
  </p>
  <div class="portal-grid">
    ${specHighlights}
  </div>
</section>`;

  return renderPage({
    title: 'Docs — Lite',
    description: 'Two-layer Lite documentation portal: Shipped Lite Handbook and full Design Specification & Proposals.',
    basePath: '../',
    active: 'docs',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

/** Builds all `/docs/` portal HTML pages and search entries. */
export function buildDocsSection(options: Readonly<{
  showcaseSamples: readonly ShowcaseSample[];
  playSamples: readonly PlaySample[];
  repoUrl: string;
  rev: SourceRevision;
  lightSwitchShine: boolean;
}>): DocsBuildOutput {
  const { showcaseSamples, playSamples, repoUrl, rev, lightSwitchShine } = options;
  const verifiedDocs = loadVerifiedDocsSet();
  const samplesByFile = new Map<string, string>();
  for (const s of [...showcaseSamples, ...playSamples]) {
    samplesByFile.set(s.file, s.id);
  }
  const snippets = loadSnippetMap(samplesByFile);

  const handbookMetas: DocMeta[] = HANDBOOK_CHAPTERS.map((ch) => ({
    sourcePath: ch.sourcePath,
    outPath: `docs/handbook/${ch.slug}.html`,
    layer: 'handbook',
    group: 'handbook',
    navLabel: ch.navLabel,
    summary: ch.summary,
    chapterSlug: ch.slug,
    verifiedInTs: true,
  }));
  const specMetas = discoverSpecDocs(verifiedDocs);
  const allMetas: DocMeta[] = [...handbookMetas, ...specMetas];

  const docOutBySource = new Map<string, string>(allMetas.map((m) => [m.sourcePath, m.outPath]));
  const renderedDocs = renderDocuments(allMetas.map((m) => m.sourcePath), rootDir);
  const renderedByPath = new Map<string, RenderedDocument>(renderedDocs.map((d) => [d.path, d]));

  const renderedEntries: RenderedDocEntry[] = allMetas.map((meta) => {
    const rendered = renderedByPath.get(meta.sourcePath);
    if (rendered === undefined) {
      throw new Error(`missing rendered markdown output for ${meta.sourcePath}`);
    }
    const processedHtml = postprocessMarkdownHtml({
      rawHtml: rendered.html,
      sourcePath: meta.sourcePath,
      outPath: meta.outPath,
      docOutBySource,
      samplesByFile,
      snippets,
      repoUrl,
      highlightUnmarkedAsLite: meta.layer === 'handbook',
    });
    return { meta, rendered, processedHtml };
  });

  const handbookEntries = renderedEntries.filter((e) => e.meta.layer === 'handbook');
  const specEntries = renderedEntries.filter((e) => e.meta.layer === 'spec');

  const files = new Map<string, string>();
  files.set('docs/index.html', renderDocsLandingPage(handbookEntries, specEntries, repoUrl, rev, lightSwitchShine));
  files.set('docs/spec/index.html', renderSpecLandingPage(specEntries, repoUrl, rev, lightSwitchShine));
  files.set('docs/handbook/single-page.html', renderSinglePageHandbook(handbookEntries, repoUrl, rev, lightSwitchShine));

  const searchEntries: SearchEntry[] = [
    {
      kind: 'handbook',
      title: 'Single-Page Lite Handbook',
      subtitle: 'All 7 Shipped Handbook chapters on one searchable page',
      href: 'docs/handbook/single-page.html',
      keywords: 'handbook single page complete shipped guide',
      badge: 'Handbook',
    },
    {
      kind: 'doc',
      title: 'Design Specification Index',
      subtitle: 'All design documents, LP proposals, and compiler architecture pages',
      href: 'docs/spec/',
      keywords: 'design spec proposals compiler index',
      badge: 'Spec',
    },
  ];

  const renderLayerPages = (entries: readonly RenderedDocEntry[]): void => {
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i]!;
      const { meta, rendered, processedHtml } = entry;
      const prev = i > 0 ? entries[i - 1]! : undefined;
      const next = i + 1 < entries.length ? entries[i + 1]! : undefined;
      const pill = statusPillForDoc(meta, rendered.status);
      const verifiedBadge = meta.layer === 'spec' && meta.verifiedInTs
        ? '<span class="status-pill status-pill-shipped">Verified in TS</span>'
        : '';

      const breadcrumbRoot = meta.layer === 'handbook' ? 'Handbook' : 'Design Spec';
      const sourceHref = repoUrl ? `${repoUrl}/blob/main/${meta.sourcePath}` : '';
      const editLink = sourceHref
        ? `<a href="${escapeHtml(sourceHref)}">View source (<code>${escapeHtml(meta.sourcePath)}</code>) &rarr;</a>`
        : `<code>${escapeHtml(meta.sourcePath)}</code>`;

      const tocHtml = rendered.toc.length > 0
        ? rendered.toc
            .filter((item) => item.level === 2 || item.level === 3)
            .map((item) => `<li class="toc-l${String(item.level)}"><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`)
            .join('\n      ')
        : '<li><a href="#top">Top of page</a></li>';

      const prevLink = prev
        ? `<a class="btn" href="${escapeHtml(relativeHref(meta.outPath, prev.meta.outPath))}">&larr; ${escapeHtml(prev.meta.navLabel)}</a>`
        : '<span></span>';
      const nextLink = next
        ? `<a class="btn" href="${escapeHtml(relativeHref(meta.outPath, next.meta.outPath))}">${escapeHtml(next.meta.navLabel)} &rarr;</a>`
        : '<span></span>';

      const body = `<div class="portal-layout" id="top">
  ${renderDocsSidebar(meta.layer, meta.outPath, handbookEntries, specEntries)}
  <article class="md-prose">
    <div class="portal-card-head" style="margin-bottom: 0.65rem;">
      <span class="code-card-meta"><a href="${escapeHtml(relativeHref(meta.outPath, 'docs/index.html'))}">Docs</a> / ${escapeHtml(breadcrumbRoot)}</span>
      <div class="docs-badge-row">${verifiedBadge}<span class="status-pill ${pill.pillClass}">${escapeHtml(pill.label)}</span></div>
    </div>
    ${processedHtml}
    <footer class="docs-page-footer">
      <div class="docs-source-row">${editLink}</div>
      <nav class="docs-pager" aria-label="Previous and next document">
        ${prevLink}
        ${nextLink}
      </nav>
    </footer>
  </article>
  <aside class="portal-toc" aria-label="On this page">
    <p class="portal-toc-title">On This Page</p>
    <ul>
      ${tocHtml}
    </ul>
  </aside>
</div>
${meta.layer === 'spec' ? specSidebarFilterScript() : ''}`;

      const pageTitle = `${rendered.title || meta.navLabel} — ${breadcrumbRoot} — Lite`;
      files.set(
        meta.outPath,
        renderPage({
          title: pageTitle,
          description: meta.summary ?? `${rendered.title} (${meta.sourcePath})`,
          basePath: '../../',
          active: 'docs',
          repoUrl,
          rev,
          body,
          lightSwitchShine,
        }),
      );

      searchEntries.push({
        kind: meta.layer === 'handbook' ? 'handbook' : 'doc',
        title: rendered.title || meta.navLabel,
        subtitle: meta.summary ?? meta.sourcePath,
        href: meta.outPath,
        keywords: `${meta.sourcePath} ${meta.navLabel} ${rendered.title}`,
        badge: pill.label,
      });

      for (const h of rendered.toc) {
        if (h.level === 2) {
          searchEntries.push({
            kind: meta.layer === 'handbook' ? 'handbook' : 'doc',
            title: `${rendered.title || meta.navLabel} § ${h.text}`,
            subtitle: meta.sourcePath,
            href: `${meta.outPath}#${encodeURIComponent(h.id)}`,
            keywords: `${rendered.title} ${h.text} ${meta.sourcePath}`,
            badge: 'section',
          });
        }
      }
    }
  };

  renderLayerPages(handbookEntries);
  renderLayerPages(specEntries);

  return {
    files,
    searchEntries,
    docsPageCount: files.size,
    handbookCount: handbookEntries.length,
    specCount: specEntries.length,
  };
}
