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

test('first checkpoint: stdin integers, mutation, arithmetic and explicit report', () => {
  const code = readFileSync(new URL('../examples/001-double-sum.lts', import.meta.url), 'utf8');
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
  const code = readFileSync(new URL('../examples/002-decisions.lts', import.meta.url), 'utf8');
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
  assert.equal(run(source, '3 -2 4 0').output, '7\n');
  assert.equal(run(source, '0').output, '0\n');
  const result = spawnSync(process.execPath, [new URL('./cli.ts', import.meta.url).pathname, example.pathname], {
    input: '3\n-2\n4\n0\n', encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '7\n');
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
    'self := 1;', 'f := fn(n): Int { n }', 'f := fn(n: Int = 2): Int { n }',
    'f := fn(n: Int): Int { n } f(n=2);']) fault(code, 'SourceError');
});
test('factorial example runs through real CLI with checked results and failures', () => {
  const example = new URL('../examples/004-factorial.lts', import.meta.url);
  const source = readFileSync(example, 'utf8');
  assert.equal(run(source, '0').output, '1\n');
  assert.equal(run(source, '5').output, '120\n');
  fault(source, 'ArithmeticPanic', '21');
  for (const [input, status, output, errors] of [
    ['5', 0, '120\n', ''], ['-1', 2, '', 'expected a nonnegative integer\n'],
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
  assert.equal(run(source, '12 + (003 * 4)\n').output,
    'number: 12\nsymbol: +\nsymbol: (\nnumber: 003\nsymbol: *\nnumber: 4\nsymbol: )\n');
  assert.equal(run(source, '123').output, 'number: 123\n');
  assert.equal(run(source, ' \t\n').output, '');
  assert.equal(run(source, '\n').output, '');
  assert.equal(run(source, '-1/2').output, 'symbol: -\nnumber: 1\nsymbol: /\nnumber: 2\n');
  assert.deepEqual(run(source, '🙂'), { code: 2, output: '', errors: 'unsupported symbol: 🙂\n' });
  fault(source, 'InputFault');
});
test('real CLI runs the Lite tokenizer, preserves supplementary text, and reports bounds locations', () => {
  const cli = new URL('./cli.ts', import.meta.url).pathname;
  const example = new URL('../examples/005-scan-arithmetic.lts', import.meta.url).pathname;
  for (const [input, status, output, errors] of [
    ['12 + 30', 0, 'number: 12\nsymbol: +\nnumber: 30\n', ''],
    ['🙂', 2, '', 'unsupported symbol: 🙂\n'],
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
    '(a, ...rest) := (1, 2);', '(self, b) := (1, 2);', 'pair := (left = 1, right = 2);',
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
