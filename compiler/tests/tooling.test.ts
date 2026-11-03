/** Real CLI contracts for generated compiler tools, independent of T00. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { seed } from '../bootstrap/seed.ts';
import { prepareTsArtifacts } from '../../igniter/artifacts.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
function invoke(directory: string, command: string, args: string[]) {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];
  return spawnSync(process.execPath, [join(directory, command), ...args], { cwd: directory, env, encoding: 'utf8', timeout: 90000, maxBuffer: 8 * 1024 * 1024 });
}
function summary(result: ReturnType<typeof invoke>): Record<string, unknown> {
  assert.equal(result.error, undefined); assert.equal(result.signal, null); assert.equal(result.status, 0, result.stdout + result.stderr);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

/** Copies tool inputs with relative links intact and all T00 adapters absent. */
function copyToolArchive(directory: string): void {
  for (const path of ['compiler', 'igniter', 'lib', 'benchmark', 'tools', 'config', 'bin']) {
    cpSync(join(root, path), join(directory, path), { recursive: true, verbatimSymlinks: true,
      filter: candidate => !/(?:\/node_modules|\/reports|\/lite\.ts|\/bootstrap\.ts|\/bundle-cli\.ts|\/cli\.ts)$/.test(candidate) || candidate.endsWith('/compiler/cli.ts') });
  }
  symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
}

test('generated self-build records three strictly checked generations without relabeling T11', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite tools ladder '));
  try {
    const result = summary(invoke(root, 'compiler/scripts/self-host.ts', ['--out', directory]));
    assert.equal(result['phase'], 'generated-fixed-point'); assert.equal(result['fixedPoint'], true); assert.equal(result['equalsSelectedBuilder'], true); assert.equal(result['matchesSelectedCompiler'], true);
    const generations = result['generations'] as { artifactSha256: string; builderSha256: string; sourceSha256: string; path: string }[];
    assert.equal(generations.length, 3);
    for (const [i, item] of generations.entries()) {
      assert.equal(item.artifactSha256, seed.artifactSha256); assert.equal(item.builderSha256, seed.artifactSha256);
      assert.equal(item.sourceSha256, seed.sourceSha256); assert.equal(item.path, join(directory, `generation-${i + 1}.ts`));
      assert.ok(existsSync(item.path));
    }
    assert.equal(existsSync(join(directory, 'T11.ts')), false);
    assert.equal(JSON.parse(readFileSync(join(directory, 'ladder.json'), 'utf8')).fixedPoint, true);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('tooling separates option/type failures, fixed points and compiler conformance', () => {
  for (const timeoutMs of [-1, 1.5, Number.NaN]) assert.throws(() => prepareTsArtifacts([], { timeoutMs }), /invalid TS artifact execution timeout/);
  const directory = mkdtempSync(join(tmpdir(), 'lite-tools-invalid-'));
  try {
    const broken = join(directory, 'broken artifact.ts'); writeFileSync(broken, 'export function main(): string { return 42; }');
    for (const command of ['compiler/scripts/self-host.ts', 'compiler/scripts/corpus-parity.ts', 'benchmark/compiler-performance.ts']) {
      for (const args of [['--unknown'], ['--artifact'], ['--artifact', broken]]) {
        const result = invoke(root, command, args);
        assert.equal(result.error, undefined); assert.notEqual(result.status, 0); assert.notEqual(result.stderr, '');
        assert.equal(result.stdout, '', command + args.join(' '));
      }
    }
    for (const args of [['--samples', '0'], ['--warmups', '-1'], ['--samples', '1', '--samples', '2']]) {
      const result = invoke(root, 'benchmark/compiler-performance.ts', args);
      assert.notEqual(result.status, 0); assert.equal(result.stdout, '');
    }
    const c = invoke(root, 'compiler/scripts/corpus-parity.ts', ['--target', 'c']);
    assert.notEqual(c.status, 0); assert.match(c.stderr, /deferred/);
    // A self-reproducing TS module is not a compiler of S, even when its bytes stabilize.
    const template = 'declare const process: { getBuiltinModule(name: string): { readFileSync(fd: number): unknown } }; export function main(): string { process.getBuiltinModule("node:fs").readFileSync(0); const template = TEMPLATE; return template.replace("TEMPLATE", JSON.stringify(template)); }';
    const quine = join(directory, 'unrelated-builder.ts');
    writeFileSync(quine, template.replace('TEMPLATE', JSON.stringify(template)));
    const unrelated = invoke(root, 'compiler/scripts/self-host.ts', ['--artifact', quine, '--out', join(directory, 'unrelated')]);
    assert.equal(unrelated.error, undefined); assert.equal(unrelated.status, 0, unrelated.stderr);
    assert.notEqual(unrelated.stdout, '', unrelated.stderr);
    const ladder = JSON.parse(unrelated.stdout) as { fixedPoint: boolean; matchesSelectedCompiler: boolean };
    assert.equal(ladder.fixedPoint, true); assert.equal(ladder.matchesSelectedCompiler, false);
    const conformance = invoke(root, 'compiler/scripts/corpus-parity.ts', ['--artifact', join(directory, 'unrelated/generation-3.ts')]);
    assert.equal(conformance.status, 1);
    assert.equal((JSON.parse(conformance.stdout) as { mismatches: unknown[] }).mismatches.length, 93);
    const out = join(directory, 'failed');
    const failed = invoke(root, 'compiler/scripts/self-host.ts', ['--artifact', broken, '--out', out]);
    assert.notEqual(failed.status, 0); assert.equal(existsSync(join(out, 'ladder.json')), false);
    assert.equal(existsSync(join(out, 'generation-1.ts')), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('corpus command checks exact artifacts, rejected streams and executed program contracts', () => {
  const result = summary(invoke(root, 'compiler/scripts/corpus-parity.ts', []));
  assert.equal(result['phase'], 'recorded-contracts'); assert.equal(result['cases'], 93);
  assert.equal(result['programs'], 69); assert.equal(result['rejections'], 24); assert.equal(result['executions'], 69);
  assert.deepEqual(result['mismatches'], []); assert.equal(result['artifactSha256'], seed.artifactSha256);
  const directory = mkdtempSync(join(tmpdir(), 'lite-tools-mismatch-'));
  try {
    const artifact = join(directory, 'wrong.ts'); writeFileSync(artifact, 'export function main(): string { return "wrong compiler output"; }');
    const wrong = invoke(root, 'compiler/scripts/corpus-parity.ts', ['--artifact', artifact]);
    assert.equal(wrong.error, undefined); assert.equal(wrong.status, 1);
    const report = JSON.parse(wrong.stdout) as { mismatches: string[]; executions: number };
    assert.equal(report.mismatches.length, 93); assert.equal(report.executions, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('everyday tooling and benchmark work in a source archive without T00 or Git metadata', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-tools-no-t00-'));
  try {
    copyToolArchive(directory);
    for (const name of ['.git', 'igniter/lite.ts', 'igniter/bootstrap.ts', 'igniter/bundle-cli.ts', 'igniter/cli.ts']) assert.equal(existsSync(join(directory, name)), false);
    // Reports are not needed by the commands; the recorded artifact contract is retained under generated/.
    const out = join(directory, '.cache/tooling'); mkdirSync(dirname(out), { recursive: true });
    assert.equal(summary(invoke(directory, 'compiler/scripts/self-host.ts', ['--out', out]))['fixedPoint'], true);
    const corpus = summary(invoke(directory, 'compiler/scripts/corpus-parity.ts', []));
    assert.equal(corpus['cases'], 93); assert.equal(corpus['executions'], 69); assert.deepEqual(corpus['mismatches'], []);
    const prefix = join(directory, '.cache/benchmark');
    const report = summary(invoke(directory, 'benchmark/compiler-performance.ts', ['--samples', '1', '--warmups', '0', '--out', prefix]));
    assert.equal(report['mode'], 'generated-only'); assert.equal(report['revision'], null);
    assert.equal((report['method'] as { samples: number; warmups: number }).samples, 1);
    assert.deepEqual((report['runtime'] as { checkedSyntheticOutputCounts: number[] }).checkedSyntheticOutputCounts, [1, 100, 1000]);
    assert.equal((report['results'] as unknown[]).length, 5);
    assert.deepEqual((report['selfBuildValidation'] as { mismatches: unknown[] }).mismatches, []);
    assert.equal(report['selfBuildArtifactSha256'], seed.artifactSha256); assert.ok(existsSync(prefix + '.md'));
    const persisted = JSON.parse(readFileSync(prefix + '.json', 'utf8')) as { validation: { mismatches: unknown[] }; runtime: { samples: number[] } };
    assert.deepEqual(persisted.validation.mismatches, []); assert.equal(persisted.runtime.samples.length, 1);
    for (const command of ['compiler/scripts/self-host.ts', 'compiler/scripts/corpus-parity.ts', 'benchmark/compiler-performance.ts']) {
      const reference = invoke(directory, command, ['--reference', ...(command.endsWith('corpus-parity.ts') ? ['--artifact', join(directory, 'compiler/bootstrap/T11.ts')] : [])]);
      assert.notEqual(reference.status, 0); assert.match(reference.stdout + reference.stderr, /MODULE_NOT_FOUND|Cannot find module/);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});


test('changed Lite emission can reach a new generated fixed point before seed selection', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-tools-refresh-'));
  try {
    copyToolArchive(directory);
    const path = join(directory, 'compiler/src/emit-ts.lts');
    const source = readFileSync(path, 'utf8');
    const anchor = '    outputLine("export function main(lite$write?: (text: string) => void): string {");';
    assert.ok(source.includes(anchor));
    writeFileSync(path, source.replace(anchor, '    outputLine("// generated refresh probe");\n' + anchor));
    const result = summary(invoke(directory, 'compiler/scripts/self-host.ts', ['--out', join(directory, '.cache/ladder')]));
    assert.equal(result['fixedPoint'], true); assert.equal(result['equalsSelectedBuilder'], false);
    assert.equal(result['matchesSelectedCompiler'], false);
    const generations = result['generations'] as { artifactSha256: string; builderSha256: string }[];
    assert.equal(new Set(generations.map(g => g.artifactSha256)).size, 1);
    assert.notEqual(generations[0]!.builderSha256, generations[0]!.artifactSha256);
    assert.equal(generations[1]!.builderSha256, generations[0]!.artifactSha256);
    assert.ok(readFileSync(join(directory, '.cache/ladder/generation-3.ts'), 'utf8').includes('// generated refresh probe\nexport function main('));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
