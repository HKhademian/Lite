/** Host-only assembly and process glue. Both target compilers are Lite-generated TS programs. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBundle, type LineMapEntry } from '../igniter/loader.ts';
import { seed } from './bootstrap/seed.ts';
import { cSeed } from './bootstrap/c-seed.ts';

/** Existing code-generation targets; this is host plumbing, not language syntax. */
export type CompilerTarget = 'ts' | 'c';

/** Raw streams and process-style status from a compiler invocation. */
export type CompilerResult = Readonly<{ status: number; stdout: Buffer; stderr: Buffer }>;
/** Complete source plus optional diagnostic name or flattened-source line map. */
export type CompilerInput = Readonly<{ text: string; name?: string; lineMap?: readonly LineMapEntry[] }>;
/** Selected artifact and exact source/builder identities. */
export type CompilerBuild = Readonly<{ target: CompilerTarget; path: string; sourceSha256: string; artifactSha256: string; builderSha256: string; dependencies: readonly string[]; cached: boolean }>;

const root = fileURLToPath(new URL('../', import.meta.url));
const seedPath = fileURLToPath(new URL(`./bootstrap/${seed.artifact}`, import.meta.url));
const entryPath = fileURLToPath(new URL('./entry.ts', import.meta.url));

/** Computes a lowercase SHA-256 identity without normalizing source bytes. */
function hash(bytes: string | Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }

/** Executes one generated compiler with isolated process state and no stage-0 fallback. */
function invoke(artifact: string, text: string, name?: string): CompilerResult {
  const result = spawnSync(process.execPath, [entryPath, artifact, ...(name === undefined ? [] : [name])], {
    input: text, timeout: 0, maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null || result.status === null) throw new Error(`generated compiler terminated: ${result.signal ?? 'no exit status'}`);
  return { status: result.status, stdout: result.stdout ?? Buffer.alloc(0), stderr: result.stderr ?? Buffer.alloc(0) };
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
function cachedBuild(directory: string, sourceSha256: string, target: CompilerTarget, dependencies: readonly string[]): CompilerBuild {
  const record: unknown = JSON.parse(readFileSync(join(directory, 'provenance.json'), 'utf8'));
  const path = join(directory, 'compiler.ts');
  const artifactSha256 = hash(readFileSync(path));
  if (typeof record !== 'object' || record === null || !('sourceSha256' in record) ||
      record.sourceSha256 !== sourceSha256 || !('builderSha256' in record) ||
      record.builderSha256 !== seed.artifactSha256 || !('artifactSha256' in record) ||
      record.artifactSha256 !== artifactSha256 || !('target' in record) || record.target !== target ||
      !('dependencies' in record) || JSON.stringify(record.dependencies) !== JSON.stringify(dependencies)) {
    throw new Error(`compiler cache integrity mismatch: ${directory}`);
  }
  return { target, path, sourceSha256, artifactSha256, builderSha256: seed.artifactSha256, dependencies, cached: true };
}

/**
 * Selects the verified seed for its original S, or rebuilds changed S with that
 * seed and strict-checks it before atomic cache publication. No T00 code runs.
 */
export function buildCompiler(target: CompilerTarget): CompilerBuild {
  if (hash(readFileSync(seedPath)) !== seed.artifactSha256) throw new Error('selected TS bootstrap seed hash mismatch');
  const known = target === 'ts' ? seed : cSeed;
  const bundle = loadBundle(resolve(root, known.sourceManifest));
  const source = bundle.text;
  const sourceSha256 = hash(source);
  if (sourceSha256 === known.sourceSha256 && (target === 'ts' || cSeed.builderSha256 === seed.artifactSha256)) {
    const path = fileURLToPath(new URL(`./bootstrap/${known.artifact}`, import.meta.url));
    const artifactSha256 = hash(readFileSync(path));
    if (artifactSha256 !== known.artifactSha256) throw new Error(`${target} bootstrap seed hash mismatch`);
    return { target, path, sourceSha256, artifactSha256, builderSha256: seed.artifactSha256, dependencies: bundle.dependencies, cached: false };
  }
  const cache = resolve(root, '.cache/compiler');
  const key = hash(`${target}:${seed.artifactSha256}:${sourceSha256}:${JSON.stringify(bundle.dependencies)}`);
  const destination = join(cache, key);
  if (existsSync(destination)) return cachedBuild(destination, sourceSha256, target, bundle.dependencies);
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(join(cache, 'build-'));
  try {
    const generated = invoke(seedPath, source);
    if (generated.status !== 0 || generated.stderr.length !== 0) {
      const diagnostic = mapDiagnostics(generated.stderr, bundle.lineMap).toString('utf8');
      throw new Error(`${seed.artifact} cannot rebuild current compiler source (${generated.status}):\n${diagnostic}`);
    }
    const artifact = join(temporary, 'compiler.ts');
    writeFileSync(artifact, generated.stdout);
    writeFileSync(join(temporary, 'package.json'), '{"type":"module"}\n');
    checkArtifact(artifact, temporary);
    writeFileSync(join(temporary, 'provenance.json'), JSON.stringify({
      target, sourceSha256, builderSha256: seed.artifactSha256, artifactSha256: hash(generated.stdout),
      dependencies: bundle.dependencies,
    }, null, 2) + '\n');
    try {
      renameSync(temporary, destination);
    } catch (error: unknown) {
      if (!existsSync(destination)) throw error;
      // Another builder may have published this exact source; verify it below.
    }
    return cachedBuild(destination, sourceSha256, target, bundle.dependencies);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

/** Maps only source-positioned diagnostic rows; columns and other messages are unchanged. */
function mapDiagnostics(stderr: Buffer, lineMap: readonly LineMapEntry[]): Buffer {
  return Buffer.from(stderr.toString('utf8').split('\n').map(line => {
    const match = /^(\d+):(\d+): (.*)$/.exec(line);
    if (match === null) return line;
    const mapped = lineMap[Number(match[1]) - 1];
    if (mapped === undefined) throw new Error(`unmapped bundle diagnostic line ${match[1]}`);
    return `${mapped.path}:${mapped.line}:${match[2]}: ${match[3]}`;
  }).join('\n'));
}

/** Selects the current TS compiler; retained for existing internal callers. */
export function buildTsCompiler(): CompilerBuild { return buildCompiler('ts'); }

/** Compiles one whole Lite source with a current Lite-written target compiler. */
export function compileTarget(target: CompilerTarget, input: CompilerInput): CompilerResult {
  const selected = buildCompiler(target);
  const result = invoke(selected.path, input.text, input.lineMap === undefined ? input.name : undefined);
  return input.lineMap === undefined ? result : { ...result, stderr: mapDiagnostics(result.stderr, input.lineMap) };
}

/** Compiles to TS through the current generated compiler. */
export function compileTs(input: CompilerInput): CompilerResult { return compileTarget('ts', input); }
