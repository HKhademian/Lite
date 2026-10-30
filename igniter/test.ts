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
  const code = readFileSync(new URL('./examples/decisions.lts', import.meta.url), 'utf8');
  assert.equal(run(code, '0').output, 'zero\nbetween zero and nine\n');
  assert.equal(run(code, '5').output, 'positive\nbetween zero and nine\nquotient exceeds five\n');
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
