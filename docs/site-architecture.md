# Static Site Architecture & Portable Curriculum Schema

Status: current site architecture reference, 2026-11-20.

The Lite static site (`dist/site/`) is generated deterministically in build-time TypeScript (`node ./site/build.ts`) without external website dependencies, frontend frameworks, or checked-in build outputs. All UI, syntax highlighting, browser compilation, and grading run locally from static HTML, CSS, and stripped ES modules emitted at build time.

There are no separate school, study, or university academic tracks; all guided learning lives under **Lite Academy**, unifying **Learn**, **Gym**, **Docs** (Handbook & Spec), **References** (`core/*` & `extra/*` Modules and Tools), and **Play**.

See [documentation maintenance](lite://doc/documentation) and [the documentation index](lite://doc/overview) for authoring and link-checking policy.

## Build and preview locally

Use the Node.js version in [igniter/.node-version](lite://repo/igniter/.node-version).
Run these commands from the repository root.

```sh
npm --prefix igniter ci
./site/build.ts
./site/serve.ts
```

Open `http://127.0.0.1:8080/`. After editing the docs, run
`./bin/lite docs --check`, rebuild the site, and reload the page.

## Static Site Route Map

Every top-level route uses the shared shell, unified progress/drawer helper, global search modal, and stylesheet in [the site chrome helper](lite://repo/site/chrome.ts), [academy runtime](lite://repo/site/academy-state.ts), [client search script](lite://repo/site/search.ts), and [stylesheet generator](lite://repo/site/styles.ts):

| Route | Purpose | Generator |
| --- | --- | --- |
| `/` (`index.html`) | Overview, shell quickstart, resume progress bar, Academy pillar hub, featured samples | [build.ts](lite://repo/site/build.ts) |
| `/learn/` | Guided lessons and projects with an interactive runner | [learn-pages.ts](lite://repo/site/learn-pages.ts) |
| `/gym/` | Browser-graded drills and belt-ranked workouts | [gym-pages.ts](lite://repo/site/gym-pages.ts) |
| `/docs/` | First-program guide, syntax tour, Handbook, and language design references | [docs-pages.ts](lite://repo/site/docs-pages.ts) |
| `/modules/` | Standard library & Play (`core/*`, `extra/*`) API reference extracted from `.lts` sources with Academy & showcase backlinks | [modules-pages.ts](lite://repo/site/modules-pages.ts) |
| `/tools/` | `./bin/lite` CLI subcommands, VS Code extension guide, Play host bridge, self-hosting ladder | [tools-page.ts](lite://repo/site/tools-page.ts) |
| `/gallery/` | Build-time verified language showcase programs, Canvas art, Audio synthesis, and Play games | [build.ts](lite://repo/site/build.ts) |
| `/playground/` | Interactive Lite editor with line numbers & error highlights, TS (`Program` / `Portable` / `Full`) + C inspector, fullscreen Canvas & Audio, `#code=` share links | [build.ts](lite://repo/site/build.ts) |
| `/runtime/` | Browser compiler bundles (`compiler.js`, `compiler-c.js`), `worker.js`, `stdlib.json`, `play-stage.js`, `editor-client.js`, `academy.js`, `snips.js`, `search.js` | [build.ts](lite://repo/site/build.ts) |
| `search-index.json` | Unified search index with category filters across `/learn/`, `/gym/`, `/docs/`, `/modules/`, `/tools/`, and `/gallery/` | [build.ts](lite://repo/site/build.ts) |
| `link-graph.json` | Resolved `lite://` URI graph connecting Handbook, Docs, Learn, Gym, Play, Modules, Tools, and Gallery bidirectionally | [lite-uri.ts](lite://repo/site/lite-uri.ts) |
| `build.json` | Git commit metadata plus verified sample, lesson, tutorial, gym, docs, and module counts | [build.ts](lite://repo/site/build.ts) |

## Shared Browser Worker & Studio Runtimes

- **`runtime/worker.js` ([playground-worker.ts](lite://repo/site/playground-worker.ts))**: Shared Web Worker across `/playground/`, `/learn/`, `/gym/`, and inline Docs blocks (`▶ Run`). Lazily loads `compiler.js`, `compiler-c.js`, and `stdlib.json` and supports `compile`, `compile-c`, `run`, `step`, `keydown`, `keyup`, `pointermove`, `pointerdown`, `pointerup`, `stop`, and `grade` (omitting `expectedStdout`/`actualStdout` when `hidden: true`).
- **`runtime/play-stage.js` ([play-stage.ts](lite://repo/site/play-stage.ts))**: Shared Canvas 2D pixel/op renderer, Web Audio (`extra/audio`) synthesizer, frame-step loop, and Worker RPC client shared across `/playground/`, `/learn/`, and `/gym/`.
- **`runtime/editor-client.js` ([editor-client.ts](lite://repo/site/editor-client.ts))**: Shared syntax-layered editor binding with line-number gutter, compile-error line highlighting, auto-indent, split-pane resizing, and `#code=` share payload codecs.
- **`runtime/academy.js` ([academy-state.ts](lite://repo/site/academy-state.ts)) & `runtime/snips.js` ([snips.ts](lite://repo/site/snips.ts))**: Unified Academy resume/progress aggregation across Learn, Gym, Handbook read state, and UUIDv7 `localStorage` sketches, plus inline Docs `▶ Run` / `Copy` / `Save` / `Open in Play` controls. Builtin Docs, Handbook, Learn, and Gym `Open in Play →` links route directly to canonical Playground targets (`?piece=...`, `?sample=...`, `?case=...` checked by `validateBuiltSiteReferences`), reserving `localStorage` `?snip=<uuid>` for explicit saves or modified editor drafts, alongside live Handbook & Spec sidebar filters, synced TOC scroll-spy, keyboard chapter navigation (`[` / `]`), and mobile drawers.

## Documentation, `lite://` URI Linkage & API Extraction

Markdown and `.lts` module docs are rendered without external JavaScript Markdown dependencies:

- [markdown-html.lts](lite://repo/lib/util/markdown-html.lt) implements a Pure-Lite CommonMark/GFM-subset renderer (`renderMarkdown`) emitting semantic headings with clickable `#` fragment anchors, clean inline-formatted TOC HTML (`labelHtml`), alerts, tables, fenced code blocks (`data-lang` + `data-fence` + `data-runnable`), `data-md-href` placeholders for relative `.md`/`.lts` links, and `data-lite-uri` placeholders for internal `lite://` / `lite:/` links.
- [docgen.lt](lite://repo/lib/lite/docgen.lt) parses `pub` declarations and doc comments across `lib/core/*.lts` and `lib/extra/*.lts`, feeding `/modules/` pages and global search symbols.
- [docs.lts](lite://repo/tools/src/docs.lts) and [docs.lts utility](lite://repo/lib/util/docs.lt) verify anchors, duplicate IDs, registered snippets, and offline `lite://` / `lite:/` targets, fragments, and module symbols (`./bin/lite docs --check`).
- [lite-uri.ts](lite://repo/site/lite-uri.ts) resolves every `data-lite-uri` (`handbook`, `doc`, `spec`, `proposal`, `compiler`, `brand`, `learn`, `gym`, `play`, `module`, `tool`, `gallery`, and `repo`) and catalog/import edge across Handbook, Design Spec, Brand (`docs/brand/`), Learn, Gym, Play, Modules, Tools, and Gallery at build time, failing the build on any broken URI, fragment, or module symbol and emitting bidirectional backlink cards and `dist/site/link-graph.json`. `buildLiteAcademyGraph()` also pre-scans Markdown `lite://` / `lite:/` links across Docs, Brand, Handbook, Learn, and Gym before section rendering so bidirectional backlink cards reflect all `lite://` links regardless of build order. At the end of `buildSite()`, `validateBuiltSiteReferences()` also scans every built `.html` file, `#fragment` target, `search-index.json` entry, and `link-graph.json` node/edge so zero broken links or anchors can ship.

## Portable Curriculum & Gym Schemas (MiniLang Reuse Checklist)

To deploy this same learning, gym, docs, and playground portal for a sister language repository (such as MiniLang):

1. **Adopt the JSON catalog contracts**:
   - Mirror [learn.schema.json](lite://repo/config/learn.schema.json) under `config/learn.schema.json` with domain-hierarchical guides/sources (`<domain>/<subGroup>/<slug>`) and track metadata (`getting-started`, domain tracks, `tutorials`).
   - Mirror [gym.schema.json](lite://repo/config/gym.schema.json) under `config/gym.schema.json` with `<domain>/<subGroup>/<slug>/{README.md,starter.*,solution.*}`, visible/hidden cases, progressive hints, and `expectedStarterFailure`.
2. **Swap language-specific build adapters**:
   - Emit browser-runnable compiler artifact(s) (`compiler.js` / `stdlib.json`) compatible with `worker.js` or replace `compileWith` / `stripLiteTs` inside the worker adapter.
   - Update tokenizer keywords/operators/types in [highlight.ts](lite://repo/site/highlight.ts) and code-simplification patterns in [code-view.ts](lite://repo/site/code-view.ts).
3. **Preserve build-time verification invariants**:
   - Require every lesson program, tutorial, and Gym solution to compile and match expected outputs (and every starter to fail as declared) at site-build time via a corpus verifier akin to [gym-verify.ts](lite://repo/site/gym-verify.ts).
   - Keep an automated local link/fragment check (`lite docs --check`) and post-build HTML `href` crawler (`docs/`, `learn/`, `gym/`) in the test suite so documentation and portal routes cannot drift.
