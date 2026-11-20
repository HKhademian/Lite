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
  const outputEl = document.getElementById("pg-output");
  const tsEl = document.getElementById("pg-ts");
  const cEl = document.getElementById("pg-c");
  const codeModesBar = document.getElementById("pg-code-modes");
  const modeButtons = Array.from(document.querySelectorAll(".code-mode-btn"));
  const tabCanvas = document.getElementById("tab-canvas");
  const canvasWrap = document.getElementById("pg-canvas-wrap");
  const canvas = document.getElementById("pg-canvas");
  const canvasTitleEl = document.getElementById("pg-canvas-title");
  const canvasSizeEl = document.getElementById("pg-canvas-size");
  const muteBtn = document.getElementById("pg-mute");
  const fullscreenBtn = document.getElementById("pg-canvas-fullscreen");
  const fpsEl = document.getElementById("pg-fps");
  const tabs = Array.from(document.querySelectorAll(".pg-tab"));
  const panels = {
    output: document.getElementById("panel-output"),
    ts: document.getElementById("panel-ts"),
    c: document.getElementById("panel-c"),
    canvas: document.getElementById("panel-canvas"),
  };

  let activeTab = "output";
  let codeMode = "program";
  let rawTs = "";
  let rawC = "";
  let cMessage = "";
  let currentSample = null;
  let lastCSource = null;
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
      outputEl.textContent = stderr || "Canvas update failed.";
      showTab("output");
    },
  });
  stage.syncPauseUi(false, false);

  function renderCodeViews() {
    tsEl.innerHTML = rawTs ? highlightTs(formatCodeView(rawTs, "ts", codeMode)) : "";
    cEl.innerHTML = rawC ? highlightC(formatCodeView(rawC, "c", codeMode)) : highlightC(cMessage);
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
      panel.hidden = key !== name;
    }
    const showPause = name === "canvas" && stage.isPlayable();
    codeModesBar.hidden = name !== "ts" && name !== "c";
    copyBtn.hidden = name === "canvas";
    pauseBtn.hidden = !showPause;
    statusEl.hidden = showPause && statusEl.textContent !== "Modified";
    if (name === "canvas") stage.resumeLoop();
    else stage.pauseLoop();
    if (name === "c") void compileCForEditor();
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      showTab(tab.dataset.tab);
      if (tab.dataset.tab === "canvas") canvas.focus({ preventScroll: true });
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

  function stopPlay(hideTab) {
    stage.stop();
    if (hideTab) {
      tabCanvas.hidden = true;
      if (activeTab === "canvas") showTab("output");
    }
  }

  async function loadSample(id, mode) {
    const meta = byId.get(id) ?? samples[0];
    if (!meta) return;
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
    cMessage = "/* Press Compile or open Generated C to emit C. */";
    lastCSource = null;
    renderCodeViews();
    if (activeTab === "c") void compileCForEditor();
    argsEl.value = sample.args.join(" ");
    stdinEl.value = sample.stdin.replaceAll("\\n", "\\\\n");
    setBaseline();

    if (mode === "compile") {
      showTab("ts");
      statusEl.textContent = "Compiled to TypeScript";
    } else if (meta.play) {
      await runAction("play");
    } else if (mode === "play") {
      showTab("output");
      outputEl.textContent = "";
      statusEl.textContent = "Running " + meta.file + "...";
      setTimeout(() => {
        outputEl.textContent = sample.output;
        statusEl.textContent = "Exited 0 (verified)";
      }, 100);
    } else if (meta.showOutput) {
      outputEl.textContent = sample.output;
      statusEl.textContent = "Verified output ready";
    } else {
      outputEl.textContent = "(Press Play to run)";
      statusEl.textContent = "Ready — press Play";
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
    if (lastCSource === source) return;
    rawC = "";
    cMessage = "/* Compiling C in browser... */";
    renderCodeViews();
    try {
      const res = await workerClient.call("compile-c", {
        source,
        stdin: "",
        args: [],
        ...(currentExtraModules ? { extraModules: currentExtraModules } : {}),
      });
      if (editorEl.value !== source) return;
      lastCSource = source;
      if (res.c) {
        rawC = String(res.c);
        cMessage = "";
      } else {
        rawC = "";
        cMessage = formatCOutput("", res.stderr);
      }
      renderCodeViews();
    } catch (err) {
      rawC = "";
      cMessage = "/* " + (err instanceof Error ? err.message : String(err)) + " */";
      renderCodeViews();
    }
  }

  async function runAction(action) {
    stopPlay(false);
    editorCtrl.clearErrors();
    const source = editorEl.value;
    const stdin = parseStdin();
    const args = parseArgs();
    statusEl.hidden = false;
    statusEl.textContent = action === "compile" ? "Compiling in browser..." : "Running in browser...";
    if (action === "play") {
      outputEl.textContent = "";
    }
    try {
      const res = await workerClient.call(action, {
        source,
        stdin,
        args,
        ...(currentExtraModules ? { extraModules: currentExtraModules } : {}),
      });
      if (res.ts) rawTs = String(res.ts);
      if (action === "compile" && (res.c !== undefined || res.cError !== undefined)) {
        lastCSource = source;
        if (res.c) {
          rawC = String(res.c);
          cMessage = "";
        } else {
          rawC = "";
          cMessage = formatCOutput("", res.cError);
        }
      }
      renderCodeViews();
      if (!res.ok) {
        editorCtrl.setErrorFromStderr(res.stderr || "");
        tabCanvas.hidden = true;
        showTab("output");
        const isCliFailure =
          currentEnvironment === "cli" ||
          /import\\s+"core\\/(file|path|process|time)"/.test(source);
        const cliHint = isCliFailure && action === "play"
          ? "\\n[host note] This source targets the CLI / Host OS environment; browser mode supports Compile TS/C, while local execution uses ./bin/lite run."
          : "";
        outputEl.textContent = (res.stdout ? res.stdout + "\\n" : "") + (res.stderr || "Execution failed.") + cliHint;
        statusEl.textContent = res.ts ? (isCliFailure ? "CLI / Host OS runtime required" : "Runtime error") : "Compile error";
        return;
      }
      if (action === "compile") {
        if (activeTab !== "c") showTab("ts");
        statusEl.textContent = "Compiled to TypeScript" + (res.c ? " & C" : "");
        return;
      }

      outputEl.textContent = res.stdout + (res.stderr ? (res.stdout ? "\\n" : "") + res.stderr : "");
      if (Array.isArray(res.tones) && res.tones.length > 0) stage.playTones(res.tones);

      const frame = res.play || res.canvas;
      if (frame && frame.width > 0 && frame.height > 0) {
        tabCanvas.hidden = false;
        stage.startSession(frame, Boolean(res.play));
        if (res.play) {
          showTab("canvas");
          stage.syncPauseUi(true, true);
        } else {
          statusEl.textContent = "Rendered canvas (in browser)";
          showTab("canvas");
        }
      } else {
        tabCanvas.hidden = true;
        showTab("output");
        statusEl.textContent = "Exited 0 (in browser)";
      }
    } catch (err) {
      tabCanvas.hidden = true;
      showTab("output");
      outputEl.textContent = err instanceof Error ? err.message : String(err);
      statusEl.textContent = "Worker error";
    }
  }

  resetBtn.addEventListener("click", () => {
    stage.unlockAudio();
    if (activeSnipId && loadSnip(activeSnipId)) return;
    if (activeLibraryItem) { loadLibraryItem(activeLibraryItem); return; }
    void loadSample((currentSample && currentSample.id) || "${escapeHtml(defaultSampleId)}", "load");
  });
  compileBtn.addEventListener("click", () => { void runAction("compile"); });
  playBtn.addEventListener("click", () => { stage.unlockAudio(); void runAction("play"); });

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
      window.history.replaceState({}, "", shareUrl);
      statusEl.hidden = false;
      statusEl.textContent = "Share link encoded in URL";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(String(shareUrl)).then(() => {
          statusEl.textContent = "Share link copied to clipboard";
        }, () => {});
      }
    });
  }

  if (fullscreenBtn && canvasWrap) {
    function setCanvasFullscreen(next) {
      canvasWrap.classList.toggle("is-fullscreen", next);
      fullscreenBtn.setAttribute("aria-pressed", next ? "true" : "false");
      fullscreenBtn.textContent = next ? "Exit Fullscreen" : "Fullscreen";
    }
    fullscreenBtn.addEventListener("click", () => {
      setCanvasFullscreen(!canvasWrap.classList.contains("is-fullscreen"));
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        if (canvasWrap.classList.contains("is-fullscreen")) setCanvasFullscreen(false);
        if (sketchesModal && !sketchesModal.hidden) sketchesModal.hidden = true;
      }
    });
  }

  let copyTimer = 0;
  copyBtn.addEventListener("click", () => {
    const target = activeTab === "ts" ? tsEl : activeTab === "c" ? cEl : outputEl;
    const text = target.textContent || "";
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
    if (currentEnvironment === "cli") {
      outputEl.textContent = "(CLI / Host OS sketch — press Compile for TS/C, or run locally with ./bin/lite run)";
      statusEl.textContent = "Loaded CLI sketch: " + snip.title;
    } else {
      outputEl.textContent = "(Press Play to run)";
      statusEl.textContent = "Loaded sketch: " + snip.title;
    }
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
    if (currentEnvironment === "cli") {
      outputEl.textContent = "(CLI / Host OS source — press Compile for TS/C, or run locally with ./bin/lite run " + (item.file || "file.lts") + ")";
      statusEl.textContent = "Loaded CLI " + item.badge + ": " + item.title;
    } else {
      outputEl.textContent = "(Press Play to run)";
      statusEl.textContent = "Loaded " + item.badge + ": " + item.title;
    }
    setPlaygroundQuery(item.category || "piece", item.slug || item.id);
  }

  const sketchesBtn = document.getElementById("pg-sketches-btn");
  const sketchesModal = document.getElementById("pg-sketches-modal");
  const sketchesClose = document.getElementById("pg-sketches-close");
  const sketchesNew = document.getElementById("pg-sketches-new");
  const sketchesClear = document.getElementById("pg-sketches-clear");
  const sketchesFilter = document.getElementById("pg-sketches-filter");
  const sketchesSummary = document.getElementById("pg-sketches-summary");
  const sketchesList = document.getElementById("pg-sketches-list");
  const catTabs = Array.from(document.querySelectorAll("#pg-sketches-cat-tabs .snips-cat-tab"));
  let activeCat = "all";
  let clearArmed = false;

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
    row.appendChild(preview);
    row.appendChild(actions);
    return row;
  }

  function renderSketchesList() {
    if (!sketchesList) return;
    const savedAll = snipsApi ? snipsApi.list() : [];
    const libAll = Array.isArray(libraryItems) ? libraryItems : [];
    const q = sketchesFilter ? sketchesFilter.value.trim().toLowerCase() : "";

    const showSaved = activeCat === "all" || activeCat === "saved";
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

    const filteredLib = activeCat === "saved"
      ? []
      : libAll.filter((item) => {
          if (activeCat !== "all" && item.category !== activeCat) return false;
          if (!q) return true;
          return (
            item.title.toLowerCase().includes(q) ||
            item.file.toLowerCase().includes(q) ||
            item.badge.toLowerCase().includes(q) ||
            item.source.toLowerCase().includes(q)
          );
        });

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
      renderSketchesList();
    });
  }

  if (sketchesBtn && sketchesModal) {
    sketchesBtn.addEventListener("click", () => {
      clearArmed = false;
      if (sketchesClear) sketchesClear.textContent = "Clear Saved";
      renderSketchesList();
      sketchesModal.hidden = false;
      if (sketchesFilter) sketchesFilter.focus();
      if (!libraryItems) {
        void loadLibraryCatalog().then(() => renderSketchesList());
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
    if (sketchesNew && snipsApi) {
      sketchesNew.addEventListener("click", () => {
        const created = snipsApi.saveNew({
          title: "Custom Sketch",
          code: 'io := import "core/io";\\n\\nio.outputLine("Hello from Lite!");\\n',
          stdin: "",
          args: "",
          origin: "custom",
        });
        if (created) {
          loadSnip(created.id);
          sketchesModal.hidden = true;
        }
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
      code: 'io := import "core/io";\\nformat := import "core/format";\\n\\nlines := io.inputLines();\\nvar i := 0;\\nloop i < 5 and i < format.listCountText(lines) {\\n  io.outputLine(format.intText(i + 1) + ": " + lines[i]);\\n  i = i + 1;\\n}\\n',
      stdin: "alpha\\nbeta\\ngamma",
      args: "",
    },
    canvas: {
      title: "Canvas Scene",
      code: 'canvas := import "extra/canvas";\\n\\ncanvas.open(160, 100, "Lite Canvas");\\ncanvas.clear(0xFF0B0C0E);\\ncanvas.fillRect(20, 20, 120, 60, 0xFFC97B14);\\ncanvas.fillRect(36, 36, 88, 28, 0xFFF0B45A);\\ncanvas.present();\\n',
      stdin: "",
      args: "",
    },
    play: {
      title: "Play Loop",
      code: 'canvas := import "extra/canvas";\\n\\nvar x := 10;\\ncanvas.open(160, 96, "Moving Block");\\nonCanvasUpdate := fn(dt: Float): Bool {\\n  x = (x + 2) % 140;\\n  canvas.clear(0xFF141210);\\n  canvas.fillRect(x, 36, 20, 20, 0xFFF0B45A);\\n  canvas.present();\\n  true\\n};\\ncanvas.present();\\n',
      stdin: "",
      args: "",
    },
  };
  for (const tplBtn of document.querySelectorAll("[data-template]")) {
    tplBtn.addEventListener("click", () => {
      const key = tplBtn.getAttribute("data-template");
      const tpl = key ? STARTER_TEMPLATES[key] : null;
      if (!tpl) return;
      if (snipsApi) {
        const created = snipsApi.saveNew({
          title: tpl.title,
          code: tpl.code,
          stdin: tpl.stdin,
          args: tpl.args,
          origin: "template:" + key,
        });
        if (created) {
          loadSnip(created.id);
          if (sketchesModal) sketchesModal.hidden = true;
          return;
        }
      }
      stopPlay(true);
      editorCtrl.clearErrors();
      editorCtrl.setValue(tpl.code);
      stdinEl.value = tpl.stdin.replaceAll("\\n", "\\\\n");
      argsEl.value = tpl.args;
      if (titleEl) titleEl.textContent = tpl.title;
      setBaseline();
      if (sketchesModal) sketchesModal.hidden = true;
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
      outputEl.textContent = "(Loaded shared sketch — press Play)";
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
  if (!loadedDraft && urlParams.get("draft") === "gym" && typeof sessionStorage !== "undefined") {
    try {
      const rawDraft = sessionStorage.getItem("lite-playground-draft-v1");
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft && typeof draft.source === "string") {
          editorCtrl.setValue(draft.source);
          stdinEl.value = String(draft.stdin || "").replaceAll("\\n", "\\\\n");
          argsEl.value = "";
          fileEl.textContent = (draft.title || "gym") + ".lts";
          rawTs = "";
          rawC = "";
          cMessage = "/* Press Compile or open Generated C to emit C. */";
          lastCSource = null;
          renderCodeViews();
          setBaseline();
          outputEl.textContent = "(Press Play to run)";
          statusEl.textContent = "Loaded from Lite Gym — press Play";
          loadedDraft = true;
        }
      }
    } catch {}
  }
  if (!loadedDraft) void loadSample(initial, "load");
</script>`;
}
