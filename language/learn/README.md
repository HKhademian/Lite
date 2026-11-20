# Lite Learn

The **Learn** curriculum powers the structured guide side of **Lite Academy** (`/learn/` on the published site alongside `/docs/`, `/modules/`, `/tools/`, `/gym/`, and `/play/`).

## Layout

- [catalog.json](lite://repo/language/learn/catalog.json) — machine-readable curriculum manifest validated against [learn.schema.json](lite://repo/config/learn.schema.json).
- [handbook/](lite://handbook/overview-and-setup) — 7-chapter shipped Lite language handbook (`01` through `07`).
- `lessons/` — 21 interactive track lessons (`Track 0` – `Track 6`), each pairing a markdown guide with a runnable `.lts` program.
- `tutorials/` — 3 standalone multi-step or multi-file project tutorials (`Track 7`), including relative helper modules bundled into the browser playground.

## Tracks

| Order | Track ID | Title | Items |
| --- | --- | --- | --- |
| `0` | `getting-started` | Track 0 — Getting Started | 2 lessons |
| `1` | `foundations` | Track 1 — Foundations: Bindings, Numbers & Text | 3 lessons |
| `2` | `control` | Track 2 — Control Flow, Loops & Cleanup | 3 lessons |
| `3` | `types` | Track 3 — Data Shapes, Collections & Aliases | 4 lessons |
| `4` | `blocks` | Track 4 — The Unified Block Model & Trace Safety | 3 lessons |
| `5` | `functions` | Track 5 — Functions, Pipelines & Closures | 3 lessons |
| `6` | `modules` | Track 6 — Modules & System Utilities | 3 lessons |
| `7` | `tutorials` | Track 7 — Standalone Project Tutorials | 3 tutorials |

## Related Corpora

- [Gym exercises](lite://repo/language/gym/README.md) — interactive bug-hunt drills and belt-ranked katas cross-linked via `relatedLessons`.
- [Examples](lite://repo/language/examples/README.md) — focused single-concept `.lts` programs.
- [Showcases](lite://repo/language/showcases/README.md) — multi-file feature demonstrations.
- [Site architecture](lite://doc/site-architecture) — how `site/learn-pages.ts` renders tracks and bundles helper modules into `/play/`.
