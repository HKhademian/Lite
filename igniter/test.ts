import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { compile, execute, LiteFault } from './lite.ts';

function run(source: string, input = ''): { code: number; output: string; errors: string } {
  let cursor = 0;
  let output = '';
  let errors = '';
  const code = execute(compile(source), {
    read: () => input[cursor++] ?? null,
    report: text => { output += text; },
    reportError: text => { errors += text; },
  });
  return { code, output, errors };
}
function fault(source: string, category: LiteFault['category'], input = ''): void {
  assert.throws(() => run(source, input), (error: unknown) => error instanceof LiteFault && error.category === category);
}

test('inputAll preserves multi-line text, line endings, trailing whitespace and empty EOF', () => {
  for (const text of ['', 'one', 'one\n', 'one\r\ntwo\r\n', ' \t\r\n\n', 'سلام🙂\né\t ']) {
    assert.equal(run('text := inputAll(); report(text);', text).output, text + '\n');
  }
  assert.deepEqual(run('text := inputAll(); text;', 'one\ntwo\n'), { code: 0, output: '', errors: '' });
  assert.equal(run('report(inputAll()); report(inputAll());', 'first\nlast').output, 'first\nlast\n\n');
});
test('inputAll consumes unread lookahead and the remainder after other input helpers', () => {
  assert.equal(run('first := inputWord(); report(first); report(inputAll());', 'first \tsecond\r\n').output,
    'first\n \tsecond\r\n\n');
  assert.equal(run('first := inputInt(); report(first); report(inputAll());', '7\r\nmore\n').output,
    '7\n\r\nmore\n\n');
  assert.equal(run('first := inputLine(); report(first); report(inputAll());', 'first\r\nsecond\r\n').output,
    'first\nsecond\r\n\n');
  assert.equal(run('report(inputAll());', '').output, '\n');
  for (const helper of ['inputInt', 'inputFloat', 'inputWord', 'inputLine']) fault(`${helper}();`, 'InputFault');
});
test('inputAll prompt evaluates once and writes exact stdout before the first read even at EOF', () => {
  const events: string[] = [];
  let read = false;
  execute(compile('text := inputAll(({report("prepare"); "source: "})); report(text);'), {
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
  assert.throws(() => execute(compile('inputAll("source: "); report("later");'), {
    read: () => { throw new Error('read failed'); }, report: text => { output += text; }, reportError: () => {},
  }), (error: unknown) => error instanceof LiteFault && error.category === 'InputFault' && error.message.includes('read failed'));
  assert.equal(output, 'source: ');
});
test('inputAll signatures and named arguments fail before effects while ordinary shadowing works', () => {
  for (const code of ['inputAll(1);', 'inputAll(false);', 'inputAll("a", "b");',
    'inputAll(prompt = "source: ");', 'inputAll((1,));']) {
    let effects = false;
    assert.throws(() => execute(compile(`report("before"); ${code}`), {
      read: () => { effects = true; return null; }, report: () => { effects = true; }, reportError: () => { effects = true; },
    }), LiteFault);
    assert.equal(effects, false, code);
  }
  assert.equal(run('inputAll := fn(): String { "local" } report(inputAll());', 'unread').output, 'local\n');
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

const reportLiteralPrograms = ['report(42);', 'report(0);', 'report(-0);', 'report(+00042);',
  '\treport ( - 00042 ) ; \t', 'report(9223372036854775807);',
  'report(-9223372036854775808);', 'report(9999999999999999);', 'report(0000)',
  '\nreport(\n42\n);\n', '\r\n\treport\r\n(\r\n-00042\r\n)\r\n;\r\n', 'report(42);\n'];

test('whole-source TS and C emitters reject later statements and decoding failures before artifact output', () => {
  const root = new URL('../', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  for (const name of ['017-report-ts-compiler.lts', '018-report-c-compiler.lts']) {
    const path = join(root, 'examples', name);
    for (const input of ['', 'report(42);\nreport(9);\n', 'report(42);\nprocess.exit(7);\n']) {
      const rejected = spawnSync(join(root, 'lite'), ['run', path], { input, env, timeout: 5000 });
      assert.equal(rejected.error, undefined); assert.equal(rejected.status, 2, rejected.stderr.toString());
      assert.equal(rejected.stdout.length, 0); assert.notEqual(rejected.stderr.length, 0);
    }
    const invalidBytes = Buffer.concat([Buffer.from('report(42);\n'), Buffer.from([0xff])]);
    const invalid = spawnSync(join(root, 'lite'), ['run', path], { input: invalidBytes, env, timeout: 5000 });
    assert.equal(invalid.error, undefined); assert.equal(invalid.status, 1);
    assert.equal(invalid.stdout.length, 0); assert.match(invalid.stderr.toString(), /InputFault: cannot read input/);
    const check = spawnSync(join(root, 'lite'), ['run', '--check', path], { env, timeout: 5000 });
    assert.equal(check.error, undefined); assert.equal(check.status, 0);
    assert.equal(check.stdout.length, 0); assert.equal(check.stderr.length, 0);
  }
});

test('restricted C compiler emits the readable reference and rejects unsupported source before output', () => {
  const source = readFileSync(new URL('../examples/018-report-c-compiler.lts', import.meta.url), 'utf8');
  const expected = readFileSync(new URL('../examples/generated/018-report-42.c', import.meta.url), 'utf8');
  assert.deepEqual(run(source, 'report(42);'), { code: 0, output: expected, errors: '' });
  for (const input of ['report(1 + 2);', 'report("text");', 'report(42); report(9);',
    'report(42); system("anything");', 'report(9223372036854775808);', 'report(-9223372036854775809);']) {
    const result = run(source, input);
    assert.equal(result.code, 2); assert.equal(result.output, ''); assert.notEqual(result.errors, '');
  }
});
test('Lite-generated native C, TS and igniter programs have identical output bytes and status', context => {
  const cc = process.env['CC'] ?? 'cc';
  const probe = spawnSync(cc, ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (probe.error !== undefined && 'code' in probe.error && probe.error.code === 'ENOENT') {
    context.skip('C compiler unavailable; native parity requires cc or CC pointing to a compiler'); return;
  }
  assert.equal(probe.error, undefined); assert.equal(probe.status, 0, probe.stderr);
  const root = new URL('../', import.meta.url).pathname;
  const cCompiler = join(root, 'examples/018-report-c-compiler.lts');
  const tsCompiler = join(root, 'examples/017-report-ts-compiler.lts');
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'lite-native-parity-'));
  try {
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    for (const [index, source] of reportLiteralPrograms.entries()) {
      const sourcePath = join(directory, `input-${index}.lts`);
      const cPath = join(directory, `program-${index}.c`);
      const tsPath = join(directory, `program-${index}.ts`);
      const executable = join(directory, `native-${index}`);
      const adapter = join(directory, `run-${index}.ts`);
      writeFileSync(sourcePath, source);
      for (const [compiler, path] of [[cCompiler, cPath], [tsCompiler, tsPath]] as const) {
        const emitted = spawnSync(join(root, 'lite'), ['run', compiler], { input: source, env, timeout: 5000 });
        assert.equal(emitted.error, undefined); assert.equal(emitted.status, 0, emitted.stderr.toString());
        assert.equal(emitted.stderr.length, 0); writeFileSync(path, emitted.stdout);
      }
      const built = spawnSync(cc, ['-std=c11', '-Wall', '-Wextra', '-Werror', cPath, '-o', executable], {
        encoding: 'utf8', timeout: 30000,
      });
      assert.equal(built.error, undefined); assert.equal(built.status, 0, built.stdout + built.stderr);
      writeFileSync(adapter, `import { main } from './program-${index}.ts';\nprocess.stdout.write(main());\n`);
      const input = Buffer.from([0, 255, 10]);
      const baseline = spawnSync(join(root, 'lite'), ['run', sourcePath], { input, env, timeout: 5000 });
      assert.equal(baseline.error, undefined); assert.equal(baseline.status, 0);
      for (const actual of [spawnSync(executable, [], { input, timeout: 5000 }),
        spawnSync(process.execPath, [adapter], { input, timeout: 5000 })]) {
        assert.equal(actual.error, undefined); assert.equal(actual.status, baseline.status);
        assert.equal(actual.signal, baseline.signal);
        assert.deepEqual(actual.stdout, baseline.stdout, source);
        assert.deepEqual(actual.stderr, baseline.stderr, source);
      }
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('quoted closing delimiters remain values in calls, tuple entries and array/list elements', () => {
  assert.equal(run(`report("(", ")", "]", "}");
    pair := ("(", ")"); array := ["[", "]"];
    list: List<String> = ["[", "]"];
    report(pair.1, array[1], list[1]);`).output, '( ) ] }\n) ] ]\n');
});
test('Lite-written TS emitter produces a deterministic readable reference with no extra source', () => {
  const source = readFileSync(new URL('../examples/017-report-ts-compiler.lts', import.meta.url), 'utf8');
  const expected = readFileSync(new URL('../examples/generated/017-report-42.ts', import.meta.url), 'utf8');
  assert.deepEqual(run(source, 'report(42);'), { code: 0, output: expected, errors: '' });
  assert.equal(run(source, 'report(42);').output, run(source, 'report(42);').output);
  assert.equal(run(source, ' report ( +00042 ) ; ').output, expected);
  assert.equal(run(source, 'report(-000);').output,
    'export function main(): string {\n    return "0\\n";\n}\n');
});
test('restricted TS compiler rejects malformed, unsupported and injected source before emitting bytes', () => {
  const source = readFileSync(new URL('../examples/017-report-ts-compiler.lts', import.meta.url), 'utf8');
  for (const input of ['', '\n', 'x', 'report', 'report()', 'report(1', 'report(1, 2);',
    'report("text");', 'report(1 + 2);', 'report(1.5);', 'report(1e2);',
    'report(42); report(9);', 'report(42); process.exit(7);',
    'report(9223372036854775808);', 'report(-9223372036854775809);',
    'report(999999999999999999999999);', 'report(42); "}; throw 1; //']) {
    const result = run(source, input);
    assert.equal(result.code, 2, input); assert.equal(result.output, '', input);
    assert.notEqual(result.errors, '', input);
  }
});
test('emitted TS and igniter outputs match byte for byte across signed Int literal boundaries', () => {
  const root = new URL('../', import.meta.url).pathname;
  const compiler = new URL('../examples/017-report-ts-compiler.lts', import.meta.url).pathname;
  const env = { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env['PATH'] ?? '') };
  const directory = mkdtempSync(join(tmpdir(), 'lite-ts-output-'));
  const corePaths: string[] = [];
  try {
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    for (const [index, source] of reportLiteralPrograms.entries()) {
      const sourcePath = join(directory, `input-${index}.lts`);
      const corePath = join(directory, `program-${index}.ts`);
      const adapterPath = join(directory, `run-${index}.ts`);
      writeFileSync(sourcePath, source);
      const emitted = spawnSync(join(root, 'lite'), ['run', compiler], { input: source, env, timeout: 5000 });
      assert.equal(emitted.error, undefined); assert.equal(emitted.status, 0, emitted.stderr.toString());
      assert.equal(emitted.stderr.length, 0); writeFileSync(corePath, emitted.stdout); corePaths.push(corePath);
      writeFileSync(adapterPath, `import { main } from './program-${index}.ts';\nprocess.stdout.write(main());\n`);
      const input = Buffer.from([0, 255, 10]); // These admitted programs have no runtime reads.
      const expected = spawnSync(join(root, 'lite'), ['run', sourcePath], { input, env, timeout: 5000 });
      const actual = spawnSync(process.execPath, [adapterPath], { input, timeout: 5000 });
      assert.equal(expected.error, undefined); assert.equal(actual.error, undefined);
      assert.equal(expected.status, 0); assert.equal(actual.status, expected.status);
      assert.equal(actual.signal, expected.signal);
      assert.deepEqual(actual.stdout, expected.stdout, source);
      assert.deepEqual(actual.stderr, expected.stderr, source);
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
    for (const index of corePaths.keys()) {
      const adapter = join(jsDirectory, `run-${index}.mjs`);
      writeFileSync(adapter, `import { main } from './program-${index}.js';\nprocess.stdout.write(main());\n`);
      const javascript = spawnSync(process.execPath, [adapter], { timeout: 5000 });
      const typescript = spawnSync(process.execPath, [join(directory, `run-${index}.ts`)], { timeout: 5000 });
      assert.equal(javascript.error, undefined); assert.equal(typescript.error, undefined);
      assert.equal(javascript.status, typescript.status);
      assert.deepEqual(javascript.stdout, typescript.stdout); assert.deepEqual(javascript.stderr, typescript.stderr);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('checked-in TS output and explicit Node adapter typecheck and reproduce the reference bytes', () => {
  const root = new URL('../', import.meta.url).pathname;
  const checked = spawnSync(process.execPath, [join(root, 'igniter/node_modules/typescript/bin/tsc'),
    '-p', join(root, 'examples/generated')], { encoding: 'utf8', timeout: 30000 });
  assert.equal(checked.error, undefined); assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  const result = spawnSync(process.execPath, [join(root, 'examples/generated/017-run-report.ts')], { timeout: 5000 });
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
  assert.equal(run(`empty: mut List<Int>=[]; push_back(mut empty, 7); report(empty[0]);
    floats: List<Float> = [1.5]; text: List<String> = ["tea"]; flags: List<Bool> = [true];
    units: mut List<Unit> = [(), Unit]; report(floats[0], text[0], flags[0], pop_back(mut units));
    fixed := [3, 4]; report(fixed.1);`).output, '7\n1.5 tea true Unit\n4\n');
  fault('fixed := [1]; list: List<Int> = fixed;', 'TypeError');
  fault('list: List<Int> = [1]; f := fn(a: [Int; 1]): Int { a[0] } f(list);', 'TypeError');
  fault('[];', 'TypeError');
});
test('both list ends preserve element order, duplicate occurrences and direct pop values', () => {
  assert.equal(run(`values: mut List<Int> = []; report(push_back(mut values, 2));
    push_front(mut values, 1); push_back(mut values, 2); push_front(mut values, 0);
    loop values as item { report(item); }
    report(pop_front(mut values), pop_back(mut values), pop_back(mut values), pop_front(mut values));
    loop values { report("unexpected"); }`).output, 'Unit\n0\n1\n2\n2\n0 2 2 1\n');
});
test('list copies and typed mutable receiving copies remain independent under end operations', () => {
  assert.equal(run(`var original: mut List<Int> = [1, 2]; saved := original;
    editable: mut List<Int> = original; push_front(mut editable, 8);
    push_back(mut original, 3); report(pop_front(mut original));
    original = editable; push_back(mut original, 9);
    report(saved[0], saved[1], editable[0], editable[2], original[3]);`).output,
    '1\n1 2 8 2 9\n');
});
test('list arguments and results retain evaluated snapshots through later argument mutation', () => {
  assert.equal(run(`values: mut List<Int> = [1, 2];
    keep := fn(items: List<Int>, ignored: Unit): List<Int> { items }
    saved := keep(values, push_front(mut values, 9));
    returned: mut List<Int> = saved; push_back(mut returned, 3);
    report(values[0], saved[0], saved[1], returned[2]);
    make := fn(): List<Int> { local: mut List<Int> = []; push_back(mut local, 6); local }
    report(make()[0]);`).output, '9 1 2 3\n6\n');
});
test('flat tuple list elements preserve labels, positional shape and popped copies', () => {
  assert.equal(run(`tokens: mut List<(kind: String, text: String)> = [];
    kind := "number"; text := "12"; push_back(mut tokens, (=kind, =text));
    push_front(mut tokens, (kind = "symbol", text = "+"));
    first := pop_front(mut tokens); report(first.kind, first.text, tokens[0].text);
    mixed: List<(:Int, text: String)> = [(7, text = "tea")];
    loop mixed as pair { (number, word) := pair; report(number, word); }`).output,
    'symbol + 12\n7 tea\n');
  fault('tokens: mut List<(kind: String)> = []; push_back(mut tokens, (text = "wrong"));', 'TypeError');
});
test('list construction, supplied elements and indexed receivers evaluate once in written order', () => {
  assert.equal(run(`values: mut List<Int> = [({report("first"); 1}), ({report("second"); 2})];
    push_back(mut values, ({report("supplied"); inputInt("value: ")}));
    source := fn(items: List<Int>): List<Int> { report("receiver"); items }
    report(source(values)[({report("index"); 2})]);`, '7').output,
    'first\nsecond\nsupplied\nvalue: receiver\nindex\n7\n');
});
test('list traversal evaluates a source snapshot once while original end mutations remain independent', () => {
  assert.equal(run(`values: mut List<Int> = [1, 2];
    source := fn(items: List<Int>): List<Int> { report("source"); items }
    loop source(values) as item { report(item); push_back(mut values, item + 10); }
    loop values as item { if item == 2 { continue; } report(item); if item == 11 { break; } }
    report(values[3]);`).output, 'source\n1\n2\n1\n11\n12\n');
});
test('list mutation grants follow lexical slots and never silently capture surrounding runtime data', () => {
  assert.equal(run(`values: mut List<Int> = [1];
    { push_back(mut values, 2); values: mut List<Int> = [9]; push_front(mut values, 8); report(values[0]); }
    report(values[1]);
    f := fn(): Int { local: mut List<Int> = [3]; push_back(mut local, 4); pop_back(mut local) }
    report(f());`).output, '8\n2\n4\n');
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
    push_back(mut values, ({report("supplied"); exit(7); 1})); report("later");`),
    { code: 7, output: 'supplied\n', errors: '' });
  assert.deepEqual(run(`values: List<Int> = [({report("first"); exit(6); 1}), ({report("later"); 2})];`),
    { code: 6, output: 'first\n', errors: '' });
  let observed = '';
  assert.throws(() => execute(compile(`values: mut List<Int> = []; pop_back(mut values); report("later");`), {
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
    'values: List<Int> = [1]; report(values);', 'values: List<Int> = [1]; values == values;',
    'values: mut List<Int> = []; push_back(target = mut values, value = 1);',
    'values: mut List<Int> = []; push_back(mut values);',
    'values: mut List<Int> = []; pop_front(mut values, 1);',
    'values: mut List<Int> = []; push_back(mut missing, 1);',
    'values: mut List<Int> = []; push_back(mut values[0], 1);',
    'values: mut List<Int> = []; report(mut values);',
    'f := fn(a: List<Int>): Unit {} values: mut List<Int> = []; f(mut values);',
    'values: mut List<Int> = [1]; push_back(mut values, values[0]);',
    'values: mut List<Int> = [1]; push_back(mut values, pop_back(mut values));',
    'a: mut List<Int> = []; b: mut List<Int> = [1]; push_back(mut a, pop_front(mut b));',
    'var values: mut List<Int> = [1]; push_back(mut values, ({other: List<Int> = [2]; values = other; 7}));',
  ]) {
    let observed = false;
    assert.throws(() => execute(compile(`report("before"); ${code}`), {
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
    b := 2; report(op(c = 3, 1, =b), op(9, a = 1, 2, 3), op(c = 3, b = 2, a = 1));
    report := fn(value: Int): Int { value + 1 }
    result := report(value = 7);
    output := fn(v: Int): Int { v } output(v = result);`).output, '123 123 123\n');
});
test('named call replacement checks only surviving slot types but evaluates every supplied expression', () => {
  assert.equal(run(`take := fn(a: Int, b: Int): Int { report("body"); a * 10 + b }
    report(take(({report("old"); "superseded"}), b = ({report("b"); 2}), a = ({report("a"); 1})));`).output,
    'old\nb\na\nbody\n12\n');
  fault('take := fn(a: Int): Int { a } take(unknown, a = 1);', 'TypeError');
  fault('take := fn(a: Int): Int { a } take(1, a = "bad");', 'TypeError');
});
test('named call arguments retain callee-before-arguments selection and stop on exits or faults', () => {
  assert.equal(run(`var op := fn(a: Int, b: Int): Int { a + b }
    report(op(b = ({op = fn(a: Int, b: Int): Int { a * b } 3}), a = 2));
    report(op(a = 2, b = 3));`).output, '5\n6\n');
  assert.deepEqual(run(`op := fn(a: Int, b: Int): Int { report("body"); 0 }
    op(b = ({report("first"); exit(7); 1}), a = ({report("later"); 2}));`),
    { code: 7, output: 'first\n', errors: '' });
  let output = '';
  assert.throws(() => execute(compile(`op := fn(a: Int): Int { report("body"); a }
    op(1 / 0, a = ({report("later"); 2}));`), {
    read: () => null, report: text => { output += text; }, reportError: () => {},
  }), LiteFault);
  assert.equal(output, '');
});
test('named recursive calls and aggregate arguments preserve public labels and stored tuple contracts', () => {
  assert.equal(run(`sum := fn(n: Int, total: Int): Int {
      if n == 0 { return total; } self(total = total + n, n = n - 1)
    }
    consume := fn(values: [Int; 2], pair: (:Int, label: String)): Int { values[0] + pair.0 }
    report(sum(total = 0, n = 4), consume(pair = (3, label = "tea"), values = [7, 8]));`).output,
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
    'report(value = 1);', 'inputInt(prompt = "Age: ");',
  ]) {
    let observed = false;
    assert.throws(() => execute(compile(`report("before"); ${code}`), {
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
    report(stored.r, stored.l, renamed.l, renamed.r, mixed.0, mixed.last);`).output,
    '20 10 20 10 20 10\n');
});
test('typed tuple declarations evaluate once and preserve source copies and old shadow targets', () => {
  assert.equal(run(`var original := (a = 1, b = 2);
    var renamed: (x: Int, y: Int) = ({report("source"); original});
    original = (a = 3, b = 4); renamed = (x = 5, y = 6);
    renamed: (left: Int, right: Int) = renamed;
    report(original.a, renamed.left, renamed.right);
    boxed := (v = Unit); unit: (:Unit,) = boxed; report(unit.0);`).output,
    'source\n3 5 6\nUnit\n');
});
test('typed tuple conversions produce ordinary label-sensitive values usable in calls and arrays', () => {
  assert.equal(run(`size := (width = 7, height = 9); point: (x: Int, y: Int) = size;
    take := fn(p: (x: Int, y: Int)): Int { p.x + p.y }
    copies := [point, point]; report(take(copies[0]));
    make := fn(): (x: Int, y: Int) { source := (7, 9); result: (x: Int, y: Int) = source; result }
    report(take(make()));`).output, '16\n16\n');
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
    assert.throws(() => execute(compile(`report("before"); ${code}`), {
      read: () => null, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), LiteFault);
    assert.equal(observed, false, code);
  }
  assert.throws(() => compile('target: (x: Int, y: Int) = (y = 2, x = 1);'),
    (error: unknown) => error instanceof LiteFault && error.message.includes('contextual tuple constructor routing'));
  assert.equal(run('target: (x: Int) = (x = 3); report(target.x);').output, '3\n');
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
    value := (({report("first"); 7}), =tea, cups = ({report("third"); 2}), true);
    report(value.0, value.tea, value.2, value.3);
    (a, b, c, d) := value; report(a, b, c, d);`).output,
    'first\nthird\n7 green 2 true\n7 green 2 true\n');
});
test('mixed tuple copies, function contracts and homogeneous arrays retain labels and order', () => {
  assert.equal(run(`var value := (1, name = "first", false); saved := value;
    value = (2, name = "second", true);
    identity := fn(v: (:Int, name: String, :Bool)): (:Int, name: String, :Bool) { v }
    items := [identity(saved), value];
    loop items as item { report(item.0, item.name, item.2); }`).output,
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
    assert.throws(() => execute(compile(`report("before"); ${code}`), {
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
  assert.equal(run(code.replace('report(total);', ''), '7\n5\n').output, 'First integer: Second integer: ');
});
test('Unit completion and no automatic binding/expression output', () => {
  for (const code of ['', ';;;;', 'x := 3;', '12;', 'x := 3; x']) assert.equal(run(code).output, '');
  assert.equal(run('report(()); report(Unit);').output, 'Unit\nUnit\n');
});
test('shadowing retains earlier copies; same-name initializer sees previous binding', () => {
  assert.equal(run('var x := 2; saved := x; x = 3; x := x + 4; report(saved); report(x);').output, '2\n7\n');
});
test('all syntax/name/type checking precedes input or output', () => {
  for (const code of ['report(1); unknown;', 'report(1); x := 1; x = 2;',
    'report(1); var x := 1; x = "text";', 'report(1); loop 3 {}',
    'report(1); x := 2\ny := 3;', 'report(1); report(inputInt(1));']) {
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
  assert.equal(run('report := 3; report').output, '');
  fault('inputInt := 3; report(inputInt());', 'TypeError');
});
test('precedence, exact integer division and fractional mixed division', () => {
  assert.equal(run('report(2 + 3 * 4); report((2 + 3) * 4); report(-7/2); report(7.0/2);').output,
    '14\n20\n-3\n3.5\n');
  assert.equal(run('report(9223372036854775807 / 3);').output, '3074457345618258602\n');
  assert.equal(run('report(-9223372036854775808);').output, '-9223372036854775808\n');
});
test('integer arithmetic cannot silently wrap', () => {
  for (const code of ['report(9223372036854775807 + 1);', 'report(-9223372036854775808 - 1);',
    'report(9223372036854775807 * 2);', 'var x := -9223372036854775808; report(-x);',
    'report(-9223372036854775808 / -1);']) fault(code, 'ArithmeticPanic');
  fault('x := 9223372036854775808;', 'SourceError');
  fault('x := -9223372036854775809;', 'SourceError');
});
test('zero divisors, non-finite results, and literals fault', () => {
  for (const code of ['report(1/0);', 'report(1.0 / 0);', 'report(1.0 / -0.0);',
    'report(1e308 * 2.0);']) fault(code, 'ArithmeticPanic');
  fault('report(1e999);', 'SourceError');
  fault('report(1 + 2.0);', 'TypeError');
});
test('direct input faults instead of retrying or fabricating values', () => {
  for (const input of ['', 'hello', '12.5', '9223372036854775808']) fault('report(inputInt());', 'InputFault', input);
  for (const input of ['', 'nan', 'Infinity', '1e999', '.5', '0x10']) fault('report(inputFloat());', 'InputFault', input);
  fault('report(inputWord());', 'InputFault', ' \t\n');
  assert.equal(run('report(inputInt()); report(inputFloat());', '-12 +2.5').output, '-12\n2.5\n');
});
test('line/word input, empty lines, unterminated final lines, Unicode, and shared cursor', () => {
  assert.equal(run('report(inputLine());', '\n').output, '\n');
  assert.equal(run('report(inputLine());', 'سلام\r\n').output, 'سلام\n');
  assert.equal(run('report(inputLine());', 'final').output, 'final\n');
  fault('report(inputLine());', 'InputFault');
  assert.equal(run('report(inputWord()); report(inputWord());', ' سلام  world ').output, 'سلام\nworld\n');
  assert.equal(run('report(inputInt()); report(inputLine()); report(inputLine());', '12\nnext\n').output, '12\n\nnext\n');
});
test('text tokens are data, including keyword and punctuation lookalikes', () => {
  assert.equal(run('report("var"); report(";"); report("+"); report("(");').output, 'var\n;\n+\n(\n');
  assert.equal(run('سلام := "Hi, " "🌍"; report(سلام); report("first\\nsecond");').output,
    'Hi, 🌍\nfirst\nsecond\n');
  fault('report("bad\\q");', 'SourceError');
});
test('nested/raw comments do not create code or separators', () => {
  assert.equal(run('/* outer /* inner */ /*# unmatched /* #*/ end */ report(3);').output, '3\n');
  assert.equal(run('/*## #*/ is content ##*/ report(4);').output, '4\n');
  fault('/*# ##*/', 'SourceError');
  fault('/* unclosed', 'SourceError');
  fault('report(1) /* comment */ report(2)', 'SourceError');
});
test('reportError is report-only and exit explicitly prevents continuation', () => {
  assert.deepEqual(run('reportError("error"); report("fallback");'),
    { code: 0, output: 'fallback\n', errors: 'error\n' });
  assert.deepEqual(run('report(7); exit(9); report(8);'), { code: 9, output: '7\n', errors: '' });
  assert.equal(run('exit(); report(1);').code, 0);
  fault('exit(256);', 'TypeError');
});
test('existing lessons remain unchanged and execute within the supported subset', () => {
  const cases = [
    ['001_add_two_numbers.lts', 'report(apples);', '12\n'],
    ['002_arithmetic_operations.lts', 'report(sum); report(difference); report(product); report(quotient);', '9\n5\n14\n3\n'],
    ['020_swap_values.lts', 'report(first_box); report(second_box);', '3\n7\n'],
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
    assert.equal(invoke('report(inputInt() * 2);', '12').stdout, '24\n');
    const bad = invoke('number := inputInt();\nreport(number);', 'bad');
    assert.equal(bad.status, 1); assert.match(bad.stderr, /:1:11: InputFault:/); assert.equal(bad.stdout, '');
    assert.equal(invoke('exit(7);').status, 7);
    const check = invoke('report(inputInt());', '', true);
    assert.equal(check.status, 0); assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
    writeFileSync(path, Buffer.from([0xff]));
    assert.equal(spawnSync(process.execPath, [cli.pathname, path]).status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Bool values and complete same-type conditional expressions', () => {
  assert.equal(run('var ready := true; ready = false; report(ready);').output, 'false\n');
  assert.equal(run('x := if false { 1 } else if true { 2 } else { 3 } report(x);').output, '2\n');
  assert.equal(run('report((if true { 2 } else { 3 }) + 4);').output, '6\n');
  assert.equal(run('report(if true { if false { "wrong" } else { "right" } } else { "wrong" });').output, 'right\n');
  assert.equal(run('report(if true { x := 1; } else { y := 2; });').output, 'Unit\n');
});
test('only the selected branch executes; action conditionals may omit else', () => {
  assert.equal(run('if false { report(1 / 0); } if true { report(7); }').output, '7\n');
  assert.equal(run('if true { report(3); } else { report(inputInt()); }').output, '3\n');
  assert.equal(run('if false { exit(5); } report(8);').output, '8\n');
  assert.equal(run('if true { exit(5); } report(8);').code, 5);
  const code = readFileSync(new URL('../examples/002-decisions.lts', import.meta.url), 'utf8');
  assert.equal(run(code, '0').output, 'Integer: zero\nbetween zero and nine\n');
  assert.equal(run(code, '5').output, 'Integer: positive\nbetween zero and nine\nquotient exceeds five\n');
});
test('blocks and branches have lexical scope, scalar results, and Unit declaration tails', () => {
  assert.equal(run('var x := 1; if true { x = 2; x := 8; report(x); } report(x);').output, '8\n2\n');
  assert.equal(run('x := { y := 2; y * 3;;;; } report(x);').output, '6\n');
  assert.equal(run('report({ x := 3; }); report({});').output, 'Unit\nUnit\n');
  assert.equal(run('{ x := 3; x; }').output, '');
  fault('if true { local := 4; } report(local);', 'TypeError');
  fault('x := { local := 4; local } report(local);', 'TypeError');
  fault('x := if true { local := 4; local } else { local };', 'TypeError');
});
test('truthiness, branch unions, partial value conditionals and malformed branches are rejected', () => {
  for (const code of ['if 1 { report(1); }', 'if "yes" {}', 'report(1 and true);', 'report(not 1);',
    'report(true + 1);', 'x := if true { 1 } else { "one" };', 'report(if true { 1 });',
    'var x := 3; x = if false { 4 };', 'x := if false { 4 };']) fault(code, 'TypeError');
  for (const code of ['if true report(1);', 'if true {} else report(2);', 'if true {',
    'if true {}; else {}', 'var true := 1;']) fault(code, 'SourceError');
  let output = '';
  assert.throws(() => execute(compile('report(1); if false { missing; }'), {
    read: () => null, report: text => { output += text; }, reportError: () => {},
  }), LiteFault);
  assert.equal(output, '');
});
test('short-circuit logic preserves operand order and Bool-only conditions', () => {
  assert.equal(run('report(false and inputInt() > 0); report(true or inputInt() > 0); report(inputInt());', '9').output,
    'false\ntrue\n9\n');
  assert.equal(run('report(true or false and false); report(not 0 < 2 < 3); report((not false) and true);').output,
    'true\nfalse\ntrue\n');
  assert.equal(run('report(and true and false); report(or false or true); if and true { report(3); }').output,
    'false\ntrue\n3\n');
  for (const code of ['report(and or true);', 'report(true and and false);', 'report(or);']) fault(code, 'SourceError');
  for (const code of ['report(and 3);', 'x := or "text";', 'report((and Unit));']) fault(code, 'TypeError');
  fault('report(true or missing);', 'TypeError');
});
test('comparison chains retain the middle value once and skip later operands', () => {
  assert.equal(run('report(0 < inputInt() < 10); report(inputInt());', '5 77').output, 'true\n77\n');
  assert.equal(run('report(10 < inputInt() < inputInt()); report(inputInt());', '5 77').output, 'false\n77\n');
  assert.equal(run('report(3 < 2 < (1 / 0));').output, 'false\n');
  assert.equal(run('report(1 < 3 > 2); report((1 < 2) == true); report(1 == 1 == 1);').output, 'true\ntrue\ntrue\n');
  assert.equal(run('var middle := 5; report(0 < middle < ({ middle = 100; 10 })); report(middle);').output,
    'true\n100\n');
  fault('report(3 < 2 < "bad");', 'TypeError');
  fault('report(1 < true);', 'TypeError');
});
test('all ten comparison operators complement their adjacent positive form', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['2 == 2', 'true'], ['2 =!= 2', 'false'], ['1 < 2', 'true'], ['1 <! 2', 'false'],
    ['2 <= 2', 'true'], ['2 <!= 2', 'false'], ['3 > 2', 'true'], ['3 >! 2', 'false'],
    ['2 >= 2', 'true'], ['2 >!= 2', 'false'], ['2 >! 3 < 4', 'true'],
    ['1.0 < 2.0 <= 2.0', 'true'], ['9223372036854775806 < 9223372036854775807', 'true'],
    ['"سلام" == "سلام"', 'true'], ['true =!= false', 'true'], ['() == Unit', 'true'],
  ];
  for (const [expression, expected] of cases) assert.equal(run(`report(${expression});`).output, `${expected}\n`, expression);
  fault('report(1 == 1.0);', 'TypeError');
  fault('report("a" < "b");', 'TypeError');
});

test('Boolean loops test before entry and reevaluate the header after each body', () => {
  assert.equal(run('loop false { report(inputInt()); } report(8);').output, '8\n');
  assert.equal(run('var i := 0; var sum := 0; loop i < 5 { i = i + 1; sum = sum + i; } report(sum);').output, '15\n');
  assert.equal(run('loop and inputInt() > 0 { report(1); } report(inputInt());', '2 1 0 99').output, '1\n1\n99\n');
  assert.equal(run('loop ({ loop { break; } inputInt() > 0 }) { report(7); }', '1 0').output, '7\n');
});
test('continue skips the body tail and reevaluates the condition', () => {
  assert.equal(run('loop inputInt() > 0 { if inputInt() == 2 { continue; } report(7); } report(inputInt());',
    '1 2 1 3 0 99').output, '7\n99\n');
  assert.equal(run('var i := 0; var sum := 0; loop i < 5 { i = i + 1; if i < 3 { continue; } sum = sum + i; } report(sum);').output, '12\n');
});
test('bare break ends the nearest loop without rechecking its condition', () => {
  assert.equal(run('loop inputInt() > 0 { break; } report(inputInt());', '1 8').output, '8\n');
  assert.equal(run('loop { if true { break; } report(1 / 0); } report(3);').output, '3\n');
  assert.equal(run('var outer := 0; var entries := 0; loop outer < 3 { outer = outer + 1; var inner := 0; loop true { inner = inner + 1; entries = entries + 1; if inner == 2 { break; } } } report(entries);').output, '6\n');
});
test('nested continue stays in the inner loop and execution resumes after it', () => {
  assert.equal(run('var outer := 0; var total := 0; loop outer < 2 { outer = outer + 1; var inner := 0; loop inner < 3 { inner = inner + 1; if inner < 3 { continue; } total = total + 1; } total = total + 10; } report(total);').output, '22\n');
});
test('body locals initialize on every entry; header and outer shadows keep their bindings', () => {
  assert.equal(run('var i := 0; var sum := 0; loop i < 3 { i = i + 1; var local := 0; local = local + 1; sum = sum + local; } report(sum);').output, '3\n');
  assert.equal(run('var i := 0; loop i < 2 { i = i + 1; i := 10; report(i); } report(i);').output, '10\n10\n2\n');
  fault('loop false { local := 7; } report(local);', 'TypeError');
});
test('loops reject invalid sources, escaping controls, and value/completion forms before effects', () => {
  for (const code of ['loop 1 {}', 'loop "items" {}', 'break;', 'continue;',
    'if false { break; }', 'x := loop false {};', 'report(loop false {});',
    'loop false { missing; }', 'loop false { var x := 1; x = true; }']) fault(code, 'TypeError');
  fault('loop { loop ({ break; true }) {} break; }', 'TypeError');
  fault('loop { loop ({ continue; false }) {} break; }', 'TypeError');
  for (const code of ['loop true report(1);', 'loop { break 3; }', 'loop { continue 3; }',
    'loop false {} then {}', 'loop false {} finally {}', 'var break := 1;']) fault(code, 'SourceError');
  let output = '';
  assert.throws(() => execute(compile('report(1); loop false { continue; missing; }'), {
    read: () => null, report: text => { output += text; }, reportError: () => {},
  }), LiteFault);
  assert.equal(output, '');
});
test('program exit and runtime faults propagate through nested loops', () => {
  assert.deepEqual(run('loop { loop { reportError("stop"); exit(9); } report(8); } report(7);'),
    { code: 9, output: '', errors: 'stop\n' });
  fault('loop { loop { report(1 / 0); } }', 'ArithmeticPanic');
  fault('loop { report(inputInt()); }', 'InputFault', '');
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
    report(double(4)); report(twice(1.5)); report(echo("hello"));
    report(negate(false)); report(nothing(())); double(99);`).output, '8\n3\nhello\ntrue\nUnit\n');
  assert.equal(run('action := fn(): Unit {} action();').output, '');
});
test('ordinary function values copy, shadow helpers, and replace only compatible var bindings', () => {
  assert.equal(run(`var op := fn(n: Int): Int { n * 2 }
    saved := op;
    op = fn(n: Int): Int { n * 3 }
    report(saved(4)); report(op(4));
    inputInt := fn(): Int { 7 }
    report(inputInt());`).output, '8\n12\n7\n');
  fault('op := fn(): Int { 1 } op = fn(): Int { 2 }', 'TypeError');
  fault('var op := fn(n: Int): Int { n } op = fn(n: Float): Int { 1 }', 'TypeError');
  fault('var op := fn(n: Int): Int { n } op = fn(x: Int): Int { x }', 'TypeError');
});
test('calls select the callee once before arguments and evaluate arguments left to right', () => {
  assert.equal(run(`var op := fn(n: Int): Int { n * 2 }
    report(op(({ op = fn(n: Int): Int { n * 3 } 4 })));
    report(op(4));
    combine := fn(a: Int, b: Int): Int { a * 10 + b }
    report(combine(({report(1); inputInt()}), ({report(2); inputInt()})));`, '3 4').output,
    '8\n12\n1\n2\n34\n');
});
test('self recursion and direct own-name recursion keep separate call locals', () => {
  assert.equal(run(`fib := fn(n: Int): Int {
      if n < 2 { return n; }
      left := self(n - 1);
      left + self(n - 2)
    }
    factorial := fn(n: Int): Int { if n <= 1 { 1 } else { n * factorial(n - 1) } }
    report(fib(8)); report(factorial(5)); report(fib(6));`).output, '21\n120\n8\n');
});
test('parameters, local vars and block shadows belong to each invocation', () => {
  assert.equal(run(`sum := fn(n: Int): Int {
      var total := 0;
      { n := 100; report(n); }
      var i := 0;
      loop i < n { i = i + 1; total = total + i; }
      total
    }
    report(sum(3)); report(sum(1));`).output, '100\n6\n100\n1\n');
  fault('f := fn(n: Int): Int { n = 2; n }', 'TypeError');
  fault('f := fn(): Int { local := 7; local } report(local);', 'TypeError');
});
test('an earlier same-name helper remains the ordinary named recursion target', () => {
  assert.equal(run(`step := fn(n: Int): Int { n * 2 }
    step := fn(n: Int): Int { if n == 0 { 0 } else { step(n - 1) } }
    report(step(3));
    step := fn(n: Int): Int { if n == 0 { 0 } else { self(n - 1) } }
    report(step(3));`).output, '4\n0\n');
});
test('self calls retain the executing implementation after its source binding is replaced', () => {
  assert.equal(run(`var step := fn(n: Int): Int { if n == 0 { 0 } else { 1 + self(n - 1) } }
    saved := step;
    step = fn(n: Int): Int { 100 }
    report(saved(4)); report(step(4));`).output, '4\n100\n');
});
test('admitted helper references read live bindings and ignore later shadows', () => {
  assert.equal(run(`var double := fn(n: Int): Int { n * 2 }
    quadruple := fn(n: Int): Int { double(double(n)) }
    report(quadruple(1));
    double = fn(n: Int): Int { n * 3 }
    report(quadruple(1));
    double := fn(n: Int): Int { n * 4 }
    report(quadruple(1)); report(double(1));`).output, '4\n9\n9\n4\n');
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
    report(first(2)); report(second(2));`).output, '6\n8\n');
});
test('return exits the nearest function through loops and nested calls return locally', () => {
  assert.equal(run(`inner := fn(): Int { return 7; }
    outer := fn(flag: Bool): Int {
      loop flag { return inner(); }
      if flag { return 1; } else { return 2; }
      999
    }
    report(outer(true)); report(outer(false));
    stop := fn(): Unit { loop { return; } () }
    loop { stop(); report(3); break; }`).output, '7\n2\n3\n');
  fault('loop { f := fn(): Unit { break; } break; }', 'TypeError');
  fault('loop { f := fn(): Unit { continue; } break; }', 'TypeError');
});
test('exit, input faults and arithmetic faults propagate through user functions', () => {
  assert.deepEqual(run('stop := fn(): Int { exit(9); } loop { report(stop()); }'), { code: 9, output: '', errors: '' });
  fault('f := fn(): Int { inputInt() } report(f());', 'InputFault');
  fault('f := fn(n: Int): Int { 1 / n } report(f(0));', 'ArithmeticPanic');
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
    'f := fn(): Int { 1 } report(f);', 'f := fn(): Int { 1 } report(f == f);',
    'f := fn(n: Number): Int { 1 }', 'f := fn(): Int { self }',
  ]) {
    let observed = false;
    assert.throws(() => execute(compile(`report(99); ${code}`), {
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
    report(saved); report("" + prefix + "");
    report("line\n" + "two");`).output, 'hello, سلام🙂\nchanged\nline\ntwo\n');
  for (const code of ['report("x" + 1);', 'report(1 + "x");', 'report("x" - "y");',
    'report("x" * 2);', 'report(+"x");']) fault(code, 'TypeError');
});
test('text helpers use consistent code-point positions without normalization or grapheme grouping', () => {
  assert.equal(run(`text := "A🙂éسلام";
    report(textLength(text)); report(textAt(text, 1)); report(textAt(text, 3));
    report(textSlice(text, 0, 2)); report(textSlice(text, 2, 4));
    report(textSlice(text, 4, 8)); report(textLength(""));
    report(textLength("é")); report(textLength("é"));`).output,
    '8\n🙂\ń\nA🙂\né\nسلام\n0\n1\n2\n');
  assert.equal(run('report(textAt("🙂", 0)); report(textLength("👩‍💻"));').output, '🙂\n3\n');
});
test('textSlice admits empty and full half-open intervals, including the end of empty text', () => {
  assert.equal(run(`report(textSlice("", 0, 0));
    report(textSlice("abc", 0, 0)); report(textSlice("abc", 3, 3));
    report(textSlice("abc", 0, 3)); report(textSlice("abc", 1, 2));
    source := "a🙂b";
    copy := textSlice(source, 0, 1) + textSlice(source, 1, 3);
    report(copy == source);`).output, '\n\n\nabc\nb\ntrue\n');
});
test('invalid text positions fault without negative wrapping, clamping or huge-index rounding', () => {
  for (const code of ['textAt("", 0);', 'textAt("abc", -1);', 'textAt("abc", 3);',
    'textAt("🙂", 1);', 'textAt("abc", 9223372036854775807);',
    'textSlice("abc", -1, 2);', 'textSlice("abc", 2, 1);', 'textSlice("abc", 0, 4);',
    'textSlice("abc", 4, 4);', 'textSlice("", 0, 1);',
    'textSlice("abc", 0, 9223372036854775807);']) fault(code, 'BoundPanic');
});
test('text operands and helper arguments execute once in written order before bounds checks', () => {
  assert.equal(run(`report(({report(1); inputWord()}) + ({report(2); inputWord()}));
    report(textSlice(({report(3); inputWord()}), ({report(4); 1}), ({report(5); 3})));`,
  'hello world abcde').output, '1\n2\nhelloworld\n3\n4\n5\nbc\n');
  let observed = '';
  assert.throws(() => execute(compile('textSlice("abc", ({report(1); -1}), ({report(2); 2}));'), {
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
    assert.throws(() => execute(compile(`report(99); ${code}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), (error: unknown) => error instanceof LiteFault && error.category === 'TypeError', code);
    assert.equal(observed, false, code);
  }
  assert.equal(run('textLength := fn(text: String): Int { 7 } report(textLength("abc"));').output, '7\n');
});
test('a Lite function can scan and reconstruct text recursively with the temporary helpers', () => {
  assert.equal(run(`reverse := fn(text: String): String {
      length := textLength(text);
      if length == 0 { return ""; }
      textAt(text, length - 1) + self(textSlice(text, 0, length - 1))
    }
    report(reverse("a🙂ب")); report(reverse(""));`).output, 'ب🙂a\n\n');
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
    writeFileSync(path, 'report(textLength(inputLine())); report(textAt("🙂", 0));');
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
    report(values.0 + 1); report(values.1); report(values.2); report(not values.3); report(values.4);
    report((1, 2,).1); report(-(3, 4).0);`).output, '8\n2.5\ntea\nfalse\nUnit\n2\n-3\n');
  assert.equal(run('pair := (1, 2); pair;').output, '');
});
test('tuple expressions and receivers evaluate once in written order', () => {
  assert.equal(run(`pair := (({report(1); inputInt()}), ({report(2); inputInt()}));
    report(pair.0); report(pair.1);
    make := fn(): (:Int, :Int) { report(3); (8, 9) }
    (a, b) := make(); report(a); report(b); report(make().1);`, '4 5').output,
    '1\n2\n4\n5\n3\n8\n9\n3\n9\n');
});
test('Unit, grouping, singleton tuples and Unit-valued positions keep distinct shapes', () => {
  assert.equal(run(`one := (42,); (whole) := one; (value,) := one;
    report(whole.0); report(value);
    unitBox := (Unit,); report(unitBox.0);
    () := (); () := Unit;
    action := fn(): () { report(7); () }
    () := action();
    takeUnit := fn(value: (Unit)): Int { 9 }
    report(takeUnit(()));`).output, '42\n42\nUnit\n7\n9\n');
  for (const source of ['(value,) := 42;', 'value := (42); report(value.0);',
    '() := 42;', '() := (Unit,);', 'report(().0);',
    'f := fn(value: Unit): Unit { value } f();',
    'f := fn(box: (:Unit,)): Unit { box.0 } f(());']) fault(source, 'TypeError');
});
test('destructuring resolves the source first, then shadows receiver names in written order', () => {
  assert.equal(run(`x := 7; y := 9;
    (x, y) := (y, x); report(x); report(y);
    (x, x) := (1, "last"); report(x);
    (_, _) := (3, "visible"); report(_);
    ((whole)) := (4, 5); report(whole.1);
    (a, (b)) := (6, 7); report(a); report(b);`).output, '9\n7\nlast\nvisible\n5\n6\n7\n');
  assert.equal(run('report({ (a, b) := (1, 2); });').output, 'Unit\n');
  fault('{ (a, b) := (1, 2); } report(a);', 'TypeError');
  fault('(a, b) := (a, 2);', 'TypeError');
});
test('ordinary tuple copies survive whole-value var replacement and later shadows', () => {
  assert.equal(run(`var pair := (1, "first");
    saved := pair; (count, text) := pair;
    pair = (2, "second");
    pair := (3, "third");
    report(saved.0); report(saved.1); report(count); report(text); report(pair.1);`).output,
    '1\nfirst\n1\nfirst\nthird\n');
  fault('pair := (1, 2); pair = (3, 4);', 'TypeError');
  fault('var pair := (1, 2); pair = (3, "wrong");', 'TypeError');
  fault('var pair := (1, 2); pair = (3,);', 'TypeError');
});
test('explicit tuple inputs and outputs support tail returns, early returns and compatible replacement', () => {
  assert.equal(run(`var make := fn(n: Int): (:Int, :String) { (n, "first") }
    make = fn(n: Int): (:Int, :String) { if n < 0 { return (0, "negative"); } (n, "normal") }
    describe := fn(pair: (:Int, :String)): String { pair.1 }
    report(describe(make(7))); report(describe(make(-1)));
    one := fn(n: Int): (:Int,) { (n,) }
    takeOne := fn(pair: (:Int,)): Int { pair.0 }
    report(takeOne(one(8)));
    report((if true { (1, "yes") } else { (2, "no") }).1);`).output, 'normal\nnegative\n8\nyes\n');
  fault('one := fn(): (:Int,) { 42 }', 'TypeError');
  fault('one := fn(): Int { (42,) }', 'TypeError');
  fault('make := fn(): (:Int, :String) { return (1, false); }', 'TypeError');
});
test('a tuple is one ordinary call argument and is copied at its evaluation position', () => {
  assert.equal(run(`var pair := (10, 11);
    first := fn(original: (:Int, :Int), ignored: Unit): Int { original.0 }
    report(first(pair, ({pair = (20, 30); Unit}))); report(pair.0);
    combine := fn(a: Int, b: Int): Int { a + b }
    report(combine(pair.0, pair.1));`).output, '10\n20\n50\n');
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
    report(sum((4, 7))); report(sum((2, 1)));`).output, '17\n4\n');
  fault('pair := (1, 2); f := fn(): Int { pair.0 }', 'TypeError');
});
test('invalid tuple shapes, positions and transfers fail before any input or output', () => {
  for (const source of ['(a, b) := (1,);', '(a,) := ();',
    'pair := (1, 2); pair.2;', 'pair := (1, 2); pair.9223372036854775807;',
    'f := fn(pair: (:Int, :String)): String { pair.1 } f((1, true));',
    'pair := (1, 2); report(pair);', 'pair := (1, 2); report(pair == pair);',
    'pair := (1, 2); pair();', 'textLength((1, 2));',
    'f := fn(): Int { 1 } value := (f,);', 'value := ((1, 2), 3);',
    'f := fn(): (:Int, :(:Int, :Int)) { (1, 2) }']) {
    let observed = false;
    assert.throws(() => execute(compile(`report(99); ${source}`), {
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
    writeFileSync(source, 'report(inputInt()); reportError("done"); exit(7);');
    const result = invoke(['run', source], '19\n');
    assert.equal(result.error, undefined); assert.equal(result.status, 7);
    assert.equal(result.stdout, '19\n'); assert.equal(result.stderr, 'done\n');
    writeFileSync(source, 'report(inputInt());');
    const check = invoke(['run', '--check', source]);
    assert.equal(check.error, undefined); assert.equal(check.status, 0);
    assert.equal(check.stdout, ''); assert.equal(check.stderr, '');
    writeFileSync(source, 'report(1/0);');
    const fault = invoke(['run', source]);
    assert.equal(fault.error, undefined); assert.equal(fault.status, 1);
    assert.equal(fault.stdout, ''); assert.match(fault.stderr, /program with spaces\.lts:1:9: ArithmeticPanic:/);
    for (const args of [[], ['run'], ['unknown', source]]) {
      const usage = invoke(args);
      assert.equal(usage.error, undefined); assert.equal(usage.status, 2);
      assert.equal(usage.stdout, ''); assert.match(usage.stderr, /^Usage: \.\/lite run /);
    }
    const alias = join(dir, 'project with spaces');
    symlinkSync(root, alias, 'dir');
    writeFileSync(source, 'report(23);');
    const spaced = invoke(['run', source], '', join(alias, 'lite'));
    assert.equal(spaced.error, undefined); assert.equal(spaced.status, 0);
    assert.equal(spaced.stdout, '23\n'); assert.equal(spaced.stderr, '');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('inputInt optionally writes an exact String prompt before reading without an added newline', () => {
  assert.deepEqual(run('x := inputInt("Age: "); report(x);', '7'), { code: 0, output: 'Age: 7\n', errors: '' });
  assert.equal(run('x := inputInt(""); report(x);', '8').output, '8\n');
  assert.equal(run('x := inputInt("first\nsecond: "); report(x);', '9').output, 'first\nsecond: 9\n');
  const events: string[] = [];
  let supplied = false;
  execute(compile('inputInt(({report("argument"); "prompt: "}));'), {
    read: () => { events.push('read'); if (supplied) return null; supplied = true; return '1'; },
    report: text => { events.push(text); }, reportError: () => {},
  });
  assert.deepEqual(events, ['argument\n', 'prompt: ', 'read', 'read']);
});
test('invalid or missing input faults after one prompt; prompt output failure prevents reading', () => {
  for (const input of ['', 'bad', '9223372036854775808']) {
    let output = '';
    let cursor = 0;
    assert.throws(() => execute(compile('inputInt("Number: "); report("unreachable");'), {
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
  assert.equal(run('report("sum:", 1, 2); report(1, 2, 3); report("hello", "world");').output,
    'sum: 1 2\n1 2 3\nhello world\n');
  assert.equal(run('report("", "", 7); report(false, (), 2.5); report("%s {}", "literal");').output,
    '  7\nfalse Unit 2.5\n%s {} literal\n');
  assert.equal(run('report("single"); reportError("error");').output, 'single\n');
});
test('report evaluates each argument once left to right and writes the joined line after evaluation', () => {
  assert.equal(run('report(({report("left"); inputInt()}), ({report("right"); inputInt()}));', '3 4').output,
    'left\nright\n3 4\n');
  let output = '';
  assert.throws(() => execute(compile('report(({report("first effect"); 1}), 1/0);'), {
    read: () => null, report: text => { output += text; }, reportError: () => {},
  }), (error: unknown) => error instanceof LiteFault && error.category === 'ArithmeticPanic');
  assert.equal(output, 'first effect\n');
});
test('prompt and report signatures fail before effects without broadening other helpers or tuple spread', () => {
  for (const code of ['inputInt(7);', 'inputInt("a", "b");', 'inputInt(("a",));',
    'report();', 'report("prefix", (1, 2));', 'report("prefix", missing);',
    'inputFloat("prompt");', 'inputLine("prompt");', 'inputWord("prompt");', 'reportError("a", 1);']) {
    let observed = false;
    assert.throws(() => execute(compile(`report("before"); ${code}`), {
      read: () => { observed = true; return null; }, report: () => { observed = true; }, reportError: () => { observed = true; },
    }), (error: unknown) => error instanceof LiteFault && error.category === 'TypeError', code);
    assert.equal(observed, false, code);
  }
  fault('values := (1, 2); report(...values);', 'SourceError');
  assert.equal(run('report := fn(a: Int, b: Int): Int { a + b } result := report(2, 3);').output, '');
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
    report(token.kind, token.0, token.text, token.1, token.count + 1, not token.ready, token.empty);`).output,
    'number number 12 12 4 false Unit\n');
  fault('kind := "number"; text := "12"; token := (kind, text); report(token.kind);', 'TypeError');
  fault('position := "kind"; token := (kind = "number"); report(token.position);', 'TypeError');
  assert.equal(run('token := (نام = "Ali"); report(token.نام);').output, 'Ali\n');
  fault('token := (Kind = "number"); report(token.kind);', 'TypeError');
});
test('same-name shorthand copies a lexical value while explicit labels do not assign that lexical binding', () => {
  assert.equal(run(`var kind := "number"; text := "12";
    token := (= kind, = text); kind = "changed";
    other := (kind = "label only");
    report(token.kind, token.text, kind, other.kind);
    _ := 7; box := (= _); report(box._);`).output,
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
    report(take(one), takeComma(oneComma), shorthand.value, grouped, empty(emptyBox));
    (component,) := one; report(component);`).output, '42 43 44 44 Unit\n42\n');
  fault('() := (empty = Unit);', 'TypeError');
  fault('f := fn(box: (value: Int)): Int { box.value } f(42);', 'TypeError');
});
test('named tuple construction and member receivers evaluate once in written order', () => {
  assert.equal(run(`token := (kind = ({report("kind"); inputWord()}), text = ({report("text"); inputWord()}));
    report(token.kind, token.text);
    make := fn(): (a: Int, b: Int) { report("called"); (a = 1, b = 2) }
    report(make().b);`, 'number 12').output, 'kind\ntext\nnumber 12\ncalled\n2\n');
});
test('named tuple copies, grouping and positional binding preserve stored order and independent values', () => {
  assert.equal(run(`var source := (text = "12", kind = "number");
    saved := source; (whole) := source; (first, second) := source;
    source = (text = "99", kind = "changed");
    report(saved.text, whole.kind, first, second, source.text);
    (same, same) := saved; report(same);
    source := (value = 7); report(saved.text, source.value);`).output,
    '12 number 12 number 99\nnumber\n12 7\n');
});
test('explicit named tuple inputs/results and recursive calls preserve label-sensitive contracts', () => {
  assert.equal(run(`var make := fn(kind: String, text: String): (kind: String, text: String) { (= kind, = text) }
    make = fn(kind: String, text: String): (kind: String, text: String) { return (kind = kind, text = text); }
    describe := fn(token: (kind: String, text: String)): String { token.kind + ": " + token.text }
    report(describe(make("number", "12")));
    sum := fn(state: (n: Int, extra: Int)): Int {
      if state.n == 0 { return state.extra; }
      state.n + self((n = state.n - 1, extra = state.extra))
    }
    report(sum((n = 4, extra = 7)));
    report((if true { (a = 1) } else { (a = 2) }).a);`).output, 'number: 12\n17\n1\n');
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
    ['token := (kind = "number"); report(token);', 'TypeError'],
  ]) {
    if (code === undefined || category === undefined) throw new Error('bad fixture');
    let observed = false;
    assert.throws(() => execute(compile(`report("before"); ${code}`), {
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
    report(integers[0], integers.2, floats[1], words.0, not flags[1], units.2);
    loop units as value { report(value); }`).output, '1 3 2.5 a true Unit\nUnit\nUnit\nUnit\n');
  fault('pair := (1, 2); pair[0];', 'TypeError');
});
test('array constructors and bracket receivers/indices evaluate once in written order', () => {
  assert.equal(run(`values := [({report("first"); inputInt()}), ({report("second"); inputInt()})];
    report(values[0], values[1]);
    make := fn(): [Int; 3] { report("receiver"); [10, 20, 30] }
    report(make()[({report("index"); inputInt()})]); report(inputInt());`, '3 4 2 9').output,
    'first\nsecond\n3 4\nreceiver\nindex\n30\n9\n');
  assert.equal(run('var values := [10, 20]; report(values[({values = [30, 40]; 1})]); report(values[1]);').output,
    '20\n40\n');
});
test('array bracket bounds fault safely while invalid static dot positions fail before execution', () => {
  for (const index of ['-1', '3', '9223372036854775807']) fault(`values := [10, 20, 30]; report(values[${index}]);`, 'BoundPanic');
  fault('values := [10, 20, 30]; if false { values.3; }', 'TypeError');
  assert.equal(run('values := [1]; if false { report(values[7]); } report(2);').output, '2\n');
  fault('values := [1]; report(values[0.0]);', 'TypeError');
  fault('values := [1]; values.9223372036854775807;', 'TypeError');
});
test('array traversal evaluates its source once and creates fresh scoped body/item bindings', () => {
  assert.equal(run(`make := fn(): [Int; 3] { report("source"); [2, 4, 6] }
    var sum := 0;
    loop make() as value {
      var local := 0; local = local + 1;
      sum = sum + value + local;
    }
    report(sum);`).output, 'source\n15\n');
  fault('loop [1, 2] as value {} report(value);', 'TypeError');
  fault('loop [1, 2] as value { value = 3; }', 'TypeError');
});
test('unnamed array traversal introduces no implicit variable and receiver shadowing stays in the body', () => {
  assert.equal(run('loop [1, 2] { report("tick"); }').output, 'tick\ntick\n');
  assert.equal(run('values := [3, 4]; loop values as values { report(values); } report(values[0]);').output, '3\n4\n3\n');
  fault('loop [1] { report(it); }', 'TypeError');
  fault('loop true as value { break; }', 'TypeError');
  fault('result := loop [1] as value {};', 'TypeError');
});
test('traversal retains the evaluated array value when its original variable is replaced', () => {
  assert.equal(run(`var values := [1, 2, 3];
    loop values as value { report(value); values = [9, 8, 7]; }
    report(values[0], values[2]);`).output, '1\n2\n3\n9 7\n');
});
test('array loop break/continue target the nearest loop without restarting the source', () => {
  assert.equal(run(`var total := 0;
    loop [1, 2, 3, 4] as value {
      if value == 2 { continue; }
      if value == 4 { break; }
      total = total + value;
    }
    report(total);
    loop [1, 2] as outer {
      loop [3, 4] as inner { if inner == 3 { continue; } report(outer, inner); break; }
    }`).output, '4\n1 4\n2 4\n');
  assert.equal(run(`loop [({report("a"); 1}), ({report("b"); 2})] as item {
    report(item); break;
  }`).output, 'a\nb\n1\n');
  assert.equal(run('loop [1, 2] as value { loop { report(value); break; } }').output, '1\n2\n');
});
test('arrays of flat named and unnamed tuples preserve member types and body destructuring', () => {
  assert.equal(run(`tokens := [(kind = "number", text = "12"), (kind = "symbol", text = "+")];
    report(tokens.0.kind, tokens[1].text);
    loop tokens as token { (kind, text) := token; report(kind, text); }
    pairs := [(1, "a"), (2, "b")];
    loop pairs as pair { report(pair.0, pair.1); }`).output, 'number +\nnumber 12\nsymbol +\n1 a\n2 b\n');
});
test('explicit fixed-array inputs/results check element contracts and extents', () => {
  assert.equal(run(`make := fn(): [Int; 3] { return [1, 2, 3]; }
    first := fn(values: [Int; 3]): Int { values[0] }
    token := fn(values: [(kind: String, text: String); 2]): String { values[1].text }
    report(first(make())); report(token([(kind = "n", text = "1"), (kind = "s", text = "+")]));`).output, '1\n+\n');
  fault('f := fn(values: [Int; 3]): Int { values[0] } f([1, 2]);', 'TypeError');
  fault('f := fn(): [Int; 2] { [1.0, 2.0] }', 'TypeError');
  fault('f := fn(values: [(x: Int); 1]): Int { values[0].x } f([(y = 1)]);', 'TypeError');
  fault('var f := fn(values: [Int; 2]): Int { values[0] } f = fn(values: [Int; 3]): Int { values[0] }', 'TypeError');
});
test('ordinary fixed-array copies and supplied arguments survive source replacement', () => {
  assert.equal(run(`var values := [10, 11]; saved := values;
    first := fn(original: [Int; 2], ignored: Unit): Int { original[0] }
    report(first(values, ({values = [20, 30]; Unit})), saved[0], values[0]);
    values := [40, 50]; report(saved[1], values[1]);`).output, '10 10 20\n11 50\n');
  fault('values := [1, 2]; values = [3, 4];', 'TypeError');
  fault('var values := [1, 2]; values = [3];', 'TypeError');
});
test('array arguments and item locals stay separate through recursive calls', () => {
  assert.equal(run(`sum := fn(values: [Int; 3], count: Int): Int {
      if count == 0 { return 0; }
      saved := values[count - 1];
      saved + self(values, count - 1)
    }
    report(sum([1, 2, 3], 3)); report(sum([4, 5, 6], 2));`).output, '6\n9\n');
  fault('values := [1, 2]; f := fn(): Int { values[0] }', 'TypeError');
});
test('returns, exit and bounds faults propagate correctly through array traversal', () => {
  assert.equal(run(`first := fn(values: [Int; 2]): Int { loop values as value { return value; } 0 }
    report(first([7, 8]));`).output, '7\n');
  assert.deepEqual(run('loop [1, 2] { reportError("stop"); exit(6); } report(9);'), { code: 6, output: '', errors: 'stop\n' });
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
    ['loop [1] as value { unknown; }', 'TypeError'], ['report([1, 2]);', 'TypeError'],
    ['var values := [1, 2]; values[0] = 3;', 'SourceError'],
    ['mut values := [1, 2];', 'SourceError'], ['f := fn(values: [Int]): Int { 1 }', 'SourceError'],
    ['f := fn(values: [Int; 2.0]): Int { 1 }', 'SourceError'],
    ['loop [1, 2] as (a, b) {}', 'SourceError'],
    ['values := [1, 2]; report(values.count);', 'TypeError'],
    ['values := [1, 2]; values[0:1];', 'SourceError'],
  ]) {
    if (code === undefined || category === undefined) throw new Error('bad fixture');
    let observed = false;
    assert.throws(() => execute(compile(`report("before"); ${code}`), {
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
