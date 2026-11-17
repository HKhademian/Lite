/** Host-only assembly and process glue. Both target compilers are Lite-generated TS programs. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync,
  realpathSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './bootstrap/seed.ts';

/** Validated ordered compiler manifest: one target and its relative source paths. */
export type Manifest = Readonly<{ target: CompilerTarget; files: readonly string[] }>;

/** Loads and validates manifest metadata without opening or assembling source files. */
export function loadManifest(path: string): Manifest {
  const manifestPath = resolve(path);
  const raw = readRootSourceFile(manifestPath).text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: unknown) {
    throw new Error(`${manifestPath}: invalid manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${manifestPath}: manifest must be a JSON object`);
  }
  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== 'target' && key !== 'files') throw new Error(`${manifestPath}: unexpected manifest key ${key}`);
  }
  const target = record['target'];
  if (target !== 'ts' && target !== 'c') throw new Error(`${manifestPath}: target must be "ts" or "c"`);
  const filesValue = record['files'];
  if (!Array.isArray(filesValue) || filesValue.length === 0) {
    throw new Error(`${manifestPath}: files must be a nonempty array`);
  }
  const files: string[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of filesValue.entries()) {
    const label = `${manifestPath}: files[${index}]`;
    if (typeof entry !== 'string') throw new Error(`${label}: must be a string`);
    if (entry.length === 0) throw new Error(`${label}: empty path`);
    if (entry.startsWith('/')) throw new Error(`${label}: absolute path`);
    if (/^[A-Za-z]:/.test(entry)) throw new Error(`${label}: drive-letter path`);
    if (entry.includes('\\')) throw new Error(`${label}: path must use "/" separators`);
    if (seen.has(entry)) throw new Error(`${label}: duplicate file ${entry}`);
    seen.add(entry);
    files.push(entry);
  }
  return { target, files };
}

/** Existing code-generation targets; this is host plumbing, not language syntax. */
export type CompilerTarget = 'ts' | 'c';

/** Raw streams and process-style status from a compiler invocation. */
export type CompilerResult = Readonly<{ status: number; stdout: Buffer; stderr: Buffer }>;
/** Complete source plus an optional diagnostic name and canonical filesystem path. */
export type CompilerInput = Readonly<{ text: string; name?: string; rootPath?: string; cwd?: string; options?: readonly string[] }>;
/** Selected artifact and exact source/builder identities. */
export type CompilerBuild = Readonly<{ target: CompilerTarget; path: string; sourceSha256: string; artifactSha256: string; builderSha256: string; dependencies: readonly string[]; cached: boolean }>;
/** Dependency identity and import edge captured during source-graph compilation. */
export type GraphDependencyIdentity = Readonly<{ path: string; sha256: string }>;
export type GraphSourceEdge = Readonly<{ importer: string; spec: string; path: string }>;
type DependencyIdentity = GraphDependencyIdentity;
type SourceEdge = GraphSourceEdge;
type CompilerMain = (write?: (text: string) => void) => unknown;
type LoadedCompiler = Readonly<{ stamp: string; main: CompilerMain }>;
type StatStamp = Readonly<{ linkPath: string; targetPath: string; stamp: string }>;
type MemoizedBuild = Readonly<{ build: CompilerBuild; checks: readonly StatStamp[] }>;
type InvokeGraphResult = Readonly<{ result: CompilerResult; dependencies: readonly DependencyIdentity[]; edges: readonly SourceEdge[] }>;

class CompilerExit extends Error {
  readonly status: number;
  constructor(status: number) {
    super();
    this.status = status;
  }
}

const root = fileURLToPath(new URL('../', import.meta.url));
const seedPath = fileURLToPath(new URL(`./bootstrap/${seed.artifact}`, import.meta.url));
const hostRequire = createRequire(import.meta.url);
const loadedCompilers = new Map<string, LoadedCompiler>();
const memoizedBuilds = new Map<CompilerTarget, MemoizedBuild>();
let inProcessActive = false;

/** Resolves an import spec for cache-edge freshness validation against the repo root. */
function resolveEdgeImportPath(importerPath: string, spec: string): string {
  const sourceSpec = spec.endsWith('.lts') ? spec : `${spec}.lts`;
  if (isAbsolute(sourceSpec)) return resolve(sourceSpec);
  if (sourceSpec.startsWith('./') || sourceSpec.startsWith('../')) {
    return resolve(dirname(importerPath), sourceSpec);
  }
  return resolve(root, 'lib', sourceSpec);
}

/** Reads a canonical UTF-8 source root file for compiler build hash calculation. */
function readRootSourceFile(path: string): Readonly<{ path: string; text: string; bytes: Buffer }> {
  const canonical = realpathSync(resolve(path));
  const bytes = readFileSync(canonical);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${canonical}: source is not valid UTF-8`);
  }
  return { path: canonical, text, bytes };
}

/** Computes a lowercase SHA-256 identity without normalizing source bytes. */
function hash(bytes: string | Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
/** Captures link target, resolved path, and nanosecond file identity for cache invalidation. */
function fileStamp(linkPath: string): StatStamp | undefined {
  try {
    const linkStat = lstatSync(linkPath, { bigint: true });
    const targetPath = realpathSync(linkPath);
    const isSymlink = linkStat.isSymbolicLink();
    const targetStat = isSymlink ? statSync(targetPath, { bigint: true }) : linkStat;
    const linkText = isSymlink ? `L:${readlinkSync(linkPath)}:` : '';
    const stamp = `${linkText}${targetStat.dev}:${targetStat.ino}:${targetStat.size}:${targetStat.mtimeNs}:${targetStat.ctimeNs}`;
    return { linkPath, targetPath, stamp };
  } catch {
    return undefined;
  }
}
/** Returns true when every recorded path keeps the exact same resolved target and stat stamp. */
function memoStillValid(checks: readonly StatStamp[]): boolean {
  for (const expected of checks) {
    const current = fileStamp(expected.linkPath);
    if (current === undefined || current.targetPath !== expected.targetPath || current.stamp !== expected.stamp) {
      return false;
    }
  }
  return true;
}
/** Records a verified build selection alongside stat stamps for all graph and cache inputs. */
function recordBuildMemo(
  target: CompilerTarget,
  build: CompilerBuild,
  manifestPath: string,
  sourcePath: string,
  indexPath: string,
  edges: readonly SourceEdge[],
): CompilerBuild {
  const paths = new Set<string>([
    seedPath,
    manifestPath,
    sourcePath,
    indexPath,
    ...build.dependencies.map(dep => resolve(root, dep)),
    ...edges.map(edge => resolveEdgeImportPath(resolve(root, edge.importer), edge.spec)),
  ]);
  if (build.path !== seedPath) {
    paths.add(build.path);
    paths.add(join(dirname(build.path), 'provenance.json'));
  }
  const checks: StatStamp[] = [];
  for (const candidate of paths) {
    const stamp = fileStamp(candidate);
    if (stamp === undefined) return build;
    checks.push(stamp);
  }
  memoizedBuilds.set(target, { build, checks });
  return build;
}
/** Writes the source-root selector only after the corresponding build has been verified. */
function selectBuild(indexPath: string, indexDirectory: string, target: CompilerTarget, sourcePath: string, sourceRootSha256: string,
  cacheKey: string, dependencies: readonly string[], dependencyHashes: readonly DependencyIdentity[], edges: readonly SourceEdge[]): void {
  mkdirSync(indexDirectory, { recursive: true });
  const indexTemporary = `${indexPath}.${process.pid}.tmp`;
  writeFileSync(indexTemporary, JSON.stringify({ target, root: relative(root, sourcePath).split(sep).join('/'), rootSha256: sourceRootSha256,
    cacheKey, dependencies, dependencyHashes, edges }, null, 2) + '\n');
  renameSync(indexTemporary, indexPath);
}

/** Spawns a standalone generated compiler directly in a fresh subprocess when in-process reuse is unavailable. */
function invokeSubprocess(artifact: string, text: string, name?: string, cwd = process.cwd(), explicitRootPath?: string, options: readonly string[] = []): CompilerResult {
  const rootPath = explicitRootPath ?? (name === undefined || name === '' ? resolve(cwd, '__lite_stdin__.lts') : resolve(cwd, name));
  const result = spawnSync(process.execPath, [artifact, '--stdin', '--name', name ?? '', '--root', rootPath, ...options], {
    input: text, cwd, timeout: 0, maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null || result.status === null) throw new Error(`generated compiler terminated: ${result.signal ?? 'no exit status'}`);
  return { status: result.status, stdout: result.stdout ?? Buffer.alloc(0), stderr: result.stderr ?? Buffer.alloc(0) };
}

/** Parses trace JSON emitted by `--trace-json` into validated dependency identities and import edges. */
function readTraceJsonFile(tracePath: string): Readonly<{ dependencies: DependencyIdentity[]; edges: SourceEdge[] }> {
  let traceData: unknown = { files: [], edges: [] };
  if (existsSync(tracePath)) {
    const raw = readFileSync(tracePath, 'utf8');
    if (raw.length > 0) {
      try { traceData = JSON.parse(raw); } catch { throw new Error('generated compiler returned invalid source dependency trace'); }
    }
  }
  if (typeof traceData !== 'object' || traceData === null || Array.isArray(traceData) ||
      !('files' in traceData) || !Array.isArray(traceData.files) || !traceData.files.every(item => typeof item === 'object' && item !== null &&
        'path' in item && typeof item.path === 'string' && 'sha256' in item && typeof item.sha256 === 'string') ||
      !('edges' in traceData) || !Array.isArray(traceData.edges) || !traceData.edges.every(item => typeof item === 'object' && item !== null &&
        'importer' in item && typeof item.importer === 'string' && 'spec' in item && typeof item.spec === 'string' && 'path' in item && typeof item.path === 'string')) {
    throw new Error('generated compiler returned invalid source dependency list');
  }
  return {
    dependencies: traceData.files as DependencyIdentity[],
    edges: traceData.edges as SourceEdge[],
  };
}

/** Runs an already-loaded generated compiler in-process while isolating stdio, argv, and exit. */
function invokeInProcess(main: CompilerMain, resolvedArtifact: string, text: string, name: string | undefined, cwd: string, rootPath: string, options: readonly string[] = [], traceFile?: string): InvokeGraphResult {
  const stdinBytes = Buffer.from(text, 'utf8');
  let stdinOffset = 0;
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  const savedArgv = process.argv;
  const savedExit = process.exit;
  const savedCwd = process.cwd;
  const savedGetBuiltinModule = process.getBuiltinModule;
  const rawGetBuiltinModule = savedGetBuiltinModule as (id: string) => unknown;
  const realFs = rawGetBuiltinModule.call(process, 'node:fs') as Record<string, unknown> | undefined;
  if (realFs === undefined) throw new Error('compiler host cannot access node:fs builtin module');
  const fsProxy = new Proxy(realFs, {
    get(target, prop, receiver) {
      if (prop === 'readSync') {
        return (...args: unknown[]): number => {
          const [fd, buffer, offset, length] = args;
          if (fd === 0) {
            const out = buffer as Uint8Array;
            const destOffset = typeof offset === 'number' ? offset : 0;
            const maxLen = typeof length === 'number' ? length : out.byteLength - destOffset;
            const available = Math.max(0, stdinBytes.length - stdinOffset);
            const count = Math.max(0, Math.min(maxLen, available, out.byteLength - destOffset));
            if (count > 0) {
              out.set(stdinBytes.subarray(stdinOffset, stdinOffset + count), destOffset);
              stdinOffset += count;
            }
            return count;
          }
          return Reflect.apply(target['readSync'] as (...a: unknown[]) => number, target, args);
        };
      }
      if (prop === 'readFileSync') {
        return (...args: unknown[]): unknown => {
          const [pathOrFd, options] = args;
          if (pathOrFd === 0) {
            const rest = stdinBytes.subarray(stdinOffset);
            stdinOffset = stdinBytes.length;
            const encoding = typeof options === 'string'
              ? options
              : (typeof options === 'object' && options !== null && 'encoding' in options && typeof options.encoding === 'string'
                ? options.encoding : undefined);
            return encoding !== undefined ? Buffer.from(rest).toString(encoding as BufferEncoding) : Buffer.from(rest);
          }
          return Reflect.apply(target['readFileSync'] as (...a: unknown[]) => unknown, target, args);
        };
      }
      if (prop === 'writeSync') {
        return (...args: unknown[]): number => {
          const [fd, data, ...rest] = args;
          if (fd === 1 || fd === 2) {
            const targetChunks = fd === 1 ? stdoutChunks : stderrChunks;
            let chunk: Buffer;
            if (typeof data === 'string') {
              chunk = Buffer.from(data, 'utf8');
            } else {
              const view = data as Uint8Array;
              const off = typeof rest[0] === 'number' ? rest[0] : 0;
              const end = typeof rest[1] === 'number' ? off + rest[1] : view.byteLength;
              chunk = Buffer.from(view.subarray(off, end));
            }
            targetChunks.push(chunk);
            return chunk.length;
          }
          return Reflect.apply(target['writeSync'] as (...a: unknown[]) => number, target, args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  inProcessActive = true;
  let status = 0;
  try {
    const traceArgs = traceFile !== undefined ? ['--trace-json', traceFile] : [];
    process.argv = [process.execPath, resolvedArtifact, '--stdin', '--name', name ?? '', '--root', rootPath, ...traceArgs, ...options];
    process.cwd = () => cwd;
    process.exit = ((code?: number | string | null): never => {
      const numeric = code === undefined || code === null ? 0 : Number(code);
      throw new CompilerExit(Number.isFinite(numeric) ? numeric : 1);
    }) as typeof process.exit;
    process.getBuiltinModule = ((moduleName: string) => (
      moduleName === 'node:fs' ? fsProxy : rawGetBuiltinModule.call(process, moduleName)
    )) as typeof process.getBuiltinModule;
    try {
      const output = main((textChunk: string): void => {
        stdoutChunks.push(Buffer.from(textChunk, 'utf8'));
      });
      if (output === undefined) {
        status = 2;
      } else if (typeof output !== 'string') {
        throw new Error('compiler entry: main did not return text');
      } else if (output.length > 0) {
        stdoutChunks.push(Buffer.from(output, 'utf8'));
      }
    } catch (error: unknown) {
      if (error instanceof CompilerExit) {
        status = error.status;
      } else {
        throw error;
      }
    }
  } finally {
    process.argv = savedArgv;
    process.cwd = savedCwd;
    process.exit = savedExit;
    process.getBuiltinModule = savedGetBuiltinModule;
    inProcessActive = false;
  }
  const trace = traceFile !== undefined ? readTraceJsonFile(traceFile) : { dependencies: [], edges: [] };
  return {
    result: { status, stdout: Buffer.concat(stdoutChunks), stderr: Buffer.concat(stderrChunks) },
    dependencies: trace.dependencies,
    edges: trace.edges,
  };
}

/** Loads and caches a generated compiler module for warm in-process reuse when safe. */
function loadWarmCompiler(resolvedArtifact: string): LoadedCompiler | undefined {
  const currentStamp = fileStamp(resolvedArtifact);
  if (inProcessActive || currentStamp === undefined) return undefined;
  let cached = loadedCompilers.get(resolvedArtifact);
  if (cached !== undefined) {
    return cached.stamp === currentStamp.stamp ? cached : undefined;
  }
  let loaded: unknown;
  try {
    loaded = hostRequire(resolvedArtifact);
  } catch {
    return undefined;
  }
  if (typeof loaded !== 'object' || loaded === null || !('main' in loaded) || typeof loaded.main !== 'function') {
    return undefined;
  }
  cached = { stamp: currentStamp.stamp, main: loaded.main as CompilerMain };
  loadedCompilers.set(resolvedArtifact, cached);
  return cached;
}

/** Executes one generated compiler with warm in-process reuse when safe, falling back to a subprocess otherwise. */
function invoke(artifact: string, text: string, name?: string, cwd = process.cwd(), explicitRootPath?: string, options: readonly string[] = []): CompilerResult {
  const rootPath = explicitRootPath ?? (name === undefined || name === '' ? resolve(cwd, '__lite_stdin__.lts') : resolve(cwd, name));
  const resolvedArtifact = resolve(artifact);
  const cached = loadWarmCompiler(resolvedArtifact);
  if (cached === undefined) {
    return invokeSubprocess(artifact, text, name, cwd, explicitRootPath, options);
  }
  return invokeInProcess(cached.main, resolvedArtifact, text, name, cwd, rootPath, options).result;
}

/** Compiles a source root and captures the dependency paths actually read by the Lite graph visitor. */
function invokeWithTrace(artifact: string, text: string, name: string, cwd = process.cwd(), explicitRootPath?: string, options: readonly string[] = []): InvokeGraphResult {
  const rootPath = explicitRootPath ?? (name === '' ? resolve(cwd, '__lite_stdin__.lts') : resolve(cwd, name));
  const resolvedArtifact = resolve(artifact);
  const cached = loadWarmCompiler(resolvedArtifact);
  if (cached !== undefined) {
    const traceDir = mkdtempSync(join(tmpdir(), 'lite-trace-'));
    try {
      return invokeInProcess(cached.main, resolvedArtifact, text, name, cwd, rootPath, options, join(traceDir, 'trace.json'));
    } finally {
      rmSync(traceDir, { recursive: true, force: true });
    }
  }
  return invokeGraph(artifact, text, name, cwd, explicitRootPath, options);
}

/** Compiles a source root via a standalone compiler subprocess and captures `--trace-json` dependencies and edges. */
function invokeGraph(artifact: string, text: string, name: string, cwd = process.cwd(), explicitRootPath?: string, options: readonly string[] = []): InvokeGraphResult {
  const rootPath = explicitRootPath ?? (name === '' ? resolve(cwd, '__lite_stdin__.lts') : resolve(cwd, name));
  const traceDir = mkdtempSync(join(tmpdir(), 'lite-trace-'));
  try {
    const tracePath = join(traceDir, 'trace.json');
    const processResult = spawnSync(process.execPath, [artifact, '--stdin', '--name', name, '--root', rootPath, '--trace-json', tracePath, ...options], {
      input: text, cwd, timeout: 0, maxBuffer: 128 * 1024 * 1024,
    });
    if (processResult.error !== undefined) throw processResult.error;
    if (processResult.signal !== null || processResult.status === null) throw new Error(`generated compiler terminated: ${processResult.signal ?? 'no exit status'}`);
    const traceData = readTraceJsonFile(tracePath);
    return {
      result: { status: processResult.status, stdout: processResult.stdout ?? Buffer.alloc(0), stderr: processResult.stderr ?? Buffer.alloc(0) },
      dependencies: traceData.dependencies,
      edges: traceData.edges,
    };
  } finally {
    rmSync(traceDir, { recursive: true, force: true });
  }
}

/** Strictly checks a rebuilt compiler using the same erasable-TS contract as the seed. */
function checkArtifact(artifact: string, directory: string): void {
  const config = join(directory, 'tsconfig.json');
  writeFileSync(config, JSON.stringify({
    extends: resolve(root, 'compiler/bootstrap/tsconfig.json'), include: [], files: [artifact],
  }));
  const exeName = process.platform === 'win32' ? 'tsc.exe' : 'tsc';
  const nativeTsc = resolve(root, 'igniter/node_modules', '@typescript', `typescript-${process.platform}-${process.arch}`, 'lib', exeName);
  const checked = existsSync(nativeTsc)
    ? spawnSync(nativeTsc, ['-p', config], { encoding: 'utf8', timeout: 0 })
    : spawnSync(process.execPath, [resolve(root, 'igniter/node_modules/typescript/bin/tsc'), '-p', config], { encoding: 'utf8', timeout: 0 });
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
    if (realpathSync(resolveEdgeImportPath(importer, edge.spec)) !== realpathSync(imported)) {
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
  const memo = memoizedBuilds.get(target);
  if (memo !== undefined && memoStillValid(memo.checks)) return memo.build;
  memoizedBuilds.delete(target);
  if (hash(readFileSync(seedPath)) !== seed.artifactSha256) throw new Error('selected TS bootstrap seed hash mismatch');
  const manifestPath = resolve(root, 'compiler/manifests', `${target}.json`);
  const manifest = loadManifest(manifestPath);
  if (manifest.target !== target || manifest.files.length !== 1) throw new Error(`${manifestPath}: compiler source graph requires one ${target} root`);
  const sourcePath = realpathSync(resolve(dirname(manifestPath), manifest.files[0]!));
  const input = readRootSourceFile(sourcePath);
  const cache = resolve(root, 'dist/compiler-cache');
  const sourceRootSha256 = hash(input.bytes);
  const sourceName = relative(root, sourcePath).split(sep).join('/');
  const sourceBridgeSha256 = hash('standalone-v1');
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
        realpathSync(resolveEdgeImportPath(resolve(root, edge.importer), edge.spec)) === realpathSync(resolve(root, edge.path)); }
      catch { return false; }
    });
    if (valid && edgesValid) {
      const sourceSha256 = hash(JSON.stringify({ version: 5, sourceName, sourceBridgeSha256, dependencyHashes, edges }));
      if (target === 'ts' && sourceSha256 === seed.sourceSha256 && index.cacheKey === seed.artifactSha256) {
        return recordBuildMemo(target, { target, path: seedPath, sourceSha256, artifactSha256: seed.artifactSha256,
          builderSha256: seed.artifactSha256, dependencies, cached: false }, manifestPath, sourcePath, indexPath, edges);
      }
      return recordBuildMemo(target, cachedBuild(join(cache, index.cacheKey), sourceSha256, target, dependencies, dependencyHashes, edges),
        manifestPath, sourcePath, indexPath, edges);
    }
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
      selectBuild(indexPath, indexDirectory, target, sourcePath, sourceRootSha256, seed.artifactSha256, dependencies, dependencyHashes, edges);
      return recordBuildMemo(target, { target, path: seedPath, sourceSha256, artifactSha256, builderSha256: seed.artifactSha256,
        dependencies, cached: false }, manifestPath, sourcePath, indexPath, edges);
    }
    const key = hash(`${target}:${seed.artifactSha256}:${sourceSha256}:${JSON.stringify(dependencies)}`);
    const destination = join(cache, key);
    if (existsSync(destination)) {
      const selected = cachedBuild(destination, sourceSha256, target, dependencies, dependencyHashes, edges);
      selectBuild(indexPath, indexDirectory, target, sourcePath, sourceRootSha256, key, dependencies, dependencyHashes, edges);
      return recordBuildMemo(target, selected, manifestPath, sourcePath, indexPath, edges);
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
    return recordBuildMemo(target, selected, manifestPath, sourcePath, indexPath, edges);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

/** Selects the current TS compiler; retained for existing internal callers. */
export function buildTsCompiler(): CompilerBuild { return buildCompiler('ts'); }

/** Selects the current C compiler; builds and caches it from compiler sources if needed. */
export function buildCCompiler(): CompilerBuild { return buildCompiler('c'); }

/** Compiles one whole Lite source through a generated compiler artifact path. */
export function invokeCompilerArtifact(artifact: string, input: CompilerInput): CompilerResult {
  return invoke(artifact, input.text, input.name, input.cwd ?? process.cwd(), input.rootPath, input.options ?? []);
}

/** Compiles one whole Lite source with a current Lite-written target compiler. */
export function compileBuiltCompiler(build: CompilerBuild, input: CompilerInput): CompilerResult {
  return invokeCompilerArtifact(build.path, input);
}

/** Selects the current graph then compiles one whole Lite source. */
export function compileTarget(target: CompilerTarget, input: CompilerInput): CompilerResult {
  return compileBuiltCompiler(buildCompiler(target), input);
}

/** Compiles to TS through the current generated compiler. */
export function compileTs(input: CompilerInput): CompilerResult { return compileTarget('ts', input); }

/** Compiles one Lite source root to TS with the verified tracked Lite-generated seed and returns traced dependencies/edges. */
export function compileSeedTsGraph(input: CompilerInput): Readonly<{
  seedSha256: string;
  result: CompilerResult;
  dependencies: readonly GraphDependencyIdentity[];
  edges: readonly GraphSourceEdge[];
}> {
  if (hash(readFileSync(seedPath)) !== seed.artifactSha256) {
    throw new Error('selected TS bootstrap seed hash mismatch');
  }
  const traced = invokeWithTrace(seedPath, input.text, input.name ?? '', input.cwd ?? process.cwd(), input.rootPath, input.options ?? []);
  return { seedSha256: seed.artifactSha256, result: traced.result, dependencies: traced.dependencies, edges: traced.edges };
}
