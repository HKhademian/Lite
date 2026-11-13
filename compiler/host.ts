/** Host-only assembly and process glue. Both target compilers are Lite-generated TS programs. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest } from '../igniter/loader.ts';
import { readSourceInput, resolveImportPath, sourceModuleIdentity } from './source.ts';
import { seed } from './bootstrap/seed.ts';

/** Existing code-generation targets; this is host plumbing, not language syntax. */
export type CompilerTarget = 'ts' | 'c';

/** Raw streams and process-style status from a compiler invocation. */
export type CompilerResult = Readonly<{ status: number; stdout: Buffer; stderr: Buffer }>;
/** Complete source plus an optional diagnostic name and canonical filesystem path. */
export type CompilerInput = Readonly<{ text: string; name?: string; rootPath?: string; cwd?: string }>;
/** Selected artifact and exact source/builder identities. */
export type CompilerBuild = Readonly<{ target: CompilerTarget; path: string; sourceSha256: string; artifactSha256: string; builderSha256: string; dependencies: readonly string[]; cached: boolean }>;
type DependencyIdentity = Readonly<{ path: string; sha256: string }>;
type SourceEdge = Readonly<{ importer: string; spec: string; path: string }>;

const root = fileURLToPath(new URL('../', import.meta.url));
const seedPath = fileURLToPath(new URL(`./bootstrap/${seed.artifact}`, import.meta.url));
const entryPath = fileURLToPath(new URL('./entry.ts', import.meta.url));

/** Computes a lowercase SHA-256 identity without normalizing source bytes. */
function hash(bytes: string | Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
/** Writes the source-root selector only after the corresponding build has been verified. */
function selectBuild(indexPath: string, indexDirectory: string, target: CompilerTarget, sourcePath: string, sourceRootSha256: string,
  cacheKey: string, dependencies: readonly string[], dependencyHashes: readonly DependencyIdentity[], edges: readonly SourceEdge[]): void {
  mkdirSync(indexDirectory, { recursive: true });
  const indexTemporary = `${indexPath}.${process.pid}.tmp`;
  writeFileSync(indexTemporary, JSON.stringify({ target, root: relative(root, sourcePath).split(sep).join('/'), rootSha256: sourceRootSha256,
    cacheKey, dependencies, dependencyHashes, edges }, null, 2) + '\n');
  renameSync(indexTemporary, indexPath);
}

/** Executes one generated compiler with isolated process state and no stage-0 fallback. */
function invoke(artifact: string, text: string, name?: string, cwd = process.cwd(), explicitRootPath?: string): CompilerResult {
  const rootPath = explicitRootPath ?? (name === undefined || name === '' ? resolve(cwd, '__lite_stdin__.lts') : resolve(cwd, name));
  const result = spawnSync(process.execPath, [entryPath, artifact, name ?? '', sourceModuleIdentity(text), rootPath], {
    input: text, cwd, timeout: 0, maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null || result.status === null) throw new Error(`generated compiler terminated: ${result.signal ?? 'no exit status'}`);
  return { status: result.status, stdout: result.stdout ?? Buffer.alloc(0), stderr: result.stderr ?? Buffer.alloc(0) };
}

/** Compiles a source root and captures the dependency paths actually read by the Lite graph visitor on fd 3. */
function invokeGraph(artifact: string, text: string, name: string, cwd = process.cwd()): Readonly<{ result: CompilerResult; dependencies: readonly DependencyIdentity[]; edges: readonly SourceEdge[] }> {
  const rootPath = name === '' ? resolve(cwd, '__lite_stdin__.lts') : resolve(cwd, name);
  const processResult = spawnSync(process.execPath, [entryPath, artifact, name, sourceModuleIdentity(text), rootPath], {
    input: text, cwd, timeout: 0, maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, LITE_SOURCE_TRACE: '1' }, stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
  });
  if (processResult.error !== undefined) throw processResult.error;
  if (processResult.signal !== null || processResult.status === null) throw new Error(`generated compiler terminated: ${processResult.signal ?? 'no exit status'}`);
  let traceData: unknown = { files: [], edges: [] };
  const trace = processResult.output[3];
  if (trace !== null && trace !== undefined && trace.length > 0) {
    try { traceData = JSON.parse(trace.toString('utf8')); } catch { throw new Error('generated compiler returned invalid source dependency trace'); }
  }
  if (typeof traceData !== 'object' || traceData === null || Array.isArray(traceData) ||
      !('files' in traceData) || !Array.isArray(traceData.files) || !traceData.files.every(item => typeof item === 'object' && item !== null &&
        'path' in item && typeof item.path === 'string' && 'sha256' in item && typeof item.sha256 === 'string') ||
      !('edges' in traceData) || !Array.isArray(traceData.edges) || !traceData.edges.every(item => typeof item === 'object' && item !== null &&
        'importer' in item && typeof item.importer === 'string' && 'spec' in item && typeof item.spec === 'string' && 'path' in item && typeof item.path === 'string')) {
    throw new Error('generated compiler returned invalid source dependency list');
  }
  return {
    result: { status: processResult.status, stdout: processResult.stdout ?? Buffer.alloc(0), stderr: processResult.stderr ?? Buffer.alloc(0) },
    dependencies: traceData.files as DependencyIdentity[], edges: traceData.edges as SourceEdge[],
  };
}

/** Strictly checks a rebuilt compiler using the same erasable-TS contract as the seed. */
function checkArtifact(artifact: string, directory: string): void {
  const config = join(directory, 'tsconfig.json');
  writeFileSync(config, JSON.stringify({
    extends: resolve(root, 'compiler/bootstrap/tsconfig.json'), include: [], files: [artifact],
  }));
  const checked = spawnSync(process.execPath, [resolve(root, 'igniter/node_modules/typescript/bin/tsc'), '-p', config], {
    encoding: 'utf8', timeout: 0,
  });
  if (checked.error !== undefined) throw checked.error;
  if (checked.status !== 0 || checked.signal !== null) {
    throw new Error(`rebuilt compiler failed strict TypeScript checking:\n${checked.stdout}${checked.stderr}`);
  }
}

/** Verifies cached compiler bytes and their exact current source and seed identity. */
function cachedBuild(directory: string, sourceSha256: string, target: CompilerTarget, dependencies: readonly string[], dependencyHashes: readonly DependencyIdentity[], edges: readonly SourceEdge[]): CompilerBuild {
  const record: unknown = JSON.parse(readFileSync(join(directory, 'provenance.json'), 'utf8'));
  const path = join(directory, 'compiler.ts');
  const artifactSha256 = hash(readFileSync(path));
  if (typeof record !== 'object' || record === null || !('sourceSha256' in record) ||
      record.sourceSha256 !== sourceSha256 || !('builderSha256' in record) ||
      record.builderSha256 !== seed.artifactSha256 || !('artifactSha256' in record) ||
      record.artifactSha256 !== artifactSha256 || !('target' in record) || record.target !== target ||
      !('dependencies' in record) || JSON.stringify(record.dependencies) !== JSON.stringify(dependencies) ||
      !('dependencyHashes' in record) || JSON.stringify(record.dependencyHashes) !== JSON.stringify(dependencyHashes) ||
      !('edges' in record) || JSON.stringify(record.edges) !== JSON.stringify(edges)) {
    throw new Error(`compiler cache integrity mismatch: ${directory}`);
  }
  for (const identity of dependencyHashes) {
    if (hash(readFileSync(resolve(root, identity.path))) !== identity.sha256) throw new Error(`compiler dependency changed during cache selection: ${identity.path}`);
  }
  for (const edge of edges) {
    const importer = resolve(root, edge.importer);
    const imported = resolve(root, edge.path);
    if (realpathSync(resolveImportPath(importer, edge.spec, root)) !== realpathSync(imported)) {
      throw new Error(`compiler import edge changed during cache selection: ${edge.importer}: ${edge.spec}`);
    }
  }
  return { target, path, sourceSha256, artifactSha256, builderSha256: seed.artifactSha256, dependencies, cached: true };
}

/**
 * Selects the verified seed for its original S, or rebuilds changed S with that
 * seed and strict-checks it before atomic cache publication. No T00 code runs.
 */
export function buildCompiler(target: CompilerTarget): CompilerBuild {
  if (hash(readFileSync(seedPath)) !== seed.artifactSha256) throw new Error('selected TS bootstrap seed hash mismatch');
  const manifestPath = resolve(root, 'compiler/manifests', `${target}.json`);
  const manifest = loadManifest(manifestPath);
  if (manifest.target !== target || manifest.files.length !== 1) throw new Error(`${manifestPath}: compiler source graph requires one ${target} root`);
  const sourcePath = realpathSync(resolve(dirname(manifestPath), manifest.files[0]!));
  const input = readSourceInput(sourcePath);
  const cache = resolve(root, 'dist/compiler-cache');
  const sourceRootSha256 = hash(input.bytes);
  const sourceName = relative(root, sourcePath).split(sep).join('/');
  const sourceBridgeSha256 = hash(JSON.stringify([
    hash(readFileSync(entryPath)), hash(readFileSync(resolve(root, 'compiler/source.ts'))),
  ]));
  const indexKey = hash(`trace-v5:${target}:${seed.artifactSha256}:${sourceName}:${sourceRootSha256}:${sourceBridgeSha256}`);
  const indexDirectory = join(cache, 'selection');
  const indexPath = join(indexDirectory, `${indexKey}.json`);
  if (existsSync(indexPath)) {
    const index: unknown = JSON.parse(readFileSync(indexPath, 'utf8'));
    if (typeof index !== 'object' || index === null || Array.isArray(index) ||
        !('target' in index) || index.target !== target || !('root' in index) || index.root !== relative(root, sourcePath).split(sep).join('/') ||
        !('rootSha256' in index) || index.rootSha256 !== sourceRootSha256 || !('cacheKey' in index) || typeof index.cacheKey !== 'string' ||
        !/^[0-9a-f]{64}$/.test(index.cacheKey) ||
        !('dependencies' in index) || !Array.isArray(index.dependencies) || !index.dependencies.every(item => typeof item === 'string') ||
        !('dependencyHashes' in index) || !Array.isArray(index.dependencyHashes) ||
        !index.dependencyHashes.every(item => typeof item === 'object' && item !== null && 'path' in item && typeof item.path === 'string' &&
          'sha256' in item && typeof item.sha256 === 'string' && /^[0-9a-f]{64}$/.test(item.sha256)) ||
        !('edges' in index) || !Array.isArray(index.edges) ||
        !index.edges.every(item => typeof item === 'object' && item !== null && 'importer' in item && typeof item.importer === 'string' &&
          'spec' in item && typeof item.spec === 'string' && 'path' in item && typeof item.path === 'string')) {
      throw new Error(`compiler source dependency index is invalid: ${indexPath}`);
    }
    const dependencyHashes = index.dependencyHashes as DependencyIdentity[];
    const dependencies = index.dependencies as string[];
    const edges = index.edges as SourceEdge[];
    const valid = dependencyHashes.length > 0 && dependencyHashes[0]?.path === relative(root, sourcePath).split(sep).join('/') &&
      dependencyHashes[0]?.sha256 === sourceRootSha256 &&
      JSON.stringify(dependencies) === JSON.stringify(dependencyHashes.map(identity => identity.path)) &&
      dependencyHashes.every(identity => {
      try { return !identity.path.startsWith('../') && !identity.path.startsWith('/') && !identity.path.split('/').includes('..') &&
        hash(readFileSync(resolve(root, identity.path))) === identity.sha256; }
      catch { return false; }
    });
    const dependencyPaths = new Set(dependencies);
    const edgesValid = edges.every(edge => {
      try { return typeof edge.importer === 'string' && typeof edge.spec === 'string' && typeof edge.path === 'string' &&
        dependencyPaths.has(edge.importer) && dependencyPaths.has(edge.path) &&
        realpathSync(resolveImportPath(resolve(root, edge.importer), edge.spec, root)) === realpathSync(resolve(root, edge.path)); }
      catch { return false; }
    });
    if (valid && edgesValid) return cachedBuild(join(cache, index.cacheKey), hash(JSON.stringify({ version: 5, sourceName, sourceBridgeSha256, dependencyHashes, edges })), target, dependencies, dependencyHashes, edges);
  }
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(join(cache, 'build-'));
  try {
    const sourceName = relative(root, sourcePath).split(sep).join('/');
    const traced = invokeGraph(seedPath, input.text, sourceName, root);
    const generated = traced.result;
    if (generated.status !== 0 || generated.stderr.length !== 0) {
      const diagnostic = generated.stderr.toString('utf8');
      throw new Error(`${seed.artifact} cannot rebuild current compiler source (${generated.status}):\n${diagnostic}`);
    }
    const absoluteIdentities: DependencyIdentity[] = [{ path: sourcePath, sha256: sourceRootSha256 }, ...traced.dependencies];
    const uniqueIdentities = absoluteIdentities.filter((identity, index, values) => values.findIndex(item => item.path === identity.path) === index);
    for (const identity of absoluteIdentities) {
      const first = absoluteIdentities.find(item => item.path === identity.path)!;
      if (first.sha256 !== identity.sha256) throw new Error(`compiler source bytes changed during build: ${identity.path}`);
    }
    for (const identity of uniqueIdentities) {
      if (hash(readFileSync(identity.path)) !== identity.sha256) throw new Error(`compiler source changed while building: ${identity.path}`);
    }
    const dependencyHashes = uniqueIdentities.map(identity => ({
      path: relative(root, identity.path).split(sep).join('/'), sha256: identity.sha256,
    }));
    const edges = traced.edges.map(edge => ({
      importer: relative(root, edge.importer).split(sep).join('/'),
      spec: edge.spec,
      path: relative(root, edge.path).split(sep).join('/'),
    }));
    const dependencies = dependencyHashes.map(identity => identity.path);
    const sourceSha256 = hash(JSON.stringify({ version: 5, sourceName, sourceBridgeSha256, dependencyHashes, edges }));
    if (target === 'ts' && sourceSha256 === seed.sourceSha256) {
      const artifactSha256 = hash(generated.stdout);
      if (artifactSha256 !== seed.artifactSha256) {
        throw new Error('selected TS bootstrap seed does not reproduce its recorded source graph');
      }
      return { target, path: seedPath, sourceSha256, artifactSha256, builderSha256: seed.artifactSha256,
        dependencies, cached: false };
    }
    const key = hash(`${target}:${seed.artifactSha256}:${sourceSha256}:${JSON.stringify(dependencies)}`);
    const destination = join(cache, key);
    if (existsSync(destination)) {
      const selected = cachedBuild(destination, sourceSha256, target, dependencies, dependencyHashes, edges);
      selectBuild(indexPath, indexDirectory, target, sourcePath, sourceRootSha256, key, dependencies, dependencyHashes, edges);
      return selected;
    }
    const artifact = join(temporary, 'compiler.ts');
    writeFileSync(artifact, generated.stdout);
    writeFileSync(join(temporary, 'package.json'), '{"type":"module"}\n');
    checkArtifact(artifact, temporary);
    writeFileSync(join(temporary, 'provenance.json'), JSON.stringify({
      target, sourceSha256, builderSha256: seed.artifactSha256, artifactSha256: hash(generated.stdout),
      dependencies, dependencyHashes, edges,
    }, null, 2) + '\n');
    try {
      renameSync(temporary, destination);
    } catch (error: unknown) {
      if (!existsSync(destination)) throw error;
      // Another builder may have published this exact source; verify it below.
    }
    const selected = cachedBuild(destination, sourceSha256, target, dependencies, dependencyHashes, edges);
    selectBuild(indexPath, indexDirectory, target, sourcePath, sourceRootSha256, key, dependencies, dependencyHashes, edges);
    return selected;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

/** Selects the current TS compiler; retained for existing internal callers. */
export function buildTsCompiler(): CompilerBuild { return buildCompiler('ts'); }

/** Selects the current C compiler; builds and caches it from compiler sources if needed. */
export function buildCCompiler(): CompilerBuild { return buildCompiler('c'); }

/** Compiles one whole Lite source with a current Lite-written target compiler. */
export function compileBuiltCompiler(build: CompilerBuild, input: CompilerInput): CompilerResult {
  return invoke(build.path, input.text, input.name, input.cwd ?? process.cwd(), input.rootPath);
}

/** Selects the current graph then compiles one whole Lite source. */
export function compileTarget(target: CompilerTarget, input: CompilerInput): CompilerResult {
  return compileBuiltCompiler(buildCompiler(target), input);
}

/** Compiles to TS through the current generated compiler. */
export function compileTs(input: CompilerInput): CompilerResult { return compileTarget('ts', input); }
