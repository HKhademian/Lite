#!/usr/bin/env node
/** Three-generation generated TS fixed point. */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { loadManifest } from '../../igniter/loader.ts';
import { readSourceInput } from '../source.ts';
import { buildCompiler } from '../host.ts';
import { fail, hashBytes, mainFile, repository, revision, selectedArtifact, strictArtifact, toolIdentities, toolOptions, writeJson } from './tooling.ts';

/** Rebuilds current S through three checked TS generations. */
export function selfHost(args: readonly string[]): void {
  const options = toolOptions(args, ['out', 'artifact']);
  const current = buildCompiler('ts');
  const selected = selectedArtifact(options.values.get('artifact'));
  const manifestPath = join(repository, 'compiler/manifests/ts.json');
  const manifest = loadManifest(manifestPath);
  if (manifest.files.length !== 1) throw new Error('self-host ladder requires one TS source root');
  const source = readSourceInput(resolve(dirname(manifestPath), manifest.files[0]!));
  const sourceName = relative(repository, source.path).split(sep).join('/');
  const out = options.values.has('out') ? resolve(options.values.get('out')!) : mkdtempSync(join(tmpdir(), 'lite-generated-ladder-'));
  mkdirSync(out, { recursive: true }); writeFileSync(join(out, 'package.json'), '{"type":"module"}\n');
  writeFileSync(join(out, 'S.lts'), source.text);
  const generations: { generation: number; sourceSha256: string; builderSha256: string; artifactSha256: string; bytes: number; compileProcessMs: number; strictCheckMs: number; path: string }[] = [];
  let builder = selected.bytes;
  let builderPath = selected.path;
  for (let generation = 1; generation <= 3; generation += 1) {
    const start = performance.now();
    const actual = spawnSync(process.execPath, [join(repository, 'compiler/entry.ts'), builderPath, sourceName], {
      input: source.text, timeout: 0, maxBuffer: 128 * 1024 * 1024,
    });
    const compileProcessMs = performance.now() - start;
    if (actual.error !== undefined) throw actual.error;
    if (actual.status !== 0 || actual.signal !== null || actual.stderr.length !== 0) throw new Error(`generation ${generation} failed (${actual.status ?? actual.signal}):\n${actual.stderr}`);
    const strictCheckMs = strictArtifact(actual.stdout.toString());
    const path = join(out, `generation-${generation}.ts`); writeFileSync(path, actual.stdout);
    generations.push({ generation, sourceSha256: selected.currentSourceSha256, builderSha256: hashBytes(builder), artifactSha256: hashBytes(actual.stdout),
      bytes: actual.stdout.length, compileProcessMs, strictCheckMs, path });
    builder = actual.stdout;
    builderPath = path;
  }
  const fixedPoint = generations.every(item => item.artifactSha256 === generations[0]!.artifactSha256);
  const summary = { phase: 'generated-fixed-point', revision: revision(), node: process.version, out,
    selected: { artifactSha256: selected.sha256, currentSourceSha256: selected.currentSourceSha256, selectedCompilerSha256: selected.selectedCompilerSha256, selectedCompilerBuilderSha256: selected.selectedCompilerBuilderSha256, supplied: selected.supplied },
    toolSources: toolIdentities(['compiler/scripts/self-host.ts', 'compiler/scripts/tooling.ts', 'compiler/host.ts', 'igniter/artifacts.ts']),
    source: { bytes: current.dependencies.reduce((sum, path) => sum + readFileSync(resolve(repository, path)).length, 0), sha256: selected.currentSourceSha256 }, generations, fixedPoint,
    matchesSelectedCompiler: hashBytes(builder) === selected.selectedCompilerSha256,
    equalsSelectedBuilder: hashBytes(builder) === selected.sha256 };
  // Check persisted bytes before publishing the ladder summary.
  for (const item of generations) if (hashBytes(readFileSync(item.path)) !== item.artifactSha256) throw new Error('persisted generation identity mismatch');
  writeJson(join(out, 'ladder.json'), summary); process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  if (!fixedPoint) process.exitCode = 1;
}
if (mainFile(import.meta.url)) { try { selfHost(process.argv.slice(2)); } catch (error) { fail(error); } }
