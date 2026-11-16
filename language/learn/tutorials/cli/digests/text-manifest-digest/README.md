# Tutorial 2: Text Manifest & Checksum Table

Build a deterministic text table reporter combining UTF-8 encoding (`core/unicode`), Unicode scalar length (`core/text`), right/left column alignment (`core/format`), and 32-bit floored modular arithmetic (`:/`, `:%`). Because it avoids host filesystem APIs, it runs identically in both the browser worker and `./bin/lite run`.

## Concepts Demonstrated

- **Scalar count vs UTF-8 byte length**: `text.length(s)` counts Unicode scalars while `list.listCountInt(unicode.utf8Encode(s))` counts UTF-8 bytes—try inputs with accented letters or emoji to see the difference!
- **Column alignment**: `core/format`'s `padRightText` and `padLeftText` keep ASCII columns aligned cleanly.
- **Floored modular arithmetic**: Using `:% 4294967296` keeps positive 32-bit digest accumulators cleanly bounded inside 64-bit signed `Int`.

## Extensions to Try

- Skip comment lines starting with `#` using `text.startsWithAt`.
- Add a column showing total whitespace count per line.

See [Modules: core/unicode](../../../../../../lib/core/unicode.lts) and [Handbook: Imports, Visibility & I/O](../../../../handbook/modules/imports-visibility-and-io.md).
