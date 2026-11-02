import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { componentPrefixes, componentVersions, parseComponentTag, selectComponentRelease } from '../release-streams.ts';

const versions = {
  project: '0.8.0', scripting: '0.3.0',
  language: '0.2.0', compiler: '0.5.1', cli: '0.3.0', formatter: '0.1.0-alpha.1',
  runtime: '0.4.0', stdlib: null,
};

test('umbrella, language, scripting and tool releases keep independent versions', () => {
  const current = componentVersions(versions, '0.1.0-alpha.38');
  for (const [tag, component, version] of [
    ['lite-v0.8.0', 'project', '0.8.0'], ['lang-v0.2.0', 'language', '0.2.0'],
    ['script-v0.3.0', 'scripting', '0.3.0'], ['compiler-v0.5.1', 'compiler', '0.5.1'],
    ['cli-v0.3.0', 'cli', '0.3.0'], ['formatter-v0.1.0-alpha.1', 'formatter', '0.1.0-alpha.1'],
    ['runtime-v0.4.0', 'runtime', '0.4.0'], ['igniter-v0.1.0-alpha.38', 'igniter', '0.1.0-alpha.38'],
  ]) assert.deepEqual(selectComponentRelease(tag, current), { component, version });
  assert.equal(current.language, '0.2.0');
  assert.equal(current.stdlib, null);
});

test('component changes do not require language or other component version bumps', () => {
  const before = componentVersions(versions, '0.1.0-alpha.38');
  const after = componentVersions({ ...versions, compiler: '0.5.2' }, '0.1.0-alpha.38');
  assert.deepEqual(selectComponentRelease('compiler-v0.5.2', after), { component: 'compiler', version: '0.5.2' });
  assert.deepEqual({ ...after, compiler: before.compiler }, before);
  assert.throws(() => selectComponentRelease('compiler-v0.2.0', after), /compiler tag\/version mismatch/);
  assert.throws(() => selectComponentRelease('lang-v0.5.2', after), /language tag\/version mismatch/);
  assert.throws(() => selectComponentRelease('lite-v0.5.2', after), /project tag\/version mismatch/);
  assert.throws(() => selectComponentRelease('script-v0.5.2', after), /scripting tag\/version mismatch/);
});

test('unassigned components remain unassigned until a version is explicitly recorded', () => {
  const current = componentVersions(versions, '0.1.0-alpha.38');
  assert.equal(selectComponentRelease(undefined, current), null);
  assert.throws(() => selectComponentRelease('std-v0.1.0', current), /stdlib tag\/version mismatch/);
  const assigned = componentVersions({ ...versions, stdlib: '0.1.0-alpha.1' }, current.igniter ?? '');
  assert.deepEqual(selectComponentRelease('std-v0.1.0-alpha.1', assigned), { component: 'stdlib', version: '0.1.0-alpha.1' });
});

test('tag and version validation rejects ambiguous streams and malformed versions', () => {
  for (const tag of ['stdlib-v0.1.0', 'litelang-v0.1.0', 'litescript-v0.1.0', 'project-v0.1.0', 'v0.1.0', 'compiler-v01.2.3', 'cli-v0.1', 'lang-v0.1.0-01', 'formatter-v0.1.0/evil']) {
    assert.throws(() => parseComponentTag(tag), /unsupported release tag|invalid release version/, tag);
  }
  assert.deepEqual(parseComponentTag('compiler-v1.2.3-rc.1+build.2'), { component: 'compiler', version: '1.2.3-rc.1+build.2' });
  assert.throws(() => componentVersions({ ...versions, compiler: '01.2.3' }, '0.1.0'), /invalid or missing compiler/);
  assert.throws(() => componentVersions({ ...versions, igniter: '0.1.0' }, '0.1.0'), /unknown.*igniter/);
});

test('workflow triggers cover all distinct project and component streams', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/release.yml', import.meta.url), 'utf8');
  const triggers = [...workflow.matchAll(/^      - '([a-z]+)-v\*'$/gm)].map(match => match[1]).sort();
  assert.deepEqual(triggers, Object.values(componentPrefixes).sort());
  const declared: unknown = JSON.parse(readFileSync(new URL('../../versions.json', import.meta.url), 'utf8'));
  const igniter = JSON.parse(readFileSync(new URL('../../igniter/package.json', import.meta.url), 'utf8')) as { version: string };
  assert.equal(componentVersions(declared, igniter.version).igniter, igniter.version);
});
