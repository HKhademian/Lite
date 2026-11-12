import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { buildSite } from './build.ts';
import { heroSample, sampleGroups, showcaseSamples } from './groups.ts';
import { escapeHtml, highlightLite, highlightTs } from './highlight.ts';
import { stripLiteTs } from './strip-ts.ts';

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

test('stripLiteTs produces runnable JS matching compiler output for all showcase samples', () => {
  const out = join(root, 'dist', 'site');
  const liteBin = join(root, 'bin', 'lite');
  const encoder = new TextEncoder();

  for (const sample of showcaseSamples) {
    const payload = JSON.parse(
      readFileSync(join(out, 'playground', 'samples', `${sample.id}.json`), 'utf8')
    ) as { stdin?: string; args?: string[]; output: string };
    const ts = execFileSync(liteBin, ['compile', resolve(root, sample.file)], { encoding: 'utf8' });
    const js = stripLiteTs(ts);
    const stdinBytes = encoder.encode(payload.stdin ?? '');
    let offset = 0;
    let stdout = '';
    const fakeProcess = {
      argv: ['node', 'playground.js', ...(payload.args ?? [])],
      exit(code: number): never {
        throw new Error(`EXIT:${code}`);
      },
      getBuiltinModule(name: string) {
        assert.equal(name, 'node:fs');
        return {
          readSync(_fd: number, buf: Uint8Array, bufOffset: number, length: number): number {
            if (offset >= stdinBytes.length) return 0;
            const n = Math.min(length, stdinBytes.length - offset);
            buf.set(stdinBytes.subarray(offset, offset + n), bufOffset);
            offset += n;
            return n;
          },
          writeSync(fd: number, text: string): number {
            if (fd === 1) stdout += text;
            return text.length;
          },
        };
      },
    };
    const fn = new Function('process', `${js.replace(/export function main\b/, 'function main')}\nreturn main();`) as (p: typeof fakeProcess) => string | undefined;
    const ret = fn(fakeProcess);
    assert.equal(stdout + (ret ?? ''), payload.output, `runtime parity mismatch for ${sample.id}`);
  }
});

test('emitted playground compiler.js and stdlib.json compile and run Lite code', async () => {
  const out = join(root, 'dist', 'site');
  const compilerUrl = pathToFileURL(join(out, 'playground', 'compiler.js')).href;
  const stdlib = JSON.parse(readFileSync(join(out, 'playground', 'stdlib.json'), 'utf8')) as Record<string, { path: string; display: string; identity: string; text: string }>;
  assert(existsSync(join(out, 'playground', 'compiler.js')));
  assert('core/io' in stdlib);

  const imported = await import(compilerUrl) as { main: (w?: (t: string) => void, r?: (imp: string, spec: string) => unknown) => string };
  const sample = JSON.parse(readFileSync(join(out, 'playground', 'samples', 'double-sum.json'), 'utf8')) as { source: string; stdin: string; output: string };
  const stdinBytes = new TextEncoder().encode(sample.source);
  let offset = 0;
  let stdout = '';
  let stderr = '';
  const prevProcess = globalThis.process;
  const stubProcess = {
    argv: ['node', 'compiler.js', 'playground.lts', 'playground', 'playground.lts'],
    exit(code: number): never {
      throw new Error(`EXIT:${code}:${stderr}`);
    },
    getBuiltinModule(name: string) {
      assert.equal(name, 'node:fs');
      return {
        readSync(_fd: number, buf: Uint8Array, bufOffset: number, length: number): number {
          if (offset >= stdinBytes.length) return 0;
          const n = Math.min(length, stdinBytes.length - offset);
          buf.set(stdinBytes.subarray(offset, offset + n), bufOffset);
          offset += n;
          return n;
        },
        writeSync(fd: number, text: string): number {
          if (fd === 1) stdout += text;
          else stderr += text;
          return text.length;
        },
      };
    },
  };
  (globalThis as unknown as { process: typeof stubProcess }).process = stubProcess;
  try {
    const readSource = (importer: string, spec: string) => {
      if (spec in stdlib) return stdlib[spec];
      if (spec.startsWith('./') && importer.startsWith('lib/core/')) {
        const name = `core/${spec.slice(2).replace(/\.lts$/, '')}`;
        if (name in stdlib) return stdlib[name];
      }
      throw new Error(`cannot import ${spec} from ${importer}`);
    };
    const ret = imported.main((t) => { stdout += t; }, readSource);
    const compiledTs = stdout + (ret ?? '');
    assert(compiledTs.includes('export function main'));
    assert.equal(stderr, '');
  } finally {
    globalThis.process = prevProcess;
  }
});
