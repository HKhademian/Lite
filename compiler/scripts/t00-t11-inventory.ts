#!/usr/bin/env node
/** Inventory existing T00 contracts against the exact T11 seed; no implementation priorities are selected. */
import { spawnSync, execFileSync, type SpawnSyncReturns } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { compile } from '../../igniter/lite.ts';
import { runText } from '../../igniter/bootstrap.ts';
import { loadSource } from '../../igniter/loader.ts';
import { seed } from '../bootstrap/seed.ts';


type ProcessResult = { status: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string; error?: string; reused?: string };
type Stream = { text?: string; bytes?: number[]; file?: string; hash?: string };
type Scenario = { name: string; stdin?: string | undefined; stdinBytes?: number[] | undefined; args?: string[] | undefined; expected?: Omit<ProcessResult, 'signal'> };
type Check = { accepted: boolean; diagnostic?: string };
type Case = { name: string; stdin: string; stdinBytes?: number[]; args: string[]; t00: ProcessResult; t11?: ProcessResult; matches?: boolean; t00MatchesManifest?: boolean };
type AuditInput = { id: string; kind: string; summary: string; path?: string | undefined; manifest?: string; features?: string[]; test?: string };
type AuditRow = AuditInput & { status: Status; sourceSha256: string; source: string; t00Check: Check; t11Compile?: ProcessResult; artifactTypecheck?: ProcessResult; cases: Case[] };
type Observation = Omit<ProcessResult, 'stdout'> & { stdout?: string | undefined; stdoutBytes?: number };
type SourceFile = { path: string; coverage?: string; id?: string; diagnostic?: string; sourceSha256?: string; bytes?: number; t00Check?: Check; status?: Status; evidence?: string; t11Compile?: Observation; artifactTypecheck?: ProcessResult; artifactSha256?: string; compilationEvidence?: { sourceSha256: string; builderSha256: string; artifactSha256: string; origin: string } };
type Evidence = { path: string; sourceSha256: string; t11Sha256: string; artifactPath: string; artifactSha256: string; compile: ProcessResult };
type Manifest = { id: string; kind: string; description?: string; features: string[]; source: Stream; append?: string; cases: { name: string; stdin?: Stream; stdout?: Stream; stderr?: Stream; args?: string[]; exitCode: number }[] };
type Probe = { id: string; summary: string; test: string; source: string; stdin?: string; stdinBytes?: number[]; args?: string[] };

if (process.argv[2] === '--t00-worker') {
  const request = JSON.parse(readFileSync(0, 'utf8')) as { source: string; stdin?: string; stdinBytes?: number[]; args?: string[] };
  const result = runText(request.source, { stdin: request.stdinBytes === undefined ? request.stdin ?? '' : Buffer.from(request.stdinBytes), args: request.args ?? [] });
  process.stdout.write(JSON.stringify({ status: result.status, stdout: result.stdout.toString(), stderr: result.stderr.toString(), signal: null }));
  process.exit(0);
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const self = fileURLToPath(import.meta.url);
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const outIndex = process.argv.indexOf('--out');
const prefix = resolve(outIndex < 0 ? join(root, 'compiler/reports', `${date}-t00-t11-inventory`) : process.argv[outIndex + 1]!);
const evidenceIndex = process.argv.indexOf('--source-evidence');
const sourceEvidence = evidenceIndex < 0 ? [] : JSON.parse(readFileSync(process.argv[evidenceIndex + 1]!, 'utf8')) as Evidence[];
const largeSources = process.argv.includes('--large-sources');
const scratch = mkdtempSync(join(tmpdir(), 'lite-inventory-'));
const artifact = join(root, 'compiler/bootstrap/T11.ts');
const entry = join(root, 'compiler/entry.ts');
const config = JSON.parse(readFileSync(join(root, 'igniter/tsconfig.json'), 'utf8')) as { compilerOptions: Record<string, unknown> };
const tsc = join(root, 'igniter/node_modules/typescript/bin/tsc');
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
if (hash(readFileSync(artifact)) !== seed.artifactSha256) throw new Error('T11 seed identity mismatch');
mkdirSync(dirname(prefix), { recursive: true });
writeFileSync(join(scratch, 'package.json'), '{"type":"module"}\n');
const report = { schema: 1, date, startedAt: new Date().toISOString(), revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  node: process.version, t11Sha256: seed.artifactSha256, rows: [] as AuditRow[], sourceFiles: [] as SourceFile[], counts: {} as Record<string, number | ({ total: number } & Partial<Record<Status, number>>)>, seedStrictTypecheck: '', testGroups: [] as string[], finishedAt: '', status: '',
  method: { compilationTimeoutMs: 20000, executionTimeoutMs: 5000, strictArtifactTypecheck: true,
    canonical: 'all feature/example/sample/showcase manifests; each supplied scenario runs under T00 and the T11-generated program',
    probes: 'additional existing T00 contracts drawn from interpreter tests; exact source is included for reproduction',
    sourceFiles: 'all tracked .lt/.lts files are checked as standalone T00 programs; files not accepted by T00 are excluded, not called T11 gaps',
    limits: 'Finite corpus and explicit probes, not proof for every program. Compile-only acceptance does not imply runtime parity. T11 remains a restricted compiler.' } };
const statuses = { matches: 'matches tested behavior', rejected: 'T11 rejects source', typecheck: 'T11 emits invalid strict TS', mismatch: 'runtime behavior differs',
  diagnostic: 'runtime diagnostic differs', unknown: 'unverified or timed out', accepted: 'compile accepted; execution not tested', baseline: 'T00 baseline failed' };

type Status = keyof typeof statuses;
function log(text: string) { process.stderr.write(`${new Date().toISOString()} ${text}\n`); }
function checkpoint() { writeFileSync(`${prefix}.json`, JSON.stringify(report, null, 2) + '\n'); }
function result(process_: SpawnSyncReturns<Buffer>): ProcessResult {
  return { status: process_.status, signal: process_.signal, stdout: (process_.stdout ?? Buffer.alloc(0)).toString(),
    stderr: (process_.stderr ?? Buffer.alloc(0)).toString(), ...(process_.error ? { error: (process_.error as NodeJS.ErrnoException).code ?? process_.error.message } : {}) };
}
function same(a: ProcessResult, b: ProcessResult) { return !a.error && !b.error && a.status === b.status && a.signal === b.signal && a.stdout === b.stdout && a.stderr === b.stderr; }
function category(text: string) { return /(?:ArithmeticPanic|BoundPanic|InputFault|MemoryFault)/.exec(text)?.[0]; }
function t00Accepts(source: string): Check {
  try { compile(source); return { accepted: true }; }
  catch (error) { return { accepted: false, diagnostic: `${error instanceof Error ? ('category' in error ? error.category : error.name) : 'Error'}: ${error instanceof Error ? error.message : String(error)}` }; }
}
function strictCheck(path: string) {
  const configPath = join(scratch, 'tsconfig.json');
  writeFileSync(configPath, JSON.stringify({ compilerOptions: { ...config.compilerOptions, types: [], typeRoots: [], lib: ['ESNext'] }, files: [path] }));
  return result(spawnSync(process.execPath, [tsc, '-p', configPath], { timeout: 30000, maxBuffer: 8 * 1024 * 1024 }));
}
function emit(source: string, name: string, timeout = 20000) {
  return result(spawnSync(process.execPath, [entry, artifact, name], { input: source, timeout, maxBuffer: 32 * 1024 * 1024 }));
}
function runT00(source: string, scenario: Scenario): ProcessResult {
  const process_ = spawnSync(process.execPath, [self, '--t00-worker'], { input: JSON.stringify({ source, stdin: scenario.stdin, stdinBytes: scenario.stdinBytes, args: scenario.args }), timeout: 5000, maxBuffer: 8 * 1024 * 1024 });
  if (process_.error || process_.status !== 0) return result(process_);
  return JSON.parse(process_.stdout.toString());
}
function runGenerated(path: string, scenario: Scenario) {
  return result(spawnSync(process.execPath, [entry, path, ...(scenario.args ?? [])], { input: scenario.stdinBytes === undefined ? scenario.stdin ?? '' : Buffer.from(scenario.stdinBytes), timeout: 5000, maxBuffer: 8 * 1024 * 1024 }));
}
function stream(value: Stream | undefined, base: string) {
  if (value === undefined) return '';
  const bytes = value.file === undefined ? value.bytes === undefined ? Buffer.from(value.text ?? '') : Buffer.from(value.bytes) : readFileSync(resolve(base, value.file));
  if (value.hash !== undefined && value.hash !== `sha256:${hash(bytes)}`) throw new Error(`stream hash mismatch in ${base}`);
  return bytes.toString('utf8');
}

function audit(input: AuditInput, source: string, scenarios: Scenario[]): AuditRow {
  const row: AuditRow = { ...input, sourceSha256: hash(source), source, t00Check: t00Accepts(source), status: 'unknown', cases: [] };
  if (!row.t00Check.accepted) { row.status = 'baseline'; report.rows.push(row); checkpoint(); return row; }
  row.t11Compile = emit(source, row.path ?? row.id);
  if (row.t11Compile.error || row.t11Compile.signal !== null) row.status = 'unknown';
  else if (row.t11Compile.status !== 0) row.status = 'rejected';
  else {
    const path = join(scratch, 'program.ts');
    writeFileSync(path, row.t11Compile.stdout);
    row.artifactTypecheck = strictCheck(path);
    row.status = row.artifactTypecheck.status === 0 && !row.artifactTypecheck.error ? 'matches' : 'typecheck';
  }
  row.cases = [];
  for (const scenario of scenarios) {
    const baseline = runT00(source, scenario);
    const item: Case = { name: scenario.name, stdin: scenario.stdin ?? '', ...(scenario.stdinBytes === undefined ? {} : { stdinBytes: scenario.stdinBytes }), args: scenario.args ?? [], t00: baseline };
    if (scenario.expected !== undefined) {
      item.t00MatchesManifest = same(baseline, { ...scenario.expected, signal: null });
      if (!item.t00MatchesManifest) row.status = 'baseline';
    }
    if (row.t11Compile.status === 0 && row.artifactTypecheck?.status === 0) {
      item.t11 = runGenerated(join(scratch, 'program.ts'), scenario);
      item.matches = same(baseline, item.t11);
      if (!item.matches && row.status !== 'baseline') {
        if (baseline.error || item.t11.error || baseline.signal !== null || item.t11.signal !== null) row.status = 'unknown';
        else if (baseline.status === item.t11.status && baseline.stdout === item.t11.stdout && baseline.status !== 0 && category(baseline.stderr) !== undefined && category(baseline.stderr) === category(item.t11.stderr)) row.status = row.status === 'mismatch' ? 'mismatch' : 'diagnostic';
        else row.status = 'mismatch';
      }
    }
    row.cases.push(item);
  }
  report.rows.push(row);
  checkpoint();
  log(`${row.kind} ${row.id}: ${statuses[row.status]}`);
  return row;
}

try {
  const seedCheck = strictCheck(artifact);
  if (seedCheck.status !== 0 || seedCheck.error) throw new Error('T11 seed strict typecheck failed');
  report.seedStrictTypecheck = 'passed';
  const registry = (JSON.parse(readFileSync(join(root, 'verifications/features.json'), 'utf8')) as { features: { id: string; summary: string; case: string }[] }).features;
  const featureSummaries = new Map(registry.map(feature => [feature.id, feature.summary]));
  const manifestFiles = [
    ...registry.map(feature => join('verifications', feature.case)),
    ...['examples', 'samples', 'showcases'].flatMap(kind => {
      const dir = join(root, 'verifications/artifacts', kind);
      return existsSync(dir) ? readdirSync(dir).filter(path => path.endsWith('.json')).sort().map(path => join('verifications/artifacts', kind, path)) : [];
    }),
  ];
  const coveredSources = new Map<string, string>();
  for (const file of manifestFiles) {
    const manifest = JSON.parse(readFileSync(join(root, file), 'utf8')) as Manifest;
    const base = dirname(join(root, file));
    const sourcePath = manifest.source.file === undefined ? undefined : resolve(base, manifest.source.file);
    const bytes = sourcePath === undefined ? manifest.source.bytes === undefined ? Buffer.from(manifest.source.text ?? '') : Buffer.from(manifest.source.bytes) : readFileSync(sourcePath);
    if (manifest.source.hash !== `sha256:${hash(bytes)}`) throw new Error(`source hash mismatch: ${file}`);
    const source = (sourcePath === undefined ? bytes.toString('utf8') : loadSource(sourcePath)) + (manifest.append === undefined ? '' : `\n${manifest.append}`);
    const scenarios = manifest.cases.map(scenario => ({ name: scenario.name, stdin: stream(scenario.stdin, base), args: scenario.args ?? [],
      expected: { status: scenario.exitCode, stdout: stream(scenario.stdout, base), stderr: stream(scenario.stderr, base) } }));
    const path = sourcePath === undefined ? undefined : relative(root, sourcePath);
    audit({ id: manifest.id, kind: manifest.kind, summary: featureSummaries.get(manifest.id) ?? manifest.description ?? manifest.id,
      path, manifest: file, features: manifest.features }, source, scenarios);
    if (path !== undefined) coveredSources.set(path, manifest.id);
  }
  const probes = JSON.parse(readFileSync(join(root, 'compiler/tests/t00-t11-probes.json'), 'utf8')) as Probe[];
  for (const probe of probes) {
    audit({ id: probe.id, kind: 'probe', summary: probe.summary, test: probe.test, features: [] }, probe.source,
      [{ name: 'boundary', stdin: probe.stdin ?? '', stdinBytes: probe.stdinBytes, args: probe.args ?? [] }]);
  }
  const tracked = execFileSync('git', ['ls-files', '*.lts', '*.lt'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  for (const path of tracked) {
    if (coveredSources.has(path)) { report.sourceFiles.push({ path, coverage: 'canonical-manifest', id: coveredSources.get(path)! }); continue; }
    let source;
    try { source = loadSource(join(root, path)); }
    catch (error) { report.sourceFiles.push({ path, coverage: 'load-error', diagnostic: String(error) }); continue; }
    const baseline = t00Accepts(source);
    const row: SourceFile = { path, sourceSha256: hash(source), bytes: Buffer.byteLength(source), t00Check: baseline };
    if (!baseline.accepted) { row.coverage = 'not-a-standalone-T00-program'; report.sourceFiles.push(row); continue; }
    if (hash(source) === seed.sourceSha256) {
      row.coverage = 'recorded-self-compilation'; row.status = 'accepted'; row.evidence = 'Current source bytes exactly match preserved T11/T12 source identity; not recompiled in this audit.';
    } else if (Buffer.byteLength(source) > 50000) {
      const evidence = sourceEvidence.find(item => item.path === path && item.sourceSha256 === hash(source) && item.t11Sha256 === seed.artifactSha256);
      if (evidence !== undefined) {
        row.coverage = 'compile-only-large'; row.t11Compile = evidence.compile;
        if (evidence.compile.status === 0 && evidence.compile.signal === null) {
          if (hash(readFileSync(evidence.artifactPath)) !== evidence.artifactSha256) throw new Error(`supplemental artifact identity mismatch: ${path}`);
          row.artifactTypecheck = strictCheck(evidence.artifactPath);
          row.compilationEvidence = { sourceSha256: evidence.sourceSha256, builderSha256: evidence.t11Sha256, artifactSha256: evidence.artifactSha256,
            origin: evidence.compile.reused ?? 'T11 compilation in this audit session' };
          row.status = row.artifactTypecheck.status === 0 && !row.artifactTypecheck.error ? 'accepted' : 'typecheck';
        } else row.status = evidence.compile.signal !== null || evidence.compile.error ? 'unknown' : 'rejected';
      } else if (largeSources) {
        const emitted = emit(source, path, 600000);
        row.coverage = 'compile-only-large';
        row.t11Compile = { ...emitted, stdout: undefined, stdoutBytes: Buffer.byteLength(emitted.stdout) };
        if (emitted.status === 0 && !emitted.error) {
          const output = join(scratch, 'large.ts'); writeFileSync(output, emitted.stdout);
          row.artifactTypecheck = strictCheck(output);
          row.status = row.artifactTypecheck.status === 0 && !row.artifactTypecheck.error ? 'accepted' : 'typecheck';
          row.artifactSha256 = hash(emitted.stdout);
        } else row.status = emitted.error || emitted.signal !== null ? 'unknown' : 'rejected';
      } else {
        row.coverage = 'large-bundle-not-recompiled'; row.status = 'unknown'; row.evidence = 'Excluded from bounded recompile; no unsupported-feature conclusion.';
      }
    } else if (path.startsWith('lib/tests/')) {
      const audited = audit({ id: path, path, kind: 'library-test', summary: path, features: [] }, source, [{ name: 'standalone', stdin: '', args: [] }]);
      row.coverage = 'executed-library-test'; row.status = audited.status;
    } else {
      const emitted = emit(source, path);
      row.coverage = 'compile-only'; row.t11Compile = { ...emitted, stdout: undefined, stdoutBytes: Buffer.byteLength(emitted.stdout) };
      row.status = emitted.error || emitted.signal !== null ? 'unknown' : emitted.status === 0 ? 'accepted' : 'rejected';
    }
    report.sourceFiles.push(row);
    checkpoint();
  }
  report.testGroups = [...readFileSync(join(root, 'igniter/test.ts'), 'utf8').matchAll(/^test\('([^']+)'/gm)].map(match => match[1]!);
  for (const kind of ['feature', 'example', 'sample', 'showcase', 'probe', 'library-test']) {
    const rows = report.rows.filter(row => row.kind === kind);
    report.counts[kind] = { total: rows.length, ...Object.fromEntries((Object.keys(statuses) as Status[]).map(status => [status, rows.filter(row => row.status === status).length])) };
  }
  report.counts['trackedSourceFiles'] = tracked.length;
  report.finishedAt = new Date().toISOString();
  report.status = report.rows.some(row => row.status === 'baseline') ? 'baseline-failure' : 'complete';
  checkpoint();
  const lines = [ '# T00 versus T11 support inventory', '', `Date: ${date}. Audited revision: \`${report.revision}\`. Node ${report.node}.`, '',
    `T11 identity: \`${seed.artifactSha256}\`. The preserved artifact passed its separate strict TypeScript check.`, '',
    'This is a neutral inventory, not an implementation order or acceptance of new language features. Existing compiler implementation changes were set aside before the audit.', '',
    '## Scope and interpretation', '',
    '- All canonical feature, example, sample and showcase manifests were selected, regardless of their existing target lists. Each scenario ran under T00, with its expected manifest bytes checked, and under the T11-generated TS program when compilation and strict checking succeeded.',
    '- Additional boundary probes isolate existing T00 contracts that a broad canonical program can hide. Their exact source, input, output and interpreter-test reference are in the raw JSON and probe file.',
    '- Every tracked Lite source is accounted for. Source fragments/data fixtures rejected as standalone programs by T00 are excluded. Remaining sources receive a compile-only check, except bundles explicitly linked to recorded self-compilation evidence. Large-source artifacts can reuse exact source/builder/artifact identities and receive a fresh strict typecheck; other source checks do not include execution.',
    '- A rejection is a gap for that program, not proof that every subfeature in it is absent. Matching one probe is not universal feature parity. Runtime diagnostics are distinguished from output/status mismatches. The 520 exercise catalog contains only 20 implemented lesson files; planned exercises are not counted as supported programs.',
    '- In particular, the canonical array.fixed and alias.transparent cases pass, while explicit fixed-array types, positional reads and aliases to arrays fail isolated probes. Scalar zero initialization passes even though the broader init.zero case fails. Canonical feature counts describe case results, not complete feature support.',
    '- Five-second execution and twenty-second ordinary compiler limits are bounded audit checks, not performance measurements. With --large-sources, compiler bundles over 50 KB receive up to ten minutes each. Timeout rows are unverified, not unsupported.', '',
    '## Counts', '',
    ...Object.entries(report.counts).filter(([, counts]) => typeof counts === 'number' || counts.total > 0).map(([kind, counts]) => typeof counts === 'number' ? `- ${kind}: ${counts}.` : `- ${kind}: ${counts.total}; ${(Object.entries(statuses) as [Status, string][]).filter(([status]) => (counts[status] ?? 0) > 0).map(([status,label]) => `${counts[status]} ${label}`).join('; ')}.`),
    '- Showcases: none currently implemented.', '',
  ];
  for (const kind of ['feature', 'probe', 'example', 'sample', 'library-test']) {
    lines.push(`## ${kind}`, '');
    for (const row of report.rows.filter(row => row.kind === kind)) {
      lines.push(`- **${row.id} — ${statuses[row.status]}.** ${row.summary}${row.path ? ` Source: \`${row.path}\`.` : ''}`);
      if (row.status === 'rejected') lines.push(`  First diagnostic: ${row.t11Compile!.stderr.trim().split('\n')[0]}`);
      if (row.status === 'typecheck') lines.push(`  Strict-check diagnostic: ${(row.artifactTypecheck!.stdout + row.artifactTypecheck!.stderr).trim().split('\n')[0]}`);
      if (row.status === 'mismatch' || row.status === 'diagnostic') for (const scenario of row.cases.filter(item => item.matches === false)) {
        lines.push(`  ${scenario.name}: T00 status ${scenario.t00.status}, stdout ${JSON.stringify(scenario.t00.stdout)}; T11 status ${scenario.t11!.status}, stdout ${JSON.stringify(scenario.t11!.stdout)}.`);
      }
    }
    lines.push('');
  }
  lines.push('## Other tracked Lite sources', '', ...report.sourceFiles.filter(row => row.coverage !== 'canonical-manifest').map(row =>
    `- \`${row.path}\`: ${row.status ? statuses[row.status] : row.coverage}${row.evidence ? `. ${row.evidence}` : ''}.`), '',
    '## Reproduce', '', '```sh', 'node compiler/scripts/t00-t11-inventory.ts --large-sources', '```', '',
    `Full observations and source probes: [raw JSON](${prefix.split('/').at(-1)}.json).`, '');
  writeFileSync(`${prefix}.md`, lines.join('\n'));
  log(`inventory saved: ${prefix}.{json,md}`);
  process.stdout.write(JSON.stringify({ status: report.status, counts: report.counts }, null, 2) + '\n');
  if (report.status !== 'complete') process.exitCode = 1;
} finally { rmSync(scratch, { recursive: true, force: true }); }
