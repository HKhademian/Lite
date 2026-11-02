#!/usr/bin/env node
/** Reproducible, sequential cold-process compiler benchmark and report generator. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus, freemem, platform, release, totalmem, tmpdir } from 'node:os';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBundle } from '../igniter/loader.ts';
import { loadCompiler } from '../igniter/bootstrap.ts';

const repository = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const allowed = new Set(['artifact', 'out', 'samples', 'warmups', 'self-timeout-ms']);
const options = new Map();
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace(/^--/, '');
  if (!allowed.has(key) || args[i + 1] === undefined) throw new Error(`invalid option ${args[i]}`);
  options.set(key, args[i + 1]);
}
function positive(name, fallback, minimum = 1) {
  const value = Number(options.get(name) ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`invalid --${name}`);
  return value;
}
const samples = positive('samples', 7);
const warmups = positive('warmups', 1, 0);
const selfTimeoutMs = positive('self-timeout-ms', 60000);
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const prefix = resolve(options.get('out') ?? join(repository, 'benchmark', 'reports', `${date}-compiler-performance`));
mkdirSync(dirname(prefix), { recursive: true });
const directory = mkdtempSync(join(tmpdir(), 'lite-compiler-benchmark-'));
const artifact = join(directory, 'T11.ts');
const sha = value => createHash('sha256').update(value).digest('hex');
const log = message => process.stderr.write(`${new Date().toISOString()} ${message}\n`);
function command(command_, arguments_, extra = {}) {
  const result = spawnSync(command_, arguments_, {
    cwd: repository, encoding: 'buffer', timeout: 600000, maxBuffer: 128 * 1024 * 1024, ...extra,
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) throw new Error(`${command_} failed (${result.status}): ${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
const summary = {
  schema: 1, startedAt: new Date().toISOString(), date, repositoryRevision: command('git', ['rev-parse', 'HEAD']).toString().trim(),
  dirtyBefore: command('git', ['status', '--short']).toString().trim(),
  environment: { node: process.version, nodeExecutable: process.execPath, platform: platform(), release: release(), arch: process.arch,
    cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem(), freeMemoryAtStartBytes: freemem(),
    typescript: JSON.parse(readFileSync(join(repository, 'igniter/node_modules/typescript/package.json'))).version,
    cc: command('cc', ['--version']).toString().trim(),
    nodeOptions: process.env.NODE_OPTIONS ?? '', nodeCompileCache: process.env.NODE_COMPILE_CACHE ?? '',
    pinnedNode: readFileSync(join(repository, 'igniter/.node-version'), 'utf8').trim() },
  method: { samples, warmups, selfTimeoutMs, processModel: 'fresh Node process per input; sequential; paired order alternates',
    wallTime: 'parent spawn-to-exit, including Node startup, loading, compilation, and output capture',
    coreTime: 'worker compilation only, after module/compiler loading; T11 includes synchronous stdin read',
    excluded: 'bootstrap generation, strict artifact typecheck, fixture reads, hash comparison, emitted-program execution',
    corpus: 'sum of fresh-process invocations per pass; warm-up warms filesystem caches; process state is discarded, not persistent compiler warm-up',
    selfCompilation: 'one cold invocation per engine; no warm-up; timeout is censored and has no speedup ratio' },
  availability: [], workloads: [], raw: [], results: [], selfCompilation: [], validation: { pairedComparisons: 0, mismatches: [] },
};
const bundle = loadBundle(join(repository, 'compiler/manifests/ts.json'));
summary.source = { bytes: Buffer.byteLength(bundle.text), sha256: sha(bundle.text), manifest: 'compiler/manifests/ts.json',
  files: bundle.files.map(path => ({ path, sha256: sha(readFileSync(resolve(repository, 'compiler/manifests', path))) })) };

/** Compact output identity; successful timings require exact byte comparisons, not just these hashes. */
function identity(result) {
  return { status: result.status, signal: result.signal, stdoutBytes: result.stdout.length, stdoutSha256: sha(result.stdout),
    stderrBytes: result.stderr.length, stderrSha256: sha(result.stderr), ...(result.error ? { error: result.error.code ?? result.error.message } : {}) };
}
function invoke(engine, input, timeoutMs = 30000) {
  const started = performance.now();
  const result = spawnSync(process.execPath, [join(repository, 'benchmark/compiler-worker.mjs'), engine, artifact, input.name], {
    cwd: repository, input: input.text, stdio: ['pipe', 'pipe', 'pipe', 'pipe'], timeout: timeoutMs, maxBuffer: 128 * 1024 * 1024,
  });
  const wallMs = performance.now() - started;
  const metrics = result.output?.[3]?.length ? JSON.parse(result.output[3].toString()) : {};
  return { ...result, stdout: result.stdout ?? Buffer.alloc(0), stderr: result.stderr ?? Buffer.alloc(0), wallMs, metrics };
}
function exact(left, right) {
  return !left.error && !right.error && left.signal === null && right.signal === null &&
    left.status === right.status && left.stdout.equals(right.stdout) && left.stderr.equals(right.stderr);
}
function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}
function aggregate(rows) {
  return { samples: rows.length, medianWallMs: median(rows.map(x => x.wallMs)), minWallMs: Math.min(...rows.map(x => x.wallMs)),
    maxWallMs: Math.max(...rows.map(x => x.wallMs)), medianCompileMs: median(rows.map(x => x.compileMs)),
    medianLoadMs: median(rows.map(x => x.loadMs)), medianCpuMs: median(rows.map(x => x.cpuMs)),
    medianPeakRssMiB: median(rows.map(x => x.maxRssKiB / 1024)) };
}
function checkpoint() { writeFileSync(`${prefix}.json`, JSON.stringify(summary, null, 2) + '\n'); }

try {
  writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
  const seedPath = options.has('artifact')
    ? resolve(options.get('artifact'))
    : join(repository, 'compiler/bootstrap/T11.ts');
  copyFileSync(seedPath, artifact);
  summary.artifact = { origin: seedPath, build: options.has('artifact')
    ? 'supplied seed; checked against recorded hash and current corpus'
    : 'checked-in T11 seed; checked against recorded hash and current corpus' };
  summary.artifact.bytes = readFileSync(artifact).length;
  summary.artifact.sha256 = sha(readFileSync(artifact));
  summary.artifact.recordedHashMatches = readFileSync(join(repository, 'compiler/parity.md'), 'utf8').includes(summary.artifact.sha256);
  const config = JSON.parse(readFileSync(join(repository, 'igniter/tsconfig.json')));
  writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    ...config.compilerOptions, types: [], typeRoots: [], lib: ['ESNext'],
  }, files: [artifact] }));
  log('strict-typechecking snapshot of T11 outside timed samples');
  command(process.execPath, [join(repository, 'igniter/node_modules/typescript/bin/tsc'), '-p', join(directory, 'tsconfig.json')]);
  summary.validation.artifactStrictTypecheck = 'passed';
  summary.availability.push({ compiler: 'T00', status: 'available', role: 'handwritten TS parser/checker/interpreter; code generation measured as T00+S' },
    { compiler: 'T11', status: 'available', role: 'Lite-written TS compiler emitted as TS; exact snapshot hash recorded' });
  const cCompiler = loadCompiler(join(repository, 'compiler/manifests/c.json'));
  const prerequisiteProbes = [
    ['function', 'f := fn(): Int { 42 }\nreport(f());'],
    ['list', 'values: List<Int> = [1, 2]; report(values[0]);'],
    ['input', 'source := inputAll(); report(source);'],
  ].map(([feature, text]) => {
    const result = cCompiler.compile({ text });
    return { feature, source: text, status: result.status, stdoutBytes: result.stdout.length, stderr: result.stderr.toString() };
  });
  summary.availability.push({ compiler: 'C01', status: 'unavailable', role: 'planned first native compiler; no buildable self-hosted artifact', prerequisiteProbes },
    { compiler: 'C11', status: 'unavailable', role: 'not defined in current bootstrap ledger; no runnable artifact found; C11 C language mode is not a compiler node' });

  const fixtures = join(repository, 'igniter/tests/compiler');
  const corpus = readdirSync(fixtures).filter(name => name.endsWith('.json')).sort().map(manifestName => {
    const manifest = JSON.parse(readFileSync(join(fixtures, manifestName)));
    const name = join('igniter/tests/compiler', manifest.source.file);
    return { name, text: readFileSync(join(repository, name), 'utf8') };
  });
  const workloads = [
    { id: 'report-1', inputs: [{ name: 'benchmark:report-1', text: 'report(42);\n' }] },
    { id: 'report-100', inputs: [{ name: 'benchmark:report-100', text: Array.from({ length: 100 }, (_,i) => `report(${i});`).join('\n') + '\n' }] },
    { id: 'report-1000', inputs: [{ name: 'benchmark:report-1000', text: Array.from({ length: 1000 }, (_,i) => `report(${i});`).join('\n') + '\n' }] },
    { id: 'compiler-corpus', inputs: corpus },
  ];
  for (const workload of workloads) {
    summary.workloads.push({ id: workload.id, inputCount: workload.inputs.length,
      totalSourceBytes: workload.inputs.reduce((n, item) => n + Buffer.byteLength(item.text), 0),
      inputs: workload.inputs.map(item => ({ name: item.name, bytes: Buffer.byteLength(item.text), sha256: sha(item.text) })) });
    for (let pass = -warmups; pass < samples; pass += 1) {
      const totals = new Map(['T00+S', 'T11'].map(engine => [engine, { engine, workload: workload.id, pass, wallMs: 0,
        loadMs: 0, compileMs: 0, cpuMs: 0, maxRssKiB: 0, invocations: [] }]));
      for (const [inputIndex, input] of workload.inputs.entries()) {
        const order = (pass + warmups + inputIndex) % 2 ? ['T11', 'T00+S'] : ['T00+S', 'T11'];
        const pair = {};
        for (const engine of order) {
          const result = invoke(engine, input);
          pair[engine] = result;
          const total = totals.get(engine);
          total.wallMs += result.wallMs;
          for (const key of ['loadMs', 'compileMs', 'cpuMs']) total[key] += result.metrics[key] ?? 0;
          total.maxRssKiB = Math.max(total.maxRssKiB, result.metrics.maxRssKiB ?? 0);
          total.invocations.push({ input: input.name, wallMs: result.wallMs, ...result.metrics, ...identity(result) });
        }
        if (!exact(pair['T00+S'], pair.T11)) {
          summary.validation.mismatches.push({ workload: workload.id, pass, input: input.name,
            stage0: identity(pair['T00+S']), generated: identity(pair.T11) });
          checkpoint();
          throw new Error(`compiler mismatch: ${workload.id} ${input.name}`);
        }
        if (workload.id !== 'compiler-corpus' && pair.T11.status !== 0) throw new Error('synthetic benchmark rejected');
        summary.validation.pairedComparisons += 1;
      }
      for (const total of totals.values()) summary.raw.push(total);
      checkpoint();
      log(`${workload.id} ${pass < 0 ? 'warm-up' : `sample ${pass + 1}/${samples}`}: T00+S ${totals.get('T00+S').wallMs.toFixed(1)} ms; T11 ${totals.get('T11').wallMs.toFixed(1)} ms`);
    }
    const engines = ['T00+S', 'T11'].map(engine => ({ engine, ...aggregate(summary.raw.filter(row => row.workload === workload.id && row.engine === engine && row.pass >= 0)) }));
    summary.results.push({ workload: workload.id, engines, wallSpeedupT11: engines[0].medianWallMs / engines[1].medianWallMs,
      compileSpeedupT11: engines[0].medianCompileMs / engines[1].medianCompileMs });
  }

  // Handwritten frontend is useful context, but does not emit TS and is not used in ratios.
  for (const input of [...workloads.slice(0, 3).flatMap(workload => workload.inputs), { name: 'benchmark:S', text: bundle.text }]) {
    const rows = [];
    for (let pass = -warmups; pass < samples; pass += 1) {
      const result = invoke('T00-frontend', input);
      if (result.error || result.status !== 0 || result.signal !== null) throw new Error(`T00 frontend failed: ${input.name}`);
      const row = { engine: 'T00-frontend', workload: input.name, pass, wallMs: result.wallMs, ...result.metrics, ...identity(result) };
      summary.raw.push(row);
      if (pass >= 0) rows.push(row);
    }
    summary.results.push({ workload: input.name, comparableCodegen: false, engines: [{ engine: 'T00-frontend', ...aggregate(rows) }] });
    checkpoint();
  }
  for (const engine of ['T00+S', 'T11']) {
    log(`self-compilation probe ${engine}: ${summary.source.bytes} bytes, limit ${selfTimeoutMs / 1000} s`);
    const result = invoke(engine, { name: 'benchmark:S', text: bundle.text }, selfTimeoutMs);
    const record = { engine, wallMs: result.wallMs, ...result.metrics, ...identity(result),
      outcome: result.error?.code === 'ETIMEDOUT' ? 'timeout' : result.status === 0 && result.signal === null ? 'completed' : 'failed',
      stderr: result.stderr.toString('utf8').slice(0, 2000) };
    if (record.outcome === 'completed') {
      record.matchesT11Bytes = result.stdout.equals(readFileSync(artifact));
      if (!record.matchesT11Bytes) throw new Error(`${engine} self-compilation differs from T11`);
    }
    summary.selfCompilation.push(record);
    checkpoint();
    log(`self-compilation ${engine}: ${record.outcome} after ${(record.wallMs / 1000).toFixed(2)} s`);
  }
  summary.finishedAt = new Date().toISOString();
  summary.status = 'complete';
  checkpoint();
  const number = n => n.toFixed(2);
  const lines = [
    `# Compiler performance — ${date}`, '',
    `Revision: \`${summary.repositoryRevision}\`. Host: ${summary.environment.cpu}, ${summary.environment.arch}, Node ${summary.environment.node}, TypeScript ${summary.environment.typescript}.`, '',
    `T11: ${summary.artifact.bytes} bytes, SHA-256 \`${summary.artifact.sha256}\`. Strict artifact typecheck passed. Current S: ${summary.source.bytes} bytes, SHA-256 \`${summary.source.sha256}\`.`, '',
    '## Availability', '',
    ...summary.availability.map(row => `- **${row.compiler}: ${row.status}.** ${row.role}.`), '',
    '## Comparable TS code generation', '',
    `Each result is the median of ${samples} sequential fresh-process samples, after ${warmups} discarded warm-up pass(es). Wall time includes Node startup, compiler loading and output capture. Smaller is faster. T00+S means T00 running the Lite-written TS compiler; it is not the handwritten frontend alone.`, '',
    ...summary.results.filter(row => row.comparableCodegen !== false).flatMap(row => [
      `- **${row.workload}:** T00+S ${number(row.engines[0].medianWallMs)} ms; T11 ${number(row.engines[1].medianWallMs)} ms; T00+S/T11 wall ratio **${number(row.wallSpeedupT11)}×**. A ratio below 1 means T11 is slower.`,
      `  Compilation alone: T00+S ${number(row.engines[0].medianCompileMs)} ms; T11 ${number(row.engines[1].medianCompileMs)} ms. Median per-pass peak RSS: ${number(row.engines[0].medianPeakRssMiB)} / ${number(row.engines[1].medianPeakRssMiB)} MiB.`,
    ]), '',
    '## T00 frontend only', '',
    'Parser/checker timing only; no target emission, so no speedup comparison with T11:', '',
    ...summary.results.filter(row => row.comparableCodegen === false).map(row => `- ${row.workload}: median wall ${number(row.engines[0].medianWallMs)} ms; parser/checker ${number(row.engines[0].medianCompileMs)} ms.`), '',
    '## Full compiler source', '',
    ...summary.selfCompilation.map(row => `- ${row.engine}: **${row.outcome}**, ${(row.wallMs / 1000).toFixed(2)} s observed${row.outcome === 'timeout' ? `; did not complete within ${selfTimeoutMs / 1000} s. No successful-build timing or ratio is claimed` : `; output equals T11: ${row.matchesT11Bytes}`}.`), '',
    '## Validation and limits', '',
    `- ${summary.validation.pairedComparisons} paired invocations matched exact stdout/stderr bytes, status and signal, including warm-up passes; zero mismatches.`,
    '- The 92-case corpus is compared as compiler output, including successful artifacts and rejection diagnostics. This is not full-language support or generated-program runtime benchmarking.',
    '- Fresh-process order alternates; no timed measurements run concurrently. The machine was not reserved exclusively and no statistical confidence interval is claimed.',
    `- Actual Node is ${summary.environment.node}; repository pin is ${summary.environment.pinnedNode}. Results describe the actual host, not an untested pinned toolchain.`,
    '- Artifact strict typechecking and bootstrap generation are excluded. Full-source timeouts are censored and excluded from ratios.',
    '- C01/C11 are unavailable, not zero-time results. Existing C emission runs under T00 and is not a native compiler artifact.', '',
    'Reproduce:', '', '```sh',
    `node benchmark/compiler-performance.mjs --artifact /absolute/path/T11.ts --samples ${samples} --warmups ${warmups} --self-timeout-ms ${selfTimeoutMs}`, '```', '',
    `Raw samples: [JSON](${prefix.split('/').at(-1)}.json). Interactive summary: [Canvas](${prefix.split('/').at(-1)}.canvas.tsx).`, '',
  ];
  writeFileSync(`${prefix}.md`, lines.join('\n'));
  const view = { date, revision: summary.repositoryRevision, environment: summary.environment,
    availability: summary.availability.map(({ compiler, status, role }) => ({ compiler, status, role })),
    results: summary.results, selfCompilation: summary.selfCompilation, pairedComparisons: summary.validation.pairedComparisons,
    samples, warmups, selfTimeoutMs };
  writeFileSync(`${prefix}.canvas.tsx`, `import { BarChart, Callout, H1, H2, Stack, Table, Text, useState } from 'cursor/canvas';
const data = ${JSON.stringify(view, null, 2)};
export default function CompilerPerformance() {
  const [metric, setMetric] = useState('wall');
  const results = data.results.filter(row => row.comparableCodegen !== false);
  const key = metric === 'wall' ? 'medianWallMs' : 'medianCompileMs';
  return <Stack gap={20} style={{padding:24,maxWidth:1120}}>
    <H1>Lite compiler performance · {data.date}</H1>
    <Text>{data.environment.cpu} · Node {data.environment.node} · {data.samples} fresh-process samples · Revision {data.revision.slice(0,12)}</Text>
    <Callout>T00+S and T11 emit identical TS for the measured inputs. T00 frontend is a separate parser/checker measurement. C01 and C11 have no runnable native artifacts.</Callout>
    <H2>Median TS compilation time</H2>
    <label>Timing measure <select value={metric} onChange={event => setMetric(event.target.value)}><option value="wall">Process wall time</option><option value="compile">Compilation after loading</option></select></label>
    <BarChart categories={results.map(row => row.workload)} series={['T00+S','T11'].map((engine,i) => ({name:engine,data:results.map(row => row.engines[i][key]),tone:i === 0 ? 'neutral' : 'info'}))} valueSuffix=" ms" height={300} showValues />
    <Text>Horizontal axis: workload (corpus = sum of 92 fresh processes). Vertical axis: median milliseconds. Source: this repository benchmark, {data.date}; {data.warmups} discarded filesystem warm-up pass(es), no persistent compiler warm-up.</Text>
    <Table headers={['Workload','T00+S wall ms','T11 wall ms','T00+S/T11 ratio','T00+S peak MiB','T11 peak MiB']} rows={results.map(row => [row.workload,row.engines[0].medianWallMs.toFixed(2),row.engines[1].medianWallMs.toFixed(2),row.wallSpeedupT11.toFixed(2)+'×',row.engines[0].medianPeakRssMiB.toFixed(1),row.engines[1].medianPeakRssMiB.toFixed(1)])} />
    <Text>Ratio below 1 means T11 is slower. Peak memory is median per-pass maximum RSS, not summed process memory.</Text>
    <H2>Compiler availability</H2>
    <Table headers={['Compiler','Status','Meaning']} rows={data.availability.map(row => [row.compiler,row.status,row.role])} />
    <H2>Full-source self-compilation probes</H2>
    <Table headers={['Engine','Outcome','Observed seconds']} rows={data.selfCompilation.map(row => [row.engine,row.outcome,(row.wallMs/1000).toFixed(2)])} />
    <Text>One fresh invocation each, limited to {data.selfTimeoutMs/1000} seconds. A timeout is censored: no successful self-build timing or ratio follows from it.</Text>
    <H2>T00 parser/checker context</H2>
    <Table headers={['Input','Median process wall ms','Median parser/checker ms']} rows={data.results.filter(row => row.comparableCodegen === false).map(row => [row.workload,row.engines[0].medianWallMs.toFixed(2),row.engines[0].medianCompileMs.toFixed(2)])} />
    <Text>{data.pairedComparisons} paired comparisons matched exact streams/status/signal. Artifact strict typecheck passed. Output equivalence does not establish full-language support. No generated-program runtime or TypeScript checking time is included.</Text>
  </Stack>;
}
`);
  log(`reports saved: ${prefix}.{json,md,canvas.tsx}`);
  process.stdout.write(JSON.stringify({ reports: prefix, results: summary.results, selfCompilation: summary.selfCompilation }, null, 2) + '\n');
} catch (error) {
  summary.status = 'failed';
  summary.failure = String(error);
  checkpoint();
  throw error;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
