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
  assert.equal(actual.phase, 'run');
  assert.equal(actual.status, 0, actual.stderr.toString());
  assert.equal(actual.signal, null);
  assert.equal(actual.stderr.length, 0);
  assert.ok(actual.stdout.equals(Buffer.from(chunk + chunk + 'tail\n')), 'complete raw output including returned tail');
});

test('compiler entry provides canonical strict-UTF-8 source reads to generated compilers', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-source-provider-'));
  try {
    const artifact = join(directory, 'reader.ts');
    const importer = join(directory, 'app.lts');
    const dependency = join(directory, 'dep.lts');
    writeFileSync(importer, '');
    writeFileSync(dependency, 'dependency source\n');
    writeFileSync(artifact, `
      declare const process: { argv: string[] };
      type SourceReader = (importer: string, spec: string) => { path: string; text: string };
      export function main(_write: ((text: string) => void) | undefined, readSource: SourceReader): string {
        const source = readSource(process.argv[2] ?? "", "./dep.lts");
        return source.path + "\\n" + source.text;
      }
    `);
    const entry = join(root, 'compiler/entry.ts');
    const read = spawnSync(process.execPath, [entry, artifact, importer], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    assert.equal(read.status, 0, read.stderr);
    assert.equal(read.signal, null);
    assert.equal(read.stderr, '');
    assert.equal(read.stdout, `${realpathSync(dependency)}\ndependency source\n`);

    writeFileSync(dependency, Buffer.from([0xff]));
    const invalidUtf8 = spawnSync(process.execPath, [entry, artifact, importer], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    assert.equal(invalidUtf8.status, 2);
    assert.equal(invalidUtf8.signal, null);
    assert.match(invalidUtf8.stderr, /cannot read imported source \.\/dep\.lts/);

    writeFileSync(artifact, `
      type SourceReader = (importer: string, spec: string) => { path: string; text: string };
      export function main(_write: ((text: string) => void) | undefined, readSource: SourceReader): string {
        readSource("app.lts", "/absolute.lts");
        return "unreachable";
      }
    `);
    const rejected = spawnSync(process.execPath, [entry, artifact], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    assert.equal(rejected.status, 2);
    assert.equal(rejected.signal, null);
    assert.match(rejected.stderr, /import path must be nonempty, relative, and use "\/" separators/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Lite readSource returns a typed source unit through the compiler host', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-source-builtin-'));
  try {
    const sourcePath = join(directory, 'app.lts');
    const dependency = join(directory, 'dep.lts');
    writeFileSync(sourcePath, '');
    writeFileSync(dependency, 'module text\n');
    const compiled = compileTs({
      text: 'loaded := readSource("app.lts", "./dep.lts"); outputLine(loaded.path); outputLine(loaded.text);',
      name: 'app.lts',
    });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    assert.equal(compiled.stderr.length, 0);
    const artifact = join(directory, 'program.ts');
    writeFileSync(artifact, compiled.stdout);
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    const entry = join(root, 'compiler/entry.ts');
    const actual = spawnSync(process.execPath, [entry, artifact], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    assert.equal(actual.status, 0, actual.stderr);
    assert.equal(actual.signal, null);
    assert.equal(actual.stderr, '');
    assert.equal(actual.stdout, `${realpathSync(dependency)}\nmodule text\n\n`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('pub marks a top-level declaration without changing current visibility behavior', () => {
  const compiled = compileTs({ text: 'pub twice := fn(x: Int): Int { x * 2 }; outputLine(twice(4));' });
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

test('receiver-less imports are recognized as top-level source clauses', () => {
  const compiled = compileTs({ text: 'import "./math.lts"; outputLine(6 * 7);' });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  assert.equal(compiled.stderr.length, 0);
  withTsArtifact(compiled.stdout.toString(), run => {
    const actual = run();
    assert.equal(actual.status, 0, actual.stderr.toString());
    assert.equal(actual.signal, null);
    assert.equal(actual.stdout.toString(), '42\n');
  });

  for (const [source, diagnostic] of [
    ['if true { import "./math.lts"; }', 'import is only allowed at top level'],
    ['import "../math.lts" outputLine(1);', 'expected ; after import'],
    ['import "";', 'import path must be nonempty, relative, and use "/" separators'],
    ['import "/math.lts";', 'import path must be nonempty, relative, and use "/" separators'],
    ['import "math\\\\math.lts";', 'import path must be nonempty, relative, and use "/" separators'],
  ] as const) {
    const rejected = compileTs({ text: source });
    assert.equal(rejected.status, 2, source);
    assert.ok(rejected.stderr.toString().includes(diagnostic), source + '\n' + rejected.stderr.toString());
    assert.equal(rejected.stdout.length, 0, source);
  }
});

test('the Lite TypeScript driver visits imported source units once across cycles', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-graph-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const childSource = join(directory, 'math.lts');
    writeFileSync(rootSource, 'import "./math.lts"; outputLine(42);\n');
    writeFileSync(childSource, 'import "./app.lts"; pub twice := fn(x: Int): Int { x * 2 };\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    writeFileSync(childSource, 'outputLine(1 +);\n');
    const rejected = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(rejected.status, 2);
    assert.match(rejected.stderr.toString(), /math\.lts:1:/);
    assert.equal(rejected.stdout.length, 0);

    writeFileSync(rootSource, 'import "./missing.lts"; outputLine(42);\n');
    const missing = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(missing.status, 2);
    assert.match(missing.stderr.toString(), /cannot read imported source \.\/missing\.lts/);
    assert.equal(missing.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('receiver-less imports expose only public functions and emit their module bodies', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-pub-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const mathSource = join(directory, 'math.lts');
    writeFileSync(rootSource, 'import "./math.lts"; outputLine(twice(21));\n');
    writeFileSync(mathSource, 'privateDouble := fn(x: Int): Int { x * 2 }; pub twice := fn(x: Int): Int { privateDouble(x) };\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const privateName = compileTs({ text: 'import "./math.lts"; outputLine(privateDouble(21));', name: realpathSync(rootSource) });
    assert.equal(privateName.status, 2);
    assert.match(privateName.stderr.toString(), /unknown value privateDouble/);
    assert.equal(privateName.stdout.length, 0);

    const wrongArgument = compileTs({ text: 'import "./math.lts"; outputLine(twice("21"));', name: realpathSync(rootSource) });
    assert.equal(wrongArgument.status, 2);
    assert.match(wrongArgument.stderr.toString(), /argument 1 of twice must be Int, got String/);
    assert.equal(wrongArgument.stdout.length, 0);

    writeFileSync(rootSource, 'import "./math.lts"; import "./math.lts"; outputLine(twice(21));\n');
    const repeated = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(repeated.status, 0, repeated.stderr.toString());
    withTsArtifact(repeated.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const otherSource = join(directory, 'other.lts');
    writeFileSync(otherSource, 'pub twice := fn(x: Int): Int { x + x };\n');
    writeFileSync(rootSource, 'import "./math.lts"; import "./other.lts"; outputLine(twice(21));\n');
    const duplicate = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(duplicate.status, 2);
    assert.match(duplicate.stderr.toString(), /duplicate imported public name twice/);
    assert.equal(duplicate.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('separate imported modules retain distinct private function and value identities', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-identities-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const firstSource = join(directory, 'first.lts');
    const secondSource = join(directory, 'second.lts');
    writeFileSync(rootSource, 'import "./first.lts"; import "./second.lts"; outputLine(twice(20), plusFive(20));\n');
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
    writeFileSync(rootSource, 'import "./facade.lts"; outputLine(timesSix(7));\n');
    writeFileSync(join(directory, 'facade.lts'), 'import "./base.lts"; pub timesSix := fn(x: Int): Int { triple(x) * 2 };\n');
    writeFileSync(join(directory, 'base.lts'), 'pub triple := fn(x: Int): Int { x * 3 };\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const transitiveName = compileTs({ text: 'import "./facade.lts"; outputLine(triple(7));', name: realpathSync(rootSource) });
    assert.equal(transitiveName.status, 2);
    assert.match(transitiveName.stderr.toString(), /unknown value triple/);
    assert.equal(transitiveName.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('namespace imports resolve public functions and immutable values through aliases', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-alias-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const mathSource = join(directory, 'math.lts');
    writeFileSync(mathSource, 'hidden := 9; pub factor := 2; pub twice := fn(x: Int): Int { x * factor }\n');
    writeFileSync(rootSource, 'math := import "./math.lts"; outputLine(math.twice(21), math.factor);\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42 2\n');
    });

    const statementCall = compileTs({ text: 'math := import "./math.lts"; math.twice(10); outputLine(1);', name: realpathSync(rootSource) });
    assert.equal(statementCall.status, 0, statementCall.stderr.toString());
    withTsArtifact(statementCall.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '1\n');
    });

    const hidden = compileTs({ text: 'math := import "./math.lts"; outputLine(math.hidden);', name: realpathSync(rootSource) });
    assert.equal(hidden.status, 2);
    assert.match(hidden.stderr.toString(), /unknown module member math\.hidden/);
    assert.equal(hidden.stdout.length, 0);

    const wrongArgument = compileTs({ text: 'math := import "./math.lts"; outputLine(math.twice("21"));', name: realpathSync(rootSource) });
    assert.equal(wrongArgument.status, 2);
    assert.match(wrongArgument.stderr.toString(), /argument 1 of math\.twice must be Int, got String/);
    assert.equal(wrongArgument.stdout.length, 0);

    const immutableMember = compileTs({ text: 'math := import "./math.lts"; math.factor = 5;', name: realpathSync(rootSource) });
    assert.equal(immutableMember.status, 2);
    assert.match(immutableMember.stderr.toString(), /module members are immutable/);
    assert.equal(immutableMember.stdout.length, 0);

    writeFileSync(rootSource, 'left := import "./math.lts"; right := import "./math.lts"; outputLine(left.twice(10), right.twice(11));\n');
    const repeatedAliases = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(repeatedAliases.status, 0, repeatedAliases.stderr.toString());
    assert.equal((repeatedAliases.stdout.toString().match(/function liteFn_m1_twice\(/g) ?? []).length, 1);
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
    writeFileSync(rootSource, 'facade := import "./facade.lts"; outputLine(facade.timesSix(7));\n');
    writeFileSync(facadeSource, 'math := import "./math.lts"; pub timesSix := fn(x: Int): Int { math.twice(x) * 3 };\n');
    writeFileSync(join(directory, 'math.lts'), 'pub twice := fn(x: Int): Int { x * 2 };\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const notReexported = compileTs({ text: 'facade := import "./facade.lts"; outputLine(facade.twice(3));', name: realpathSync(rootSource) });
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
      'types := import "./types.lts";',
      'point: types.Point = (x = 40, y = 2);',
      'shifted: types.Point = types.shift(point, 2);',
      'count: types.Count = 42;',
      'outputLine(shifted.x, count);',
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
      'integer := import "../../../lib/core/int.lts";',
      'sum := integer.intAdd(40, 2);',
      'outputLine(integer.intText(sum.value), sum.ok);',
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

test('receiver-less imports expose immutable public values but keep private values local', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-values-'));
  try {
    const rootSource = join(directory, 'app.lts');
    const mathSource = join(directory, 'math.lts');
    writeFileSync(rootSource, 'import "./math.lts"; outputLine(answer);\n');
    writeFileSync(mathSource, 'privateBase := 21; pub answer := privateBase * 2;\n');
    const compiled = compileTs({ text: readFileSync(rootSource, 'utf8'), name: realpathSync(rootSource) });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      const actual = run();
      assert.equal(actual.status, 0, actual.stderr.toString());
      assert.equal(actual.stdout.toString(), '42\n');
    });

    const privateName = compileTs({ text: 'import "./math.lts"; outputLine(privateBase);', name: realpathSync(rootSource) });
    assert.equal(privateName.status, 2);
    assert.match(privateName.stderr.toString(), /unknown value privateBase/);
    assert.equal(privateName.stdout.length, 0);

    const reassignment = compileTs({ text: 'import "./math.lts"; answer = 43;', name: realpathSync(rootSource) });
    assert.equal(reassignment.status, 2);
    assert.match(reassignment.stderr.toString(), /cannot assign to immutable local answer/);
    assert.equal(reassignment.stdout.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('TS artifact capture preserves repeated output, diagnostics and early exit across fresh runs', () => {
  const chunk = '🙂سلام\r\n'.repeat(128);
  const source = 'mode := inputInt(); var n := 0; loop n < 512 { ' +
    `output(${JSON.stringify(chunk)}); reportError(${JSON.stringify(chunk)}); n = n + 1; } ` +
    'output(inputAll("prompt: ")); if mode == 1 { exit(7); } ' +
    'if mode == 2 { outputLine(1 / 0); } outputLine("tail");';
  const compiled = compileTs({ text: source, name: 'capture.lts' });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  withTsArtifact(compiled.stdout.toString(), run => {
    for (const mode of [0, 1, 2, 0]) {
      const actual = run({ stdin: `${mode}\nreply\n` });
      assert.equal(actual.phase, 'run');
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
    writeFileSync(path, 'import "./helper.lts";\noutputLine(twice(inputInt("n? ")));');
    const compiled = spawnSync(join(directory, 'bin/lite'), ['compile', path], { env, timeout: 10000 });
    assert.equal(compiled.status, 0, compiled.stderr.toString()); assert.equal(compiled.stderr.length, 0);
    const artifact = join(directory, 'program.ts'); writeFileSync(artifact, compiled.stdout);
    const executed = spawnSync(process.execPath, [join(directory, 'compiler/entry.ts'), artifact], { input: '7', env, timeout: 10000 });
    assert.equal(executed.status, 0, executed.stderr.toString()); assert.equal(executed.stdout.toString(), 'n? 14\n');
    const ran = spawnSync(join(directory, 'bin/lite'), ['run', path], { input: '7', env, timeout: 10000 });
    assert.equal(ran.status, 0, ran.stderr.toString()); assert.equal(ran.stdout.toString(), 'n? 14\n'); assert.equal(ran.stderr.length, 0);
    const checked = spawnSync(join(directory, 'bin/lite'), ['check', path], { input: Buffer.from([0xff]), env, timeout: 10000 });
    assert.equal(checked.status, 0, checked.stderr.toString()); assert.equal(checked.stdout.length, 0); assert.equal(checked.stderr.length, 0);
    writeFileSync(join(directory, 'helper.lts'), 'twice := fn(n: Int): Int { n * 2 }');
    writeFileSync(path, 'import "./helper.lts"; outputLine(twice(21));');
    const privateCompile = spawnSync(join(directory, 'bin/lite'), ['compile', path], { env, timeout: 10000 });
    assert.equal(privateCompile.status, 2); assert.equal(privateCompile.stdout.length, 0);
    assert.match(privateCompile.stderr.toString(), /unknown value twice/);
    const privateCheck = spawnSync(join(directory, 'bin/lite'), ['check', path], { env, timeout: 10000 });
    assert.equal(privateCheck.status, 1); assert.equal(privateCheck.stdout.length, 0);
    assert.match(privateCheck.stderr.toString(), /unknown value twice/);
    const privateRun = spawnSync(join(directory, 'bin/lite'), ['run', path], { env, timeout: 10000 });
    assert.equal(privateRun.status, 2); assert.equal(privateRun.stdout.length, 0);
    assert.match(privateRun.stderr.toString(), /unknown value twice/);
    const deferred = spawnSync(join(directory, 'bin/lite'), ['compile', '--target', 'c', path], { env, timeout: 10000 });
    assert.equal(deferred.status, 2); assert.equal(deferred.stdout.length, 0);
    assert.match(deferred.stderr.toString(), /C output is deferred/);
    writeFileSync(path, 'outputLine("before"); match { true { 1 } _ { 2 } }');
    const unsupported = spawnSync(join(directory, 'bin/lite'), ['check', path], { env, timeout: 10000 });
    assert.equal(unsupported.status, 1); assert.equal(unsupported.stdout.length, 0);
    assert.match(unsupported.stderr.toString(), /unsupported feature "match"/);
    writeFileSync(path, 'outputLine("before"); unknown();');
    const invalid = spawnSync(join(directory, 'bin/lite'), ['compile', path], { env, timeout: 10000 });
    assert.equal(invalid.status, 2); assert.equal(invalid.stdout.length, 0); assert.match(invalid.stderr.toString(), /unknown value unknown/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('default verification and expectation updates use TS artifacts without T00', () => {
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    copyFileSync(join(root, 'igniter/package-lock.json'), join(directory, 'igniter/package-lock.json'));
    for (const folder of ['language/verifications', 'language/examples', 'language/samples']) cpSync(join(root, folder), join(directory, folder), { recursive: true });
    const registry = JSON.parse(readFileSync(join(root, 'language/verifications/features.json'), 'utf8')) as { features: { docs: string[] }[] };
    for (const item of registry.features) for (const path of item.docs) {
      mkdirSync(dirname(join(directory, path)), { recursive: true }); copyFileSync(join(root, path), join(directory, path));
    }
    const invoke = (...args: string[]) => spawnSync(join(directory, 'bin/lite'), ['verify', '--all', '--no-cache', ...args],
      { env, encoding: 'utf8', timeout: 30000 });
    const io = invoke('--filter', 'io.temporary');
    assert.equal(io.status, 0, io.stdout + io.stderr); assert.match(io.stdout, /all-helpers \[ts\]/);
    assert.match(io.stdout, /empty-line-and-remainder \[ts\]/); assert.doesNotMatch(io.stdout, /T00 reference|\[c\]/);
    const covered = invoke('--coverage'); assert.equal(covered.status, 0, covered.stderr);
    const manifest = join(directory, 'language/verifications/features/int-arithmetic.json');
    const expected = readFileSync(manifest);
    const updated = invoke('--filter', 'features/int-arithmetic.json', '--update');
    assert.equal(updated.status, 0, updated.stdout + updated.stderr); assert.match(updated.stdout, /updated/);
    assert.deepEqual(JSON.parse(readFileSync(manifest, 'utf8')), JSON.parse(expected.toString()));
    const unsupported = join(directory, 'language/verifications/features/match-subjectless.json');
    const before = readFileSync(unsupported);
    const failed = invoke('--filter', 'match.subjectless', '--update');
    assert.equal(failed.status, 1); assert.match(failed.stdout, /unsupported feature "match"/);
    assert.deepEqual(readFileSync(unsupported), before, 'unsupported source must not rewrite expectations');
    const legacy = invoke('--reference', '--filter', 'int.arithmetic');
    assert.equal(legacy.status, 2); assert.match(legacy.stderr, /unknown argument --reference/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

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
  const duplicate = compileTs({ text: 'x := 1; x := 1; outputLine(x);', name: 'duplicate-root.lts' });
  assert.equal(duplicate.status, 2);
  assert.equal(duplicate.stdout.length, 0, 'rejected source must not produce an artifact');
  assert.match(duplicate.stderr.toString(), /duplicate-root\.lts:1:9: duplicate top-level value x/);

  const nested = compileTs({ text: 'x := 1; if true { x := 2; outputLine(x); } outputLine(x);', name: 'nested-shadow.lts' });
  assert.equal(nested.status, 0, nested.stderr.toString());
  assert.deepEqual(runTsArtifact(nested.stdout.toString()).stdout, Buffer.from('2\n1\n'));

  const deferred = compileTs({
    text: 'y := fn (): Int { x * 2 }; x := 1; outputLine(y());', name: 'deferred-root.lts',
  });
  assert.equal(deferred.status, 0, deferred.stderr.toString());
  assert.deepEqual(runTsArtifact(deferred.stdout.toString()).stdout, Buffer.from('2\n'));

  const parameterShadows = compileTs({
    text: 'y := fn (x: Int): Int { x * 2 }; x := 1; outputLine(y(3));', name: 'parameter-shadows-root.lts',
  });
  assert.equal(parameterShadows.status, 0, parameterShadows.stderr.toString());
  assert.deepEqual(runTsArtifact(parameterShadows.stdout.toString()).stdout, Buffer.from('6\n'));

  const eager = compileTs({ text: 'y := x * 2; x := 1; outputLine(y);', name: 'eager-root.lts' });
  assert.equal(eager.status, 2);
  assert.equal(eager.stdout.length, 0, 'invalid eager initialization must not produce an artifact');
  assert.match(eager.stderr.toString(), /eager-root\.lts:1:6: unknown value x/);
});

/** Copies only host glue, the seed and Lite sources; the T00 implementation is deliberately absent. */
function isolatedCheckout(): string {
  const directory = mkdtempSync(join(tmpdir(), 'lite-t11-checkout-'));
  const dependencies = (['ts', 'c'] as const).flatMap(target => buildCompiler(target).dependencies);
  const paths = new Set([
    'bin/lite', 'bin/lite-compile', 'bin/lite-compile-ts', 'bin/lite-compile-c', 'bin/lite-check', 'bin/lite-run', 'bin/lite-verify',
    'compiler/host.ts', 'compiler/source.ts', 'compiler/entry.ts', 'compiler/cli.ts', 'compiler/launcher.ts', 'compiler/compile-ts.ts', 'compiler/compile-c.ts', 'compiler/package.json',
    'igniter/launcher.ts', 'igniter/test-suites.ts', 'igniter/check.ts', 'igniter/artifacts.ts', 'igniter/package.json', 'igniter/verify.ts',
    'tools/cli.ts', 'tools/forward.ts', 'tools/tool-version.ts', 'tools/checker.ts', 'tools/verify.ts', 'tools/run.ts', 'tools/project.ts',
    'compiler/release-streams.ts', 'config/versions.json',
    'tools/streams.ts',
    'compiler/scripts/release-streams.test.ts',
    `compiler/bootstrap/${seed.artifact}`, 'compiler/bootstrap/seed.ts', 'compiler/bootstrap/tsconfig.json',
    'compiler/manifests/ts.json', 'compiler/manifests/c.json', 'igniter/loader.ts', 'igniter/tsconfig.json',
    ...dependencies,
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
  return target === 'ts' ? spawnSync(join(directory, 'bin/lite-compile-ts'), [path], { env, timeout: 10000 })
    : spawnSync(process.execPath, [join(directory, 'compiler/cli.ts'), target, path], { env, timeout: 10000 });
}

test('TS host rebuilds the Lite source graph and preserves output, diagnostics and source names', () => {
  const built = buildTsCompiler();
  assert.equal(built.builderSha256, seed.artifactSha256);
  assert.equal(built.artifactSha256, seed.artifactSha256);
  assert.ok(built.dependencies.includes('compiler/src/frontend.lts'));
  assert.ok(built.dependencies.includes('lib/core/text.lts'));
  const reference = readFileSync(join(root, 'compiler/tests/references/generated/report-42.ts'));
  for (const name of [undefined, '', 'a b.lts', 'سلام🙂.lts', 'quote";\\\nname.lts']) {
    const input = name === undefined ? { text: 'outputLine(42);' } : { text: 'outputLine(42);', name };
    assert.deepEqual(compileTs(input), { status: 0, stdout: reference, stderr: Buffer.alloc(0) });
    const bad = name === undefined ? { text: 'outputLine(1 +);' } : { text: 'outputLine(1 +);', name };
    assert.deepEqual(compileTs(bad), { status: 2, stdout: Buffer.alloc(0),
      stderr: Buffer.from(`${name === undefined || name === '' ? '' : name + ':'}1:15: expected an Int, Float, String or Bool expression\n`) });
  }
});

test('public TS compilation and the retained internal C host work without T00', () => {
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    assert.equal(existsSync(join(directory, 'igniter/lite.ts')), false);
    assert.equal(existsSync(join(directory, 'igniter/bootstrap.ts')), false);
    for (const target of ['ts', 'c'] as const) {
      const result = invoke(directory, 'outputLine(42);', target);
      assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString());
      assert.deepEqual(result.stdout, readFileSync(join(root, `compiler/tests/references/generated/report-42.${target}`)));
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

test('a changed Lite compiler rebuilds with the selected seed, caches by source and rejects corrupt cache bytes', () => {
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
    assert.match(rejected.stderr.toString(), /cannot rebuild current compiler source/);
    assert.match(rejected.stderr.toString(), /fixture\.lts:1:/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a modified bootstrap seed fails explicitly without executing T00', () => {
  const directory = isolatedCheckout();
  try {
    const path = join(directory, `compiler/bootstrap/${seed.artifact}`);
    writeFileSync(path, readFileSync(path, 'utf8') + '\n');
    const result = invoke(directory, 'outputLine(42);');
    assert.equal(result.status, 1); assert.equal(result.stdout.length, 0);
    assert.match(result.stderr.toString(), /selected TS bootstrap seed hash mismatch/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('selected compiler build exposes its imported source dependencies', () => {
  const selected = buildCompiler('ts');
  assert.deepEqual(selected.dependencies.slice(0, 3), [
    'compiler/src/ts-root.lts', 'compiler/src/driver-ts.lts', 'compiler/src/frontend.lts',
  ]);
  assert.ok(selected.dependencies.includes('compiler/src/numeric-literals.lts'));
});

test('the unchanged selected TS source graph uses its verified seed without a local TypeScript install', () => {
  const directory = isolatedCheckout();
  try {
    assert.equal(existsSync(join(directory, 'igniter/node_modules/typescript/bin/tsc')), false);
    const selected = spawnSync(process.execPath, ['--input-type=module', '-e',
      'import {buildTsCompiler} from "./compiler/host.ts"; process.stdout.write(JSON.stringify(buildTsCompiler()));'],
    { cwd: directory, env, encoding: 'utf8', timeout: 20000 });
    assert.equal(selected.error, undefined);
    assert.equal(selected.status, 0, selected.stderr);
    const result = JSON.parse(selected.stdout) as { path: string; sourceSha256: string; artifactSha256: string; cached: boolean };
    assert.equal(result.path, realpathSync(join(directory, `compiler/bootstrap/${seed.artifact}`)));
    assert.equal(result.sourceSha256, seed.sourceSha256);
    assert.equal(result.artifactSha256, seed.artifactSha256);
    assert.equal(result.cached, false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('the graph-built TS-hosted C emitter preserves source names and subset rejection', () => {
  const selected = buildCompiler('c');
  assert.equal(selected.target, 'c');
  assert.notEqual(selected.artifactSha256, seed.artifactSha256);
  assert.equal(selected.builderSha256, seed.artifactSha256);
  assert.equal(selected.dependencies[0], 'compiler/src/c-root.lts');
  assert.ok(selected.dependencies.includes('compiler/src/emit-c.lts'));
  const simpleC = compileTarget('c', { text: 'outputLine(42);', name: 'سلام file.lts' });
  assert.deepEqual(simpleC, {
    status: 0, stdout: readFileSync(join(root, 'compiler/tests/references/generated/report-42.c')), stderr: Buffer.alloc(0),
  });
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const native = runCArtifact(simpleC.stdout.toString());
    assert.equal(native.phase, 'run'); assert.equal(native.status, 0, native.stderr.toString());
    assert.equal(native.stdout.toString(), '42\n'); assert.equal(native.stderr.length, 0);
  }
  assert.deepEqual(compileTarget('c', { text: 'outputLine(1 +);', name: 'a b.lts' }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from('a b.lts:1:15: expected an Int, Float, String or Bool expression\n'),
  });
  assert.deepEqual(compileTarget('c', { text: 'f := fn(): Int { 1 } outputLine(f());' }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from('C backend does not support top-level functions yet\n'),
  });
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    const built = spawnSync(process.execPath, ['--input-type=module', '-e',
      'import {buildCompiler} from "./compiler/host.ts"; process.stdout.write(JSON.stringify(buildCompiler("c")));'],
    { cwd: directory, env, encoding: 'utf8', timeout: 10000 });
    assert.equal(built.status, 0, built.stderr);
    const artifactPath = (JSON.parse(built.stdout) as { path: string }).path;
    writeFileSync(artifactPath, readFileSync(artifactPath, 'utf8') + '\n');
    const corrupt = invoke(directory, 'outputLine(42);', 'c');
    assert.equal(corrupt.status, 1); assert.equal(corrupt.stdout.length, 0);
    assert.match(corrupt.stderr.toString(), /compiler cache integrity mismatch/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('imported C compiler source hashes transitive files and invalidates its cache without T00', () => {
  const directory = isolatedCheckout();
  try {
    symlinkSync(join(root, 'igniter/node_modules'), join(directory, 'igniter/node_modules'));
    writeFileSync(join(directory, 'compiler/manifests/c.json'), JSON.stringify({ target: 'c', files: ['../src/fixture-root.lts'] }));
    writeFileSync(join(directory, 'compiler/src/fixture-root.lts'), 'import "fixture-c.lts";\n');
    writeFileSync(join(directory, 'compiler/src/fixture-c.lts'), 'source := inputAll(); outputLine("fresh C");');
    const result = invoke(directory, 'outputLine(42);', 'c');
    assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString());
    assert.equal(result.stdout.toString(), 'fresh C\n');
    const cache = join(directory, 'dist/compiler-cache');
    const entries = () => readdirSync(cache).filter(name => name !== 'selection' && !name.startsWith('build-'));
    assert.equal(entries().length, 1);
    const provenance = JSON.parse(readFileSync(join(cache, entries()[0]!, 'provenance.json'), 'utf8')) as { dependencies: string[] };
    assert.deepEqual(provenance.dependencies, ['compiler/src/fixture-root.lts', 'compiler/src/fixture-c.lts']);
    writeFileSync(join(directory, 'compiler/src/fixture-c.lts'), 'source := inputAll(); outputLine("changed nested C");');
    const changed = invoke(directory, 'outputLine(42);', 'c');
    assert.equal(changed.error, undefined); assert.equal(changed.status, 0, changed.stderr.toString());
    assert.equal(changed.stdout.toString(), 'changed nested C\n');
    assert.equal(entries().length, 2,
      'a transitive source-byte change must select a distinct compiler cache entry');
    writeFileSync(join(directory, 'compiler/src/fixture-d.lts'), 'source := inputAll(); outputLine("changed import path");');
    writeFileSync(join(directory, 'compiler/src/fixture-root.lts'), 'import "fixture-d.lts";\n');
    const redirected = invoke(directory, 'outputLine(42);', 'c');
    assert.equal(redirected.status, 0, redirected.stderr.toString());
    assert.equal(redirected.stdout.toString(), 'changed import path\n');
    assert.equal(entries().length, 3,
      'changing an import edge must choose a distinct dependency graph');
    writeFileSync(join(directory, 'compiler/src/fixture-root.lts'), 'source := inputAll(); outputLine("removed dependency");');
    const removed = invoke(directory, 'outputLine(42);', 'c');
    assert.equal(removed.status, 0, removed.stderr.toString());
    assert.equal(removed.stdout.toString(), 'removed dependency\n');
    const afterRemoval = entries();
    assert.equal(afterRemoval.length, 4);
    const removedProvenance = afterRemoval.map(name => JSON.parse(readFileSync(join(cache, name, 'provenance.json'), 'utf8')) as { dependencies: string[] })
      .find(item => item.dependencies.length === 1 && item.dependencies[0] === 'compiler/src/fixture-root.lts');
    assert.ok(removedProvenance, 'the root-only graph is recorded independently of directory enumeration order');
    assert.deepEqual(removedProvenance.dependencies, ['compiler/src/fixture-root.lts']);
    const link = join(directory, 'compiler/src/fixture-link.lts');
    writeFileSync(join(directory, 'compiler/src/fixture-e.lts'), 'source := inputAll(); outputLine("symlink E");');
    writeFileSync(join(directory, 'compiler/src/fixture-f.lts'), 'source := inputAll(); outputLine("symlink F");');
    symlinkSync('fixture-e.lts', link);
    writeFileSync(join(directory, 'compiler/src/fixture-root.lts'), 'import "fixture-link.lts";\n');
    const linked = invoke(directory, 'outputLine(42);', 'c');
    assert.equal(linked.status, 0, linked.stderr.toString());
    assert.equal(linked.stdout.toString(), 'symlink E\n');
    rmSync(link, { force: true });
    symlinkSync('fixture-f.lts', link);
    const retargeted = invoke(directory, 'outputLine(42);', 'c');
    assert.equal(retargeted.status, 0, retargeted.stderr.toString());
    assert.equal(retargeted.stdout.toString(), 'symlink F\n', 'cache hit must revalidate the resolved import edge');
    assert.equal(entries().length, 6);
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
    for (const path of ['compiler/host.ts', 'compiler/src/c-literals.lts', 'compiler/src/frontend.lts',
      'compiler/manifests/c.json', 'lib/core/int.lts']) {
      writeFileSync(git, `#!/bin/sh\nprintf '%s\\n' ' M ${path}'\n`);
      chmodSync(git, 0o755);
      const result = spawnSync(join(root, 'bin/lite'), ['verify', '--no-cache', '--filter', 'features/int-arithmetic.json'], {
        env: changedEnv, encoding: 'utf8', timeout: 30000,
      });
      assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /verification passed: 1 executed, 0 cached/, path);
    }
    writeFileSync(git, "#!/bin/sh\nprintf '%s\\n' ' M compiler/reports/2026-11-02-t00-t11-inventory.md'\n");
    const documentation = spawnSync(join(root, 'bin/lite'), ['verify', '--no-cache', '--filter', 'features/int-arithmetic.json'], {
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
    const expected = expectedText(source, { stdin });
    const compiled = compileTs({ text: source });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const actual = runTsArtifact(compiled.stdout.toString(), { stdin });
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString());
    assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, source);
  }
  const faultSource = 'outputLine("before fault"); values: List<Int> = [1]; outputLine(values[2]);';
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
  const source = 'output("before:"); outputLine(inputInt("N: ")); inputAll("Rest: ");';
  const compiled = compileTs({ text: source, name: 'input.lts' });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  withTsArtifact(compiled.stdout.toString(), run => {
    for (const [stdin, stdout, column] of [
      [Buffer.from([0xff]), 'before:N: ', 31], [Buffer.from([0xf0, 0x9f]), 'before:N: ', 31],
      [Buffer.from([0x37, 0x20, 0xff]), 'before:N: 7\nRest: ', 49],
    ] as const) {
      const actual = run({ stdin });
      assert.equal(actual.phase, 'run'); assert.equal(actual.signal, null); assert.equal(actual.status, 1);
      assert.equal(actual.stdout.toString(), stdout);
      assert.equal(actual.stderr.toString(), `input.lts:1:${column}: InputFault: cannot read input: ${decodeError}\n`);
    }
  });
});

test('report is no longer a builtin and temporary I/O rejects invalid signatures before effects', () => {
  for (const source of ['report(1);', 'inputLine(7);', 'inputFloat(7);', 'inputInt("a", "b");', 'inputAll(1);',
    'outputLine(prompt = "label", 1);', 'output(fn(): Int { 1 });',
    'inputInt := 3; outputLine(inputInt());', 'outputLine := 3; outputLine(1);']) {
    assert.notEqual(expectedText(source).status, 0, source);
    assert.notEqual(compileTs({ text: source }).status, 0, source);
  }
});

/** Boundary/sign combinations with every representable result retained for differential execution. */
function int64BoundaryProgram(division = false): string {
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
    if (division && right !== 0n) {
      const quotient = left / right;
      if (quotient >= min && quotient <= max) lines.push(`outputLine(${a} / ${b}, ${a} :/ ${b});`);
      lines.push(`outputLine(${a} % ${b}, ${a} :% ${b});`);
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
  const expected = expectedText(source);
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
      const reference = expectedText(faultSource, { stdin: String(index), name });
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
  const reference = expectedText(effects);
  assert.deepEqual({ status: run.status, stdout: run.stdout, stderr: run.stderr }, reference);
});

const divisionFaultExpressions = ['hi / zero', 'hi % zero', 'hi :/ zero', 'hi :% zero', 'lo / -1', 'lo :/ -1',
  '(hi / zero) + (lo % zero)', '(lo % zero) + (hi / zero)', '(hi + 1) / zero', 'lo / (hi + 1)'];

/** Keeps the same logical name, Unicode and CRLF positions on both runtime paths. */
function divisionFaultSource(expression: string): string {
  return '/* 🙂 */ outputLine("before");\r\nvar hi := 9223372036854775807; var lo := -9223372036854775808; var zero := 0;\r\noutputLine(' + expression + ');';
}

test('generated text/list bounds faults preserve exact positions, output and operand effects', () => {
  const bodies = [
    'outputLine(textAt("🙂x", -1));', 'outputLine(textAt("🙂x", 2));', 'outputLine(textAt("", 0));',
    'outputLine(textSlice("🙂ab", -1, 1));', 'outputLine(textSlice("🙂ab", 2, 1));',
    'outputLine(textSlice("🙂ab", 0, 4));',
    'values: List<Int> = [7]; outputLine(values[-1]);',
    'values: List<Int> = [7]; outputLine(values[/* سلام */ 1]);',
    'values: List<Int> = [7]; outputLine(values[9223372036854775807]);',
    'values: mut List<Int> = []; outputLine(pop_back(mut values));',
    'values: mut List<Int> = [7]; outputLine(pop_back(mut values)); pop_back(mut values);',
    'outputLine("prefix", textAt("x", 1));',
    'var n := 0; loop n < 2 { outputLine(textAt("x", n)); n = n + 1; }',
    'outputLine(textSlice("x", 0, 2), textAt("", 0));',
  ];
  const branches = bodies.map((body, index) => `${index === 0 ? 'if' : 'else if'} pick == ${index} { ${body} }`).join('\r\n');
  const text = '/* 🙂 */ outputLine("before");\r\npick := inputInt();\r\n' + branches;
  for (const name of [undefined, 'bounds سلام🙂.lts']) {
    const compiled = compileTs(name === undefined ? { text } : { text, name });
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    withTsArtifact(compiled.stdout.toString(), run => {
      for (const [index, body] of bodies.entries()) {
        const expected = expectedText(text, name === undefined ? { stdin: String(index) } : { stdin: String(index), name });
        const actual = run({ stdin: String(index) });
        assert.equal(expected.status, 1); assert.equal(actual.phase, 'run'); assert.equal(actual.signal, null);
        assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, body);
      }
    });
  }
  const effects = 'items := fn(): List<Int> { outputLine("items"); values: List<Int> = [1]; values } ' +
    'index := fn(): Int { outputLine("index"); 2 } outputLine("before"); outputLine(items()[index()]);';
  const valid = 'values: mut List<Int> = [3, 4]; outputLine(textAt("🙂x", 0), textSlice("🙂ab", 0, 3), textSlice("", 0, 0), values[0], values[1], pop_back(mut values));';
  for (const source of [effects, valid]) {
    const compiled = compileTs({ text: source }), expected = expectedText(source);
    assert.equal(compiled.status, 0, compiled.stderr.toString());
    const actual = runTsArtifact(compiled.stdout.toString());
    assert.equal(actual.phase, 'run');
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);
  }
});

test('inequality stays distinct from assignment and tuple fields in grouping and function tails', () => {
  const common = [
    'value := "x"; outputLine((value =!= ""), (((value =!= "x"))), (value == "x"));',
    'var x := 2; outputLine((x =!= 1), (x =!= 2), (x == 2));',
    'var flag := true; outputLine((flag =!= false), (flag =!= true));',
    'var x := 1; x = 3; outputLine((x =!= 2), x);',
    'value := ""; outputLine(not (value =!= ""));',
    'value := "x"; outputLine((value /* left */ =!= /* right */ ""));',
    'var x := 0; loop x < 2 { if (x =!= 1) { outputLine(x); } x = x + 1; }',
  ];
  const tsOnly = [
    'different := fn(value: String): Bool { value =!= "" } outputLine(different("x"), different(""));',
    'different := fn(value: Int): Bool { value =!= 0 } outputLine(different(0), different(1));',
    'different := fn(value: Bool): Bool { value =!= false } outputLine(different(true), different(false));',
    'different := fn(value: String): Bool { (value =!= "") } outputLine(different("x"));',
    'point := (value = 7); outputLine(point.value);',
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
  for (const bad of ['value := "x"; outputLine((value =!=));', 'value := "x"; outputLine((value =!= 1));',
    'x := 1; x = 2;', 'point := (value =);', 'var x := 1; x === 2;']) {
    const text = 'outputLine("before"); ' + bad;
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
  const skipped = expressions.flatMap(expression => [
    `if false { outputLine(${expression}); }`, `loop false { outputLine(${expression}); }`,
    `outputLine(false and (${expression} > 0), true or (${expression} > 0));`,
  ]).join('\n');
  const valid = skipped + '\noutputLine(2 * (3 - 4), -(-7), -9223372036854775808 % -1);';
  const compiled = compileTs({ text: valid }), expected = expectedText(valid);
  assert.equal(expected.status, 0, expected.stderr.toString()); assert.equal(compiled.status, 0, compiled.stderr.toString());
  const actual = runTsArtifact(compiled.stdout.toString()); assert.equal(actual.phase, 'run');
  assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const c = compileTarget('c', { text: valid }); assert.equal(c.status, 0, c.stderr.toString());
    const native = runCArtifact(c.stdout.toString()); assert.equal(native.phase, 'run', native.stderr.toString());
    assert.deepEqual({ status: native.status, stdout: native.stdout, stderr: native.stderr }, expected);
  }
  const branches = expressions.map((expression, index) => `${index === 0 ? 'if' : 'else if'} pick == ${index} { outputLine(${expression}); }`).join('\r\n');
  const name = 'constant faults سلام.lts', text = 'outputLine("before"); pick := inputInt();\r\n' + branches;
  const faults = compileTs({ text, name }); assert.equal(faults.status, 0, faults.stderr.toString());
  withTsArtifact(faults.stdout.toString(), run => {
    for (const [index, expression] of expressions.entries()) {
      const expected = expectedText(text, { stdin: String(index), name }), actual = run({ stdin: String(index) });
      assert.equal(expected.status, 1); assert.equal(actual.phase, 'run'); assert.equal(actual.signal, null);
      assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, expression);
      if (process.env['LITE_SKIP_NATIVE'] !== '1') {
        const text = `outputLine("before");\r\noutputLine(${expression});`;
        const c = compileTarget('c', { text, name }); assert.equal(c.status, 0, c.stderr.toString());
        const native = runCArtifact(c.stdout.toString()), expected = expectedText(text, { name });
        assert.equal(native.phase, 'run'); assert.equal(native.signal, null);
        assert.deepEqual({ status: native.status, stdout: native.stdout, stderr: native.stderr }, expected);
      }
    }
  });
  for (const text of ['unused := fn(): Int { 1 / 0 } outputLine(7);',
    'value := if true { 5 } else { 1 / 0 }; outputLine(value);',
    'value := if false { 1 / 0 } else { 5 }; outputLine(value);']) {
    const c = compileTs({ text }); assert.equal(c.status, 0, c.stderr.toString());
    const r = runTsArtifact(c.stdout.toString()), e = expectedText(text);
    assert.equal(r.phase, 'run'); assert.deepEqual({ status: r.status, stdout: r.stdout, stderr: r.stderr }, e);
  }
  for (const text of ['if false { outputLine(missing); }', 'outputLine(false and ("x" + 1 > 0));',
    'if false { outputLine(9223372036854775808); }']) {
    assert.equal(expectedText(text).status, 1);
    for (const target of ['ts', 'c'] as const) {
      const c = compileTarget(target, { text }); assert.equal(c.status, 2); assert.equal(c.stdout.length, 0);
    }
  }
});

test('comparison chains compare adjacent values once and skip later operands on both targets', () => {
  const operators = ['==', '=!=', '<', '<!', '<=', '<!=', '>', '>!', '>=', '>!='];
  const rows = ['var a := 0; var b := 0; var c := 0;'];
  for (const [a, b, c] of [[-1, 0, 1], [1, 0, -1], [0, 0, 0]]) {
    rows.push(`a = ${a}; b = ${b}; c = ${c};`);
    for (const first of operators) for (const second of operators) {
      rows.push(`outputLine(a ${first} b ${second} c, ${a} ${first} ${b} ${second} ${c});`);
    }
  }
  rows.push('var lo := -9223372036854775808; var hi := 9223372036854775807; outputLine(lo < 0 < hi, hi > 0 > lo);');
  rows.push('var text := "a"; var flag := true; outputLine(text == "a" =!= "b", flag == true =!= false);');
  rows.push('outputLine(Unit == Unit == Unit, Unit =!= Unit == Unit);');
  rows.push('outputLine(1 > 2 < (1 / 0), 1 > 2 < (9223372036854775807 + 1));');
  rows.push('outputLine(not 1 < 2 < 3, (1 < 2) == true == true, 0 < 1 < 2 and false);');
  rows.push('var lt_cmp_i_0_0 := 3; outputLine(0 < lt_cmp_i_0_0 < 4);');
  rows.push('var n := 0; loop 0 <= n < 3 { outputLine(n); n = n + 1; } outputLine(0 <= a < 2 < 3 < 4);');
  rows.push('var repeated := 1; outputLine(' + ['0', ...Array.from({ length: 300 }, () => 'repeated'), '2'].join(' <= ') + ');');
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
    { text: 'touch := fn(n: Int): Int { outputLine(n); n } outputLine(touch(1) < touch(2) < touch(3)); outputLine(touch(3) < touch(2) < touch(1));', stdin: '' },
    { text: 'touch := fn(): Unit { outputLine("unit"); } outputLine(Unit == Unit == touch()); outputLine(Unit =!= Unit == touch());', stdin: '' },
    { text: 'outputLine("x" == "y" == inputLine("unreached: "));', stdin: '' },
    { text: 'outputLine("x" == "x" == inputLine("Text: "));', stdin: 'x\n' },
    { text: 'outputLine(inputFloat() == inputFloat() == inputFloat());', stdin: '1.5 1.5 1.5' },
    { text: 'stop := fn(): Unit { exit(3); } outputLine("before"); outputLine(Unit == Unit == stop());', stdin: '' },
    { text: 'outputLine(inputInt() < inputInt() < inputInt()); outputLine(inputInt());', stdin: '3 2 1' },
    { text: 'values: List<Int> = [1]; outputLine(1 > 2 < values[9]);', stdin: '' },
    { text: 'values: List<Int> = [1]; outputLine("before"); outputLine(0 < 1 < values[9]);', stdin: '' },
  ];
  for (const item of cases) {
    const compiled = compileTs({ text: item.text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    const actual = runTsArtifact(compiled.stdout.toString(), { stdin: item.stdin }), expected = expectedText(item.text, { stdin: item.stdin });
    assert.equal(actual.phase, 'run', actual.stdout.toString() + actual.stderr.toString()); assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, item.text);
  }
  for (const expression of ['0 < 1 < (1 / 0)', '0 < 1 < (9223372036854775807 + 1)', '(1 / 0) < 2 < 3']) {
    const text = 'outputLine("before");\r\noutputLine("prefix", ' + expression + ');', name = 'chain سلام.lts';
    const expected = expectedText(text, { name }); assert.equal(expected.status, 1);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      const actual = target === 'ts' ? runTsArtifact(compiled.stdout.toString()) : runCArtifact(compiled.stdout.toString());
      assert.equal(actual.phase, 'run', actual.stderr.toString()); assert.equal(actual.signal, null);
      assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected);
    }
  }
  for (const bad of ['outputLine(1 > 2 < "bad");', 'outputLine(true < true < true);', 'outputLine(1 < 2 < missing);',
    'if 1 < 2', 'outputLine(1 < 2 <);']) {
    assert.equal(expectedText(bad).status, 1);
    for (const target of ['ts', 'c'] as const) { const c = compileTarget(target, { text: bad }); assert.equal(c.status, 2); assert.equal(c.stdout.length, 0); }
  }
  assert.equal(compileTarget('c', { text: 'outputLine(Unit =!= Unit == exit(3));' }).status, 2);
});

test('C output evaluates all arguments before writing, including mixed scalar and Unit values', context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') { context.skip('LITE_SKIP_NATIVE=1'); return; }
  const prefix = '/* 🙂 */ var zero := 0; var maximum := 9223372036854775807;\r\n';
  const cases = [
    'outputLine("prefix", 1 / zero);', 'output("prefix", 1 / zero);',
    'outputLine("prefix", true, maximum + 1);', 'outputLine(Unit, 1 % zero);',
    'outputLine("prefix", 1 / zero, maximum + 1);', 'outputLine("prefix", maximum + 1, 1 / zero);',
    'outputLine("before"); outputLine("prefix", 1 :/ zero);',
    'output("before"); output("prefix", 1 :% zero);',
    'var n := 2; loop n >= 0 { outputLine("value", 10 / n); n = n - 1; }',
    'var text := "value"; outputLine(text + "x", 1 / zero);',
    'outputLine(Unit, (), true, "text", 7);',
    'outputLine(Unit); output(); outputLine(); output("x", Unit); outputLine();',
    'var lt_output_0 := 3; outputLine(lt_output_0, "x", true);',
    'var n := 0; loop n < 2 { if n == 0 { output("a", n); } else { outputLine("b", n); } n = n + 1; }',
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
  for (const source of [int64BoundaryProgram(true), 'var n := -9223372036854775808; outputLine(n % -1, n :% -1, -9223372036854775808 % -1);',
    'touch := fn(n: Int): Int { outputLine("arg", n); n } outputLine(touch(-7) / touch(2), touch(-7) % touch(2), touch(-7) :/ touch(2), touch(-7) :% touch(2));',
    'var x := 1; var z := 0; var flag := false; outputLine(flag and (x / z > 0)); if flag { outputLine(x % z); }']) {
    const emitted = compileTs({ text: source });
    assert.equal(emitted.status, 0, emitted.stderr.toString());
    const result = runTsArtifact(emitted.stdout.toString()), expected = expectedText(source);
    assert.equal(result.phase, 'run', result.stdout.toString() + result.stderr.toString());
    assert.equal(result.signal, null);
    assert.deepEqual({ status: result.status, stdout: result.stdout, stderr: result.stderr }, expected);
  }
  const branches = divisionFaultExpressions.map((expression, index) => `${index === 0 ? 'if' : 'else if'} pick == ${index} { outputLine(${expression}); }`).join('\n');
  const source = '/* 🙂 */ outputLine("before");\r\npick := inputInt();\r\nvar hi := 9223372036854775807; var lo := -9223372036854775808; var zero := 0;\r\n' + branches;
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
    const literal = compileTarget(target, { text: 'outputLine("lt_arg_left_1 = lt_checked_add( lite$addInt(");' });
    assert.equal(literal.status, 0);
    assert.doesNotMatch(literal.stdout.toString(), /const lite\$intLines|static const size_t lt_int_lines/);
  }
});


test('empty and comment-only scripts compile silently without hiding malformed source', () => {
  const executions: ArtifactExecution[] = [];
  const sources = ['', ' ', '\n', '\r\n\t ', '/**/', '/* words */', '/* outer /* nested */ end */',
    ' \n/* سلام🙂 */\r\n', '/* ; {} () outputLine(1 / 0); */', '/* \"quoted\" */ /* another */',
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
  for (const text of ['/*', '/* outer /* nested */', '/*# unterminated', '/* ok */ }', '/* ok */ outputLine(1); /* unterminated']) {
    assert.equal(expectedText(text).status, 1);
    for (const target of ['ts', 'c'] as const) {
      const result = compileTarget(target, { text }); assert.equal(result.status, 2); assert.equal(result.stdout.length, 0);
    }
  }
  for (const text of ['/* before */ outputLine(7); /* after */', '/* nested /* inner */ */ var n := 1; outputLine(0 <= n < 2);']) {
    const expected = expectedText(text);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  assertExecutions(executions);
});


test('statement separators follow EOF, closing scope and directly closed block boundaries', () => {
  const executions: ArtifactExecution[] = [];
  const both = ['outputLine(7)', 'output("x") /* tail */', 'x := 1', 'var x := 1', 'x: Int = 1', 'x: Int',
    'var x := 1; x = 2', 'Number := type Int', 'if true { outputLine(7) }',
    'if true { x := 7 } outputLine(8)', 'var n := 0; loop n < 3 { n = n + 1; continue } outputLine(n)',
    'loop { outputLine(7); break }', '/* before */ outputLine(0 < 1 < 2) /* after */'];
  const tsOnly = ['noop := fn(): Unit { return } noop()', 'f := fn(): Int { return 7 } outputLine(f())',
    'x := if true { 7 } else { 9 } /* boundary */ outputLine(x)',
    'var x := 0; x = if true { 7 } else { 9 } outputLine(x)',
    'f := fn(): Int { return if true { 7 } else { 9 } } outputLine(f())',
    'values: mut List<Int> = [1]; pop_back(mut values)',
    'inputLine("Prompt: ")', 'f := fn(): Unit { outputLine(7) } f()'];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text, { stdin: 'line\n' }); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, options: target === 'ts' ? { stdin: 'line\n' } : {}, context: text });
    }
  }
  const invalid = ['outputLine(1) outputLine(2);', 'outputLine(1)\noutputLine(2)', 'output("x") outputLine("y")',
    'x := 1 outputLine(x);', 'var x := 1\nx = 2', 'x := 1 /* } */ outputLine(x);',
    'x := (if true { 1 } else { 2 }) outputLine(x);', 'Number := type Int outputLine(1);',
    'if true { outputLine(1)', 'noop := fn(): Unit { return', 'f := fn(): Int { return }'];
  for (const text of invalid) {
    assert.equal(expectedText(text).status, 1, text);
    for (const target of ['ts', 'c'] as const) {
      const result = compileTarget(target, { text }); assert.equal(result.status, 2, text); assert.equal(result.stdout.length, 0);
    }
  }
  const text = 'outputLine("before");\r\nvar zero := 0; outputLine(1 / zero) /* tail */', name = 'boundary سلام.lts';
  const expected = expectedText(text, { name }); assert.equal(expected.status, 1);
  for (const target of ['ts', 'c'] as const) {
    const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
  }
  assertExecutions(executions);
});

test('adjacent String literals join across trivia before expressions and encode once', () => {
  const executions: ArtifactExecution[] = [];
  const both = ['outputLine("a""b");', 'outputLine("" "" "x" "");', 'outputLine("a"\n"b");',
    'outputLine("a" /* outer /* inner */ end */ "b");', 'outputLine("a" /*# raw /* */ #*/ "b");',
    'outputLine("a\\n" "\\t" "\\r" "\\\"" "\\\\");', 'outputLine("سلام" "🙂");',
    'var x := "a" "b"; outputLine(x + "c" "d");',
    'var x := "ab"; outputLine(x == "a" "b" =!= "z");',
    'if "a" "b" == "ab" { outputLine("y" "es"); } else { outputLine("no"); }',
    'output("x" "y"); outputLine("z");', 'outputLine("a", "b"); outputLine("a"); outputLine("b");',
    'outputLine(' + Array(1024).fill('"x"').join(' ') + ');'];
  const tsOnly = ['echo := fn(s: String): String { s } outputLine(echo("a" "b"));',
    'f := fn(): String { "a" "b" } outputLine(f());',
    'values: List<String> = ["a" "b", "c" "d"]; outputLine(values[0], values[1]);',
    'pair := (label = "a" "b", value = 3); outputLine(pair.label);',
    'outputLine(inputLine("Prom" "pt: "));',
    'outputLine(textLength("ab" "cd"), textAt("ab" "cd", 2), textSlice("ab" "cd", 1, 3));',
    'value := if true { "a" "b" } else { "c" "d" } outputLine(value);'];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text, { stdin: 'line\n' }); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, options: target === 'ts' ? { stdin: 'line\n' } : {}, context: text });
    }
  }
  const invalid = ['outputLine("ok");\noutputLine("a" "\\q");', 'outputLine("a" "unterminated',
    'outputLine("a" /* unterminated', 'outputLine("a" /*# unterminated',
    'value := "a"; outputLine(value "b");', 'outputLine(("a") "b");', 'outputLine("a"; "b");', 'outputLine("a" 7);'];
  for (const text of invalid) {
    assert.equal(expectedText(text).status, 1, text);
    for (const target of ['ts', 'c'] as const) {
      const result = compileTarget(target, { text }); assert.equal(result.status, 2, text); assert.equal(result.stdout.length, 0);
    }
  }
  for (const target of ['ts', 'c'] as const) {
    const bad = compileTarget(target, { text: 'outputLine("ok");\noutputLine("a" "unterminated', name: 'later.lts' });
    assert.equal(bad.stderr.toString(), 'later.lts:2:16: unterminated string literal\n');
    const text = 'value := "a" "b"; outputLine(value);\nvar zero := 0; outputLine(1 / zero);', name = 'joined سلام.lts';
    const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    executions.push({ target, artifact: compiled.stdout.toString(), expected: expectedText(text, { name }), context: text });
  }
  assertExecutions(executions);
});

test('nonempty calls admit one trailing comma without adding a value or weakening arity', () => {
  const executions: ArtifactExecution[] = [];
  const both = ['outputLine(1,);', 'output(1,); outputLine("x",);', 'outputLine(1, "x", true,);',
    'outputLine(Unit,);', 'outputLine("a" "b", /* nested /* comment */ */);',
    'outputLine(0 < 1 < 2,);', 'var x := 7; outputLine(x + 1,);',
    'if true { outputLine("yes",) }', 'output(); outputLine();'];
  const tsOnly = ['identity := fn(n: Int): Int { n } outputLine(identity(7,),);',
    'sum := fn(a: Int, b: Int): Int { a + b } outputLine(sum(2, 3,),);',
    'touch := fn(n: Int): Int { outputLine(n,); n } add := fn(a: Int, b: Int): Int { a + b } outputLine(add(touch(1,), touch(2,),),);',
    'outputLine(inputAll("All: ",),);', 'outputLine(inputLine("Line: ",),);',
    'outputLine(inputInt("Int: ",),);', 'outputLine(inputFloat("Float: ",),);',
    'outputLine(textLength("ab",), textAt("ab", 1,), textSlice("abcd", 1, 3,),);',
    'values: mut List<Int> = [1]; push_back(mut values, 2,); outputLine(pop_back(mut values,), pop_back(mut values,),);',
    'values: List<Int> = [1, 2]; pair := (label = "x", n = 7); outputLine(values, pair,);',
    'reportError("err",); outputLine("after",);', 'outputLine("before",); exit(3,);'];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const stdin = text.includes('inputInt(') ? '7\n' : '1.5\n';
    const reference = expectedText(text, { stdin });
    assert.ok(reference.status === 0 || text.includes('exit(3,') && reference.status === 3, text + reference.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected: reference, options: target === 'ts' ? { stdin } : {}, context: text });
    }
  }
  const invalid = ['outputLine(,);', 'outputLine(1,,);', 'outputLine(,1);', 'outputLine(1,',
    'inputArgs(,);', 'inputLine(,);', 'inputInt("Prompt", 1,);', 'textAt("x",);',
    'f := fn(n: Int): Int { n } outputLine(f(,));', 'f := fn(n: Int): Int { n } outputLine(f(1,,));',
    'f := fn(a: Int, b: Int): Int { a + b } outputLine(f(1,));',
    'values: mut List<Int> = [1]; push_back(mut values,);', 'values: mut List<Int> = [1]; pop_back(mut values,,);'];
  for (const text of invalid) {
    assert.equal(expectedText(text).status, 1, text);
    for (const target of ['ts', 'c'] as const) {
      const result = compileTarget(target, { text }); assert.equal(result.status, 2, text); assert.equal(result.stdout.length, 0);
    }
  }
  for (const text of ['outputLine("before");\nvar zero := 0; outputLine("prefix", 1 / zero,);',
    'outputLine(inputInt("Int: ",),);', 'values: mut List<Int> = []; outputLine(pop_back(mut values,),);']) {
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

test('statement scopes isolate locals and preserve outer values while shadow initializers run', () => {
  const executions: ArtifactExecution[] = [];
  const both = ['{}', '{}; { outputLine(1,); }', '{ x := 3; outputLine(x); } outputLine(4);',
    'x := 10; { x := 20; outputLine(x); } outputLine(x);',
    'var x := 7; if true { x := x; outputLine(x); } outputLine(x);',
    'var x := 7; { x := x + 1; outputLine(x); } outputLine(x);',
    'var x := 7; { var x := x + 1; x = x + 2; outputLine(x); } outputLine(x);',
    'var x := 0; { x = 3; y := 1; } { x = 4; } outputLine(x);',
    'var x := 0; { var x := x + 1; { x := x + 1; outputLine(x); } outputLine(x); } outputLine(x);',
    'var value := "outer"; { value := value + "!"; outputLine(value); } outputLine(value);',
    'var flag := true; { flag := not flag; outputLine(flag); } outputLine(flag);',
    'var maximum := 9223372036854775807; { value := maximum - 1; outputLine(value); }',
    'var n := 0; loop { { n = n + 1; break } } outputLine(n);',
    'var n := 0; loop n < 3 { { n = n + 1; continue } } outputLine(n);',
    'var flag := false; var x := 7; if flag { { x := x + 1; outputLine(x); } } else { { x := x + 2; outputLine(x); } } outputLine(x);',
    'lt_local_0 := 17; var value := 1; { value := value + lt_local_0; outputLine(value); } outputLine(lt_local_0);',
    'var x: Int = 3; { x: Int = x; outputLine(x); } outputLine(x);',
    '{ x := 1; outputLine(x); } { x := 2; outputLine(x); }',
    'inputInt := 7; { inputInt := inputInt + 1; outputLine(inputInt); } outputLine(inputInt);',
    'var x := 7; { x: Bool = true; outputLine(x); } outputLine(x);'];
  const tsOnly = ['f := fn(n: Int): Int { { n := n + 1; outputLine(n); } return n; } outputLine(f(3));',
    'f := fn(): Int { { return 7; } } outputLine(f());',
    'values: List<Int> = [1, 2]; loop values as values { outputLine(values); } outputLine(values);',
    'values: mut List<Int> = [1, 2]; { values := pop_back(mut values); outputLine(values); } outputLine(values);',
    'pair := (n = 1, label = "x"); { pair := (n = pair.n + 1, label = pair.label); outputLine(pair.n, pair.label); } outputLine(pair.n);',
    'first := fn(values: List<Int>): Int { { values := values[0]; outputLine(values); } values[1] } items: List<Int> = [1, 2]; outputLine(first(items));'];
  for (const [sources, targets] of [[both, ['ts', 'c']], [tsOnly, ['ts']]] as const) for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    for (const target of targets) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  const invalid = ['outputLine("before"); { x := 1; } outputLine(x);',
    'var x := 1; { y := x; { outputLine(y); } } outputLine(y);', '{', '}', '{} else {}',
    '{ break; }', '{ continue; }', 'x := 1; { x = 2; }', 'var x := 7; { x: Bool = x; }'];
  for (const text of invalid) {
    assert.equal(expectedText(text).status, 1, text);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0);
    }
  }
  const faults = ['var zero := 0; outputLine("before");\r\n{ outputLine("prefix", 1 / zero); }',
    'var value := 9223372036854775807; outputLine("before");\r\n{ value := value + 1; outputLine(value); }',
    'values: List<Int> = [1]; outputLine("before");\r\n{ values := values[2]; outputLine(values); }'];
  for (const text of faults) {
    const name = 'scope سلام.lts', expected = expectedText(text, { name }); assert.equal(expected.status, 1);
    const targets = text.startsWith('values') ? ['ts'] as const : ['ts', 'c'] as const;
    for (const target of targets) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  assertExecutions(executions);
});

test('nested value declarations shadow while root declarations remain unique', () => {
  const nested = 'x := 1; if true { x := 2; outputLine(x); } outputLine(x);';
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

test('ordinary expression items evaluate silently and trailing separators retain function results', () => {
  const executions: ArtifactExecution[] = [];
  const both = ['1;', '; ; /* empty */ ;', 'true; false; Unit;', '1; "quiet"; not false; (2 + 3); +4; -5;',
    'x := 1; x + 2;', 'var x := 2; x * 3; x = 4; x; outputLine(x);',
    ';; { ;; 1;; "quiet";; };; outputLine("after");;',
    'if true { 1; } else { 2; } outputLine("after");',
    'var x := 0; loop x < 3 { x + 1; x = x + 1;; } outputLine(x);',
    'var zero := 0; if false { 1 / zero; } outputLine("alive");',
    'false and (1 / 0 > 0); true or (9223372036854775807 + 1 > 0);',
    'var x := 2; x < 3 < 4; "a" + "b"; outputLine("done");',
    'outputLine("before"); 9223372036854775807 - 1;',
    'Unit;; outputLine("after");', 'and true and false; or false or true;'];
  const tsOnly = ['[1, 2]; (n = 1, label = "quiet");',
    'f := fn(): Int { outputLine("effect"); 7; } f() + 1; outputLine("after");',
    'f := fn(): Int { 1; 2;; } outputLine(f());',
    'f := fn(): Bool { false; true;; } outputLine(f());',
    'f := fn(): String { "first"; "last";; } outputLine(f());',
    'f := fn(n: Int): Int { n + 1; n + 2;; } outputLine(f(3));',
    'f := fn(): Unit { ;; Unit;; } f();',
    'effect := fn(): Unit { outputLine("effect"); } f := fn(): Unit { effect();; } f();',
    'f := fn(): Int { if true { 1;; } else { 2;; };; } outputLine(f());',
    'f := fn(flag: Bool): Int { if flag { outputLine("yes"); 1;; } else { outputLine("no"); 2;; };; } outputLine(f(false), f(true));',
    'f := fn(): List<Int> { values: List<Int> = [1, 2]; values;; } outputLine(f());',
    'f := fn(): List<Int> { values: List<Int> = []; values;; } outputLine(f());',
    'f := fn(): (n: Int) { (n = 2);; } outputLine(f());',
    'var values: mut List<Int> = [1, 2]; pop_back(mut values); outputLine(values);',
    'f := fn(): Int { values: mut List<Int> = [1, 2]; pop_back(mut values);; } outputLine(f());',
    'f := fn(): Unit { if true { Unit } else { Unit };; } f();',
    'f := fn(): Unit { values: mut List<Int> = [1]; push_back(mut values, 2);; } f();',
    'f := fn(): Unit { if true { outputLine("yes"); Unit;; } else { outputLine("no"); Unit;; };; } f();',
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
    ['inputInt("n? ") + inputInt("m? "); outputLine(inputInt());', '1 2 3'],
    ['inputLine("line? "); outputLine(inputLine());', 'first\nlast\n'],
    ['inputAll("all? "); outputLine(inputAll());', 'all\n🙂'],
  ] as const) {
    const expected = expectedText(text!, { stdin }); assert.equal(expected.status, 0, expected.stderr.toString());
    const compiled = compileTarget('ts', { text: text! }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text! });
  }
  const invalid = ['outputLine("before"); 1 2;', 'true false;', 'Unit Unit;',
    'x := 1; x + 2 outputLine(x);', 'unknown;', 'outputLine("before"); 1 + true;',
    'f := fn(): Int { "wrong";; } f();', 'f := fn(): Int { ;; } f();',
    'f := fn(): Unit { 1;; } f();',
    'g := fn(): Int { outputLine("effect"); 1 } f := fn(): Unit { g();; } f();',
    'g := fn(): String { outputLine("effect"); "value" } f := fn(): Unit { (g());; } f();',
    'f := fn(): Unit { if true { 1 } else { 2 };; } f();',
    'f := fn(): Unit { if true { outputLine("effect"); 1;; } else { 2;; };; } f();'];
  for (const text of invalid) {
    const expected = expectedText(text); assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text);
    }
  }
  for (const text of ['outputLine("before");\r\nvar zero := 0; 1 / zero;',
    'outputLine("before");\r\n9223372036854775807 + 1;',
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

test('function completion joins every conditional arm and preserves earlier definite returns', () => {
  const executions: ArtifactExecution[] = [];
  const sources = [
    'f := fn(flag: Bool): Int { if flag { return 1; } else { return 2; } } outputLine(f(true), f(false));',
    'f := fn(flag: Bool): Int { if flag { return 1; } 2; } outputLine(f(true), f(false));',
    'f := fn(a: Bool, b: Bool): Int { if a { if b { return 1; } else { return 2; } } else { return 3; } } outputLine(f(true, true), f(true, false), f(false, true));',
    'f := fn(n: Int): Int { if n < 0 { x := n; -x; } else if n == 0 { return 10; } else { n + 1; } } outputLine(f(-2), f(0), f(2));',
    'f := fn(): Int { return 1; x := "dead"; x;; } outputLine(f());',
    'f := fn(): Unit { return; 1;; } f(); outputLine("after");',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { return 2; } "dead";; } outputLine(f(false));',
    'f := fn(): Int { { return 1; } "dead";; } outputLine(f());',
    'f := fn(flag: Bool): Int { loop flag { return 1; } 0; } outputLine(f(false), f(true));',
    'f := fn(): Int { loop { return 1; } } outputLine(f());',
    'f := fn(flag: Bool): Int { loop { if flag { return 1; } else { return 2; } } } outputLine(f(false));',
    'f := fn(): Int { loop { break; return 1; } 2; } outputLine(f());',
    'f := fn(flag: Bool): Unit { if flag { return; } outputLine("body"); } f(true); f(false);',
    'f := fn(flag: Bool): String { if flag { return "a"; } else { return "b"; } Unit; } outputLine(f(false));',
    'f := fn(flag: Bool): Bool { if flag { x := true; x; } else { x := false; x; } } outputLine(f(true), f(false));',
    'f := fn(flag: Bool): (n: Int) { if flag { p := (n = 1); p; } else { return (n = 2); } } outputLine(f(true), f(false));',
    'f := fn(flag: Bool): List<Int> { if flag { values: List<Int> = [1]; values; } else { values: List<Int> = [2]; return values; } } outputLine(f(true), f(false));',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { { return 2; } } } outputLine(f(false));',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { return 2; } if false { "ignored"; } Unit; } outputLine(f(true));',
    'f := fn(flag: Bool): Unit { if flag { return; } else { return; } 1; } f(false); outputLine("after");',
  ];
  for (const text of sources) {
    const expected = expectedText(text); assert.equal(expected.status, 0, text + expected.stderr.toString());
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, context: text });
    const c = compileTarget('c', { text }); assert.equal(c.status, 2, text); assert.equal(c.stdout.length, 0);
  }
  const scalarControl = ['loop { outputLine("live"); break; 1 / 0; } outputLine("after");',
    'var n := 0; loop n < 2 { n = n + 1; continue; outputLine("dead"); } outputLine(n);',
    'loop { if true { break; } else { break; } outputLine("dead"); } outputLine("after");',
    'loop { { break; } outputLine("dead"); } outputLine("after");',
    'var n := 0; loop { n = n + 1; if n > 1 { break; } else { continue; } outputLine("dead"); } outputLine(n);',
    'loop { loop { break; } outputLine("outer"); break; } outputLine("after");'];
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
    'f := fn(flag: Bool): Int { if flag { 1; } else { x := 2; } } outputLine(f(false));',
    'f := fn(flag: Bool): Int { if flag { x := 1; } else { 2; } } outputLine(f(true));',
    'f := fn(flag: Bool): Int { if flag { return 1; } } outputLine(f(false));',
    'f := fn(): Int { if true { return 1; } } outputLine(f());',
    'f := fn(flag: Bool): Int { if flag { return 1; } x := 3; } outputLine(f(false));',
    'f := fn(a: Bool, b: Bool): Int { if a { if b { return 1; } } else { return 2; } } outputLine(f(true, false));',
    'f := fn(n: Int): Int { if n < 0 { return 1; } else if n == 0 { x := 2; } else { return 3; } } outputLine(f(0));',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { } } outputLine(f(false));',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { outputLine("effect"); } } outputLine(f(false));',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { var x := 2; x = 3; } } outputLine(f(false));',
    'f := fn(flag: Bool): Int { if flag { return 1; } "wrong"; } outputLine(f(false));',
    'f := fn(): Int { return 1; return "wrong"; } outputLine(f());',
    'f := fn(): Unit { return; return 1; } f();',
  ];
  for (const source of invalid) {
    const text = 'outputLine("before");\r\n' + source;
    const reference = expectedText(text); assert.equal(reference.status, 1, source); assert.equal(reference.stdout.length, 0, source);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name: 'branch سلام.lts' });
      assert.equal(compiled.status, 2, source); assert.equal(compiled.stdout.length, 0, source);
      assert.match(compiled.stderr.toString(), /^branch سلام\.lts:2:[0-9]+: /);
    }
  }
  for (const text of ['outputLine("before"); f := fn(flag: Bool): Int { if flag { var zero := 0; return 1 / zero; } else { return 2; } } outputLine(f(true));',
    'f := fn(flag: Bool): Int { if flag { return 1; } else { var max := 9223372036854775807; max + 1; } } outputLine(f(false));']) {
    const name = 'branch سلام.lts', expected = expectedText(text, { name }); assert.equal(expected.status, 1, text);
    const compiled = compileTarget('ts', { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, context: text });
  }
  assertExecutions(executions);
});

test('finite Float literals retain binary64 values, display and same-family comparisons on TS and C', () => {
  const executions: ArtifactExecution[] = [];
  const literals = ['0.0', '-0.0', '1.5', '+1.5', '0001.2500', '1e2', '2.5E-2', '1E+21',
    '0.000001', '0.0000001', '1000000000000000100.0', '1.7976931348623158e308',
    '5e-324', '2e-324', '1e-99999', '0e' + '9'.repeat(120),
    '0.' + '0'.repeat(400) + '1e401', '999999999999999999999999999999.0',
    '- /* comment */ 1.5'];
  const midpoint = (1n << 1024n) - (1n << 970n);
  literals.push((midpoint - 1n).toString() + '.0');
  const both = ['outputLine(' + literals.join(', ') + ');',
    'var n: Float = 0.1; saved := n; n = 0.2; n = -n; outputLine(saved, n, +n, -(-n));',
    'zero: Float; outputLine(zero, zero == 0.0, -zero, +zero);',
    'a := 1.5; b := 2.5; outputLine(a == b, a =!= b, a < b, a <! b, a <= b, a <!= b, a > b, a >! b, a >= b, a >!= b);',
    'a := 1.5; b := 2.5; c := 3.5; outputLine(a < b < c, c > b > a, a > b < c);',
    'var n := 1.5; { n := -n; outputLine(n); } outputLine(n);',
    'var flag := true; var n := 1.5; loop flag { outputLine(n); n = 2.5; flag = false; } outputLine(n);',
    '1.5; -0.0; 1e-9999; outputLine("after");',
    'output("before", 0.1); outputLine(1e21, -5e-324, 0.000001);'];
  const tsOnly = ['f := fn(n: Float): Float { n } outputLine(f(0.1), f(-0.0));',
    'p := (n = 0.1, label = "value"); values: List<Float> = [0.1, 1e21]; outputLine(p, values);',
    'f := fn(flag: Bool): Float { if flag { 0.1 } else { 2.5 } } outputLine(f(true), f(false));',
    'f := fn(n: Float): Float { if n < 0.0 { return -n; } n } outputLine(f(-1.5));',
    'echo := fn(n: Float): Float { outputLine("call", n); n } outputLine(echo(1.5) < echo(2.5) < echo(3.5), echo(3.5) < echo(2.5) < echo(1.5));'];
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
  const text = vectors.map(n => { let token = Object.is(n, -0) ? '-0.0' : String(n); if (!/[.eE]/.test(token)) token += '.0'; return 'outputLine(' + token + ');'; }).join('\n');
  const expected = expectedText(text); assert.equal(expected.status, 0, expected.stderr.toString());
  assert.equal(expected.stdout.toString(), vectors.map(n => String(n)).join('\n') + '\n');
  for (const target of ['ts', 'c'] as const) {
    const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
    executions.push({ target, artifact: compiled.stdout.toString(), expected, context: 'binary64 boundary/random display vectors' });
  }
  const invalid = ['outputLine(.5);', 'outputLine(1.);', 'outputLine(1e);', 'outputLine(1e+);', 'outputLine(1e-);',
    'outputLine(1.2e);', 'outputLine(1ee2);', 'outputLine(1.2.3);', 'outputLine(1e2.5);', 'outputLine(1e+ 2);',
    'outputLine(1e309);', 'outputLine(-1e309);', 'outputLine(' + midpoint.toString() + '.0);',
    'if false { outputLine(1e99999); }', 'var x: Float = "wrong";', 'outputLine(1.5 == "wrong");'];
  for (const source of invalid) {
    const text = 'outputLine("before");\r\n' + source;
    const expected = expectedText(text); assert.equal(expected.status, 1, source); assert.equal(expected.stdout.length, 0, source);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name: 'float سلام.lts' }); assert.equal(compiled.status, 2, source); assert.equal(compiled.stdout.length, 0, source);
      assert.match(compiled.stderr.toString(), /^float سلام\.lts:2:[0-9]+: /);
    }
  }
  for (const text of ['outputLine("before"); var zero := 0; outputLine(0.1, 1 / zero);',
    'outputLine("before"); outputLine(0.1, 9223372036854775807 + 1);']) {
    const name = 'float سلام.lts', expected = expectedText(text, { name }); assert.equal(expected.status, 1);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  {
    const text = 'outputLine(0.1 < inputFloat("middle? ") < inputFloat("last? "));', stdin = '0.0 bad', expected = expectedText(text, { stdin });
    assert.equal(expected.status, 0); assert.equal(expected.stdout.toString(), 'middle? false\n');
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text });
  }
  assertExecutions(executions);
});

test('mixed Float arithmetic and comparisons preserve values, effects and positioned faults on generated targets', () => {
  const executions: ArtifactExecution[] = [];
  const both = [
    'outputLine(1.5 + 2.5, 1.5 - 2.5, 1.5 * 2.5, 1.5 / 2.5);',
    'outputLine(2 + 0.5, 0.5 + 2, 2 - 0.5, 0.5 - 2, 2 * 0.5, 0.5 * 2, 2 / 0.5, 0.5 / 2);',
    'var x := 2; var y := 0.25; outputLine(x + y * 2, (x + y) * 2, -(x / y), +y);',
    'outputLine(-0.0 * 2, 1e-300 * 1e-30, 5e-324 / 2, 5e-324 * 2, 1e308 / 1e308);',
    'outputLine(9223372036854775807 + 0.0, -9223372036854775808 / 1.0);',
    'outputLine(2 < 2.5, 2.5 > 2, 2 == 2.0, 2.0 =!= 3, 2 <! 2.0, 2.0 >! 2, 2 <!= 1.0, 1.0 >!= 2);',
    'outputLine(9007199254740992.0 == 9007199254740993 > 9007199254740992, 9007199254740992 < 9007199254740993 == 9007199254740992.0);',
    'outputLine(3.5 < 2 < (1.0 / 0.0), 1 < 2.5 < 3, 3 > 2.5 > 1);',
    'var x := 0.0; var n := 0; loop n < 3 { x = x + 0.5; n = n + 1; } outputLine(x);',
    'if false { outputLine(1.0 / 0); } loop false { outputLine(1e308 * 2); } outputLine(false and (1.0 / 0 > 1), true or (1e308 * 2 > 1));',
    'outputLine(1.0 < 2.0, 2.0 == 2.0, 3.0 > 2.0);',
  ];
  const tsOnly = [
    'echo := fn(n: Float): Float { outputLine("call", n); n } outputLine(echo(1.5) + echo(2.5) * echo(3.5));',
    'i := fn(): Int { outputLine("int"); 2 } f := fn(): Float { outputLine("float"); 0.5 } outputLine(i() / f(), f() - i());',
    'echo := fn(n: Float): Float { outputLine("call", n); n } outputLine(1 < echo(2.5) < 3, echo(3.5) < 2 < echo(1.5));',
    'f := fn(n: Int, x: Float): Float { n * x + 0.25 } p := (value = f(2, 0.5)); values: List<Float> = [p.value, f(3, 0.5)]; outputLine(p, values);',
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
    'outputLine(1.0 / 0);', 'outputLine(1 / -0.0);', 'outputLine(0.0 / 0.0);',
    'outputLine(1e308 + 1e308);', 'outputLine(-1e308 - 1e308);', 'outputLine(1e308 * 2);',
    'outputLine(1e308 / 1e-308);', 'outputLine((1.0 / 0) + (1e308 * 2));',
    'outputLine((1e308 * 2) < (1.0 / 0));', 'outputLine(1.0, 1.0 / 0);',
    'var zero := 0.0; outputLine(1 / zero);',
  ];
  for (const source of faults) {
    const text = 'outputLine("before");\r\n' + source, name = 'mixed-float سلام.lts';
    const expected = expectedText(text, { name }); assert.equal(expected.status, 1, text);
    assert.equal(expected.stdout.toString(), 'before\n');
    assert.match(expected.stderr.toString(), /^mixed-float سلام\.lts:2:\d+: ArithmeticPanic: (division by zero|non-finite floating value)\n$/);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  for (const source of ['outputLine(1.5 % 2);', 'outputLine(1 :/ 2.5);', 'outputLine(1.5 :% 2.5);',
    'outputLine(1.5 + "x");', 'outputLine(true * 1.5);', 'outputLine(Unit / 1.5);',
    'outputLine(1.5 < "x");', 'outputLine(1 < 2.5 < true);', 'var x: Int = 1.5 + 2;']) {
    const text = 'outputLine("before"); ' + source;
    const expected = expectedText(text); assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) { const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text); }
  }
  {
    const text = 'outputLine(inputInt("int? ") / inputFloat("float? "));', stdin = '3 2.0', expected = expectedText(text, { stdin });
    assert.equal(expected.status, 0); assert.equal(expected.stdout.toString(), 'int? float? 1.5\n');
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text });
  }
  assertExecutions(executions);
});

test('power preserves right association, explicit negative-base grouping and the positive-exponent checkpoint', () => {
  const executions: ArtifactExecution[] = [];
  const both = [
    'outputLine(2 ** 3, 2 ** 3 ** 2, (2 ** 3) ** 2, 2 ** (3 ** 2));',
    'outputLine(4 ** 0.5, 2.5 ** 2, 2 ** 3.0, 1.5 ** 2.0);',
    'outputLine(1.1 ** 3, 10 ** 0.1, 27 ** (1.0 / 3.0), 0.1 ** 0.2);',
    'outputLine((-2) ** 2, (-2) ** 3, -(2 ** 2), +(-2) ** 2, (- /* c */ 2) ** 3);',
    'outputLine(2 ** 3 * 2, 2 * 3 ** 2, 2 ** (3 * 2), 1 + 2 ** 3 * 2, (1 + 2) ** 2);',
    'var base := 2; var exponent := 3; var value: Float = base ** exponent; outputLine(value, value + 0.5, value == 8);',
    'outputLine(0 ** 2, (-0.0) ** 3, 1e-200 ** 2, 9223372036854775807 ** 1);',
    'if false { outputLine(2 ** 0); } loop false { outputLine(2 ** -1); } outputLine(false and (2 ** 0 > 1), true or (1e308 ** 2 > 1), 3 < 2 < 2 ** 0);',
    'var n := 1; loop n <= 3 { outputLine(2 ** n); n = n + 1; }',
  ];
  const tsOnly = [
    'echo := fn(n: Int): Int { outputLine("call", n); n } outputLine(echo(2) ** echo(3) ** echo(2));',
    'f := fn(base: Float, exponent: Int): Float { base ** exponent } p := (n = f(2.5, 2)); xs: List<Float> = [p.n, f(1.5, 2)]; outputLine(p, xs);',
    'unused := fn(): Float { 2 ** 0 } f := fn(flag: Bool): Float { if flag { return 2 ** 3; } 3 ** 2 } outputLine(f(true), f(false));',
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
  for (const source of ['outputLine(2 ** 0);', 'outputLine(2 ** -1);', 'outputLine(2 ** -0.0);',
    'outputLine(1e308 ** 2);', 'outputLine((-2) ** 0.5);', 'outputLine((2 ** 0) ** (1e308 ** 2));',
    'outputLine(2 ** (2 ** 0));', 'outputLine(2 ** 0, "after");', 'var e := -1; outputLine(2 ** e);']) {
    const text = 'outputLine("before");\r\n' + source, name = 'power سلام.lts', expected = expectedText(text, { name });
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.toString(), 'before\n');
    assert.match(expected.stderr.toString(), /^power سلام\.lts:2:\d+: ArithmeticPanic: (power exponent must be positive in this checkpoint|non-finite floating value)\n$/);
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  for (const source of ['outputLine(-2 ** 2);', 'outputLine(- /* c */ 2 ** 3);', 'base := 2; outputLine(-base ** 2);',
    'outputLine((-2 ** 2));', 'outputLine(-(2) ** 2);', 'outputLine(2 ** -1 ** 2);',
    'outputLine("x" ** 2);', 'outputLine(2 ** false);', 'outputLine(Unit ** 2);',
    'var x: Int = 2 ** 3;', 'outputLine(2 *** 3);', 'outputLine(2 **);', 'outputLine(** 2);',
    'var x := 2; x **= 2;', 'outputLine(2 ^ 3);']) {
    const text = 'outputLine("before"); ' + source, expected = expectedText(text);
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) { const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text); }
  }
  // The selected grammar forbids using identity + to conceal an ungrouped negative base.
  // T00 still admits these forms; its admission is not the selected syntax rule.
  for (const source of ['+-2 ** 2', '+ - /* c */ 2 ** 3', '+-+2 ** 2']) {
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text: 'outputLine("before"); outputLine(' + source + ');' });
      assert.equal(compiled.status, 2, source); assert.equal(compiled.stdout.length, 0, source);
      assert.match(compiled.stderr.toString(), /group a negative power base/);
    }
  }
  {
    const text = 'outputLine(inputInt("base? ") ** inputFloat("exponent? "));', stdin = '4 0.5', expected = expectedText(text, { stdin });
    assert.equal(expected.status, 0); assert.equal(expected.stdout.toString(), 'base? exponent? 2\n');
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text });
  }
  assertExecutions(executions);
});

test('Int64, Float64 and Double normalize across admitted numeric annotations and contracts', () => {
  const executions: ArtifactExecution[] = [];
  const both = [
    'i: Int64 = 5; f: Float64 = 2.5; d: Double = 3.5; outputLine(i, f, d);',
    'i: Int64; f: Float64; d: Double; outputLine(i, f, d);',
    'var i: Int64 = 2; var f: Double = 0.5; i = i + 1; f = i * f; outputLine(i, f);',
    'Count := type Int64; SavedCount := type Count; Amount := type Double; a: SavedCount = 7; b: Amount = 0.25; outputLine(a, b, a + b);',
    'var i: Int64 = 7; { i: Int64 = -i; outputLine(i); } outputLine(i);',
    'low: Int64 = -9223372036854775808; high: Int64 = 9223372036854775807; outputLine(low, high);',
    'var total: Float64 = 0.0; var n: Int64 = 0; loop n < 3 { total = total + 0.5; n = n + 1; } outputLine(total);',
    'x: Double = 2 ** 3; outputLine(x, x == 8, x / 2);',
  ];
  const tsOnly = [
    'f := fn(n: Int64, x: Float64): Double { n * x } outputLine(f(3, 0.5));',
    'Count := type Int64; Amount := type Float64; f := fn(n: Count, x: Amount): Double { if n > 0 { return x; } -x } outputLine(f(2, 0.5), f(0, 0.5));',
    'p: (i: Int64, f: Double) = (i = 2, f = 0.5); outputLine(p, p.i, p.f);',
    'Pair := type (i: Int64, f: Float64); f := fn(p: Pair): Double { p.i * p.f } p: Pair = (i = 3, f = 0.5); outputLine(f(p));',
    'xs: mut List<Int64> = [1, 2]; ys: List<Float64> = [0.5, 1.5]; push_back(mut xs, 3); outputLine(xs, ys, xs[1]);',
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
    'f := fn(n: Int64): Int64 { n } outputLine(f(0.5));',
    'f := fn(n: Double): Double { n } i: Int64 = 2; outputLine(f(i));',
    'var x: Int64 = 9223372036854775808;', 'var x: Float64 = 1e309;',
    'x: List<Int64> = [0.5];', 'x: (n: Int64) = (n = 0.5);'];
  for (const source of invalid) {
    const text = 'outputLine("before"); ' + source, expected = expectedText(text);
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) { const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text); }
  }
  for (const source of ['var x: Int64 = 9223372036854775807; outputLine(x + 1);',
    'var x: Double = 1e308; outputLine(x * 2);']) {
    const text = 'outputLine("before");\r\n' + source, name = 'numeric-alias سلام.lts', expected = expectedText(text, { name });
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.toString(), 'before\n');
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  for (const target of ['ts', 'c'] as const) {
    const alias = compileTarget(target, { text: 'i: Int64 = 2; f: Float64 = 0.5; d: Double = 1.5; outputLine(i, f, d);' });
    const canonical = compileTarget(target, { text: 'i: Int = 2; f: Float = 0.5; d: Float = 1.5; outputLine(i, f, d);' });
    assert.equal(alias.status, 0); assert.equal(canonical.status, 0); assert.deepEqual(alias.stdout, canonical.stdout);
  }
  {
    const text = 'i: Int64 = inputInt("int? "); f: Double = inputFloat("float? "); outputLine(i * f);', stdin = '3 0.5', expected = expectedText(text, { stdin });
    assert.equal(expected.status, 0); assert.equal(expected.stdout.toString(), 'int? float? 1.5\n');
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected, options: { stdin }, context: text });
  }
  assertExecutions(executions);
});

test('Float contexts admit exact integer literals without widening values or changing binary arithmetic', () => {
  const executions: ArtifactExecution[] = [];
  const both = [
    'f: Float = 2; d: Double = -3; g: Float64 = (4); outputLine(f, d, g);',
    'a: Float = 9007199254740992; b: Float = 9007199254740994; c: Float = 18014398509481984; d: Float = -9223372036854775808; outputLine(a, b, c, d);',
    'a: Float = ((-9007199254740992)); b: Float = (/* before */ 2 /* after */); outputLine(a, b);',
    'var f: Float = 2; f = -4; outputLine(f); f = ((8)); outputLine(f);',
    'f: Float = 2; g: Float = f; outputLine(f, g);',
    'f: Float = 9007199254740993 + 0.5; g: Float = (9007199254740993) + 0.5; outputLine(f, g);',
    'var f: Float = 2; loop f < 5 { f = f + 1; } outputLine(f);',
    'Amount := type Double; var f: Amount = 2; f = (4); outputLine(f);',
    'f: Float = (2.0 + 3.0); g: Float = -(2.5); outputLine(f, g);',
    'f: Float = (-9007199254740993) * 0.5; outputLine(f);',
  ];
  const tsOnly = [
    'f := fn(n: Float): Float { n } outputLine(f(2), f(-3), f((4)));',
    'f := fn(): Float { 2 } g := fn(): Double { ((-3)) } outputLine(f(), g());',
    'f := fn(flag: Bool): Float { if flag { return 2; } return 3; } outputLine(f(true), f(false));',
    'f := fn(): Float { 9007199254740993; 2 } outputLine(f());',
    'xs: List<Float> = [1, -2, 9007199254740994]; outputLine(xs);',
    'p: (n: Float, m: Double) = (n = 2, m = -3); outputLine(p);',
    'Pair := type (n: Float); f := fn(): Pair { (n = 2) } outputLine(f());',
    'var flag := true; f: Float = if flag{2}else{3.5}; outputLine(f);',
    'var flag := false; f: Float = (if (if flag{true}else{false}) {2}else if false{3}else{4.5}); outputLine(f);',
    'xs: List<(n: Float)> = [(n = 2), (n = -3)]; outputLine(xs);',
    'f := fn(n: Float): Float { n } outputLine(f(if true{2}else{3.5}));',
    'f: Float = (if true{9007199254740993}else{2}) + 0.5; outputLine(f);',
    'f: Float = if true{2}else{3} + 0.5; outputLine(f);',
    'outputLine(if true{12}else{34}); x := if true {1}else {2} +3; outputLine(x);',
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
    'f: Float = +2;', 'f: Float = -(2);', 'f := fn(): Float { 2 + 3 } outputLine(f());',
    'f := fn(n: Float): Float { n } outputLine(f(2 + 3));',
    'xs: List<Float> = [1 + 1];', 'i := 2; p: (n: Float) = (n = i);',
    'f: Float = if false{9007199254740993}else{2};', 'f := fn(): Float { 9007199254740993 }',
    'p: (n: Float) = (n = 9007199254740993);', 'outputLine(if true{1}else{2}+3);'];
  for (const source of invalid) {
    const text = 'outputLine("before"); ' + source, expected = expectedText(text);
    assert.equal(expected.status, 1, text); assert.equal(expected.stdout.length, 0, text);
    for (const target of ['ts', 'c'] as const) { const compiled = compileTarget(target, { text }); assert.equal(compiled.status, 2, text); assert.equal(compiled.stdout.length, 0, text); }
  }
  for (const source of ['var f: Float = 2; outputLine(f / 0);', 'var f: Float = 0; outputLine(1 / f);',
    'var f: Float = 2; outputLine(f * 1e308);']) {
    const text = 'outputLine("before");\r\n' + source, name = 'float-context سلام.lts', expected = expectedText(text, { name });
    assert.equal(expected.status, 1); assert.equal(expected.stdout.toString(), 'before\n');
    for (const target of ['ts', 'c'] as const) {
      const compiled = compileTarget(target, { text, name }); assert.equal(compiled.status, 0, text + compiled.stderr.toString());
      if (target === 'c' && process.env['LITE_SKIP_NATIVE'] === '1') continue;
      executions.push({ target, artifact: compiled.stdout.toString(), expected, context: text });
    }
  }
  // Selected completion behavior: an ordinary dead statement cannot become the function's result.
  {
    const text = 'f := fn(): Float { return 2; 9007199254740993; } outputLine(f());';
    const compiled = compileTarget('ts', { text }); assert.equal(compiled.status, 0, compiled.stderr.toString());
    executions.push({ target: 'ts', artifact: compiled.stdout.toString(), expected: { status: 0, stdout: Buffer.from('2\n'), stderr: Buffer.alloc(0) }, context: text });
  }
  assertExecutions(executions);
});


test('prepared artifacts retain isolated runs and release their resources explicitly', () => {
  const compiled = compileTs({ text: 'outputLine(inputAll(), inputArgs()[0]);' });
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

test('default test startup and generated baseline run in a source archive without T00', () => {
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
