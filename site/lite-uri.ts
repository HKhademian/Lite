/** Canonical `lite://` internal URI resolver, link verifier, and bidirectional Academy usage graph. */
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import type { ModuleApiDoc } from './docs-client.ts';
import type { ShowcaseSample } from './groups.ts';
import type { PlayGroup, PlaySample } from './play-samples.ts';
import type { PlaygroundLibraryItem } from './playground-library.ts';

export type LiteEntityKind = 'handbook' | 'doc' | 'learn' | 'gym' | 'play' | 'module' | 'tool' | 'gallery';

export type ParsedLiteUri = Readonly<{
  raw: string;
  ns: LiteEntityKind;
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
  node: LiteGraphNode;
  href: string;
  fragment?: string;
}>;

export type RelatedBuckets = Readonly<{
  handbook: readonly LiteGraphNode[];
  doc: readonly LiteGraphNode[];
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
  { slug: 'compile', title: './bin/lite compile', summary: 'Emit generated TypeScript or C source cleanly.' },
  { slug: 'check', title: './bin/lite check', summary: 'Parse, typecheck, and check execution-trace safety.' },
  { slug: 'fmt', title: './bin/lite fmt', summary: 'Format Lite files with canonical style rules.' },
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
  let ns: LiteEntityKind;

  if (rawNs === 'handbook') {
    ns = 'handbook';
  } else if (rawNs === 'doc' || rawNs === 'docs') {
    if (target === 'handbook') {
      ns = 'handbook';
      target = '';
    } else if (target.startsWith('handbook/')) {
      ns = 'handbook';
      target = target.slice(9);
    } else {
      ns = 'doc';
    }
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
  readonly #nodes = new Map<string, LiteGraphNode>();
  readonly #aliases = new Map<string, string>();
  readonly #bySourcePath = new Map<string, string>();
  readonly #docAnchors = new Map<string, ReadonlySet<string>>();
  readonly #moduleSymbols = new Map<string, ReadonlySet<string>>();
  readonly #edges: LiteGraphEdge[] = [];
  readonly #edgeKeys = new Set<string>();
  readonly #outgoing = new Map<string, LiteGraphEdge[]>();
  readonly #incoming = new Map<string, LiteGraphEdge[]>();

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
    const canonicalUri = this.resolveCanonicalUri(parsed);
    if (!canonicalUri) {
      throw new Error(`Unresolved lite URI target: ${rawUri}`);
    }
    const node = this.#nodes.get(canonicalUri);
    if (!node) {
      throw new Error(`Missing node for canonical URI: ${canonicalUri}`);
    }
    if (parsed.fragment !== '') {
      if (node.kind === 'handbook' || node.kind === 'doc') {
        const anchors = this.#docAnchors.get(canonicalUri);
        if (anchors && canonicalUri !== 'lite://handbook/single-page' && !anchors.has(parsed.fragment)) {
          throw new Error(`Missing heading fragment #${parsed.fragment} in ${rawUri}`);
        }
      } else if (node.kind === 'module') {
        const syms = this.#moduleSymbols.get(canonicalUri);
        if (syms && !syms.has(parsed.fragment)) {
          throw new Error(`Missing module symbol #${parsed.fragment} in ${rawUri}`);
        }
      }
    }
    const href = relativeWebHref(fromOutPath, node.outPath, parsed.fragment);
    return {
      canonicalUri,
      node,
      href,
      ...(parsed.fragment !== '' ? { fragment: parsed.fragment } : {}),
    };
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
      if (!node) return;
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
      if (fromUri) {
        graph.recordEdge({
          from: fromUri,
          to: resolved.canonicalUri,
          kind: 'lite-uri',
          ...(resolved.fragment ? { fragment: resolved.fragment } : {}),
        });
      }
      return `<a href="${escapeAttrEntities(resolved.href)}" data-lite-kind="${resolved.node.kind}"${restAttrs}>`;
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
    docs,
    modules,
    learnLessons,
    gymExercises,
    showcaseSamples,
    playSamples,
    playGroups,
    playgroundLibrary,
  } = options;
  const graph = new LiteAcademyGraph();

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
    } else {
      const outStem = stemOfPath(doc.outPath);
      let docSlug = outStem;
      if (doc.group === 'proposals') docSlug = `proposals/${outStem}`;
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
      if (doc.sourcePath === 'CONTRIBUTING.md') aliases.push('lite://doc/contributing', 'lite://doc/CONTRIBUTING');

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

  return graph;
}

function thisExists(graph: LiteAcademyGraph, uri: string): boolean {
  return graph.getNode(uri) !== undefined;
}
