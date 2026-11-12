# Lite Branding Investigation

Relocated from `tmp/branding/` to `brand/investigation/` on 2026-11-12. `tmp/branding` no
longer exists — if a session recreates it, treat it as stale scratch and fold changes
back here.

One folder for all logo/brand revisions from **every** session working on this.
Do not delete other rounds — each revision lives in its own folder.

Creators are recorded per revision; the same names appear on the cards in
`studio.html` under **Created by**.

## Revision Index

| Rev | Folder | Author | What it is |
| --- | --- | --- | --- |
| 1 | `rev-1-concepts/` | earlier session | First pass: `concept-1…6` (aero feather, lightning feather, photon quill, beam-l, monoline-l, spark quill) plus `01–03` vector sheets. |
| 1b | `rev-2-plume/` | `glm-5.3-flash` | The C1–C4 round (plume-l, plume solid, bolt-l, ray) moved out of `logo-concepts/`; `sheet.html` is its sheet. All files carry `authored by glm-5.3-flash` comments. |
| 2 | `rev-2-sheets/` | earlier session | Two exploration sheets: `exploration.html` (editorial mark study) and `preview.html` (theme switcher, 128→16 px tests, lockups). |
| 3 | `rev-3-quill/` | `deepseek-v4.1-flash` | ~40 marks in 6 families reduced to **The Quill** (shaft + 3 barbs at 35°, monoline). Sheet, mark assets, notes, and `visibility.html` (paper / ink / graphite / filament at 64→16 px with WCAG ratios). |
| 4 | `rev-4-monogram-wordmark/` | `gemini-4-argon` | Six mini-style monograms where the mark is the first letter of `lite` (a1–a3 feather, b1–b2 light, c1 bolt), plus its own studio. |
| 5 | `rev-5-synthesis/` | `gemini-3.8-flash` | Rev 3 × Rev 4 synthesis: tapered quill, slanted quill-l, refined Spark `li`, split-light quill. |
| 6 | `rev-6-letter-marks/` | `gpt-6.1-terra` | Six L-based feather, bolt and spark sketches, each reused as the first letter in the wordmark. |
| 7 | `rev-7-letter-l/` | `gemini-3.8-flash` | Eight letter marks (R7-01…08) designed to stand alone and replace the `l` in `lite`. |
| 8 | `rev-8-script-l/` | `gemini-3.8-flash` | Six `ℓ` / `ℒ` variations (R8-01…06). |
| 9 | `rev-9-letterforms/` | `gpt-6.1-terra` | Eight custom letterforms drawing on ℓ, ℒ, ł, ȴ and feather strokes. |
| 11 | `rev-11-ell-finalists/` | `gemini-3.8-flash` | Six `ℓ` finalist refinements (`R11-01`–`R11-06`) synthesizing `R10-01`, `R10-02`, and `R10-04`. |
| — | root | `gemini-3.8-flash` | `concept-7-radiant-feather.svg`, `concept-8-celestial-quill.svg`. |
| — | root | `glm-5.3-flash` | `visibility-draft.html` — **draft, kept for future reference**: reusable visibility-matrix template (any mark × paper/ink/graphite/filament/teal × 64–16 px, WCAG ratios). Marks seeded with rev-2-plume glyphs; swap via the `MARKS` object in the file. |

Unified viewer: **`studio.html`**. Rev 3 sits in the main tab row; Rev 1 and Rev 4
are under *Other Entities & Archive*.

No files have been deleted. Earlier rounds were moved into revision folders on
2026-11-12; `rev-1-concepts/logo-concepts/` is the same C1–C4 round as
`rev-2-plume/`.

## Brand pillars (shared)

1. **Lightness of weight (feather)** — fast native execution, tiny footprint
2. **Speed & energy (lightning)** — instant startup, no compilation drag
3. **Clarity (light ray)** — predictable semantics, readable code

## Existing identity anchors

* VS Code icons: `editors/vscode/icons/lite-light.svg` / `lite-dark.svg` — "L" stroke + dot, teal `#0F766E` / `#5EEAD4`
* Voice: "Lite is light." (`README.md`)
