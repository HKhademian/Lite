/** Browser Web Worker script for compiling (TS & C) and running Lite programs in Playground. */

export const playgroundWorkerJs = `import { stripLiteTs } from './strip-ts.js';
import { appendPlayKeepalive, stripPlayKeepaliveTs } from './play-keepalive.js';

class ExitSignal {
  constructor(code) {
    this.code = code;
  }
}

class NeedStdinSignal {}

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
const decoder = new TextDecoder('utf-8', { fatal: false });

function parseDiagnostics(stderrText) {
  const out = [];
  for (const rawLine of String(stderrText ?? '').split(/\\r?\\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([^:\\s][^:]*):(\\d+):(\\d+):\\s*([^:]+):\\s*(.+)$/);
    if (m) {
      out.push({
        file: m[1],
        line: Number(m[2]),
        column: Number(m[3]),
        category: m[4].trim(),
        message: m[5].trim(),
        raw: line,
      });
    }
  }
  return out;
}

function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return typeof btoa === 'function' ? btoa(bin) : '';
}

function looksLikeText(bytes) {
  const limit = Math.min(bytes.length, 4096);
  for (let i = 0; i < limit; i += 1) {
    const b = bytes[i];
    if (b === 0) return false;
  }
  return true;
}

function buildPlaygroundVfs(stdlib, extraModules, sourceText) {
  const files = new Map();
  const dirs = new Set(['/project', '/project/lib', '/project/lib/core', '/project/lib/extra']);
  const writtenPaths = new Set();
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
  const ensureParents = (norm) => {
    const parts = norm.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i += 1) {
      dirs.add('/' + parts.slice(0, i).join('/'));
    }
  };
  const addFile = (virtPath, text) => {
    const norm = normVirt(virtPath);
    files.set(norm, encoder.encode(text));
    ensureParents(norm);
  };
  for (const entry of Object.values(stdlib ?? {})) {
    if (entry && entry.path && typeof entry.text === 'string') addFile(entry.path, entry.text);
  }
  if (extraModules) {
    for (const [spec, entry] of Object.entries(extraModules)) {
      if (!entry || typeof entry.text !== 'string') continue;
      if (entry.path) addFile(entry.path, entry.text);
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const cleanRel = spec.replace(/^\\.+\\/+/, '');
        addFile('/project/' + (cleanRel.endsWith('.lts') ? cleanRel : cleanRel.replace(/(?:\\.lt)?$/, '.lt')), entry.text);
      } else if (!spec.startsWith('/')) {
        addFile('/project/lib/' + (spec.endsWith('.lts') ? spec : spec.replace(/(?:\\.lt)?$/, '.lt')), entry.text);
      }
    }
  }
  addFile('/project/playground.lts', sourceText ?? '');
  return { files, dirs, writtenPaths, normVirt, ensureParents };
}

function collectWrittenFiles(vfs) {
  if (!vfs || !vfs.writtenPaths || vfs.writtenPaths.size === 0) return [];
  const out = [];
  for (const path of Array.from(vfs.writtenPaths).sort()) {
    const bytes = vfs.files.get(path);
    if (!bytes) continue;
    const isText = looksLikeText(bytes);
    const displayPath = path.startsWith('/project/') ? path.slice('/project/'.length) : path;
    out.push({
      path: displayPath,
      size: bytes.length,
      isText,
      textPreview: isText ? decoder.decode(bytes.subarray(0, 32768)) : undefined,
      bytesBase64: bytes.length <= 262144 ? bytesToBase64(bytes) : undefined,
    });
  }
  return out;
}

function runWithProcessStub(argv, stdinText, fn, vfs, opts = {}) {
  let stdinBytes = encoder.encode(stdinText ?? '');
  let offset = 0;
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let stdinClosed = Boolean(opts.stdinClosed);
  let neededStdin = false;
  const interactive = Boolean(opts.interactive);
  const sharedCtrl = opts.sharedCtrl ? new Int32Array(opts.sharedCtrl) : null;
  const sharedData = opts.sharedData ? new Uint8Array(opts.sharedData) : null;
  const onStdout = typeof opts.onStdout === 'function' ? opts.onStdout : null;
  const onStderr = typeof opts.onStderr === 'function' ? opts.onStderr : null;
  const onStdinWait = typeof opts.onStdinWait === 'function' ? opts.onStdinWait : null;
  const openFds = new Map();
  let nextFd = 10;
  let tempSeq = 1;

  const emitStdout = (chunk) => {
    if (!chunk || neededStdin) return;
    stdout += chunk;
    if (onStdout) onStdout(chunk);
  };
  const emitStderr = (chunk) => {
    if (!chunk || neededStdin) return;
    stderr += chunk;
    if (onStderr) onStderr(chunk);
  };

  const toBytes = (data, bufOffset, length) => {
    if (typeof data === 'string') return encoder.encode(data);
    if (data instanceof Uint8Array) {
      const start = typeof bufOffset === 'number' ? bufOffset : 0;
      const end = typeof length === 'number' ? start + length : data.length;
      return data.subarray(start, end);
    }
    return encoder.encode(String(data ?? ''));
  };

  const stubProcess = {
    argv,
    platform: 'linux',
    cwd() { return '/project'; },
    exit(code) {
      throw new ExitSignal(code);
    },
    getBuiltinModule(name) {
      if (name !== 'node:fs') throw new Error('Unsupported module: ' + name);
      const statEntry = (p) => {
        const k = vfs ? vfs.normVirt(p) : String(p);
        if (vfs && vfs.files.has(k)) return { isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false };
        if (vfs && vfs.dirs.has(k)) return { isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false };
        throw Object.assign(new Error('ENOENT: no such file or directory, stat \\'' + p + '\\''), { code: 'ENOENT' });
      };
      return {
        statSync: statEntry,
        lstatSync: statEntry,
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
        writeFileSync(p, data) {
          if (!vfs) throw new Error('VFS unavailable');
          const k = vfs.normVirt(p);
          const bytes = new Uint8Array(toBytes(data));
          vfs.files.set(k, bytes);
          vfs.ensureParents(k);
          vfs.writtenPaths.add(k);
        },
        mkdirSync(p, mkOpts) {
          if (!vfs) throw new Error('VFS unavailable');
          const k = vfs.normVirt(p);
          if (mkOpts && mkOpts.recursive) vfs.ensureParents(k + '/_');
          vfs.dirs.add(k);
        },
        readdirSync(p) {
          if (!vfs) return [];
          const k = vfs.normVirt(p);
          if (!vfs.dirs.has(k)) throw Object.assign(new Error('ENOENT: no such directory \\'' + p + '\\''), { code: 'ENOENT' });
          const prefix = k === '/' ? '/' : k + '/';
          const names = new Set();
          for (const fk of vfs.files.keys()) {
            if (fk.startsWith(prefix)) {
              const rest = fk.slice(prefix.length);
              if (rest && !rest.includes('/')) names.add(rest);
            }
          }
          for (const dk of vfs.dirs) {
            if (dk.startsWith(prefix)) {
              const rest = dk.slice(prefix.length);
              if (rest && !rest.includes('/')) names.add(rest);
            }
          }
          return Array.from(names).sort();
        },
        rmSync(p) {
          if (!vfs) return;
          const k = vfs.normVirt(p);
          vfs.files.delete(k);
          vfs.writtenPaths.delete(k);
          vfs.dirs.delete(k);
          const prefix = k + '/';
          for (const fk of Array.from(vfs.files.keys())) {
            if (fk.startsWith(prefix)) { vfs.files.delete(fk); vfs.writtenPaths.delete(fk); }
          }
          for (const dk of Array.from(vfs.dirs)) {
            if (dk.startsWith(prefix)) vfs.dirs.delete(dk);
          }
        },
        unlinkSync(p) {
          if (!vfs) return;
          const k = vfs.normVirt(p);
          vfs.files.delete(k);
          vfs.writtenPaths.delete(k);
        },
        copyFileSync(src, dst) {
          if (!vfs) throw new Error('VFS unavailable');
          const sk = vfs.normVirt(src);
          if (!vfs.files.has(sk)) throw Object.assign(new Error('ENOENT: ' + src), { code: 'ENOENT' });
          const dk = vfs.normVirt(dst);
          vfs.files.set(dk, new Uint8Array(vfs.files.get(sk)));
          vfs.ensureParents(dk);
          vfs.writtenPaths.add(dk);
        },
        mkdtempSync(prefix) {
          if (!vfs) throw new Error('VFS unavailable');
          const dir = vfs.normVirt(String(prefix ?? 'tmp-') + String(tempSeq++));
          vfs.ensureParents(dir + '/_');
          vfs.dirs.add(dir);
          return dir;
        },
        openSync(p, flags) {
          const k = vfs ? vfs.normVirt(p) : String(p);
          const mode = String(flags ?? 'r');
          if (mode.startsWith('w') || mode.startsWith('a')) {
            if (!vfs) throw new Error('VFS unavailable');
            const existing = mode.startsWith('a') && vfs.files.has(k) ? vfs.files.get(k) : new Uint8Array(0);
            vfs.ensureParents(k);
            const buf = new Uint8Array(existing);
            vfs.files.set(k, buf);
            vfs.writtenPaths.add(k);
            const fd = nextFd++;
            openFds.set(fd, { path: k, writable: true, chunks: buf.length ? [buf] : [], bytes: buf, pos: buf.length });
            return fd;
          }
          if (!vfs || !vfs.files.has(k)) throw Object.assign(new Error('ENOENT: no such file or directory, open \\'' + p + '\\''), { code: 'ENOENT' });
          const fd = nextFd++;
          openFds.set(fd, { path: k, writable: false, bytes: vfs.files.get(k), pos: 0 });
          return fd;
        },
        fstatSync(fd) {
          if (!openFds.has(fd)) throw new Error('EBADF');
          return { isFile: () => true, isDirectory: () => false };
        },
        closeSync(fd) {
          const st = openFds.get(fd);
          if (st && st.writable && vfs) {
            let total = 0;
            for (const c of st.chunks) total += c.length;
            const merged = new Uint8Array(total);
            let off = 0;
            for (const c of st.chunks) { merged.set(c, off); off += c.length; }
            vfs.files.set(st.path, merged);
            vfs.writtenPaths.add(st.path);
          }
          openFds.delete(fd);
        },
        readSync(fd, buf, bufOffset, length) {
          if (fd === 0) {
            if (offset < stdinBytes.length) {
              const n = Math.min(length, stdinBytes.length - offset);
              buf.set(stdinBytes.subarray(offset, offset + n), bufOffset);
              offset += n;
              return n;
            }
            if (stdinClosed || !interactive) return 0;
            if (sharedCtrl && sharedData) {
              if (onStdinWait) onStdinWait();
              Atomics.store(sharedCtrl, 0, 0);
              Atomics.wait(sharedCtrl, 0, 0);
              const state = Atomics.load(sharedCtrl, 0);
              if (state === 2) {
                stdinClosed = true;
                Atomics.store(sharedCtrl, 0, 0);
                return 0;
              }
              if (state === 3) {
                Atomics.store(sharedCtrl, 0, 0);
                throw new ExitSignal(130);
              }
              const len = Math.max(0, Math.min(sharedData.length, Atomics.load(sharedCtrl, 1)));
              stdinBytes = new Uint8Array(sharedData.subarray(0, len));
              offset = 0;
              Atomics.store(sharedCtrl, 0, 0);
              if (stdinBytes.length === 0) return 0;
              const n = Math.min(length, stdinBytes.length);
              buf.set(stdinBytes.subarray(0, n), bufOffset);
              offset = n;
              return n;
            }
            neededStdin = true;
            return 0;
          }
          const st = openFds.get(fd);
          if (!st || st.pos >= st.bytes.length) return 0;
          const n = Math.min(length, st.bytes.length - st.pos);
          buf.set(st.bytes.subarray(st.pos, st.pos + n), bufOffset);
          st.pos += n;
          return n;
        },
        writeSync(fd, data, bufOffset, length) {
          if (fd === 1) {
            const text = typeof data === 'string' ? data : decoder.decode(toBytes(data, bufOffset, length));
            emitStdout(text);
            return typeof data === 'string' ? data.length : toBytes(data, bufOffset, length).length;
          }
          if (fd === 2) {
            const text = typeof data === 'string' ? data : decoder.decode(toBytes(data, bufOffset, length));
            emitStderr(text);
            return typeof data === 'string' ? data.length : toBytes(data, bufOffset, length).length;
          }
          const st = openFds.get(fd);
          if (st && st.writable && vfs) {
            const chunk = new Uint8Array(toBytes(data, bufOffset, length));
            st.chunks.push(chunk);
            let total = 0;
            for (const c of st.chunks) total += c.length;
            const merged = new Uint8Array(total);
            let off = 0;
            for (const c of st.chunks) { merged.set(c, off); off += c.length; }
            vfs.files.set(st.path, merged);
            vfs.writtenPaths.add(st.path);
            return chunk.length;
          }
          return 0;
        },
      };
    },
  };

  const prevProcess = globalThis.process;
  globalThis.process = stubProcess;
  try {
    const ret = fn(stubProcess, (text) => { emitStdout(text); });
    if (ret) emitStdout(String(ret));
    if (neededStdin) {
      return { ok: true, exitCode: null, needsStdin: true, stdout, stderr, files: collectWrittenFiles(vfs) };
    }
    return { ok: true, exitCode, needsStdin: false, stdout, stderr, files: collectWrittenFiles(vfs) };
  } catch (err) {
    if (neededStdin || err instanceof NeedStdinSignal) {
      return { ok: true, exitCode: null, needsStdin: true, stdout, stderr, files: collectWrittenFiles(vfs) };
    }
    if (err instanceof ExitSignal) {
      return { ok: err.code === 0, exitCode: err.code, needsStdin: false, stdout, stderr, files: collectWrittenFiles(vfs) };
    }
    const message = err instanceof Error ? err.message : String(err);
    emitStderr(stderr ? '\\n' + message : message);
    return { ok: false, exitCode: 1, needsStdin: false, stdout, stderr, files: collectWrittenFiles(vfs) };
  } finally {
    globalThis.process = prevProcess;
  }
}

function normalizeOptLevel(raw) {
  if (raw === 's' || raw === 'S') return 4;
  if (raw === 'c' || raw === 'C') return 5;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 1;
}

function sanitizeCompilerFlags(rawFlags) {
  if (!Array.isArray(rawFlags)) return [];
  const out = [];
  for (let i = 0; i < rawFlags.length; i += 1) {
    const f = String(rawFlags[i] ?? '').trim();
    if (!f) continue;
    if (f === '--emit-format' || f === '--source-map') {
      const next = String(rawFlags[i + 1] ?? '').trim();
      if (next) {
        out.push(f, next);
        i += 1;
      }
      continue;
    }
    if (
      f.startsWith('--emit-format=') ||
      f.startsWith('--source-map=') ||
      /^-f(?:no-)?[a-z0-9-]+(?:=[0-9]+)?$/.test(f)
    ) {
      out.push(f);
    }
  }
  return out;
}

function compileWith(compilerSource, vfs, source, optLevel = 1, compilerFlags = []) {
  const level = normalizeOptLevel(optLevel);
  const optFlag = level === 4 ? '-Os' : level === 5 ? '-Oc' : '-O' + String(level);
  const extraFlags = sanitizeCompilerFlags(compilerFlags);
  return runWithProcessStub(
    ['node', '/project/compiler.js', '--stdin', '--name', 'playground.lts', '--root', '/project/playground.lts', optFlag, ...extraFlags],
    source ?? '',
    (proc, write) => {
      const compileMain = new Function('process', compilerSource)(proc);
      return compileMain(write);
    },
    vfs,
  );
}

function compileTsForPlayground(compilerSource, stdlib, extraModules, source, optLevel = 1, compilerFlags = []) {
  const withKeepalive = appendPlayKeepalive(source ?? '');
  if (withKeepalive !== null) {
    const keepaliveVfs = buildPlaygroundVfs(stdlib, extraModules, withKeepalive);
    const keepaliveResult = compileWith(compilerSource, keepaliveVfs, withKeepalive, optLevel, compilerFlags);
    if (keepaliveResult.ok && keepaliveResult.stdout) {
      return {
        ...keepaliveResult,
        stdout: stripPlayKeepaliveTs(keepaliveResult.stdout),
      };
    }
  }
  const baseVfs = buildPlaygroundVfs(stdlib, extraModules, source);
  return compileWith(compilerSource, baseVfs, source, optLevel, compilerFlags);
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
  const tailRetRe = /(return (?:lite\\$out\\.join\\(""\\)|"");)(\\s*\\}\\s*)$/;
  if (tailRetRe.test(js)) {
    return js.replace(tailRetRe, snippet + '\\n    $1$2');
  }
  return js.replace(/\\}\\s*$/, snippet + '\\n}');
}

function drainTones() {
  const playTones = globalThis.__liteAudioDrain ? globalThis.__liteAudioDrain() : [];
  const surfTones = globalThis.__liteSurfaceDrain ? globalThis.__liteSurfaceDrain() : [];
  if (playTones.length === 0) return surfTones;
  if (surfTones.length === 0) return playTones;
  return [...playTones, ...surfTones];
}

function createWorkerSurfaceHost() {
  let lastSurface = null;
  let pointerX = 0;
  let pointerY = 0;
  let pointerDown = false;
  let pendingKey = '';
  let pendingDeltaMs = -1;
  const tones = [];
  globalThis.__liteSurfaceDrain = () => {
    if (tones.length === 0) return [];
    const out = tones.slice();
    tones.length = 0;
    return out;
  };
  const host = {
    open(_id, title, width, height, state) {
      lastSurface = { title, width, height, state };
    },
    poll(_id, state) {
      state.pointerX = pointerX;
      state.pointerY = pointerY;
      state.pointerDown = pointerDown;
      if (pendingKey) {
        state.key = pendingKey;
        pendingKey = '';
      }
      if (pendingDeltaMs >= 0) {
        state.pendingDeltaMs = pendingDeltaMs;
        pendingDeltaMs = -1;
      }
    },
    present(_id, state) {
      if (lastSurface) {
        lastSurface.width = state.w;
        lastSurface.height = state.h;
        lastSurface.title = state.title;
      }
    },
    close(_id, state) {
      state.open = false;
    },
    playTone(_id, frequency, durationMs, volume) {
      if (
        Number.isFinite(frequency) && frequency >= 20 && frequency <= 20000 &&
        Number.isFinite(durationMs) && durationMs > 0 && durationMs <= 3000 &&
        Number.isFinite(volume) && volume > 0 && volume <= 100
      ) {
        tones.push(Number(frequency), Number(durationMs), Number(volume));
      }
    },
    resize(_id, width, height, state) {
      if (lastSurface) {
        lastSurface.width = width;
        lastSurface.height = height;
        lastSurface.title = state.title;
      }
    },
    run(_surface, state, onFrame, api) {
      let running = true;
      let closed = false;
      const closeSession = () => {
        running = false;
        if (!closed) {
          closed = true;
          state.open = false;
          api.close();
        }
      };
      pendingDeltaMs = 16;
      const keepGoing = Boolean(onFrame(api.poll()));
      if (keepGoing) {
        api.present();
      } else {
        closeSession();
      }
      globalThis.__litePlay = {
        hasUpdate: true,
        initialStatus: keepGoing ? 0 : 1,
        update(dt) {
          if (!running || !state.open) return 1;
          pendingDeltaMs = Math.max(0, Math.round(Number(dt ?? 0) * 1000));
          const ok = Boolean(onFrame(api.poll()));
          if (ok && state.open) {
            api.present();
            return 0;
          }
          closeSession();
          return 1;
        },
        keyDown(k) {
          if (!running || !state.open) return;
          pendingKey = String(k ?? '');
          pendingDeltaMs = 0;
          const ok = Boolean(onFrame(api.poll()));
          if (ok && state.open) {
            api.present();
          } else {
            closeSession();
          }
        },
        keyUp(_k) {},
        pointerMove(x, y) {
          pointerX = Number(x ?? 0);
          pointerY = Number(y ?? 0);
        },
        pointerDown(x, y, _b) {
          pointerX = Number(x ?? 0);
          pointerY = Number(y ?? 0);
          pointerDown = true;
        },
        pointerUp(x, y, _b) {
          pointerX = Number(x ?? 0);
          pointerY = Number(y ?? 0);
          pointerDown = false;
        },
        stop() {
          closeSession();
        },
        frame() {
          return {
            width: state.w,
            height: state.h,
            title: state.title,
            playing: running && state.open,
            rgba: new Uint8Array(state.pixels),
          };
        },
      };
      return true;
    },
  };
  return {
    host,
    staticFrame() {
      if (!lastSurface || !lastSurface.state) return null;
      const s = lastSurface.state;
      if (s.w < 1 || s.h < 1) return null;
      return {
        width: s.w,
        height: s.h,
        title: s.title,
        playing: false,
        rgba: new Uint8Array(s.pixels),
      };
    },
  };
}

self.onmessage = async (event) => {
  const payload = event.data ?? {};
  const { id, action, source, stdin, args, extraModules, optLevel, compilerFlags } = payload;
  const level = normalizeOptLevel(optLevel);
  const extraCompilerFlags = sanitizeCompilerFlags(compilerFlags);
  try {
    if (action === 'stop') {
      if (globalThis.__litePlay && typeof globalThis.__litePlay.stop === 'function') {
        globalThis.__litePlay.stop();
      }
      globalThis.__litePlay = null;
      globalThis.__liteSurfaceHost = null;
      globalThis.__liteSurfaceDrain = null;
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
      const t0 = performance.now();
      const cSource = await loadCompilerSource('compiler-c.js');
      const vfs = buildPlaygroundVfs(stdlib, extraModules ?? null, source);
      const cResult = compileWith(cSource, vfs, source, level, extraCompilerFlags);
      const compileMs = Math.round((performance.now() - t0) * 10) / 10;
      self.postMessage({
        id,
        ok: cResult.ok && Boolean(cResult.stdout),
        c: cResult.ok ? cResult.stdout : '',
        stderr: cResult.stderr,
        diagnostics: parseDiagnostics(cResult.stderr),
        timings: { compileMs },
      });
      return;
    }

    const compileStart = performance.now();
    const tsCompilerSource = await loadCompilerSource('compiler.js');
    const compileResult = compileTsForPlayground(tsCompilerSource, stdlib, extraModules ?? null, source, level, extraCompilerFlags);
    const compileMs = Math.round((performance.now() - compileStart) * 10) / 10;

    if (!compileResult.ok || !compileResult.stdout) {
      const stderrText = compileResult.stderr || 'Compilation failed.';
      self.postMessage({
        id,
        ok: false,
        action,
        ts: '',
        c: '',
        cError: '',
        stdout: '',
        stderr: stderrText,
        exitCode: 1,
        diagnostics: parseDiagnostics(stderrText),
        timings: { compileMs },
        ...(action === 'grade' ? { allPassed: false, results: [] } : {}),
      });
      return;
    }

    const ts = compileResult.stdout;
    if (action === 'compile') {
      const cSource = await loadCompilerSource('compiler-c.js');
      const vfs = buildPlaygroundVfs(stdlib, extraModules ?? null, source);
      const cResult = compileWith(cSource, vfs, source, level, extraCompilerFlags);
      const totalCompileMs = Math.round((performance.now() - compileStart) * 10) / 10;
      self.postMessage({
        id,
        ok: true,
        ts,
        c: cResult.ok ? cResult.stdout : '',
        cError: cResult.ok ? '' : (cResult.stderr || 'C compilation failed.'),
        stdout: '',
        stderr: compileResult.stderr,
        exitCode: 0,
        diagnostics: parseDiagnostics(compileResult.stderr),
        timings: { compileMs: totalCompileMs },
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
        globalThis.__liteSurfaceHost = null;
        globalThis.__liteSurfaceDrain = null;
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
      globalThis.__liteSurfaceHost = null;
      globalThis.__liteSurfaceDrain = null;
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

    if (globalThis.__litePlay && typeof globalThis.__litePlay.stop === 'function') {
      globalThis.__litePlay.stop();
    }
    globalThis.__litePlay = null;
    globalThis.__liteAudioDrain = null;
    const surfaceHost = createWorkerSurfaceHost();
    globalThis.__liteSurfaceHost = surfaceHost.host;
    const stripped = stripLiteTs(ts).replace(/export function main\\b/, 'function main');
    const js = attachPlayBridge(stripped);
    const runner = new Function('process', js + '\\nreturn main();');
    const userArgs = Array.isArray(args) ? args : [];
    const runVfs = buildPlaygroundVfs(stdlib, extraModules ?? null, source);
    const streamEnabled = Boolean(payload.streamOutput);
    const runStart = performance.now();
    const runResult = runWithProcessStub(
      ['node', 'playground.js', ...userArgs],
      stdin ?? '',
      (proc) => runner(proc),
      runVfs,
      {
        interactive: Boolean(payload.interactive),
        stdinClosed: Boolean(payload.stdinClosed),
        sharedCtrl: payload.sharedCtrl ?? null,
        sharedData: payload.sharedData ?? null,
        onStdout: streamEnabled ? (text) => { self.postMessage({ id, ok: true, stream: true, event: 'stdout', text }); } : null,
        onStderr: streamEnabled ? (text) => { self.postMessage({ id, ok: true, stream: true, event: 'stderr', text }); } : null,
        onStdinWait: streamEnabled ? () => { self.postMessage({ id, ok: true, stream: true, event: 'stdin-wait' }); } : null,
      },
    );
    const runMs = Math.round((performance.now() - runStart) * 10) / 10;
    const session = globalThis.__litePlay;
    const frame = session ? session.frame() : surfaceHost.staticFrame();
    const hasCanvas = Boolean(frame && frame.width > 0 && frame.height > 0);
    const isInteractive = Boolean(session && (frame.playing || session.hasUpdate));
    const tones = drainTones();
    if (!isInteractive) {
      globalThis.__litePlay = null;
      globalThis.__liteSurfaceHost = null;
      globalThis.__liteSurfaceDrain = null;
      globalThis.__liteAudioDrain = null;
    }
    const combinedStderr = [compileResult.stderr, runResult.stderr].filter(Boolean).join('\\n');
    self.postMessage({
      id,
      ok: runResult.ok,
      ts,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      exitCode: runResult.exitCode,
      needsStdin: Boolean(runResult.needsStdin),
      files: runResult.files ?? [],
      diagnostics: parseDiagnostics(combinedStderr),
      timings: { compileMs, runMs },
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

/** Service Worker injecting COOP/COEP headers on `/playground/` so `SharedArrayBuffer` blocking stdin works on static hosts. */
export const coiServiceWorkerJs = `self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
  event.respondWith(
    fetch(req).then((response) => {
      if (response.status === 0) return response;
      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Resource-Policy', 'same-origin');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }),
  );
});
`;
