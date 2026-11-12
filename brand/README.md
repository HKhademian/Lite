# Lite brand assets

Canonical static vector marks for **Lite**. Use these files instead of copying
geometry from older drafts or editor icons.

See [the Lite name](name.md) for the naming rules, surface treatments, and how
the `ℓ` mark pairs with `ite` in the wordmark.

| File | Use | Source ref |
| --- | --- | --- |
| [lite-wordmark.svg](lite-wordmark.svg) | `ℓite` wordmark for headers, sites, and banners | `R14-02` |
| [lite-mark.svg](lite-mark.svg) | Primary `ℓ` monogram with subtle feather flick | `R14-02` |
| [lite-mark-minimal.svg](lite-mark-minimal.svg) | Minimal `ℓ` monogram for tight spaces and optical cuts | `R14-01` |
| [lite-favicon.svg](lite-favicon.svg) | Theme-aware 16×16 favicon built from the minimal `ℓ` | `R14-01` |

## Geometry & Scaling

- All marks are scalable vector SVGs on a 16-unit x-height grid (`viewBox="0 0 16 16"` for monograms; `32×16` for the wordmark).
- The spine is a continuous 2-unit monoline stroke with round caps and joins; the primary mark (`R14-02`) adds a 1.3-unit feather flick inside the lower curve.
- `lite-mark.svg`, `lite-mark-minimal.svg`, and `lite-wordmark.svg` use `currentColor`, so inline them or set `color` when embedding; as an `<img>` they default to black.
- `lite-favicon.svg` selects `#C97B14` (light) or `#F0B45A` (dark) from `prefers-color-scheme` and mirrors `lite-mark-minimal.svg`.
- Keep the geometry unchanged when scaling. Do not add gradients, shadows, outlines, or extra colors. Use the wordmark at 20 px high or larger and the monograms at 16 px or larger.

For the full design trail and exploration studio, see [brand/investigation/README.md](investigation/README.md).
