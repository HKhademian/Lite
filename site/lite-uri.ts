/** Canonical `lite://` internal URI resolver, link verifier, and bidirectional Academy usage graph. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, resolve } from 'node:path';
import { spawnTool } from '../igniter/artifacts.ts';
import type { ModuleApiDoc } from './docs-client.ts';
import type { ShowcaseSample } from './groups.ts';
import { escapeHtml } from './highlight.ts';
import type { PlayGroup, PlaySample } from './play-samples.ts';
import type { PlaygroundLibraryItem } from './playground-library.ts';

export type LiteEntityKind = 'handbook' | 'doc' | 'brand' | 'learn' | 'gym' | 'play' | 'module' | 'tool' | 'gallery';

export type ParsedLiteUri = Readonly<{
  raw: string;
  ns: LiteEntityKind | 'repo';
  target: string;
  fragment: string;
}>;

export type LiteGraphNode = Readonly<{
  uri: string;
  kind: LiteEntityKind;
  title: string;
  subtitle?: string;
  outPath: string;
  sourcePath?: string;
  badge?: string;
  catalogId?: string;
}>;

export type LiteEdgeKind = 'lite-uri' | 'markdown-link' | 'catalog-ref' | 'module-import';

export type LiteGraphEdge = Readonly<{
  from: string;
  to: string;
  kind: LiteEdgeKind;
  fragment?: string;
}>;

export type ResolvedLiteUri = Readonly<{
  canonicalUri: string;
  kind: LiteEntityKind | 'repo';
  node?: LiteGraphNode;
  href: string;
  fragment?: string;
  external?: boolean;
}>;

export type RelatedBuckets = Readonly<{
  handbook: readonly LiteGraphNode[];
  doc: readonly LiteGraphNode[];
  brand: readonly LiteGraphNode[];
  learn: readonly LiteGraphNode[];
  gym: readonly LiteGraphNode[];
  play: readonly LiteGraphNode[];
  module: readonly LiteGraphNode[];
  tool: readonly LiteGraphNode[];
  gallery: readonly LiteGraphNode[];
}>;

export type GraphDocSeed = Readonly<{
  sourcePath: string;
  outPath: string;
  layer: 'handbook' | 'spec';
  group: string;
  navLabel: string;
  title: string;
  summary?: string;
  chapterSlug?: string;
  verifiedInTs: boolean;
  anchors?: readonly string[];
}>;

export type GraphLearnSeed = Readonly<{
  id: string;
  slug: string;
  title: string;
  kind: 'lesson' | 'tutorial';
  trackId: string;
  trackTitle: string;
  environment: 'universal' | 'play' | 'cli';
  guideFile: string;
  sourceFile: string;
  docs: readonly string[];
}>;

export type GraphGymSeed = Readonly<{
  id: string;
  slug: string;
  title: string;
  mode: 'drill' | 'kata';
  belt: 'white' | 'amber' | 'emerald' | 'obsidian';
  domain: string;
  subGroup: string;
  promptFile: string;
  solutionFile: string;
  relatedDocs: readonly string[];
  relatedLessons: readonly string[];
}>;

const KNOWN_TOOL_COMMANDS: readonly Readonly<{ slug: string; title: string; summary: string }>[] = [
  { slug: 'run', title: './bin/lite run', summary: 'Compile and execute a Lite source file immediately.' },
  { slug: 'play', title: './bin/lite play', summary: 'Launch interactive extra/canvas Play games in a native desktop window.' },
  { slug: 'build', title: './bin/lite build', summary: 'Compile a Lite source file into a standalone native C11 executable.' },
  { slug: 'compile', title: './bin/lite compile', summary: 'Emit generated TypeScript or C11 source cleanly.' },
  { slug: 'check', title: './bin/lite check', summary: 'Parse, typecheck, and check execution-trace safety.' },
  { slug: 'fmt', title: './bin/lite fmt', summary: 'Format Lite files with canonical style rules.' },
  { slug: 'ignite', title: './bin/lite ignite', summary: 'Materialize and verify native C11 or TS tools into dist/tools/.' },
  { slug: 'test', title: './bin/lite test', summary: 'Run fast, full, or case-filtered verification suites.' },
  { slug: 'verify', title: './bin/lite verify', summary: 'Verify coverage, artifact contracts, and manifests.' },
  { slug: 'docs', title: './bin/lite docs', summary: 'Search documentation and verify links/snippets.' },
  { slug: 'doctor', title: './bin/lite doctor', summary: 'Check repository, seed, and doc health.' },
  { slug: 'bench-release', title: './bin/lite bench & release', summary: 'Benchmark workloads and package releases.' },
];

const KNOWN_TOOL_SECTIONS: readonly Readonly<{ id: string; title: string }>[] = [
  { id: 'overview', title: 'Toolchain Overview' },
  { id: 'cli', title: 'CLI Reference' },
  { id: 'vscode', title: 'VS Code Extension' },
  { id: 'playground-host', title: 'Browser Play & Worker' },
  { id: 'bootstrap', title: 'Self-Hosting Ladder' },
];

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function stripOneSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
}

/** Parses a `lite://...` or `lite:/...` URI into its canonical namespace, target, and optional fragment. */
export function parseLiteUri(raw: string): ParsedLiteUri | null {
  const trimmed = raw.trim();
  let rest: string;
  if (trimmed.startsWith('lite://')) rest = trimmed.slice(7);
  else if (trimmed.startsWith('lite:/')) rest = trimmed.slice(6);
  else return null;

  const hashIdx = rest.indexOf('#');
  const bodyRaw = hashIdx < 0 ? rest : rest.slice(0, hashIdx);
  const fragment = hashIdx < 0 ? '' : rest.slice(hashIdx + 1);
  const body = trimSlashes(bodyRaw);
  if (body === '') return null;

  const slashIdx = body.indexOf('/');
  const rawNs = (slashIdx < 0 ? body : body.slice(0, slashIdx)).toLowerCase();
  let target = slashIdx < 0 ? '' : trimSlashes(body.slice(slashIdx + 1));
  let ns: LiteEntityKind | 'repo';

  if (rawNs === 'handbook') {
    ns = 'handbook';
  } else if (rawNs === 'brand' || rawNs === 'branding') {
    ns = 'brand';
  } else if (rawNs === 'doc' || rawNs === 'docs') {
    if (target === 'handbook') {
      ns = 'handbook';
      target = '';
    } else if (target.startsWith('handbook/')) {
      ns = 'handbook';
      target = target.slice(9);
    } else if (target === 'brand') {
      ns = 'brand';
      target = '';
    } else if (target.startsWith('brand/')) {
      ns = 'brand';
      target = target.slice(6);
    } else {
      ns = 'doc';
    }
  } else if (rawNs === 'spec') {
    ns = 'doc';
    const cleanSpec = stripOneSuffix(stripOneSuffix(target, '.html'), '.md');
    if (cleanSpec === '' || cleanSpec === 'overview' || cleanSpec === 'README') {
      target = 'spec-overview';
    } else if (cleanSpec === 'index') {
      target = 'spec';
    } else if (!target.startsWith('spec/')) {
      target = `spec/${target}`;
    }
  } else if (rawNs === 'proposal' || rawNs === 'proposals') {
    ns = 'doc';
    if (target === '') {
      target = 'proposals/README';
    } else if (!target.startsWith('proposals/')) {
      target = `proposals/${target}`;
    }
  } else if (rawNs === 'compiler') {
    ns = 'doc';
    const cleanComp = stripOneSuffix(stripOneSuffix(target, '.html'), '.md');
    if (cleanComp === '' || cleanComp === 'overview' || cleanComp === 'README') {
      target = 'compiler/overview';
    } else if (!target.startsWith('compiler/')) {
      target = `compiler/${target}`;
    }
  } else if (rawNs === 'repo') {
    ns = 'repo';
  } else if (rawNs === 'learn') {
    ns = 'learn';
  } else if (rawNs === 'gym') {
    ns = 'gym';
  } else if (rawNs === 'play' || rawNs === 'playground') {
    ns = 'play';
  } else if (rawNs === 'module' || rawNs === 'modules') {
    ns = 'module';
  } else if (rawNs === 'tool' || rawNs === 'tools') {
    ns = 'tool';
  } else if (rawNs === 'gallery') {
    ns = 'gallery';
  } else {
    return null;
  }

  return { raw: trimmed, ns, target, fragment };
}

/** Computes a relative POSIX href from one `dist/site/` HTML output path to another, preserving query/fragment suffixes. */
export function relativeWebHref(fromOutPath: string, targetOutPath: string, explicitFragment = ''): string {
  const hashIdx = targetOutPath.indexOf('#');
  const beforeHash = hashIdx < 0 ? targetOutPath : targetOutPath.slice(0, hashIdx);
  const targetHash = hashIdx < 0 ? '' : targetOutPath.slice(hashIdx + 1);

  const qIdx = beforeHash.indexOf('?');
  const pathPart = qIdx < 0 ? beforeHash : beforeHash.slice(0, qIdx);
  const queryPart = qIdx < 0 ? '' : beforeHash.slice(qIdx);

  const finalHash = explicitFragment !== '' ? explicitFragment : targetHash;

  let base: string;
  if (pathPart === fromOutPath) {
    base = finalHash !== '' ? '' : posix.basename(pathPart);
  } else {
    const rel = posix.relative(posix.dirname(fromOutPath), pathPart);
    base = rel === '' ? (pathPart.endsWith('/') ? './' : posix.basename(pathPart)) : rel;
    if (pathPart.endsWith('/') && !base.endsWith('/')) {
      base = `${base}/`;
    }
  }

  return `${base}${queryPart}${finalHash !== '' ? `#${finalHash}` : ''}`;
}

/** Collects all `id="..."` anchors present in rendered HTML. */
export function collectHtmlIds(html: string): string[] {
  const ids = new Set<string>();
  const re = /\bid="([^"]+)"/g;
  for (let m = re.exec(html); m !== null; m = re.exec(html)) {
    const id = m[1];
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

/** Bidirectional usage graph and `lite://` URI resolver for Lite Academy. */
export class LiteAcademyGraph {
  readonly #rootDir: string | undefined;
  readonly #repoUrl: string | undefined;
  readonly #nodes = new Map<string, LiteGraphNode>();
  readonly #aliases = new Map<string, string>();
  readonly #bySourcePath = new Map<string, string>();
  readonly #docAnchors = new Map<string, ReadonlySet<string>>();
  readonly #moduleSymbols = new Map<string, ReadonlySet<string>>();
  readonly #edges: LiteGraphEdge[] = [];
  readonly #edgeKeys = new Set<string>();
  readonly #outgoing = new Map<string, LiteGraphEdge[]>();
  readonly #incoming = new Map<string, LiteGraphEdge[]>();

  constructor(options?: Readonly<{ rootDir?: string; repoUrl?: string }>) {
    this.#rootDir = options?.rootDir;
    this.#repoUrl = options?.repoUrl;
  }

  registerNode(node: LiteGraphNode, aliases: readonly string[] = []): void {
    this.#nodes.set(node.uri, node);
    this.#aliases.set(node.uri, node.uri);
    if (node.sourcePath && !this.#bySourcePath.has(node.sourcePath)) {
      this.#bySourcePath.set(node.sourcePath, node.uri);
    }
    for (const alias of aliases) {
      if (!this.#aliases.has(alias)) {
        this.#aliases.set(alias, node.uri);
      }
    }
  }

  registerAlias(alias: string, targetUri: string): void {
    if (!this.#aliases.has(alias) && this.#nodes.has(targetUri)) {
      this.#aliases.set(alias, targetUri);
    }
  }

  setDocAnchors(uri: string, anchors: readonly string[]): void {
    const set = new Set<string>(anchors);
    set.add('top');
    this.#docAnchors.set(uri, set);
  }

  setModuleSymbols(uri: string, symbols: readonly string[]): void {
    this.#moduleSymbols.set(uri, new Set(symbols));
  }

  getNode(uri: string): LiteGraphNode | undefined {
    const canon = this.#aliases.get(uri) ?? uri;
    return this.#nodes.get(canon);
  }

  resolveSourcePathToUri(sourcePath: string): string | undefined {
    return this.#bySourcePath.get(sourcePath);
  }

  resolveCanonicalUri(parsed: ParsedLiteUri): string | undefined {
    const { ns, target, fragment } = parsed;
    const cleanHtml = stripOneSuffix(target, '.html');
    const cleanMd = stripOneSuffix(cleanHtml, '.md');
    const cleanLts = stripOneSuffix(cleanHtml, '.lts');

    if (ns === 'tool' && cleanHtml === '' && fragment !== '') {
      const toolKey = `lite://tool/${fragment}`;
      if (this.#aliases.has(toolKey)) return this.#aliases.get(toolKey);
    }

    const candidates: string[] = [
      `lite://${ns}/${target}`,
      `lite://${ns}/${cleanHtml}`,
      `lite://${ns}/${cleanMd}`,
      `lite://${ns}/${cleanLts}`,
    ];
    if (target === '' || cleanHtml === 'index') {
      candidates.push(`lite://${ns}`);
    }
    for (const cand of candidates) {
      const hit = this.#aliases.get(cand);
      if (hit !== undefined && this.#nodes.has(hit)) return hit;
    }
    return undefined;
  }

  resolveUri(rawUri: string, fromOutPath: string): ResolvedLiteUri {
    const parsed = parseLiteUri(rawUri);
    if (!parsed) {
      throw new Error(`Invalid lite URI: ${rawUri}`);
    }
    if (parsed.ns === 'repo') {
      const cleanPath = trimSlashes(parsed.target);
      if (cleanPath === '' || cleanPath.split('/').includes('..')) {
        throw new Error(`Invalid lite://repo URI: ${rawUri}`);
      }
      const existingUri = this.resolveSourcePathToUri(cleanPath);
      if (existingUri !== undefined) {
        const existingNode = this.#nodes.get(existingUri);
        if (existingNode) {
          this.verifyNodeFragment(existingNode, parsed.fragment, rawUri);
          const href = relativeWebHref(fromOutPath, existingNode.outPath, parsed.fragment);
          return {
            canonicalUri: existingNode.uri,
            kind: existingNode.kind,
            node: existingNode,
            href,
            ...(parsed.fragment !== '' ? { fragment: parsed.fragment } : {}),
          };
        }
      }
      if (!this.#rootDir) {
        throw new Error(`Unresolved lite://repo target (rootDir unavailable): ${rawUri}`);
      }
      const absRoot = resolve(this.#rootDir);
      const diskPath = resolve(absRoot, cleanPath);
      const relCheck = relative(absRoot, diskPath);
      if (relCheck.startsWith('..') || !existsSync(diskPath)) {
        throw new Error(`Unresolved lite://repo target: ${rawUri}`);
      }
      const isDir = statSync(diskPath).isDirectory();
      const repoBase = (this.#repoUrl ?? '').replace(/\/+$/, '');
      if (repoBase === '') {
        return {
          canonicalUri: `lite://repo/${cleanPath}`,
          kind: 'repo',
          href: '#top',
          ...(parsed.fragment !== '' ? { fragment: parsed.fragment } : {}),
        };
      }
      const blobOrTree = isDir ? 'tree' : 'blob';
      const href = `${repoBase}/${blobOrTree}/main/${cleanPath}${parsed.fragment !== '' ? `#${parsed.fragment}` : ''}`;
      return {
        canonicalUri: `lite://repo/${cleanPath}`,
        kind: 'repo',
        href,
        ...(parsed.fragment !== '' ? { fragment: parsed.fragment } : {}),
        external: true,
      };
    }

    const canonicalUri = this.resolveCanonicalUri(parsed);
    if (!canonicalUri) {
      throw new Error(`Unresolved lite URI target: ${rawUri}`);
    }
    const node = this.#nodes.get(canonicalUri);
    if (!node) {
      throw new Error(`Missing node for canonical URI: ${canonicalUri}`);
    }
    this.verifyNodeFragment(node, parsed.fragment, rawUri);
    const href = relativeWebHref(fromOutPath, node.outPath, parsed.fragment);
    return {
      canonicalUri,
      kind: node.kind,
      node,
      href,
      ...(parsed.fragment !== '' ? { fragment: parsed.fragment } : {}),
    };
  }

  private verifyNodeFragment(node: LiteGraphNode, fragment: string, rawUri: string): void {
    if (fragment === '') return;
    if (node.kind === 'handbook' || node.kind === 'doc' || node.kind === 'brand') {
      const anchors = this.#docAnchors.get(node.uri);
      if (anchors && node.uri !== 'lite://handbook/single-page' && !anchors.has(fragment)) {
        throw new Error(`Missing heading fragment #${fragment} in ${rawUri}`);
      }
    } else if (node.kind === 'module') {
      const syms = this.#moduleSymbols.get(node.uri);
      if (syms && !syms.has(fragment)) {
        throw new Error(`Missing module symbol #${fragment} in ${rawUri}`);
      }
    }
  }

  recordEdge(edge: LiteGraphEdge): void {
    if (!this.#nodes.has(edge.from) || !this.#nodes.has(edge.to)) return;
    if (edge.from === edge.to && !edge.fragment) return;
    const key = `${edge.from}|${edge.to}|${edge.kind}|${edge.fragment ?? ''}`;
    if (this.#edgeKeys.has(key)) return;
    this.#edgeKeys.add(key);
    this.#edges.push(edge);

    let outList = this.#outgoing.get(edge.from);
    if (!outList) {
      outList = [];
      this.#outgoing.set(edge.from, outList);
    }
    outList.push(edge);

    let inList = this.#incoming.get(edge.to);
    if (!inList) {
      inList = [];
      this.#incoming.set(edge.to, inList);
    }
    inList.push(edge);
  }

  /** Scans Lite source for `import "core/..."` and `import "extra/..."` and records module-import edges. */
  recordModuleImportsFromSource(fromUri: string, liteSource: string): void {
    if (!this.#nodes.has(fromUri)) return;
    const re = /\bimport\s+"((?:core|extra)\/[a-zA-Z0-9_-]+)"/g;
    for (let m = re.exec(liteSource); m !== null; m = re.exec(liteSource)) {
      const modId = m[1];
      if (!modId) continue;
      const toUri = `lite://module/${modId}`;
      if (this.#nodes.has(toUri)) {
        this.recordEdge({ from: fromUri, to: toUri, kind: 'module-import' });
      }
    }
  }

  /** Extracts Markdown `lite://` / `lite:/` links and records validated graph edges before HTML rendering. */
  recordLiteUrisFromMarkdown(fromUri: string, markdown: string, fromOutPath: string): void {
    if (!this.#nodes.has(fromUri)) return;
    for (const rawUri of extractLiteUrisFromMarkdown(markdown)) {
      const resolved = this.resolveUri(rawUri, fromOutPath);
      if (resolved.node) {
        this.recordEdge({
          from: fromUri,
          to: resolved.canonicalUri,
          kind: 'lite-uri',
          ...(resolved.fragment ? { fragment: resolved.fragment } : {}),
        });
      }
    }
  }

  /** Pre-scans every node's Markdown source so bidirectional `lite-uri` backlinks are complete prior to section builds. */
  preScanMarkdownLiteUris(rootDir: string): void {
    const scannableKinds = new Set<LiteEntityKind>(['handbook', 'doc', 'brand', 'learn', 'gym']);
    for (const node of this.#nodes.values()) {
      if (!scannableKinds.has(node.kind) || !node.sourcePath || !node.sourcePath.endsWith('.md')) continue;
      const full = join(rootDir, node.sourcePath);
      if (!existsSync(full)) continue;
      try {
        this.recordLiteUrisFromMarkdown(node.uri, readFileSync(full, 'utf8'), node.outPath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`${node.sourcePath}: ${msg}`);
      }
    }
  }

  getOutgoing(uri: string): readonly LiteGraphEdge[] {
    const canon = this.#aliases.get(uri) ?? uri;
    return this.#outgoing.get(canon) ?? [];
  }

  getBacklinks(uri: string): readonly LiteGraphEdge[] {
    const canon = this.#aliases.get(uri) ?? uri;
    return this.#incoming.get(canon) ?? [];
  }

  getRelatedBuckets(uri: string): RelatedBuckets {
    const canon = this.#aliases.get(uri) ?? uri;
    const seen = new Set<string>([canon]);
    const buckets: Record<LiteEntityKind, LiteGraphNode[]> = {
      handbook: [],
      doc: [],
      brand: [],
      learn: [],
      gym: [],
      play: [],
      module: [],
      tool: [],
      gallery: [],
    };

    const addPeer = (peerUri: string): void => {
      if (seen.has(peerUri)) return;
      if (peerUri === 'lite://handbook' || peerUri === 'lite://doc' || peerUri === 'lite://learn' || peerUri === 'lite://gym' || peerUri === 'lite://play' || peerUri === 'lite://module' || peerUri === 'lite://tool' || peerUri === 'lite://gallery' || peerUri === 'lite://handbook/single-page') {
        return;
      }
      const node = this.#nodes.get(peerUri);
      if (!node || node.outPath.endsWith('.svg')) return;
      seen.add(peerUri);
      buckets[node.kind].push(node);
    };

    for (const e of this.getOutgoing(canon)) addPeer(e.to);
    for (const e of this.getBacklinks(canon)) addPeer(e.from);

    for (const k of Object.keys(buckets) as LiteEntityKind[]) {
      buckets[k].sort((a, b) => a.title.localeCompare(b.title));
    }
    return buckets;
  }

  toJson(): string {
    const nodes = Array.from(this.#nodes.values()).sort((a, b) => a.uri.localeCompare(b.uri));
    const edges = [...this.#edges].sort((a, b) =>
      a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.kind.localeCompare(b.kind),
    );
    const byKind: Record<LiteEntityKind, number> = {
      handbook: 0,
      doc: 0,
      brand: 0,
      learn: 0,
      gym: 0,
      play: 0,
      module: 0,
      tool: 0,
      gallery: 0,
    };
    for (const n of nodes) byKind[n.kind] += 1;
    return JSON.stringify(
      {
        schemaVersion: 1,
        stats: {
          nodes: nodes.length,
          edges: edges.length,
          byKind,
        },
        nodes,
        edges,
      },
      null,
      2,
    ) + '\n';
  }
}

function unescapeAttrEntities(raw: string): string {
  return raw
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

function escapeAttrEntities(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripInlineCodeSpans(input: string): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === '\\' && i + 1 < input.length) {
      out += ch + input[i + 1]!;
      i += 2;
      continue;
    }
    if (ch === '`') {
      let run = 1;
      while (i + run < input.length && input[i + run] === '`') run += 1;
      let closePos = -1;
      let scan = i + run;
      while (scan < input.length) {
        if (input[scan] === '\n' && input[scan + 1] === '\n') break;
        if (input[scan] === '`') {
          let cRun = 1;
          while (scan + cRun < input.length && input[scan + cRun] === '`') cRun += 1;
          if (cRun === run) {
            closePos = scan + cRun;
            break;
          }
          scan += cRun;
          continue;
        }
        scan += 1;
      }
      if (closePos >= 0) {
        i = closePos;
        continue;
      }
      out += input.slice(i, i + run);
      i += run;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Extracts `lite://` and `lite:/` Markdown link destinations outside fenced blocks and inline code spans. */
export function extractLiteUrisFromMarkdown(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const keptLines: string[] = [];
  let fenceChar = '';
  let fenceLen = 0;

  for (const line of lines) {
    if (fenceLen === 0) {
      const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (m) {
        const marker = m[1]!;
        const rest = m[2] ?? '';
        const ch = marker[0]!;
        if (ch === '~' || !rest.includes('`')) {
          fenceChar = ch;
          fenceLen = marker.length;
          continue;
        }
      }
      keptLines.push(line);
    } else {
      const closeMatch = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (closeMatch && closeMatch[1]![0] === fenceChar && closeMatch[1]!.length >= fenceLen) {
        fenceChar = '';
        fenceLen = 0;
      }
    }
  }

  const prose = stripInlineCodeSpans(keptLines.join('\n'));
  const re = /\]\(\s*<?(lite:\/[^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
  const uris: string[] = [];
  for (let m = re.exec(prose); m !== null; m = re.exec(prose)) {
    const uri = m[1];
    if (uri) uris.push(uri);
  }
  return uris;
}

/** Rewrites `<a href="..." data-lite-uri="...">` links to relative web targets and records bidirectional graph edges. */
export function rewriteLiteUriHtml(options: Readonly<{
  html: string;
  outPath: string;
  graph: LiteAcademyGraph;
  fromUri?: string;
}>): string {
  const { html, outPath, graph, fromUri } = options;
  return html.replace(
    /<a href="([^"]*)" data-lite-uri="([^"]*)"([^>]*)>/g,
    (_full, _hrefAttr: string, rawUriAttr: string, restAttrs: string) => {
      const rawUri = unescapeAttrEntities(rawUriAttr);
      const resolved = graph.resolveUri(rawUri, outPath);
      if (fromUri && resolved.node) {
        graph.recordEdge({
          from: fromUri,
          to: resolved.canonicalUri,
          kind: 'lite-uri',
          ...(resolved.fragment ? { fragment: resolved.fragment } : {}),
        });
      }
      const relAttr = resolved.external && !restAttrs.includes('rel=') ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${escapeAttrEntities(resolved.href)}" data-lite-kind="${resolved.kind}"${relAttr}${restAttrs}>`;
    },
  );
}

function stemOfPath(relPath: string): string {
  const base = posix.basename(relPath);
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(0, dot) : base;
}

/** Builds the complete Lite Academy URI graph from docs, modules, learn, gym, samples, library, and tools. */
export function buildLiteAcademyGraph(options: Readonly<{
  rootDir: string;
  repoUrl?: string;
  docs: readonly GraphDocSeed[];
  modules: readonly ModuleApiDoc[];
  learnLessons: readonly GraphLearnSeed[];
  gymExercises: readonly GraphGymSeed[];
  showcaseSamples: readonly ShowcaseSample[];
  playSamples: readonly PlaySample[];
  playGroups: readonly PlayGroup[];
  playgroundLibrary: readonly PlaygroundLibraryItem[];
}>): LiteAcademyGraph {
  const {
    rootDir,
    repoUrl,
    docs,
    modules,
    learnLessons,
    gymExercises,
    showcaseSamples,
    playSamples,
    playGroups,
    playgroundLibrary,
  } = options;
  const graph = new LiteAcademyGraph({ rootDir, ...(repoUrl !== undefined ? { repoUrl } : {}) });

  /* Section root nodes */
  graph.registerNode({ uri: 'lite://handbook', kind: 'handbook', title: 'Shipped Lite Handbook', outPath: 'docs/#handbook' });
  graph.registerNode({ uri: 'lite://handbook/single-page', kind: 'handbook', title: 'Single-Page Handbook', outPath: 'docs/handbook/single-page.html' });
  graph.registerNode({ uri: 'lite://doc', kind: 'doc', title: 'Lite Documentation', outPath: 'docs/index.html' }, ['lite://doc/index']);
  graph.registerNode({ uri: 'lite://doc/spec', kind: 'doc', title: 'Design Specification Index', outPath: 'docs/spec/index.html' }, ['lite://doc/spec/index']);
  graph.registerNode({ uri: 'lite://learn', kind: 'learn', title: 'Learn Lite', outPath: 'learn/' });
  graph.registerNode({ uri: 'lite://gym', kind: 'gym', title: 'Lite Gym', outPath: 'gym/' });
  graph.registerNode({ uri: 'lite://play', kind: 'play', title: 'Lite Playground', outPath: 'playground/' });
  graph.registerNode({ uri: 'lite://module', kind: 'module', title: 'Standard & Play Modules', outPath: 'modules/' });
  graph.registerNode({ uri: 'lite://tool', kind: 'tool', title: 'Lite Toolchain', outPath: 'tools/' });
  graph.registerNode({ uri: 'lite://gallery', kind: 'gallery', title: 'Sample & Play Gallery', outPath: 'gallery/' });

  /* Handbook & Spec documents */
  for (const doc of docs) {
    if (doc.layer === 'handbook' && doc.chapterSlug) {
      const uri = `lite://handbook/${doc.chapterSlug}`;
      graph.registerNode(
        {
          uri,
          kind: 'handbook',
          title: doc.title || doc.navLabel,
          ...(doc.summary ? { subtitle: doc.summary } : {}),
          outPath: doc.outPath,
          sourcePath: doc.sourcePath,
          badge: doc.navLabel,
        },
        [`lite://handbook/${doc.sourcePath}`],
      );
      if (doc.anchors) graph.setDocAnchors(uri, doc.anchors);
    } else if (doc.group === 'brand') {
      let brandUri = `lite://brand/${stemOfPath(doc.outPath)}`;
      let aliases: string[] = [`lite://brand/${doc.sourcePath}`, `lite://doc/${doc.sourcePath}`];
      if (doc.sourcePath === 'brand/README.md') {
        brandUri = 'lite://brand';
        aliases = [
          'lite://brand/overview',
          'lite://brand/README',
          'lite://brand/README.md',
          'lite://brand/brand/README.md',
          'lite://doc/brand',
          'lite://doc/brand/README.md',
        ];
      } else if (doc.sourcePath === 'brand/name.md') {
        brandUri = 'lite://brand/name';
        aliases = [
          'lite://brand/name.md',
          'lite://brand/brand/name.md',
          'lite://doc/brand/name',
          'lite://doc/brand/name.md',
        ];
      } else if (doc.sourcePath === 'brand/investigation/README.md') {
        brandUri = 'lite://brand/investigation';
        aliases = [
          'lite://brand/investigation/README',
          'lite://brand/investigation/README.md',
          'lite://brand/brand/investigation/README.md',
        ];
      }
      graph.registerNode(
        {
          uri: brandUri,
          kind: 'brand',
          title: doc.title || doc.navLabel,
          subtitle: doc.sourcePath,
          outPath: doc.outPath,
          sourcePath: doc.sourcePath,
          badge: 'Brand',
        },
        aliases,
      );
      if (doc.anchors) graph.setDocAnchors(brandUri, doc.anchors);
    } else {
      const outStem = stemOfPath(doc.outPath);
      let docSlug = outStem;
      if (doc.sourcePath === 'CONTRIBUTING.md') docSlug = 'contributing';
      else if (doc.group === 'proposals') docSlug = `proposals/${outStem}`;
      else if (doc.group === 'compiler') docSlug = `compiler/${outStem}`;
      else if (doc.navLabel.startsWith('spec/')) docSlug = `spec/${doc.navLabel.slice(5)}`;
      else if (doc.navLabel.startsWith('research/')) docSlug = `research/${doc.navLabel.slice(9)}`;

      const uri = `lite://doc/${docSlug}`;
      const aliases = [
        `lite://doc/${outStem}`,
        `lite://doc/${stripOneSuffix(doc.sourcePath, '.md')}`,
        `lite://doc/${doc.sourcePath}`,
      ];
      if (doc.navLabel && !doc.navLabel.includes(' ')) {
        aliases.push(`lite://doc/${doc.navLabel}`);
      }
      if (doc.sourcePath === 'docs/README.md') aliases.push('lite://doc/overview');
      if (doc.sourcePath === 'docs/spec/README.md') aliases.push('lite://doc/spec-overview');
      if (doc.sourcePath === 'docs/proposals/README.md') aliases.push('lite://doc/proposals');
      if (doc.sourcePath === 'CONTRIBUTING.md') aliases.push('lite://doc/CONTRIBUTING', 'lite://doc/compiler/contributing');
      if (doc.sourcePath === 'igniter/tests/README.md') aliases.push('lite://doc/compiler/igniter/tests/README');

      graph.registerNode(
        {
          uri,
          kind: 'doc',
          title: doc.title || doc.navLabel,
          subtitle: doc.sourcePath,
          outPath: doc.outPath,
          sourcePath: doc.sourcePath,
          badge: doc.verifiedInTs ? 'Verified in TS' : doc.group,
        },
        aliases,
      );
      if (doc.anchors) graph.setDocAnchors(uri, doc.anchors);
    }
  }

  /* Canonical brand vector assets */
  for (const svgFile of ['lite-wordmark.svg', 'lite-mark.svg', 'lite-mark-minimal.svg', 'lite-favicon.svg', 'identity-in-use.svg']) {
    const relAsset = `brand/${svgFile}`;
    if (existsSync(join(rootDir, relAsset))) {
      graph.registerNode(
        {
          uri: `lite://brand/${svgFile}`,
          kind: 'brand',
          title: svgFile,
          subtitle: relAsset,
          outPath: relAsset,
          sourcePath: relAsset,
          badge: 'SVG',
        },
        [`lite://brand/${relAsset}`],
      );
    }
  }

  /* Standard & Play modules */
  for (const mod of modules) {
    const uri = `lite://module/${mod.id}`;
    graph.registerNode(
      {
        uri,
        kind: 'module',
        title: mod.id,
        subtitle: mod.summary || `${mod.id} (${String(mod.symbols.length)} symbols)`,
        outPath: `modules/${mod.namespace}/${mod.name}.html`,
        sourcePath: mod.file,
        badge: mod.environment === 'play' ? 'Lite Play' : mod.environment === 'cli' ? 'CLI / Host OS' : 'Browser + CLI',
      },
      [`lite://module/${mod.file}`],
    );
    graph.setModuleSymbols(uri, mod.symbols.map((s) => s.name));
  }

  /* Showcase & Play samples + Gallery */
  const allSamples: readonly (ShowcaseSample | PlaySample)[] = [...showcaseSamples, ...playSamples];
  for (const sample of allSamples) {
    const playUri = `lite://play/${sample.id}`;
    graph.registerNode(
      {
        uri: playUri,
        kind: 'play',
        title: sample.title,
        subtitle: sample.note,
        outPath: `playground/?sample=${encodeURIComponent(sample.id)}`,
        sourcePath: sample.file,
        badge: sample.showOutput === true ? 'Play' : 'Sample',
      },
      [`lite://play/sample/${sample.id}`],
    );
    graph.registerNode(
      {
        uri: `lite://gallery/${sample.id}`,
        kind: 'gallery',
        title: sample.title,
        subtitle: sample.note,
        outPath: `gallery/#sample-${sample.id}`,
        sourcePath: sample.file,
      },
      [`lite://gallery/sample-${sample.id}`],
    );

    const full = join(rootDir, sample.file);
    if (existsSync(full)) {
      graph.recordModuleImportsFromSource(playUri, readFileSync(full, 'utf8'));
    }
  }
  for (const grp of playGroups) {
    graph.registerNode(
      {
        uri: `lite://gallery/${grp.id}`,
        kind: 'gallery',
        title: grp.title,
        subtitle: grp.description,
        outPath: `gallery/#group-${grp.id}`,
      },
      [`lite://gallery/group-${grp.id}`],
    );
  }

  /* Playground library items (examples, cases, pieces) */
  for (const item of playgroundLibrary) {
    const catUri = `lite://play/${item.category}/${item.slug}`;
    const fileAlias = `lite://play/${stripOneSuffix(item.file, '.lts')}`;
    const sampleTargetUri = item.sampleId ? `lite://play/${item.sampleId}` : undefined;
    if (sampleTargetUri && graph.getNode(sampleTargetUri)) {
      graph.registerAlias(catUri, sampleTargetUri);
      graph.registerAlias(`lite://play/${item.slug}`, sampleTargetUri);
      graph.registerAlias(fileAlias, sampleTargetUri);
      continue;
    }
    const targetOut = `playground/?${item.category}=${encodeURIComponent(item.slug)}`;
    if (!thisExists(graph, catUri)) {
      graph.registerNode(
        {
          uri: catUri,
          kind: 'play',
          title: item.title,
          subtitle: item.file,
          outPath: targetOut,
          sourcePath: item.file,
          badge: item.badge,
        },
        [`lite://play/${item.slug}`, fileAlias],
      );
    }
  }

  /* Tools commands & sections */
  for (const cmd of KNOWN_TOOL_COMMANDS) {
    graph.registerNode(
      {
        uri: `lite://tool/${cmd.slug}`,
        kind: 'tool',
        title: cmd.title,
        subtitle: cmd.summary,
        outPath: `tools/#cmd-${cmd.slug}`,
        badge: 'CLI',
      },
      [`lite://tool/cmd-${cmd.slug}`],
    );
  }
  for (const sec of KNOWN_TOOL_SECTIONS) {
    graph.registerNode({
      uri: `lite://tool/${sec.id}`,
      kind: 'tool',
      title: sec.title,
      outPath: `tools/#${sec.id}`,
      badge: 'Tools',
    });
  }

  /* Learn curriculum lessons & tutorials */
  for (const lesson of learnLessons) {
    const uri = `lite://learn/${lesson.slug}`;
    graph.registerNode(
      {
        uri,
        kind: 'learn',
        title: lesson.title,
        subtitle: lesson.trackTitle,
        outPath: `learn/${lesson.trackId}/${lesson.slug}.html`,
        sourcePath: lesson.guideFile,
        badge: lesson.kind === 'tutorial' ? 'Tutorial' : 'Lesson',
        catalogId: lesson.id,
      },
      [`lite://learn/${lesson.trackId}/${lesson.slug}`, `lite://learn/${lesson.id}`],
    );
    const fullSrc = join(rootDir, lesson.sourceFile);
    if (existsSync(fullSrc)) {
      graph.recordModuleImportsFromSource(uri, readFileSync(fullSrc, 'utf8'));
    }
    for (const docPath of lesson.docs) {
      const targetDocUri = graph.resolveSourcePathToUri(docPath);
      if (targetDocUri) {
        graph.recordEdge({ from: uri, to: targetDocUri, kind: 'catalog-ref' });
      }
    }
  }

  /* Gym drills & workouts */
  for (const ex of gymExercises) {
    const uri = `lite://gym/${ex.slug}`;
    const folder = ex.mode === 'drill' ? 'drills' : 'workouts';
    const modePrefix = ex.mode === 'drill' ? 'drill' : 'workout';
    graph.registerNode(
      {
        uri,
        kind: 'gym',
        title: ex.title,
        subtitle: `${ex.domain}/${ex.subGroup}`,
        outPath: `gym/${folder}/${ex.slug}.html`,
        sourcePath: ex.promptFile,
        badge: `${ex.belt} ${ex.mode === 'drill' ? 'Drill' : 'Workout'}`,
        catalogId: ex.id,
      },
      [`lite://gym/${folder}/${ex.slug}`, `lite://gym/${modePrefix}/${ex.slug}`, `lite://gym/${ex.id}`],
    );
    const fullSol = join(rootDir, ex.solutionFile);
    if (existsSync(fullSol)) {
      graph.recordModuleImportsFromSource(uri, readFileSync(fullSol, 'utf8'));
    }
    for (const docPath of ex.relatedDocs) {
      const targetDocUri = graph.resolveSourcePathToUri(docPath);
      if (targetDocUri) {
        graph.recordEdge({ from: uri, to: targetDocUri, kind: 'catalog-ref' });
      }
    }
    for (const lessonId of ex.relatedLessons) {
      const targetLessonNode = graph.getNode(`lite://learn/${lessonId}`);
      if (targetLessonNode) {
        graph.recordEdge({ from: uri, to: targetLessonNode.uri, kind: 'catalog-ref' });
      }
    }
  }

  graph.preScanMarkdownLiteUris(rootDir);

  return graph;
}

function thisExists(graph: LiteAcademyGraph, uri: string): boolean {
  return graph.getNode(uri) !== undefined;
}

export type CrosslinkSectionSpec = Readonly<{
  kind: LiteEntityKind;
  label: string;
  badgeKind?: 'lesson' | 'gym' | 'plain';
  limit?: number;
}>;

const DEFAULT_CROSSLINK_SECTIONS: readonly CrosslinkSectionSpec[] = [
  { kind: 'handbook', label: 'Handbook', limit: 6 },
  { kind: 'learn', label: 'Learn', badgeKind: 'lesson', limit: 8 },
  { kind: 'gym', label: 'Lite Gym', badgeKind: 'gym', limit: 8 },
  { kind: 'module', label: 'Module', limit: 10 },
  { kind: 'play', label: 'Play', limit: 6 },
  { kind: 'doc', label: 'Design Spec', limit: 6 },
  { kind: 'brand', label: 'Brand', limit: 4 },
];

/** Renders a deduplicated bidirectional Academy cross-links grid from graph buckets. */
export function renderAcademyCrosslinks(options: Readonly<{
  heading: string;
  fromOutPath: string;
  buckets: RelatedBuckets;
  sections?: readonly CrosslinkSectionSpec[];
  sectionId?: string;
  wrapperClass?: string;
}>): string {
  const {
    heading,
    fromOutPath,
    buckets,
    sections = DEFAULT_CROSSLINK_SECTIONS,
    sectionId,
    wrapperClass = 'docs-crosslinks',
  } = options;
  const cards: string[] = [];
  const seenOut = new Set<string>();

  for (const sec of sections) {
    const items = buckets[sec.kind].slice(0, sec.limit ?? 8);
    for (const node of items) {
      if (seenOut.has(node.outPath)) continue;
      seenOut.add(node.outPath);
      const href = relativeWebHref(fromOutPath, node.outPath);
      const defaultBadge = node.badge ?? sec.label;
      let badgeHtml: string;
      if (sec.badgeKind === 'lesson' && node.catalogId) {
        badgeHtml = `<span class="badge academy-lesson-badge" data-lesson-id="${escapeHtml(node.catalogId)}" data-default-label="${escapeHtml(defaultBadge)}">${escapeHtml(defaultBadge)}</span>`;
      } else if (sec.badgeKind === 'gym' && node.catalogId) {
        badgeHtml = `<span class="badge academy-gym-badge" data-gym-id="${escapeHtml(node.catalogId)}" data-default-label="${escapeHtml(defaultBadge)}">${escapeHtml(defaultBadge)}</span>`;
      } else {
        badgeHtml = `<span class="badge">${escapeHtml(defaultBadge)}</span>`;
      }
      const subText = node.subtitle ? `${sec.label} · ${node.subtitle}` : sec.label;
      cards.push(
        `<article class="academy-crosslink-card">\n` +
          `  <div class="academy-crosslink-card-head">\n` +
          `    <a href="${escapeHtml(href)}"><strong>${escapeHtml(node.title)}</strong></a>\n` +
          `    ${badgeHtml}\n` +
          `  </div>\n` +
          `  <span class="code-card-meta">${escapeHtml(subText)}</span>\n` +
          `</article>`,
      );
    }
  }

  if (cards.length === 0) return '';
  const idAttr = sectionId ? ` id="${escapeHtml(sectionId)}"` : '';
  return `<section class="${escapeHtml(wrapperClass)}"${idAttr}>\n` +
    `  <h2>${escapeHtml(heading)}</h2>\n` +
    `  <div class="academy-crosslink-grid">\n` +
    `    ${cards.join('\n    ')}\n` +
    `  </div>\n` +
    `</section>`;
}

export type SiteReferenceViolationReason =
  | 'unresolved-md-href'
  | 'unresolved-lite-uri'
  | 'bad-playground-href'
  | 'missing-file'
  | 'missing-fragment'
  | 'missing-play-target'
  | 'missing-graph-node'
  | 'dangling-graph-edge'
  | 'missing-graph-fragment';

export type SiteReferenceViolation = Readonly<{
  source: string;
  target: string;
  reason: SiteReferenceViolationReason;
}>;

export type SiteReferenceReport = Readonly<{
  htmlFiles: number;
  localLinksChecked: number;
  fragmentsChecked: number;
  searchEntriesChecked: number;
  graphNodesChecked: number;
  graphEdgesChecked: number;
  violations: readonly SiteReferenceViolation[];
}>;

/** Verifies every built HTML link, `#fragment` target, `search-index.json`, and `link-graph.json` in `siteDir` via `tools/src/site-validate.lts`. */
export function validateBuiltSiteReferences(siteDir: string): SiteReferenceReport {
  const result = spawnTool('site-validate', [siteDir], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    target: 'ts',
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`lite site-validate failed (${result.status ?? result.signal}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as SiteReferenceReport;
}
