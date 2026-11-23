#!/usr/bin/env node
/** Verifies every Gym exercise's canonical solution and expected starter failure across all visible & hidden cases. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildTsCompiler, compileBuiltCompiler, type CompilerBuild } from '../igniter/artifacts.ts';
import { rootDir } from './chrome.ts';
import { stripLiteTs } from './strip-ts.ts';

export type GymBelt = 'white' | 'amber' | 'emerald' | 'obsidian';
export type GymMode = 'drill' | 'kata';

export type GymTestCase = Readonly<{
  name: string;
  stdin: string;
  args: readonly string[];
  expectedStdout: string;
}>;

export type GymExerciseSpec = Readonly<{
  id: string;
  slug: string;
  title: string;
  mode: GymMode;
  belt: GymBelt;
  domain: string;
  subGroup: string;
  promptFile: string;
  starterFile: string;
  solutionFile: string;
  brokenStarterSyntax: boolean;
  expectedStarterFailure: 'compile-error' | 'wrong-output';
  hints: readonly string[];
  relatedDocs: readonly string[];
  relatedLessons: readonly string[];
  visibleCases: readonly GymTestCase[];
  hiddenCases: readonly GymTestCase[];
}>;

export type GymCatalog = Readonly<{
  schemaVersion: number;
  title: string;
  description: string;
  exercises: readonly GymExerciseSpec[];
}>;

class GymExitSignal {
  readonly code: number;
  constructor(code: number) {
    this.code = code;
  }
}

const encoder = new TextEncoder();

export function runStrippedGymJs(
  jsRunner: (proc: unknown) => string | undefined,
  args: readonly string[],
  stdinText: string,
): Readonly<{ ok: boolean; exitCode: number; stdout: string; stderr: string }> {
  const stdinBytes = encoder.encode(stdinText);
  let offset = 0;
  let stdout = '';
  let stderr = '';

  const stubProcess = {
    argv: ['node', 'gym.js', ...args],
    exit(code: number): never {
      throw new GymExitSignal(code);
    },
    getBuiltinModule(name: string) {
      if (name !== 'node:fs') throw new Error(`Unsupported module: ${name}`);
      return {
        readSync(_fd: number, buf: Uint8Array, bufOffset: number, length: number): number {
          if (offset >= stdinBytes.length) return 0;
          const n = Math.min(length, stdinBytes.length - offset);
          buf.set(stdinBytes.subarray(offset, offset + n), bufOffset);
          offset += n;
          return n;
        },
        writeSync(fd: number, text: string): number {
          if (fd === 1) stdout += text;
          else stderr += text;
          return text.length;
        },
      };
    },
  };

  const prevProcess = (globalThis as unknown as { process: unknown }).process;
  (globalThis as unknown as { process: unknown }).process = stubProcess;
  try {
    const ret = jsRunner(stubProcess);
    return { ok: true, exitCode: 0, stdout: stdout + (ret ?? ''), stderr };
  } catch (err) {
    if (err instanceof GymExitSignal) {
      return { ok: err.code === 0, exitCode: err.code, stdout, stderr };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, exitCode: 1, stdout, stderr: stderr ? `${stderr}\n${message}` : message };
  } finally {
    (globalThis as unknown as { process: unknown }).process = prevProcess;
  }
}

function buildRunnerFromTs(tsSource: string): (proc: unknown) => string | undefined {
  const js = stripLiteTs(tsSource).replace(/\bexport function main\b/, 'function main');
  return new Function('process', `${js}\nreturn main();`) as (proc: unknown) => string | undefined;
}

export function verifyGymCorpus(tsCompiler?: CompilerBuild): Readonly<{
  exerciseCount: number;
  drillCount: number;
  kataCount: number;
  caseCount: number;
  compiledSolutions: ReadonlyMap<string, Readonly<{ starterSource: string; solutionSource: string; solutionTs: string }>>;
}> {
  const compiler = tsCompiler ?? buildTsCompiler();
  const catalogPath = join(rootDir, 'language', 'gym', 'catalog.json');
  const catalogRaw = readFileSync(catalogPath, 'utf8');
  const catalog = JSON.parse(catalogRaw) as GymCatalog;

  let gymCacheFile: string | undefined;
  if (process.env['LITE_SITE_NO_CACHE'] !== '1') {
    const h = createHash('sha256').update('gym-v1\0').update(readFileSync(compiler.path)).update('\0').update(catalogRaw);
    let allExist = true;
    for (const ex of catalog.exercises) {
      for (const rel of [ex.promptFile, ex.starterFile, ex.solutionFile, ...ex.relatedDocs]) {
        if (!existsSync(resolve(rootDir, rel))) { allExist = false; break; }
      }
      if (!allExist) break;
      h.update('\0').update(readFileSync(resolve(rootDir, ex.starterFile)));
      h.update('\0').update(readFileSync(resolve(rootDir, ex.solutionFile)));
    }
    if (allExist) {
      const key = h.digest('hex').slice(0, 32);
      gymCacheFile = join(rootDir, 'dist', 'cache', 'site-gym', `${key}.json`);
      if (existsSync(gymCacheFile)) {
        try {
          const cached = JSON.parse(readFileSync(gymCacheFile, 'utf8')) as {
            exerciseCount: number;
            drillCount: number;
            kataCount: number;
            caseCount: number;
            entries: [string, { starterSource: string; solutionSource: string; solutionTs: string }][];
          };
          return {
            exerciseCount: cached.exerciseCount,
            drillCount: cached.drillCount,
            kataCount: cached.kataCount,
            caseCount: cached.caseCount,
            compiledSolutions: new Map(cached.entries),
          };
        } catch {
          /* ignore corrupt cache entry and rebuild */
        }
      }
    }
  }
  const failures: string[] = [];
  const compiledSolutions = new Map<string, Readonly<{ starterSource: string; solutionSource: string; solutionTs: string }>>();

  let drillCount = 0;
  let kataCount = 0;
  let caseCount = 0;
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const ex of catalog.exercises) {
    if (seenIds.has(ex.id)) failures.push(`duplicate gym id: ${ex.id}`);
    seenIds.add(ex.id);
    if (seenSlugs.has(ex.slug)) failures.push(`duplicate gym slug: ${ex.slug}`);
    seenSlugs.add(ex.slug);

    if (ex.mode === 'drill') drillCount += 1;
    else kataCount += 1;

    for (const rel of [ex.promptFile, ex.starterFile, ex.solutionFile, ...ex.relatedDocs]) {
      if (!existsSync(resolve(rootDir, rel))) {
        failures.push(`${ex.id}: missing referenced file ${rel}`);
      }
    }

    const starterSource = readFileSync(resolve(rootDir, ex.starterFile), 'utf8');
    const solutionSource = readFileSync(resolve(rootDir, ex.solutionFile), 'utf8');
    const allCases = [...ex.visibleCases, ...ex.hiddenCases];
    caseCount += allCases.length;

    const solCompile = compileBuiltCompiler(compiler, { text: solutionSource, name: ex.solutionFile, cwd: rootDir });
    if (solCompile.status !== 0) {
      failures.push(`${ex.id} solution compile failed:\n${solCompile.stderr.toString('utf8')}`);
      continue;
    }
    const solutionTs = solCompile.stdout.toString('utf8');
    compiledSolutions.set(ex.id, { starterSource, solutionSource, solutionTs });

    const solRunner = buildRunnerFromTs(solutionTs);
    for (const tc of allCases) {
      const res = runStrippedGymJs(solRunner, tc.args, tc.stdin);
      if (!res.ok || res.exitCode !== 0 || res.stdout !== tc.expectedStdout) {
        failures.push(
          `${ex.id} solution failed case "${tc.name}": exit=${String(res.exitCode)} expected=${JSON.stringify(tc.expectedStdout)} actual=${JSON.stringify(res.stdout)} stderr=${JSON.stringify(res.stderr)}`,
        );
      }
    }

    const starterCompile = compileBuiltCompiler(compiler, { text: starterSource, name: ex.starterFile, cwd: rootDir });
    if (ex.expectedStarterFailure === 'compile-error') {
      if (starterCompile.status === 0) {
        failures.push(`${ex.id} starter was expected to fail compilation, but succeeded`);
      }
    } else {
      if (starterCompile.status !== 0) {
        failures.push(`${ex.id} starter was expected to compile with wrong-output, but failed compilation:\n${starterCompile.stderr.toString('utf8')}`);
      } else {
        const starterRunner = buildRunnerFromTs(starterCompile.stdout.toString('utf8'));
        const anyFail = allCases.some((tc) => {
          const res = runStrippedGymJs(starterRunner, tc.args, tc.stdin);
          return !res.ok || res.exitCode !== 0 || res.stdout !== tc.expectedStdout;
        });
        if (!anyFail) {
          failures.push(`${ex.id} starter passed all cases unexpectedly (expected wrong-output)`);
        }
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`Gym corpus verification failed (${String(failures.length)} issues):\n${failures.join('\n')}`);
  }

  if (gymCacheFile !== undefined) {
    mkdirSync(dirname(gymCacheFile), { recursive: true });
    writeFileSync(gymCacheFile, JSON.stringify({
      exerciseCount: catalog.exercises.length,
      drillCount,
      kataCount,
      caseCount,
      entries: Array.from(compiledSolutions.entries()),
    }));
  }

  return {
    exerciseCount: catalog.exercises.length,
    drillCount,
    kataCount,
    caseCount,
    compiledSolutions,
  };
}

if (import.meta.main) {
  const result = verifyGymCorpus();
  console.log(
    `Verified ${String(result.exerciseCount)} Gym exercises (${String(result.drillCount)} drills, ${String(result.kataCount)} katas, ${String(result.caseCount)} cases).`,
  );
}
