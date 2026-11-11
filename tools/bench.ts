import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { buildTsCompiler } from '../compiler/host.ts';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { caseIdentity, loadCases, verifyScenario } from './cases.ts';
import { root, run, sha256, versions } from './project.ts';
import { showToolVersion } from './tool-version.ts';

export function benchmark(output: string, filter = ''): void {
  assert(!existsSync(output), 'benchmark output already exists; choose a new report path');
  const results = [];
  for (const fixture of loadCases(filter).filter(item => item.definition.benchmark !== undefined)) {
    const settings = fixture.definition.benchmark!;
    for (const scenario of fixture.definition.cases) {
      for (let i = 0; i < settings.warmups; i++) verifyScenario(fixture, scenario);
      const samples = [];
      for (let i = 0; i < settings.samples; i++) {
        const start = performance.now();
        verifyScenario(fixture, scenario);
        samples.push(performance.now() - start);
      }
      const sorted = [...samples].sort((a, b) => a - b);
      results.push({ id: fixture.definition.id, scenario: scenario.name, kind: fixture.definition.kind, identity: caseIdentity(fixture), warmups: settings.warmups, milliseconds: samples, medianMilliseconds: sorted[Math.floor(sorted.length / 2)] });
    }
  }
  assert(results.length > 0, 'no benchmark cases selected');
  const commit = existsSync(join(root, '.git')) ? run('git', ['rev-parse', 'HEAD'], root).toString().trim() : null;
  const dirty = commit === null ? null : run('git', ['status', '--porcelain'], root).length > 0;
  const built = buildTsCompiler();
  const compiler = { source: built.sourceSha256, artifact: built.artifactSha256, builder: built.builderSha256 };
  const tooling = sha256(readdirSync(join(root, 'tools')).filter(file => file.endsWith('.ts')).sort().map(file => file + '\0' + readFileSync(join(root, 'tools', file), 'utf8')).join('\0'));
  mkdirSync(dirname(output), { recursive: true });
  assert(!existsSync(output), 'benchmark output already exists; choose a new report path');
  writeFileSync(output, JSON.stringify({ node: process.version, platform: process.platform, architecture: process.arch, commit, dirty, versions: versions(root), compiler, tooling, scope: 'fresh-process wall time including startup, IO, verification, and compilation for program cases', results }, null, 2) + '\n');
  console.log(`Wrote ${results.length} benchmark results to ${output}`);
}

if (import.meta.main) {
  try {
    if (showToolVersion('benchmark', 'bench')) process.exit(0);
    const [output, filter, ...extra] = process.argv.slice(2);
    assert(output !== undefined && extra.length === 0, 'usage: lite bench OUTPUT [FILTER]');
    benchmark(resolve(output), filter);
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
