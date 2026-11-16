# Workout: Mini INI Config Parser & Query Engine

Read INI configuration text via `io.inputAll()`:
- Blank lines and lines starting with `;` or `#` (after trimming) are ignored.
- `[section]` sets the active section name (trimmed inside `[...]`).
- `key = value` records `<section>.<key>` (or `<key>` if before any section), trimming whitespace around `key` and `value`. Updating an existing key overwrites its previous value.
- `QUERY <dottedKey>` outputs the current value for `<dottedKey>` (or `"MISSING"` if unset).
