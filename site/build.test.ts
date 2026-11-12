import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { buildSite } from './build.ts';
import { heroSample, sampleGroups, showcaseSamples } from './groups.ts';
import { escapeHtml, highlightLite, highlightTs } from './highlight.ts';

const root = dirname(import.meta.dirname);

test('showcase sample groups and files are valid and unique', () => {
  const groupIds = new Set(sampleGroups.map(g => g.id));
  const sampleIds = new Set<string>();
  assert(groupIds.has(heroSample.group));

  for (const sample of showcaseSamples) {
    assert(!sampleIds.has(sample.id), `duplicate sample id: ${sample.id}`);
    sampleIds.add(sample.id);
    assert(groupIds.has(sample.group), `unknown group ${sample.group} for ${sample.id}`);
    assert(existsSync(resolve(root, sample.file)), `missing sample file: ${sample.file}`);
  }
  assert(sampleIds.has(heroSample.id), 'hero sample must be included in showcaseSamples');
});

test('syntax highlighter escapes HTML and marks keywords, strings, and comments', () => {
  assert.equal(escapeHtml('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
  const liteHtml = highlightLite('/* hi */ fn(x: Int) { "ok" < 1 }');
  assert(liteHtml.includes('<span class="tok-comment">/* hi */</span>'));
  assert(liteHtml.includes('<span class="tok-keyword">fn</span>'));
  assert(liteHtml.includes('<span class="tok-type">Int</span>'));
  assert(liteHtml.includes('<span class="tok-string">&quot;ok&quot;</span>'));
  assert(liteHtml.includes('&lt;'));

  const tsHtml = highlightTs('const x: bigint = 1n;');
  assert(tsHtml.includes('<span class="tok-keyword">const</span>'));
  assert(tsHtml.includes('<span class="tok-type">bigint</span>'));
});

test('buildSite generates static pages and metadata in dist/site', () => {
  buildSite();
  const out = join(root, 'dist', 'site');
  for (const rel of ['index.html', 'style.css', 'favicon.svg', 'build.json', 'samples/index.html', 'playground/index.html']) {
    assert(existsSync(join(out, rel)), `missing generated site file: ${rel}`);
  }
  const index = readFileSync(join(out, 'index.html'), 'utf8');
  assert(index.includes('Lite is light.'));
  assert(index.includes('Open in playground'));
  assert(!index.includes('Inspect generated TypeScript'));
  const playground = readFileSync(join(out, 'playground/index.html'), 'utf8');
  assert(playground.includes('Generated TypeScript'));
  assert(playground.includes('pg-canvas'));
  for (const sample of showcaseSamples) {
    assert(existsSync(join(out, 'playground', 'samples', `${sample.id}.json`)), `missing playground payload for ${sample.id}`);
  }
  const buildInfo = JSON.parse(readFileSync(join(out, 'build.json'), 'utf8')) as { samples: number; shortCommit: string };
  assert.equal(buildInfo.samples, showcaseSamples.length);
  assert.equal(buildInfo.shortCommit.length, 12);
});
