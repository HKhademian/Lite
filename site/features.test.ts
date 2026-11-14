import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { heroSample, showcaseSamples } from './groups.ts';
import { highlightLite } from './highlight.ts';
import { playSamples } from './play-samples.ts';
import { stripLiteTs } from './strip-ts.ts';

const root = fileURLToPath(new URL('..', import.meta.url));

test('stripLiteTs strips definite assignments, generic helpers, and as casts for runnable JS', () => {
  const routedSource = [
    'const lite_res = (() => {',
    '  let lite$slot_0!: bigint;',
    '  let lite$slot_1!: bigint;',
    '  lite$slot_1 = 20n;',
    '  lite$slot_0 = 10n;',
    '  return lite$slot_0 - lite$slot_1;',
    '})();',
    'function lite$listPopFront<T>(items: T[], at: number): T {',
    '  if (items.length === 0) throw new Error(String(at));',
    '  return items.shift() as T;',
    '}',
    'return { res: lite_res, first: lite$listPopFront<string>(["first", "second"], 0) };',
  ].join('\n');

  const stripped = stripLiteTs(routedSource);
  assert(!stripped.includes('!:'));
  assert(!stripped.includes('<T>'));
  assert(!stripped.includes('<string>'));
  assert(!stripped.includes(' as T'));

  const result = (new Function(stripped) as () => { res: bigint; first: string })();
  assert.equal(result.res, -10n);
  assert.equal(result.first, 'first');
});

test('highlightLite highlights newer built-in types and operators', () => {
  const html = highlightLite('pub f := fn(a: Int64, b: Float64, c: Double): Unit { var x := a ** 2; x += 1; }');
  for (const typeName of ['Int64', 'Float64', 'Double', 'Unit']) {
    assert(html.includes(`<span class="tok-type">${typeName}</span>`), `missing type highlight: ${typeName}`);
  }
  const opHtml = highlightLite('a ** b += c :/= d :%= e <!= f >!= g <! h >! i');
  for (const op of ['**', '+=', ':/=', ':%=', '&lt;!=', '&gt;!=', '&lt;!', '&gt;!']) {
    assert(opHtml.includes(`<span class="tok-op">${op}</span>`), `missing operator highlight: ${op}`);
  }
});

test('showcaseSamples includes examples covering named calls, tuples, arrays, and lists', () => {
  const ids = new Set(showcaseSamples.map(sample => sample.id));
  for (const expected of [
    'fixed-tuples',
    'named-arguments',
    'named-tuples',
    'fixed-arrays',
    'mixed-tuples',
    'tuple-label-conversion',
    'growable-lists',
    'integer-calculator',
  ]) {
    assert(ids.has(expected), `missing showcase sample: ${expected}`);
  }
});

test('all site showcase and play sample sources live outside site/', () => {
  for (const sample of [heroSample, ...showcaseSamples, ...playSamples]) {
    assert(!sample.file.startsWith('site/'), `sample source should not live in site/: ${sample.file}`);
    assert(sample.file.startsWith('language/'), `expected language/ sample location: ${sample.file}`);
    assert(existsSync(join(root, sample.file)), `missing sample file: ${sample.file}`);
  }
});
