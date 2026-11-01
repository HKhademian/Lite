/** Internal artifact runner for emitted bootstrap TS and C. */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

/**
 * Writes emitted TS to a temporary package, strict-typechecks it with the
 * repository TypeScript, then runs a thin adapter and captures raw streams.
 */
export function runTsArtifact(source: string, options: ArtifactOptions = {}): ArtifactRun {
  const directory = mkdtempSync(join(tmpdir(), 'lite-artifact-ts-'));
  try {
    const artifact = join(directory, 'artifact.ts');
    const runner = join(directory, 'runner.ts');
    const config = join(directory, 'tsconfig.json');
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    writeFileSync(artifact, source);
    writeFileSync(runner, "import { main } from './artifact.ts';\nprocess.stdout.write(main());\n");
    writeFileSync(config, JSON.stringify({
      compilerOptions: { ...checkOptions(), types: [], typeRoots: [], lib: ['ESNext'] },
      files: [artifact],
    }));
    const tsc = new URL('./node_modules/typescript/bin/tsc', import.meta.url).pathname;
    const checked = spawnSync(process.execPath, [tsc, '-p', config], { encoding: 'utf8', timeout: 30000 });
    if (checked.error !== undefined) throw checked.error;
    if (checked.status !== 0) {
      return {
        phase: 'typecheck', status: checked.status, signal: checked.signal,
        stdout: Buffer.from(checked.stdout), stderr: Buffer.from(checked.stderr),
      };
    }
    const result = spawnSync(process.execPath, [runner, ...(options.args ?? [])],
      { input: inputBytes(options.stdin), timeout: 10000 });
    if (result.error !== undefined) throw result.error;
    return {
      phase: 'run', status: result.status, signal: result.signal,
      stdout: result.stdout ?? Buffer.alloc(0), stderr: result.stderr ?? Buffer.alloc(0),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Writes emitted C to a temporary file, compiles it with
 * `-std=c11 -Wall -Wextra -Werror`, then runs it and captures raw streams.
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
    const compiled = spawnSync(cc, ['-std=c11', '-Wall', '-Wextra', '-Werror', artifact, '-o', executable], {
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
