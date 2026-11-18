import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, lstatSync, readlinkSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { generatedTestFiles } from '../../igniter/test-suites.ts';
import { buildCompiler, buildTsCompiler, compileTarget, compileTs, type CompilerTarget } from '../host.ts';
import { seed } from '../bootstrap/seed.ts';
import { expectedText } from './contracts.ts';
import { prepareTsArtifacts, checkTsArtifact, runTsArtifact, runCArtifact, withTsArtifact, withTsArtifacts, type ArtifactOptions, type ArtifactRun } from '../../igniter/artifacts.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };

/** One generated program with its exact isolated execution contract. */
type ArtifactExecution = Readonly<{
  target: CompilerTarget; artifact: string; expected: Pick<ArtifactRun, 'status' | 'stdout' | 'stderr'>;
  options?: ArtifactOptions; context: string;
}>;

/** Checks all TS modules before execution, then retains per-program input, process state, status and stream assertions on both targets. */
function assertExecutions(executions: readonly ArtifactExecution[]): void {
  const ts = executions.filter(item => item.target === 'ts');
  withTsArtifacts(ts.map(item => item.artifact), runs => {
    let index = 0;
    for (const item of executions) {
      const actual = item.target === 'ts' ? runs[index++]!(item.options) : runCArtifact(item.artifact, item.options);
      assert.equal(actual.phase, 'run', item.context + actual.stdout.toString() + actual.stderr.toString());
      assert.equal(actual.signal, null, item.context);
      assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, item.expected, item.context);
    }
    assert.equal(index, runs.length);
  });
}

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

test('standalone generated compiler CLI performs strict-UTF-8 source reads directly via core/file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-source-provider-'));
  try {
    const compilerArtifact = buildTsCompiler().path;
    const importer = join(directory, 'app.lts');
    const dependency = join(directory, 'dep.lts');
    writeFileSync(dependency, 'pub answer := 42;\n');
    writeFileSync(importer, 'dep := import "./dep.lts"; io := import "core/io"; io.outputLine(dep.answer);\n');
    const outFile = join(directory, 'out.ts');
    const traceFile = join(directory, 'trace.json');
    const compiled = spawnSync(process.execPath, [compilerArtifact, '--out', outFile, '--trace-json', traceFile, importer], {
      cwd: directory, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(compiled.status, 0, compiled.stderr);
    assert.equal(compiled.signal, null);
    assert.equal(compiled.stderr, '');
    assert.equal(compiled.stdout, '');
    const trace = JSON.parse(readFileSync(traceFile, 'utf8')) as { files: { path: string; sha256: string }[]; edges: { importer: string; spec: string; path: string }[] };
    assert.ok(trace.files.some(f => f.path === realpathSync(dependency)));
    assert.ok(trace.edges.some(e => e.spec === './dep.lts' && e.path === realpathSync(dependency)));
    assert.equal(runTsArtifact(readFileSync(outFile, 'utf8')).stdout.toString(), '42\n');

    writeFileSync(dependency, Buffer.from([0xff]));
    const invalidUtf8 = spawnSync(process.execPath, [compilerArtifact, importer], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    assert.equal(invalidUtf8.status, 2);
    assert.equal(invalidUtf8.signal, null);
    assert.match(invalidUtf8.stderr, /imported source \.\/dep\.lts is not valid UTF-8/);

    writeFileSync(importer, 'dep := import "";\n');
    const rejected = spawnSync(process.execPath, [compilerArtifact, importer], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    assert.equal(rejected.status, 2);
    assert.equal(rejected.signal, null);
    assert.match(rejected.stderr, /import path must be nonempty and use "\/" separators/);

    writeFileSync(importer, 'dep := import "./missing.lts";\n');
    const missing = spawnSync(process.execPath, [compilerArtifact, importer], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    assert.equal(missing.status, 2);
    assert.equal(missing.signal, null);
    assert.equal(missing.stdout, '');
    assert.match(missing.stderr, /cannot read imported source \.\/missing\.lts \(ENOENT\)/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Lite import paths resolve relative, absolute and through the library root', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-paths-'));
  try {
    const nested = join(directory, 'nested');
    mkdirSync(nested);
    const rootSource = join(directory, 'app.lts');
    const base = join(directory, 'base.lts');
    const nestedSource = join(nested, 'math.lts');
    writeFileSync(base, 'pub twice := fn(value: Int): Int { value * 2 };\n');
    writeFileSync(nestedSource, 'base := import "../base"; pub answer := fn(): Int { base.twice(21) };\n');
    const compiled = compileTs({
      text: 'math := import "./nested/math"; io := import "core/io"; io.outputLine(math.answer());',
      name: rootSource,
      cwd: directory,
    });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const absolute = compileTs({
      text: `math := import ${JSON.stringify(base.slice(0, -4))}; io := import "core/io.lts"; io.outputLine(math.twice(10));`,
      name: rootSource,
      cwd: directory,
    });
    assert.equal(absolute.status, 0, absolute.stderr.toString());
    withTsArtifact(absolute.stdout.toString(), run => {
      assert.equal(run().stdout.toString(), '20\n');
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Lite import path resolution is independent of the caller working directory', () => {
  const elsewhere = mkdtempSync(join(tmpdir(), 'lite-import-cwd-'));
  const outsideCwd = mkdtempSync(join(tmpdir(), 'lite-outside-cwd-'));
  try {
    mkdirSync(join(elsewhere, 'nested'), { recursive: true });
    writeFileSync(join(elsewhere, 'base.lts'), 'pub twice := fn(v: Int): Int { v * 2 };\n');
    writeFileSync(join(elsewhere, 'nested', 'math.lts'), 'base := import "../base"; text := import "core/text.lts"; pub answer := fn(): Int { base.twice(text.length("hi")) };\n');
    const mainFile = join(elsewhere, 'nested', 'main.lts');
    writeFileSync(mainFile, 'math := import "./math"; io := import "core/io"; io.outputLine(math.answer());\n');
    const compiled = spawnSync(process.execPath, [buildTsCompiler().path, mainFile], {
      cwd: outsideCwd, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(compiled.status, 0, compiled.stderr);
    assert.equal(runTsArtifact(compiled.stdout).stdout.toString(), '4\n');
  } finally {
    rmSync(elsewhere, { recursive: true, force: true });
    rmSync(outsideCwd, { recursive: true, force: true });
  }
});

test('host operations and source reads are not available as unqualified globals', () => {
  for (const source of [
    'outputLine(1);', 'output("x");', 'reportError("x");', 'inputArgs();', 'inputAll();',
    'inputLine();', 'inputInt();', 'inputFloat();', 'exit(0);', 'textLength("x");',
    'textAt("x", 0);', 'textSlice("x", 0, 1);', 'readSource("main.lts", "./dep");',
    'values: mut List<Int> = []; pushBack(mut values, 1);', 'values: mut List<Int> = []; popBack(mut values);',
  ]) {
    const result = compileTs({ text: source });
    assert.equal(result.status, 2, source);
    assert.match(result.stderr.toString(), /unknown value/);
    assert.equal(result.stdout.length, 0, source);
  }
  const unaliasedHostImport = compileTs({ text: 'import "core/io"; inputArgs();' });
  assert.equal(unaliasedHostImport.status, 2);
  assert.match(unaliasedHostImport.stderr.toString(), /import requires a module alias/);
  assert.equal(unaliasedHostImport.stdout.length, 0);
});

test('core list mutations use an import alias and retain element and mutability checks', () => {
  const listSource = readFileSync(join(root, 'lib/core/list.lts'), 'utf8');
  assert.match(listSource, /pub pushBack := fn<T>\(values: mut List<T>, value: T\): Unit;/);
  assert.match(listSource, /pub popBack := fn<T>\(values: mut List<T>\): T;/);
  assert.doesNotMatch(listSource, /pub (?:pushBack|popBack) := fn\(\.\.\./);
  const source = 'list := import "core/list"; io := import "core/io"; values: mut List<Int> = [1]; list.pushBack(mut values, 2); io.outputLine(list.popBack(mut values), values);';
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  withTsArtifact(compiled.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.stdout.toString(), '2 [1]\n');
  });
  const c = compileTarget('c', { text: source });
  assert.equal(c.status, 2);
  assert.match(c.stderr.toString(), /C backend does not support list values yet/);
  assert.equal(c.stdout.length, 0);
  for (const invalid of [
    'list := import "core/list"; values: mut List<Int> = []; list.pushBack(mut values, "x");',
    'list := import "core/list"; values: List<Int> = []; list.pushBack(mut values, 1);',
    'list := import "core/list"; values: List<Int> = []; list.popBack(mut values);',
    'values: mut List<Int> = []; pushBack(mut values, 1);',
  ]) {
    const compiled = compileTs({ text: invalid });
    assert.equal(compiled.status, 2, invalid);
    assert.equal(compiled.stdout.length, 0, invalid);
  }
});

test('pub marks a top-level declaration without changing current visibility behavior', () => {
  const compiled = compileTs({ text: 'io := import "core/io"; pub twice := fn(x: Int): Int { x * 2 }; io.outputLine(twice(4));' });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  assert.equal(compiled.stderr.length, 0);
  withTsArtifact(compiled.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.signal, null);
    assert.equal(actual.stdout.toString(), '8\n');
  });

  const lexerPath = join(root, 'compiler/tests/lexer/lexer-dump.lts');
  const lexer = compileTs({ text: readFileSync(lexerPath, 'utf8'), name: realpathSync(lexerPath) });
  assert.equal(lexer.status, 0, lexer.stderr.toString());
  withTsArtifact(lexer.stdout.toString(), run => {
    const actual = run({ stdin: 'pub twice := fn() { 2 }' });
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.match(actual.stdout.toString(), /^Keyword@1:1:0 pub\n/);
  });

  const nested = compileTs({ text: 'if true { pub hidden := fn() { 1 }; }' });
  assert.equal(nested.status, 2);
  assert.match(nested.stderr.toString(), /pub is only allowed on top-level declarations/);
});

test('imports require a namespace alias and are recognized only at top level', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-alias-required-'));
  try {
    const rootSource = join(directory, 'app.lts');
    writeFileSync(join(directory, 'math.lts'), 'pub twice := fn(value: Int): Int { value * 2 };\n');
    const compiled = compileTs({
      text: 'math := import "./math"; io := import "core/io"; io.outputLine(math.twice(21));',
      name: rootSource,
      cwd: directory,
    });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    assert.equal(compiled.stderr.length, 0);
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.signal, null);
      assert.equal(actual.stdout.toString(), '42\n');
    });
  } finally { rmSync(directory, { recursive: true, force: true }); }

  for (const [source, diagnostic] of [
    ['if true { import "./math.lts"; }', 'import is only allowed at top level'],
    ['import "./math.lts";', 'import requires a module alias'],
    ['math := import "../math.lts" io.outputLine(1);', 'expected ; after import'],
    ['math := import "";', 'import path must be nonempty and use "/" separators'],
    ['math := import "math\\\\math.lts";', 'import path must be nonempty and use "/" separators'],
  ] as const) {
    const rejected = compileTs({ text: source });
    assert.equal(rejected.status, 2, source);
    assert.ok(rejected.stderr.toString().includes(diagnostic), source + '\n' + rejected.stderr.toString());
    assert.equal(rejected.stdout.length, 0, source);
  }
  const unnamedMissing = compileTs({ text: 'missing := import "./not-there.lts";' });
  assert.equal(unnamedMissing.status, 2);
  assert.equal(unnamedMissing.stdout.length, 0);
  assert.match(unnamedMissing.stderr.toString(), /^cannot read imported source \.\/not-there\.lts \(ENOENT\)\n$/);
  assert.doesNotMatch(unnamedMissing.stderr.toString(), /__lite_stdin__|\/Users\//);
});

test('the Lite TypeScript driver visits imported source units once across cycles', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-graph-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const childSource = join(directory, 'math.lts');
    writeFileSync(rootSource, 'io := import "core/io"; math := import "./math.lts"; io.outputLine(math.twice(21));\n');
    writeFileSync(childSource, 'app := import "./app.lts"; pub twice := fn(x: Int): Int { x * 2 };\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    writeFileSync(childSource, 'io := import "core/io"; io.outputLine(1 +);\n');
    const rejected = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(rejected.status, 2);
    assert.match(rejected.stderr.toString(), /math\.lts:1:/);
    assert.equal(rejected.stdout.length, 0);

    writeFileSync(rootSource, 'io := import "core/io"; missing := import "./missing.lts"; io.outputLine(42);\n');
    const missing = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(missing.status, 2);
    assert.match(missing.stderr.toString(), /cannot read imported source \.\/missing\.lts/);
    assert.equal(missing.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('namespace imports expose only public functions and emit their module bodies', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-pub-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const mathSource = join(directory, 'math.lts');
    writeFileSync(rootSource, 'io := import "core/io"; math := import "./math.lts"; io.outputLine(math.twice(21));\n');
    writeFileSync(mathSource, 'privateDouble := fn(x: Int): Int { x * 2 }; pub twice := fn(x: Int): Int { privateDouble(x) };\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const privateName = compileTs({ text: 'io := import "core/io"; math := import "./math.lts"; io.outputLine(math.privateDouble(21));', name: realpathSync(rootSource) });
    assert.equal(privateName.status, 2);
    assert.match(privateName.stderr.toString(), /unknown module member math\.privateDouble/);
    assert.equal(privateName.stdout.length, 0);

    const wrongArgument = compileTs({ text: 'io := import "core/io"; math := import "./math.lts"; io.outputLine(math.twice("21"));', name: realpathSync(rootSource) });
    assert.equal(wrongArgument.status, 2);
    assert.match(wrongArgument.stderr.toString(), /argument 1 of math\.twice must be Int, got String/);
    assert.equal(wrongArgument.stdout.length, 0);

    writeFileSync(rootSource, 'io := import "core/io"; math1 := import "./math.lts"; math2 := import "./math.lts"; io.outputLine(math1.twice(21), math2.twice(21));\n');
    const repeated = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(repeated.status, 0, repeated.stderr.toString());
    withTsArtifact(repeated.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42 42\n');
    });

    const otherSource = join(directory, 'other.lts');
    writeFileSync(otherSource, 'pub twice := fn(x: Int): Int { x + x };\n');
    writeFileSync(rootSource, 'io := import "core/io"; math := import "./math.lts"; other := import "./other.lts"; io.outputLine(math.twice(21), other.twice(21));\n');
    const duplicate = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(duplicate.status, 0, duplicate.stderr.toString());
    withTsArtifact(duplicate.stdout.toString(), run => assert.equal(run().stdout.toString(), '42 42\n'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('separate imported modules retain distinct private function and value identities', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-identities-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const firstSource = join(directory, 'first.lts');
    const secondSource = join(directory, 'second.lts');
    writeFileSync(rootSource, 'io := import "core/io"; first := import "./first.lts"; second := import "./second.lts"; io.outputLine(first.twice(20), second.plusFive(20));\n');
    writeFileSync(firstSource, 'scale := 2; helper := fn(x: Int): Int { x * scale }; pub twice := fn(x: Int): Int { helper(x) };\n');
    writeFileSync(secondSource, 'scale := 1; helper := fn(x: Int): Int { x + 5 * scale }; pub plusFive := fn(x: Int): Int { helper(x) };\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '40 25\n');
    });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('nested imports resolve exported functions without re-exporting dependencies', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-nested-'));
  try {
    const rootSource = join(directory, 'app.lts');
    writeFileSync(rootSource, 'io := import "core/io"; facade := import "./facade.lts"; io.outputLine(facade.timesSix(7));\n');
    writeFileSync(join(directory, 'facade.lts'), 'base := import "./base.lts"; pub timesSix := fn(x: Int): Int { base.triple(x) * 2 };\n');
    writeFileSync(join(directory, 'base.lts'), 'pub triple := fn(x: Int): Int { x * 3 };\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const transitiveName = compileTs({ text: 'io := import "core/io"; facade := import "./facade.lts"; io.outputLine(facade.triple(7));', name: realpathSync(rootSource) });
    assert.equal(transitiveName.status, 2);
    assert.match(transitiveName.stderr.toString(), /unknown module member facade\.triple/);
    assert.equal(transitiveName.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('namespace imports resolve public functions and immutable values through aliases', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-alias-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const mathSource = join(directory, 'math.lts');
    writeFileSync(mathSource, 'hidden := 9; pub factor := 2; pub twice := fn(x: Int): Int { x * factor }\n');
    writeFileSync(rootSource, 'io := import "core/io"; math := import "./math.lts"; io.outputLine(math.twice(21), math.factor);\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42 2\n');
    });

    const statementCall = compileTs({ text: 'io := import "core/io"; math := import "./math.lts"; math.twice(10); io.outputLine(1);', name: realpathSync(rootSource) });
    assert.equal(statementCall.status, 0, statementCall.stderr.toString());
    withTsArtifact(statementCall.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '1\n');
    });

    const hidden = compileTs({ text: 'io := import "core/io"; math := import "./math.lts"; io.outputLine(math.hidden);', name: realpathSync(rootSource) });
    assert.equal(hidden.status, 2);
    assert.match(hidden.stderr.toString(), /unknown module member math\.hidden/);
    assert.equal(hidden.stdout.length, 0);

    const wrongArgument = compileTs({ text: 'io := import "core/io"; math := import "./math.lts"; io.outputLine(math.twice("21"));', name: realpathSync(rootSource) });
    assert.equal(wrongArgument.status, 2);
    assert.match(wrongArgument.stderr.toString(), /argument 1 of math\.twice must be Int, got String/);
    assert.equal(wrongArgument.stdout.length, 0);

    const immutableMember = compileTs({ text: 'math := import "./math.lts"; math.factor = 5;', name: realpathSync(rootSource) });
    assert.equal(immutableMember.status, 2);
    assert.match(immutableMember.stderr.toString(), /module members are immutable/);
    assert.equal(immutableMember.stdout.length, 0);

    writeFileSync(rootSource, 'io := import "core/io"; left := import "./math.lts"; right := import "./math.lts"; io.outputLine(left.twice(10), right.twice(11));\n');
    const repeatedAliases = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(repeatedAliases.status, 0, repeatedAliases.stderr.toString());
    assert.equal((repeatedAliases.stdout.toString().match(/function liteFn\$math\$twice\(/g) ?? []).length, 1);
    withTsArtifact(repeatedAliases.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '20 22\n');
    });

    const duplicateAlias = compileTs({ text: 'math := import "./math.lts"; math := import "./math.lts";', name: realpathSync(rootSource) });
    assert.equal(duplicateAlias.status, 2);
    assert.match(duplicateAlias.stderr.toString(), /duplicate module alias math/);
    assert.equal(duplicateAlias.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('namespace imports work in imported modules and preserve direct-only visibility', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-alias-nested-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const facadeSource = join(directory, 'facade.lts');
    writeFileSync(rootSource, 'io := import "core/io"; facade := import "./facade.lts"; io.outputLine(facade.timesSix(7));\n');
    writeFileSync(facadeSource, 'math := import "./math.lts"; pub timesSix := fn(x: Int): Int { math.twice(x) * 3 };\n');
    writeFileSync(join(directory, 'math.lts'), 'pub twice := fn(x: Int): Int { x * 2 };\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const notReexported = compileTs({ text: 'io := import "core/io"; facade := import "./facade.lts"; io.outputLine(facade.twice(3));', name: realpathSync(rootSource) });
    assert.equal(notReexported.status, 2);
    assert.match(notReexported.stderr.toString(), /unknown module member facade\.twice/);
    assert.equal(notReexported.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('namespace imports expose public types for qualified annotations and signatures', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-public-types-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const typesSource = join(directory, 'types.lts');
    writeFileSync(typesSource, [
      'InternalCount := type Int;',
      'pub Count := type InternalCount;',
      'pub Point := type (x: Int, y: Int);',
      'pub shift := fn(point: Point, dx: Int): Point { (x = point.x + dx, y = point.y) }',
    ].join('\n') + '\n');
    writeFileSync(rootSource, [
      'io := import "core/io"; types := import "./types.lts";',
      'point: types.Point = (x = 40, y = 2);',
      'shifted: types.Point = types.shift(point, 2);',
      'count: types.Count = 42;',
      'io.outputLine(shifted.x, count);',
    ].join('\n'));
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42 42\n');
    });

    const hiddenType = compileTs({ text: 'types := import "./types.lts"; hidden: types.InternalCount = 1;', name: realpathSync(rootSource) });
    assert.equal(hiddenType.status, 2);
    assert.match(hiddenType.stderr.toString(), /unknown type alias types\.InternalCount/);
    assert.equal(hiddenType.stdout.length, 0);

    const malformedValue = compileTs({ text: 'types := import "./types.lts"; point: types.Point = (x = 1, y = "two");', name: realpathSync(rootSource) });
    assert.equal(malformedValue.status, 2);
    assert.equal(malformedValue.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('core integer operations are available through a module alias', () => {
  const sourceName = resolve(root, 'compiler/tests/fixtures/core-int-alias.lts');
  const compiled = compileTs({
    text: [
      'io := import "core/io"; integer := import "core/int";',
      'sum := integer.intAdd(40, 2);',
      'io.outputLine(integer.intText(sum.value), sum.ok);',
    ].join('\n'),
    name: sourceName,
  });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  withTsArtifact(compiled.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.stdout.toString(), '42 true\n');
  });
});

test('imported output aliases preserve the heterogeneous host-output contract', () => {
  const fixtureName = resolve(root, 'compiler/tests/fixtures/core-host-io.lts');
  const compiled = compileTs({
    text: [
      'io := import "core/io";',
      'outputLine := fn(text: String): Int { 99 };',
      'local := outputLine("ordinary function");',
      'effect := fn(value: String): String { io.outputLine("arg", value); value };',
      'invoke := fn(): Int {',
      '    io.output(); io.output(); io.outputLine();',
      '    io.output("legacy", 1, true);',
      '    io.output("qualified", effect("a"), 7, true);',
      '    io.outputLine(effect("b"), false);',
      '    io.outputLine([1, 2], (left = "tuple", right = 3));',
      '    io.errorLine("host error");',
      '    42',
      '};',
      'io.outputLine(local);',
      'io.outputLine(invoke());',
    ].join('\n'),
    name: fixtureName,
  });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  withTsArtifact(compiled.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.stdout.toString(), '99\n\nlegacy 1 truearg a\nqualified a 7 truearg b\nb false\n[1, 2] (left=tuple, right=3)\n42\n');
    assert.equal(actual.stderr.toString(), 'host error\n');
  });
});

test('core host identities reject forged declarations and retain target boundaries', () => {
  const fixtureName = resolve(root, 'compiler/tests/fixtures/core-host-io.lts');
  const directory = mkdtempSync(join(tmpdir(), 'lite-core-host-unbound-'));
  try {
    const unboundSource = join(directory, 'io.lts');
    const unboundApp = join(directory, 'app.lts');
    writeFileSync(unboundSource, 'pub output := fn(...values): Unit;\n');
    writeFileSync(unboundApp, 'io := import "./io.lts"; io.output(1, "x");\n');
    const unbound = compileTs({ text: readFileSync(unboundApp, 'utf8'), name: realpathSync(unboundApp) });
    assert.equal(unbound.status, 2);
    assert.match(unbound.stderr.toString(), /bodyless function declaration has no matching core host binding/);
    assert.equal(unbound.stdout.length, 0);

    const mismatchedAbi = compileTs({ text: 'pub output := fn(...values): String;', name: 'lib/core/io.lts' });
    assert.equal(mismatchedAbi.status, 2);
    assert.match(mismatchedAbi.stderr.toString(), /bodyless function declaration has no matching core host binding/);
    assert.equal(mismatchedAbi.stdout.length, 0);

    const ordinaryVariadicFunction = compileTs({ text: 'values := fn(...values): Unit { };', name: fixtureName });
    assert.equal(ordinaryVariadicFunction.status, 2);
    assert.match(ordinaryVariadicFunction.stderr.toString(), /variadic parameters are reserved for registered core host declarations/);
    assert.equal(ordinaryVariadicFunction.stdout.length, 0);

    const outputAsValue = compileTs({
      text: 'io := import "core/io"; value := io.output(1);',
      name: fixtureName,
    });
    assert.equal(outputAsValue.status, 2);
    assert.match(outputAsValue.stderr.toString(), /host output functions are standalone statements/);
    assert.equal(outputAsValue.stdout.length, 0);

    const wrongErrorType = compileTs({
      text: 'io := import "core/io"; io.errorLine(1);',
      name: fixtureName,
    });
    assert.equal(wrongErrorType.status, 2);
    assert.match(wrongErrorType.stderr.toString(), /argument 1 of io\.errorLine must be String, got Int/);
    assert.equal(wrongErrorType.stdout.length, 0);

    const unavailableError = compileTarget('c', {
      text: 'io := import "core/io"; io.errorLine("x");',
      name: fixtureName,
    });
    assert.equal(unavailableError.status, 2);
    assert.match(unavailableError.stderr.toString(), /C backend does not support reportError or exit yet/);
    assert.equal(unavailableError.stdout.length, 0);

    const unavailableAggregate = compileTarget('c', {
      text: 'io := import "core/io"; io.outputLine([1, 2]);',
      name: fixtureName,
    });
    assert.equal(unavailableAggregate.status, 2);
    assert.match(unavailableAggregate.stderr.toString(), /C backend does not support/);
    assert.equal(unavailableAggregate.stdout.length, 0);

    const supportedC = compileTarget('c', {
      text: 'io := import "core/io"; io.outputLine(1, "x", true);',
      name: fixtureName,
    });
    assert.equal(supportedC.status, 0, supportedC.stderr.toString());
    assert.match(supportedC.stdout.toString(), /1/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('qualified output preserves evaluation order and delays its write until all values evaluate', () => {
  const fixtureName = resolve(root, 'compiler/tests/fixtures/core-host-io.lts');
  const compiled = compileTs({
    text: [
      'io := import "core/io";',
      'effect := fn(): String { io.outputLine("argument evaluated"); "value" };',
      'fail := fn(value: Int): Int { value / (value - value) };',
      'io.outputLine(effect(), 9, fail(5));',
    ].join('\n'),
    name: fixtureName,
  });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  withTsArtifact(compiled.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 1);
    assert.equal(actual.stdout.toString(), 'argument evaluated\n');
    assert.match(actual.stderr.toString(), /ArithmeticPanic: division by zero/);
    assert.doesNotMatch(actual.stdout.toString(), /value 9/);
  });
});

test('namespace imports expose immutable public values but keep private values local', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-values-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const mathSource = join(directory, 'math.lts');
    writeFileSync(rootSource, 'io := import "core/io"; math := import "./math.lts"; io.outputLine(math.answer);\n');
    writeFileSync(mathSource, 'privateBase := 21; pub answer := privateBase * 2;\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const privateName = compileTs({ text: 'io := import "core/io"; math := import "./math.lts"; io.outputLine(math.privateBase);', name: realpathSync(rootSource) });
    assert.equal(privateName.status, 2);
    assert.match(privateName.stderr.toString(), /unknown module member math\.privateBase/);
    assert.equal(privateName.stdout.length, 0);

    const reassignment = compileTs({ text: 'math := import "./math.lts"; math.answer = 43;', name: realpathSync(rootSource) });
    assert.equal(reassignment.status, 2);
    assert.match(reassignment.stderr.toString(), /module members are immutable/);
    assert.equal(reassignment.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
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
    writeFileSync(path, 'io := import "core/io"; io.outputLine("before"); match 1 { _ => 2 }');
    const unsupported = spawnSync(join(directory, 'bin/lite'), ['check', path], { env, timeout: 30000 });
    assert.equal(unsupported.status, 1); assert.equal(unsupported.stdout.length, 0);
    assert.match(unsupported.stderr.toString(), /unsupported feature "match"/);
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
    writeFileSync(join(directory, 'language/verifications/features/numeric/integers/signed-arithmetic.lts'), 'x := record { };\n', 'utf8');
    const before = readFileSync(manifest);
    const failed = invoke('--filter', 'features/numeric/integers/signed-arithmetic.json', '--update');
    assert.equal(failed.status, 1); assert.match(failed.stdout, /unsupported feature "record"/);
    assert.deepEqual(readFileSync(manifest), before, 'unsupported source must not rewrite expectations');
    const legacy = invoke('--reference', '--filter', 'feature.numeric.integers.signed-arithmetic');
    assert.equal(legacy.status, 2); assert.match(legacy.stderr, /unknown argument --reference/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('generated reports evaluate arguments once in order and preserve nested output', () => {
  const cases = [
    { source: 'io := import "core/io"; f := fn(): Int { io.outputLine("inner"); 7 } io.outputLine("before"); io.outputLine(f()); io.outputLine("after");',
      stdout: 'before\ninner\n7\nafter\n', status: 0 },
    { source: 'io := import "core/io"; echo := fn(n: Int): Int { io.outputLine("arg", n); n } io.outputLine(echo(1), echo(2), echo(3));',
      stdout: 'arg 1\narg 2\narg 3\n1 2 3\n', status: 0 },
    { source: 'io := import "core/io"; f := fn(n: Int): Int { if n > 0 { io.outputLine(n, self(n - 1)); } n } io.outputLine(f(2));',
      stdout: '1 0\n2 1\n2\n', status: 0 },
    { source: 'io := import "core/io"; text := fn(): String { io.outputLine("text"); "🙂" } flag := fn(): Bool { io.outputLine("flag"); true } ' +
        'loop [1, 2] as n { io.outputLine(n, text(), flag()); }',
      stdout: 'text\nflag\n1 🙂 true\ntext\nflag\n2 🙂 true\n', status: 0 },
    { source: 'io := import "core/io"; f := fn(): Int { io.outputLine("inner"); 7 } io.outputLine(f()); io.exit(3);',
      stdout: 'inner\n7\n', status: 3 },
    { source: 'io := import "core/io"; stop := fn(): Int { io.outputLine("stopped"); io.exit(4); 9 } io.outputLine("before"); io.outputLine("outer", stop());',
      stdout: 'before\nstopped\n', status: 4 },
  ];
  for (const { source, stdout, status } of cases) {
    const expected = expectedText(source);
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

test('self-hosting kernel separates root symbols from runtime initialization and nested bindings', () => {
  const duplicate = compileTs({ text: 'io := import "core/io"; x := 1; x := 1; io.outputLine(x);', name: 'duplicate-root.lts' });
  assert.equal(duplicate.status, 2);
  assert.equal(duplicate.stdout.length, 0, 'rejected source must not produce an artifact');
  assert.match(duplicate.stderr.toString(), /duplicate-root\.lts:1:33: duplicate top-level value x/);

  const nested = compileTs({ text: 'io := import "core/io"; x := 1; if true { x := 2; io.outputLine(x); } io.outputLine(x);', name: 'nested-shadow.lts' });
  assert.equal(nested.status, 0, nested.stderr.toString());
  assert.deepEqual(runTsArtifact(nested.stdout.toString()).stdout, Buffer.from('2\n1\n'));

  const deferred = compileTs({
    text: 'io := import "core/io"; y := fn (): Int { x * 2 }; x := 1; io.outputLine(y());', name: 'deferred-root.lts',
  });
  assert.equal(deferred.status, 0, deferred.stderr.toString());
  assert.deepEqual(runTsArtifact(deferred.stdout.toString()).stdout, Buffer.from('2\n'));

  const parameterShadows = compileTs({
    text: 'io := import "core/io"; y := fn (x: Int): Int { x * 2 }; x := 1; io.outputLine(y(3));', name: 'parameter-shadows-root.lts',
  });
  assert.equal(parameterShadows.status, 0, parameterShadows.stderr.toString());
  assert.deepEqual(runTsArtifact(parameterShadows.stdout.toString()).stdout, Buffer.from('6\n'));

  const eager = compileTs({ text: 'io := import "core/io"; y := x * 2; x := 1; io.outputLine(y);', name: 'eager-root.lts' });
  assert.equal(eager.status, 2);
  assert.equal(eager.stdout.length, 0, 'invalid eager initialization must not produce an artifact');
  assert.match(eager.stderr.toString(), /eager-root\.lts:1:30: unknown value x/);
});

/** Copies only host glue, the seed and Lite sources; the T00 implementation is deliberately absent. */
function isolatedCheckout(): string {
  const directory = mkdtempSync(join(tmpdir(), 'lite-t11-checkout-'));
  const dependencies = (['ts', 'c'] as const).flatMap(target => buildCompiler(target).dependencies);
  const toolSources = readdirSync(join(root, 'tools/src')).filter(f => f.endsWith('.lts')).map(f => `tools/src/${f}`);
  const coreLibs = readdirSync(join(root, 'lib/core')).filter(f => f.endsWith('.lts')).map(f => `lib/core/${f}`);
  const utilLibs = readdirSync(join(root, 'lib/util')).filter(f => f.endsWith('.lts')).map(f => `lib/util/${f}`);
  const paths = new Set([
    'bin/lite', 'bin/lite-compile', 'bin/lite-compile-ts', 'bin/lite-compile-c', 'bin/lite-check', 'bin/lite-run', 'bin/lite-verify',
    'compiler/host.ts', 'compiler/package.json',
    'igniter/test-suites.ts', 'igniter/artifacts.ts', 'igniter/package.json',
    'tools/test.ts', 'tools/project.ts',
    'compiler/release-streams.ts', 'config/versions.json',
    'tools/streams.ts',
    'compiler/scripts/release-streams.test.ts',
    'compiler/bootstrap/igniter.ts', 'compiler/bootstrap/seed.ts', 'compiler/bootstrap/tsconfig.json',
    'compiler/manifests/ts.json', 'compiler/manifests/c.json', 'igniter/tsconfig.json',
    ...dependencies, ...toolSources, ...coreLibs, ...utilLibs,
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
    ? spawnSync(join(directory, 'bin/lite-compile-ts'), [path], { env, timeout: 30000 })
    : spawnSync(process.execPath, [
      '--input-type=module', '-e',
      "import { buildCompiler } from './compiler/host.ts'; import { writeSync } from 'node:fs'; import { pathToFileURL } from 'node:url'; const c = buildCompiler('c').path; const m = await import(pathToFileURL(c).href); process.argv = [process.execPath, c, process.argv[1]]; const out = m.main((t) => writeSync(1, t)); if (out === undefined) process.exitCode = 2; else if (typeof out !== 'string') process.exitCode = 1; else if (out.length > 0) writeSync(1, out);",
      path,
    ], { cwd: directory, env, timeout: 30000 });
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
      'import {buildTsCompiler} from "./compiler/host.ts"; process.stdout.write(JSON.stringify(buildTsCompiler()));'],
    { cwd: directory, env, encoding: 'utf8', timeout: 30000 });
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
      'import {buildTsCompiler} from "./compiler/host.ts"; const first = buildTsCompiler(); const t0 = performance.now(); const second = buildTsCompiler(); process.stdout.write(JSON.stringify({ first, second, secondMs: performance.now() - t0 }));'],
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
  assert.deepEqual(compileTarget('c', { text: 'io := import "core/io"; f := fn(): Int { 1 } io.outputLine(f());' }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from('C backend does not support top-level functions yet\n'),
  });
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    const built = spawnSync(process.execPath, ['--input-type=module', '-e',
      'import {buildCompiler} from "./compiler/host.ts"; process.stdout.write(JSON.stringify(buildCompiler("c")));'],
    { cwd: directory, env, encoding: 'utf8', timeout: 30000 });
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
    for (const path of ['compiler/host.ts', 'compiler/src/c-literals.lts', 'compiler/src/frontend.lts',
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

test('generated temporary I/O helpers preserve prompts, value display, input state and failures', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['io := import "core/io"; io.output(); io.outputLine(); io.output("a", 1); io.outputLine(true);', ''],
    ['io := import "core/io"; io.outputLine([1, 2], (left = 3, right = "x"), Unit, ());', ''],
    ['io := import "core/io"; inner := fn(): Unit { io.outputLine("inner"); } outer := fn(): Unit { inner() } io.outputLine(outer());', ''],
    ['io := import "core/io"; io.outputLine([(n = 1), (n = 2)]);', ''],
    ['io := import "core/io"; f := fn(n: Int): Int { io.outputLine("effect", n); n } io.output(f(1), f(2)); io.outputLine();', ''],
    ['io := import "core/io"; io.outputLine(io.inputInt("N: "), io.inputFloat("F: "));', '7 -2.5e2'],
    ['io := import "core/io"; value: Float = io.inputFloat(); io.outputLine(value);', '-0'],
    ['io := import "core/io"; io.outputLine(io.inputInt(), io.inputInt());', '-9223372036854775808 9223372036854775807'],
    ['io := import "core/io"; io.outputLine(io.inputLine("Line: ")); io.outputLine(io.inputAll("Rest: "));', 'hello\r\n🙂\n'],
    ['io := import "core/io"; io.outputLine(io.inputLine(), io.inputLine());', '\nlast'],
    ['io := import "core/io"; n := io.inputInt(); line := io.inputLine(); rest := io.inputAll(); io.outputLine(n, line, rest);', '7\nremaining'],
    ['io := import "core/io"; io.outputLine(io.inputAll("All: "));', ''],
    ['io := import "core/io"; io.outputLine(io.inputAll("All: "));', 'a'.repeat(4095) + '🙂tail'],
    ['io := import "core/io"; empty: List<Int> = []; io.outputLine(empty);', ''],
    ["list := import \"core/list\"; io := import \"core/io\"; values: mut List<Int> = []; io.outputLine(list.pushBack(mut values, 1), values);", ''],
    ['io := import "core/io"; zero: (value: Float); io.outputLine(zero, zero.value);', ''],
    ['io := import "core/io"; io.outputLine("before"); io.inputInt("N: ");', 'bad'],
    ['io := import "core/io"; io.inputInt("N: ");', '9223372036854775808'],
    ['io := import "core/io"; io.inputInt("N: ");', ''],
    ['io := import "core/io"; io.inputFloat("F: ");', 'NaN'],
    ['io := import "core/io"; io.inputFloat("F: ");', '1e999'],
    ['io := import "core/io"; io.inputFloat("F: ");', ''],
    ['io := import "core/io"; io.inputLine("L: ");', ''],
  ];
  for (const [source, stdin] of cases) {
    const expected = expectedText(source, { stdin });
    const compiled = compileTs({ text: source });
    assert.equal(compiled.status, 0, source + '\n' + compiled.stderr.toString());
    const actual = runTsArtifact(compiled.stdout.toString(), { stdin });
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
    assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, source);
  }
  const faultSource = 'io := import "core/io"; io.outputLine("before fault"); values: List<Int> = [1]; io.outputLine(values[2]);';
  const expectedFault = expectedText(faultSource);
  const compiledFault = compileTs({ text: faultSource });
  assert.equal(compiledFault.status, 0, compiledFault.stderr.toString());
  const actualFault = runTsArtifact(compiledFault.stdout.toString());
  assert.equal(actualFault.status, expectedFault.status);
  assert.deepEqual(actualFault.stdout, expectedFault.stdout);
  assert.match(actualFault.stderr.toString(), /BoundPanic/);

});

test('generated input rejects malformed UTF-8 at the first reached read', () => {
  let decodeError = '';
  try { new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from([0xff])); }
  catch (error) { decodeError = (error as Error).message; }
  assert.ok(decodeError);
  const source = 'io := import "core/io"; io.output("before:"); io.outputLine(io.inputInt("N: ")); io.inputAll("Rest: ");';
  const compiled = compileTs({ text: source, name: 'input.lts' });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  withTsArtifact(compiled.stdout.toString(), run => {
    for (const [stdin, stdout, column] of [
      [Buffer.from([0xff]), 'before:N: ', 61], [Buffer.from([0xf0, 0x9f]), 'before:N: ', 61],
      [Buffer.from([0x37, 0x20, 0xff]), 'before:N: 7\nRest: ', 82],
    ] as const) {
      const actual = run({ stdin });
      assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString()); assert.equal(actual.signal, null); assert.equal(actual.status, 1);
      assert.equal(actual.stdout.toString(), stdout);
      assert.equal(actual.stderr.toString(), `input.lts:1:${column}: InputFault: cannot read input: ${decodeError}\n`);
    }
  });
});

test('report is no longer a builtin and temporary I/O rejects invalid signatures before effects', () => {
  for (const source of ['report(1);', 'io := import "core/io"; io.inputLine(7);', 'io := import "core/io"; io.inputFloat(7);', 'io := import "core/io"; io.inputInt("a", "b");', 'io := import "core/io"; io.inputAll(1);',
    'io := import "core/io"; io.outputLine(prompt = "label", 1);', 'io := import "core/io"; io.output(fn(): Int { 1 });',
    'io := import "core/io"; inputInt := 3; io.outputLine(inputInt());', 'outputLine := 3; outputLine(1);']) {
    assert.notEqual(expectedText(source).status, 0, source);
    assert.notEqual(compileTs({ text: source }).status, 0, source);
  }
});

/** Boundary/sign combinations with every representable result retained for differential execution. */
function int64BoundaryProgram(division = false): string {
  const min = -(1n << 63n), max = (1n << 63n) - 1n;
  const values = [min, min + 1n, -3037000500n, -3037000499n, -2n, -1n, 0n, 1n, 2n, 3037000499n, 3037000500n, max - 1n, max];
  const lines: string[] = ['io := import "core/io";'];
  let index = 0;
  for (const left of values) for (const right of values) {
    const a = `a${index}`, b = `b${index}`;
    lines.push(`var ${a} := ${left}; var ${b} := ${right};`);
    for (const [operator, result] of [['+', left + right], ['-', left - right], ['*', left * right]] as const) {
      if (result >= min && result <= max) lines.push(`io.outputLine(${a} ${operator} ${b});`);
    }
    if (division && right !== 0n) {
      const quotient = left / right;
      if (quotient >= min && quotient <= max) lines.push(`io.outputLine(${a} / ${b}, ${a} :/ ${b});`);
      lines.push(`io.outputLine(${a} % ${b}, ${a} :% ${b});`);
    }
    index += 1;
  }
  for (const [i, value] of values.entries()) if (value !== min) lines.push(`var n${i} := ${value}; io.outputLine(-n${i});`);
  lines.push('var checked_add := 3; var lt_arg_left_0 := 4; io.outputLine(checked_add + lt_arg_left_0);');
  lines.push('var hi := 9223372036854775807; var lo := -9223372036854775808; var flag := false;');
  lines.push('io.outputLine(flag and (hi + 1 > 0)); if flag { io.outputLine(lo - 1); }');
  lines.push('io.outputLine(not flag or (hi * 2 > 0)); if flag { io.outputLine(-lo); }');
  return lines.join('\n');
}

const overflowingInt64Expressions = [
  'hi + 1', 'lo + -1', 'hi - -1', 'lo - 1', 'hi * 2', 'lo * 2', '-lo', 'lo * -1',
  '(hi + 1) - 1', '(hi + 1) + (lo - 1)', '(lo - 1) + (hi + 1)',
];

/** Produces runtime operands and output before a fault, with Unicode and CRLF position coverage. */
function int64FaultProgram(expression: string): string {
  return 'io := import "core/io"; /* 🙂 */ io.outputLine("before");\r\nvar hi := 9223372036854775807; var lo := -9223372036854775808;\r\nio.outputLine(' + expression + ');';
}

test('generated TS checks Int64 boundaries, exact faults and operand evaluation order', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const source = int64BoundaryProgram();
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  const expected = expectedText(source);
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);

  const name = 'arithmetic سلام🙂.lts';
  const branches = overflowingInt64Expressions.map((expression, index) =>
    `${index === 0 ? 'if' : 'else if'} selector == ${index} { io.outputLine(${expression}); }`).join('\n');
  const faultSource = 'io := import "core/io"; /* 🙂 */ io.outputLine("before");\r\nselector := io.inputInt();\r\n' +
    'var hi := 9223372036854775807; var lo := -9223372036854775808;\r\n' + branches;
  const faults = compileTs({ text: faultSource, name });
  assert.equal(faults.status, 0, faults.stderr.toString());
  withTsArtifact(faults.stdout.toString(), run => {
    for (const [index, expression] of overflowingInt64Expressions.entries()) {
      const reference = expectedText(faultSource, { stdin: String(index), name });
      assert.equal(reference.status, 1, expression);
      const result = run({ stdin: String(index) });
      assert.equal(result.phase, 'run'); assert.equal(result.signal, null);
      assert.deepEqual({ status: result.status, stdout: result.stdout, stderr: result.stderr }, reference, expression);
    }
  });
  const effects = 'io := import "core/io"; touch := fn(n: Int): Int { io.outputLine("arg", n); n } ' +
    'io.outputLine(touch(3) + touch(4), touch(9) - touch(2), touch(2) * touch(5), -touch(6));';
  const emitted = compileTs({ text: effects });
  assert.equal(emitted.status, 0, emitted.stderr.toString());
  const run = runTsArtifact(emitted.stdout.toString());
  const reference = expectedText(effects);
  assert.deepEqual({ status: run.status, stdout: run.stdout, stderr: run.stderr }, reference);
});

const divisionFaultExpressions = ['hi / zero', 'hi % zero', 'hi :/ zero', 'hi :% zero', 'lo / -1', 'lo :/ -1',
  '(hi / zero) + (lo % zero)', '(lo % zero) + (hi / zero)', '(hi + 1) / zero', 'lo / (hi + 1)'];

/** Keeps the same logical name, Unicode and CRLF positions on both runtime paths. */
function divisionFaultSource(expression: string): string {
  return 'io := import "core/io"; /* 🙂 */ io.outputLine("before");\r\nvar hi := 9223372036854775807; var lo := -9223372036854775808; var zero := 0;\r\nio.outputLine(' + expression + ');';
}

test('generated text/list bounds faults preserve exact positions, output and operand effects', () => {
  const bodies = [
    'io.outputLine(text.at("🙂x", -1));', 'io.outputLine(text.at("🙂x", 2));', 'io.outputLine(text.at("", 0));',
    'io.outputLine(text.slice("🙂ab", -1, 1));', 'io.outputLine(text.slice("🙂ab", 2, 1));',
    'io.outputLine(text.slice("🙂ab", 0, 4));',
    'values: List<Int> = [7]; io.outputLine(values[-1]);',
    'values: List<Int> = [7]; io.outputLine(values[/* سلام */ 1]);',
    'values: List<Int> = [7]; io.outputLine(values[9223372036854775807]);',
    "values: mut List<Int> = []; io.outputLine(list.popBack(mut values));",
    "values: mut List<Int> = [7]; io.outputLine(list.popBack(mut values)); list.popBack(mut values);",
    'io.outputLine("prefix", text.at("x", 1));',
    'var n := 0; loop n < 2 { io.outputLine(text.at("x", n)); n = n + 1; }',
    'io.outputLine(text.slice("x", 0, 2), text.at("", 0));',
  ];
  const branches = bodies.map((body, index) => `${index === 0 ? 'if' : 'else if'} pick == ${index} { ${body} }`).join('\r\n');
  const text = 'io := import "core/io"; text := import "core/text"; list := import "core/list"; /* 🙂 */ io.outputLine("before");\r\npick := io.inputInt();\r\n' + branches;
  for (const name of [undefined, 'bounds سلام🙂.lts']) {
    const compiled = compileTs(name === undefined ? { text } : { text, name });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      for (const [index, body] of bodies.entries()) {
        const expected = expectedText(text, name === undefined ? { stdin: String(index) } : { stdin: String(index), name });
        const actual = run({ stdin: String(index) });
        assert.equal(expected.status, 1); assert.equal(actual.phase, 'run'); assert.equal(actual.signal, null);
        if (body.includes('text.')) {
          // lib/core/text.lts wraps host.at/host.slice in Lite functions, so BoundPanic currently reports core/text.lts offsets instead of caller site.
          assert.equal(actual.status, expected.status, body);
          assert.equal(actual.stdout.toString(), expected.stdout.toString(), body);
          const expectedStderr = expected.stderr.toString();
          const panicSuffix = expectedStderr.slice(expectedStderr.indexOf('BoundPanic:'));
          assert.ok(panicSuffix.startsWith('BoundPanic:') && actual.stderr.toString().endsWith(panicSuffix), `${body}: ${actual.stderr.toString()}`);
        } else {
          assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, body);
        }
      }
    });
  }
  const effects = 'io := import "core/io"; items := fn(): List<Int> { io.outputLine("items"); values: List<Int> = [1]; values } ' +
    'index := fn(): Int { io.outputLine("index"); 2 } io.outputLine("before"); io.outputLine(items()[index()]);';
  const valid = "list := import \"core/list\"; io := import \"core/io\"; text := import \"core/text\"; values: mut List<Int> = [3, 4]; io.outputLine(text.at(\"🙂x\", 0), text.slice(\"🙂ab\", 0, 3), text.slice(\"\", 0, 0), values[0], values[1], list.popBack(mut values));";
  for (const source of [effects, valid]) {
    const compiled = compileTs({ text: source }), expected = expectedText(source);
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const actual = runTsArtifact(compiled.stdout.toString());
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);
  }
});

test('inequality stays distinct from assignment and tuple fields in grouping and function tails', () => {
  const common = [
    'io := import "core/io"; value := "x"; io.outputLine((value =!= ""), (((value =!= "x"))), (value == "x"));',
    'io := import "core/io"; var x := 2; io.outputLine((x =!= 1), (x =!= 2), (x == 2));',
    'io := import "core/io"; var flag := true; io.outputLine((flag =!= false), (flag =!= true));',
    'io := import "core/io"; var x := 1; x = 3; io.outputLine((x =!= 2), x);',
    'io := import "core/io"; value := ""; io.outputLine(not (value =!= ""));',
    'io := import "core/io"; value := "x"; io.outputLine((value /* left */ =!= /* right */ ""));',
    'io := import "core/io"; var x := 0; loop x < 2 { if (x =!= 1) { io.outputLine(x); } x = x + 1; }',
  ];
  const tsOnly = [
    'io := import "core/io"; different := fn(value: String): Bool { value =!= "" } io.outputLine(different("x"), different(""));',
    'io := import "core/io"; different := fn(value: Int): Bool { value =!= 0 } io.outputLine(different(0), different(1));',
    'io := import "core/io"; different := fn(value: Bool): Bool { value =!= false } io.outputLine(different(true), different(false));',
    'io := import "core/io"; different := fn(value: String): Bool { (value =!= "") } io.outputLine(different("x"));',
    'io := import "core/io"; point := (value = 7); io.outputLine(point.value);',
  ];
  for (const source of [...common, ...tsOnly]) {
    const expected = expectedText(source); assert.equal(expected.status, 0, expected.stderr.toString());
    const compiled = compileTs({ text: source }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    const actual = runTsArtifact(compiled.stdout.toString());
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, source);
    if (common.includes(source) && process.env['LITE_SKIP_NATIVE'] !== '1') {
      const c = compileTarget('c', { text: source }); assert.equal(c.status, 0, c.stderr.toString());
      const native = runCArtifact(c.stdout.toString()); assert.equal(native.phase, 'run');
      assert.deepEqual({ status: native.status, stdout: native.stdout, stderr: native.stderr }, expected, source);
    }
  }
  for (const bad of ['value := "x"; io.outputLine((value =!=));', 'value := "x"; io.outputLine((value =!= 1));',
    'x := 1; x = 2;', 'point := (value =);', 'var x := 1; x === 2;']) {
    const text = 'io := import "core/io"; io.outputLine("before"); ' + bad;
    assert.equal(expectedText(text).stdout.length, 0);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text });
      assert.equal(compiled.status, 2, bad); assert.equal(compiled.stdout.length, 0, bad);
    }
  }
});

test('constant integer faults execute only when reached, preserving short-circuit and operand order', () => {
  const expressions = ['1 / 0', '1 % 0', '1 :/ 0', '1 :% 0', '9223372036854775807 + 1',
    '-9223372036854775808 - 1', '9223372036854775807 * 2', '-(-9223372036854775808)',
    '-9223372036854775808 / -1', '-9223372036854775808 :/ -1',
    '(9223372036854775807 + 1) - 1', '0 * (9223372036854775807 + 1)',
    '(9223372036854775807 + 1) / (1 / 0)', '(1 / 0) + (9223372036854775807 + 1)'];
  const skipped = ['io := import "core/io";', ...expressions.flatMap(expression => [
    `if false { io.outputLine(${expression}); }`, `loop false { io.outputLine(${expression}); }`,
    `io.outputLine(false and (${expression} > 0), true or (${expression} > 0));`,
  ])].join('\n');
  const valid = skipped + '\nio.outputLine(2 * (3 - 4), -(-7), -9223372036854775808 % -1);';
  const compiled = compileTs({ text: valid }), expected = expectedText(valid);
  assert.equal(expected.status, 0, expected.stderr.toString()); assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString()); assert.equal(actual.phase, 'run');
  assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const c = compileTarget('c', { text: valid }); assert.equal(c.status, 0, c.stderr.toString());
    const native = runCArtifact(c.stdout.toString()); assert.equal(native.phase, 'run', native.stderr.toString());
    assert.deepEqual({ status: native.status, stdout: native.stdout, stderr: native.stderr }, expected);
  }
  const branches = expressions.map((expression, index) => `${index === 0 ? 'if' : 'else if'} pick == ${index} { io.outputLine(${expression}); }`).join('\r\n');
  const name = 'constant faults سلام.lts', text = 'io := import "core/io"; io.outputLine("before"); pick := io.inputInt();\r\n' + branches;
  const faults = compileTs({ text, name }); assert.equal(faults.status, 0, faults.stderr.toString());
  withTsArtifact(faults.stdout.toString(), run => {
    for (const [index, expression] of expressions.entries()) {
      const expected = expectedText(text, { stdin: String(index), name }), actual = run({ stdin: String(index) });
      assert.equal(expected.status, 1); assert.equal(actual.phase, 'run'); assert.equal(actual.signal, null);
      assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, expression);
      if (process.env['LITE_SKIP_NATIVE'] !== '1') {
        const text = `io := import "core/io"; io.outputLine("before");\r\nio.outputLine(${expression});`;
        const c = compileTarget('c', { text, name }); assert.equal(c.status, 0, c.stderr.toString());
        const native = runCArtifact(c.stdout.toString()), expected = expectedText(text, { name });
        assert.equal(native.phase, 'run'); assert.equal(native.signal, null);
        assert.deepEqual({ status: native.status, stdout: native.stdout, stderr: native.stderr }, expected);
      }
    }
  });
  for (const text of ['io := import "core/io"; unused := fn(): Int { 1 / 0 } io.outputLine(7);',
    'io := import "core/io"; value := if true { 5 } else { 1 / 0 }; io.outputLine(value);',
    'io := import "core/io"; value := if false { 1 / 0 } else { 5 }; io.outputLine(value);']) {
    const c = compileTs({ text }); assert.equal(c.status, 0, c.stderr.toString());
    const r = runTsArtifact(c.stdout.toString()), e = expectedText(text);
    assert.equal(r.phase, 'run'); assert.deepEqual({ status: r.status, stdout: r.stdout, stderr: r.stderr }, e);
  }
  for (const text of ['io := import "core/io"; if false { io.outputLine(missing); }', 'io := import "core/io"; io.outputLine(false and ("x" + 1 > 0));',
    'io := import "core/io"; if false { io.outputLine(9223372036854775808); }']) {
    assert.equal(expectedText(text).status, 1);
    for (const target of ['ts', 'c'] as const) {
      const c = compileTarget(target, { text }); assert.equal(c.status, 2); assert.equal(c.stdout.length, 0);
    }
  }
});

test('comparison chains compare adjacent values once and skip later operands on both targets', () => {
  const operators = ['==', '=!=', '<', '<!', '<=', '<!=', '>', '>!', '>=', '>!='];
  const rows = ['io := import "core/io"; var a := 0; var b := 0; var c := 0;'];
  for (const [a, b, c] of [[-1, 0, 1], [1, 0, -1], [0, 0, 0]]) {
    rows.push(`a = ${a}; b = ${b}; c = ${c};`);
    for (const first of operators) for (const second of operators) {
      rows.push(`io.outputLine(a ${first} b ${second} c, ${a} ${first} ${b} ${second} ${c});`);
    }
  }
  rows.push('var lo := -9223372036854775808; var hi := 9223372036854775807; io.outputLine(lo < 0 < hi, hi > 0 > lo);');
  rows.push('var text := "a"; var flag := true; io.outputLine(text == "a" =!= "b", flag == true =!= false);');
  rows.push('io.outputLine(Unit == Unit == Unit, Unit =!= Unit == Unit);');
  rows.push('io.outputLine(1 > 2 < (1 / 0), 1 > 2 < (9223372036854775807 + 1));');
  rows.push('io.outputLine(not 1 < 2 < 3, (1 < 2) == true == true, 0 < 1 < 2 and false);');
  rows.push('var lt_cmp_i_0_0 := 3; io.outputLine(0 < lt_cmp_i_0_0 < 4);');
  rows.push('var n := 0; loop 0 <= n < 3 { io.outputLine(n); n = n + 1; } io.outputLine(0 <= a < 2 < 3 < 4);');
  rows.push('var repeated := 1; io.outputLine(' + ['0', ...Array.from({ length: 300 }, () => 'repeated'), '2'].join(' <= ') + ');');
  const matrix = rows.join('\n'), expected = expectedText(matrix);
  assert.equal(expected.status, 0, expected.stderr.toString());
  for (const target of ['ts', 'c'] as const) {
    const compiled = compileTarget(target, { text: matrix }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    const actual = target === 'ts' ? runTsArtifact(compiled.stdout.toString()) : runCArtifact(compiled.stdout.toString());
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);
  }
  const cases = [
    { text: 'io := import "core/io"; touch := fn(n: Int): Int { io.outputLine(n); n } io.outputLine(touch(1) < touch(2) < touch(3)); io.outputLine(touch(3) < touch(2) < touch(1));', stdin: '' },
    { text: 'io := import "core/io"; touch := fn(): Unit { io.outputLine("unit"); } io.outputLine(Unit == Unit == touch()); io.outputLine(Unit =!= Unit == touch());', stdin: '' },
    { text: 'io := import "core/io"; io.outputLine("x" == "y" == io.inputLine("unreached: "));', stdin: '' },
    { text: 'io := import "core/io"; io.outputLine("x" == "x" == io.inputLine("Text: "));', stdin: 'x\n' },
    { text: 'io := import "core/io"; io.outputLine(io.inputFloat() == io.inputFloat() == io.inputFloat());', stdin: '1.5 1.5 1.5' },
    { text: 'io := import "core/io"; stop := fn(): Unit { io.exit(3); } io.outputLine("before"); io.outputLine(Unit == Unit == stop());', stdin: '' },
    { text: 'io := import "core/io"; io.outputLine(io.inputInt() < io.inputInt() < io.inputInt()); io.outputLine(io.inputInt());', stdin: '3 2 1' },
    { text: 'io := import "core/io"; values: List<Int> = [1]; io.outputLine(1 > 2 < values[9]);', stdin: '' },
    { text: 'io := import "core/io"; values: List<Int> = [1]; io.outputLine("before"); io.outputLine(0 < 1 < values[9]);', stdin: '' },
  ];
  for (const item of cases) {
    const compiled = compileTs({ text: item.text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    const actual = runTsArtifact(compiled.stdout.toString(), { stdin: item.stdin }), expected = expectedText(item.text, { stdin: item.stdin });
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString()); assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, item.text);
  }
  for (const expression of ['0 < 1 < (1 / 0)', '0 < 1 < (9223372036854775807 + 1)', '(1 / 0) < 2 < 3']) {
    const text = 'io := import "core/io"; io.outputLine("before");\r\nio.outputLine("prefix", ' + expression + ');', name = 'chain سلام.lts';
    const expected = expectedText(text, { name }); assert.equal(expected.status, 1);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      const actual = target === 'ts' ? runTsArtifact(compiled.stdout.toString()) : runCArtifact(compiled.stdout.toString());
      assert.equal(actual.phase, 'run', actual.stderr.toString()); assert.equal(actual.signal, null);
      assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);
    }
  }
  for (const bad of ['io := import "core/io"; io.outputLine(1 > 2 < "bad");', 'io := import "core/io"; io.outputLine(true < true < true);', 'io := import "core/io"; io.outputLine(1 < 2 < missing);',
    'if 1 < 2', 'io := import "core/io"; io.outputLine(1 < 2 <);']) {
    assert.equal(expectedText(bad).status, 1);
    for (const target of ['ts', 'c'] as const) { const c = compileTarget(target, { text: bad }); assert.equal(c.status, 2); assert.equal(c.stdout.length, 0); }
  }
  assert.equal(compileTarget('c', { text: 'io := import "core/io"; io.outputLine(Unit =!= Unit == io.exit(3));' }).status, 2);
});

test('C output evaluates all arguments before writing, including mixed scalar and Unit values', context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') { context.skip('LITE_SKIP_NATIVE=1'); return; }
  const prefix = 'io := import "core/io"; /* 🙂 */ var zero := 0; var maximum := 9223372036854775807;\r\n';
  const cases = [
    'io.outputLine("prefix", 1 / zero);', 'io.output("prefix", 1 / zero);',
    'io.outputLine("prefix", true, maximum + 1);', 'io.outputLine(Unit, 1 % zero);',
    'io.outputLine("prefix", 1 / zero, maximum + 1);', 'io.outputLine("prefix", maximum + 1, 1 / zero);',
    'io.outputLine("before"); io.outputLine("prefix", 1 :/ zero);',
    'io.output("before"); io.output("prefix", 1 :% zero);',
    'var n := 2; loop n >= 0 { io.outputLine("value", 10 / n); n = n - 1; }',
    'var text := "value"; io.outputLine(text + "x", 1 / zero);',
    'io.outputLine(Unit, (), true, "text", 7);',
    'io.outputLine(Unit); io.output(); io.outputLine(); io.output("x", Unit); io.outputLine();',
    'var lt_output_0 := 3; io.outputLine(lt_output_0, "x", true);',
    'var n := 0; loop n < 2 { if n == 0 { io.output("a", n); } else { io.outputLine("b", n); } n = n + 1; }',
  ];
  for (const body of cases) {
    const text = prefix + body, name = 'output سلام🙂.lts';
    const compiled = compileTarget('c', { text, name });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const expected = expectedText(text, { name }), actual = runCArtifact(compiled.stdout.toString());
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
    assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, body);
  }
});

test('generated TS division family matches boundary values, fault positions and call effects', () => {
  for (const source of [int64BoundaryProgram(true), 'io := import "core/io"; var n := -9223372036854775808; io.outputLine(n % -1, n :% -1, -9223372036854775808 % -1);',
    'io := import "core/io"; touch := fn(n: Int): Int { io.outputLine("arg", n); n } io.outputLine(touch(-7) / touch(2), touch(-7) % touch(2), touch(-7) :/ touch(2), touch(-7) :% touch(2));',
    'io := import "core/io"; var x := 1; var z := 0; var flag := false; io.outputLine(flag and (x / z > 0)); if flag { io.outputLine(x % z); }']) {
    const emitted = compileTs({ text: source });
    assert.equal(emitted.status, 0, emitted.stderr.toString());
    const result = runTsArtifact(emitted.stdout.toString()), expected = expectedText(source);
    assert.equal(result.phase, 'run', result.stdout.toString() + result.stderr.toString());
    assert.equal(result.signal, null);
    assert.deepEqual({ status: result.status, stdout: result.stdout, stderr: result.stderr }, expected);
  }
  const branches = divisionFaultExpressions.map((expression, index) => `${index === 0 ? 'if' : 'else if'} pick == ${index} { io.outputLine(${expression}); }`).join('\n');
  const source = 'io := import "core/io"; /* 🙂 */ io.outputLine("before");\r\npick := io.inputInt();\r\nvar hi := 9223372036854775807; var lo := -9223372036854775808; var zero := 0;\r\n' + branches;
  const name = 'division سلام🙂.lts', emitted = compileTs({ text: source, name });
  assert.equal(emitted.status, 0, emitted.stderr.toString());
  withTsArtifact(emitted.stdout.toString(), run => {
    for (const [index, expression] of divisionFaultExpressions.entries()) {
      const expected = expectedText(source, { name, stdin: String(index) }), actual = run({ stdin: String(index) });
      assert.equal(expected.status, 1); assert.equal(actual.phase, 'run'); assert.equal(actual.signal, null);
      assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, expression);
    }
  });
});

test('portable C11 division family preserves defined minimum remainders and nested fault order', context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') { context.skip('LITE_SKIP_NATIVE=1'); return; }
  const valid = int64BoundaryProgram(true), artifact = compileTarget('c', { text: valid });
  assert.equal(artifact.status, 0, artifact.stderr.toString());
  const result = runCArtifact(artifact.stdout.toString()), reference = expectedText(valid);
  assert.equal(result.phase, 'run', result.stdout.toString() + result.stderr.toString());
  assert.deepEqual({ status: result.status, stdout: result.stdout, stderr: result.stderr }, reference);
  for (const expression of divisionFaultExpressions) {
    const text = divisionFaultSource(expression), name = 'division سلام🙂.lts', emitted = compileTarget('c', { text, name });
    assert.equal(emitted.status, 0, emitted.stderr.toString());
    const expected = expectedText(text, { name }), actual = runCArtifact(emitted.stdout.toString());
    assert.equal(expected.status, 1); assert.equal(actual.phase, 'run'); assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, expression);
  }
});

test('portable C11 checks Int64 boundaries and sequences nested faults left to right', context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') { context.skip('LITE_SKIP_NATIVE=1'); return; }
  const source = int64BoundaryProgram();
  const compiled = compileTarget('c', { text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const result = runCArtifact(compiled.stdout.toString());
  assert.equal(result.phase, 'run', result.stdout.toString() + result.stderr.toString());
  const reference = expectedText(source);
  assert.deepEqual({ status: result.status, stdout: result.stdout, stderr: result.stderr }, reference);
  for (const expression of overflowingInt64Expressions) {
    const text = int64FaultProgram(expression), name = 'arithmetic سلام🙂.lts';
    const expected = expectedText(text, { name });
    assert.equal(expected.status, 1);
    const artifact = compileTarget('c', { text, name });
    assert.equal(artifact.status, 0, artifact.stderr.toString());
    const run = runCArtifact(artifact.stdout.toString());
    assert.equal(run.phase, 'run', run.stdout.toString() + run.stderr.toString());
    assert.equal(run.signal, null);
    assert.deepEqual({ status: run.status, stdout: run.stdout, stderr: run.stderr }, expected, expression);
  }
  for (const target of ['ts', 'c'] as const) {
    const literal = compileTarget(target, { text: 'io := import "core/io"; io.outputLine("lt_arg_left_1 = lt_checked_add( lite$addInt(");' });
    assert.equal(literal.status, 0);
    assert.doesNotMatch(literal.stdout.toString(), /const lite\$intLines|static const size_t lt_int_lines/);
  }
});


test('empty and comment-only scripts compile silently without hiding malformed source', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const sources = ['', ' ', '\n', '\r\n\t ', '/**/', '/* words */', '/* outer /* nested */ end */',
    ' \n/* سلام🙂 */\r\n', 'io := import "core/io"; /* ; {} () io.outputLine(1 / 0); */', '/* \"quoted\" */ /* another */',
    '/*# arbitrary /* nested-looking */ text #*/', '/* outer /*# raw */ body #*/ end */'];
  for (const text of sources) {
    const expected = expectedText(text);
    assert.deepEqual(expected, { status: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) });
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  for (const text of ['/*', '/* outer /* nested */', '/*# unterminated', '/* ok */ }', 'io := import "core/io"; /* ok */ io.outputLine(1); /* unterminated']) {
    assert.equal(expectedText(text).status, 1);
    for (const target of ['ts', 'c'] as const) {
      const result = compileTarget(target, { text }); assert.equal(result.status, 2); assert.equal(result.stdout.length, 0);
    }
  }
  for (const text of ['io := import "core/io"; /* before */ io.outputLine(7); /* after */', 'io := import "core/io"; /* nested /* inner */ */ var n := 1; io.outputLine(0 <= n < 2);']) {
    const expected = expectedText(text);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  assertExecutions(executions);
});


test('statement separators follow EOF, closing scope and directly closed block boundaries', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const both = ['io := import "core/io"; io.outputLine(7)', 'io := import "core/io"; io.output("x") /* tail */', 'x := 1', 'var x := 1', 'x: Int = 1', 'x: Int',
    'var x := 1; x = 2', 'Number := type Int', 'io := import "core/io"; if true { io.outputLine(7) }',
    'io := import "core/io"; if true { x := 7 } io.outputLine(8)', 'io := import "core/io"; var n := 0; loop n < 3 { n = n + 1; continue } io.outputLine(n)',
    'io := import "core/io"; loop { io.outputLine(7); break }', 'io := import "core/io"; /* before */ io.outputLine(0 < 1 < 2) /* after */'];
  const tsOnly = ['noop := fn(): Unit { return } noop()', 'io := import "core/io"; f := fn(): Int { return 7 } io.outputLine(f())',
    'io := import "core/io"; x := if true { 7 } else { 9 } /* boundary */ io.outputLine(x)',
    'io := import "core/io"; var x := 0; x = if true { 7 } else { 9 } io.outputLine(x)',
    'io := import "core/io"; f := fn(): Int { return if true { 7 } else { 9 } } io.outputLine(f())',
    "list := import \"core/list\"; values: mut List<Int> = [1]; list.popBack(mut values)",
    'io := import "core/io"; io.inputLine("Prompt: ")', 'io := import "core/io"; f := fn(): Unit { io.outputLine(7) } f()'];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text, { stdin: 'line\n' }); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, options: target === 'ts' ? { stdin: 'line\n' } : {}, context: text });
    }
  }
  const invalid = ['io := import "core/io"; io.outputLine(1) io.outputLine(2);', 'io := import "core/io"; io.outputLine(1)\nio.outputLine(2)', 'io := import "core/io"; io.output("x") io.outputLine("y")',
    'io := import "core/io"; x := 1 io.outputLine(x);', 'var x := 1\nx = 2', 'io := import "core/io"; x := 1 /* } */ io.outputLine(x);',
    'io := import "core/io"; x := (if true { 1 } else { 2 }) io.outputLine(x);', 'io := import "core/io"; Number := type Int io.outputLine(1);',
    'io := import "core/io"; if true { io.outputLine(1)', 'noop := fn(): Unit { return', 'f := fn(): Int { return }'];
  for (const text of invalid) {
    assert.equal(expectedText(text).status, 1, text);
    for (const target of ['ts', 'c'] as const) {
      const result = compileTarget(target, { text }); assert.equal(result.status, 2, text); assert.equal(result.stdout.length, 0);
    }
  }
  const text = 'io := import "core/io"; io.outputLine("before");\r\nvar zero := 0; io.outputLine(1 / zero) /* tail */', name = 'boundary سلام.lts';
  const expected = expectedText(text, { name }); assert.equal(expected.status, 1);
  for (const target of ['ts', 'c'] as const) {
    const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
  }
  assertExecutions(executions);
});

test('adjacent String literals join across trivia before expressions and encode once', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const both = ['io := import "core/io"; io.outputLine("a""b");', 'io := import "core/io"; io.outputLine("" "" "x" "");', 'io := import "core/io"; io.outputLine("a"\n"b");',
    'io := import "core/io"; io.outputLine("a" /* outer /* inner */ end */ "b");', 'io := import "core/io"; io.outputLine("a" /*# raw /* */ #*/ "b");',
    'io := import "core/io"; io.outputLine("a\\n" "\\t" "\\r" "\\\"" "\\\\");', 'io := import "core/io"; io.outputLine("سلام" "🙂");',
    'io := import "core/io"; var x := "a" "b"; io.outputLine(x + "c" "d");',
    'io := import "core/io"; var x := "ab"; io.outputLine(x == "a" "b" =!= "z");',
    'io := import "core/io"; if "a" "b" == "ab" { io.outputLine("y" "es"); } else { io.outputLine("no"); }',
    'io := import "core/io"; io.output("x" "y"); io.outputLine("z");', 'io := import "core/io"; io.outputLine("a", "b"); io.outputLine("a"); io.outputLine("b");',
    'io := import "core/io"; io.outputLine(' + Array(1024).fill('"x"').join(' ') + ');'];
  const tsOnly = ['io := import "core/io"; echo := fn(s: String): String { s } io.outputLine(echo("a" "b"));',
    'io := import "core/io"; f := fn(): String { "a" "b" } io.outputLine(f());',
    'io := import "core/io"; values: List<String> = ["a" "b", "c" "d"]; io.outputLine(values[0], values[1]);',
    'io := import "core/io"; pair := (label = "a" "b", value = 3); io.outputLine(pair.label);',
    'io := import "core/io"; io.outputLine(io.inputLine("Prom" "pt: "));',
    'io := import "core/io"; text := import "core/text"; io.outputLine(text.length("ab" "cd"), text.at("ab" "cd", 2), text.slice("ab" "cd", 1, 3));',
    'io := import "core/io"; value := if true { "a" "b" } else { "c" "d" } io.outputLine(value);'];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text, { stdin: 'line\n' }); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, options: target === 'ts' ? { stdin: 'line\n' } : {}, context: text });
    }
  }
  const invalid = ['io := import "core/io"; io.outputLine("ok");\nio.outputLine("a" "\\q");', 'io := import "core/io"; io.outputLine("a" "unterminated',
    'io := import "core/io"; io.outputLine("a" /* unterminated', 'io := import "core/io"; io.outputLine("a" /*# unterminated',
    'io := import "core/io"; value := "a"; io.outputLine(value "b");', 'io := import "core/io"; io.outputLine(("a") "b");', 'io := import "core/io"; io.outputLine("a"; "b");', 'io := import "core/io"; io.outputLine("a" 7);'];
  for (const text of invalid) {
    assert.equal(expectedText(text).status, 1, text);
    for (const target of ['ts', 'c'] as const) {
      const result = compileTarget(target, { text }); assert.equal(result.status, 2, text); assert.equal(result.stdout.length, 0);
    }
  }
  for (const target of ['ts', 'c'] as const) {
    const bad = compileTarget(target, { text: 'io := import "core/io"; io.outputLine("ok");\nio.outputLine("a" "unterminated', name: 'later.lts' });
    assert.equal(bad.stderr.toString(), 'later.lts:2:19: unterminated string literal\n');
    const text = 'io := import "core/io"; value := "a" "b"; io.outputLine(value);\nvar zero := 0; io.outputLine(1 / zero);', name = 'joined سلام.lts';
    const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    executions.push({ target, artifact: compiled.stdout.toString(), expected: expectedText(text, { name }), context: text });
  }
  assertExecutions(executions);
});

test('nonempty calls admit one trailing comma without adding a value or weakening arity', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const both = ['io := import "core/io"; io.outputLine(1,);', 'io := import "core/io"; io.output(1,); io.outputLine("x",);', 'io := import "core/io"; io.outputLine(1, "x", true,);',
    'io := import "core/io"; io.outputLine(Unit,);', 'io := import "core/io"; io.outputLine("a" "b", /* nested /* comment */ */);',
    'io := import "core/io"; io.outputLine(0 < 1 < 2,);', 'io := import "core/io"; var x := 7; io.outputLine(x + 1,);',
    'io := import "core/io"; if true { io.outputLine("yes",) }', 'io := import "core/io"; io.output(); io.outputLine();'];
  const tsOnly = ['io := import "core/io"; identity := fn(n: Int): Int { n } io.outputLine(identity(7,),);',
    'io := import "core/io"; sum := fn(a: Int, b: Int): Int { a + b } io.outputLine(sum(2, 3,),);',
    'io := import "core/io"; touch := fn(n: Int): Int { io.outputLine(n,); n } add := fn(a: Int, b: Int): Int { a + b } io.outputLine(add(touch(1,), touch(2,),),);',
    'io := import "core/io"; io.outputLine(io.inputAll("All: ",),);', 'io := import "core/io"; io.outputLine(io.inputLine("Line: ",),);',
    'io := import "core/io"; io.outputLine(io.inputInt("Int: ",),);', 'io := import "core/io"; io.outputLine(io.inputFloat("Float: ",),);',
    'io := import "core/io"; text := import "core/text"; io.outputLine(text.length("ab",), text.at("ab", 1,), text.slice("abcd", 1, 3,),);',
    "list := import \"core/list\"; io := import \"core/io\"; values: mut List<Int> = [1]; list.pushBack(mut values, 2,); io.outputLine(list.popBack(mut values,), list.popBack(mut values,),);",
    'io := import "core/io"; values: List<Int> = [1, 2]; pair := (label = "x", n = 7); io.outputLine(values, pair,);',
    'io := import "core/io"; io.errorLine("err",); io.outputLine("after",);', 'io := import "core/io"; io.outputLine("before",); io.exit(3,);'];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const stdin = text.includes('io.inputInt(') ? '7\n' : '1.5\n';
    const reference = expectedText(text, { stdin });
    assert.ok(reference.status === 0 || text.includes('io.exit(3,') && reference.status === 3, text + reference.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected: reference, options: target === 'ts' ? { stdin } : {}, context: text });
    }
  }
  const invalid = ['io := import "core/io"; io.outputLine(,);', 'io := import "core/io"; io.outputLine(1,,);', 'io := import "core/io"; io.outputLine(,1);', 'io := import "core/io"; io.outputLine(1,',
    'io := import "core/io"; io.inputArgs(,);', 'io := import "core/io"; io.inputLine(,);', 'io := import "core/io"; io.inputInt("Prompt", 1,);', 'text := import "core/text"; text.at("x",);',
    'io := import "core/io"; f := fn(n: Int): Int { n } io.outputLine(f(,));', 'io := import "core/io"; f := fn(n: Int): Int { n } io.outputLine(f(1,,));',
    'io := import "core/io"; f := fn(a: Int, b: Int): Int { a + b } io.outputLine(f(1,));',
    "list := import \"core/list\"; values: mut List<Int> = [1]; list.pushBack(mut values,);", "list := import \"core/list\"; values: mut List<Int> = [1]; list.popBack(mut values,,);"];
  for (const text of invalid) {
    assert.equal(expectedText(text).status, 1, text);
    for (const target of ['ts', 'c'] as const) {
      const result = compileTarget(target, { text }); assert.equal(result.status, 2, text); assert.equal(result.stdout.length, 0);
    }
  }
  for (const text of ['io := import "core/io"; io.outputLine("before");\nvar zero := 0; io.outputLine("prefix", 1 / zero,);',
    'io := import "core/io"; io.outputLine(io.inputInt("Int: ",),);', "list := import \"core/list\"; io := import \"core/io\"; values: mut List<Int> = []; io.outputLine(list.popBack(mut values,),);"]) {
    const targets = text.includes('zero') ? ['ts', 'c'] as const : ['ts'] as const, name = 'comma سلام.lts';
    const expected = expectedText(text, { name, stdin: 'bad' }); assert.equal(expected.status, 1);
    for (const target of targets) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, options: target === 'ts' ? { stdin: 'bad' } : {}, context: text });
    }
  }
  assertExecutions(executions);
});

test('statement scopes isolate locals and preserve outer values while shadow initializers run', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const both = ['{}', 'io := import "core/io"; {}; { io.outputLine(1,); }', 'io := import "core/io"; { x := 3; io.outputLine(x); } io.outputLine(4);',
    'io := import "core/io"; x := 10; { x := 20; io.outputLine(x); } io.outputLine(x);',
    'io := import "core/io"; var x := 7; if true { x := x; io.outputLine(x); } io.outputLine(x);',
    'io := import "core/io"; var x := 7; { x := x + 1; io.outputLine(x); } io.outputLine(x);',
    'io := import "core/io"; var x := 7; { var x := x + 1; x = x + 2; io.outputLine(x); } io.outputLine(x);',
    'io := import "core/io"; var x := 0; { x = 3; y := 1; } { x = 4; } io.outputLine(x);',
    'io := import "core/io"; var x := 0; { var x := x + 1; { x := x + 1; io.outputLine(x); } io.outputLine(x); } io.outputLine(x);',
    'io := import "core/io"; var value := "outer"; { value := value + "!"; io.outputLine(value); } io.outputLine(value);',
    'io := import "core/io"; var flag := true; { flag := not flag; io.outputLine(flag); } io.outputLine(flag);',
    'io := import "core/io"; var maximum := 9223372036854775807; { value := maximum - 1; io.outputLine(value); }',
    'io := import "core/io"; var n := 0; loop { { n = n + 1; break } } io.outputLine(n);',
    'io := import "core/io"; var n := 0; loop n < 3 { { n = n + 1; continue } } io.outputLine(n);',
    'io := import "core/io"; var flag := false; var x := 7; if flag { { x := x + 1; io.outputLine(x); } } else { { x := x + 2; io.outputLine(x); } } io.outputLine(x);',
    'io := import "core/io"; lt_local_0 := 17; var value := 1; { value := value + lt_local_0; io.outputLine(value); } io.outputLine(lt_local_0);',
    'io := import "core/io"; var x: Int = 3; { x: Int = x; io.outputLine(x); } io.outputLine(x);',
    'io := import "core/io"; { x := 1; io.outputLine(x); } { x := 2; io.outputLine(x); }',
    'io := import "core/io"; inputInt := 7; { inputInt := inputInt + 1; io.outputLine(inputInt); } io.outputLine(inputInt);',
    'io := import "core/io"; var x := 7; { x: Bool = true; io.outputLine(x); } io.outputLine(x);'];
  const tsOnly = ['io := import "core/io"; f := fn(n: Int): Int { { n := n + 1; io.outputLine(n); } return n; } io.outputLine(f(3));',
    'io := import "core/io"; f := fn(): Int { { return 7; } } io.outputLine(f());',
    'io := import "core/io"; values: List<Int> = [1, 2]; loop values as values { io.outputLine(values); } io.outputLine(values);',
    "list := import \"core/list\"; io := import \"core/io\"; values: mut List<Int> = [1, 2]; { values := list.popBack(mut values); io.outputLine(values); } io.outputLine(values);",
    'io := import "core/io"; pair := (n = 1, label = "x"); { pair := (n = pair.n + 1, label = pair.label); io.outputLine(pair.n, pair.label); } io.outputLine(pair.n);',
    'io := import "core/io"; first := fn(values: List<Int>): Int { { values := values[0]; io.outputLine(values); } values[1] } items: List<Int> = [1, 2]; io.outputLine(first(items));'];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  const invalid = ['io := import "core/io"; io.outputLine("before"); { x := 1; } io.outputLine(x);',
    'io := import "core/io"; var x := 1; { y := x; { io.outputLine(y); } } io.outputLine(y);', '{', '}', '{} else {}',
    '{ break; }', '{ continue; }', 'x := 1; { x = 2; }', 'var x := 7; { x: Bool = x; }'];
  for (const text of invalid) {
    assert.equal(expectedText(text).status, 1, text);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0);
    }
  }
  const faults = ['io := import "core/io"; var zero := 0; io.outputLine("before");\r\n{ io.outputLine("prefix", 1 / zero); }',
    'io := import "core/io"; var value := 9223372036854775807; io.outputLine("before");\r\n{ value := value + 1; io.outputLine(value); }',
    'io := import "core/io"; values: List<Int> = [1]; io.outputLine("before");\r\n{ values := values[2]; io.outputLine(values); }'];
  for (const text of faults) {
    const name = 'scope سلام.lts', expected = expectedText(text, { name }); assert.equal(expected.status, 1);
    const targets = text.includes('values: List<Int>') ? ['ts'] as const : ['ts', 'c'] as const;
    for (const target of targets) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  assertExecutions(executions);
});

test('nested value declarations shadow while root declarations remain unique', () => {
  const nested = 'io := import "core/io"; x := 1; if true { x := 2; io.outputLine(x); } io.outputLine(x);';
  const tsNested = compileTarget('ts', { text: nested });
  assert.equal(tsNested.status, 0, tsNested.stderr.toString());
  assert.deepEqual(runTsArtifact(tsNested.stdout.toString()).stdout, Buffer.from('2\n1\n'));
  const cNested = compileTarget('c', { text: nested });
  assert.equal(cNested.status, 0, cNested.stderr.toString());
  if (process.env['LITE_SKIP_NATIVE'] !== '1') assert.deepEqual(runCArtifact(cNested.stdout.toString()).stdout, Buffer.from('2\n1\n'));

  for (const text of ['x := 1; x := 2;', 'var x := 1; x: Int = 2;']) {
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text });
      assert.equal(compiled.status, 2, `${target}: ${text}`);
      assert.equal(compiled.stdout.length, 0, `${target}: rejected roots emit no artifact`);
      assert.match(compiled.stderr.toString(), /duplicate top-level value x/);
    }
  }
});

test('ordinary expression items evaluate silently and trailing separators retain function results', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const both = ['1;', '; ; /* empty */ ;', 'true; false; Unit;', '1; "quiet"; not false; (2 + 3); +4; -5;',
    'x := 1; x + 2;', 'io := import "core/io"; var x := 2; x * 3; x = 4; x; io.outputLine(x);',
    'io := import "core/io"; ;; { ;; 1;; "quiet";; };; io.outputLine("after");;',
    'io := import "core/io"; if true { 1; } else { 2; } io.outputLine("after");',
    'io := import "core/io"; var x := 0; loop x < 3 { x + 1; x = x + 1;; } io.outputLine(x);',
    'io := import "core/io"; var zero := 0; if false { 1 / zero; } io.outputLine("alive");',
    'false and (1 / 0 > 0); true or (9223372036854775807 + 1 > 0);',
    'io := import "core/io"; var x := 2; x < 3 < 4; "a" + "b"; io.outputLine("done");',
    'io := import "core/io"; io.outputLine("before"); 9223372036854775807 - 1;',
    'io := import "core/io"; Unit;; io.outputLine("after");', 'and true and false; or false or true;'];
  const tsOnly = ['[1, 2]; (n = 1, label = "quiet");',
    'io := import "core/io"; f := fn(): Int { io.outputLine("effect"); 7; } f() + 1; io.outputLine("after");',
    'io := import "core/io"; f := fn(): Int { 1; 2;; } io.outputLine(f());',
    'io := import "core/io"; f := fn(): Bool { false; true;; } io.outputLine(f());',
    'io := import "core/io"; f := fn(): String { "first"; "last";; } io.outputLine(f());',
    'io := import "core/io"; f := fn(n: Int): Int { n + 1; n + 2;; } io.outputLine(f(3));',
    'f := fn(): Unit { ;; Unit;; } f();',
    'io := import "core/io"; effect := fn(): Unit { io.outputLine("effect"); } f := fn(): Unit { effect();; } f();',
    'io := import "core/io"; f := fn(): Int { if true { 1;; } else { 2;; };; } io.outputLine(f());',
    'io := import "core/io"; f := fn(flag: Bool): Int { if flag { io.outputLine("yes"); 1;; } else { io.outputLine("no"); 2;; };; } io.outputLine(f(false), f(true));',
    'io := import "core/io"; f := fn(): List<Int> { values: List<Int> = [1, 2]; values;; } io.outputLine(f());',
    'io := import "core/io"; f := fn(): List<Int> { values: List<Int> = []; values;; } io.outputLine(f());',
    'io := import "core/io"; f := fn(): (n: Int) { (n = 2);; } io.outputLine(f());',
    "list := import \"core/list\"; io := import \"core/io\"; var values: mut List<Int> = [1, 2]; list.popBack(mut values); io.outputLine(values);",
    "list := import \"core/list\"; io := import \"core/io\"; f := fn(): Int { values: mut List<Int> = [1, 2]; list.popBack(mut values);; } io.outputLine(f());",
    'f := fn(): Unit { if true { Unit } else { Unit };; } f();',
    "list := import \"core/list\"; f := fn(): Unit { values: mut List<Int> = [1]; list.pushBack(mut values, 2);; } f();",
    'io := import "core/io"; f := fn(): Unit { if true { io.outputLine("yes"); Unit;; } else { io.outputLine("no"); Unit;; };; } f();',
  ];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
    if (targets.length === 1) {
      const c = compileTarget('c', { text }); assert.equal(c.status, 2, text); assert.equal(c.stdout.length, 0);
    }
  }
  for (const [text, stdin] of [
    ['io := import "core/io"; io.inputInt("n? ") + io.inputInt("m? "); io.outputLine(io.inputInt());', '1 2 3'],
    ['io := import "core/io"; io.inputLine("line? "); io.outputLine(io.inputLine());', 'first\nlast\n'],
    ['io := import "core/io"; io.inputAll("all? "); io.outputLine(io.inputAll());', 'all\n🙂'],
  ] as const) {
    const expected = expectedText(text!, { stdin }); assert.equal(expected.status, 0, expected.stderr.toString());
    const compiled = compileTarget('ts', { text: text! }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text! });
  }
  const invalid = ['io := import "core/io"; io.outputLine("before"); 1 2;', 'true false;', 'Unit Unit;',
    'io := import "core/io"; x := 1; x + 2 io.outputLine(x);', 'unknown;', 'io := import "core/io"; io.outputLine("before"); 1 + true;',
    'f := fn(): Int { "wrong";; } f();', 'f := fn(): Int { ;; } f();',
    'f := fn(): Unit { 1;; } f();',
    'io := import "core/io"; g := fn(): Int { io.outputLine("effect"); 1 } f := fn(): Unit { g();; } f();',
    'io := import "core/io"; g := fn(): String { io.outputLine("effect"); "value" } f := fn(): Unit { (g());; } f();',
    'f := fn(): Unit { if true { 1 } else { 2 };; } f();',
    'io := import "core/io"; f := fn(): Unit { if true { io.outputLine("effect"); 1;; } else { 2;; };; } f();'];
  for (const text of invalid) {
    const expected = expectedText(text); assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text);
    }
  }
  for (const text of ['io := import "core/io"; io.outputLine("before");\r\nvar zero := 0; 1 / zero;',
    'io := import "core/io"; io.outputLine("before");\r\n9223372036854775807 + 1;',
    'var x := 9223372036854775807; if true { x + 1; }']) {
    const name = 'items سلام.lts', expected = expectedText(text, { name }); assert.equal(expected.status, 1, text);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  assertExecutions(executions);
});

test('function completion joins every conditional arm and preserves earlier definite returns', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const sources = [
    'io := import "core/io"; f := fn(flag: Bool): Int { if flag { return 1; } else { return 2; } } io.outputLine(f(true), f(false));',
    'io := import "core/io"; f := fn(flag: Bool): Int { if flag { return 1; } 2; } io.outputLine(f(true), f(false));',
    'io := import "core/io"; f := fn(a: Bool, b: Bool): Int { if a { if b { return 1; } else { return 2; } } else { return 3; } } io.outputLine(f(true, true), f(true, false), f(false, true));',
    'io := import "core/io"; f := fn(n: Int): Int { if n < 0 { x := n; -x; } else if n == 0 { return 10; } else { n + 1; } } io.outputLine(f(-2), f(0), f(2));',
    'io := import "core/io"; f := fn(): Int { return 1; x := "dead"; x;; } io.outputLine(f());',
    'io := import "core/io"; f := fn(): Unit { return; 1;; } f(); io.outputLine("after");',
    'io := import "core/io"; f := fn(flag: Bool): Int { if flag { return 1; } else { return 2; } "dead";; } io.outputLine(f(false));',
    'io := import "core/io"; f := fn(): Int { { return 1; } "dead";; } io.outputLine(f());',
    'io := import "core/io"; f := fn(flag: Bool): Int { loop flag { return 1; } 0; } io.outputLine(f(false), f(true));',
    'io := import "core/io"; f := fn(): Int { loop { return 1; } } io.outputLine(f());',
    'io := import "core/io"; f := fn(flag: Bool): Int { loop { if flag { return 1; } else { return 2; } } } io.outputLine(f(false));',
    'io := import "core/io"; f := fn(): Int { loop { break; return 1; } 2; } io.outputLine(f());',
    'io := import "core/io"; f := fn(flag: Bool): Unit { if flag { return; } io.outputLine("body"); } f(true); f(false);',
    'io := import "core/io"; f := fn(flag: Bool): String { if flag { return "a"; } else { return "b"; } Unit; } io.outputLine(f(false));',
    'io := import "core/io"; f := fn(flag: Bool): Bool { if flag { x := true; x; } else { x := false; x; } } io.outputLine(f(true), f(false));',
    'io := import "core/io"; f := fn(flag: Bool): (n: Int) { if flag { p := (n = 1); p; } else { return (n = 2); } } io.outputLine(f(true), f(false));',
    'io := import "core/io"; f := fn(flag: Bool): List<Int> { if flag { values: List<Int> = [1]; values; } else { values: List<Int> = [2]; return values; } } io.outputLine(f(true), f(false));',
    'io := import "core/io"; f := fn(flag: Bool): Int { if flag { return 1; } else { { return 2; } } } io.outputLine(f(false));',
    'io := import "core/io"; f := fn(flag: Bool): Int { if flag { return 1; } else { return 2; } if false { "ignored"; } Unit; } io.outputLine(f(true));',
    'io := import "core/io"; f := fn(flag: Bool): Unit { if flag { return; } else { return; } 1; } f(false); io.outputLine("after");',
  ];
  for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, context: text });
    const c = compileTarget('c', { text }); assert.equal(c.status, 2, text); assert.equal(c.stdout.length, 0);
  }
  const scalarControl = ['io := import "core/io"; loop { io.outputLine("live"); break; 1 / 0; } io.outputLine("after");',
    'io := import "core/io"; var n := 0; loop n < 2 { n = n + 1; continue; io.outputLine("dead"); } io.outputLine(n);',
    'io := import "core/io"; loop { if true { break; } else { break; } io.outputLine("dead"); } io.outputLine("after");',
    'io := import "core/io"; loop { { break; } io.outputLine("dead"); } io.outputLine("after");',
    'io := import "core/io"; var n := 0; loop { n = n + 1; if n > 1 { break; } else { continue; } io.outputLine("dead"); } io.outputLine(n);',
    'io := import "core/io"; loop { loop { break; } io.outputLine("outer"); break; } io.outputLine("after");'];
  for (const text of scalarControl) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  const invalid = [
    'loop { break; 1 + true; }', 'loop { break; unknown; }',
    'f := fn(flag: Bool): Int { if flag { 1; } else { x := 2; } } io.outputLine(f(false));',
    'f := fn(flag: Bool): Int { if flag { x := 1; } else { 2; } } io.outputLine(f(true));',
    'f := fn(flag: Bool): Int { if flag { return 1; } } io.outputLine(f(false));',
    'f := fn(): Int { if true { return 1; } } io.outputLine(f());',
    'f := fn(flag: Bool): Int { if flag { return 1; } x := 3; } io.outputLine(f(false));',
    'f := fn(a: Bool, b: Bool): Int { if a { if b { return 1; } } else { return 2; } } io.outputLine(f(true, false));',
    'f := fn(n: Int): Int { if n < 0 { return 1; } else if n == 0 { x := 2; } else { return 3; } } io.outputLine(f(0));',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { } } io.outputLine(f(false));',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { io.outputLine("effect"); } } io.outputLine(f(false));',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { var x := 2; x = 3; } } io.outputLine(f(false));',
    'f := fn(flag: Bool): Int { if flag { return 1; } "wrong"; } io.outputLine(f(false));',
    'f := fn(): Int { return 1; return "wrong"; } io.outputLine(f());',
    'f := fn(): Unit { return; return 1; } f();',
  ];
  for (const source of invalid) {
    const text = 'io := import "core/io"; io.outputLine("before");\r\n' + source;
    const reference = expectedText(text); assert.equal(reference.status, 1, source); assert.equal(reference.stdout.length, 0, source);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name: 'branch سلام.lts' });
      assert.equal(compiled.status, 2, source); assert.equal(compiled.stdout.length, 0, source);
      assert.match(compiled.stderr.toString(), /^branch سلام\.lts:2:[0-9]+: /);
    }
  }
  for (const text of ['io := import "core/io"; io.outputLine("before"); f := fn(flag: Bool): Int { if flag { var zero := 0; return 1 / zero; } else { return 2; } } io.outputLine(f(true));',
    'io := import "core/io"; f := fn(flag: Bool): Int { if flag { return 1; } else { var max := 9223372036854775807; max + 1; } } io.outputLine(f(false));']) {
    const name = 'branch سلام.lts', expected = expectedText(text, { name }); assert.equal(expected.status, 1, text);
    const compiled = compileTarget('ts', { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, context: text });
  }
  assertExecutions(executions);
});

test('finite Float literals retain binary64 values, display and same-family comparisons on TS and C', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const literals = ['0.0', '-0.0', '1.5', '+1.5', '0001.2500', '1e2', '2.5E-2', '1E+21',
    '0.000001', '0.0000001', '1000000000000000100.0', '1.7976931348623158e308',
    '5e-324', '2e-324', '1e-99999', '0e' + '9'.repeat(120),
    '0.' + '0'.repeat(400) + '1e401', '999999999999999999999999999999.0',
    '- /* comment */ 1.5'];
  const midpoint = (1n << 1024n) - (1n << 970n);
  literals.push((midpoint - 1n).toString() + '.0');
  const both = ['io := import "core/io"; io.outputLine(' + literals.join(', ') + ');',
    'io := import "core/io"; var n: Float = 0.1; saved := n; n = 0.2; n = -n; io.outputLine(saved, n, +n, -(-n));',
    'io := import "core/io"; zero: Float; io.outputLine(zero, zero == 0.0, -zero, +zero);',
    'io := import "core/io"; a := 1.5; b := 2.5; io.outputLine(a == b, a =!= b, a < b, a <! b, a <= b, a <!= b, a > b, a >! b, a >= b, a >!= b);',
    'io := import "core/io"; a := 1.5; b := 2.5; c := 3.5; io.outputLine(a < b < c, c > b > a, a > b < c);',
    'io := import "core/io"; var n := 1.5; { n := -n; io.outputLine(n); } io.outputLine(n);',
    'io := import "core/io"; var flag := true; var n := 1.5; loop flag { io.outputLine(n); n = 2.5; flag = false; } io.outputLine(n);',
    'io := import "core/io"; 1.5; -0.0; 1e-9999; io.outputLine("after");',
    'io := import "core/io"; io.output("before", 0.1); io.outputLine(1e21, -5e-324, 0.000001);'];
  const tsOnly = ['io := import "core/io"; f := fn(n: Float): Float { n } io.outputLine(f(0.1), f(-0.0));',
    'io := import "core/io"; p := (n = 0.1, label = "value"); values: List<Float> = [0.1, 1e21]; io.outputLine(p, values);',
    'io := import "core/io"; f := fn(flag: Bool): Float { if flag { 0.1 } else { 2.5 } } io.outputLine(f(true), f(false));',
    'io := import "core/io"; f := fn(n: Float): Float { if n < 0.0 { return -n; } n } io.outputLine(f(-1.5));',
    'io := import "core/io"; echo := fn(n: Float): Float { io.outputLine("call", n); n } io.outputLine(echo(1.5) < echo(2.5) < echo(3.5), echo(3.5) < echo(2.5) < echo(1.5));'];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
    if (targets.length === 1) { const c = compileTarget('c', { text }); assert.equal(c.status, 2, text); assert.equal(c.stdout.length, 0); }
  }
  const vectors: number[] = [0, -0, Number.MIN_VALUE, Number.MAX_VALUE, 0.1, 0.2, 0.3, 1e-6, 1e-7, 1e20, 1e21, 1e23];
  const view = new DataView(new ArrayBuffer(8));
  for (const power of [-1074, -1022, -100, -53, -1, 0, 1, 10, 53, 100, 1023]) {
    const n = 2 ** power; vectors.push(n, -n); view.setFloat64(0, n); const bits = view.getBigUint64(0);
    if (bits > 0n) { view.setBigUint64(0, bits - 1n); vectors.push(view.getFloat64(0)); }
    if (bits < 0x7fefffffffffffffn) { view.setBigUint64(0, bits + 1n); vectors.push(view.getFloat64(0)); }
  }
  let random = 0x123456789abcdefn;
  for (let i = 0; i < 200; i++) { random = BigInt.asUintN(64, random * 6364136223846793005n + 1442695040888963407n); view.setBigUint64(0, random); const n = view.getFloat64(0); if (Number.isFinite(n)) vectors.push(n); }
  const text = 'io := import "core/io";\n' + vectors.map(n => { let token = Object.is(n, -0) ? '-0.0' : String(n); if (!/[.eE]/.test(token)) token += '.0'; return 'io.outputLine(' + token + ');'; }).join('\n');
  const expected = expectedText(text); assert.equal(expected.status, 0, expected.stderr.toString());
  assert.equal(expected.stdout.toString(), vectors.map(n => String(n)).join('\n') + '\n');
  for (const target of ['ts', 'c'] as const) {
    const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    executions.push({ target, artifact: compiled.stdout.toString(), expected, context: 'binary64 boundary/random display vectors' });
  }
  const invalid = ['io.outputLine(.5);', 'io.outputLine(1.);', 'io.outputLine(1e);', 'io.outputLine(1e+);', 'io.outputLine(1e-);',
    'io.outputLine(1.2e);', 'io.outputLine(1ee2);', 'io.outputLine(1.2.3);', 'io.outputLine(1e2.5);', 'io.outputLine(1e+ 2);',
    'io.outputLine(1e309);', 'io.outputLine(-1e309);', 'io.outputLine(' + midpoint.toString() + '.0);',
    'if false { io.outputLine(1e99999); }', 'var x: Float = "wrong";', 'io.outputLine(1.5 == "wrong");'];
  for (const source of invalid) {
    const text = 'io := import "core/io"; io.outputLine("before");\r\n' + source;
    const expected = expectedText(text); assert.equal(expected.status, 1, source); assert.equal(expected.stdout.length, 0, source);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name: 'float سلام.lts' }); assert.equal(compiled.status, 2, source); assert.equal(compiled.stdout.length, 0, source);
      assert.match(compiled.stderr.toString(), /^float سلام\.lts:2:[0-9]+: /);
    }
  }
  for (const text of ['io := import "core/io"; io.outputLine("before"); var zero := 0; io.outputLine(0.1, 1 / zero);',
    'io := import "core/io"; io.outputLine("before"); io.outputLine(0.1, 9223372036854775807 + 1);']) {
    const name = 'float سلام.lts', expected = expectedText(text, { name }); assert.equal(expected.status, 1);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  {
    const text = 'io := import "core/io"; io.outputLine(0.1 < io.inputFloat("middle? ") < io.inputFloat("last? "));', stdin = '0.0 bad', expected = expectedText(text, { stdin });
    assert.equal(expected.status, 0); assert.equal(expected.stdout.toString(), 'middle? false\n');
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text });
  }
  assertExecutions(executions);
});

test('mixed Float arithmetic and comparisons preserve values, effects and positioned faults on generated targets', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const both = [
    'io := import "core/io"; io.outputLine(1.5 + 2.5, 1.5 - 2.5, 1.5 * 2.5, 1.5 / 2.5);',
    'io := import "core/io"; io.outputLine(2 + 0.5, 0.5 + 2, 2 - 0.5, 0.5 - 2, 2 * 0.5, 0.5 * 2, 2 / 0.5, 0.5 / 2);',
    'io := import "core/io"; var x := 2; var y := 0.25; io.outputLine(x + y * 2, (x + y) * 2, -(x / y), +y);',
    'io := import "core/io"; io.outputLine(-0.0 * 2, 1e-300 * 1e-30, 5e-324 / 2, 5e-324 * 2, 1e308 / 1e308);',
    'io := import "core/io"; io.outputLine(9223372036854775807 + 0.0, -9223372036854775808 / 1.0);',
    'io := import "core/io"; io.outputLine(2 < 2.5, 2.5 > 2, 2 == 2.0, 2.0 =!= 3, 2 <! 2.0, 2.0 >! 2, 2 <!= 1.0, 1.0 >!= 2);',
    'io := import "core/io"; io.outputLine(9007199254740992.0 == 9007199254740993 > 9007199254740992, 9007199254740992 < 9007199254740993 == 9007199254740992.0);',
    'io := import "core/io"; io.outputLine(3.5 < 2 < (1.0 / 0.0), 1 < 2.5 < 3, 3 > 2.5 > 1);',
    'io := import "core/io"; var x := 0.0; var n := 0; loop n < 3 { x = x + 0.5; n = n + 1; } io.outputLine(x);',
    'io := import "core/io"; if false { io.outputLine(1.0 / 0); } loop false { io.outputLine(1e308 * 2); } io.outputLine(false and (1.0 / 0 > 1), true or (1e308 * 2 > 1));',
    'io := import "core/io"; io.outputLine(1.0 < 2.0, 2.0 == 2.0, 3.0 > 2.0);',
  ];
  const tsOnly = [
    'io := import "core/io"; echo := fn(n: Float): Float { io.outputLine("call", n); n } io.outputLine(echo(1.5) + echo(2.5) * echo(3.5));',
    'io := import "core/io"; i := fn(): Int { io.outputLine("int"); 2 } f := fn(): Float { io.outputLine("float"); 0.5 } io.outputLine(i() / f(), f() - i());',
    'io := import "core/io"; echo := fn(n: Float): Float { io.outputLine("call", n); n } io.outputLine(1 < echo(2.5) < 3, echo(3.5) < 2 < echo(1.5));',
    'io := import "core/io"; f := fn(n: Int, x: Float): Float { n * x + 0.25 } p := (value = f(2, 0.5)); values: List<Float> = [p.value, f(3, 0.5)]; io.outputLine(p, values);',
  ];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
    if (targets.length === 1) { const c = compileTarget('c', { text }); assert.equal(c.status, 2, text); assert.equal(c.stdout.length, 0); }
  }
  const faults = [
    'io.outputLine(1.0 / 0);', 'io.outputLine(1 / -0.0);', 'io.outputLine(0.0 / 0.0);',
    'io.outputLine(1e308 + 1e308);', 'io.outputLine(-1e308 - 1e308);', 'io.outputLine(1e308 * 2);',
    'io.outputLine(1e308 / 1e-308);', 'io.outputLine((1.0 / 0) + (1e308 * 2));',
    'io.outputLine((1e308 * 2) < (1.0 / 0));', 'io.outputLine(1.0, 1.0 / 0);',
    'var zero := 0.0; io.outputLine(1 / zero);',
  ];
  for (const source of faults) {
    const text = 'io := import "core/io"; io.outputLine("before");\r\n' + source, name = 'mixed-float سلام.lts';
    const expected = expectedText(text, { name }); assert.equal(expected.status, 1, text);
    assert.equal(expected.stdout.toString(), 'before\n');
    assert.match(expected.stderr.toString(), /^mixed-float سلام\.lts:2:\d+: ArithmeticPanic: (division by zero|non-finite floating value)\n$/);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  for (const source of ['io.outputLine(1.5 % 2);', 'io.outputLine(1 :/ 2.5);', 'io.outputLine(1.5 :% 2.5);',
    'io.outputLine(1.5 + "x");', 'io.outputLine(true * 1.5);', 'io.outputLine(Unit / 1.5);',
    'io.outputLine(1.5 < "x");', 'io.outputLine(1 < 2.5 < true);', 'var x: Int = 1.5 + 2;']) {
    const text = 'io := import "core/io"; io.outputLine("before"); ' + source;
    const expected = expectedText(text); assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) { const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text); }
  }
  {
    const text = 'io := import "core/io"; io.outputLine(io.inputInt("int? ") / io.inputFloat("float? "));', stdin = '3 2.0', expected = expectedText(text, { stdin });
    assert.equal(expected.status, 0); assert.equal(expected.stdout.toString(), 'int? float? 1.5\n');
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text });
  }
  assertExecutions(executions);
});

test('power preserves right association and explicit negative-base grouping', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const both = [
    'io := import "core/io"; io.outputLine(2 ** 3, 2 ** 3 ** 2, (2 ** 3) ** 2, 2 ** (3 ** 2));',
    'io := import "core/io"; io.outputLine(4 ** 0.5, 2.5 ** 2, 2 ** 3.0, 1.5 ** 2.0);',
    'io := import "core/io"; io.outputLine(1.1 ** 3, 10 ** 0.1, 27 ** (1.0 / 3.0), 0.1 ** 0.2);',
    'io := import "core/io"; io.outputLine((-2) ** 2, (-2) ** 3, -(2 ** 2), +(-2) ** 2, (- /* c */ 2) ** 3);',
    'io := import "core/io"; io.outputLine(2 ** 3 * 2, 2 * 3 ** 2, 2 ** (3 * 2), 1 + 2 ** 3 * 2, (1 + 2) ** 2);',
    'io := import "core/io"; var base := 2; var exponent := 3; var value: Float = base ** exponent; io.outputLine(value, value + 0.5, value == 8);',
    'io := import "core/io"; io.outputLine(0 ** 2, (-0.0) ** 3, 1e-200 ** 2, 9223372036854775807 ** 1);',
    'io := import "core/io"; if false { io.outputLine(2 ** 0); } loop false { io.outputLine(2 ** -1); } io.outputLine(false and (2 ** 0 > 1), true or (1e308 ** 2 > 1), 3 < 2 < 2 ** 0);',
    'io := import "core/io"; var n := 1; loop n <= 3 { io.outputLine(2 ** n); n = n + 1; }',
  ];
  const tsOnly = [
    'io := import "core/io"; echo := fn(n: Int): Int { io.outputLine("call", n); n } io.outputLine(echo(2) ** echo(3) ** echo(2));',
    'io := import "core/io"; f := fn(base: Float, exponent: Int): Float { base ** exponent } p := (n = f(2.5, 2)); xs: List<Float> = [p.n, f(1.5, 2)]; io.outputLine(p, xs);',
    'io := import "core/io"; unused := fn(): Float { 2 ** 0 } f := fn(flag: Bool): Float { if flag { return 2 ** 3; } 3 ** 2 } io.outputLine(f(true), f(false));',
  ];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
    if (targets.length === 1) { const c = compileTarget('c', { text }); assert.equal(c.status, 2, text); assert.equal(c.stdout.length, 0); }
  }
  for (const source of ['io.outputLine(1e308 ** 2);', 'io.outputLine((-2) ** 0.5);']) {
    const text = 'io := import "core/io"; io.outputLine("before");\r\n' + source, name = 'power سلام.lts', expected = expectedText(text, { name });
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.toString(), 'before\n');
    assert.match(expected.stderr.toString(), /^power سلام\.lts:2:\d+: ArithmeticPanic: non-finite floating value\n$/);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  for (const source of ['io.outputLine(-2 ** 2);', 'io.outputLine(- /* c */ 2 ** 3);', 'base := 2; io.outputLine(-base ** 2);',
    'io.outputLine((-2 ** 2));', 'io.outputLine(-(2) ** 2);', 'io.outputLine(2 ** -1 ** 2);',
    'io.outputLine("x" ** 2);', 'io.outputLine(2 ** false);', 'io.outputLine(Unit ** 2);',
    'var x: Int = 2 ** 3;', 'io.outputLine(2 *** 3);', 'io.outputLine(2 **);', 'io.outputLine(** 2);',
    'var x := 2; x **= 2;', 'io.outputLine(2 ^ 3);']) {
    const text = 'io := import "core/io"; io.outputLine("before"); ' + source, expected = expectedText(text);
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) { const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text); }
  }
  // The selected grammar forbids using identity + to conceal an ungrouped negative base.
  // T00 still admits these forms; its admission is not the selected syntax rule.
  for (const source of ['+-2 ** 2', '+ - /* c */ 2 ** 3', '+-+2 ** 2']) {
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text: 'io := import "core/io"; io.outputLine("before"); io.outputLine(' + source + ');' });
      assert.equal(compiled.status, 2, source); assert.equal(compiled.stdout.length, 0, source);
      assert.match(compiled.stderr.toString(), /group a negative power base/);
    }
  }
  {
    const text = 'io := import "core/io"; io.outputLine(io.inputInt("base? ") ** io.inputFloat("exponent? "));', stdin = '4 0.5', expected = expectedText(text, { stdin });
    assert.equal(expected.status, 0); assert.equal(expected.stdout.toString(), 'base? exponent? 2\n');
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text });
  }
  assertExecutions(executions);
});

test('power accepts zero and negative exponents and panics on zero to a negative power', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const success = 'io := import "core/io"; var e := -1; io.outputLine(2 ** 0, 0 ** 0, 2 ** -0.0, 2 ** -3, (-2) ** -3, (-2) ** -4, 4 ** e, 2 ** (2 ** 0)); if false { io.outputLine(0 ** -1); }';
  const faults = ['io.outputLine(0 ** -1, "after");', 'var base := 0; var exponent := -2; io.outputLine(base ** exponent);'];
  for (const target of ['ts', 'c'] as const) {
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    const run = (source: string) => {
      const compiled = compileTarget(target, { text: source, name: 'power-case.lts' });
      assert.equal(compiled.status, 0, compiled.stderr.toString());
      return target === 'ts' ? runTsArtifact(compiled.stdout.toString()) : runCArtifact(compiled.stdout.toString());
    };
    const result = run(success);
    assert.equal(result.status, 0, result.stderr.toString());
    assert.equal(result.stdout.toString(), '1 1 1 0.125 -0.125 0.0625 0.25 2\n');
    for (const source of faults) {
      const result = run('io := import "core/io"; io.outputLine("before");\n' + source);
      assert.equal(result.status, 1);
      assert.equal(result.stdout.toString(), 'before\n');
      assert.match(result.stderr.toString(), /^power-case\.lts:2:\d+: ArithmeticPanic: zero cannot be raised to a negative power\n$/);
    }
  }
  const effects = 'io := import "core/io"; f := fn(n: Int): Int { io.outputLine(n); n } io.outputLine(f(0) ** f(-1), f(9));';
  const compiled = compileTarget('ts', { text: effects, name: 'power-effects.lts' });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const result = runTsArtifact(compiled.stdout.toString());
  assert.equal(result.status, 1);
  assert.equal(result.stdout.toString(), '0\n-1\n');
  assert.match(result.stderr.toString(), /ArithmeticPanic: zero cannot be raised to a negative power\n$/);
  const throughFunction = 'io := import "core/io"; power := fn(base: Float, exponent: Int): Float { base ** exponent } value: Float = power(2, -3); io.outputLine(value, power(9, 0), power(4, -1));';
  const functionArtifact = compileTarget('ts', { text: throughFunction });
  assert.equal(functionArtifact.status, 0, functionArtifact.stderr.toString());
  const functionResult = runTsArtifact(functionArtifact.stdout.toString());
  assert.equal(functionResult.status, 0, functionResult.stderr.toString());
  assert.equal(functionResult.stdout.toString(), '0.125 1 0.25\n');
});

test('Int64, Float64 and Double normalize across admitted numeric annotations and contracts', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const both = [
    'io := import "core/io"; i: Int64 = 5; f: Float64 = 2.5; d: Double = 3.5; io.outputLine(i, f, d);',
    'io := import "core/io"; i: Int64; f: Float64; d: Double; io.outputLine(i, f, d);',
    'io := import "core/io"; var i: Int64 = 2; var f: Double = 0.5; i = i + 1; f = i * f; io.outputLine(i, f);',
    'io := import "core/io"; Count := type Int64; SavedCount := type Count; Amount := type Double; a: SavedCount = 7; b: Amount = 0.25; io.outputLine(a, b, a + b);',
    'io := import "core/io"; var i: Int64 = 7; { i: Int64 = -i; io.outputLine(i); } io.outputLine(i);',
    'io := import "core/io"; low: Int64 = -9223372036854775808; high: Int64 = 9223372036854775807; io.outputLine(low, high);',
    'io := import "core/io"; var total: Float64 = 0.0; var n: Int64 = 0; loop n < 3 { total = total + 0.5; n = n + 1; } io.outputLine(total);',
    'io := import "core/io"; x: Double = 2 ** 3; io.outputLine(x, x == 8, x / 2);',
  ];
  const tsOnly = [
    'io := import "core/io"; f := fn(n: Int64, x: Float64): Double { n * x } io.outputLine(f(3, 0.5));',
    'io := import "core/io"; Count := type Int64; Amount := type Float64; f := fn(n: Count, x: Amount): Double { if n > 0 { return x; } -x } io.outputLine(f(2, 0.5), f(0, 0.5));',
    'io := import "core/io"; p: (i: Int64, f: Double) = (i = 2, f = 0.5); io.outputLine(p, p.i, p.f);',
    'io := import "core/io"; Pair := type (i: Int64, f: Float64); f := fn(p: Pair): Double { p.i * p.f } p: Pair = (i = 3, f = 0.5); io.outputLine(f(p));',
    "list := import \"core/list\"; io := import \"core/io\"; xs: mut List<Int64> = [1, 2]; ys: List<Float64> = [0.5, 1.5]; list.pushBack(mut xs, 3); io.outputLine(xs, ys, xs[1]);",
  ];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
    if (targets.length === 1) { const c = compileTarget('c', { text }); assert.equal(c.status, 2, text); assert.equal(c.stdout.length, 0); }
  }
  const invalid = ['var x: Int64 = "x";', 'var x: Float64 = false;', 'var x: Double = Unit;',
    'var x: Int64 = 0.5;', 'var x: Int64 = 2 ** 3;', 'var x: Double = 0.5; x = true;',
    'f := fn(n: Int64): Int64 { n } io.outputLine(f(0.5));',
    'f := fn(n: Double): Double { n } i: Int64 = 2; io.outputLine(f(i));',
    'var x: Int64 = 9223372036854775808;', 'var x: Float64 = 1e309;',
    'x: List<Int64> = [0.5];', 'x: (n: Int64) = (n = 0.5);'];
  for (const source of invalid) {
    const text = 'io := import "core/io"; io.outputLine("before"); ' + source, expected = expectedText(text);
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) { const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text); }
  }
  for (const source of ['var x: Int64 = 9223372036854775807; io.outputLine(x + 1);',
    'var x: Double = 1e308; io.outputLine(x * 2);']) {
    const text = 'io := import "core/io"; io.outputLine("before");\r\n' + source, name = 'numeric-alias سلام.lts', expected = expectedText(text, { name });
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.toString(), 'before\n');
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  for (const target of ['ts', 'c'] as const) {
    const alias = compileTarget(target, { text: 'io := import "core/io"; i: Int64 = 2; f: Float64 = 0.5; d: Double = 1.5; io.outputLine(i, f, d);' });
    const canonical = compileTarget(target, { text: 'io := import "core/io"; i: Int = 2; f: Float = 0.5; d: Float = 1.5; io.outputLine(i, f, d);' });
    assert.equal(alias.status, 0); assert.equal(canonical.status, 0); assert.deepEqual(alias.stdout, canonical.stdout);
  }
  {
    const text = 'io := import "core/io"; i: Int64 = io.inputInt("int? "); f: Double = io.inputFloat("float? "); io.outputLine(i * f);', stdin = '3 0.5', expected = expectedText(text, { stdin });
    assert.equal(expected.status, 0); assert.equal(expected.stdout.toString(), 'int? float? 1.5\n');
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text });
  }
  assertExecutions(executions);
});

test('Float contexts admit exact integer literals without widening values or changing binary arithmetic', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') { context.skip('LITE_SKIP_HEAVY=1'); return; }
  const executions: ArtifactExecution[] = [];
  const both = [
    'io := import "core/io"; f: Float = 2; d: Double = -3; g: Float64 = (4); io.outputLine(f, d, g);',
    'io := import "core/io"; a: Float = 9007199254740992; b: Float = 9007199254740994; c: Float = 18014398509481984; d: Float = -9223372036854775808; io.outputLine(a, b, c, d);',
    'io := import "core/io"; a: Float = ((-9007199254740992)); b: Float = (/* before */ 2 /* after */); io.outputLine(a, b);',
    'io := import "core/io"; var f: Float = 2; f = -4; io.outputLine(f); f = ((8)); io.outputLine(f);',
    'io := import "core/io"; f: Float = 2; g: Float = f; io.outputLine(f, g);',
    'io := import "core/io"; f: Float = 9007199254740993 + 0.5; g: Float = (9007199254740993) + 0.5; io.outputLine(f, g);',
    'io := import "core/io"; var f: Float = 2; loop f < 5 { f = f + 1; } io.outputLine(f);',
    'io := import "core/io"; Amount := type Double; var f: Amount = 2; f = (4); io.outputLine(f);',
    'io := import "core/io"; f: Float = (2.0 + 3.0); g: Float = -(2.5); io.outputLine(f, g);',
    'io := import "core/io"; f: Float = (-9007199254740993) * 0.5; io.outputLine(f);',
  ];
  const tsOnly = [
    'io := import "core/io"; f := fn(n: Float): Float { n } io.outputLine(f(2), f(-3), f((4)));',
    'io := import "core/io"; f := fn(): Float { 2 } g := fn(): Double { ((-3)) } io.outputLine(f(), g());',
    'io := import "core/io"; f := fn(flag: Bool): Float { if flag { return 2; } return 3; } io.outputLine(f(true), f(false));',
    'io := import "core/io"; f := fn(): Float { 9007199254740993; 2 } io.outputLine(f());',
    'io := import "core/io"; xs: List<Float> = [1, -2, 9007199254740994]; io.outputLine(xs);',
    'io := import "core/io"; p: (n: Float, m: Double) = (n = 2, m = -3); io.outputLine(p);',
    'io := import "core/io"; Pair := type (n: Float); f := fn(): Pair { (n = 2) } io.outputLine(f());',
    'io := import "core/io"; var flag := true; f: Float = if flag{2}else{3.5}; io.outputLine(f);',
    'io := import "core/io"; var flag := false; f: Float = (if (if flag{true}else{false}) {2}else if false{3}else{4.5}); io.outputLine(f);',
    'io := import "core/io"; xs: List<(n: Float)> = [(n = 2), (n = -3)]; io.outputLine(xs);',
    'io := import "core/io"; f := fn(n: Float): Float { n } io.outputLine(f(if true{2}else{3.5}));',
    'io := import "core/io"; f: Float = (if true{9007199254740993}else{2}) + 0.5; io.outputLine(f);',
    'io := import "core/io"; f: Float = if true{2}else{3} + 0.5; io.outputLine(f);',
    'io := import "core/io"; io.outputLine(if true{12}else{34}); x := if true {1}else {2} +3; io.outputLine(x);',
  ];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
    if (targets.length === 1) { const c = compileTarget('c', { text }); assert.equal(c.status, 2, text); assert.equal(c.stdout.length, 0); }
  }
  const invalid = ['f: Float = 9007199254740993;', 'f: Float = -9007199254740993;',
    'f: Float = 18014398509481986;', 'f: Float = 9223372036854775807;', 'f: Float = 9223372036854775808;',
    'i := 2; f: Float = i;', 'f: Float = 2 + 3;', 'f: Float = (2) + 3;', 'f: Float = 2 + (3);', 'f: Float = (2 + 3);',
    'f: Float = +2;', 'f: Float = -(2);', 'f := fn(): Float { 2 + 3 } io.outputLine(f());',
    'f := fn(n: Float): Float { n } io.outputLine(f(2 + 3));',
    'xs: List<Float> = [1 + 1];', 'i := 2; p: (n: Float) = (n = i);',
    'f: Float = if false{9007199254740993}else{2};', 'f := fn(): Float { 9007199254740993 }',
    'p: (n: Float) = (n = 9007199254740993);', 'io.outputLine(if true{1}else{2}+3);'];
  for (const source of invalid) {
    const text = 'io := import "core/io"; io.outputLine("before"); ' + source, expected = expectedText(text);
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) { const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text); }
  }
  for (const source of ['var f: Float = 2; io.outputLine(f / 0);', 'var f: Float = 0; io.outputLine(1 / f);',
    'var f: Float = 2; io.outputLine(f * 1e308);']) {
    const text = 'io := import "core/io"; io.outputLine("before");\r\n' + source, name = 'float-context سلام.lts', expected = expectedText(text, { name });
    assert.equal(expected.status, 1); assert.equal(expected.stdout.toString(), 'before\n');
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  // Selected completion behavior: an ordinary dead statement cannot become the function's result.
  {
    const text = 'io := import "core/io"; f := fn(): Float { return 2; 9007199254740993; } io.outputLine(f());';
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected: { status: 0, stdout: Buffer.from('2\n'), stderr: Buffer.alloc(0) }, context: text });
  }
  assertExecutions(executions);
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
    for (const path of ['igniter', 'tools', 'bin', 'config', 'compiler/tests', 'compiler/tests/references/generated', 'compiler/runtime', 'lib',
      'language/verifications', 'language/examples', 'language/samples', 'language/cases', 'docs', 'benchmark/challenges/tools', '.agents/rules']) {
      cpSync(join(root, path), join(directory, path), { recursive: true, verbatimSymlinks: true,
        filter: candidate => !/(?:\/node_modules|\/lite\.ts|\/bootstrap\.ts|\/bundle-cli\.ts|\/cli\.ts)$/.test(candidate) });
    }
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    for (const path of ['igniter/lite.ts', 'igniter/bootstrap.ts', 'igniter/cli.ts', '.git']) assert.equal(existsSync(join(directory, path)), false);
    const childEnv: NodeJS.ProcessEnv = { ...env, LITE_SKIP_NATIVE: '1' };
    delete childEnv['NODE_TEST_CONTEXT'];
    const pattern = '^L0 shared libraries|^bundle compilers reproduce|^compiler verification cases';
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern=' + pattern, ...generatedTestFiles],
      { cwd: join(directory, 'igniter'), encoding: 'utf8', env: childEnv, timeout: 60000 });
    assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /L0 shared libraries have direct bootstrap tests/);
    assert.match(result.stdout, /bundle compilers reproduce every compiler case/);
    assert.match(result.stdout, /compiler verification cases are well-formed/);
    assert.match(result.stdout, /# fail 0/); assert.doesNotMatch(result.stdout, /ERR_MODULE_NOT_FOUND|T00 reference/);
    for (const args of [['--fast', '--full'], ['--reference'], ['--unknown']]) {
      const rejected = spawnSync(join(directory, 'bin/lite'), ['test', ...args], { encoding: 'utf8', env, timeout: 5000 });
      assert.equal(rejected.status, 2); assert.match(rejected.stderr, /Usage:/); assert.equal(rejected.stdout, '');
    }
    const legacy = spawnSync(join(directory, 'bin/lite'), ['test', '--reference'], { encoding: 'utf8', env, timeout: 10000 });
    assert.equal(legacy.status, 2); assert.match(legacy.stderr, /Usage:/); assert.equal(legacy.stdout, '');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('partial conditionals default declarations to zero and skip false assignments', () => {
  const condPartial = readFileSync(join(root, 'language/verifications/features/control/branching/partial-conditionals.lts'), 'utf8');
  const tsCond = compileTs({ text: condPartial });
  assert.equal(tsCond.status, 0, tsCond.stderr.toString());
  const runCond = runTsArtifact(tsCond.stdout.toString());
  assert.equal(runCond.phase, 'run'); assert.equal(runCond.status, 0);
  assert.equal(runCond.stdout.toString(), '0\n[]\n10\n3\n');

  const tsRich = [
    'io := import "core/io";',
    'flag := false;',
    'other := true;',
    'a := (if flag { 5 } else if other { 9 });',
    'b: Float = if flag { 1 };',
    'c := if flag { "x" };',
    'd := if flag { [1, 2] };',
    'e := if flag { (x = 4, ok = true) };',
    'var f := if flag { true };',
    'f = ((if flag { false }));',
    'var g := 10;',
    'g = if flag { 1 } else if not other { 2 };',
    'io.outputLine(a, b, "[" + c + "]", d, e.x, e.ok, f, g);',
    'g = if flag { 1 } else if other { 42 };',
    'io.outputLine(g);',
  ].join('\n');
  const compiledRich = compileTs({ text: tsRich });
  assert.equal(compiledRich.status, 0, compiledRich.stderr.toString());
  const runRich = runTsArtifact(compiledRich.stdout.toString());
  assert.equal(runRich.phase, 'run'); assert.equal(runRich.status, 0);
  assert.equal(runRich.stdout.toString(), '9 0 [] [0, 0] 0 false false 10\n42\n');

  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const cSource = [
      'io := import "core/io";',
      'flag := false;',
      'other := true;',
      'var count := 10;',
      'count = if flag { 7 };',
      'io.outputLine(count);',
      'count = (if flag { 1 } else if other { 3 });',
      'io.outputLine(count);',
    ].join('\n');
    const c = compileTarget('c', { text: cSource });
    assert.equal(c.status, 0, c.stderr.toString());
    const native = runCArtifact(c.stdout.toString());
    assert.equal(native.phase, 'run', native.stderr.toString()); assert.equal(native.status, 0);
    assert.equal(native.stdout.toString(), '10\n3\n');
  }

  for (const [bad, expectedMessage] of [
    ['io := import "core/io"; flag := false; io.outputLine(if flag { 1 });', /value if requires a final else/],
    ['flag := false; x := (if flag { 1 }) + 2;', /value if requires a final else/],
    ['flag := false; var count := 0; count = (if flag { 1 }) + 2;', /value if requires a final else/],
    ['f := fn(flag: Bool): Int { return if flag { 1 }; }', /value if requires a final else/],
    ['flag := false; x := if flag { Unit };', /cannot declare a Unit local x/],
    ['flag := false; var count := 0; count = if flag { "bad" };', /cannot assign String to Int local count/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage);
  }
});

test('statement-bearing value blocks and Unit tails preserve lexical scope and types', () => {
  const source = [
    'io := import "core/io";',
    'y := 100;',
    'x := { y := 2; y * 3;;;; };',
    'a := if true { y := 2; y * 3 } else { 0 };',
    'b := if false { 1 } else if true { var z: Int = 4; z = z + 5; z } else { 0 };',
    'c: Float = { k := 2; 1 };',
    'io.outputLine(y, x, a, b, c);',
    'io.outputLine({ x := 3; });',
    'io.outputLine({});',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString()); assert.equal(actual.status, 0);
  assert.equal(actual.stdout.toString(), '100 6 6 9 1\nUnit\nUnit\n');

  for (const [bad, expectedMessage] of [
    ['y := { x := 3; };', /cannot declare a Unit local y/],
    ['y := {};', /cannot declare a Unit local y/],
    ['io := import "core/io"; io.outputLine({ 1 2 });', /expected ; or \}/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage);
  }

  const cRejected = compileTarget('c', { text: 'io := import "core/io"; x := { y := 2; y * 3 }; io.outputLine(x);' });
  assert.equal(cRejected.status, 2);
  assert.match(cRejected.stderr.toString(), /C backend does not support statement-bearing value blocks yet/);
});

test('tuple shapes support unnamed/mixed/singleton, shorthand, positional reads, destructuring, receiving labels, and __proto__', () => {
  const source = [
    'io := import "core/io";',
    'kind := "number";',
    'token := (=kind, value = 12);',
    'io.outputLine(token.kind, token.value);',
    'mixed := (1, name = "first", false);',
    'io.outputLine(mixed.0, mixed.name, mixed.2);',
    'stored := (r = 20, l = 10);',
    'renamed: (l: Int, r: Int) = stored;',
    'io.outputLine(renamed.l, renamed.r);',
    'pos := (x = 1, y = 2);',
    'io.outputLine(pos.0);',
    '(a, b) := (1, 2);',
    'var (c, d) := (10, 20);',
    'c = c + 1;',
    'io.outputLine(a + b, c, d);',
    'io.outputLine(Unit, (), (1,), (1, 2), (1, left = 2, right = 3, 4));',
    'p := (__proto__ = 7);',
    'io.outputLine(p.__proto__, p);',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString()); assert.equal(actual.status, 0);
  assert.equal(
    actual.stdout.toString(),
    'number 12\n1 first false\n20 10\n1\n3 11 20\nUnit Unit (1,) (1, 2) (1, left=2, right=3, 4)\n7 (__proto__=7,)\n',
  );

  for (const [bad, expectedMessage] of [
    ['A := type ();', /tuple type needs at least one field/],
    ['x: (Int, String) = (1, 2);', /cannot initialize \(Int, String\) with \(Int, Int\)/],
    ['(a, b) := 1;', /tuple destructuring requires a tuple value/],
    ['(a, b) := (1, 2, 3);', /tuple destructuring expected 2 fields, got 3/],
    ['io := import "core/io"; p := (1, 2); io.outputLine(p.2);', /tuple has no field 2/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage);
  }
});

test('fixed arrays support inferred/explicit extents, aliases, functions, zero values, dot/bracket/loop access, and List tail distinction', () => {
  const source = [
    'io := import "core/io";',
    'Pair := type [Int; 2];',
    'make := fn(): [Int; 2] { [1, 2] }',
    'sum := fn(a: Pair): Int { a[0] + a.1 }',
    'inferred := [10, 20, 30];',
    'explicit: [Int; 2] = [4, 5];',
    'aliased: Pair = make();',
    'zeroed: [Int; 3];',
    'emptyArr: [Int; 0] = [];',
    'emptyZero: [Int; 0];',
    'var total := 0;',
    'loop inferred as item { total = total + item; }',
    'io.outputLine(inferred[0], inferred.2, sum(explicit), aliased, zeroed, emptyArr, emptyZero, total);',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString()); assert.equal(actual.status, 0);
  assert.equal(actual.stdout.toString(), '10 30 9 [1, 2] [0, 0, 0] [] [] 60\n');

  for (const [bad, expectedMessage] of [
    ['f := fn(): List<Int> { [1, 2] }', /cannot return \[Int; 2\] from function f returning List<Int>/],
    ['x: [Int; 3] = [1, 2];', /cannot initialize \[Int; 3\] with \[Int; 2\]/],
    ['x: [Int; 2] = [];', /cannot initialize \[Int; 2\] with \[Int; 0\]/],
    ['io := import "core/io"; a := [1, 2]; io.outputLine(a.2);', /array index 2 out of bounds/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage);
  }
});

test('mutability and lists support inferred mut/var mut, front/back ops, List<Unit>, tuple copies, and rejections', () => {
  const source = [
    'io := import "core/io";',
    'list := import "core/list";',
    'values: mut List<Int> = [1, 2];',
    'push_front(mut values, 0);',
    'list.pushBack(mut values, 3);',
    'front := pop_front(mut values);',
    'back := list.popBack(mut values);',
    'list.pushFront(mut values, 9);',
    'front2 := list.popFront(mut values);',
    'io.outputLine(front, back, front2, values);',
    'mut args := io.inputArgs();',
    'push_back(mut args, "z");',
    'var mut other := io.inputArgs();',
    'other = io.inputArgs();',
    'push_front(mut other, "a");',
    'io.outputLine(args, other);',
    'units: mut List<Unit> = [Unit];',
    'push_back(mut units, Unit);',
    'io.outputLine(pop_front(mut units), pop_back(mut units), units);',
    'tuples: mut List<(name: String, n: Int)> = [(name = "a", n = 1)];',
    'item := pop_back(mut tuples);',
    'io.outputLine(item.name, item.n, tuples);',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString()); assert.equal(actual.status, 0);
  assert.equal(
    actual.stdout.toString(),
    '0 3 9 [1, 2]\n[z] [a]\nUnit Unit []\na 1 []\n',
  );

  // Empty pop_front and pop_back on List<Unit> raise BoundPanic.
  for (const op of ['pop_front', 'pop_back']) {
    const panicSrc = [
      'io := import "core/io";',
      'empty: mut List<Unit> = [];',
      `io.outputLine(${op}(mut empty));`,
    ].join('\n');
    const panicCompiled = compileTs({ text: panicSrc });
    assert.equal(panicCompiled.status, 0, panicCompiled.stderr.toString());
    const panicRun = runTsArtifact(panicCompiled.stdout.toString());
    assert.equal(panicRun.status, 1);
    assert.match(panicRun.stderr.toString(), new RegExp(`BoundPanic.*${op} on an empty list`));
  }

  for (const [bad, expectedMessage] of [
    ['mut x := 1;', /mut requires a List value, got Int/],
    ['var mut x: List<Int> = [];', /var mut cannot be combined with explicit type annotation/],
    ['values: mut List<Int> = [1]; pop_front(values);', /pop_front requires mut list argument/],
    ['values: mut List<Int> = [1]; push_front(values, 2);', /push_front requires mut list argument/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage);
  }
});

test('storage and updates support compound assignments, zero init, reserved storage, control-flow joins, and rejections', () => {
  const source = [
    'io := import "core/io";',
    'var n := 10;',
    'n += 5; n -= 3; n *= 2; n /= 4; n %= 3;',
    'var f := -7;',
    'f :/= 2; f :%= 3;',
    'var s := "a";',
    's += "b";',
    'var fl := 1.5;',
    'fl += 2;',
    'z0: (:Int, :String) = 0;',
    'z1: [Int; 2] = 0;',
    'r: Int = ?;',
    'r = 42;',
    'c: Int = ?;',
    'if n == 0 { c = 10; } else { c = 20; }',
    'io.outputLine(n, f, s, fl, z0.0, z0.1, z1, r, c);',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString()); assert.equal(actual.status, 0);
  assert.equal(actual.stdout.toString(), '0 2 ab 3.5 0  [0, 0] 42 10\n');

  for (const [bad, expectedMessage] of [
    ['io := import "core/io"; a: Int = ?; io.outputLine(a);', /cannot read uninitialized local a/],
    ['a: Int = ?; a = 1; a = 2;', /cannot assign to immutable local a/],
    ['a: Int = ?; if true { a = 1; } a = 2;', /cannot assign to possibly initialized immutable local a/],
    ['io := import "core/io"; a: Int = ?; if true { a = 1; } io.outputLine(a);', /cannot read uninitialized local a/],
    ['io := import "core/io"; a: Int = ?; loop false { a = 1; } io.outputLine(a);', /cannot read uninitialized local a/],
    ['x := 1; x += 2;', /cannot assign to immutable local x/],
    ['x: (:Int);', /unnamed singleton tuple type needs trailing comma/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage);
  }
});

test('call routing supports named, positional, shorthand, replacement, recursion, trailing commas, module functions, and rejections', () => {
  const source = [
    'io := import "core/io";',
    'step := fn(label: String, n: Int): Int { io.outputLine(label, n); n };',
    'tag := fn(label: String): String { io.outputLine(label); label };',
    'digits := fn(a: Int, b: Int, c: Int): Int { a * 100 + b * 10 + c };',
    'a := 5; b := 2; c := 6;',
    'r1 := digits(c = 3, 1, =b);',
    'r2 := digits(9, a = 1, 2, 3,);',
    'r3 := digits(tag("skip"), 2, a = step("keep", 1), c = step("tail", 3));',
    'r4 := digits(tag("over"), 2, =a, =c,);',
    'logUnit := fn(x: Int, y: String): Unit { io.outputLine(x, y); };',
    'logUnit(y = "done", 7,);',
    'sumDown := fn(n: Int, total: Int): Int {',
    '  if n == 0 { total } else { self(total = total + n, n = n - 1) }',
    '};',
    'length := fn(text: String): Int { 4 };',
    'io.outputLine(r1, r2, r3, r4, sumDown(4, 0), length(text = "abcd"));',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.equal(actual.status, 0, actual.stderr.toString());
  assert.equal(actual.stdout.toString(), 'skip\nkeep 1\ntail 3\nover\n7 done\n123 123 123 526 10 4\n');

  const directory = mkdtempSync(join(tmpdir(), 'lite-call-routing-'));
  try {
    const appPath = join(directory, 'app.lts');
    const modPath = join(directory, 'mod.lts');
    writeFileSync(modPath, 'pub pick := fn(a: Int, b: Int, c: Int): Int { a * 100 + b * 10 + c }\n');
    writeFileSync(appPath, 'io := import "core/io"; m := import "./mod.lts"; b := 2; io.outputLine(m.pick("x", 9, a = 1, =b, 3,));\n');
    const modCompiled = compileTs({ text: readFileSync(appPath, 'utf8'), name: realpathSync(appPath) });
    assert.equal(modCompiled.status, 0, modCompiled.stderr.toString());
    const modRun = runTsArtifact(modCompiled.stdout.toString());
    assert.equal(modRun.phase, 'run');
    assert.equal(modRun.status, 0, modRun.stderr.toString());
    assert.equal(modRun.stdout.toString(), '123\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }

  for (const [bad, expectedMessage] of [
    ['f := fn(a: Int, b: Int): Int { a + b }; f(a = 1, a = 2, b = 3);', /duplicate named argument a/],
    ['f := fn(a: Int, b: Int): Int { a + b }; a := 1; f(a = 1, =a, b = 3);', /duplicate named argument a/],
    ['f := fn(a: Int, b: Int): Int { a + b }; f(1, z = 2);', /unknown parameter z/],
    ['f := fn(a: Int, b: Int, c: Int): Int { a + b + c }; f(c = 3, 1);', /function f expects 3 arguments, got 2/],
    ['f := fn(a: Int, b: Int): Int { a + b }; f(1, 2, 3);', /function f expects 2 arguments, got more/],
    ['f := fn(a: Int, b: Int): Int { a + b }; f(a = 1, 2, 3);', /function f expects 2 arguments, got more/],
    ['f := fn(a: Int, b: Int): Int { a + b }; b := 2; f(1, =b + 1);', /shorthand argument requires a bare identifier/],
    ['f := fn(a: Int, b: Int): Int { a + b }; f(1, b = "two");', /must be Int, got String/],
    ['f := fn(a: Int, b: Int): Int { a + b }; f("superseded", a = "bad", 2);', /must be Int, got String/],
    ['io := import "core/io"; io.inputInt(prompt = "n: ");', /named arguments are not supported for host function io\.inputInt/],
    ['io := import "core/io"; text := "hi"; io.errorLine(=text);', /named arguments are not supported for host function io\.errorLine/],
    ['text := import "core/text"; text.length(s = "hi");', /named arguments are not supported for host function text\.length/],
    ['text := import "core/text"; text.trim(s = "hi");', /unknown parameter s in call to text\.trim/],
    ['io := import "core/io"; var x := 0; io.outputLine(x = 1);', /expected \)/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage, bad + ' -> ' + rejected.stderr.toString());
  }
});

test('out local hygiene avoids main accumulator collisions at root, nested, and imported module scopes', () => {
  const source = [
    'io := import "core/io";',
    'out := "ok";',
    'io.outputLine(out);',
    '{ var out := "a"; out += "b"; io.outputLine(out); }',
    'laterOut := fn(): Int { deferredOut };',
    'deferredOut := 7;',
    'f := fn(): Int { out2 };',
    'out2 := 9;',
    'io.outputLine(laterOut(), f());',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const tsOut = compiled.stdout.toString();
  assert(tsOut.includes('const lite_out = "ok";'));
  assert(tsOut.includes('let lite_out$2 = "a";'));
  assert(tsOut.includes('return lite$out;'));
  const actual = runTsArtifact(tsOut);
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.equal(actual.status, 0, actual.stderr.toString());
  assert.equal(actual.stdout.toString(), 'ok\nab\n7 9\n');

  const rootOutDeferred = [
    'io := import "core/io";',
    'readOut := fn(): Int { out };',
    'out := 17;',
    'io.outputLine(readOut());',
  ].join('\n');
  const deferredCompiled = compileTs({ text: rootOutDeferred });
  assert.equal(deferredCompiled.status, 0, deferredCompiled.stderr.toString());
  const deferredRun = runTsArtifact(deferredCompiled.stdout.toString());
  assert.equal(deferredRun.status, 0, deferredRun.stderr.toString());
  assert.equal(deferredRun.stdout.toString(), '17\n');

  const directory = mkdtempSync(join(tmpdir(), 'lite-out-hygiene-'));
  try {
    const appPath = join(directory, 'app.lts');
    const modPath = join(directory, 'mod.lts');
    writeFileSync(modPath, 'pub readK := fn(): Int { K }\npub K := 9;\npub out := "mod-out";\n');
    writeFileSync(appPath, 'io := import "core/io"; m := import "./mod.lts"; out := "root-out"; io.outputLine(m.readK(), m.out, out);\n');
    const modCompiled = compileTs({ text: readFileSync(appPath, 'utf8'), name: realpathSync(appPath) });
    assert.equal(modCompiled.status, 0, modCompiled.stderr.toString());
    const modRun = runTsArtifact(modCompiled.stdout.toString());
    assert.equal(modRun.phase, 'run');
    assert.equal(modRun.status, 0, modRun.stderr.toString());
    assert.equal(modRun.stdout.toString(), '9 mod-out root-out\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('tuple destructuring supports empty (), grouped (x), var (x), singleton (x,), nested shadowing, value blocks, and rejections', () => {
  const source = [
    'io := import "core/io";',
    'var ticks := 0;',
    'bump := fn(): Unit { ticks += 1; };',
    '() := ();',
    '() := Unit;',
    '() := bump();',
    '(x) := 42;',
    'var (y) := 10;',
    'y += 5;',
    '(z,) := (99,);',
    '{ (a, a) := (1, 2); (_, _) := (3, 4); io.outputLine(a); }',
    'v := { () := bump(); (p) := 3; var (q) := 4; q += 1; (r, s) := (q, p * 2); r + s };',
    'io.outputLine(ticks, x, y, z, v);',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.equal(actual.status, 0, actual.stderr.toString());
  assert.equal(actual.stdout.toString(), '2\n2 42 15 99 11\n');

  for (const [bad, expectedMessage] of [
    ['() := 42;', /tuple destructuring requires Unit for \(\), got Int/],
    ['() := (1, 2);', /tuple destructuring expected 0 fields, got 2/],
    ['io := import "core/io"; () := io.exit(1);', /tuple destructuring requires Unit for \(\), got Never/],
    ['var () := ();', /var tuple destructuring needs at least one binding/],
    ['(x,) := 42;', /tuple destructuring requires a tuple value, got Int/],
    ['(x) := ();', /cannot declare a Unit local x/],
    ['io := import "core/io"; (x) := io.exit(1);', /cannot declare a Never local x/],
    ['(dup, dup) := (1, 2);', /duplicate top-level value dup/],
    ['{ var x := { () := 1; x }; }', /tuple destructuring requires Unit for \(\), got Int/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage, bad + ' -> ' + rejected.stderr.toString());
  }
});

test('Never-valued io.exit supports default status, value flow, control joins, dead-code checks, and rejections', () => {
  const defaultExit = compileTs({ text: 'io := import "core/io"; io.output("ready"); io.exit();' });
  assert.equal(defaultExit.status, 0, defaultExit.stderr.toString());
  const defaultRun = runTsArtifact(defaultExit.stdout.toString());
  assert.equal(defaultRun.phase, 'run');
  assert.equal(defaultRun.status, 0);
  assert.equal(defaultRun.stdout.toString(), 'ready');

  const topExit = compileTs({ text: 'io := import "core/io"; io.exit(0);' });
  assert.equal(topExit.status, 0, topExit.stderr.toString());
  assert(!topExit.stdout.toString().includes('return lite$out;'));
  const topRun = runTsArtifact(topExit.stdout.toString());
  assert.equal(topRun.phase, 'run');
  assert.equal(topRun.status, 0);

  const flowSource = [
    'io := import "core/io";',
    'checkNonNeg := fn(n: Int): Int {',
    '  if n < 0 { io.errorLine("neg"); io.exit(3); }',
    '  n * 2',
    '};',
    'pair := fn(a: Int, b: Int): Int { a + b };',
    'logExit := fn(): Int { io.outputLine(io.exit(7)); };',
    'choose := fn(flag: Bool): Int {',
    '  if flag { 10 } else { io.exit(4) }',
    '};',
    'pickList := fn(flag: Bool): List<Int> {',
    '  xs: List<Int> = if flag { [1] } else { [io.exit(6)] };',
    '  xs',
    '};',
    'pickPairArray := fn(flag: Bool): [Int; 2] {',
    '  if flag { [1, 42] } else { [io.exit(6), 42] }',
    '};',
    'blockBail := fn(flag: Bool): Int {',
    '  if flag { 12 } else { code := 6; io.exit(code) }',
    '};',
    'deadAfterExit := fn(flag: Bool): Int {',
    '  if flag { 15 } else { io.exit(6); 99 }',
    '};',
    'blockSemiExit := fn(flag: Bool): Int {',
    '  if flag { 16 } else { io.exit(6); }',
    '};',
    'reorderedExit := fn(flag: Bool): Int {',
    '  if flag { 5 } else { pair(b = io.exit(8), a = 2) }',
    '};',
    'mode := io.inputInt();',
    'if mode == 1 {',
    '  io.outputLine(checkNonNeg(4), choose(true), pickList(true), pickPairArray(true), blockBail(true), deadAfterExit(true), blockSemiExit(true), reorderedExit(true));',
    '  p: Int = if false { io.exit(5) };',
    '  ps: List<Int> = if false { io.exit(5) };',
    '  d: Int = ?;',
    '  if false { io.exit(2); } else { d = 33; }',
    '  io.outputLine(p, ps, d);',
    '} else if mode == 2 {',
    '  io.outputLine(checkNonNeg(-1));',
    '} else if mode == 3 {',
    '  io.outputLine(choose(false));',
    '} else if mode == 4 {',
    '  io.outputLine(logExit());',
    '} else {',
    '  io.outputLine(reorderedExit(false));',
    '}',
  ].join('\n');
  const flowCompiled = compileTs({ text: flowSource });
  assert.equal(flowCompiled.status, 0, flowCompiled.stderr.toString());
  const flowTs = flowCompiled.stdout.toString();

  withTsArtifact(flowTs, run => {
    const run1 = run({ stdin: '1\n' });
    assert.equal(run1.phase, 'run');
    assert.equal(run1.status, 0, run1.stderr.toString());
    assert.equal(run1.stdout.toString(), '8 10 [1] [1, 42] 12 15 16 5\n0 [] 33\n');

    const run2 = run({ stdin: '2\n' });
    assert.equal(run2.status, 3);
    assert.equal(run2.stderr.toString(), 'neg\n');

    const run3 = run({ stdin: '3\n' });
    assert.equal(run3.status, 4);

    const run4 = run({ stdin: '4\n' });
    assert.equal(run4.status, 7);

    const run5 = run({ stdin: '5\n' });
    assert.equal(run5.status, 8);
  });

  for (const [bad, expectedMessage] of [
    ['io := import "core/io"; _ := Unit == io.exit(3);', /cannot compare Unit values|cannot compare/],
    ['io := import "core/io"; _ := io.exit(1) == io.exit(2);', /cannot compare Never values/],
    ['io := import "core/io"; x := io.exit(1);', /cannot declare a Never local x/],
    ['io := import "core/io"; var x := io.exit(1);', /cannot declare a Never local x/],
    ['io := import "core/io"; t := (io.exit(1), 2);', /tuple field .* cannot be Never/],
    ['io := import "core/io"; xs := [io.exit(1)];', /list element 1 cannot be Never/],
    ['io := import "core/io"; x := if true { io.exit(1) };', /partial conditional declaration needs a normally completing value branch/],
    ['io := import "core/io"; io.exit(1, 2);', /function io\.exit expects 1 argument, got more/],
    ['io := import "core/io"; io.exit(1); bad: Int = "str";', /cannot initialize Int with String/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage, bad + ' -> ' + rejected.stderr.toString());
  }
});

test('unnamed loop sequence traversal supports lists, fixed arrays, empty lists, snapshots, and scope checks', () => {
  const source = [
    'io := import "core/io";',
    'list := import "core/list";',
    'xs: mut List<Int> = [10, 20, 30];',
    'var listCount := 0;',
    'loop xs { list.pushBack(mut xs, 99); listCount += 1; }',
    'arr: [String; 3] = ["a", "b", "c"];',
    'var arrCount := 0;',
    'loop arr { arrCount += 1; }',
    'empty: List<Int> = [];',
    'var emptyCount := 0;',
    'loop empty { emptyCount += 1; }',
    'io.outputLine(listCount, xs, arrCount, emptyCount);',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.equal(actual.status, 0, actual.stderr.toString());
  assert.equal(actual.stdout.toString(), '3 [10, 20, 30, 99, 99, 99] 3 0\n');

  for (const [bad, expectedMessage] of [
    ['io := import "core/io"; loop [1, 2] { io.outputLine(item); }', /unknown value item/],
    ['io := import "core/io"; x: Int = ?; loop [1, 2] as item { x = item; } io.outputLine(x);', /cannot read uninitialized local x/],
    ['loop 123 { }', /loop condition must be Bool/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage, bad + ' -> ' + rejected.stderr.toString());
  }
});

test('subjectless Boolean match supports value and statement forms in TS and action match in C', () => {
  const executions: { target: 'ts' | 'c'; artifact: string; expected: ReturnType<typeof expectedText>; context: string }[] = [];
  const tsValueSource = [
    'io := import "core/io";',
    'probe := fn(label: String, result: Bool): Bool { io.outputLine("probe:" + label); result }',
    'choose := fn(n: Int): String {',
    '    match {',
    '        probe("first", n == 1) { "one" }',
    '        probe("second", n == 2) { "two" }',
    '        _ { "other" }',
    '    }',
    '}',
    'direct := match {',
    '    false { io.exit(9) }',
    '    _ { 1 + match { true { 4 } _ { 9 } } }',
    '};',
    'grouped := (match {',
    '    (if true { false } else { true }) { (a = 10) }',
    '    _ { (a = 20) }',
    '}).a;',
    'single := match { _ { 7 } };',
    'nested := match {',
    '    (match { false { false } _ { true } }) { "nested" }',
    '    _ { io.exit(8) }',
    '};',
    'tailScore := fn(n: Int): Int {',
    '    match {',
    '        n < 0 { 10 }',
    '        n == 0 { return 20; }',
    '        _ { 30 }',
    '    }',
    '}',
    'loopMatch := fn(limit: Int): Int {',
    '    var total := 0;',
    '    var i := 0;',
    '    loop i < limit {',
    '        match {',
    '            i == 2 { break; }',
    '            _ { total += 10; }',
    '        }',
    '        i += 1;',
    '    }',
    '    total',
    '}',
    'io.outputLine(choose(1), choose(2), choose(3), direct, grouped, single, nested, tailScore(-1), tailScore(0), tailScore(5), loopMatch(5));',
  ].join('\n');
  const tsCompiled = compileTarget('ts', { text: tsValueSource });
  assert.equal(tsCompiled.status, 0, tsCompiled.stderr.toString());
  const tsRun = runTsArtifact(tsCompiled.stdout.toString());
  assert.equal(tsRun.phase, 'run');
  assert.equal(tsRun.status, 0, tsRun.stderr.toString());
  assert.equal(tsRun.stdout.toString(), [
    'probe:first',
    'probe:first',
    'probe:second',
    'probe:first',
    'probe:second',
    'one two other 5 20 7 nested 10 20 30 20',
    '',
  ].join('\n'));

  const actionSource = [
    'io := import "core/io";',
    'var total := 0;',
    'match {',
    '    false { x := 100; total += x; }',
    '    true { x := 5; total += x; }',
    '    _ { total += 1; }',
    '}',
    'match { _ { total += 2; } }',
    'out: Int = ?;',
    'match {',
    '    total > 10 { out = 99; }',
    '    _ { out = 44; }',
    '}',
    'io.outputLine(total, out);',
  ].join('\n');
  const actionExpected = { status: 0, stdout: Buffer.from('7 44\n'), stderr: Buffer.alloc(0) };
  for (const target of ['ts', 'c'] as const) {
    const compiled = compileTarget(target, { text: actionSource });
    assert.equal(compiled.status, 0, `${target}: ${compiled.stderr.toString()}`);
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    executions.push({ target, artifact: compiled.stdout.toString(), expected: actionExpected, context: actionSource });
  }
  assertExecutions(executions);

  for (const [bad, expectedMessage] of [
    ['x := match { true { 1 } };', /subjectless match requires a final _ fallback arm/],
    ['x := match { _ { 1 } true { 2 } };', /match fallback _ must be the final arm/],
    ['x := match { 1 { 2 } _ { 3 } };', /match arm condition must be Bool/],
    ['x := match { true { 1 } _ { "two" } };', /value match arms must have the same kind/],
    ['x := match { { true } { 1 } _ { 2 } };', /match arm header requires grouping/],
    ['x := match { if true { true } else { false } { 1 } _ { 2 } };', /ungrouped \{ in match arm header/],
    ['match x { _ => 1 }', /unsupported feature "match"/],
  ] as const) {
    const rejected = compileTarget('ts', { text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage, bad + ' -> ' + rejected.stderr.toString());
  }

  const cValueRejected = compileTarget('c', { text: 'x := match { true { 1 } _ { 2 } };' });
  assert.equal(cValueRejected.status, 2);
  assert.match(cValueRejected.stderr.toString(), /C backend does not support value match expressions yet/);
});

test('narrow numeric widths support bounds, promotions, widening, Float32 rounding, and panics across TS and C', () => {
  const executions: ArtifactExecution[] = [];
  const paritySource = [
    'io := import "core/io";',
    'aMin: Int8 = -128;',
    'aMax: Int8 = 127;',
    'bMin: Int16 = -32768;',
    'bMax: Int16 = 32767;',
    'cMin: Int32 = -2147483648;',
    'cMax: Int32 = 2147483647;',
    'fRound: Float32 = 0.1;',
    'fExact: Float32 = 16777216;',
    'var z8: Int8;',
    'var zf: Float32;',
    'w16: Int16 = aMax;',
    'w32: Int32 = bMax;',
    'w64: Int = cMax;',
    'wf32a: Float32 = aMin;',
    'wf32b: Float32 = bMax;',
    'wf64: Float = cMin;',
    'wff: Float = fRound;',
    'bTen: Int16 = 10;',
    'cTen: Int32 = 10;',
    'p16 := aMax + bTen;',
    'p32 := bMax + cTen;',
    'pMix := aMax + fRound;',
    'pMix32 := cMax + wf32b;',
    'pPow := aMax ** 2;',
    'var acc: Int8 = 10;',
    'd8: Int8 = 120;',
    'acc += aMax - d8;',
    'acc -= 3;',
    'acc *= 2;',
    'acc /= 3;',
    'acc %= 5;',
    'acc :/= 2;',
    'acc :%= 3;',
    'var facc: Float32 = 1.5;',
    'facc += 2.5;',
    'facc *= 0.5;',
    'exactCheck := (16777217 == fExact);',
    'cmpWide := aMin < bMax and wf32b <= wff + 40000.0 and cMax > 0;',
    'io.outputLine(aMin, aMax, bMin, bMax, cMin, cMax);',
    'io.outputLine(fRound, z8, zf, w16, w32, w64, wf32a, wf32b, wf64);',
    'io.outputLine(p16, p32, pMix, pMix32, pPow, acc, facc, exactCheck, cmpWide);',
  ].join('\n');
  const parityExpected = {
    status: 0,
    stdout: Buffer.from([
      '-128 127 -32768 32767 -2147483648 2147483647',
      '0.10000000149011612 0 0 127 32767 2147483647 -128 32767 -2147483648',
      '137 32777 127.0999984741211 2147516416 16129 2 2 false true',
      '',
    ].join('\n')),
    stderr: Buffer.alloc(0),
  };
  for (const target of ['ts', 'c'] as const) {
    const compiled = compileTarget(target, { text: paritySource });
    assert.equal(compiled.status, 0, `${target}: ${compiled.stderr.toString()}`);
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    executions.push({ target, artifact: compiled.stdout.toString(), expected: parityExpected, context: paritySource });
  }
  assertExecutions(executions);

  const panicCases: readonly [string, RegExp][] = [
    ['var a: Int8 = 127; a += 1; io.outputLine(a);', /ArithmeticPanic: integer outside Int8 range/],
    ['var a: Int8 = -128; io.outputLine(-a);', /ArithmeticPanic: integer outside Int8 range/],
    ['a: Int8 = 127; b: Int16 = 32767; io.outputLine(a + b);', /ArithmeticPanic: integer outside Int16 range/],
    ['a: Int16 = 32767; b: Int16 = 1; io.outputLine(a + b);', /ArithmeticPanic: integer outside Int16 range/],
    ['a: Int32 = 2147483647; b: Int32 = 1; io.outputLine(a + b);', /ArithmeticPanic: integer outside Int32 range/],
    ['a: Float32 = 3.4e38; b: Float32 = 2.0; io.outputLine(a * b);', /ArithmeticPanic: non-finite floating value/],
    ['a: Float32 = 1.0; b: Float32 = 0.0; io.outputLine(a / b);', /ArithmeticPanic: division by zero/],
  ];
  for (const [body, pattern] of panicCases) {
    const panicSource = `io := import "core/io";\nio.outputLine("before");\n${body}\n`;
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text: panicSource });
      assert.equal(compiled.status, 0, `${target} (${body}): ${compiled.stderr.toString()}`);
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      const run = target === 'ts' ? runTsArtifact(compiled.stdout.toString()) : runCArtifact(compiled.stdout.toString());
      assert.equal(run.phase, 'run', body);
      assert.equal(run.status, 1, body);
      assert.equal(run.stdout.toString(), 'before\n', body);
      assert.match(run.stderr.toString(), pattern, `${target} (${body}) -> ${run.stderr.toString()}`);
    }
  }

  const tsOnlySource = [
    'io := import "core/io";',
    'Byte := type Int8;',
    'Half := type Float32;',
    'widen := fn(x: Int16): Int32 { one: Int16 = 1; x + one }',
    'toHalf := fn(x: Byte): Half { x }',
    'a8: Byte = 5;',
    'b16: Int16 = 300;',
    'f32: Half = 0.25;',
    'ifJoined := if true { a8 } else { b16 };',
    'matchJoined := match { false { a8 } _ { f32 } };',
    'bytes: List<Int8> = [1, -128, 127];',
    'blankPair: (a: Int8, b: Float32);',
    'io.outputLine(widen(a8), toHalf(a8), ifJoined, matchJoined, bytes, blankPair);',
  ].join('\n');
  const tsOnlyCompiled = compileTarget('ts', { text: tsOnlySource });
  assert.equal(tsOnlyCompiled.status, 0, tsOnlyCompiled.stderr.toString());
  const tsOnlyRun = runTsArtifact(tsOnlyCompiled.stdout.toString());
  assert.equal(tsOnlyRun.phase, 'run');
  assert.equal(tsOnlyRun.status, 0, tsOnlyRun.stderr.toString());
  assert.equal(tsOnlyRun.stdout.toString(), '6 5 5 0.25 [1, -128, 127] (a=0, b=0)\n');

  for (const [bad, pattern, checkC] of [
    ['x: Int8 = 128;', /integer literal outside Int8 range|cannot initialize Int8/, true],
    ['x: Int8 = -129;', /integer literal outside Int8 range|cannot initialize Int8/, true],
    ['x: Int16 = 32768;', /integer literal outside Int16 range|cannot initialize Int16/, true],
    ['x: Int32 = 2147483648;', /integer literal outside Int32 range|cannot initialize Int32/, true],
    ['f: Float32 = 1e39;', /outside Float32 range|cannot initialize Float32/, true],
    ['f: Float32 = 16777217;', /integer literal is not exactly representable in Float32/, true],
    ['x: Int8 = +1;', /cannot initialize Int8 with Int/, true],
    ['x: Int8 = -(1);', /cannot initialize Int8 with Int/, true],
    ['x: Int8 = 1 + 2;', /cannot initialize Int8 with Int/, true],
    ['var acc: Int8 = 10; a8: Int8 = 127; acc += a8 - 120;', /cannot apply \+= to Int8 and Int/, true],
    ['a: Int16 = 1; b: Int8 = a;', /cannot initialize Int8 with Int16/, true],
    ['c: Int32 = 1; f: Float32 = c;', /cannot initialize Float32 with Int32/, true],
    ['g: Float = 1.0; h: Float32 = g;', /cannot initialize Float32 with Float/, true],
    ['a32: Int32 = 1; f32: Float32 = 2.0; x := if true { a32 } else { f32 };', /value if branches must have the same kind/, false],
    ['xs: List<Int8> = [1]; ys: List<Int16> = xs;', /cannot initialize List<Int16> with List<Int8>/, false],
    ['a8: Int8 = 1; b16: Int16 = 2; arr := [a8, b16];', /list element 2 must be Int8, got Int16/, false],
    ['xs := [10, 20]; i: Int8 = 0; y := xs[i];', /array index must be Int|index must be Int/, false],
  ] as const) {
    for (const target of checkC ? (['ts', 'c'] as const) : (['ts'] as const)) {
      const rejected = compileTarget(target, { text: bad });
      assert.equal(rejected.status, 2, `${target}: ${bad}`);
      assert.match(rejected.stderr.toString(), pattern, `${target}: ${bad} -> ${rejected.stderr.toString()}`);
    }
  }
});

test('import order invariance and module-addition locality avoid module-index churn', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-vcs-import-order-'));
  try {
    const realDir = realpathSync(directory);
    const aPath = join(realDir, 'a.lts');
    const bPath = join(realDir, 'b.lts');
    const cPath = join(realDir, 'c.lts');
    const rootPath = join(realDir, 'root.lts');

    writeFileSync(aPath, 'pub factor := 3;\npub apply := fn(n: Int): Int { localMul := n * factor; localMul + 1 }\n');
    writeFileSync(bPath, 'pub offset := 10;\npub bump := fn(n: Int): Int { adjusted := n + offset; adjusted }\n');

    const rootAB = 'io := import "core/io";\na := import "./a.lts";\nb := import "./b.lts";\nio.outputLine(b.bump(a.apply(2)));\n';
    const rootBA = 'io := import "core/io";\nb := import "./b.lts";\na := import "./a.lts";\nio.outputLine(b.bump(a.apply(2)));\n';

    const compiledAB = compileTs({ text: rootAB, name: rootPath });
    const compiledBA = compileTs({ text: rootBA, name: rootPath });
    assert.equal(compiledAB.status, 0, compiledAB.stderr.toString());
    assert.equal(compiledBA.status, 0, compiledBA.stderr.toString());
    assert.equal(compiledAB.stdout.toString(), compiledBA.stdout.toString());

    const tsText = compiledAB.stdout.toString();
    assert(tsText.includes('function liteFn$a$apply('));
    assert(tsText.includes('function liteFn$b$bump('));
    assert(tsText.includes('const lite$m$a$factor ='));
    assert(tsText.includes('const lite$m$b$offset ='));
    assert(tsText.includes('const lite_localMul ='));
    assert(tsText.includes('const lite_adjusted ='));
    assert(!/lite(?:Fn)?_m\d+_/.test(tsText));

    const runAB = runTsArtifact(tsText);
    assert.equal(runAB.phase, 'run');
    assert.equal(runAB.status, 0, runAB.stderr.toString());
    assert.equal(runAB.stdout.toString(), '17\n');

    // Add a third sibling module `c` and verify `a` and `b` function blocks stay byte-identical.
    writeFileSync(cPath, 'pub bonus := 5;\npub addBonus := fn(n: Int): Int { res := n + bonus; res }\n');
    const rootABC = 'io := import "core/io";\nc := import "./c.lts";\na := import "./a.lts";\nb := import "./b.lts";\nio.outputLine(c.addBonus(b.bump(a.apply(2))));\n';
    const compiledABC = compileTs({ text: rootABC, name: rootPath });
    assert.equal(compiledABC.status, 0, compiledABC.stderr.toString());
    const tsABC = compiledABC.stdout.toString();
    const fnBlock = (text: string, name: string): string => {
      const start = text.indexOf(`function ${name}(`);
      assert(start >= 0, `missing ${name}`);
      const end = text.indexOf(`void ${name};`, start);
      assert(end >= 0, `missing void ${name}`);
      return text.slice(start, end + `void ${name};`.length);
    };
    assert.equal(fnBlock(tsABC, 'liteFn$a$apply'), fnBlock(tsText, 'liteFn$a$apply'));
    assert.equal(fnBlock(tsABC, 'liteFn$b$bump'), fnBlock(tsText, 'liteFn$b$bump'));
    assert(tsABC.includes('function liteFn$c$addBonus('));
    assert(tsABC.includes('const lite_res ='));

    // Also verify C target import-order byte equality for value modules.
    writeFileSync(aPath, 'pub factor := 3;\n');
    writeFileSync(bPath, 'pub offset := 10;\n');
    const cOrder1 = compileTarget('c', { text: 'io := import "core/io";\na := import "./a.lts";\nb := import "./b.lts";\nio.outputLine(a.factor, b.offset);\n', name: rootPath });
    const cOrder2 = compileTarget('c', { text: 'io := import "core/io";\nb := import "./b.lts";\na := import "./a.lts";\nio.outputLine(a.factor, b.offset);\n', name: rootPath });
    assert.equal(cOrder1.status, 0, cOrder1.stderr.toString());
    assert.equal(cOrder2.status, 0, cOrder2.stderr.toString());
    assert.equal(cOrder1.stdout.toString(), cOrder2.stdout.toString());
    assert(cOrder1.stdout.toString().includes('lt_m_a__factor'));
    assert(cOrder1.stdout.toString().includes('lt_m_b__offset'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('path-based module slugs prevent collisions between underscore, hyphen, and slash paths on TS and C', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-slug-collision-'));
  try {
    const realDir = realpathSync(directory);
    mkdirSync(join(realDir, 'a'), { recursive: true });
    writeFileSync(join(realDir, 'a_b.lts'), 'pub val := 1;\npub tag := fn(): Int { val }\n');
    writeFileSync(join(realDir, 'a-b.lts'), 'pub val := 2;\npub tag := fn(): Int { val }\n');
    writeFileSync(join(realDir, 'a', 'b.lts'), 'pub val := 3;\npub tag := fn(): Int { val }\n');

    const rootTsPath = join(realDir, 'root-ts.lts');
    const rootTsSource = [
      'io := import "core/io";',
      'm1 := import "./a_b.lts";',
      'm2 := import "./a-b.lts";',
      'm3 := import "./a/b.lts";',
      'io.outputLine(m1.tag(), m2.tag(), m3.tag());',
    ].join('\n');
    const tsCompiled = compileTs({ text: rootTsSource, name: rootTsPath });
    assert.equal(tsCompiled.status, 0, tsCompiled.stderr.toString());
    const tsOut = tsCompiled.stdout.toString();
    assert(tsOut.includes('function liteFn$a_u_b$tag('));
    assert(tsOut.includes('function liteFn$a__b$tag('));
    assert(tsOut.includes('function liteFn$a$b$tag('));
    assert(tsOut.includes('lite$m$a_u_b$val'));
    assert(tsOut.includes('lite$m$a__b$val'));
    assert(tsOut.includes('lite$m$a$b$val'));
    const tsRun = runTsArtifact(tsOut);
    assert.equal(tsRun.phase, 'run');
    assert.equal(tsRun.status, 0, tsRun.stderr.toString());
    assert.equal(tsRun.stdout.toString(), '1 2 3\n');

    writeFileSync(join(realDir, 'a_b.lts'), 'pub val := 1;\n');
    writeFileSync(join(realDir, 'a-b.lts'), 'pub val := 2;\n');
    writeFileSync(join(realDir, 'a', 'b.lts'), 'pub val := 3;\n');
    const rootCPath = join(realDir, 'root-c.lts');
    const rootCSource = [
      'io := import "core/io";',
      'm1 := import "./a_b.lts";',
      'm2 := import "./a-b.lts";',
      'm3 := import "./a/b.lts";',
      'io.outputLine(m1.val, m2.val, m3.val);',
    ].join('\n');
    const cCompiled = compileTarget('c', { text: rootCSource, name: rootCPath });
    assert.equal(cCompiled.status, 0, cCompiled.stderr.toString());
    const cOut = cCompiled.stdout.toString();
    assert(cOut.includes('lt_m_a_u_b__val'));
    assert(cOut.includes('lt_m_a_d_b__val'));
    assert(cOut.includes('lt_m_a_s_b__val'));
    if (process.env['LITE_SKIP_NATIVE'] !== '1') {
      const cRun = runCArtifact(cOut);
      assert.equal(cRun.phase, 'run');
      assert.equal(cRun.status, 0, cRun.stderr.toString());
      assert.equal(cRun.stdout.toString(), '1 2 3\n');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('scope-local counters avoid source-offset churn in functions, destructuring, loops, and C shadows', () => {
  const workBody = [
    'io := import "core/io";',
    'pick := fn(first: String, second: String): String { first + "-" + second };',
    'work := fn(x: String): String {',
    '  var acc := x;',
    '  {',
    '    x := pick(second = "2", first = "1");',
    '    { x := "3"; acc = acc + ":" + x; }',
    '    acc = acc + ":" + x;',
    '  }',
    '  (p, q) := ("a", "b");',
    '  loop ["u", "v"] { acc = acc + "."; }',
    '  acc + ":" + p + q',
    '};',
    'io.outputLine(work("0"));',
  ].join('\n');
  const shiftedHeader = '/* extra top comment line 1\n   extra top comment line 2\n   extra top comment line 3 */\nunusedBanner := "header";\n\n';
  const baseCompiled = compileTs({ text: workBody });
  const shiftedCompiled = compileTs({ text: shiftedHeader + workBody });
  assert.equal(baseCompiled.status, 0, baseCompiled.stderr.toString());
  assert.equal(shiftedCompiled.status, 0, shiftedCompiled.stderr.toString());
  const baseTs = baseCompiled.stdout.toString();
  const shiftedTs = shiftedCompiled.stdout.toString();
  const extractWork = (text: string): string => {
    const start = text.indexOf('function liteFn_work(');
    const end = text.indexOf('void liteFn_work;', start);
    assert(start >= 0 && end >= 0);
    return text.slice(start, end);
  };
  const workTs = extractWork(baseTs);
  assert.equal(extractWork(shiftedTs), workTs);
  assert(workTs.includes('const lite_x$2 ='));
  assert(workTs.includes('const lite_x$3 ='));
  assert(workTs.includes('const lite$tuple ='));
  assert(workTs.includes('for (const lite$item of'));
  assert(workTs.includes('const lite$arg0 ='));
  assert(!/lt_local_|lite\$tuple_|lite\$item_|lite\$arg_|lite\$report/.test(baseTs));

  const runWork = runTsArtifact(baseTs);
  assert.equal(runWork.phase, 'run');
  assert.equal(runWork.status, 0, runWork.stderr.toString());
  assert.equal(runWork.stdout.toString(), '0:3:1-2..:ab\n');

  const cShadowBase = 'io := import "core/io";\n{ x := "one"; { x := "two"; io.outputLine(x); } io.outputLine(x); }\n';
  const cBaseCompiled = compileTarget('c', { text: cShadowBase });
  const cShiftedCompiled = compileTarget('c', { text: '/* shift */\n/* shift */\n' + cShadowBase });
  assert.equal(cBaseCompiled.status, 0, cBaseCompiled.stderr.toString());
  assert.equal(cShiftedCompiled.status, 0, cShiftedCompiled.stderr.toString());
  assert.equal(cBaseCompiled.stdout.toString(), cShiftedCompiled.stdout.toString());
  assert(cBaseCompiled.stdout.toString().includes('const char *lite_x ='));
  assert(cBaseCompiled.stdout.toString().includes('const char *lt_s2_x ='));
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const cShadowRun = runCArtifact(cBaseCompiled.stdout.toString());
    assert.equal(cShadowRun.phase, 'run');
    assert.equal(cShadowRun.status, 0, cShadowRun.stderr.toString());
    assert.equal(cShadowRun.stdout.toString(), 'two\none\n');
  }
});

test('tagged blocks, targeted non-local transfers, and misplaced tag diagnostics', () => {
  const source = [
    'io := import "core/io";',
    'pick := fn(first: String, second: String): String { first + "-" + second };',
    'compute := fn(flag: Bool): Int {',
    '  res := @blk {',
    '    io.outputLine("inside", flag);',
    '    if flag { return @blk 10; }',
    '    @inner {',
    '      if false { return @inner 1; }',
    '      0',
    '    };',
    '    @blk {',
    '      return @blk 99;',
    '    };',
    '    25',
    '  };',
    '  res',
    '};',
    'earlyFn := fn(stop: Bool): Int {',
    '  x := @outer {',
    '    if stop { return 77; }',
    '    innerVal := @inner {',
    '      if not stop { return @outer 12; }',
    '      5',
    '    };',
    '    innerVal + 1',
    '  };',
    '  x + 1',
    '};',
    'reorderedTransfer := fn(): String {',
    '  pick(second = @arg { return @arg "B"; "Z" }, first = "A")',
    '};',
    'unitFlow := fn(bail: Bool): Unit {',
    '  @u {',
    '    if bail { return; }',
    '    io.outputLine("after-fn-check");',
    '    return @u;',
    '  }',
    '  io.outputLine("after-u");',
    '};',
    'loopTransfers := fn(): Int {',
    '  var i := 0;',
    '  var sum := 0;',
    '  loop true {',
    '    i = i + 1;',
    '    @step {',
    '      if i == 2 { continue; }',
    '      if i == 4 { break; }',
    '      sum = sum + i;',
    '    }',
    '  }',
    '  sum',
    '};',
    'io.outputLine(compute(true), compute(false));',
    'io.outputLine(earlyFn(true), earlyFn(false));',
    'io.outputLine(reorderedTransfer());',
    'unitFlow(false);',
    'unitFlow(true);',
    'io.outputLine(loopTransfers());',
    '@stmtBlk {',
    '  io.outputLine("stmt-before");',
    '  if true { return @stmtBlk; }',
    '  io.outputLine("stmt-skipped");',
    '}',
    'io.outputLine("stmt-after");',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.equal(actual.status, 0, actual.stderr.toString());
  assert.equal(
    actual.stdout.toString(),
    [
      'inside true',
      'inside false',
      '10 25',
      '77 13',
      'A-B',
      'after-fn-check',
      'after-u',
      '4',
      'stmt-before',
      'stmt-after',
      '',
    ].join('\n'),
  );

  for (const [bad, expectedMessage] of [
    ['f := fn(): Int { @blk { return @blk.value; }; 1 };', /block tag @blk does not expose \.value/],
    ['io := import "core/io"; loop { @blk { break @blk; }; }', /break @blk requires an enclosing loop/],
    ['io := import "core/io"; loop { @blk { continue @blk; }; }', /continue @blk requires an enclosing loop/],
    ['@blk { return @nope 1; };', /unknown block tag @nope/],
    ['x := @blk { if true { return @blk 1; }; "a" };', /block @blk cannot return both/],
    ['@inner { if false { return @inner 1; } };', /block @inner cannot return both Int and Unit/],
    ['x := if @bad { 1 } else { 2 };', /unexpected block tag @bad in if header/],
    ['x := if true @bad { 1 } else { 2 };', /block tag cannot appear before \{ in if/],
    ['x := if true { 1 } else @bad { 2 };', /block tag cannot appear after else/],
    ['x := if true { 1 } else @bad if true { 2 } else { 3 };', /block tag cannot appear after else/],
    ['x := if false { 1 } else if @bad { 2 } else { 3 };', /unexpected block tag @bad in else if header/],
    ['x := if false { 1 } else if true @bad { 2 } else { 3 };', /block tag cannot appear before \{ in else if/],
    ['if @bad {}', /unexpected block tag @bad in if header/],
    ['if true @bad {}', /block tag cannot appear before \{ in if/],
    ['if true {} else @bad {}', /block tag cannot appear after else/],
    ['if false {} else if @bad {}', /unexpected block tag @bad in else if header/],
    ['if false {} else if true @bad {}', /block tag cannot appear before \{ in else if/],
    ['x := match @bad { _ { 1 } };', /block tag cannot appear before \{ in match/],
    ['x := match { true @bad { 1 } _ { 2 } };', /block tag cannot appear before \{ in match arm/],
    ['x := match { @bad { 1 } _ { 2 } };', /unexpected block tag @bad in match arm header/],
    ['x := match { _ @bad { 1 } };', /block tag cannot appear after _ in match arm/],
    ['match @bad { _ {} }', /block tag cannot appear before \{ in match/],
    ['match { true @bad {} _ {} }', /block tag cannot appear before \{ in match arm/],
    ['match { @bad {} _ {} }', /unexpected block tag @bad in match arm header/],
    ['match { _ @bad {} }', /block tag cannot appear after _ in match arm/],
    ['loop @bad {}', /unexpected block tag @bad in loop header/],
    ['loop false @bad {}', /block tag cannot appear before \{ in loop/],
    ['@bad f := fn(): Int { 1 };', /expected \{, if, match, loop or \. after block tag @bad/],
    ['f := @bad fn(): Int { 1 };', /expected \{, if, match, loop or \. after block tag @bad/],
    ['f := fn(): Int @bad { 1 };', /unexpected block tag in function header/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage, bad);
  }

  const cTagRejected = compileTarget('c', { text: 'io := import "core/io"; x := @blk { 1 }; io.outputLine(x);' });
  assert.equal(cTagRejected.status, 2);
  assert.match(cTagRejected.stderr.toString(), /C backend does not support tagged blocks yet/);
});

test('tagged conditionals and conditional then blocks', () => {
  const source = [
    'io := import "core/io";',
    'textLib := import "core/text";',
    'choose := fn(useChoice: Bool, earlyExit: Bool): Int {',
    '  outcome: Int = @choose if useChoice {',
    '    if earlyExit {',
    '      return @choose "early";',
    '    }',
    '    "normal"',
    '  } else {',
    '    "none"',
    '  } then {',
    '    io.outputLine("choice", @choose.value);',
    '    textLib.length(@choose.value)',
    '  };',
    '  outcome',
    '};',
    'skipThen := fn(jumpOuter: Bool): String {',
    '  @outer {',
    '    inner := @choose if true {',
    '      if jumpOuter { return @outer "escaped"; }',
    '      "kept"',
    '    } else {',
    '      "unused"',
    '    } then {',
    '      io.outputLine("then-ran", @choose.value);',
    '      @choose.value + "!"',
    '    };',
    '    inner',
    '  }',
    '};',
    'tailCond := fn(x: Int): Int {',
    '  @t if x == 1 {',
    '    return @t 10;',
    '  } else if x == 2 {',
    '    20',
    '  } else {',
    '    30',
    '  } then {',
    '    @t.value * 2',
    '  }',
    '};',
    'tailMatch := fn(x: Int): String {',
    '  @m match {',
    '    x == 1 { return @m "one"; }',
    '    x == 2 { "two" }',
    '    _ { "other" }',
    '  } then {',
    '    "m=" + @m.value',
    '  }',
    '};',
    'untaggedThen := fn(flag: Bool): Int {',
    '  a := if flag { 1 } else { 2 } then { io.outputLine("untagged-if"); 40 };',
    '  b := match { flag { 3 } _ { 4 } } then { io.outputLine("untagged-match"); 5 };',
    '  a + b',
    '};',
    'io.outputLine(choose(true, true), choose(true, false), choose(false, false));',
    'io.outputLine(skipThen(true), skipThen(false));',
    'io.outputLine(tailCond(1), tailCond(2), tailCond(3));',
    'io.outputLine(tailMatch(1), tailMatch(2), tailMatch(9));',
    'io.outputLine(untaggedThen(true));',
    'partZero: Int = @pz if false { 9 };',
    'partJump: Int = @pj if true { return @pj 11; 0 };',
    'io.outputLine(partZero, partJump);',
    '@stmtIf if true {',
    '  io.outputLine("stmt-if-1");',
    '  return @stmtIf;',
    '  io.outputLine("stmt-if-skip");',
    '}',
    'if true { 1 } else { 2 } then { io.outputLine("stmt-then"); };',
    'match { true { 1 } _ { 2 } } then { io.outputLine("stmt-match-then"); };',
    'io.outputLine(@cond if true { "t" } else { "f" });',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.equal(actual.status, 0, actual.stderr.toString());
  assert.equal(
    actual.stdout.toString(),
    [
      'choice early',
      'choice normal',
      'choice none',
      '5 6 4',
      'then-ran kept',
      'escaped kept!',
      '20 40 60',
      'm=one m=two m=other',
      'untagged-if',
      'untagged-match',
      '45',
      '0 11',
      'stmt-if-1',
      'stmt-then',
      'stmt-match-then',
      't',
      '',
    ].join('\n'),
  );

  for (const [bad, expectedMessage] of [
    ['x := @t if (@t.value == 1) { 1 } else { 2 } then { 3 };', /@t\.value is only available inside that conditional's then block/],
    ['x := @t if true { @t.value } else { 2 } then { 3 };', /@t\.value is only available inside that conditional's then block/],
    ['@t if true { 1 } else { 2 } then { 3 }; x := @t.value;', /unknown block tag @t/],
    ['io := import "core/io"; x := @t if true { io.outputLine("a"); } else { io.outputLine("b"); } then { @t.value };', /block tag @t does not expose \.value for Unit conditional/],
    ['x := @outer { @t if true { return @outer 1; } else { return @outer 2; } then { @t.value } };', /block tag @t does not expose \.value for Never conditional/],
    ['x := @t if true { 1 } else { 2 } then { @t.count };', /conditional tag @t only exposes \.value, not \.count/],
    ['x := @t if true { 1 } else { 2 } then { return @t 3; 4 };', /cannot return to @t from inside its own then block/],
    ['x := if true { 1 } then { 2 };', /value if requires a final else/],
    ['if true { 1 } then { 2 }', /value if requires a final else/],
    ['x := @t if true { 1 } else { 2 } then @bad { 3 };', /block tag cannot appear after then/],
    ['@bad; x := 1;', /expected \{, if, match, loop or \. after block tag @bad/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage, bad);
  }

  for (const [badC, expectedMessage] of [
    ['x := @t if true { 1 } else { 2 };', /C backend does not support tagged conditionals yet/],
    ['x := if true { 1 } else { 2 } then { 3 };', /C backend does not support conditional then blocks yet/],
    ['x := @m match { _ { 1 } };', /C backend does not support value match expressions yet/],
  ] as const) {
    const rejectedC = compileTarget('c', { text: badC });
    assert.equal(rejectedC.status, 2, badC);
    assert.match(rejectedC.stderr.toString(), expectedMessage, badC);
  }
});

test('loop values, metadata, then clauses, barriers, and payload exits', () => {
  const source = [
    'io := import "core/io";',
    'integer := import "core/int";',
    'emptySrc: List<Int> = [];',
    'emptyInts := loop emptySrc as n { n };',
    'emptyStrs: String = loop false { break "never"; };',
    'emptyTuple: (a: Int, b: Bool) = loop emptySrc { break (a = 7, b = true); };',
    'io.outputLine(emptyInts, emptyStrs, emptyTuple.0, emptyTuple.1);',
    'pres := @pres loop [1, 2, 3, 4] as n {',
    '  if n == 2 { continue (@pres.value + 10); }',
    '  if n == 3 { break; }',
    '  .value + n',
    '};',
    'io.outputLine(pres);',
    'anonSeq := loop [4, 5] { .value + .item + .index + .count };',
    'io.outputLine(anonSeq);',
    'condCnt := loop .count < 3 { io.outputLine("c", .count); .value + .count } then { io.outputLine("done", .count); .value };',
    'io.outputLine(condCnt);',
    'thenInf := loop [10, 20] as n { .value + n } then { .value * 2 };',
    'io.outputLine(thenInf);',
    'unitThen := loop [1] { continue; } then { .value == Unit };',
    'io.outputLine(unitThen);',
    'emptyThenMeta := loop emptySrc as n { n } then { io.outputLine("empty-meta", .item, .index, .count, .value); 7 };',
    'io.outputLine(emptyThenMeta);',
    'retLoop := fn(): String {',
    '  @outer loop [1, 2, 3] as n {',
    '    @inner if n == 2 {',
    '      return @outer "hit-" + integer.intText(n);',
    '    } else {',
    '    } then {',
    '      io.outputLine("inner-then", n);',
    '    };',
    '    io.outputLine("outer-meta", @outer.item, @outer.index, @outer.count, @outer.value);',
    '    "miss"',
    '  } then {',
    '    "then(" + .value + "," + integer.intText(.item) + ")"',
    '  }',
    '};',
    'io.outputLine(retLoop());',
    'nestedCont := @outer loop [1, 2, 3] as a {',
    '  _inner := loop [10, 20] as b {',
    '    if b == 20 { continue @outer (@outer.value + a); }',
    '    b',
    '  };',
    '  .value + 100',
    '};',
    'io.outputLine(nestedCont);',
    'tailVal := fn(xs: List<Int>): Int {',
    '  loop xs as n {',
    '    .value + n',
    '  }',
    '};',
    'tailDiv := fn(): Int {',
    '  loop {',
    '    return 99;',
    '  }',
    '};',
    'io.outputLine(tailVal([3, 4, 5]), tailDiv());',
    '@u loop [1, 2] { if @u.count == 1 { return @u; } io.outputLine("skip"); };',
    'io.outputLine("unit-ok");',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString());
  assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
  assert.equal(actual.status, 0, actual.stderr.toString());
  assert.equal(
    actual.stdout.toString(),
    [
      '0  0 false',
      '11',
      '13',
      'c 1',
      'c 2',
      'c 3',
      'done 3',
      '6',
      '60',
      'true',
      'empty-meta 0 0 0 0',
      '7',
      'inner-then 1',
      'outer-meta 1 0 1 ',
      'then(hit-2,2)',
      '6',
      '12 99',
      'unit-ok',
      '',
    ].join('\n'),
  );

  for (const [bad, expectedMessage] of [
    ['x := loop [1] { if .item == 1 { 1 } else { 2 } };', /leading-dot \.item is not available inside a conditional; use an explicit loop @tag/],
    ['x := loop [1] { if true { .count } else { 0 } };', /leading-dot \.count is not available inside a conditional; use an explicit loop @tag/],
    ['x := loop [1] { match { (.item == 1) { 1 } _ { 2 } } };', /leading-dot \.item is not available inside a conditional; use an explicit loop @tag/],
    ['loop [1] { if .count == 1 { } }', /leading-dot \.count is not available inside a conditional; use an explicit loop @tag/],
    ['loop [1] { match { (.count == 1) { } _ { } } }', /leading-dot \.count is not available inside a conditional; use an explicit loop @tag/],
    ['x := loop .item == 1 { 1 };', /\.item is not available in loop header/],
    ['x := loop .index == 1 { 1 };', /\.index is not available in loop header/],
    ['x := loop .count < 1 { .index };', /loop does not expose \.index without a sequence source/],
    ['x := loop [1] { .value };', /cannot infer loop \.value type; add a type annotation/],
    ['x := loop [1] { if true { break "a"; } 1 };', /loop cannot produce both String and Int/],
    ['x := @t loop [1] { break @t.value; 1 };', /break @t followed by \. is ambiguous; wrap the payload in parentheses/],
    ['x := loop @t true { 1 };', /unexpected block tag @t in loop header/],
    ['x := loop (if true { break; true } else { false }) { 1 };', /cannot break from loop header/],
    ['x := @t loop [1] { break @t; } then { break @t; 1 };', /cannot break @t from inside its own then block/],
    ['x := @t loop [1] { 1 } then { return @t 2; };', /cannot return to @t from inside its own then block/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage, bad);
  }

  for (const [badC, expectedMessage] of [
    ['x := @t loop [1] { 1 };', /C backend does not support tagged loops yet/],
    ['loop [1] { } then { }', /C backend does not support loop then blocks yet/],
    ['loop [1] { .item; }', /C backend does not support loop metadata yet/],
    ['loop true { break 1; }', /C backend does not support break payloads yet/],
  ] as const) {
    const rejectedC = compileTarget('c', { text: badC });
    assert.equal(rejectedC.status, 2, badC);
    assert.match(rejectedC.stderr.toString(), expectedMessage, badC);
  }
});

test('construct-level finally cleanup, LIFO unwinding, barriers, and failure precedence', () => {
  const cleanupFeature = readFileSync(join(root, 'language/verifications/features/control/unwinding/finally-cleanup.lts'), 'utf8');
  const compiledFeature = compileTs({ text: cleanupFeature });
  assert.equal(compiledFeature.status, 0, compiledFeature.stderr.toString());
  const featureTs = compiledFeature.stdout.toString();
  assert.ok(!featureTs.includes('declare const process'), 'pure finally should not declare process');
  assert.ok(!featureTs.includes('lite$abruptToken'), 'pure finally without process exit/fault should not emit abruptToken');
  const featureRun = runTsArtifact(featureTs);
  assert.equal(featureRun.phase, 'run', featureRun.stdout.toString() + featureRun.stderr.toString());
  assert.equal(featureRun.status, 0, featureRun.stderr.toString());
  assert.equal(featureRun.stdout.toString(), '1\n2\nthen\nfinally\ncond\n1\nreturn-cleanup\n5\n');

  const source = [
    'io := import "core/io";',
    '{ io.outputLine("blk"); } finally { io.outputLine("blk-stmt-fin"); }',
    'blkVal := { n := 9; n + 1 } finally { io.outputLine("blk-fin"); };',
    'tagVal := @b { return @b 20; } finally { io.outputLine("tagged-fin"); };',
    'ifVal := @c if true { 30 } else { 40 } then { @c.value + 1 } finally { io.outputLine("if-fin"); };',
    'if true { io.outputLine("partial-yes"); } finally { io.outputLine("partial-fin"); }',
    'partialVal := (if false { 7 } finally { io.outputLine("partial-val-fin"); });',
    'matchVal := @m match { false { 1 } _ { 50 } } then { @m.value } finally { io.outputLine("match-fin"); };',
    'loopVal := @lp loop [1, 2] as n { .value + n } then { io.outputLine("loop-then", .count); .value * 2 } finally { io.outputLine("loop-fin"); };',
    'io.outputLine(blkVal, tagVal, ifVal, partialVal, matchVal, loopVal);',
    'fnRet := fn(): Int {',
    '  @outer loop [1] {',
    '    { io.outputLine("ret-blk"); return 77; } finally { io.outputLine("ret-inner"); }',
    '  } finally { io.outputLine("ret-outer"); }',
    '};',
    'io.outputLine(fnRet());',
    'tagRet := @outer {',
    '  @inner if true { return @outer 88; } else { 0 } then { io.outputLine("skip-inner-then"); 0 } finally { io.outputLine("unwind-if"); }',
    '} finally { io.outputLine("unwind-outer"); };',
    'io.outputLine(tagRet);',
    'loopCtrl := @outer loop [1, 2] as i {',
    '  loop [10] {',
    '    if i == 1 { continue @outer 100; }',
    '    break @outer (@outer.value + 5);',
    '  } then {',
    '    io.outputLine("skip-inner-loop-then");',
    '  } finally {',
    '    io.outputLine("unwind-loop", i);',
    '  }',
    '  0',
    '} then {',
    '  io.outputLine("outer-then", .count);',
    '  .value',
    '} finally {',
    '  io.outputLine("outer-loop-fin");',
    '};',
    'io.outputLine(loopCtrl);',
    'loop [1] { io.outputLine("body"); } finally {',
    '  loop [8, 9] as k { if k == 8 { continue; } io.outputLine("in-fin", k); }',
    '}',
  ].join('\n');
  const compiled = compileTs({ text: source });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  const run = runTsArtifact(compiled.stdout.toString());
  assert.equal(run.phase, 'run', run.stdout.toString() + run.stderr.toString());
  assert.equal(run.status, 0, run.stderr.toString());
  assert.equal(
    run.stdout.toString(),
    [
      'blk',
      'blk-stmt-fin',
      'blk-fin',
      'tagged-fin',
      'if-fin',
      'partial-yes',
      'partial-fin',
      'partial-val-fin',
      'match-fin',
      'loop-then 2',
      'loop-fin',
      '10 20 31 0 50 6',
      'ret-blk',
      'ret-inner',
      'ret-outer',
      '77',
      'unwind-if',
      'unwind-outer',
      '88',
      'unwind-loop 1',
      'unwind-loop 2',
      'outer-then 2',
      'outer-loop-fin',
      '105',
      'body',
      'in-fin 9',
      '',
    ].join('\n'),
  );

  const exitCompiled = compileTs({
    text: [
      'io := import "core/io";',
      'loop [1] {',
      '  if true { io.exit(3); } finally { io.outputLine("exit-if-fin"); }',
      '} finally {',
      '  io.outputLine("exit-loop-fin");',
      '}',
    ].join('\n'),
  });
  assert.equal(exitCompiled.status, 0, exitCompiled.stderr.toString());
  const exitRun = runTsArtifact(exitCompiled.stdout.toString());
  assert.equal(exitRun.phase, 'run');
  assert.equal(exitRun.status, 3);
  assert.equal(exitRun.stdout.toString(), 'exit-if-fin\nexit-loop-fin\n');
  assert.equal(exitRun.stderr.toString(), '');

  const faultCompiled = compileTs({
    text: [
      'io := import "core/io";',
      'd := 0;',
      '{',
      '  io.outputLine("before-fault");',
      '  _q := 10 / d;',
      '  io.outputLine("after-fault");',
      '} finally {',
      '  io.outputLine("fault-fin");',
      '}',
    ].join('\n'),
  });
  assert.equal(faultCompiled.status, 0, faultCompiled.stderr.toString());
  const faultRun = runTsArtifact(faultCompiled.stdout.toString());
  assert.equal(faultRun.phase, 'run');
  assert.equal(faultRun.status, 1);
  assert.equal(faultRun.stdout.toString(), 'before-fault\nfault-fin\n');
  assert.match(faultRun.stderr.toString(), /ArithmeticPanic: division by zero/);

  const doubleFaultCompiled = compileTs({
    text: [
      'io := import "core/io";',
      'd := 0;',
      'xs := [1, 2];',
      '{',
      '  _q := 10 / d;',
      '} finally {',
      '  io.outputLine("fin-before-sec");',
      '  _bad := xs[5];',
      '}',
    ].join('\n'),
  });
  assert.equal(doubleFaultCompiled.status, 0, doubleFaultCompiled.stderr.toString());
  const doubleFaultRun = runTsArtifact(doubleFaultCompiled.stdout.toString());
  assert.equal(doubleFaultRun.phase, 'run');
  assert.equal(doubleFaultRun.status, 1);
  assert.equal(doubleFaultRun.stdout.toString(), 'fin-before-sec\n');
  const dfStderr = doubleFaultRun.stderr.toString();
  const arithPos = dfStderr.indexOf('ArithmeticPanic: division by zero');
  const boundPos = dfStderr.indexOf('BoundPanic');
  assert.ok(arithPos >= 0, dfStderr);
  assert.ok(boundPos > arithPos, `primary ArithmeticPanic must precede secondary BoundPanic: ${dfStderr}`);

  const cancelNormalCompiled = compileTs({
    text: [
      'io := import "core/io";',
      'xs := [1, 2];',
      'x := { 42 } finally { io.outputLine("cleanup-fail"); _bad := xs[5]; };',
      'io.outputLine("unreachable", x);',
    ].join('\n'),
  });
  assert.equal(cancelNormalCompiled.status, 0, cancelNormalCompiled.stderr.toString());
  const cancelNormalRun = runTsArtifact(cancelNormalCompiled.stdout.toString());
  assert.equal(cancelNormalRun.phase, 'run');
  assert.equal(cancelNormalRun.status, 1);
  assert.equal(cancelNormalRun.stdout.toString(), 'cleanup-fail\n');
  assert.match(cancelNormalRun.stderr.toString(), /BoundPanic/);

  for (const [bad, expectedMessage] of [
    ['{ 1 } finally { 123 }', /finally block must produce Unit/],
    ['f := fn(): Int { { 1 } finally { return 2; } 3 };', /cannot return out of finally block/],
    ['x := @t { 1 } finally { return @t 2; };', /cannot return out of finally block/],
    ['loop [1] { 1 } finally { break; }', /cannot break out of finally block/],
    ['loop [1] { 1 } finally { continue; }', /cannot continue out of finally block/],
    ['x := @t loop [1] { 1 } finally { break @t; };', /cannot break out of finally block/],
    ['x := loop [1] { 1 } finally { .count; };', /not available in finally/],
    ['x := @t loop [1] { 1 } finally { @t.count; };', /not available in finally/],
    ['x := @t if true { 1 } else { 2 } finally { @t.value; };', /not available in finally/],
    ['loop [1] { } finally { } then { }', /then must appear before finally/],
    ['loop [1] { } finally { } finally { }', /duplicate finally block/],
    ['x := { 1 } finally { } finally { };', /duplicate finally block/],
  ] as const) {
    const rejected = compileTs({ text: bad });
    assert.equal(rejected.status, 2, bad);
    assert.match(rejected.stderr.toString(), expectedMessage, bad);
  }

  for (const badC of [
    '{ 1 } finally { }',
    'if true { } finally { }',
    'loop [1] { } finally { }',
    'x := match { _ { 1 } } finally { };',
  ]) {
    const rejectedC = compileTarget('c', { text: badC });
    assert.equal(rejectedC.status, 2, badC);
    assert.match(rejectedC.stderr.toString(), /C backend does not support finally blocks yet/, badC);
  }
});

test('core os/fs/process/crypto/time host bindings, standalone CLI execution, and target rejections work cleanly', async () => {
  const fixtureName = resolve(root, 'compiler/tests/fixtures/core-host-os.lts');
  const compiled = compileTs({
    text: [
      'fs := import "core/file";',
      'pathLib := import "core/path";',
      'proc := import "core/process";',
      'crypto := import "core/crypto";',
      'time := import "core/time";',
      'uni := import "core/unicode";',
      'io := import "core/io";',
      'writeTwoLines := fn(w: io.Writer, a: String, b: String): Bool {',
      '    r1 := io.writeLine(w, a);',
      '    r2 := io.writeLine(w, b);',
      '    r1.ok and r2.ok',
      '};',
      'collectAllLines := fn(r: io.Reader): String {',
      '    var out := "";',
      '    loop true {',
      '        res := io.readLine(r);',
      '        if not res.ok or res.eof { break; }',
      '        if out =!= "" { out = out + "|"; }',
      '        out = out + res.line;',
      '    }',
      '    out',
      '};',
      'bw := io.bufferWriter();',
      'bwOk := writeTwoLines(bw, "alpha", "beta");',
      'bwTxt := io.writerText(bw);',
      'trLines := collectAllLines(io.textReader("alpha\\r\\nbeta\\ngamma"));',
      'tmp := fs.makeTempDir("lite-os-host-");',
      'if not tmp.ok { io.outputLine("mkdir-temp-fail", tmp.error); io.exit(1); }',
      'dir := tmp.path;',
      'sub := dir + "/sub";',
      'made := fs.makeDir(sub);',
      'file := sub + "/target.txt";',
      'wrote := fs.writeText(file, "hello world\\n");',
      'readOk := fs.readText(file);',
      'appFile := sub + "/append.txt";',
      'fw := fs.openWriter(appFile);',
      'fwOk := writeTwoLines(fw, "first", "second");',
      '_fwFlush := io.flush(fw);',
      '_fwClose := io.closeWriter(fw);',
      'appRes := fs.appendText(appFile, "third\\n");',
      'fr := fs.openReader(appFile);',
      'frLines := collectAllLines(fr);',
      '_frClose := io.closeReader(fr);',
      'badOpen := fs.openReader(dir + "/absent.txt");',
      'rawFile := sub + "/raw.bin";',
      'rawBytes: List<Int> = [0, 65, 255, 13, 10];',
      'wroteRaw := fs.writeBytes(rawFile, rawBytes);',
      'readRaw := fs.readBytes(rawFile);',
      'emptyFile := sub + "/empty.bin";',
      'wroteEmpty := fs.writeBytes(emptyFile, []);',
      'readEmpty := fs.readBytes(emptyFile);',
      'badByteHigh := fs.writeBytes(dir + "/bad-high.bin", [256]);',
      'badByteNeg := fs.writeBytes(dir + "/bad-neg.bin", [-1]);',
      'badRead := fs.readText(dir + "/missing.txt");',
      'subCopy := dir + "/sub-copy";',
      'copied := fs.copy(sub, subCopy);',
      'entries := fs.listDir(dir);',
      'linkPath := dir + "/link.txt";',
      'linked := fs.symlink("sub/target.txt", linkPath);',
      'real := fs.realPath(linkPath);',
      'removed := fs.remove(subCopy);',
      'removedMissing := fs.remove(subCopy);',
      'unsetEnv := proc.envGet("LITE_DEFINITELY_UNSET_XYZ");',
      'homeEnv := proc.envGet("PATH");',
      'childOk := proc.run(proc.execPath(), ["-e", "process.stdout.write(process.env.LITE_ENV_CHILD + \':\' + process.getBuiltinModule(\'node:fs\').readFileSync(0,\'utf8\'))"], dir, ["LITE_ENV_CHILD=ok"], true, "ping");',
      'childFail := proc.run("/no/such/binary-lite-xyz", [], "", [], true, "");',
      'bytesOutPath := dir + "/child-out.bin";',
      'bytesErrPath := dir + "/child-err.bin";',
      'childBytes := proc.runBytes(proc.execPath(), ["-e", "const b = process.getBuiltinModule(\'node:fs\').readFileSync(0); process.stdout.write(b); process.stderr.write(Buffer.from([b.length, 42])); process.exit(3);"], dir, [], 5000, rawBytes, bytesOutPath, bytesErrPath);',
      'childTimeout := proc.runBytes(proc.execPath(), ["-e", "setTimeout(() => {}, 2000)"], dir, [], 50, [], dir + "/t-out.bin", dir + "/t-err.bin");',
      'utfBytes := uni.utf8Encode("A€");',
      'hashText := crypto.sha256Text("hello");',
      'hashBytes := crypto.sha256Bytes(rawBytes);',
      'hashEmptyBytes := crypto.sha256Bytes([]);',
      'hashRawFile := crypto.sha256File(rawFile);',
      'hashFile := crypto.sha256File(file);',
      'hashMissing := crypto.sha256File(dir + "/missing.txt");',
      't0 := time.monotonicNs();',
      't1 := time.monotonicNs();',
      'iso := time.utcIsoNow();',
      'io.outputLine(fs.kind(dir), fs.kind(file), fs.kind(linkPath), fs.kind(dir + "/missing.txt"), pathLib.isDirectory(dir), pathLib.isFile(file), not pathLib.exists(dir + "/missing.txt"), pathLib.stem(file), pathLib.withExt(file, "md") == sub + "/target.md");',
      'io.outputLine(bwOk, bwTxt.ok, bwTxt.text == "alpha\\nbeta\\n", trLines, fwOk, appRes.ok, frLines, not io.readerOk(badOpen), io.readerError(badOpen) =!= "");',
      'io.outputLine(made.ok, wrote.ok, readOk.ok, readOk.text == "hello world\\n", not badRead.ok, copied.ok);',
      'io.outputLine(wroteRaw.ok, readRaw, wroteEmpty.ok, readEmpty, not badByteHigh.ok, fs.kind(dir + "/bad-high.bin"), not badByteNeg.ok);',
      'io.outputLine(entries, linked.ok, real.ok, real.path == fs.realPath(file).path, removed.ok, removedMissing.ok);',
      'io.outputLine(proc.cwd() =!= "", proc.execPath() =!= "", proc.platform() =!= "", proc.arch() =!= "", proc.runtimeVersion() =!= "", not unsetEnv.found, unsetEnv.value == "", homeEnv.found);',
      'io.outputLine(childOk.status, childOk.stdout, childOk.stderr == "", childOk.error == "", childFail.status, childFail.error =!= "");',
      'io.outputLine(childBytes.status, childBytes.error == "", fs.readBytes(bytesOutPath), fs.readBytes(bytesErrPath), childTimeout.status, childTimeout.error =!= "", utfBytes, uni.utf8Encode(""));',
      'io.outputLine(hashText == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", hashBytes == hashRawFile.hex, hashEmptyBytes == crypto.sha256Text(""), hashFile.ok, hashFile.hex == crypto.sha256Text("hello world\\n"), not hashMissing.ok);',
      'io.outputLine(t1 >= t0, iso =!= "");',
      'clean := fs.remove(dir);',
      'io.outputLine(clean.ok, fs.kind(dir));',
    ].join('\n'),
    name: fixtureName,
  });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  withTsArtifact(compiled.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.stdout.toString(), [
      'dir file file missing true true true target true',
      'true true true alpha|beta|gamma true true first|second|third true true',
      'true true true true true true',
      'true [0, 65, 255, 13, 10] true [] true missing true',
      '[sub, sub-copy] true true true true true',
      'true true true true true true true true',
      '0 ok:ping true true -1 true',
      '3 true [0, 65, 255, 13, 10] [5, 42] -1 true [65, 226, 130, 172] []',
      'true true true true true true',
      'true true',
      'true missing',
      '',
    ].join('\n'));
  });

  const textOnly = compileTs({
    text: 'textLib := import "core/text"; io := import "core/io"; io.outputLine(textLib.length("A🙂"), textLib.at("A🙂", 1));',
    name: fixtureName,
  });
  assert.equal(textOnly.status, 0, textOnly.stderr.toString());
  assert.equal(checkTsArtifact(textOnly.stdout.toString()).status, 0);
  withTsArtifact(textOnly.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.stdout.toString(), '2 🙂\n');
  });

  const extendedCore = compileTs({
    text: [
      'crypto := import "core/crypto";',
      'list := import "core/list";',
      'time := import "core/time";',
      'uni := import "core/unicode";',
      'io := import "core/io";',
      'raw: List<Int> = [0, 65, 255];',
      'b64 := crypto.base64Encode(raw);',
      'b64Ok := crypto.isValidBase64(b64);',
      'b64Dec := crypto.base64Decode(b64);',
      'b64Bad1 := crypto.isValidBase64("not-base64!");',
      'b64Bad2 := crypto.isValidBase64("YWJj=");',
      'hex := crypto.hexEncode(raw);',
      'hexOk := crypto.isValidHex("0041FF");',
      'hexDec := crypto.hexDecode("0041FF");',
      'hexBadOdd := crypto.isValidHex("abc");',
      'hexBadChar := crypto.isValidHex("zz");',
      'sha512 := crypto.sha512Text("abc");',
      'sha512b := crypto.sha512Bytes([97, 98, 99]);',
      'hmac := crypto.hmacSha256Bytes([107, 101, 121], [97, 98, 99]);',
      'var longKey: mut List<Int> = [];',
      'loop list.listCountInt(longKey) < 80 { list.pushBack(mut longKey, 170); }',
      'hmacLong := crypto.hmacSha256Bytes(longKey, [84, 101, 115, 116]);',
      'rand0 := crypto.randomBytes(0);',
      'rand16 := crypto.randomBytes(16);',
      'ms0 := time.epochMs();',
      'ns0 := time.epochNs();',
      'isoNow := time.utcIsoNow();',
      'mono0 := time.monotonicNs();',
      'time.sleepMs(15);',
      'mono1 := time.monotonicNs();',
      'ldate := time.localDate();',
      'u8 := uni.utf8Encode("A€🙂");',
      'u8Ok := uni.utf8DecodeStrict(u8);',
      'u8Bad := uni.utf8DecodeStrict([255]);',
      'u8Overlong := uni.utf8DecodeStrict([192, 175]);',
      'u8Surrogate := uni.utf8DecodeStrict([237, 160, 128]);',
      'u8BadVal := uni.utf8DecodeStrict([256]);',
      'u8Lossy := uni.utf8DecodeLossy([65, 255, 66]);',
      'u8LossyEdge := uni.utf8DecodeLossy([65, 224, 128, 66, 226, 130]);',
      'u16 := uni.utf16Encode("A🙂");',
      'u16Ok := uni.utf16DecodeStrict(u16);',
      'u16BadHigh := uni.utf16DecodeStrict([55357]);',
      'u16BadLow := uni.utf16DecodeStrict([56898]);',
      'u16BadRange := uni.utf16DecodeStrict([65536]);',
      'cps := uni.toCodePoints("A€🙂");',
      'cpOk := uni.fromCodePoints(cps);',
      'cpBadSur := uni.fromCodePoints([55296]);',
      'cpBadHi := uni.fromCodePoints([1114112]);',
      'oneCp := uni.fromCodePoint(128578);',
      'io.outputLine(b64, b64Ok, b64Dec, not b64Bad1, not b64Bad2);',
      'io.outputLine(hex, hexOk, hexDec, not hexBadOdd, not hexBadChar);',
      'io.outputLine(sha512 == "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f", sha512 == sha512b);',
      'io.outputLine(hmac, hmacLong, list.listCountInt(rand0), list.listCountInt(rand16));',
      'io.outputLine(ms0 > 1700000000000, ns0 >= ms0 * 1000000, mono1 > mono0, ldate, isoNow);',
      'io.outputLine(u8, u8Ok.ok, u8Ok.text == "A€🙂", not u8Bad.ok, not u8Overlong.ok, not u8Surrogate.ok, not u8BadVal.ok, u8Lossy, u8LossyEdge);',
      'io.outputLine(uni.isValidUtf8(u8), not uni.isValidUtf8([255]), uni.utf16Length("A🙂"), u16, u16Ok.ok, u16Ok.text == "A🙂");',
      'io.outputLine(not u16BadHigh.ok, not u16BadLow.ok, not u16BadRange.ok);',
      'io.outputLine(cps, cpOk.ok, cpOk.text == "A€🙂", not cpBadSur.ok, not cpBadHi.ok);',
      'io.outputLine(oneCp.ok, oneCp.text == "🙂", uni.codePointAt("A€🙂", 2), uni.isValidScalar(65), not uni.isValidScalar(55296), not uni.isValidScalar(1114112));',
    ].join('\n'),
    name: fixtureName,
  });
  assert.equal(extendedCore.status, 0, extendedCore.stderr.toString());
  assert.equal(checkTsArtifact(extendedCore.stdout.toString()).status, 0);
  const { createHmac } = await import('node:crypto');
  const expectedHmac = createHmac('sha256', Buffer.from([107, 101, 121])).update(Buffer.from([97, 98, 99])).digest('hex');
  const expectedLongHmac = createHmac('sha256', Buffer.alloc(80, 170)).update(Buffer.from([84, 101, 115, 116])).digest('hex');
  withTsArtifact(extendedCore.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    const lines = actual.stdout.toString().trimEnd().split('\n');
    assert.equal(lines.length, 10, actual.stdout.toString());
    assert.equal(lines[0], 'AEH/ true [0, 65, 255] true true');
    assert.equal(lines[1], '0041ff true [0, 65, 255] true true');
    assert.equal(lines[2], 'true true');
    assert.equal(lines[3], `${expectedHmac} ${expectedLongHmac} 0 16`);
    assert.match(lines[4]!, /^true true true \d{4}-\d{2}-\d{2} \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.equal(lines[5], '[65, 226, 130, 172, 240, 159, 153, 130] true true true true true true A\ufffdB A\ufffd\ufffdB\ufffd');
    assert.equal(lines[6], 'true true 3 [65, 55357, 56898] true true');
    assert.equal(lines[7], 'true true true');
    assert.equal(lines[8], '[65, 8364, 128578] true true true true');
    assert.equal(lines[9], 'true true 128578 true true true');
  });

  const unicodeOnly = compileTs({
    text: 'uni := import "core/unicode"; io := import "core/io"; io.outputLine(uni.utf8DecodeStrict(uni.utf8Encode("hi")).text, uni.toCodePoints("🙂"));',
    name: fixtureName,
  });
  assert.equal(unicodeOnly.status, 0, unicodeOnly.stderr.toString());
  assert.equal(checkTsArtifact(unicodeOnly.stdout.toString()).status, 0);
  assert.match(unicodeOnly.stdout.toString(), /lite\$unicodeUtf8Encode/);
  assert.match(unicodeOnly.stdout.toString(), /lite\$unicodeUtf8DecodeStrict/);
  assert.doesNotMatch(unicodeOnly.stdout.toString(), /node:buffer|node:crypto/);
  withTsArtifact(unicodeOnly.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.stdout.toString(), 'hi [128578]\n');
  });

  const unicodeOnlyPure = compileTs({
    text: 'uni := import "core/unicode"; io := import "core/io"; io.outputLine(uni.utf8DecodeStrict(uni.utf8Encode("hi")).text, uni.toCodePoints("🙂"));',
    name: fixtureName,
    options: ['--builtin-mode', 'pure'],
  });
  assert.equal(unicodeOnlyPure.status, 0, unicodeOnlyPure.stderr.toString());
  assert.equal(checkTsArtifact(unicodeOnlyPure.stdout.toString()).status, 0);
  assert.doesNotMatch(unicodeOnlyPure.stdout.toString(), /TextEncoder|TextDecoder|node:buffer|node:crypto/);
  withTsArtifact(unicodeOnlyPure.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.stdout.toString(), 'hi [128578]\n');
  });

  for (const [badExpr, expectedErr] of [
    ['c := import "core/crypto"; _ := c.base64Decode("abc");', /invalid base64 input/],
    ['c := import "core/crypto"; _ := c.hexDecode("abc");', /invalid hex input/],
  ] as const) {
    const badCompiled = compileTs({ text: badExpr, name: fixtureName });
    assert.equal(badCompiled.status, 0, badCompiled.stderr.toString());
    withTsArtifact(badCompiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 2);
      assert.match(actual.stderr.toString(), expectedErr);
    });
  }

  const standaloneCompiled = compileTs({
    text: [
      'fs := import "core/file";',
      'proc := import "core/process";',
      'io := import "core/io";',
      'if proc.entryPath() == "" { _in := io.inputAll(""); _txt := fs.readText("."); }',
      'io.outputLine(proc.entryPath() =!= "", io.inputArgs());',
    ].join('\n'),
    name: fixtureName,
  });
  assert.equal(standaloneCompiled.status, 0, standaloneCompiled.stderr.toString());
  assert.equal(checkTsArtifact(standaloneCompiled.stdout.toString()).status, 0);
  const standaloneDir = mkdtempSync(join(tmpdir(), 'lite-standalone-cli-'));
  try {
    const script = join(standaloneDir, 'tool.ts');
    writeFileSync(script, standaloneCompiled.stdout);
    const direct = spawnSync(process.execPath, [script, 'alpha', 'beta'], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(direct.error, undefined);
    assert.equal(direct.status, 0, direct.stderr);
    assert.equal(direct.stdout, 'true [alpha, beta]\n');
  } finally { rmSync(standaloneDir, { recursive: true, force: true }); }

  const streamChild = compileTs({
    text: [
      'io := import "core/io";',
      'bytes := io.readAll(io.stdinReader());',
      'out := io.stdoutWriter();',
      'err := io.stderrWriter();',
      '_w1 := io.write(out, bytes);',
      '_w2 := io.writeText(out, "|done");',
      '_f1 := io.flush(out);',
      '_w3 := io.writeLine(err, "warn");',
      '_f2 := io.flush(err);',
    ].join('\n'),
    name: fixtureName,
  });
  assert.equal(streamChild.status, 0, streamChild.stderr.toString());
  assert.equal(checkTsArtifact(streamChild.stdout.toString()).status, 0);
  const streamDir = mkdtempSync(join(tmpdir(), 'lite-proc-streams-test-'));
  try {
    const childScript = join(streamDir, 'echo-stream.ts');
    writeFileSync(childScript, streamChild.stdout);
    const parentCompiled = compileTs({
      text: [
        'crypto := import "core/crypto";',
        'file := import "core/file";',
        'io := import "core/io";',
        'list := import "core/list";',
        'proc := import "core/process";',
        'outW := io.bufferWriter();',
        'errW := io.bufferWriter();',
        `res := proc.runStreams(proc.execPath(), [${JSON.stringify(childScript)}], "", [], 10000, io.bufferReader([65, 0, 66]), outW, errW);`,
        'outBytes := io.writerBytes(outW);',
        'errTxt := io.writerText(errW);',
        'bigFile := ' + JSON.stringify(join(streamDir, 'multi-chunk.bin')) + ';',
        'var big: mut List<Int> = [];',
        'loop list.listCountInt(big) < 20000 { list.pushBack(mut big, (list.listCountInt(big) * 13) % 256); }',
        '_wb := file.writeBytes(bigFile, big);',
        'rBig := file.openReader(bigFile);',
        'hStreamFile := crypto.sha256Reader(rBig);',
        '_rc := io.closeReader(rBig);',
        'hFastFile := crypto.sha256File(bigFile);',
        'hStream := crypto.sha256Reader(io.textReader("hello"));',
        'h512 := crypto.sha512Text("abc");',
        'ioW := io.bufferWriter();',
        'ioCopied := io.copyStream(io.textReader("via-io"), ioW);',
        'ioWTxt := io.writerText(ioW);',
        'wcWriter := io.bufferWriter();',
        'wcRes := io.writeAndClose(wcWriter, [120, 121]);',
        'wcBytes := io.writerBytes(wcWriter);',
        'wcClosed := io.writerOk(wcWriter);',
        'io.outputLine(res.status, res.error == "", outBytes, errTxt.ok, errTxt.text == "warn\\n", hStreamFile.ok, hStreamFile.hex == hFastFile.hex, hStream.ok, hStream.hex == crypto.sha256Text("hello"), h512 == crypto.sha512Text("abc"), ioCopied.ok, ioCopied.copied, ioWTxt.ok, ioWTxt.text, wcRes.ok, wcBytes, wcClosed);',
      ].join('\n'),
      name: fixtureName,
    });
    assert.equal(parentCompiled.status, 0, parentCompiled.stderr.toString());
    assert.equal(checkTsArtifact(parentCompiled.stdout.toString()).status, 0);
    withTsArtifact(parentCompiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '0 true [65, 0, 66, 124, 100, 111, 110, 101] true true true true true true true true 6 true via-io true [120, 121] false\n');
    });
    const removedFileCopy = compileTs({
      text: 'file := import "core/file"; io := import "core/io"; _ := file.copyStream(io.textReader("a"), io.bufferWriter());',
      name: fixtureName,
    });
    assert.equal(removedFileCopy.status, 2);
    assert.match(removedFileCopy.stderr.toString(), /unknown module member file\.copyStream/);
  } finally { rmSync(streamDir, { recursive: true, force: true }); }

  const directory = mkdtempSync(join(tmpdir(), 'lite-core-os-unbound-'));
  try {
    writeFileSync(join(directory, 'file.lts'), 'pub kind := fn(path: String): String;\n');
    writeFileSync(join(directory, 'app.lts'), 'file := import "./file.lts"; x := file.kind(".");\n');
    const unbound = compileTs({ text: readFileSync(join(directory, 'app.lts'), 'utf8'), name: realpathSync(join(directory, 'app.lts')) });
    assert.equal(unbound.status, 2);
    assert.match(unbound.stderr.toString(), /bodyless function declaration has no matching core host binding/);

    const badAbi = compileTs({ text: 'pub kind := fn(path: String): Int;', name: 'lib/core/file.lts' });
    assert.equal(badAbi.status, 2);
    assert.match(badAbi.stderr.toString(), /bodyless function declaration has no matching core host binding/);
  } finally { rmSync(directory, { recursive: true, force: true }); }

  const reachableC = compileTarget('c', {
    text: 'unused := fn(): List<Int> { xs: List<Int> = [1, 2]; xs }; io := import "core/io"; io.outputLine(42);',
    name: fixtureName,
  });
  assert.equal(reachableC.status, 0, reachableC.stderr.toString());
  assert.match(reachableC.stdout.toString(), /42/);

  for (const [sourceText, pattern] of [
    ['unused := fn(): Int { 1 }; used := fn(): Int { 2 }; io := import "core/io"; io.outputLine(used());', /C backend does not support top-level functions yet/],
    ['fs := import "core/file"; x := fs.kind(".");', /C backend does not support filesystem builtins yet/],
    ['fs := import "core/file"; x := fs.readBytes(".");', /C backend does not support (filesystem builtins|list values|top-level functions) yet/],
    ['fs := import "core/file"; x := fs.writeBytes(".", []);', /C backend does not support (filesystem builtins|list values|top-level functions) yet/],
    ['io := import "core/io"; x := io.bufferWriter();', /C backend does not support (stream builtins|tuple values) yet/],
    ['io := import "core/io"; x := io.stdinReader();', /C backend does not support (stream builtins|tuple values) yet/],
    ['proc := import "core/process"; x := proc.cwd();', /C backend does not support process builtins yet/],
    ['proc := import "core/process"; x := proc.runBytes("true", [], "", [], 0, [], "", "");', /C backend does not support (process builtins|list values|tuple values|top-level functions) yet/],
    ['c := import "core/crypto"; x := c.sha256Text("a");', /C backend does not support (crypto builtins|list values|top-level functions) yet/],
    ['c := import "core/crypto"; x := c.sha256Bytes([]);', /C backend does not support (crypto builtins|list values|top-level functions) yet/],
    ['c := import "core/crypto"; x := c.sha512Text("a");', /C backend does not support (crypto builtins|list values|top-level functions) yet/],
    ['c := import "core/crypto"; x := c.base64Decode("YQ==");', /C backend does not support (crypto builtins|list values|top-level functions) yet/],
    ['c := import "core/crypto"; x := c.randomBytes(4);', /C backend does not support (crypto builtins|list values|top-level functions) yet/],
    ['t := import "core/time"; x := t.monotonicNs();', /C backend does not support (time builtins|top-level functions) yet/],
    ['t := import "core/time"; t.sleepMs(1);', /C backend does not support (time builtins|top-level functions) yet/],
    ['t := import "core/time"; x := t.localDate();', /C backend does not support (time builtins|top-level functions) yet/],
    ['textLib := import "core/text"; x := textLib.indexOf("ab", "b", 0);', /C backend does not support (text builtins|top-level functions) yet/],
    ['u := import "core/unicode"; x := u.utf8Encode("ab");', /C backend does not support (unicode builtins|list values|top-level functions) yet/],
    ['u := import "core/unicode"; x := u.utf16Length("ab");', /C backend does not support (unicode builtins|list values|top-level functions) yet/],
    ['u := import "core/unicode"; x := u.codePointAt("ab", 0);', /C backend does not support (unicode builtins|list values|top-level functions) yet/],
  ] as const) {
    const rejectedC = compileTarget('c', { text: sourceText, name: fixtureName });
    assert.equal(rejectedC.status, 2, sourceText);
    assert.match(rejectedC.stderr.toString(), pattern, sourceText);
  }
});

test('soft-builtin emitter overrides and --builtin-mode flags work at function, module, and project scope', () => {
  const workDir = mkdtempSync(join(tmpdir(), 'lite-builtin-mode-'));
  try {
    const sampleFile = join(workDir, 'sample.txt');
    const sourceFile = join(workDir, 'digest.lts');
    writeFileSync(sampleFile, 'hello world\n');
    const source = [
      'crypto := import "core/crypto";',
      'io := import "core/io";',
      `fileHash := crypto.sha256File(${JSON.stringify(sampleFile)});`,
      'sha256T := crypto.sha256Text("hello");',
      'sha256B := crypto.sha256Bytes([104, 101, 108, 108, 111]);',
      'sha512T := crypto.sha512Text("abc");',
      'sha512B := crypto.sha512Bytes([97, 98, 99]);',
      'hmac := crypto.hmacSha256Bytes([107, 101, 121], [97, 98, 99]);',
      'io.outputLine(fileHash.ok, fileHash.hex, sha256T == sha256B, sha256T, sha512T == sha512B, hmac);',
    ].join('\n');
    writeFileSync(sourceFile, source);

    const expectedLine = [
      'true',
      'a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447',
      'true',
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      'true',
      '9c196e32dc0175f86f4b1cb89289d6619de6bee699e4c378e68309ed97a1a6ab',
    ].join(' ') + '\n';

    const compileAndVerify = (options: readonly string[], label: string): string => {
      const compiled = compileTs({ text: source, name: sourceFile, options });
      assert.equal(compiled.status, 0, `${label}: ${compiled.stderr.toString()}`);
      const tsCode = compiled.stdout.toString();
      assert.equal(checkTsArtifact(tsCode).status, 0, `${label}: strict TS check`);
      withTsArtifact(tsCode, run => {
        const res = run();
        assert.equal(res.status, 0, `${label}: runtime`);
        assert.equal(res.stdout.toString(), expectedLine, `${label}: output`);
      });
      return tsCode;
    };

    const defaultTs = compileAndVerify([], 'default builtin');
    assert.match(defaultTs, /function lite\$cryptoDigestBytes\(/);
    assert.match(defaultTs, /function lite\$cryptoDigestText\(/);
    assert.match(defaultTs, /function lite\$cryptoDigestFile\(/);
    assert.match(defaultTs, /node:crypto/);

    const pureProjectTs = compileAndVerify(['--builtin-mode', 'pure'], 'project pure');
    assert.doesNotMatch(pureProjectTs, /function lite\$cryptoDigest/);
    assert.doesNotMatch(pureProjectTs, /node:crypto/);

    const pureProjectEqTs = compileAndVerify(['--builtin-mode=pure'], 'project pure =');
    assert.doesNotMatch(pureProjectEqTs, /function lite\$cryptoDigest/);

    const pureModuleTs = compileAndVerify(['--builtin-mode', 'core/crypto=pure'], 'module core/crypto pure');
    assert.doesNotMatch(pureModuleTs, /function lite\$cryptoDigest/);
    assert.doesNotMatch(pureModuleTs, /node:crypto/);

    const pureLibModuleTs = compileAndVerify(['--builtin-mode=lib/core/crypto.lts=pure'], 'module lib/core/crypto.lts pure');
    assert.doesNotMatch(pureLibModuleTs, /function lite\$cryptoDigest/);

    const fnBytesPureTs = compileAndVerify(['--builtin-mode', 'core/crypto.sha256Bytes=pure'], 'fn sha256Bytes pure');
    assert.match(fnBytesPureTs, /function lite\$cryptoDigestBytes\(/); // sha512Bytes still builtin
    assert.match(fnBytesPureTs, /function lite\$cryptoDigestText\(/);
    assert.match(fnBytesPureTs, /function lite\$cryptoDigestFile\(/);

    const bothBytesPureTs = compileAndVerify([
      '--builtin-mode', 'core/crypto.sha256Bytes=pure',
      '--builtin-mode', 'core/crypto.sha512Bytes=pure',
    ], 'both bytes pure');
    assert.doesNotMatch(bothBytesPureTs, /function lite\$cryptoDigestBytes\(/);
    assert.match(bothBytesPureTs, /function lite\$cryptoDigestText\(/);
    assert.match(bothBytesPureTs, /function lite\$cryptoDigestFile\(/);

    const fnFileOverrideTs = compileAndVerify([
      '--builtin-mode', 'pure',
      '--builtin-mode', 'core/crypto.sha256File=builtin',
    ], 'project pure + fn sha256File builtin');
    assert.doesNotMatch(fnFileOverrideTs, /function lite\$cryptoDigestBytes\(/);
    assert.doesNotMatch(fnFileOverrideTs, /function lite\$cryptoDigestText\(/);
    assert.match(fnFileOverrideTs, /function lite\$cryptoDigestFile\(/);

    const precedenceOrderTs = compileAndVerify([
      '--builtin-mode', 'core/crypto.sha256File=pure',
      '--builtin-mode', 'core/crypto=builtin',
      '--builtin-mode', 'pure',
    ], 'specificity wins regardless of flag order');
    assert.match(precedenceOrderTs, /function lite\$cryptoDigestBytes\(/);
    assert.match(precedenceOrderTs, /function lite\$cryptoDigestText\(/);
    assert.doesNotMatch(precedenceOrderTs, /function lite\$cryptoDigestFile\(/);

    const fileOnlyTextBytesSource = [
      'crypto := import "core/crypto";',
      'io := import "core/io";',
      'io.outputLine(crypto.sha256Bytes([1]), crypto.sha512Text("x"));',
    ].join('\n');
    const fn512PureOnly = compileTs({
      text: fileOnlyTextBytesSource,
      name: join(workDir, 'fn512.lts'),
      options: ['--builtin-mode', 'pure', '--builtin-mode', 'core/crypto.sha256Bytes=builtin'],
    });
    assert.equal(fn512PureOnly.status, 0);
    assert.match(fn512PureOnly.stdout.toString(), /function lite\$cryptoDigestBytes\(/);
    assert.doesNotMatch(fn512PureOnly.stdout.toString(), /function lite\$cryptoDigestText\(/);

    for (const badOptions of [
      ['--builtin-mode'],
      ['--builtin-mode', 'bogus'],
      ['--builtin-mode', 'core/crypto=bogus'],
      ['--builtin-mode', '=pure'],
      ['--builtin-mode', 'core/crypto.=pure'],
      ['--builtin-mode', './core/crypto=pure'],
      ['--builtin-mode', './lib/core/crypto.lts=pure'],
      ['--builtin-mode', '../core/crypto=pure'],
      ['--builtin-mode', '/lib/core/crypto=pure'],
      ['--builtin-mode', 'lib\\core\\crypto=pure'],
      ['--builtin-mode', 'lib/core//crypto=pure'],
      ['--builtin-mode', 'foo/bar=pure'],
      ['--builtin-mode', 'core/unknown=pure'],
      ['--builtin-mode', 'core/crypto.nonexistent=pure'],
      ['--builtin-mode', 'core/crypto.randomBytes=pure'],
      ['--builtin-mode', 'core/crypto.lts.sha256Text=pure'],
      ['--unknown-flag'],
    ] as const) {
      for (const target of ['ts', 'c'] as const) {
        const bad = compileTarget(target, { text: 'io := import "core/io"; io.outputLine(1);', name: sourceFile, options: badOptions });
        assert.equal(bad.status, 2, `${target} ${badOptions.join(' ')}`);
      }
    }

    const cliPure = spawnSync(join(root, 'bin/lite-compile-ts'), ['--builtin-mode=pure', sourceFile], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(cliPure.status, 0, cliPure.stderr);
    assert.doesNotMatch(cliPure.stdout, /function lite\$cryptoDigest/);

    const liteCliCompile = spawnSync(join(root, 'bin/lite'), ['compile', '--builtin-mode', 'core/crypto.sha256File=pure', sourceFile], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(liteCliCompile.status, 0, liteCliCompile.stderr);
    assert.doesNotMatch(liteCliCompile.stdout, /function lite\$cryptoDigestFile\(/);
    assert.match(liteCliCompile.stdout, /function lite\$cryptoDigestText\(/);

    const liteCliRun = spawnSync(join(root, 'bin/lite'), ['run', '--builtin-mode', 'pure', sourceFile], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(liteCliRun.status, 0, liteCliRun.stderr);
    assert.equal(liteCliRun.stdout, expectedLine);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});

test('soft-builtin replacement enforces verified core module identity and path boundaries', () => {
  const workDir = mkdtempSync(join(tmpdir(), 'lite-soft-boundary-'));
  try {
    const localLibCore = join(workDir, 'lib/core');
    mkdirSync(localLibCore, { recursive: true });
    writeFileSync(
      join(localLibCore, 'crypto.lts'),
      'pub sha256Text := fn(text: String): String { "local:" + text }\n',
    );
    const appPath = join(workDir, 'app.lts');
    const appSource = [
      'io := import "core/io";',
      'stdCrypto := import "core/crypto";',
      'localCrypto := import "./lib/core/crypto.lts";',
      'io.outputLine(localCrypto.sha256Text("hello"), stdCrypto.sha256Text("hello"));',
    ].join('\n');
    writeFileSync(appPath, appSource);

    const compiled = compileTs({ text: appSource, name: appPath });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const tsCode = compiled.stdout.toString();
    assert.equal(checkTsArtifact(tsCode).status, 0);
    assert.match(tsCode, /"local:"/);
    assert.match(tsCode, /function lite\$cryptoDigestText\(/);
    withTsArtifact(tsCode, run => {
      const res = run();
      assert.equal(res.status, 0, res.stderr.toString());
      assert.equal(
        res.stdout.toString(),
        'local:hello 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824\n',
      );
    });

    const spoofedRoot = compileTs({
      text: [
        'io := import "core/io";',
        'pub sha256Text := fn(text: String): String { "spoofed:" + text }',
        'io.outputLine(sha256Text("hello"));',
      ].join('\n'),
      name: 'lib/core/crypto.lts',
    });
    assert.equal(spoofedRoot.status, 0, spoofedRoot.stderr.toString());
    assert.doesNotMatch(spoofedRoot.stdout.toString(), /function lite\$cryptoDigestText\(/);
    withTsArtifact(spoofedRoot.stdout.toString(), run => {
      const res = run();
      assert.equal(res.status, 0, res.stderr.toString());
      assert.equal(res.stdout.toString(), 'spoofed:hello\n');
    });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});

test('pure and soft-builtin modes match for core/text.indexOf and core/io stream helpers', () => {
  const workDir = mkdtempSync(join(tmpdir(), 'lite-pure-text-io-'));
  try {
    const bigFile = join(workDir, 'big.txt');
    writeFileSync(bigFile, 'A'.repeat(70000) + '€');

    const source = [
      'io := import "core/io";',
      'file := import "core/file";',
      'list := import "core/list";',
      'textLib := import "core/text";',
      'uni := import "core/unicode";',
      '',
      '/* text.indexOf cases (ASCII, boundaries, empty needle, non-BMP scalars) */',
      'u := "a😀b€c😀d";',
      'textSummary := [',
      '    textLib.indexOf("hello world", "world", 0),',
      '    textLib.indexOf("banana", "ana", 2),',
      '    textLib.indexOf("abc", "z", 0),',
      '    textLib.indexOf("abc", "abcd", 0),',
      '    textLib.indexOf("abc", "", 0),',
      '    textLib.indexOf("abc", "", 3),',
      '    textLib.indexOf("abc", "", 4),',
      '    textLib.indexOf("abc", "a", -1),',
      '    textLib.indexOf(u, "€", 0),',
      '    textLib.indexOf(u, "😀", 2),',
      '    textLib.indexOf(u, "d", 6),',
      '    textLib.indexOf(u, "", 7),',
      '    textLib.indexOf(u, "", 8)',
      '];',
      '',
      '/* io stream helper cases */',
      'tr := io.textReader("a€😀");',
      'trBytes := io.readAll(tr);',
      'trEofAfter := io.readerAtEof(tr);',
      '',
      'collectLines := fn(r: io.Reader): String {',
      '    var out := "";',
      '    loop true {',
      '        res := io.readLine(r);',
      '        if not res.ok { return "ERR:" + res.error; }',
      '        if res.eof { break; }',
      '        if out =!= "" { out = out + "|"; }',
      '        out = out + "[" + res.line + "]";',
      '    }',
      '    out',
      '};',
      'linesCrlf := collectLines(io.textReader("alpha\\r\\n\\nbeta\\rgamma\\r\\n€😀"));',
      'linesEmpty := collectLines(io.textReader(""));',
      'badLine := io.readLine(io.bufferReader([195, 40]));',
      '',
      'bw := io.bufferWriter();',
      'wt := io.writeText(bw, "A€");',
      'wl := io.writeLine(bw, "😀");',
      'wl2 := io.writeLine(bw, "");',
      'bwBytes := io.writerBytes(bw);',
      'bwTxt := io.writerText(bw);',
      '_cw := io.closeWriter(bw);',
      'wtClosed := io.writeText(bw, "x");',
      'bwClosedTxt := io.writerText(bw);',
      '',
      'rtOk := io.readAllText(io.bufferReader(uni.utf8Encode("hi€😀")));',
      'rtBad := io.readAllText(io.bufferReader([255, 128]));',
      'cr := io.textReader("x");',
      '_crClose := io.closeReader(cr);',
      'rtClosed := io.readAllText(cr);',
      'rlClosed := io.readLine(cr);',
      '',
      `bigReader := file.openReader(${JSON.stringify(bigFile)});`,
      'bigRes := io.readAllText(bigReader);',
      '_bigClose := io.closeReader(bigReader);',
      '',
      'io.outputLine(',
      '    textSummary,',
      '    trBytes,',
      '    trEofAfter,',
      '    linesCrlf,',
      '    linesEmpty,',
      '    badLine.ok,',
      '    badLine.eof,',
      '    badLine.error =!= "",',
      '    wt.ok,',
      '    wl.ok,',
      '    wl2.ok,',
      '    bwBytes,',
      '    bwTxt.ok,',
      '    bwClosedTxt.ok,',
      '    bwTxt.text == bwClosedTxt.text,',
      '    not wtClosed.ok,',
      '    rtOk.ok,',
      '    rtOk.text == "hi€😀",',
      '    not rtBad.ok,',
      '    not rtClosed.ok,',
      '    not rlClosed.ok,',
      '    bigRes.ok,',
      '    textLib.length(bigRes.text),',
      '    textLib.at(bigRes.text, 70000)',
      ');',
    ].join('\n');

    const sourceFile = join(workDir, 'pure-text-io.lts');
    writeFileSync(sourceFile, source);
    const expectedLine = '[6, 3, -1, -1, 0, 3, -1, -1, 3, 5, 6, 7, -1] [97, 226, 130, 172, 240, 159, 152, 128] true [alpha]|[]|[beta\rgamma]|[€😀]  false false true true true true [65, 226, 130, 172, 240, 159, 152, 128, 10, 10] true true true true true true true true true true 70001 €\n';

    const compileAndCheck = (options: readonly string[], label: string): string => {
      const compiled = compileTs({ text: source, name: sourceFile, options });
      assert.equal(compiled.status, 0, `${label}: ${compiled.stderr.toString()}`);
      const tsCode = compiled.stdout.toString();
      assert.equal(checkTsArtifact(tsCode).status, 0, `${label}: strict TS check`);
      withTsArtifact(tsCode, run => {
        const res = run();
        assert.equal(res.status, 0, `${label}: runtime`);
        assert.equal(res.stdout.toString(), expectedLine, `${label}: output`);
      });
      return tsCode;
    };

    const defaultTs = compileAndCheck([], 'default builtin');
    assert.match(defaultTs, /function lite\$textIndexOf\(/);
    assert.match(defaultTs, /function lite\$ioTextReader\(/);
    assert.match(defaultTs, /function lite\$ioReadAll\(/);
    assert.match(defaultTs, /function lite\$ioReadAllText\(/);
    assert.match(defaultTs, /function lite\$ioReadLine\(/);
    assert.match(defaultTs, /function lite\$ioWriteText\(/);
    assert.match(defaultTs, /function lite\$ioWriteLine\(/);

    const pureProjectTs = compileAndCheck(['--builtin-mode', 'pure'], 'project pure');
    assert.doesNotMatch(pureProjectTs, /function lite\$textIndexOf\(/);
    assert.doesNotMatch(pureProjectTs, /function lite\$ioTextReader\(/);
    assert.doesNotMatch(pureProjectTs, /function lite\$ioReadAll\(/);
    assert.doesNotMatch(pureProjectTs, /function lite\$ioReadAllText\(/);
    assert.doesNotMatch(pureProjectTs, /function lite\$ioReadLine\(/);
    assert.doesNotMatch(pureProjectTs, /function lite\$ioWriteText\(/);
    assert.doesNotMatch(pureProjectTs, /function lite\$ioWriteLine\(/);

    const textOnlyPureTs = compileAndCheck(['--builtin-mode', 'core/text.indexOf=pure'], 'fn core/text.indexOf=pure');
    assert.doesNotMatch(textOnlyPureTs, /function lite\$textIndexOf\(/);
    assert.match(textOnlyPureTs, /function lite\$ioReadLine\(/);

    const ioPureTs = compileAndCheck(['--builtin-mode', 'core/io=pure'], 'module core/io=pure');
    assert.match(ioPureTs, /function lite\$textIndexOf\(/);
    assert.doesNotMatch(ioPureTs, /function lite\$ioTextReader\(/);
    assert.doesNotMatch(ioPureTs, /function lite\$ioReadAll\(/);
    assert.doesNotMatch(ioPureTs, /function lite\$ioReadAllText\(/);
    assert.doesNotMatch(ioPureTs, /function lite\$ioReadLine\(/);
    assert.doesNotMatch(ioPureTs, /function lite\$ioWriteText\(/);
    assert.doesNotMatch(ioPureTs, /function lite\$ioWriteLine\(/);

    const ioSingleFnPureTs = compileAndCheck(['--builtin-mode', 'core/io.readLine=pure'], 'fn core/io.readLine=pure');
    assert.doesNotMatch(ioSingleFnPureTs, /function lite\$ioReadLine\(/);
    assert.match(ioSingleFnPureTs, /function lite\$ioWriteLine\(/);
    assert.match(ioSingleFnPureTs, /function lite\$ioTextReader\(/);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});

test('soft builtin overrides for core/unicode and core/file match pure implementations and respect --builtin-mode', () => {
  const workDir = mkdtempSync(join(tmpdir(), 'litescript-soft-unicode-file-'));
  try {
    const textPath = join(workDir, 'note.txt');
    const bytesPath = join(workDir, 'raw.bin');
    const missingPath = join(workDir, 'missing.bin');
    const src = [
      'file := import "core/file";',
      'io := import "core/io";',
      'uni := import "core/unicode";',
      'enc := uni.utf8Encode("A€🙂");',
      'dec := uni.utf8DecodeStrict(enc);',
      'badRange := uni.utf8DecodeStrict([256]);',
      'badSeq := uni.utf8DecodeStrict([255]);',
      'lossy := uni.utf8DecodeLossy([65, 255, 66]);',
      'lossyRange := uni.utf8DecodeLossy([65, 999, 66]);',
      `w1 := file.writeText(${JSON.stringify(textPath)}, "hi");`,
      `a1 := file.appendText(${JSON.stringify(textPath)}, "🙂");`,
      `r1 := file.readText(${JSON.stringify(textPath)});`,
      `w2 := file.writeBytes(${JSON.stringify(bytesPath)}, [65, 66]);`,
      `a2 := file.appendBytes(${JSON.stringify(bytesPath)}, [67]);`,
      `rb := file.readBytes(${JSON.stringify(bytesPath)});`,
      `badW := file.writeBytes(${JSON.stringify(bytesPath)}, [256]);`,
      'io.outputLine(enc, dec.ok, dec.text, not badRange.ok, not badSeq.ok, lossy, lossyRange);',
      'io.outputLine(w1.ok, a1.ok, r1.ok, r1.text, w2.ok, a2.ok, rb, not badW.ok);',
    ].join('\n');

    const compileAndCheck = (extraArgs: string[], label: string): string => {
      const compiled = compileTs({ text: src, name: 'main.lts', options: extraArgs });
      assert.equal(compiled.status, 0, `${label}: ${compiled.stderr.toString()}`);
      const tsCode = compiled.stdout.toString();
      assert.equal(checkTsArtifact(tsCode).status, 0, `${label}: strict TS check`);
      withTsArtifact(tsCode, run => {
        const res = run();
        assert.equal(res.status, 0, `${label}: runtime ${res.stderr.toString()}`);
        assert.equal(
          res.stdout.toString(),
          '[65, 226, 130, 172, 240, 159, 153, 130] true A€🙂 true true A\ufffdB A\ufffdB\ntrue true true hi🙂 true true [65, 66, 67] true\n',
          `${label}: output`,
        );
      });
      return tsCode;
    };

    const defaultTs = compileAndCheck([], 'default builtin');
    assert.match(defaultTs, /function lite\$unicodeUtf8Encode\(/);
    assert.match(defaultTs, /function lite\$unicodeUtf8DecodeStrict\(/);
    assert.match(defaultTs, /function lite\$unicodeUtf8DecodeLossy\(/);
    assert.match(defaultTs, /function lite\$fileReadBytes\(/);
    assert.match(defaultTs, /function lite\$fileReadText\(/);
    assert.match(defaultTs, /function lite\$fileWriteBytes\(/);
    assert.match(defaultTs, /function lite\$fileWriteText\(/);
    assert.match(defaultTs, /function lite\$fileAppendBytes\(/);
    assert.match(defaultTs, /function lite\$fileAppendText\(/);

    const pureTs = compileAndCheck(['--builtin-mode', 'pure'], 'project pure');
    assert.doesNotMatch(pureTs, /function lite\$unicodeUtf8Encode\(/);
    assert.doesNotMatch(pureTs, /function lite\$fileReadBytes\(/);

    const uniPureTs = compileAndCheck(['--builtin-mode', 'core/unicode=pure'], 'module core/unicode=pure');
    assert.doesNotMatch(uniPureTs, /function lite\$unicodeUtf8Encode\(/);
    assert.match(uniPureTs, /function lite\$fileWriteText\(/);

    const readTextPureTs = compileAndCheck(['--builtin-mode', 'core/file.readText=pure'], 'fn core/file.readText=pure');
    assert.doesNotMatch(readTextPureTs, /function lite\$fileReadText\(/);
    assert.match(readTextPureTs, /function lite\$fileWriteText\(/);

    const readFailSrc = [
      'file := import "core/file";',
      'io := import "core/io";',
      `{ _ := file.readBytes(${JSON.stringify(missingPath)}); } finally { io.outputLine("cleaned"); };`,
    ].join('\n');
    for (const [label, args] of [['default', []], ['pure', ['--builtin-mode', 'pure']]] as const) {
      const compiled = compileTs({ text: readFailSrc, name: 'main.lts', options: [...args] });
      assert.equal(compiled.status, 0, `${label} fail: ${compiled.stderr.toString()}`);
      assert.equal(checkTsArtifact(compiled.stdout.toString()).status, 0);
      withTsArtifact(compiled.stdout.toString(), run => {
        const res = run();
        assert.equal(res.status, 2, `${label} readBytes exit status`);
        assert.equal(res.stdout.toString(), 'cleaned\n', `${label} defer cleanup`);
      });
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});

test('unreachable pure top-level symbols are purged while top-level side effects are preserved', () => {
  const cryptoThin = compileTs({
    text: 'crypto := import "core/crypto"; io := import "core/io"; io.outputLine(crypto.sha256Text("hi"));',
    name: 'main.lts',
  });
  assert.equal(cryptoThin.status, 0, cryptoThin.stderr.toString());
  const cryptoCode = cryptoThin.stdout.toString();
  assert.equal(checkTsArtifact(cryptoCode).status, 0);
  assert.doesNotMatch(cryptoCode, /buildNibbleTable|k256|k512Hi|k512Lo|b64Alphabet|hexAlphabet|xor4|and4/);
  withTsArtifact(cryptoCode, run => {
    const res = run();
    assert.equal(res.status, 0, res.stderr.toString());
    assert.equal(res.stdout.toString(), '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4\n');
  });

  const mixedSrc = [
    'io := import "core/io";',
    'unusedPure := "PURGED_PURE_MARKER";',
    'unusedSum := 1 + 2;',
    'sideEffectFn := fn(): Int { io.outputLine("kept-side-effect"); 7 };',
    'keptSideEffect := sideEffectFn();',
    'unusedHelper := fn(): String { "PURGED_FN_MARKER" };',
  ].join('\n');
  const mixedCompiled = compileTs({ text: mixedSrc, name: 'main.lts' });
  assert.equal(mixedCompiled.status, 0, mixedCompiled.stderr.toString());
  const mixedCode = mixedCompiled.stdout.toString();
  assert.equal(checkTsArtifact(mixedCode).status, 0);
  assert.doesNotMatch(mixedCode, /PURGED_PURE_MARKER|PURGED_FN_MARKER/);
  withTsArtifact(mixedCode, run => {
    const res = run();
    assert.equal(res.status, 0, res.stderr.toString());
    assert.equal(res.stdout.toString(), 'kept-side-effect\n');
  });

  const faultSrc = [
    'unusedFault := 1 / 0;',
  ].join('\n');
  const faultCompiled = compileTs({ text: faultSrc, name: 'main.lts' });
  assert.equal(faultCompiled.status, 0, faultCompiled.stderr.toString());
  assert.equal(checkTsArtifact(faultCompiled.stdout.toString()).status, 0);
  withTsArtifact(faultCompiled.stdout.toString(), run => {
    const res = run();
    assert.notEqual(res.status, 0);
    assert.match(res.stderr.toString(), /division by zero/);
  });
});

test('soft builtin overrides for core/int, core/text, and core/crypto match pure implementations and respect --builtin-mode', () => {
  const intTextSrc = [
    'integer := import "core/int";',
    'io := import "core/io";',
    'text := import "core/text";',
    'uni := import "core/unicode";',
    'nbsp := uni.fromCodePoints([160]).text;',
    'vtab := uni.fromCodePoints([11]).text;',
    'io.outputLine(integer.intText(0), integer.intText(-42), integer.intText(integer.intMax), integer.intText(integer.intMin));',
    'io.outputLine(text.startsWithAt("A🙂B", 1, "🙂"), text.startsWithAt("A🙂B", 2, "B"), text.startsWithAt("A🙂B", -1, "A"), text.startsWithAt("A🙂B", 3, ""));',
    'io.outputLine(text.wordAt("if_x", 0, "if"), text.wordAt("if 🙂", 0, "if"), text.wordAt("a🙂b", 0, "a"), text.wordAt("if", 0, "if"));',
    'io.outputLine(text.joinTexts([], ","), text.joinTexts(["x"], ","), text.joinTexts(["a", "b", "c"], "-"));',
    'n0 := text.textToInt("-9223372036854775808"); n1 := text.textToInt("+42"); n2 := text.textToInt("9223372036854775808"); n3 := text.textToInt("1a");',
    'io.outputLine(n0.ok, n0.value, n1.ok, n1.value, n2.ok, n3.ok);',
    'padded := " \\t" + nbsp + "hi" + vtab + "\\r\\n ";',
    'io.outputLine("[" + text.trimStart(padded) + "]", "[" + text.trimEnd(padded) + "]", "[" + text.trim(padded) + "]");',
    'io.outputLine(text.endsWith("A🙂bc", "🙂bc"), text.endsWith("A🙂bc", "xy"), text.containsText("A🙂bc", "🙂b"), text.repeatText("hi", 3), "[" + text.repeatText("hi", -2) + "]");',
    'io.outputLine(text.toLowerAscii("ÄÉΩABC_xyz🙂"), text.isDigit("5"), text.isAsciiLetter("Q"), text.isNameStart("_"), text.isNameContinue("9"), text.isWhitespace(nbsp));',
    'io.outputLine(text.skipSpaces(" \\t\\r\\n🙂x", 0), text.skipSpaces("🙂  foo", 1), text.skipSpaces("abc", 10), text.skipName("abc_12🙂", 0), text.skipName("🙂abc", 1), text.skipName("abc", 9));',
    'io.outputLine(text.indexOfText("A🙂B🙂C", "🙂", 0), text.indexOfText("A🙂B🙂C", "🙂", 2), text.indexOfText("A🙂B", "", -1), text.indexOfText("A🙂B", "", 3), text.indexOfText("A🙂B", "", 4));',
  ].join('\n');

  const runVariant = (src: string, args: readonly string[], label: string): { code: string; stdout: string } => {
    const compiled = compileTs({ text: src, name: 'main.lts', options: [...args] });
    assert.equal(compiled.status, 0, `${label}: ${compiled.stderr.toString()}`);
    const code = compiled.stdout.toString();
    assert.equal(checkTsArtifact(code).status, 0, `${label}: strict TS check`);
    let stdout = '';
    withTsArtifact(code, run => {
      const res = run();
      assert.equal(res.status, 0, `${label}: runtime ${res.stderr.toString()}`);
      stdout = res.stdout.toString();
    });
    return { code, stdout };
  };

  const textDefault = runVariant(intTextSrc, [], 'int/text default');
  assert.match(textDefault.code, /String\(lite_value\)/);
  assert.match(textDefault.code, /function lite\$textStartsWithAt\(/);
  assert.match(textDefault.code, /function lite\$textWordAt\(/);
  assert.match(textDefault.code, /function lite\$textToInt\(/);
  assert.match(textDefault.code, /function lite\$textTrim\(/);
  assert.match(textDefault.code, /function lite\$textToLowerAscii\(/);
  assert.match(textDefault.code, /function lite\$textSkipWhile\(/);

  const textPure = runVariant(intTextSrc, ['--builtin-mode', 'pure'], 'int/text pure');
  assert.equal(textDefault.stdout, textPure.stdout);
  assert.doesNotMatch(textPure.code, /function lite\$textStartsWithAt\(/);
  assert.doesNotMatch(textPure.code, /function lite\$textWordAt\(/);
  assert.doesNotMatch(textPure.code, /function lite\$textTrim\(/);
  assert.doesNotMatch(textPure.code, /function lite\$textSkipWhile\(/);

  const intPure = runVariant(intTextSrc, ['--builtin-mode', 'core/int=pure'], 'core/int=pure');
  assert.equal(intPure.stdout, textPure.stdout);
  assert.doesNotMatch(intPure.code, /String\(lite_value\)/);
  assert.match(intPure.code, /function lite\$textWordAt\(/);

  const wordPure = runVariant(intTextSrc, ['--builtin-mode', 'core/text.wordAt=pure'], 'core/text.wordAt=pure');
  assert.equal(wordPure.stdout, textPure.stdout);
  assert.doesNotMatch(wordPure.code, /function lite\$textWordAt\(/);
  assert.match(wordPure.code, /function lite\$textStartsWithAt\(/);

  const indexOfTextPure = runVariant(intTextSrc, ['--builtin-mode', 'core/text.indexOfText=pure'], 'core/text.indexOfText=pure');
  assert.equal(indexOfTextPure.stdout, textPure.stdout);

  const cryptoSrc = [
    'crypto := import "core/crypto";',
    'io := import "core/io";',
    'io.outputLine(crypto.isValidBase64(""), crypto.isValidBase64("AEH/"), crypto.isValidBase64("YQ=="), crypto.isValidBase64("Y==="), crypto.isValidBase64("===="), crypto.isValidBase64("YW Jj"));',
    'io.outputLine(crypto.isValidHex(""), crypto.isValidHex("0041ff"), crypto.isValidHex("ABCDEF"), crypto.isValidHex("abc"), crypto.isValidHex("00gg"));',
    'raw: List<Int> = [0, 65, 255];',
    'b64 := crypto.base64Encode(raw);',
    'hex := crypto.hexEncode(raw);',
    'io.outputLine(b64, crypto.base64Decode(b64), hex, crypto.hexDecode(hex), crypto.hexDecode("00FF"));',
    'key: List<Int> = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];',
    'longKey := crypto.base64Decode("QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5");',
    'io.outputLine(crypto.hmacSha256Bytes(key, raw), crypto.hmacSha256Bytes(longKey, raw));',
  ].join('\n');

  const cryptoDefault = runVariant(cryptoSrc, [], 'crypto default');
  assert.match(cryptoDefault.code, /function lite\$cryptoHmacSha256Bytes\(/);
  assert.match(cryptoDefault.code, /function lite\$cryptoEncodeBytes\(/);
  assert.match(cryptoDefault.code, /function lite\$cryptoDecodeBytes\(/);

  const cryptoPure = runVariant(cryptoSrc, ['--builtin-mode', 'pure'], 'crypto pure');
  assert.equal(cryptoDefault.stdout, cryptoPure.stdout);
  assert.doesNotMatch(cryptoPure.code, /function lite\$cryptoHmacSha256Bytes\(/);
  assert.doesNotMatch(cryptoPure.code, /node:buffer/);

  const decodePure = runVariant(cryptoSrc, ['--builtin-mode', 'core/crypto.base64Decode=pure'], 'core/crypto.base64Decode=pure');
  assert.equal(decodePure.stdout, cryptoPure.stdout);
  assert.match(decodePure.code, /function lite\$cryptoEncodeBytes\(/);

  for (const [faultLabel, faultStmt, expectedErr] of [
    ['invalid base64Decode', 'crypto.base64Decode("Y===")', /invalid base64 input/],
    ['invalid hexDecode', 'crypto.hexDecode("0g")', /invalid hex input/],
    ['out-of-range base64Encode', 'crypto.base64Encode([256])', /byte value outside 0\.\.255: 256/],
    ['out-of-range hexEncode', 'crypto.hexEncode([-1])', /byte value outside 0\.\.255: -1/],
    ['out-of-range hmac key', 'crypto.hmacSha256Bytes([256], [1])', /byte value outside 0\.\.255: 256/],
    ['out-of-range hmac data', 'crypto.hmacSha256Bytes([1], [256])', /byte value outside 0\.\.255: 256/],
  ] as const) {
    const faultCodeSrc = [
      'crypto := import "core/crypto";',
      'io := import "core/io";',
      `{ _ := ${faultStmt}; } finally { io.outputLine("cleaned"); };`,
    ].join('\n');
    for (const [modeLabel, modeArgs] of [['default', []], ['pure', ['--builtin-mode', 'pure']]] as const) {
      const compiled = compileTs({ text: faultCodeSrc, name: 'main.lts', options: [...modeArgs] });
      assert.equal(compiled.status, 0, `${faultLabel} ${modeLabel}: ${compiled.stderr.toString()}`);
      assert.equal(checkTsArtifact(compiled.stdout.toString()).status, 0);
      withTsArtifact(compiled.stdout.toString(), run => {
        const res = run();
        assert.equal(res.status, 2, `${faultLabel} ${modeLabel} status`);
        assert.equal(res.stdout.toString(), 'cleaned\n', `${faultLabel} ${modeLabel} finally`);
        assert.match(res.stderr.toString(), expectedErr, `${faultLabel} ${modeLabel} stderr`);
      });
    }
  }

  for (const [faultLabel, faultStmt] of [
    ['negative skipSpaces on empty', 'text.skipSpaces("", -1)'],
    ['negative skipSpaces on non-empty', 'text.skipSpaces("  a", -1)'],
    ['negative skipName on empty', 'text.skipName("", -1)'],
    ['negative skipName on non-empty', 'text.skipName("abc", -1)'],
  ] as const) {
    const boundSrc = [
      'text := import "core/text";',
      'io := import "core/io";',
      `{ _ := ${faultStmt}; } finally { io.outputLine("cleaned"); };`,
    ].join('\n');
    for (const [modeLabel, modeArgs] of [['default', []], ['pure', ['--builtin-mode', 'pure']]] as const) {
      const compiled = compileTs({ text: boundSrc, name: 'main.lts', options: [...modeArgs] });
      assert.equal(compiled.status, 0, `${faultLabel} ${modeLabel}: ${compiled.stderr.toString()}`);
      assert.equal(checkTsArtifact(compiled.stdout.toString()).status, 0);
      withTsArtifact(compiled.stdout.toString(), run => {
        const res = run();
        assert.equal(res.status, 1, `${faultLabel} ${modeLabel} status`);
        assert.equal(res.stdout.toString(), 'cleaned\n', `${faultLabel} ${modeLabel} finally`);
        assert.match(res.stderr.toString(), /BoundPanic/, `${faultLabel} ${modeLabel} stderr`);
      });
    }
  }
});

test('first-class non-capturing function values, callable types, contextual inference, self recursion, and DCE work in TS', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-fn-values-'));
  try {
    const opsPath = join(directory, 'ops.lts');
    const appPath = join(directory, 'app.lts');
    writeFileSync(opsPath, [
      'helper := fn(n: Int): Int { n * 2 };',
      'pub double := fn(x: Int): Int { helper(x) };',
      'pub unusedPub := fn(x: Int): Int { x + 999 };',
    ].join('\n'));
    writeFileSync(appPath, [
      'io := import "core/io";',
      'list := import "core/list";',
      'opsMod := import "./ops.lts";',
      'Op := type fn(Int): Int;',
      'Combine := type fn(Int, String): String;',
      'ZeroThunk := type fn(): Int;',
      'PairOp := type (op: Op, offset: Int);',
      'apply := fn(op: Op, x: Int): Int { op(x) };',
      'applyPair := fn(p: PairOp): Int { p.op(p.offset) };',
      'applyCombine := fn(f: Combine, n: Int, s: String): String { f(n, s) };',
      'incByTen := fn(x: Int): Int { x + 10 };',
      'bump := fn(x: Int): Int { x + 1 };',
      'makeStep := fn(kind: Int): Op {',
      '  if kind == 0 { fn(x) { x + 2 } } else { fn(x) { x * 3 } }',
      '};',
      'runNested := fn(flag: Bool): Int {',
      '  localAdd := fn(a: Int, b: Int, c: Int): Int { a * 100 + b * 10 + c };',
      '  b := 2; c := 3;',
      '  routed := localAdd(9, a = 1, =b, =c);',
      '  pair := (op = fn(n: Int): Int { n + 5 }, offset = 4);',
      '  (extracted, offsetVal) := pair;',
      '  matched := match { flag { fn(a: Int): Int { a + 1 } } _ { fn(b2: Int): Int { b2 * 10 } } };',
      '  {',
      '    bump := fn(x: Int): Int { x * 10 };',
      '    io.outputLine("shadow", bump(3));',
      '  }',
      '  io.outputLine("outer", bump(3), routed, applyPair(pair), pair.0(1), extracted(offsetVal), matched(4));',
      '  routed',
      '};',
      'orderTest := fn(): Unit {',
      '  pick := fn(): fn(Int, Int): Int {',
      '    io.outputLine("callee");',
      '    fn(a: Int, b: Int): Int { io.outputLine("body", a, b); a - b }',
      '  };',
      '  arg := fn(tag: String, v: Int): Int { io.outputLine(tag); v };',
      '  io.outputLine((pick())(arg("first", 10), arg("second", 3)));',
      '};',
      'var zf: fn(Int): Int;',
      'var zt: ZeroThunk;',
      'var zu: fn(): Unit;',
      'var zs: fn(Int): String;',
      'var zarr: [Op; 2];',
      'var rf: fn(Int): Int = ?;',
      'zu();',
      'rf = fn(x) { x + 50 };',
      'io.outputLine("zero", zf(9), zt(), zs(1), zarr[0](5), rf(7));',
      'zf = fn(x) { x + 100 };',
      'io.outputLine("reassigned", zf(7));',
      'var dyn: fn(Int): Int = fn(n) { if n <= 1 { 1 } else { n * self(n - 1) } };',
      'io.outputLine("rec", dyn(5), apply(fn(n) { if n <= 0 { 0 } else { n + self(n - 1) } }, 4));',
      'dyn = fn(n) { n * 2 };',
      'io.outputLine("reassigned2", dyn(6), apply(incByTen, 5), apply(opsMod.double, 7));',
      'io.outputLine("step", makeStep(0)(10), makeStep(1)(10));',
      'io.outputLine("comb", applyCombine(fn(n, s) { s + ":" }, 3, "k"));',
      'arr: [Op; 2] = [fn(x) { x + 1 }, incByTen];',
      'opList: mut List<Op> = [fn(x) { x * 2 }, opsMod.double];',
      'list.pushBack(mut opList, fn(x) { x - 1 });',
      'io.outputLine("colls", arr[0](4), arr[1](4), opList[0](5), opList[1](5), opList[2](5));',
      'var sink: fn(Int): Unit = fn(n: Int): Unit { io.outputLine("sink", n); };',
      'sink(42);',
      '_ := runNested(false);',
      'orderTest();',
    ].join('\n'));
    const compiled = compileTs({ text: readFileSync(appPath, 'utf8'), name: realpathSync(appPath) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const emitted = compiled.stdout.toString();
    assert.doesNotMatch(emitted, /unusedPub/, 'unused exported function in imported module should stay pruned');
    assert.equal(checkTsArtifact(emitted).status, 0, emitted);
    const actual = runTsArtifact(emitted);
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.stdout.toString(), [
      'zero 0 0  0 57',
      'reassigned 107',
      'rec 120 10',
      'reassigned2 12 15 14',
      'step 12 30',
      'comb k:',
      'colls 5 14 10 10 4',
      'sink 42',
      'shadow 30',
      'outer 4 123 9 6 9 40',
      'callee',
      'first',
      'second',
      'body 10 3',
      '7',
    ].join('\n') + '\n');

    const neverSrc = [
      'io := import "core/io";',
      'die := fn(code: Int): Int { io.exit(code); };',
      'runExit := fn(f: fn(Int): Int): Int { f(4) };',
      'io.outputLine(runExit(die));',
    ].join('\n');
    const neverCompiled = compileTs({ text: neverSrc });
    assert.equal(neverCompiled.status, 0, neverCompiled.stderr.toString());
    assert.equal(checkTsArtifact(neverCompiled.stdout.toString()).status, 0);
    const neverRun = runTsArtifact(neverCompiled.stdout.toString());
    assert.equal(neverRun.status, 4);
    assert.equal(neverRun.stdout.toString(), '');

    const neverArgSrc = [
      'io := import "core/io";',
      'badB := fn(): Int { io.outputLine("should-not-run"); 9 };',
      'localAdd := fn(a: Int, b: Int): Int { a + b };',
      'io.outputLine(localAdd(io.exit(5), badB()));',
    ].join('\n');
    const neverArgCompiled = compileTs({ text: neverArgSrc });
    assert.equal(neverArgCompiled.status, 0, neverArgCompiled.stderr.toString());
    assert.equal(checkTsArtifact(neverArgCompiled.stdout.toString()).status, 0);
    const neverArgRun = runTsArtifact(neverArgCompiled.stdout.toString());
    assert.equal(neverArgRun.status, 5);
    assert.equal(neverArgRun.stdout.toString(), '');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('first-class function rejections cover non-function calls, tags, comparisons, cyclic aliases, and C backend', () => {
  for (const [source, expectedMessage] of [
    ['io := import "core/io"; f := fn(): Int { 1 }; { f := 2; io.outputLine(f()); }', /cannot call non-function value of type Int/],
    ['x := "hi"; x();', /cannot call non-function value of type String/],
    ['v := @outer { f := fn(): Int { return @outer 5; 1 }; _ := f(); 0 };', /unknown block tag @outer/],
    ['@outer loop true { f := fn(): Unit { break @outer; }; f(); break; }', /unknown block tag @outer/],
    ['var rf: fn(Int): Int = ?; _ := rf(1);', /cannot read uninitialized local rf/],
    ['io := import "core/io"; f := fn(x: Int): Int { x }; g := fn(x: Int): Int { x }; io.outputLine(f == g);', /cannot compare function values/],
    ['io := import "core/io"; f := fn(x: Int): Int { x }; g := fn(x: Int): Int { x }; io.outputLine(f =!= g);', /cannot compare function values/],
    ['io := import "core/io"; f := fn(x: Int): Int { x }; io.outputLine(f);', /cannot output function value/],
    ['Bad := type fn(Bad): Int; var f: Bad = ?;', /recursive type alias Bad/],
    ['f: fn(Int): Int = fn(x, y) { x + y };', /expected : Type for parameter y/],
    ['f: fn(Int): Int = fn(x: Int, y: Int): Int { x + y };', /cannot initialize/],
    ['f: fn(Int): Int = fn(x) { "bad" };', /cannot return String from function/],
    ['f := fn(x: Int): Unit { }; n: Int = f(1);', /cannot initialize Int with Unit|cannot assign/],
    ['f := fn(a: Int): Int { a }; f(z = 1);', /unknown parameter z/],
    ['io := import "core/io"; io.outputLine(io.inputArgs);', /function io\.inputArgs must be called/],
  ] as const) {
    const rejected = compileTs({ text: source });
    assert.equal(rejected.status, 2, source + ' -> stdout:\n' + rejected.stdout.toString());
    assert.match(rejected.stderr.toString(), expectedMessage, source + ' -> stderr: ' + rejected.stderr.toString());
  }

  for (const [source, expectedMessage] of [
    ['{ f := fn(): Int { 1 }; _ := f(); }', /C backend does not support function values yet/],
    ['var f: fn(Int): Int;', /C backend does not support function values yet/],
    ['inc := fn(x: Int): Int { x + 1 }; ops: List<fn(Int): Int> = [inc];', /function inc must be called/],
    ['inc := fn(x: Int): Int { x + 1 }; apply := fn(op: fn(Int): Int): Int { op(1) }; _ := apply(inc);', /C backend does not support indirect function calls yet/],
  ] as const) {
    const cRejected = compileTarget('c', { text: source });
    assert.equal(cRejected.status, 2, source);
    assert.match(cRejected.stderr.toString(), expectedMessage, source + ' -> stderr: ' + cRejected.stderr.toString());
  }
});

test('unified block Slice 1 enforces same-block uniqueness across root and inner blocks on TS and C', () => {
  const duplicateRe = /duplicate (?:declaration \S+ in block|top-level value \S+|module alias \S+|function \S+|type alias \S+)/;
  const topLevelOnlyRe = /(?:pub is only allowed on top-level declarations|import is only allowed at top level)/;

  const sharedRejections: ReadonlyArray<readonly [string, RegExp]> = [
    // Root cross-kind and same-kind collisions
    ['x := 1; x := fn(): Int { 2 };', duplicateRe],
    ['x := fn(): Int { 2 }; x := 1;', duplicateRe],
    ['var x := 1; x := fn(): Int { 2 };', duplicateRe],
    ['x := fn(): Int { 2 }; x: Int = 1;', duplicateRe],
    ['x := 1; x := type Int;', duplicateRe],
    ['x := type Int; x := 1;', duplicateRe],
    ['x := fn(): Int { 2 }; x := type Int;', duplicateRe],
    ['x := type Int; x := fn(): Int { 2 };', duplicateRe],
    ['io := import "core/io"; io := 1;', duplicateRe],
    ['io := 1; io := import "core/io";', duplicateRe],
    ['io := import "core/io"; io := fn(): Int { 1 };', duplicateRe],
    ['io := fn(): Int { 1 }; io := import "core/io";', duplicateRe],
    ['io := import "core/io"; io := type Int;', duplicateRe],
    ['io := type Int; io := import "core/io";', duplicateRe],
    ['(dup, dup) := (1, 2);', duplicateRe],
    ['(a, b) := (1, 2); a := 3;', duplicateRe],
    ['a := 1; (a, b) := (2, 3);', duplicateRe],
    ['a := 1; a: Int = 2;', duplicateRe],
    ['_ := 1; _ := 2;', duplicateRe],
    // Statement-block, branch, match, loop, function, and value-block same-block collisions
    ['{ x := 1; x := 2; }', duplicateRe],
    ['{ x := 1; var x := 2; }', duplicateRe],
    ['{ var x := 1; x: Int = 2; }', duplicateRe],
    ['seed: List<Int> = [1]; { mut xs := seed; xs := [2]; }', duplicateRe],
    ['{ (a, b) := (1, 2); a := 3; }', duplicateRe],
    ['{ (a, a) := (1, 2); a := 3; }', duplicateRe],
    ['{ a := 1; (a, b) := (2, 3); }', duplicateRe],
    ['{ _ := 1; _ := 2; }', duplicateRe],
    ['if true { x := 1; x := 2; }', duplicateRe],
    ['if false { x := 1; } else { x := 2; x := 3; }', duplicateRe],
    ['match { true { x := 1; x := 2; } _ { } }', duplicateRe],
    ['match { false { x := 1; } _ { x := 2; x := 3; } }', duplicateRe],
    ['loop [1] as item { item := 2; }', duplicateRe],
    ['loop [1] as item { y := 1; y := 2; }', duplicateRe],
    ['f := fn(x: Int): Int { x := 2; x };', duplicateRe],
    ['f := fn(x: Int): Int { y := 1; var y := 2; x + y };', duplicateRe],
    ['v := { x := 1; x := 2; x };', duplicateRe],
    ['v := { y := { x := 1; x := 2; x }; y };', duplicateRe],
    // Top-level-only forms inside inner blocks and inner-block type alias collisions
    ['{ pub x := 1; }', topLevelOnlyRe],
    ['{ import "core/io"; }', topLevelOnlyRe],
    ['{ io := import "core/io"; }', topLevelOnlyRe],
    ['{ T := type Int; T := type String; }', duplicateRe],
    ['{ T := type Int; T := 1; }', duplicateRe],
    ['{ T := 1; T := type Int; }', duplicateRe],
    ['v := { pub x := 1; 0 };', topLevelOnlyRe],
    ['v := { import "core/io"; 0 };', topLevelOnlyRe],
    ['v := { io := import "core/io"; 0 };', topLevelOnlyRe],
    ['v := { T := type Int; T := 1; 0 };', duplicateRe],
  ];

  for (const target of ['ts', 'c'] as const) {
    for (const [source, expectedRe] of sharedRejections) {
      const rejected = compileTarget(target, { text: source });
      assert.equal(rejected.status, 2, `${target} should reject:\n${source}\nstdout:\n${rejected.stdout.toString()}`);
      assert.equal(rejected.stdout.toString(), '', `${target} rejected stdout should be empty:\n${source}`);
      assert.match(rejected.stderr.toString(), expectedRe, `${target} stderr mismatch for:\n${source}`);
    }
  }

  for (const tsOnlyRejected of [
    '{ f := fn(): Int { 1 }; f := 2; 0 }',
    '{ f := fn(): Int { 1 }; f := fn(): Int { 2 }; 0 }',
    'v := { f := fn(x: Int): Int { x := 2; x }; f(1) };',
    'v := @blk { x := 1; x := 2; x };',
    'v := if true { 1 } else { 2 } then { x := 1; x := 2; x };',
    'v := { 1 } finally { y := 1; y := 2; };',
    'v := loop [1] as item { item := 2; item };',
  ]) {
    const rejected = compileTs({ text: tsOnlyRejected });
    assert.equal(rejected.status, 2, `ts should reject:\n${tsOnlyRejected}\nstdout:\n${rejected.stdout.toString()}`);
    assert.equal(rejected.stdout.toString(), '');
    assert.match(rejected.stderr.toString(), duplicateRe, `ts stderr mismatch for:\n${tsOnlyRejected}`);
  }

  // Combined positive multi-feature program on both TS and C preserving nested
  // outer-block shadowing, sibling branch independence, and intact outer bindings.
  const combinedShared = [
    'io := import "core/io";',
    'Box := type Int;',
    'x: Box = 10;',
    'var sum: Int = 0;',
    'if true {',
    '  x := 20;',
    '  {',
    '    x := 30;',
    '    sum += x;',
    '  }',
    '  sum += x;',
    '} else {',
    '  x := 40;',
    '  sum += x;',
    '}',
    'match {',
    '  false { y := 1; sum += y; }',
    '  _ {',
    '    y := 2;',
    '    sum += y;',
    '  }',
    '}',
    'var step := 0;',
    'loop step < 2 {',
    '  out := 5 + step;',
    '  { out := 100; sum += out; }',
    '  sum += out;',
    '  step += 1;',
    '}',
    'if true { io := 99; sum += io; }',
    'io.outputLine(x, sum);',
  ].join('\n');

  for (const target of ['ts', 'c'] as const) {
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') { continue; }
    const compiled = compileTarget(target, { text: combinedShared });
    assert.equal(compiled.status, 0, `${target} compile failed:\n${compiled.stderr.toString()}`);
    const artifact = compiled.stdout.toString();
    if (target === 'ts') {
      assert.equal(checkTsArtifact(artifact).status, 0);
    }
    const run = target === 'ts' ? runTsArtifact(artifact) : runCArtifact(artifact);
    assert.equal(run.phase, 'run');
    assert.equal(run.status, 0, `${target} run failed:\n${run.stderr.toString()}`);
    assert.equal(run.stdout.toString(), '10 362\n');
  }

  // TS combined positive program covering functions, intra-pattern tuple destructuring,
  // list loops, tagged blocks, finally blocks, value blocks, and local fn shadowing.
  const tsCombined = [
    'io := import "core/io";',
    'helper := fn(a: Int): Int { var r := 0; { a := a + 10; r = a; } return r; };',
    'outerVal := helper(5);',
    'var acc := 0;',
    'loop [5, 6] as n {',
    '  var out := n;',
    '  { n := 100; out += n; }',
    '  acc += out;',
    '}',
    'tagVal := @t { tmp := 7; tmp } finally { tmp := 1; acc += tmp; };',
    'v := {',
    '  helper := 3;',
    '  (p, p) := (4, 5);',
    '  (_, _) := (6, 7);',
    '  shadowed := { helper := fn(k: Int): Int { k * 2 }; helper(p) };',
    '  helper + shadowed',
    '};',
    'io.outputLine(outerVal, v + acc, tagVal, helper(1));',
  ].join('\n');
  const tsFnCompiled = compileTs({ text: tsCombined });
  assert.equal(tsFnCompiled.status, 0, tsFnCompiled.stderr.toString());
  assert.equal(checkTsArtifact(tsFnCompiled.stdout.toString()).status, 0);
  const tsFnRun = runTsArtifact(tsFnCompiled.stdout.toString());
  assert.equal(tsFnRun.status, 0);
  assert.equal(tsFnRun.stdout.toString(), '15 225 7 11\n');
});

test('unified block Slice 2a supports inner-block type aliases, parallel root wiring, and execution-trace safety on TS and C', () => {
  const sharedPositive = [
    'io := import "core/io";',
    'Item := type Int;',
    'Saved := type Item;',
    'var acc: Item = 0;',
    '{',
    '  x: Box = 7;',
    '  Box := type A;',
    '  A := type Int;',
    '  Item := type String;',
    '  s: Item = "ok";',
    '  n: Saved = 42;',
    '  acc += x + n;',
    '  io.outputLine(s);',
    '}',
    'if true {',
    '  Tag := type Int;',
    '  delta: Tag = 3;',
    '  acc += delta;',
    '} else {',
    '  Tag := type String;',
    '  unused: Tag = "no";',
    '}',
    'match {',
    '  false {',
    '    ArmT := type String;',
    '    s2: ArmT = "unused";',
    '  }',
    '  _ {',
    '    ArmT := type Int;',
    '    v2: ArmT = 4;',
    '    acc += v2;',
    '  }',
    '}',
    'var step := 0;',
    'loop step < 2 {',
    '  IterT := type Int;',
    '  inc: IterT = 5;',
    '  acc += inc;',
    '  step += 1;',
    '}',
    'pureVal := { ValT := type Int; 5 };',
    'vOuter: Item = pureVal;',
    'io.outputLine(acc, vOuter);',
  ].join('\n');

  for (const target of ['ts', 'c'] as const) {
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') { continue; }
    const compiled = compileTarget(target, { text: sharedPositive });
    assert.equal(compiled.status, 0, `${target} compile failed:\n${compiled.stderr.toString()}`);
    const artifact = compiled.stdout.toString();
    if (target === 'ts') {
      assert.equal(checkTsArtifact(artifact).status, 0);
    }
    const run = target === 'ts' ? runTsArtifact(artifact) : runCArtifact(artifact);
    assert.equal(run.phase, 'run');
    assert.equal(run.status, 0, `${target} run failed:\n${run.stderr.toString()}`);
    assert.equal(run.stdout.toString(), 'ok\n66 5\n');
  }

  const sharedRejections: ReadonlyArray<readonly [string, RegExp]> = [
    ['{ A := type A; }', /recursive type alias A/],
    ['{ A := type B; B := type A; }', /recursive type alias B/],
    ['T := type Int; { T := type T; }', /recursive type alias T/],
    ['{ A := type Missing; }', /(?:unknown type alias Missing|unsupported \S+ type Missing)/],
    ['{ Inner := type Int; } x: Inner = 1;', /(?:unknown type alias Inner|unsupported \S+ type Inner)/],
    ['x := g(); g := fn(): Int { 7 };', /(?:cannot access g before initialization|cannot call before g is initialized)/],
  ];

  for (const target of ['ts', 'c'] as const) {
    for (const [source, expectedRe] of sharedRejections) {
      const rejected = compileTarget(target, { text: source });
      assert.equal(rejected.status, 2, `${target} should reject:\n${source}\nstdout:\n${rejected.stdout.toString()}`);
      assert.equal(rejected.stdout.toString(), '', `${target} rejected stdout should be empty:\n${source}`);
      assert.match(rejected.stderr.toString(), expectedRe, `${target} stderr mismatch for:\n${source}`);
    }
  }

  const tsPositive = [
    'io := import "core/io";',
    'list := import "core/list";',
    'f := fn(): Int { g() };',
    'g := fn(): Int { 7 };',
    'even := fn(n: Int): Bool { if n == 0 { true } else { odd(n - 1) } };',
    'odd := fn(n: Int): Bool { if n == 0 { false } else { even(n - 1) } };',
    'apply := fn(cb: fn(): Int): Int { cb() };',
    'useForward := fn(): Int {',
    '  LocalInt := type Int;',
    '  fromBase: LocalInt = base;',
    '  p := pair;',
    '  count = count + 1;',
    '  list.pushBack(mut xs, 3);',
    '  fromBase + p.a + p.b + left + right + xs[2]',
    '};',
    'read := fn(): Int { x };',
    'before := fn(): Int { y = 9; y };',
    'var saved: fn(): Int = fn(): Int { tmp2 };',
    'blk := { saved2 := fn(): Int { tmp2 }; 5 };',
    'blkFn := { saved3 := fn(): Int { tmp2 }; saved3 };',
    'valBlk := { T := type Int; xVal: T = 3; xVal + 1 };',
    'fnWithAlias := fn(): Int { FT := type Int; r: FT = 8; r };',
    'thenResult := @t if true { 2 } else { 0 } then { TT := type Int; bonus: TT = 3; @t.value + bonus };',
    'var finAcc := 0;',
    'finVal := { 1 } finally { FT := type Int; fv: FT = 4; finAcc += fv; };',
    'base := 3 + 4;',
    'pair := (a = 2, b = 5);',
    '(left, right) := (10, 20);',
    'var count := 0;',
    'seed: List<Int> = [1, 2];',
    'mut xs := seed;',
    'var x: Int = ?;',
    'x = 5;',
    'var y: Int = ?;',
    'tmp2 := 11;',
    'io.outputLine(f(), if even(4) { 1 } else { 0 }, apply(g), useForward(), count);',
    'io.outputLine(read(), before(), saved(), blkFn(), blk, valBlk, fnWithAlias(), thenResult, finAcc, finVal);',
  ].join('\n');

  const tsCompiled = compileTs({ text: tsPositive });
  assert.equal(tsCompiled.status, 0, tsCompiled.stderr.toString());
  assert.equal(checkTsArtifact(tsCompiled.stdout.toString()).status, 0);
  const tsRun = runTsArtifact(tsCompiled.stdout.toString());
  assert.equal(tsRun.status, 0, tsRun.stderr.toString());
  assert.equal(tsRun.stdout.toString(), '7 1 7 47 1\n5 9 11 11 5 4 8 5 4 1\n');

  const tsRejections: ReadonlyArray<readonly [string, RegExp]> = [
    ['fp := g; g := fn(): Int { 7 };', /cannot access g before initialization/],
    ['op := fn(): Int { tmp2 }; tmp1 := op(); tmp2 := 1;', /cannot call before tmp2 is initialized/],
    ['a := fn(): Int { b() }; b := fn(): Int { tmp2 }; early := a(); tmp2 := 1;', /cannot call before tmp2 is initialized/],
    ['a := fn(): Int { b() }; early := a(); b := fn(): Int { 1 };', /cannot call before b is initialized/],
    ['read := fn(): Int { x }; var x: Int = ?; early := read(); x = 5;', /cannot call before x is initialized/],
    ['var x: Int = ?; read := fn(): Int { x }; early := read(); x = 5;', /cannot call before x is initialized/],
    ['io := import "core/io"; var x: Int = ?; init := fn(): Unit { x = 2; }; io.outputLine(x);', /cannot read uninitialized local x/],
    ['before := fn(): Unit { x = 2; }; before(); var x: Int = ?;', /cannot call before x is initialized/],
    ['var saved: fn(): Int = fn(): Int { tmp2 }; early := saved(); tmp2 := 11;', /cannot call before tmp2 is initialized/],
    ['apply := fn(cb: fn(): Int): Int { cb() }; op := fn(): Int { tmp2 }; early := apply(op); tmp2 := 1;', /cannot call before tmp2 is initialized/],
    ['apply := fn(cb: fn(): Int): Int { cb() }; early := apply(fn(): Int { tmp2 }); tmp2 := 1;', /cannot call before tmp2 is initialized/],
    ['var applyVar: fn(fn(): Int): Int = fn(cb: fn(): Int): Int { cb() }; early := applyVar(fn(): Int { tmp2 }); tmp2 := 1;', /cannot call before tmp2 is initialized/],
    ['early := (fn(): Int { tmp2 })(); tmp2 := 1;', /cannot call before tmp2 is initialized/],
    ['x := { saved := fn(): Int { tmp2 }; saved() }; tmp2 := 1;', /cannot call before tmp2 is initialized/],
    ['early := ({ fn(): Int { tmp2 } })(); tmp2 := 1;', /cannot call before tmp2 is initialized/],
  ];

  for (const [source, expectedRe] of tsRejections) {
    const rejected = compileTs({ text: source });
    assert.equal(rejected.status, 2, `ts should reject:\n${source}\nstdout:\n${rejected.stdout.toString()}`);
    assert.equal(rejected.stdout.toString(), '', `ts rejected stdout should be empty:\n${source}`);
    assert.match(rejected.stderr.toString(), expectedRe, `ts stderr mismatch for:\n${source}`);
  }
});

test('unified block Slice 2b eliminates side-effect-free dead code in blocks while preserving effects, faults, and diagnostics', () => {
  // Exact emitted TS DCE assertions
  {
    const src = 'io := import "core/io"; x := { y := 1; z := fn(): Int { io.outputLine("dead"); 99 }; 5 }; io.outputLine(x);';
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const artifact = compiled.stdout.toString();
    assert.equal(checkTsArtifact(artifact).status, 0);
    assert.doesNotMatch(artifact, /lite_y|lite_z|"dead"|\(\(\) =>/);
    const run = runTsArtifact(artifact);
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '5\n');
  }

  {
    const src = 'io := import "core/io"; x := { a := 1; b := a; c := (a, b); (d, e) := c; var m := 10; m = 20; 99; "quiet"; 5 }; io.outputLine(x);';
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const artifact = compiled.stdout.toString();
    assert.equal(checkTsArtifact(artifact).status, 0);
    assert.doesNotMatch(artifact, /lite_a|lite_b|lite_c|lite_d|lite_e|lite_m|lite\$tuple|"quiet"|\(\(\) =>/);
    const run = runTsArtifact(artifact);
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '5\n');
  }

  {
    const src = 'io := import "core/io"; x := { (used, unused) := (7, 8); used }; io.outputLine(x);';
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const artifact = compiled.stdout.toString();
    assert.equal(checkTsArtifact(artifact).status, 0);
    assert.match(artifact, /lite_used/);
    assert.match(artifact, /lite\$tuple/);
    assert.doesNotMatch(artifact, /lite_unused/);
    const run = runTsArtifact(artifact);
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '7\n');
  }

  {
    const src = 'io := import "core/io"; { { y := 1; z := fn(): Int { 2 }; 99; } }; x := { { y := 1; } 5 }; io.outputLine(x);';
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const artifact = compiled.stdout.toString();
    assert.equal(checkTsArtifact(artifact).status, 0);
    assert.doesNotMatch(artifact, /lite_y|lite_z|\(\(\) =>/);
    const run = runTsArtifact(artifact);
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '5\n');
  }

  {
    const src = 'io := import "core/io"; f := fn(): Int { y := 111; 5 }; g := fn(): Int { y := 222; y }; { y := 333; } { y := 444; io.outputLine(y); } io.outputLine(f(), g());';
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const artifact = compiled.stdout.toString();
    assert.equal(checkTsArtifact(artifact).status, 0);
    assert.doesNotMatch(artifact, /111n|333n/);
    const run = runTsArtifact(artifact);
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '444\n5 222\n');
  }

  {
    const src = 'io := import "core/io"; deadTop := fn(): Int { io.outputLine("never"); 777 }; liveFn := fn(): Int { z := fn(): Int { deadTop() }; 5 }; io.outputLine(liveFn());';
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const artifact = compiled.stdout.toString();
    assert.equal(checkTsArtifact(artifact).status, 0);
    assert.doesNotMatch(artifact, /liteFn_deadTop|"never"|777n/);
    const run = runTsArtifact(artifact);
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '5\n');
  }

  // C backend DCE and subset-boundary preservation
  {
    const src = 'io := import "core/io"; deadRoot := 4242; { deadInner := 3131; 99; "quiet_c"; } io.outputLine(5);';
    const cCompiled = compileTarget('c', { text: src });
    assert.equal(cCompiled.status, 0, cCompiled.stderr.toString());
    const cArtifact = cCompiled.stdout.toString();
    assert.doesNotMatch(cArtifact, /lite_deadRoot|lite_deadInner|quiet_c|4242|3131/);
    if (process.env['LITE_SKIP_NATIVE'] !== '1') {
      const cRun = runCArtifact(cArtifact);
      assert.equal(cRun.phase, 'run');
      assert.equal(cRun.status, 0, cRun.stderr.toString());
      assert.equal(cRun.stdout.toString(), '5\n');
    }
  }

  for (const badC of [
    'values: List<Int> = [1];',
    'p := (a = 1);',
    'var f: fn(Int): Int;',
    '[1, 2];',
    '{ f := fn(): Int { 1 }; 5 }',
    'x := { y := 1; 5 };',
  ]) {
    const cRejected = compileTarget('c', { text: badC });
    assert.equal(cRejected.status, 2, `C should reject: ${badC}`);
    assert.equal(cRejected.stdout.length, 0, `C rejected stdout should be empty: ${badC}`);
  }

  // Side-effect preservation
  for (const [src, expectedOut] of [
    ['io := import "core/io"; var out := 1; dead := { out = 9; 5 }; io.outputLine(out);', '9\n'],
    ['list := import "core/list"; io := import "core/io"; xs: mut List<Int> = [1]; dead := { list.pushBack(mut xs, 2); 5 }; io.outputLine(xs);', '[1, 2]\n'],
    ['io := import "core/io"; bump := fn(): Int { io.outputLine("ran"); 1 }; x := { y := bump(); f := bump; z := f(); w := (fn(): Int { io.outputLine("iife"); 2 })(); 5 }; io.outputLine(x);', 'ran\nran\niife\n5\n'],
  ] as const) {
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, `${src}\n${compiled.stderr.toString()}`);
    assert.equal(checkTsArtifact(compiled.stdout.toString()).status, 0);
    const run = runTsArtifact(compiled.stdout.toString());
    assert.equal(run.status, 0, `${src}\n${run.stderr.toString()}`);
    assert.equal(run.stdout.toString(), expectedOut, src);
  }

  // Runtime panics preserved in dead bindings
  for (const panicSrc of [
    'x := { var z := 0; y := 1 / z; 5 };',
    'x := { var big := 9223372036854775807; y := big + 1; 5 };',
  ]) {
    const compiled = compileTs({ text: panicSrc });
    assert.equal(compiled.status, 0, `${panicSrc}\n${compiled.stderr.toString()}`);
    assert.equal(checkTsArtifact(compiled.stdout.toString()).status, 0);
    const run = runTsArtifact(compiled.stdout.toString());
    assert.equal(run.status, 1, panicSrc);
    assert.match(run.stderr.toString(), /ArithmeticPanic/, panicSrc);
  }

  // Compile-time errors in dead code still reject
  for (const [badSrc, expectedRe] of [
    ['x := { y: Int = "bad"; 5 };', /cannot initialize Int with String/],
    ['x := { y := 1; y := 2; 5 };', /duplicate declaration y in block/],
    ['x := { q: Int = ?; y := q; 5 };', /cannot read uninitialized local q/],
    ['x := { z := fn(): Int { "bad" }; 5 };', /cannot return String from function/],
    ['x := { outerX := 1; z := fn(): Unit { outerX = 2; }; 5 };', /cannot assign to immutable local outerX/],
  ] as const) {
    const rejected = compileTs({ text: badSrc });
    assert.equal(rejected.status, 2, `should reject: ${badSrc}\n${rejected.stdout.toString()}`);
    assert.equal(rejected.stdout.toString(), '', `rejected stdout should be empty: ${badSrc}`);
    assert.match(rejected.stderr.toString(), expectedRe, `stderr mismatch for: ${badSrc}`);
  }
});

test('unified block Slice 3 supports lexical captures, inner-block symbol wiring, trace safety, and escaping checks on TS', () => {
  // 1. All 9 formerly-rejected surrounding captures + DCE on unused capture closures + mut List capture writes + per-iteration loop item captures
  {
    const src = [
      'io := import "core/io";',
      'a := { x := 1; f := fn(): Int { x }; f() };',
      'var gx := 1;',
      'b := { f := fn(): Int { gx }; f() };',
      'var gx2 := 2;',
      'c := { reader := fn(): Int { return gx2; }; reader() };',
      'd := { var x := 3; f := fn(): Int { x }; f() };',
      'var wx := 1;',
      '{ f := fn(): Unit { wx = 9; }; f(); }',
      'outerParam := fn(p: Int): Int { inner := fn(): Int { p }; inner() };',
      'outerCall := fn(): Int { aFn := fn(): Int { 4 }; bFn := fn(): Int { aFn() }; bFn() };',
      'xs: mut List<Int> = [5];',
      'g := { f := fn(): Int { push_back(mut xs, 6); xs[0] + xs[1] }; f() };',
      'closures: mut List<fn(): Int> = [];',
      'loop [10, 20, 30] as item {',
      '  f := fn(): Int { item };',
      '  push_back(mut closures, f);',
      '}',
      'deadCap := { outerX := 1; z := fn(): Int { outerX }; 5 };',
      'io.outputLine(a, b, c, d, wx, outerParam(7), outerCall(), g, closures[0](), closures[1](), closures[2](), deadCap);',
    ].join('\n');
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const artifact = compiled.stdout.toString();
    assert.equal(checkTsArtifact(artifact).status, 0);
    assert.match(artifact, /const lite_deadCap = 5n;/);
    assert.doesNotMatch(artifact, /outerX/);
    const run = runTsArtifact(artifact);
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '1 1 2 3 9 7 4 11 10 20 30 5\n');
  }

  // 2. Escaping closures preserve captured state independently across frames
  {
    const src = [
      'io := import "core/io";',
      'makeReader := fn(x: Int): fn(): Int {',
      '  fn(): Int { x }',
      '};',
      'makeCounter := fn(start: Int): fn(): Int {',
      '  var count := start;',
      '  fn(): Int {',
      '    count = count + 1;',
      '    count',
      '  }',
      '};',
      'r1 := makeReader(41);',
      'r2 := makeReader(99);',
      'c1 := makeCounter(0);',
      'c2 := makeCounter(10);',
      'io.outputLine(r1(), r2(), c1(), c1(), c2(), c1());',
    ].join('\n');
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    assert.equal(checkTsArtifact(compiled.stdout.toString()).status, 0);
    const run = runTsArtifact(compiled.stdout.toString());
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '41 99 1 2 11 3\n');
  }

  // 3. Inner-block parallel compile-time symbol wiring across value/if/match/loop/then/finally/fn blocks
  {
    const src = [
      'io := import "core/io";',
      'valRes := {',
      '  countdown := fn(n: Int): Int {',
      '    if n <= 0 { 0 } else { n + countdown(n - 1) }',
      '  };',
      '  even := fn(n: Int): Bool {',
      '    if n == 0 { true } else { odd(n - 1) }',
      '  };',
      '  odd := fn(n: Int): Bool {',
      '    if n == 0 { false } else { even(n - 1) }',
      '  };',
      '  readLater := fn(): Int { laterVal + laterMut };',
      '  laterVal := 12;',
      '  var laterMut := 8;',
      '  incLater := fn(): Unit { laterMut = laterMut + 5; };',
      '  incLater();',
      '  if even(4) { countdown(3) + readLater() } else { 0 }',
      '};',
      'ifRes := if true {',
      '  isZero := fn(n: Int): Bool { if n == 0 { true } else { isPos(n) and false } };',
      '  isPos := fn(n: Int): Bool { n > 0 };',
      '  readTarget := fn(): Int { target };',
      '  target := 7;',
      '  if isZero(0) and isPos(1) { readTarget() } else { 0 }',
      '} else { 0 };',
      'matchRes := match {',
      '  false { 0 }',
      '  _ {',
      '    getM := fn(): Int { mVal };',
      '    mVal := 9;',
      '    getM()',
      '  }',
      '};',
      'loopRes := @lp loop [1] as step {',
      '  getAfter := fn(): Int { step + afterDecl };',
      '  afterDecl := 4;',
      '  break getAfter();',
      '} then { .value };',
      'thenRes := loop [1, 2] as _ {',
      '} then {',
      '  getT := fn(): Int { tVal };',
      '  tVal := 8;',
      '  getT()',
      '};',
      'var finAcc := 0;',
      'finallyRes := {',
      '  getF := fn(): Int { fVal };',
      '  fVal := 15;',
      '  getF()',
      '} finally {',
      '  incFin := fn(): Unit { finAcc = finAcc + finStep; };',
      '  finStep := 3;',
      '  incFin();',
      '};',
      'topFnRes := (fn(): Int {',
      '  ping := fn(n: Int): Int { if n <= 0 { pong(0) } else { n + ping(n - 1) } };',
      '  pong := fn(z: Int): Int { z + base };',
      '  base := 100;',
      '  ping(2)',
      '})();',
      'topNamedFn := fn(k: Int): Int {',
      '  ping := fn(n: Int): Int { if n <= 0 { pong(0) } else { n + ping(n - 1) } };',
      '  pong := fn(z: Int): Int { z + base };',
      '  base := 100;',
      '  ping(k)',
      '};',
      'dupBindRes := {',
      '  getP := fn(): Int { p };',
      '  (p, p) := (4, 5);',
      '  getP()',
      '};',
      'io.outputLine(valRes, ifRes, matchRes, loopRes, thenRes, finallyRes, finAcc, topFnRes, topNamedFn(2), dupBindRes);',
    ].join('\n');
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    assert.equal(checkTsArtifact(compiled.stdout.toString()).status, 0);
    const run = runTsArtifact(compiled.stdout.toString());
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '31 7 9 5 8 15 3 103 103 5\n');
  }

  // 4. 4-level nearer-forward-symbol precedence, eager outer-shadow reads, module-fn shadowing, inner alias + DCE + capture, write-before-read ?, and List<fn> push_back forward trace
  {
    const src = [
      'io := import "core/io";',
      'add := fn(x: Int): Int { x * 10 };',
      's := 1;',
      'levelResult := {',
      '  get1 := fn(): Int { s };',
      '  r2 := {',
      '    get2 := fn(): Int { s };',
      '    r3 := {',
      '      get3 := fn(): Int { s };',
      '      r4 := {',
      '        get4 := fn(): Int { s };',
      '        s := 4;',
      '        get4()',
      '      };',
      '      s := 3;',
      '      get3() * 10 + r4',
      '    };',
      '    s := 2;',
      '    get2() * 100 + r3',
      '  };',
      '  s := 9;',
      '  get1() * 1000 + r2',
      '};',
      'outerShadow := 10;',
      'eagerShadow := {',
      '  outerShadow := outerShadow + 5;',
      '  outerShadow',
      '};',
      'var outerMut := 1;',
      'mixedOrder := {',
      '  outerMut = 2;',
      '  get := fn(): Int { outerMut };',
      '  outerMut := 4;',
      '  get()',
      '};',
      'fnShadowRes := {',
      '  callAdd := fn(): Int { add(3) };',
      '  add := fn(n: Int): Int { n + 1 };',
      '  callAdd()',
      '};',
      'aliasDceRes := {',
      '  Box := type Int;',
      '  dead := 999;',
      '  used: Box = 21;',
      '  reader := fn(): Box { used };',
      '  reader()',
      '};',
      'writeBeforeReadRes := {',
      '  var y: Int = ?;',
      '  before := fn(): Int { y = 9; y };',
      '  before()',
      '};',
      'listPushRes := {',
      '  ops: mut List<fn(): Int> = [];',
      '  push_back(mut ops, fn(): Int { lateNum });',
      '  lateNum := 77;',
      '  ops[0]()',
      '};',
      'io.outputLine(levelResult, eagerShadow, outerMut, mixedOrder, fnShadowRes, aliasDceRes, writeBeforeReadRes, listPushRes);',
    ].join('\n');
    const compiled = compileTs({ text: src });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const artifact = compiled.stdout.toString();
    assert.equal(checkTsArtifact(artifact).status, 0);
    assert.doesNotMatch(artifact, /999n/);
    const run = runTsArtifact(artifact);
    assert.equal(run.status, 0, run.stderr.toString());
    assert.equal(run.stdout.toString(), '9234 15 2 4 4 21 9 77\n');
  }

  // 5. C backend continues rejecting local closures / fn values explicitly
  for (const badC of [
    '{ x := 1; f := fn(): Int { x }; _ := f(); }',
    'make := fn(x: Int): fn(): Int { fn(): Int { x } };',
  ]) {
    const cRejected = compileTarget('c', { text: badC });
    assert.equal(cRejected.status, 2, badC);
    assert.match(cRejected.stderr.toString(), /C backend does not support/, badC);
  }

  // 6. Negative trace-safety, uninit, and escaping-closure rejections
  for (const [badSrc, expectedRe] of [
    ['{ f := fn(): Int { x }; _ := f(); x := 1; }', /cannot call before x is initialized/],
    ['{ a := fn(): Int { b() }; b := fn(): Int { x }; _ := a(); x := 1; }', /cannot call before x is initialized/],
    ['{ f := fn(): Int { x }; if f() > 0 { }; x := 1; }', /cannot call before x is initialized/],
    ['{ f := fn(): Int { x }; loop f() < 1 { break; }; x := 1; }', /cannot call before x is initialized/],
    ['{ var y: Int = ?; f := fn(): Int { y }; _ := f(); y = 2; }', /cannot call before y is initialized/],
    ['{ var y: Int = ?; f := fn(): Int { y }; _ := f(); }', /cannot read uninitialized local y/],
    ['{ var y: Int = ?; before := fn(): Int { y = 9; y }; _ := y; }', /cannot read uninitialized local y/],
    ['{ y: Int = ?; f := fn(): Unit { y = 2; }; f(); }', /cannot assign to possibly initialized immutable local y/],
    ['{ ops: mut List<fn(): Int> = []; push_back(mut ops, fn(): Int { late }); _ := ops[0](); late := 7; }', /cannot call before late is initialized/],
    ['make := fn(): fn(): Int { r := fn(): Int { y }; return r; y := 5; fn(): Int { 0 } }; _ := make();', /cannot call before y is initialized/],
    ['v := @b { r := fn(): Int { y }; return @b r; y := 5; fn(): Int { 0 } };', /cannot call before y is initialized/],
    ['v := loop true { var y: Int = ?; r := fn(): Int { y }; break r; y = 1; } then { fn(): Int { 0 } };', /cannot call before y is initialized/],
    ['f := { var y: Int = ?; fn(): Int { y } };', /cannot read uninitialized local y/],
  ] as const) {
    const rejected = compileTs({ text: badSrc });
    assert.equal(rejected.status, 2, `should reject: ${badSrc}\n${rejected.stdout.toString()}`);
    assert.equal(rejected.stdout.toString(), '', `rejected stdout should be empty: ${badSrc}`);
    assert.match(rejected.stderr.toString(), expectedRe, `stderr mismatch for: ${badSrc}`);
  }
});
