/** Renders initial Play Canvas or Surface frames from compiled Lite TypeScript into inline preview SVGs. */
import { deflateSync } from 'node:zlib';
import { escapeHtml } from './highlight.ts';
import { stripLiteTs } from './strip-ts.ts';

function decodeArgb(packed: bigint): Readonly<{ fill: string; alphaAttr: string }> {
  const value = Number(packed & 0xffffffffn);
  const a = (value >>> 24) & 255;
  const r = (value >>> 16) & 255;
  const g = (value >>> 8) & 255;
  const b = value & 255;
  const fill = `rgb(${String(r)},${String(g)},${String(b)})`;
  const alphaAttr = a < 255 ? ` fill-opacity="${(a / 255).toFixed(3)}"` : '';
  return { fill, alphaAttr };
}

function renderOpsSvg(width: number, height: number, ops: readonly bigint[], title: string): string {
  if (width <= 0 || height <= 0) return '';
  let rects: string[] = [];
  let i = 0;
  while (i < ops.length) {
    const op = Number(ops[i]);
    if (op === 1 && i + 1 < ops.length) {
      const { fill, alphaAttr } = decodeArgb(ops[i + 1]!);
      rects = [`<rect width="${String(width)}" height="${String(height)}" fill="${fill}"${alphaAttr}/>`];
      i += 2;
    } else if (op === 2 && i + 5 < ops.length) {
      const x = Number(ops[i + 1]!);
      const y = Number(ops[i + 2]!);
      const w = Number(ops[i + 3]!);
      const h = Number(ops[i + 4]!);
      const { fill, alphaAttr } = decodeArgb(ops[i + 5]!);
      rects.push(`<rect x="${String(x)}" y="${String(y)}" width="${String(w)}" height="${String(h)}" fill="${fill}"${alphaAttr}/>`);
      i += 6;
    } else {
      break;
    }
  }
  return `<svg class="play-preview-svg" viewBox="0 0 ${String(width)} ${String(height)}" shape-rendering="crispEdges" role="img" aria-label="Initial frame preview for ${escapeHtml(title)}">${rects.join('')}</svg>`;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < 8 + data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ out[i]!) & 255]! ^ (crc >>> 8);
  }
  dv.setUint32(8 + data.length, (crc ^ 0xffffffff) >>> 0, false);
  return out;
}

function encodeRgbaPngBase64(width: number, height: number, pixels: Uint8Array): string {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width, false);
  dv.setUint32(4, height, false);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rowLen = 1 + width * 4;
  const raw = new Uint8Array(height * rowLen);
  for (let y = 0; y < height; y += 1) {
    raw[y * rowLen] = 0;
    const srcOff = y * width * 4;
    raw.set(pixels.subarray(srcOff, srcOff + width * 4), y * rowLen + 1);
  }
  const idat = new Uint8Array(deflateSync(raw));
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const c1 = pngChunk('IHDR', ihdr);
  const c2 = pngChunk('IDAT', idat);
  const c3 = pngChunk('IEND', new Uint8Array(0));
  const png = new Uint8Array(sig.length + c1.length + c2.length + c3.length);
  png.set(sig, 0);
  png.set(c1, sig.length);
  png.set(c2, sig.length + c1.length);
  png.set(c3, sig.length + c1.length + c2.length);
  return Buffer.from(png).toString('base64');
}

function captureSurfacePreview(generatedTs: string, title: string): string | undefined {
  let runnable = stripLiteTs(generatedTs).replace(/\bexport function main\b/, 'function main');
  runnable += '\nreturn main(() => {});';
  let captured: { width: number; height: number; pixels: Uint8Array } | null = null;
  const g = globalThis as unknown as { process: unknown; __liteSurfaceHost?: unknown };
  const prevProcess = g.process;
  const prevHost = g.__liteSurfaceHost;
  const stubProcess = {
    argv: ['node', 'preview.js'],
    env: {},
    exit: () => { throw new Error('unexpected exit'); },
    getBuiltinModule: () => ({ readSync: () => 0, writeSync: (_fd: number, text: string) => text.length }),
  };
  g.process = stubProcess;
  g.__liteSurfaceHost = {
    open(_id: number, _title: string, _w: number, _h: number, _state: unknown): void {},
    poll(_id: number, _state: unknown): void {},
    present(_id: number, state: { w: number; h: number; pixels: Uint8Array }): void {
      if (state.w > 0 && state.h > 0 && state.pixels) {
        captured = { width: state.w, height: state.h, pixels: new Uint8Array(state.pixels) };
      }
    },
    close(): void {},
    playTone(): void {},
    resize(_id: number, _w: number, _h: number, state: { w: number; h: number; pixels: Uint8Array }): void {
      if (state.w > 0 && state.h > 0 && state.pixels) {
        captured = { width: state.w, height: state.h, pixels: new Uint8Array(state.pixels) };
      }
    },
    run(
      _surf: unknown,
      state: { w: number; h: number; pixels: Uint8Array; open: boolean; pendingDeltaMs: number },
      onFrame: (inp: unknown) => boolean,
      api: { poll: () => unknown; present: () => void; close: () => void },
    ): boolean {
      state.pendingDeltaMs = 16;
      const keepGoing = Boolean(onFrame(api.poll()));
      if (keepGoing && state.open) {
        state.pendingDeltaMs = 16;
        onFrame(api.poll());
      }
      api.present();
      state.open = false;
      api.close();
      return true;
    },
  };
  try {
    (new Function('process', runnable) as (proc: unknown) => unknown)(stubProcess);
    if (!captured) return undefined;
    const cap = captured as { width: number; height: number; pixels: Uint8Array };
    const b64 = encodeRgbaPngBase64(cap.width, cap.height, cap.pixels);
    return `<div class="play-preview"><svg class="play-preview-svg" viewBox="0 0 ${String(cap.width)} ${String(cap.height)}" role="img" aria-label="Initial frame preview for ${escapeHtml(title)}"><image href="data:image/png;base64,${b64}" width="${String(cap.width)}" height="${String(cap.height)}"/></svg></div>`;
  } finally {
    g.__liteSurfaceHost = prevHost;
    g.process = prevProcess;
  }
}

/** Executes the static/init canvas setup of a compiled Lite program and returns an SVG preview if `gfx/canvas` or `gfx/surface` is present. */
export function captureCanvasPreview(generatedTs: string, title: string): string | undefined {
  const snapFn = generatedTs.match(/\bfunction (liteFn\$[a-zA-Z0-9_$]+\$litePlayCanvasSnapshot)\b/)?.[1];
  const opsFn = generatedTs.match(/\bfunction (liteFn\$[a-zA-Z0-9_$]+\$litePlayCanvasTakeOps)\b/)?.[1];
  if (snapFn === undefined || opsFn === undefined) {
    if (generatedTs.includes('lite$extraCanvasOpen') && generatedTs.includes('lite$extraCanvasRun')) {
      return captureSurfacePreview(generatedTs, title);
    }
    return undefined;
  }

  let runnable = stripLiteTs(generatedTs);
  const tailReturn = /return (?:lite\$out\.join\(""\)|"");\s*\}\s*$/;
  if (!tailReturn.test(runnable)) return undefined;
  runnable = runnable.replace(tailReturn, [
    'const __pick = (a, b) => (typeof a === "function" ? a : typeof b === "function" ? b : null);',
    'const __init = __pick(typeof liteFn_onCanvasInit !== "undefined" ? liteFn_onCanvasInit : undefined, typeof liteFn_canvas_onInit !== "undefined" ? liteFn_canvas_onInit : undefined);',
    'if (__init) __init();',
    `const __snap = ${snapFn}();`,
    `const __ops = ${opsFn}();`,
    'return { width: Number(__snap.width), height: Number(__snap.height), ops: __ops };',
    '}',
  ].join('\n'));
  runnable = runnable.replace(/\bexport function main\b/, 'function main') + '\nreturn main(() => {});';

  const prevProcess = (globalThis as unknown as { process: unknown }).process;
  const stubProcess = {
    argv: ['node', 'preview.js'],
    exit: () => { throw new Error('unexpected exit'); },
    getBuiltinModule: () => ({ readSync: () => 0, writeSync: (_fd: number, text: string) => text.length }),
  };
  try {
    (globalThis as unknown as { process: unknown }).process = stubProcess;
    const frame = (new Function('process', runnable) as (proc: unknown) => { width: number; height: number; ops: bigint[] })(stubProcess);
    const svg = renderOpsSvg(frame.width, frame.height, frame.ops, title);
    if (!svg) return undefined;
    return `<div class="play-preview">${svg}</div>`;
  } finally {
    (globalThis as unknown as { process: unknown }).process = prevProcess;
  }
}
