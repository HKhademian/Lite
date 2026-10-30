import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('first checkpoint: stdin integers, mutation, arithmetic and explicit report', () => {
  const code = readFileSync(new URL('./examples/double-sum.lts', import.meta.url), 'utf8');
  assert.deepEqual(run(code, '7\n5\n'), { code: 0, output: '24\n', errors: '' });
  assert.equal(run(code.replace('report(total);', ''), '7\n5\n').output, '');
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
