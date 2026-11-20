import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, lstatSync, readlinkSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { seed } from '../bootstrap/seed.ts';
import { buildCompiler, buildTsCompiler, compileTarget, compileTs, loadManifest, prepareTsArtifacts, checkTsArtifact, runTsArtifact, runCArtifact, withTsArtifact, withTsArtifacts, type CompilerTarget } from '../../igniter/artifacts.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };

test('TS artifact capture preserves large synchronous writes and the returned tail', () => {
  const chunk = '🙂سلام\0\r\n'.repeat(32768);
  const artifact = `export function main(report: (text: string) => void): string {
    const chunk = ${JSON.stringify(chunk)};
    report(chunk);
    report(chunk);
    return "tail\\n";
  }`;
  const actual = runTsArtifact(artifact);
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.equal(actual.status, 0, actual.stderr.toString());
  assert.equal(actual.signal, null);
  assert.equal(actual.stderr.length, 0);
  assert.ok(actual.stdout.equals(Buffer.from(chunk + chunk + 'tail\n')), 'complete raw output including returned tail');
});

test('prepareTsArtifacts rejects invalid execution timeouts', () => {
  for (const timeoutMs of [-1, 1.5, Number.NaN]) {
    assert.throws(() => prepareTsArtifacts([], { timeoutMs }), /invalid TS artifact execution timeout/);
  }
});

test('TS artifact capture preserves repeated output, diagnostics and early exit across fresh runs', () => {
  const chunk = '🙂سلام\r\n'.repeat(128);
  const source = 'io := import "core/io"; mode := io.inputInt(); var n := 0; loop n < 512 { ' +
    `io.output(${JSON.stringify(chunk)}); io.errorLine(${JSON.stringify(chunk)}); n = n + 1; } ` +
    'io.output(io.inputAll("prompt: ")); if mode == 1 { io.exit(7); } ' +
    'if mode == 2 { io.outputLine(1 / 0); } io.outputLine("tail");';
  const compiled = compileTs({ text: source, name: 'capture.lts' });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  withTsArtifact(compiled.stdout.toString(), run => {
    for (const mode of [0, 1, 2, 0]) {
      const actual = run({ stdin: `${mode}\nreply\n` });
      assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
      assert.equal(actual.signal, null);
      assert.equal(actual.status, mode === 0 ? 0 : mode === 1 ? 7 : 1, actual.stderr.subarray(-512).toString());
      const stdout = chunk.repeat(512) + 'prompt: \nreply\n' + (mode === 0 ? 'tail\n' : '');
      assert.ok(actual.stdout.equals(Buffer.from(stdout)), `stdout for mode ${mode}`);
      // reportError adds one newline per call; runtime faults follow those bytes.
      const errors = (chunk + '\n').repeat(512);
      assert.ok(actual.stderr.subarray(0, Buffer.byteLength(errors)).equals(Buffer.from(errors)), `stderr for mode ${mode}`);
      const suffix = actual.stderr.subarray(Buffer.byteLength(errors)).toString();
      if (mode === 2) assert.match(suffix, /^capture\.lts:1:\d+: ArithmeticPanic: division by zero\n$/);
      else assert.equal(suffix, '');
    }
  });
});

test('TS artifact capture rejects oversized buffers and clears output before the next run', () => {
  withTsArtifact(`declare const process: { argv: string[] };
    export function main(): string {
      return process.argv[2] === "large" ? "x".repeat(16 * 1024 * 1024 + 1) : "small";
    }`, run => {
    assert.throws(() => run({ args: ['large'] }), /TS artifact output exceeds 16 MiB capture limit/);
    assert.deepEqual(run(), {
      phase: 'run', status: 0, signal: null, stdout: Buffer.from('small'), stderr: Buffer.alloc(0),
    });
  });
});

test('artifact check-only reports strict errors without loading or executing a module', () => {
  const checked = checkTsArtifact('export function main(): string { return "unused"; }\nthrow new Error("must not load");');
  assert.equal(checked.phase, 'typecheck'); assert.equal(checked.status, 0); assert.equal(checked.signal, null);
  assert.equal(checked.stdout.length, 0); assert.equal(checked.stderr.length, 0);
  const rejected = checkTsArtifact('export function main(): string { return 42; }');
  assert.equal(rejected.phase, 'typecheck'); assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout.toString() + rejected.stderr.toString(), /not assignable to type 'string'/);
});

test('public commands compile, run and check TS artifacts without T00 and reject C output', () => {
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    assert.equal(existsSync(join(directory, 'igniter/lite.ts')), false);
    const path = join(directory, 'program with spaces.lts');
    writeFileSync(join(directory, 'helper.lts'), 'pub twice := fn(n: Int): Int { n * 2 }');
    writeFileSync(path, 'io := import "core/io"; helper := import "./helper.lts";\nio.outputLine(helper.twice(io.inputInt("n? ")));');
    const compiled = spawnSync(join(directory, 'bin/lite'), ['compile', path], { env, timeout: 60000 });
    assert.equal(compiled.status, 0, compiled.stderr.toString()); assert.equal(compiled.stderr.length, 0);
    const artifact = join(directory, 'program.ts'); writeFileSync(artifact, compiled.stdout);
    const runnerScript = "import { writeSync } from 'node:fs'; import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL(process.argv[1]).href); const out = m.main((t) => writeSync(1, t)); if (typeof out === 'string' && out.length > 0) writeSync(1, out);";
    const executed = spawnSync(process.execPath, ['--input-type=module', '-e', runnerScript, artifact], { input: '7', env, timeout: 60000 });
    assert.equal(executed.status, 0, executed.stderr.toString()); assert.equal(executed.stdout.toString(), 'n? 14\n');
    const ran = spawnSync(join(directory, 'bin/lite'), ['run', path], { input: '7', env, timeout: 60000 });
    assert.equal(ran.status, 0, ran.stderr.toString()); assert.equal(ran.stdout.toString(), 'n? 14\n'); assert.equal(ran.stderr.length, 0);
    const checked = spawnSync(join(directory, 'bin/lite'), ['check', path], { input: Buffer.from([0xff]), env, timeout: 60000 });
    assert.equal(checked.status, 0, checked.stderr.toString()); assert.equal(checked.stdout.length, 0); assert.equal(checked.stderr.length, 0);
    writeFileSync(join(directory, 'helper.lts'), 'twice := fn(n: Int): Int { n * 2 }');
    writeFileSync(path, 'io := import "core/io"; helper := import "./helper.lts"; io.outputLine(helper.twice(21));');
    const privateCompile = spawnSync(join(directory, 'bin/lite'), ['compile', path], { env, timeout: 30000 });
    assert.equal(privateCompile.status, 2); assert.equal(privateCompile.stdout.length, 0);
    assert.match(privateCompile.stderr.toString(), /unknown module member helper\.twice/);
    const privateCheck = spawnSync(join(directory, 'bin/lite'), ['check', path], { env, timeout: 30000 });
    assert.equal(privateCheck.status, 1); assert.equal(privateCheck.stdout.length, 0);
    assert.match(privateCheck.stderr.toString(), /unknown module member helper\.twice/);
    const privateRun = spawnSync(join(directory, 'bin/lite'), ['run', path], { env, timeout: 30000 });
    assert.equal(privateRun.status, 2); assert.equal(privateRun.stdout.length, 0);
    assert.match(privateRun.stderr.toString(), /unknown module member helper\.twice/);
    const deferred = spawnSync(join(directory, 'bin/lite'), ['compile', '--target', 'c', path], { env, timeout: 30000 });
    assert.equal(deferred.status, 2); assert.equal(deferred.stdout.length, 0);
    assert.match(deferred.stderr.toString(), /C output is deferred/);
    writeFileSync(path, 'io := import "core/io"; io.outputLine("before"); record Foo { };');
    const unsupported = spawnSync(join(directory, 'bin/lite'), ['check', path], { env, timeout: 30000 });
    assert.equal(unsupported.status, 1); assert.equal(unsupported.stdout.length, 0);
    assert.match(unsupported.stderr.toString(), /unsupported feature "record"/);
    writeFileSync(path, 'io := import "core/io"; io.outputLine("before"); unknown();');
    const invalid = spawnSync(join(directory, 'bin/lite'), ['compile', path], { env, timeout: 30000 });
    assert.equal(invalid.status, 2); assert.equal(invalid.stdout.length, 0); assert.match(invalid.stderr.toString(), /unknown value unknown/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('default verification and expectation updates use TS artifacts without T00', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    copyFileSync(join(root, 'igniter/package-lock.json'), join(directory, 'igniter/package-lock.json'));
    for (const folder of ['language/verifications', 'language/examples', 'language/samples', 'language/showcases']) {
      if (existsSync(join(root, folder))) cpSync(join(root, folder), join(directory, folder), { recursive: true });
    }
    const registry = JSON.parse(readFileSync(join(root, 'language/verifications/features.json'), 'utf8')) as { features: { docs: string[] }[] };
    for (const item of registry.features) for (const path of item.docs) {
      mkdirSync(dirname(join(directory, path)), { recursive: true }); copyFileSync(join(root, path), join(directory, path));
    }
    const invoke = (...args: string[]) => spawnSync(join(directory, 'bin/lite'), ['verify', '--all', '--no-cache', ...args],
      { env, encoding: 'utf8', timeout: 60000 });
    const io = invoke('--filter', 'feature.io.reporting.prompt-and-output-helpers');
    assert.equal(io.status, 0, io.stdout + io.stderr); assert.match(io.stdout, /all-helpers \[ts\]/);
    assert.match(io.stdout, /empty-line-and-remainder \[ts\]/); assert.doesNotMatch(io.stdout, /T00 reference|\[c\]/);
    const covered = invoke('--coverage'); assert.equal(covered.status, 0, covered.stderr);
    const manifest = join(directory, 'language/verifications/features/numeric/integers/signed-arithmetic.json');
    const expected = readFileSync(manifest);
    const updated = invoke('--filter', 'features/numeric/integers/signed-arithmetic.json', '--update');
    assert.equal(updated.status, 0, updated.stdout + updated.stderr); assert.match(updated.stdout, /updated/);
    assert.deepEqual(JSON.parse(readFileSync(manifest, 'utf8')), JSON.parse(expected.toString()));
    writeFileSync(join(directory, 'language/verifications/features/numeric/integers/signed-arithmetic.lts'), 'record Foo { };\n', 'utf8');
    const before = readFileSync(manifest);
    const failed = invoke('--filter', 'features/numeric/integers/signed-arithmetic.json', '--update');
    assert.equal(failed.status, 1); assert.match(failed.stdout, /unsupported feature "record"/);
    assert.deepEqual(readFileSync(manifest), before, 'unsupported source must not rewrite expectations');
    const legacy = invoke('--reference', '--filter', 'feature.numeric.integers.signed-arithmetic');
    assert.equal(legacy.status, 2); assert.match(legacy.stderr, /unknown argument --reference/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

/** Copies only host glue, the seed and Lite sources; the T00 implementation is deliberately absent. */
function isolatedCheckout(): string {
  const directory = mkdtempSync(join(tmpdir(), 'lite-t11-checkout-'));
  const dependencies = (['ts', 'c'] as const).flatMap(target => buildCompiler(target).dependencies);
  const toolSources = readdirSync(join(root, 'tools/src')).filter(f => f.endsWith('.lts')).map(f => `tools/src/${f}`);
  const coreLibs = readdirSync(join(root, 'lib/core')).filter(f => f.endsWith('.lts')).map(f => `lib/core/${f}`);
  const externalLibs = readdirSync(join(root, 'lib/external')).filter(f => f.endsWith('.lts')).map(f => `lib/external/${f}`);
  const utilLibs = readdirSync(join(root, 'lib/util')).filter(f => f.endsWith('.lts')).map(f => `lib/util/${f}`);
  const paths = new Set([
    'bin/lite', 'bin/lite-compile', 'bin/lite-compile-ts', 'bin/lite-compile-c', 'bin/lite-check', 'bin/lite-run', 'bin/lite-verify',
    'compiler/package.json',
    'igniter/test-suites.ts', 'igniter/artifacts.ts', 'igniter/package.json',
    'config/versions.json',
    'compiler/bootstrap/igniter.ts', 'compiler/bootstrap/seed.ts', 'compiler/bootstrap/tsconfig.json',
    'compiler/manifests/ts.json', 'compiler/manifests/c.json', 'igniter/tsconfig.json',
    ...dependencies, ...toolSources, ...coreLibs, ...externalLibs, ...utilLibs,
  ]);
  for (const path of paths) {
    const destination = join(directory, path);
    mkdirSync(dirname(destination), { recursive: true });
    if (lstatSync(join(root, path)).isSymbolicLink()) symlinkSync(readlinkSync(join(root, path)), destination);
    else copyFileSync(join(root, path), destination);
  }
  chmodSync(join(directory, 'bin/lite-compile-ts'), 0o755);
  return directory;
}

/** Invokes the copied launcher and captures exact bytes, without a fallback interpreter. */
function invoke(directory: string, source: string | Buffer, target: CompilerTarget = 'ts') {
  const path = join(directory, 'source with spaces.lts');
  writeFileSync(path, source);
  return target === 'ts'
    ? spawnSync(join(directory, 'bin/lite-compile-ts'), [path], { env, timeout: 120000 })
    : spawnSync(process.execPath, [
      '--input-type=module', '-e',
      "import { buildCompiler } from './igniter/artifacts.ts'; import { writeSync } from 'node:fs'; import { pathToFileURL } from 'node:url'; const c = buildCompiler('c').path; const m = await import(pathToFileURL(c).href); process.argv = [process.execPath, c, process.argv[1]]; const out = m.main((t) => writeSync(1, t)); if (out === undefined) process.exitCode = 2; else if (typeof out !== 'string') process.exitCode = 1; else if (out.length > 0) writeSync(1, out);",
      path,
    ], { cwd: directory, env, timeout: 120000 });
}

test('TS host rebuilds the Lite source graph and preserves output, diagnostics and source names', () => {
  const built = buildTsCompiler();
  assert.equal(built.builderSha256, seed.artifactSha256);
  assert.equal(built.artifactSha256, seed.artifactSha256);
  assert.ok(built.dependencies.includes('compiler/src/frontend.lts'));
  assert.ok(built.dependencies.includes('lib/core/text.lts'));
  const reference = readFileSync(join(root, 'compiler/tests/references/generated/report-42.ts'));
  for (const name of [undefined, '', 'a b.lts', 'سلام🙂.lts', 'quote";\\\nname.lts']) {
    const input = name === undefined ? { text: 'io := import "core/io"; io.outputLine(42);' } : { text: 'io := import "core/io"; io.outputLine(42);', name };
    assert.deepEqual(compileTs(input), { status: 0, stdout: reference, stderr: Buffer.alloc(0) });
    const bad = name === undefined ? { text: 'io := import "core/io"; io.outputLine(1 +);' } : { text: 'io := import "core/io"; io.outputLine(1 +);', name };
    assert.deepEqual(compileTs(bad), { status: 2, stdout: Buffer.alloc(0),
      stderr: Buffer.from(`${name === undefined || name === '' ? '' : name + ':'}1:42: expected an Int, Float, String or Bool expression\n`) });
  }
});

test('public TS compilation and the retained internal C host work without T00', () => {
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    assert.equal(existsSync(join(directory, 'igniter/lite.ts')), false);
    assert.equal(existsSync(join(directory, 'igniter/bootstrap.ts')), false);
    for (const target of ['ts', 'c'] as const) {
      const result = invoke(directory, 'io := import "core/io"; io.outputLine(42);', target);
      assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString());
      assert.deepEqual(result.stdout, readFileSync(join(root, `compiler/tests/references/generated/report-42.${target}`)));
      assert.equal(result.stderr.length, 0);
      const bad = invoke(directory, 'io := import "core/io"; io.outputLine(42);\nunsupported();\n', target);
      assert.equal(bad.error, undefined); assert.equal(bad.status, 2);
      assert.equal(bad.stdout.length, 0); assert.ok(bad.stderr.length > 0);
      const invalid = invoke(directory, Buffer.from([0xff]), target);
      assert.equal(invalid.status, 1); assert.equal(invalid.stdout.length, 0);
      assert.match(invalid.stderr.toString(), /InputFault: cannot read input: invalid UTF-8/);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a changed Lite compiler rebuilds with the selected seed, caches by source and rejects corrupt cache bytes', () => {
  const directory = isolatedCheckout();
  try {
    // Only the TypeScript checker is shared; the copied checkout still has no T00 code.
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    const source = join(directory, 'compiler/src/fixture.lts');
    writeFileSync(join(directory, 'compiler/manifests/ts.json'), JSON.stringify({ target: 'ts', files: ['../src/fixture.lts'] }));
    writeFileSync(source, 'io := import "core/io"; source := io.inputAll();\nio.outputLine("fresh");\n');
    const first = invoke(directory, 'io := import "core/io"; io.outputLine(42);');
    assert.equal(first.error, undefined); assert.equal(first.status, 0, first.stderr.toString());
    assert.equal(first.stdout.toString(), 'fresh\n');
    const second = invoke(directory, 'io := import "core/io"; io.outputLine(7);');
    assert.equal(second.status, 0); assert.deepEqual(second.stdout, first.stdout);
    // Ask the real build selector for its exact cache path inside the copied checkout.
    const selected = spawnSync(process.execPath, ['--input-type=module', '-e',
      'import {buildTsCompiler} from "./igniter/artifacts.ts"; process.stdout.write(JSON.stringify(buildTsCompiler()));'],
    { cwd: directory, env, encoding: 'utf8', timeout: 120000 });
    assert.equal(selected.status, 0, selected.stderr);
    const record: unknown = JSON.parse(selected.stdout);
    assert.ok(typeof record === 'object' && record !== null && 'path' in record && typeof record.path === 'string');
    assert.ok('cached' in record && record.cached === true);
    writeFileSync(record.path, readFileSync(record.path, 'utf8') + '\n');
    const corrupt = invoke(directory, 'io := import "core/io"; io.outputLine(42);');
    assert.equal(corrupt.status, 1); assert.equal(corrupt.stdout.length, 0);
    assert.match(corrupt.stderr.toString(), /cache integrity mismatch/);
    // A new source hash cannot accidentally pick the old cache or the original seed.
    writeFileSync(source, 'this is not valid Lite');
    const rejected = invoke(directory, 'io := import "core/io"; io.outputLine(42);');
    assert.equal(rejected.status, 1); assert.equal(rejected.stdout.length, 0);
    assert.match(rejected.stderr.toString(), /cannot rebuild current compiler source/);
    assert.match(rejected.stderr.toString(), /fixture\.lts:1:/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a modified bootstrap seed fails explicitly without executing T00', () => {
  const directory = isolatedCheckout();
  try {
    const path = join(directory, `compiler/bootstrap/${seed.artifact}`);
    writeFileSync(path, readFileSync(path, 'utf8') + '\n');
    const result = invoke(directory, 'io := import "core/io"; io.outputLine(42);');
    assert.equal(result.status, 1); assert.equal(result.stdout.length, 0);
    assert.match(result.stderr.toString(), /selected TS bootstrap seed hash mismatch/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('selected compiler build exposes its imported source dependencies', () => {
  const selected = buildCompiler('ts');
  assert.deepEqual(selected.dependencies.slice(0, 2), [
    'compiler/src/ts-root.lts', 'compiler/src/driver-ts.lts',
  ]);
  assert.ok(selected.dependencies.includes('compiler/src/frontend.lts'));
  assert.ok(selected.dependencies.includes('compiler/src/host-fs.lts'));
  assert.ok(selected.dependencies.includes('compiler/src/numeric-literals.lts'));
});

test('the unchanged selected TS source graph uses its verified seed without a local TypeScript install', () => {
  const directory = isolatedCheckout();
  try {
    assert.equal(existsSync(join(directory, 'igniter/node_modules/typescript/bin/tsc')), false);
    const selected = spawnSync(process.execPath, ['--input-type=module', '-e',
      'import {buildTsCompiler} from "./igniter/artifacts.ts"; const first = buildTsCompiler(); const t0 = performance.now(); const second = buildTsCompiler(); process.stdout.write(JSON.stringify({ first, second, secondMs: performance.now() - t0 }));'],
    { cwd: directory, env, encoding: 'utf8', timeout: 60000 });
    assert.equal(selected.error, undefined);
    assert.equal(selected.status, 0, selected.stderr);
    const result = JSON.parse(selected.stdout) as {
      first: { path: string; sourceSha256: string; artifactSha256: string; cached: boolean };
      second: { path: string; sourceSha256: string; artifactSha256: string; cached: boolean };
      secondMs: number;
    };
    const expectedPath = realpathSync(join(directory, 'dist/bootstrap/compiler.ts'));
    for (const item of [result.first, result.second]) {
      assert.equal(item.path, expectedPath);
      assert.equal(item.sourceSha256, seed.sourceSha256);
      assert.equal(item.artifactSha256, seed.artifactSha256);
      assert.equal(item.cached, false);
    }
    assert.equal(readdirSync(join(directory, 'dist/compiler-cache/selection')).length, 1);
    assert.ok(result.secondMs < 200, `expected persisted selection reuse under 200ms, took ${result.secondMs.toFixed(1)}ms`);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('the graph-built TS-hosted C emitter preserves source names and subset rejection', () => {
  const selected = buildCompiler('c');
  assert.equal(selected.target, 'c');
  assert.notEqual(selected.artifactSha256, seed.artifactSha256);
  assert.equal(selected.builderSha256, seed.artifactSha256);
  assert.equal(selected.dependencies[0], 'compiler/src/c-root.lts');
  assert.ok(selected.dependencies.includes('compiler/src/emit-c.lts'));
  const simpleC = compileTarget('c', { text: 'io := import "core/io"; io.outputLine(42);', name: 'سلام file.lts' });
  assert.deepEqual(simpleC, {
    status: 0, stdout: readFileSync(join(root, 'compiler/tests/references/generated/report-42.c')), stderr: Buffer.alloc(0),
  });
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const native = runCArtifact(simpleC.stdout.toString());
    assert.equal(native.phase, 'run'); assert.equal(native.status, 0, native.stderr.toString());
    assert.equal(native.stdout.toString(), '42\n'); assert.equal(native.stderr.length, 0);
  }
  assert.deepEqual(compileTarget('c', { text: 'io := import "core/io"; io.outputLine(1 +);', name: 'a b.lts' }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from('a b.lts:1:42: expected an Int, Float, String or Bool expression\n'),
  });
  const fnC = compileTarget('c', { text: 'io := import "core/io"; f := fn(): Int { 1 } io.outputLine(f());' });
  assert.equal(fnC.status, 0);
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const fnNative = runCArtifact(fnC.stdout.toString());
    assert.equal(fnNative.phase, 'run'); assert.equal(fnNative.status, 0, fnNative.stderr.toString());
    assert.equal(fnNative.stdout.toString(), '1\n'); assert.equal(fnNative.stderr.length, 0);
  }
  assert.deepEqual(compileTarget('c', { text: 'io := import "core/io"; xs: List<Int> = [1]; io.outputLine(xs[0]);' }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from('C backend does not support list values yet\n'),
  });
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    const built = spawnSync(process.execPath, ['--input-type=module', '-e',
      'import {buildCompiler} from "./igniter/artifacts.ts"; process.stdout.write(JSON.stringify(buildCompiler("c")));'],
    { cwd: directory, env, encoding: 'utf8', timeout: 120000 });
    assert.equal(built.status, 0, built.stderr);
    const artifactPath = (JSON.parse(built.stdout) as { path: string }).path;
    writeFileSync(artifactPath, readFileSync(artifactPath, 'utf8') + '\n');
    const corrupt = invoke(directory, 'io := import "core/io"; io.outputLine(42);', 'c');
    assert.equal(corrupt.status, 1); assert.equal(corrupt.stdout.length, 0);
    assert.match(corrupt.stderr.toString(), /compiler cache integrity mismatch/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('imported C compiler source hashes transitive files and invalidates its cache without T00', () => {
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    writeFileSync(join(directory, 'compiler/manifests/c.json'), JSON.stringify({ target: 'c', files: ['../src/fixture-root.lts'] }));
    writeFileSync(join(directory, 'compiler/src/fixture-root.lts'), 'fc := import "./fixture-c.lts";\n');
    writeFileSync(join(directory, 'compiler/src/fixture-c.lts'), 'io := import "core/io"; source := io.inputAll(); io.outputLine("fresh C");');
    const result = invoke(directory, 'io := import "core/io"; io.outputLine(42);', 'c');
    assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString());
    assert.equal(result.stdout.toString(), 'fresh C\n');
    const cache = join(directory, 'dist/compiler-cache');
    const entries = () => readdirSync(cache).filter(name => name !== 'selection' && !name.startsWith('build-'));
    assert.equal(entries().length, 1);
    const provenance = JSON.parse(readFileSync(join(cache, entries()[0]!, 'provenance.json'), 'utf8')) as { dependencies: string[] };
    assert.deepEqual(provenance.dependencies, [
      'compiler/src/fixture-root.lts',
      'compiler/src/fixture-c.lts',
      'lib/core/io.lts',
      'lib/core/list.lts',
      'lib/core/unicode.lts',
      'lib/core/int.lts',
      'lib/core/text.lts',
    ]);
    writeFileSync(join(directory, 'compiler/src/fixture-c.lts'), 'io := import "core/io"; source := io.inputAll(); io.outputLine("changed nested C");');
    const changed = invoke(directory, 'io := import "core/io"; io.outputLine(42);', 'c');
    assert.equal(changed.error, undefined); assert.equal(changed.status, 0, changed.stderr.toString());
    assert.equal(changed.stdout.toString(), 'changed nested C\n');
    assert.equal(entries().length, 2,
      'a transitive source-byte change must select a distinct compiler cache entry');
    writeFileSync(join(directory, 'compiler/src/fixture-d.lts'), 'io := import "core/io"; source := io.inputAll(); io.outputLine("changed import path");');
    writeFileSync(join(directory, 'compiler/src/fixture-root.lts'), 'fd := import "./fixture-d.lts";\n');
    const redirected = invoke(directory, 'io := import "core/io"; io.outputLine(42);', 'c');
    assert.equal(redirected.status, 0, redirected.stderr.toString());
    assert.equal(redirected.stdout.toString(), 'changed import path\n');
    assert.equal(entries().length, 3,
      'changing an import edge must choose a distinct dependency graph');
    writeFileSync(join(directory, 'compiler/src/fixture-root.lts'), 'io := import "core/io"; source := io.inputAll(); io.outputLine("removed dependency");');
    const removed = invoke(directory, 'io := import "core/io"; io.outputLine(42);', 'c');
    assert.equal(removed.status, 0, removed.stderr.toString());
    assert.equal(removed.stdout.toString(), 'removed dependency\n');
    const afterRemoval = entries();
    assert.equal(afterRemoval.length, 4);
    const expectedRemovedDeps = [
      'compiler/src/fixture-root.lts',
      'lib/core/io.lts',
      'lib/core/list.lts',
      'lib/core/unicode.lts',
      'lib/core/int.lts',
      'lib/core/text.lts',
    ];
    const removedProvenance = afterRemoval.map(name => JSON.parse(readFileSync(join(cache, name, 'provenance.json'), 'utf8')) as { dependencies: string[] })
      .find(item => item.dependencies.length === expectedRemovedDeps.length && expectedRemovedDeps.every((dep, idx) => item.dependencies[idx] === dep));
    assert.ok(removedProvenance, 'the root-only graph is recorded independently of directory enumeration order');
    assert.deepEqual(removedProvenance.dependencies, expectedRemovedDeps);
    const link = join(directory, 'compiler/src/fixture-link.lts');
    writeFileSync(join(directory, 'compiler/src/fixture-e.lts'), 'io := import "core/io"; source := io.inputAll(); io.outputLine("symlink E");');
    writeFileSync(join(directory, 'compiler/src/fixture-f.lts'), 'io := import "core/io"; source := io.inputAll(); io.outputLine("symlink F");');
    symlinkSync('fixture-e.lts', link);
    writeFileSync(join(directory, 'compiler/src/fixture-root.lts'), 'fl := import "./fixture-link.lts";\n');
    const linked = invoke(directory, 'io := import "core/io"; io.outputLine(42);', 'c');
    assert.equal(linked.status, 0, linked.stderr.toString());
    assert.equal(linked.stdout.toString(), 'symlink E\n');
    rmSync(link, { force: true });
    symlinkSync('fixture-f.lts', link);
    const retargeted = invoke(directory, 'io := import "core/io"; io.outputLine(42);', 'c');
    assert.equal(retargeted.status, 0, retargeted.stderr.toString());
    assert.equal(retargeted.stdout.toString(), 'symlink F\n', 'cache hit must revalidate the resolved import edge');
    assert.equal(entries().length, 6);
    const ts = invoke(directory, 'io := import "core/io"; io.outputLine(42);', 'ts');
    assert.equal(ts.status, 0); assert.notEqual(ts.stdout.toString(), result.stdout.toString());
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('default verifier selects consumers after compiler changes and ignores inventory-only edits', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const directory = mkdtempSync(join(tmpdir(), 'lite-compiler-selection-'));
  try {
    const git = join(directory, 'git');
    const changedEnv = { ...env, PATH: directory + delimiter + env.PATH };
    // Supply a changed-file listing without editing compiler source or the real Git index.
    for (const path of ['lib/util/compiler-build.lts', 'compiler/src/c-literals.lts', 'compiler/src/frontend.lts',
      'compiler/manifests/c.json', 'lib/core/int.lts']) {
      writeFileSync(git, `#!/bin/sh\nprintf '%s\\n' ' M ${path}'\n`);
      chmodSync(git, 0o755);
      const result = spawnSync(join(root, 'bin/lite'), ['verify', '--no-cache', '--filter', 'features/numeric/integers/signed-arithmetic.json'], {
        env: changedEnv, encoding: 'utf8', timeout: 30000,
      });
      assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /verification passed: 1 executed, 0 cached/, path);
    }
    writeFileSync(git, "#!/bin/sh\nprintf '%s\\n' ' M compiler/reports/2026-11-02-t00-t11-inventory.md'\n");
    const documentation = spawnSync(join(root, 'bin/lite'), ['verify', '--no-cache', '--filter', 'features/numeric/integers/signed-arithmetic.json'], {
      env: changedEnv, encoding: 'utf8', timeout: 30000,
    });
    assert.equal(documentation.status, 0, documentation.stderr);
    assert.match(documentation.stdout, /verification passed: no selected scenarios/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('prepared artifacts retain isolated runs and release their resources explicitly', () => {
  const compiled = compileTs({ text: 'io := import "core/io"; args := io.inputArgs(); io.outputLine(io.inputAll(), args[0]);' });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const prepared = prepareTsArtifacts([compiled.stdout.toString()]);
  try {
    assert.equal(prepared.checked.status, 0);
    for (const input of ['first', 'second', '']) {
      const result = prepared.runs[0]!({ stdin: input, args: ['argument'] });
      assert.equal(result.phase, 'run'); assert.equal(result.status, 0); assert.equal(result.signal, null);
      assert.equal(result.stdout.toString(), input + ' argument\n'); assert.equal(result.stderr.length, 0);
    }
  } finally { prepared.dispose(); }
  prepared.dispose();
  assert.throws(() => prepared.runs[0]!(), /artifacts have been disposed/);
  const bad = prepareTsArtifacts(['export function main(): string { throw new Error("must not run"); return 42; }']);
  try { assert.notEqual(bad.checked.status, 0); assert.equal(bad.runs[0]!().phase, 'typecheck'); }
  finally { bad.dispose(); }
  assert.throws(() => bad.runs[0]!(), /artifacts have been disposed/);
});

test('default test startup and generated baseline run in a source archive without T00', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const directory = isolatedCheckout();
  try {
    for (const path of ['igniter', 'tools', 'bin', 'config', 'compiler/bootstrap', 'compiler/manifests', 'compiler/src',
      'compiler/tests', 'compiler/tests/references/generated', 'lib',
      'language/verifications', 'language/examples', 'language/samples', 'language/cases', 'language/learn', 'docs', 'site', 'benchmark/challenges/tools', '.agents/rules']) {
      cpSync(join(root, path), join(directory, path), { recursive: true, verbatimSymlinks: true,
        filter: candidate => !/(?:\/node_modules|\/lite\.ts|\/bootstrap\.ts|\/bundle-cli\.ts|\/cli\.ts)$/.test(candidate) });
    }
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    for (const path of ['igniter/lite.ts', 'igniter/bootstrap.ts', 'igniter/cli.ts', '.git']) assert.equal(existsSync(join(directory, path)), false);
    const childEnv: NodeJS.ProcessEnv = { ...env, LITE_SKIP_NATIVE: '1', LITE_SKIP_HEAVY: '1' };
    delete childEnv['NODE_TEST_CONTEXT'];
    const libs = spawnSync(join(directory, 'bin/lite'), ['test', '--unit', '--verbose', 'libraries.test.lts'],
      { cwd: directory, encoding: 'utf8', env: childEnv, timeout: 120000 });
    assert.equal(libs.error, undefined); assert.equal(libs.status, 0, libs.stdout + libs.stderr);
    assert.match(libs.stdout, /PASS lib\/tests\/libraries\.test\.lts/);
    assert.doesNotMatch(libs.stdout + libs.stderr, /ERR_MODULE_NOT_FOUND|T00 reference/);
    const corpusRun = spawnSync(join(directory, 'bin/lite'), ['test', '--unit', '--verbose', 'corpus-parity.test.lts'],
      { cwd: directory, encoding: 'utf8', env: childEnv, timeout: 120000 });
    assert.equal(corpusRun.error, undefined); assert.equal(corpusRun.status, 0, corpusRun.stdout + corpusRun.stderr);
    assert.match(corpusRun.stdout, /PASS compiler\/tests\/corpus-parity\.test\.lts/);
    assert.doesNotMatch(corpusRun.stdout + corpusRun.stderr, /ERR_MODULE_NOT_FOUND|T00 reference/);
    for (const args of [['--fast', '--full'], ['--reference'], ['--unknown']]) {
      const rejected = spawnSync(join(directory, 'bin/lite'), ['test', ...args], { encoding: 'utf8', env, timeout: 5000 });
      assert.equal(rejected.status, 2); assert.match(rejected.stderr, /Usage:/); assert.equal(rejected.stdout, '');
    }
    const legacy = spawnSync(join(directory, 'bin/lite'), ['test', '--reference'], { encoding: 'utf8', env, timeout: 10000 });
    assert.equal(legacy.status, 2); assert.match(legacy.stderr, /Usage:/); assert.equal(legacy.stdout, '');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('compiler manifests reject duplicate entries and invalid target or path shapes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-bundle-fault-'));
  try {
    const manifestPath = join(directory, 'bundle.json');
    writeFileSync(join(directory, 'a.lts'), 'a := 1;\n');
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['a.lts', 'a.lts'] }));
    assert.throws(() => loadManifest(manifestPath), /duplicate file/);
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['missing.lts'] }));
    assert.equal(loadManifest(manifestPath).files[0], 'missing.lts');
    writeFileSync(manifestPath, JSON.stringify({ target: 'x', files: ['a.lts'] }));
    assert.throws(() => loadManifest(manifestPath), /target must be/);
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['/absolute.lts'] }));
    assert.throws(() => loadManifest(manifestPath), /absolute path/);
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['a\\b.lts'] }));
    assert.throws(() => loadManifest(manifestPath), /"\/" separators/);
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['a.lts'], extra: true }));
    assert.throws(() => loadManifest(manifestPath), /unexpected manifest key/);
    assert.throws(() => loadManifest(join(directory, 'missing.json')), /ENOENT/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('prepared TS artifacts run in fresh processes and retain typecheck failures', () => {
  withTsArtifact('let calls = 0; export function main(): string { calls += 1; return String(calls); }', run => {
    for (let invocation = 0; invocation < 2; invocation += 1) {
      assert.deepEqual(run(), { phase: 'run', status: 0, signal: null,
        stdout: Buffer.from('1'), stderr: Buffer.alloc(0) });
    }
  });
  withTsArtifact('export function main(): string { return 42; }', run => {
    const result = run();
    assert.equal(result.phase, 'typecheck');
    assert.notEqual(result.status, 0);
    assert.match(result.stdout.toString(), /not assignable to type 'string'/);
  });
  const locationSource = 'export function main(): string { return (import.meta as { url: string }).url; }';
  const locations = withTsArtifacts([
    'let calls = 0; export function main(): string { calls += 1; return String(calls); }',
    'declare const process: { argv: string[]; getBuiltinModule(name: string): { readFileSync(fd: number): Uint8Array } }; ' +
      'export function main(): string { return JSON.stringify({ args: process.argv.slice(2), bytes: Array.from(process.getBuiltinModule("fs").readFileSync(0)) }); }',
    locationSource, locationSource,
  ], runs => {
    assert.equal(runs.length, 4);
    for (let invocation = 0; invocation < 2; invocation += 1) {
      assert.deepEqual(runs[0]!(), { phase: 'run', status: 0, signal: null, stdout: Buffer.from('1'), stderr: Buffer.alloc(0) });
    }
    const args = ['a b', 'سلام🙂'], bytes = [255, 0, 128];
    assert.deepEqual(runs[1]!({ args, stdin: Uint8Array.from(bytes) }), {
      phase: 'run', status: 0, signal: null, stdout: Buffer.from(JSON.stringify({ args, bytes })), stderr: Buffer.alloc(0),
    });
    return [runs[2]!(), runs[3]!()].map(result => {
      assert.equal(result.phase, 'run'); assert.equal(result.status, 0); assert.equal(result.stderr.length, 0);
      return fileURLToPath(result.stdout.toString());
    });
  });
  assert.notEqual(locations[0], locations[1]);
  for (const location of locations) assert.equal(existsSync(location), false);
  withTsArtifacts(['export function main(): string { throw new Error("EXECUTED"); }',
    'export function main(): string { return 42; }'], runs => {
    for (const run of runs) {
      const result = run(); assert.equal(result.phase, 'typecheck'); assert.notEqual(result.status, 0);
      assert.match(result.stdout.toString(), /not assignable to type 'string'/);
      assert.doesNotMatch(result.stdout.toString() + result.stderr.toString(), /EXECUTED/);
    }
  });
  let stoppedLocation = '';
  assert.throws(() => withTsArtifacts([locationSource], runs => {
    const result = runs[0]!(); assert.equal(result.phase, 'run'); assert.equal(result.status, 0);
    stoppedLocation = fileURLToPath(result.stdout.toString());
    throw new Error('callback stopped');
  }), /callback stopped/);
  assert.ok(stoppedLocation.length > 0); assert.equal(existsSync(stoppedLocation), false);
  assert.equal(withTsArtifacts([], runs => runs.length), 0);
});
