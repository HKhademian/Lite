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
    if (spec.startsWith('./') && importer.startsWith('lib/core/')) {
      const name = 'core/' + spec.slice(2).replace(/\\.lts$/, '');
      if (Object.prototype.hasOwnProperty.call(stdlib, name)) return stdlib[name];
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

self.onmessage = async (event) => {
  const { id, action, source, stdin, args } = event.data;
  try {
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

    const js = stripLiteTs(ts).replace(/export function main\\b/, 'function main');
    const runner = new Function('process', js + '\\nreturn main();');
    const userArgs = Array.isArray(args) ? args : [];
    const runResult = runWithProcessStub(
      ['node', 'playground.js', ...userArgs],
      stdin ?? '',
      (proc) => runner(proc),
    );
    self.postMessage({
      id,
      ok: runResult.ok,
      ts,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, ok: false, ts: '', c: '', cError: '', stdout: '', stderr: message });
  }
};
`;
