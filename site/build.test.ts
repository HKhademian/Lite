import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { buildTsCompiler, compileBuiltCompiler, type CompilerBuild } from '../compiler/host.ts';
import { buildSite, parseBuildArgs } from './build.ts';
import { formatCodeView } from './code-view.ts';
import { heroSample, sampleGroups, showcaseSamples } from './groups.ts';
import { escapeHtml, highlightC, highlightLite, highlightTs } from './highlight.ts';
import { playGroups, playSamples } from './play-samples.ts';
import { stripLiteTs } from './strip-ts.ts';

const root = dirname(import.meta.dirname);
let cachedTsCompiler: CompilerBuild | undefined;

function sharedTsCompiler(): CompilerBuild {
  if (cachedTsCompiler === undefined) cachedTsCompiler = buildTsCompiler();
  return cachedTsCompiler;
}

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

  const cHtml = highlightC('#include <stdio.h>\nint main(void) { return 0; }');
  assert(cHtml.includes('<span class="tok-keyword">#include &lt;stdio.h&gt;</span>'));
  assert(cHtml.includes('<span class="tok-type">int</span>'));
  assert(cHtml.includes('<span class="tok-keyword">return</span>'));
});

test('buildSite generates static pages and metadata in dist/site', () => {
  buildSite({ tsCompiler: sharedTsCompiler() });
  const out = join(root, 'dist', 'site');
  for (const rel of [
    'index.html',
    'style.css',
    'favicon.svg',
    'build.json',
    'search-index.json',
    'runtime/compiler.js',
    'runtime/compiler-c.js',
    'runtime/worker.js',
    'runtime/stdlib.json',
    'runtime/search.js',
    'runtime/snips.js',
    'runtime/highlight.js',
    'runtime/code-view.js',
    'runtime/strip-ts.js',
    'runtime/play-keepalive.js',
    'playground/play-keepalive.js',
    'learn/index.html',
    'gym/index.html',
    'docs/index.html',
    'modules/index.html',
    'tools/index.html',
    'gallery/index.html',
    'playground/index.html',
  ]) {
    assert(existsSync(join(out, rel)), `missing generated site file: ${rel}`);
  }
  const searchIndex = JSON.parse(readFileSync(join(out, 'search-index.json'), 'utf8')) as Array<{ kind: string; title: string; href: string }>;
  assert(searchIndex.length > showcaseSamples.length + 100);
  assert(searchIndex.some((entry) => entry.kind === 'module' && entry.href === 'modules/core/text.html'));
  assert(searchIndex.some((entry) => entry.kind === 'symbol' && entry.title === 'extra/canvas.fillRect'));
  assert(searchIndex.some((entry) => entry.kind === 'tool' && entry.title === 'lite fmt'));

  for (const modRel of [
    'modules/core/crypto.html',
    'modules/core/diag.html',
    'modules/core/file.html',
    'modules/core/format.html',
    'modules/core/int.html',
    'modules/core/io.html',
    'modules/core/list.html',
    'modules/core/path.html',
    'modules/core/process.html',
    'modules/core/source.html',
    'modules/core/test.html',
    'modules/core/text.html',
    'modules/core/time.html',
    'modules/core/unicode.html',
    'modules/extra/audio.html',
    'modules/extra/board.html',
    'modules/extra/canvas.html',
  ]) {
    assert(existsSync(join(out, modRel)), `missing module detail page: ${modRel}`);
  }
  const modulesIndex = readFileSync(join(out, 'modules/index.html'), 'utf8');
  assert(modulesIndex.includes('Standard &amp; Play Modules'));
  assert(modulesIndex.includes('Provisional Module Surface'));
  assert(modulesIndex.includes('Browser + CLI'));
  assert(modulesIndex.includes('Lite Play'));
  assert(modulesIndex.includes('CLI / Host OS'));
  const coreTextHtml = readFileSync(join(out, 'modules/core/text.html'), 'utf8');
  assert(coreTextHtml.includes('Host-backed'));
  assert(coreTextHtml.includes('<span class="tok-keyword">pub</span>'));
  assert(coreTextHtml.includes('Browser + CLI'));
  assert(coreTextHtml.includes('Used in Showcases &amp; Gallery'));
  const coreFileHtml = readFileSync(join(out, 'modules/core/file.html'), 'utf8');
  assert(coreFileHtml.includes('CLI / Host OS'));
  const extraCanvasHtml = readFileSync(join(out, 'modules/extra/canvas.html'), 'utf8');
  assert(extraCanvasHtml.includes('Lite Play'));
  assert(extraCanvasHtml.includes('id="fillRect"'));
  assert(extraCanvasHtml.includes('Used in Showcases &amp; Gallery'));

  const toolsHtml = readFileSync(join(out, 'tools/index.html'), 'utf8');
  assert(toolsHtml.includes('./bin/lite run'));
  assert(toolsHtml.includes('./bin/lite fmt'));
  assert(toolsHtml.includes('editors/vscode'));
  assert(toolsHtml.includes('node compiler/scripts/self-host.ts'));
  assert(toolsHtml.includes('onCanvasUpdate'));

  for (const docRel of [
    'docs/index.html',
    'docs/spec/index.html',
    'docs/handbook/single-page.html',
    'docs/handbook/overview-and-setup.html',
    'docs/handbook/bindings-and-mutability.html',
    'docs/handbook/numbers-operators-and-strings.html',
    'docs/handbook/conditionals-match-and-loops.html',
    'docs/handbook/tuples-arrays-lists-and-aliases.html',
    'docs/handbook/blocks-wiring-and-closures.html',
    'docs/handbook/imports-visibility-and-io.html',
    'docs/design/overview.html',
    'docs/design/start-here.html',
    'docs/proposals/LP-0001-operation-specific-panic-recovery.html',
    'docs/compiler/overview.html',
  ]) {
    assert(existsSync(join(out, docRel)), `missing docs page: ${docRel}`);
  }
  const handbookSingle = readFileSync(join(out, 'docs/handbook/single-page.html'), 'utf8');
  assert(handbookSingle.includes('The Lite Handbook (Single-Page Edition)'));
  assert(handbookSingle.includes('id="chapter-bindings-and-mutability"'));
  const startHereHtml = readFileSync(join(out, 'docs/design/start-here.html'), 'utf8');
  assert(startHereHtml.includes('Open in Play &rarr;'));
  assert(startHereHtml.includes('Verified in TS'));
  const lpHtml = readFileSync(join(out, 'docs/proposals/LP-0001-operation-specific-panic-recovery.html'), 'utf8');
  assert(lpHtml.includes('Working Proposal'));

  const collectHtml = (dir: string): string[] => {
    const outFiles: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) outFiles.push(...collectHtml(full));
      else if (entry.name.endsWith('.html')) outFiles.push(full);
    }
    return outFiles;
  };
  for (const htmlFile of [...collectHtml(join(out, 'docs')), ...collectHtml(join(out, 'learn')), ...collectHtml(join(out, 'gym'))]) {
    const content = readFileSync(htmlFile, 'utf8');
    assert(!content.includes(' data-md-href='), `unresolved data-md-href in ${htmlFile}`);
    assert(!content.includes('playground?'), `missing trailing slash before ? in playground href in ${htmlFile}`);
    const hrefRe = /href="([^"]+)"/g;
    for (let m = hrefRe.exec(content); m !== null; m = hrefRe.exec(content)) {
      const raw = m[1]!;
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#') || raw.startsWith('mailto:')) {
        continue;
      }
      const noFrag = raw.split('#')[0]!.split('?')[0]!;
      if (noFrag === '') continue;
      const resolvedTarget = resolve(dirname(htmlFile), noFrag);
      const fileCandidate = noFrag.endsWith('/') ? join(resolvedTarget, 'index.html') : resolvedTarget;
      assert(existsSync(fileCandidate), `broken local href "${raw}" in ${htmlFile}`);
    }
  }
  const learnIndex = readFileSync(join(out, 'learn/index.html'), 'utf8');
  assert(learnIndex.includes('0 / 23 completed'));
  assert(learnIndex.includes('Track 0 — Getting Started'));
  assert(learnIndex.includes('Track 7 — Standalone Project Tutorials'));
  for (const learnRel of [
    'learn/getting-started/hello-lite.html',
    'learn/foundations/bindings-and-mutability.html',
    'learn/modules/modules-and-visibility.html',
    'learn/tutorials/expression-evaluator.html',
    'learn/tutorials/text-manifest-digest.html',
    'learn/tutorials/orb-catcher-game.html',
    'learn/payloads/hello-lite.json',
    'learn/payloads/modules-and-visibility.json',
    'learn/payloads/orb-catcher-game.json',
  ]) {
    assert(existsSync(join(out, learnRel)), `missing learn artifact: ${learnRel}`);
  }
  const orbPage = readFileSync(join(out, 'learn/tutorials/orb-catcher-game.html'), 'utf8');
  assert(orbPage.includes('id="ln-canvas"'));
  assert(orbPage.includes('../../runtime/worker.js'));

  const gymIndex = readFileSync(join(out, 'gym/index.html'), 'utf8');
  assert(gymIndex.includes('0 / 42 solved'));
  assert(gymIndex.includes('Concept Drills (18)'));
  assert(gymIndex.includes('Problem Workouts (24)'));
  assert(gymIndex.includes('Export JSON'));
  assert(gymIndex.includes('Import JSON'));
  for (const gymRel of [
    'gym/drills/immutable-vs-var.html',
    'gym/workouts/expression-ast-eval.html',
    'gym/payloads/immutable-vs-var.json',
    'gym/payloads/expression-ast-eval.json',
  ]) {
    assert(existsSync(join(out, gymRel)), `missing gym artifact: ${gymRel}`);
  }
  const astDojo = readFileSync(join(out, 'gym/workouts/expression-ast-eval.html'), 'utf8');
  assert(astDojo.includes('Submit &amp; Grade'));
  assert(astDojo.includes('../../runtime/worker.js'));
  assert(astDojo.includes('Reveal Reference Solution'));
  const gallery = readFileSync(join(out, 'gallery/index.html'), 'utf8');
  assert(gallery.includes('<title>Gallery — Lite</title>'));
  assert(gallery.includes('class="gallery-jumps"'));
  assert(gallery.includes('Play &rarr;'));
  assert(gallery.includes('<details class="gallery-code">'));
  assert(!gallery.includes('<details class="gallery-code" open>'));
  const index = readFileSync(join(out, 'index.html'), 'utf8');
  assert(index.includes('is light.'));
  assert(index.includes('Explore the Ecosystem'));
  assert(index.includes('Start Learning'));
  assert(index.includes('Enter Gym'));
  assert(index.includes('<meta name="color-scheme" content="light dark">'));
  const buildMeta = JSON.parse(readFileSync(join(out, 'build.json'), 'utf8')) as {
    samples: number;
    lessons: number;
    tutorials: number;
    gymExercises: number;
    docsPages: number;
    modules: number;
  };
  assert.equal(buildMeta.samples, showcaseSamples.length);
  assert.equal(buildMeta.lessons, 20);
  assert.equal(buildMeta.tutorials, 3);
  assert.equal(buildMeta.gymExercises, 42);
  assert.equal(buildMeta.modules, 17);
  assert(buildMeta.docsPages >= 200);
  assert(existsSync(join(out, 'docs/design/site-architecture.html')));
  assert(index.includes('<meta name="description"'));
  assert(index.includes('Play &rarr;'));
  assert(!index.includes('Inspect generated TypeScript'));
  assert(index.includes('commit-hash'));
  assert(index.includes('title="Committed '));
  assert(index.includes('class="theme-toggle theme-toggle-shine"'));
  assert(index.includes('class="theme-icon icon-auto"'));
  assert(index.includes('class="theme-icon icon-sun"'));
  assert(index.includes('class="theme-icon icon-moon"'));
  assert(index.includes('Auto mode (system: '));
  assert(index.includes('class="quickstart-head"'));
  assert(index.includes('class="shell-line"'));
  assert(index.includes('id="quickstart-copy"'));
  assert(!index.includes('cd</span> LiteScript'));
  for (const navLabel of ['Overview', 'Learn', 'Gym', 'Docs', 'Modules', 'Tools', 'Gallery', 'Play']) {
    assert(index.includes(`>${navLabel}</a>`), `missing nav link ${navLabel}`);
  }
  assert(index.includes('id="site-search-btn"'));
  assert(index.includes('runtime/search.js'));
  const styleCss = readFileSync(join(out, 'style.css'), 'utf8');
  assert(styleCss.includes('.theme-toggle.theme-toggle-shine'));
  assert(styleCss.includes('.shell-line::before'));
  assert(styleCss.includes('.quickstart-copy'));
  assert(!styleCss.includes('var(--bg-elev)'));
  assert(styleCss.includes('scroll-margin-top: 76px;'));
  assert(styleCss.includes('@media (max-width: 640px)'));
  assert(styleCss.includes('.pg-panel { min-height: 240px; }'));
  const playground = readFileSync(join(out, 'playground/index.html'), 'utf8');
  assert(playground.includes('playground-page'));
  assert(playground.includes('id="pg-workbench"'));
  assert(playground.includes('id="pg-split"'));
  assert(playground.includes('highlightLite(editorEl.value)'));
  assert(playground.includes('Generated TS'));
  assert(playground.includes('id="pg-compile"'));
  assert(playground.includes('id="pg-play"'));
  assert(playground.includes('id="pg-save-snip"'));
  assert(playground.includes('id="pg-sketches-btn"'));
  assert(playground.includes('id="pg-sketches-modal"'));
  assert(playground.includes('id="pg-sketches-cat-tabs"'));
  assert(playground.includes('data-cat="piece"'));
  assert(playground.includes('id="pg-copy"'));
  assert(index.includes('runtime/snips.js'));
  assert(existsSync(join(out, 'playground', 'library.json')));
  const lib = JSON.parse(readFileSync(join(out, 'playground', 'library.json'), 'utf8')) as Array<{ id: string; slug: string; category: string }>;
  const libCats = new Set(lib.map(item => item.category));
  for (const cat of ['sample', 'example', 'case', 'piece']) {
    assert(libCats.has(cat), `missing library.json category: ${cat}`);
  }
  for (const item of lib) {
    assert.match(item.slug, /^[a-z0-9._-]+$/, `invalid slug for ${item.id}: ${item.slug}`);
  }
  assert(lib.some(item => item.category === 'piece' && item.slug === 'hello-lite'));
  assert(playground.includes('event.key === "Tab"'));
  assert(playground.includes('id="pg-c"'));
  assert(playground.includes('id="mode-program"'));
  assert(playground.includes('id="mode-portable"'));
  assert(playground.includes('id="mode-full"'));
  assert(playground.includes('new Worker("./worker.js"'));
  assert(existsSync(join(out, 'playground', 'code-view.js')));
  assert(existsSync(join(out, 'playground', 'highlight.js')));
  assert(playground.includes('id="tab-canvas"'));
  assert(playground.includes('id="pg-pause"'));
  assert(playground.includes('id="pg-canvas-title"'));
  assert(playground.includes('id="pg-canvas-size"'));
  assert(playground.includes('id="pg-mute"'));
  assert(playground.includes('class="pg-sound-wave"'));
  assert(playground.includes('class="pg-sound-slash"'));
  assert(playground.includes('id="pg-fps"'));
  const sizePos = playground.indexOf('id="pg-canvas-size"');
  const fpsPos = playground.indexOf('id="pg-fps"');
  const mutePos = playground.indexOf('id="pg-mute"');
  assert(fpsPos > 0 && fpsPos < sizePos && sizePos < mutePos, 'canvas tools order must be fps · size · mute');
  for (const group of playGroups) {
    assert(gallery.includes(`id="group-${group.id}"`), `missing gallery play category ${group.id}`);
  }
  assert(gallery.includes('class="play-preview-svg"'), 'missing gallery SVG preview thumbnails');
  const stdlib = JSON.parse(readFileSync(join(out, 'playground', 'stdlib.json'), 'utf8')) as Record<string, unknown>;
  assert('extra/canvas' in stdlib);
  assert('extra/board' in stdlib);
  assert('extra/audio' in stdlib);
  for (const sample of showcaseSamples) {
    assert(existsSync(join(out, 'playground', 'samples', `${sample.id}.json`)), `missing playground payload for ${sample.id}`);
  }
  assert(!playground.includes('id="pg-samples"'), 'playground should not render redundant sample <select> dropdown');
  for (const sample of playSamples) {
    assert(existsSync(join(out, 'playground', 'samples', `${sample.id}.json`)), `missing play payload for ${sample.id}`);
    assert(playground.includes(`"id":"${sample.id}"`), `missing playground sample metadata for ${sample.id}`);
    assert(gallery.includes(`sample-${sample.id}`), `missing gallery card for ${sample.id}`);
  }
  const buildInfo = JSON.parse(readFileSync(join(out, 'build.json'), 'utf8')) as { samples: number; shortCommit: string; timestamp: string; lightSwitchShine: boolean };
  assert.equal(buildInfo.samples, showcaseSamples.length);
  assert.equal(buildInfo.shortCommit.length, 12);
  assert(buildInfo.timestamp.length > 0);
  assert.equal(buildInfo.lightSwitchShine, true);
});

test('light-switch shine build flag defaults to active and can be disabled', () => {
  assert.deepEqual(parseBuildArgs([]), { lightSwitchShine: true });
  assert.deepEqual(parseBuildArgs(['--light-switch-shine']), { lightSwitchShine: true });
  assert.deepEqual(parseBuildArgs(['--light-switch-shine=true']), { lightSwitchShine: true });
  assert.deepEqual(parseBuildArgs(['--no-light-switch-shine']), { lightSwitchShine: false });
  assert.deepEqual(parseBuildArgs(['--light-switch-shine=false']), { lightSwitchShine: false });
  assert.throws(() => parseBuildArgs(['--unknown-flag']), /unknown site build flag/);

  buildSite({ lightSwitchShine: false, tsCompiler: sharedTsCompiler() });
  const out = join(root, 'dist', 'site');
  const indexDisabled = readFileSync(join(out, 'index.html'), 'utf8');
  assert(indexDisabled.includes('class="theme-toggle"'));
  assert(!indexDisabled.includes('theme-toggle-shine'));
  const buildInfoDisabled = JSON.parse(readFileSync(join(out, 'build.json'), 'utf8')) as { lightSwitchShine: boolean };
  assert.equal(buildInfoDisabled.lightSwitchShine, false);

  // Restore default active build output in dist/site.
  buildSite({ tsCompiler: sharedTsCompiler() });
});

test('stripLiteTs produces runnable JS matching compiler output for all showcase samples', () => {
  const out = join(root, 'dist', 'site');
  const tsCompiler = sharedTsCompiler();
  const encoder = new TextEncoder();

  for (const sample of showcaseSamples) {
    const payload = JSON.parse(
      readFileSync(join(out, 'playground', 'samples', `${sample.id}.json`), 'utf8')
    ) as { stdin?: string; args?: string[]; output: string };
    const source = readFileSync(resolve(root, sample.file), 'utf8');
    const compiled = compileBuiltCompiler(tsCompiler, { text: source, name: sample.file, cwd: root });
    assert.equal(compiled.status, 0, compiled.stderr.toString('utf8'));
    const ts = compiled.stdout.toString('utf8');
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

test('emitted playground worker.js compiles and runs edited Lite code', async () => {
  const out = join(root, 'dist', 'site');
  const workerPath = join(out, 'playground', 'worker.js');
  const stdlibPath = join(out, 'playground', 'stdlib.json');
  assert(existsSync(workerPath));
  assert(existsSync(join(out, 'playground', 'strip-ts.js')));

  const messages: Array<{ id: number; ok: boolean; ts?: string; c?: string; stdout?: string; stderr: string }> = [];
  let waiter: (() => void) | undefined;
  const prevSelf = (globalThis as unknown as { self?: unknown }).self;
  const prevFetch = globalThis.fetch;

  const mockSelf: { onmessage?: (e: { data: unknown }) => Promise<void>; postMessage: (msg: { id: number; ok: boolean; ts?: string; c?: string; stdout?: string; stderr: string }) => void } = {
    postMessage(msg) {
      messages.push(msg);
      waiter?.();
    },
  };
  const compilerPath = join(out, 'playground', 'compiler.js');
  const compilerCPath = join(out, 'playground', 'compiler-c.js');
  assert(existsSync(compilerCPath));
  (globalThis as unknown as { self: unknown }).self = mockSelf;
  globalThis.fetch = (async (url: string | URL) => {
    const target = String(url);
    if (target.endsWith('stdlib.json')) {
      return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(stdlibPath, 'utf8')) };
    }
    if (target.endsWith('compiler-c.js')) {
      return { ok: true, status: 200, text: async () => readFileSync(compilerCPath, 'utf8') };
    }
    if (target.endsWith('compiler.js')) {
      return { ok: true, status: 200, text: async () => readFileSync(compilerPath, 'utf8') };
    }
    return { ok: false, status: 404 };
  }) as unknown as typeof fetch;

  try {
    await import(pathToFileURL(workerPath).href);
    assert(typeof mockSelf.onmessage === 'function');

    const send = async (data: unknown) => {
      const done = new Promise<void>((resolve) => { waiter = resolve; });
      await mockSelf.onmessage!({ data });
      await done;
      return messages.at(-1)!;
    };

    const runRes = await send({
      id: 1,
      action: 'run',
      source: 'io := import "core/io";\nio.outputLine(21 * 2);',
      stdin: '',
      args: [],
    });
    assert.equal(runRes.id, 1);
    assert.equal(runRes.ok, true);
    assert(runRes.ts?.includes('export function main'));
    assert.equal(runRes.stdout, '42\n');
    assert.equal(runRes.stderr, '');

    const cRes = await send({
      id: 2,
      action: 'compile-c',
      source: 'io := import "core/io";\nio.outputLine(21 * 2);',
      stdin: '',
      args: [],
    });
    assert.equal(cRes.id, 2);
    assert.equal(cRes.ok, true);
    assert(cRes.c?.includes('#include <stdio.h>'));
    assert(cRes.c?.includes('int main(void)'));

    const errRes = await send({
      id: 3,
      action: 'compile',
      source: 'io := import "core/io";\nio.outputLine(unknownVar);',
      stdin: '',
      args: [],
    });
    assert.equal(errRes.id, 3);
    assert.equal(errRes.ok, false);
    assert(errRes.stderr.includes('unknownVar'));

    const staticRes = await send({
      id: 4,
      action: 'run',
      source: [
        'canvas := import "extra/canvas";',
        'ctx := canvas.create(width = 8, height = 6, title = "Static");',
        'canvas.clear(canvas.rgba(10, 20, 30, 128));',
        'canvas.setPixel(2, 3, canvas.rgb(255, 0, 0));',
      ].join('\n'),
      stdin: '',
      args: [],
    }) as unknown as {
      ok: boolean;
      play: unknown;
      canvas: { width: number; height: number; title: string; ops: number[] } | null;
    };
    assert.equal(staticRes.ok, true);
    assert.equal(staticRes.play, null);
    assert(staticRes.canvas !== null);
    assert.equal(staticRes.canvas.width, 8);
    assert.equal(staticRes.canvas.height, 6);
    assert.equal(staticRes.canvas.title, 'Static');
    assert.equal(staticRes.canvas.ops[0], 1);

    const playRes = await send({
      id: 5,
      action: 'run',
      source: [
        'audio := import "extra/audio";',
        'canvas := import "extra/canvas";',
        'ctx := canvas.play(width = 16, height = 12, title = "Live");',
        'bg := canvas.rgb(0, 0, 0);',
        'var x := 1;',
        'onCanvasInit := fn(): Unit { canvas.clear(bg); }',
        'onCanvasUpdate := fn(dt: Float): Int { voidDt := dt; canvas.clear(bg); canvas.setPixel(x, 2, canvas.rgb(255, 255, 255)); 0 }',
        'onCanvasKeyDown := fn(key: String): Unit { if key == "ArrowRight" { x += 1; audio.tone(440, 100, 20); } }',
        'onCanvasPointerDown := fn(col: Int, row: Int, button: Int): Unit { voidBtn := button; canvas.setPixel(col, row, canvas.rgba(0, 255, 0, 180)); audio.tone(523, 80, 15); }',
      ].join('\n'),
      stdin: '',
      args: [],
    }) as unknown as {
      ok: boolean;
      play: { width: number; height: number; title: string; hasUpdate: boolean; status: number; ops: number[] } | null;
      tones: number[];
    };
    assert.equal(playRes.ok, true);
    assert(playRes.play !== null);
    assert.equal(playRes.play.width, 16);
    assert.equal(playRes.play.height, 12);
    assert.equal(playRes.play.hasUpdate, true);
    assert.equal(playRes.play.status, 0);

    const stepRes = await send({ id: 6, action: 'step', dt: 0.016 }) as unknown as {
      ok: boolean;
      action: string;
      status: number;
      frame: { ops: number[] };
    };
    assert.equal(stepRes.ok, true);
    assert.equal(stepRes.action, 'step');
    assert.equal(stepRes.status, 0);
    assert.equal(stepRes.frame.ops[0], 1);

    const keyRes = await send({ id: 7, action: 'keydown', key: 'ArrowRight' }) as unknown as {
      ok: boolean;
      tones: number[];
    };
    assert.equal(keyRes.ok, true);
    assert.deepEqual(keyRes.tones, [440, 100, 20]);

    const ptrRes = await send({ id: 8, action: 'pointerdown', x: 5, y: 4, button: 0 }) as unknown as {
      ok: boolean;
      frame: { ops: number[] };
      tones: number[];
    };
    assert.equal(ptrRes.ok, true);
    assert.equal(ptrRes.frame.ops[0], 2);
    assert.equal(ptrRes.frame.ops[1], 5);
    assert.equal(ptrRes.frame.ops[2], 4);
    assert.deepEqual(ptrRes.tones, [523, 80, 15]);

    await mockSelf.onmessage!({ data: { action: 'stop' } });

    const aliasRes = await send({
      id: 9,
      action: 'run',
      source: [
        'canvas := import "extra/canvas";',
        'ctx := canvas.play(width = 4, height = 4, title = "Alias");',
        'canvas_onUpdate := fn(dt: Float): Int { voidDt := dt; canvas.clear(canvas.rgb(1, 2, 3)); 0 }',
      ].join('\n'),
      stdin: '',
      args: [],
    }) as unknown as { ok: boolean; play: { hasUpdate: boolean; ops: number[] } | null };
    assert.equal(aliasRes.ok, true);
    assert.equal(aliasRes.play?.hasUpdate, true);
    assert.equal(aliasRes.play?.ops[0], 1);
    await mockSelf.onmessage!({ data: { action: 'stop' } });

    const modPayload = JSON.parse(readFileSync(join(out, 'learn/payloads/modules-and-visibility.json'), 'utf8')) as {
      source: string;
      output: string;
      extraModules: Record<string, unknown>;
    };
    const modRes = await send({
      id: 10,
      action: 'run',
      source: modPayload.source,
      stdin: '',
      args: [],
      extraModules: modPayload.extraModules,
    }) as unknown as { ok: boolean; stdout?: string; stderr: string };
    assert.equal(modRes.ok, true, modRes.stderr);
    assert.equal(modRes.stdout, modPayload.output);

    const gradePass = await send({
      id: 11,
      action: 'grade',
      source: 'io := import "core/io";\nn := io.inputInt();\nio.outputLine(n * 2);',
      cases: [
        { name: 'vis-5', stdin: '5\n', args: [], expectedStdout: '10\n', hidden: false },
        { name: 'hid-neg3', stdin: '-3\n', args: [], expectedStdout: '-6\n', hidden: true },
      ],
    }) as unknown as {
      ok: boolean;
      action: string;
      allPassed: boolean;
      results: Array<{ passed: boolean; hidden: boolean; expectedStdout?: string; actualStdout?: string }>;
    };
    assert.equal(gradePass.ok, true);
    assert.equal(gradePass.action, 'grade');
    assert.equal(gradePass.allPassed, true);
    assert.equal(gradePass.results.length, 2);
    assert.equal(gradePass.results[0]?.passed, true);
    assert.equal(gradePass.results[0]?.expectedStdout, '10\n');
    assert.equal(gradePass.results[0]?.actualStdout, '10\n');
    assert.equal(gradePass.results[1]?.passed, true);
    assert.equal(gradePass.results[1]?.hidden, true);
    assert(!('expectedStdout' in (gradePass.results[1] ?? {})));
    assert(!('actualStdout' in (gradePass.results[1] ?? {})));

    const gradeFail = await send({
      id: 12,
      action: 'grade',
      source: 'io := import "core/io";\nn := io.inputInt();\nio.outputLine(n * 2);',
      cases: [
        { name: 'vis-wrong', stdin: '5\n', args: [], expectedStdout: '99\n', hidden: false },
      ],
    }) as unknown as { ok: boolean; allPassed: boolean; results: Array<{ passed: boolean; actualStdout?: string }> };
    assert.equal(gradeFail.ok, true);
    assert.equal(gradeFail.allPassed, false);
    assert.equal(gradeFail.results[0]?.passed, false);
    assert.equal(gradeFail.results[0]?.actualStdout, '10\n');

    const gradeErr = await send({
      id: 13,
      action: 'grade',
      source: 'io := import "core/io";\nio.outputLine(nope);',
      cases: [
        { name: 'vis-err', stdin: '', args: [], expectedStdout: '0\n', hidden: false },
      ],
    }) as unknown as { ok: boolean; allPassed: boolean; stderr: string };
    assert.equal(gradeErr.ok, false);
    assert.equal(gradeErr.allPassed, false);
    assert(gradeErr.stderr.includes('nope'));
  } finally {
    (globalThis as unknown as { self?: unknown }).self = prevSelf;
    globalThis.fetch = prevFetch;
  }
});

test('formatCodeView filters TS and C output for Program, Portable, and Full modes', () => {
  const out = join(root, 'dist', 'site');
  const sample = JSON.parse(readFileSync(join(out, 'playground', 'samples', 'scan-arithmetic.json'), 'utf8')) as { ts: string };

  const programTs = formatCodeView(sample.ts, 'ts', 'program');
  assert(!programTs.includes('declare const process'));
  assert(!programTs.includes('liteFn$lib$core$int$intAdd'));
  assert(!programTs.includes('let lite$out = "";'));
  assert(programTs.includes('function isDigit('));
  assert(programTs.includes('const line'));
  assert(!programTs.includes('function liteFn_isDigit'));
  assert(!programTs.includes('const lite_line'));

  const portableTs = formatCodeView(sample.ts, 'ts', 'portable');
  assert(!portableTs.includes('declare const process'));
  assert(portableTs.includes('export function main'));
  assert(portableTs.includes('function liteFn_isDigit('));
  assert(portableTs.includes('const lite_line'));

  const sumLoop = JSON.parse(readFileSync(join(out, 'playground', 'samples', 'sum-loop.json'), 'utf8')) as { ts: string };
  const sumProgram = formatCodeView(sumLoop.ts, 'ts', 'program');
  assert(sumProgram.includes('while (true)'));
  assert(!sumProgram.includes('Boolean(true)'));
  assert(sumProgram.includes('if (sum === 15n)'));
  assert(sumProgram.includes('lite$emit("sum(1..5) =" + " " + sum.toString(), "\\n")'));
  const sumPortable = formatCodeView(sumLoop.ts, 'ts', 'portable');
  assert(sumPortable.includes('if (lite_sum === 15n)'));

  assert.equal(formatCodeView(sample.ts, 'ts', 'full'), sample.ts);

  const sampleC = [
    '#include <stdio.h>',
    'static const size_t lt_int_lines[] = {0, 10};',
    'static const char *lt_int_source = "a.lts:";',
    'int main(void) {',
    '    int64_t lite_x = INT64_C(42);',
    '    (void)lite_x;',
    '    return 0;',
    '}',
  ].join('\n');
  const programC = formatCodeView(sampleC, 'c', 'program');
  assert(!programC.includes('#include'));
  assert(!programC.includes('(void)lite_x;'));
  assert(programC.startsWith('int main(void) {'));
  assert(programC.includes('int64_t x = INT64_C(42);'));

  const portableC = formatCodeView(sampleC, 'c', 'portable');
  assert(portableC.includes('#include <stdio.h>'));
  assert(!portableC.includes('(void)lite_x;'));
  assert(portableC.includes('int64_t lite_x = INT64_C(42);'));
  assert.equal(formatCodeView(sampleC, 'c', 'full'), sampleC);
});

test('formatCodeView simplifies Program identifiers without collisions on TS and C', () => {
  const tsSource = [
    'declare const process: { exit(code: number): never };',
    'function liteFn$left$util$tag(): string { return "L"; }',
    'function liteFn$right$util$tag(): string { return "R"; }',
    'export function main(lite$write?: (text: string) => void): string {',
    '    let lite$out = "";',
    '    function lite$emit(text: string): void {',
    '        if (lite$write === undefined) lite$out += text;',
    '        else lite$write(text);',
    '    }',
    '    void lite$emit;',
    '    const lite$m$left$util$val = 10n;',
    '    void lite$m$left$util$val;',
    '    const lite$m$right$util$val = 20n;',
    '    void lite$m$right$util$val;',
    '    function liteFn$left$util$tag(): string { return "L"; }',
    '    void liteFn$left$util$tag;',
    '    const lite_x = 1n;',
    '    const lite_x_2 = 2n;',
    '    const lite_class = 3n;',
    '    const lite_Number = 4n;',
    '    const lite_pair = { x: lite_x, y: 1n };',
    '    {',
    '        const lite_x$2 = 5n;',
    '        const lite_msg = "lite_x liteFn_foo lt_s2_x";',
    '        lite$emit((lite_x$2 + lite_x_2 + lite_class + lite_Number + lite_pair.x + lite$m$left$util$val + lite$m$right$util$val).toString() + liteFn$left$util$tag() + liteFn$right$util$tag() + lite_msg + "\\n");',
    '    }',
    '    return lite$out;',
    '}',
  ].join('\n');

  const tsProgram = formatCodeView(tsSource, 'ts', 'program');
  assert(!tsProgram.includes('lite$m$left$util$val = 10n'));
  assert(!tsProgram.includes('lite$m$right$util$val = 20n'));
  assert(tsProgram.includes('const x = 1n;'));
  assert(tsProgram.includes('const x_2 = 2n;'));
  assert(tsProgram.includes('const x_3 = 5n;'));
  assert(tsProgram.includes('const class_2 = 3n;'));
  assert(tsProgram.includes('const Number_2 = 4n;'));
  assert(tsProgram.includes('const pair = { x: x, y: 1n };'));
  assert(tsProgram.includes('const msg = "lite_x liteFn_foo lt_s2_x";'));
  assert(tsProgram.includes('util$val + util$val_2'));
  assert(tsProgram.includes('util$tag() + util$tag_2()'));
  assert(tsProgram.includes('pair.x'));

  const tsPortable = formatCodeView(tsSource, 'ts', 'portable');
  assert(tsPortable.includes('const lite$m$left$util$val = 10n;'));
  assert(tsPortable.includes('const lite_x = 1n;'));
  assert(tsPortable.includes('const lite_x$2 = 5n;'));

  const cSource = [
    '#include <stdio.h>',
    'static int64_t lite_divide_int(int64_t left, int64_t right, size_t at) { (void)at; return left / right; }',
    'static const char *lite_concat(const char *left, const char *right) { (void)left; return right; }',
    'int main(void) {',
    '    int status = 0;',
    '    int64_t lt_m_left_s_util__val = INT64_C(10);',
    '    (void)lt_m_left_s_util__val;',
    '    int64_t lt_m_right_s_util__val = INT64_C(20);',
    '    (void)lt_m_right_s_util__val;',
    '    int64_t lite_x = INT64_C(1);',
    '    int64_t lite_x_2 = INT64_C(2);',
    '    int64_t lite_double = INT64_C(3);',
    '    int64_t lite_status = INT64_C(4);',
    '    int64_t lite_printf = INT64_C(5);',
    '    {',
    '        int64_t lt_s2_x = INT64_C(6);',
    '        const char *lite_msg = "lite_x liteFn_foo lt_s2_x";',
    '        const char *lite_concat = lite_concat("a", lite_msg);',
    '        printf("%" PRId64 "%s\\n", lite_divide_int(lt_s2_x + lite_x_2 + lite_double + lite_status + lite_printf + lt_m_left_s_util__val + lt_m_right_s_util__val, 2, 10), lite_concat);',
    '    }',
    '    return status;',
    '}',
  ].join('\n');

  const cProgram = formatCodeView(cSource, 'c', 'program');
  assert(!cProgram.includes('lt_m_left_s_util__val ='));
  assert(!cProgram.includes('lt_m_right_s_util__val ='));
  assert(cProgram.includes('int64_t x = INT64_C(1);'));
  assert(cProgram.includes('int64_t x_2 = INT64_C(2);'));
  assert(cProgram.includes('int64_t x_3 = INT64_C(6);'));
  assert(cProgram.includes('int64_t double_2 = INT64_C(3);'));
  assert(cProgram.includes('int64_t status_2 = INT64_C(4);'));
  assert(cProgram.includes('int64_t printf_2 = INT64_C(5);'));
  assert(cProgram.includes('util_val + util_val_2'));
  assert(cProgram.includes('"lite_x liteFn_foo lt_s2_x"'));
  assert(cProgram.includes('lite_divide_int(x_3'));

  const cDivHelperOnly = [
    'int main(void) {',
    '    int status = 0;',
    '    int64_t lite_a = lite_divide_int(INT64_C(6), INT64_C(2), 10);',
    '    (void)lite_a;',
    '    const char *lite_b = lite_concat("x", "y");',
    '    (void)lite_b;',
    '    return status;',
    '}',
  ].join('\n');
  const cHelperProgram = formatCodeView(cDivHelperOnly, 'c', 'program');
  assert(cHelperProgram.includes('int64_t a = lite_divide_int('));
  assert(cHelperProgram.includes('const char *b = lite_concat('));

  const cPortable = formatCodeView(cSource, 'c', 'portable');
  assert(cPortable.includes('int64_t lt_m_left_s_util__val = INT64_C(10);'));
  assert(cPortable.includes('int64_t lt_s2_x = INT64_C(6);'));
});

test('playground inline module initializes without TDZ or ReferenceError', async () => {
  const html = readFileSync(join(root, 'dist', 'site', 'playground', 'index.html'), 'utf8');
  const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert(scriptMatch, 'missing playground inline module script');
  const scriptBody = (scriptMatch[1] ?? '')
    .replace(/^\s*import\s+\{[^}]+\}\s+from\s+"\.\/code-view\.js";\s*/m, '')
    .replace(/^\s*import\s+\{[^}]+\}\s+from\s+"\.\/highlight\.js";\s*/m, '');

  const makeEl = (id = '') => {
    const attrs = new Map<string, string>();
    const classes = new Set<string>();
    const listeners = new Map<string, Array<(ev: unknown) => void>>();
    const el = {
      id,
      value: '',
      hidden: false,
      textContent: '',
      innerHTML: '',
      title: '',
      width: 320,
      height: 200,
      scrollTop: 0,
      scrollLeft: 0,
      selectionStart: 0,
      selectionEnd: 0,
      dataset: { tab: 'output', mode: 'program' } as Record<string, string>,
      style: { setProperty() {} },
      classList: {
        add(c: string) { classes.add(c); },
        remove(c: string) { classes.delete(c); },
      },
      setAttribute(k: string, v: string) { attrs.set(k, String(v)); },
      getAttribute(k: string) { return attrs.get(k) ?? null; },
      addEventListener(type: string, fn: (ev: unknown) => void) {
        const list = listeners.get(type) ?? [];
        list.push(fn);
        listeners.set(type, list);
      },
      trigger(type: string, ev: unknown = {}) {
        for (const fn of listeners.get(type) ?? []) fn(ev);
      },
      focus() {},
      getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 400 }; },
      getContext() {
        return {
          createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
          putImageData() {},
        };
      },
      setPointerCapture() {},
      hasPointerCapture() { return false; },
      releasePointerCapture() {},
      setRangeText() {},
    };
    return el;
  };

  const els = new Map<string, ReturnType<typeof makeEl>>();
  const docEl = {
    body: makeEl('body'),
    getElementById(id: string) {
      let el = els.get(id);
      if (!el) { el = makeEl(id); els.set(id, el); }
      return el;
    },
    querySelectorAll(sel: string) {
      if (sel === '.pg-tab') return ['output', 'ts', 'c', 'canvas'].map(tab => {
        const el = makeEl(`tab-${tab}`);
        el.dataset = { tab };
        return el;
      });
      if (sel === '.code-mode-btn') return ['program', 'portable', 'full'].map(mode => {
        const el = makeEl(`mode-${mode}`);
        el.dataset = { mode };
        return el;
      });
      return [];
    },
  };

  const sampleJsonPath = join(root, 'dist', 'site', 'playground', 'samples');
  const firstSampleId = showcaseSamples[0]!.id;
  const replacedUrls: string[] = [];
  const storedSnips: Array<{ id: string; title: string; code: string; stdin: string; args: string; origin: string }> = [];
  const mockWin = {
    location: { href: `https://example.test/playground/?sample=${firstSampleId}`, search: `?sample=${firstSampleId}` },
    history: {
      replaceState(_state: unknown, _title: string, url: URL | string) {
        replacedUrls.push(String(url));
      },
    },
    localStorage: { getItem: () => null, setItem() {} },
    LiteSnips: {
      list: () => storedSnips,
      get: (id: string) => storedSnips.find(s => s.id === id) ?? null,
      saveNew: (d: { title: string; code: string; stdin?: string; args?: string; origin?: string }) => {
        const entry = {
          id: '019335a1-0000-7000-8000-000000000001',
          title: d.title,
          code: d.code,
          stdin: d.stdin ?? '',
          args: d.args ?? '',
          origin: d.origin ?? 'playground',
        };
        storedSnips.unshift(entry);
        return entry;
      },
      update: (id: string, p: { title?: string; code?: string; stdin?: string; args?: string }) => {
        const hit = storedSnips.find(s => s.id === id);
        if (!hit) return null;
        if (p.title !== undefined) hit.title = p.title;
        if (p.code !== undefined) hit.code = p.code;
        if (p.stdin !== undefined) hit.stdin = p.stdin;
        if (p.args !== undefined) hit.args = p.args;
        return hit;
      },
      remove: () => false,
      clear: () => { storedSnips.length = 0; },
    },
    navigator: {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    setTimeout,
    clearTimeout,
  };

  const sandbox = {
    formatCodeView,
    highlightLite,
    highlightTs,
    highlightC,
    document: docEl,
    window: mockWin,
    navigator: mockWin.navigator,
    URL,
    URLSearchParams,
    Map,
    Set,
    Array,
    Number,
    String,
    Boolean,
    Math,
    Object,
    Promise,
    Error,
    BigInt,
    Uint8ClampedArray,
    performance: { now: () => 0 },
    requestAnimationFrame: mockWin.requestAnimationFrame,
    cancelAnimationFrame: mockWin.cancelAnimationFrame,
    setTimeout,
    clearTimeout,
    Worker: class { addEventListener() {} postMessage() {} },
    fetch: async (url: string) => {
      const m = String(url).match(/\/([^/]+\.json)$/);
      const sampleFile = m?.[1];
      if (sampleFile !== undefined && existsSync(join(sampleJsonPath, sampleFile))) {
        return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(join(sampleJsonPath, sampleFile), 'utf8')) };
      }
      return { ok: false, status: 404 };
    },
  };

  runInNewContext(`(async () => {\n${scriptBody}\n})()`, sandbox);
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(els.get('pg-pause')?.getAttribute('aria-pressed'), 'false');
  const saveBtn = els.get('pg-save-snip');
  const resetBtnEl = els.get('pg-reset');
  const editor = els.get('pg-editor');
  assert(saveBtn && resetBtnEl && editor);
  assert.equal(saveBtn.hidden, true, 'Save button should stay hidden when editor matches loaded sample');
  assert.equal(resetBtnEl.hidden, true, 'Reset button should stay hidden when editor matches loaded sample');
  editor.value += '\n/* edited */\n';
  editor.trigger('input');
  assert.equal(saveBtn.hidden, false, 'Save button should appear once code is modified');
  assert.equal(resetBtnEl.hidden, false, 'Reset button should appear once code is modified');
  saveBtn.trigger('click');
  assert.equal(saveBtn.hidden, true, 'Save button should hide again right after saving');
  assert.equal(resetBtnEl.hidden, true, 'Reset button should hide again right after saving');
  assert.equal(storedSnips.length, 1);
  assert(
    replacedUrls.at(-1)?.includes('?snip=019335a1-0000-7000-8000-000000000001'),
    `expected URL to switch to saved UUIDv7 snip, got ${replacedUrls.at(-1)}`,
  );
});

test('runtime/snips.js manages UUIDv7 localStorage sketches and enhances doc code blocks', () => {
  const snipsPath = join(root, 'dist', 'site', 'runtime', 'snips.js');
  const snipsJs = readFileSync(snipsPath, 'utf8');
  const storage = new Map<string, string>();
  const createdBars: Array<{ className: string; buttons: Array<{ textContent: string; className: string; click: () => void }> }> = [];

  const mockPre = {
    tagName: 'PRE',
    textContent: 'io := import "core/io";\nio.outputLine("Hi!");\n',
    dataset: {} as Record<string, string>,
    previousElementSibling: { tagName: 'H2', textContent: 'Your First Program' },
    parentElement: { tagName: 'DIV', previousElementSibling: null, querySelector: () => null, parentElement: { tagName: 'MAIN' } },
    getAttribute: (name: string) => (name === 'data-lang' ? 'lite' : null),
    closest: (sel: string) => (sel.includes('.doc-prose') ? { tagName: 'DIV' } : null),
    insertAdjacentElement: (_pos: string, bar: { className: string; buttons: Array<{ textContent: string; className: string; click: () => void }> }) => {
      createdBars.push(bar);
    },
  };

  const mockWin = {
    location: { href: 'https://example.test/docs/handbook/overview-and-setup.html', pathname: '/docs/handbook/overview-and-setup.html' },
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v); },
      removeItem: (k: string) => { storage.delete(k); },
    },
    dispatchEvent() {},
    setTimeout,
    LiteSnips: undefined as unknown as {
      STORAGE_KEY: string;
      uuidv7: () => string;
      list: () => Array<{ id: string; title: string; code: string; origin: string }>;
      get: (id: string) => { id: string; title: string; code: string; origin: string } | null;
      saveNew: (d: { title: string; code: string; origin?: string }) => { id: string; title: string };
      update: (id: string, p: { title?: string; code?: string }) => { id: string; title: string; code: string } | null;
      remove: (id: string) => boolean;
      clear: () => void;
    },
  };

  const makeMockNode = (tag: string) => {
    const children: unknown[] = [];
    const listeners: Record<string, Array<() => void>> = {};
    const node = {
      tagName: tag.toUpperCase(),
      type: '',
      className: '',
      textContent: '',
      dataset: {} as Record<string, string>,
      buttons: children,
      classList: { add() {}, remove() {} },
      appendChild(ch: unknown) { children.push(ch); },
      addEventListener(ev: string, fn: () => void) {
        (listeners[ev] ??= []).push(fn);
      },
      click() {
        for (const fn of listeners['click'] ?? []) fn();
      },
    };
    return node;
  };

  const sandbox = {
    window: mockWin,
    document: {
      readyState: 'complete',
      title: 'Overview & Setup — Docs — Lite',
      body: { dataset: { basePath: '../../' } },
      querySelector: () => ({ textContent: 'Overview & Setup' }),
      querySelectorAll: (sel: string) => (sel === 'pre.code-block' ? [mockPre] : []),
      createElement: (tag: string) => makeMockNode(tag),
      addEventListener() {},
    },
    navigator: {},
    crypto: globalThis.crypto,
    CustomEvent: class {
      type: string;
      init: unknown;
      constructor(type: string, init?: unknown) {
        this.type = type;
        this.init = init;
      }
    },
    URLSearchParams,
    Uint8Array,
    Date,
    Math,
    Array,
    String,
    JSON,
    setTimeout,
  };

  runInNewContext(snipsJs, sandbox);
  const api = mockWin.LiteSnips;
  assert(api, 'window.LiteSnips should be initialized');
  const id = api.uuidv7();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  const saved = api.saveNew({ title: 'First', code: 'io := import "core/io";', origin: 'custom' });
  assert.match(saved.id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  api.update(saved.id, { title: 'Renamed First', code: 'io.outputLine(1);' });
  assert.equal(api.get(saved.id)?.title, 'Renamed First');
  assert.equal(api.get(saved.id)?.code, 'io.outputLine(1);');

  assert.equal(createdBars.length, 1);
  const playBtn = createdBars[0]!.buttons.find(b => b.textContent.includes('Open in Play'));
  assert(playBtn, 'expected Open in Play button on Lite code block');
  playBtn.click();
  assert(mockWin.location.href.startsWith('../../playground/?snip='), mockWin.location.href);
  const loadedId = decodeURIComponent(mockWin.location.href.split('?snip=')[1]!);
  assert.equal(api.get(loadedId)?.title, 'Your First Program');
  assert(api.get(loadedId)?.code.includes('io.outputLine("Hi!");'));

  assert.equal(api.remove(saved.id), true);
  assert.equal(api.list().length, 1);
  api.clear();
  assert.equal(api.list().length, 0);
});

test('stripLiteTs and formatCodeView handle construct-level finally and abrupt unwinding', () => {
  const compiler = sharedTsCompiler();
  const runStripped = (tsSource: string) => {
    const js = stripLiteTs(tsSource);
    let stdout = '';
    let stderr = '';
    const fakeProcess = {
      argv: ['node', 'playground.js'],
      exit(code: number): never {
        throw new Error(`EXIT:${code}`);
      },
      getBuiltinModule(name: string) {
        assert.equal(name, 'node:fs');
        return {
          readSync: () => 0,
          writeSync(fd: number, text: string): number {
            if (fd === 1) stdout += text;
            else if (fd === 2) stderr += text;
            return text.length;
          },
        };
      },
    };
    const fn = new Function('process', `${js.replace(/export function main\b/, 'function main')}\nreturn main();`) as (
      p: typeof fakeProcess,
    ) => string | undefined;
    try {
      const ret = fn(fakeProcess);
      return { exitCode: null as number | null, stdout: stdout + (ret ?? ''), stderr };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('EXIT:')) {
        return { exitCode: Number(msg.slice(5)), stdout, stderr };
      }
      throw err;
    }
  };

  const cleanupSource = readFileSync(join(root, 'language/verifications/features/control/unwinding/finally-cleanup.lts'), 'utf8');
  const cleanupTs = compileBuiltCompiler(compiler, { name: 'finally-cleanup.lts', text: cleanupSource });
  assert.equal(cleanupTs.status, 0, cleanupTs.stderr.toString());
  const cleanupRes = runStripped(cleanupTs.stdout.toString());
  assert.equal(cleanupRes.exitCode, null);
  assert.equal(cleanupRes.stdout, '1\n2\nthen\nfinally\ncond\n1\nreturn-cleanup\n5\n');
  assert.equal(cleanupRes.stderr, '');

  const faultSource = [
    'io := import "core/io";',
    'var zero := 0;',
    '{',
    '    { io.outputLine(1 / zero); } finally { io.outputLine("inner"); }',
    '} finally {',
    '    io.outputLine("outer");',
    '}',
    '',
  ].join('\n');
  const faultCompiled = compileBuiltCompiler(compiler, { name: 'fault.lts', text: faultSource });
  assert.equal(faultCompiled.status, 0, faultCompiled.stderr.toString());
  const faultTs = faultCompiled.stdout.toString();

  const programView = formatCodeView(faultTs, 'ts', 'program');
  assert(!programView.includes('lite$abrupt'), programView);
  assert(!programView.includes('return lite$out;'), programView);

  const faultRes = runStripped(faultTs);
  assert.equal(faultRes.exitCode, 1);
  assert.equal(faultRes.stdout, 'inner\nouter\n');
  assert.equal(faultRes.stderr, 'fault.lts:4:23: ArithmeticPanic: division by zero\n');
});
