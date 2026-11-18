import { compilerFixtures, programFixtures, rejectionFixtures, type CompilerFixture } from './test-fixtures.ts';
import { expectedText } from '../compiler/tests/contracts.ts';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildCompiler, compileBuiltCompiler, compileTs, loadManifest, type CompilerInput, type CompilerResult } from '../compiler/host.ts';
import { prepareTsArtifacts, runCArtifact, runTsArtifact, sha256, withTsArtifact, withTsArtifacts, type PreparedTsArtifacts } from './artifacts.ts';

const tsManifestPath = new URL('../compiler/manifests/ts.json', import.meta.url).pathname;
const cManifestPath = new URL('../compiler/manifests/c.json', import.meta.url).pathname;
const lexerDumpPath = new URL('../compiler/tests/lexer/lexer-dump.lts', import.meta.url).pathname;
const parserProgramDumpPath = new URL('../compiler/tests/parser/parser-program-dump.lts', import.meta.url).pathname;
const checkerDumpPath = new URL('../compiler/tests/checker/checker-dump.lts', import.meta.url).pathname;
const parserProgramInputs = JSON.parse(readFileSync(new URL('./tests/parser-inputs.json', import.meta.url), 'utf8')) as Record<string, string>;

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

/** Reuses checked driver artifacts, while every input executes in a fresh process. */
const drivers = new Map<string, PreparedTsArtifacts>();
after(() => { for (const prepared of drivers.values()) prepared.dispose(); });
function run(source: string, input = '', args: readonly string[] = [], name?: string): { code: number; output: string; errors: string } {
  const key = `${name ?? ''}\0${source}`;
  let prepared = drivers.get(key);
  if (prepared === undefined) {
    const compiled = name === undefined ? compileTs({ text: source }) : compileTs({ text: source, name });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    assert.equal(compiled.stderr.length, 0);
    prepared = prepareTsArtifacts([compiled.stdout.toString()]);
    drivers.set(key, prepared);
  }
  const actual = prepared.runs[0]!({ stdin: input, args });
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.equal(actual.signal, null);
  assert.notEqual(actual.status, null);
  return { code: actual.status!, output: actual.stdout.toString(), errors: actual.stderr.toString() };
}
/** Compiles a Lite test root with its source imports and executes it. */
function runFile(path: string, input = '', args: readonly string[] = []): { code: number; output: string; errors: string } {
  return run(readFileSync(path, 'utf8'), input, args, realpathSync(path));
}
/** Looks up an independently recorded phase-driver contract. */
function expectedFile(path: string, input = ''): { code: number; output: string; errors: string } {
  const result = expectedText(readFileSync(path, 'utf8'), { stdin: input });
  return { code: result.status, output: result.stdout.toString(), errors: result.stderr.toString() };
}
/** Compiles a Lite test driver and its imports once, strictly checks it once, and runs isolated inputs. */
function withGeneratedDriver(path: string, check: (run: (input: string) => { code: number; output: string; errors: string }) => void, timeoutMs = 10000): void {
  const compiled = compileTs({ text: readFileSync(path, 'utf8'), name: realpathSync(path) });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  assert.equal(compiled.stderr.length, 0);
  const prepared = prepareTsArtifacts([compiled.stdout.toString()], { timeoutMs });
  try {
    check(input => {
      const result = prepared.runs[0]!({ stdin: input });
      assert.equal(result.phase, 'run', result.stdout.toString() + result.stderr.toString());
      assert.equal(result.signal, null);
      assert.notEqual(result.status, null);
      return { code: result.status!, output: result.stdout.toString(), errors: result.stderr.toString() };
    });
  } finally { prepared.dispose(); }
}
/** Imports an emitted TS/JS core and returns its main() string. */
async function importedMain(path: string): Promise<string> {
  const imported: unknown = await import(pathToFileURL(path).href);
  if (typeof imported !== 'object' || imported === null || !('main' in imported)) {
    throw new Error(`${path}: missing main export`);
  }
  const main = (imported as { main: unknown }).main;
  if (typeof main !== 'function') throw new Error(`${path}: main is not a function`);
  const result: unknown = (main as () => unknown)();
  if (typeof result !== 'string') throw new Error(`${path}: main did not return a string`);
  return result;
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

test('L0 shared libraries have direct bootstrap tests', () => {
  const root = new URL('../', import.meta.url).pathname;
  for (const name of ['int', 'text', 'source', 'format', 'diag', 'list']) {
    assert.deepEqual(runFile(join(root, 'lib/tests', `${name}.lts`)), {
      code: 0, output: `${name}: ok\n`, errors: '',
    }, name);
  }
  assert.deepEqual(runFile(join(root, 'lib/tests/diag-fail.lts')), {
    code: 2, output: '', errors: 'name:message\n',
  });
  assert.deepEqual(runFile(join(root, 'lib/tests/test-fail.lts')), {
    code: 2, output: '', errors: 'FAIL bad\n',
  });
});

test('shared utility libraries under lib/util pass direct Lite tests', () => {
  const root = new URL('../', import.meta.url).pathname;
  for (const name of ['util-path', 'util-project', 'util-cli', 'util-release', 'util-json', 'util-markdown', 'util-markdown-html', 'util-docs', 'util-docgen', 'util-streams', 'util-cases', 'util-verify', 'util-corpus', 'util-benchmark', 'util-compiler-release', 'util-challenges', 'util-challenge-build', 'util-site-library', 'util-site-tools', 'util-site-modules', 'util-site-docs']) {
    assert.deepEqual(runFile(join(root, 'lib/tests', `${name}.lts`)), {
      code: 0, output: `${name}: ok\n`, errors: '',
    }, name);
  }
});

test('Lite parser parses L0 libraries and original program cases', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const root = new URL('../', import.meta.url).pathname;
  const runParser = (input: string) => runFile(parserProgramDumpPath, input);
  for (const path of ['lib/core/int.lts', 'lib/core/text.lts', 'lib/core/source.lts',
    'lib/core/format.lts', 'lib/core/diag.lts', 'lib/core/list.lts', 'lib/core/test.lts']) {
    const sourcePath = join(root, path);
    const result = compileTs({ text: readFileSync(sourcePath, 'utf8'), name: realpathSync(sourcePath) });
    assert.equal(result.status, 0, `${path}: ${result.stderr.toString()}`);
  }
  assert.deepEqual(Object.keys(parserProgramInputs).sort(), programFixtures.map(({ file }) => file).sort());
  for (const fixture of programFixtures) {
    const source = parserProgramInputs[fixture.file];
    assert.equal(typeof source, 'string', `${fixture.file}: missing original parser input`);
    const result = runParser(source!);
    assert.equal(result.code, 0, `${fixture.name}: ${result.errors}`);
    assert.equal(result.errors, '', fixture.name);
  }
  const boundaryPrograms = ['x := 1', 'x: Int', 'Number := type Int',
    'if true { x := 1 } outputLine(2)', 'if true { outputLine(1) }; outputLine(2)',
    'f := fn(): Int { return 7 } outputLine(f())',
    'x := if true { 1 } else { 2 } outputLine(x)',
    'var x := 1; x = 2', '{ outputLine(1) }; outputLine(2)',
    'outputLine("a" /* nested /* comment */ */ "b")', 'word := "a" "b"; outputLine(word)',
    'outputLine(1,)', 'f := fn(n: Int): Int { n } outputLine(f(1,),)',
    '; ; /* empty */ ;', '1; Unit; true;;', 'x := 1; x + 2;;',
    'f := fn(): Int { ;; 1; 2;; } outputLine(f());'];
  const boundaryRejections = ['outputLine(1) outputLine(2)', 'x := 1 outputLine(x)',
    'x := (if true { 1 } else { 2 }) outputLine(x)', 'x := 1 /* } */ outputLine(x)',
    'f := fn(): Int { return 7 outputLine(9); }', 'outputLine(("a") "b")', 'outputLine(1,,)'];
  withGeneratedDriver(parserProgramDumpPath, generated => {
    for (const input of boundaryPrograms) for (const result of [runParser(input), generated(input)]) {
      assert.equal(result.code, 0, input + result.errors); assert.equal(result.errors, '');
    }
    for (const input of boundaryRejections) for (const result of [runParser(input), generated(input)]) {
      assert.equal(result.code, 2, input); assert.equal(result.output, '');
    }
  });
});

test('Lite parser coverage follows the compiler source graph', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') {
    context.skip('LITE_SKIP_HEAVY=1'); return;
  }
  withGeneratedDriver(parserProgramDumpPath, runParser => {
    const fixture = readFileSync(new URL('../compiler/tests/parser/program.lts', import.meta.url), 'utf8');
    const expected = readFileSync(new URL('../compiler/tests/parser/program.nodes', import.meta.url), 'utf8');
    assert.deepEqual(runParser(fixture), { code: 0, output: expected, errors: '' });
    assert.deepEqual(runParser('match x { _ => 1 }'), {
      code: 2, output: '', errors: '1:1: unsupported feature "match"\n',
    });
    const selected = buildCompiler('ts');
    for (const file of selected.dependencies) {
      const sourcePath = resolve(new URL('../', import.meta.url).pathname, file);
      const parsed = compileTs({ text: readFileSync(sourcePath, 'utf8'), name: realpathSync(sourcePath) });
      assert.equal(parsed.status, 0, `${file}: ${parsed.stderr.toString()}`);
    }
    for (const file of buildCompiler('c').dependencies) {
      const sourcePath = resolve(new URL('../', import.meta.url).pathname, file);
      const parsed = compileTs({ text: readFileSync(sourcePath, 'utf8'), name: realpathSync(sourcePath) });
      assert.equal(parsed.status, 0, `${file}: ${parsed.stderr.toString()}`);
    }
  });
});

test('Lite checker collects symbols from the assembled S', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') {
    context.skip('LITE_SKIP_HEAVY=1'); return;
  }
  withGeneratedDriver(checkerDumpPath, runChecker => {
    const fixture = readFileSync(new URL('../compiler/tests/checker/symbols.lts', import.meta.url), 'utf8');
    assert.deepEqual(runChecker(fixture), expectedFile(checkerDumpPath, fixture));
    const duplicate = 'x := 1; x := 2;';
    assert.deepEqual(runChecker(duplicate), expectedFile(checkerDumpPath, duplicate));
    const selected = buildCompiler('ts');
    for (const file of selected.dependencies) {
      const sourcePath = resolve(new URL('../', import.meta.url).pathname, file);
      const compiled = compileTs({ text: readFileSync(sourcePath, 'utf8'), name: realpathSync(sourcePath) });
      assert.equal(compiled.status, 0, `${file}: ${compiled.stderr.toString()}`);
    }
  }, 120000); // Whole compiler source is a phase sweep, beyond an ordinary program fixture.
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


/** Keeps pure successful cores importable, and isolates faulting/input-bearing TS or translated JS programs. */
async function assertImportedFixture(path: string, fixture: CompilerFixture): Promise<void> {
  if (fixture.exitCode === 0 && fixture.stdin.length === 0 && fixture.stderr.length === 0) {
    assert.equal(await importedMain(path), fixture.stdout.toString('utf8'), fixture.name);
    return;
  }
  const runScript = "import { writeSync } from 'node:fs'; import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL(process.argv[1]).href); const out = m.main((t) => writeSync(1, t)); if (typeof out === 'string' && out.length > 0) writeSync(1, out);";
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', runScript, path], {
    input: fixture.stdin, timeout: 5000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, fixture.name); assert.equal(result.signal, null, fixture.name);
  assert.equal(result.status, fixture.exitCode, fixture.name);
  assert.deepEqual(result.stdout, fixture.stdout, fixture.name);
  assert.deepEqual(result.stderr, fixture.stderr, fixture.name);
}

test('compiler verification cases are well-formed and cover both categories', () => {
  assert.ok(programFixtures.length > 0);
  assert.ok(rejectionFixtures.length > 0);
  assert.equal(new Set(compilerFixtures.map(fixture => `${fixture.file}/${fixture.caseName}`)).size, compilerFixtures.length);
});

test('compiler manifests name graph roots and no flattened source bundle', () => {
  for (const [target, path] of [['ts', tsManifestPath], ['c', cManifestPath]] as const) {
    const manifest = loadManifest(path);
    assert.equal(manifest.target, target);
    assert.equal(manifest.files.length, 1);
    const built = buildCompiler(target);
    assert.ok(built.dependencies.length > 1);
    assert.equal(built.dependencies[0], `compiler/src/${target}-root.lts`);
    assert.ok(built.dependencies.includes('compiler/src/frontend.lts'));
    for (const file of built.dependencies) assert.doesNotMatch(readFileSync(resolve(new URL('../', import.meta.url).pathname, file), 'utf8'), /^\s*importFlatAll\b/m, file);
  }
});

test('bundle compilers reproduce every compiler case with exact artifacts and diagnostics', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const tsCompiler = compilerFor(tsManifestPath);
  const cCompiler = compilerFor(cManifestPath);
  assert.equal(tsCompiler.target, 'ts');
  assert.equal(cCompiler.target, 'c');
  // Intentional emitter changes refresh the current hashes; P0 stays historical.
  const baselineValue: unknown = JSON.parse(readFileSync(
    new URL('../compiler/tests/references/generated/current-artifacts.json', import.meta.url), 'utf8'));
  if (typeof baselineValue !== 'object' || baselineValue === null || Array.isArray(baselineValue)) {
    throw new Error('invalid baseline artifacts');
  }
  const rows = (baselineValue as Record<string, unknown>)['artifacts'];
  if (!Array.isArray(rows)) throw new Error('invalid baseline artifacts list');
  const hashes = new Map<string, Readonly<Record<string, string>>>();
  for (const row of rows) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const name = record['name'];
    const ts = record['ts'];
    const c = record['c'];
    if (typeof name === 'string' && typeof ts === 'string' && typeof c === 'string') {
      hashes.set(name, { ts, c });
    }
  }
  assert.equal(hashes.size, new Set(programFixtures.map(fixture => fixture.name)).size);
  for (const [target, compiler] of [['ts', tsCompiler], ['c', cCompiler]] as const) {
    for (const fixture of compilerFixtures) {
      const actual = compiler.compile({ text: fixture.source });
      if (fixture.category === 'rejected') {
        assert.equal(actual.status, fixture.exitCode, `${target}: ${fixture.name}/${fixture.caseName}`);
        assert.deepEqual(actual.stdout, fixture.stdout, `${target}: ${fixture.name}/${fixture.caseName}`);
        assert.deepEqual(actual.stderr, fixture.stderr, `${target}: ${fixture.name}/${fixture.caseName}`);
      } else {
        assert.equal(actual.status, 0, `${target}: ${fixture.name}/${fixture.caseName}`);
        assert.deepEqual(actual.stderr, Buffer.alloc(0), `${target}: ${fixture.name}/${fixture.caseName}`);
        const baseline = hashes.get(fixture.name)?.[target];
        assert.equal(baseline, `sha256:${sha256(actual.stdout)}`,
          `${target}: ${fixture.name}/${fixture.caseName}`);
      }
    }
  }
  const label = 'named source.lts';
  assert.deepEqual(tsCompiler.compile({ text: "io := import \"core/io\"; io.outputLine(42);", name: label }), {
    status: 0, stdout: readFileSync(new URL('../compiler/tests/references/generated/report-42.ts', import.meta.url)), stderr: Buffer.alloc(0),
  });
  assert.deepEqual(tsCompiler.compile({ text: "io := import \"core/io\"; io.outputLine(1 +);", name: label }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from(`${label}:1:42: expected an Int, Float, String or Bool expression\n`),
  });
});

test('Lite lexer tokenizes all bootstrap S and compiler cases', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') {
    context.skip('LITE_SKIP_HEAVY=1'); return;
  }
  withGeneratedDriver(lexerDumpPath, runLexer => {
    for (const name of ['tokens', 'symbols', 'comments', 'strings', 'int']) {
      const fixture = readFileSync(new URL(`../compiler/tests/lexer/${name}.lts`, import.meta.url), 'utf8');
      assert.deepEqual(runLexer(fixture), expectedFile(lexerDumpPath, fixture), name);
    }
    const selected = buildCompiler('ts');
    assert.ok(selected.dependencies.includes('compiler/src/ts-root.lts'));
    for (const path of [
      new URL('../compiler/src/c-literals.lts', import.meta.url).pathname,
      new URL('../compiler/src/emit-c.lts', import.meta.url).pathname,
      new URL('../compiler/src/driver-c.lts', import.meta.url).pathname,
      new URL('../compiler/src/lexer.lts', import.meta.url).pathname,
      new URL('../compiler/tests/lexer/lexer-dump.lts', import.meta.url).pathname,
      new URL('../compiler/src/parser.lts', import.meta.url).pathname,
      new URL('../compiler/src/check.lts', import.meta.url).pathname,
      new URL('../compiler/tests/parser/parser-dump.lts', import.meta.url).pathname,
      new URL('../compiler/tests/parser/parser-decl-dump.lts', import.meta.url).pathname,
      new URL('../compiler/tests/parser/parser-program-dump.lts', import.meta.url).pathname,
      new URL('../compiler/tests/checker/checker-dump.lts', import.meta.url).pathname]) {
      const result = runLexer(readFileSync(path, 'utf8'));
      assert.equal(result.code, 0, `${path}: ${result.errors}`);
      assert.equal(result.errors, '', path);
      assert.match(result.output, /EOF@/, path);
    }
    const lexicalFailures = new Map<string, RegExp>([
      ['injected-source', /unterminated string literal/],
      ['literal-below-min', /integer literal outside signed 64-bit range/],
      ['literal-too-large', /integer literal outside signed 64-bit range/],
      ['bad-string-escape', /unsupported string escape/],
      ['unterminated-string', /unterminated string literal/],
    ]);
    for (const fixture of compilerFixtures) {
      const result = runLexer(fixture.source);
      const expected = lexicalFailures.get(fixture.name);
      if (expected === undefined) {
        assert.equal(result.code, 0, `${fixture.name}: ${result.errors}`);
        assert.equal(result.errors, '', fixture.name);
        assert.match(result.output, /EOF@/, fixture.name);
      } else {
        assert.equal(result.code, 2, fixture.name);
        assert.equal(result.output, '', fixture.name);
        assert.match(result.errors, expected, fixture.name);
      }
    }
  });
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

test('TS runtime helpers preserve checked Int64, text and list semantics', () => {
  const runCase = (text: string) => {
    const compiled = compileTs({ text, name: 'runtime-contract.lts' });
    assert.equal(compiled.status, 0, compiled.stderr.toString('utf8'));
    return runTsArtifact(compiled.stdout.toString('utf8'));
  };
  const ok = runCase(`
    io := import "core/io";
    list := import "core/list";
    text := import "core/text";
    integer := import "core/int";
    negSeven := -7;
    two := 2;
    fortyTwo := 42;
    io.outputLine(2 + 3, 2 - 3, -6 * 7, negSeven / two, negSeven % two, -fortyTwo, integer.intMin);
    io.outputLine(text.length("a🙂"), text.at("a🙂", 1), text.slice("a🙂b", 1, 2));
    src: mut List<Int> = [1, 2];
    copy: mut List<Int> = src;
    list.pushBack(mut copy, 3);
    io.outputLine(list.listCountInt(src), list.listCountInt(copy));
  `);
  assert.equal(ok.status, 0, ok.stderr.toString('utf8'));
  assert.equal(ok.stdout.toString('utf8'), '5 -1 -42 -3 -1 -42 -9223372036854775808\n2 🙂 🙂\n2 3\n');

  for (const [faultSource, pattern] of [
    ['integer := import "core/int"; io := import "core/io"; x := integer.intMax; io.outputLine(x + 1);', /ArithmeticPanic:/],
    ['x := 0; io := import "core/io"; io.outputLine(1 / x);', /ArithmeticPanic:/],
    ['integer := import "core/int"; io := import "core/io"; x := integer.intMin; io.outputLine(-x);', /ArithmeticPanic:/],
    ['text := import "core/text"; io := import "core/io"; io.outputLine(text.at("a", 9));', /BoundPanic:/],
  ] as const) {
    const res = runCase(faultSource);
    assert.equal(res.status, 1);
    assert.match(res.stderr.toString('utf8'), pattern);
  }
});

test('restricted compiler compiles text builtins with code-point semantics and bounds faults', () => {
  const source = "text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.length(\"a🙂é\"), text.at(\"a🙂é\", 1), text.slice(\"a🙂é\", 1, 3));\n";
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('3 🙂 🙂é\n'), stderr: Buffer.alloc(0),
  });
  for (const [bad, pattern] of [
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.at(\"a\", 9));\n", /BoundPanic: textAt index outside text/],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.at(\"a\", -1));\n", /BoundPanic: textAt index outside text/],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.slice(\"abc\", 2, 1));\n", /BoundPanic: textSlice requires 0 <= start <= end <= textLength\(text\)/],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.slice(\"abc\", 0, 4));\n", /BoundPanic: textSlice requires 0 <= start <= end <= textLength\(text\)/],
  ] as const) {
    const bounds = runCompiler(tsManifestPath, bad);
    assert.equal(bounds.code, 0, bounds.errors);
    const boundsRun = runTsArtifact(bounds.output);
    assert.equal(boundsRun.phase, 'run');
    assert.notEqual(boundsRun.status, 0);
    assert.match(boundsRun.stderr.toString(), pattern);
  }
});

test('generated text helpers preserve Unicode values after many distinct cached inputs', () => {
  const text = 'A🙂éسلام';
  const probes = Array.from({ length: 32 }, (_, index) => `io.outputLine(text.length("text-${index}🙂"));`);
  const source = [
    'text := import "core/text"; io := import "core/io";',
    `original := "${text}";`,
    'io.outputLine(text.length(original), text.at(original, 1), text.slice(original, 2, 4));',
    ...probes,
    'io.outputLine(text.length(original), text.at(original, 1), text.slice(original, 2, 4));',
  ].join('\n');
  const generated = runCompiler(tsManifestPath, source);
  assert.equal(generated.code, 0, generated.errors);
  assert.deepEqual(runTsArtifact(generated.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from(['8 🙂 é', ...Array.from({ length: 32 }, (_, index) => String(6 + String(index).length)), '8 🙂 é'].join('\n') + '\n'),
    stderr: Buffer.alloc(0),
  });
});

test('restricted compiler compiles input, diagnostic and exit builtins in value and statement positions', () => {
  const argsSource = [
    'text := import "core/text"; io := import "core/io";',
    'label := fn (n: Int): String { if n == 0 { "zero" } else { text.at("abc", n) } }',
    'names := io.inputArgs();',
    'loop names as name { io.outputLine(text.length(name)); }',
    'io.outputLine(if text.length("xy") == 2 { "two" } else { "other" });',
    'io.outputLine(label(1), label(0), names[1]);',
  ].join('\n');
  const args = runCompiler(tsManifestPath, argsSource);
  assert.equal(args.code, 0, args.errors);
  assert.deepEqual(runTsArtifact(args.output, { args: ['ab', 'c'] }), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('2\n1\ntwo\nb zero c\n'), stderr: Buffer.alloc(0),
  });

  const whole = runCompiler(tsManifestPath, "io := import \"core/io\"; io.outputLine(io.inputAll());\n");
  assert.equal(whole.code, 0, whole.errors);
  assert.deepEqual(runTsArtifact(whole.output, { stdin: 'one\ntwo\n' }), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('one\ntwo\n\n'), stderr: Buffer.alloc(0),
  });
  assert.deepEqual(runTsArtifact(whole.output, { stdin: '' }), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('\n'), stderr: Buffer.alloc(0),
  });

  const diagnostic = runCompiler(tsManifestPath,
    "io := import \"core/io\"; io.outputLine(\"before\");\nio.errorLine(\"warn\");\nio.exit(3);\n");
  assert.equal(diagnostic.code, 0, diagnostic.errors);
  assert.deepEqual(runTsArtifact(diagnostic.output), {
    phase: 'run', status: 3, signal: null,
    stdout: Buffer.from('before\n'), stderr: Buffer.from('warn\n'),
  });
  const clean = runCompiler(tsManifestPath, "io := import \"core/io\"; io.outputLine(\"ok\");\nio.exit(0);\n");
  assert.equal(clean.code, 0, clean.errors);
  assert.deepEqual(runTsArtifact(clean.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('ok\n'), stderr: Buffer.alloc(0),
  });
});

test('restricted compiler diagnoses I/O and text builtin arity and argument mismatches', () => {
  for (const [bad, errors] of [
    ["io := import \"core/io\"; io.outputLine(io.inputArgs(1));\n", '1:39: function io.inputArgs expects 0 arguments, got more\n'],
    ["io := import \"core/io\"; io.outputLine(io.inputAll(1));\n", '1:51: argument 1 of io.inputAll must be String, got Int\n'],
    ["io := import \"core/io\"; io.errorLine();\n", '1:25: function io.errorLine expects 1 argument, got 0\n'],
    ["io := import \"core/io\"; io.errorLine(1);\n", '1:38: argument 1 of io.errorLine must be String, got Int\n'],
    ["io := import \"core/io\"; io.errorLine(\"x\", \"y\");\n", '1:25: function io.errorLine expects 1 argument, got more\n'],
    ["io := import \"core/io\"; io.exit(1, 2);\n", '1:25: function io.exit expects 1 argument, got more\n'],
    ["io := import \"core/io\"; io.exit(\"x\");\n", '1:33: argument 1 of io.exit must be Int, got String\n'],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.length());\n", '1:67: function text.length expects 1 argument, got 0\n'],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.length(1));\n", '1:79: argument 1 of text.length must be String, got Int\n'],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.at(\"a\"));\n", '1:67: function text.at expects 2 arguments, got 1\n'],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.at(\"a\", \"b\"));\n", '1:80: argument 2 of text.at must be Int, got String\n'],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.slice(\"a\", 0));\n", '1:67: function text.slice expects 3 arguments, got 2\n'],
    ["io := import \"core/io\"; io.outputLine(io.inputArgs);\n", '1:39: function io.inputArgs must be called\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
});

test('restricted C compiler rejects input, diagnostic and text builtins clearly', () => {
  for (const [bad, message] of [
    ["io := import \"core/io\"; io.outputLine(io.inputAll());\n", 'C backend does not support input builtins yet\n'],
    ["io := import \"core/io\"; io.outputLine(io.inputArgs());\n", 'C backend does not support input builtins yet\n'],
    ["io := import \"core/io\"; io.errorLine(\"x\");\n", 'C backend does not support reportError or exit yet\n'],
    ["io := import \"core/io\"; io.exit(2);\n", 'C backend does not support reportError or exit yet\n'],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.length(\"abc\"));\n", 'C backend does not support text builtins yet\n'],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.at(\"abc\", 0));\n", 'C backend does not support text builtins yet\n'],
    ["text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.slice(\"abc\", 0, 1));\n", 'C backend does not support text builtins yet\n'],
  ] as const) {
    assert.deepEqual(runCompiler(cManifestPath, bad), { code: 2, output: '', errors: message }, bad);
  }
});

test('restricted C compiler preserves existing output and rejects function syntax clearly', () => {
  assert.deepEqual(runCompiler(cManifestPath, "io := import \"core/io\"; io.outputLine(42);"), {
    code: 0, output: readFileSync(new URL('../compiler/tests/references/generated/report-42.c', import.meta.url), 'utf8'), errors: '',
  });
  assert.deepEqual(runCompiler(cManifestPath, "io := import \"core/io\"; f := fn (x: Int): Int { return x; }\nio.outputLine(f(42));\n"), {
    code: 2, output: '', errors: 'C backend does not support top-level functions yet\n',
  });
});

test('artifact runner typechecks emitted TS and compiles C with warnings as errors', async context => {
  const root = new URL('../', import.meta.url).pathname;
  const source = "io := import \"core/io\"; x := 2 * 3;\nio.outputLine(x);\n";
  const tsCompiler = compilerFor(join(root, 'compiler/manifests/ts.json'));
  const tsArtifact = tsCompiler.compile({ text: source });
  assert.equal(tsArtifact.status, 0);
  assert.deepEqual(runTsArtifact(tsArtifact.stdout.toString('utf8')), {
    phase: 'run', status: 0, signal: null, stdout: Buffer.from('6\n'), stderr: Buffer.alloc(0),
  });
  if (process.env['LITE_SKIP_NATIVE'] === '1') {
    context.skip('LITE_SKIP_NATIVE=1'); return;
  }
  const cc = process.env['CC'] ?? 'cc';
  const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
    context.skip('C compiler unavailable; artifact runner requires cc or CC'); return;
  }
  assert.equal(probe.error, undefined);
  assert.equal(probe.status, 0, probe.stderr);
  const cCompiler = compilerFor(join(root, 'compiler/manifests/c.json'));
  const cArtifact = cCompiler.compile({ text: source });
  assert.equal(cArtifact.status, 0);
  assert.deepEqual(runCArtifact(cArtifact.stdout.toString('utf8')), {
    phase: 'run', status: 0, signal: null, stdout: Buffer.from('6\n'), stderr: Buffer.alloc(0),
  });
});

test('restricted C compiler emits the readable reference and sequences reports', () => {
  const expected = readFileSync(new URL('../compiler/tests/references/generated/report-42.c', import.meta.url), 'utf8');
  assert.deepEqual(runCompiler(cManifestPath, "io := import \"core/io\"; io.outputLine(42);"), { code: 0, output: expected, errors: '' });
  assert.equal(runCompiler(cManifestPath, "io := import \"core/io\"; io.outputLine(42);\nio.outputLine(9);").output,
    '#include <stdio.h>\n#include <inttypes.h>\n#include <stdbool.h>\n#include <string.h>\nint main(void) {\n    int status = 0;\n' +
    '    if (printf("%" PRId64, (int64_t)(INT64_C(42))) < 0) { status = 1; }\n' +
    '    if (printf("\\n") < 0) { status = 1; }\n' +
    '    if (printf("%" PRId64, (int64_t)(INT64_C(9))) < 0) { status = 1; }\n' +
    '    if (printf("\\n") < 0) { status = 1; }\n' +
    '    return status;\n}\n');
});
test('Lite-generated native C, TS and igniter programs have identical output bytes and status', async context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') {
    context.skip('LITE_SKIP_NATIVE=1'); return;
  }
  const cc = process.env['CC'] ?? 'cc';
  const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
    context.skip('C compiler unavailable; native parity requires cc or CC pointing to a compiler'); return;
  }
  assert.equal(probe.error, undefined); assert.equal(probe.status, 0, probe.stderr);
  const ccVersion = `${probe.stdout}\n${probe.stderr}`.trim();
  const cacheDirectory = new URL('../dist/native/', import.meta.url).pathname;
  mkdirSync(cacheDirectory, { recursive: true });
  const directory = mkdtempSync(join(tmpdir(), 'lite-native-parity-'));
  try {
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    for (const [index, fixture] of programFixtures.entries()) {
      const sourcePath = join(directory, `input-${index}.lts`);
      const cPath = join(directory, `program-${index}.c`);
      const tsPath = join(directory, `program-${index}.ts`);
      const executable = join(directory, `native-${index}`);
      const stdinPath = join(directory, `stdin-${index}.bin`);
      writeFileSync(sourcePath, fixture.source);
      writeFileSync(stdinPath, fixture.stdin);
      for (const [manifest, path] of [[cManifestPath, cPath], [tsManifestPath, tsPath]] as const) {
        const emitted = runCompiler(manifest, fixture.source);
        assert.equal(emitted.code, 0, fixture.name); assert.equal(emitted.errors, '', fixture.name);
        writeFileSync(path, emitted.output);
      }
      const cacheKey = createHash('sha256').update(readFileSync(cPath)).update(ccVersion)
        .update('-std=c11 -Wall -Wextra -Werror -lm').update(process.platform).update(process.arch).digest('hex');
      const cached = join(cacheDirectory, cacheKey);
      let executablePath = executable;
      if (process.env['LITE_NO_NATIVE_CACHE'] !== '1' && existsSync(cached)) {
        executablePath = cached;
      } else {
        const built = spawnSync(cc, ['-std=c11', '-Wall', '-Wextra', '-Werror', cPath, '-o', executable, '-lm'], {
          encoding: 'utf8', timeout: 30000,
        });
        assert.equal(built.error, undefined); assert.equal(built.status, 0, built.stdout + built.stderr);
        if (process.env['LITE_NO_NATIVE_CACHE'] !== '1') {
          copyFileSync(executable, cached); chmodSync(cached, 0o755); executablePath = cached;
        }
      }
      await assertImportedFixture(tsPath, fixture);
      // Feed stdin through a file descriptor rather than a pipe: a program that
      // exits without reading its input (outputLine(0) ignores the fixture bytes)
      // otherwise races the parent's write and spuriously reports EPIPE, which
      // is a harness artifact, not an output or status difference.
      const stdinFd = openSync(stdinPath, 'r');
      const native = spawnSync(executablePath, [], { stdio: [stdinFd, 'pipe', 'pipe'], timeout: 5000 });
      closeSync(stdinFd);
      assert.equal(native.error, undefined, fixture.name);
      assert.equal(native.status, fixture.exitCode, fixture.name);
      assert.equal(native.signal, null, fixture.name);
      assert.deepEqual(native.stdout, fixture.stdout, fixture.name);
      assert.deepEqual(native.stderr, fixture.stderr, fixture.name);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('Lite-written TS emitter produces a deterministic readable reference with no extra source', () => {
  const expected = readFileSync(new URL('../compiler/tests/references/generated/report-42.ts', import.meta.url), 'utf8');
  assert.deepEqual(runCompiler(tsManifestPath, "io := import \"core/io\"; io.outputLine(42);"), { code: 0, output: expected, errors: '' });
  assert.equal(runCompiler(tsManifestPath, "io := import \"core/io\"; io.outputLine(42);").output, runCompiler(tsManifestPath, "io := import \"core/io\"; io.outputLine(42);").output);
  assert.equal(runCompiler(tsManifestPath, "io := import \"core/io\";  io.outputLine( +00042 ) ; ").output, expected);
  assert.equal(runCompiler(tsManifestPath, "io := import \"core/io\"; io.outputLine(-000);").output,
    'export function main(lite$write?: (text: string) => void): string {\n    let lite$out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite$out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n    lite$emit((0n).toString() + "\\n");\n    return lite$out;\n}\n');
});
test('Lite-written TS and C compilers sequence multiple report statements deterministically', () => {
  const program = "io := import \"core/io\"; io.outputLine(10);\nio.outputLine(20);\nio.outputLine(-30);\n";
  const tsOutput = runCompiler(tsManifestPath, program);
  assert.equal(tsOutput.code, 0); assert.equal(tsOutput.errors, '');
  assert.equal(tsOutput.output, 'export function main(lite$write?: (text: string) => void): string {\n    let lite$out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite$out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n    lite$emit((10n).toString() + "\\n");\n    lite$emit((20n).toString() + "\\n");\n    lite$emit(((-30n)).toString() + "\\n");\n    return lite$out;\n}\n');
  const cOutput = runCompiler(cManifestPath, program);
  assert.equal(cOutput.code, 0); assert.equal(cOutput.errors, '');
  assert.equal(cOutput.output, '#include <stdio.h>\n#include <inttypes.h>\n#include <stdbool.h>\n#include <string.h>\nint main(void) {\n    int status = 0;\n' +
    '    if (printf("%" PRId64, (int64_t)(INT64_C(10))) < 0) { status = 1; }\n' +
    '    if (printf("\\n") < 0) { status = 1; }\n' +
    '    if (printf("%" PRId64, (int64_t)(INT64_C(20))) < 0) { status = 1; }\n' +
    '    if (printf("\\n") < 0) { status = 1; }\n' +
    '    if (printf("%" PRId64, (int64_t)((-INT64_C(30)))) < 0) { status = 1; }\n' +
    '    if (printf("\\n") < 0) { status = 1; }\n' +
    '    return status;\n}\n');
});
test('Lite-written TS and C compilers lower arithmetic expressions and immutable locals deterministically', () => {
  const program = "io := import \"core/io\"; x := 2 * (3 - 4);\nio.outputLine(x + 10);\nio.outputLine(-x);\n";
  assert.deepEqual(runCompiler(tsManifestPath, program), { code: 0, errors: '', output:
    'export function main(lite$write?: (text: string) => void): string {\n    let lite$out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite$out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n' +
    '    const lite_x = (2n * ((3n - 4n)));\n' +
    '    void lite_x;\n' +
    '    lite$emit(((lite_x + 10n)).toString() + "\\n");\n' +
    '    lite$emit(((-lite_x)).toString() + "\\n");\n' +
    '    return lite$out;\n}\n' });
  assert.deepEqual(runCompiler(cManifestPath, program), { code: 0, errors: '', output:
    '#include <stdio.h>\n#include <inttypes.h>\n#include <stdbool.h>\n#include <string.h>\nint main(void) {\n' +
    '    int status = 0;\n' +
    '    int64_t lite_x = (INT64_C(2) * ((INT64_C(3) - INT64_C(4))));\n' +
    '    (void)lite_x;\n' +
    '    if (printf("%" PRId64, (int64_t)((lite_x + INT64_C(10)))) < 0) { status = 1; }\n' +
    '    if (printf("\\n") < 0) { status = 1; }\n' +
    '    if (printf("%" PRId64, (int64_t)((-lite_x))) < 0) { status = 1; }\n' +
    '    if (printf("\\n") < 0) { status = 1; }\n' +
    '    return status;\n}\n' });
});
test('restricted compiler lowers dynamic Int division and remainder with checked semantics', () => {
  const source = [
    'io := import "core/io";',
    'var a := -7;',
    'var b := 2;',
    'var c := -2;',
    'io.outputLine(a / b, a % b, a :/ b, a :% b);',
    'io.outputLine(a / c, a % c, a :/ c, a :% c);',
    'io.outputLine(7 / c, 7 % c, 7 :/ c, 7 :% c);',
    'var m := -9223372036854775808;',
    'var n := -1;',
    'io.outputLine(m % n, m :% n);',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('-3 -1 -4 1\n3 -1 3 -1\n-3 1 -4 -1\n0 0\n'), stderr: Buffer.alloc(0),
  });
});

test('restricted compiler lowers dynamic Int division and remainder to runnable C', context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') {
    context.skip('LITE_SKIP_NATIVE=1'); return;
  }
  const cc = process.env['CC'] ?? 'cc';
  const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
    context.skip('C compiler unavailable; dynamic division C lowering requires cc or CC'); return;
  }
  const source = [
    'io := import "core/io";',
    'var a := -7;',
    'var b := 2;',
    'var c := -2;',
    'io.outputLine(a / b, a % b, a :/ b, a :% b);',
    'io.outputLine(a / c, a % c, a :/ c, a :% c);',
    'io.outputLine(7 / c, 7 % c, 7 :/ c, 7 :% c);',
    'var m := -9223372036854775808;',
    'var n := -1;',
    'io.outputLine(m :% n);',
  ].join('\n');
  const c = runCompiler(cManifestPath, source);
  assert.equal(c.code, 0, c.errors);
  assert.deepEqual(runCArtifact(c.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('-3 -1 -4 1\n3 -1 3 -1\n-3 1 -4 -1\n0\n'), stderr: Buffer.alloc(0),
  });
  for (const source of [
    "io := import \"core/io\"; var x := 1; var y := 0; io.outputLine(x / y);",
    "io := import \"core/io\"; var x := 1; var y := 0; io.outputLine(x % y);",
    "io := import \"core/io\"; var x := 1; var y := 0; io.outputLine(x :/ y);",
    "io := import \"core/io\"; var x := 1; var y := 0; io.outputLine(x :% y);",
    "io := import \"core/io\"; var x := -9223372036854775808; io.outputLine(x / -1);",
    "io := import \"core/io\"; var x := -9223372036854775808; io.outputLine(x :/ -1);",
  ]) {
    const compiled = runCompiler(cManifestPath, source);
    assert.equal(compiled.code, 0, compiled.errors);
    const actual = runCArtifact(compiled.output);
    const expected = expectedText(source);
    assert.equal(expected.status, 1, source);
    assert.equal(actual.phase, 'run');
    assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, source);
  }
});

test('restricted compiler lowers dynamic String concatenation with left-to-right TS evaluation', () => {
  const source = [
    'io := import "core/io";',
    'join := fn (a: String, b: String): String { return a + b; }',
    'var prefix := "lit";',
    'name := "er";',
    'pair := (left = "tu", right = "ple");',
    'values := ["li", "st"];',
    'io.outputLine(prefix + name);',
    'io.outputLine(join("fun", "ction"));',
    'io.outputLine(pair.left + pair.right);',
    'io.outputLine(values[0] + values[1]);',
    'io.outputLine("" + prefix + "" + name);',
    'io.outputLine("snow🙂" + "man");',
    'io.outputLine("line\\n" + "break");',
    'io.outputLine("tab\\t" + "stop");',
    'io.outputLine("quote\\\"" + "back\\\\slash");',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.equal(ts.output.includes('lite_concat'), false);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('liter\nfunction\ntuple\nlist\nliter\n' +
      'snow🙂man\nline\nbreak\ntab\tstop\nquote"back\\slash\n'),
    stderr: Buffer.alloc(0),
  });
  const order = runCompiler(tsManifestPath, "text := import \"core/text\"; io := import \"core/io\"; io.outputLine(text.at(\"a\", 9) + text.slice(\"a\", 0, 9));");
  assert.equal(order.code, 0, order.errors);
  const orderRun = runTsArtifact(order.output);
  assert.equal(orderRun.phase, 'run');
  assert.notEqual(orderRun.status, 0);
  assert.match(orderRun.stderr.toString(), /BoundPanic: textAt index outside text/);
});

test('restricted compiler lowers dynamic String concatenation to runnable C', context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') {
    context.skip('LITE_SKIP_NATIVE=1'); return;
  }
  const cc = process.env['CC'] ?? 'cc';
  const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
    context.skip('C compiler unavailable; dynamic String concatenation C lowering requires cc or CC'); return;
  }
  const source = [
    'io := import "core/io";',
    'var prefix := "lit";',
    'name := "er";',
    'io.outputLine(prefix + name);',
    'io.outputLine(prefix + name + "!");',
    'io.outputLine("" + prefix + "");',
    'io.outputLine("snow🙂" + "man");',
    'io.outputLine("line\\n" + "break");',
    'io.outputLine("tab\\t" + "stop");',
    'io.outputLine("quote\\\"" + "back\\\\slash");',
  ].join('\n');
  const c = runCompiler(cManifestPath, source);
  assert.equal(c.code, 0, c.errors);
  assert.match(c.output, /#include <stdlib\.h>/);
  assert.match(c.output, /static const char \*lite_concat\(const char \*left, const char \*right\)/);
  assert.deepEqual(runCArtifact(c.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('liter\nliter!\nlit\nsnow🙂man\nline\nbreak\ntab\tstop\nquote"back\\slash\n'),
    stderr: Buffer.alloc(0),
  });
  const plain = runCompiler(cManifestPath, "io := import \"core/io\"; s := \"a\";\nio.outputLine(s);\n");
  assert.equal(plain.code, 0, plain.errors);
  assert.equal(plain.output.includes('lite_concat'), false);
  assert.equal(plain.output.includes('#include <stdlib.h>'), false);
});

test('restricted compiler division faults preserve zero divisor and minimum/-1 status and stderr', () => {
  for (const source of [
    "io := import \"core/io\"; var x := 1; var y := 0; io.outputLine(x / y);",
    "io := import \"core/io\"; var x := 1; var y := 0; io.outputLine(x % y);",
    "io := import \"core/io\"; var x := 1; var y := 0; io.outputLine(x :/ y);",
    "io := import \"core/io\"; var x := 1; var y := 0; io.outputLine(x :% y);",
    "io := import \"core/io\"; var x := -9223372036854775808; io.outputLine(x / -1);",
    "io := import \"core/io\"; var x := -9223372036854775808; io.outputLine(x :/ -1);",
  ]) {
    const compiled = runCompiler(tsManifestPath, source);
    assert.equal(compiled.code, 0, compiled.errors);
    const actual = runTsArtifact(compiled.output);
    const expected = expectedText(source);
    assert.equal(expected.status, 1, source);
    assert.equal(actual.phase, 'run');
    assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, source);
  }
});
test('Lite-written TS and C compilers lower String values and multi-value reports deterministically', () => {
  const program = "io := import \"core/io\"; s := \"a\\\"b\";\nio.outputLine(s);\nio.outputLine(1, s, 2);\n";
  assert.deepEqual(runCompiler(tsManifestPath, program), { code: 0, errors: '', output:
    'export function main(lite$write?: (text: string) => void): string {\n    let lite$out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite$out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n' +
    '    const lite_s = "a\\"b";\n' +
    '    void lite_s;\n' +
    '    lite$emit(lite_s + "\\n");\n' +
    '    lite$emit((1n).toString() + " " + lite_s + " " + (2n).toString() + "\\n");\n' +
    '    return lite$out;\n}\n' });
  assert.deepEqual(runCompiler(cManifestPath, program), { code: 0, errors: '', output:
    '#include <stdio.h>\n#include <inttypes.h>\n#include <stdbool.h>\n#include <string.h>\nint main(void) {\n' +
    '    int status = 0;\n' +
    '    const char *lite_s = "a\\"b";\n' +
    '    (void)lite_s;\n' +
    '    if (printf("%s", lite_s) < 0) { status = 1; }\n' +
    '    if (printf("\\n") < 0) { status = 1; }\n' +
    '    int64_t lt_output_0 = INT64_C(1);\n' +
    '    const char *lt_output_1 = lite_s;\n' +
    '    int64_t lt_output_2 = INT64_C(2);\n' +
    '    if (printf("%" PRId64, (int64_t)(lt_output_0)) < 0) { status = 1; }\n' +
    '    if (printf(" ") < 0) { status = 1; }\n' +
    '    if (printf("%s", lt_output_1) < 0) { status = 1; }\n' +
    '    if (printf(" ") < 0) { status = 1; }\n' +
    '    if (printf("%" PRId64, (int64_t)(lt_output_2)) < 0) { status = 1; }\n' +
    '    if (printf("\\n") < 0) { status = 1; }\n' +
    '    return status;\n}\n' });
});
test('compiler applications reject fixture sources with exact diagnostics, positions and docs before artifact output', () => {
  for (const [name, manifest] of [['ts', tsManifestPath], ['c', cManifestPath]] as const) {
    for (const fixture of rejectionFixtures) {
      assert.notEqual(fixture.exitCode, 0, fixture.name);
      assert.equal(fixture.stdout.length, 0, fixture.name);
      const result = runCompiler(manifest, fixture.source);
      assert.equal(result.code, fixture.exitCode, `${name}: ${fixture.name}`);
      assert.deepEqual(Buffer.from(result.output, 'utf8'), fixture.stdout, `${name}: ${fixture.name}`);
      assert.deepEqual(Buffer.from(result.errors, 'utf8'), fixture.stderr, `${name}: ${fixture.name}`);
    }
  }
  // Focused location checks: the reserved word starts at column 6, and a missing
  // expression on line 2 reports the offending semicolon rather than the file start.
  for (const manifest of [tsManifestPath, cManifestPath]) {
    assert.deepEqual(runCompiler(manifest, 'x := record { };'), {
      code: 2, output: '', errors: '1:6: unsupported feature "record": see docs/types-and-inference.md; ' +
        'the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only\n',
    });
    assert.deepEqual(runCompiler(manifest, 'x := 1;\ny := ;\n'), {
      code: 2, output: '', errors: '2:6: expected an Int, Float, String or Bool expression\n',
    });
  }
  assert.deepEqual(runCompiler(cManifestPath, 'x := loop { 1 };'), {
    code: 2, output: '', errors: '1:6: unsupported feature "loop": see docs/loops.md; ' +
      'the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only\n',
  });
});
test('restricted TS compiler emits a deterministic report sequence', () => {
  assert.equal(runCompiler(tsManifestPath, "io := import \"core/io\"; io.outputLine(42);\nio.outputLine(9);").output,
    'export function main(lite$write?: (text: string) => void): string {\n    let lite$out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite$out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n    lite$emit((42n).toString() + "\\n");\n    lite$emit((9n).toString() + "\\n");\n    return lite$out;\n}\n');
});
test('emitted TS and igniter outputs match byte for byte across the admitted compiler corpus', async () => {
  const root = new URL('../', import.meta.url).pathname;
  const directory = mkdtempSync(join(tmpdir(), 'lite-ts-output-'));
  const corePaths: string[] = [];
  try {
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    for (const [index, fixture] of programFixtures.entries()) {
      const sourcePath = join(directory, `input-${index}.lts`);
      const corePath = join(directory, `program-${index}.ts`);
      writeFileSync(sourcePath, fixture.source);
      const emitted = runCompiler(tsManifestPath, fixture.source);
      assert.equal(emitted.code, 0, fixture.name); assert.equal(emitted.errors, '', fixture.name);
      writeFileSync(corePath, emitted.output); corePaths.push(corePath);
      await assertImportedFixture(corePath, fixture);
    }
    const base: unknown = JSON.parse(readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8'));
    if (typeof base !== 'object' || base === null || !('compilerOptions' in base) ||
        typeof base.compilerOptions !== 'object' || base.compilerOptions === null) throw new Error('invalid checking config');
    const configPath = join(directory, 'tsconfig.json');
    writeFileSync(configPath, JSON.stringify({ compilerOptions: { ...base.compilerOptions,
      types: [], typeRoots: [], lib: ['ESNext'] }, files: corePaths }));
    const checked = spawnSync(process.execPath, [join(root, 'igniter/node_modules/typescript/bin/tsc'), '-p', configPath], {
      encoding: 'utf8', timeout: 30000,
    });
    assert.equal(checked.error, undefined); assert.equal(checked.status, 0, checked.stdout + checked.stderr);
    const jsDirectory = join(directory, 'javascript');
    writeFileSync(configPath, JSON.stringify({ compilerOptions: { ...base.compilerOptions,
      types: [], typeRoots: [], lib: ['ESNext'], noEmit: false, outDir: jsDirectory,
      module: 'ESNext', moduleResolution: 'Bundler', allowImportingTsExtensions: false }, files: corePaths }));
    const translated = spawnSync(process.execPath, [join(root, 'igniter/node_modules/typescript/bin/tsc'), '-p', configPath], {
      encoding: 'utf8', timeout: 30000,
    });
    assert.equal(translated.error, undefined); assert.equal(translated.status, 0, translated.stdout + translated.stderr);
    for (const [index, fixture] of programFixtures.entries()) {
      await assertImportedFixture(join(jsDirectory, `program-${index}.js`), fixture);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
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


test('restricted compiler corpus keeps 69 program and 25 rejection cases', () => {
  assert.equal(programFixtures.length, 69);
  assert.equal(rejectionFixtures.length, 25);
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
