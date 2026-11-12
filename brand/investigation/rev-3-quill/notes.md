# Lite — mark exploration, revision 3

Status: **working note, not a decision**. 2026-11-12.
Previous revisions: `../rev-1-concepts/`, `../rev-2-sheets/`.

The question: does Lite get a feather mark, and can that mark be as reduced and
self-evidently "designed" as the lowercase **m** that carries mini?

## Method

About forty marks were drawn and rendered, in six families: typographic stems,
solid feather silhouettes, lens-and-barb quills, lightning hybrids, spark marks,
and tapered strokes. Each was checked at 256, 64, 32, 24 and 16 px, inverted, and
inside a square icon. The failures are kept in the exploration sheet because they
are the evidence for the recommendation.

## What the sketches proved

1. **Solid feathers stop being feathers.** Filled silhouettes read as an arrow, a
   leaf, or a wing. Icon-safe, meaning-wrong.
2. **Barbs on a vertical stem read as a branch, a fern, or a K.** This is the
   "mini move" — make the *l* the shaft — and it is the most tempting failure.
   A stem with three ticks never reads as an *l*.
3. **A vane beside a vertical stem reads as D, P, or a flag.** Any closed vane
   attached to a vertical shaft becomes a letter we did not intend.
4. **Symmetry kills the lightness.** Barbs on both sides turn the feather into a
   wheat ear and remove all motion.
5. **Pure abstraction has no anchor.** A single tapered stroke is beautiful but
   reads as a slash, a comma, or a knife.
6. **Diagonal + monoline + one-sided survives.** It keeps the feather read at
   every size, keeps a single stroke weight, and turns the lean into speed. The
   letter link moves to the wordmark.

## Recommendation

**The Quill** — one shaft and three barbs at a 35° lean, monoline, round caps,
no outline and no nib. `lite-mark.svg`.

Why this one:

- It reads as a feather at display size and as a deliberate stroke at 24 px.
- It is one weight, so it sits naturally beside UI strokes and type.
- It leaves the *l* to the wordmark, which is the honest division of labour: the
  icon is a drawing, the wordmark is the name. mini works the same way.
- It does not close into a letter by accident (findings 2 and 3).

Known weakness: the quill silhouette is familiar. The identity has to come from
the drawing, not the idea. The next craft step is a filled, tapered-silhouette
study so the shape cannot be mistaken for a stock icon; this line version is the
control.

## Geometry

- 64-unit box. Mark occupies roughly x 12–53, y 6–58, optically centred after a
  −4 unit shift.
- Shaft: `M32 59 C34 45 34 20 31 5`, stroke 4.4, slightly bowed.
- Three barbs, stroke 4.2, starting on the shaft centreline (so the round caps
  stay buried) and sweeping up and outward at the shaft's own 35°.
- 35° from vertical, not 45°: 45° looks engineered, 35° looks like a feather.
- Small-size cut: `lite-mark-16.svg` — two barbs, stroke 5.4, straight shaft.
  Use it below 24 px. Three barbs at 16 px fuse into a blob.

## System

- Mark: ink on paper or paper on ink. No gradients, no glow, no accent in the
  mark itself.
- Accent **Filament** `#F0B45A` is a light source, not a fill: one dot, one focus
  ring, one status line.
- Type: neutral grotesque (Inter, Geist, IBM Plex Sans) at 600, tracking −5%,
  lowercase. The wordmark should eventually be drawn so the **l** can echo the
  feather's angle.
- Lockup: mark, 12-unit gap, `lite`; sub-brand adds `LiteLang` in 400.

## Alternatives held open

- **Spark** — a shaft plus a detached dot: reads as *li* (Lite, light) and as a
  spark. Most mini-like and most legible at 16 px, but no feather.
- **Bolt** — the *l* ascender kinked into lightning. Strong as a sticker, too
  generic as an identity; use it in motion, loaders and release notes.
- **Stem** — the rejected letter-first direction. Kept as the sketch that got us
  here.

## Open questions

1. Is the mark the icon and the wordmark the identity, or must the icon say
   "lite" on its own? A "yes" to the second sends the project to Spark.
2. 35° or 45°?
3. Does the wordmark get drawn, or is it a licensed grotesque?
4. What is the 16 px story — optical cut, or a simplified second mark?

## Files

- `exploration.html` — the full sheet: findings, four directions, construction,
  applications, palette, open questions. Open in a browser.
- `lite-mark.svg` — primary mark, 128 × 128, `currentColor`.
- `lite-mark-16.svg` — optical cut for 16 px and below.
- `lite-mark.png` — 512 px export of the primary mark.
- `../rev-2-sheets/preview.html` — the earlier, superseded exploration sheet.
