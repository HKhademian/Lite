/** Internal artifact runner for emitted bootstrap TS and C. */

import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

/** Reads the checking config that emitted TS artifacts must satisfy. */
function checkOptions(): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('igniter tsconfig is not an object');
  }
  const options = (parsed as Record<string, unknown>)['compilerOptions'];
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new Error('igniter tsconfig has no compilerOptions object');
  }
  return options as Record<string, unknown>;
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

/**
 * Strict-checks generated TS modules in one project, then supplies one isolated
 * process runner per source. Sources keep separate directories and module
 * scopes. Any checking failure prevents execution of every module in the batch.
 * The synchronous callback and cleanup contract match withTsArtifact.
 */
export function withTsArtifacts<Result>(sources: readonly string[], use: (runs: readonly TsArtifactRunner[]) => Result): Result {
  if (sources.length === 0) return use([]);
  const directory = mkdtempSync(join(tmpdir(), 'lite-artifact-ts-'));
  try {
    const config = join(directory, 'tsconfig.json');
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    const artifacts: string[] = [];
    const runners = sources.map((source, index) => {
      const itemDirectory = join(directory, String(index));
      mkdirSync(itemDirectory);
      const artifact = join(itemDirectory, 'artifact.ts');
      const runner = join(itemDirectory, 'runner.ts');
      writeFileSync(artifact, source);
      writeFileSync(runner, "import { main } from './artifact.ts';\nimport { writeSync } from 'node:fs';\nprocess.stdout.write(main((text: string): void => { writeSync(1, text); }));\n");
      artifacts.push(artifact);
      return runner;
    });
    writeFileSync(config, JSON.stringify({
      compilerOptions: { ...checkOptions(), types: [], typeRoots: [], lib: ['ESNext'] },
      files: artifacts,
    }));
    const tsc = new URL('./node_modules/typescript/bin/tsc', import.meta.url).pathname;
    const checked = spawnSync(process.execPath, [tsc, '-p', config], { encoding: 'utf8', timeout: 30000 });
    if (checked.error !== undefined) throw checked.error;
    if (checked.status !== 0) {
      const failure: ArtifactRun = {
        phase: 'typecheck', status: checked.status, signal: checked.signal,
        stdout: Buffer.from(checked.stdout), stderr: Buffer.from(checked.stderr),
      };
      return use(sources.map(() => () => failure));
    }
    return use(runners.map((runner): TsArtifactRunner => (options = {}) => {
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
          input: inputBytes(options.stdin), timeout: 10000, stdio: ['pipe', stdout, stderr],
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
    }));
  } finally {
    rmSync(directory, { recursive: true, force: true });
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
