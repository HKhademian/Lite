/** Release requirements distinguish usable tools, compiler previews and language conformance. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { releaseProfile } from './release.ts';

test('component readiness does not couple tooling to deferred native or language ports', () => {
  for (const component of ['cli', 'checker', 'tester', 'verifier', 'benchmark', 'release', 'doctor', 'docs', 'vscode'] as const) assert.equal(releaseProfile({ component, version: '0.1.0' }), 'tools');
  assert.equal(releaseProfile(null), 'tools');
  assert.equal(releaseProfile({ component: 'compiler', version: '0.1.0-alpha.1' }), 'compiler');
  assert.equal(releaseProfile({ component: 'igniter', version: '0.1.0-alpha.38' }), 'compiler');
  for (const component of ['project', 'language', 'scripting', 'compiler'] as const) assert.equal(releaseProfile({ component, version: '1.0.0' }), 'language');
});
