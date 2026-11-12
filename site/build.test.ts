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
  for (const rel of ['index.html', 'style.css', 'favicon.svg', 'build.json', 'gallery/index.html', 'playground/index.html']) {
    assert(existsSync(join(out, rel)), `missing generated site file: ${rel}`);
  }
  const gallery = readFileSync(join(out, 'gallery/index.html'), 'utf8');
  assert(gallery.includes('<title>Gallery — Lite</title>'));
  assert(gallery.includes('Play &rarr;'));
  assert(gallery.includes('<details class="gallery-code">'));
  assert(!gallery.includes('<details class="gallery-code" open>'));
  const index = readFileSync(join(out, 'index.html'), 'utf8');
  assert(index.includes('is light.'));
  assert(index.includes('Play &rarr;'));
  assert(!index.includes('Inspect generated TypeScript'));
  assert(index.includes('commit-hash'));
  assert(index.includes('title="Committed '));
  const playground = readFileSync(join(out, 'playground/index.html'), 'utf8');
  assert(playground.includes('playground-page'));
  assert(playground.includes('highlightLite(editorEl.value)'));
  assert(playground.includes('Generated TS'));
  assert(playground.includes('id="pg-compile"'));
  assert(playground.includes('id="pg-play"'));
  assert(playground.includes('id="tab-canvas"'));
  assert(playground.includes('id="pg-fps"'));
  for (const sample of showcaseSamples) {
    assert(existsSync(join(out, 'playground', 'samples', `${sample.id}.json`)), `missing playground payload for ${sample.id}`);
  }
  const buildInfo = JSON.parse(readFileSync(join(out, 'build.json'), 'utf8')) as { samples: number; shortCommit: string; timestamp: string };
  assert.equal(buildInfo.samples, showcaseSamples.length);
  assert.equal(buildInfo.shortCommit.length, 12);
  assert(buildInfo.timestamp.length > 0);
});
