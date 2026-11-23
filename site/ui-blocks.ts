/** Shared HTML builders for interactive code editors, split handles, and inspector toolbars. */

import { renderLineNumbersHtml } from './editor-client.ts';
import { escapeHtml } from './highlight.ts';

export interface CodeEditorBlockOptions {
  textareaId: string;
  ariaLabel: string;
  preId?: string;
  preCodeId?: string;
  gutterId?: string;
  showLineNumbers?: boolean;
  minHeight?: string;
  initialSource?: string;
  initialHtml?: string;
}

export interface CodeModeBarOptions {
  id: string;
  buttonIdPrefix?: string;
  ariaLabel?: string;
}

export interface SplitHandleOptions {
  id: string;
  ariaLabel: string;
  initialPct?: number;
  title?: string;
}

const CODE_MODES: readonly Readonly<{ mode: string; label: string }>[] = [
  { mode: 'program', label: 'Program' },
  { mode: 'portable', label: 'Portable' },
  { mode: 'full', label: 'Full' },
];

/** Renders the synchronized line-number gutter, syntax-highlighted backdrop, and editable `.pg-editor-input` textarea. */
export function renderCodeEditorBlock(options: Readonly<CodeEditorBlockOptions>): string {
  const wrapStyle = options.minHeight ? ` style="min-height: ${escapeHtml(options.minHeight)};"` : '';
  const preIdAttr = options.preId ? ` id="${escapeHtml(options.preId)}"` : '';
  const preCodeIdAttr = options.preCodeId ? ` id="${escapeHtml(options.preCodeId)}"` : '';
  const gutterIdAttr = options.gutterId ? ` id="${escapeHtml(options.gutterId)}"` : '';
  const initialHtml = options.initialHtml ?? '';
  const initialSource = options.initialSource ?? '';
  const initialEscaped = options.initialSource !== undefined ? escapeHtml(options.initialSource) : '';
  const showLines = options.showLineNumbers ?? true;
  const lineCount = initialSource === '' ? 1 : initialSource.split('\n').length;
  const gutterHtml = showLines
    ? `  <div${gutterIdAttr} class="pg-editor-gutter" aria-hidden="true">${renderLineNumbersHtml(lineCount, [], 1)}</div>`
    : '';

  return [
    `<div class="pg-editor-wrap"${wrapStyle}>`,
    ...(gutterHtml ? [gutterHtml] : []),
    `  <div class="pg-editor-body">`,
    `    <pre${preIdAttr} class="pg-editor-pre" aria-hidden="true"><code${preCodeIdAttr}>${initialHtml}</code></pre>`,
    `    <textarea id="${escapeHtml(options.textareaId)}" class="pg-editor-input" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="${escapeHtml(options.ariaLabel)}">${initialEscaped}</textarea>`,
    `  </div>`,
    `</div>`,
  ].join('\n');
}

/** Renders a keyboard- and pointer-accessible vertical resize handle between two workbench panes. */
export function renderSplitHandle(options: Readonly<SplitHandleOptions>): string {
  const pct = Math.round(options.initialPct ?? 50);
  const title = options.title ?? 'Drag to resize panes (double-click to reset 50/50)';
  return `<div id="${escapeHtml(options.id)}" class="pg-split" role="separator" aria-orientation="vertical" aria-label="${escapeHtml(options.ariaLabel)}" aria-valuemin="22" aria-valuemax="78" aria-valuenow="${String(pct)}" tabindex="0" title="${escapeHtml(title)}"></div>`;
}

export interface GeneratedTargetOption {
  id: string;
  label: string;
  title?: string;
}

export interface GeneratedToolbarOptions extends CodeModeBarOptions {
  targets?: readonly Readonly<GeneratedTargetOption>[];
}

const DEFAULT_GENERATED_TARGETS: readonly Readonly<GeneratedTargetOption>[] = [
  { id: 'ts', label: 'TS', title: 'Generated TypeScript' },
  { id: 'c', label: 'C', title: 'Generated C' },
];

/** Renders the Program / Portable / Full toggle bar shared by Play, Learn, and Gym. */
export function renderCodeModeBar(options: Readonly<CodeModeBarOptions>): string {
  const roleAttrs = options.ariaLabel
    ? ` role="group" aria-label="${escapeHtml(options.ariaLabel)}"`
    : '';
  const buttons = CODE_MODES.map((entry, idx) => {
    const idAttr = options.buttonIdPrefix ? ` id="${escapeHtml(options.buttonIdPrefix + entry.mode)}"` : '';
    const pressed = idx === 0 ? 'true' : 'false';
    return `<button${idAttr} class="code-mode-btn" type="button" data-mode="${entry.mode}" aria-pressed="${pressed}">${entry.label}</button>`;
  }).join('\n      ');

  return [
    `<div id="${escapeHtml(options.id)}" class="code-modes"${roleAttrs} hidden>`,
    `  ${buttons}`,
    `</div>`,
  ].join('\n');
}

/** Renders the Playground Generated toolbar: target language pills (TS | C | ...) + Program / Portable / Full pills. */
export function renderGeneratedToolbar(options: Readonly<GeneratedToolbarOptions>): string {
  const targets = options.targets ?? DEFAULT_GENERATED_TARGETS;
  const langButtons = targets.map((entry, idx) => {
    const pressed = idx === 0 ? 'true' : 'false';
    const titleAttr = entry.title ? ` title="${escapeHtml(entry.title)}"` : '';
    return `<button id="gen-lang-${escapeHtml(entry.id)}" class="code-lang-btn" type="button" data-lang="${escapeHtml(entry.id)}" aria-pressed="${pressed}"${titleAttr}>${escapeHtml(entry.label)}</button>`;
  }).join('\n      ');
  const modeButtons = CODE_MODES.map((entry, idx) => {
    const idAttr = options.buttonIdPrefix ? ` id="${escapeHtml(options.buttonIdPrefix + entry.mode)}"` : '';
    const pressed = idx === 0 ? 'true' : 'false';
    return `<button${idAttr} class="code-mode-btn" type="button" data-mode="${entry.mode}" aria-pressed="${pressed}">${entry.label}</button>`;
  }).join('\n      ');

  return [
    `<div id="${escapeHtml(options.id)}" class="code-modes pg-gen-toolbar">`,
    `  <div class="pg-gen-group" role="group" aria-label="Target language">`,
    `    <span class="pg-gen-label">Target</span>`,
    `    ${langButtons}`,
    `  </div>`,
    `  <span class="pg-gen-sep" aria-hidden="true"></span>`,
    `  <div class="pg-gen-group" role="group" aria-label="${escapeHtml(options.ariaLabel ?? 'Portability view')}">`,
    `    <span class="pg-gen-label">View</span>`,
    `    ${modeButtons}`,
    `  </div>`,
    `</div>`,
  ].join('\n');
}
