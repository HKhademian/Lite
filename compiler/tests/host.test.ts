import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, lstatSync, readlinkSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadBundle } from '../../igniter/loader.ts';
import { buildCompiler, buildTsCompiler, compileTarget, compileTs, type CompilerTarget } from '../host.ts';
import { seed } from '../bootstrap/seed.ts';
import { cSeed } from '../bootstrap/c-seed.ts';
import { runText } from '../../igniter/bootstrap.ts';
import { runTsArtifact, runCArtifact, withTsArtifact } from '../../igniter/artifacts.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };

test('generated reports evaluate arguments once in order and preserve nested output', () => {
  const cases = [
    { source: 'f := fn(): Int { outputLine("inner"); 7 } outputLine("before"); outputLine(f()); outputLine("after");',
      stdout: 'before\ninner\n7\nafter\n', status: 0 },
    { source: 'echo := fn(n: Int): Int { outputLine("arg", n); n } outputLine(echo(1), echo(2), echo(3));',
      stdout: 'arg 1\narg 2\narg 3\n1 2 3\n', status: 0 },
    { source: 'f := fn(n: Int): Int { if n > 0 { outputLine(n, self(n - 1)); } n } outputLine(f(2));',
      stdout: '1 0\n2 1\n2\n', status: 0 },
    { source: 'text := fn(): String { outputLine("text"); "🙂" } flag := fn(): Bool { outputLine("flag"); true } ' +
        'loop [1, 2] as n { outputLine(n, text(), flag()); }',
      stdout: 'text\nflag\n1 🙂 true\ntext\nflag\n2 🙂 true\n', status: 0 },
    { source: 'f := fn(): Int { outputLine("inner"); 7 } outputLine(f()); exit(3);',
      stdout: 'inner\n7\n', status: 3 },
    { source: 'stop := fn(): Int { outputLine("stopped"); exit(4); 9 } outputLine("before"); outputLine("outer", stop());',
      stdout: 'before\nstopped\n', status: 4 },
  ];
  for (const { source, stdout, status } of cases) {
    const expected = runText(source);
    assert.deepEqual(expected, { status, stdout: Buffer.from(stdout), stderr: Buffer.alloc(0) });
    const compiled = compileTs({ text: source });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    assert.equal(compiled.stderr.length, 0);
    const actual = runTsArtifact(compiled.stdout.toString());
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
    assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);
  }
});

/** Copies only host glue, the seed and Lite sources; the T00 implementation is deliberately absent. */
function isolatedCheckout(): string {
  const directory = mkdtempSync(join(tmpdir(), 'lite-t11-checkout-'));
  const manifest = resolve(root, 'compiler/manifests/ts.json');
  const bundles = [loadBundle(manifest), loadBundle(resolve(root, 'compiler/manifests/c.json'))];
  const paths = new Set([
    'litec', 'compiler/host.ts', 'compiler/entry.ts', 'compiler/cli.ts', 'compiler/launcher.ts', 'compiler/package.json',
    'compiler/bootstrap/T11.ts', 'compiler/bootstrap/seed.ts', 'compiler/bootstrap/tsconfig.json',
    'compiler/bootstrap/c-emitter.ts', 'compiler/bootstrap/c-seed.ts',
    'compiler/manifests/ts.json', 'compiler/manifests/c.json', 'igniter/loader.ts', 'igniter/tsconfig.json',
    ...bundles.flatMap(bundle => bundle.files.map(path => relative(root, resolve(dirname(manifest), path)))),
  ]);
  for (const path of paths) {
    const destination = join(directory, path);
    mkdirSync(dirname(destination), { recursive: true });
    if (lstatSync(join(root, path)).isSymbolicLink()) symlinkSync(readlinkSync(join(root, path)), destination);
    else copyFileSync(join(root, path), destination);
  }
  chmodSync(join(directory, 'litec'), 0o755);
  return directory;
}

/** Invokes the copied launcher and captures exact bytes, without a fallback interpreter. */
function invoke(directory: string, source: string | Buffer, target: CompilerTarget = 'ts') {
  const path = join(directory, 'source with spaces.lts');
  writeFileSync(path, source);
  return spawnSync(join(directory, 'litec'), [target, path], { env, timeout: 10000 });
}

test('T11 host selects the recorded seed and preserves output, diagnostics and source line maps', () => {
  const built = buildTsCompiler();
  assert.equal(built.artifactSha256, seed.artifactSha256);
  assert.equal(built.sourceSha256, seed.sourceSha256);
  const reference = readFileSync(join(root, 'compiler/generated/report-42.ts'));
  for (const name of [undefined, '', 'a b.lts', 'سلام🙂.lts', 'quote";\\\nname.lts']) {
    const input = name === undefined ? { text: 'outputLine(42);' } : { text: 'outputLine(42);', name };
    assert.deepEqual(compileTs(input), { status: 0, stdout: reference, stderr: Buffer.alloc(0) });
    const bad = name === undefined ? { text: 'outputLine(1 +);' } : { text: 'outputLine(1 +);', name };
    assert.deepEqual(compileTs(bad), { status: 2, stdout: Buffer.alloc(0),
      stderr: Buffer.from(`${name === undefined || name === '' ? '' : name + ':'}1:15: expected an Int, String or Bool expression\n`) });
  }
  assert.deepEqual(compileTs({ text: 'outputLine(1);\noutputLine(1 +);\n', name: 'flattened.lts',
    lineMap: [{ path: 'first.lts', line: 5 }, { path: 'second.lts', line: 9 }] }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from('second.lts:9:15: expected an Int, String or Bool expression\n'),
  });
});

test('both default compile targets work in an isolated checkout with no T00 implementation', () => {
  const directory = isolatedCheckout();
  try {
    assert.equal(existsSync(join(directory, 'igniter/lite.ts')), false);
    assert.equal(existsSync(join(directory, 'igniter/bootstrap.ts')), false);
    for (const target of ['ts', 'c'] as const) {
      const result = invoke(directory, 'outputLine(42);', target);
      assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString());
      assert.deepEqual(result.stdout, readFileSync(join(root, `compiler/generated/report-42.${target}`)));
      assert.equal(result.stderr.length, 0);
      const bad = invoke(directory, 'outputLine(42);\nunsupported();\n', target);
      assert.equal(bad.error, undefined); assert.equal(bad.status, 2);
      assert.equal(bad.stdout.length, 0); assert.ok(bad.stderr.length > 0);
      const invalid = invoke(directory, Buffer.from([0xff]), target);
      assert.equal(invalid.status, 1); assert.equal(invalid.stdout.length, 0);
      assert.match(invalid.stderr.toString(), /InputFault: cannot read input: invalid UTF-8/);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a changed Lite compiler rebuilds with T11, caches by source and rejects corrupt cache bytes', () => {
  const directory = isolatedCheckout();
  try {
    // Only the TypeScript checker is shared; the copied checkout still has no T00 code.
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    const source = join(directory, 'compiler/src/fixture.lts');
    writeFileSync(join(directory, 'compiler/manifests/ts.json'), JSON.stringify({ target: 'ts', files: ['../src/fixture.lts'] }));
    writeFileSync(source, 'source := inputAll();\noutputLine("fresh");\n');
    const first = invoke(directory, 'outputLine(42);');
    assert.equal(first.error, undefined); assert.equal(first.status, 0, first.stderr.toString());
    assert.equal(first.stdout.toString(), 'fresh\n');
    const second = invoke(directory, 'outputLine(7);');
    assert.equal(second.status, 0); assert.deepEqual(second.stdout, first.stdout);
    // Ask the real build selector for its exact cache path inside the copied checkout.
    const selected = spawnSync(process.execPath, ['--input-type=module', '-e',
      'import {buildTsCompiler} from "./compiler/host.ts"; process.stdout.write(JSON.stringify(buildTsCompiler()));'],
    { cwd: directory, env, encoding: 'utf8', timeout: 10000 });
    assert.equal(selected.status, 0, selected.stderr);
    const record: unknown = JSON.parse(selected.stdout);
    assert.ok(typeof record === 'object' && record !== null && 'path' in record && typeof record.path === 'string');
    assert.ok('cached' in record && record.cached === true);
    writeFileSync(record.path, readFileSync(record.path, 'utf8') + '\n');
    const corrupt = invoke(directory, 'outputLine(42);');
    assert.equal(corrupt.status, 1); assert.equal(corrupt.stdout.length, 0);
    assert.match(corrupt.stderr.toString(), /cache integrity mismatch/);
    // A new source hash cannot accidentally pick the old cache or the original seed.
    writeFileSync(source, 'this is not valid Lite');
    const rejected = invoke(directory, 'outputLine(42);');
    assert.equal(rejected.status, 1); assert.equal(rejected.stdout.length, 0);
    assert.match(rejected.stderr.toString(), /T11 cannot rebuild current compiler source/);
    assert.match(rejected.stderr.toString(), /\.\.\/src\/fixture\.lts:1:/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a modified bootstrap seed fails explicitly without executing T00', () => {
  const directory = isolatedCheckout();
  try {
    const path = join(directory, 'compiler/bootstrap/T11.ts');
    writeFileSync(path, readFileSync(path, 'utf8') + '\n');
    const result = invoke(directory, 'outputLine(42);');
    assert.equal(result.status, 1); assert.equal(result.stdout.length, 0);
    assert.match(result.stderr.toString(), /T11 bootstrap seed hash mismatch/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('the TS-hosted C seed preserves source names, subset rejection and artifact integrity', () => {
  const selected = buildCompiler('c');
  assert.equal(selected.target, 'c');
  assert.equal(selected.artifactSha256, cSeed.artifactSha256);
  assert.equal(selected.builderSha256, seed.artifactSha256);
  assert.equal(selected.sourceSha256, cSeed.sourceSha256);
  assert.deepEqual(compileTarget('c', { text: 'outputLine(42);', name: 'سلام file.lts' }), {
    status: 0, stdout: readFileSync(join(root, 'compiler/generated/report-42.c')), stderr: Buffer.alloc(0),
  });
  assert.deepEqual(compileTarget('c', { text: 'outputLine(1 +);', name: 'a b.lts' }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from('a b.lts:1:15: expected an Int, String or Bool expression\n'),
  });
  assert.deepEqual(compileTarget('c', { text: 'f := fn(): Int { 1 } outputLine(f());' }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from('C backend does not support top-level functions yet\n'),
  });
  const directory = isolatedCheckout();
  try {
    const path = join(directory, 'compiler/bootstrap/c-emitter.ts');
    writeFileSync(path, readFileSync(path, 'utf8') + '\n');
    const corrupt = invoke(directory, 'outputLine(42);', 'c');
    assert.equal(corrupt.status, 1); assert.equal(corrupt.stdout.length, 0);
    assert.match(corrupt.stderr.toString(), /c bootstrap seed hash mismatch/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('changed C compiler source rebuilds with T11 without a T00 implementation', () => {
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    writeFileSync(join(directory, 'compiler/manifests/c.json'), JSON.stringify({ target: 'c', files: ['../src/fixture-c.lts'] }));
    writeFileSync(join(directory, 'compiler/src/fixture-c.lts'), 'source := inputAll(); outputLine("fresh C");');
    const result = invoke(directory, 'outputLine(42);', 'c');
    assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString());
    assert.equal(result.stdout.toString(), 'fresh C\n');
    const ts = invoke(directory, 'outputLine(42);', 'ts');
    assert.equal(ts.status, 0); assert.notEqual(ts.stdout.toString(), result.stdout.toString());
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('default verifier selects consumers after compiler changes and ignores inventory-only edits', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-compiler-selection-'));
  try {
    const git = join(directory, 'git');
    const changedEnv = { ...env, PATH: directory + delimiter + env.PATH };
    // Supply a changed-file listing without editing compiler source or the real Git index.
    for (const path of ['compiler/host.ts', 'compiler/bootstrap/c-emitter.ts', 'compiler/src/frontend.lts',
      'compiler/manifests/c.json', 'lib/core/int.lts']) {
      writeFileSync(git, `#!/bin/sh\nprintf '%s\\n' ' M ${path}'\n`);
      chmodSync(git, 0o755);
      const result = spawnSync(join(root, 'lite'), ['verify', '--no-cache', '--filter', 'features/int-arithmetic.json'], {
        env: changedEnv, encoding: 'utf8', timeout: 30000,
      });
      assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /verification passed: 3 executed, 0 cached/, path);
    }
    writeFileSync(git, "#!/bin/sh\nprintf '%s\\n' ' M compiler/reports/2026-11-02-t00-t11-inventory.md'\n");
    const documentation = spawnSync(join(root, 'lite'), ['verify', '--no-cache', '--filter', 'features/int-arithmetic.json'], {
      env: changedEnv, encoding: 'utf8', timeout: 30000,
    });
    assert.equal(documentation.status, 0, documentation.stderr);
    assert.match(documentation.stdout, /verification passed: no selected scenarios/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('generated temporary I/O helpers preserve prompts, value display, input state and failures', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['output(); outputLine(); output("a", 1); outputLine(true);', ''],
    ['outputLine([1, 2], (left = 3, right = "x"), Unit, ());', ''],
    ['inner := fn(): Unit { outputLine("inner"); } outer := fn(): Unit { inner() } outputLine(outer());', ''],
    ['outputLine([(n = 1), (n = 2)]);', ''],
    ['f := fn(n: Int): Int { outputLine("effect", n); n } output(f(1), f(2)); outputLine();', ''],
    ['outputLine(inputInt("N: "), inputFloat("F: "));', '7 -2.5e2'],
    ['value: Float = inputFloat(); outputLine(value);', '-0'],
    ['outputLine(inputInt(), inputInt());', '-9223372036854775808 9223372036854775807'],
    ['outputLine(inputLine("Line: ")); outputLine(inputAll("Rest: "));', 'hello\r\n🙂\n'],
    ['outputLine(inputLine(), inputLine());', '\nlast'],
    ['n := inputInt(); line := inputLine(); rest := inputAll(); outputLine(n, line, rest);', '7\nremaining'],
    ['outputLine(inputAll("All: "));', ''],
    ['outputLine(inputAll("All: "));', 'a'.repeat(4095) + '🙂tail'],
    ['empty: List<Int> = []; outputLine(empty);', ''],
    ['values: mut List<Int> = []; outputLine(push_back(mut values, 1), values);', ''],
    ['zero: (value: Float); outputLine(zero, zero.value);', ''],
    ['outputLine("before"); inputInt("N: ");', 'bad'],
    ['inputInt("N: ");', '9223372036854775808'],
    ['inputInt("N: ");', ''],
    ['inputFloat("F: ");', 'NaN'],
    ['inputFloat("F: ");', '1e999'],
    ['inputFloat("F: ");', ''],
    ['inputLine("L: ");', ''],
  ];
  for (const [source, stdin] of cases) {
    const expected = runText(source, { stdin });
    const compiled = compileTs({ text: source });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const actual = runTsArtifact(compiled.stdout.toString(), { stdin });
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
    assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, source);
  }
  const faultSource = 'outputLine("before fault"); values: List<Int> = [1]; outputLine(values[2]);';
  const expectedFault = runText(faultSource);
  const compiledFault = compileTs({ text: faultSource });
  assert.equal(compiledFault.status, 0, compiledFault.stderr.toString());
  const actualFault = runTsArtifact(compiledFault.stdout.toString());
  assert.equal(actualFault.status, expectedFault.status);
  assert.deepEqual(actualFault.stdout, expectedFault.stdout);
  assert.match(actualFault.stderr.toString(), /BoundPanic/);

});

test('generated input rejects malformed UTF-8 at the same read as the real interpreter CLI', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-io-utf8-'));
  try {
    const path = join(directory, 'input.lts');
    for (const stdin of [Buffer.from([0xff]), Buffer.from([0xf0, 0x9f]), Buffer.from([0x37, 0x20, 0xff])]) {
      const source = 'output("before:"); outputLine(inputInt("N: ")); inputAll("Rest: ");';
      writeFileSync(path, source);
      const expected = spawnSync(process.execPath, [join(root, 'igniter/cli.ts'), path], { input: stdin });
      assert.equal(expected.error, undefined);
      const compiled = compileTs({ text: source, name: path });
      assert.equal(compiled.status, 0, compiled.stderr.toString());
      const actual = runTsArtifact(compiled.stdout.toString(), { stdin });
      assert.equal(actual.phase, 'run');
      assert.equal(actual.status, expected.status);
      assert.deepEqual(actual.stdout, expected.stdout);
      assert.deepEqual(actual.stderr, expected.stderr);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('report is no longer a builtin and temporary I/O rejects invalid signatures before effects', () => {
  for (const source of ['report(1);', 'inputLine(7);', 'inputFloat(7);', 'inputInt("a", "b");', 'inputAll(1);',
    'outputLine(prompt = "label", 1);', 'output(fn(): Int { 1 });',
    'inputInt := 3; outputLine(inputInt());', 'outputLine := 3; outputLine(1);']) {
    assert.notEqual(runText(source).status, 0, source);
    assert.notEqual(compileTs({ text: source }).status, 0, source);
  }
});

/** Boundary/sign combinations with every representable result retained for differential execution. */
function int64BoundaryProgram(): string {
  const min = -(1n << 63n), max = (1n << 63n) - 1n;
  const values = [min, min + 1n, -3037000500n, -3037000499n, -2n, -1n, 0n, 1n, 2n, 3037000499n, 3037000500n, max - 1n, max];
  const lines: string[] = [];
  let index = 0;
  for (const left of values) for (const right of values) {
    const a = `a${index}`, b = `b${index}`;
    lines.push(`var ${a} := ${left}; var ${b} := ${right};`);
    for (const [operator, result] of [['+', left + right], ['-', left - right], ['*', left * right]] as const) {
      if (result >= min && result <= max) lines.push(`outputLine(${a} ${operator} ${b});`);
    }
    index += 1;
  }
  for (const [i, value] of values.entries()) if (value !== min) lines.push(`var n${i} := ${value}; outputLine(-n${i});`);
  lines.push('var checked_add := 3; var lt_arg_left_0 := 4; outputLine(checked_add + lt_arg_left_0);');
  lines.push('var hi := 9223372036854775807; var lo := -9223372036854775808; var flag := false;');
  lines.push('outputLine(flag and (hi + 1 > 0)); if flag { outputLine(lo - 1); }');
  lines.push('outputLine(not flag or (hi * 2 > 0)); if flag { outputLine(-lo); }');
  return lines.join('\n');
}

const overflowingInt64Expressions = [
  'hi + 1', 'lo + -1', 'hi - -1', 'lo - 1', 'hi * 2', 'lo * 2', '-lo', 'lo * -1',
  '(hi + 1) - 1', '(hi + 1) + (lo - 1)', '(lo - 1) + (hi + 1)',
];

/** Produces runtime operands and output before a fault, with Unicode and CRLF position coverage. */
function int64FaultProgram(expression: string): string {
  return '/* 🙂 */ outputLine("before");\r\nvar hi := 9223372036854775807; var lo := -9223372036854775808;\r\noutputLine(' + expression + ');';
}

test('generated TS checks Int64 boundaries, exact faults and operand evaluation order', () => {
  const source = int64BoundaryProgram();
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  const expected = runText(source);
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);

  const name = 'arithmetic سلام🙂.lts';
  const branches = overflowingInt64Expressions.map((expression, index) =>
    `${index === 0 ? 'if' : 'else if'} selector == ${index} { outputLine(${expression}); }`).join('\n');
  const faultSource = '/* 🙂 */ outputLine("before");\r\nselector := inputInt();\r\n' +
    'var hi := 9223372036854775807; var lo := -9223372036854775808;\r\n' + branches;
  const faults = compileTs({ text: faultSource, name });
  assert.equal(faults.status, 0, faults.stderr.toString());
  withTsArtifact(faults.stdout.toString(), run => {
    for (const [index, expression] of overflowingInt64Expressions.entries()) {
      const reference = runText(faultSource, { stdin: String(index), name });
      assert.equal(reference.status, 1, expression);
      const result = run({ stdin: String(index) });
      assert.equal(result.phase, 'run'); assert.equal(result.signal, null);
      assert.deepEqual({ status: result.status, stdout: result.stdout, stderr: result.stderr }, reference, expression);
    }
  });
  const effects = 'touch := fn(n: Int): Int { outputLine("arg", n); n } ' +
    'outputLine(touch(3) + touch(4), touch(9) - touch(2), touch(2) * touch(5), -touch(6));';
  const emitted = compileTs({ text: effects });
  assert.equal(emitted.status, 0, emitted.stderr.toString());
  const run = runTsArtifact(emitted.stdout.toString());
  const reference = runText(effects);
  assert.deepEqual({ status: run.status, stdout: run.stdout, stderr: run.stderr }, reference);
});

test('portable C11 checks Int64 boundaries and sequences nested faults left to right', context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') { context.skip('LITE_SKIP_NATIVE=1'); return; }
  const source = int64BoundaryProgram();
  const compiled = compileTarget('c', { text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const result = runCArtifact(compiled.stdout.toString());
  assert.equal(result.phase, 'run', result.stdout.toString() + result.stderr.toString());
  const reference = runText(source);
  assert.deepEqual({ status: result.status, stdout: result.stdout, stderr: result.stderr }, reference);
  for (const expression of overflowingInt64Expressions) {
    const text = int64FaultProgram(expression), name = 'arithmetic سلام🙂.lts';
    const expected = runText(text, { name });
    assert.equal(expected.status, 1);
    const artifact = compileTarget('c', { text, name });
    assert.equal(artifact.status, 0, artifact.stderr.toString());
    const run = runCArtifact(artifact.stdout.toString());
    assert.equal(run.phase, 'run', run.stdout.toString() + run.stderr.toString());
    assert.equal(run.signal, null);
    assert.deepEqual({ status: run.status, stdout: run.stdout, stderr: run.stderr }, expected, expression);
  }
  for (const target of ['ts', 'c'] as const) {
    const literal = compileTarget(target, { text: 'outputLine("lt_arg_left_1 = lt_checked_add( lite$addInt(");' });
    assert.equal(literal.status, 0);
    assert.doesNotMatch(literal.stdout.toString(), /const lite\$intLines|static const size_t lt_int_lines/);
  }
});
