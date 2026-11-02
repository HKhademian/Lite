#!/usr/bin/env node
/** Fresh-process comparison of two TS compiler artifacts; self-build timeouts remain censored. */
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBundle } from '../igniter/loader.ts';


type Version = 'before' | 'after';
type Measurement = { version: Version; name: string; wallMs: number; status: number | null; signal: NodeJS.Signals | null; error: string | undefined; stdoutBytes: number; stdoutSha256: string; stderr: string; pass: number; bytes: Buffer; compileMs?: number; maxRssKiB?: number };
type Statistics = { medianWallMs: number; medianCompileMs: number; medianPeakRssMiB: number; minWallMs: number; maxWallMs: number };
type Comparison = { name: string; sourceBytes: number; before: Statistics; after: Statistics; speedup: number };
const versions: Version[] = ['before', 'after'];

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
function option(name: string, fallback?: string) { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; }
const before = option('before');
if (before === undefined) throw new Error('usage: node benchmark/text-cache.ts --before /path/T11.ts [--after /path/current.ts]');
const artifacts = { before: resolve(before), after: resolve(option('after', 'compiler/bootstrap/T11.ts')!) };
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const prefix = resolve(option('out', `benchmark/reports/${date}-text-cache`)!);
mkdirSync(dirname(prefix), { recursive: true });
const sha = (x: string | Uint8Array) => createHash('sha256').update(x).digest('hex');
const source = loadBundle(resolve(root, 'compiler/manifests/ts.json')).text;
const report = { date, revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  dirtyBefore: execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).trim(),
  node: process.version, cpu: cpus()[0]?.model, sourceBytes: Buffer.byteLength(source), sourceSha256: sha(source),
  artifacts: Object.fromEntries(Object.entries(artifacts).map(([name,path]) => [name, { path, sha256: sha(readFileSync(path)), bytes: readFileSync(path).length }])) as Record<Version, { path: string; sha256: string; bytes: number }>,
  method: { samples: 7, discardedWarmups: 1, process: 'fresh process per invocation; alternating before/after order; sequential measurements',
    wallTime: 'Node startup, TS loading, compilation and output capture; input generation and comparison excluded',
    oldSelfLimitMs: 10000, selfComparison: 'one censored old invocation; seven successful new invocations, no whole-source speedup ratio',
    scope: 'Text-runtime optimization only; compiled programs must produce identical TS bytes on the report workloads. Not a full-language parity claim.' },
  rows: [] as Measurement[], results: [] as Comparison[], self: [] as Measurement[], selfAfterMedianMs: 0, completedAt: '' };
function run(version: Version, text: string, name: string, timeout = 30000): Measurement {
  const start = performance.now();
  const p = spawnSync(process.execPath, [resolve(root, 'benchmark/compiler-worker.ts'), 'T11', artifacts[version], name], {
    input: text, stdio: ['pipe','pipe','pipe','pipe'], timeout, maxBuffer: 128 * 1024 * 1024,
  });
  const wallMs = performance.now() - start;
  const out = p.stdout ?? Buffer.alloc(0), err = p.stderr ?? Buffer.alloc(0);
  const measured = { version, name, wallMs, status: p.status, signal: p.signal, error: (p.error as NodeJS.ErrnoException | undefined)?.code,
    ...(p.output[3]?.length ? JSON.parse(p.output[3].toString()) as { compileMs: number; maxRssKiB: number } : {}),
    stdoutBytes: out.length, stdoutSha256: sha(out), stderr: err.toString(), pass: 0 };
  Object.defineProperty(measured, 'bytes', { value: out });
  return measured as Measurement;
}
function median(a: number[]): number { const s = [...a].sort((x,y) => x-y); return s[Math.floor(s.length/2)]!; }
for (const n of [100, 1000]) {
  const input = Array.from({ length: n }, (_,i) => `outputLine(${i});`).join('\n') + '\n';
  for (let pass = -1; pass < 7; pass++) {
    const pair: Partial<Record<Version, Measurement>> = {};
    for (const version of (pass % 2 === 0 ? versions : [...versions].reverse())) {
      const row = run(version, input, `report-${n}`); row.pass = pass;
      if (row.error || row.status !== 0 || row.signal !== null || row.stderr !== '') throw new Error(`failed ${version} ${n}`);
      pair[version] = row; report.rows.push(row);
    }
    if (!pair.before!.bytes.equals(pair.after!.bytes)) throw new Error('emitted TS bytes differ');
  }
  const values = Object.fromEntries(versions.map(version => {
    const rows = report.rows.filter(r => r.name === `report-${n}` && r.version === version && r.pass >= 0);
    return [version, { medianWallMs: median(rows.map(r => r.wallMs)), medianCompileMs: median(rows.map(r => r.compileMs ?? Number.NaN)),
      medianPeakRssMiB: median(rows.map(r => (r.maxRssKiB ?? Number.NaN)/1024)), minWallMs: Math.min(...rows.map(r => r.wallMs)), maxWallMs: Math.max(...rows.map(r => r.wallMs)) }];
  })) as Record<Version, Statistics>;
  report.results.push({ name: `report-${n}`, sourceBytes: Buffer.byteLength(input), ...values, speedup: values.before.medianWallMs / values.after.medianWallMs });
}
const oldSelf = run('before', source, 'self', 10000);
if (oldSelf.error !== 'ETIMEDOUT' && (oldSelf.error || oldSelf.status !== 0 || oldSelf.signal !== null || oldSelf.stderr !== '' || oldSelf.stdoutSha256 !== report.artifacts.after.sha256)) {
  throw new Error('old self-build failed for a reason other than the measured timeout or emitted different bytes');
}
report.self.push({ ...oldSelf, pass: 0 });
for (let pass = -1; pass < 7; pass++) {
  const row = { ...run('after', source, 'self'), pass };
  if (row.error || row.status !== 0 || row.signal !== null || row.stderr !== '' || row.stdoutSha256 !== report.artifacts.after.sha256) throw new Error('new self-build failed equality');
  report.self.push(row);
}
report.selfAfterMedianMs = median(report.self.filter(r => r.version === 'after' && r.pass >= 0).map(r => r.wallMs));
report.completedAt = new Date().toISOString();
writeFileSync(`${prefix}.json`, JSON.stringify(report, null, 2) + '\n');
writeFileSync(`${prefix}.md`, [
  '# TS compiler text-cache comparison', '',
  `${date} · ${report.cpu} · Node ${report.node}. Seven measured fresh-process samples after one discarded warm-up.`, '',
  'The old textLength/textAt/textSlice helpers rebuilt a whole code-point array for each call. Source scanning therefore repeatedly copied the entire source. The new private cache retains at most eight immutable code-point views, shared by those helpers. Public String and copy semantics are unchanged.', '',
  ...report.results.map(r => `- **${r.name}:** ${r.before.medianWallMs.toFixed(2)} ms → ${r.after.medianWallMs.toFixed(2)} ms median process wall time; **${r.speedup.toFixed(2)}×** faster. Emitted TS bytes match exactly. Peak RSS medians: ${r.before.medianPeakRssMiB.toFixed(1)} → ${r.after.medianPeakRssMiB.toFixed(1)} MiB.`), '',
  `- **Full source (${report.sourceBytes} bytes):** old invocation ${report.self[0]!.error === 'ETIMEDOUT' ? 'did not finish within 10 seconds' : `finished in ${report.self[0]!.wallMs.toFixed(2)} ms`}; new median **${report.selfAfterMedianMs.toFixed(2)} ms**. Every successful new invocation reproduces the selected compiler SHA-256. No whole-source speedup ratio is claimed from a censored baseline.`, '',
  `Before artifact: \`${report.artifacts.before.sha256}\`. After artifact: \`${report.artifacts.after.sha256}\`.`, '',
  `Source bundle: \`${report.sourceSha256}\`. Measurements were taken from the source snapshot based on \`${report.revision}\`; dirty file paths are preserved in the raw data. The source and generated seeds are committed together after validation.`, '',
  'This measures the existing TS compiler and a private runtime optimization, not newly supported language features. Preparing the reference seeds, strict typechecking and output hashing are excluded from the timed interval. CPU activity elsewhere on the machine is not controlled.', '',
  'Reproduce using a preserved old artifact:', '', '```sh',
  `git show ${report.revision}:compiler/bootstrap/T11.ts > /tmp/T11-before-text-cache.ts`,
  'node benchmark/text-cache.ts --before /tmp/T11-before-text-cache.ts', '```', '',
  `Raw samples: [JSON](${prefix.split('/').at(-1)}.json).`, '',
].join('\n'));
process.stdout.write(JSON.stringify({ results: report.results, selfAfterMedianMs: report.selfAfterMedianMs, oldSelf: report.self[0] }, null, 2)+'\n');
