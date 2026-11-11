#!/usr/bin/env node
/** Three-generation generated TS fixed point. */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadBundle } from '../../igniter/loader.ts';
import { prepareTsArtifacts } from '../../igniter/artifacts.ts';
import { fail, hashBytes, mainFile, repository, revision, selectedArtifact, strictArtifact, toolIdentities, toolOptions, writeJson } from './tooling.ts';

/** Rebuilds current S through three checked TS generations. */
export function selfHost(args: readonly string[]): void {
  const options = toolOptions(args, ['out', 'artifact']);
  const selected = selectedArtifact(options.values.get('artifact'));
  const source = loadBundle(join(repository, 'compiler/manifests/ts.json')).text;
  const out = options.values.has('out') ? resolve(options.values.get('out')!) : mkdtempSync(join(tmpdir(), 'lite-generated-ladder-'));
  mkdirSync(out, { recursive: true }); writeFileSync(join(out, 'package.json'), '{"type":"module"}\n');
  writeFileSync(join(out, 'S.lts'), source);
  const generations: { generation: number; sourceSha256: string; builderSha256: string; artifactSha256: string; bytes: number; compileProcessMs: number; strictCheckMs: number; path: string }[] = [];
  let builder = selected.bytes;
  for (let generation = 1; generation <= 3; generation += 1) {
    const prepared = prepareTsArtifacts([builder.toString()], { timeoutMs: 0 });
    try {
      if (prepared.checked.status !== 0 || prepared.checked.signal !== null) throw new Error(`generation ${generation} builder failed strict checking:\n${prepared.checked.stdout}${prepared.checked.stderr}`);
      const start = performance.now(); const actual = prepared.runs[0]!({ stdin: source }); const compileProcessMs = performance.now() - start;
      if (actual.status !== 0 || actual.signal !== null || actual.stderr.length !== 0) throw new Error(`generation ${generation} failed (${actual.status}):\n${actual.stderr}`);
      const strictCheckMs = strictArtifact(actual.stdout.toString());
      const path = join(out, `generation-${generation}.ts`); writeFileSync(path, actual.stdout);
      generations.push({ generation, sourceSha256: hashBytes(source), builderSha256: hashBytes(builder), artifactSha256: hashBytes(actual.stdout),
        bytes: actual.stdout.length, compileProcessMs, strictCheckMs, path });
      builder = actual.stdout;
    } finally { prepared.dispose(); }
  }
  const fixedPoint = generations.every(item => item.artifactSha256 === generations[0]!.artifactSha256);
  const summary = { phase: 'generated-fixed-point', revision: revision(), node: process.version, out,
    selected: { artifactSha256: selected.sha256, currentSourceSha256: selected.currentSourceSha256, selectedCompilerSha256: selected.selectedCompilerSha256, selectedCompilerBuilderSha256: selected.selectedCompilerBuilderSha256, supplied: selected.supplied },
    toolSources: toolIdentities(['compiler/scripts/self-host.ts', 'compiler/scripts/tooling.ts', 'compiler/host.ts', 'igniter/artifacts.ts']),
    source: { bytes: Buffer.byteLength(source), sha256: hashBytes(source) }, generations, fixedPoint,
    matchesSelectedCompiler: hashBytes(builder) === selected.selectedCompilerSha256,
    equalsSelectedBuilder: hashBytes(builder) === selected.sha256 };
  // Check persisted bytes before publishing the ladder summary.
  for (const item of generations) if (hashBytes(readFileSync(item.path)) !== item.artifactSha256) throw new Error('persisted generation identity mismatch');
  writeJson(join(out, 'ladder.json'), summary); process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  if (!fixedPoint) process.exitCode = 1;
}
if (mainFile(import.meta.url)) { try { selfHost(process.argv.slice(2)); } catch (error) { fail(error); } }
