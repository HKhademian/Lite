/** Browser Web Worker script for compiling (TS & C) and running Lite programs in Playground. */

export const playgroundWorkerJs = `import { stripLiteTs } from './strip-ts.js';
import { appendPlayKeepalive, stripPlayKeepaliveTs } from './play-keepalive.js';

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
        .then((src) => src.replace(/\\nif\\s*\\(\\s*\\(?\\s*import\\.meta\\b[\\s\\S]*$/, '').replace(/export function main\\b/, 'function main') + '\\nreturn (w) => main(w);'),
    );
  }
  return compilerSourcePromises.get(file);
}

const encoder = new TextEncoder();

function buildPlaygroundVfs(stdlib, extraModules, sourceText) {
  const files = new Map();
  const dirs = new Set(['/project', '/project/lib', '/project/lib/core', '/project/lib/extra']);
  const addFile = (virtPath, text) => {
    const norm = virtPath.startsWith('/') ? virtPath : '/project/' + virtPath;
    files.set(norm, encoder.encode(text));
    const parts = norm.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i += 1) {
      dirs.add('/' + parts.slice(0, i).join('/'));
    }
  };
  for (const entry of Object.values(stdlib ?? {})) {
    if (entry && entry.path && typeof entry.text === 'string') addFile(entry.path, entry.text);
  }
  if (extraModules) {
    for (const [spec, entry] of Object.entries(extraModules)) {
      if (!entry || typeof entry.text !== 'string') continue;
      if (entry.path) addFile(entry.path, entry.text);
      if (spec.startsWith('./') || spec.startsWith('../')) {
        addFile('/project/' + spec.replace(/^\\.+\\/+/, '').replace(/(?:\\.lts)?$/, '.lts'), entry.text);
      } else if (!spec.startsWith('/')) {
        addFile('/project/lib/' + spec.replace(/(?:\\.lts)?$/, '.lts'), entry.text);
      }
    }
  }
  addFile('/project/playground.lts', sourceText ?? '');
  const normVirt = (p) => {
    const raw = String(p ?? '').startsWith('/') ? String(p) : '/project/' + String(p ?? '');
    const out = [];
    for (const seg of raw.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') out.pop();
      else out.push(seg);
    }
    return '/' + out.join('/');
  };
  return { files, dirs, normVirt };
}

function runWithProcessStub(argv, stdinText, fn, vfs) {
  const stdinBytes = encoder.encode(stdinText ?? '');
  let offset = 0;
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  const openFds = new Map();
  let nextFd = 10;

  const stubProcess = {
    argv,
    platform: 'linux',
    cwd() { return '/project'; },
    exit(code) {
      throw new ExitSignal(code);
    },
    getBuiltinModule(name) {
      if (name !== 'node:fs') throw new Error('Unsupported module: ' + name);
      return {
        statSync(p) {
          const k = vfs ? vfs.normVirt(p) : String(p);
          if (vfs && vfs.files.has(k)) return { isFile: () => true, isDirectory: () => false };
          if (vfs && vfs.dirs.has(k)) return { isFile: () => false, isDirectory: () => true };
          throw Object.assign(new Error('ENOENT: no such file or directory, stat \\'' + p + '\\''), { code: 'ENOENT' });
        },
        realpathSync(p) {
          const k = vfs ? vfs.normVirt(p) : String(p);
          if (vfs && (vfs.files.has(k) || vfs.dirs.has(k))) return k;
          throw Object.assign(new Error('ENOENT: no such file or directory, realpath \\'' + p + '\\''), { code: 'ENOENT' });
        },
        readFileSync(p) {
          const k = vfs ? vfs.normVirt(p) : String(p);
          if (vfs && vfs.files.has(k)) return vfs.files.get(k);
          throw Object.assign(new Error('ENOENT: no such file or directory, open \\'' + p + '\\''), { code: 'ENOENT' });
        },
        openSync(p) {
          const k = vfs ? vfs.normVirt(p) : String(p);
          if (!vfs || !vfs.files.has(k)) throw Object.assign(new Error('ENOENT: no such file or directory, open \\'' + p + '\\''), { code: 'ENOENT' });
          const fd = nextFd++;
          openFds.set(fd, { bytes: vfs.files.get(k), pos: 0 });
          return fd;
        },
        fstatSync(fd) {
          if (!openFds.has(fd)) throw new Error('EBADF');
          return { isFile: () => true, isDirectory: () => false };
        },
        closeSync(fd) {
          openFds.delete(fd);
        },
        readSync(fd, buf, bufOffset, length) {
          if (fd === 0) {
            if (offset >= stdinBytes.length) return 0;
            const n = Math.min(length, stdinBytes.length - offset);
            buf.set(stdinBytes.subarray(offset, offset + n), bufOffset);
            offset += n;
            return n;
          }
          const st = openFds.get(fd);
          if (!st || st.pos >= st.bytes.length) return 0;
          const n = Math.min(length, st.bytes.length - st.pos);
          buf.set(st.bytes.subarray(st.pos, st.pos + n), bufOffset);
          st.pos += n;
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

function normalizeOptLevel(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 1;
}

function compileWith(compilerSource, vfs, source, optLevel = 1) {
  const level = normalizeOptLevel(optLevel);
  return runWithProcessStub(
    ['node', '/project/compiler.js', '--stdin', '--name', 'playground.lts', '--root', '/project/playground.lts', '-O' + String(level)],
    source ?? '',
    (proc, write) => {
      const compileMain = new Function('process', compilerSource)(proc);
      return compileMain(write);
    },
    vfs,
  );
}

function compileTsForPlayground(compilerSource, stdlib, extraModules, source, optLevel = 1) {
  const withKeepalive = appendPlayKeepalive(source ?? '');
  if (withKeepalive !== null) {
    const keepaliveVfs = buildPlaygroundVfs(stdlib, extraModules, withKeepalive);
    const keepaliveResult = compileWith(compilerSource, keepaliveVfs, withKeepalive, optLevel);
    if (keepaliveResult.ok && keepaliveResult.stdout) {
      return {
        ...keepaliveResult,
        stdout: stripPlayKeepaliveTs(keepaliveResult.stdout),
      };
    }
  }
  const baseVfs = buildPlaygroundVfs(stdlib, extraModules, source);
  return compileWith(compilerSource, baseVfs, source, optLevel);
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
  const { id, action, source, stdin, args, extraModules, optLevel } = payload;
  const level = normalizeOptLevel(optLevel);
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

    if (action === 'compile-c') {
      const cSource = await loadCompilerSource('compiler-c.js');
      const vfs = buildPlaygroundVfs(stdlib, extraModules ?? null, source);
      const cResult = compileWith(cSource, vfs, source, level);
      self.postMessage({
        id,
        ok: cResult.ok && Boolean(cResult.stdout),
        c: cResult.ok ? cResult.stdout : '',
        stderr: cResult.stderr,
      });
      return;
    }

    const tsCompilerSource = await loadCompilerSource('compiler.js');
    const compileResult = compileTsForPlayground(tsCompilerSource, stdlib, extraModules ?? null, source, level);

    if (!compileResult.ok || !compileResult.stdout) {
      self.postMessage({
        id,
        ok: false,
        action,
        ts: '',
        c: '',
        cError: '',
        stdout: '',
        stderr: compileResult.stderr || 'Compilation failed.',
        ...(action === 'grade' ? { allPassed: false, results: [] } : {}),
      });
      return;
    }

    const ts = compileResult.stdout;
    if (action === 'compile') {
      const cSource = await loadCompilerSource('compiler-c.js');
      const vfs = buildPlaygroundVfs(stdlib, extraModules ?? null, source);
      const cResult = compileWith(cSource, vfs, source, level);
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

    if (action === 'grade') {
      const stripped = stripLiteTs(ts).replace(/export function main\\b/, 'function main');
      const runner = new Function('process', stripped + '\\nreturn main();');
      const rawCases = Array.isArray(payload.cases) ? payload.cases : [];
      const results = [];
      let allPassed = true;
      for (const tc of rawCases) {
        globalThis.__litePlay = null;
        globalThis.__liteAudioDrain = null;
        const caseArgs = Array.isArray(tc.args) ? tc.args : [];
        const expectedStdout = typeof tc.expectedStdout === 'string' ? tc.expectedStdout : '';
        const runResult = runWithProcessStub(
          ['node', 'gym.js', ...caseArgs],
          typeof tc.stdin === 'string' ? tc.stdin : '',
          (proc) => runner(proc),
        );
        const passed = Boolean(runResult.ok && runResult.exitCode === 0 && runResult.stdout === expectedStdout);
        if (!passed) allPassed = false;
        if (Boolean(tc.hidden)) {
          results.push({
            name: String(tc.name ?? 'hidden'),
            hidden: true,
            passed,
            exitCode: runResult.exitCode,
            stderr: runResult.stderr,
          });
        } else {
          results.push({
            name: String(tc.name ?? 'case'),
            hidden: false,
            passed,
            exitCode: runResult.exitCode,
            expectedStdout,
            actualStdout: runResult.stdout,
            stderr: runResult.stderr,
          });
        }
      }
      globalThis.__litePlay = null;
      globalThis.__liteAudioDrain = null;
      self.postMessage({
        id,
        ok: true,
        action: 'grade',
        allPassed,
        ts,
        stderr: compileResult.stderr,
        results,
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
