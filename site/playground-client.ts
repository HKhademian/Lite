/** Inline browser client module for `/playground/` (`dist/site/playground/index.html`). */
import { escapeHtml } from "./highlight.ts";

export function renderPlaygroundClientScript(serialized: string, defaultSampleId: string): string {
  return `<script type="module">
  import { formatCodeView } from "./code-view.js";
  import { bindCodeModeButtons, bindLiteEditor, bindSplitPane, decodeSharePayload, encodeSharePayload } from "./editor-client.js";
  import { highlightLite, highlightTs, highlightC } from "./highlight.js";
  import { createPlayStage, createWorkerClient } from "./play-stage.js";
  const samples = ${serialized};
  const byId = new Map(samples.map(s => [s.id, s]));
  const cache = new Map();
  const workbenchEl = document.getElementById("pg-workbench");
  const splitEl = document.getElementById("pg-split");
  const resetBtn = document.getElementById("pg-reset");
  const shareBtn = document.getElementById("pg-share");
  const compileBtn = document.getElementById("pg-compile");
  const playBtn = document.getElementById("pg-play");
  const pauseBtn = document.getElementById("pg-pause");
  const pauseLabelEl = document.getElementById("pg-pause-label");
  const copyBtn = document.getElementById("pg-copy");
  const statusEl = document.getElementById("pg-status");
  const fileEl = document.getElementById("pg-file");
  const editorEl = document.getElementById("pg-editor");
  const gutterEl = document.getElementById("pg-editor-gutter");
  const cursorEl = document.getElementById("pg-cursor");
  const sourceEl = document.getElementById("pg-source");
  const argsEl = document.getElementById("pg-args");
  const stdinEl = document.getElementById("pg-stdin");
  const outputCardsEl = document.getElementById("pg-output-cards");
  const outputBadgeEl = document.getElementById("pg-output-badge");
  const generatedCodeEl = document.getElementById("pg-generated-code");
  const codeModesBar = document.getElementById("pg-code-modes");
  const langButtons = Array.from(document.querySelectorAll(".code-lang-btn"));
  const modeButtons = Array.from(document.querySelectorAll(".code-mode-btn"));
  const tabCanvas = document.getElementById("tab-canvas");
  const canvasEmptyEl = document.getElementById("pg-canvas-empty");
  const canvasWrap = document.getElementById("pg-canvas-wrap");
  const canvas = document.getElementById("pg-canvas");
  const canvasTitleEl = document.getElementById("pg-canvas-title");
  const canvasSizeEl = document.getElementById("pg-canvas-size");
  const muteBtn = document.getElementById("pg-mute");
  const fullscreenBtn = document.getElementById("pg-canvas-fullscreen");
  const fpsEl = document.getElementById("pg-fps");
  const consoleEl = document.getElementById("pg-console");
  const consoleLogEl = document.getElementById("pg-console-log");
  const consoleInputRow = document.getElementById("pg-console-input-row");
  const consolePromptEl = document.getElementById("pg-console-prompt");
  const consoleGhostEl = document.getElementById("pg-console-ghost");
  const consoleInputEl = document.getElementById("pg-console-input");
  const consoleHintEl = document.getElementById("pg-console-hint");
  const eofBtn = document.getElementById("pg-eof");
  const killBtn = document.getElementById("pg-kill");
  const clearConsoleBtn = document.getElementById("pg-clear-console");
  const tabs = Array.from(document.querySelectorAll(".pg-tab"));
  const panels = {
    console: document.getElementById("panel-console"),
    canvas: document.getElementById("panel-canvas"),
    output: document.getElementById("panel-output"),
    generated: document.getElementById("panel-generated"),
  };
  function isCanvasFullscreen() {
    if (!canvasWrap) return false;
    return document.fullscreenElement === canvasWrap || canvasWrap.classList.contains("is-fullscreen");
  }
  function syncFullscreenUi() {
    if (!fullscreenBtn) return;
    const isFs = isCanvasFullscreen();
    fullscreenBtn.textContent = isFs ? "Exit Fullscreen" : "Fullscreen";
    fullscreenBtn.setAttribute("aria-pressed", isFs ? "true" : "false");
  }
  function toggleCanvasFullscreen() {
    if (!canvasWrap) return;
    if (document.fullscreenElement === canvasWrap) {
      if (typeof document.exitFullscreen === "function") void document.exitFullscreen().catch(() => {});
      canvasWrap.classList.remove("is-fullscreen");
      syncFullscreenUi();
      return;
    }
    if (canvasWrap.classList.contains("is-fullscreen")) {
      canvasWrap.classList.remove("is-fullscreen");
      syncFullscreenUi();
      return;
    }
    if (typeof canvasWrap.requestFullscreen === "function") {
      void canvasWrap.requestFullscreen().catch(() => {
        canvasWrap.classList.add("is-fullscreen");
        syncFullscreenUi();
      });
    } else {
      canvasWrap.classList.add("is-fullscreen");
      syncFullscreenUi();
    }
  }
  if (fullscreenBtn && canvasWrap) {
    fullscreenBtn.addEventListener("click", toggleCanvasFullscreen);
    document.addEventListener("fullscreenchange", syncFullscreenUi);
  }
  if (canvas) {
    canvas.addEventListener("keydown", (ev) => {
      if ((ev.key === "f" || ev.key === "F") && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
        ev.preventDefault();
        toggleCanvasFullscreen();
      }
    });
  }

  let activeTab = "console";
  let codeMode = "program";
  let activeGenLang = "ts";
  let rawTs = "";
  let rawC = "";
  let cMessage = "/* Press Compile or select C to emit C. */";
  let currentSample = null;
  let lastCSource = null;
  let lastCOptLevel = null;
  const GEN_LANG_STORAGE_KEY = "lite.pg.genLang";
  const GENERATED_TARGETS = [
    {
      id: "ts",
      label: "TypeScript",
      shortLabel: "TS",
      render(mode) {
        return rawTs ? highlightTs(formatCodeView(rawTs, "ts", mode)) : highlightTs("// Press Compile or Play to emit TypeScript.");
      },
      ensure() {},
    },
    {
      id: "c",
      label: "C",
      shortLabel: "C",
      render(mode) {
        return rawC ? highlightC(formatCodeView(rawC, "c", mode)) : highlightC(cMessage);
      },
      ensure() {
        void compileCForEditor();
      },
    },
  ];
  const targetById = new Map(GENERATED_TARGETS.map((t) => [t.id, t]));
  try {
    const savedLang = window.localStorage.getItem(GEN_LANG_STORAGE_KEY);
    if (savedLang && targetById.has(savedLang)) activeGenLang = savedLang;
  } catch {}
  function syncGenLangButtons() {
    for (const btn of langButtons) {
      btn.setAttribute("aria-pressed", btn.dataset.lang === activeGenLang ? "true" : "false");
    }
  }
  syncGenLangButtons();
  for (const btn of langButtons) {
    btn.addEventListener("click", () => {
      const next = btn.dataset.lang;
      if (!next || !targetById.has(next)) return;
      activeGenLang = next;
      try { window.localStorage.setItem(GEN_LANG_STORAGE_KEY, next); } catch {}
      syncGenLangButtons();
      renderCodeViews();
      targetById.get(next).ensure();
    });
  }
  const OPT_STORAGE_KEY = "lite.pg.optLevel";
  const COMPILER_OPTS_STORAGE_KEY = "lite.pg.compilerOpts";
  const DEFAULT_COMPILER_OPTS = { preset: 1, emitFormat: "auto", sourceMap: "auto", passes: {} };
  const compilerOptsBtn = document.getElementById("pg-compiler-opts-btn");
  const compilerOptsDot = document.getElementById("pg-opts-dot");
  const compilerOptsModal = document.getElementById("pg-compiler-opts-modal");
  const compilerOptsResetBtn = document.getElementById("pg-opts-reset");
  const compilerOptsCloseBtn = document.getElementById("pg-opts-close");
  const compilerOptsApplyBtn = document.getElementById("pg-opts-apply");
  const compilerOptsPresetEl = document.getElementById("pg-opts-preset");
  const compilerOptsEmitFmtEl = document.getElementById("pg-opts-emit-format");
  const compilerOptsSourceMapEl = document.getElementById("pg-opts-source-map");
  const compilerOptsCliEl = document.getElementById("pg-opts-cli-preview");
  const compilerPassSelects = Array.from(document.querySelectorAll("#pg-opts-passes select[data-pass]"));
  let compilerOpts = { preset: 1, emitFormat: "auto", sourceMap: "auto", passes: {} };

  if (typeof window !== "undefined" && window.isSecureContext && !window.crossOriginIsolated && typeof navigator !== "undefined" && navigator.serviceWorker) {
    navigator.serviceWorker.register("./coi-serviceworker.js").then((reg) => {
      const reloadKey = "lite.pg.coiReloaded";
      const reloadOnce = () => {
        if (window.crossOriginIsolated) return;
        try {
          if (!window.sessionStorage.getItem(reloadKey)) {
            window.sessionStorage.setItem(reloadKey, "1");
            window.location.reload();
          }
        } catch {}
      };
      if (reg.active) reloadOnce();
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "activated") reloadOnce();
        });
      });
    }).catch(() => {});
  }

  function readOptLevel() {
    const raw = Number(compilerOpts.preset);
    return Number.isInteger(raw) && raw >= 0 && raw <= 5 ? raw : 1;
  }
  function formatOptFlag(level) {
    return level === 4 ? "-Os" : level === 5 ? "-Oc" : "-O" + String(level);
  }
  function buildCompilerFlags() {
    const flags = [];
    if (compilerOpts.emitFormat === "pretty" || compilerOpts.emitFormat === "compact") {
      flags.push("--emit-format", compilerOpts.emitFormat);
    }
    if (compilerOpts.sourceMap === "none" || compilerOpts.sourceMap === "comments" || compilerOpts.sourceMap === "lines") {
      flags.push("--source-map", compilerOpts.sourceMap);
    }
    for (const [pass, state] of Object.entries(compilerOpts.passes || {})) {
      if (state === "on") flags.push("-f" + pass);
      else if (state === "off") flags.push("-fno-" + pass);
    }
    return flags;
  }
  function compilerFlagsKey() {
    return formatOptFlag(readOptLevel()) + " " + buildCompilerFlags().join(" ");
  }
  function isCompilerOptsModified() {
    if (readOptLevel() !== DEFAULT_COMPILER_OPTS.preset) return true;
    if (compilerOpts.emitFormat !== "auto") return true;
    if (compilerOpts.sourceMap !== "auto") return true;
    return Object.values(compilerOpts.passes || {}).some((v) => v === "on" || v === "off");
  }
  function saveCompilerOpts() {
    try {
      window.localStorage.setItem(OPT_STORAGE_KEY, String(compilerOpts.preset));
      window.localStorage.setItem(COMPILER_OPTS_STORAGE_KEY, JSON.stringify(compilerOpts));
    } catch {}
  }
  function syncCompilerOptsUi() {
    if (compilerOptsPresetEl) compilerOptsPresetEl.value = String(compilerOpts.preset);
    if (compilerOptsEmitFmtEl) compilerOptsEmitFmtEl.value = compilerOpts.emitFormat;
    if (compilerOptsSourceMapEl) compilerOptsSourceMapEl.value = compilerOpts.sourceMap;
    for (const sel of compilerPassSelects) {
      const p = sel.getAttribute("data-pass");
      sel.value = (p && compilerOpts.passes && compilerOpts.passes[p]) || "default";
    }
    if (compilerOptsCliEl) {
      const allFlags = [formatOptFlag(compilerOpts.preset), ...buildCompilerFlags()];
      compilerOptsCliEl.textContent = allFlags.join(" ");
    }
    if (compilerOptsDot) compilerOptsDot.hidden = !isCompilerOptsModified();
  }
  try {
    const savedRaw = window.localStorage.getItem(COMPILER_OPTS_STORAGE_KEY);
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw);
      if (parsed && typeof parsed === "object") {
        const p = Number(parsed.preset);
        compilerOpts = {
          preset: Number.isInteger(p) && p >= 0 && p <= 5 ? p : 1,
          emitFormat: parsed.emitFormat === "pretty" || parsed.emitFormat === "compact" ? parsed.emitFormat : "auto",
          sourceMap: parsed.sourceMap === "none" || parsed.sourceMap === "comments" || parsed.sourceMap === "lines" ? parsed.sourceMap : "auto",
          passes: parsed.passes && typeof parsed.passes === "object" ? { ...parsed.passes } : {},
        };
      }
    } else {
      const saved = window.localStorage.getItem(OPT_STORAGE_KEY);
      if (saved === "0" || saved === "1" || saved === "2" || saved === "3" || saved === "4" || saved === "5") {
        compilerOpts.preset = Number(saved);
      }
    }
  } catch {}
  syncCompilerOptsUi();

  function invalidateCompiledCache() {
    lastCSource = null;
    lastCOptLevel = null;
  }
  if (compilerOptsBtn && compilerOptsModal) {
    compilerOptsBtn.addEventListener("click", () => {
      syncCompilerOptsUi();
      compilerOptsModal.hidden = false;
    });
    if (compilerOptsCloseBtn) {
      compilerOptsCloseBtn.addEventListener("click", () => { compilerOptsModal.hidden = true; });
    }
    compilerOptsModal.addEventListener("click", (ev) => {
      if (ev.target === compilerOptsModal) compilerOptsModal.hidden = true;
    });
    if (compilerOptsPresetEl) {
      compilerOptsPresetEl.addEventListener("change", () => {
        const n = Number(compilerOptsPresetEl.value);
        compilerOpts.preset = Number.isInteger(n) && n >= 0 && n <= 5 ? n : 1;
        saveCompilerOpts();
        syncCompilerOptsUi();
        invalidateCompiledCache();
      });
    }
    if (compilerOptsEmitFmtEl) {
      compilerOptsEmitFmtEl.addEventListener("change", () => {
        compilerOpts.emitFormat = compilerOptsEmitFmtEl.value || "auto";
        saveCompilerOpts();
        syncCompilerOptsUi();
        invalidateCompiledCache();
      });
    }
    if (compilerOptsSourceMapEl) {
      compilerOptsSourceMapEl.addEventListener("change", () => {
        compilerOpts.sourceMap = compilerOptsSourceMapEl.value || "auto";
        saveCompilerOpts();
        syncCompilerOptsUi();
        invalidateCompiledCache();
      });
    }
    for (const sel of compilerPassSelects) {
      sel.addEventListener("change", () => {
        const p = sel.getAttribute("data-pass");
        if (!p) return;
        if (sel.value === "on" || sel.value === "off") compilerOpts.passes[p] = sel.value;
        else delete compilerOpts.passes[p];
        saveCompilerOpts();
        syncCompilerOptsUi();
        invalidateCompiledCache();
      });
    }
    if (compilerOptsResetBtn) {
      compilerOptsResetBtn.addEventListener("click", () => {
        compilerOpts = { preset: 1, emitFormat: "auto", sourceMap: "auto", passes: {} };
        saveCompilerOpts();
        syncCompilerOptsUi();
        invalidateCompiledCache();
        statusEl.hidden = false;
        statusEl.textContent = "Compiler options reset to defaults (-O1)";
      });
    }
    if (compilerOptsApplyBtn) {
      compilerOptsApplyBtn.addEventListener("click", () => {
        compilerOptsModal.hidden = true;
        invalidateCompiledCache();
        if (activeTab === "generated" && activeGenLang === "c") void compileCForEditor();
        else void runAction("compile");
      });
    }
  }
  const snipsApi = typeof window !== "undefined" && window.LiteSnips ? window.LiteSnips : null;
  const saveSnipBtn = document.getElementById("pg-save-snip");
  const titleEl = document.getElementById("pg-current-title");
  let activeSnipId = null;
  let activeLibraryItem = null;
  let currentExtraModules = null;
  let currentEnvironment = "universal";
  let libraryItems = null;
  let libraryPromise = null;
  let baseline = { code: "", stdin: "", args: "" };

  function syncSnipsBadge() {
    const badge = document.getElementById("pg-sketches-count");
    if (badge && snipsApi) badge.textContent = String(snipsApi.list().length);
  }

  function updateDirtyState() {
    const dirty = editorEl.value !== baseline.code || stdinEl.value !== baseline.stdin || argsEl.value !== baseline.args;
    if (saveSnipBtn) saveSnipBtn.hidden = !dirty;
    if (resetBtn) resetBtn.hidden = !dirty;
    return dirty;
  }

  function setBaseline() {
    baseline = { code: editorEl.value, stdin: stdinEl.value, args: argsEl.value };
    if (saveSnipBtn) saveSnipBtn.hidden = true;
    if (resetBtn) resetBtn.hidden = true;
  }

  function loadLibraryCatalog() {
    if (libraryItems) return Promise.resolve(libraryItems);
    if (!libraryPromise) {
      libraryPromise = fetch("./library.json")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          libraryItems = Array.isArray(data) ? data : [];
          return libraryItems;
        })
        .catch(() => {
          libraryItems = [];
          return libraryItems;
        });
    }
    return libraryPromise;
  }

  if (splitEl && workbenchEl) {
    bindSplitPane({
      splitEl,
      containerEl: workbenchEl,
      cssVar: "--pg-split",
      storageKey: "lite.pg.split",
      defaultPct: 50,
      minPct: 20,
      maxPct: 80,
    });
  }

  const workerClient = createWorkerClient("./worker.js");
  const stage = createPlayStage({
    canvas,
    workerClient,
    sizeEl: canvasSizeEl,
    titleEl: canvasTitleEl,
    fpsEl,
    pauseBtn,
    pauseLabelEl,
    muteBtn,
    isCanvasVisible: () => activeTab === "canvas",
    onStatus: (s) => {
      statusEl.textContent = s;
      statusEl.hidden = activeTab === "canvas" && stage.isPlayable() && s !== "Modified";
    },
    onError: (stderr) => {
      statusEl.textContent = "Play error";
      appendConsoleSpan("stderr", (stderr || "Canvas update failed.") + "\\n");
      appendConsoleExit(1, null);
      showTab("console");
    },
  });
  stage.syncPauseUi(false, false);

  let hasActiveCanvas = false;
  function setCanvasEnabled(enabled) {
    hasActiveCanvas = Boolean(enabled);
    if (canvasWrap) canvasWrap.hidden = !hasActiveCanvas;
    if (canvasEmptyEl) canvasEmptyEl.hidden = hasActiveCanvas;
  }
  setCanvasEnabled(false);

  const consoleState = {
    running: false,
    showRunningControls: false,
    runningUiTimer: 0,
    waitingStdin: false,
    history: [],
    historyIdx: -1,
    lastCommand: "",
    sharedCtrl: null,
    sharedData: null,
    fallbackSession: null,
    activeRunId: 0,
    lastFiles: [],
    lastOutputData: {
      statusText: "Ready",
      exitCode: null,
      optFlag: formatOptFlag(readOptLevel()),
      compileMs: null,
      runMs: null,
      diagnostics: [],
      tones: [],
      files: [],
    },
  };

  function currentProgramLabel() {
    return "playground.lts";
  }

  function formatCommandLine(args, stdinText) {
    const parts = ["lite", "run", currentProgramLabel(), ...(Array.isArray(args) ? args : [])];
    const base = parts.join(" ");
    if (stdinText) {
      const preview = stdinText.replaceAll("\\n", "\\\\n");
      const clipped = preview.length > 36 ? preview.slice(0, 33) + "..." : preview;
      return base + ' <<< "' + clipped.replaceAll('"', '\\\\"') + '"';
    }
    return base;
  }

  function scrollConsoleToBottom() {
    if (consoleEl) consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function setConsoleRunning(next) {
    if (consoleState.runningUiTimer) {
      window.clearTimeout(consoleState.runningUiTimer);
      consoleState.runningUiTimer = 0;
    }
    consoleState.running = Boolean(next);
    consoleState.showRunningControls = false;
    if (consoleState.running) {
      consoleState.runningUiTimer = window.setTimeout(() => {
        consoleState.runningUiTimer = 0;
        if (consoleState.running) {
          consoleState.showRunningControls = true;
          syncConsolePromptUi();
        }
      }, 250);
    }
  }

  function syncConsolePromptUi() {
    if (!consoleInputRow || !consoleInputEl || !consolePromptEl || !consoleGhostEl) return;
    const showBusyControls = consoleState.running && consoleState.showRunningControls;
    consoleInputRow.hidden = showBusyControls && !consoleState.waitingStdin;
    consoleInputRow.classList.toggle("is-waiting", consoleState.waitingStdin);
    consolePromptEl.textContent = consoleState.waitingStdin ? ">" : "$";
    if (consoleHintEl) {
      if (consoleState.waitingStdin) {
        consoleHintEl.textContent = "waiting for input · Enter · ^D EOF · ^C kill";
        consoleHintEl.hidden = false;
      } else {
        consoleHintEl.hidden = true;
      }
    }
    const showGhost = !consoleState.waitingStdin && !showBusyControls && consoleInputEl.value === "" && Boolean(consoleState.lastCommand);
    consoleGhostEl.textContent = showGhost ? consoleState.lastCommand : "";
    if (eofBtn) eofBtn.hidden = !(activeTab === "console" && consoleState.waitingStdin);
    if (killBtn) killBtn.hidden = !(activeTab === "console" && (showBusyControls || consoleState.waitingStdin));
    if (clearConsoleBtn) clearConsoleBtn.hidden = activeTab !== "console";
  }

  function clearConsoleLog() {
    if (consoleLogEl) consoleLogEl.innerHTML = "";
    syncConsolePromptUi();
  }

  function appendConsoleCommand(cmd) {
    if (!consoleLogEl) return;
    const row = document.createElement("div");
    row.className = "pg-console-cmd";
    const sigil = document.createElement("span");
    sigil.className = "pg-console-cmd-sigil";
    sigil.textContent = "$";
    row.appendChild(sigil);
    row.appendChild(document.createTextNode(cmd));
    consoleLogEl.appendChild(row);
    consoleState.lastCommand = cmd;
    if (cmd && consoleState.history[consoleState.history.length - 1] !== cmd) {
      consoleState.history.push(cmd);
      if (consoleState.history.length > 50) consoleState.history.shift();
    }
    consoleState.historyIdx = consoleState.history.length;
    scrollConsoleToBottom();
  }

  const ANSI_FG = {
    30: "#4b5563", 31: "#f87171", 32: "#86efac", 33: "#fcd34d",
    34: "#93c5fd", 35: "#d8b4fe", 36: "#67e8f9", 37: "#e5e7eb",
    90: "#9ca3af", 91: "#fca5a5", 92: "#bbf7d0", 93: "#fde68a",
    94: "#bfdbfe", 95: "#e9d5ff", 96: "#a5f3fc", 97: "#ffffff",
  };
  const ANSI_BG = {
    40: "#111827", 41: "#7f1d1d", 42: "#14532d", 43: "#78350f",
    44: "#1e3a8a", 45: "#581c87", 46: "#164e63", 47: "#374151",
    100: "#374151", 101: "#991b1b", 102: "#166534", 103: "#92400e",
    104: "#1d4ed8", 105: "#6b21a8", 106: "#155e75", 107: "#4b5563",
  };

  function appendConsoleSpan(kind, text) {
    if (!consoleLogEl || !text) return;
    const baseClass =
      kind === "stderr"
        ? "pg-console-stderr"
        : kind === "sys"
          ? "pg-console-sys"
          : kind === "stdin"
            ? "pg-console-stdin-echo"
            : "pg-console-stdout";
    const str = String(text);
    if (!str.includes("\\x1b[")) {
      const span = document.createElement("span");
      span.className = baseClass;
      span.textContent = str;
      consoleLogEl.appendChild(span);
      scrollConsoleToBottom();
      return;
    }
    const re = /\\x1b\\[([0-9;]*)m/g;
    let last = 0;
    let fg = "";
    let bg = "";
    let bold = false;
    let dim = false;
    let m;
    const pushSeg = (seg) => {
      if (!seg) return;
      const span = document.createElement("span");
      span.className = baseClass;
      if (fg && span.style) span.style.color = fg;
      if (bg && span.style) span.style.backgroundColor = bg;
      if (bold && span.style) span.style.fontWeight = "700";
      if (dim && span.style) span.style.opacity = "0.7";
      span.textContent = seg;
      consoleLogEl.appendChild(span);
    };
    while ((m = re.exec(str)) !== null) {
      pushSeg(str.slice(last, m.index));
      const codes = m[1] ? m[1].split(";").map(Number) : [0];
      for (const c of codes) {
        if (c === 0) { fg = ""; bg = ""; bold = false; dim = false; }
        else if (c === 1) bold = true;
        else if (c === 2) dim = true;
        else if (c === 22) { bold = false; dim = false; }
        else if (c === 39) fg = "";
        else if (c === 49) bg = "";
        else if (ANSI_FG[c]) fg = ANSI_FG[c];
        else if (ANSI_BG[c]) bg = ANSI_BG[c];
      }
      last = m.index + m[0].length;
    }
    pushSeg(str.slice(last));
    scrollConsoleToBottom();
  }

  function appendConsoleExit(exitCode, _runMs, labelOverride) {
    if (!consoleLogEl) return;
    const wrap = document.createElement("div");
    const badge = document.createElement("span");
    const ok = exitCode === 0;
    badge.className = "pg-console-exit " + (ok ? "pg-console-exit-ok" : "pg-console-exit-err");
    if (labelOverride) {
      badge.textContent = labelOverride;
    } else {
      badge.textContent = "exit " + String(exitCode ?? 0);
    }
    wrap.appendChild(badge);
    consoleLogEl.appendChild(wrap);
    scrollConsoleToBottom();
  }

  function jumpEditorToLine(lineNum) {
    if (!editorEl || !Number.isFinite(lineNum) || lineNum < 1) return;
    const lines = editorEl.value.split("\\n");
    let offset = 0;
    const target = Math.min(lines.length, Math.max(1, Math.trunc(lineNum)));
    for (let i = 0; i < target - 1; i += 1) offset += lines[i].length + 1;
    editorEl.focus();
    editorEl.setSelectionRange(offset, offset + (lines[target - 1] ? lines[target - 1].length : 0));
  }

  function formatBytes(n) {
    if (!Number.isFinite(n) || n < 0) return "0 B";
    if (n < 1024) return String(n) + " B";
    return (n / 1024).toFixed(1) + " KB";
  }

  function renderOutputCards() {
    if (!outputCardsEl) return;
    const d = consoleState.lastOutputData;
    const extraCount = (d.diagnostics ? d.diagnostics.length : 0) + (d.tones ? d.tones.length : 0) + (d.files ? d.files.length : 0);
    if (outputBadgeEl) {
      outputBadgeEl.textContent = String(extraCount);
      outputBadgeEl.hidden = extraCount === 0;
    }
    outputCardsEl.innerHTML = "";

    const summaryCard = document.createElement("section");
    summaryCard.className = "pg-out-card";
    const sHead = document.createElement("div");
    sHead.className = "pg-out-head";
    sHead.innerHTML = '<span>Execution &amp; Compile Summary</span><span class="pg-out-meta">' + escapeHtml(d.optFlag || "-O1") + "</span>";
    const sBody = document.createElement("div");
    sBody.className = "pg-out-body pg-out-grid";
    const kvItems = [
      ["Status", d.statusText || "Ready"],
      ["Exit Code", d.exitCode === null || d.exitCode === undefined ? "—" : String(d.exitCode)],
      ["Compile Time", typeof d.compileMs === "number" ? String(d.compileMs) + " ms" : "—"],
      ["Run Time", typeof d.runMs === "number" ? String(d.runMs) + " ms" : "—"],
      ["Emitted TS", rawTs ? formatBytes(rawTs.length) + " (" + String(rawTs.split("\\n").length) + " ln)" : "—"],
      ["Emitted C", rawC ? formatBytes(rawC.length) + " (" + String(rawC.split("\\n").length) + " ln)" : "—"],
    ];
    for (const [k, v] of kvItems) {
      const kv = document.createElement("div");
      kv.className = "pg-out-kv";
      const kEl = document.createElement("span");
      kEl.className = "pg-out-k";
      kEl.textContent = k;
      const vEl = document.createElement("span");
      vEl.className = "pg-out-v";
      vEl.textContent = v;
      kv.appendChild(kEl);
      kv.appendChild(vEl);
      sBody.appendChild(kv);
    }
    summaryCard.appendChild(sHead);
    summaryCard.appendChild(sBody);
    outputCardsEl.appendChild(summaryCard);

    if (Array.isArray(d.diagnostics) && d.diagnostics.length > 0) {
      const diagCard = document.createElement("section");
      diagCard.className = "pg-out-card";
      const dHead = document.createElement("div");
      dHead.className = "pg-out-head";
      dHead.innerHTML = '<span>Diagnostics</span><span class="pg-out-meta">' + String(d.diagnostics.length) + "</span>";
      const dBody = document.createElement("div");
      dBody.className = "pg-out-body pg-out-list";
      for (const item of d.diagnostics) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pg-out-diag";
        btn.innerHTML =
          '<span class="pg-out-diag-loc">' + escapeHtml(item.file + ":" + String(item.line) + ":" + String(item.column)) + "</span>" +
          '<span class="pg-out-diag-cat">' + escapeHtml(item.category) + "</span>" +
          "<span>" + escapeHtml(item.message) + "</span>";
        btn.addEventListener("click", () => jumpEditorToLine(item.line));
        dBody.appendChild(btn);
      }
      diagCard.appendChild(dHead);
      diagCard.appendChild(dBody);
      outputCardsEl.appendChild(diagCard);
    }

    if (Array.isArray(d.tones) && d.tones.length > 0) {
      const toneCount = Math.floor(d.tones.length / 2);
      const toneCard = document.createElement("section");
      toneCard.className = "pg-out-card";
      const tHead = document.createElement("div");
      tHead.className = "pg-out-head";
      const tTitle = document.createElement("span");
      tTitle.textContent = "Audio Tones (" + String(toneCount || d.tones.length) + ")";
      const replayBtn = document.createElement("button");
      replayBtn.type = "button";
      replayBtn.className = "pg-copy-btn";
      replayBtn.textContent = "Replay";
      replayBtn.addEventListener("click", () => {
        stage.unlockAudio();
        stage.playTones(d.tones);
      });
      tHead.appendChild(tTitle);
      tHead.appendChild(replayBtn);
      const tBody = document.createElement("div");
      tBody.className = "pg-out-body";
      for (let i = 0; i + 1 < d.tones.length && i < 64; i += 2) {
        const row = document.createElement("div");
        row.className = "pg-out-tone-row";
        row.innerHTML = "<span>#" + String(i / 2 + 1) + " · " + String(d.tones[i]) + " Hz</span><span>" + String(d.tones[i + 1]) + " ms</span>";
        tBody.appendChild(row);
      }
      toneCard.appendChild(tHead);
      toneCard.appendChild(tBody);
      outputCardsEl.appendChild(toneCard);
    }

    if (Array.isArray(d.files) && d.files.length > 0) {
      const filesCard = document.createElement("section");
      filesCard.className = "pg-out-card";
      const fHead = document.createElement("div");
      fHead.className = "pg-out-head";
      fHead.innerHTML = '<span>Virtual Files (core/file)</span><span class="pg-out-meta">' + String(d.files.length) + "</span>";
      const fBody = document.createElement("div");
      fBody.className = "pg-out-body pg-out-list";
      for (const f of d.files) {
        const box = document.createElement("div");
        box.className = "pg-out-file";
        const fh = document.createElement("div");
        fh.className = "pg-out-file-head";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = f.path + " (" + formatBytes(f.size) + ")";
        const acts = document.createElement("div");
        acts.className = "pg-actions";
        if (f.isText && typeof f.textPreview === "string") {
          const cpBtn = document.createElement("button");
          cpBtn.type = "button";
          cpBtn.className = "pg-copy-btn";
          cpBtn.textContent = "Copy";
          cpBtn.addEventListener("click", () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              void navigator.clipboard.writeText(f.textPreview);
            }
          });
          acts.appendChild(cpBtn);
        }
        if (f.bytesBase64) {
          const dlBtn = document.createElement("button");
          dlBtn.type = "button";
          dlBtn.className = "pg-copy-btn";
          dlBtn.textContent = "Download";
          dlBtn.addEventListener("click", () => {
            const bin = atob(f.bytesBase64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
            const blob = new Blob([arr]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = f.path.split("/").pop() || "output.bin";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          });
          acts.appendChild(dlBtn);
        }
        fh.appendChild(nameSpan);
        fh.appendChild(acts);
        box.appendChild(fh);
        if (f.isText && typeof f.textPreview === "string") {
          const lowerPath = String(f.path || "").toLowerCase();
          if (lowerPath.endsWith(".svg")) {
            const svgWrap = document.createElement("div");
            svgWrap.className = "pg-out-svg-wrap";
            const img = document.createElement("img");
            img.className = "pg-out-svg-preview";
            img.alt = f.path;
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(f.textPreview);
            svgWrap.appendChild(img);
            box.appendChild(svgWrap);
          }
          const pre = document.createElement("pre");
          pre.className = "pg-out-file-pre";
          let displayText = f.textPreview;
          if (lowerPath.endsWith(".json")) {
            try { displayText = JSON.stringify(JSON.parse(f.textPreview), null, 2); } catch {}
          }
          pre.textContent = displayText;
          box.appendChild(pre);
        }
        fBody.appendChild(box);
      }
      filesCard.appendChild(fHead);
      filesCard.appendChild(fBody);
      outputCardsEl.appendChild(filesCard);
    }

    if (extraCount === 0) {
      const note = document.createElement("div");
      note.className = "pg-out-empty";
      note.textContent = "No auxiliary outputs (files, audio tones, or compiler diagnostics) from the latest run. Standard output appears in Console.";
      outputCardsEl.appendChild(note);
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderCodeViews() {
    if (!generatedCodeEl) return;
    const target = targetById.get(activeGenLang) || GENERATED_TARGETS[0];
    generatedCodeEl.innerHTML = target.render(codeMode);
  }

  bindCodeModeButtons({
    buttons: modeButtons,
    onChange: (mode) => {
      codeMode = mode;
      renderCodeViews();
    },
  });

  function showTab(name) {
    activeTab = name;
    for (const tab of tabs) {
      tab.setAttribute("aria-selected", tab.dataset.tab === name ? "true" : "false");
    }
    for (const [key, panel] of Object.entries(panels)) {
      if (panel) panel.hidden = key !== name;
    }
    const showPause = name === "canvas" && stage.isPlayable();
    if (codeModesBar) codeModesBar.hidden = name !== "generated";
    copyBtn.hidden = name === "canvas";
    pauseBtn.hidden = !showPause;
    statusEl.hidden = showPause && statusEl.textContent !== "Modified";
    syncConsolePromptUi();
    if (name === "canvas" && hasActiveCanvas) stage.resumeLoop();
    else stage.pauseLoop();
    if (name === "generated") {
      renderCodeViews();
      const target = targetById.get(activeGenLang);
      if (target) target.ensure();
    }
    if (name === "output") renderOutputCards();
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      showTab(tab.dataset.tab);
      if (tab.dataset.tab === "canvas" && hasActiveCanvas) canvas.focus({ preventScroll: true });
      if (tab.dataset.tab === "console" && consoleInputEl) consoleInputEl.focus({ preventScroll: true });
    });
  }

  const editorCtrl = bindLiteEditor({
    editor: editorEl,
    preCode: sourceEl,
    highlight: highlightLite,
    indent: "  ",
    gutter: gutterEl,
    cursorEl,
    autoIndent: true,
    onInput: (_src, fromTab) => {
      if (!fromTab) stage.pauseLoop();
      const dirty = updateDirtyState();
      statusEl.textContent = dirty ? "Modified — click Save" : (fromTab ? "Modified" : "Ready");
      statusEl.hidden = false;
    },
    onRun: () => {
      stage.unlockAudio();
      void runAction("play");
    },
  });
  stdinEl.addEventListener("input", updateDirtyState);
  argsEl.addEventListener("input", updateDirtyState);

  async function fetchSample(id) {
    if (cache.has(id)) return cache.get(id);
    const res = await fetch("./samples/" + encodeURIComponent(id) + ".json");
    if (!res.ok) throw new Error("Failed to load sample " + id);
    const data = await res.json();
    cache.set(id, data);
    return data;
  }

  function setPlaygroundQuery(key, value) {
    const nextUrl = new URL(window.location.href);
    for (const k of ["sample", "snip", "draft", "item", "example", "case", "piece"]) {
      nextUrl.searchParams.delete(k);
    }
    if (String(nextUrl.hash || "").startsWith("#code=")) nextUrl.hash = "";
    if (key && value) nextUrl.searchParams.set(key, value);
    window.history.replaceState({}, "", nextUrl);
  }

  function stopPlay(disableCanvasTab) {
    stage.stop();
    if (disableCanvasTab) {
      setCanvasEnabled(false);
    }
  }

  function killActiveRun(fromUser) {
    if (!consoleState.running && !consoleState.waitingStdin) return;
    consoleState.activeRunId += 1;
    if (consoleState.sharedCtrl) {
      try {
        Atomics.store(consoleState.sharedCtrl, 0, 3);
        Atomics.notify(consoleState.sharedCtrl, 0);
      } catch {}
    }
    workerClient.terminate();
    setConsoleRunning(false);
    consoleState.waitingStdin = false;
    consoleState.sharedCtrl = null;
    consoleState.sharedData = null;
    consoleState.fallbackSession = null;
    if (fromUser) {
      appendConsoleSpan("stderr", "^C\\n");
      appendConsoleExit(130, null, "exit 130");
      statusEl.hidden = false;
      statusEl.textContent = "Killed (exit 130)";
      consoleState.lastOutputData = {
        ...consoleState.lastOutputData,
        statusText: "Killed (SIGINT)",
        exitCode: 130,
      };
      renderOutputCards();
    }
    syncConsolePromptUi();
    if (activeTab === "console" && consoleInputEl) consoleInputEl.focus({ preventScroll: true });
  }

  function sendStdinLine(lineText) {
    if (!consoleState.waitingStdin) return;
    appendConsoleSpan("stdin", lineText + "\\n");
    if (consoleState.sharedCtrl && consoleState.sharedData) {
      const enc = new TextEncoder().encode(lineText + "\\n");
      const maxLen = Math.min(enc.length, consoleState.sharedData.length);
      consoleState.sharedData.set(enc.subarray(0, maxLen), 0);
      Atomics.store(consoleState.sharedCtrl, 1, maxLen);
      Atomics.store(consoleState.sharedCtrl, 0, 1);
      Atomics.notify(consoleState.sharedCtrl, 0);
      consoleState.waitingStdin = false;
      syncConsolePromptUi();
      return;
    }
    if (consoleState.fallbackSession) {
      const sess = consoleState.fallbackSession;
      sess.stdinSoFar += lineText + "\\n";
      consoleState.waitingStdin = false;
      syncConsolePromptUi();
      void continueFallbackSession(sess, false);
    }
  }

  function sendStdinEof() {
    if (!consoleState.waitingStdin) return;
    appendConsoleSpan("sys", "^D\\n");
    if (consoleState.sharedCtrl) {
      Atomics.store(consoleState.sharedCtrl, 0, 2);
      Atomics.notify(consoleState.sharedCtrl, 0);
      consoleState.waitingStdin = false;
      syncConsolePromptUi();
      return;
    }
    if (consoleState.fallbackSession) {
      const sess = consoleState.fallbackSession;
      consoleState.waitingStdin = false;
      syncConsolePromptUi();
      void continueFallbackSession(sess, true);
    }
  }

  async function continueFallbackSession(sess, stdinClosed) {
    const runId = ++consoleState.activeRunId;
    setConsoleRunning(true);
    syncConsolePromptUi();
    try {
      const res = await workerClient.call("play", {
        source: sess.source,
        stdin: sess.stdinSoFar,
        args: sess.args,
        optLevel: sess.optLevel,
        compilerFlags: sess.compilerFlags || buildCompilerFlags(),
        interactive: true,
        stdinClosed,
        streamOutput: false,
        ...(sess.extraModules ? { extraModules: sess.extraModules } : {}),
      });
      if (runId !== consoleState.activeRunId) return;
      const fullOut = String(res.stdout || "");
      const fullErr = String(res.stderr || "");
      const deltaOut = fullOut.length >= sess.printedStdoutLen ? fullOut.slice(sess.printedStdoutLen) : fullOut;
      const deltaErr = fullErr.length >= sess.printedStderrLen ? fullErr.slice(sess.printedStderrLen) : fullErr;
      if (deltaOut) appendConsoleSpan("stdout", deltaOut);
      if (deltaErr) appendConsoleSpan("stderr", deltaErr);
      sess.printedStdoutLen = fullOut.length;
      sess.printedStderrLen = fullErr.length;

      if (res.needsStdin && !stdinClosed) {
        setConsoleRunning(false);
        consoleState.waitingStdin = true;
        statusEl.textContent = "Waiting for input...";
        syncConsolePromptUi();
        if (consoleInputEl) consoleInputEl.focus({ preventScroll: true });
        return;
      }

      setConsoleRunning(false);
      consoleState.waitingStdin = false;
      consoleState.fallbackSession = null;
      finalizePlayResult(res, sess.optLevel, sess.source, true);
    } catch (err) {
      if (runId !== consoleState.activeRunId) return;
      setConsoleRunning(false);
      consoleState.waitingStdin = false;
      consoleState.fallbackSession = null;
      appendConsoleSpan("stderr", (err instanceof Error ? err.message : String(err)) + "\\n");
      appendConsoleExit(1, null);
      statusEl.textContent = "Worker error";
      syncConsolePromptUi();
    }
  }

  function finalizePlayResult(res, optLevel, source, alreadyStreamed) {
    if (res.ts) rawTs = String(res.ts);
    renderCodeViews();
    const files = Array.isArray(res.files) ? res.files : [];
    const diagnostics = Array.isArray(res.diagnostics) ? res.diagnostics : [];
    const tones = Array.isArray(res.tones) ? res.tones : [];
    consoleState.lastFiles = files;

    if (!res.ok) {
      editorCtrl.setErrorFromStderr(res.stderr || "");
      setCanvasEnabled(false);
      showTab("console");
      const isCliFailure =
        currentEnvironment === "cli" ||
        /import\\s+"core\\/(file|path|process|time)"/.test(source);
      const cliHint = isCliFailure
        ? "\\n[host note] This source targets the CLI / Host OS environment; browser mode supports Compile TS/C, while local execution uses ./bin/lite run."
        : "";
      if (!alreadyStreamed) {
        if (res.stdout) appendConsoleSpan("stdout", res.stdout + (res.stdout.endsWith("\\n") ? "" : "\\n"));
        appendConsoleSpan("stderr", (res.stderr || "Execution failed.") + cliHint + "\\n");
      } else if (cliHint) {
        appendConsoleSpan("sys", cliHint + "\\n");
      }
      const exitCode = typeof res.exitCode === "number" ? res.exitCode : 1;
      appendConsoleExit(exitCode, res.timings && res.timings.runMs);
      statusEl.textContent = res.ts ? (isCliFailure ? "CLI / Host OS runtime required" : "Runtime error") : "Compile error";
      consoleState.lastOutputData = {
        statusText: statusEl.textContent,
        exitCode,
        optFlag: formatOptFlag(optLevel),
        compileMs: res.timings ? res.timings.compileMs : null,
        runMs: res.timings ? res.timings.runMs : null,
        diagnostics,
        tones,
        files,
      };
      renderOutputCards();
      syncConsolePromptUi();
      if (consoleInputEl) consoleInputEl.focus({ preventScroll: true });
      return;
    }

    if (!alreadyStreamed) {
      if (res.stdout) appendConsoleSpan("stdout", res.stdout + (res.stdout.endsWith("\\n") ? "" : "\\n"));
      if (res.stderr) appendConsoleSpan("stderr", res.stderr + (res.stderr.endsWith("\\n") ? "" : "\\n"));
    } else if (res.stdout && !res.stdout.endsWith("\\n")) {
      appendConsoleSpan("stdout", "\\n");
    }
    const exitCode = typeof res.exitCode === "number" ? res.exitCode : 0;
    appendConsoleExit(exitCode, res.timings && res.timings.runMs);
    if (tones.length > 0) stage.playTones(tones);

    const frame = res.play || res.canvas;
    if (frame && frame.width > 0 && frame.height > 0) {
      setCanvasEnabled(true);
      stage.startSession(frame, Boolean(res.play));
      if (res.play) {
        showTab("canvas");
        stage.syncPauseUi(true, true);
      } else {
        statusEl.textContent = "Rendered canvas (in browser)";
        showTab("canvas");
      }
    } else {
      setCanvasEnabled(false);
      showTab("console");
      statusEl.textContent = "Exited " + String(exitCode) + " (in browser)";
    }

    consoleState.lastOutputData = {
      statusText: frame ? "Rendered canvas" : "Exited " + String(exitCode),
      exitCode,
      optFlag: formatOptFlag(optLevel),
      compileMs: res.timings ? res.timings.compileMs : null,
      runMs: res.timings ? res.timings.runMs : null,
      diagnostics,
      tones,
      files,
    };
    renderOutputCards();
    syncConsolePromptUi();
    if (activeTab === "console" && consoleInputEl) consoleInputEl.focus({ preventScroll: true });
  }

  async function loadSample(id, mode) {
    const meta = byId.get(id) ?? samples[0];
    if (!meta) return;
    killActiveRun(false);
    activeSnipId = null;
    activeLibraryItem = null;
    currentExtraModules = null;
    currentEnvironment = "universal";
    stopPlay(true);
    editorCtrl.clearErrors();
    if (titleEl) titleEl.textContent = meta.title;
    fileEl.textContent = meta.file;
    statusEl.textContent = "Loading " + meta.file + "...";

    setPlaygroundQuery("sample", meta.id);

    const sample = await fetchSample(meta.id);
    currentSample = sample;
    editorCtrl.setValue(sample.source);
    rawTs = sample.ts ?? "";
    rawC = "";
    cMessage = "/* Press Compile or select C to emit C. */";
    lastCSource = null;
    renderCodeViews();
    if (activeTab === "generated" && activeGenLang === "c") void compileCForEditor();
    argsEl.value = sample.args.join(" ");
    stdinEl.value = sample.stdin.replaceAll("\\n", "\\\\n");
    setBaseline();
    clearConsoleLog();
    consoleState.lastFiles = [];

    if (mode === "compile") {
      showTab("generated");
      statusEl.textContent = "Compiled to TypeScript";
    } else if (meta.play) {
      await runAction("play");
    } else if (mode === "play" || meta.showOutput) {
      showTab("console");
      const cmd = formatCommandLine(sample.args, sample.stdin);
      appendConsoleCommand(cmd);
      if (sample.output) appendConsoleSpan("stdout", sample.output + (sample.output.endsWith("\\n") ? "" : "\\n"));
      appendConsoleExit(0, null, "exit 0");
      statusEl.textContent = "Exited 0 (verified)";
      consoleState.lastOutputData = {
        statusText: "Verified output ready",
        exitCode: 0,
        optFlag: formatOptFlag(readOptLevel()),
        compileMs: null,
        runMs: null,
        diagnostics: [],
        tones: [],
        files: [],
      };
      renderOutputCards();
      syncConsolePromptUi();
    } else {
      showTab("console");
      consoleState.lastCommand = formatCommandLine(sample.args, "");
      appendConsoleSpan("sys", "Ready — press Play or Enter to run " + meta.file + "\\n");
      statusEl.textContent = "Ready — press Play";
      consoleState.lastOutputData = {
        statusText: "Ready",
        exitCode: null,
        optFlag: formatOptFlag(readOptLevel()),
        compileMs: null,
        runMs: null,
        diagnostics: [],
        tones: [],
        files: [],
      };
      renderOutputCards();
      syncConsolePromptUi();
    }
  }

  function parseStdin() {
    return stdinEl.value.replaceAll("\\\\n", "\\n");
  }

  function parseArgs() {
    const raw = argsEl.value.trim();
    return raw ? raw.split(/\\s+/) : [];
  }

  function formatCOutput(c, cError) {
    if (c) return c;
    const msg = (cError || "C backend does not support this program yet.").trim();
    return "/* " + msg.replaceAll("*/", "* /") + " */";
  }

  async function compileCForEditor() {
    const source = editorEl.value;
    const optLevel = readOptLevel();
    const cFlags = buildCompilerFlags();
    const cacheKey = formatOptFlag(optLevel) + " " + cFlags.join(" ");
    if (lastCSource === source && lastCOptLevel === cacheKey) return;
    rawC = "";
    cMessage = "/* Compiling C in browser (" + cacheKey.trim() + ")... */";
    renderCodeViews();
    try {
      const res = await workerClient.call("compile-c", {
        source,
        stdin: "",
        args: [],
        optLevel,
        compilerFlags: cFlags,
        ...(currentExtraModules ? { extraModules: currentExtraModules } : {}),
      });
      if (editorEl.value !== source || compilerFlagsKey() !== cacheKey) return;
      lastCSource = source;
      lastCOptLevel = cacheKey;
      if (res.c) {
        rawC = String(res.c);
        cMessage = "";
      } else {
        rawC = "";
        cMessage = formatCOutput("", res.stderr);
      }
      renderCodeViews();
      renderOutputCards();
    } catch (err) {
      rawC = "";
      cMessage = "/* " + (err instanceof Error ? err.message : String(err)) + " */";
      renderCodeViews();
    }
  }

  async function runAction(action, overrides) {
    killActiveRun(false);
    stopPlay(false);
    editorCtrl.clearErrors();
    const source = editorEl.value;
    const hasCustomStdin = overrides && typeof overrides.stdin === "string";
    const stdin = hasCustomStdin ? overrides.stdin : parseStdin();
    const args = overrides && Array.isArray(overrides.args) ? overrides.args : parseArgs();
    const optLevel = overrides && typeof overrides.optLevel === "number" ? overrides.optLevel : readOptLevel();
    const forceInteractive = Boolean(overrides && overrides.interactive);
    const isInteractiveRun = forceInteractive || stdin === "";
    statusEl.hidden = false;
    statusEl.textContent = action === "compile"
      ? "Compiling in browser (" + formatOptFlag(optLevel) + ")..."
      : "Running in browser (" + formatOptFlag(optLevel) + ")...";

    if (action === "compile") {
      const cFlags = buildCompilerFlags();
      const cacheKey = formatOptFlag(optLevel) + " " + cFlags.join(" ");
      try {
        const res = await workerClient.call("compile", {
          source,
          stdin: "",
          args: [],
          optLevel,
          compilerFlags: cFlags,
          ...(currentExtraModules ? { extraModules: currentExtraModules } : {}),
        });
        if (res.ts) rawTs = String(res.ts);
        if (res.c !== undefined || res.cError !== undefined) {
          lastCSource = source;
          lastCOptLevel = cacheKey;
          if (res.c) {
            rawC = String(res.c);
            cMessage = "";
          } else {
            rawC = "";
            cMessage = formatCOutput("", res.cError);
          }
        }
        renderCodeViews();
        const diagnostics = Array.isArray(res.diagnostics) ? res.diagnostics : [];
        consoleState.lastOutputData = {
          statusText: res.ok ? "Compiled" : "Compile error",
          exitCode: res.ok ? 0 : 1,
          optFlag: formatOptFlag(optLevel),
          compileMs: res.timings ? res.timings.compileMs : null,
          runMs: null,
          diagnostics,
          tones: [],
          files: consoleState.lastFiles,
        };
        renderOutputCards();
        if (!res.ok) {
          editorCtrl.setErrorFromStderr(res.stderr || "");
          showTab("console");
          appendConsoleCommand("lite compile " + formatOptFlag(optLevel) + " " + currentProgramLabel());
          appendConsoleSpan("stderr", (res.stderr || "Compilation failed.") + "\\n");
          appendConsoleExit(1, res.timings && res.timings.compileMs);
          statusEl.textContent = "Compile error";
          syncConsolePromptUi();
          return;
        }
        showTab("generated");
        statusEl.textContent = "Compiled to TypeScript" + (res.c ? " & C" : "") + " (" + formatOptFlag(optLevel) + ")";
      } catch (err) {
        showTab("console");
        appendConsoleSpan("stderr", (err instanceof Error ? err.message : String(err)) + "\\n");
        appendConsoleExit(1, null);
        statusEl.textContent = "Worker error";
        syncConsolePromptUi();
      }
      return;
    }

    showTab("console");
    const cmdLine = formatCommandLine(args, isInteractiveRun ? "" : stdin);
    appendConsoleCommand(cmdLine);

    const runId = ++consoleState.activeRunId;
    setConsoleRunning(true);
    consoleState.waitingStdin = false;
    consoleState.fallbackSession = null;
    const useSab = isInteractiveRun && typeof SharedArrayBuffer === "function" && Boolean(self.crossOriginIsolated);
    let sharedCtrlBuf = null;
    let sharedDataBuf = null;
    if (useSab) {
      sharedCtrlBuf = new SharedArrayBuffer(16);
      sharedDataBuf = new SharedArrayBuffer(65536);
      consoleState.sharedCtrl = new Int32Array(sharedCtrlBuf);
      consoleState.sharedData = new Uint8Array(sharedDataBuf);
    } else {
      consoleState.sharedCtrl = null;
      consoleState.sharedData = null;
    }
    syncConsolePromptUi();

    const playCompilerFlags = buildCompilerFlags();
    let streamedAny = false;
    try {
      const res = await workerClient.call(
        "play",
        {
          source,
          stdin: isInteractiveRun ? "" : stdin,
          args,
          optLevel,
          compilerFlags: playCompilerFlags,
          interactive: isInteractiveRun,
          stdinClosed: !isInteractiveRun,
          streamOutput: true,
          sharedCtrl: sharedCtrlBuf,
          sharedData: sharedDataBuf,
          ...(currentExtraModules ? { extraModules: currentExtraModules } : {}),
        },
        (ev) => {
          if (runId !== consoleState.activeRunId) return;
          if (ev.event === "stdout" && ev.text) {
            streamedAny = true;
            appendConsoleSpan("stdout", ev.text);
          } else if (ev.event === "stderr" && ev.text) {
            streamedAny = true;
            appendConsoleSpan("stderr", ev.text);
          } else if (ev.event === "stdin-wait") {
            consoleState.waitingStdin = true;
            statusEl.textContent = "Waiting for input...";
            syncConsolePromptUi();
            if (consoleInputEl) consoleInputEl.focus({ preventScroll: true });
          }
        },
      );
      if (runId !== consoleState.activeRunId) return;
      if (res.needsStdin && isInteractiveRun) {
        setConsoleRunning(false);
        consoleState.waitingStdin = true;
        consoleState.fallbackSession = {
          source,
          args,
          extraModules: currentExtraModules,
          optLevel,
          stdinSoFar: "",
          printedStdoutLen: String(res.stdout || "").length,
          printedStderrLen: String(res.stderr || "").length,
        };
        if (!streamedAny && res.stdout) appendConsoleSpan("stdout", res.stdout);
        statusEl.textContent = "Waiting for input...";
        syncConsolePromptUi();
        if (consoleInputEl) consoleInputEl.focus({ preventScroll: true });
        return;
      }
      setConsoleRunning(false);
      consoleState.waitingStdin = false;
      consoleState.sharedCtrl = null;
      consoleState.sharedData = null;
      finalizePlayResult(res, optLevel, source, streamedAny);
    } catch (err) {
      if (runId !== consoleState.activeRunId) return;
      setConsoleRunning(false);
      consoleState.waitingStdin = false;
      consoleState.sharedCtrl = null;
      consoleState.sharedData = null;
      setCanvasEnabled(false);
      showTab("console");
      appendConsoleSpan("stderr", (err instanceof Error ? err.message : String(err)) + "\\n");
      appendConsoleExit(1, null);
      statusEl.textContent = "Worker error";
      syncConsolePromptUi();
    }
  }

  function runConsoleCommand(rawLine) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (consoleState.lastCommand) {
        runConsoleCommand(consoleState.lastCommand);
      }
      return;
    }
    const tokens = trimmed.split(/\\s+/);
    const head = tokens[0];
    if (head === "clear" || head === "cls") {
      clearConsoleLog();
      return;
    }
    if (head === "help") {
      appendConsoleCommand("help");
      appendConsoleSpan(
        "sys",
        "Commands:\\n" +
        "  run [args...]           Run current program interactively\\n" +
        "  lite run <file> [args]  Run current program interactively\\n" +
        "  compile [-O0..-O3|-Os]  Compile to TS & C\\n" +
        "  ls                      List files written to VFS\\n" +
        "  cat <path>              Print a VFS file\\n" +
        "  clear                   Clear console scrollback\\n" +
        "Shortcuts: Enter (empty) re-runs last command · Up/Right/Tab recall · Ctrl+D EOF · Ctrl+C kill\\n",
      );
      syncConsolePromptUi();
      return;
    }
    if (head === "ls") {
      appendConsoleCommand("ls");
      if (consoleState.lastFiles.length === 0) {
        appendConsoleSpan("sys", "(no virtual files written yet)\\n");
      } else {
        appendConsoleSpan("stdout", consoleState.lastFiles.map((f) => f.path + " (" + formatBytes(f.size) + ")").join("\\n") + "\\n");
      }
      syncConsolePromptUi();
      return;
    }
    if (head === "cat") {
      appendConsoleCommand(trimmed);
      const targetPath = tokens.slice(1).join(" ");
      const found = consoleState.lastFiles.find((f) => f.path === targetPath || f.path.endsWith("/" + targetPath));
      if (!found) {
        appendConsoleSpan("stderr", "cat: " + (targetPath || "(missing path)") + ": No such virtual file\\n");
      } else if (found.isText && typeof found.textPreview === "string") {
        appendConsoleSpan("stdout", found.textPreview + (found.textPreview.endsWith("\\n") ? "" : "\\n"));
      } else {
        appendConsoleSpan("sys", "(" + found.path + ": binary file, " + formatBytes(found.size) + ")\\n");
      }
      syncConsolePromptUi();
      return;
    }
    if (head === "compile" || (head === "lite" && tokens[1] === "compile")) {
      const rest = head === "lite" ? tokens.slice(2) : tokens.slice(1);
      let nextOpt = readOptLevel();
      for (const tok of rest) {
        if (tok === "-Os") nextOpt = 4;
        else if (tok === "-Oc") nextOpt = 5;
        else if (/^-O[0-3]$/.test(tok)) nextOpt = Number(tok.slice(2));
      }
      compilerOpts.preset = nextOpt;
      saveCompilerOpts();
      syncCompilerOptsUi();
      invalidateCompiledCache();
      void runAction("compile", { optLevel: nextOpt });
      return;
    }
    if (head === "run" || (head === "lite" && tokens[1] === "run")) {
      let rest = head === "lite" ? tokens.slice(2) : tokens.slice(1);
      if (head === "lite" && rest[0] && rest[0].endsWith(".lts")) rest = rest.slice(1);
      const pipeIdx = rest.indexOf("<<<");
      let cmdArgs = rest;
      let pipedStdin = "";
      let interactive = true;
      if (pipeIdx !== -1) {
        cmdArgs = rest.slice(0, pipeIdx);
        pipedStdin = rest.slice(pipeIdx + 1).join(" ").replace(/^"|"$/g, "").replaceAll("\\\\n", "\\n");
        interactive = false;
      }
      argsEl.value = cmdArgs.join(" ");
      stage.unlockAudio();
      void runAction("play", { args: cmdArgs, stdin: pipedStdin, interactive });
      return;
    }
    appendConsoleCommand(trimmed);
    appendConsoleSpan("stderr", "Unknown command: " + head + " (type 'help' for commands)\\n");
    syncConsolePromptUi();
  }

  if (consoleEl && consoleInputEl) {
    consoleEl.addEventListener("click", () => {
      const sel = typeof window.getSelection === "function" ? String(window.getSelection() || "") : "";
      if (!sel && !consoleInputRow.hidden) consoleInputEl.focus({ preventScroll: true });
    });
    consoleInputEl.addEventListener("input", syncConsolePromptUi);
    consoleInputEl.addEventListener("keydown", (ev) => {
      if (ev.ctrlKey && !ev.metaKey && !ev.altKey && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        if (consoleState.waitingStdin) sendStdinEof();
        return;
      }
      if (ev.ctrlKey && !ev.metaKey && !ev.altKey && ev.key.toLowerCase() === "c") {
        const sel = typeof window.getSelection === "function" ? String(window.getSelection() || "") : "";
        if (!sel && (consoleState.running || consoleState.waitingStdin)) {
          ev.preventDefault();
          killActiveRun(true);
        }
        return;
      }
      if (ev.key === "Enter") {
        ev.preventDefault();
        const val = consoleInputEl.value;
        consoleInputEl.value = "";
        if (consoleState.waitingStdin) {
          sendStdinLine(val);
        } else {
          runConsoleCommand(val);
        }
        syncConsolePromptUi();
        return;
      }
      if (!consoleState.waitingStdin) {
        if (ev.key === "ArrowUp") {
          ev.preventDefault();
          if (consoleState.history.length > 0) {
            consoleState.historyIdx = Math.max(0, consoleState.historyIdx - 1);
            consoleInputEl.value = consoleState.history[consoleState.historyIdx] || "";
            syncConsolePromptUi();
          } else if (consoleState.lastCommand) {
            consoleInputEl.value = consoleState.lastCommand;
            syncConsolePromptUi();
          }
          return;
        }
        if (ev.key === "ArrowDown") {
          ev.preventDefault();
          if (consoleState.history.length > 0) {
            consoleState.historyIdx = Math.min(consoleState.history.length, consoleState.historyIdx + 1);
            consoleInputEl.value = consoleState.history[consoleState.historyIdx] || "";
            syncConsolePromptUi();
          }
          return;
        }
        if ((ev.key === "ArrowRight" || ev.key === "Tab") && consoleInputEl.value === "" && consoleState.lastCommand) {
          ev.preventDefault();
          consoleInputEl.value = consoleState.lastCommand;
          syncConsolePromptUi();
        }
      }
    });
    consoleEl.addEventListener("keydown", (ev) => {
      if (ev.ctrlKey && !ev.metaKey && !ev.altKey && ev.key.toLowerCase() === "c") {
        const sel = typeof window.getSelection === "function" ? String(window.getSelection() || "") : "";
        if (!sel && (consoleState.running || consoleState.waitingStdin)) {
          ev.preventDefault();
          killActiveRun(true);
        }
      }
    });
  }
  if (eofBtn) eofBtn.addEventListener("click", () => { sendStdinEof(); });
  if (killBtn) killBtn.addEventListener("click", () => { killActiveRun(true); });
  if (clearConsoleBtn) clearConsoleBtn.addEventListener("click", () => {
    clearConsoleLog();
    if (consoleInputEl) consoleInputEl.focus({ preventScroll: true });
  });

  resetBtn.addEventListener("click", () => {
    stage.unlockAudio();
    if (activeSnipId && loadSnip(activeSnipId)) return;
    if (activeLibraryItem) { loadLibraryItem(activeLibraryItem); return; }
    void loadSample((currentSample && currentSample.id) || "${escapeHtml(defaultSampleId)}", "load");
  });
  compileBtn.addEventListener("click", () => { void runAction("compile"); });
  playBtn.addEventListener("click", () => { stage.unlockAudio(); void runAction("play"); });

  const shareModal = document.getElementById("pg-share-modal");
  const shareCloseBtn = document.getElementById("pg-share-close");
  const shareUrlEl = document.getElementById("pg-share-url");
  const shareMetaEl = document.getElementById("pg-share-meta");
  const shareCopyBtn = document.getElementById("pg-share-copy");
  let shareCopyTimer = 0;
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      const encoded = encodeSharePayload({
        title: titleEl ? titleEl.textContent || "Shared Sketch" : "Shared Sketch",
        code: editorEl.value,
        stdin: parseStdin(),
        args: argsEl.value,
      });
      const shareUrl = new URL(window.location.href);
      shareUrl.search = "";
      shareUrl.hash = "#code=" + encoded;
      const urlText = String(shareUrl);
      if (shareUrlEl) shareUrlEl.value = urlText;
      if (shareMetaEl) shareMetaEl.textContent = String(urlText.length) + " chars";
      if (shareModal) {
        shareModal.hidden = false;
        if (shareUrlEl) {
          shareUrlEl.focus();
          if (typeof shareUrlEl.select === "function") shareUrlEl.select();
        }
      }
      statusEl.hidden = false;
      statusEl.textContent = "Share link ready";
    });
  }
  if (shareModal) {
    if (shareCloseBtn) {
      shareCloseBtn.addEventListener("click", () => { shareModal.hidden = true; });
    }
    shareModal.addEventListener("click", (ev) => {
      if (ev.target === shareModal) shareModal.hidden = true;
    });
    if (shareCopyBtn && shareUrlEl) {
      shareCopyBtn.addEventListener("click", () => {
        const text = shareUrlEl.value || "";
        if (!text) return;
        const markCopied = () => {
          shareCopyBtn.textContent = "Copied";
          if (shareCopyTimer) window.clearTimeout(shareCopyTimer);
          shareCopyTimer = window.setTimeout(() => { shareCopyBtn.textContent = "Copy Link"; }, 1600);
          statusEl.hidden = false;
          statusEl.textContent = "Share link copied to clipboard";
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(markCopied, () => {});
        }
      });
    }
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      if (canvasWrap && canvasWrap.classList.contains("is-fullscreen")) {
        canvasWrap.classList.remove("is-fullscreen");
        syncFullscreenUi();
      }
      if (sketchesModal && !sketchesModal.hidden) sketchesModal.hidden = true;
      if (compilerOptsModal && !compilerOptsModal.hidden) compilerOptsModal.hidden = true;
      if (shareModal && !shareModal.hidden) shareModal.hidden = true;
    }
  });

  let copyTimer = 0;
  copyBtn.addEventListener("click", () => {
    const target = activeTab === "generated"
      ? generatedCodeEl
      : activeTab === "output"
        ? outputCardsEl
        : consoleLogEl;
    const text = target ? target.textContent || "" : "";
    if (!text) return;
    const markCopied = () => {
      copyBtn.textContent = "Copied";
      copyBtn.classList.add("copied");
      if (copyTimer) window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("copied");
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(markCopied, () => {});
    }
  });

  function loadSnip(id) {
    if (!snipsApi) return false;
    const snip = snipsApi.get(id);
    if (!snip) return false;
    stopPlay(true);
    editorCtrl.clearErrors();
    activeSnipId = snip.id;
    activeLibraryItem = null;
    currentSample = null;
    currentExtraModules = snip.extraModules || null;
    currentEnvironment = snip.environment || "universal";
    editorCtrl.setValue(snip.code);
    stdinEl.value = String(snip.stdin || "").replaceAll("\\n", "\\\\n");
    argsEl.value = String(snip.args || "");
    if (titleEl) titleEl.textContent = snip.title;
    fileEl.textContent = snip.title + " · " + snip.id.slice(0, 8);
    rawTs = "";
    rawC = "";
    cMessage = "/* Press Compile or open Generated C to emit C. */";
    lastCSource = null;
    renderCodeViews();
    setBaseline();
    clearConsoleLog();
    consoleState.lastCommand = formatCommandLine(parseArgs(), "");
    if (currentEnvironment === "cli") {
      appendConsoleSpan("sys", "(CLI / Host OS sketch — press Compile for TS/C, or run locally with ./bin/lite run)\\n");
      statusEl.textContent = "Loaded CLI sketch: " + snip.title;
    } else {
      appendConsoleSpan("sys", "Loaded sketch: " + snip.title + " — press Play or Enter to run\\n");
      statusEl.textContent = "Loaded sketch: " + snip.title;
    }
    syncConsolePromptUi();
    renderOutputCards();
    setPlaygroundQuery("snip", snip.id);
    syncSnipsBadge();
    return true;
  }

  function loadLibraryItem(item) {
    if (!item) return;
    if (item.sampleId && byId.has(item.sampleId)) {
      void loadSample(item.sampleId, "load");
      return;
    }
    stopPlay(true);
    editorCtrl.clearErrors();
    activeSnipId = null;
    activeLibraryItem = item;
    currentSample = null;
    currentExtraModules = item.extraModules || null;
    currentEnvironment = item.environment || "universal";
    editorCtrl.setValue(item.source);
    stdinEl.value = String(item.stdin || "").replaceAll("\\n", "\\\\n");
    argsEl.value = Array.isArray(item.args) ? item.args.join(" ") : "";
    if (titleEl) titleEl.textContent = item.title;
    fileEl.textContent = item.file || item.title;
    rawTs = "";
    rawC = "";
    cMessage = "/* Press Compile or open Generated C to emit C. */";
    lastCSource = null;
    renderCodeViews();
    setBaseline();
    clearConsoleLog();
    consoleState.lastCommand = formatCommandLine(parseArgs(), "");
    if (currentEnvironment === "cli") {
      appendConsoleSpan("sys", "(CLI / Host OS source — press Compile for TS/C, or run locally with ./bin/lite run " + (item.file || "file.lts") + ")\\n");
      statusEl.textContent = "Loaded CLI " + item.badge + ": " + item.title;
    } else {
      appendConsoleSpan("sys", "Loaded " + item.badge + ": " + item.title + " — press Play or Enter to run\\n");
      statusEl.textContent = "Loaded " + item.badge + ": " + item.title;
    }
    syncConsolePromptUi();
    renderOutputCards();
    setPlaygroundQuery(item.category || "piece", item.slug || item.id);
  }

  const sketchesBtn = document.getElementById("pg-sketches-btn");
  const sketchesModal = document.getElementById("pg-sketches-modal");
  const sketchesClose = document.getElementById("pg-sketches-close");
  const sketchesNew = document.getElementById("pg-sketches-new");
  const sketchesClear = document.getElementById("pg-sketches-clear");
  const sketchesFilter = document.getElementById("pg-sketches-filter");
  const sketchesSummary = document.getElementById("pg-sketches-summary");
  const sketchesTagsEl = document.getElementById("pg-sketches-tags");
  const sketchesList = document.getElementById("pg-sketches-list");
  const catTabs = Array.from(document.querySelectorAll("#pg-sketches-cat-tabs .snips-cat-tab"));
  const POPULAR_TAGS = ["canvas", "surface", "audio", "game", "play", "input", "args", "output", "file", "loops", "collections", "math", "cli"];
  let activeCat = "all";
  let activeTag = "";
  let clearArmed = false;

  function renderTagBar() {
    if (!sketchesTagsEl) return;
    sketchesTagsEl.innerHTML = "";
    const availableCounts = new Map();
    if (Array.isArray(libraryItems)) {
      for (const item of libraryItems) {
        if (activeCat !== "all" && activeCat !== "saved" && item.category !== activeCat) continue;
        for (const tag of Array.isArray(item.tags) ? item.tags : []) {
          availableCounts.set(tag, (availableCounts.get(tag) || 0) + 1);
        }
      }
    }
    const tagsToShow = POPULAR_TAGS.filter((t) => !libraryItems || (availableCounts.get(t) || 0) > 0 || t === activeTag);
    for (const tag of tagsToShow) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "snips-tag-chip";
      const count = availableCounts.get(tag);
      btn.textContent = "#" + tag + (count ? " " + String(count) : "");
      btn.setAttribute("aria-pressed", activeTag === tag ? "true" : "false");
      btn.addEventListener("click", () => {
        activeTag = activeTag === tag ? "" : tag;
        renderTagBar();
        renderSketchesList();
      });
      sketchesTagsEl.appendChild(btn);
    }
  }

  function renderSavedRow(item) {
    const row = document.createElement("article");
    row.className = "snips-item" + (item.id === activeSnipId ? " active" : "");

    const head = document.createElement("div");
    head.className = "snips-item-head";

    const titleSpan = document.createElement("span");
    titleSpan.className = "snips-item-title";
    titleSpan.textContent = item.title;
    head.appendChild(titleSpan);

    const meta = document.createElement("div");
    meta.className = "snips-item-meta";
    const idCode = document.createElement("code");
    idCode.textContent = item.id;
    const originSpan = document.createElement("span");
    originSpan.className = "badge";
    originSpan.textContent = "Saved · " + (item.origin || "custom");
    const dateSpan = document.createElement("span");
    dateSpan.textContent = String(item.updatedAt || "").slice(0, 16).replace("T", " ");
    meta.appendChild(idCode);
    meta.appendChild(originSpan);
    meta.appendChild(dateSpan);

    const preview = document.createElement("pre");
    preview.className = "snips-preview";
    preview.textContent = (item.code.split("\\n").find((l) => l.trim() !== "") || "(empty)").trim();

    const actions = document.createElement("div");
    actions.className = "snips-item-actions";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-primary";
    openBtn.textContent = item.id === activeSnipId ? "Loaded" : "Open";
    openBtn.addEventListener("click", () => {
      loadSnip(item.id);
      if (sketchesModal) sketchesModal.hidden = true;
    });

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn";
    renameBtn.textContent = "Rename";
    renameBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "snips-rename-input";
      input.value = item.title;
      input.setAttribute("aria-label", "New title for sketch");
      const saveTitleBtn = document.createElement("button");
      saveTitleBtn.type = "button";
      saveTitleBtn.className = "btn btn-primary";
      saveTitleBtn.textContent = "Save Title";
      const wrap = document.createElement("div");
      wrap.className = "snips-rename-row";
      wrap.appendChild(input);
      wrap.appendChild(saveTitleBtn);
      head.replaceChild(wrap, titleSpan);
      input.focus();
      input.select();
      const commitRename = () => {
        const nextTitle = input.value.trim();
        if (nextTitle) {
          snipsApi.update(item.id, { title: nextTitle });
          if (item.id === activeSnipId) {
            if (titleEl) titleEl.textContent = nextTitle;
            fileEl.textContent = nextTitle + " · " + item.id.slice(0, 8);
          }
        }
        renderSketchesList();
      };
      saveTitleBtn.addEventListener("click", commitRename);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") { ev.preventDefault(); commitRename(); }
        else if (ev.key === "Escape") { ev.preventDefault(); renderSketchesList(); }
      });
    });

    const dupBtn = document.createElement("button");
    dupBtn.type = "button";
    dupBtn.className = "btn";
    dupBtn.textContent = "Duplicate";
    dupBtn.addEventListener("click", () => {
      snipsApi.saveNew({
        title: item.title + " (copy)",
        code: item.code,
        stdin: item.stdin,
        args: item.args,
        origin: item.origin,
        extraModules: item.extraModules || null,
        environment: item.environment || "universal",
      });
      syncSnipsBadge();
      renderSketchesList();
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      snipsApi.remove(item.id);
      if (item.id === activeSnipId) activeSnipId = null;
      syncSnipsBadge();
      renderSketchesList();
    });

    actions.appendChild(openBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);

    row.appendChild(head);
    row.appendChild(meta);
    row.appendChild(preview);
    row.appendChild(actions);
    return row;
  }

  function renderLibraryRow(item) {
    const isLoaded = Boolean(
      (item.sampleId && currentSample && currentSample.id === item.sampleId && !activeSnipId) ||
      (activeLibraryItem && activeLibraryItem.id === item.id),
    );
    const row = document.createElement("article");
    row.className = "snips-item" + (isLoaded ? " active" : "");

    const head = document.createElement("div");
    head.className = "snips-item-head";
    const titleSpan = document.createElement("span");
    titleSpan.className = "snips-item-title";
    titleSpan.textContent = item.title;
    const catBadge = document.createElement("span");
    catBadge.className = "badge";
    catBadge.textContent = item.badge || item.category;
    head.appendChild(titleSpan);
    head.appendChild(catBadge);

    const meta = document.createElement("div");
    meta.className = "snips-item-meta";
    const fileCode = document.createElement("code");
    fileCode.textContent = item.file;
    meta.appendChild(fileCode);

    const itemTags = Array.isArray(item.tags) ? item.tags : [];
    let tagsWrap = null;
    if (itemTags.length > 0) {
      tagsWrap = document.createElement("div");
      tagsWrap.className = "snips-item-tags";
      for (const tag of itemTags.slice(0, 8)) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "snips-item-tag";
        chip.textContent = "#" + tag;
        chip.addEventListener("click", () => {
          activeTag = activeTag === tag ? "" : tag;
          renderTagBar();
          renderSketchesList();
        });
        tagsWrap.appendChild(chip);
      }
    }

    const preview = document.createElement("pre");
    preview.className = "snips-preview";
    preview.textContent = (String(item.source || "").split("\\n").find((l) => l.trim() !== "") || "(empty)").trim();

    const actions = document.createElement("div");
    actions.className = "snips-item-actions";
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-primary";
    openBtn.textContent = isLoaded ? "Loaded" : "Load";
    openBtn.addEventListener("click", () => {
      loadLibraryItem(item);
      if (sketchesModal) sketchesModal.hidden = true;
    });
    actions.appendChild(openBtn);

    row.appendChild(head);
    row.appendChild(meta);
    if (tagsWrap) row.appendChild(tagsWrap);
    row.appendChild(preview);
    row.appendChild(actions);
    return row;
  }

  function scoreLibraryMatch(item, queryTokens) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const title = String(item.title || "").toLowerCase();
    const file = String(item.file || "").toLowerCase();
    const badge = String(item.badge || "").toLowerCase();
    const source = String(item.source || "").toLowerCase();
    let score = 0;
    for (const rawTok of queryTokens) {
      const tok = rawTok.replace(/^#/, "");
      if (!tok) continue;
      if (tags.includes(tok)) { score += 50; continue; }
      if (tags.some((t) => t.startsWith(tok))) { score += 35; continue; }
      if (title.includes(tok)) { score += 20; continue; }
      if (file.includes(tok) || badge.includes(tok)) { score += 12; continue; }
      if (source.includes(tok)) { score += 3; continue; }
      return 0;
    }
    return score;
  }

  function renderSketchesList() {
    if (!sketchesList) return;
    const savedAll = snipsApi ? snipsApi.list() : [];
    const libAll = Array.isArray(libraryItems) ? libraryItems : [];
    const q = sketchesFilter ? sketchesFilter.value.trim().toLowerCase() : "";
    const queryTokens = q ? q.split(/\\s+/).filter(Boolean) : [];

    const showSaved = (activeCat === "all" || activeCat === "saved") && !activeTag;
    const filteredSaved = showSaved
      ? (q
          ? savedAll.filter((item) =>
              item.title.toLowerCase().includes(q) ||
              item.id.toLowerCase().includes(q) ||
              item.origin.toLowerCase().includes(q) ||
              item.code.toLowerCase().includes(q),
            )
          : savedAll)
      : [];

    const scoredLib = [];
    if (activeCat !== "saved") {
      for (const item of libAll) {
        if (activeCat !== "all" && item.category !== activeCat) continue;
        const itemTags = Array.isArray(item.tags) ? item.tags : [];
        if (activeTag && !itemTags.includes(activeTag)) continue;
        if (queryTokens.length === 0) {
          scoredLib.push({ item, score: 1 });
        } else {
          const s = scoreLibraryMatch(item, queryTokens);
          if (s > 0) scoredLib.push({ item, score: s });
        }
      }
    }
    if (queryTokens.length > 0) {
      scoredLib.sort((a, b) => b.score - a.score);
    }
    const filteredLib = scoredLib.map((entry) => entry.item);

    const totalShown = filteredSaved.length + filteredLib.length;
    if (sketchesSummary) {
      sketchesSummary.textContent = totalShown + " items" + (!libraryItems && activeCat !== "saved" ? " (loading library...)" : "");
    }

    sketchesList.innerHTML = "";
    if (totalShown === 0) {
      const empty = document.createElement("div");
      empty.className = "gym-result-empty";
      empty.textContent = activeCat === "saved" && savedAll.length === 0
        ? "No saved sketches in localStorage yet. Modify any code and click the Save icon or + New Sketch."
        : "No matching code entries.";
      sketchesList.appendChild(empty);
      return;
    }

    for (const item of filteredSaved) {
      sketchesList.appendChild(renderSavedRow(item));
    }
    const libCap = activeCat === "all" && !q ? 80 : 250;
    for (const item of filteredLib.slice(0, libCap)) {
      sketchesList.appendChild(renderLibraryRow(item));
    }
  }

  if (saveSnipBtn && snipsApi) {
    saveSnipBtn.addEventListener("click", () => {
      const cleanStdin = stdinEl.value.replaceAll("\\\\n", "\\n");
      if (activeSnipId) {
        const updated = snipsApi.update(activeSnipId, {
          code: editorEl.value,
          stdin: cleanStdin,
          args: argsEl.value,
          extraModules: currentExtraModules,
          environment: currentEnvironment,
        });
        if (updated) {
          setBaseline();
          if (titleEl) titleEl.textContent = updated.title;
          fileEl.textContent = updated.title + " · " + updated.id.slice(0, 8);
          statusEl.textContent = "Saved sketch (" + updated.id.slice(0, 8) + ")";
          setPlaygroundQuery("snip", updated.id);
          syncSnipsBadge();
          return;
        }
      }
      const defaultTitle = activeLibraryItem
        ? activeLibraryItem.title
        : currentSample && currentSample.id
          ? (byId.get(currentSample.id)?.title ?? currentSample.id)
          : "Custom Sketch";
      const defaultOrigin = activeLibraryItem
        ? activeLibraryItem.id
        : currentSample
          ? "sample:" + currentSample.id
          : "playground";
      const created = snipsApi.saveNew({
        title: defaultTitle,
        code: editorEl.value,
        stdin: cleanStdin,
        args: argsEl.value,
        origin: defaultOrigin,
        extraModules: currentExtraModules,
        environment: currentEnvironment,
      });
      if (created) {
        activeSnipId = created.id;
        activeLibraryItem = null;
        currentSample = null;
        setBaseline();
        if (titleEl) titleEl.textContent = created.title;
        fileEl.textContent = created.title + " · " + created.id.slice(0, 8);
        statusEl.textContent = "Saved new sketch (" + created.id.slice(0, 8) + ")";
        setPlaygroundQuery("snip", created.id);
        syncSnipsBadge();
      }
    });
  }

  for (const tab of catTabs) {
    tab.addEventListener("click", () => {
      activeCat = tab.dataset.cat || "all";
      for (const t of catTabs) t.setAttribute("aria-pressed", t === tab ? "true" : "false");
      renderTagBar();
      renderSketchesList();
    });
  }

  if (sketchesBtn && sketchesModal) {
    sketchesBtn.addEventListener("click", () => {
      clearArmed = false;
      if (sketchesClear) sketchesClear.textContent = "Clear Saved";
      renderTagBar();
      renderSketchesList();
      sketchesModal.hidden = false;
      if (sketchesFilter) sketchesFilter.focus();
      if (!libraryItems) {
        void loadLibraryCatalog().then(() => {
          renderTagBar();
          renderSketchesList();
        });
      }
    });
    if (sketchesClose) {
      sketchesClose.addEventListener("click", () => { sketchesModal.hidden = true; });
    }
    sketchesModal.addEventListener("click", (ev) => {
      if (ev.target === sketchesModal) sketchesModal.hidden = true;
    });
    if (sketchesFilter) {
      sketchesFilter.addEventListener("input", renderSketchesList);
    }
    if (sketchesNew) {
      sketchesNew.addEventListener("click", () => {
        killActiveRun(false);
        stopPlay(true);
        editorCtrl.clearErrors();
        activeSnipId = null;
        activeLibraryItem = null;
        currentSample = null;
        currentExtraModules = null;
        currentEnvironment = "universal";
        editorCtrl.setValue('io := import "core/io";\\n\\nio.outputLine("Hello from Lite!");\\n');
        stdinEl.value = "";
        argsEl.value = "";
        if (titleEl) titleEl.textContent = "Custom Sketch";
        fileEl.textContent = "playground.lts";
        rawTs = "";
        rawC = "";
        cMessage = "/* Press Compile or select C to emit C. */";
        lastCSource = null;
        renderCodeViews();
        setBaseline();
        clearConsoleLog();
        consoleState.lastCommand = formatCommandLine([], "");
        appendConsoleSpan("sys", "New sketch ready — press Play to run or Save to store\\n");
        syncConsolePromptUi();
        renderOutputCards();
        statusEl.textContent = "New sketch";
        setPlaygroundQuery("", "");
        sketchesModal.hidden = true;
      });
    }
    if (sketchesClear && snipsApi) {
      sketchesClear.addEventListener("click", () => {
        if (!clearArmed) {
          clearArmed = true;
          sketchesClear.textContent = "Confirm Clear Saved";
          return;
        }
        clearArmed = false;
        sketchesClear.textContent = "Clear Saved";
        snipsApi.clear();
        activeSnipId = null;
        syncSnipsBadge();
        renderSketchesList();
        updateDirtyState();
        statusEl.textContent = "Cleared saved sketches";
      });
    }
  }

  const STARTER_TEMPLATES = {
    hello: {
      title: "Hello Lite",
      code: 'io := import "core/io";\\n\\nio.outputLine("Hello from Lite Play Studio!");\\n',
      stdin: "",
      args: "",
    },
    stdin: {
      title: "Input & Loops",
      code: 'io := import "core/io";\\ninteger := import "core/int";\\n\\nvar i := 0;\\nloop i < 3 {\\n  line := io.inputLine("");\\n  io.outputLine(integer.intText(i + 1) + ": " + line);\\n  i += 1;\\n}\\n',
      stdin: "alpha\\nbeta\\ngamma",
      args: "",
    },
    canvas: {
      title: "Canvas Scene",
      code: 'canvas := import "extra/canvas";\\n\\n_ctx := canvas.create(width = 160, height = 100, title = "Lite Canvas");\\ncanvas.clear(canvas.rgb(11, 12, 14));\\ncanvas.fillRect(20, 20, 120, 60, canvas.rgb(201, 123, 20));\\ncanvas.fillRect(36, 36, 88, 28, canvas.rgb(240, 180, 90));\\n',
      stdin: "",
      args: "",
    },
    play: {
      title: "Play Loop",
      code: 'canvas := import "extra/canvas";\\n\\nvar x := 10;\\n_ctx := canvas.play(width = 160, height = 96, title = "Moving Block");\\nonCanvasUpdate := fn(dt: Float): Int {\\n  _dt := dt;\\n  x = (x + 2) % 140;\\n  canvas.clear(canvas.rgb(20, 18, 16));\\n  canvas.fillRect(x, 36, 20, 20, canvas.rgb(240, 180, 90));\\n  0\\n};\\ncanvas.clear(canvas.rgb(20, 18, 16));\\ncanvas.fillRect(x, 36, 20, 20, canvas.rgb(240, 180, 90));\\n',
      stdin: "",
      args: "",
    },
  };
  function loadTemplate(key, autoRun) {
    const tpl = key ? STARTER_TEMPLATES[key] : null;
    if (!tpl) return;
    killActiveRun(false);
    stopPlay(true);
    editorCtrl.clearErrors();
    activeSnipId = null;
    activeLibraryItem = null;
    currentSample = null;
    currentExtraModules = null;
    currentEnvironment = "universal";
    editorCtrl.setValue(tpl.code);
    stdinEl.value = tpl.stdin.replaceAll("\\n", "\\\\n");
    argsEl.value = tpl.args;
    if (titleEl) titleEl.textContent = tpl.title;
    fileEl.textContent = "playground.lts";
    rawTs = "";
    rawC = "";
    cMessage = "/* Press Compile or select C to emit C. */";
    lastCSource = null;
    renderCodeViews();
    setBaseline();
    clearConsoleLog();
    consoleState.lastCommand = formatCommandLine(parseArgs(), tpl.stdin);
    appendConsoleSpan("sys", "Loaded template: " + tpl.title + " — press Play or Enter to run\\n");
    syncConsolePromptUi();
    renderOutputCards();
    statusEl.textContent = "Loaded template: " + tpl.title;
    setPlaygroundQuery("", "");
    if (sketchesModal) sketchesModal.hidden = true;
    if (autoRun) { stage.unlockAudio(); void runAction("play"); }
  }
  for (const tplBtn of document.querySelectorAll("[data-template]")) {
    tplBtn.addEventListener("click", () => {
      loadTemplate(tplBtn.getAttribute("data-template"), false);
    });
  }

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("lite:snips-changed", syncSnipsBadge);
  }
  syncSnipsBadge();

  const urlParams = new URLSearchParams(window.location.search);
  const initial = urlParams.get("sample") ?? "${escapeHtml(defaultSampleId)}";
  const snipIdParam = urlParams.get("snip");
  const exampleParam = urlParams.get("example");
  const caseParam = urlParams.get("case");
  const pieceParam = urlParams.get("piece");
  const itemParam = urlParams.get("item");
  const rawHash = typeof window !== "undefined" && window.location && window.location.hash ? String(window.location.hash) : "";
  let loadedDraft = false;
  if (rawHash.startsWith("#code=")) {
    const shared = decodeSharePayload(rawHash.slice(6));
    if (shared && typeof shared.code === "string") {
      loadedDraft = true;
      activeSnipId = null;
      activeLibraryItem = null;
      currentSample = null;
      editorCtrl.clearErrors();
      editorCtrl.setValue(shared.code);
      stdinEl.value = String(shared.stdin || "").replaceAll("\\n", "\\\\n");
      argsEl.value = String(shared.args || "");
      if (titleEl) titleEl.textContent = shared.title || "Shared Sketch";
      fileEl.textContent = "shared#code";
      rawTs = "";
      rawC = "";
      cMessage = "/* Press Compile or open Generated C to emit C. */";
      lastCSource = null;
      renderCodeViews();
      setBaseline();
      clearConsoleLog();
      consoleState.lastCommand = formatCommandLine(parseArgs(), "");
      appendConsoleSpan("sys", "Loaded shared sketch — press Play or Enter to run\\n");
      syncConsolePromptUi();
      renderOutputCards();
      statusEl.textContent = "Loaded shared sketch from URL";
    }
  }
  if (!loadedDraft && snipIdParam && loadSnip(snipIdParam)) {
    loadedDraft = true;
  }
  if (!loadedDraft && (exampleParam || caseParam || pieceParam || itemParam)) {
    loadedDraft = true;
    void loadLibraryCatalog().then((items) => {
      let found = null;
      if (exampleParam) found = items.find((e) => e.category === "example" && e.slug === exampleParam);
      else if (caseParam) found = items.find((e) => e.category === "case" && e.slug === caseParam);
      else if (pieceParam) found = items.find((e) => e.category === "piece" && e.slug === pieceParam);
      else if (itemParam) found = items.find((e) => e.id === itemParam || e.slug === itemParam);
      if (found) loadLibraryItem(found);
      else void loadSample(initial, "load");
    });
  }
  const draftParam = urlParams.get("draft");
  if (!loadedDraft && (draftParam === "gym" || draftParam === "snippet") && typeof sessionStorage !== "undefined") {
    try {
      const rawDraft = sessionStorage.getItem("lite-playground-draft-v1");
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft && typeof draft.source === "string") {
          editorCtrl.setValue(draft.source);
          stdinEl.value = String(draft.stdin || "").replaceAll("\\n", "\\\\n");
          argsEl.value = String(draft.args || "");
          if (titleEl) titleEl.textContent = draft.title || (draftParam === "gym" ? "Gym Draft" : "Snippet");
          fileEl.textContent = "playground.lts";
          rawTs = "";
          rawC = "";
          cMessage = "/* Press Compile or select C to emit C. */";
          lastCSource = null;
          renderCodeViews();
          setBaseline();
          clearConsoleLog();
          consoleState.lastCommand = formatCommandLine(parseArgs(), String(draft.stdin || ""));
          appendConsoleSpan("sys", "Loaded " + (draft.title || "draft") + " — press Play or Enter to run\\n");
          syncConsolePromptUi();
          renderOutputCards();
          statusEl.textContent = "Loaded " + (draft.title || "draft") + " — press Play";
          loadedDraft = true;
        }
      }
    } catch {}
  }
  if (!loadedDraft) void loadSample(initial, "load");
</script>`;
}
