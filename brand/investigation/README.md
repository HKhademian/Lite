# Lite Branding & Logo Exploration

All branding assets, logo revisions, and preview sheets live in `brand/investigation/`.
This is the tracked design archive — the single place where the trail of revisions is kept.

- **[`studio.html`](studio.html)** — Unified interactive studio (defaults to **Rev 6 · Letter Marks**; includes an archive selector for Rev 3 external-entity studies, Rev 4 monograms, and Rev 1 early sketches).

---

## Revision log

| Rev | Folder | What it contains | Verdict |
| --- | --- | --- | --- |
| 1 | `rev-1-concepts/` | First pass: six written concepts (Aero Feather, Lightning Feather, Photon Quill, Beam-l, Monoline-l, Spark Quill) plus the C1–C4 refined round (Plume-l, Plume solid, Bolt-l, Ray) with its own sheet. | Superseded. Every mark was a literal picture of the idea; none read as a brand at 16 px. Kept as the starting evidence. |
| 2 | `rev-2-sheets/` | Two exploration sheets: `exploration.html` (editorial mark study), `preview.html` (theme switcher, 128→16 px scale tests, lockups). | Superseded. Established the palette, scale tests, and the "one stroke" instinct, but still argued from theme rather than from drawing. |
| 3 | `rev-3-quill/` | ~40 marks across 6 families, rendered at 256/64/32/24/16 px and inverted. Full sheet with findings, four directions, constructed geometry, applications, palette, open questions. Plus the mark assets. | **Active (Standalone Icon).** Recommendation: **The Quill** — one shaft, three barbs at 35°, monoline. Spark and Bolt held open. |
| 4 | `rev-4-monogram-wordmark/` | 16×16 monoline monogram-to-wordmark study modeled directly on `MiniLang/brand/`: 6 candidates (`a1`–`a3` Feather `l`, `b1`–`b2` Light/Photon `l`, `c1` Bolt `l`) where the mark *is* the first letter `l` in `lite`, plus interactive `studio.html`. | **Active (Monogram + Wordmark Lockup).** Pairs directly with Rev 3 to compare standalone diagonal Quill vs. `mini`-style first-letter monogram. |
| 5 | `rev-5-synthesis/` | Synthesis of Rev 3's 6 findings + craft bar with Rev 4's `mini`-style monogram lockup: `1-tapered-quill.svg` (Rev 3's requested calligraphic step), `2-slanted-quill-l.svg` (18° forward-leaning `l` + 1 flick), `3-spark-li.svg` (refined Spark `li`), `4-split-light-quill.svg` (35° quill + lightning step), plus `exploration.html` scorecard. | **Exploration.** Compares standalone quills with `mini`-style letter marks. |
| 6 | `rev-6-letter-marks/` | Six L-based feather, bolt, and spark sketches, each reused as the first letter in the studio wordmark. | **Exploration.** Letter readability, feather character, spacing, and small-size performance remain open. |
| 7 | `rev-7-letter-l/` | Eight `$` letter marks (`R7-01`–`R7-08`) designed to stand alone as `$` and replace `L`/`l` in `$ite`: Multi-Barb Quill `L`, Swept Quill-Foot `L`, Lightning Bolt `L`, Minimal Bolt `l`, Spark `Li`, Feather-Foot `L`, Light-Beam `L`, and Wing-Tip `l`. | **Exploration.** Integrated in `studio.html` under `Rev 7 · Letter $ (8)`. |
| 8 | `rev-8-script-l/` | Six `ℓ`, `ℒ`, and `"l"`-variation marks (`R8-01`–`R8-06`): Script `ℓ`, Feather-Quill `ℓ`, Script Capital `ℒ`, Barred `ł`-Ray, Curled Hook `ȴ`/`ɭ`, and Bolt-Loop `ℓ`. | **Current.** Integrated in `studio.html` under `Rev 8 · Script ℓ / ℒ (6)`. |

### Revision 3 files

- `exploration.html` — the deliverable sheet. Open in a browser.
- `lite-mark.svg` — primary mark (3 barbs), `currentColor`.
- `lite-mark-16.svg` — optical cut for 16 px and below (2 barbs, thicker stroke).
- `lite-mark.png` — 512 px transparent export.
- `notes.md` — method, six findings, geometry spec, system rules, open questions.

### Working conventions

- One folder per revision, named `rev-N-slug/`.
- Never overwrite an earlier revision; add the next number.
- Record the verdict in the table above when a revision is superseded.
- Sheets are self-contained HTML (inline SVG symbols) so a folder can be moved
  or archived without breaking references.

---

## Revision 3 recommendation

**The Quill**: a single shaft leaning 35°, three barbs at the same angle, no
outline, no nib. The *l* belongs to the wordmark — the same division of labour
that makes mini's lowercase **m** work.

Held open: **Spark** (shaft + detached dot, reads *li*, most mini-like at 16 px,
no feather) and **Bolt** (the *l* as lightning; voice and motion only).

---

## Core Brand Pillars

1. **Lightness of Weight (Feather)**: fast native execution, tiny footprint, no
   garbage collector / VM bloat, minimal ceremony.
2. **Speed & Energy (Lightning)**: instantaneous startup, zero compilation drag.
3. **Clarity & Transparency (Light Ray)**: predictable semantics, readable code,
   illuminating clarity.
