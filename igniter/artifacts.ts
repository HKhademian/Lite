/** Internal artifact runner for emitted bootstrap TS and C, plus shared ignited-tool helpers. */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as nodeFs from 'node:fs';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const igniterScript = join(repoRoot, 'compiler/bootstrap/igniter.ts');
const ensuredTools = new Map<string, string>();

export const sha256 = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** Ensures `tools/src/<name>.lts` is compiled into `dist/tools/` via the Lite igniter. */
export function ensureTool(name: string, options: Readonly<{ force?: boolean; target?: 'c' | 'ts' }> = {}): string {
  const key = `${name}:${options.target ?? 'auto'}`;
  if (!options.force) {
    const cached = ensuredTools.get(key);
    if (cached !== undefined) return cached;
  }
  const verbose =
    process.env['CI'] === 'true' ||
    process.env['GITHUB_ACTIONS'] === 'true' ||
    process.env['LITE_SITE_VERBOSE'] === '1';
  const t0 = verbose ? performance.now() : 0;
  if (verbose) {
    process.stdout.write(`[ignite] ensuring tool ${name} (${options.target ?? 'auto'})...\n`);
  }
  const args: string[] = [igniterScript];
  if (options.target) args.push('--target', options.target);
  if (options.force) args.push('--force');
  args.push('--ensure', name);
  const result = spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8', timeout: 60_000 });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`ignite ${name} failed (${result.status ?? result.signal}):\n${result.stdout}${result.stderr}`);
  }
  const artifact = result.stdout.trim();
  if (verbose) {
    const sec = ((performance.now() - t0) / 1000).toFixed(2);
    process.stdout.write(`[ignite] tool ${name} ready in ${sec}s -> ${artifact}\n`);
  }
  ensuredTools.set(key, artifact);
  return artifact;
}

/** Executes an ignited tool (native C11 binary directly, or TS artifact via Node) and returns the spawnSync result. */
export function spawnTool(
  name: string,
  args: readonly string[],
  options: Readonly<{ cwd?: string; encoding?: BufferEncoding; input?: string | Buffer; timeout?: number; maxBuffer?: number; env?: NodeJS.ProcessEnv; target?: 'c' | 'ts' }> = {},
) {
  const tool = ensureTool(name, options.target ? { target: options.target } : {});
  const env = { ...process.env, LITE_NODE: process.execPath, ...(options.env ?? {}) };
  if (tool.endsWith('.ts')) {
    return spawnSync(process.execPath, [tool, ...args], { ...options, encoding: options.encoding ?? 'utf8', env });
  }
  return spawnSync(tool, [...args], { ...options, encoding: options.encoding ?? 'utf8', env });
}

/** Runs the Lite igniter across selected or all tools under `tools/src/` and returns parsed JSON summary. */
export function igniteAllTools(
  options: Readonly<{ check?: boolean; force?: boolean; clean?: boolean; tools?: readonly string[] }> = {},
): Readonly<{ tools: readonly { name: string; path: string; sha256: string; rebuilt: boolean }[]; checked: boolean }> {
  const args: string[] = [igniterScript, '--json'];
  if (options.clean) args.push('--clean');
  if (options.force) args.push('--force');
  if (options.check) args.push('--check');
  if (options.tools !== undefined) args.push(...options.tools);
  const result = spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`ignite failed (${result.status ?? result.signal}):\n${result.stdout}${result.stderr}`);
  }
  const parsed = JSON.parse(result.stdout) as { tools: { name: string; path: string; sha256: string; rebuilt: boolean }[]; checked: boolean };
  if (options.clean) ensuredTools.clear();
  for (const tool of parsed.tools) ensuredTools.set(tool.name, tool.path);
  return parsed;
}

/** Runs a child command synchronously with captured stdout or throws on failure. */
export function runCommand(command: string, args: string[], cwd = repoRoot, input?: Buffer): Buffer {
  const result = spawnSync(command, args, { cwd, input, timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout?.toString()}${result.stderr?.toString()}`);
  }
  return result.stdout;
}

/** Which artifact step produced the captured result. */
export type ArtifactPhase = 'typecheck' | 'compile' | 'run';

/** Captured artifact build/run result with raw streams and process status. */
export type ArtifactRun = Readonly<{
  phase: ArtifactPhase;
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
}>;

/** Fixed stdin and script arguments for one artifact execution. */
export type ArtifactOptions = Readonly<{ stdin?: string | Uint8Array; args?: readonly string[] }>;

/** Encodes fixed stdin without changing bytes. */
function inputBytes(input: string | Uint8Array | undefined): Buffer {
  return input === undefined ? Buffer.alloc(0) : Buffer.from(input);
}

let cachedCheckOptions: Record<string, unknown> | undefined;
let cachedNativeTsc: string | null | undefined;

/** Resolves the native TS 7 compiler binary lazily when present, caching the path lookup. */
function nativeTscPath(): string | undefined {
  if (cachedNativeTsc === undefined) {
    const exeName = process.platform === 'win32' ? 'tsc.exe' : 'tsc';
    const candidate = fileURLToPath(new URL(`./node_modules/@typescript/typescript-${process.platform}-${process.arch}/lib/${exeName}`, import.meta.url));
    cachedNativeTsc = existsSync(candidate) ? candidate : null;
  }
  return cachedNativeTsc ?? undefined;
}

/** Reads and memoizes the checking config that emitted TS artifacts must satisfy. */
function checkOptions(): Record<string, unknown> {
  if (cachedCheckOptions !== undefined) return cachedCheckOptions;
  const parsed: unknown = JSON.parse(readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('igniter tsconfig is not an object');
  }
  const options = (parsed as Record<string, unknown>)['compilerOptions'];
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new Error('igniter tsconfig has no compilerOptions object');
  }
  cachedCheckOptions = options as Record<string, unknown>;
  return cachedCheckOptions;
}

/** Runs one prepared TS artifact in an isolated process with fixed input. */
export type TsArtifactRunner = (options?: ArtifactOptions) => ArtifactRun;

/**
 * Strict-typechecks emitted TS once, then supplies a reusable process runner to
 * a synchronous callback. Every invocation has fresh process state; temporary
 * files are removed when the callback returns or throws. A failed typecheck is
 * returned by the runner without executing the artifact.
 */
export function withTsArtifact<Result>(source: string, use: (run: TsArtifactRunner) => Result): Result {
  return withTsArtifacts([source], runs => use(runs[0]!));
}

/** Strict-checks an artifact without loading or executing its program. */
export function checkTsArtifact(source: string): ArtifactRun {
  return withPreparedTsArtifacts([source], (_runs, checked) => checked);
}

/**
 * Strict-checks generated TS modules in one project, then supplies one isolated
 * process runner per source. Sources keep separate directories and module
 * scopes. Any checking failure prevents execution of every module in the batch.
 * The synchronous callback and cleanup contract match withTsArtifact.
 */
export function withTsArtifacts<Result>(sources: readonly string[], use: (runs: readonly TsArtifactRunner[]) => Result): Result {
  return withPreparedTsArtifacts(sources, runs => use(runs));
}

/** Owns checked TS runners until explicitly disposed. Each run still has fresh process state. */
export type PreparedTsArtifacts = Readonly<{
  runs: readonly TsArtifactRunner[]; checked: ArtifactRun; dispose: () => void;
}>;

/** Keeps callback-style callers scoped to their prepared artifact lifetime. */
function withPreparedTsArtifacts<Result>(sources: readonly string[], use: (runs: readonly TsArtifactRunner[], checked: ArtifactRun) => Result): Result {
  const prepared = prepareTsArtifacts(sources);
  try { return use(prepared.runs, prepared.checked); }
  finally { prepared.dispose(); }
}

/** Runs strict TypeScript checking once across the provided TS file paths. */
function runStrictTsc(files: readonly string[], directory: string): ArtifactRun {
  const config = join(directory, 'tsconfig.json');
  writeFileSync(config, JSON.stringify({
    compilerOptions: { ...checkOptions(), types: [], typeRoots: [], lib: ['ESNext'] },
    files,
  }));
  const nativeTsc = nativeTscPath();
  const checked = nativeTsc !== undefined
    ? spawnSync(nativeTsc, ['-p', config], { encoding: 'utf8', timeout: 30000 })
    : spawnSync(process.execPath, [fileURLToPath(new URL('./node_modules/typescript/bin/tsc', import.meta.url)), '-p', config], { encoding: 'utf8', timeout: 30000 });
  if (checked.error !== undefined) throw checked.error;
  return {
    phase: 'typecheck', status: checked.status, signal: checked.signal,
    stdout: Buffer.from(checked.stdout), stderr: Buffer.from(checked.stderr),
  };
}

/** Strict-checks existing TS artifact files in a single batch without copying or executing them. */
export function checkTsArtifactFiles(files: readonly string[]): ArtifactRun {
  if (files.length === 0) return { phase: 'typecheck', status: 0, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  const directory = mkdtempSync(join(tmpdir(), 'lite-check-ts-'));
  try {
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    return runStrictTsc(files, directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Strict-checks a batch once and provides isolated runners with an explicit lifetime. */
export function prepareTsArtifacts(sources: readonly string[], options: Readonly<{ timeoutMs?: number }> = {}): PreparedTsArtifacts {
  const timeout = options.timeoutMs ?? 10000;
  if (!Number.isSafeInteger(timeout) || timeout < 0) throw new Error('invalid TS artifact execution timeout');
  const success: ArtifactRun = { phase: 'typecheck', status: 0, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  if (sources.length === 0) return { runs: [], checked: success, dispose: () => {} };
  const directory = mkdtempSync(join(tmpdir(), 'lite-artifact-ts-'));
  let disposed = false;
  const dispose = (): void => {
    if (!disposed) { disposed = true; rmSync(directory, { recursive: true, force: true }); }
  };
  const active = (): void => { if (disposed) throw new Error('TS artifacts have been disposed'); };
  try {
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    const artifacts: string[] = [];
    const runners = sources.map((source, index) => {
      const itemDirectory = join(directory, String(index));
      mkdirSync(itemDirectory);
      const artifact = join(itemDirectory, 'artifact.ts');
      const runner = join(itemDirectory, 'runner.ts');
      writeFileSync(artifact, source);
      writeFileSync(runner, "import { main } from './artifact.ts';\nimport { writeSync } from 'node:fs';\nconst tok = {}; let code = 0; const origExit = process.exit;\n(process as unknown as { exit: (c?: number) => never }).exit = (c?: number): never => { code = c ?? 0; throw tok; };\ntry { process.stdout.write(main((text: string): void => { writeSync(1, text); })); }\ncatch (e) { if (e === tok) process.exitCode = code; else throw e; }\nfinally { process.exit = origExit; }\n");
      artifacts.push(artifact);
      return runner;
    });
    const check = runStrictTsc(artifacts, directory);
    if (check.status !== 0 || check.signal !== null) {
      return { runs: sources.map(() => () => { active(); return check; }), checked: check, dispose };
    }
    return { runs: runners.map((runner): TsArtifactRunner => (options = {}) => {
      active();
      const stdoutPath = `${runner}.stdout`;
      const stderrPath = `${runner}.stderr`;
      let stdout: number | undefined;
      let stderr: number | undefined;
      try {
        // Generated programs write synchronously, including before exit/faults.
        // Node's captured pipes can short-write or throw EAGAIN under pressure.
        // Fresh regular files retain exact bytes without buffering past exit.
        stdout = openSync(stdoutPath, 'w');
        stderr = openSync(stderrPath, 'w');
        const result = spawnSync(process.execPath, [runner, ...(options.args ?? [])], {
          input: inputBytes(options.stdin), timeout, stdio: ['pipe', stdout, stderr],
        });
        if (result.error !== undefined) throw result.error;
        // Bound the buffers read into the parent, as with the former pipe capture.
        if ([stdoutPath, stderrPath].some(path => statSync(path).size > 16 * 1024 * 1024)) {
          throw new Error('TS artifact output exceeds 16 MiB capture limit');
        }
        return {
          phase: 'run', status: result.status, signal: result.signal,
          stdout: readFileSync(stdoutPath), stderr: readFileSync(stderrPath),
        };
      } finally {
        if (stderr !== undefined) closeSync(stderr);
        if (stdout !== undefined) closeSync(stdout);
      }
    }), checked: check, dispose };
  } catch (error) {
    dispose(); throw error;
  }
}

/** Strict-typechecks and runs one emitted TS artifact, capturing raw streams. */
export function runTsArtifact(source: string, options: ArtifactOptions = {}): ArtifactRun {
  return withTsArtifact(source, run => run(options));
}

/**
 * Writes emitted C to a temporary file, compiles it with
 * `-std=c11 -Wall -Wextra -Werror` and the math library (`-lm`), then runs it and captures raw streams.
 * A missing C compiler is an error, so callers that support skipping can catch
 * the `C compiler unavailable` message.
 */
export function runCArtifact(source: string, options: ArtifactOptions = {}): ArtifactRun {
  const directory = mkdtempSync(join(tmpdir(), 'lite-artifact-c-'));
  try {
    const artifact = join(directory, 'artifact.c');
    const executable = join(directory, 'artifact');
    writeFileSync(artifact, source);
    const cc = process.env['CC'] ?? 'cc';
    const compiled = spawnSync(cc, ['-std=c11', '-Wall', '-Wextra', '-Werror', artifact, '-o', executable, '-lm'], {
      encoding: 'utf8', timeout: 30000,
    });
    if (compiled.error !== undefined) {
      if ('code' in compiled.error && compiled.error.code === 'ENOENT') {
        throw new Error(`${cc}: C compiler unavailable`);
      }
      throw compiled.error;
    }
    if (compiled.status !== 0) {
      return {
        phase: 'compile', status: compiled.status, signal: compiled.signal,
        stdout: Buffer.from(compiled.stdout), stderr: Buffer.from(compiled.stderr),
      };
    }
    const result = spawnSync(executable, [], { input: inputBytes(options.stdin), timeout: 10000 });
    if (result.error !== undefined) throw result.error;
    return {
      phase: 'run', status: result.status, signal: result.signal,
      stdout: result.stdout ?? Buffer.alloc(0), stderr: result.stderr ?? Buffer.alloc(0),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Validated ordered compiler manifest: one target and its relative source paths. */
export type Manifest = Readonly<{ target: CompilerTarget; files: readonly string[] }>;
/** Existing code-generation targets; this is host plumbing, not language syntax. */
export type CompilerTarget = 'ts' | 'c';
/** Raw streams and process-style status from a compiler invocation. */
export type CompilerResult = Readonly<{ status: number; stdout: Buffer; stderr: Buffer }>;
/** Complete source plus an optional diagnostic name and canonical filesystem path. */
export type CompilerInput = Readonly<{ text: string; name?: string; rootPath?: string; cwd?: string; options?: readonly string[] }>;
/** Selected artifact and exact source/builder identities. */
export type CompilerBuild = Readonly<{
  target: CompilerTarget;
  path: string;
  sourceSha256: string;
  artifactSha256: string;
  builderSha256: string;
  dependencies: readonly string[];
  cached: boolean;
}>;

const cachedBuilds = new Map<CompilerTarget, CompilerBuild>();

/** Validates one compiler manifest JSON file through the Lite `compiler-build` tool. */
export function loadManifest(path: string): Manifest {
  const resolved = resolve(path);
  const result = spawnTool('compiler-build', ['--manifest', resolved], {
    cwd: dirname(resolved), encoding: 'utf8', timeout: 30_000,
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error((String(result.stderr || result.stdout || `manifest validation failed (${result.status ?? result.signal})`)).trim());
  }
  return JSON.parse(String(result.stdout)) as Manifest;
}

/** Selects and builds the current generated compiler artifact via `tools/src/compiler-build.lts`. */
export function buildCompiler(target: CompilerTarget): CompilerBuild {
  const memo = cachedBuilds.get(target);
  if (memo !== undefined && existsSync(memo.path)) return memo;
  const result = spawnTool('compiler-build', ['--root', repoRoot, '--target', target], {
    cwd: repoRoot, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    throw new Error((String(result.stderr || result.stdout || `compiler build failed (${result.status ?? result.signal})`)).trim());
  }
  const built = JSON.parse(String(result.stdout)) as CompilerBuild;
  cachedBuilds.set(target, built);
  return built;
}

/** Selects the current TS compiler via `tools/src/compiler-build.lts`. */
export function buildTsCompiler(): CompilerBuild { return buildCompiler('ts'); }

/** Selects the current C compiler; builds and caches it from compiler sources if needed. */
export function buildCCompiler(): CompilerBuild { return buildCompiler('c'); }

class InProcessExit {
  readonly code: number;
  constructor(code: number) { this.code = code; }
}

type InProcessCompilerFactory = (proc: unknown) => (write: (text: string) => void) => string | undefined;
const inProcessFactories = new Map<string, InProcessCompilerFactory>();

function getInProcessCompilerFactory(artifact: string): InProcessCompilerFactory | undefined {
  if (!artifact.endsWith('.ts') || process.env['LITE_NO_INPROC_COMPILER'] === '1') return undefined;
  let st: nodeFs.Stats;
  try { st = statSync(artifact); } catch { return undefined; }
  const cacheKey = `${artifact}\0${st.mtimeMs}\0${st.size}`;
  const hit = inProcessFactories.get(cacheKey);
  if (hit !== undefined) return hit;
  try {
    const raw = readFileSync(artifact, 'utf8');
    if (!raw.includes('export function main(')) return undefined;
    const stripped = stripTypeScriptTypes(raw)
      .replace(/\nif\s*\(\s*\(?\s*import\.meta\b[\s\S]*$/, '')
      .replace(/export function main\b/, 'function main');
    const factory = new Function('process', `${stripped}\nreturn (w) => main(w);`) as InProcessCompilerFactory;
    inProcessFactories.set(cacheKey, factory);
    return factory;
  } catch {
    return undefined;
  }
}

/** Compiles one whole Lite source through a generated compiler artifact path. */
export function invokeCompilerArtifact(artifact: string, input: CompilerInput): CompilerResult {
  const cwd = input.cwd ?? process.cwd();
  const rootPath = input.rootPath ?? (input.name === undefined || input.name === '' ? resolve(cwd, '__lite_stdin__.lts') : resolve(cwd, input.name));
  const cliArgs = [process.execPath, artifact, '--stdin', '--name', input.name ?? '', '--root', rootPath, ...(input.options ?? [])];

  const factory = getInProcessCompilerFactory(artifact);
  if (factory !== undefined) {
    const stdinBuf = Buffer.from(input.text, 'utf8');
    let stdinPos = 0;
    const outChunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    const fsProxy = new Proxy(nodeFs, {
      get(target, prop) {
        if (prop === 'readSync') {
          return (fd: number, buf: Uint8Array, off: number, len: number, pos: number | null) => {
            if (fd === 0) {
              if (stdinPos >= stdinBuf.length) return 0;
              const n = Math.min(len, stdinBuf.length - stdinPos);
              stdinBuf.copy(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength), off, stdinPos, stdinPos + n);
              stdinPos += n;
              return n;
            }
            return target.readSync(fd, buf, off, len, pos);
          };
        }
        if (prop === 'readFileSync') {
          return (pathOrFd: nodeFs.PathOrFileDescriptor, opts?: unknown) => {
            if (pathOrFd === 0) {
              const rest = stdinBuf.subarray(stdinPos);
              stdinPos = stdinBuf.length;
              if (typeof opts === 'string') return rest.toString(opts as BufferEncoding);
              if (opts && typeof opts === 'object' && 'encoding' in opts && typeof (opts as { encoding?: unknown }).encoding === 'string') {
                return rest.toString((opts as { encoding: BufferEncoding }).encoding);
              }
              return Buffer.from(rest);
            }
            return (target.readFileSync as (p: nodeFs.PathOrFileDescriptor, o?: unknown) => unknown)(pathOrFd, opts);
          };
        }
        if (prop === 'writeSync') {
          return (fd: number, data: unknown, ...rest: unknown[]) => {
            if (fd === 1 || fd === 2) {
              const b = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
              (fd === 1 ? outChunks : errChunks).push(b);
              return b.length;
            }
            return (target.writeSync as (...a: unknown[]) => number)(fd, data, ...rest);
          };
        }
        const val = Reflect.get(target, prop);
        return typeof val === 'function' ? val.bind(target) : val;
      },
    });
    const procProxy = {
      argv: cliArgs,
      env: process.env,
      execPath: process.execPath,
      cwd: () => cwd,
      exit(code?: number): never { throw new InProcessExit(code ?? 0); },
      getBuiltinModule(id: string) {
        if (id === 'node:fs') return fsProxy;
        return (process as unknown as { getBuiltinModule: (m: string) => unknown }).getBuiltinModule(id);
      },
    };
    let status = 0;
    try {
      const mainFn = factory(procProxy);
      const tail = mainFn((t: string) => { outChunks.push(Buffer.from(t, 'utf8')); });
      if (typeof tail === 'string' && tail.length > 0) outChunks.push(Buffer.from(tail, 'utf8'));
    } catch (err) {
      if (err instanceof InProcessExit) status = err.code;
      else throw err;
    }
    return { status, stdout: Buffer.concat(outChunks), stderr: Buffer.concat(errChunks) };
  }

  const result = spawnSync(process.execPath, cliArgs.slice(1), {
    input: input.text, cwd, timeout: 0, maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null || result.status === null) throw new Error(`generated compiler terminated: ${result.signal ?? 'no exit status'}`);
  return { status: result.status, stdout: result.stdout ?? Buffer.alloc(0), stderr: result.stderr ?? Buffer.alloc(0) };
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
