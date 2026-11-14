import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { buildTsCompiler, compileBuiltCompiler, type CompilerBuild } from '../compiler/host.ts';
import { buildSite, parseBuildArgs } from './build.ts';
import { formatCodeView } from './code-view.ts';
import { heroSample, sampleGroups, showcaseSamples } from './groups.ts';
import { escapeHtml, highlightC, highlightLite, highlightTs } from './highlight.ts';
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
  assert(index.includes('<meta name="color-scheme" content="light dark">'));
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
  const styleCss = readFileSync(join(out, 'style.css'), 'utf8');
  assert(styleCss.includes('.theme-toggle.theme-toggle-shine'));
  assert(styleCss.includes('.shell-line::before'));
  assert(styleCss.includes('.quickstart-copy'));
  assert(!styleCss.includes('var(--bg-elev)'));
  const playground = readFileSync(join(out, 'playground/index.html'), 'utf8');
  assert(playground.includes('playground-page'));
  assert(playground.includes('highlightLite(editorEl.value)'));
  assert(playground.includes('Generated TS'));
  assert(playground.includes('id="pg-compile"'));
  assert(playground.includes('id="pg-play"'));
  assert(playground.includes('id="pg-copy"'));
  assert(playground.includes('event.key === "Tab"'));
  assert(playground.includes('id="pg-c"'));
  assert(playground.includes('id="mode-program"'));
  assert(playground.includes('id="mode-portable"'));
  assert(playground.includes('id="mode-full"'));
  assert(playground.includes('new Worker("./worker.js"'));
  assert(existsSync(join(out, 'playground', 'code-view.js')));
  assert(existsSync(join(out, 'playground', 'highlight.js')));
  assert(playground.includes('id="tab-canvas"'));
  assert(playground.includes('id="pg-fps"'));
  for (const sample of showcaseSamples) {
    assert(existsSync(join(out, 'playground', 'samples', `${sample.id}.json`)), `missing playground payload for ${sample.id}`);
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
  assert(!programTs.includes('liteFn_m3_intAdd'));
  assert(!programTs.includes('let lite_out = "";'));
  assert(programTs.includes('function liteFn_isDigit'));
  assert(programTs.includes('const lite_line'));

  const portableTs = formatCodeView(sample.ts, 'ts', 'portable');
  assert(!portableTs.includes('declare const process'));
  assert(portableTs.includes('export function main'));

  const sumLoop = JSON.parse(readFileSync(join(out, 'playground', 'samples', 'sum-loop.json'), 'utf8')) as { ts: string };
  const sumProgram = formatCodeView(sumLoop.ts, 'ts', 'program');
  assert(sumProgram.includes('while (true)'));
  assert(!sumProgram.includes('Boolean(true)'));
  assert(sumProgram.includes('if (lite_sum === 15n)'));
  assert(sumProgram.includes('lite$emit(lite$report0, "\\n")'));

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

  const portableC = formatCodeView(sampleC, 'c', 'portable');
  assert(portableC.includes('#include <stdio.h>'));
  assert(!portableC.includes('(void)lite_x;'));
  assert.equal(formatCodeView(sampleC, 'c', 'full'), sampleC);
});
