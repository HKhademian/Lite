/** Renders initial Play Canvas frames from compiled Lite TypeScript into inline preview SVGs. */
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

/** Executes the static/init canvas setup of a compiled Lite program and returns an SVG preview if `extra/canvas` is present. */
export function captureCanvasPreview(generatedTs: string, title: string): string | undefined {
  const snapFn = generatedTs.match(/\bfunction (liteFn\$[a-zA-Z0-9_$]+\$litePlayCanvasSnapshot)\b/)?.[1];
  const opsFn = generatedTs.match(/\bfunction (liteFn\$[a-zA-Z0-9_$]+\$litePlayCanvasTakeOps)\b/)?.[1];
  if (snapFn === undefined || opsFn === undefined) return undefined;

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
