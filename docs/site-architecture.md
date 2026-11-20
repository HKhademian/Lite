# Static Site Architecture & Portable Curriculum Schema

Status: current site architecture reference, 2026-11-20.

The Lite static site (`dist/site/`) is generated deterministically in build-time TypeScript (`node ./site/build.ts`) without external website dependencies, frontend frameworks, or checked-in build outputs. All UI, syntax highlighting, browser compilation, and grading run locally from static HTML, CSS, and stripped ES modules emitted at build time.

There are no separate school, study, or university academic tracks; all guided learning lives under **Lite Academy**, unifying **Learn**, **Gym**, **Docs** (Handbook & Spec), **References** (`core/*` & `extra/*` Modules and Tools), and **Play**.

See [documentation maintenance](documentation.md) and [the documentation index](README.md) for authoring and link-checking policy.

## Static Site Route Map

Every top-level route uses the shared shell, unified progress/drawer helper, global search modal, and stylesheet in [the site chrome helper](../site/chrome.ts), [academy runtime](../site/academy-state.ts), [client search script](../site/search.ts), and [stylesheet generator](../site/styles.ts):

| Route | Purpose | Generator |
| --- | --- | --- |
| `/` (`index.html`) | Overview, shell quickstart, resume progress bar, Academy pillar hub, featured samples | [build.ts](../site/build.ts) |
| `/learn/` | Interactive ability curriculum (21 lessons + 3 tutorials) with filters, resizable workbench, and Play Canvas + Audio runner | [learn-pages.ts](../site/learn-pages.ts) |
| `/gym/` | Browser-graded coding dojo (20 Litelings drills + 25 belt-ranked workouts) with line diffs, switcher drawer, and custom stdin sandbox | [gym-pages.ts](../site/gym-pages.ts) |
| `/docs/` | Layer 1 runnable 7-chapter Shipped Handbook + Layer 2 design specs, proposals, and compiler docs with inline `▶ Run` & backlinks | [docs-pages.ts](../site/docs-pages.ts) |
| `/modules/` | Standard library & Play (`core/*`, `extra/*`) API reference extracted from `.lts` sources with Academy & showcase backlinks | [modules-pages.ts](../site/modules-pages.ts) |
| `/tools/` | `./bin/lite` CLI subcommands, VS Code extension guide, Play host bridge, self-hosting ladder | [tools-page.ts](../site/tools-page.ts) |
| `/gallery/` | Build-time verified language showcase programs, Canvas art, Audio synthesis, and Play games | [build.ts](../site/build.ts) |
| `/playground/` | Interactive Lite editor with line numbers & error highlights, TS (`Program` / `Portable` / `Full`) + C inspector, fullscreen Canvas & Audio, `#code=` share links | [build.ts](../site/build.ts) |
| `/runtime/` | Browser compiler bundles (`compiler.js`, `compiler-c.js`), `worker.js`, `stdlib.json`, `play-stage.js`, `editor-client.js`, `academy.js`, `snips.js`, `search.js` | [build.ts](../site/build.ts) |
| `search-index.json` | Unified search index with category filters across `/learn/`, `/gym/`, `/docs/`, `/modules/`, `/tools/`, and `/gallery/` | [build.ts](../site/build.ts) |
| `link-graph.json` | Resolved `lite://` URI graph connecting Handbook, Docs, Learn, Gym, Play, Modules, Tools, and Gallery bidirectionally | [lite-uri.ts](../site/lite-uri.ts) |
| `build.json` | Git commit metadata plus verified sample, lesson, tutorial, gym, docs, and module counts | [build.ts](../site/build.ts) |

## Shared Browser Worker & Studio Runtimes

- **`runtime/worker.js` ([playground-worker.ts](../site/playground-worker.ts))**: Shared Web Worker across `/playground/`, `/learn/`, `/gym/`, and inline Docs blocks (`▶ Run`). Lazily loads `compiler.js`, `compiler-c.js`, and `stdlib.json` and supports `compile`, `compile-c`, `run`, `step`, `keydown`, `keyup`, `pointermove`, `pointerdown`, `pointerup`, `stop`, and `grade` (omitting `expectedStdout`/`actualStdout` when `hidden: true`).
- **`runtime/play-stage.js` ([play-stage.ts](../site/play-stage.ts))**: Shared Canvas 2D pixel/op renderer, Web Audio (`extra/audio`) synthesizer, frame-step loop, and Worker RPC client shared across `/playground/`, `/learn/`, and `/gym/`.
- **`runtime/editor-client.js` ([editor-client.ts](../site/editor-client.ts))**: Shared syntax-layered editor binding with line-number gutter, compile-error line highlighting, auto-indent, split-pane resizing, and `#code=` share payload codecs.
- **`runtime/academy.js` ([academy-state.ts](../site/academy-state.ts)) & `runtime/snips.js` ([snips.ts](../site/snips.ts))**: Unified Academy resume/progress aggregation across Learn, Gym, Handbook read state, and UUIDv7 `localStorage` sketches, plus inline Docs `▶ Run` / `Copy` / `Save` / `Open in Play` controls, TOC scroll-spy, Spec sidebar filtering, and mobile drawers.

## Documentation, `lite://` URI Linkage & API Extraction

Markdown and `.lts` module docs are rendered without external JavaScript Markdown dependencies:

- [markdown-html.lts](../lib/util/markdown-html.lts) implements a Pure-Lite CommonMark/GFM-subset renderer (`renderMarkdown`) emitting semantic headings with clickable `#` fragment anchors, clean inline-formatted TOC HTML (`labelHtml`), alerts, tables, fenced code blocks (`data-lang` + `data-fence` + `data-runnable`), `data-md-href` placeholders for relative `.md`/`.lts` links, and `data-lite-uri` placeholders for internal `lite://` / `lite:/` links.
- [docgen.lts](../lib/util/docgen.lts) parses `pub` declarations and doc comments across `lib/core/*.lts` and `lib/extra/*.lts`, feeding `/modules/` pages and global search symbols.
- [docs.lts](../tools/src/docs.lts) and [docs.lts utility](../lib/util/docs.lts) verify anchors, duplicate IDs, registered snippets, and offline `lite://` / `lite:/` targets, fragments, and module symbols (`./bin/lite docs --check`).
- [lite-uri.ts](../site/lite-uri.ts) resolves every `data-lite-uri` and catalog/import edge across Handbook, Design Spec, Learn, Gym, Play, Modules, Tools, and Gallery at build time, failing the build on any broken URI, fragment, or module symbol and emitting bidirectional backlink cards and `dist/site/link-graph.json`.

## Portable Curriculum & Gym Schemas (MiniLang Reuse Checklist)

To deploy this same learning, gym, docs, and playground portal for a sister language repository (such as MiniLang):

1. **Adopt the JSON catalog contracts**:
   - Mirror [learn.schema.json](../config/learn.schema.json) under `config/learn.schema.json` with domain-hierarchical guides/sources (`<domain>/<subGroup>/<slug>`) and track metadata (`getting-started`, domain tracks, `tutorials`).
   - Mirror [gym.schema.json](../config/gym.schema.json) under `config/gym.schema.json` with `<domain>/<subGroup>/<slug>/{README.md,starter.*,solution.*}`, visible/hidden cases, progressive hints, and `expectedStarterFailure`.
2. **Swap language-specific build adapters**:
   - Emit browser-runnable compiler artifact(s) (`compiler.js` / `stdlib.json`) compatible with `worker.js` or replace `compileWith` / `stripLiteTs` inside the worker adapter.
   - Update tokenizer keywords/operators/types in [highlight.ts](../site/highlight.ts) and code-simplification patterns in [code-view.ts](../site/code-view.ts).
3. **Preserve build-time verification invariants**:
   - Require every lesson program, tutorial, and Gym solution to compile and match expected outputs (and every starter to fail as declared) at site-build time via a corpus verifier akin to [gym-verify.ts](../site/gym-verify.ts).
   - Keep an automated local link/fragment check (`lite docs --check`) and post-build HTML `href` crawler (`docs/`, `learn/`, `gym/`) in the test suite so documentation and portal routes cannot drift.
