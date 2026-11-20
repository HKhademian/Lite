/** Generates `/gym/` interactive coding dojo index, 42 drill/workout pages, and grading payloads. */
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import type { CompilerBuild } from '../igniter/artifacts.ts';
import { renderDocuments, type ModuleApiDoc, type RenderedDocument } from './docs-client.ts';
import { renderPage, rootDir, type SourceRevision } from './chrome.ts';
import { buildDocOutMap, postprocessMarkdownHtml } from './docs-pages.ts';
import type { ShowcaseSample } from './groups.ts';
import { type GymBelt, type GymCatalog, type GymExerciseSpec, verifyGymCorpus } from './gym-verify.ts';
import { escapeHtml, highlightLite } from './highlight.ts';
import type { LearnCatalog } from './learn-pages.ts';
import type { LiteAcademyGraph } from './lite-uri.ts';
import type { PlaySample } from './play-samples.ts';
import type { SearchEntry } from './search.ts';
import { renderCodeEditorBlock, renderCodeModeBar } from './ui-blocks.ts';

export type GymBuildOutput = Readonly<{
  files: ReadonlyMap<string, string>;
  searchEntries: readonly SearchEntry[];
  exerciseCount: number;
  drillCount: number;
  kataCount: number;
}>;

type CompiledExercise = Readonly<{
  exercise: GymExerciseSpec;
  outPath: string;
  promptHtml: string;
  starterSource: string;
  solutionSource: string;
  solutionTs: string;
}>;

type RelatedTarget = Readonly<{
  label: string;
  href: string;
}>;

const BELT_ORDER: readonly GymBelt[] = ['white', 'amber', 'emerald', 'obsidian'];

const BELT_LABELS: Readonly<Record<GymBelt, Readonly<{ label: string; badge: string; pillClass: string }>>> = {
  white: { label: 'White Belt', badge: 'White', pillClass: 'belt-pill belt-white' },
  amber: { label: 'Amber Belt', badge: 'Amber', pillClass: 'belt-pill belt-amber' },
  emerald: { label: 'Emerald Belt', badge: 'Emerald', pillClass: 'belt-pill belt-emerald' },
  obsidian: { label: 'Obsidian Belt', badge: 'Obsidian', pillClass: 'belt-pill belt-obsidian' },
};

function exerciseOutPath(ex: GymExerciseSpec): string {
  const folder = ex.mode === 'drill' ? 'drills' : 'workouts';
  return `gym/${folder}/${ex.slug}.html`;
}

function relativeHref(fromOutPath: string, toOutPath: string): string {
  const rel = posix.relative(posix.dirname(fromOutPath), toOutPath);
  return rel === '' ? posix.basename(toOutPath) : rel;
}

function extractHeadingLabel(docPath: string): string {
  if (docPath.startsWith('lib/') && docPath.endsWith('.lts')) {
    return `Module: ${docPath.slice(4, -4)}`;
  }
  const abs = join(rootDir, docPath);
  if (existsSync(abs) && docPath.endsWith('.md')) {
    const raw = readFileSync(abs, 'utf8');
    const heading = /^#\s+(.+)$/m.exec(raw);
    if (heading?.[1]) return heading[1].trim();
  }
  return posix.basename(docPath, posix.extname(docPath));
}

function renderGymIndexPage(
  catalog: GymCatalog,
  items: readonly CompiledExercise[],
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const totalCount = items.length;
  const drills = items.filter((item) => item.exercise.mode === 'drill');
  const workouts = items.filter((item) => item.exercise.mode === 'kata');

  const beltTotals = new Map<GymBelt, number>();
  for (const belt of BELT_ORDER) beltTotals.set(belt, 0);
  for (const item of items) {
    beltTotals.set(item.exercise.belt, (beltTotals.get(item.exercise.belt) ?? 0) + 1);
  }

  const beltSummaryCards = BELT_ORDER.map((belt) => {
    const meta = BELT_LABELS[belt];
    const total = beltTotals.get(belt) ?? 0;
    return `<div class="gym-belt-stat" data-belt="${belt}">
  <span class="${meta.pillClass}">${meta.badge}</span>
  <strong data-belt-progress="${belt}">0 / ${String(total)}</strong>
</div>`;
  }).join('\n');

  const renderCardGrid = (subset: readonly CompiledExercise[]) =>
    subset
      .map((item) => {
        const ex = item.exercise;
        const beltMeta = BELT_LABELS[ex.belt];
        const modeLabel = ex.mode === 'drill' ? 'Drill' : 'Workout';
        const href = relativeHref('gym/index.html', item.outPath);
        const totalCases = ex.visibleCases.length + ex.hiddenCases.length;
        return `<article class="portal-card gym-index-card" data-exercise-id="${escapeHtml(ex.id)}" data-mode="${ex.mode}" data-belt="${ex.belt}">
  <div class="portal-card-head">
    <h3><a href="${escapeHtml(href)}">${escapeHtml(ex.title)}</a></h3>
    <span class="${beltMeta.pillClass}">${escapeHtml(beltMeta.badge)}</span>
  </div>
  <div class="gym-card-tags">
    <span class="badge">${escapeHtml(modeLabel)}</span>
    <code>${escapeHtml(ex.domain)}/${escapeHtml(ex.subGroup)}</code>
    <span class="code-card-meta">${String(totalCases)} cases</span>
  </div>
  <div class="portal-card-foot">
    <span class="gym-status-label code-card-meta" data-status-for="${escapeHtml(ex.id)}">Not started</span>
    <a href="${escapeHtml(href)}">Solve &rarr;</a>
  </div>
</article>`;
      })
      .join('\n');

  const orderedMeta = items.map((item) => ({
    id: item.exercise.id,
    belt: item.exercise.belt,
    mode: item.exercise.mode,
    title: item.exercise.title,
    href: relativeHref('gym/index.html', item.outPath),
  }));

  const body = `<section class="page-hero">
  <h1>Lite Gym</h1>
  <p class="hero-lead">
    ${escapeHtml(catalog.description)} Every exercise compiles and grades inside your browser using verified test suites.
  </p>
  <div class="learn-progress-banner">
    <div class="learn-progress-stats">
      <div class="gym-progress-headline">
        <strong id="gym-progress-text">0 / ${String(totalCount)} solved</strong>
        <span id="gym-io-status" class="code-card-meta" role="status" aria-live="polite"></span>
      </div>
      <div class="learn-bar-track"><div id="gym-progress-fill" class="learn-bar-fill" style="width: 0%;"></div></div>
      <div class="gym-belt-grid">
        ${beltSummaryCards}
      </div>
    </div>
    <div class="hero-actions" style="margin: 0;">
      <a id="gym-continue-btn" class="btn btn-primary" href="${escapeHtml(orderedMeta[0]?.href ?? 'drills/immutable-vs-var.html')}">Start First Drill &rarr;</a>
      <button id="gym-export-btn" class="btn" type="button">Export JSON</button>
      <button id="gym-import-btn" class="btn" type="button">Import JSON</button>
      <input id="gym-import-input" type="file" accept="application/json" hidden>
    </div>
  </div>
</section>

<section class="gym-filters" aria-label="Filter Gym exercises">
  <div class="gym-filter-group" role="group" aria-label="Mode filter">
    <button class="gym-filter-btn" type="button" data-filter-mode="all" aria-pressed="true">All (${String(totalCount)})</button>
    <button class="gym-filter-btn" type="button" data-filter-mode="drill" aria-pressed="false">Concept Drills (${String(drills.length)})</button>
    <button class="gym-filter-btn" type="button" data-filter-mode="kata" aria-pressed="false">Problem Workouts (${String(workouts.length)})</button>
  </div>
  <div class="gym-filter-group" role="group" aria-label="Belt filter">
    <button class="gym-filter-btn" type="button" data-filter-belt="all" aria-pressed="true">All Belts</button>
    <button class="gym-filter-btn" type="button" data-filter-belt="white" aria-pressed="false">White</button>
    <button class="gym-filter-btn" type="button" data-filter-belt="amber" aria-pressed="false">Amber</button>
    <button class="gym-filter-btn" type="button" data-filter-belt="emerald" aria-pressed="false">Emerald</button>
    <button class="gym-filter-btn" type="button" data-filter-belt="obsidian" aria-pressed="false">Obsidian</button>
  </div>
  <div class="gym-filter-group">
    <button id="gym-filter-unsolved" class="gym-filter-btn" type="button" aria-pressed="false">Unsolved Only</button>
    <span id="gym-visible-count" class="code-card-meta">Showing ${String(totalCount)} / ${String(totalCount)}</span>
  </div>
</section>

<section class="section" data-gym-section="drill">
  <div class="section-head">
    <h2>Part I — Litelings Concept Drills</h2>
    <span class="code-card-meta">${String(drills.length)} targeted diagnostics &amp; fixes</span>
  </div>
  <p class="section-note">Short, focused programs across 6 language domains. Fix a starter compile or semantics bug to earn a pass.</p>
  <div class="portal-grid">
    ${renderCardGrid(drills)}
  </div>
</section>

<section class="section" data-gym-section="kata">
  <div class="section-head">
    <h2>Part II — Multi-Test Problem Workouts</h2>
    <span class="code-card-meta">${String(workouts.length)} progressive belt challenges</span>
  </div>
  <p class="section-note">Algorithmic, text, parsing, and numerical problems graded against both visible examples and hidden edge cases.</p>
  <div class="portal-grid">
    ${renderCardGrid(workouts)}
  </div>
</section>

<script>
  (function () {
    var STORAGE_KEY = "lite-gym-progress-v1";
    var exercises = ${JSON.stringify(orderedMeta)};
    var activeMode = "all";
    var activeBelt = "all";
    var unsolvedOnly = false;

    function loadState() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            return {
              solved: parsed.solved && typeof parsed.solved === "object" ? parsed.solved : {},
              drafts: parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts : {}
            };
          }
        }
      } catch (e) {}
      return { solved: {}, drafts: {} };
    }

    function saveState(state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
    }

    function syncProgress() {
      var state = loadState();
      var solvedCount = 0;
      var firstUnsolved = null;
      var beltDone = { white: 0, amber: 0, emerald: 0, obsidian: 0 };
      var beltTotal = { white: 0, amber: 0, emerald: 0, obsidian: 0 };

      for (var i = 0; i < exercises.length; i += 1) {
        var ex = exercises[i];
        beltTotal[ex.belt] = (beltTotal[ex.belt] || 0) + 1;
        var isSolved = Boolean(state.solved[ex.id]);
        var hasDraft = typeof state.drafts[ex.id] === "string" && state.drafts[ex.id].length > 0;
        if (isSolved) {
          solvedCount += 1;
          beltDone[ex.belt] = (beltDone[ex.belt] || 0) + 1;
        } else if (!firstUnsolved) {
          firstUnsolved = ex;
        }
        var label = document.querySelector('[data-status-for="' + ex.id + '"]');
        if (label) {
          label.classList.toggle("gym-solved-label", isSolved);
          label.textContent = isSolved ? "Solved ✓" : (hasDraft ? "Draft saved" : "Not started");
        }
      }

      var txt = document.getElementById("gym-progress-text");
      var fill = document.getElementById("gym-progress-fill");
      var cont = document.getElementById("gym-continue-btn");
      if (txt) txt.textContent = solvedCount + " / " + exercises.length + " solved";
      if (fill) fill.style.width = (exercises.length ? Math.round((solvedCount / exercises.length) * 100) : 0) + "%";
      var belts = ["white", "amber", "emerald", "obsidian"];
      for (var b = 0; b < belts.length; b += 1) {
        var name = belts[b];
        var el = document.querySelector('[data-belt-progress="' + name + '"]');
        if (el) el.textContent = (beltDone[name] || 0) + " / " + (beltTotal[name] || 0);
      }
      if (cont) {
        if (firstUnsolved && solvedCount > 0) {
          cont.href = firstUnsolved.href;
          cont.textContent = "Next Unsolved: " + firstUnsolved.title + " →";
        } else if (solvedCount === exercises.length && exercises.length > 0) {
          cont.href = "../learn/";
          cont.textContent = "All 42 Solved! Review Learn Tracks →";
        } else if (exercises[0]) {
          cont.href = exercises[0].href;
          cont.textContent = "Start First Drill →";
        }
      }
      applyFilters(state);
    }

    function applyFilters(state) {
      var cards = document.querySelectorAll(".gym-index-card");
      var shown = 0;
      for (var i = 0; i < cards.length; i += 1) {
        var card = cards[i];
        var id = card.getAttribute("data-exercise-id") || "";
        var mode = card.getAttribute("data-mode") || "";
        var belt = card.getAttribute("data-belt") || "";
        var isSolved = Boolean(state.solved[id]);
        var visible = (activeMode === "all" || mode === activeMode) &&
          (activeBelt === "all" || belt === activeBelt) &&
          (!unsolvedOnly || !isSolved);
        card.hidden = !visible;
        if (visible) shown += 1;
      }
      var sections = document.querySelectorAll("[data-gym-section]");
      for (var s = 0; s < sections.length; s += 1) {
        var sec = sections[s];
        var anyVisible = sec.querySelector(".gym-index-card:not([hidden])") !== null;
        sec.hidden = !anyVisible;
      }
      var countEl = document.getElementById("gym-visible-count");
      if (countEl) countEl.textContent = "Showing " + shown + " / " + exercises.length;
    }

    var modeBtns = document.querySelectorAll("[data-filter-mode]");
    for (var i = 0; i < modeBtns.length; i += 1) {
      modeBtns[i].addEventListener("click", function () {
        activeMode = this.getAttribute("data-filter-mode") || "all";
        for (var j = 0; j < modeBtns.length; j += 1) {
          modeBtns[j].setAttribute("aria-pressed", modeBtns[j] === this ? "true" : "false");
        }
        applyFilters(loadState());
      });
    }

    var beltBtns = document.querySelectorAll("[data-filter-belt]");
    for (var i = 0; i < beltBtns.length; i += 1) {
      beltBtns[i].addEventListener("click", function () {
        activeBelt = this.getAttribute("data-filter-belt") || "all";
        for (var j = 0; j < beltBtns.length; j += 1) {
          beltBtns[j].setAttribute("aria-pressed", beltBtns[j] === this ? "true" : "false");
        }
        applyFilters(loadState());
      });
    }

    var unsolvedBtn = document.getElementById("gym-filter-unsolved");
    if (unsolvedBtn) {
      unsolvedBtn.addEventListener("click", function () {
        unsolvedOnly = !unsolvedOnly;
        this.setAttribute("aria-pressed", unsolvedOnly ? "true" : "false");
        applyFilters(loadState());
      });
    }

    var ioStatus = document.getElementById("gym-io-status");
    var exportBtn = document.getElementById("gym-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        var state = loadState();
        var blob = new Blob([JSON.stringify(state, null, 2) + "\\n"], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "lite-gym-progress.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (ioStatus) ioStatus.textContent = "Exported progress JSON";
      });
    }

    var importBtn = document.getElementById("gym-import-btn");
    var importInput = document.getElementById("gym-import-input");
    if (importBtn && importInput) {
      importBtn.addEventListener("click", function () { importInput.click(); });
      importInput.addEventListener("change", function () {
        var file = importInput.files && importInput.files[0];
        if (!file) return;
        file.text().then(function (raw) {
          var parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
          var nextState = {
            solved: parsed.solved && typeof parsed.solved === "object" ? parsed.solved : {},
            drafts: parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts : {}
          };
          saveState(nextState);
          syncProgress();
          if (ioStatus) ioStatus.textContent = "Imported progress";
        }).catch(function () {
          if (ioStatus) ioStatus.textContent = "Import failed: invalid JSON";
        }).finally(function () {
          importInput.value = "";
        });
      });
    }

    syncProgress();
  })();
</script>`;

  return renderPage({
    title: 'Lite Gym — Interactive Coding Dojo',
    description: '42 browser-graded Lite drills and algorithmic workouts from White Belt to Obsidian Belt.',
    basePath: '../',
    active: 'gym',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

function renderGymExercisePage(
  item: CompiledExercise,
  idx: number,
  allItems: readonly CompiledExercise[],
  relatedLinks: readonly RelatedTarget[],
  repoUrl: string,
  rev: SourceRevision,
  lightSwitchShine: boolean,
): string {
  const { exercise: ex } = item;
  const beltMeta = BELT_LABELS[ex.belt];
  const modeLabel = ex.mode === 'drill' ? 'Concept Drill' : 'Problem Workout';
  const prev = idx > 0 ? allItems[idx - 1] : undefined;
  const next = idx + 1 < allItems.length ? allItems[idx + 1] : undefined;

  const visibleCaseCards = ex.visibleCases
    .map((vc) => {
      const argsNote = vc.args.length > 0 ? `<div class="gym-case-meta">Args: <code>${escapeHtml(vc.args.join(' '))}</code></div>` : '';
      const stdinDisplay = vc.stdin === '' ? '(empty)' : vc.stdin;
      return `<article class="gym-case-spec">
  <div class="gym-case-spec-head">
    <strong>${escapeHtml(vc.name)}</strong>
    <span class="badge">Visible</span>
  </div>
  ${argsNote}
  <div class="gym-io-pair">
    <div>
      <span class="gym-io-label">stdin</span>
      <pre class="gym-io-pre"><code>${escapeHtml(stdinDisplay)}</code></pre>
    </div>
    <div>
      <span class="gym-io-label">expected stdout</span>
      <pre class="gym-io-pre"><code>${escapeHtml(vc.expectedStdout)}</code></pre>
    </div>
  </div>
</article>`;
    })
    .join('\n');

  const relatedHtml = relatedLinks.length > 0
    ? `<section class="gym-related">
  <h2>Related Docs &amp; Lessons</h2>
  <ul>
    ${relatedLinks.map((r) => `<li><a href="${escapeHtml(r.href)}">${escapeHtml(r.label)}</a></li>`).join('\n    ')}
  </ul>
</section>`
    : '';

  const totalCases = ex.visibleCases.length + ex.hiddenCases.length;
  const starterClean = item.starterSource.trimEnd();
  const solutionClean = item.solutionSource.trimEnd();
  const prevHref = prev ? relativeHref(item.outPath, prev.outPath) : '';
  const nextHref = next ? relativeHref(item.outPath, next.outPath) : '';

  const pagerHtml = `<nav class="docs-pager" aria-label="Exercise navigation">
  ${prev ? `<a class="btn docs-nav-btn" href="${escapeHtml(prevHref)}">&larr; ${escapeHtml(prev.exercise.title)}</a>` : '<span></span>'}
  ${next ? `<a class="btn docs-nav-btn" href="${escapeHtml(nextHref)}">${escapeHtml(next.exercise.title)} &rarr;</a>` : '<span></span>'}
</nav>`;

  const body = `<div class="gym-topbar">
  <div class="gym-breadcrumb">
    <a href="../../">Lite</a> <span aria-hidden="true">/</span>
    <a href="../">Gym</a> <span aria-hidden="true">/</span>
    <span>${escapeHtml(modeLabel)}</span>
    <span class="${beltMeta.pillClass}">${escapeHtml(beltMeta.label)}</span>
    <code>${escapeHtml(ex.domain)}/${escapeHtml(ex.subGroup)}</code>
    <span id="gym-solved-pill" class="badge">Not solved</span>
  </div>
  ${pagerHtml}
</div>

<div class="gym-dojo">
  <article class="gym-prompt-col">
    <div class="doc-prose">
      ${item.promptHtml}
    </div>

    <section class="gym-cases-section">
      <div class="section-head" style="margin-bottom: 0.65rem;">
        <h2>Visible Test Cases</h2>
        <span class="code-card-meta">+ ${String(ex.hiddenCases.length)} hidden case${ex.hiddenCases.length === 1 ? '' : 's'} graded on submit</span>
      </div>
      <div class="gym-cases">
        ${visibleCaseCards}
      </div>
    </section>

    <section class="gym-hints">
      <div class="gym-hints-head">
        <h2>Hints</h2>
        <button id="gym-hint-btn" class="btn" type="button">Reveal Hint (0 / ${String(ex.hints.length)})</button>
      </div>
      <ol id="gym-hints-list" class="gym-hints-list" hidden></ol>
    </section>

    <section class="gym-solution-panel">
      <div class="gym-hints-head">
        <h2>Reference Solution</h2>
        <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
          <button id="gym-reveal-sol-btn" class="btn" type="button">Reveal Reference Solution</button>
          <button id="gym-load-sol-btn" class="btn" type="button" hidden>Load into Editor</button>
        </div>
      </div>
      <div id="gym-solution-box" hidden>
        <pre class="code-block"><code>${highlightLite(solutionClean)}</code></pre>
      </div>
    </section>

    ${relatedHtml}
  </article>

  <section class="gym-editor-col learn-runner" aria-label="Gym code editor and automated test judge">
    <div class="pane">
      <div class="pane-head">
        <div class="sample-picker">
          <span class="code-card-title">${escapeHtml(ex.slug)}.lts</span>
        </div>
        <div class="pg-actions">
          <button id="gym-reset" class="pg-copy-btn" type="button">Reset Starter</button>
          <a id="gym-open-play" class="pg-copy-btn" href="../../playground/?draft=gym">Open in Play &rarr;</a>
        </div>
      </div>
      ${renderCodeEditorBlock({
        textareaId: 'gym-editor',
        ariaLabel: 'Lite solution code editor',
        preId: 'gym-editor-pre',
        minHeight: '290px',
        initialSource: starterClean,
        initialHtml: highlightLite(starterClean),
      })}
      <div class="pg-actions" style="flex-wrap: wrap; border-top: 1px solid var(--border); padding: 0.55rem 0.85rem; background: var(--surface);">
        <button id="gym-submit" class="btn btn-primary" type="button">Submit &amp; Grade (${String(totalCases)})</button>
        <button id="gym-run-visible" class="btn" type="button">Run Visible (${String(ex.visibleCases.length)})</button>
        <span id="gym-status" class="pg-status" role="status" aria-live="polite">Ready (Cmd/Ctrl+Enter run visible · Cmd/Ctrl+Shift+Enter submit)</span>
      </div>
    </div>

    <div class="pane" style="margin-top: 0.9rem;">
      <div class="pane-head">
        <div class="pg-tabs" role="tablist" aria-label="Judge and compiler output">
          <button id="gym-tab-results" class="pg-tab" type="button" role="tab" aria-selected="true">Test Results</button>
          <button id="gym-tab-ts" class="pg-tab" type="button" role="tab" aria-selected="false">Generated TS</button>
          <button id="gym-tab-c" class="pg-tab" type="button" role="tab" aria-selected="false">Generated C</button>
        </div>
      </div>
      ${renderCodeModeBar({ id: 'gym-code-modes' })}
      <div id="gym-results" class="pg-panel gym-results-panel" style="min-height: 240px; max-height: 360px;">
        <div class="gym-result-empty">Run visible tests or submit all ${String(totalCases)} tests to grade your solution in the browser.</div>
      </div>
      <pre id="gym-ts" class="code-block pg-panel" style="min-height: 240px; max-height: 360px;" hidden><code></code></pre>
      <pre id="gym-c" class="code-block pg-panel" style="min-height: 240px; max-height: 360px;" hidden><code></code></pre>
    </div>
  </section>
</div>

<script type="module">
  import { formatCodeView } from "../../runtime/code-view.js";
  import { bindCodeModeButtons, bindLiteEditor } from "../../runtime/editor-client.js";
  import { highlightC, highlightLite, highlightTs } from "../../runtime/highlight.js";

  const STORAGE_KEY = "lite-gym-progress-v1";
  const exerciseId = ${JSON.stringify(ex.id)};
  const exerciseSlug = ${JSON.stringify(ex.slug)};
  const exerciseTitle = ${JSON.stringify(ex.title)};
  const initialHints = ${JSON.stringify(ex.hints)};

  const editorEl = document.getElementById("gym-editor");
  const editorPreEl = document.getElementById("gym-editor-pre").querySelector("code");
  const solvedPill = document.getElementById("gym-solved-pill");
  const statusEl = document.getElementById("gym-status");
  const runVisibleBtn = document.getElementById("gym-run-visible");
  const submitBtn = document.getElementById("gym-submit");
  const resetBtn = document.getElementById("gym-reset");
  const openPlayLink = document.getElementById("gym-open-play");
  const hintBtn = document.getElementById("gym-hint-btn");
  const hintsList = document.getElementById("gym-hints-list");
  const revealSolBtn = document.getElementById("gym-reveal-sol-btn");
  const loadSolBtn = document.getElementById("gym-load-sol-btn");
  const solBox = document.getElementById("gym-solution-box");

  const resultsEl = document.getElementById("gym-results");
  const tsEl = document.getElementById("gym-ts").querySelector("code");
  const cEl = document.getElementById("gym-c").querySelector("code");
  const tabResults = document.getElementById("gym-tab-results");
  const tabTs = document.getElementById("gym-tab-ts");
  const tabC = document.getElementById("gym-tab-c");
  const codeModesEl = document.getElementById("gym-code-modes");

  let payloadData = null;
  let codeMode = "program";
  let lastRawTs = "";
  let lastRawC = "";
  let worker = null;
  let nextReqId = 1;
  const pending = new Map();
  let revealedHints = 0;
  let solArmed = false;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return {
            solved: parsed.solved && typeof parsed.solved === "object" ? parsed.solved : {},
            drafts: parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts : {}
          };
        }
      }
    } catch {}
    return { solved: {}, drafts: {} };
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function syncSolvedPill() {
    const state = loadState();
    const solved = Boolean(state.solved[exerciseId]);
    solvedPill.textContent = solved ? "Solved ✓" : "Not solved";
    solvedPill.classList.toggle("gym-solved-pill", solved);
  }
  syncSolvedPill();

  function saveDraft() {
    const state = loadState();
    if (payloadData && editorEl.value === payloadData.starterSource.trimEnd()) {
      delete state.drafts[exerciseId];
    } else {
      state.drafts[exerciseId] = editorEl.value;
    }
    saveState(state);
  }

  const editorCtrl = bindLiteEditor({
    editor: editorEl,
    preCode: editorPreEl,
    highlight: highlightLite,
    indent: "    ",
    onInput: () => {
      lastRawC = "";
      saveDraft();
    },
    onRun: () => void runJudge(false),
    onShiftRun: () => void runJudge(true),
  });

  openPlayLink.addEventListener("click", (event) => {
    const firstStdin = payloadData && payloadData.visibleCases && payloadData.visibleCases[0]
      ? String(payloadData.visibleCases[0].stdin || "")
      : "";
    if (window.LiteSnips && typeof window.LiteSnips.openInPlayground === "function") {
      event.preventDefault();
      window.LiteSnips.openInPlayground({
        title: exerciseTitle,
        code: editorEl.value,
        stdin: firstStdin,
        args: "",
        origin: "gym:" + exerciseId
      });
      return;
    }
    try {
      sessionStorage.setItem("lite-playground-draft-v1", JSON.stringify({
        title: exerciseTitle,
        source: editorEl.value,
        stdin: firstStdin
      }));
    } catch {}
  });

  if (hintBtn) {
    hintBtn.addEventListener("click", () => {
      if (revealedHints >= initialHints.length) return;
      const li = document.createElement("li");
      li.textContent = initialHints[revealedHints];
      hintsList.appendChild(li);
      hintsList.hidden = false;
      revealedHints += 1;
      hintBtn.textContent = revealedHints >= initialHints.length
        ? "All Hints Shown (" + revealedHints + " / " + initialHints.length + ")"
        : "Reveal Hint (" + revealedHints + " / " + initialHints.length + ")";
      if (revealedHints >= initialHints.length) hintBtn.disabled = true;
    });
    if (initialHints.length === 0) hintBtn.disabled = true;
  }

  revealSolBtn.addEventListener("click", () => {
    if (!solBox.hidden) {
      solBox.hidden = true;
      loadSolBtn.hidden = true;
      solArmed = false;
      revealSolBtn.textContent = "Reveal Reference Solution";
      return;
    }
    if (!solArmed) {
      solArmed = true;
      revealSolBtn.textContent = "Confirm: Show Reference Solution";
      return;
    }
    solBox.hidden = false;
    loadSolBtn.hidden = false;
    solArmed = false;
    revealSolBtn.textContent = "Hide Reference Solution";
  });

  loadSolBtn.addEventListener("click", () => {
    if (!payloadData) return;
    lastRawC = "";
    editorCtrl.setValue(payloadData.solutionSource.trimEnd());
    saveDraft();
    statusEl.textContent = "Loaded reference solution into editor";
  });

  function renderCodeTabs() {
    tsEl.innerHTML = lastRawTs ? highlightTs(formatCodeView(lastRawTs, "ts", codeMode)) : "";
    cEl.innerHTML = lastRawC ? highlightC(formatCodeView(lastRawC, "c", codeMode)) : "";
  }

  function showTab(tab) {
    resultsEl.hidden = tab !== "results";
    document.getElementById("gym-ts").hidden = tab !== "ts";
    document.getElementById("gym-c").hidden = tab !== "c";
    codeModesEl.hidden = tab !== "ts" && tab !== "c";
    tabResults.setAttribute("aria-selected", tab === "results" ? "true" : "false");
    tabTs.setAttribute("aria-selected", tab === "ts" ? "true" : "false");
    tabC.setAttribute("aria-selected", tab === "c" ? "true" : "false");
    if (tab === "ts" || tab === "c") renderCodeTabs();
  }
  tabResults.addEventListener("click", () => showTab("results"));
  tabTs.addEventListener("click", () => showTab("ts"));
  tabC.addEventListener("click", () => {
    showTab("c");
    if (!lastRawC) void requestCompileC();
  });

  bindCodeModeButtons({
    buttons: document.querySelectorAll("#gym-code-modes .code-mode-btn"),
    onChange: (mode) => {
      codeMode = mode;
      renderCodeTabs();
    },
  });

  function getWorker() {
    if (!worker) {
      worker = new Worker("../../runtime/worker.js", { type: "module" });
      worker.addEventListener("message", (event) => {
        const msg = event.data ?? {};
        const entry = pending.get(msg.id);
        if (entry) {
          pending.delete(msg.id);
          entry.resolve(msg);
        }
      });
    }
    return worker;
  }

  function callWorker(action, extra) {
    return new Promise((resolve, reject) => {
      const id = nextReqId++;
      pending.set(id, { resolve, reject });
      getWorker().postMessage({ id, action, ...(extra || {}) });
    });
  }

  async function requestCompileC() {
    const source = editorEl.value;
    cEl.textContent = "Compiling to C in browser...";
    const res = await callWorker("compile-c", { source, stdin: "", args: [] });
    if (res.ok && res.c) {
      lastRawC = res.c;
    } else {
      lastRawC = "/* " + (res.stderr || "C backend could not compile this code.") + " */";
    }
    renderCodeTabs();
  }

  function esc(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function renderResults(res, includeHidden) {
    showTab("results");
    if (!res.ok) {
      resultsEl.innerHTML = '<div class="gym-judge-banner gym-judge-fail">Compile Error</div>' +
        '<pre class="gym-diag-pre"><code>' + esc(res.stderr || "Compilation failed.") + '</code></pre>';
      return;
    }
    const items = Array.isArray(res.results) ? res.results : [];
    const passedCount = items.filter((r) => r.passed).length;
    const bannerClass = res.allPassed ? "gym-judge-pass" : "gym-judge-fail";
    const headline = res.allPassed
      ? (includeHidden
          ? "Solved! All " + passedCount + " / " + items.length + " visible + hidden cases passed."
          : "All " + passedCount + " / " + items.length + " visible cases passed. Submit to grade hidden cases!")
      : ("Passed " + passedCount + " / " + items.length + " cases.");

    const cardsHtml = items.map((r, idx) => {
      const cls = r.passed ? "gym-case-card gym-case-pass" : "gym-case-card gym-case-fail";
      const badge = r.passed ? "PASS" : "FAIL";
      if (r.hidden) {
        const errHtml = r.stderr ? '<pre class="gym-diff-pre"><code>' + esc(r.stderr) + '</code></pre>' : '';
        return '<article class="' + cls + '">' +
          '<div class="gym-case-spec-head"><strong>Hidden case #' + (idx + 1) + ' (' + esc(r.name) + ')</strong><span class="badge">' + badge + '</span></div>' +
          '<div class="gym-case-meta">Exit code: ' + r.exitCode + (r.passed ? '' : ' — output or exit status did not match reference') + '</div>' +
          errHtml +
          '</article>';
      }
      const stderrHtml = r.stderr ? '<div class="gym-diff-block"><span class="gym-io-label">stderr</span><pre class="gym-diff-pre"><code>' + esc(r.stderr) + '</code></pre></div>' : '';
      const diffHtml = r.passed ? '' : (
        '<div class="gym-diff">' +
          '<div class="gym-diff-block"><span class="gym-io-label">expected</span><pre class="gym-diff-pre"><code>' + esc(r.expectedStdout) + '</code></pre></div>' +
          '<div class="gym-diff-block"><span class="gym-io-label">actual (exit ' + r.exitCode + ')</span><pre class="gym-diff-pre"><code>' + esc(r.actualStdout) + '</code></pre></div>' +
        '</div>'
      );
      return '<article class="' + cls + '">' +
        '<div class="gym-case-spec-head"><strong>' + esc(r.name) + '</strong><span class="badge">' + badge + '</span></div>' +
        diffHtml +
        stderrHtml +
        '</article>';
    }).join("");

    resultsEl.innerHTML = '<div class="gym-judge-banner ' + bannerClass + '">' + esc(headline) + '</div>' +
      '<div class="gym-result-cards">' + cardsHtml + '</div>';
  }

  async function runJudge(includeHidden) {
    if (!payloadData) return;
    runVisibleBtn.disabled = true;
    submitBtn.disabled = true;
    statusEl.textContent = includeHidden ? "Compiling & grading all tests..." : "Running visible tests...";

    const visible = (payloadData.visibleCases || []).map((c) => ({ ...c, hidden: false }));
    const hidden = includeHidden ? (payloadData.hiddenCases || []).map((c) => ({ ...c, hidden: true })) : [];
    const cases = [...visible, ...hidden];

    try {
      const res = await callWorker("grade", { source: editorEl.value, cases });
      if (res.ts) {
        lastRawTs = res.ts;
        renderCodeTabs();
      }
      renderResults(res, includeHidden);
      if (includeHidden && res.ok && res.allPassed) {
        const state = loadState();
        state.solved[exerciseId] = true;
        saveState(state);
        syncSolvedPill();
        statusEl.textContent = "Solved! All " + cases.length + " cases passed";
      } else if (!res.ok) {
        statusEl.textContent = "Compile error";
      } else {
        const passedCount = (res.results || []).filter((r) => r.passed).length;
        statusEl.textContent = passedCount + " / " + cases.length + " cases passed";
      }
    } catch (err) {
      statusEl.textContent = "Worker error: " + (err instanceof Error ? err.message : String(err));
    } finally {
      runVisibleBtn.disabled = false;
      submitBtn.disabled = false;
    }
  }

  runVisibleBtn.addEventListener("click", () => void runJudge(false));
  submitBtn.addEventListener("click", () => void runJudge(true));

  resetBtn.addEventListener("click", () => {
    if (!payloadData) return;
    lastRawC = "";
    editorCtrl.setValue(payloadData.starterSource.trimEnd());
    const state = loadState();
    delete state.drafts[exerciseId];
    saveState(state);
    statusEl.textContent = "Reset to starter code";
  });

  fetch("../payloads/" + encodeURIComponent(exerciseSlug) + ".json")
    .then((r) => r.json())
    .then((data) => {
      payloadData = data;
      const state = loadState();
      if (typeof state.drafts[exerciseId] === "string" && state.drafts[exerciseId].length > 0) {
        editorCtrl.setValue(state.drafts[exerciseId]);
        statusEl.textContent = "Restored saved draft";
      }
    })
    .catch(() => {});
</script>`;

  return renderPage({
    title: `${ex.title} — Lite Gym`,
    description: `${beltMeta.label} ${modeLabel}: ${ex.title}`,
    basePath: '../../',
    active: 'gym',
    mainClass: 'learn-main',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });
}

/** Builds `/gym/` index, 42 interactive drill/workout dojo pages, payloads, and search entries. */
export function buildGymSection(options: Readonly<{
  tsCompiler: CompilerBuild;
  modules: readonly ModuleApiDoc[];
  showcaseSamples: readonly ShowcaseSample[];
  playSamples: readonly PlaySample[];
  repoUrl: string;
  rev: SourceRevision;
  lightSwitchShine: boolean;
  graph?: LiteAcademyGraph;
}>): GymBuildOutput {
  const { tsCompiler, modules, showcaseSamples, playSamples, repoUrl, rev, lightSwitchShine, graph } = options;
  const verified = verifyGymCorpus(tsCompiler);
  const catalog = JSON.parse(readFileSync(join(rootDir, 'language', 'gym', 'catalog.json'), 'utf8')) as GymCatalog;
  const learnCatalog = JSON.parse(readFileSync(join(rootDir, 'language', 'learn', 'catalog.json'), 'utf8')) as LearnCatalog;

  const docOutBySource = new Map<string, string>(buildDocOutMap({ modulesBase: modules }));
  const learnById = new Map<string, Readonly<{ title: string; outPath: string }>>();
  for (const track of learnCatalog.tracks) {
    for (const lesson of track.lessons) {
      const out = `learn/${track.id}/${lesson.slug}.html`;
      docOutBySource.set(lesson.guideFile, out);
      learnById.set(lesson.id, { title: lesson.title, outPath: out });
    }
  }
  for (const ex of catalog.exercises) {
    docOutBySource.set(ex.promptFile, exerciseOutPath(ex));
  }

  const samplesByFile = new Map<string, string>();
  for (const s of [...showcaseSamples, ...playSamples]) {
    if (!samplesByFile.has(s.file)) samplesByFile.set(s.file, s.id);
  }

  const renderedPrompts = renderDocuments(catalog.exercises.map((e) => e.promptFile), rootDir);
  const promptByPath = new Map<string, RenderedDocument>(renderedPrompts.map((d) => [d.path, d]));

  const compiledList: CompiledExercise[] = [];
  for (const ex of catalog.exercises) {
    const outPath = exerciseOutPath(ex);
    const rendered = promptByPath.get(ex.promptFile);
    if (rendered === undefined) {
      throw new Error(`missing rendered gym prompt ${ex.promptFile}`);
    }
    const fromUri = `lite://gym/${ex.slug}`;
    const promptHtml = postprocessMarkdownHtml({
      rawHtml: rendered.html,
      sourcePath: ex.promptFile,
      outPath,
      docOutBySource,
      samplesByFile,
      snippets: new Map(),
      repoUrl,
      highlightUnmarkedAsLite: true,
      ...(graph !== undefined ? { graph, fromUri } : {}),
    });
    const compiled = verified.compiledSolutions.get(ex.id);
    if (compiled === undefined) {
      throw new Error(`missing verified compilation for gym exercise ${ex.id}`);
    }
    compiledList.push({
      exercise: ex,
      outPath,
      promptHtml,
      starterSource: compiled.starterSource,
      solutionSource: compiled.solutionSource,
      solutionTs: compiled.solutionTs,
    });
  }

  const files = new Map<string, string>();
  files.set('gym/index.html', renderGymIndexPage(catalog, compiledList, repoUrl, rev, lightSwitchShine));

  const searchEntries: SearchEntry[] = [];
  for (let i = 0; i < compiledList.length; i += 1) {
    const item = compiledList[i]!;
    const ex = item.exercise;
    const relatedLinks: RelatedTarget[] = [];

    for (const docPath of ex.relatedDocs) {
      const targetOut = docOutBySource.get(docPath);
      if (targetOut === undefined) {
        throw new Error(`gym exercise ${ex.id} references unmapped doc ${docPath}`);
      }
      relatedLinks.push({
        label: extractHeadingLabel(docPath),
        href: relativeHref(item.outPath, targetOut),
      });
    }
    for (const lessonId of ex.relatedLessons) {
      const lessonMeta = learnById.get(lessonId);
      if (lessonMeta === undefined) {
        throw new Error(`gym exercise ${ex.id} references unknown lesson ${lessonId}`);
      }
      relatedLinks.push({
        label: `Lesson: ${lessonMeta.title}`,
        href: relativeHref(item.outPath, lessonMeta.outPath),
      });
    }

    files.set(
      item.outPath,
      renderGymExercisePage(item, i, compiledList, relatedLinks, repoUrl, rev, lightSwitchShine),
    );
    files.set(
      `gym/payloads/${ex.slug}.json`,
      JSON.stringify({
        id: ex.id,
        slug: ex.slug,
        title: ex.title,
        mode: ex.mode,
        belt: ex.belt,
        starterSource: item.starterSource,
        solutionSource: item.solutionSource,
        visibleCases: ex.visibleCases,
        hiddenCases: ex.hiddenCases,
      }),
    );

    const beltLabel = BELT_LABELS[ex.belt].badge;
    const modeLabel = ex.mode === 'drill' ? 'Drill' : 'Workout';
    searchEntries.push({
      kind: 'gym',
      title: ex.title,
      subtitle: `${beltLabel} ${modeLabel} · ${ex.domain}/${ex.subGroup}`,
      href: item.outPath,
      keywords: `${ex.slug} ${ex.belt} ${ex.mode} ${ex.domain} ${ex.subGroup}`,
      badge: beltLabel,
    });
  }

  return {
    files,
    searchEntries,
    exerciseCount: verified.exerciseCount,
    drillCount: verified.drillCount,
    kataCount: verified.kataCount,
  };
}
