import assert from 'node:assert/strict';
import { chmodSync, closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, mkdtempSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname, delimiter } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { compile, execute, LiteFault } from './lite.ts';
import { loadBundle, loadManifest, loadSource } from './loader.ts';
import { benchmark, hashBytes, loadCompiler, nondeterminismReasons, runBundle, runText } from './bootstrap.ts';
import { runCArtifact, runTsArtifact, withTsArtifact } from './artifacts.ts';
import { compileTs } from '../compiler/host.ts';
import {
  INT_MAX, INT_MIN, checkedAdd, checkedDivide, checkedFloorDivide, checkedFloorModulo,
  checkedMultiply, checkedNegate, checkedRemainder, checkedSubtract, intText, listCopy,
  runMain, textAt, textLength, textSlice, LiteRuntimeFault,
} from '../compiler/runtime/ts/runtime.ts';

const tsManifestPath = new URL('../compiler/manifests/ts.json', import.meta.url).pathname;
const cManifestPath = new URL('../compiler/manifests/c.json', import.meta.url).pathname;
const lexerDumpPath = new URL('../compiler/tests/lexer/lexer-dump.lts', import.meta.url).pathname;
const parserProgramDumpPath = new URL('../compiler/tests/parser/parser-program-dump.lts', import.meta.url).pathname;
const checkerDumpPath = new URL('../compiler/tests/checker/checker-dump.lts', import.meta.url).pathname;

const compilerInstances = new Map<string, ReturnType<typeof loadCompiler>>();
function compilerFor(manifestPath: string): ReturnType<typeof loadCompiler> {
  let compiler = compilerInstances.get(manifestPath);
  if (compiler === undefined) {
    compiler = loadCompiler(manifestPath);
    compilerInstances.set(manifestPath, compiler);
  }
  return compiler;
}
function runCompiler(manifestPath: string, source: string, name?: string): { code: number; output: string; errors: string } {
  const input = name === undefined ? { text: source } : { text: source, name };
  const result = compilerFor(manifestPath).compile(input);
  return { code: result.status, output: result.stdout.toString('utf8'), errors: result.stderr.toString('utf8') };
}

/** Executes inline Lite source with captured reports and scripted stdin. */
function run(source: string, input = '', args: readonly string[] = []): { code: number; output: string; errors: string } {
  let cursor = 0;
  let output = '';
  let errors = '';
  const code = execute(compile(source), {
    args,
    read: () => input[cursor++] ?? null,
    report: text => { output += text; },
    reportError: text => { errors += text; },
  });
  return { code, output, errors };
}
/** Loads a file through the temporary flat-import loader and executes it. */
function runFile(path: string, input = '', args: readonly string[] = []): { code: number; output: string; errors: string } {
  return run(loadSource(path), input, args);
}
/** Compiles a Lite test driver with T11 once, strictly checks it once, and runs isolated inputs. */
function withGeneratedDriver(path: string, check: (run: (input: string) => { code: number; output: string; errors: string }) => void): void {
  const compiled = compileTs({ text: loadSource(path) });
  assert.equal(compiled.status, 0, compiled.stderr.toString());
  assert.equal(compiled.stderr.length, 0);
  withTsArtifact(compiled.stdout.toString(), run => check(input => {
    const result = run({ stdin: input });
    assert.equal(result.phase, 'run', result.stdout.toString() + result.stderr.toString());
    assert.equal(result.signal, null);
    assert.notEqual(result.status, null);
    return { code: result.status!, output: result.stdout.toString(), errors: result.stderr.toString() };
  }));
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
/** Asserts that inline source raises one Lite fault category. */
function fault(source: string, category: LiteFault['category'], input = ''): void {
  assert.throws(() => run(source, input), (error: unknown) => error instanceof LiteFault && error.category === category);
}

test('temporary importFlatAll flattens declarations relative to the importing file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-'));
  try {
    writeFileSync(join(directory, 'base.lts'), 'base := 40;\n');
    writeFileSync(join(directory, 'shared.lts'), 'importFlatAll "base.lts";\ndouble := fn(x: Int): Int { x + x }\n');
    writeFileSync(join(directory, 'main.lts'),
      'importFlatAll "shared.lts";\nimportFlatAll "shared.lts";\n' +
      '/* importFlatAll "missing.lts"; */\noutputLine(base + 2);\n' +
      'outputLine("importFlatAll \\"missing.lts\\";");\n');
    assert.deepEqual(run(loadSource(join(directory, 'main.lts'))), {
      code: 0, output: '42\nimportFlatAll "missing.lts";\n', errors: '',
    });
    const check = spawnSync(process.execPath,
      [new URL('./cli.ts', import.meta.url).pathname, '--check', join(directory, 'main.lts')],
      { encoding: 'utf8', timeout: 5000 });
    assert.equal(check.error, undefined); assert.equal(check.status, 0);
    assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('temporary importFlatAll reports missing files and cycles', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-import-fault-'));
  try {
    writeFileSync(join(directory, 'missing.lts'), 'importFlatAll "nope.lts";\noutputLine(1);\n');
    assert.throws(() => loadSource(join(directory, 'missing.lts')), /ENOENT/);
    writeFileSync(join(directory, 'a.lts'), 'importFlatAll "b.lts";\n');
    writeFileSync(join(directory, 'b.lts'), 'importFlatAll "a.lts";\n');
    assert.throws(() => loadSource(join(directory, 'a.lts')), /importFlatAll cycle/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('bundle manifests flatten ordered sources with exact text and line maps', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-bundle-'));
  try {
    mkdirSync(join(directory, 'nested'));
    writeFileSync(join(directory, 'base.lts'), 'base := 40;\n');
    writeFileSync(join(directory, 'nested', 'mid.lts'), 'importFlatAll "../base.lts";\nmid := 2;\n');
    writeFileSync(join(directory, 'main.lts'),
      'importFlatAll "nested/mid.lts";\nimportFlatAll "nested/mid.lts";\noutputLine(base + mid);\n');
    const manifestPath = join(directory, 'bundle.json');
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['main.lts'] }));
    assert.deepEqual(loadManifest(manifestPath), { target: 'ts', files: ['main.lts'] });
    const bundle = loadBundle(manifestPath);
    assert.equal(bundle.target, 'ts');
    assert.equal(bundle.text, 'base := 40;\nmid := 2;\noutputLine(base + mid);\n');
    assert.deepEqual(bundle.lineMap, [
      { path: 'base.lts', line: 1 },
      { path: 'nested/mid.lts', line: 2 },
      { path: 'main.lts', line: 3 },
    ]);
    assert.deepEqual(bundle.files, ['main.lts']);
    assert.deepEqual(runBundle(manifestPath), { status: 0, stdout: Buffer.from('42\n'), stderr: Buffer.alloc(0) });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('bundle manifests reject duplicates, cycles, missing files and invalid paths', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-bundle-fault-'));
  try {
    const manifestPath = join(directory, 'bundle.json');
    writeFileSync(join(directory, 'a.lts'), 'a := 1;\n');
    writeFileSync(join(directory, 'b.lts'), 'importFlatAll "c.lts";\n');
    writeFileSync(join(directory, 'c.lts'), 'importFlatAll "b.lts";\n');
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['a.lts', 'a.lts'] }));
    assert.throws(() => loadManifest(manifestPath), /duplicate file/);
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['a.lts', './a.lts'] }));
    assert.throws(() => loadBundle(manifestPath), /duplicate resolved file/);
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['b.lts'] }));
    assert.throws(() => loadBundle(manifestPath), /bundle cycle/);
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['missing.lts'] }));
    assert.throws(() => loadBundle(manifestPath), /ENOENT/);
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

test('bundle diagnostics map flattened rows back to original files and lines', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-bundle-diagnostic-'));
  try {
    writeFileSync(join(directory, 'first.lts'), 'outputLine(1);\n');
    writeFileSync(join(directory, 'second.lts'), 'outputLine(1 +);\n');
    const manifestPath = join(directory, 'bundle.json');
    writeFileSync(manifestPath, JSON.stringify({ target: 'ts', files: ['first.lts', 'second.lts'] }));
    const bundle = loadBundle(manifestPath);
    const compiler = loadCompiler(new URL('../compiler/manifests/ts.json', import.meta.url).pathname);
    const result = compiler.compile({ text: bundle.text, lineMap: bundle.lineMap });
    assert.equal(result.status, 2);
    assert.deepEqual(result.stdout, Buffer.alloc(0));
    assert.equal(result.stderr.toString(), 'second.lts:1:15: expected an Int, String or Bool expression\n');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('internal run harness captures report streams and exit status from fixed inputs', () => {
  assert.deepEqual(runText('outputLine(inputArgs()[0]); reportError("warn"); exit(7);', {
    args: ['a b'], stdin: 'unread',
  }), { status: 7, stdout: Buffer.from('a b\n'), stderr: Buffer.from('warn\n') });
  assert.deepEqual(runText('outputLine(inputAll());', { stdin: 'one\ntwo\n' }), {
    status: 0, stdout: Buffer.from('one\ntwo\n\n'), stderr: Buffer.alloc(0),
  });
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

test('Lite lexer tokenizes lexical fixtures exactly', () => {
  for (const name of ['tokens', 'symbols', 'comments', 'strings', 'int']) {
    const source = readFileSync(new URL(`../compiler/tests/lexer/${name}.lts`, import.meta.url), 'utf8');
    const expected = readFileSync(new URL(`../compiler/tests/lexer/${name}.tokens`, import.meta.url), 'utf8');
    assert.deepEqual(runFile(lexerDumpPath, source), { code: 0, output: expected, errors: '' }, name);
  }
});

test('Lite lexer rejects malformed lexical input with positioned diagnostics', () => {
  for (const [source, errors] of [
    ['outputLine("bad \\q");', '1:17: unsupported string escape \\q\n'],
    ['outputLine("unterminated);', '1:12: unterminated string literal\n'],
    ['/* unterminated', '1:1: unterminated comment\n'],
    ['/*# unterminated', '1:1: unterminated raw comment\n'],
    ['outputLine(9223372036854775809);', '1:12: integer literal outside signed 64-bit range\n'],
    ['outputLine(🙂);', '1:12: unsupported symbol: 🙂\n'],
    ['a =! b;', '1:3: incomplete operator =!; use =!=\n'],
    ['a && b;', '1:3: unsupported operator &&; use and\n'],
    ['a || b;', '1:3: unsupported operator ||; use or\n'],
  ] as const) {
    assert.deepEqual(runFile(lexerDumpPath, source), { code: 2, output: '', errors }, source);
  }
});

test('Lite parser parses declarations and expression forms', () => {
  const parserDeclDumpPath = new URL('../compiler/tests/parser/parser-decl-dump.lts', import.meta.url).pathname;
  const source = readFileSync(new URL('../compiler/tests/parser/declarations.lts', import.meta.url), 'utf8');
  const expected = readFileSync(new URL('../compiler/tests/parser/declarations.nodes', import.meta.url), 'utf8');
  assert.deepEqual(runFile(parserDeclDumpPath, source), { code: 0, output: expected, errors: '' });
  for (const [bad, errors] of [
    ['x := ;', '1:6: expected an expression\n'],
    ['x := a.;', '1:8: expected a field name after .\n'],
  ] as const) {
    assert.deepEqual(runFile(parserDeclDumpPath, bad), { code: 2, output: '', errors }, bad);
  }
});

test('Lite parser parses functions, loops and statements', () => {
  const source = readFileSync(new URL('../compiler/tests/parser/program.lts', import.meta.url), 'utf8');
  const expected = readFileSync(new URL('../compiler/tests/parser/program.nodes', import.meta.url), 'utf8');
  assert.deepEqual(runFile(parserProgramDumpPath, source), { code: 0, output: expected, errors: '' });
});

test('Lite parser parses L0 libraries and every program case', () => {
  const root = new URL('../', import.meta.url).pathname;
  const program = compile(loadSource(parserProgramDumpPath));
  const runParser = (input: string): { code: number; output: string; errors: string } => {
    const chars = Array.from(input);
    let cursor = 0;
    let output = '';
    let errors = '';
    const code = execute(program, {
      args: [],
      read: () => chars[cursor++] ?? null,
      report: text => { output += text; },
      reportError: text => { errors += text; },
    });
    return { code, output, errors };
  };
  for (const path of ['lib/core/int.lts', 'lib/core/text.lts', 'lib/core/source.lts',
    'lib/core/format.lts', 'lib/core/diag.lts', 'lib/core/list.lts', 'lib/core/test.lts']) {
    const result = runParser(loadSource(join(root, path)));
    assert.equal(result.code, 0, `${path}: ${result.errors}`);
    assert.equal(result.errors, '', path);
    assert.match(result.output, /^Program\|\|/);
  }
  for (const fixture of programFixtures) {
    const result = runParser(fixture.source);
    assert.equal(result.code, 0, `${fixture.name}: ${result.errors}`);
    assert.equal(result.errors, '', fixture.name);
  }
  const boundaryPrograms = ['x := 1', 'x: Int', 'Number := type Int',
    'if true { x := 1 } outputLine(2)', 'if true { outputLine(1) }; outputLine(2)',
    'f := fn(): Int { return 7 } outputLine(f())',
    'x := if true { 1 } else { 2 } outputLine(x)',
    'var x := 1; x = 2', '{ outputLine(1) }; outputLine(2)',
    'outputLine("a" /* nested /* comment */ */ "b")', 'word := "a" "b"; outputLine(word)',
    'outputLine(1,)', 'f := fn(n: Int): Int { n } outputLine(f(1,),)'];
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

test('Lite parser parses the assembled compiler S and lexer source', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') {
    context.skip('LITE_SKIP_HEAVY=1'); return;
  }
  withGeneratedDriver(parserProgramDumpPath, runParser => {
    const fixture = readFileSync(new URL('../compiler/tests/parser/program.lts', import.meta.url), 'utf8');
    assert.deepEqual(runParser(fixture), runFile(parserProgramDumpPath, fixture));
    assert.deepEqual(runParser('match x { _ => 1 }'), runFile(parserProgramDumpPath, 'match x { _ => 1 }'));
    const bootstrap = runParser(loadBundle(tsManifestPath).text);
    assert.equal(bootstrap.code, 0, bootstrap.errors);
    assert.equal(bootstrap.errors, '');
    assert.match(bootstrap.output, /^Program\|\|/);
    const lexer = runParser(loadSource(lexerDumpPath));
    assert.equal(lexer.code, 0, lexer.errors);
    assert.equal(lexer.errors, '');
    const cBody = ['c-literals.lts', 'emit-c.lts', 'driver-c.lts']
      .map(file => readFileSync(new URL(`../compiler/src/${file}`, import.meta.url), 'utf8'))
      .join('\n');
    const c = runParser(cBody);
    assert.equal(c.code, 0, c.errors);
    assert.equal(c.errors, '');
    assert.match(c.output, /^Program\|\|/);
  });
});

test('Lite parser rejects unsupported constructs by name', () => {
  for (const [source, errors] of [
    ['match x { _ => 1 }', '1:1: unsupported feature "match"\n'],
    ['record Foo {}', '1:1: unsupported feature "record"\n'],
    ['import x;', '1:1: unsupported feature "import"\n'],
    ['finally { }', '1:1: unsupported feature "finally"\n'],
  ] as const) {
    assert.deepEqual(runFile(parserProgramDumpPath, source), { code: 2, output: '', errors }, source);
  }
});

test('Lite checker collects top-level symbols and rejects duplicates', () => {
  const source = readFileSync(new URL('../compiler/tests/checker/symbols.lts', import.meta.url), 'utf8');
  const expected = readFileSync(new URL('../compiler/tests/checker/symbols.symbols', import.meta.url), 'utf8');
  assert.deepEqual(runFile(checkerDumpPath, source), { code: 0, output: expected, errors: '' });
  for (const [bad, errors] of [
    ['x := 1;\nx := 2;\n', '2:1: duplicate top-level name x\n'],
    ['f := fn(a: Int): Int { a }\nf := fn(): Int { 1 }\n', '2:1: duplicate top-level name f\n'],
    ['x: Missing = 1;\n', '1:1: unknown type Missing\n'],
    ['A := type B;\nB := type A;\n', '2:1: recursive type alias B\n'],
    ['f := fn(a: Int, a: Int): Int { a }\n', '1:17: duplicate parameter a\n'],
    ['f := fn(): Int { x := 1; x := 2; x }\n', '1:26: duplicate local x\n'],
    ['f := fn(a: Int): Int { a = 2; a }\n', '1:24: cannot assign to immutable local a\n'],
    ['f := fn(): Int { y = 2; 1 }\n', '1:18: unknown local y\n'],
    ['f := fn(): Int { if true { x := 1; } x = 2; 1 }\n', '1:38: unknown local x\n'],
    ['f := fn(a: Int, b: Int): Int { a + b }\ng := fn(): Int { f(1) }\n',
      '2:18: function f expects 2 arguments, got 1\n'],
    ['x: Int = "bad";\n', '1:1: cannot initialize Int with String\n'],
    ['f := fn(): Int { var x := 1; x = "bad"; x }\n',
      '1:30: cannot assign String to Int local x\n'],
    ['f := fn(): Int { if 1 { 2 } else { 3 } }\n', '1:18: if condition must be Bool\n'],
    ['f := fn(): Int { loop 1 { return 2; } 3 }\n', '1:18: loop condition must be Bool\n'],
    ['f := fn(a: Int): Int { a } g := fn(): Int { f("bad") }\n',
      '1:45: argument 1 of f expects Int, got String\n'],
    ['f := fn(): Int { return; }\n', '1:18: return requires a value\n'],
    ['f := fn(): Int { break; 1 }\n', '1:18: break outside loop\n'],
    ['f := fn(): String { return 1; }\n', '1:21: cannot return Int from function returning String\n'],
    ['Pair := type (a: Int, b: String); p: Pair = (a = 1, b = "x"); x: Int = p.b;\n',
      '1:63: cannot initialize Int with String\n'],
    ['values: List<Int> = [1, 2]; x: String = values[0];\n',
      '1:29: cannot initialize String with Int\n'],
    ['values: List<Int> = ["bad"];\n', '1:1: cannot initialize List<Int> with List<String>\n'],
    ['values: List<Int> = []; push_back(mut values, 1);\n',
      '1:39: cannot mutate list values without mut\n'],
    ['values: mut List<Int> = []; push_back(values, 1);\n',
      '1:29: push_back requires mut list argument\n'],
  ] as const) {
    assert.deepEqual(runFile(checkerDumpPath, bad), { code: 2, output: '', errors }, bad);
  }
  for (const good of [
    'f := fn(): Int { var x := 1; x = 2; x }\n',
    'f := fn(x: Int): Int { var y := x; y = y + 1; y }\n',
    'f := fn(value: Int): (value: Int, ok: Bool) { (value = value, ok = true) }\n',
    'f := fn(a: Int, b: Int): Int { a + b }\ng := fn(): Int { f(1, 2) }\n',
    'f := fn(): Int { 1 }\ng := fn(): Int { f() }\n',
    'values: List<Int> = [1, 2];\nf := fn(): Int { loop values as value { outputLine(value); } 1 }\n',
    'x: Int = 42;\n',
    'f := fn(a: Int): Int { a }\ng := fn(): Int { f(1) }\n',
    'f := fn(a: String): Int { 1 }\ng := fn(): Int { f("ok") }\n',
    'f := fn(): Int { loop true { break; } 1 }\n',
    'f := fn(): Unit { return; }\n',
    'Pair := type (a: Int, b: String); p: Pair = (a = 1, b = "x"); x: String = p.b;\n',
    'values: List<Int> = [1, 2]; x: Int = values[0];\n',
    'values: List<String> = ["ok", "yes"];\n',
    'values: List<Int> = [];\n',
    'values: mut List<Int> = []; push_back(mut values, 1);\n',
  ]) {
    const result = runFile(checkerDumpPath, good);
    assert.equal(result.code, 0, good);
    assert.equal(result.errors, '', good);
    assert.notEqual(result.output, '', good);
  }
});

test('Lite checker collects symbols from the assembled S', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') {
    context.skip('LITE_SKIP_HEAVY=1'); return;
  }
  withGeneratedDriver(checkerDumpPath, runChecker => {
    const fixture = readFileSync(new URL('../compiler/tests/checker/symbols.lts', import.meta.url), 'utf8');
    assert.deepEqual(runChecker(fixture), runFile(checkerDumpPath, fixture));
    const duplicate = 'x := 1; x := 2;';
    assert.deepEqual(runChecker(duplicate), runFile(checkerDumpPath, duplicate));
    const result = runChecker(loadBundle(tsManifestPath).text);
    assert.equal(result.code, 0, result.errors);
    assert.equal(result.errors, '');
    assert.match(result.output, /^function\|intMin\|/);
    assert.match(result.output, /\nvalue\|source\|/);
  });
});

test('Lite parser parses type aliases and rejects malformed types', () => {
  const parserDumpPath = new URL('../compiler/tests/parser/parser-dump.lts', import.meta.url).pathname;
  const source = readFileSync(new URL('../compiler/tests/parser/types.lts', import.meta.url), 'utf8');
  const expected = readFileSync(new URL('../compiler/tests/parser/types.nodes', import.meta.url), 'utf8');
  assert.deepEqual(runFile(parserDumpPath, source), { code: 0, output: expected, errors: '' });
  for (const [bad, errors] of [
    ['x := 1;', '1:6: expected type after :=\n'],
    ['Bad := type List<;', '1:18: expected a type\n'],
    ['Bad := type Maybe<Int>;', '1:13: unsupported generic type Maybe\n'],
    ['Bad := type (a: );', '1:17: expected a type\n'],
  ] as const) {
    assert.deepEqual(runFile(parserDumpPath, bad), { code: 2, output: '', errors }, bad);
  }
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
test('compiler applications preserve optional logical source names in their own diagnostics only', () => {
  for (const manifest of [tsManifestPath, cManifestPath]) {
    const expected = runCompiler(manifest, 'outputLine(42);').output;
    for (const label of ['', 'a b.lts', 'سلام🙂.lts', 'quote";\\\nname.lts']) {
      assert.deepEqual(runCompiler(manifest, 'outputLine(42);', label), { code: 0, output: expected, errors: '' });
      assert.deepEqual(runCompiler(manifest, 'outputLine(1 +);', label), {
        code: 2, output: '', errors: (label === '' ? '' : label + ':') + '1:15: expected an Int, String or Bool expression\n',
      });
    }
    assert.deepEqual(runCompiler(manifest, 'outputLine(1 +);'), { code: 2, output: '', errors: '1:15: expected an Int, String or Bool expression\n' });
    let reads = 0; let errors = '';
    const code = execute(compile(loadBundle(manifest).text), {
      args: ['first.lts', 'extra'], read: () => { reads++; return null; },
      report: () => { throw new Error('unexpected artifact'); }, reportError: text => { errors += text; },
    });
    assert.equal(code, 2); assert.equal(reads, 0);
    assert.equal(errors, 'expected at most one logical source name argument\n');
  }
});
test('real compiler CLI forwards source-name context without changing emitted bytes', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'litec-label-'));
  try {
    const sourcePath = join(directory, 'label with spaces.lts');
    for (const [target, reference] of [['ts', 'report-42.ts'], ['c', 'report-42.c']] as const) {
      writeFileSync(sourcePath, 'outputLine(42);');
      const valid = spawnSync(join(root, 'litec'), [target, sourcePath], { env, timeout: 5000 });
      assert.equal(valid.error, undefined); assert.equal(valid.status, 0);
      assert.deepEqual(valid.stdout, readFileSync(join(root, 'compiler/generated', reference)));
      assert.equal(valid.stderr.length, 0);
      writeFileSync(sourcePath, 'outputLine(1 +);');
      const invalid = spawnSync(join(root, 'litec'), [target, sourcePath], { env, timeout: 5000 });
      assert.equal(invalid.error, undefined); assert.equal(invalid.status, 2); assert.equal(invalid.stdout.length, 0);
      assert.deepEqual(invalid.stderr, Buffer.from(`${sourcePath}:1:15: expected an Int, String or Bool expression\n`));
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('litec, ltc, lite compile and lite check expose the compiler sources directly', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'litec-'));
  try {
    const sourcePath = join(directory, 'sample.lts');
    writeFileSync(sourcePath, 'outputLine(42);');
    const ts = spawnSync(join(root, 'litec'), ['--target', 'ts', sourcePath], { env, timeout: 5000 });
    assert.equal(ts.error, undefined); assert.equal(ts.status, 0, ts.stderr.toString());
    assert.deepEqual(ts.stdout, readFileSync(join(root, 'compiler/generated/report-42.ts')));
    assert.equal(ts.stderr.length, 0);
    const c = spawnSync(join(root, 'lite'), ['compile', '--target', 'c', sourcePath], { env, timeout: 5000 });
    assert.equal(c.error, undefined); assert.equal(c.status, 0, c.stderr.toString());
    assert.deepEqual(c.stdout, readFileSync(join(root, 'compiler/generated/report-42.c')));
    const shorthand = spawnSync(join(root, 'ltc'), ['ts', sourcePath], { env, timeout: 5000 });
    assert.equal(shorthand.error, undefined); assert.equal(shorthand.status, 0);
    assert.deepEqual(shorthand.stdout, ts.stdout);
    const validCheck = spawnSync(join(root, 'lite'), ['check', sourcePath], { env, timeout: 5000 });
    assert.equal(validCheck.error, undefined); assert.equal(validCheck.status, 0);
    assert.equal(validCheck.stdout.length, 0); assert.equal(validCheck.stderr.length, 0);
    const invalidPath = join(directory, 'bad.lts');
    writeFileSync(invalidPath, 'outputLine(1 +);\n');
    const invalid = spawnSync(join(root, 'litec'), ['ts', invalidPath], { env, timeout: 5000 });
    assert.equal(invalid.status, 2); assert.equal(invalid.stdout.length, 0);
    assert.deepEqual(invalid.stderr, Buffer.from(`${invalidPath}:1:15: expected an Int, String or Bool expression\n`));
    const invalidCheck = spawnSync(join(root, 'lite'), ['check', invalidPath], { env, timeout: 5000 });
    assert.equal(invalidCheck.status, 1); assert.equal(invalidCheck.stdout.length, 0);
    assert.match(invalidCheck.stderr.toString(), /SourceError: expected expression/);
    for (const args of [[], ['--target', 'x', sourcePath], ['ts', join(directory, 'missing.lts')],
      ['ts', join(directory, 'sample.txt')]]) {
      const bad = spawnSync(join(root, 'litec'), args, { env, timeout: 5000 });
      assert.equal(bad.status, 2, args.join(' ')); assert.equal(bad.stdout.length, 0);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('lite help and docs expose the command matrix and documentation roots', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const help = spawnSync(join(root, 'lite'), ['help'], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(help.error, undefined); assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: \.\/lite <command>/);
  assert.match(help.stdout, /Compiler entry points: \.\/ltc, \.\/litec, \.\/lite compile/);
  assert.match(help.stdout, /test \[--fast\|--full\]/);
  assert.equal(help.stderr, '');
  const docs = spawnSync(join(root, 'lite'), ['docs'], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(docs.error, undefined); assert.equal(docs.status, 0);
  assert.match(docs.stdout, /compiler\/README\.md/);
  assert.match(docs.stdout, /igniter\/tests\/README\.md/);
  assert.equal(docs.stderr, '');
  const noArgs = spawnSync(join(root, 'lite'), [], { env, encoding: 'utf8', timeout: 5000 });
  assert.equal(noArgs.status, 2); assert.equal(noArgs.stdout, ''); assert.match(noArgs.stderr, /Usage:/);
});
test('lite verify runs feature and artifact cases and reports coverage', () => {
  const root = new URL('../', import.meta.url).pathname;
  const directory = mkdtempSync(join(tmpdir(), 'lite-verify-test-'));
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? ''),
    LITE_VERIFY_CACHE: join(directory, 'cache.json') };
  try {
    const verified = spawnSync(join(root, 'lite'), ['verify', '--all', '--no-cache'], { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(verified.error, undefined); assert.equal(verified.status, 0, verified.stderr);
    assert.match(verified.stdout, /PASS int\.arithmetic\/precedence-and-division/);
    assert.match(verified.stdout, /PASS example\.001-double-sum\/seven-and-five/);
    assert.match(verified.stdout, /verification passed: 98 executed, 0 cached/);
    const covered = spawnSync(join(root, 'lite'), ['verify', '--coverage'], { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(covered.error, undefined); assert.equal(covered.status, 0, covered.stderr);
    assert.match(covered.stdout, /features: 38 registered, 38 cases/);
    assert.match(covered.stdout, /examples: 19\/19 manifests/);
    assert.match(covered.stdout, /samples: 20\/20 manifests/);
    const first = spawnSync(join(root, 'lite'), ['verify', '--all', '--filter', 'int.arithmetic'],
      { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(first.error, undefined); assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /verification passed: \d+ executed, 0 cached/);
    const second = spawnSync(join(root, 'lite'), ['verify', '--all', '--filter', 'int.arithmetic'],
      { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(second.error, undefined); assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /verification passed: 0 executed, \d+ cached/);
    assert.match(second.stdout, /\(cached\)/);
    const sharded = spawnSync(join(root, 'lite'), ['verify', '--all', '--shard', '1/2', '--no-cache'],
      { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(sharded.error, undefined); assert.equal(sharded.status, 0, sharded.stderr);
    assert.match(sharded.stdout, /verification passed: \d+ executed, 0 cached/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('inputArgs returns an ordered String list with independent ordinary receiving copies', () => {
  assert.equal(run(`original := inputArgs(); editable: mut List<String> = original;
    push_front(mut editable, "local"); outputLine(original[0], editable[0]);
    copy := fn(values: List<String>): List<String> { values }
    loop copy(inputArgs()) as value { outputLine(value); }`, 'unread', ['first', '', 'سلام🙂', '--check']).output,
    'first local\nfirst\n\nسلام🙂\n--check\n');
  assert.equal(run('loop inputArgs() { outputLine("unexpected"); }').output, '');
  fault('values := inputArgs(); push_back(mut values, "not granted");', 'TypeError');
});
test('inputArgs has no stream effects and snapshots host arguments before program execution', () => {
  const unexpected = (): never => { throw new Error('unexpected stream effect'); };
  assert.equal(execute(compile('inputArgs();'), { read: unexpected, report: unexpected, reportError: unexpected }), 0);
  assert.equal(run('inputArgs(); outputLine(inputAll());', 'unread\r\n').output, 'unread\r\n\n');
  const args = ['original']; let output = '';
  execute(compile('outputLine(inputArgs()[0]); outputLine(inputArgs()[0]);'), {
    args, read: unexpected, report: text => { output += text; args[0] = 'changed externally'; }, reportError: unexpected,
  });
  assert.equal(output, 'original\noriginal\n');
});
test('inputArgs signatures fail before effects and normal helper shadowing is preserved', () => {
  for (const source of ['inputArgs(1);', 'inputArgs("prompt");', 'inputArgs(value = "x");']) {
    let effects = false;
    assert.throws(() => execute(compile(`outputLine("before"); ${source}`), {
      args: ['value'], read: () => { effects = true; return null; }, report: () => { effects = true; }, reportError: () => { effects = true; },
    }), LiteFault);
    assert.equal(effects, false, source);
  }
  assert.equal(run('inputArgs := fn(n: Int): Int { n + 1 } outputLine(inputArgs(n = 2));', '', ['unread']).output, '3\n');
});
test('real launcher preserves only script argument values after the first separating suffix', () => {
  const root = new URL('../', import.meta.url).pathname;
  const example = join(root, 'examples/020-script-arguments.lts');
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const values = ['', 'a b', 'سلام🙂', '--check', '--', '*.lts', 'line\nbreak'];
  for (const args of [[], ['--'], ['--', ...values]]) {
    const result = spawnSync(join(root, 'lite'), ['run', example, ...args], { env, timeout: 5000 });
    assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString());
    assert.deepEqual(result.stdout, Buffer.from(args.length > 1 ? values.map(value => value + '\n').join('') : ''));
    assert.equal(result.stderr.length, 0);
  }
  const direct = spawnSync(process.execPath, [join(root, 'igniter/cli.ts'), example, '--', '--check'], { timeout: 5000 });
  assert.equal(direct.status, 0); assert.deepEqual(direct.stdout, Buffer.from('--check\n')); assert.equal(direct.stderr.length, 0);
});
test('argument suffix errors precede execution and check-only ignores all script data', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'lite-args-'));
  try {
    const path = join(directory, 'side-effects.lts'); writeFileSync(path, 'outputLine("before"); inputAll("prompt: ");');
    for (const suffix of [['extra'], ['--check'], ['extra', '--', 'later']]) {
      const rejected = spawnSync(join(root, 'lite'), ['run', path, ...suffix], { env, timeout: 5000 });
      assert.equal(rejected.error, undefined); assert.equal(rejected.status, 2);
      assert.equal(rejected.stdout.length, 0); assert.match(rejected.stderr.toString(), /Usage:/);
    }
    const checked = spawnSync(join(root, 'lite'), ['run', '--check', path, '--', '--check', '', 'x'], { env, timeout: 5000 });
    assert.equal(checked.error, undefined); assert.equal(checked.status, 0);
    assert.equal(checked.stdout.length, 0); assert.equal(checked.stderr.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('script arguments survive caller-relative paths and script filenames with spaces', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'lite args '));
  try {
    writeFileSync(join(directory, 'argument script.lts'), readFileSync(join(root, 'examples/020-script-arguments.lts')));
    const result = spawnSync(join(root, 'lite'), ['run', 'argument script.lts', '--', 'a b', ''], {
      cwd: directory, env, timeout: 5000,
    });
    assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr.toString());
    assert.deepEqual(result.stdout, Buffer.from('a b\n\n')); assert.equal(result.stderr.length, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('inputAll preserves multi-line text, line endings, trailing whitespace and empty EOF', () => {
  for (const text of ['', 'one', 'one\n', 'one\r\ntwo\r\n', ' \t\r\n\n', 'سلام🙂\né\t ']) {
    assert.equal(run('text := inputAll(); outputLine(text);', text).output, text + '\n');
  }
  assert.deepEqual(run('text := inputAll(); text;', 'one\ntwo\n'), { code: 0, output: '', errors: '' });
  assert.equal(run('outputLine(inputAll()); outputLine(inputAll());', 'first\nlast').output, 'first\nlast\n\n');
});
test('inputAll consumes unread lookahead and the remainder after other input helpers', () => {
  assert.equal(run('first := inputWord(); outputLine(first); outputLine(inputAll());', 'first \tsecond\r\n').output,
    'first\n \tsecond\r\n\n');
  assert.equal(run('first := inputInt(); outputLine(first); outputLine(inputAll());', '7\r\nmore\n').output,
    '7\n\r\nmore\n\n');
  assert.equal(run('first := inputLine(); outputLine(first); outputLine(inputAll());', 'first\r\nsecond\r\n').output,
    'first\nsecond\r\n\n');
  assert.equal(run('outputLine(inputAll());', '').output, '\n');
  for (const helper of ['inputInt', 'inputFloat', 'inputWord', 'inputLine']) fault(`${helper}();`, 'InputFault');
});
test('inputAll prompt evaluates once and writes exact stdout before the first read even at EOF', () => {
  const events: string[] = [];
  let read = false;
  execute(compile('text := inputAll(({outputLine("prepare"); "source: "})); outputLine(text);'), {
    read: () => { events.push('read'); if (read) return null; read = true; return 'x'; },
    report: text => { events.push(`write:${text}`); }, reportError: () => { throw new Error('unexpected stderr'); },
  });
  assert.deepEqual(events, ['write:prepare\n', 'write:source: ', 'read', 'read', 'write:x\n']);
  assert.equal(run('inputAll("source: ");').output, 'source: ');
  assert.equal(run('inputAll("");').output, '');
  assert.deepEqual(run('inputAll(({exit(7); "later"}));', 'unread'), { code: 7, output: '', errors: '' });
});
test('inputAll retains terminal read failures and never reads after a failed prompt write', () => {
  let reads = 0;
  assert.throws(() => execute(compile('inputAll("source: ");'), {
    read: () => { reads++; return null; }, report: () => { throw new Error('closed output'); }, reportError: () => {},
  }), /closed output/);
  assert.equal(reads, 0);
  let output = '';
  assert.throws(() => execute(compile('inputAll("source: "); outputLine("later");'), {
    read: () => { throw new Error('read failed'); }, report: text => { output += text; }, reportError: () => {},
  }), (error: unknown) => error instanceof LiteFault && error.category === 'InputFault' && error.message.includes('read failed'));
  assert.equal(output, 'source: ');
});
test('inputAll signatures and named arguments fail before effects while ordinary shadowing works', () => {
  for (const code of ['inputAll(1);', 'inputAll(false);', 'inputAll("a", "b");',
    'inputAll(prompt = "source: ");', 'inputAll((1,));']) {
    let effects = false;
    assert.throws(() => execute(compile(`outputLine("before"); ${code}`), {
      read: () => { effects = true; return null; }, report: () => { effects = true; }, reportError: () => { effects = true; },
    }), LiteFault);
    assert.equal(effects, false, code);
  }
  assert.equal(run('inputAll := fn(): String { "local" } outputLine(inputAll());', 'unread').output, 'local\n');
});
test('whole-input example runs via the real launcher preserving UTF-8 bytes and silent check-only behavior', () => {
  const root = new URL('../', import.meta.url).pathname;
  const path = join(root, 'examples/019-whole-input.lts');
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  for (const input of ['', 'a\r\n🙂\n']) {
    const result = spawnSync(join(root, 'lite'), ['run', path], { input, env, timeout: 5000 });
    assert.equal(result.error, undefined); assert.equal(result.status, 0);
    assert.deepEqual(result.stdout, Buffer.from(`Text (finish with EOF): code points: ${Array.from(input).length}\n${input}\n`));
    assert.equal(result.stderr.length, 0);
  }
  const check = spawnSync(join(root, 'lite'), ['run', '--check', path], { env, timeout: 5000 });
  assert.equal(check.error, undefined); assert.equal(check.status, 0); assert.equal(check.stdout.length, 0); assert.equal(check.stderr.length, 0);
  const directory = mkdtempSync(join(tmpdir(), 'lite-whole-utf8-'));
  try {
    const source = join(directory, 'read.lts'); writeFileSync(source, 'inputAll();');
    const invalid = spawnSync(join(root, 'lite'), ['run', source], { input: Buffer.from([0xff]), env, timeout: 5000 });
    assert.equal(invalid.status, 1); assert.equal(invalid.stdout.length, 0);
    assert.match(invalid.stderr.toString(), /InputFault: cannot read input/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

type CompilerFixture = Readonly<{
  file: string;
  category: 'program' | 'rejected';
  subcategory: string;
  name: string;
  caseName: string;
  sourcePath?: string;
  source: string;
  stdin: Buffer;
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number;
}>;

/** Captures reference runtime faults as process results without changing throwing interpreter unit tests. */
function runCompilerFixture(fixture: CompilerFixture): ReturnType<typeof run> {
  const result = runText(fixture.source, { stdin: fixture.stdin.toString('utf8') });
  return { code: result.status, output: result.stdout.toString(), errors: result.stderr.toString() };
}

/** Keeps pure successful cores importable, and isolates faulting/input-bearing TS or translated JS programs. */
async function assertImportedFixture(path: string, fixture: CompilerFixture): Promise<void> {
  if (fixture.exitCode === 0 && fixture.stdin.length === 0 && fixture.stderr.length === 0) {
    assert.equal(await importedMain(path), fixture.stdout.toString('utf8'), fixture.name);
    return;
  }
  const entry = new URL('../compiler/entry.ts', import.meta.url).pathname;
  const result = spawnSync(process.execPath, [entry, path], {
    input: fixture.stdin, timeout: 5000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, fixture.name); assert.equal(result.signal, null, fixture.name);
  assert.equal(result.status, fixture.exitCode, fixture.name);
  assert.deepEqual(result.stdout, fixture.stdout, fixture.name);
  assert.deepEqual(result.stderr, fixture.stderr, fixture.name);
}

const fixtureFile = /^(\d{3})-(\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
const fixtureStream = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const sha256 = (bytes: Buffer): string => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

/** Narrows one parsed JSON value to an object, with the fixture file in the error. */
function fixtureRecord(value: unknown, file: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${file}: expected a JSON object`);
  }
  return value as Record<string, unknown>;
}

/** Rejects unknown keys so fixture typos cannot silently change semantics. */
function checkKeys(record: Record<string, unknown>, allowed: readonly string[], file: string, label: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) throw new Error(`${file}: unexpected ${label} key ${key}`);
  }
}

/** Reads one stdin/stdout/stderr fixture stream from text, bytes or a sibling file, checking its hash. */
function readStream(value: unknown, file: string, label: string, directory: URL, required: boolean): Buffer {
  if (value === undefined) {
    if (required) throw new Error(`${file}: ${label} is required`);
    return Buffer.alloc(0);
  }
  const stream = fixtureRecord(value, file);
  checkKeys(stream, ['text', 'bytes', 'file', 'hash'], file, label);
  const forms = ['text', 'bytes', 'file'].filter(key => stream[key] !== undefined);
  if (forms.length !== 1) throw new Error(`${file}: ${label} must contain exactly one of text, bytes or file`);
  let bytes: Buffer;
  const form = forms[0];
  if (form === 'text') {
    const text = stream['text'];
    if (typeof text !== 'string') throw new Error(`${file}: ${label}.text must be a string`);
    bytes = Buffer.from(text, 'utf8');
  } else if (form === 'bytes') {
    const values = stream['bytes'];
    if (!Array.isArray(values) || !values.every(byte =>
      typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
      throw new Error(`${file}: ${label}.bytes must be an array of bytes`);
    }
    bytes = Buffer.from(values as number[]);
  } else {
    const pathName = stream['file'];
    if (typeof pathName !== 'string' || !fixtureStream.test(pathName)) {
      throw new Error(`${file}: ${label}.file must be a sibling file name`);
    }
    bytes = readFileSync(new URL(pathName, directory));
  }
  const expectedHash = stream['hash'];
  if (typeof expectedHash !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(expectedHash)) {
    throw new Error(`${file}: ${label}.hash must be sha256:<64 lowercase hex>`);
  }
  if (expectedHash !== sha256(bytes)) throw new Error(`${file}: ${label}.hash does not match content`);
  return bytes;
}

/** Loads and validates every compiler verification case under tests/compiler/. */
function loadCompilerFixtures(): readonly CompilerFixture[] {
  const directory = new URL('./tests/compiler/', import.meta.url);
  const files = readdirSync(directory).filter(file => file.endsWith('.json')).sort();
  const names = new Set<string>();
  const fixtures: CompilerFixture[] = [];
  for (const file of files) {
    const match = fixtureFile.exec(file);
    if (match === null) throw new Error(`${file}: expected NNN-MMM-title-subtitle.json`);
    const categoryCode = match[1] ?? '';
    const subcategory = match[2] ?? '';
    const slug = match[3] ?? '';
    const category = categoryCode === '001' ? 'program' : categoryCode === '002' ? 'rejected' : undefined;
    if (category === undefined) throw new Error(`${file}: category must be 001 (program) or 002 (rejected)`);
    const record = fixtureRecord(JSON.parse(readFileSync(new URL(file, directory), 'utf8')), file);
    checkKeys(record, ['name', 'source', 'cases'], file, 'fixture');
    if (record['name'] !== slug) throw new Error(`${file}: name must be ${JSON.stringify(slug)}`);
    if (names.has(slug)) throw new Error(`${file}: duplicate fixture name ${slug}`);
    names.add(slug);
    const sourceRecord = fixtureRecord(record['source'], file);
    checkKeys(sourceRecord, ['file', 'text', 'bytes', 'hash'], file, 'source');
    const sourceForms = ['file', 'text', 'bytes'].filter(key => sourceRecord[key] !== undefined);
    if (sourceForms.length !== 1) throw new Error(`${file}: source must contain exactly one of file, text or bytes`);
    const expectedSourceHash = sourceRecord['hash'];
    if (typeof expectedSourceHash !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(expectedSourceHash)) {
      throw new Error(`${file}: source.hash must be sha256:<64 lowercase hex>`);
    }
    let sourcePath: string | undefined;
    let sourceBytes: Buffer;
    if (sourceForms[0] === 'file') {
      sourcePath = `${file.slice(0, -'.json'.length)}.lts`;
      if (sourceRecord['file'] !== sourcePath) throw new Error(`${file}: source.file must be ${JSON.stringify(sourcePath)}`);
      sourceBytes = readFileSync(new URL(sourcePath, directory));
    } else if (sourceForms[0] === 'text') {
      const sourceText = sourceRecord['text'];
      if (typeof sourceText !== 'string') throw new Error(`${file}: source.text must be a string`);
      sourceBytes = Buffer.from(sourceText, 'utf8');
    } else {
      const values = sourceRecord['bytes'];
      if (!Array.isArray(values) || !values.every(byte =>
        typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
        throw new Error(`${file}: source.bytes must be an array of bytes`);
      }
      sourceBytes = Buffer.from(values as number[]);
    }
    if (expectedSourceHash !== sha256(sourceBytes)) throw new Error(`${file}: source.hash does not match content`);
    const source = sourceBytes.toString('utf8');
    const caseValues = record['cases'];
    if (!Array.isArray(caseValues) || caseValues.length === 0) throw new Error(`${file}: cases must be a nonempty array`);
    const caseNames = new Set<string>();
    for (const caseValue of caseValues) {
      const scenario = fixtureRecord(caseValue, file);
      checkKeys(scenario, ['name', 'stdin', 'stdout', 'stderr', 'exitCode'], file, 'case');
      const caseName = scenario['name'];
      if (typeof caseName !== 'string' || caseName.length === 0) throw new Error(`${file}: case.name must be a nonempty string`);
      if (caseNames.has(caseName)) throw new Error(`${file}: duplicate case name ${caseName}`);
      caseNames.add(caseName);
      if (category === 'rejected' && scenario['stdin'] !== undefined) {
        throw new Error(`${file}: rejected cases take no stdin`);
      }
      const stdin = readStream(scenario['stdin'], file, `${caseName}.stdin`, directory, false);
      const stdout = readStream(scenario['stdout'], file, `${caseName}.stdout`, directory, false);
      const stderr = readStream(scenario['stderr'], file, `${caseName}.stderr`, directory, false);
      const exitCode = scenario['exitCode'];
      if (typeof exitCode !== 'number' || !Number.isInteger(exitCode) || exitCode < 0 || exitCode > 255) {
        throw new Error(`${file}: ${caseName}.exitCode must be a byte`);
      }
      fixtures.push({ file, category, subcategory, name: slug, caseName, ...(sourcePath === undefined ? {} : { sourcePath }),
        source, stdin, stdout, stderr, exitCode });
    }
  }
  return fixtures;
}

const compilerFixtures = loadCompilerFixtures();
const programFixtures = compilerFixtures.filter(fixture => fixture.category === 'program');
const rejectionFixtures = compilerFixtures.filter(fixture => fixture.category === 'rejected');

test('compiler verification cases are well-formed and cover both categories', () => {
  assert.ok(programFixtures.length > 0);
  assert.ok(rejectionFixtures.length > 0);
  assert.equal(new Set(compilerFixtures.map(fixture => `${fixture.file}/${fixture.caseName}`)).size, compilerFixtures.length);
});

test('generated compatibility emitter bundles match the manifests', () => {
  assert.equal(readFileSync(new URL('../compiler/ts-emitter.lts', import.meta.url), 'utf8'),
    loadBundle(tsManifestPath).text);
  assert.equal(readFileSync(new URL('../compiler/c-emitter.lts', import.meta.url), 'utf8'),
    loadBundle(cManifestPath).text);
});

test('bundle compilers reproduce every compiler case with exact artifacts and diagnostics', () => {
  const tsCompiler = compilerFor(tsManifestPath);
  const cCompiler = compilerFor(cManifestPath);
  assert.equal(tsCompiler.bundle.lineMap.length, tsCompiler.bundle.text.split('\n').length - 1);
  assert.equal(cCompiler.bundle.lineMap.length, cCompiler.bundle.text.split('\n').length - 1);
  // Intentional emitter changes refresh the current hashes; P0 stays historical.
  const baselineValue: unknown = JSON.parse(readFileSync(
    new URL('../compiler/generated/current-artifacts.json', import.meta.url), 'utf8'));
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
        assert.equal(baseline, `sha256:${hashBytes(actual.stdout)}`,
          `${target}: ${fixture.name}/${fixture.caseName}`);
      }
    }
  }
  const label = 'named source.lts';
  assert.deepEqual(tsCompiler.compile({ text: 'outputLine(42);', name: label }), {
    status: 0, stdout: readFileSync(new URL('../compiler/generated/report-42.ts', import.meta.url)), stderr: Buffer.alloc(0),
  });
  assert.deepEqual(tsCompiler.compile({ text: 'outputLine(1 +);', name: label }), {
    status: 2, stdout: Buffer.alloc(0), stderr: Buffer.from(`${label}:1:15: expected an Int, String or Bool expression\n`),
  });
});

test('Lite lexer tokenizes all bootstrap S and compiler cases', context => {
  if (process.env['LITE_SKIP_HEAVY'] === '1') {
    context.skip('LITE_SKIP_HEAVY=1'); return;
  }
  withGeneratedDriver(lexerDumpPath, runLexer => {
    for (const name of ['tokens', 'symbols', 'comments', 'strings', 'int']) {
      const fixture = readFileSync(new URL(`../compiler/tests/lexer/${name}.lts`, import.meta.url), 'utf8');
      assert.deepEqual(runLexer(fixture), runFile(lexerDumpPath, fixture), name);
    }
    const bootstrap = runLexer(loadBundle(tsManifestPath).text);
    assert.equal(bootstrap.code, 0, bootstrap.errors);
    assert.equal(bootstrap.errors, '');
    assert.match(bootstrap.output, /^Name@\d+:\d+:\d+ /);
    assert.match(bootstrap.output, /EOF@\d+:\d+:\d+ \n$/);
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
});

test('TS runtime helpers preserve checked Int64, text and list semantics', () => {
  assert.equal(checkedAdd(2n, 3n), 5n);
  assert.equal(checkedSubtract(2n, 3n), -1n);
  assert.equal(checkedMultiply(-6n, 7n), -42n);
  assert.equal(checkedDivide(-7n, 2n), -3n);
  assert.equal(checkedRemainder(-7n, 2n), -1n);
  assert.equal(checkedFloorDivide(-7n, 2n), -4n);
  assert.equal(checkedFloorModulo(-7n, 2n), 1n);
  assert.equal(checkedNegate(42n), -42n);
  assert.equal(intText(INT_MIN), '-9223372036854775808');
  assert.throws(() => checkedAdd(INT_MAX, 1n), (error: unknown) =>
    error instanceof LiteRuntimeFault && error.category === 'ArithmeticPanic');
  assert.throws(() => checkedDivide(1n, 0n), (error: unknown) =>
    error instanceof LiteRuntimeFault && error.category === 'ArithmeticPanic');
  assert.throws(() => checkedNegate(INT_MIN), (error: unknown) =>
    error instanceof LiteRuntimeFault && error.category === 'ArithmeticPanic');

  assert.equal(textLength('a🙂'), 2n);
  assert.equal(textAt('a🙂', 1n), '🙂');
  assert.equal(textSlice('a🙂b', 1n, 2n), '🙂');
  assert.throws(() => textAt('a', 9n), (error: unknown) =>
    error instanceof LiteRuntimeFault && error.category === 'BoundPanic');

  const source = [1, 2];
  const copy = listCopy(source);
  copy.push(3);
  assert.deepEqual(source, [1, 2]);
  assert.deepEqual(copy, [1, 2, 3]);

  let output = '';
  let errors = '';
  assert.equal(runMain(() => 'ok\n', { report: text => { output += text; }, reportError: text => { errors += text; } }), 0);
  assert.equal(output, 'ok\n');
  assert.equal(errors, '');
  assert.equal(runMain(() => { throw new LiteRuntimeFault('BoundPanic', 'bad'); },
    { report: text => { output += text; }, reportError: text => { errors += text; } }), 1);
  assert.equal(errors, 'BoundPanic: bad\n');
});

test('restricted compiler accepts typed scalar locals without changing existing cases', async context => {
  const source = 'x: Int = 1;\ns: String = "a";\nb: Bool = true;\ny: Int;\noutputLine(x, s, b, y);\nvar z: Int = 2;\nz = 3;\noutputLine(z);\n';
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null, stdout: Buffer.from('1 a true 0\n3\n'), stderr: Buffer.alloc(0),
  });
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const cc = process.env['CC'] ?? 'cc';
    const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
    if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
      context.skip('C compiler unavailable; typed-local C parity requires cc or CC'); return;
    }
    const c = runCompiler(cManifestPath, source);
    assert.equal(c.code, 0, c.errors);
    assert.deepEqual(runCArtifact(c.output), {
      phase: 'run', status: 0, signal: null, stdout: Buffer.from('1 a true 0\n3\n'), stderr: Buffer.alloc(0),
    });
  }
  for (const [bad, errors] of [
    ['x: Int = "a";\n', '1:1: cannot initialize Int with String\n'],
    ['x: Int = 1; x = "a";\n', '1:13: cannot assign to immutable local x\n'],
    ['x: Missing = 1;\n', '1:4: unsupported local type Missing\n'],
    ['var x: Bool = 1;\n', '1:5: cannot initialize Bool with Int\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
});

test('restricted compiler resolves transparent scalar aliases', async context => {
  const source = [
    'Count := type Int;',
    'Alias := type Count;',
    'Forward := type Later;',
    'Later := type Int;',
    'Word := type String;',
    'Flag := type Bool;',
    'Nothing := type Unit;',
    'add := fn (a: Alias, b: Count): Alias { a + b }',
    'echo := fn (text: Word): Word { text }',
    'noop := fn (): Nothing { return; }',
    'x: Alias = 2;',
    'var y: Count = 40;',
    'y = y + 1;',
    's: Word = "ok";',
    'b: Flag = true;',
    'z: Forward = 3;',
    'outputLine(x, y, s, b, add(x, y), echo(s), z);',
    'noop();',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('2 41 ok true 43 ok 3\n'), stderr: Buffer.alloc(0),
  });

  const cSource = [
    'Count := type Int;',
    'Alias := type Count;',
    'Forward := type Later;',
    'Later := type Int;',
    'Word := type String;',
    'Flag := type Bool;',
    'x: Alias = 2;',
    'var y: Count = 40;',
    'y = y + 1;',
    's: Word = "ok";',
    'b: Flag = true;',
    'z: Forward = 3;',
    'outputLine(x, y, s, b, z);',
  ].join('\n');
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const cc = process.env['CC'] ?? 'cc';
    const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
    if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
      context.skip('C compiler unavailable; alias C parity requires cc or CC'); return;
    }
    const c = runCompiler(cManifestPath, cSource);
    assert.equal(c.code, 0, c.errors);
    assert.deepEqual(runCArtifact(c.output), {
      phase: 'run', status: 0, signal: null,
      stdout: Buffer.from('2 41 ok true 3\n'), stderr: Buffer.alloc(0),
    });
  }

  for (const [bad, errors] of [
    ['A := type Int;\nA := type String;\n', '2:1: duplicate type alias A\n'],
    ['A := type Missing;\n', '1:11: unknown type alias Missing\n'],
    ['A := type B;\nB := type A;\n', '2:1: recursive type alias B\n'],
    ['A := type A;\n', '1:1: recursive type alias A\n'],
    ['A := type List<>;\n',
      '1:11: expected a list element type\n'],
    ['A := type ();\n',
      '1:11: tuple type needs at least one field\n'],
    ['A := type Float32;\n',
      '1:11: unknown type alias Float32\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
    assert.deepEqual(runCompiler(cManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
});

test('restricted compiler compiles flat named tuples and tuple functions to runnable TS', () => {
  const source = [
    'Pair := type (kind: String, code: String);',
    'Pair2 := type Pair;',
    'rewrap := fn (value: Pair2): Pair { (kind = value.kind, code = value.code) }',
    'label := fn (value: (kind: String, code: String)): String { value.kind }',
    'p: Pair2 = (kind = "number", code = "12");',
    'q := p;',
    'var current := p;',
    'current = (kind = "symbol", code = "+");',
    'blank: Pair2;',
    'outputLine(p.kind, p.code, q.kind, current.kind, current.code);',
    'outputLine(blank.kind);',
    'outputLine(blank.code);',
    'outputLine(rewrap(p).kind, rewrap(p).code, label((kind = "call", code = "1")));',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('number 12 number symbol +\n\n\nnumber 12 call\n'), stderr: Buffer.alloc(0),
  });
});

test('restricted compiler diagnoses invalid flat named tuples clearly', () => {
  for (const [bad, errors] of [
    ['p: (kind: String) = (kind = "a");\noutputLine(p.nope);\n', '2:14: tuple has no field nope\n'],
    ['p: (kind: String) = (kind = 1);\n', '1:1: cannot initialize (kind: String) with (kind: Int)\n'],
    ['p := (kind = 1, kind = 2);\n', '1:17: duplicate tuple field kind\n'],
    ['p: (kind: String, kind: Int) = (kind = "a", kind = 2);\n', '1:19: duplicate tuple field kind\n'],
    ['f := fn (x: (kind: String)): String { return x.kind; }\noutputLine(f((kind = 1)));\n',
      '2:14: argument 1 of f must be (kind: String), got (kind: Int)\n'],
    ['f := fn (): (kind: String) { return (kind = 1); }\n',
      '1:37: cannot return (kind: Int) from function f returning (kind: String)\n'],
    ['p := (kind = (a = 1));\n', '1:14: nested tuple values are not supported\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
  const tupleSource = 'p: (kind: String) = (kind = "a");\noutputLine(p.kind);\n';
  assert.deepEqual(runCompiler(cManifestPath, tupleSource), {
    code: 2, output: '', errors: 'C backend does not support tuple values yet\n',
  });
});

test('restricted compiler compiles growable lists, literals and indexing to runnable TS', async () => {
  const source = [
    'Ints := type List<Int>;',
    'Chain := type Ints;',
    'Count := type Int;',
    'Counts := type List<Count>;',
    'Words := type List<String>;',
    'Pair := type (kind: String, code: String);',
    'Pairs := type List<Pair>;',
    'first := fn (values: Ints): Int { values[0] }',
    'make := fn (): Chain { [6, 7] }',
    'none := fn (): List<Int> { [] }',
    'copy := fn (words: Words): Words { words }',
    'count := fn (values: List<Int>): Int { 0 }',
    'values: List<Int> = [10, 20, 30];',
    'names: List<String> = ["alpha", "beta"];',
    'empty: List<Int> = [];',
    'pairs: Pairs = [(kind = "number", code = "12"), (kind = "symbol", code = "+")];',
    'more: Chain = [7];',
    'counts: Counts = [8, 9];',
    'var editable: List<Int> = [1];',
    'editable = [];',
    'outputLine(values[1], names[0], first(more), pairs[1].kind, pairs[0].code, make()[1], copy(names)[1], count([]));',
    'outputLine([4, 5][1], count(empty), count(none()), counts[1]);',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('20 alpha 7 symbol 12 7 beta 0\n5 0 0 9\n'), stderr: Buffer.alloc(0),
  });

  const bounds = runCompiler(tsManifestPath, 'values: List<Int> = [1];\noutputLine(values[1]);\n');
  assert.equal(bounds.code, 0, bounds.errors);
  const boundsRun = runTsArtifact(bounds.output);
  assert.equal(boundsRun.phase, 'run');
  assert.notEqual(boundsRun.status, 0);
  assert.match(boundsRun.stderr.toString(), /BoundPanic: list index outside its extent/);
});

test('restricted compiler diagnoses invalid list types, literals and indexes clearly', () => {
  for (const [bad, errors] of [
    ['values: List<Int> = ["bad"];\n', '1:22: list element 1 must be Int, got String\n'],
    ['x := 1;\noutputLine(x[0]);\n', '2:13: indexing requires a list value\n'],
    ['values: List<Int> = [1];\noutputLine(values["x"]);\n', '2:19: list index must be Int, got String\n'],
    ['values: List<Int> = [1];\nother: List<String> = values;\n', '2:1: cannot initialize List<String> with List<Int>\n'],
    ['values := [];\n', '1:11: empty list literal requires a List element type\n'],
    ['values: List<List<Int>> = [];\n', '1:14: nested list types are not supported\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
  for (const bad of ['values: List<Int> = [1];\noutputLine(1);\n', 'outputLine([1][0]);\n']) {
    assert.deepEqual(runCompiler(cManifestPath, bad), {
      code: 2, output: '', errors: 'C backend does not support list values yet\n',
    }, bad);
  }
});

test('restricted compiler compiles list traversal to runnable TS', () => {
  const source = [
    'Ints := type List<Int>;',
    'Chain := type Ints;',
    'Pair := type (kind: String, code: Int);',
    'Pairs := type List<Pair>;',
    'make := fn (): Chain { [6, 7] }',
    'pairs := fn (): Pairs { [(kind = "number", code = 12), (kind = "symbol", code = 3)] }',
    'values: Ints = [10, 20];',
    'names: List<String> = ["alpha", "beta"];',
    'loop values as value {',
    '    outputLine(value);',
    '}',
    'loop names as name {',
    '    outputLine(name);',
    '}',
    'loop pairs() as pair {',
    '    outputLine(pair.kind, pair.code);',
    '}',
    'loop make() as value {',
    '    outputLine(value);',
    '}',
    'item: String = "outer";',
    'loop values as item {',
    '    outputLine(item);',
    '    if item == 10 {',
    '        item: String = "inner";',
    '        outputLine(item);',
    '    }',
    '    outputLine(item);',
    '}',
    'outputLine(item);',
    'loop values as ignored {',
    '    outputLine("tick");',
    '}',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('10\n20\nalpha\nbeta\nnumber 12\nsymbol 3\n6\n7\n10\ninner\n10\n20\n20\nouter\ntick\ntick\n'),
    stderr: Buffer.alloc(0),
  });
});

test('restricted compiler diagnoses invalid list traversal clearly', () => {
  for (const [bad, errors] of [
    ['loop 1 as item { outputLine(item); }\n', '1:6: loop sequence must be a List, got Int\n'],
    ['loop true as item { outputLine(item); }\n', '1:6: loop sequence must be a List, got Bool\n'],
    ['values: List<Int> = [1];\nloop values as {\n}\n', '2:16: expected an item name after as\n'],
    ['values: List<Int> = [1];\nloop values as item {\n    item: Int = 2;\n}\n', '3:5: duplicate local item\n'],
    ['values: List<Int> = [1];\nloop values as item {\n    item = 2;\n}\n', '3:5: cannot assign to immutable local item\n'],
    ['values: List<Int> = [1];\nloop values as item {\n    outputLine(item);\n}\noutputLine(item);\n', '5:12: unknown value item\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
  assert.deepEqual(runCompiler(cManifestPath, 'loop [1, 2] as item { outputLine(item); }\n'), {
    code: 2, output: '', errors: 'C backend does not support list traversal yet\n',
  });
});

const loopExitCases = [
  [[
    'var i := 0;',
    'var total := 0;',
    'loop i < 10 {',
    '    i = i + 1;',
    '    if i == 3 { continue; }',
    '    if i == 6 { break; }',
    '    total = total + i;',
    '}',
    'outputLine(total);',
  ].join('\n'), '12\n'],
  [[
    'var n := 0;',
    'loop {',
    '    n = n + 1;',
    '    if n == 2 { continue; }',
    '    if n == 4 { break; }',
    '    outputLine(n);',
    '}',
    'outputLine(n);',
  ].join('\n'), '1\n3\n4\n'],
  [[
    'var outer := 0;',
    'var visits := 0;',
    'loop outer < 2 {',
    '    outer = outer + 1;',
    '    var inner := 0;',
    '    loop true {',
    '        inner = inner + 1;',
    '        if inner == 2 { continue; }',
    '        if inner == 4 { break; }',
    '        visits = visits + 1;',
    '    }',
    '    outputLine(outer, inner);',
    '    visits = visits + 10;',
    '}',
    'outputLine(visits);',
  ].join('\n'), '1 4\n2 4\n24\n'],
  [[
    'values: List<Int> = [1, 2, 3, 4, 5];',
    'loop values as value {',
    '    if value == 2 { continue; }',
    '    if value == 5 { break; }',
    '    outputLine(value);',
    '}',
  ].join('\n'), '1\n3\n4\n'],
] as const;

test('restricted compiler lowers bare break and continue to runnable TS', () => {
  for (const [source, stdout] of loopExitCases) {
    const ts = runCompiler(tsManifestPath, source);
    assert.equal(ts.code, 0, ts.errors);
    assert.match(ts.output, /\bbreak;|\bcontinue;/);
    assert.deepEqual(runTsArtifact(ts.output), {
      phase: 'run', status: 0, signal: null, stdout: Buffer.from(stdout), stderr: Buffer.alloc(0),
    });
  }
});

test('restricted compiler lowers bare break and continue to runnable C', context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') {
    context.skip('LITE_SKIP_NATIVE=1'); return;
  }
  const cc = process.env['CC'] ?? 'cc';
  const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
    context.skip('C compiler unavailable; loop exit C lowering requires cc or CC'); return;
  }
  for (const [source, stdout] of loopExitCases.slice(0, 3)) {
    const c = runCompiler(cManifestPath, source);
    assert.equal(c.code, 0, c.errors);
    assert.match(c.output, /\bbreak;|\bcontinue;/);
    assert.deepEqual(runCArtifact(c.output), {
      phase: 'run', status: 0, signal: null, stdout: Buffer.from(stdout), stderr: Buffer.alloc(0),
    });
  }
});

test('restricted compiler diagnoses break and continue outside loops', () => {
  for (const [bad, errors] of [
    ['break;\n', '1:1: break outside loop\n'],
    ['continue;\n', '1:1: continue outside loop\n'],
    ['if true { break; }\n', '1:11: break outside loop\n'],
    ['var i := 0;\nloop i < 1 { i = i + 1; }\nbreak;\n', '3:1: break outside loop\n'],
    ['var i := 0;\nloop i < 1 { i = i + 1; }\ncontinue;\n', '3:1: continue outside loop\n'],
    ['f := fn(): Int { loop true { break; } break; 1 }\noutputLine(f());\n', '1:39: break outside loop\n'],
    ['loop true { break 1; }\n', '1:19: expected ; after break\n'],
    ['loop true { continue @outer; }\n', '1:22: expected ; after continue\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
    assert.deepEqual(runCompiler(cManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
});

const leadingSeparatorTsSource = [
  'pick := fn(flag: Bool, other: Bool): Bool { or flag and other }',
  'explicit := fn(flag: Bool): Bool { return and flag; }',
  'var n := 0;',
  'loop and n < 3 {',
  '    n = n + 1;',
  '}',
  'ready := or n == 3 or n == 4;',
  'single := and ready;',
  'var flag := true;',
  'flag = and ready and not false;',
  'outputLine(ready, single, flag);',
  'if or ready and flag {',
  '    outputLine("or-if");',
  '}',
  'if and ready {',
  '    outputLine("and-if");',
  '}',
  'outputLine(pick(or ready and flag, and flag), explicit(or ready));',
  'value := if and ready { 7 } else { 9 };',
  'outputLine(value);',
  'outputLine(and (or ready or false) and flag);',
  'outputLine(and true, or false);',
].join('\n');
const leadingSeparatorTsStdout = 'true true true\nor-if\nand-if\ntrue true\n7\ntrue\ntrue false\n';
const leadingSeparatorCSource = [
  'var n := 0;',
  'loop and n < 3 { n = n + 1; }',
  'ready := or n == 3 or n == 4;',
  'single := and ready;',
  'var flag := true;',
  'flag = and ready and not false;',
  'outputLine(ready, single, flag);',
  'if or ready and flag { outputLine("or-if"); }',
  'if and ready { outputLine("and-if"); }',
  'outputLine(and (or ready or false) and flag);',
  'outputLine(and true, or false);',
].join('\n');
const leadingSeparatorCStdout = 'true true true\nor-if\nand-if\ntrue\ntrue false\n';

test('restricted compiler accepts one optional leading and/or in Bool expressions for TS', () => {
  const ts = runCompiler(tsManifestPath, leadingSeparatorTsSource);
  assert.equal(ts.code, 0, ts.errors);
  assert.match(ts.output, /&&|\|\|/);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null, stdout: Buffer.from(leadingSeparatorTsStdout), stderr: Buffer.alloc(0),
  });
});

test('restricted compiler accepts one optional leading and/or in Bool expressions for C', context => {
  if (process.env['LITE_SKIP_NATIVE'] === '1') {
    context.skip('LITE_SKIP_NATIVE=1'); return;
  }
  const cc = process.env['CC'] ?? 'cc';
  const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
    context.skip('C compiler unavailable; leading separator C lowering requires cc or CC'); return;
  }
  const c = runCompiler(cManifestPath, leadingSeparatorCSource);
  assert.equal(c.code, 0, c.errors);
  assert.match(c.output, /&&|\|\|/);
  assert.deepEqual(runCArtifact(c.output), {
    phase: 'run', status: 0, signal: null, stdout: Buffer.from(leadingSeparatorCStdout), stderr: Buffer.alloc(0),
  });
});

test('restricted compiler diagnoses invalid leading and/or forms', () => {
  for (const [bad, errors] of [
    ['x := and 1;', '1:6: leading and requires a Bool expression\n'],
    ['x := or [1];', '1:6: leading or requires a Bool expression\n'],
    ['flag := or "text";', '1:9: leading or requires a Bool expression\n'],
    ['if and (1) { outputLine(1); }', '1:4: leading and requires a Bool expression\n'],
    ['loop and 1 { }', '1:6: leading and requires a Bool expression\n'],
    ['x := and and true;', '1:10: leading and may appear only once\n'],
    ['if or and ready { outputLine(1); }', '1:7: leading or may appear only once\n'],
    ['x := true and;', '1:14: expected an Int, String or Bool expression\n'],
    ['if true or { outputLine(1); }', '1:12: expected an Int, String or Bool expression\n'],
    ['x := or;', '1:8: expected an Int, String or Bool expression\n'],
    ['x := true and or false;', '1:15: unsupported feature "or": see docs/conditionals.md; ' +
      'the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only\n'],
    ['x := not and true;', '1:10: unsupported feature "and": see docs/conditionals.md; ' +
      'the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
    assert.deepEqual(runCompiler(cManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
});

test('restricted compiler compiles list mutation grants, push and pop to runnable TS', () => {
  const source = [
    'Ints := type List<Int>;',
    'Values := type Ints;',
    'Pair := type (kind: String, code: Int);',
    'pass := fn (items: List<Int>): List<Int> { items }',
    'values: mut Values = [1, 2];',
    'push_back(mut values, 3);',
    'outputLine(values[0], values[2]);',
    'outputLine(pop_back(mut values));',
    'outputLine(values[1]);',
    'source: List<Int> = [10, 20];',
    'copy: mut List<Int> = source;',
    'push_back(mut copy, 9);',
    'outputLine(source[0], source[1], copy[2]);',
    'var replaced: mut List<Int> = [4];',
    'replaced = [7];',
    'push_back(mut replaced, 8);',
    'outputLine(replaced[0], replaced[1]);',
    'origin: mut List<Int> = [5];',
    'detached: mut List<Int> = pass(origin);',
    'push_back(mut detached, 6);',
    'outputLine(origin[0], detached[1]);',
    'var first: mut List<Int> = [1];',
    'second: mut List<Int> = [2, 4];',
    'first = second;',
    'push_back(mut first, 3);',
    'outputLine(pop_back(mut second), first[2]);',
    'stack: mut List<Int> = [1, 2, 3];',
    'outputLine(pop_back(mut stack), pop_back(mut stack), pop_back(mut stack));',
    'growing: mut List<Int> = [1];',
    'loop growing as value {',
    '    if value == 1 {',
    '        push_back(mut growing, 2);',
    '    }',
    '    outputLine(value);',
    '}',
    'outputLine(growing[1]);',
    'pairs: mut List<Pair> = [(kind = "a", code = 1)];',
    'push_back(mut pairs, (kind = "b", code = 2));',
    'pair := pop_back(mut pairs);',
    'outputLine(pair.kind, pair.code, pairs[0].kind);',
    'blank: mut List<String>;',
    'push_back(mut blank, "ok");',
    'push_back(mut blank, "later");',
    'outputLine(pop_back(mut blank));',
    'pop_back(mut blank);',
    'push_back(mut blank, "again");',
    'outputLine(blank[0]);',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('1 3\n3\n2\n10 20 9\n7 8\n5 6\n4 3\n3 2 1\n1\n2\nb 2 a\nlater\nagain\n'),
    stderr: Buffer.alloc(0),
  });

  const empty = runCompiler(tsManifestPath, 'empty: mut List<Int> = [];\noutputLine(pop_back(mut empty));\n');
  assert.equal(empty.code, 0, empty.errors);
  const emptyRun = runTsArtifact(empty.output);
  assert.equal(emptyRun.phase, 'run');
  assert.notEqual(emptyRun.status, 0);
  assert.match(emptyRun.stderr.toString(), /BoundPanic: pop_back on an empty list/);

  for (const [bad, errors] of [
    ['values: mut List<Int> = [];\npush_back(mut values, "x");\n',
      '2:23: push_back element must be Int, got String\n'],
    ['values: List<Int> = [];\npush_back(mut values, 1);\n',
      '2:15: cannot mutate list values without mut\n'],
    ['var values: List<Int> = [];\npush_back(mut values, 1);\n',
      '2:15: cannot mutate list values without mut\n'],
    ['values: List<Int> = [];\npush_back(values, 1);\n',
      '2:11: push_back requires mut list argument\n'],
    ['x := 1;\npush_back(mut x, 2);\n',
      '2:15: push_back requires a List value, got Int\n'],
    ['push_back(mut missing, 1);\n',
      '1:15: unknown value missing\n'],
    ['values: mut List<Int> = [];\npush_back(mut values);\n',
      '2:21: push_back expects a value after the mut list\n'],
    ['values: mut List<Int> = [];\noutputLine(pop_back(values));\n',
      '2:21: pop_back requires mut list argument\n'],
    ['values: mut Int = 1;\n',
      '1:9: mut requires a List type, got Int\n'],
    ['values: mut List<Int> = [];\nx := push_back(mut values, 1);\n',
      '2:1: cannot declare a Unit local x\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
  for (const bad of [
    'values: mut List<Int> = [1];\npush_back(mut values, 2);\n',
    'values: mut List<Int> = [1];\noutputLine(pop_back(mut values));\n',
    'values: mut List<Int>;\npush_back(mut values, 2);\n',
  ]) {
    assert.deepEqual(runCompiler(cManifestPath, bad), {
      code: 2, output: '', errors: 'C backend does not support list values yet\n',
    }, bad);
  }
});

test('restricted compiler treats nested, doc and raw comments as separating trivia', async context => {
  const source = [
    '/* ordinary leading comment',
    '   /* nested existing comment: outputLine(999); */',
    '   /*# embedded raw: /* not a nested opener " ( { #*/',
    '   "unterminated string and unmatched ( {',
    '*/',
    '/** documentation comment: outputLine(888); */',
    'x := 10/* separator */+ 2;',
    'y := x /* between tokens */',
    '    * 3;',
    '/*# raw: /* never closed',
    '    */ stray ordinary closer',
    '    "unfinished string and unmatched ( {',
    '#*/',
    'z := y + 1;',
    '/*## longer fence: the text may contain #*/ without ending the comment. ##*/',
    'outputLine(x, y, z);',
  ].join('\n');
  const baseline = run(source);
  assert.deepEqual(baseline, { code: 0, output: '12 36 37\n', errors: '' });
  const withoutComments = 'x := 10 + 2;\ny := x * 3;\nz := y + 1;\noutputLine(x, y, z);\n';
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.equal(ts.output, runCompiler(tsManifestPath, withoutComments).output);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null, stdout: Buffer.from(baseline.output), stderr: Buffer.alloc(0),
  });
  for (const manifest of [tsManifestPath, cManifestPath]) {
    assert.deepEqual(runCompiler(manifest, 'outputLine(1/*x*/2);'), {
      code: 2, output: '', errors: '1:18: expected )\n',
    });
    assert.deepEqual(runCompiler(manifest, 'outputLine(1);\n/* outer /* inner */\n'), {
      code: 2, output: '', errors: '2:1: unterminated comment\n',
    });
    assert.deepEqual(runCompiler(manifest, 'outputLine(1);\n/*# raw */\n'), {
      code: 2, output: '', errors: '2:1: unterminated raw comment\n',
    });
    assert.deepEqual(runCompiler(manifest, '/*## raw #*/'), {
      code: 2, output: '', errors: '1:1: unterminated raw comment\n',
    });
  }
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const cc = process.env['CC'] ?? 'cc';
    const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
    if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
      context.skip('C compiler unavailable; comment C parity requires cc or CC'); return;
    }
    const c = runCompiler(cManifestPath, source);
    assert.equal(c.code, 0, c.errors);
    assert.equal(c.output, runCompiler(cManifestPath, withoutComments).output);
    assert.deepEqual(runCArtifact(c.output), {
      phase: 'run', status: 0, signal: null, stdout: Buffer.from(baseline.output), stderr: Buffer.alloc(0),
    });
  }
});

test('restricted compiler corpus keeps 66 program and 27 rejection cases', () => {
  assert.equal(programFixtures.length, 66);
  assert.equal(rejectionFixtures.length, 27);
});

test('restricted compiler compiles scalar functions, calls and returns to runnable TS', () => {
  const source = [
    'double := fn (x: Int): Int { return x * 2; }',
    'add := fn (a: Int, b: Int): Int { return a + b; }',
    'echo := fn (s: String): String { return s; }',
    'positive := fn (x: Int): Bool { return x > 0; }',
    'noop := fn (): Unit { return; }',
    'value := fn (u: Unit): Int { return 7; }',
    'outputLine(double(21), add(2, 3), echo("ok"), positive(1), positive(-1), value(noop()));',
    'noop();',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('42 5 ok true false 7\n'), stderr: Buffer.alloc(0),
  });

  const recursive = [
    'factorial := fn (n: Int): Int { if n <= 1 { return 1; } return n * self(n - 1); }',
    'countdown := fn (n: Int): Int { if n == 0 { return 0; } return 1 + countdown(n - 1); }',
    'outputLine(factorial(5), countdown(3));',
  ].join('\n');
  const recursiveTs = runCompiler(tsManifestPath, recursive);
  assert.equal(recursiveTs.code, 0, recursiveTs.errors);
  assert.deepEqual(runTsArtifact(recursiveTs.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('120 3\n'), stderr: Buffer.alloc(0),
  });
  assert.equal(recursiveTs.output, runCompiler(tsManifestPath, recursive).output);
});

test('restricted compiler completes scalar functions from tail expressions', () => {
  const source = [
    'double := fn (x: Int): Int { x * 2 }',
    'greeting := fn (): String { "hi" }',
    'pick := fn (flag: Bool): Int { if flag { return 1; } 2 }',
    'outputLine(double(21), greeting(), pick(true), pick(false));',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('42 hi 1 2\n'), stderr: Buffer.alloc(0),
  });
});

test('restricted compiler completes function tails from Bool literals and calls', () => {
  const source = [
    'isZero := fn (x: Int): Bool { if x == 0 { return true; } false }',
    'flag := fn (x: Int): Bool { isZero(x) }',
    'outputLine(flag(0), flag(1));',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('true false\n'), stderr: Buffer.alloc(0),
  });
  assert.deepEqual(runCompiler(tsManifestPath, 'bad := fn (): Bool { "text" }\n'), {
    code: 2, output: '', errors: '1:22: cannot return String from function bad returning Bool\n',
  });
});

test('restricted compiler allows top-level declarations between functions', () => {
  const source = [
    'one := fn (): Int { 1 }',
    'label := "n";',
    'two := fn (): String { label + label }',
    'outputLine(one(), two());',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('1 nn\n'), stderr: Buffer.alloc(0),
  });
});

test('restricted compiler diagnoses scalar function arity, argument and return mismatches', () => {
  const prefix = 'f := fn (x: Int): Int { return x; }\n';
  for (const [bad, errors] of [
    [prefix + 'outputLine(f());\n', '2:12: function f expects 1 argument, got 0\n'],
    [prefix + 'outputLine(f("x"));\n', '2:14: argument 1 of f must be Int, got String\n'],
    ['f := fn (x: Int): Int { return "x"; }\n', '1:32: cannot return String from function f returning Int\n'],
    ['f := fn (): Int { return; }\n', '1:19: function f must return Int\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
});

test('restricted compiler compiles value if expressions in every value position', () => {
  const source = [
    'pickInt := fn (flag: Bool): Int { if flag { 10 } else { 20 } }',
    'pickText := fn (flag: Bool): String { if flag { "yes" } else { "no" } }',
    'pickBool := fn (flag: Bool): Bool { if flag { true } else { false } }',
    'classify := fn (n: Int): String { if n < 0 { "negative" } else if n == 0 { "zero" } else { "positive" } }',
    'nested := fn (a: Bool, b: Bool): Int { if a { if b { 1 } else { 2 } } else { 3 } }',
    'early := fn (flag: Bool): Int { return if flag { 1 } else { 2 }; }',
    'x := if 1 < 2 { 41 } else { 0 };',
    'y: Int = if false { 1 } else { 2 };',
    'var z := 0;',
    'z = if true { 7 } else { 8 };',
    'outputLine(x, y, z, pickInt(true), pickInt(false));',
    'outputLine(pickText(true), pickText(false), pickBool(true), pickBool(false));',
    'outputLine(classify(-1), classify(0), classify(5));',
    'outputLine(nested(true, true), nested(true, false), nested(false, false));',
    'outputLine(early(true), early(false), pickBool(if true { true } else { false }));',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('41 2 7 10 20\nyes no true false\nnegative zero positive\n1 2 3\n1 2 true\n'),
    stderr: Buffer.alloc(0),
  });
  assert.equal(ts.output, runCompiler(tsManifestPath, source).output);
});

test('restricted compiler completes statement-shaped if branches as function results', () => {
  const source = [
    'pick := fn (x: Int): (text: String, next: Int) {',
    '    if x < 0 {',
    '        var y := 0 - x;',
    '        (text = "neg", next = y)',
    '    } else {',
    '        if x == 0 { (text = "zero", next = 0) } else {',
    '            y := x * 2;',
    '            (text = "pos", next = y)',
    '        }',
    '    }',
    '}',
    'bump := fn (x: Int): Int { if x > 0 { y := x; y + 1 } else { 0 } }',
    'grade := fn (n: Int): String { if n > 90 { "a" } else if n > 80 { "b" } else { "c" } }',
    'negate := fn (x: Bool): Bool { not x }',
    'guard := fn (a: Bool, b: Bool): Bool { if a { not b } else { false } }',
    'outputLine(pick(-2).text, pick(0).next, pick(5).next, bump(-3), bump(4), grade(95), grade(85), grade(10));',
    'outputLine(negate(true), negate(false), guard(true, false), guard(false, false));',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('neg 0 10 0 5 a b c\nfalse true true false\n'), stderr: Buffer.alloc(0),
  });
  // A branch without a value is not a Lite diagnostic here; the strict artifact
  // typecheck rejects the emitted function that can fall through.
  const incomplete = runCompiler(tsManifestPath, [
    'g := fn (x: Bool): Int { if x { reportError("a"); } else { 2 } }',
    'outputLine(g(true));',
    '',
  ].join('\n'));
  assert.equal(incomplete.code, 0, incomplete.errors);
  assert.equal(runTsArtifact(incomplete.output).phase, 'typecheck');
});

test('restricted compiler diagnoses invalid value if expressions and rejects them in C', () => {
  for (const [bad, errors] of [
    ['x := if 1 { 2 } else { 3 };\n', '1:9: if condition must be Bool\n'],
    ['x := if true { 2 };\n', '1:19: value if requires a final else\n'],
    ['x := if true { 2 } else { "a" };\n',
      '1:27: value if branches must have the same kind, got Int and String\n'],
    ['x := if true { 1 } else if 1 { 2 } else { 3 };\n', '1:28: if condition must be Bool\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
  assert.deepEqual(runCompiler(cManifestPath, 'x := if true { 1 } else { 2 };\noutputLine(x);\n'), {
    code: 2, output: '', errors: 'C backend does not support value if expressions yet\n',
  });
  assert.deepEqual(runCompiler(cManifestPath, 'if true { outputLine(1); } else { outputLine(2); }\n'), {
    code: 0, output: '#include <stdio.h>\n#include <inttypes.h>\n#include <stdbool.h>\n#include <string.h>\n' +
      'int main(void) {\n    int status = 0;\n    if (true) {\n' +
      '        if (printf("%" PRId64, (int64_t)(INT64_C(1))) < 0) { status = 1; }\n' +
      '        if (printf("\\n") < 0) { status = 1; }\n' +
      '    } else {\n' +
      '        if (printf("%" PRId64, (int64_t)(INT64_C(2))) < 0) { status = 1; }\n' +
      '        if (printf("\\n") < 0) { status = 1; }\n' +
      '    }\n    return status;\n}\n', errors: '',
  });
});

test('restricted compiler compiles action else-if chains to runnable TS', () => {
  const source = [
    'classify := fn (n: Int): String {',
    '    if n < 0 {',
    '        return "negative";',
    '    } else if n == 0 {',
    '        return "zero";',
    '    } else if n < 10 {',
    '        return "small";',
    '    } else {',
    '        return "large";',
    '    }',
    '}',
    'noFinal := fn (n: Int): String {',
    '    if n < 0 { return "negative"; }',
    '    else if n == 0 { return "zero"; }',
    '    return "positive";',
    '}',
    'nested := fn (a: Int, b: Bool): String {',
    '    if a < 0 {',
    '        if b { return "negative-flagged"; }',
    '        else if a < -10 { return "very-negative"; }',
    '        else { return "negative"; }',
    '    } else if b {',
    '        return "flagged";',
    '    } else {',
    '        return "plain";',
    '    }',
    '}',
    'loopReport := fn (limit: Int): Unit {',
    '    var index := 0;',
    '    loop index < limit {',
    '        if index == 0 {',
    '            outputLine("loop-zero", index);',
    '        } else if index == 1 {',
    '            outputLine("loop-one", index);',
    '        } else if index == 2 {',
    '            outputLine("loop-two", index);',
    '        } else {',
    '            outputLine("loop-many", index);',
    '        }',
    '        index = index + 1;',
    '    }',
    '}',
    'x := 2;',
    'outputLine(classify(-1), classify(0), classify(5), classify(50));',
    'outputLine(noFinal(-1), noFinal(0), noFinal(5));',
    'outputLine(nested(-1, true), nested(-20, false), nested(-5, false), nested(1, true), nested(1, false));',
    'outputLine("before");',
    'if x == 1 { outputLine("one"); }',
    'else if x == 2 { outputLine("two-first"); outputLine("two-second"); }',
    'else if x == 3 { outputLine("three"); }',
    'else { outputLine("other"); }',
    'outputLine("after");',
    'loopReport(4);',
    'var total := 0;',
    'if true { armLocal := 1; total = total + armLocal; }',
    'else if false { armLocal := 2; total = total + armLocal; }',
    'else { armLocal := 3; total = total + armLocal; }',
    'outputLine(total, x);',
    'outputLine("end");',
  ].join('\n');
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.match(ts.output, /^    \} else if \(/m);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('negative zero small large\nnegative zero positive\n' +
      'negative-flagged very-negative negative flagged plain\n' +
      'before\ntwo-first\ntwo-second\nafter\n' +
      'loop-zero 0\nloop-one 1\nloop-two 2\nloop-many 3\n1 2\nend\n'),
    stderr: Buffer.alloc(0),
  });
});

test('restricted compiler compiles action else-if chains to runnable C', async context => {
  const source = [
    'var index := 0;',
    'loop index < 3 {',
    '    if index == 0 { outputLine("zero", index); }',
    '    else if index == 1 { outputLine("one", index); }',
    '    else if index == 2 { outputLine("two", index); }',
    '    else { outputLine("many", index); }',
    '    index = index + 1;',
    '}',
    'var x := 2;',
    'if x == 1 { outputLine("one"); }',
    'else if x == 2 {',
    '    if index == 3 {',
    '        outputLine("nested", x);',
    '    } else if index == 4 {',
    '        outputLine("nested-four", x);',
    '    } else {',
    '        outputLine("nested-other", x);',
    '    }',
    '} else { outputLine("other"); }',
    'if x == 1 { outputLine("skip"); }',
    'else if x == 2 { outputLine("two-arm"); }',
    'if x == 1 { outputLine("a"); }',
    'else if x == 3 { outputLine("b"); }',
    'outputLine("done");',
  ].join('\n');
  const c = runCompiler(cManifestPath, source);
  assert.equal(c.code, 0, c.errors);
  assert.match(c.output, /^    \} else if \(/m);
  if (process.env['LITE_SKIP_NATIVE'] !== '1') {
    const cc = process.env['CC'] ?? 'cc';
    const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
    if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
      context.skip('C compiler unavailable; action else-if C parity requires cc or CC'); return;
    }
    assert.deepEqual(runCArtifact(c.output), {
      phase: 'run', status: 0, signal: null,
      stdout: Buffer.from('zero 0\none 1\ntwo 2\nnested 2\ntwo-arm\ndone\n'), stderr: Buffer.alloc(0),
    });
  }
});

test('restricted compiler diagnoses invalid action else-if chains', () => {
  for (const [bad, errors] of [
    ['if true { outputLine(1); } else if 1 { outputLine(2); }\n', '1:36: else if condition must be Bool\n'],
    ['if true { outputLine(1); } else if true outputLine(2);\n', '1:41: expected {\n'],
    ['if true { outputLine(1); } else if { outputLine(2); }\n',
      '1:36: expected an Int, String or Bool expression\n'],
    ['if true { outputLine(1); } else { outputLine(2); } else { outputLine(3); }\n', '1:52: unexpected else\n'],
    ['else if true { outputLine(1); }\n', '1:1: unexpected else\n'],
    ['if true { hidden := 1; } else if hidden == 1 { outputLine(2); }\n', '1:34: unknown value hidden\n'],
    ['if true { outputLine(1); } else if false { outputLine(hidden); }\n', '1:55: unknown value hidden\n'],
    ['var total := 0;\nif false { hidden := 1; total = total + hidden; } else if hidden == 1 { outputLine(2); }\n',
      '2:59: unknown value hidden\n'],
    ['var total := 0;\nif true { hidden := 1; total = total + hidden; }\noutputLine(hidden);\n',
      '3:12: unknown value hidden\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
    assert.deepEqual(runCompiler(cManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
});

test('restricted compiler compiles text builtins with code-point semantics and bounds faults', () => {
  const source = 'outputLine(textLength("a🙂é"), textAt("a🙂é", 1), textSlice("a🙂é", 1, 3));\n';
  const ts = runCompiler(tsManifestPath, source);
  assert.equal(ts.code, 0, ts.errors);
  assert.deepEqual(runTsArtifact(ts.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('3 🙂 🙂é\n'), stderr: Buffer.alloc(0),
  });
  for (const [bad, pattern] of [
    ['outputLine(textAt("a", 9));\n', /BoundPanic: textAt index outside text/],
    ['outputLine(textAt("a", -1));\n', /BoundPanic: textAt index outside text/],
    ['outputLine(textSlice("abc", 2, 1));\n', /BoundPanic: textSlice requires 0 <= start <= end <= textLength\(text\)/],
    ['outputLine(textSlice("abc", 0, 4));\n', /BoundPanic: textSlice requires 0 <= start <= end <= textLength\(text\)/],
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
  const probes = Array.from({ length: 32 }, (_, index) => `outputLine(textLength("text-${index}🙂"));`);
  const source = [
    `original := "${text}";`,
    'outputLine(textLength(original), textAt(original, 1), textSlice(original, 2, 4));',
    ...probes,
    'outputLine(textLength(original), textAt(original, 1), textSlice(original, 2, 4));',
  ].join('\n');
  const expected = run(source);
  assert.equal(expected.code, 0);
  const generated = runCompiler(tsManifestPath, source);
  assert.equal(generated.code, 0, generated.errors);
  assert.deepEqual(runTsArtifact(generated.output), {
    phase: 'run', status: 0, signal: null, stdout: Buffer.from(expected.output), stderr: Buffer.alloc(0),
  });
});

test('restricted compiler compiles input, diagnostic and exit builtins in value and statement positions', () => {
  const argsSource = [
    'label := fn (n: Int): String { if n == 0 { "zero" } else { textAt("abc", n) } }',
    'names := inputArgs();',
    'loop names as name { outputLine(textLength(name)); }',
    'outputLine(if textLength("xy") == 2 { "two" } else { "other" });',
    'outputLine(label(1), label(0), names[1]);',
  ].join('\n');
  const args = runCompiler(tsManifestPath, argsSource);
  assert.equal(args.code, 0, args.errors);
  assert.deepEqual(runTsArtifact(args.output, { args: ['ab', 'c'] }), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('2\n1\ntwo\nb zero c\n'), stderr: Buffer.alloc(0),
  });

  const whole = runCompiler(tsManifestPath, 'outputLine(inputAll());\n');
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
    'outputLine("before");\nreportError("warn");\nexit(3);\n');
  assert.equal(diagnostic.code, 0, diagnostic.errors);
  assert.deepEqual(runTsArtifact(diagnostic.output), {
    phase: 'run', status: 3, signal: null,
    stdout: Buffer.from('before\n'), stderr: Buffer.from('warn\n'),
  });
  const clean = runCompiler(tsManifestPath, 'outputLine("ok");\nexit(0);\n');
  assert.equal(clean.code, 0, clean.errors);
  assert.deepEqual(runTsArtifact(clean.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('ok\n'), stderr: Buffer.alloc(0),
  });
});

test('restricted compiler diagnoses I/O and text builtin arity and argument mismatches', () => {
  for (const [bad, errors] of [
    ['outputLine(inputArgs(1));\n', '1:12: inputArgs expects no arguments\n'],
    ['outputLine(inputAll(1));\n', '1:21: argument 1 of inputAll must be String, got Int\n'],
    ['reportError();\n', '1:1: reportError expects 1 argument, got 0\n'],
    ['reportError(1);\n', '1:13: argument 1 of reportError must be String, got Int\n'],
    ['reportError("x", "y");\n', '1:1: reportError expects 1 argument, got more\n'],
    ['exit();\n', '1:1: exit expects 1 argument, got 0\n'],
    ['exit("x");\n', '1:6: argument 1 of exit must be Int, got String\n'],
    ['outputLine(textLength());\n', '1:12: textLength expects 1 argument, got 0\n'],
    ['outputLine(textLength(1));\n', '1:23: argument 1 of textLength must be String, got Int\n'],
    ['outputLine(textAt("a"));\n', '1:12: textAt expects 2 arguments, got 1\n'],
    ['outputLine(textAt("a", "b"));\n', '1:24: argument 2 of textAt must be Int, got String\n'],
    ['outputLine(textSlice("a", 0));\n', '1:12: textSlice expects 3 arguments, got 2\n'],
    ['outputLine(inputArgs);\n', '1:12: inputArgs must be called\n'],
  ] as const) {
    assert.deepEqual(runCompiler(tsManifestPath, bad), { code: 2, output: '', errors }, bad);
  }
});

test('restricted C compiler rejects input, diagnostic and text builtins clearly', () => {
  for (const [bad, message] of [
    ['outputLine(inputAll());\n', 'C backend does not support input builtins yet\n'],
    ['outputLine(inputArgs()[0]);\n', 'C backend does not support input builtins yet\n'],
    ['reportError("x");\n', 'C backend does not support reportError or exit yet\n'],
    ['exit(2);\n', 'C backend does not support reportError or exit yet\n'],
    ['outputLine(textLength("abc"));\n', 'C backend does not support text builtins yet\n'],
    ['outputLine(textAt("abc", 0));\n', 'C backend does not support text builtins yet\n'],
    ['outputLine(textSlice("abc", 0, 1));\n', 'C backend does not support text builtins yet\n'],
  ] as const) {
    assert.deepEqual(runCompiler(cManifestPath, bad), { code: 2, output: '', errors: message }, bad);
  }
});

test('restricted C compiler preserves existing output and rejects function syntax clearly', () => {
  assert.deepEqual(runCompiler(cManifestPath, 'outputLine(42);'), {
    code: 0, output: readFileSync(new URL('../compiler/generated/report-42.c', import.meta.url), 'utf8'), errors: '',
  });
  assert.deepEqual(runCompiler(cManifestPath, 'f := fn (x: Int): Int { return x; }\noutputLine(f(42));\n'), {
    code: 2, output: '', errors: 'C backend does not support top-level functions yet\n',
  });
});

test('artifact runner typechecks emitted TS and compiles C with warnings as errors', async context => {
  const root = new URL('../', import.meta.url).pathname;
  const source = 'x := 2 * 3;\noutputLine(x);\n';
  const tsCompiler = loadCompiler(join(root, 'compiler/manifests/ts.json'));
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
  const cCompiler = loadCompiler(join(root, 'compiler/manifests/c.json'));
  const cArtifact = cCompiler.compile({ text: source });
  assert.equal(cArtifact.status, 0);
  assert.deepEqual(runCArtifact(cArtifact.stdout.toString('utf8')), {
    phase: 'run', status: 0, signal: null, stdout: Buffer.from('6\n'), stderr: Buffer.alloc(0),
  });
});

test('bundle artifacts are deterministic and leak no timestamps or host paths', context => {
  const root = new URL('../', import.meta.url).pathname;
  const manifest = join(root, 'compiler/manifests/ts.json');
  const compiler = loadCompiler(manifest);
  const source = 'x := 1;\noutputLine(x + 1);\n';
  const first = compiler.compile({ text: source });
  const second = compiler.compile({ text: source });
  assert.equal(first.status, 0);
  assert.equal(hashBytes(first.stdout), hashBytes(second.stdout));
  assert.equal(hashBytes(first.stderr), hashBytes(second.stderr));
  assert.deepEqual(nondeterminismReasons(first.stdout.toString('utf8'), [root, tmpdir(), process.cwd()]), []);
  const measured = benchmark(() => loadCompiler(manifest), 2);
  context.diagnostic(`compiler bundle load+compile best: ${measured.bestMs.toFixed(1)} ms`);
  assert.ok(measured.bestMs < 10000, `compiler bundle load+compile took ${measured.bestMs.toFixed(1)} ms`);
  for (const value of measured.values) {
    assert.equal(value.bundle.lineMap.length, value.bundle.text.split('\n').length - 1);
  }
});


test('whole-source TS and C compilers reject later statements and decoding failures before artifact output', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'litec-reject-'));
  try {
    const sourcePath = join(directory, 'source.lts');
    for (const target of ['ts', 'c'] as const) {
      writeFileSync(sourcePath, '');
      const empty = spawnSync(join(root, 'litec'), [target, sourcePath], { env, timeout: 5000 });
      assert.equal(empty.error, undefined); assert.equal(empty.status, 0, empty.stderr.toString());
      assert.ok(empty.stdout.length > 0); assert.equal(empty.stderr.length, 0);
      for (const input of [' \n}', 'outputLine(42);\nunsupported();\n', 'outputLine(42);\nprocess.exit(7);\n']) {
        writeFileSync(sourcePath, input);
        const rejected = spawnSync(join(root, 'litec'), [target, sourcePath], { env, timeout: 5000 });
        assert.equal(rejected.error, undefined); assert.equal(rejected.status, 2, rejected.stderr.toString());
        assert.equal(rejected.stdout.length, 0); assert.notEqual(rejected.stderr.length, 0);
      }
      writeFileSync(sourcePath, Buffer.concat([Buffer.from('outputLine(42);\n'), Buffer.from([0xff])]));
      const invalid = spawnSync(join(root, 'litec'), [target, sourcePath], { env, timeout: 5000 });
      assert.equal(invalid.error, undefined); assert.equal(invalid.status, 1);
      assert.equal(invalid.stdout.length, 0); assert.match(invalid.stderr.toString(), /InputFault: cannot read input/);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('restricted C compiler emits the readable reference and sequences reports', () => {
  const expected = readFileSync(new URL('../compiler/generated/report-42.c', import.meta.url), 'utf8');
  assert.deepEqual(runCompiler(cManifestPath, 'outputLine(42);'), { code: 0, output: expected, errors: '' });
  assert.equal(runCompiler(cManifestPath, 'outputLine(42);\noutputLine(9);').output,
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
  const cacheDirectory = new URL('../.cache/native/', import.meta.url).pathname;
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
        .update('-std=c11 -Wall -Wextra -Werror').update(process.platform).update(process.arch).digest('hex');
      const cached = join(cacheDirectory, cacheKey);
      let executablePath = executable;
      if (process.env['LITE_NO_NATIVE_CACHE'] !== '1' && existsSync(cached)) {
        executablePath = cached;
      } else {
        const built = spawnSync(cc, ['-std=c11', '-Wall', '-Wextra', '-Werror', cPath, '-o', executable], {
          encoding: 'utf8', timeout: 30000,
        });
        assert.equal(built.error, undefined); assert.equal(built.status, 0, built.stdout + built.stderr);
        if (process.env['LITE_NO_NATIVE_CACHE'] !== '1') {
          copyFileSync(executable, cached); chmodSync(cached, 0o755); executablePath = cached;
        }
      }
      const expectedOutput = fixture.stdout.toString('utf8');
      const expectedError = fixture.stderr.toString('utf8');
      const baseline = runCompilerFixture(fixture);
      assert.equal(baseline.code, fixture.exitCode, fixture.name);
      assert.equal(baseline.output, expectedOutput, fixture.name);
      assert.equal(baseline.errors, expectedError, fixture.name);
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

test('quoted closing delimiters remain values in calls, tuple entries and array/list elements', () => {
  assert.equal(run(`outputLine("(", ")", "]", "}");
    pair := ("(", ")"); array := ["[", "]"];
    list: List<String> = ["[", "]"];
    outputLine(pair.1, array[1], list[1]);`).output, '( ) ] }\n) ] ]\n');
});
test('Lite-written TS emitter produces a deterministic readable reference with no extra source', () => {
  const expected = readFileSync(new URL('../compiler/generated/report-42.ts', import.meta.url), 'utf8');
  assert.deepEqual(runCompiler(tsManifestPath, 'outputLine(42);'), { code: 0, output: expected, errors: '' });
  assert.equal(runCompiler(tsManifestPath, 'outputLine(42);').output, runCompiler(tsManifestPath, 'outputLine(42);').output);
  assert.equal(runCompiler(tsManifestPath, ' outputLine ( +00042 ) ; ').output, expected);
  assert.equal(runCompiler(tsManifestPath, 'outputLine(-000);').output,
    'export function main(lite$write?: (text: string) => void): string {\n    let lite_out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite_out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n    const lite$report0 = (0n).toString();\n    lite$emit(lite$report0 + "\\n");\n    return lite_out;\n}\n');
});
test('Lite-written TS and C compilers sequence multiple report statements deterministically', () => {
  const program = 'outputLine(10);\noutputLine(20);\noutputLine(-30);\n';
  const tsOutput = runCompiler(tsManifestPath, program);
  assert.equal(tsOutput.code, 0); assert.equal(tsOutput.errors, '');
  assert.equal(tsOutput.output, 'export function main(lite$write?: (text: string) => void): string {\n    let lite_out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite_out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n    const lite$report0 = (10n).toString();\n    lite$emit(lite$report0 + "\\n");\n    const lite$report1 = (20n).toString();\n    lite$emit(lite$report1 + "\\n");\n    const lite$report2 = ((-30n)).toString();\n    lite$emit(lite$report2 + "\\n");\n    return lite_out;\n}\n');
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
  const program = 'x := 2 * (3 - 4);\noutputLine(x + 10);\noutputLine(-x);\n';
  assert.deepEqual(runCompiler(tsManifestPath, program), { code: 0, errors: '', output:
    'export function main(lite$write?: (text: string) => void): string {\n    let lite_out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite_out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n' +
    '    const lite_x = (2n * ((3n - 4n)));\n' +
    '    void lite_x;\n' +
    '    const lite$report0 = ((lite_x + 10n)).toString();\n    lite$emit(lite$report0 + "\\n");\n' +
    '    const lite$report1 = ((-lite_x)).toString();\n    lite$emit(lite$report1 + "\\n");\n' +
    '    return lite_out;\n}\n' });
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
    'var a := -7;',
    'var b := 2;',
    'var c := -2;',
    'outputLine(a / b, a % b, a :/ b, a :% b);',
    'outputLine(a / c, a % c, a :/ c, a :% c);',
    'outputLine(7 / c, 7 % c, 7 :/ c, 7 :% c);',
    'var m := -9223372036854775808;',
    'var n := -1;',
    'outputLine(m % n, m :% n);',
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
    'var a := -7;',
    'var b := 2;',
    'var c := -2;',
    'outputLine(a / b, a % b, a :/ b, a :% b);',
    'outputLine(a / c, a % c, a :/ c, a :% c);',
    'outputLine(7 / c, 7 % c, 7 :/ c, 7 :% c);',
    'var m := -9223372036854775808;',
    'var n := -1;',
    'outputLine(m :% n);',
  ].join('\n');
  const c = runCompiler(cManifestPath, source);
  assert.equal(c.code, 0, c.errors);
  assert.deepEqual(runCArtifact(c.output), {
    phase: 'run', status: 0, signal: null,
    stdout: Buffer.from('-3 -1 -4 1\n3 -1 3 -1\n-3 1 -4 -1\n0\n'), stderr: Buffer.alloc(0),
  });
  for (const source of [
    'var x := 1; var y := 0; outputLine(x / y);',
    'var x := 1; var y := 0; outputLine(x % y);',
    'var x := 1; var y := 0; outputLine(x :/ y);',
    'var x := 1; var y := 0; outputLine(x :% y);',
    'var x := -9223372036854775808; outputLine(x / -1);',
    'var x := -9223372036854775808; outputLine(x :/ -1);',
  ]) {
    const compiled = runCompiler(cManifestPath, source);
    assert.equal(compiled.code, 0, compiled.errors);
    const actual = runCArtifact(compiled.output);
    const expected = runText(source);
    assert.equal(expected.status, 1, source);
    assert.equal(actual.phase, 'run');
    assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, source);
  }
});

test('restricted compiler lowers dynamic String concatenation with left-to-right TS evaluation', () => {
  const source = [
    'join := fn (a: String, b: String): String { return a + b; }',
    'var prefix := "lit";',
    'name := "er";',
    'pair := (left = "tu", right = "ple");',
    'values := ["li", "st"];',
    'outputLine(prefix + name);',
    'outputLine(join("fun", "ction"));',
    'outputLine(pair.left + pair.right);',
    'outputLine(values[0] + values[1]);',
    'outputLine("" + prefix + "" + name);',
    'outputLine("snow🙂" + "man");',
    'outputLine("line\\n" + "break");',
    'outputLine("tab\\t" + "stop");',
    'outputLine("quote\\"" + "back\\\\slash");',
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
  const order = runCompiler(tsManifestPath, 'outputLine(textAt("a", 9) + textSlice("a", 0, 9));');
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
    'var prefix := "lit";',
    'name := "er";',
    'outputLine(prefix + name);',
    'outputLine(prefix + name + "!");',
    'outputLine("" + prefix + "");',
    'outputLine("snow🙂" + "man");',
    'outputLine("line\\n" + "break");',
    'outputLine("tab\\t" + "stop");',
    'outputLine("quote\\"" + "back\\\\slash");',
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
  const plain = runCompiler(cManifestPath, 's := "a";\noutputLine(s);\n');
  assert.equal(plain.code, 0, plain.errors);
  assert.equal(plain.output.includes('lite_concat'), false);
  assert.equal(plain.output.includes('#include <stdlib.h>'), false);
});

test('restricted compiler division faults preserve zero divisor and minimum/-1 status and stderr', () => {
  for (const source of [
    'var x := 1; var y := 0; outputLine(x / y);',
    'var x := 1; var y := 0; outputLine(x % y);',
    'var x := 1; var y := 0; outputLine(x :/ y);',
    'var x := 1; var y := 0; outputLine(x :% y);',
    'var x := -9223372036854775808; outputLine(x / -1);',
    'var x := -9223372036854775808; outputLine(x :/ -1);',
  ]) {
    const compiled = runCompiler(tsManifestPath, source);
    assert.equal(compiled.code, 0, compiled.errors);
    const actual = runTsArtifact(compiled.output);
    const expected = runText(source);
    assert.equal(expected.status, 1, source);
    assert.equal(actual.phase, 'run');
    assert.equal(actual.signal, null);
    assert.deepEqual({ status: actual.status, stdout: actual.stdout, stderr: actual.stderr }, expected, source);
  }
});
test('Lite-written TS and C compilers lower String values and multi-value reports deterministically', () => {
  const program = 's := "a\\"b";\noutputLine(s);\noutputLine(1, s, 2);\n';
  assert.deepEqual(runCompiler(tsManifestPath, program), { code: 0, errors: '', output:
    'export function main(lite$write?: (text: string) => void): string {\n    let lite_out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite_out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n' +
    '    const lite_s = "a\\"b";\n' +
    '    void lite_s;\n' +
    '    const lite$report0 = lite_s;\n    lite$emit(lite$report0 + "\\n");\n' +
    '    const lite$report1 = (1n).toString() + " " + lite_s + " " + (2n).toString();\n    lite$emit(lite$report1 + "\\n");\n' +
    '    return lite_out;\n}\n' });
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
    assert.deepEqual(runCompiler(manifest, 'x := loop { 1 };'), {
      code: 2, output: '', errors: '1:6: unsupported feature "loop": see docs/loops.md; ' +
        'the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only\n',
    });
    assert.deepEqual(runCompiler(manifest, 'x := 1;\ny := ;\n'), {
      code: 2, output: '', errors: '2:6: expected an Int, String or Bool expression\n',
    });
  }
});
test('restricted TS compiler emits a deterministic report sequence', () => {
  assert.equal(runCompiler(tsManifestPath, 'outputLine(42);\noutputLine(9);').output,
    'export function main(lite$write?: (text: string) => void): string {\n    let lite_out = "";\n    function lite$emit(text: string): void {\n        if (lite$write === undefined) lite_out += text;\n        else lite$write(text);\n    }\n    void lite$emit;\n    const lite$report0 = (42n).toString();\n    lite$emit(lite$report0 + "\\n");\n    const lite$report1 = (9n).toString();\n    lite$emit(lite$report1 + "\\n");\n    return lite_out;\n}\n');
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
      const expectedOutput = fixture.stdout.toString('utf8');
      const expectedError = fixture.stderr.toString('utf8');
      const baseline = runCompilerFixture(fixture);
      assert.equal(baseline.code, fixture.exitCode, fixture.name);
      assert.equal(baseline.output, expectedOutput, fixture.name);
      assert.equal(baseline.errors, expectedError, fixture.name);
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
test('checked-in TS output and explicit Node adapter typecheck and reproduce the reference bytes', () => {
  const root = new URL('../', import.meta.url).pathname;
  const checked = spawnSync(process.execPath, [join(root, 'igniter/node_modules/typescript/bin/tsc'),
    '-p', join(root, 'igniter/tsconfig.json')], { encoding: 'utf8', timeout: 30000 });
  assert.equal(checked.error, undefined); assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  const result = spawnSync(process.execPath, [join(root, 'compiler/generated/run-report.ts')], { timeout: 5000 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0);
  assert.deepEqual(result.stdout, Buffer.from('42\n')); assert.equal(result.stderr.length, 0);
});

test('Lite-written integer calculator handles precedence, associativity, nesting and unary signs', () => {
  const source = readFileSync(new URL('../examples/016-integer-calculator.lts', import.meta.url), 'utf8');
  for (const [input, expected] of [
    ['2 + 3 * (4 - 1)', 11], ['(2 + 3) * 4', 20], ['20 - 3 - 2', 15],
    ['20 / 3 / 2', 3], ['8 / 3 * 3', 6], ['-7 / 2', -3], ['7 / -2', -3],
    ['2 * -3 + 4', -2], ['--2 + +3', 5], ['-(2 + 3) * 4', -20],
    ['((003))', 3], ['0', 0], ['2\t+\t3', 5], ['9223372036854775807', 9223372036854775807n],
    ['-9223372036854775807 - 1', -9223372036854775808n],
  ] as const) {
    assert.deepEqual(run(source, input), { code: 0, output: `Arithmetic expression:\nresult: ${expected}\n`, errors: '' }, input);
  }
});
test('Lite calculator distinguishes malformed input, unsupported text, EOF and checked arithmetic faults', () => {
  const source = readFileSync(new URL('../examples/016-integer-calculator.lts', import.meta.url), 'utf8');
  for (const input of ['\n', ' \t\n', '1 +', '()', '(1 + 2', '1 2', '1)', '2(3)', '1 ** 2', '/1']) {
    const result = run(source, input);
    assert.equal(result.code, 2, input); assert.equal(result.output, 'Arithmetic expression:\n', input);
    assert.match(result.errors, /expected|unexpected trailing token/, input);
  }
  assert.deepEqual(run(source, '2 + 🙂'), { code: 2, output: 'Arithmetic expression:\n', errors: 'unsupported symbol: 🙂\n' });
  for (const input of ['1 / 0', '9223372036854775807 + 1', '9223372036854775808', '3037000500 * 3037000500']) {
    fault(source, 'ArithmeticPanic', input);
  }
  fault(source, 'InputFault');
});
test('integer calculator runs and checks through the root launcher without extending host syntax', () => {
  const root = new URL('../', import.meta.url).pathname;
  const path = new URL('../examples/016-integer-calculator.lts', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  for (const [input, status, output, pattern] of [
    ['2 + 3 * (4 - 1)', 0, 'Arithmetic expression:\nresult: 11\n', /^$/],
    ['(1 + 2', 2, 'Arithmetic expression:\n', /expected '\)'/],
    ['1 / 0', 1, 'Arithmetic expression:\n', /ArithmeticPanic: division by zero/],
  ] as const) {
    const result = spawnSync(join(root, 'lite'), ['run', path], { input, encoding: 'utf8', env, timeout: 5000 });
    assert.equal(result.error, undefined); assert.equal(result.status, status);
    assert.equal(result.stdout, output); assert.match(result.stderr, pattern);
  }
  const check = spawnSync(join(root, 'lite'), ['run', '--check', path], { encoding: 'utf8', env, timeout: 5000 });
  assert.equal(check.error, undefined); assert.equal(check.status, 0);
  assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
});

test('retained tokenizer returns named token lists, preserving text and rejecting before traversal output', () => {
  const source = readFileSync(new URL('../examples/015-retained-tokens.lts', import.meta.url), 'utf8');
  const prompt = 'Arithmetic expression:\n';
  assert.deepEqual(run(source, '12 + (003 * 4)\n'), { code: 0,
    output: prompt + 'number 12\nsymbol +\nsymbol (\nnumber 003\nsymbol *\nnumber 4\nsymbol )\n', errors: '' });
  assert.equal(run(source, '123').output, prompt + 'number 123\n');
  assert.equal(run(source, ' \t\n').output, prompt);
  assert.equal(run(source, '\n').output, prompt);
  assert.equal(run(source, '-1/2').output, prompt + 'symbol -\nnumber 1\nsymbol /\nnumber 2\n');
  assert.deepEqual(run(source, '12 + 🙂'), { code: 2, output: prompt, errors: 'unsupported symbol: 🙂\n' });
  fault(source, 'InputFault');
});
test('retained tokenizer runs and checks through the root launcher with explicit status and Unicode errors', () => {
  const root = new URL('../', import.meta.url).pathname;
  const path = new URL('../examples/015-retained-tokens.lts', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  for (const [input, status, output, errors] of [
    ['12 + 30', 0, 'Arithmetic expression:\nnumber 12\nsymbol +\nnumber 30\n', ''],
    ['12 + 🙂', 2, 'Arithmetic expression:\n', 'unsupported symbol: 🙂\n'],
    ['\n', 0, 'Arithmetic expression:\n', ''],
  ] as const) {
    const result = spawnSync(join(root, 'lite'), ['run', path], { input, encoding: 'utf8', env, timeout: 5000 });
    assert.equal(result.error, undefined); assert.equal(result.status, status);
    assert.equal(result.stdout, output); assert.equal(result.stderr, errors);
  }
  const check = spawnSync(join(root, 'lite'), ['run', '--check', path], { encoding: 'utf8', env, timeout: 5000 });
  assert.equal(check.error, undefined); assert.equal(check.status, 0);
  assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
});

test('typed list construction supports known empty elements and preserves the fixed-array default', () => {
  assert.equal(run(`empty: mut List<Int>=[]; push_back(mut empty, 7); outputLine(empty[0]);
    floats: List<Float> = [1.5]; text: List<String> = ["tea"]; flags: List<Bool> = [true];
    units: mut List<Unit> = [(), Unit]; outputLine(floats[0], text[0], flags[0], pop_back(mut units));
    fixed := [3, 4]; outputLine(fixed.1);`).output, '7\n1.5 tea true Unit\n4\n');
  fault('fixed := [1]; list: List<Int> = fixed;', 'TypeError');
  fault('list: List<Int> = [1]; f := fn(a: [Int; 1]): Int { a[0] } f(list);', 'TypeError');
  fault('[];', 'TypeError');
});
test('both list ends preserve element order, duplicate occurrences and direct pop values', () => {
  assert.equal(run(`values: mut List<Int> = []; outputLine(push_back(mut values, 2));
    push_front(mut values, 1); push_back(mut values, 2); push_front(mut values, 0);
    loop values as item { outputLine(item); }
    outputLine(pop_front(mut values), pop_back(mut values), pop_back(mut values), pop_front(mut values));
    loop values { outputLine("unexpected"); }`).output, 'Unit\n0\n1\n2\n2\n0 2 2 1\n');
});
test('list copies and typed mutable receiving copies remain independent under end operations', () => {
  assert.equal(run(`var original: mut List<Int> = [1, 2]; saved := original;
    editable: mut List<Int> = original; push_front(mut editable, 8);
    push_back(mut original, 3); outputLine(pop_front(mut original));
    original = editable; push_back(mut original, 9);
    outputLine(saved[0], saved[1], editable[0], editable[2], original[3]);`).output,
    '1\n1 2 8 2 9\n');
});
test('list arguments and results retain evaluated snapshots through later argument mutation', () => {
  assert.equal(run(`values: mut List<Int> = [1, 2];
    keep := fn(items: List<Int>, ignored: Unit): List<Int> { items }
    saved := keep(values, push_front(mut values, 9));
    returned: mut List<Int> = saved; push_back(mut returned, 3);
    outputLine(values[0], saved[0], saved[1], returned[2]);
    make := fn(): List<Int> { local: mut List<Int> = []; push_back(mut local, 6); local }
    outputLine(make()[0]);`).output, '9 1 2 3\n6\n');
});
test('flat tuple list elements preserve labels, positional shape and popped copies', () => {
  assert.equal(run(`tokens: mut List<(kind: String, text: String)> = [];
    kind := "number"; text := "12"; push_back(mut tokens, (=kind, =text));
    push_front(mut tokens, (kind = "symbol", text = "+"));
    first := pop_front(mut tokens); outputLine(first.kind, first.text, tokens[0].text);
    mixed: List<(:Int, text: String)> = [(7, text = "tea")];
    loop mixed as pair { (number, word) := pair; outputLine(number, word); }`).output,
    'symbol + 12\n7 tea\n');
  fault('tokens: mut List<(kind: String)> = []; push_back(mut tokens, (text = "wrong"));', 'TypeError');
});
test('list construction, supplied elements and indexed receivers evaluate once in written order', () => {
  assert.equal(run(`values: mut List<Int> = [({outputLine("first"); 1}), ({outputLine("second"); 2})];
    push_back(mut values, ({outputLine("supplied"); inputInt("value: ")}));
    source := fn(items: List<Int>): List<Int> { outputLine("receiver"); items }
    outputLine(source(values)[({outputLine("index"); 2})]);`, '7').output,
    'first\nsecond\nsupplied\nvalue: receiver\nindex\n7\n');
});
test('list traversal evaluates a source snapshot once while original end mutations remain independent', () => {
  assert.equal(run(`values: mut List<Int> = [1, 2];
    source := fn(items: List<Int>): List<Int> { outputLine("source"); items }
    loop source(values) as item { outputLine(item); push_back(mut values, item + 10); }
    loop values as item { if item == 2 { continue; } outputLine(item); if item == 11 { break; } }
    outputLine(values[3]);`).output, 'source\n1\n2\n1\n11\n12\n');
});
test('list mutation grants follow lexical slots and never silently capture surrounding runtime data', () => {
  assert.equal(run(`values: mut List<Int> = [1];
    { push_back(mut values, 2); values: mut List<Int> = [9]; push_front(mut values, 8); outputLine(values[0]); }
    outputLine(values[1]);
    f := fn(): Int { local: mut List<Int> = [3]; push_back(mut local, 4); pop_back(mut local) }
    outputLine(f());`).output, '8\n2\n4\n');
  fault('values: mut List<Int> = []; f := fn(): Unit { push_back(mut values, 1); }', 'TypeError');
});
test('list bounds and empty pops are located terminal BoundPanic failures', () => {
  for (const code of [
    'values: List<Int> = [1]; values[-1];',
    'values: List<Int> = [1]; values[1];',
    'values: List<Int> = [1]; values[9223372036854775807];',
    'values: List<Int> = []; values[0];',
    'values: mut List<Int> = []; pop_front(mut values);',
    'values: mut List<Int> = [1]; pop_back(mut values); pop_back(mut values);',
  ]) {
    assert.throws(() => run(code), (error: unknown) => error instanceof LiteFault &&
      error.category === 'BoundPanic' && error.at.line === 1 && error.at.column > 0, code);
  }
});
test('faults and exits during list preparation stop later effects and invocation', () => {
  assert.deepEqual(run(`values: mut List<Int> = [];
    push_back(mut values, ({outputLine("supplied"); exit(7); 1})); outputLine("later");`),
    { code: 7, output: 'supplied\n', errors: '' });
  assert.deepEqual(run(`values: List<Int> = [({outputLine("first"); exit(6); 1}), ({outputLine("later"); 2})];`),
    { code: 6, output: 'first\n', errors: '' });
  let observed = '';
  assert.throws(() => execute(compile(`values: mut List<Int> = []; pop_back(mut values); outputLine("later");`), {
    read: () => null, report: text => { observed += text; }, reportError: () => {},
  }), LiteFault);
  assert.equal(observed, '');
});
test('invalid list contracts, grants and unsupported aliasing fail before any input or output', () => {
  for (const code of [
    'values: mut List<Int> = []; push_back(values, 1);',
    'values: List<Int> = []; push_back(mut values, 1);',
    'var values: List<Int> = []; push_back(mut values, 1);',
    'values: mut List<Int> = []; copy := values; push_back(mut copy, 1);',
    'values: mut List<Int> = []; values = values;',
    'values: mut List<Int> = []; push_back(mut values, "wrong");',
    'values: List<Int> = [true];', 'values: List<Int> = [1.0];',
    'values: List<List<Int>> = [];', 'values: [List<Int>; 1] = [];',
    'values: List<Int> = [1]; values.0;', 'values: List<Int> = [1]; values[true];',
    'values: List<Int> = [1]; values == values;',
    'values: mut List<Int> = []; push_back(target = mut values, value = 1);',
    'values: mut List<Int> = []; push_back(mut values);',
    'values: mut List<Int> = []; pop_front(mut values, 1);',
    'values: mut List<Int> = []; push_back(mut missing, 1);',
    'values: mut List<Int> = []; push_back(mut values[0], 1);',
    'values: mut List<Int> = []; outputLine(mut values);',
    'f := fn(a: List<Int>): Unit {} values: mut List<Int> = []; f(mut values);',
    'values: mut List<Int> = [1]; push_back(mut values, values[0]);',
    'values: mut List<Int> = [1]; push_back(mut values, pop_back(mut values));',
    'a: mut List<Int> = []; b: mut List<Int> = [1]; push_back(mut a, pop_front(mut b));',
    'var values: mut List<Int> = [1]; push_back(mut values, ({other: List<Int> = [2]; values = other; 7}));',
  ]) {
    let observed = false;
    assert.throws(() => execute(compile(`outputLine("before"); ${code}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; },
      reportError: () => { observed = true; },
    }), LiteFault, code);
    assert.equal(observed, false, code);
  }
});
test('growable list example runs and checks through the launcher with runtime fault diagnostics', () => {
  const root = new URL('../', import.meta.url).pathname;
  const example = new URL('../examples/013-growable-lists.lts', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  for (const check of [false, true]) {
    const result = spawnSync(join(root, 'lite'), ['run', ...(check ? ['--check'] : []), example], { encoding: 'utf8', env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, check ? '' : '0 3\n1\n2\n'); assert.equal(result.stderr, '');
  }
  const directory = mkdtempSync(join(tmpdir(), 'lite-list-'));
  try {
    const path = join(directory, 'empty.lts');
    writeFileSync(path, 'values: mut List<Int> = []; pop_back(mut values);');
    const result = spawnSync(join(root, 'lite'), ['run', path], { encoding: 'utf8', env });
    assert.equal(result.status, 1); assert.equal(result.stdout, '');
    assert.match(result.stderr, /empty\.lts:1:\d+: BoundPanic: pop_back on an empty list/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('named calls route interleaved positional entries into the next unfilled slot', () => {
  assert.equal(run(`op := fn(a: Int, b: Int, c: Int): Int { a * 100 + b * 10 + c }
    b := 2; outputLine(op(c = 3, 1, =b), op(9, a = 1, 2, 3), op(c = 3, b = 2, a = 1));
    outputLine := fn(value: Int): Int { value + 1 }
    result := outputLine(value = 7);
    output := fn(v: Int): Int { v } output(v = result);`).output, '123 123 123\n');
});
test('named call replacement checks only surviving slot types but evaluates every supplied expression', () => {
  assert.equal(run(`take := fn(a: Int, b: Int): Int { outputLine("body"); a * 10 + b }
    outputLine(take(({outputLine("old"); "superseded"}), b = ({outputLine("b"); 2}), a = ({outputLine("a"); 1})));`).output,
    'old\nb\na\nbody\n12\n');
  fault('take := fn(a: Int): Int { a } take(unknown, a = 1);', 'TypeError');
  fault('take := fn(a: Int): Int { a } take(1, a = "bad");', 'TypeError');
});
test('named call arguments retain callee-before-arguments selection and stop on exits or faults', () => {
  assert.equal(run(`var op := fn(a: Int, b: Int): Int { a + b }
    outputLine(op(b = ({op = fn(a: Int, b: Int): Int { a * b } 3}), a = 2));
    outputLine(op(a = 2, b = 3));`).output, '5\n6\n');
  assert.deepEqual(run(`op := fn(a: Int, b: Int): Int { outputLine("body"); 0 }
    op(b = ({outputLine("first"); exit(7); 1}), a = ({outputLine("later"); 2}));`),
    { code: 7, output: 'first\n', errors: '' });
  let output = '';
  assert.throws(() => execute(compile(`op := fn(a: Int): Int { outputLine("body"); a }
    op(1 / 0, a = ({outputLine("later"); 2}));`), {
    read: () => null, report: text => { output += text; }, reportError: () => {},
  }), LiteFault);
  assert.equal(output, '');
});
test('named recursive calls and aggregate arguments preserve public labels and stored tuple contracts', () => {
  assert.equal(run(`sum := fn(n: Int, total: Int): Int {
      if n == 0 { return total; } self(total = total + n, n = n - 1)
    }
    consume := fn(values: [Int; 2], pair: (:Int, label: String)): Int { values[0] + pair.0 }
    outputLine(sum(total = 0, n = 4), consume(pair = (3, label = "tea"), values = [7, 8]));`).output,
    '10 10\n');
  fault('f := fn(pair: (x: Int)): Int { pair.x } stored := (y = 1); f(pair = stored);', 'TypeError');
});
test('invalid named mappings and unsupported builtin labels fail before effects', () => {
  for (const code of [
    'f := fn(a: Int, b: Int): Int { a } f(a = 1, a = 2, b = 3);',
    'f := fn(a: Int): Int { a } a := 1; f(a = 2, =a);',
    'f := fn(a: Int): Int { a } f(z = 1);',
    'f := fn(a: Int, b: Int): Int { a } f(b = 2);',
    'f := fn(a: Int): Int { a } f(a = 1, 2);',
    'f := fn(): Int { 0 } f(a = 1);',
    'outputLine(value = 1);', 'inputInt(prompt = "Age: ");',
  ]) {
    let observed = false;
    assert.throws(() => execute(compile(`outputLine("before"); ${code}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; },
      reportError: () => { observed = true; },
    }), LiteFault);
    assert.equal(observed, false, code);
  }
});
test('indexed named argument example executes and checks through the root launcher', () => {
  const root = new URL('../', import.meta.url).pathname;
  const path = new URL('../examples/012-named-arguments.lts', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  for (const check of [false, true]) {
    const result = spawnSync(join(root, 'lite'), ['run', ...(check ? ['--check'] : []), path], { encoding: 'utf8', env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, check ? '' : '123\n123\n10\n');
    assert.equal(result.stderr, '');
  }
});

test('typed tuple receiving declarations rename positions without reordering source values', () => {
  assert.equal(run(`stored := (r = 20, l = 10); renamed: (l: Int, r: Int) = stored;
    plain: (:Int, :Int) = renamed; mixed: (:Int, last: Int) = plain;
    outputLine(stored.r, stored.l, renamed.l, renamed.r, mixed.0, mixed.last);`).output,
    '20 10 20 10 20 10\n');
});
test('typed tuple declarations evaluate once and preserve source copies and old shadow targets', () => {
  assert.equal(run(`var original := (a = 1, b = 2);
    var renamed: (x: Int, y: Int) = ({outputLine("source"); original});
    original = (a = 3, b = 4); renamed = (x = 5, y = 6);
    renamed: (left: Int, right: Int) = renamed;
    outputLine(original.a, renamed.left, renamed.right);
    boxed := (v = Unit); unit: (:Unit,) = boxed; outputLine(unit.0);`).output,
    'source\n3 5 6\nUnit\n');
});
test('typed tuple conversions produce ordinary label-sensitive values usable in calls and arrays', () => {
  assert.equal(run(`size := (width = 7, height = 9); point: (x: Int, y: Int) = size;
    take := fn(p: (x: Int, y: Int)): Int { p.x + p.y }
    copies := [point, point]; outputLine(take(copies[0]));
    make := fn(): (x: Int, y: Int) { source := (7, 9); result: (x: Int, y: Int) = source; result }
    outputLine(take(make()));`).output, '16\n16\n');
  for (const code of [
    'source := (a = 1); renamed: (x: Int) = source; var target := renamed; target = source;',
    'source := (a = 1); renamed: (x: Int) = source; source.x;',
    'source := (a = 1); renamed: (x: Int) = source; renamed = renamed;',
  ]) fault(code, 'TypeError');
});
test('typed tuple conversion rejects incompatible shapes and types before effects', () => {
  for (const code of [
    'source := (1, 2); target: (x: Int) = source;',
    'source := (1, "two"); target: (x: String, y: Int) = source;',
    'source := (1,); target: (x: Float) = source;',
    'source := 1; target: (x: Int) = source;',
    'source := [1]; target: (x: Int) = source;',
    'source := (); target: (x: Unit) = source;',
    'target: (x: Int) = (missing = 1);',
  ]) {
    let observed = false;
    assert.throws(() => execute(compile(`outputLine("before"); ${code}`), {
      read: () => null, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), LiteFault);
    assert.equal(observed, false, code);
  }
  assert.throws(() => compile('target: (x: Int, y: Int) = (y = 2, x = 1);'),
    (error: unknown) => error instanceof LiteFault && error.message.includes('contextual tuple constructor routing'));
  assert.equal(run('target: (x: Int) = (x = 3); outputLine(target.x);').output, '3\n');
});
test('indexed typed tuple conversion example runs and checks through the launcher', () => {
  const root = new URL('../', import.meta.url).pathname;
  const path = new URL('../examples/011-tuple-label-conversion.lts', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  for (const check of [false, true]) {
    const result = spawnSync(join(root, 'lite'), ['run', ...(check ? ['--check'] : []), path], { encoding: 'utf8', env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, check ? '' : '640 480\n640 480\n640 480\n');
    assert.equal(result.stderr, '');
  }
});

test('mixed tuples preserve interleaved positions, shorthand and source evaluation order', () => {
  assert.equal(run(`tea := "green";
    value := (({outputLine("first"); 7}), =tea, cups = ({outputLine("third"); 2}), true);
    outputLine(value.0, value.tea, value.2, value.3);
    (a, b, c, d) := value; outputLine(a, b, c, d);`).output,
    'first\nthird\n7 green 2 true\n7 green 2 true\n');
});
test('mixed tuple copies, function contracts and homogeneous arrays retain labels and order', () => {
  assert.equal(run(`var value := (1, name = "first", false); saved := value;
    value = (2, name = "second", true);
    identity := fn(v: (:Int, name: String, :Bool)): (:Int, name: String, :Bool) { v }
    items := [identity(saved), value];
    loop items as item { outputLine(item.0, item.name, item.2); }`).output,
    '1 first false\n2 second true\n');
});
test('mixed tuple identity rejects label movement, duplication and unknown fields before effects', () => {
  for (const code of [
    'var a := (1, x = 2); a = (x = 1, 2);',
    'f := fn(v: (:Int, x: Int)): Int { v.x } a := (1, y = 2); f(a);',
    'a := [(1, x = 2), (x = 1, 2)];',
    'a := (1, x = 2, x = 3);',
    'f := fn(v: (x: Int, :Int, x: Int)): Int { 0 }',
    'a := (1, x = 2); a.missing;',
  ]) {
    let observed = false;
    assert.throws(() => execute(compile(`outputLine("before"); ${code}`), {
      read: () => null, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), LiteFault);
    assert.equal(observed, false, code);
  }
});
test('indexed mixed tuple example executes and checks without effects', () => {
  const root = new URL('../', import.meta.url).pathname;
  const path = new URL('../examples/010-mixed-tuples.lts', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  for (const check of [false, true]) {
    const result = spawnSync(join(root, 'lite'), ['run', ...(check ? ['--check'] : []), path], { encoding: 'utf8', env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, check ? '' : '7 green 2 true\n7 green 2 true\n');
    assert.equal(result.stderr, '');
  }
});

test('first checkpoint: stdin integers, mutation, arithmetic and explicit report', () => {
  const code = readFileSync(new URL('../examples/001-double-sum.lts', import.meta.url), 'utf8');
  assert.deepEqual(run(code, '7\n5\n'), { code: 0, output: 'First integer: Second integer: 24\n', errors: '' });
  assert.equal(run(code.replace('outputLine(total);', ''), '7\n5\n').output, 'First integer: Second integer: ');
});
test('Unit completion and no automatic binding/expression output', () => {
  for (const code of ['', ';;;;', 'x := 3;', '12;', 'x := 3; x']) assert.equal(run(code).output, '');
  assert.equal(run('outputLine(()); outputLine(Unit);').output, 'Unit\nUnit\n');
});
test('shadowing retains earlier copies; same-name initializer sees previous binding', () => {
  assert.equal(run('var x := 2; saved := x; x = 3; x := x + 4; outputLine(saved); outputLine(x);').output, '2\n7\n');
});
test('all syntax/name/type checking precedes input or output', () => {
  for (const code of ['outputLine(1); unknown;', 'outputLine(1); x := 1; x = 2;',
    'outputLine(1); var x := 1; x = "text";', 'outputLine(1); loop 3 {}',
    'outputLine(1); x := 2\ny := 3;', 'outputLine(1); outputLine(inputInt(1));']) {
    let observed = false;
    assert.throws(() => {
      const program = compile(code);
      execute(program, { read: () => { observed = true; return null; },
        report: () => { observed = true; }, reportError: () => { observed = true; } });
    }, LiteFault);
    assert.equal(observed, false, code);
  }
});
test('builtin spelling can be shadowed without calling hidden implementation', () => {
  assert.equal(run('outputLine := 3; outputLine').output, '');
  fault('inputInt := 3; outputLine(inputInt());', 'TypeError');
});
test('precedence, exact integer division and fractional mixed division', () => {
  assert.equal(run('outputLine(2 + 3 * 4); outputLine((2 + 3) * 4); outputLine(-7/2); outputLine(7.0/2);').output,
    '14\n20\n-3\n3.5\n');
  assert.equal(run('outputLine(9223372036854775807 / 3);').output, '3074457345618258602\n');
  assert.equal(run('outputLine(-9223372036854775808);').output, '-9223372036854775808\n');
});
test('truncating remainder follows the dividend and rejects zero or Float', () => {
  assert.equal(run('outputLine(7 % 3); outputLine(-7 % 3); outputLine(7 % -3); outputLine(6 % 3);').output,
    '1\n-1\n1\n0\n');
  assert.equal(run('outputLine(9223372036854775807 % 2);').output, '1\n');
  fault('outputLine(5 % 0);', 'ArithmeticPanic');
  fault('outputLine(5.0 % 2.0);', 'TypeError');
  fault('outputLine(5 % 2.0);', 'TypeError');
});
test('floor division, floor modulo and compound updates follow documented signs', () => {
  assert.equal(run('outputLine(7 :/ 3); outputLine(-7 :/ 3); outputLine(7 :/ -3); outputLine(-7 :/ -3);').output,
    '2\n-3\n-3\n2\n');
  assert.equal(run('outputLine(7 :% 3); outputLine(-7 :% 3); outputLine(7 :% -3); outputLine(-7 :% -3);').output,
    '1\n2\n-2\n-1\n');
  assert.equal(run('var x := 10; x += 5; x -= 3; x *= 2; x /= 4; x %= 3; outputLine(x);').output, '0\n');
  assert.equal(run('var s := "a"; s += "b"; outputLine(s);').output, 'ab\n');
  assert.equal(run('var y := -7; y :/= 2; outputLine(y); y :%= 3; outputLine(y);').output, '-4\n2\n');
  assert.equal(run('a := 7; outputLine(a:/2); outputLine(a :/ 2); outputLine(a:%2); outputLine(a :% 2);').output,
    '3\n3\n1\n1\n');
  assert.equal(run('var b := 7; b:/=2; outputLine(b); b:%=2; outputLine(b);').output, '3\n1\n');
  fault('outputLine(5 :/ 0);', 'ArithmeticPanic');
  fault('outputLine(5 :% 0);', 'ArithmeticPanic');
  fault('outputLine(5.0 :/ 2.0);', 'TypeError');
  fault('x := 1; x += 1;', 'TypeError');
  fault('var x := 1; x += "a";', 'TypeError');
});
test('inferred mut and var mut declarations grant writable list access', () => {
  assert.equal(run('mut args := inputArgs(); push_back(mut args, "z"); outputLine(args[0], args[2]);',
    'unread', ['a', 'b']).output, 'a z\n');
  assert.equal(run('var mut args := inputArgs(); args = inputArgs(); push_front(mut args, "z"); outputLine(args[0], args[2]);',
    'unread', ['a', 'b']).output, 'z b\n');
  fault('mut x := 1;', 'TypeError');
  fault('mut args := inputArgs(); args = inputArgs();', 'TypeError');
  fault('var mut x: List<Int> = [1];', 'SourceError');
  fault('var mut args := inputArgs(); args = 1;', 'TypeError');
});
test('power is right-associative, Float-default and positive-exponent only', () => {
  assert.equal(run('outputLine(2 ** 3); outputLine(2 ** 3 ** 2); outputLine(4 ** 0.5); outputLine((-2) ** 3); outputLine(-(2 ** 2)); outputLine(2 ** 3 + 0.5);').output,
    '8\n512\n2\n-8\n-4\n8.5\n');
  fault('outputLine(-2 ** 2);', 'SourceError');
  fault('outputLine(2 ** 0);', 'ArithmeticPanic');
  fault('outputLine(2 ** -1);', 'ArithmeticPanic');
  fault('outputLine("a" ** 2);', 'TypeError');
  fault('outputLine(2 ** "a");', 'TypeError');
  assert.equal(run('outputLine(2 ** 3 * 2);').output, '16\n');
});
test('subjectless match selects the first true arm and requires a final fallback', () => {
  assert.equal(run('x := 2; label := match { x == 1 { "one" } x == 2 { "two" } _ { "other" } } outputLine(label);').output,
    'two\n');
  assert.equal(run('match { false { outputLine("no"); } true { outputLine("yes"); } _ { outputLine("other"); } }').output,
    'yes\n');
  fault('match { true { 1 } }', 'TypeError');
  fault('match { _ { 1 } true { 2 } }', 'TypeError');
  fault('match { 1 { 2 } _ { 3 } }', 'TypeError');
  fault('label := match { true { 1 } _ { "x" } }', 'TypeError');
  fault('match true { _ { 1 } }', 'SourceError');
});
test('typed scalar, tuple and fixed-array declarations initialize or zero-initialize', () => {
  assert.equal(run('a: Int; b: Float; c: String; d: Bool; e: Unit; f: (:Int, :String); g: [Int; 2]; outputLine(a, b, c, d, e, f.0, f.1, g[0], g[1]);').output,
    '0 0  false Unit 0  0 0\n');
  assert.equal(run('x: Int = 7; outputLine(x);').output, '7\n');
  assert.equal(run('var x: Int; x = 5; outputLine(x);').output, '5\n');
  fault('x: Int = "a";', 'TypeError');
  fault('l: List<Int>;', 'TypeError');
  fault('x: [Int; 2] = [1];', 'TypeError');
});
test('reserved storage initializes once and rejects reads before its first whole-value write', () => {
  assert.equal(run('x: Int = ?; x = 74; outputLine(x);').output, '74\n');
  assert.equal(run('var y: Int = ?; y = 1; y = 2; outputLine(y);').output, '2\n');
  assert.equal(run('pair: (:Int, :String) = ?; pair = (1, "a"); outputLine(pair.0, pair.1);').output, '1 a\n');
  assert.equal(run('values: [Int; 2] = ?; values = [3, 4]; outputLine(values[0], values[1]);').output, '3 4\n');
  assert.equal(run('x: Int = ?; { x = 5; } outputLine(x);').output, '5\n');
  assert.equal(run('loop { x: Int = ?; x = 1; outputLine(x); break }').output, '1\n');
  assert.equal(run('pick := fn(): Int { var n: Int = ?; n = 3; n } outputLine(pick());').output, '3\n');
  fault('x: Int = ?; outputLine(x);', 'TypeError');
  fault('x: Int = ?; y := x;', 'TypeError');
  fault('x: Int = ?; x += 1;', 'TypeError');
  fault('x: Int = ?; x = 1; x = 2;', 'TypeError');
  fault('x: Int = ?; x = "a";', 'TypeError');
  fault('x: List<Int> = ?;', 'TypeError');
  fault('x := ?;', 'SourceError');
});
test('reserved storage requires initialization on every path that reaches a read', () => {
  assert.equal(run('x: Int = ?; if 1 < 2 { x = 1 } else { x = 2 } outputLine(x);').output, '1\n');
  assert.equal(run('x: Int = ?; if 1 < 2 { x = 1 } else { exit(0) } outputLine(x);').output, '1\n');
  assert.equal(run('x: Int = ?; match { 1 < 2 { x = 1 } _ { x = 2 } } outputLine(x);').output, '1\n');
  fault('x: Int = ?; if 1 < 2 { x = 1 } outputLine(x);', 'TypeError');
  fault('x: Int = ?; if 1 < 2 { x = 1 } x = 2;', 'TypeError');
  fault('x: Int = ?; loop { x = 1; break } x = 2;', 'TypeError');
  fault('x: Int = ?; loop { x = 1; break } outputLine(x);', 'TypeError');
  fault('x: Int = ?; match { 1 < 2 { x = 1 } _ { outputLine("no"); } } outputLine(x);', 'TypeError');
});
test('loops accumulate typed .value and an optional then completion', () => {
  assert.equal(run('sum := loop [1, 2, 3] as n { .value + n }; outputLine(sum);').output, '6\n');
  assert.equal(run('last := loop [1, 2, 3] as n { n * 2 }; outputLine(last);').output, '6\n');
  assert.equal(run('skipped := loop [1, 2, 3] as n { if n == 2 { continue; } .value + n }; outputLine(skipped);').output, '4\n');
  assert.equal(run('stopped := loop [1, 2, 3] as n { if n == 2 { break; } .value + n }; outputLine(stopped);').output, '1\n');
  assert.equal(run('empty := loop inputArgs() as a { 1 }; outputLine(empty);').output, '0\n');
  assert.equal(run('loop [1, 2] as n { n } then { outputLine(.count); outputLine(.value); } outputLine("after");').output,
    '2\n2\nafter\n');
  assert.equal(run('counted := loop [1, 2, 3] as n { n } then { .count }; outputLine(counted);').output, '3\n');
  assert.equal(run('label := loop [1, 2, 3] as n { n } then { "done" }; outputLine(label);').output, 'done\n');
  assert.equal(run('x := loop [1] as n { outputLine(n); }; outputLine(x);').output, '1\nUnit\n');
  assert.equal(run('loop [1, 2] { outputLine("tick"); } then { outputLine("done"); }').output, 'tick\ntick\ndone\n');
  fault('sum := loop { .value + 1 };', 'TypeError');
  fault('outputLine(.value);', 'TypeError');
  assert.equal(run('loop [1, 2] as n { outputLine(.count); }').output, '1\n2\n');
  fault('loop [1] as a { loop [2] as b { .value } }', 'TypeError');
  fault('loop [1] as n { f := fn(): Int { .value }; f() }', 'TypeError');
  fault('x: Int = loop [1] as n { "s" };', 'TypeError');
  fault('x: Int = loop [1] as n { n } then { "s" };', 'TypeError');
  assert.equal(run('x := loop [1, 2] as n { n } then { .item }; outputLine(x);').output, '2\n');
  assert.equal(run('x := loop inputArgs() as a { 1 } then { .item }; outputLine("[" + x + "]");').output, '[]\n');
  fault('loop true { outputLine(1); } then { .index };', 'TypeError');
});
test('loop metadata, payload exits and tagged targets complete loops', () => {
  assert.equal(run('loop [10, 20] as n { outputLine(.item, .index, .count); }').output, '10 0 1\n20 1 2\n');
  assert.equal(run('a := loop [5, 6] as n { n } then { outputLine(.item, .index, .count); .item }; outputLine(a);').output,
    '6 1 2\n6\n');
  assert.equal(run('x := loop [1, 2, 3] as n { if n == 2 { break 20 } n } then { .value }; outputLine(x);').output, '20\n');
  assert.equal(run('y := loop [1, 2, 3] as n { if n == 2 { continue 50 } n } then { .value }; outputLine(y);').output, '3\n');
  assert.equal(run('x := loop [1, 2] as n { break 5 }; outputLine(x);').output, '5\n');
  assert.equal(run('z := @outer loop [1, 2] as n { loop [1] as m { if n == 1 { break @outer 9 } } .value + n } then { .value }; outputLine(z);').output, '9\n');
  assert.equal(run('w := @scan loop [1, 2] as n { loop [1] as m { if n == 1 { continue @scan 7 } } .value + n } then { .value }; outputLine(w);').output, '9\n');
  assert.equal(run('v := @o loop [1, 2] as n { loop [1] as m { if n == 1 { return @o 42 } } .value + n } then { .value }; outputLine(v);').output, '42\n');
  assert.equal(run('loop true { outputLine(.item); break; }').output, 'Unit\n');
  assert.equal(run('x := loop inputArgs() as a { 1 } then { outputLine(.count, .index); .item }; outputLine("[" + x + "]");').output,
    '0 0\n[]\n');
  assert.equal(run('x := @scan loop [1, 2] as n { loop [1] { outputLine(@scan.value); } .value + n } then { .value }; outputLine(x);').output,
    '0\n1\n3\n');
  fault('loop true { outputLine(1); } then { .index };', 'TypeError');
  fault('loop { break 3; }', 'TypeError');
  fault('outputLine(.value);', 'TypeError');
  fault('loop [1] as a { loop [2] as b { .value } }', 'TypeError');
  fault('break @missing 1;', 'TypeError');
  fault('continue @scan.value;', 'SourceError');
});
test('construct-level finally runs after then and on every exit', () => {
  assert.equal(run('loop [1, 2] as n { outputLine(.count); } then { outputLine("then"); } finally { outputLine("finally"); }').output,
    '1\n2\nthen\nfinally\n');
  assert.equal(run('if 1 < 2 { outputLine("body"); } finally { outputLine("cleanup"); }').output, 'body\ncleanup\n');
  assert.equal(run('x := if true { 1 } else { 2 } finally { outputLine("cond-finally"); } outputLine(x);').output,
    'cond-finally\n1\n');
  assert.equal(run('f := fn(): Int { loop [1] { return 5 } finally { outputLine("return-cleanup"); } 0 } outputLine(f());').output,
    'return-cleanup\n5\n');
  assert.equal(run('g := fn(): Int { @o loop [1] as n { loop [1] { break @o 7 } finally { outputLine("inner-finally"); } .value + n } then { .value } finally { outputLine("outer-finally"); } 0 } outputLine(g());').output,
    'inner-finally\nouter-finally\n0\n');
  const exited = run('if true { exit(0) } finally { outputLine("exit-cleanup"); } outputLine("unreachable");');
  assert.equal(exited.code, 0);
  assert.equal(exited.output, 'exit-cleanup\n');
  let output = '';
  assert.throws(() => execute(compile('loop [1] { 1 / 0 } finally { outputLine("fault-cleanup"); }'), {
    read: () => null, report: text => { output += text; }, reportError: () => {},
  }), (error: unknown) => error instanceof LiteFault && error.category === 'ArithmeticPanic');
  assert.equal(output, 'fault-cleanup\n');
});
test('numeric widths promote, widen losslessly and range-check', () => {
  assert.equal(run('a: Int8 = 127; b: Int16 = 32767; c: Int32 = 2147483647; outputLine(a, b, c);').output,
    '127 32767 2147483647\n');
  assert.equal(run('i: Int64 = 5; f: Float64 = 2.5; d: Double = 3.5; outputLine(i, f, d);').output, '5 2.5 3.5\n');
  assert.equal(run('a: Int8 = 100; b: Int16 = 200; outputLine(a + b);').output, '300\n');
  assert.equal(run('a: Int8 = 127; y := a + 1; outputLine(y);').output, '128\n');
  assert.equal(run('a: Float32 = 0.1; outputLine(a);').output, '0.10000000149011612\n');
  assert.equal(run('b: Float32 = 0.1; c: Float = 1.5; outputLine(b + c);').output, '1.6000000014901161\n');
  assert.equal(run('a: Int8 = 3; f: Float32 = a; g: Float = a; outputLine(f, g);').output, '3 3\n');
  assert.equal(run('h: Float32 = 0.5; j: Float = h; outputLine(j);').output, '0.5\n');
  assert.equal(run('k: Float = 2; outputLine(k);').output, '2\n');
  assert.equal(run('z8: Int8; zf: Float32; outputLine(z8, zf);').output, '0 0\n');
  assert.equal(run('f := fn(x: Int8): Float32 { x } outputLine(f(3));').output, '3\n');
  assert.equal(run('kg: Int8 = 5; base: Float = 1.2; outputLine(base + kg);').output, '6.2\n');
  assert.equal(run('kg: Int8 = 5; base: Float32 = 1.5; outputLine(kg + base);').output, '6.5\n');
  assert.equal(run('outputLine(1.2 + 5); outputLine(5 + 1.2);').output, '6.2\n6.2\n');
  fault('x: Int8 = 128;', 'SourceError');
  fault('x: Int16 = 32768;', 'SourceError');
  fault('x: Int8 = 12345;', 'SourceError');
  fault('x: Float32 = 16777217;', 'SourceError');
  fault('i16: Int16 = 5; x: Int8 = i16;', 'TypeError');
  fault('i64: Int = 5; x: Float = i64;', 'TypeError');
  fault('a: Int8 = 100; outputLine(a + a);', 'ArithmeticPanic');
  fault('a: Float32 = 3e38; b: Float32 = 3e38; outputLine(a * b);', 'ArithmeticPanic');
});
test('integer arithmetic cannot silently wrap', () => {
  for (const code of ['outputLine(9223372036854775807 + 1);', 'outputLine(-9223372036854775808 - 1);',
    'outputLine(9223372036854775807 * 2);', 'var x := -9223372036854775808; outputLine(-x);',
    'outputLine(-9223372036854775808 / -1);']) fault(code, 'ArithmeticPanic');
  fault('x := 9223372036854775808;', 'SourceError');
  fault('x := -9223372036854775809;', 'SourceError');
});
test('zero divisors, non-finite results, and literals fault', () => {
  for (const code of ['outputLine(1/0);', 'outputLine(1.0 / 0);', 'outputLine(1.0 / -0.0);',
    'outputLine(1e308 * 2.0);']) fault(code, 'ArithmeticPanic');
  fault('outputLine(1e999);', 'SourceError');
  assert.equal(run('outputLine(1 + 2.0); outputLine(2.0 + 1);').output, '3\n3\n');
});
test('direct input faults instead of retrying or fabricating values', () => {
  for (const input of ['', 'hello', '12.5', '9223372036854775808']) fault('outputLine(inputInt());', 'InputFault', input);
  for (const input of ['', 'nan', 'Infinity', '1e999', '.5', '0x10']) fault('outputLine(inputFloat());', 'InputFault', input);
  fault('outputLine(inputWord());', 'InputFault', ' \t\n');
  assert.equal(run('outputLine(inputInt()); outputLine(inputFloat());', '-12 +2.5').output, '-12\n2.5\n');
});
test('line/word input, empty lines, unterminated final lines, Unicode, and shared cursor', () => {
  assert.equal(run('outputLine(inputLine());', '\n').output, '\n');
  assert.equal(run('outputLine(inputLine());', 'سلام\r\n').output, 'سلام\n');
  assert.equal(run('outputLine(inputLine());', 'final').output, 'final\n');
  fault('outputLine(inputLine());', 'InputFault');
  assert.equal(run('outputLine(inputWord()); outputLine(inputWord());', ' سلام  world ').output, 'سلام\nworld\n');
  assert.equal(run('outputLine(inputInt()); outputLine(inputLine()); outputLine(inputLine());', '12\nnext\n').output, '12\n\nnext\n');
});
test('text tokens are data, including keyword and punctuation lookalikes', () => {
  assert.equal(run('outputLine("var"); outputLine(";"); outputLine("+"); outputLine("(");').output, 'var\n;\n+\n(\n');
  assert.equal(run('سلام := "Hi, " "🌍"; outputLine(سلام); outputLine("first\\nsecond");').output,
    'Hi, 🌍\nfirst\nsecond\n');
  fault('outputLine("bad\\q");', 'SourceError');
});
test('nested/raw comments do not create code or separators', () => {
  assert.equal(run('/* outer /* inner */ /*# unmatched /* #*/ end */ outputLine(3);').output, '3\n');
  assert.equal(run('/*## #*/ is content ##*/ outputLine(4);').output, '4\n');
  fault('/*# ##*/', 'SourceError');
  fault('/* unclosed', 'SourceError');
  fault('outputLine(1) /* comment */ outputLine(2)', 'SourceError');
});
test('reportError is report-only and exit explicitly prevents continuation', () => {
  assert.deepEqual(run('reportError("error"); outputLine("fallback");'),
    { code: 0, output: 'fallback\n', errors: 'error\n' });
  assert.deepEqual(run('outputLine(7); exit(9); outputLine(8);'), { code: 9, output: '7\n', errors: '' });
  assert.equal(run('exit(); outputLine(1);').code, 0);
  fault('exit(256);', 'TypeError');
});
test('existing lessons remain unchanged and execute within the supported subset', () => {
  const cases = [
    ['001_add_two_numbers.lts', 'outputLine(apples);', '12\n'],
    ['002_arithmetic_operations.lts', 'outputLine(sum); outputLine(difference); outputLine(product); outputLine(quotient);', '9\n5\n14\n3\n'],
    ['020_swap_values.lts', 'outputLine(first_box); outputLine(second_box);', '3\n7\n'],
  ];
  for (const [file, observation, expected] of cases) {
    if (file === undefined || observation === undefined || expected === undefined) throw new Error('bad fixture');
    const source = readFileSync(new URL(`../samples/${file}`, import.meta.url), 'utf8');
    assert.equal(run(source).output, '');
    assert.equal(run(source + '\n' + observation).output, expected);
  }
});
test('CLI: direct TS run, exact statuses, source locations, and check-only mode', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lite-igniter-'));
  const path = join(dir, 'probe.lts');
  const cli = new URL('./cli.ts', import.meta.url);
  const invoke = (source: string, input = '', check = false) => {
    writeFileSync(path, source);
    return spawnSync(process.execPath, [cli.pathname, ...(check ? ['--check'] : []), path], { input, encoding: 'utf8' });
  };
  try {
    assert.equal(invoke('outputLine(inputInt() * 2);', '12').stdout, '24\n');
    const bad = invoke('number := inputInt();\noutputLine(number);', 'bad');
    assert.equal(bad.status, 1); assert.match(bad.stderr, /:1:11: InputFault:/); assert.equal(bad.stdout, '');
    assert.equal(invoke('exit(7);').status, 7);
    const check = invoke('outputLine(inputInt());', '', true);
    assert.equal(check.status, 0); assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
    writeFileSync(path, Buffer.from([0xff]));
    assert.equal(spawnSync(process.execPath, [cli.pathname, path]).status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Bool values and complete same-type conditional expressions', () => {
  assert.equal(run('var ready := true; ready = false; outputLine(ready);').output, 'false\n');
  assert.equal(run('x := if false { 1 } else if true { 2 } else { 3 } outputLine(x);').output, '2\n');
  assert.equal(run('outputLine((if true { 2 } else { 3 }) + 4);').output, '6\n');
  assert.equal(run('outputLine(if true { if false { "wrong" } else { "right" } } else { "wrong" });').output, 'right\n');
  assert.equal(run('outputLine(if true { x := 1; } else { y := 2; });').output, 'Unit\n');
});
test('only the selected branch executes; action conditionals may omit else', () => {
  assert.equal(run('if false { outputLine(1 / 0); } if true { outputLine(7); }').output, '7\n');
  assert.equal(run('if true { outputLine(3); } else { outputLine(inputInt()); }').output, '3\n');
  assert.equal(run('if false { exit(5); } outputLine(8);').output, '8\n');
  assert.equal(run('if true { exit(5); } outputLine(8);').code, 5);
  const code = readFileSync(new URL('../examples/002-decisions.lts', import.meta.url), 'utf8');
  assert.equal(run(code, '0').output, 'Integer: zero\nbetween zero and nine\n');
  assert.equal(run(code, '5').output, 'Integer: positive\nbetween zero and nine\nquotient exceeds five\n');
});
test('blocks and branches have lexical scope, scalar results, and Unit declaration tails', () => {
  assert.equal(run('var x := 1; if true { x = 2; x := 8; outputLine(x); } outputLine(x);').output, '8\n2\n');
  assert.equal(run('x := { y := 2; y * 3;;;; } outputLine(x);').output, '6\n');
  assert.equal(run('outputLine({ x := 3; }); outputLine({});').output, 'Unit\nUnit\n');
  assert.equal(run('{ x := 3; x; }').output, '');
  fault('if true { local := 4; } outputLine(local);', 'TypeError');
  fault('x := { local := 4; local } outputLine(local);', 'TypeError');
  fault('x := if true { local := 4; local } else { local };', 'TypeError');
});
test('truthiness, branch unions, partial value conditionals and malformed branches are rejected', () => {
  for (const code of ['if 1 { outputLine(1); }', 'if "yes" {}', 'outputLine(1 and true);', 'outputLine(not 1);',
    'outputLine(true + 1);', 'x := if true { 1 } else { "one" };', 'outputLine(if true { 1 });',
    'x := if true { "a" } else { 1 };']) fault(code, 'TypeError');
  for (const code of ['if true outputLine(1);', 'if true {} else outputLine(2);', 'if true {',
    'if true {}; else {}', 'var true := 1;']) fault(code, 'SourceError');
  let output = '';
  assert.throws(() => execute(compile('outputLine(1); if false { missing; }'), {
    read: () => null, report: text => { output += text; }, reportError: () => {},
  }), LiteFault);
  assert.equal(output, '');
});
test('partial conditionals give declarations a default and skip false assignment writes', () => {
  assert.equal(run('x := if false { 5 }; outputLine(x);').output, '0\n');
  assert.equal(run('x := if 1 < 2 { 5 }; outputLine(x);').output, '5\n');
  assert.equal(run('x: Int = if false { 5 }; outputLine(x);').output, '0\n');
  assert.equal(run('x: String = if false { "a" }; outputLine("[" + x + "]");').output, '[]\n');
  assert.equal(run('i := if false { inputInt() }; outputLine(i);', '9').output, '0\n');
  assert.equal(run('var x := 3; x = if false { 4 }; outputLine(x);').output, '3\n');
  assert.equal(run('var x := 3; x = if true { 4 }; outputLine(x);').output, '4\n');
  assert.equal(run('var x := 0; x = if true { outputLine("yes"); 2 }; outputLine(x);').output, 'yes\n2\n');
  assert.equal(run('flag := true; a := if flag { 5 }; var b := 0; if flag { b = 5 } outputLine(a, b);').output, '5 5\n');
  assert.equal(run('flag := false; a := if flag { 5 }; var b := 0; if flag { b = 5 } outputLine(a, b);').output, '0 0\n');
  assert.equal(run('var a := 10; var b := 10; flag := false; a = if flag { 7 }; if flag { b = 7 } outputLine(a, b);').output,
    '10 10\n');
  assert.equal(run('var a := 10; var b := 10; flag := true; a = if flag { 7 }; if flag { b = 7 } outputLine(a, b);').output,
    '7 7\n');
  assert.equal(run('a := if inputInt() > 0 { 5 }; outputLine(a, inputInt());', '7 9').output, '5 9\n');
  assert.equal(run('var a := 0; a = if inputInt() > 0 { 5 }; outputLine(a, inputInt());', '7 9').output, '5 9\n');
  fault('x := if true { if true { 1 } };', 'TypeError');
  fault('f := fn(): Int { if true { 1 } }', 'TypeError');
  fault('x := if true { exit(0) };', 'TypeError');
  fault('x: Int = if true { "a" };', 'TypeError');
});
test('short-circuit logic preserves operand order and Bool-only conditions', () => {
  assert.equal(run('outputLine(false and inputInt() > 0); outputLine(true or inputInt() > 0); outputLine(inputInt());', '9').output,
    'false\ntrue\n9\n');
  assert.equal(run('outputLine(true or false and false); outputLine(not 0 < 2 < 3); outputLine((not false) and true);').output,
    'true\nfalse\ntrue\n');
  assert.equal(run('outputLine(and true and false); outputLine(or false or true); if and true { outputLine(3); }').output,
    'false\ntrue\n3\n');
  for (const code of ['outputLine(and or true);', 'outputLine(true and and false);', 'outputLine(or);']) fault(code, 'SourceError');
  for (const code of ['outputLine(and 3);', 'x := or "text";', 'outputLine((and Unit));']) fault(code, 'TypeError');
  fault('outputLine(true or missing);', 'TypeError');
});
test('comparison chains retain the middle value once and skip later operands', () => {
  assert.equal(run('outputLine(0 < inputInt() < 10); outputLine(inputInt());', '5 77').output, 'true\n77\n');
  assert.equal(run('outputLine(10 < inputInt() < inputInt()); outputLine(inputInt());', '5 77').output, 'false\n77\n');
  assert.equal(run('outputLine(3 < 2 < (1 / 0));').output, 'false\n');
  assert.equal(run('outputLine(1 < 3 > 2); outputLine((1 < 2) == true); outputLine(1 == 1 == 1);').output, 'true\ntrue\ntrue\n');
  assert.equal(run('var middle := 5; outputLine(0 < middle < ({ middle = 100; 10 })); outputLine(middle);').output,
    'true\n100\n');
  fault('outputLine(3 < 2 < "bad");', 'TypeError');
  fault('outputLine(1 < true);', 'TypeError');
});
test('all ten comparison operators complement their adjacent positive form', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['2 == 2', 'true'], ['2 =!= 2', 'false'], ['1 < 2', 'true'], ['1 <! 2', 'false'],
    ['2 <= 2', 'true'], ['2 <!= 2', 'false'], ['3 > 2', 'true'], ['3 >! 2', 'false'],
    ['2 >= 2', 'true'], ['2 >!= 2', 'false'], ['2 >! 3 < 4', 'true'],
    ['1.0 < 2.0 <= 2.0', 'true'], ['9223372036854775806 < 9223372036854775807', 'true'],
    ['"سلام" == "سلام"', 'true'], ['true =!= false', 'true'], ['() == Unit', 'true'],
  ];
  for (const [expression, expected] of cases) assert.equal(run(`outputLine(${expression});`).output, `${expected}\n`, expression);
  assert.equal(run('outputLine(1 == 1.0); outputLine(2 < 1.5);').output, 'true\nfalse\n');
  fault('outputLine("a" < "b");', 'TypeError');
});

test('Boolean loops test before entry and reevaluate the header after each body', () => {
  assert.equal(run('loop false { outputLine(inputInt()); } outputLine(8);').output, '8\n');
  assert.equal(run('var i := 0; var sum := 0; loop i < 5 { i = i + 1; sum = sum + i; } outputLine(sum);').output, '15\n');
  assert.equal(run('loop and inputInt() > 0 { outputLine(1); } outputLine(inputInt());', '2 1 0 99').output, '1\n1\n99\n');
  assert.equal(run('loop ({ loop { break; } inputInt() > 0 }) { outputLine(7); }', '1 0').output, '7\n');
});
test('continue skips the body tail and reevaluates the condition', () => {
  assert.equal(run('loop inputInt() > 0 { if inputInt() == 2 { continue; } outputLine(7); } outputLine(inputInt());',
    '1 2 1 3 0 99').output, '7\n99\n');
  assert.equal(run('var i := 0; var sum := 0; loop i < 5 { i = i + 1; if i < 3 { continue; } sum = sum + i; } outputLine(sum);').output, '12\n');
});
test('bare break ends the nearest loop without rechecking its condition', () => {
  assert.equal(run('loop inputInt() > 0 { break; } outputLine(inputInt());', '1 8').output, '8\n');
  assert.equal(run('loop { if true { break; } outputLine(1 / 0); } outputLine(3);').output, '3\n');
  assert.equal(run('var outer := 0; var entries := 0; loop outer < 3 { outer = outer + 1; var inner := 0; loop true { inner = inner + 1; entries = entries + 1; if inner == 2 { break; } } } outputLine(entries);').output, '6\n');
});
test('nested continue stays in the inner loop and execution resumes after it', () => {
  assert.equal(run('var outer := 0; var total := 0; loop outer < 2 { outer = outer + 1; var inner := 0; loop inner < 3 { inner = inner + 1; if inner < 3 { continue; } total = total + 1; } total = total + 10; } outputLine(total);').output, '22\n');
});
test('body locals initialize on every entry; header and outer shadows keep their bindings', () => {
  assert.equal(run('var i := 0; var sum := 0; loop i < 3 { i = i + 1; var local := 0; local = local + 1; sum = sum + local; } outputLine(sum);').output, '3\n');
  assert.equal(run('var i := 0; loop i < 2 { i = i + 1; i := 10; outputLine(i); } outputLine(i);').output, '10\n10\n2\n');
  fault('loop false { local := 7; } outputLine(local);', 'TypeError');
});
test('loops reject invalid sources, escaping controls, and value/completion forms before effects', () => {
  for (const code of ['loop 1 {}', 'loop "items" {}', 'break;', 'continue;',
    'if false { break; }',
    'loop false { missing; }', 'loop false { var x := 1; x = true; }',
    'loop { break 3; }', 'loop { continue 3; }']) fault(code, 'TypeError');
  fault('loop { loop ({ break; true }) {} break; }', 'TypeError');
  fault('loop { loop ({ continue; false }) {} break; }', 'TypeError');
  for (const code of ['loop true outputLine(1);', 'loop false {} finally 1;', 'var break := 1;']) fault(code, 'SourceError');
  let output = '';
  assert.throws(() => execute(compile('outputLine(1); loop false { continue; missing; }'), {
    read: () => null, report: text => { output += text; }, reportError: () => {},
  }), LiteFault);
  assert.equal(output, '');
});
test('program exit and runtime faults propagate through nested loops', () => {
  assert.deepEqual(run('loop { loop { reportError("stop"); exit(9); } outputLine(8); } outputLine(7);'),
    { code: 9, output: '', errors: 'stop\n' });
  fault('loop { loop { outputLine(1 / 0); } }', 'ArithmeticPanic');
  fault('loop { outputLine(inputInt()); }', 'InputFault', '');
});
test('sentinel-input sum example runs through the real CLI', () => {
  const example = new URL('../examples/003-sum-positive.lts', import.meta.url);
  const source = readFileSync(example, 'utf8');
  const prompt = 'Integer (0 to finish): ';
  assert.equal(run(source, '3 -2 4 0').output, prompt.repeat(4) + '7\n');
  assert.equal(run(source, '0').output, prompt + '0\n');
  const result = spawnSync(process.execPath, [new URL('./cli.ts', import.meta.url).pathname, example.pathname], {
    input: '3\n-2\n4\n0\n', encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, prompt.repeat(4) + '7\n');
  assert.equal(result.stderr, '');
});

test('typed functions accept scalar inputs and yield tail or explicit results without automatic output', () => {
  assert.equal(run(`double := fn(n: Int): Int { n * 2 }
    twice := fn(n: Float): Float { return n * 2.0; }
    echo := fn(text: String): String { text }
    negate := fn(flag: Bool): Bool { not flag }
    nothing := fn(u: Unit): Unit { return; }
    outputLine(double(4)); outputLine(twice(1.5)); outputLine(echo("hello"));
    outputLine(negate(false)); outputLine(nothing(())); double(99);`).output, '8\n3\nhello\ntrue\nUnit\n');
  assert.equal(run('action := fn(): Unit {} action();').output, '');
});
test('ordinary function values copy, shadow helpers, and replace only compatible var bindings', () => {
  assert.equal(run(`var op := fn(n: Int): Int { n * 2 }
    saved := op;
    op = fn(n: Int): Int { n * 3 }
    outputLine(saved(4)); outputLine(op(4));
    inputInt := fn(): Int { 7 }
    outputLine(inputInt());`).output, '8\n12\n7\n');
  fault('op := fn(): Int { 1 } op = fn(): Int { 2 }', 'TypeError');
  fault('var op := fn(n: Int): Int { n } op = fn(n: Float): Int { 1 }', 'TypeError');
  fault('var op := fn(n: Int): Int { n } op = fn(x: Int): Int { x }', 'TypeError');
});
test('calls select the callee once before arguments and evaluate arguments left to right', () => {
  assert.equal(run(`var op := fn(n: Int): Int { n * 2 }
    outputLine(op(({ op = fn(n: Int): Int { n * 3 } 4 })));
    outputLine(op(4));
    combine := fn(a: Int, b: Int): Int { a * 10 + b }
    outputLine(combine(({outputLine(1); inputInt()}), ({outputLine(2); inputInt()})));`, '3 4').output,
    '8\n12\n1\n2\n34\n');
});
test('self recursion and direct own-name recursion keep separate call locals', () => {
  assert.equal(run(`fib := fn(n: Int): Int {
      if n < 2 { return n; }
      left := self(n - 1);
      left + self(n - 2)
    }
    factorial := fn(n: Int): Int { if n <= 1 { 1 } else { n * factorial(n - 1) } }
    outputLine(fib(8)); outputLine(factorial(5)); outputLine(fib(6));`).output, '21\n120\n8\n');
});
test('parameters, local vars and block shadows belong to each invocation', () => {
  assert.equal(run(`sum := fn(n: Int): Int {
      var total := 0;
      { n := 100; outputLine(n); }
      var i := 0;
      loop i < n { i = i + 1; total = total + i; }
      total
    }
    outputLine(sum(3)); outputLine(sum(1));`).output, '100\n6\n100\n1\n');
  fault('f := fn(n: Int): Int { n = 2; n }', 'TypeError');
  fault('f := fn(): Int { local := 7; local } outputLine(local);', 'TypeError');
});
test('an earlier same-name helper remains the ordinary named recursion target', () => {
  assert.equal(run(`step := fn(n: Int): Int { n * 2 }
    step := fn(n: Int): Int { if n == 0 { 0 } else { step(n - 1) } }
    outputLine(step(3));
    step := fn(n: Int): Int { if n == 0 { 0 } else { self(n - 1) } }
    outputLine(step(3));`).output, '4\n0\n');
});
test('self calls retain the executing implementation after its source binding is replaced', () => {
  assert.equal(run(`var step := fn(n: Int): Int { if n == 0 { 0 } else { 1 + self(n - 1) } }
    saved := step;
    step = fn(n: Int): Int { 100 }
    outputLine(saved(4)); outputLine(step(4));`).output, '4\n100\n');
});
test('admitted helper references read live bindings and ignore later shadows', () => {
  assert.equal(run(`var double := fn(n: Int): Int { n * 2 }
    quadruple := fn(n: Int): Int { double(double(n)) }
    outputLine(quadruple(1));
    double = fn(n: Int): Int { n * 3 }
    outputLine(quadruple(1));
    double := fn(n: Int): Int { n * 4 }
    outputLine(quadruple(1)); outputLine(double(1));`).output, '4\n9\n9\n4\n');
});
test('escaped helpers preserve distinct environments from repeated block activations', () => {
  assert.equal(run(`var first := fn(n: Int): Int { n }
    var second := fn(n: Int): Int { n }
    var i := 0;
    loop i < 2 {
      var helper := fn(n: Int): Int { n * 2 }
      wrapper := fn(n: Int): Int { helper(n) }
      if i == 0 {
        first = wrapper;
        helper = fn(n: Int): Int { n * 3 }
      } else {
        second = wrapper;
        helper = fn(n: Int): Int { n * 4 }
      }
      i = i + 1;
    }
    outputLine(first(2)); outputLine(second(2));`).output, '6\n8\n');
});
test('return exits the nearest function through loops and nested calls return locally', () => {
  assert.equal(run(`inner := fn(): Int { return 7; }
    outer := fn(flag: Bool): Int {
      loop flag { return inner(); }
      if flag { return 1; } else { return 2; }
      999
    }
    outputLine(outer(true)); outputLine(outer(false));
    stop := fn(): Unit { loop { return; } () }
    loop { stop(); outputLine(3); break; }`).output, '7\n2\n3\n');
  fault('loop { f := fn(): Unit { break; } break; }', 'TypeError');
  fault('loop { f := fn(): Unit { continue; } break; }', 'TypeError');
});
test('exit, input faults and arithmetic faults propagate through user functions', () => {
  assert.deepEqual(run('stop := fn(): Int { exit(9); } loop { outputLine(stop()); }'), { code: 9, output: '', errors: '' });
  fault('f := fn(): Int { inputInt() } outputLine(f());', 'InputFault');
  fault('f := fn(n: Int): Int { 1 / n } outputLine(f(0));', 'ArithmeticPanic');
});
test('invalid signatures, captures, forward references and unsupported forms fail before effects', () => {
  for (const code of [
    'return 1;', 'self();', 'f := fn(): Int { "wrong" }',
    'f := fn(): Int { return; }', 'f := fn(): Int { if false { return "wrong"; } 1 }',
    'f := fn(n: Int): Int { n } f();', 'f := fn(n: Int): Int { n } f(true);',
    'f := fn(): Int { g() } g := fn(): Int { 7 }',
    'x := 2; f := fn(): Int { x }',
    'var x := 2; f := fn(): Unit { x = 3; }',
    'f := fn(n: Int): Int { g := fn(): Int { n } g() }',
    'f := fn(): Int { 1 } outputLine(f);', 'f := fn(): Int { 1 } outputLine(f == f);',
    'f := fn(n: Number): Int { 1 }', 'f := fn(): Int { self }',
  ]) {
    let observed = false;
    assert.throws(() => execute(compile(`outputLine(99); ${code}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), (error: unknown) => error instanceof LiteFault && error.category === 'TypeError', code);
    assert.equal(observed, false, code);
  }
  for (const code of ['f := fn(n: Int, n: Int): Int { n }', 'f := fn(self: Int): Int { 1 }',
    'self := 1;', 'f := fn(n): Int { n }', 'f := fn(n: Int = 2): Int { n }']) fault(code, 'SourceError');
});
test('factorial example runs through real CLI with checked results and failures', () => {
  const example = new URL('../examples/004-factorial.lts', import.meta.url);
  const source = readFileSync(example, 'utf8');
  assert.equal(run(source, '0').output, 'Nonnegative integer: 1\n');
  assert.equal(run(source, '5').output, 'Nonnegative integer: 120\n');
  fault(source, 'ArithmeticPanic', '21');
  for (const [input, status, output, errors] of [
    ['5', 0, 'Nonnegative integer: 120\n', ''],
    ['-1', 2, 'Nonnegative integer: ', 'expected a nonnegative integer\n'],
  ]) {
    if (typeof input !== 'string') throw new Error('bad fixture');
    const result = spawnSync(process.execPath, [new URL('./cli.ts', import.meta.url).pathname, example.pathname], {
      input, encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, status); assert.equal(result.stdout, output); assert.equal(result.stderr, errors);
  }
});

test('computed String concatenation preserves contents and ordinary value copies', () => {
  assert.equal(run(`var prefix := "hello";
    saved := prefix + ", " + "سلام🙂";
    prefix = "changed";
    outputLine(saved); outputLine("" + prefix + "");
    outputLine("line\n" + "two");`).output, 'hello, سلام🙂\nchanged\nline\ntwo\n');
  for (const code of ['outputLine("x" + 1);', 'outputLine(1 + "x");', 'outputLine("x" - "y");',
    'outputLine("x" * 2);', 'outputLine(+"x");']) fault(code, 'TypeError');
});
test('text helpers use consistent code-point positions without normalization or grapheme grouping', () => {
  assert.equal(run(`text := "A🙂éسلام";
    outputLine(textLength(text)); outputLine(textAt(text, 1)); outputLine(textAt(text, 3));
    outputLine(textSlice(text, 0, 2)); outputLine(textSlice(text, 2, 4));
    outputLine(textSlice(text, 4, 8)); outputLine(textLength(""));
    outputLine(textLength("é")); outputLine(textLength("é"));`).output,
    '8\n🙂\ń\nA🙂\né\nسلام\n0\n1\n2\n');
  assert.equal(run('outputLine(textAt("🙂", 0)); outputLine(textLength("👩‍💻"));').output, '🙂\n3\n');
});
test('textSlice admits empty and full half-open intervals, including the end of empty text', () => {
  assert.equal(run(`outputLine(textSlice("", 0, 0));
    outputLine(textSlice("abc", 0, 0)); outputLine(textSlice("abc", 3, 3));
    outputLine(textSlice("abc", 0, 3)); outputLine(textSlice("abc", 1, 2));
    source := "a🙂b";
    copy := textSlice(source, 0, 1) + textSlice(source, 1, 3);
    outputLine(copy == source);`).output, '\n\n\nabc\nb\ntrue\n');
});
test('invalid text positions fault without negative wrapping, clamping or huge-index rounding', () => {
  for (const code of ['textAt("", 0);', 'textAt("abc", -1);', 'textAt("abc", 3);',
    'textAt("🙂", 1);', 'textAt("abc", 9223372036854775807);',
    'textSlice("abc", -1, 2);', 'textSlice("abc", 2, 1);', 'textSlice("abc", 0, 4);',
    'textSlice("abc", 4, 4);', 'textSlice("", 0, 1);',
    'textSlice("abc", 0, 9223372036854775807);']) fault(code, 'BoundPanic');
});
test('text operands and helper arguments execute once in written order before bounds checks', () => {
  assert.equal(run(`outputLine(({outputLine(1); inputWord()}) + ({outputLine(2); inputWord()}));
    outputLine(textSlice(({outputLine(3); inputWord()}), ({outputLine(4); 1}), ({outputLine(5); 3})));`,
  'hello world abcde').output, '1\n2\nhelloworld\n3\n4\n5\nbc\n');
  let observed = '';
  assert.throws(() => execute(compile('textSlice("abc", ({outputLine(1); -1}), ({outputLine(2); 2}));'), {
    read: () => null, report: text => { observed += text; }, reportError: () => {},
  }), (error: unknown) => error instanceof LiteFault && error.category === 'BoundPanic');
  assert.equal(observed, '1\n2\n');
});
test('text signatures are checked before effects and temporary helper names can be shadowed', () => {
  for (const code of ['textLength();', 'textLength("a", 1);', 'textLength(1);',
    'textAt("a");', 'textAt("a", 0.0);', 'textAt(true, 0);',
    'textSlice("a", 0);', 'textSlice("a", false, 1);', 'textSlice("a", 0, "1");',
    'f := fn(): Int { 1 } textLength(f);', 'textLength := 1; textLength("a");']) {
    let observed = false;
    assert.throws(() => execute(compile(`outputLine(99); ${code}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), (error: unknown) => error instanceof LiteFault && error.category === 'TypeError', code);
    assert.equal(observed, false, code);
  }
  assert.equal(run('textLength := fn(text: String): Int { 7 } outputLine(textLength("abc"));').output, '7\n');
});
test('a Lite function can scan and reconstruct text recursively with the temporary helpers', () => {
  assert.equal(run(`reverse := fn(text: String): String {
      length := textLength(text);
      if length == 0 { return ""; }
      textAt(text, length - 1) + self(textSlice(text, 0, length - 1))
    }
    outputLine(reverse("a🙂ب")); outputLine(reverse(""));`).output, 'ب🙂a\n\n');
});
test('Lite arithmetic tokenizer handles final digits, whitespace, punctuation and explicit rejection', () => {
  const source = readFileSync(new URL('../examples/005-scan-arithmetic.lts', import.meta.url), 'utf8');
  const prompt = 'Arithmetic expression:\n';
  assert.equal(run(source, '12 + (003 * 4)\n').output,
    prompt + 'number: 12\nsymbol: +\nsymbol: (\nnumber: 003\nsymbol: *\nnumber: 4\nsymbol: )\n');
  assert.equal(run(source, '123').output, prompt + 'number: 123\n');
  assert.equal(run(source, ' \t\n').output, prompt);
  assert.equal(run(source, '\n').output, prompt);
  assert.equal(run(source, '-1/2').output, prompt + 'symbol: -\nnumber: 1\nsymbol: /\nnumber: 2\n');
  assert.deepEqual(run(source, '🙂'), { code: 2, output: prompt, errors: 'unsupported symbol: 🙂\n' });
  fault(source, 'InputFault');
});
test('real CLI runs the Lite tokenizer, preserves supplementary text, and reports bounds locations', () => {
  const cli = new URL('./cli.ts', import.meta.url).pathname;
  const example = new URL('../examples/005-scan-arithmetic.lts', import.meta.url).pathname;
  for (const [input, status, output, errors] of [
    ['12 + 30', 0, 'Arithmetic expression:\nnumber: 12\nsymbol: +\nnumber: 30\n', ''],
    ['🙂', 2, 'Arithmetic expression:\n', 'unsupported symbol: 🙂\n'],
  ]) {
    if (typeof input !== 'string') throw new Error('bad fixture');
    const result = spawnSync(process.execPath, [cli, example], { input, encoding: 'utf8', timeout: 5000 });
    assert.equal(result.error, undefined); assert.equal(result.status, status);
    assert.equal(result.stdout, output); assert.equal(result.stderr, errors);
  }
  const dir = mkdtempSync(join(tmpdir(), 'lite-text-'));
  const path = join(dir, 'probe.lts');
  try {
    writeFileSync(path, 'outputLine(textLength(inputLine())); outputLine(textAt("🙂", 0));');
    const valid = spawnSync(process.execPath, [cli, path], { input: 'a🙂ب\n', encoding: 'utf8', timeout: 5000 });
    assert.equal(valid.error, undefined); assert.equal(valid.status, 0);
    assert.equal(valid.stdout, '3\n🙂\n'); assert.equal(valid.stderr, '');
    writeFileSync(path, 'textAt("🙂", 1);');
    const check = spawnSync(process.execPath, [cli, '--check', path], { encoding: 'utf8', timeout: 5000 });
    assert.equal(check.error, undefined); assert.equal(check.status, 0);
    assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
    const invalid = spawnSync(process.execPath, [cli, path], { encoding: 'utf8', timeout: 5000 });
    assert.equal(invalid.error, undefined); assert.equal(invalid.status, 1);
    assert.equal(invalid.stdout, ''); assert.match(invalid.stderr, /:1:1: BoundPanic:/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('flat fixed tuple construction and positional reads retain heterogeneous scalar types', () => {
  assert.equal(run(`values := (7, 2.5, "tea", true, Unit);
    outputLine(values.0 + 1); outputLine(values.1); outputLine(values.2); outputLine(not values.3); outputLine(values.4);
    outputLine((1, 2,).1); outputLine(-(3, 4).0);`).output, '8\n2.5\ntea\nfalse\nUnit\n2\n-3\n');
  assert.equal(run('pair := (1, 2); pair;').output, '');
});
test('tuple expressions and receivers evaluate once in written order', () => {
  assert.equal(run(`pair := (({outputLine(1); inputInt()}), ({outputLine(2); inputInt()}));
    outputLine(pair.0); outputLine(pair.1);
    make := fn(): (:Int, :Int) { outputLine(3); (8, 9) }
    (a, b) := make(); outputLine(a); outputLine(b); outputLine(make().1);`, '4 5').output,
    '1\n2\n4\n5\n3\n8\n9\n3\n9\n');
});
test('Unit, grouping, singleton tuples and Unit-valued positions keep distinct shapes', () => {
  assert.equal(run(`one := (42,); (whole) := one; (value,) := one;
    outputLine(whole.0); outputLine(value);
    unitBox := (Unit,); outputLine(unitBox.0);
    () := (); () := Unit;
    action := fn(): () { outputLine(7); () }
    () := action();
    takeUnit := fn(value: (Unit)): Int { 9 }
    outputLine(takeUnit(()));`).output, '42\n42\nUnit\n7\n9\n');
  for (const source of ['(value,) := 42;', 'value := (42); outputLine(value.0);',
    '() := 42;', '() := (Unit,);', 'outputLine(().0);',
    'f := fn(value: Unit): Unit { value } f();',
    'f := fn(box: (:Unit,)): Unit { box.0 } f(());']) fault(source, 'TypeError');
});
test('destructuring resolves the source first, then shadows receiver names in written order', () => {
  assert.equal(run(`x := 7; y := 9;
    (x, y) := (y, x); outputLine(x); outputLine(y);
    (x, x) := (1, "last"); outputLine(x);
    (_, _) := (3, "visible"); outputLine(_);
    ((whole)) := (4, 5); outputLine(whole.1);
    (a, (b)) := (6, 7); outputLine(a); outputLine(b);`).output, '9\n7\nlast\nvisible\n5\n6\n7\n');
  assert.equal(run('outputLine({ (a, b) := (1, 2); });').output, 'Unit\n');
  fault('{ (a, b) := (1, 2); } outputLine(a);', 'TypeError');
  fault('(a, b) := (a, 2);', 'TypeError');
});
test('ordinary tuple copies survive whole-value var replacement and later shadows', () => {
  assert.equal(run(`var pair := (1, "first");
    saved := pair; (count, text) := pair;
    pair = (2, "second");
    pair := (3, "third");
    outputLine(saved.0); outputLine(saved.1); outputLine(count); outputLine(text); outputLine(pair.1);`).output,
    '1\nfirst\n1\nfirst\nthird\n');
  fault('pair := (1, 2); pair = (3, 4);', 'TypeError');
  fault('var pair := (1, 2); pair = (3, "wrong");', 'TypeError');
  fault('var pair := (1, 2); pair = (3,);', 'TypeError');
});
test('explicit tuple inputs and outputs support tail returns, early returns and compatible replacement', () => {
  assert.equal(run(`var make := fn(n: Int): (:Int, :String) { (n, "first") }
    make = fn(n: Int): (:Int, :String) { if n < 0 { return (0, "negative"); } (n, "normal") }
    describe := fn(pair: (:Int, :String)): String { pair.1 }
    outputLine(describe(make(7))); outputLine(describe(make(-1)));
    one := fn(n: Int): (:Int,) { (n,) }
    takeOne := fn(pair: (:Int,)): Int { pair.0 }
    outputLine(takeOne(one(8)));
    outputLine((if true { (1, "yes") } else { (2, "no") }).1);`).output, 'normal\nnegative\n8\nyes\n');
  fault('one := fn(): (:Int,) { 42 }', 'TypeError');
  fault('one := fn(): Int { (42,) }', 'TypeError');
  fault('make := fn(): (:Int, :String) { return (1, false); }', 'TypeError');
});
test('a tuple is one ordinary call argument and is copied at its evaluation position', () => {
  assert.equal(run(`var pair := (10, 11);
    first := fn(original: (:Int, :Int), ignored: Unit): Int { original.0 }
    outputLine(first(pair, ({pair = (20, 30); Unit}))); outputLine(pair.0);
    combine := fn(a: Int, b: Int): Int { a + b }
    outputLine(combine(pair.0, pair.1));`).output, '10\n20\n50\n');
  fault('f := fn(pair: (:Int, :Int)): Int { pair.0 } f(1, 2);', 'TypeError');
  fault('f := fn(a: Int, b: Int): Int { a + b } f((1, 2));', 'TypeError');
});
test('tuple parameters and destructured locals remain separate across recursive calls', () => {
  assert.equal(run(`sum := fn(pair: (:Int, :Int)): Int {
      (n, extra) := pair;
      if n == 0 { return extra; }
      saved := n;
      saved + self((n - 1, extra))
    }
    outputLine(sum((4, 7))); outputLine(sum((2, 1)));`).output, '17\n4\n');
  fault('pair := (1, 2); f := fn(): Int { pair.0 }', 'TypeError');
});
test('invalid tuple shapes, positions and transfers fail before any input or output', () => {
  for (const source of ['(a, b) := (1,);', '(a,) := ();',
    'pair := (1, 2); pair.2;', 'pair := (1, 2); pair.9223372036854775807;',
    'f := fn(pair: (:Int, :String)): String { pair.1 } f((1, true));',
    'pair := (1, 2); outputLine(pair == pair);',
    'pair := (1, 2); pair();', 'textLength((1, 2));',
    'f := fn(): Int { 1 } value := (f,);', 'value := ((1, 2), 3);',
    'f := fn(): (:Int, :(:Int, :Int)) { (1, 2) }']) {
    let observed = false;
    assert.throws(() => execute(compile(`outputLine(99); ${source}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), (error: unknown) => error instanceof LiteFault && error.category === 'TypeError', source);
    assert.equal(observed, false, source);
  }
  for (const source of ['f := fn(): (:Int) { (1,) }', 'pair := (1, 2); pair.-1;',
    'pair := (1, 2); pair.1.0;', '(a, (b, c)) := (1, 2);',
    '(a, ...rest) := (1, 2);', '(self, b) := (1, 2);',
    'var pair := (1, 2); pair.0 = 3;']) fault(source, 'SourceError');
});
test('tuple demonstration runs from the numbered project examples through the real CLI', () => {
  const example = new URL('../examples/006-fixed-tuples.lts', import.meta.url);
  const expected = 'number\n12\nnumber: 12\n42\n';
  assert.equal(run(readFileSync(example, 'utf8')).output, expected);
  const result = spawnSync(process.execPath, [new URL('./cli.ts', import.meta.url).pathname, example.pathname], {
    encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.error, undefined); assert.equal(result.status, 0);
  assert.equal(result.stdout, expected); assert.equal(result.stderr, '');
});

test('root shebang launcher forwards run arguments, stdin, diagnostics and statuses from any caller directory', () => {
  const root = new URL('../', import.meta.url).pathname;
  const launcher = join(root, 'lite');
  const dir = mkdtempSync(join(tmpdir(), 'lite-launcher-'));
  const source = join(dir, 'program with spaces.lts');
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? ''), CDPATH: dir };
  const invoke = (args: readonly string[], input = '', executable = launcher, cwd = dir) =>
    spawnSync(executable, args, { cwd, env, input, encoding: 'utf8', timeout: 5000 });
  try {
    const example = invoke(['run', 'examples/006-fixed-tuples.lts'], '', launcher, root);
    assert.equal(example.error, undefined); assert.equal(example.status, 0);
    assert.equal(example.stdout, 'number\n12\nnumber: 12\n42\n'); assert.equal(example.stderr, '');
    writeFileSync(source, 'outputLine(inputInt()); reportError("done"); exit(7);');
    const result = invoke(['run', source], '19\n');
    assert.equal(result.error, undefined); assert.equal(result.status, 7);
    assert.equal(result.stdout, '19\n'); assert.equal(result.stderr, 'done\n');
    writeFileSync(source, 'outputLine(inputInt());');
    const check = invoke(['run', '--check', source]);
    assert.equal(check.error, undefined); assert.equal(check.status, 0);
    assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
    writeFileSync(source, 'outputLine(1/0);');
    const fault = invoke(['run', source]);
    assert.equal(fault.error, undefined); assert.equal(fault.status, 1);
    assert.equal(fault.stdout, ''); assert.match(fault.stderr, /program with spaces\.lts:1:13: ArithmeticPanic:/);
    for (const args of [[], ['run'], ['unknown', source]]) {
      const usage = invoke(args);
      assert.equal(usage.error, undefined); assert.equal(usage.status, 2);
      assert.equal(usage.stdout, ''); assert.match(usage.stderr, /^Usage: \.\/lite <command>/);
    }
    const alias = join(dir, 'project with spaces');
    symlinkSync(root, alias, 'dir');
    writeFileSync(source, 'outputLine(23);');
    const spaced = invoke(['run', source], '', join(alias, 'lite'));
    assert.equal(spaced.error, undefined); assert.equal(spaced.status, 0);
    assert.equal(spaced.stdout, '23\n'); assert.equal(spaced.stderr, '');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('inputInt optionally writes an exact String prompt before reading without an added newline', () => {
  assert.deepEqual(run('x := inputInt("Age: "); outputLine(x);', '7'), { code: 0, output: 'Age: 7\n', errors: '' });
  assert.equal(run('x := inputInt(""); outputLine(x);', '8').output, '8\n');
  assert.equal(run('x := inputInt("first\nsecond: "); outputLine(x);', '9').output, 'first\nsecond: 9\n');
  const events: string[] = [];
  let supplied = false;
  execute(compile('inputInt(({outputLine("argument"); "prompt: "}));'), {
    read: () => { events.push('read'); if (supplied) return null; supplied = true; return '1'; },
    report: text => { events.push(text); }, reportError: () => {},
  });
  assert.deepEqual(events, ['argument\n', 'prompt: ', 'read', 'read']);
});
test('invalid or missing input faults after one prompt; prompt output failure prevents reading', () => {
  for (const input of ['', 'bad', '9223372036854775808']) {
    let output = '';
    let cursor = 0;
    assert.throws(() => execute(compile('inputInt("Number: "); outputLine("unreachable");'), {
      read: () => input[cursor++] ?? null, report: text => { output += text; }, reportError: () => {},
    }), (error: unknown) => error instanceof LiteFault && error.category === 'InputFault');
    assert.equal(output, 'Number: ');
  }
  const failure = new Error('writer failed');
  let read = false;
  assert.throws(() => execute(compile('inputInt("prompt");'), {
    read: () => { read = true; return '1'; }, report: () => { throw failure; }, reportError: () => {},
  }), error => error === failure);
  assert.equal(read, false);
});
test('report joins one or more ordinary scalar values with spaces and exactly one final newline', () => {
  assert.equal(run('outputLine("sum:", 1, 2); outputLine(1, 2, 3); outputLine("hello", "world");').output,
    'sum: 1 2\n1 2 3\nhello world\n');
  assert.equal(run('outputLine("", "", 7); outputLine(false, (), 2.5); outputLine("%s {}", "literal");').output,
    '  7\nfalse Unit 2.5\n%s {} literal\n');
  assert.equal(run('outputLine("single"); reportError("error");').output, 'single\n');
});
test('report evaluates each argument once left to right and writes the joined line after evaluation', () => {
  assert.equal(run('outputLine(({outputLine("left"); inputInt()}), ({outputLine("right"); inputInt()}));', '3 4').output,
    'left\nright\n3 4\n');
  let output = '';
  assert.throws(() => execute(compile('outputLine(({outputLine("first effect"); 1}), 1/0);'), {
    read: () => null, report: text => { output += text; }, reportError: () => {},
  }), (error: unknown) => error instanceof LiteFault && error.category === 'ArithmeticPanic');
  assert.equal(output, 'first effect\n');
});
test('prompt and report signatures fail before effects without broadening other helpers or tuple spread', () => {
  for (const code of ['inputInt(7);', 'inputInt("a", "b");', 'inputInt(("a",));',
    'outputLine("prefix", fn(): Int { 1 });', 'outputLine("prefix", missing);',
    'inputFloat(7);', 'inputLine(7);', 'inputWord("prompt");', 'reportError("a", 1);']) {
    let observed = false;
    assert.throws(() => execute(compile(`outputLine("before"); ${code}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), (error: unknown) => error instanceof LiteFault && error.category === 'TypeError', code);
    assert.equal(observed, false, code);
  }
  fault('values := (1, 2); outputLine(...values);', 'SourceError');
  assert.equal(run('outputLine := fn(a: Int, b: Int): Int { a + b } result := outputLine(2, 3);').output, '');
});
test('report displays flat tuples source-like with labels and a singleton comma', () => {
  assert.equal(run('outputLine("a tuple", (), (1,), (1,2), (1, left=2, right=3, 4));').output,
    'a tuple Unit (1,) (1, 2) (1, left=2, right=3, 4)\n');
  assert.equal(run('t := (1, 2); outputLine(t);').output, '(1, 2)\n');
  assert.equal(run('stored := (1, 2); named: (left: Int, right: Int) = stored; outputLine(named);').output,
    '(left=1, right=2)\n');
  assert.equal(run('pair := fn(): (:Int, :String) { (7, "x") } outputLine(pair());').output, '(7, x)\n');
  assert.equal(run('outputLine([1, 2]);').output, '[1, 2]\n');
  fault('reportError((1, 2));', 'TypeError');
});
test('numbered prompt/report example runs through the root command with real redirected stdin', () => {
  const example = new URL('../examples/007-prompts-and-report.lts', import.meta.url);
  const expected = 'First number: Second number: sum: 12\ninputs: 7 5 equal: false\n';
  assert.equal(run(readFileSync(example, 'utf8'), '7 5').output, expected);
  const root = new URL('../', import.meta.url).pathname;
  const result = spawnSync(join(root, 'lite'), ['run', 'examples/007-prompts-and-report.lts'], {
    cwd: root, input: '7\n5\n', encoding: 'utf8', timeout: 5000,
    env: { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') },
  });
  assert.equal(result.error, undefined); assert.equal(result.status, 0);
  assert.equal(result.stdout, expected); assert.equal(result.stderr, '');
  const checked = spawnSync(join(root, 'lite'), ['run', '--check', example.pathname], {
    cwd: root, encoding: 'utf8', timeout: 5000,
    env: { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') },
  });
  assert.equal(checked.error, undefined); assert.equal(checked.status, 0);
  assert.equal(checked.stdout, ''); assert.equal(checked.stderr, '');
});

test('named scalar tuple members agree with fixed numeric positions without inferring bare-name labels', () => {
  assert.equal(run(`token := (kind = "number", text = "12", count = 3, ready = true, empty = Unit);
    outputLine(token.kind, token.0, token.text, token.1, token.count + 1, not token.ready, token.empty);`).output,
    'number number 12 12 4 false Unit\n');
  fault('kind := "number"; text := "12"; token := (kind, text); outputLine(token.kind);', 'TypeError');
  fault('position := "kind"; token := (kind = "number"); outputLine(token.position);', 'TypeError');
  assert.equal(run('token := (نام = "Ali"); outputLine(token.نام);').output, 'Ali\n');
  fault('token := (Kind = "number"); outputLine(token.kind);', 'TypeError');
});
test('same-name shorthand copies a lexical value while explicit labels do not assign that lexical binding', () => {
  assert.equal(run(`var kind := "number"; text := "12";
    token := (= kind, = text); kind = "changed";
    other := (kind = "label only");
    outputLine(token.kind, token.text, kind, other.kind);
    _ := 7; box := (= _); outputLine(box._);`).output,
    'number 12 changed label only\n7\n');
  fault('token := (= missing);', 'TypeError');
  fault('f := fn(): Int { 1 } token := (= f());', 'SourceError');
  fault('a := (x = 1); token := (= a.x);', 'SourceError');
});
test('named singleton value/type forms need no comma and do not erase Unit-valued members', () => {
  assert.equal(run(`one := (value = 42); oneComma := (value = 43,);
    value := 44; shorthand := (= value); grouped := (value);
    take := fn(box: (value: Int)): Int { box.value }
    takeComma := fn(box: (value: Int,)): Int { box.0 }
    emptyBox := (empty = Unit);
    empty := fn(box: (empty: Unit)): Unit { box.empty }
    outputLine(take(one), takeComma(oneComma), shorthand.value, grouped, empty(emptyBox));
    (component,) := one; outputLine(component);`).output, '42 43 44 44 Unit\n42\n');
  fault('() := (empty = Unit);', 'TypeError');
  fault('f := fn(box: (value: Int)): Int { box.value } f(42);', 'TypeError');
});
test('named tuple construction and member receivers evaluate once in written order', () => {
  assert.equal(run(`token := (kind = ({outputLine("kind"); inputWord()}), text = ({outputLine("text"); inputWord()}));
    outputLine(token.kind, token.text);
    make := fn(): (a: Int, b: Int) { outputLine("called"); (a = 1, b = 2) }
    outputLine(make().b);`, 'number 12').output, 'kind\ntext\nnumber 12\ncalled\n2\n');
});
test('named tuple copies, grouping and positional binding preserve stored order and independent values', () => {
  assert.equal(run(`var source := (text = "12", kind = "number");
    saved := source; (whole) := source; (first, second) := source;
    source = (text = "99", kind = "changed");
    outputLine(saved.text, whole.kind, first, second, source.text);
    (same, same) := saved; outputLine(same);
    source := (value = 7); outputLine(saved.text, source.value);`).output,
    '12 number 12 number 99\nnumber\n12 7\n');
});
test('explicit named tuple inputs/results and recursive calls preserve label-sensitive contracts', () => {
  assert.equal(run(`var make := fn(kind: String, text: String): (kind: String, text: String) { (= kind, = text) }
    make = fn(kind: String, text: String): (kind: String, text: String) { return (kind = kind, text = text); }
    describe := fn(token: (kind: String, text: String)): String { token.kind + ": " + token.text }
    outputLine(describe(make("number", "12")));
    sum := fn(state: (n: Int, extra: Int)): Int {
      if state.n == 0 { return state.extra; }
      state.n + self((n = state.n - 1, extra = state.extra))
    }
    outputLine(sum((n = 4, extra = 7)));
    outputLine((if true { (a = 1) } else { (a = 2) }).a);`).output, 'number: 12\n17\n1\n');
});
test('stored tuple transfers never silently relabel or reorder through a known parameter/result type', () => {
  for (const code of [
    'var point := (x = 0, y = 0); size := (width = 1, height = 2); point = size;',
    'var point := (x = 0, y = 0); reversed := (y = 2, x = 1); point = reversed;',
    'f := fn(point: (x: Int, y: Int)): Int { point.x } size := (width = 1, height = 2); f(size);',
    'f := fn(point: (x: Int, y: Int)): Int { point.x } reversed := (y = 2, x = 1); f(reversed);',
    'f := fn(point: (x: Int, y: Int)): Int { point.x } plain := (1, 2); f(plain);',
    'f := fn(): (x: Int, y: Int) { size := (width = 1, height = 2); size }',
    'f := fn(): (x: Int, y: Int) { reversed := (y = 2, x = 1); return reversed; }',
    'f := fn(): (x: Int, y: Int) { plain := (1, 2); plain }',
  ]) {
    assert.throws(() => compile(code), (error: unknown) => error instanceof LiteFault &&
      error.category === 'TypeError' && !error.message.includes('contextual tuple constructor routing'), code);
  }
});
test('valid contextual fresh-constructor routing is diagnosed as unimplemented rather than a new order rule', () => {
  for (const code of [
    'f := fn(): (x: Int, y: Int) { (1, 2) }',
    'f := fn(): (x: Int, y: Int) { return (y = 2, x = 1); }',
    'f := fn(point: (x: Int, y: Int)): Int { point.x } f((1, 2));',
    'f := fn(point: (x: Int, y: Int)): Int { point.x } f((y = 2, x = 1));',
    'var point := (x = 0, y = 0); point = (y = 2, x = 1);',
  ]) assert.throws(() => compile(code), (error: unknown) => error instanceof LiteFault &&
    error.category === 'TypeError' && error.message.includes('contextual tuple constructor routing'), code);
});
test('invalid labels and unsupported tuple extensions are rejected before effects', () => {
  for (const [code, category] of [
    ['token := (kind = "number", kind = "other");', 'SourceError'],
    ['kind := "number"; token := (= kind, kind = "other");', 'SourceError'],
    ['f := fn(token: (kind: String, kind: String)): Int { 1 }', 'SourceError'],
    ['token := (kind = "number"); token.missing;', 'TypeError'],
    ['token := (kind = "number"); token.1;', 'TypeError'],
    ['var token := (kind = "number"); token = (kind = 7);', 'TypeError'],
    ['token := (kind = "number"); (local = kind) := token;', 'SourceError'],
    ['var token := (kind = "number"); token.kind = "other";', 'SourceError'],
    ['token := (kind = "number"); f := fn(): String { token.kind }', 'TypeError'],
    ['token := (kind = "number"); reportError(token);', 'TypeError'],
  ]) {
    if (code === undefined || category === undefined) throw new Error('bad fixture');
    let observed = false;
    assert.throws(() => execute(compile(`outputLine("before"); ${code}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), (error: unknown) => error instanceof LiteFault && error.category === category, code);
    assert.equal(observed, false, code);
  }
});
test('named tuple example runs through the root launcher and check-only mode', () => {
  const root = new URL('../', import.meta.url).pathname;
  const example = new URL('../examples/008-named-tuples.lts', import.meta.url);
  const expected = 'number 12\nnumber: 12\nnumber 12\n42\n';
  assert.equal(run(readFileSync(example, 'utf8')).output, expected);
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  for (const check of [false, true]) {
    const result = spawnSync(join(root, 'lite'), ['run', ...(check ? ['--check'] : []), example.pathname], {
      cwd: root, encoding: 'utf8', env, timeout: 5000,
    });
    assert.equal(result.error, undefined); assert.equal(result.status, 0);
    assert.equal(result.stdout, check ? '' : expected); assert.equal(result.stderr, '');
  }
});

test('homogeneous scalar arrays have fixed extents and matching dot/bracket reads', () => {
  assert.equal(run(`integers := [1, 2, 3,]; floats := [1.5, 2.5]; words := ["a", "b"];
    flags := [true, false]; units := [(), Unit, ()];
    outputLine(integers[0], integers.2, floats[1], words.0, not flags[1], units.2);
    loop units as value { outputLine(value); }`).output, '1 3 2.5 a true Unit\nUnit\nUnit\nUnit\n');
  fault('pair := (1, 2); pair[0];', 'TypeError');
});
test('array constructors and bracket receivers/indices evaluate once in written order', () => {
  assert.equal(run(`values := [({outputLine("first"); inputInt()}), ({outputLine("second"); inputInt()})];
    outputLine(values[0], values[1]);
    make := fn(): [Int; 3] { outputLine("receiver"); [10, 20, 30] }
    outputLine(make()[({outputLine("index"); inputInt()})]); outputLine(inputInt());`, '3 4 2 9').output,
    'first\nsecond\n3 4\nreceiver\nindex\n30\n9\n');
  assert.equal(run('var values := [10, 20]; outputLine(values[({values = [30, 40]; 1})]); outputLine(values[1]);').output,
    '20\n40\n');
});
test('array bracket bounds fault safely while invalid static dot positions fail before execution', () => {
  for (const index of ['-1', '3', '9223372036854775807']) fault(`values := [10, 20, 30]; outputLine(values[${index}]);`, 'BoundPanic');
  fault('values := [10, 20, 30]; if false { values.3; }', 'TypeError');
  assert.equal(run('values := [1]; if false { outputLine(values[7]); } outputLine(2);').output, '2\n');
  fault('values := [1]; outputLine(values[0.0]);', 'TypeError');
  fault('values := [1]; values.9223372036854775807;', 'TypeError');
});
test('array traversal evaluates its source once and creates fresh scoped body/item bindings', () => {
  assert.equal(run(`make := fn(): [Int; 3] { outputLine("source"); [2, 4, 6] }
    var sum := 0;
    loop make() as value {
      var local := 0; local = local + 1;
      sum = sum + value + local;
    }
    outputLine(sum);`).output, 'source\n15\n');
  fault('loop [1, 2] as value {} outputLine(value);', 'TypeError');
  fault('loop [1, 2] as value { value = 3; }', 'TypeError');
});
test('unnamed array traversal introduces no implicit variable and receiver shadowing stays in the body', () => {
  assert.equal(run('loop [1, 2] { outputLine("tick"); }').output, 'tick\ntick\n');
  assert.equal(run('values := [3, 4]; loop values as values { outputLine(values); } outputLine(values[0]);').output, '3\n4\n3\n');
  fault('loop [1] { outputLine(it); }', 'TypeError');
  fault('loop true as value { break; }', 'TypeError');
});
test('traversal retains the evaluated array value when its original variable is replaced', () => {
  assert.equal(run(`var values := [1, 2, 3];
    loop values as value { outputLine(value); values = [9, 8, 7]; }
    outputLine(values[0], values[2]);`).output, '1\n2\n3\n9 7\n');
});
test('array loop break/continue target the nearest loop without restarting the source', () => {
  assert.equal(run(`var total := 0;
    loop [1, 2, 3, 4] as value {
      if value == 2 { continue; }
      if value == 4 { break; }
      total = total + value;
    }
    outputLine(total);
    loop [1, 2] as outer {
      loop [3, 4] as inner { if inner == 3 { continue; } outputLine(outer, inner); break; }
    }`).output, '4\n1 4\n2 4\n');
  assert.equal(run(`loop [({outputLine("a"); 1}), ({outputLine("b"); 2})] as item {
    outputLine(item); break;
  }`).output, 'a\nb\n1\n');
  assert.equal(run('loop [1, 2] as value { loop { outputLine(value); break; } }').output, '1\n2\n');
});
test('arrays of flat named and unnamed tuples preserve member types and body destructuring', () => {
  assert.equal(run(`tokens := [(kind = "number", text = "12"), (kind = "symbol", text = "+")];
    outputLine(tokens.0.kind, tokens[1].text);
    loop tokens as token { (kind, text) := token; outputLine(kind, text); }
    pairs := [(1, "a"), (2, "b")];
    loop pairs as pair { outputLine(pair.0, pair.1); }`).output, 'number +\nnumber 12\nsymbol +\n1 a\n2 b\n');
});
test('explicit fixed-array inputs/results check element contracts and extents', () => {
  assert.equal(run(`make := fn(): [Int; 3] { return [1, 2, 3]; }
    first := fn(values: [Int; 3]): Int { values[0] }
    token := fn(values: [(kind: String, text: String); 2]): String { values[1].text }
    outputLine(first(make())); outputLine(token([(kind = "n", text = "1"), (kind = "s", text = "+")]));`).output, '1\n+\n');
  fault('f := fn(values: [Int; 3]): Int { values[0] } f([1, 2]);', 'TypeError');
  fault('f := fn(): [Int; 2] { [1.0, 2.0] }', 'TypeError');
  fault('f := fn(values: [(x: Int); 1]): Int { values[0].x } f([(y = 1)]);', 'TypeError');
  fault('var f := fn(values: [Int; 2]): Int { values[0] } f = fn(values: [Int; 3]): Int { values[0] }', 'TypeError');
});
test('ordinary fixed-array copies and supplied arguments survive source replacement', () => {
  assert.equal(run(`var values := [10, 11]; saved := values;
    first := fn(original: [Int; 2], ignored: Unit): Int { original[0] }
    outputLine(first(values, ({values = [20, 30]; Unit})), saved[0], values[0]);
    values := [40, 50]; outputLine(saved[1], values[1]);`).output, '10 10 20\n11 50\n');
  fault('values := [1, 2]; values = [3, 4];', 'TypeError');
  fault('var values := [1, 2]; values = [3];', 'TypeError');
});
test('array arguments and item locals stay separate through recursive calls', () => {
  assert.equal(run(`sum := fn(values: [Int; 3], count: Int): Int {
      if count == 0 { return 0; }
      saved := values[count - 1];
      saved + self(values, count - 1)
    }
    outputLine(sum([1, 2, 3], 3)); outputLine(sum([4, 5, 6], 2));`).output, '6\n9\n');
  fault('values := [1, 2]; f := fn(): Int { values[0] }', 'TypeError');
});
test('returns, exit and bounds faults propagate correctly through array traversal', () => {
  assert.equal(run(`first := fn(values: [Int; 2]): Int { loop values as value { return value; } 0 }
    outputLine(first([7, 8]));`).output, '7\n');
  assert.deepEqual(run('loop [1, 2] { reportError("stop"); exit(6); } outputLine(9);'), { code: 6, output: '', errors: 'stop\n' });
  fault('loop [1] as value { values := [2]; values[value]; }', 'BoundPanic');
  fault('loop [1] { f := fn(): Unit { break; } }', 'TypeError');
  fault('loop { loop ({ break; [1] }) {} break; }', 'TypeError');
});
test('unsupported array forms fail before effects without inventing empty types, unions or mutation', () => {
  for (const [code, category] of [
    ['values := [];', 'TypeError'], ['f := fn(): [Int; 0] { [] }', 'TypeError'],
    ['values := [1, true];', 'TypeError'], ['values := [[1], [2]];', 'TypeError'],
    ['f := fn(): [[Int; 1]; 1] { [1] }', 'TypeError'],
    ['values := [fn(): Int { 1 }];', 'TypeError'], ['values := ([1, 2],);', 'TypeError'],
    ['loop [1] as value { unknown; }', 'TypeError'], ['outputLine(fn(): Int { 1 });', 'TypeError'],
    ['var values := [1, 2]; values[0] = 3;', 'SourceError'],
    ['mut values := [1, 2];', 'TypeError'], ['f := fn(values: [Int]): Int { 1 }', 'SourceError'],
    ['f := fn(values: [Int; 2.0]): Int { 1 }', 'SourceError'],
    ['loop [1, 2] as (a, b) {}', 'SourceError'],
    ['values := [1, 2]; outputLine(values.count);', 'TypeError'],
    ['values := [1, 2]; values[0:1];', 'SourceError'],
  ]) {
    if (code === undefined || category === undefined) throw new Error('bad fixture');
    let observed = false;
    assert.throws(() => execute(compile(`outputLine("before"); ${code}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), (error: unknown) => error instanceof LiteFault && error.category === category, code);
    assert.equal(observed, false, code);
  }
});
test('numbered fixed-array example runs and checks through the root launcher', () => {
  const root = new URL('../', import.meta.url).pathname;
  const source = new URL('../examples/009-fixed-arrays.lts', import.meta.url);
  const expected = 'number 12\nsymbol +\nnumber 30\nToken index: +\nsum: 60\n';
  assert.equal(run(readFileSync(source, 'utf8'), '1').output, expected);
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const invoke = (input: string, check = false) => spawnSync(join(root, 'lite'), ['run', ...(check ? ['--check'] : []), source.pathname], {
    cwd: root, env, input, encoding: 'utf8', timeout: 5000,
  });
  const result = invoke('1\n');
  assert.equal(result.error, undefined); assert.equal(result.status, 0);
  assert.equal(result.stdout, expected); assert.equal(result.stderr, '');
  const invalid = invoke('-1\n');
  assert.equal(invalid.error, undefined); assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, 'number 12\nsymbol +\nnumber 30\nToken index: '); assert.match(invalid.stderr, /BoundPanic:/);
  const check = invoke('', true);
  assert.equal(check.error, undefined); assert.equal(check.status, 0);
  assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
});
test('transparent type aliases support scalar, tuple, array and list forms', () => {
  assert.equal(run('Token := type (kind: String, text: String);\n' +
    'take := fn(t: Token): String { t.text };\n' +
    'outputLine(take((kind = "id", text = "hello")));').output, 'hello\n');

  assert.equal(run('Token := type (kind: String, text: String);\n' +
    'make := fn(s: String): Token { (kind = "text", text = s) };\n' +
    'outputLine(make("world").text);').output, 'world\n');

  assert.equal(run('Token := type (kind: String, text: String);\n' +
    'tok: Token = (kind = "op", text = "+");\n' +
    'outputLine(tok.text);').output, '+\n');

  assert.equal(run('MyInt := type Int;\n' +
    'double := fn(x: MyInt): MyInt { x + x };\n' +
    'outputLine(double(21));').output, '42\n');

  assert.equal(run('Pair := type [Int; 2];\n' +
    'sum := fn(p: Pair): Int { p[0] + p[1] };\n' +
    'outputLine(sum([10, 20]));').output, '30\n');

  assert.equal(run('Token := type (kind: String, text: String);\n' +
    'Tokens := type List<Token>;\n' +
    'tokens: mut Tokens = [];\n' +
    'push_back(mut tokens, (kind = "num", text = "42"));\n' +
    'outputLine(tokens[0].text);').output, '42\n');

  assert.equal(run('Token := type (kind: String, text: String);').output, '');
});
test('type aliases follow single lexical scope with value shadowing and rejection', () => {
  fault('Token := type (kind: String, text: String);\n' +
    'Token := 7;\n' +
    'f := fn(t: Token): String { t.text };', 'TypeError');

  assert.equal(run('x := 10;\n' +
    'x := type String;\n' +
    'f := fn(s: x): String { s };\n' +
    'outputLine(f("ok"));').output, 'ok\n');

  assert.equal(run('Token := type (kind: String, text: String);\n' +
    '{\n' +
    '    Token := 42;\n' +
    '    outputLine(Token);\n' +
    '}\n' +
    'take := fn(t: Token): String { t.text };\n' +
    'outputLine(take((kind = "id", text = "restored")));').output, '42\nrestored\n');

  fault('Token := type (kind: String, text: String); x := Token;', 'TypeError');
  fault('Token := type (kind: String, text: String); x := Token();', 'TypeError');
  fault('Token := type (kind: String, text: String); Token = 5;', 'TypeError');
  fault('Token := type (kind: String, text: String); push_back(mut Token, (kind = "a", text = "b"));', 'TypeError');
  fault('var Token := type Int;', 'SourceError');
  fault('fn := type Int;', 'SourceError');
  fault('self := type Int;', 'SourceError');
});
test('type alias example runs and checks through the root launcher', () => {
  const root = new URL('../', import.meta.url).pathname;
  const source = new URL('../examples/021-type-aliases.lts', import.meta.url);
  const expected = 'ident: total\nop: +=\nnum: 100\n';
  assert.equal(run(readFileSync(source, 'utf8')).output, expected);
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const invoke = (check = false) => spawnSync(join(root, 'lite'), ['run', ...(check ? ['--check'] : []), source.pathname], {
    cwd: root, env, encoding: 'utf8', timeout: 5000,
  });
  const result = invoke(false);
  assert.equal(result.error, undefined); assert.equal(result.status, 0);
  assert.equal(result.stdout, expected); assert.equal(result.stderr, '');
  const check = invoke(true);
  assert.equal(check.error, undefined); assert.equal(check.status, 0);
  assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
});
