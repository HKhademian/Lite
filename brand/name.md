# The Lite name

## Decision

Follow [Naming and versioning](../docs/versioning-and-naming.md#1-canonical-names):
write **Lite** for the project, **LiteLang** for the language, and **LiteScript**
for a program. Use `lite` in code for the CLI command, `.lts` for scripts, and
`.lt` for module files.

The wordmark is the display form: the **`ℓ`** mark (`R14-02`) takes the brand
accent (`.brand-l`), while `ite` stays in the text color. The **`ℓ`** is the
mark: it is the monogram, the first letter of the wordmark, and the only
colored part of the display lockup.

On surfaces without color, the name is plain **Lite** (or `lite` in command
contexts).

## Surfaces

| Surface | Form |
| --- | --- |
| Wordmark | Two-tone `ℓ` + `ite` in [lite-wordmark.svg](lite-wordmark.svg) (`R14-02`) |
| Standalone mark | [lite-mark.svg](lite-mark.svg) (`R14-02`) or [lite-mark-minimal.svg](lite-mark-minimal.svg) (`R14-01`) |
| Favicon | [lite-favicon.svg](lite-favicon.svg) (`R14-01` minimal optical cut) |
| Docs, Markdown | Plain **Lite** / **LiteLang** / **LiteScript**; the wordmark carries the accent |
| CLI, editor UI | Plain `lite` / `Lite` |
| Commands, files | `lite`, `.lt`, `.lts` |

## Wordmark & Prose Rules

Do not put the custom `ℓ` SVG glyph inline inside running body text; in body
prose it mismatches the surrounding font and breaks text selection and search.
Use the wordmark for display surfaces: site headers, README banners, and social
cards.

In HTML/CSS, the wordmark classes in [lite-wordmark.svg](lite-wordmark.svg)
support switching treatments cleanly:

```css
/* Two-tone accent (default) */
.brand { color: var(--text); }
.brand .brand-l { color: var(--accent); }

/* Monochrome */
.brand { color: var(--text); }
.brand .brand-l { color: inherit; }
```
