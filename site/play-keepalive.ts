/** Injects and strips synthetic Play keepalive calls so compiler DCE preserves host-invoked Play exports and callbacks. */

const KEEPALIVE_VAR = 'litePlayKeepalive99';
const KEEPALIVE_TS_VAR = `lite_${KEEPALIVE_VAR}`;

const CALLBACK_CALLS: Readonly<Record<string, string>> = {
  onCanvasInit: '()',
  canvas_onInit: '()',
  onCanvasUpdate: '(0.0)',
  canvas_onUpdate: '(0.0)',
  onCanvasKeyDown: '("")',
  canvas_onKeyDown: '("")',
  onCanvasKeyUp: '("")',
  canvas_onKeyUp: '("")',
  onCanvasPointerMove: '(0, 0)',
  canvas_onPointerMove: '(0, 0)',
  onCanvasPointerDown: '(0, 0, 0)',
  canvas_onPointerDown: '(0, 0, 0)',
  onCanvasPointerUp: '(0, 0, 0)',
  canvas_onPointerUp: '(0, 0, 0)',
};

function scanTopLevelSource(source: string): string {
  const out: string[] = [];
  let i = 0;
  let commentDepth = 0;
  let braceDepth = 0;

  while (i < source.length) {
    const ch = source[i]!;
    const next = source[i + 1] ?? '';

    if (commentDepth === 0 && ch === '/' && next === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      commentDepth += 1;
      i += 2;
      continue;
    }

    if (commentDepth > 0) {
      if (ch === '*' && next === '/') {
        commentDepth -= 1;
        i += 2;
      } else {
        if (ch === '\n') out.push('\n');
        i += 1;
      }
      continue;
    }

    if (ch === '"') {
      const start = i;
      i += 1;
      while (i < source.length) {
        if (source[i] === '\\') {
          i += 2;
          continue;
        }
        if (source[i] === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      const lit = source.slice(start, i);
      if (braceDepth === 0 && (lit === '"extra/canvas"' || lit === '"extra/audio"')) {
        out.push(lit);
      } else if (braceDepth === 0) {
        out.push('""');
      }
      continue;
    }

    if (ch === '{') {
      if (braceDepth === 0) out.push('}');
      braceDepth += 1;
      i += 1;
      continue;
    }

    if (ch === '}') {
      if (braceDepth > 0) braceDepth -= 1;
      i += 1;
      continue;
    }

    if (braceDepth === 0) {
      out.push(ch);
    }
    i += 1;
  }

  return out.join('');
}

function countBracesOutsideStrings(line: string): number {
  let delta = 0;
  let i = 0;
  while (i < line.length) {
    const ch = line[i]!;
    if (ch === '"' || ch === "'" || ch === '`') {
      i += 1;
      while (i < line.length) {
        if (line[i] === '\\') {
          i += 2;
          continue;
        }
        if (line[i] === ch) break;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (ch === '/' && line[i + 1] === '/') break;
    if (ch === '{') delta += 1;
    else if (ch === '}') delta -= 1;
    i += 1;
  }
  return delta;
}

/** Appends a false-guarded keepalive block when `source` imports `extra/canvas` or `extra/audio`. */
export function appendPlayKeepalive(source: string): string | null {
  const topLevel = scanTopLevelSource(source);
  const canvasMatch = /(?:^|[;\n}])\s*(?:pub\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*import\s+"extra\/canvas"/.exec(topLevel);
  const audioMatch = /(?:^|[;\n}])\s*(?:pub\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*import\s+"extra\/audio"/.exec(topLevel);

  const canvasAlias = canvasMatch?.[1];
  const audioAlias = audioMatch?.[1];
  if (canvasAlias === undefined && audioAlias === undefined) return null;

  const calls: string[] = [];
  if (canvasAlias !== undefined) {
    calls.push(
      `${canvasAlias}.litePlayCanvasSnapshot();`,
      `${canvasAlias}.litePlayCanvasPixels();`,
      `${canvasAlias}.litePlayCanvasTakeOps();`,
    );
  }
  if (audioAlias !== undefined) {
    calls.push(`${audioAlias}.litePlayAudioDrain();`);
  }

  const seenCallbacks = new Set<string>();
  const callbackRe =
    /(?:^|[;\n}])\s*(?:pub\s+)?(onCanvasInit|canvas_onInit|onCanvasUpdate|canvas_onUpdate|onCanvasKeyDown|canvas_onKeyDown|onCanvasKeyUp|canvas_onKeyUp|onCanvasPointerMove|canvas_onPointerMove|onCanvasPointerDown|canvas_onPointerDown|onCanvasPointerUp|canvas_onPointerUp)\s*:=\s*fn\b/g;
  for (let m = callbackRe.exec(topLevel); m !== null; m = callbackRe.exec(topLevel)) {
    const cbName = m[1]!;
    if (seenCallbacks.has(cbName)) continue;
    seenCallbacks.add(cbName);
    const argsText = CALLBACK_CALLS[cbName];
    if (argsText !== undefined) calls.push(`${cbName}${argsText};`);
  }

  const body = calls.map((line) => `    ${line}`).join('\n');
  return `${source}\nvar ${KEEPALIVE_VAR} := false;\nif ${KEEPALIVE_VAR} {\n${body}\n}\n`;
}

/** Strips the synthetic Play keepalive variable and branch from emitted TypeScript. */
export function stripPlayKeepaliveTs(ts: string): string {
  const lines = ts.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let skippingIfBlock = false;
  let braceDepth = 0;

  for (const line of lines) {
    if (skippingIfBlock) {
      braceDepth += countBracesOutsideStrings(line);
      if (braceDepth <= 0) {
        skippingIfBlock = false;
        braceDepth = 0;
      }
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith(`let ${KEEPALIVE_TS_VAR}`) || trimmed === `void ${KEEPALIVE_TS_VAR};`) {
      continue;
    }
    if (trimmed.startsWith(`if (${KEEPALIVE_TS_VAR})`) && trimmed.includes('{')) {
      braceDepth = countBracesOutsideStrings(line);
      if (braceDepth > 0) skippingIfBlock = true;
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}
