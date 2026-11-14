import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { heroSample, sampleGroups, showcaseSamples } from './groups.ts';
import { highlightLite } from './highlight.ts';
import { playGroups, playSamples } from './play-samples.ts';
import { stripLiteTs } from './strip-ts.ts';

const root = fileURLToPath(new URL('..', import.meta.url));

function listSampleFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSampleFiles(full));
    else if (entry.name.endsWith('.lts')) out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

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
  const html = highlightLite('pub f := fn(a: Int8, b: Int16, c: Int32, d: Int64, e: Float32, g: Float64, h: Double): Unit { var x := a ** 2; x += 1; } match { x > 0 { x } _ { 0 } }');
  for (const typeName of ['Int8', 'Int16', 'Int32', 'Int64', 'Float32', 'Float64', 'Double', 'Unit']) {
    assert(html.includes(`<span class="tok-type">${typeName}</span>`), `missing type highlight: ${typeName}`);
  }
  assert(html.includes('<span class="tok-keyword">match</span>'), 'missing keyword highlight: match');
  const opHtml = highlightLite('a ** b += c :/= d :%= e <!= f >!= g <! h >! i');
  for (const op of ['**', '+=', ':/=', ':%=', '&lt;!=', '&gt;!=', '&lt;!', '&gt;!']) {
    assert(opHtml.includes(`<span class="tok-op">${op}</span>`), `missing operator highlight: ${op}`);
  }
});

test('showcaseSamples includes examples covering named calls, tuples, arrays, and lists', () => {
  const ids = new Set(showcaseSamples.map(sample => sample.id));
  for (const expected of [
    'numeric-widths',
    'subjectless-match',
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

test('all site showcase and play sample sources live outside site/ and match samples/ folders 1:1', () => {
  const folderByGroup = new Map<string, string>();
  for (const group of sampleGroups) {
    if (group.folder) folderByGroup.set(group.id, group.folder);
  }
  for (const group of playGroups) {
    folderByGroup.set(group.id, group.folder);
  }

  const all = [heroSample, ...showcaseSamples, ...playSamples];
  for (const sample of all) {
    assert(!sample.file.startsWith('site/'), `sample source should not live in site/: ${sample.file}`);
    assert(existsSync(join(root, sample.file)), `missing sample file: ${sample.file}`);
  }

  const catalogFiles = [...showcaseSamples, ...playSamples]
    .filter(s => s.file.startsWith('samples/'))
    .map(s => s.file);
  assert.equal(new Set(catalogFiles).size, catalogFiles.length, 'duplicate samples/ entry in catalog');
  assert.deepEqual([...catalogFiles].sort(), listSampleFiles(join(root, 'samples')).sort());

  for (const sample of [...showcaseSamples, ...playSamples]) {
    const expectedFolder = folderByGroup.get(sample.group);
    if (expectedFolder !== undefined) {
      assert(
        sample.file.startsWith(`${expectedFolder}/`),
        `${sample.id} (${sample.file}) should live under ${expectedFolder}/`,
      );
    } else {
      assert(
        sample.file.startsWith('language/examples/') && !sample.file.slice('language/examples/'.length).includes('/'),
        `${sample.id} should reference a top-level language/examples/ file`,
      );
    }
  }
});
