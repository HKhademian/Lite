/** Shared HTML builders for interactive code editors and inspector toolbars. */

import { escapeHtml } from './highlight.ts';

export interface CodeEditorBlockOptions {
  textareaId: string;
  ariaLabel: string;
  preId?: string;
  preCodeId?: string;
  minHeight?: string;
  initialSource?: string;
  initialHtml?: string;
}

export interface CodeModeBarOptions {
  id: string;
  buttonIdPrefix?: string;
  ariaLabel?: string;
}

const CODE_MODES: readonly Readonly<{ mode: string; label: string }>[] = [
  { mode: 'program', label: 'Program' },
  { mode: 'portable', label: 'Portable' },
  { mode: 'full', label: 'Full' },
];

/** Renders the synchronized syntax-highlighted backdrop and editable `.pg-editor-input` textarea. */
export function renderCodeEditorBlock(options: Readonly<CodeEditorBlockOptions>): string {
  const wrapStyle = options.minHeight ? ` style="min-height: ${escapeHtml(options.minHeight)};"` : '';
  const preIdAttr = options.preId ? ` id="${escapeHtml(options.preId)}"` : '';
  const preCodeIdAttr = options.preCodeId ? ` id="${escapeHtml(options.preCodeId)}"` : '';
  const initialHtml = options.initialHtml ?? '';
  const initialEscaped = options.initialSource !== undefined ? escapeHtml(options.initialSource) : '';

  return [
    `<div class="pg-editor-wrap"${wrapStyle}>`,
    `  <pre${preIdAttr} class="pg-editor-pre" aria-hidden="true"><code${preCodeIdAttr}>${initialHtml}</code></pre>`,
    `  <textarea id="${escapeHtml(options.textareaId)}" class="pg-editor-input" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="${escapeHtml(options.ariaLabel)}">${initialEscaped}</textarea>`,
    `</div>`,
  ].join('\n');
}

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
