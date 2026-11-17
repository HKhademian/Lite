#!/usr/bin/env node
/** Ignition builder: compiles Lite tool sources (`tools/src/*.lts`) into `dist/tools/*.ts` using the Lite-generated compiler. */
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readdirSync, readFileSync, realpathSync,
  renameSync, rmSync, writeFileSync, writeSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileSeedTsGraph } from '../compiler/host.ts';
import { seed } from '../compiler/bootstrap/seed.ts';
import { readSourceInput, resolveImportPath } from '../compiler/source.ts';
import { checkTsArtifactFiles } from './artifacts.ts';

type ToolDependency = Readonly<{ path: string; sha256: string }>;
type ToolEdge = Readonly<{ importer: string; spec: string; path: string }>;
type ToolProvenance = Readonly<{
  version: 1;
  tool: string;
  target: 'ts';
  compilerArtifactSha256: string;
  compilerSourceSha256: string;
  artifactSha256: string;
  dependencies: readonly ToolDependency[];
  edges: readonly ToolEdge[];
}>;

export type IgnitedToolSummary = Readonly<{
  name: string;
  path: string;
  sha256: string;
  rebuilt: boolean;
}>;

export type IgniteResult = Readonly<{
  tools: readonly IgnitedToolSummary[];
  checked: boolean;
}>;

const repoRoot = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const toolsSrcDir = join(repoRoot, 'tools', 'src');
const toolsDistDir = join(repoRoot, 'dist', 'tools');
const ignitedMemo = new Map<string, string>();
let tempSequence = 0;

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function repoRelative(filePath: string): string {
  return relative(repoRoot, filePath).split(sep).join('/');
}

function validRelativePath(relPath: string): boolean {
  return relPath.length > 0 && !relPath.startsWith('/') && !relPath.startsWith('../') && !relPath.split('/').includes('..');
}

function ensureToolsPackageJson(): void {
  mkdirSync(toolsDistDir, { recursive: true });
  const pkgPath = join(toolsDistDir, 'package.json');
  if (!existsSync(pkgPath)) {
    const tmp = `${pkgPath}.${process.pid}.${tempSequence++}.tmp`;
    writeFileSync(tmp, '{"type":"module"}\n');
    renameSync(tmp, pkgPath);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readValidProvenance(name: string, compilerArtifactSha256: string): ToolProvenance | undefined {
  const artifactPath = join(toolsDistDir, `${name}.ts`);
  const provenancePath = join(toolsDistDir, `${name}.provenance.json`);
  if (!existsSync(artifactPath) || !existsSync(provenancePath)) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(provenancePath, 'utf8'));
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) return undefined;
  if (parsed['version'] !== 1 || parsed['tool'] !== name || parsed['target'] !== 'ts') return undefined;
  if (parsed['compilerArtifactSha256'] !== compilerArtifactSha256) return undefined;
  if (typeof parsed['compilerSourceSha256'] !== 'string' || typeof parsed['artifactSha256'] !== 'string') return undefined;
  if (!Array.isArray(parsed['dependencies']) || !Array.isArray(parsed['edges'])) return undefined;

  const dependencies: ToolDependency[] = [];
  for (const item of parsed['dependencies']) {
    if (!isRecord(item) || typeof item['path'] !== 'string' || typeof item['sha256'] !== 'string') return undefined;
    if (!validRelativePath(item['path']) || !/^[0-9a-f]{64}$/.test(item['sha256'])) return undefined;
    dependencies.push({ path: item['path'], sha256: item['sha256'] });
  }
  const expectedRoot = `tools/src/${name}.lts`;
  if (dependencies.length === 0 || dependencies[0]?.path !== expectedRoot) return undefined;

  const dependencyPaths = new Set(dependencies.map(dep => dep.path));
  const edges: ToolEdge[] = [];
  for (const item of parsed['edges']) {
    if (!isRecord(item) || typeof item['importer'] !== 'string' || typeof item['spec'] !== 'string' || typeof item['path'] !== 'string') {
      return undefined;
    }
    if (!dependencyPaths.has(item['importer']) || !dependencyPaths.has(item['path'])) return undefined;
    edges.push({ importer: item['importer'], spec: item['spec'], path: item['path'] });
  }

  try {
    if (sha256(readFileSync(artifactPath)) !== parsed['artifactSha256']) return undefined;
    for (const dep of dependencies) {
      if (sha256(readFileSync(resolve(repoRoot, dep.path))) !== dep.sha256) return undefined;
    }
    for (const edge of edges) {
      const resolved = realpathSync(resolveImportPath(resolve(repoRoot, edge.importer), edge.spec, repoRoot));
      if (resolved !== realpathSync(resolve(repoRoot, edge.path))) return undefined;
    }
  } catch {
    return undefined;
  }

  return {
    version: 1,
    tool: name,
    target: 'ts',
    compilerArtifactSha256,
    compilerSourceSha256: parsed['compilerSourceSha256'],
    artifactSha256: parsed['artifactSha256'],
    dependencies,
    edges,
  };
}

/** Lists all Lite tool entry names discovered under `tools/src/*.lts` in sorted order. */
export function toolNames(): string[] {
  return readdirSync(toolsSrcDir)
    .filter(entry => entry.endsWith('.lts'))
    .sort()
    .map(entry => entry.slice(0, -4));
}

/** Returns the ignited TS artifact path under `dist/tools/` for `name`. */
export function toolDistPath(name: string): string {
  return join(toolsDistDir, `${name}.ts`);
}

function igniteSingleTool(name: string, force = false): IgnitedToolSummary {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`ignite: invalid tool name "${name}"`);
  }
  const sourcePath = join(toolsSrcDir, `${name}.lts`);
  if (!existsSync(sourcePath)) {
    throw new Error(`ignite: missing Lite tool source tools/src/${name}.lts`);
  }

  const artifactPath = toolDistPath(name);
  if (!force) {
    const valid = readValidProvenance(name, seed.artifactSha256);
    if (valid !== undefined) {
      ignitedMemo.set(name, artifactPath);
      return { name, path: artifactPath, sha256: valid.artifactSha256, rebuilt: false };
    }
  }

  const input = readSourceInput(sourcePath);
  const relRoot = `tools/src/${name}.lts`;
  const traced = compileSeedTsGraph({ text: input.text, name: relRoot, rootPath: input.path, cwd: repoRoot });
  if (traced.result.status !== 0 || traced.result.stderr.length > 0) {
    throw new Error(`ignite: failed to compile ${relRoot} (${traced.result.status}):\n${traced.result.stderr.toString('utf8')}`);
  }

  const rawDeps: ToolDependency[] = [
    { path: input.path, sha256: sha256(input.bytes) },
    ...traced.dependencies,
  ];
  const uniqueDeps: ToolDependency[] = [];
  const seenPaths = new Set<string>();
  for (const dep of rawDeps) {
    const canonical = realpathSync(dep.path);
    if (!seenPaths.has(canonical)) {
      seenPaths.add(canonical);
      uniqueDeps.push({ path: repoRelative(canonical), sha256: dep.sha256 });
    }
  }
  const edges: ToolEdge[] = traced.edges.map(edge => ({
    importer: repoRelative(realpathSync(edge.importer)),
    spec: edge.spec,
    path: repoRelative(realpathSync(edge.path)),
  }));

  const artifactBytes = traced.result.stdout;
  const artifactSha256 = sha256(artifactBytes);
  const provenance: ToolProvenance = {
    version: 1,
    tool: name,
    target: 'ts',
    compilerArtifactSha256: traced.seedSha256,
    compilerSourceSha256: seed.sourceSha256,
    artifactSha256,
    dependencies: uniqueDeps,
    edges,
  };

  ensureToolsPackageJson();
  const token = `${process.pid}.${tempSequence++}`;
  const tmpArtifact = `${artifactPath}.${token}.tmp`;
  const tmpProvenance = `${join(toolsDistDir, `${name}.provenance.json`)}.${token}.tmp`;
  writeFileSync(tmpArtifact, artifactBytes);
  writeFileSync(tmpProvenance, JSON.stringify(provenance, null, 2) + '\n');
  renameSync(tmpArtifact, artifactPath);
  renameSync(tmpProvenance, join(toolsDistDir, `${name}.provenance.json`));
  ignitedMemo.set(name, artifactPath);
  return { name, path: artifactPath, sha256: artifactSha256, rebuilt: true };
}

/** Ensures `dist/tools/<name>.ts` exists and matches current Lite sources and compiler seed, compiling if needed. */
export function ensureTool(name: string, options: Readonly<{ force?: boolean }> = {}): string {
  if (!options.force) {
    const memo = ignitedMemo.get(name);
    if (memo !== undefined && existsSync(memo)) {
      if (readValidProvenance(name, seed.artifactSha256) !== undefined) {
        return memo;
      }
    }
  }
  return igniteSingleTool(name, options.force === true).path;
}

/** Compiles all (or selected) Lite tools under `tools/src/*.lts` into `dist/tools/*.ts` and optionally strict-checks them. */
export function igniteAllTools(
  options: Readonly<{ check?: boolean; force?: boolean; clean?: boolean; tools?: readonly string[] }> = {},
): IgniteResult {
  if (options.clean) {
    ignitedMemo.clear();
    rmSync(toolsDistDir, { recursive: true, force: true });
  }
  const names = options.tools !== undefined && options.tools.length > 0 ? [...options.tools] : toolNames();
  const tools = names.map(name => igniteSingleTool(name, options.force === true));
  if (options.check) {
    const checked = checkTsArtifactFiles(tools.map(item => item.path));
    if (checked.status !== 0 || checked.signal !== null) {
      throw new Error(`ignited tools failed strict TypeScript checking:\n${checked.stdout.toString('utf8')}${checked.stderr.toString('utf8')}`);
    }
  }
  return { tools, checked: options.check === true };
}

/** Ignites `name` into `dist/tools/<name>.ts` if needed and executes its generated `main` entrypoint. */
export async function runIgnitedTool(name: string): Promise<void> {
  const entry = ensureTool(name);
  const mod = (await import(pathToFileURL(entry).href)) as { main: (write?: (text: string) => void) => string };
  mod.main((text: string): void => {
    writeSync(1, text);
  });
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  let check = false;
  let force = false;
  let clean = false;
  let jsonOutput = false;
  const selected: string[] = [];
  for (const arg of args) {
    if (arg === '--check') check = true;
    else if (arg === '--force') force = true;
    else if (arg === '--clean') clean = true;
    else if (arg === '--json') jsonOutput = true;
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: node igniter/ignite.ts [--check] [--force] [--clean] [--json] [TOOL...]\n');
      process.exit(0);
    } else if (arg.startsWith('-')) {
      process.stderr.write(`ignite: unknown option ${arg}\n`);
      process.exit(2);
    } else {
      selected.push(arg);
    }
  }
  try {
    const result = igniteAllTools({ check, force, clean, tools: selected });
    if (jsonOutput) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      const rebuiltCount = result.tools.filter(t => t.rebuilt).length;
      process.stdout.write(
        `Ignited ${result.tools.length} tool(s) into dist/tools (${rebuiltCount} rebuilt${result.checked ? ', strict TS checked' : ''}).\n`,
      );
    }
  } catch (error: unknown) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
