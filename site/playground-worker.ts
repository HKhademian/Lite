/** Browser Web Worker script for compiling (TS & C) and running Lite programs in Playground. */

export const playgroundWorkerJs = `import { stripLiteTs } from './strip-ts.js';

class ExitSignal {
  constructor(code) {
    this.code = code;
  }
}

let stdlibPromise = null;
function loadStdlib() {
  if (!stdlibPromise) {
    stdlibPromise = fetch('./stdlib.json').then((res) => {
      if (!res.ok) throw new Error('Failed to load stdlib.json (' + res.status + ')');
      return res.json();
    });
  }
  return stdlibPromise;
}

const compilerSourcePromises = new Map();
function loadCompilerSource(file) {
  if (!compilerSourcePromises.has(file)) {
    compilerSourcePromises.set(
      file,
      fetch('./' + file)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load ' + file + ' (' + res.status + ')');
          return res.text();
        })
        .then((src) => src.replace(/export function main\\b/, 'function main') + '\\nreturn (w, r) => main(w, r);'),
    );
  }
  return compilerSourcePromises.get(file);
}

const encoder = new TextEncoder();

function runWithProcessStub(argv, stdinText, fn) {
  const stdinBytes = encoder.encode(stdinText ?? '');
  let offset = 0;
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  const stubProcess = {
    argv,
    exit(code) {
      throw new ExitSignal(code);
    },
    getBuiltinModule(name) {
      if (name !== 'node:fs') throw new Error('Unsupported module: ' + name);
      return {
        readSync(_fd, buf, bufOffset, length) {
          if (offset >= stdinBytes.length) return 0;
          const n = Math.min(length, stdinBytes.length - offset);
          buf.set(stdinBytes.subarray(offset, offset + n), bufOffset);
          offset += n;
          return n;
        },
        writeSync(fd, text) {
          if (fd === 1) stdout += text;
          else stderr += text;
          return text.length;
        },
      };
    },
  };

  const prevProcess = globalThis.process;
  globalThis.process = stubProcess;
  try {
    const ret = fn(stubProcess, (text) => { stdout += text; });
    return { ok: true, exitCode, stdout: stdout + (ret ?? ''), stderr };
  } catch (err) {
    if (err instanceof ExitSignal) {
      return { ok: err.code === 0, exitCode: err.code, stdout, stderr };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, exitCode: 1, stdout, stderr: stderr ? stderr + '\\n' + message : message };
  } finally {
    globalThis.process = prevProcess;
  }
}

function makeReadSource(stdlib) {
  return (importer, spec) => {
    if (Object.prototype.hasOwnProperty.call(stdlib, spec)) return stdlib[spec];
    if (spec.startsWith('./')) {
      const prefix = importer.startsWith('lib/extra/') ? 'extra/' : importer.startsWith('lib/core/') ? 'core/' : '';
      if (prefix) {
        const name = prefix + spec.slice(2).replace(/\\.lts$/, '');
        if (Object.prototype.hasOwnProperty.call(stdlib, name)) return stdlib[name];
      }
    }
    throw new Error('cannot import ' + spec + ' from ' + importer);
  };
}

function compileWith(compilerSource, readSource, source) {
  return runWithProcessStub(
    ['node', 'compiler.js', 'playground.lts', 'playground', 'playground.lts'],
    source ?? '',
    (proc, write) => {
      const compileMain = new Function('process', compilerSource)(proc);
      return compileMain(write, readSource);
    },
  );
}

function attachPlayBridge(js) {
  const snapFn = js.match(/\\bfunction (liteFn\\$[a-zA-Z0-9_$]+\\$litePlayCanvasSnapshot)\\b/)?.[1] ?? '';
  const pixelsFn = js.match(/\\bfunction (liteFn\\$[a-zA-Z0-9_$]+\\$litePlayCanvasPixels)\\b/)?.[1] ?? '';
  const opsFn = js.match(/\\bfunction (liteFn\\$[a-zA-Z0-9_$]+\\$litePlayCanvasTakeOps)\\b/)?.[1] ?? '';
  const audioFn = js.match(/\\bfunction (liteFn\\$[a-zA-Z0-9_$]+\\$litePlayAudioDrain)\\b/)?.[1] ?? '';
  if (!snapFn && !audioFn) return js;

  const hooks = [
    audioFn
      ? 'globalThis.__liteAudioDrain = () => ' + audioFn + '().map(Number);'
      : 'globalThis.__liteAudioDrain = null;',
  ];

  if (snapFn && pixelsFn && opsFn) {
    hooks.push(
      'let __liteLastDrawCount = -1n;',
      'const __litePick = (a, b) => (typeof a === "function" ? a : typeof b === "function" ? b : null);',
      'const __liteInit = __litePick(typeof liteFn_onCanvasInit !== "undefined" ? liteFn_onCanvasInit : undefined, typeof liteFn_canvas_onInit !== "undefined" ? liteFn_canvas_onInit : undefined);',
      'const __liteUpdate = __litePick(typeof liteFn_onCanvasUpdate !== "undefined" ? liteFn_onCanvasUpdate : undefined, typeof liteFn_canvas_onUpdate !== "undefined" ? liteFn_canvas_onUpdate : undefined);',
      'const __liteKeyDown = __litePick(typeof liteFn_onCanvasKeyDown !== "undefined" ? liteFn_onCanvasKeyDown : undefined, typeof liteFn_canvas_onKeyDown !== "undefined" ? liteFn_canvas_onKeyDown : undefined);',
      'const __liteKeyUp = __litePick(typeof liteFn_onCanvasKeyUp !== "undefined" ? liteFn_onCanvasKeyUp : undefined, typeof liteFn_canvas_onKeyUp !== "undefined" ? liteFn_canvas_onKeyUp : undefined);',
      'const __litePointerMove = __litePick(typeof liteFn_onCanvasPointerMove !== "undefined" ? liteFn_onCanvasPointerMove : undefined, typeof liteFn_canvas_onPointerMove !== "undefined" ? liteFn_canvas_onPointerMove : undefined);',
      'const __litePointerDown = __litePick(typeof liteFn_onCanvasPointerDown !== "undefined" ? liteFn_onCanvasPointerDown : undefined, typeof liteFn_canvas_onPointerDown !== "undefined" ? liteFn_canvas_onPointerDown : undefined);',
      'const __litePointerUp = __litePick(typeof liteFn_onCanvasPointerUp !== "undefined" ? liteFn_onCanvasPointerUp : undefined, typeof liteFn_canvas_onPointerUp !== "undefined" ? liteFn_canvas_onPointerUp : undefined);',
      'const __liteNormStatus = (v) => (v === undefined ? 0 : typeof v === "boolean" ? (v ? 0 : 1) : Number(v));',
      'globalThis.__litePlay = {',
      '  hasUpdate: Boolean(__liteUpdate),',
      '  initialStatus: 0,',
      '  init: __liteInit,',
      '  update: __liteUpdate ? (dt) => __liteNormStatus(__liteUpdate(dt)) : null,',
      '  keyDown: __liteKeyDown ? (k) => { __liteKeyDown(String(k)); } : null,',
      '  keyUp: __liteKeyUp ? (k) => { __liteKeyUp(String(k)); } : null,',
      '  pointerMove: __litePointerMove ? (x, y) => { __litePointerMove(BigInt(Math.trunc(x)), BigInt(Math.trunc(y))); } : null,',
      '  pointerDown: __litePointerDown ? (x, y, b) => { __litePointerDown(BigInt(Math.trunc(x)), BigInt(Math.trunc(y)), BigInt(Math.trunc(b ?? 0))); } : null,',
      '  pointerUp: __litePointerUp ? (x, y, b) => { __litePointerUp(BigInt(Math.trunc(x)), BigInt(Math.trunc(y)), BigInt(Math.trunc(b ?? 0))); } : null,',
      '  frame() {',
      '    const snap = ' + snapFn + '();',
      '    const pixelsChanged = snap.drawCount !== __liteLastDrawCount;',
      '    __liteLastDrawCount = snap.drawCount;',
      '    return {',
      '      width: Number(snap.width),',
      '      height: Number(snap.height),',
      '      title: snap.title,',
      '      playing: Boolean(snap.playing),',
      '      pixels: pixelsChanged ? ' + pixelsFn + '().map(Number) : null,',
      '      ops: ' + opsFn + '().map(Number),',
      '    };',
      '  },',
      '};',
      'if (__liteInit) __liteInit();',
      'if (globalThis.__litePlay.update && Boolean(' + snapFn + '().playing)) {',
      '  globalThis.__litePlay.initialStatus = globalThis.__litePlay.update(0);',
      '}',
    );
  }

  const snippet = hooks.map((line) => '    ' + line).join('\\n');
  if (/return lite\\$out;\\s*\\}\\s*$/.test(js)) {
    return js.replace(/return lite\\$out;\\s*\\}\\s*$/, snippet + '\\n    return lite\\$out;\\n}');
  }
  return js.replace(/\\}\\s*$/, snippet + '\\n}');
}

function drainTones() {
  return globalThis.__liteAudioDrain ? globalThis.__liteAudioDrain() : [];
}

self.onmessage = async (event) => {
  const payload = event.data ?? {};
  const { id, action, source, stdin, args } = payload;
  try {
    if (action === 'stop') {
      globalThis.__litePlay = null;
      globalThis.__liteAudioDrain = null;
      return;
    }

    if (action === 'step' && globalThis.__litePlay) {
      const status = globalThis.__litePlay.update ? globalThis.__litePlay.update(Number(payload.dt ?? 0)) : 0;
      const frame = globalThis.__litePlay.frame();
      const tones = drainTones();
      self.postMessage({ id, ok: true, action: 'step', status, frame, tones });
      return;
    }

    if (action === 'keydown' && globalThis.__litePlay) {
      if (globalThis.__litePlay.keyDown) globalThis.__litePlay.keyDown(payload.key ?? '');
      const frame = globalThis.__litePlay.frame();
      const tones = drainTones();
      self.postMessage({ id, ok: true, action: 'keydown', frame, tones });
      return;
    }

    if (action === 'keyup' && globalThis.__litePlay) {
      if (globalThis.__litePlay.keyUp) globalThis.__litePlay.keyUp(payload.key ?? '');
      const frame = globalThis.__litePlay.frame();
      const tones = drainTones();
      self.postMessage({ id, ok: true, action: 'keyup', frame, tones });
      return;
    }

    if (action === 'pointermove' && globalThis.__litePlay) {
      if (globalThis.__litePlay.pointerMove) globalThis.__litePlay.pointerMove(payload.x ?? 0, payload.y ?? 0);
      const frame = globalThis.__litePlay.frame();
      const tones = drainTones();
      self.postMessage({ id, ok: true, action: 'pointermove', frame, tones });
      return;
    }

    if ((action === 'pointerdown' || action === 'pointerup') && globalThis.__litePlay) {
      const fn = action === 'pointerdown' ? globalThis.__litePlay.pointerDown : globalThis.__litePlay.pointerUp;
      if (fn) fn(payload.x ?? 0, payload.y ?? 0, payload.button ?? 0);
      const frame = globalThis.__litePlay.frame();
      const tones = drainTones();
      self.postMessage({ id, ok: true, action, frame, tones });
      return;
    }

    const stdlib = await loadStdlib();
    const readSource = makeReadSource(stdlib);

    if (action === 'compile-c') {
      const cSource = await loadCompilerSource('compiler-c.js');
      const cResult = compileWith(cSource, readSource, source);
      self.postMessage({
        id,
        ok: cResult.ok && Boolean(cResult.stdout),
        c: cResult.ok ? cResult.stdout : '',
        stderr: cResult.stderr,
      });
      return;
    }

    const tsCompilerSource = await loadCompilerSource('compiler.js');
    const compileResult = compileWith(tsCompilerSource, readSource, source);

    if (!compileResult.ok || !compileResult.stdout) {
      self.postMessage({
        id,
        ok: false,
        ts: '',
        c: '',
        cError: '',
        stdout: '',
        stderr: compileResult.stderr || 'Compilation failed.',
      });
      return;
    }

    const ts = compileResult.stdout;
    if (action === 'compile') {
      const cSource = await loadCompilerSource('compiler-c.js');
      const cResult = compileWith(cSource, readSource, source);
      self.postMessage({
        id,
        ok: true,
        ts,
        c: cResult.ok ? cResult.stdout : '',
        cError: cResult.ok ? '' : (cResult.stderr || 'C compilation failed.'),
        stdout: '',
        stderr: compileResult.stderr,
      });
      return;
    }

    globalThis.__litePlay = null;
    globalThis.__liteAudioDrain = null;
    const stripped = stripLiteTs(ts).replace(/export function main\\b/, 'function main');
    const js = attachPlayBridge(stripped);
    const runner = new Function('process', js + '\\nreturn main();');
    const userArgs = Array.isArray(args) ? args : [];
    const runResult = runWithProcessStub(
      ['node', 'playground.js', ...userArgs],
      stdin ?? '',
      (proc) => runner(proc),
    );
    const session = globalThis.__litePlay;
    const frame = session ? session.frame() : null;
    const hasCanvas = Boolean(frame && frame.width > 0 && frame.height > 0);
    const isInteractive = Boolean(session && (frame.playing || session.hasUpdate));
    const tones = drainTones();
    if (!isInteractive) {
      globalThis.__litePlay = null;
      globalThis.__liteAudioDrain = null;
    }
    self.postMessage({
      id,
      ok: runResult.ok,
      ts,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      tones,
      canvas: hasCanvas && !isInteractive ? frame : null,
      play: isInteractive ? {
        ...frame,
        status: session.initialStatus,
        hasUpdate: session.hasUpdate,
      } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, ok: false, action, ts: '', c: '', cError: '', stdout: '', stderr: message });
  }
};
`;
