/** Generates the two-layer `/docs/` portal via the ignited Lite tool (`tools/src/site-docs.lts`). */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { ensureTool } from '../tools/project.ts';
import type { RenderedDocument } from '../tools/docs.ts';
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

export type DocsBuildOutput = Readonly<{
  files: ReadonlyMap<string, string>;
  searchEntries: readonly SearchEntry[];
  docsPageCount: number;
  handbookCount: number;
  specCount: number;
}>;

function unescapeHtmlEntities(raw: string): string {
  return raw
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

function runSiteDocsTool(args: readonly string[], input?: string): string {
  const result = spawnSync(process.execPath, [ensureTool('site-docs'), ...args], {
    cwd: rootDir,
    input: input ?? '',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite site-docs failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return result.stdout;
}

export type DocOutMapOptions = Readonly<{
  docOutBySource: ReadonlyMap<string, string>;
  samplesByFile: ReadonlyMap<string, string>;
}>;

type DiscoverPayload = Readonly<{
  metas: readonly DocMeta[];
  docOutMap: ReadonlyArray<{ sourcePath: string; outPath: string }>;
  snippets: ReadonlyArray<{ key: string; sourcePath: string }>;
  rendered: readonly RenderedDocument[];
}>;

/** Builds the global source-path -> output-HTML map covering Handbook, Spec, and lib module docs. */
export function buildDocOutMap(options: Readonly<{
  modulesBase?: readonly { file: string; namespace: string; name: string }[];
}>): ReadonlyMap<string, string> {
  const disc = JSON.parse(runSiteDocsTool(['--out-map', rootDir])) as DiscoverPayload;
  const map = new Map<string, string>();
  for (const item of disc.docOutMap) {
    map.set(item.sourcePath, item.outPath);
  }
  for (const mod of options.modulesBase ?? []) {
    map.set(mod.file, `modules/${mod.namespace}/${mod.name}.html`);
  }
  return map;
}

type RegisteredSnippet = Readonly<{
  sampleId?: string;
  sourcePath: string;
}>;

function relativeHref(fromOutPath: string, toOutPath: string): string {
  const rel = posix.relative(posix.dirname(fromOutPath), toOutPath);
  const base = rel === '' ? posix.basename(toOutPath) : rel;
  return toOutPath.endsWith('/') && !base.endsWith('/') ? `${base}/` : base;
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

      const effectiveLang = lang || (highlightUnmarkedAsLite ? 'lite' : 'text');
      const preBlock = `<pre class="code-block" data-lang="${escapeHtml(effectiveLang)}" data-fence="${fenceStr}"><code>${codeHtml}</code></pre>`;
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
        : posix.normalize(posix.join(posix.dirname(sourcePath), decodePercentSafe(rawPathPart)));

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

/** Builds all `/docs/` portal HTML pages and search entries. */
export function buildDocsSection(options: Readonly<{
  showcaseSamples: readonly ShowcaseSample[];
  playSamples: readonly PlaySample[];
  repoUrl: string;
  rev: SourceRevision;
  lightSwitchShine: boolean;
}>): DocsBuildOutput {
  const { showcaseSamples, playSamples, repoUrl, rev, lightSwitchShine } = options;
  const disc = JSON.parse(runSiteDocsTool(['--discover', rootDir])) as DiscoverPayload;

  const samplesByFile = new Map<string, string>();
  for (const s of [...showcaseSamples, ...playSamples]) {
    samplesByFile.set(s.file, s.id);
  }
  const docOutBySource = new Map<string, string>(disc.docOutMap.map((m) => [m.sourcePath, m.outPath]));
  const snippets = new Map<string, RegisteredSnippet>(
    disc.snippets.map((s) => {
      const sampleId = samplesByFile.get(s.sourcePath);
      return [s.key, { ...(sampleId !== undefined ? { sampleId } : {}), sourcePath: s.sourcePath }];
    }),
  );
  const renderedByPath = new Map<string, RenderedDocument>(disc.rendered.map((d) => [d.path, d]));

  const entries = disc.metas.map((meta) => {
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
    return { meta, title: rendered.title, status: rendered.status, toc: rendered.toc, processedHtml };
  });

  const built = JSON.parse(runSiteDocsTool([], JSON.stringify({ repoUrl, entries }))) as {
    docsPageCount: number;
    handbookCount: number;
    specCount: number;
    pages: Array<{ relPath: string; title: string; description: string; basePath: string; body: string }>;
    searchEntries: SearchEntry[];
  };

  const files = new Map<string, string>();
  for (const page of built.pages) {
    files.set(
      page.relPath,
      renderPage({
        title: page.title,
        description: page.description,
        basePath: page.basePath,
        active: 'docs',
        repoUrl,
        rev,
        body: page.body,
        lightSwitchShine,
      }),
    );
  }

  return {
    files,
    searchEntries: built.searchEntries,
    docsPageCount: built.docsPageCount,
    handbookCount: built.handbookCount,
    specCount: built.specCount,
  };
}
