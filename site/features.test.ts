import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { heroSample, sampleGroups, showcaseSamples } from './groups.ts';
import { verifyGymCorpus } from './gym-verify.ts';
import { formatCodeView } from './code-view.ts';
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
    'const points = ["a", "b", "c"];',
    'const pair = [10n, 20n];',
    'const idx = 1;',
    'const lite_res = (() => {',
    '  let lite$slot_0!: bigint;',
    '  let lite$slot_1!: bigint;',
    '  lite$slot_1 = 20n;',
    '  lite$slot_0 = 10n;',
    '  return (pair)[0]! - lite$slot_1 + (lite$slot_0 - 10n);',
    '})();',
    'function lite$listPopFront<T>(items: T[], at: number): T {',
    '  if (items.length === 0) throw new Error(String(at));',
    '  return items.shift() as T;',
    '}',
    'function pickPoint(): string {',
    '  return points[idx]!;',
    '}',
    'return { res: lite_res, first: lite$listPopFront<string>(["first", "second"], 0), point: pickPoint() };',
  ].join('\n');

  const stripped = stripLiteTs(routedSource);
  assert(!stripped.includes('!:'));
  assert(!stripped.includes(']!'));
  assert(!stripped.includes('<T>'));
  assert(!stripped.includes('<string>'));
  assert(!stripped.includes(' as T'));

  const result = (new Function(stripped) as () => { res: bigint; first: string; point: string })();
  assert.equal(result.res, -10n);
  assert.equal(result.first, 'first');
  assert.equal(result.point, 'b');
});

test('highlightLite highlights newer built-in types and operators', () => {
  const html = highlightLite('pub f := fn(a: Int8, b: Int16, c: Int32, d: Int64, e: Float32, g: Float64, h: Double): Unit { var x := a ** 2; x += 1; } match { x > 0 { x } _ { 0 } }');
  for (const typeName of ['Int8', 'Int16', 'Int32', 'Int64', 'Float32', 'Float64', 'Double', 'Unit']) {
    assert(html.includes(`<span class="tok-type">${typeName}</span>`), `missing type highlight: ${typeName}`);
  }
  assert(html.includes('<span class="tok-keyword">match</span>'), 'missing keyword highlight: match');
  assert(highlightLite('User := record { name: String; };').includes('<span class="tok-keyword">record</span>'), 'missing keyword highlight: record');
  assert(highlightLite('State := enum { Ready; Done; };').includes('<span class="tok-keyword">enum</span>'), 'missing keyword highlight: enum');
  assert(highlightLite('scores: mut Map<String, Int>;').includes('<span class="tok-type">Map</span>'), 'missing type highlight: Map');
  assert(highlightLite('tags: mut Set<String>;').includes('<span class="tok-type">Set</span>'), 'missing type highlight: Set');
  const opHtml = highlightLite('a ** b += c :/= d :%= e <!= f >!= g <! h >! i');
  for (const op of ['**', '+=', ':/=', ':%=', '&lt;!=', '&gt;!=', '&lt;!', '&gt;!']) {
    assert(opHtml.includes(`<span class="tok-op">${op}</span>`), `missing operator highlight: ${op}`);
  }
  const flowHtml = highlightLite('@outer loop items { if .count > 0 then { .value } finally { outputLine("done"); } return @outer .item; }');
  for (const kw of ['@outer', 'then', 'finally']) {
    assert(flowHtml.includes(`<span class="tok-keyword">${kw}</span>`), `missing control-flow highlight: ${kw}`);
  }
  assert(highlightLite('fail := fn(): Never { exit(1); }').includes('<span class="tok-type">Never</span>'));

  const programView = formatCodeView([
    'export function main(): string {',
    '    let lite$out = "";',
    '    let lite$val1: bigint = 0n;',
    '    void lite$val1;',
    '    void lite$cnt1;',
    '    lite$val1 = 5n;',
    '    lite$emit(String(lite$val1) + "\\n");',
    '    return lite$out;',
    '}',
  ].join('\n'), 'ts', 'program');
  assert(!programView.includes('void lite$'));
  assert(programView.includes('let val1: bigint = 0n;'));
});

test('showcaseSamples includes examples covering named calls, tuples, arrays, and lists', () => {
  const ids = new Set(showcaseSamples.map(sample => sample.id));
  for (const expected of [
    'numeric-widths',
    'subjectless-match',
    'subject-match',
    'fixed-tuples',
    'named-arguments',
    'named-tuples',
    'fixed-arrays',
    'mixed-tuples',
    'tuple-label-conversion',
    'growable-lists',
    'typed-maps',
    'typed-sets',
    'value-enums',
    'nominal-records',
    'aggregate-destructuring',
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
  const browserSampleFiles = listSampleFiles(join(root, 'samples'))
    .filter(f => !f.startsWith('samples/programs/gui/'));
  assert.deepEqual([...catalogFiles].sort(), browserSampleFiles.sort());

  for (const sample of [...showcaseSamples, ...playSamples]) {
    const expectedFolder = folderByGroup.get(sample.group);
    if (expectedFolder !== undefined) {
      assert(
        sample.file.startsWith(`${expectedFolder}/`),
        `${sample.id} (${sample.file}) should live under ${expectedFolder}/`,
      );
    } else {
      assert(
        sample.file.startsWith('language/examples/') && sample.file.slice('language/examples/'.length).includes('/'),
        `${sample.id} should reference a domain-grouped language/examples/ file`,
      );
    }
  }
});

test('stripLiteTs strips anonymous function parameter and return types', () => {
  const src = 'const lite_steps = [(function (lite_x: bigint, lite_y: string): bigint { return lite_x + 1n; })];';
  const stripped = stripLiteTs(src);
  assert(!stripped.includes(': bigint'), stripped);
  assert(!stripped.includes(': string'), stripped);
  const fn = new Function(`${stripped}\nreturn lite_steps[0](4n, "a");`) as () => bigint;
  assert.equal(fn(), 5n);
});

test('stripLiteTs strips Map<K, V> generic args and non-null assertions before closing braces', () => {
  const src = [
    'const lite$scores: Map<string, bigint> = new Map<string, bigint>();',
    'lite$scores.set("a", 7n);',
    'const lite$res = ((lite$m: Map<string, bigint>, lite$k: string): { found: boolean; value: bigint } => lite$m.has(lite$k) ? { found: true, value: lite$m.get(lite$k)! } : { found: false, value: 0n })(lite$scores, "a");',
    'return lite$res;',
  ].join('\n');
  const stripped = stripLiteTs(src);
  assert(!stripped.includes('get(lite$k)!'), stripped);
  const res = (new Function(stripped) as () => { found: boolean; value: bigint })();
  assert.deepEqual(res, { found: true, value: 7n });
});

test('stripLiteTs strips comma-separated typed declarators in for headers and let lists', () => {
  const src = [
    'let lite$sum: bigint = 0n;',
    'for (let lite$iter1: bigint = 1n, lite$rend1: bigint = 5n; lite$iter1 <= lite$rend1; lite$iter1 += 1n) {',
    '  lite$sum += lite$iter1;',
    '}',
    'const pair = { left: 2n, right: 3n }, extra: bigint = 4n;',
    'return lite$sum + pair.left + pair.right + extra;',
  ].join('\n');
  const stripped = stripLiteTs(src);
  assert(!stripped.includes(': bigint'), stripped);
  const res = (new Function(stripped) as () => bigint)();
  assert.equal(res, 24n);
});

test('verifyGymCorpus compiles and executes all 56 Gym starters and solutions', () => {
  const result = verifyGymCorpus();
  assert.equal(result.exerciseCount, 56);
  assert.equal(result.drillCount, 27);
  assert.equal(result.kataCount, 29);
  assert(result.caseCount >= 224, `expected at least 224 test cases, got ${String(result.caseCount)}`);
});

interface LearnHelperModule {
  spec: string;
  file: string;
}

interface LearnLesson {
  id: string;
  slug: string;
  title: string;
  kind: string;
  domain: string;
  subGroup: string;
  environment: string;
  guideFile: string;
  sourceFile: string;
  helperModules: LearnHelperModule[];
  stdin: string;
  args: string[];
  teaches: string[];
  docs: string[];
}

interface LearnTrack {
  id: string;
  order: number;
  title: string;
  summary: string;
  lessons: LearnLesson[];
}

interface LearnCatalog {
  schemaVersion: number;
  title: string;
  description: string;
  tracks: LearnTrack[];
}

interface GymCase {
  name: string;
  stdin: string;
  args: string[];
  expectedStdout: string;
}

interface GymExercise {
  id: string;
  slug: string;
  title: string;
  mode: string;
  belt: string;
  domain: string;
  subGroup: string;
  promptFile: string;
  starterFile: string;
  solutionFile: string;
  brokenStarterSyntax: boolean;
  expectedStarterFailure: string;
  hints: string[];
  relatedDocs: string[];
  relatedLessons: string[];
  visibleCases: GymCase[];
  hiddenCases: GymCase[];
}

interface GymCatalog {
  schemaVersion: number;
  title: string;
  description: string;
  exercises: GymExercise[];
}

function assertRecordKeys<T extends object>(obj: unknown, required: readonly string[], label: string): T {
  assert(obj !== null && typeof obj === 'object' && !Array.isArray(obj), `${label} must be an object`);
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  assert.deepEqual(keys, [...required].sort(), `${label} keys mismatch`);
  return obj as T;
}

function assertNonEmptyString(val: unknown, label: string, pattern?: RegExp): string {
  assert.equal(typeof val, 'string', `${label} must be a string`);
  const text = val as string;
  assert(text.length > 0, `${label} must be non-empty`);
  if (pattern) assert(pattern.test(text), `${label} (${text}) must match ${pattern.source}`);
  return text;
}

function assertStringArray(val: unknown, label: string, minItems = 0, nonEmptyItems = false): string[] {
  assert(Array.isArray(val), `${label} must be an array`);
  const arr = val as unknown[];
  assert(arr.length >= minItems, `${label} must have at least ${String(minItems)} item(s)`);
  for (let i = 0; i < arr.length; i++) {
    assert.equal(typeof arr[i], 'string', `${label}[${String(i)}] must be a string`);
    if (nonEmptyItems) assert((arr[i] as string).length > 0, `${label}[${String(i)}] must be non-empty`);
  }
  return arr as string[];
}

function assertRepoFileExists(relPath: string, label: string): void {
  const full = join(root, relPath);
  assert(existsSync(full), `${label} missing on disk: ${relPath}`);
}

test('language/learn/catalog.json and language/gym/catalog.json satisfy their schemas and cross-links', () => {
  const learnSchema = JSON.parse(readFileSync(join(root, 'config/learn.schema.json'), 'utf8')) as {
    required: string[];
    properties: {
      tracks: { items: { required: string[]; properties: { lessons: { items: { required: string[] } } } } };
    };
  };
  const gymSchema = JSON.parse(readFileSync(join(root, 'config/gym.schema.json'), 'utf8')) as {
    required: string[];
    properties: { exercises: { items: { required: string[] } } };
    $defs: { testCase: { required: string[] } };
  };

  const learnCatalog = assertRecordKeys<LearnCatalog>(
    JSON.parse(readFileSync(join(root, 'language/learn/catalog.json'), 'utf8')),
    learnSchema.required,
    'learn catalog',
  );
  assert.equal(learnCatalog.schemaVersion, 1);
  assertNonEmptyString(learnCatalog.title, 'learn.title');
  assertNonEmptyString(learnCatalog.description, 'learn.description');
  assert(Array.isArray(learnCatalog.tracks) && learnCatalog.tracks.length >= 1, 'learn.tracks must be non-empty');

  const trackRequired = learnSchema.properties.tracks.items.required;
  const lessonRequired = learnSchema.properties.tracks.items.properties.lessons.items.required;
  const trackIds = new Set<string>();
  const trackOrders = new Set<number>();
  const lessonIds = new Set<string>();
  const lessonSlugs = new Set<string>();

  for (const rawTrack of learnCatalog.tracks) {
    const track = assertRecordKeys<LearnTrack>(rawTrack, trackRequired, 'learn track');
    const trackId = assertNonEmptyString(track.id, 'track.id', /^[a-z0-9-]+$/);
    assert(!trackIds.has(trackId), `duplicate track id: ${trackId}`);
    trackIds.add(trackId);
    assert(Number.isInteger(track.order) && track.order >= 0, `invalid track order on ${trackId}`);
    assert(!trackOrders.has(track.order), `duplicate track order: ${String(track.order)}`);
    trackOrders.add(track.order);
    assertNonEmptyString(track.title, `track(${trackId}).title`);
    assertNonEmptyString(track.summary, `track(${trackId}).summary`);
    assert(Array.isArray(track.lessons) && track.lessons.length >= 1, `track(${trackId}).lessons must be non-empty`);

    for (const rawLesson of track.lessons) {
      const lesson = assertRecordKeys<LearnLesson>(rawLesson, lessonRequired, `lesson in ${trackId}`);
      const id = assertNonEmptyString(lesson.id, 'lesson.id', /^[a-z0-9.-]+$/);
      const slug = assertNonEmptyString(lesson.slug, `lesson(${id}).slug`, /^[a-z0-9-]+$/);
      assert(!lessonIds.has(id), `duplicate lesson id: ${id}`);
      assert(!lessonSlugs.has(slug), `duplicate lesson slug: ${slug}`);
      lessonIds.add(id);
      lessonSlugs.add(slug);

      assertNonEmptyString(lesson.title, `lesson(${id}).title`);
      assert(['lesson', 'tutorial'].includes(lesson.kind), `invalid lesson.kind on ${id}`);
      assertNonEmptyString(lesson.domain, `lesson(${id}).domain`);
      assertNonEmptyString(lesson.subGroup, `lesson(${id}).subGroup`);
      assert(['universal', 'play', 'cli'].includes(lesson.environment), `invalid lesson.environment on ${id}`);

      assertRepoFileExists(assertNonEmptyString(lesson.guideFile, `lesson(${id}).guideFile`), `lesson(${id}).guideFile`);
      assertRepoFileExists(assertNonEmptyString(lesson.sourceFile, `lesson(${id}).sourceFile`), `lesson(${id}).sourceFile`);

      assert(Array.isArray(lesson.helperModules), `lesson(${id}).helperModules must be an array`);
      for (const rawHelper of lesson.helperModules) {
        const helper = assertRecordKeys<LearnHelperModule>(rawHelper, ['spec', 'file'], `lesson(${id}).helper`);
        assertNonEmptyString(helper.spec, `lesson(${id}).helper.spec`);
        assertRepoFileExists(assertNonEmptyString(helper.file, `lesson(${id}).helper.file`), `lesson(${id}).helper.file`);
      }

      assert.equal(typeof lesson.stdin, 'string', `lesson(${id}).stdin must be a string`);
      assertStringArray(lesson.args, `lesson(${id}).args`);
      assertStringArray(lesson.teaches, `lesson(${id}).teaches`);
      for (const docPath of assertStringArray(lesson.docs, `lesson(${id}).docs`, 0, true)) {
        assertRepoFileExists(docPath, `lesson(${id}).docs`);
      }
    }
  }

  const gymCatalog = assertRecordKeys<GymCatalog>(
    JSON.parse(readFileSync(join(root, 'language/gym/catalog.json'), 'utf8')),
    gymSchema.required,
    'gym catalog',
  );
  assert.equal(gymCatalog.schemaVersion, 1);
  assertNonEmptyString(gymCatalog.title, 'gym.title');
  assertNonEmptyString(gymCatalog.description, 'gym.description');
  assert(Array.isArray(gymCatalog.exercises) && gymCatalog.exercises.length >= 1, 'gym.exercises must be non-empty');

  const exerciseRequired = gymSchema.properties.exercises.items.required;
  const caseRequired = gymSchema.$defs.testCase.required;
  const exerciseIds = new Set<string>();
  const exerciseSlugs = new Set<string>();

  for (const rawEx of gymCatalog.exercises) {
    const ex = assertRecordKeys<GymExercise>(rawEx, exerciseRequired, 'gym exercise');
    const id = assertNonEmptyString(ex.id, 'exercise.id', /^[a-z0-9.-]+$/);
    const slug = assertNonEmptyString(ex.slug, `exercise(${id}).slug`, /^[a-z0-9-]+$/);
    assert(!exerciseIds.has(id), `duplicate exercise id: ${id}`);
    assert(!exerciseSlugs.has(slug), `duplicate exercise slug: ${slug}`);
    exerciseIds.add(id);
    exerciseSlugs.add(slug);

    assertNonEmptyString(ex.title, `exercise(${id}).title`);
    assert(['drill', 'kata'].includes(ex.mode), `invalid exercise.mode on ${id}`);
    assert(['white', 'amber', 'emerald', 'obsidian'].includes(ex.belt), `invalid exercise.belt on ${id}`);
    assertNonEmptyString(ex.domain, `exercise(${id}).domain`);
    assertNonEmptyString(ex.subGroup, `exercise(${id}).subGroup`);
    assertRepoFileExists(assertNonEmptyString(ex.promptFile, `exercise(${id}).promptFile`), `exercise(${id}).promptFile`);
    assertRepoFileExists(assertNonEmptyString(ex.starterFile, `exercise(${id}).starterFile`), `exercise(${id}).starterFile`);
    assertRepoFileExists(assertNonEmptyString(ex.solutionFile, `exercise(${id}).solutionFile`), `exercise(${id}).solutionFile`);
    assert.equal(typeof ex.brokenStarterSyntax, 'boolean', `exercise(${id}).brokenStarterSyntax must be boolean`);
    assert(['compile-error', 'wrong-output'].includes(ex.expectedStarterFailure), `invalid expectedStarterFailure on ${id}`);

    assertStringArray(ex.hints, `exercise(${id}).hints`, 1, true);
    for (const docPath of assertStringArray(ex.relatedDocs, `exercise(${id}).relatedDocs`, 0, true)) {
      assertRepoFileExists(docPath, `exercise(${id}).relatedDocs`);
    }
    for (const relatedLesson of assertStringArray(ex.relatedLessons, `exercise(${id}).relatedLessons`, 0, true)) {
      assert(lessonIds.has(relatedLesson), `exercise(${id}) references unknown relatedLesson: ${relatedLesson}`);
    }

    for (const field of ['visibleCases', 'hiddenCases'] as const) {
      const cases = ex[field];
      assert(Array.isArray(cases) && cases.length >= 1, `exercise(${id}).${field} must have at least 1 case`);
      for (let i = 0; i < cases.length; i++) {
        const tc = assertRecordKeys<GymCase>(cases[i], caseRequired, `exercise(${id}).${field}[${String(i)}]`);
        assertNonEmptyString(tc.name, `exercise(${id}).${field}[${String(i)}].name`);
        assert.equal(typeof tc.stdin, 'string');
        assertStringArray(tc.args, `exercise(${id}).${field}[${String(i)}].args`);
        assert.equal(typeof tc.expectedStdout, 'string');
      }
    }
  }
});
