#!/usr/bin/env node
/** Generated compiler/process/check/runtime measurements. */
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, platform, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { loadBundle } from '../igniter/loader.ts';
import { prepareTsArtifacts } from '../igniter/artifacts.ts';
import { compilerFixtures } from '../igniter/test-fixtures.ts';
import { compilerContractMatches, corpusContracts, validateCorpus } from '../compiler/scripts/corpus-contracts.ts';
import { fail, hashBytes, mainFile, positiveOption,
  repository, revision, selectedArtifact, strictArtifact, toolIdentities, toolOptions, writeJson } from '../compiler/scripts/tooling.ts';

type Metrics = { loadMs: number; compileMs: number; cpuMs: number; maxRssKiB: number };
type Timed = { processMs: number; status: number | null; signal: NodeJS.Signals | null; stdout: Buffer; stderr: Buffer; metrics: Metrics };
type Input = { name: string; text: string; fixture?: (typeof compilerFixtures)[number] };
/** Computes the median of measured samples, excluding discarded warmups. */
function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('no measured samples');
  const sorted = [...values].sort((a, b) => a - b), i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i]! : (sorted[i - 1]! + sorted[i]!) / 2;
}
/** Runs a fresh generated-only worker; fd 3 keeps metrics separate from compiler streams. */
function invoke(artifact: string, source: string, timeout: number): Timed {
  const start = performance.now();
  const actual = spawnSync(process.execPath, [join(repository, 'benchmark/compiler-worker.ts'), 'T11', artifact, ''], {
    input: source, stdio: ['pipe', 'pipe', 'pipe', 'pipe'], timeout, maxBuffer: 128 * 1024 * 1024,
  });
  const processMs = performance.now() - start;
  if (actual.error !== undefined) throw actual.error;
  const raw = actual.output?.[3];
  if (raw === undefined || raw === null || raw.length === 0) throw new Error('worker did not return timing metrics');
  const metrics = JSON.parse(raw.toString()) as Metrics;
  for (const key of ['loadMs', 'compileMs', 'cpuMs', 'maxRssKiB'] as const) {
    if (!Number.isFinite(metrics[key]) || metrics[key] < 0) throw new Error(`invalid worker metric: ${key}`);
  }
  return { processMs, status: actual.status, signal: actual.signal, stdout: actual.stdout ?? Buffer.alloc(0), stderr: actual.stderr ?? Buffer.alloc(0), metrics };
}
/** Validates the candidate compiler and records independent compiler/check/program process phases. */
export function compilerPerformance(args: readonly string[]): void {
  const options = toolOptions(args, ['artifact', 'out', 'samples', 'warmups', 'self-timeout-ms']);
  const samples = positiveOption(options.values, 'samples', 7), warmups = positiveOption(options.values, 'warmups', 1, 0);
  const timeout = positiveOption(options.values, 'self-timeout-ms', 60000);
  const selected = selectedArtifact(options.values.get('artifact'));
  const bundle = loadBundle(join(repository, 'compiler/manifests/ts.json'));
  const { artifacts } = corpusContracts();
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  // A generated-only prefix cannot overwrite the preserved T00 comparison reports.
  const prefix = resolve(options.values.get('out') ?? join(repository, 'benchmark/reports', `${date}-generated-compiler-performance`));
  const directory = mkdtempSync(join(tmpdir(), 'lite-generated-benchmark-'));
  try {
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    const artifact = join(directory, 'compiler.ts'); writeFileSync(artifact, selected.bytes);
    const strictCompilerCheckMs = strictArtifact(selected.bytes.toString());
    const validation = validateCorpus(selected.bytes.toString());
    if (validation.mismatches.length !== 0) throw new Error(`compiler contract mismatch: ${validation.mismatches.slice(0, 3).join(', ')}`);
    // A refreshed source may reach a new fixed point after the first old-seed build.
    // Validate the untimed self-build independently before using its bytes for timing checks.
    const selfBuild = invoke(artifact, bundle.text, timeout);
    if (selfBuild.status !== 0 || selfBuild.signal !== null || selfBuild.stderr.length !== 0) throw new Error('untimed self-build failed');
    const selfBuildValidation = validateCorpus(selfBuild.stdout.toString());
    if (selfBuildValidation.mismatches.length !== 0) throw new Error('self-built compiler failed recorded corpus contracts');
    const selfBuildArtifactSha256 = hashBytes(selfBuild.stdout);
    const workloads: { name: string; inputs: Input[] }[] = [
      ...[1, 100, 1000].map(n => ({ name: `output-${n}`, inputs: [{ name: `output-${n}`, text: Array.from({ length: n }, (_, i) => `outputLine(${i});`).join('\n') + '\n' }] })),
      { name: 'compiler-corpus', inputs: compilerFixtures.map(fixture => ({ name: fixture.file + '/' + fixture.caseName, text: fixture.source, fixture })) },
      { name: 'self-build', inputs: [{ name: 'S', text: bundle.text }] },
    ];
    const results: { workload: string; inputs: { name: string; sourceSha256: string; bytes: number }[];
      raw: { pass: number; input: string; processMs: number; metrics: Metrics; status: number | null; stdoutSha256: string; stderrSha256: string }[];
      medians: { processMs: number; loadMs: number; compileMs: number; cpuMs: number; peakRssKiB: number } }[] = [];
    let runtimeSource = '';
    const syntheticSources = new Map<string, string>();
    for (const workload of workloads) {
      const raw: (typeof results)[number]['raw'] = [];
      const measured: { processMs: number; loadMs: number; compileMs: number; cpuMs: number; peakRssKiB: number }[] = [];
      const expectedSynthetic = new Map<string, string>();
      for (let pass = -warmups; pass < samples; pass += 1) {
        const total = { processMs: 0, loadMs: 0, compileMs: 0, cpuMs: 0, peakRssKiB: 0 };
        for (const input of workload.inputs) {
          const actual = invoke(artifact, input.text, timeout);
          if (input.fixture !== undefined) {
            if (!compilerContractMatches(input.fixture, actual, artifacts)) throw new Error(`timed compiler contract mismatch: ${input.name}`);
          } else {
            if (actual.status !== 0 || actual.signal !== null || actual.stderr.length !== 0) throw new Error(`benchmark compilation failed: ${input.name}: ${actual.stderr}`);
            if (workload.name === 'self-build' && hashBytes(actual.stdout) !== selfBuildArtifactSha256) throw new Error('timed self-build differs from its independently validated output');
            const previous = expectedSynthetic.get(input.name);
            if (previous !== undefined && previous !== hashBytes(actual.stdout)) throw new Error(`nondeterministic benchmark output: ${input.name}`);
            expectedSynthetic.set(input.name, hashBytes(actual.stdout));
            if (workload.name.startsWith('output-')) syntheticSources.set(workload.name, actual.stdout.toString());
            if (workload.name === 'output-1000') runtimeSource = actual.stdout.toString();
          }
          raw.push({ pass, input: input.name, processMs: actual.processMs, metrics: actual.metrics, status: actual.status,
            stdoutSha256: hashBytes(actual.stdout), stderrSha256: hashBytes(actual.stderr) });
          total.processMs += actual.processMs; total.loadMs += actual.metrics.loadMs; total.compileMs += actual.metrics.compileMs;
          total.cpuMs += actual.metrics.cpuMs; total.peakRssKiB = Math.max(total.peakRssKiB, actual.metrics.maxRssKiB);
        }
        if (pass >= 0) measured.push(total);
      }
      results.push({ workload: workload.name, inputs: workload.inputs.map(input => ({ name: input.name, sourceSha256: hashBytes(input.text), bytes: Buffer.byteLength(input.text) })), raw,
        medians: { processMs: median(measured.map(x => x.processMs)), loadMs: median(measured.map(x => x.loadMs)),
          compileMs: median(measured.map(x => x.compileMs)), cpuMs: median(measured.map(x => x.cpuMs)), peakRssKiB: median(measured.map(x => x.peakRssKiB)) } });
    }
    const expectedOutput = Array.from({ length: 1000 }, (_, i) => i + '\n').join('');
    const outputCounts = [1, 100, 1000];
    const checkStart = performance.now(), runtime = prepareTsArtifacts(outputCounts.map(n => syntheticSources.get(`output-${n}`)!)), strictProgramCheckMs = performance.now() - checkStart;
    const executionSamples: number[] = [];
    try {
      if (runtime.checked.status !== 0 || runtime.checked.signal !== null) throw new Error(`benchmark runtime artifact failed strict checking:\n${runtime.checked.stdout}${runtime.checked.stderr}`);
      for (const [i, count] of outputCounts.entries()) {
        const actual = runtime.runs[i]!();
        const expected = Array.from({ length: count }, (_, j) => j + '\n').join('');
        if (actual.status !== 0 || actual.signal !== null || actual.stdout.toString() !== expected || actual.stderr.length !== 0) throw new Error(`synthetic runtime contract mismatch: output-${count}`);
      }
      for (let pass = -warmups; pass < samples; pass += 1) {
        const start = performance.now(), actual = runtime.runs[2]!(); const ms = performance.now() - start;
        if (actual.status !== 0 || actual.signal !== null || actual.stdout.toString() !== expectedOutput || actual.stderr.length !== 0) throw new Error('benchmark runtime contract mismatch');
        if (pass >= 0) executionSamples.push(ms);
      }
    } finally { runtime.dispose(); }
    const summary = { schema: 2, mode: 'generated-only', date, revision: revision(), environment: { node: process.version, platform: platform(), arch: process.arch, cpu: cpus()[0]?.model,
      typescript: (JSON.parse(readFileSync(join(repository, 'igniter/node_modules/typescript/package.json'), 'utf8')) as { version: string }).version },
      source: { sha256: hashBytes(bundle.text), bytes: Buffer.byteLength(bundle.text) },
      toolSources: toolIdentities(['benchmark/compiler-performance.ts', 'benchmark/compiler-worker.ts', 'compiler/scripts/tooling.ts', 'compiler/scripts/corpus-contracts.ts', 'compiler/host.ts', 'igniter/artifacts.ts']),
      artifact: { sha256: selected.sha256, selectedCompilerSha256: selected.selectedCompilerSha256, selectedCompilerBuilderSha256: selected.selectedCompilerBuilderSha256, bytes: selected.bytes.length, supplied: selected.supplied },
      method: { samples, warmups, process: 'sequential fresh Node workers; corpus totals are sums per pass',
        compilation: 'worker compiler execution after module loading, includes stdin decoding; excludes strict checks and generated-program execution',
        baseline: 'generated-only current baseline; no T00 ratio or speedup claim' }, validation, selfBuildValidation, selfBuildArtifactSha256, strictCompilerCheckMs, strictProgramCheckMs,
      runtime: { checkedSyntheticOutputCounts: outputCounts, workload: 'output-1000', artifactSha256: hashBytes(runtimeSource), samples: executionSamples, medianProcessMs: median(executionSamples) }, results };
    mkdirSync(dirname(prefix), { recursive: true }); writeJson(prefix + '.json', summary);
    writeFileSync(prefix + '.md', [`# Generated compiler performance — ${date}`, '',
      `Node ${process.version}; source SHA-256 \`${summary.source.sha256}\`; compiler SHA-256 \`${selected.sha256}\`.`, '',
      `Sequential fresh-process samples: ${samples}; excluded warmups: ${warmups}. Strict compiler check: ${strictCompilerCheckMs.toFixed(2)} ms; strict program check: ${strictProgramCheckMs.toFixed(2)} ms.`, '',
      ...results.map(row => `- ${row.workload}: median process ${row.medians.processMs.toFixed(2)} ms; load ${row.medians.loadMs.toFixed(2)} ms; compile ${row.medians.compileMs.toFixed(2)} ms.`), '',
      `Generated program execution: ${summary.runtime.medianProcessMs.toFixed(2)} ms median process time; exact output checked.`, '',
      `${validation.cases} compiler contracts and ${validation.executions} strictly checked program executions pass. These finite cases do not establish full language support.`, '',
      'This is a generated-only baseline. No speedup is claimed; historical T00 reports are unchanged. Raw samples and all input/artifact identities are in the adjacent JSON.', '',
    ].join('\n'));
    process.stdout.write(JSON.stringify({ reports: prefix, ...summary }, null, 2) + '\n');
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
if (mainFile(import.meta.url)) { try { compilerPerformance(process.argv.slice(2)); } catch (error) { fail(error); } }
