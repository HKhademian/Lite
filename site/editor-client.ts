/** Shared browser-side controller for Lite code editors, line-number gutters, split panes, and shareable URLs. */

export interface EditorScrollLike {
  scrollTop: number;
  scrollLeft: number;
}

export interface EditorCodeLike {
  innerHTML: string;
  parentElement: EditorScrollLike | null;
}

export interface EditorGutterLike {
  innerHTML: string;
  scrollTop: number;
}

export interface EditorTextSinkLike {
  textContent: string | null;
}

export interface EditorKeyEventLike {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  preventDefault: () => void;
}

export interface EditorTextareaLike {
  value: string;
  scrollTop: number;
  scrollLeft: number;
  selectionStart: number;
  selectionEnd: number;
  setRangeText: (replacement: string, start: number, end: number, selectionMode?: 'preserve' | 'select' | 'start' | 'end') => void;
  addEventListener: (type: string, handler: (event: unknown) => void) => void;
}

export interface BindLiteEditorOptions {
  editor: EditorTextareaLike;
  preCode: EditorCodeLike;
  highlight: (source: string) => string;
  indent?: string;
  gutter?: EditorGutterLike | null;
  cursorEl?: EditorTextSinkLike | null;
  autoIndent?: boolean;
  onInput?: (source: string, fromTab: boolean) => void;
  onRun?: () => void;
  onShiftRun?: () => void;
}

export interface BoundLiteEditor {
  sync: () => void;
  setValue: (source: string) => void;
  setErrorLines: (lines: readonly number[]) => void;
  setErrorFromStderr: (stderr: string) => void;
  clearErrors: () => void;
}

export interface CodeModeButtonLike {
  dataset: { mode?: string };
  setAttribute: (name: string, value: string) => void;
  addEventListener: (type: string, handler: () => void) => void;
}

export interface BindCodeModeButtonsOptions {
  buttons: Iterable<CodeModeButtonLike>;
  onChange: (mode: string) => void;
}

export interface SharePayload {
  title?: string;
  code: string;
  stdin?: string;
  args?: string;
}

const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const MAX_SHARE_BYTES = 32 * 1024;

function encodeBase64UrlBytes(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const hasB1 = i + 1 < bytes.length;
    const hasB2 = i + 2 < bytes.length;
    const b1 = hasB1 ? (bytes[i + 1] ?? 0) : 0;
    const b2 = hasB2 ? (bytes[i + 2] ?? 0) : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    parts.push(
      BASE64URL_ALPHABET[(triple >>> 18) & 63] ?? 'A',
      BASE64URL_ALPHABET[(triple >>> 12) & 63] ?? 'A',
      hasB1 ? (BASE64URL_ALPHABET[(triple >>> 6) & 63] ?? 'A') : '',
      hasB2 ? (BASE64URL_ALPHABET[triple & 63] ?? 'A') : '',
    );
  }
  return parts.join('');
}

function decodeBase64UrlBytes(raw: string): Uint8Array | null {
  const clean = raw.replace(/\s+/g, '').replace(/=+$/, '');
  if (clean.length === 0 || clean.length % 4 === 1) return null;
  const outLen = Math.floor((clean.length * 3) / 4);
  if (outLen > MAX_SHARE_BYTES) return null;
  const out = new Uint8Array(outLen);
  let outPos = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = BASE64URL_ALPHABET.indexOf(clean[i] ?? '');
    const c1 = BASE64URL_ALPHABET.indexOf(clean[i + 1] ?? '');
    const ch2 = clean[i + 2];
    const ch3 = clean[i + 3];
    const c2 = ch2 === undefined ? 0 : BASE64URL_ALPHABET.indexOf(ch2);
    const c3 = ch3 === undefined ? 0 : BASE64URL_ALPHABET.indexOf(ch3);
    if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) return null;
    const triple = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (outPos < outLen) out[outPos++] = (triple >>> 16) & 255;
    if (ch2 !== undefined && outPos < outLen) out[outPos++] = (triple >>> 8) & 255;
    if (ch3 !== undefined && outPos < outLen) out[outPos++] = triple & 255;
  }
  return out;
}

/** Encodes a Lite sketch payload as a compact URL-safe base64url fragment token. */
export function encodeSharePayload(payload: Readonly<SharePayload>): string {
  const compact: Record<string, string> = { code: payload.code };
  if (payload.title) compact['title'] = payload.title;
  if (payload.stdin) compact['stdin'] = payload.stdin;
  if (payload.args) compact['args'] = payload.args;
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  return encodeBase64UrlBytes(bytes);
}

/** Decodes a URL-safe base64url `#code=` payload back into a validated sketch draft, or null if malformed. */
export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const bytes = decodeBase64UrlBytes(encoded);
    if (!bytes) return null;
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const rec = parsed as Record<string, unknown>;
    if (typeof rec['code'] !== 'string') return null;
    return {
      code: rec['code'],
      ...(typeof rec['title'] === 'string' && rec['title'].trim() !== '' ? { title: rec['title'] } : {}),
      ...(typeof rec['stdin'] === 'string' ? { stdin: rec['stdin'] } : {}),
      ...(typeof rec['args'] === 'string' ? { args: rec['args'] } : {}),
    };
  } catch {
    return null;
  }
}

/** Extracts unique sorted 1-based line numbers from Lite compiler diagnostics. */
export function parseErrorLines(stderr: string): number[] {
  if (!stderr) return [];
  const found = new Set<number>();
  const locRe = /(?:^|[\s(])[^\s:()]+:(\d+):(\d+):/gm;
  for (let m = locRe.exec(stderr); m !== null; m = locRe.exec(stderr)) {
    const line = Number(m[1]);
    if (Number.isInteger(line) && line >= 1) found.add(line);
  }
  if (found.size === 0) {
    const wordRe = /\bline\s+(\d+)\b/gi;
    for (let m = wordRe.exec(stderr); m !== null; m = wordRe.exec(stderr)) {
      const line = Number(m[1]);
      if (Number.isInteger(line) && line >= 1) found.add(line);
    }
  }
  return Array.from(found).sort((a, b) => a - b);
}

/** Renders line-number gutter spans with optional active-line and compile-error highlights. */
export function renderLineNumbersHtml(
  lineCount: number,
  errorLines: readonly number[] = [],
  activeLine = 0,
): string {
  const total = Math.max(1, lineCount);
  const errSet = new Set(errorLines);
  const parts: string[] = [];
  for (let i = 1; i <= total; i += 1) {
    let cls = 'ed-ln';
    if (i === activeLine) cls += ' is-active';
    if (errSet.has(i)) cls += ' is-error';
    parts.push(`<span class="${cls}">${String(i)}</span>`);
  }
  return parts.join('');
}

/** Computes 1-based line and column for a cursor offset inside source text. */
export function computeCursorLineCol(value: string, selectionStart: number): Readonly<{ line: number; col: number }> {
  const clamped = Math.max(0, Math.min(value.length, Number.isFinite(selectionStart) ? selectionStart : 0));
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < clamped; i += 1) {
    if (value.charCodeAt(i) === 10) {
      line += 1;
      lastNl = i;
    }
  }
  return { line, col: clamped - lastNl };
}

/** Computes smart newline indentation, opening braces cleanly across lines when cursor sits between `{` and `}`. */
export function computeAutoIndent(
  value: string,
  cursor: number,
  indent: string,
): Readonly<{ text: string; cursorOffset: number }> {
  const pos = Math.max(0, Math.min(value.length, cursor));
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
  let baseIndentEnd = lineStart;
  while (baseIndentEnd < pos) {
    const ch = value[baseIndentEnd];
    if (ch !== ' ' && ch !== '\t') break;
    baseIndentEnd += 1;
  }
  const baseIndent = value.slice(lineStart, baseIndentEnd);

  let prevIdx = pos - 1;
  while (prevIdx >= lineStart && (value[prevIdx] === ' ' || value[prevIdx] === '\t')) {
    prevIdx -= 1;
  }
  const prevChar = prevIdx >= lineStart ? value[prevIdx] : '';

  let nextIdx = pos;
  while (nextIdx < value.length && (value[nextIdx] === ' ' || value[nextIdx] === '\t')) {
    nextIdx += 1;
  }
  const nextChar = nextIdx < value.length ? value[nextIdx] : '';

  if (prevChar === '{' && nextChar === '}') {
    const lineText = `\n${baseIndent}${indent}`;
    return {
      text: `${lineText}\n${baseIndent}`,
      cursorOffset: lineText.length,
    };
  }
  if (prevChar === '{' || prevChar === '(' || prevChar === '[') {
    const text = `\n${baseIndent}${indent}`;
    return { text, cursorOffset: text.length };
  }
  const text = `\n${baseIndent}`;
  return { text, cursorOffset: text.length };
}

/** Unindents the selected lines by up to `indent.length` leading spaces (or one tab), returning null when unchanged. */
export function computeOutdent(
  value: string,
  selStart: number,
  selEnd: number,
  indent: string,
): Readonly<{ value: string; selectionStart: number; selectionEnd: number }> | null {
  const start = Math.max(0, Math.min(value.length, selStart));
  const end = Math.max(start, Math.min(value.length, selEnd));
  const blockStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nlAfter = value.indexOf('\n', end);
  const blockEnd = nlAfter === -1 ? value.length : nlAfter;

  const slice = value.slice(blockStart, blockEnd);
  const lines = slice.split('\n');
  let totalRemoved = 0;
  let firstRemoved = 0;

  const updated = lines.map((line, idx) => {
    let removed = 0;
    if (line.startsWith(indent)) {
      removed = indent.length;
    } else if (line.startsWith('\t')) {
      removed = 1;
    } else {
      while (removed < indent.length && removed < line.length && line[removed] === ' ') {
        removed += 1;
      }
    }
    if (idx === 0) firstRemoved = removed;
    totalRemoved += removed;
    return line.slice(removed);
  });

  if (totalRemoved === 0) return null;
  const nextValue = value.slice(0, blockStart) + updated.join('\n') + value.slice(blockEnd);
  const nextStart = Math.max(blockStart, start - firstRemoved);
  const nextEnd = Math.max(nextStart, end - totalRemoved);
  return { value: nextValue, selectionStart: nextStart, selectionEnd: nextEnd };
}

/** Wires syntax highlighting, line numbers, scroll lock, Tab/Shift+Tab, smart Enter, error lines, and run shortcuts. */
export function bindLiteEditor(options: BindLiteEditorOptions): BoundLiteEditor {
  const { editor, preCode, highlight, gutter, cursorEl, onInput, onRun, onShiftRun } = options;
  const indent = options.indent ?? '    ';
  const autoIndent = options.autoIndent ?? true;
  let errorLines: number[] = [];

  const syncScroll = (): void => {
    const pre = preCode.parentElement;
    if (pre) {
      pre.scrollTop = editor.scrollTop;
      pre.scrollLeft = editor.scrollLeft;
    }
    if (gutter) {
      gutter.scrollTop = editor.scrollTop;
    }
  };

  const syncGutterAndCursor = (): void => {
    const cursor = computeCursorLineCol(editor.value, editor.selectionStart);
    if (gutter) {
      const lineCount = editor.value.split('\n').length;
      gutter.innerHTML = renderLineNumbersHtml(lineCount, errorLines, cursor.line);
      gutter.scrollTop = editor.scrollTop;
    }
    if (cursorEl) {
      cursorEl.textContent = `Ln ${String(cursor.line)}, Col ${String(cursor.col)}`;
    }
  };

  const sync = (): void => {
    preCode.innerHTML = highlight(editor.value) + '\n';
    syncScroll();
    syncGutterAndCursor();
  };

  editor.addEventListener('input', () => {
    errorLines = [];
    sync();
    if (onInput) onInput(editor.value, false);
  });

  editor.addEventListener('scroll', syncScroll);
  editor.addEventListener('keyup', syncGutterAndCursor);
  editor.addEventListener('click', syncGutterAndCursor);

  editor.addEventListener('keydown', (rawEvent: unknown) => {
    const event = rawEvent as EditorKeyEventLike;
    if (event.key === 'Tab' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      if (event.shiftKey) {
        const outdented = computeOutdent(editor.value, editor.selectionStart, editor.selectionEnd, indent);
        if (outdented) {
          editor.value = outdented.value;
          editor.selectionStart = outdented.selectionStart;
          editor.selectionEnd = outdented.selectionEnd;
          errorLines = [];
          sync();
          if (onInput) onInput(editor.value, true);
        }
        return;
      }
      editor.setRangeText(indent, editor.selectionStart, editor.selectionEnd, 'end');
      errorLines = [];
      sync();
      if (onInput) onInput(editor.value, true);
      return;
    }
    if (
      autoIndent &&
      event.key === 'Enter' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      const start = editor.selectionStart;
      const ins = computeAutoIndent(editor.value, start, indent);
      if (ins.text.length > 1) {
        event.preventDefault();
        editor.setRangeText(ins.text, start, editor.selectionEnd, 'end');
        editor.selectionStart = start + ins.cursorOffset;
        editor.selectionEnd = start + ins.cursorOffset;
        errorLines = [];
        sync();
        if (onInput) onInput(editor.value, false);
        return;
      }
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      if (event.shiftKey && onShiftRun) {
        event.preventDefault();
        onShiftRun();
      } else if (onRun) {
        event.preventDefault();
        onRun();
      }
    }
  });

  syncGutterAndCursor();

  return {
    sync,
    setValue(source: string): void {
      editor.value = source;
      errorLines = [];
      sync();
    },
    setErrorLines(lines: readonly number[]): void {
      errorLines = Array.from(new Set(lines.filter((n) => Number.isInteger(n) && n >= 1))).sort((a, b) => a - b);
      syncGutterAndCursor();
    },
    setErrorFromStderr(stderr: string): void {
      errorLines = parseErrorLines(stderr);
      syncGutterAndCursor();
    },
    clearErrors(): void {
      if (errorLines.length === 0) return;
      errorLines = [];
      syncGutterAndCursor();
    },
  };
}

/** Wires Program / Portable / Full segmented toggle buttons and syncs `aria-pressed`. */
export function bindCodeModeButtons(options: BindCodeModeButtonsOptions): void {
  const buttons = Array.from(options.buttons);
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode || 'program';
      for (const other of buttons) {
        other.setAttribute('aria-pressed', other === btn ? 'true' : 'false');
      }
      options.onChange(mode);
    });
  }
}

export interface SplitContainerLike {
  style: { setProperty: (name: string, value: string) => void };
  getBoundingClientRect: () => { left: number; width: number };
}

export interface SplitHandleLike {
  classList: { add: (name: string) => void; remove: (name: string) => void };
  setAttribute: (name: string, value: string) => void;
  setPointerCapture?: (pointerId: number) => void;
  hasPointerCapture?: (pointerId: number) => boolean;
  releasePointerCapture?: (pointerId: number) => void;
  addEventListener: (type: string, handler: (event: unknown) => void) => void;
}

export interface SplitPointerEventLike {
  pointerId: number;
  button?: number;
  pointerType?: string;
  clientX: number;
  preventDefault: () => void;
}

export interface SplitStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface BindSplitPaneOptions {
  splitEl: SplitHandleLike | null;
  containerEl: SplitContainerLike | null;
  cssVar?: string;
  storageKey?: string;
  storage?: SplitStorageLike | null;
  bodyClassList?: { add: (name: string) => void; remove: (name: string) => void } | null;
  defaultPct?: number;
  minPct?: number;
  maxPct?: number;
}

/** Wires accessible pointer + keyboard resizable split panes with optional localStorage persistence. */
export function bindSplitPane(options: BindSplitPaneOptions): Readonly<{ setPct: (pct: number, save?: boolean) => void }> {
  const {
    splitEl,
    containerEl,
    cssVar = '--pg-split',
    storageKey,
    storage,
    bodyClassList,
    defaultPct = 50,
    minPct = 22,
    maxPct = 78,
  } = options;

  let splitPct = defaultPct;

  const applySplit = (pct: number, save = false): void => {
    const clamped = Math.max(minPct, Math.min(maxPct, Math.round(pct * 10) / 10));
    splitPct = clamped;
    containerEl?.style.setProperty(cssVar, `${String(clamped)}%`);
    splitEl?.setAttribute('aria-valuenow', String(Math.round(clamped)));
    if (save && storageKey && storage) {
      try {
        storage.setItem(storageKey, String(clamped));
      } catch {
        // Ignore storage restrictions
      }
    }
  };

  if (storageKey && storage) {
    try {
      const saved = Number(storage.getItem(storageKey));
      if (Number.isFinite(saved) && saved >= minPct && saved <= maxPct) {
        applySplit(saved, false);
      }
    } catch {
      // Ignore storage errors
    }
  }

  if (splitEl && containerEl) {
    let dragPointerId: number | null = null;
    splitEl.addEventListener('pointerdown', (raw) => {
      const ev = raw as SplitPointerEventLike;
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      ev.preventDefault();
      dragPointerId = ev.pointerId;
      splitEl.setPointerCapture?.(ev.pointerId);
      splitEl.classList.add('dragging');
      bodyClassList?.add('pg-resizing');
    });
    splitEl.addEventListener('pointermove', (raw) => {
      const ev = raw as SplitPointerEventLike;
      if (dragPointerId !== ev.pointerId) return;
      const rect = containerEl.getBoundingClientRect();
      if (!rect.width) return;
      applySplit(((ev.clientX - rect.left) / rect.width) * 100, false);
    });
    const stopDrag = (raw: unknown): void => {
      const ev = raw as SplitPointerEventLike;
      if (dragPointerId !== ev.pointerId) return;
      dragPointerId = null;
      if (splitEl.hasPointerCapture?.(ev.pointerId)) {
        splitEl.releasePointerCapture?.(ev.pointerId);
      }
      splitEl.classList.remove('dragging');
      bodyClassList?.remove('pg-resizing');
      applySplit(splitPct, true);
    };
    splitEl.addEventListener('pointerup', stopDrag);
    splitEl.addEventListener('pointercancel', stopDrag);
    splitEl.addEventListener('dblclick', () => {
      applySplit(defaultPct, true);
    });
    splitEl.addEventListener('keydown', (raw) => {
      const ev = raw as EditorKeyEventLike;
      const step = ev.shiftKey ? 5 : 2;
      if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        applySplit(splitPct - step, true);
      } else if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        applySplit(splitPct + step, true);
      } else if (ev.key === 'Home') {
        ev.preventDefault();
        applySplit(minPct, true);
      } else if (ev.key === 'End') {
        ev.preventDefault();
        applySplit(maxPct, true);
      } else if (ev.key === '0') {
        ev.preventDefault();
        applySplit(defaultPct, true);
      }
    });
  }

  return { setPct: applySplit };
}
