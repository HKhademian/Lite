import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCompiler, compileBuiltCompiler, loadManifest, type CompilerInput, type CompilerResult } from '../compiler/host.ts';
import { sha256, withTsArtifact, withTsArtifacts } from './artifacts.ts';

const tsManifestPath = new URL('../compiler/manifests/ts.json', import.meta.url).pathname;
const cManifestPath = new URL('../compiler/manifests/c.json', import.meta.url).pathname;

type TestCompiler = Readonly<{ target: ReturnType<typeof loadManifest>['target']; compile: (input: CompilerInput) => CompilerResult }>;
const compilerInstances = new Map<string, TestCompiler>();
function compilerFor(manifestPath: string): TestCompiler {
  let compiler = compilerInstances.get(manifestPath);
  if (compiler === undefined) {
    const manifest = loadManifest(manifestPath);
    const build = buildCompiler(manifest.target);
    compiler = { target: manifest.target, compile: input => compileBuiltCompiler(build, input) };
    compilerInstances.set(manifestPath, compiler);
  }
  return compiler;
}
function runCompiler(manifestPath: string, source: string, name?: string): { code: number; output: string; errors: string } {
  const input = name === undefined ? { text: source } : { text: source, name };
  const result = compilerFor(manifestPath).compile(input);
  return { code: result.status, output: result.stdout.toString('utf8'), errors: result.stderr.toString('utf8') };
}

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

test('compiler applications preserve optional logical source names in their own diagnostics only', () => {
  for (const manifest of [tsManifestPath, cManifestPath]) {
    const expected = runCompiler(manifest, "io := import \"core/io\"; io.outputLine(42);").output;
    for (const label of ['', 'a b.lts', 'سلام🙂.lts', 'quote";\\\nname.lts']) {
      assert.deepEqual(runCompiler(manifest, "io := import \"core/io\"; io.outputLine(42);", label), { code: 0, output: expected, errors: '' });
      assert.deepEqual(runCompiler(manifest, "io := import \"core/io\"; io.outputLine(1 +);", label), {
        code: 2, output: '', errors: (label === '' ? '' : label + ':') + '1:42: expected an Int, Float, String or Bool expression\n',
      });
    }
    assert.deepEqual(runCompiler(manifest, "io := import \"core/io\"; io.outputLine(1 +);"), { code: 2, output: '', errors: '1:42: expected an Int, Float, String or Bool expression\n' });
    const target = loadManifest(manifest).target;
    withTsArtifact(readFileSync(buildCompiler(target).path, 'utf8'), execute => {
      const actual = execute({ args: ['--stdin', '--name', 'first.lts'], stdin: 'x := 1 +;' });
      assert.equal(actual.phase, 'run'); assert.equal(actual.signal, null);
      assert.equal(actual.status, 2); assert.equal(actual.stdout.length, 0);
      assert.equal(actual.stderr.toString(), 'first.lts:1:9: expected an Int, Float, String or Bool expression\n');
    });
  }
});

test('lite and compiler commands route through the compiler and selected target', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'litec-'));
  try {
    const sourcePath = join(directory, 'sample.lts');
    writeFileSync(sourcePath, "io := import \"core/io\"; io.outputLine(42);");
    const ts = spawnSync(join(root, 'bin/lite-compile'), ['--target', 'ts', sourcePath], { env, timeout: 5000 });
    assert.equal(ts.error, undefined); assert.equal(ts.status, 0, ts.stderr.toString());
    assert.deepEqual(ts.stdout, readFileSync(join(root, 'compiler/tests/references/generated/report-42.ts')));
    assert.equal(ts.stderr.length, 0);
    const c = spawnSync(join(root, 'bin/lite-compile'), ['--target', 'c', sourcePath], { env, timeout: 5000 });
    assert.equal(c.error, undefined); assert.equal(c.status, 2);
    assert.equal(c.stdout.length, 0); assert.match(c.stderr.toString(), /C output is deferred/);
    const shorthand = spawnSync(join(root, 'bin/lite-compile-ts'), [sourcePath], { env, timeout: 5000 });
    assert.equal(shorthand.error, undefined); assert.equal(shorthand.status, 0);
    assert.deepEqual(shorthand.stdout, ts.stdout);
    const validCheck = spawnSync(join(root, 'bin/lite'), ['check', sourcePath], { env, timeout: 5000 });
    assert.equal(validCheck.error, undefined); assert.equal(validCheck.status, 0);
    assert.equal(validCheck.stdout.length, 0); assert.equal(validCheck.stderr.length, 0);
    const invalidPath = join(directory, 'bad.lts');
    writeFileSync(invalidPath, "io := import \"core/io\"; io.outputLine(1 +);\n");
    const invalid = spawnSync(join(root, 'bin/lite-compile-ts'), [invalidPath], { env, timeout: 5000 });
    assert.equal(invalid.status, 2); assert.equal(invalid.stdout.length, 0);
    assert.deepEqual(invalid.stderr, Buffer.from(`${invalidPath}:1:42: expected an Int, Float, String or Bool expression\n`));
    const invalidCheck = spawnSync(join(root, 'bin/lite'), ['check', invalidPath], { env, timeout: 5000 });
    assert.equal(invalidCheck.status, 1); assert.equal(invalidCheck.stdout.length, 0);
    assert.match(invalidCheck.stderr.toString(), /bad\.lts:1:42: expected an Int, Float, String or Bool expression/);
    for (const args of [[], ['--target', 'x', sourcePath], ['ts', join(directory, 'missing.lts')],
      ['ts', join(directory, 'sample.txt')]]) {
      const bad = spawnSync(join(root, 'bin/lite-compile-ts'), args, { env, timeout: 5000 });
      assert.equal(bad.status, 2, args.join(' ')); assert.equal(bad.stdout.length, 0);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('lite help and docs expose the command matrix and documentation roots', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const help = spawnSync(join(root, 'bin/lite'), ['help'], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(help.error, undefined); assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: \.\/bin\/lite <command>/);
  assert.match(help.stdout, /Compiler entry points: \.\/bin\/lite-compile, \.\/bin\/lite compile/);
  assert.match(help.stdout, /test \[--smoke\|--fast\|--full\].*\[--verbose\|--mute\|--silence\]/);
  assert.equal(help.stderr, '');
  const docs = spawnSync(join(root, 'bin/lite'), ['docs'], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(docs.error, undefined); assert.equal(docs.status, 0);
  assert.match(docs.stdout, /compiler\/README\.md/);
  assert.match(docs.stdout, /igniter\/tests\/README\.md/);
  assert.equal(docs.stderr, '');
  const noArgs = spawnSync(join(root, 'bin/lite'), [], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(noArgs.status, 2); assert.equal(noArgs.stdout, ''); assert.match(noArgs.stderr, /Usage:/);
});
test('lite verify uses generated TS, reports migration gaps and rejects the retired reference flag', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') {
    context.skip('LITE_SKIP_HEAVY=1'); return;
  }
  const root = new URL('../', import.meta.url).pathname;
  const directory = mkdtempSync(join(tmpdir(), 'lite-verify-test-'));
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? ''),
    LITE_VERIFY_CACHE: join(directory, 'cache.json') };
  try {
    // This controller runs 81 isolated scenarios; each artifact retains its own timeout.
    const verified = spawnSync(join(root, 'bin/lite'), ['verify', '--all', '--no-cache'], { env, encoding: 'utf8', timeout: 180000 });
    assert.equal(verified.error, undefined); assert.equal(verified.status, 0, verified.stderr);
    assert.match(verified.stdout, /PASS feature\.numeric\.integers\.signed-arithmetic\/precedence-and-division/);
    assert.match(verified.stdout, /PASS example\.foundations\.io\.double-sum\/seven-and-five/);
    assert.match(verified.stdout, /\[ts\]/); assert.doesNotMatch(verified.stdout, /T00 reference|\[c\]/);
    assert.match(verified.stdout, /PASS feature\.control\.branching\.subjectless-match\/first-true-and-fallback \[ts\]/);
    assert.match(verified.stdout, /PASS feature\.numeric\.widths\.sized-promotion\/widths \[ts\]/);
    assert.match(verified.stdout, /PASS feature\.functions\.callables\.function-values\/double-five \[ts\]/);
    assert.match(verified.stdout, /PASS feature\.blocks\.wiring\.parallel-symbol-wiring\/even-four \[ts\]/);
    assert.match(verified.stdout, /PASS showcase\.foundations\.bindings\.bindings-and-mutability\/bindings-and-mutability \[ts\]/);
    assert.match(verified.stdout, /verification passed: 128 executed, 0 cached/);
    const covered = spawnSync(join(root, 'bin/lite'), ['verify', '--coverage'], { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(covered.error, undefined); assert.equal(covered.status, 0, covered.stderr);
    assert.match(covered.stdout, /features: 52 registered, 52 cases/);
    assert.match(covered.stdout, /examples: 26\/26 manifests/);
    assert.match(covered.stdout, /samples: 22\/22 manifests/);
    assert.match(covered.stdout, /showcases: 18\/18 manifests/);
    const first = spawnSync(join(root, 'bin/lite'), ['verify', '--all', '--filter', 'features/numeric/integers/signed-arithmetic.json'],
      { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(first.error, undefined); assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /verification passed: \d+ executed, 0 cached/);
    const second = spawnSync(join(root, 'bin/lite'), ['verify', '--all', '--filter', 'features/numeric/integers/signed-arithmetic.json'],
      { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(second.error, undefined); assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /verification passed: 0 executed, \d+ cached/);
    assert.match(second.stdout, /\(cached\)/);
    const sharded = spawnSync(join(root, 'bin/lite'), ['verify', '--all', '--filter', 'features/numeric/integers/signed-arithmetic.json', '--shard', '2/2', '--no-cache'],
      { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(sharded.error, undefined); assert.equal(sharded.status, 0, sharded.stderr);
    assert.match(sharded.stdout, /verification passed: \d+ executed, 0 cached/);
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

test('root launcher compiles artifacts and forwards their input, diagnostics and status from caller directories', () => {
  const root = new URL('../', import.meta.url).pathname, launcher = join(root, 'bin/lite');
  const dir = mkdtempSync(join(tmpdir(), 'lite-launcher-')), source = join(dir, 'program with spaces.lts'), artifact = join(dir, 'program.ts');
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? ''), CDPATH: dir };
  const invoke = (args: readonly string[], executable = launcher, cwd = dir) =>
    spawnSync(executable, args, { cwd, env, encoding: 'utf8', timeout: 10000 });
  const build = (path = source, executable = launcher, cwd = dir) => {
    const result = invoke(['compile', path], executable, cwd); assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, ''); writeFileSync(artifact, result.stdout);
  };
  const runnerScript = "import { writeSync } from 'node:fs'; import { pathToFileURL } from 'node:url'; const a = process.argv[1]; const m = await import(pathToFileURL(a).href); process.argv = [process.execPath, a, ...process.argv.slice(2)]; const out = m.main((t) => writeSync(1, t)); if (typeof out === 'string' && out.length > 0) writeSync(1, out);";
  const executeArtifact = (input = '', args: readonly string[] = []) => spawnSync(process.execPath,
    ['--input-type=module', '-e', runnerScript, artifact, ...args], { cwd: dir, env, input, encoding: 'utf8', timeout: 10000 });
  try {
    build('language/examples/foundations/io/double-sum.lts', launcher, root);
    const example = executeArtifact('7\n5\n'); assert.equal(example.status, 0, example.stderr); assert.equal(example.stdout, 'First integer: Second integer: 24\n');
    writeFileSync(source, "io := import \"core/io\"; io.outputLine(io.inputInt()); io.errorLine(\"done\"); io.exit(7);"); build();
    const result = executeArtifact('19\n'); assert.equal(result.status, 7); assert.equal(result.stdout, '19\n'); assert.equal(result.stderr, 'done\n');
    writeFileSync(source, "io := import \"core/io\"; io.outputLine(io.inputInt());");
    const check = invoke(['check', source]); assert.equal(check.status, 0, check.stderr); assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
    writeFileSync(source, "io := import \"core/io\"; loop io.inputArgs() as arg { io.outputLine(arg); }"); build();
    const args = executeArtifact('', ['a b', '', '--check']); assert.equal(args.status, 0, args.stderr); assert.equal(args.stdout, 'a b\n\n--check\n');
    const ran = invoke(['run', 'program with spaces.lts', '--', 'a b', '', '--check']);
    assert.equal(ran.status, 0, ran.stderr); assert.equal(ran.stdout, 'a b\n\n--check\n'); assert.equal(ran.stderr, '');
    writeFileSync(source, "io := import \"core/io\"; io.outputLine(1/0);"); build(); const fault = executeArtifact();
    assert.equal(fault.status, 1); assert.equal(fault.stdout, ''); assert.match(fault.stderr, /program with spaces\.lts:1:40: ArithmeticPanic:/);
    for (const argv of [[], ['unknown', source]]) { const usage = invoke(argv); assert.equal(usage.status, 2); assert.equal(usage.stdout, ''); assert.match(usage.stderr, /^Usage: \.\/bin\/lite <command>/); }
    const runUsage = invoke(['run']); assert.equal(runUsage.status, 2); assert.equal(runUsage.stdout, '');
    assert.equal(runUsage.stderr, 'Usage: ./bin/lite run [--builtin-mode SPEC]... file.lts [-- argument ...]\n');
    const alias = join(dir, 'project with spaces'); symlinkSync(root, alias, 'dir');
    writeFileSync(source, "io := import \"core/io\"; io.outputLine(23);"); build(source, join(alias, 'bin/lite')); const spaced = executeArtifact();
    assert.equal(spaced.status, 0, spaced.stderr); assert.equal(spaced.stdout, '23\n'); assert.equal(spaced.stderr, '');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('compiler, L0 and lexer declarations carry doc comments', () => {
  const lib = new URL('../lib/core/', import.meta.url);
  const src = new URL('../compiler/src/', import.meta.url);
  const paths = [
    ...readdirSync(lib).filter(file => file.endsWith('.lts')).sort()
      .map(file => new URL(file, lib)),
    ...readdirSync(src).filter(file => file.endsWith('.lts')).sort()
      .map(file => new URL(file, src))];
  for (const path of paths) {
    const lines = readFileSync(path, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      if (!/^[A-Za-z_][A-Za-z0-9_]* := (?:fn|type)\b/.test(line)) continue;
      let previous = index - 1;
      while (previous >= 0 && lines[previous]?.trim() === '') previous -= 1;
      let documented = false;
      if (previous >= 0) {
        const last = lines[previous]?.trim() ?? '';
        if (last.startsWith('/**') && last.endsWith('*/')) documented = true;
        else if (last.endsWith('*/')) {
          for (let start = previous; start >= 0; start -= 1) {
            const text = lines[start]?.trim() ?? '';
            if (text.startsWith('/**')) { documented = true; break; }
            if (text.startsWith('/*')) break;
          }
        }
      }
      assert.ok(documented, `${path.pathname}:${index + 1}: missing /** ... */ doc comment`);
    }
  }
});

test('real compiler CLI forwards source-name context without changing emitted bytes', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'litec-label-'));
  try {
    const cCompilerPath = buildCompiler('c').path;
    const sourcePath = join(directory, 'label with spaces.lts');
    for (const [target, reference] of [['ts', 'report-42.ts'], ['c', 'report-42.c']] as const) {
      writeFileSync(sourcePath, "io := import \"core/io\"; io.outputLine(42);");
      const valid = spawnSync(target === 'ts' ? join(root, 'bin/lite-compile-ts') : process.execPath, target === 'ts' ? [sourcePath] : [cCompilerPath, sourcePath], { env, timeout: 5000 });
      assert.equal(valid.error, undefined); assert.equal(valid.status, 0);
      assert.deepEqual(valid.stdout, readFileSync(join(root, 'compiler/tests/references/generated', reference)));
      assert.equal(valid.stderr.length, 0);
      writeFileSync(sourcePath, "io := import \"core/io\"; io.outputLine(1 +);");
      const invalid = spawnSync(target === 'ts' ? join(root, 'bin/lite-compile-ts') : process.execPath, target === 'ts' ? [sourcePath] : [cCompilerPath, sourcePath], { env, timeout: 5000 });
      assert.equal(invalid.error, undefined); assert.equal(invalid.status, 2); assert.equal(invalid.stdout.length, 0);
      assert.deepEqual(invalid.stderr, Buffer.from(`${sourcePath}:1:42: expected an Int, Float, String or Bool expression\n`));
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});


test('whole-source TS and C compilers reject later statements and decoding failures before artifact output', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'litec-reject-'));
  try {
    const cCompilerPath = buildCompiler('c').path;
    const sourcePath = join(directory, 'source.lts');
    for (const target of ['ts', 'c'] as const) {
      writeFileSync(sourcePath, '');
      const empty = spawnSync(target === 'ts' ? join(root, 'bin/lite-compile-ts') : process.execPath, target === 'ts' ? [sourcePath] : [cCompilerPath, sourcePath], { env, timeout: 5000 });
      assert.equal(empty.error, undefined); assert.equal(empty.status, 0, empty.stderr.toString());
      assert.ok(empty.stdout.length > 0); assert.equal(empty.stderr.length, 0);
      for (const input of [' \n}', "io := import \"core/io\"; io.outputLine(42);\nunsupported();\n", "io := import \"core/io\"; io.outputLine(42);\nprocess.io.exit(7);\n"]) {
        writeFileSync(sourcePath, input);
        const rejected = spawnSync(target === 'ts' ? join(root, 'bin/lite-compile-ts') : process.execPath, target === 'ts' ? [sourcePath] : [cCompilerPath, sourcePath], { env, timeout: 5000 });
        assert.equal(rejected.error, undefined); assert.equal(rejected.status, 2, rejected.stderr.toString());
        assert.equal(rejected.stdout.length, 0); assert.notEqual(rejected.stderr.length, 0);
      }
      writeFileSync(sourcePath, Buffer.concat([Buffer.from("io := import \"core/io\"; io.outputLine(42);\n"), Buffer.from([0xff])]));
      const invalid = spawnSync(target === 'ts' ? join(root, 'bin/lite-compile-ts') : process.execPath, target === 'ts' ? [sourcePath] : [cCompilerPath, sourcePath], { env, timeout: 5000 });
      assert.equal(invalid.error, undefined); assert.equal(invalid.status, 1);
      assert.equal(invalid.stdout.length, 0); assert.match(invalid.stderr.toString(), /InputFault: cannot read input/);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('checked-in TS output and explicit Node adapter typecheck and reproduce the reference bytes', () => {
  const root = new URL('../', import.meta.url).pathname;
  const directory = mkdtempSync(join(tmpdir(), 'lite-adapter-check-'));
  try {
    const config = join(directory, 'tsconfig.json');
    writeFileSync(config, JSON.stringify({ extends: join(root, 'igniter/tsconfig.json'), include: [],
      files: [join(root, 'compiler/tests/references/generated/run-report.ts')],
      compilerOptions: { typeRoots: [join(root, 'igniter/node_modules/@types')] } }));
    const checked = spawnSync(process.execPath, [join(root, 'igniter/node_modules/typescript/bin/tsc'), '-p', config],
      { encoding: 'utf8', timeout: 30000 });
    assert.equal(checked.error, undefined); assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  } finally { rmSync(directory, { recursive: true, force: true }); }
  const result = spawnSync(process.execPath, [join(root, 'compiler/tests/references/generated/run-report.ts')], { timeout: 5000 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0);
  assert.deepEqual(result.stdout, Buffer.from('42\n')); assert.equal(result.stderr.length, 0);
});


test('source graph artifacts are deterministic and leak no timestamps or host paths', context => {
  const root = new URL('../', import.meta.url).pathname;
  const manifest = join(root, 'compiler/manifests/ts.json');
  const compiler = compilerFor(manifest);
  const source = "io := import \"core/io\"; x := 1;\nio.outputLine(x + 1);\n";
  const first = compiler.compile({ text: source });
  const second = compiler.compile({ text: source });
  assert.equal(first.status, 0);
  assert.equal(sha256(first.stdout), sha256(second.stdout));
  assert.equal(sha256(first.stderr), sha256(second.stderr));
  const emitted = first.stdout.toString('utf8');
  assert.equal(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\b/.test(emitted), false);
  for (const forbidden of [root, tmpdir(), process.cwd()]) {
    if (forbidden.length > 0) assert.equal(emitted.includes(forbidden), false, `leaked host path: ${forbidden}`);
  }
  const values: ReturnType<typeof buildCompiler>[] = [];
  let bestMs = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 2; i += 1) {
    const started = performance.now();
    values.push(buildCompiler('ts'));
    const elapsed = performance.now() - started;
    if (elapsed < bestMs) bestMs = elapsed;
  }
  context.diagnostic(`generated compiler selection best: ${bestMs.toFixed(1)} ms`);
  assert.ok(bestMs < 10000, `generated compiler selection took ${bestMs.toFixed(1)} ms`);
  for (const value of values) assert.ok(value.dependencies.length > 1);
});
