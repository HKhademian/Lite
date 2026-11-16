/** Shared browser-side controller for Lite code editors and code-view mode toggles. */

export interface EditorScrollLike {
  scrollTop: number;
  scrollLeft: number;
}

export interface EditorCodeLike {
  innerHTML: string;
  parentElement: EditorScrollLike | null;
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
  onInput?: (source: string, fromTab: boolean) => void;
  onRun?: () => void;
  onShiftRun?: () => void;
}

export interface BoundLiteEditor {
  sync: () => void;
  setValue: (source: string) => void;
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

/** Wires syntax highlighting, scroll lock, Tab indentation, and Ctrl/Cmd+Enter run shortcuts. */
export function bindLiteEditor(options: BindLiteEditorOptions): BoundLiteEditor {
  const { editor, preCode, highlight, onInput, onRun, onShiftRun } = options;
  const indent = options.indent ?? '    ';

  const syncScroll = (): void => {
    const pre = preCode.parentElement;
    if (!pre) return;
    pre.scrollTop = editor.scrollTop;
    pre.scrollLeft = editor.scrollLeft;
  };

  const sync = (): void => {
    preCode.innerHTML = highlight(editor.value) + '\n';
    syncScroll();
  };

  editor.addEventListener('input', () => {
    sync();
    if (onInput) onInput(editor.value, false);
  });

  editor.addEventListener('scroll', syncScroll);

  editor.addEventListener('keydown', (rawEvent: unknown) => {
    const event = rawEvent as EditorKeyEventLike;
    if (event.key === 'Tab' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      editor.setRangeText(indent, editor.selectionStart, editor.selectionEnd, 'end');
      sync();
      if (onInput) onInput(editor.value, true);
      return;
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

  return {
    sync,
    setValue(source: string): void {
      editor.value = source;
      sync();
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
