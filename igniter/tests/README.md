# Compiler verification fixtures

`igniter/tests/compiler/` holds one verification case per JSON file plus its
sibling entry source and optional external stream files:

```text
001-001-report-int-42.json
001-001-report-int-42.lts
001-001-report-int-42.stdin
```

## File naming

`NNN-MMM-title-subtitle.json`:

- `NNN` — category index: `001` program verification, `002` compiler rejection.
- `MMM` — subcategory index (see below).
- `title-subtitle` — lowercase hyphenated slug; must equal `name` in the JSON.

The sibling `.lts` file is the actual entry source. `source` in the JSON must
name that file. The source is never embedded in JSON.

### Subcategories

Programs (`001-*`):

| Index | Meaning |
|---|---|
| 001 | Int literals, whitespace, signed limits |
| 002 | Arithmetic, precedence, unary signs |
| 003 | Immutable locals |
| 004 | Strings, escapes, Unicode, concatenation |
| 005 | Multiple report statements or values |
| 006 | Runtime-name hygiene and unused locals |

Rejections (`002-*`):

| Index | Meaning |
|---|---|
| 001 | Source shape and syntax |
| 002 | Mixed Int/String and unary type errors |
| 003 | Range, overflow and division faults |
| 004 | Malformed String literals/escapes |
| 005 | Local/name resolution and duplicate declarations |

## Model

```json
{
  "name": "report-int-42",
  "source": "001-001-report-int-42.lts",
  "stdin": { "file": "001-001-report-int-42.stdin" },
  "stdout": { "text": "42\n" },
  "stderr": { "text": "" },
  "exitCode": 0
}
```

Top-level keys:

- `name` — the `title-subtitle` slug, unique across the directory.
- `source` — the sibling `.lts` entry path.
- `stdin` — optional program stdin. Omitted means empty. Rejection fixtures
  take no `stdin`.
- `stdout` — required expected standard output.
- `stderr` — required expected standard error.
- `exitCode` — required process exit code, 0–255.

### Stream model

`stdin`, `stdout` and `stderr` each hold exactly one of:

```json
{ "text": "42\n" }
{ "bytes": [52, 50, 10] }
{ "file": "001-001-report-int-42.stdin" }
```

- `text` — inline UTF-8 text.
- `bytes` — inline byte array (0–255).
- `file` — a sibling file name, read as raw bytes. Use it for large, multiline
  or binary content; extensions such as `.stdin`, `.stdout`, `.stderr` are
  conventional but not required.

`file` is resolved inside `igniter/tests/compiler/`; absolute paths, directories and `..` are
rejected. All three streams are compared byte for byte, so binary I/O is
representable without embedding it in JSON.

### Category behavior

- `001` **program**: the tests compile `source` with both emitters, execute the
  direct igniter, emitted TS, translated ES-module JS, and native C with
  `stdin`, and compare `stdout`, `stderr` and `exitCode` exactly.
- `002` **rejected**: both compiler applications must reject `source` before
  emitting artifact bytes, with the exact `stdout`, `stderr` and `exitCode`.

The expected streams are the verification contract; they are not recomputed from
the current implementation.

## Adding a case

1. Choose the category and next subcategory.
2. Add `NNN-MMM-title-subtitle.lts` with the entry source.
3. Add `NNN-MMM-title-subtitle.json` with the same slug in `name`, the sibling
   source path, optional `stdin`, required `stdout`/`stderr`, and `exitCode`.
4. Add external stream files only where inline text or bytes would be unwieldy.
5. Run `npm test` from `igniter/`. No test-code edit is needed.

Fixtures are sorted by filename. Keep the numeric prefixes stable for readable
diffs.

## Current coverage

The corpus uses every stream form:

- `stdin.file` — `001-001-report-int-42` with raw bytes `00 ff 0a`.
- `stdin.bytes` — `001-001-report-zero`.
- `stdin.text` — `001-001-report-negative-zero`.
- `stdout.text` — most program cases.
- `stdout.bytes` — `001-004-string-hello`.
- `stdout.file` — `001-004-string-multiline`.
- `stderr.text` — most rejection cases.
- `stderr.bytes` — `002-002-mixed-int-string`.
- `stderr.file` — `002-003-division-by-zero`.

## Notes

- Invalid UTF-8 compiler input, `--check`, source-name prefixes and exact
  artifact-shape assertions remain targeted tests in [test.ts](../test.ts)
  because they need bytes, CLI arguments or artifact inspection rather than the
  program input/output stream model.
- Strict TypeScript checking: `npm run check`.
