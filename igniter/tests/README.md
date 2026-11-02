# Compiler verification fixtures

`igniter/tests/compiler/` holds one manifest per entry source plus optional
external stream files:

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

The sibling `.lts` file is the entry source. A manifest may hold several
scenarios for that one source under `cases`. Program category 001 means the
source compiles successfully; its execution may exit nonzero with a modeled
runtime fault. Category 002 models compiler rejection before artifact output.
The current corpus has 64 programs and 29 rejections. Six arithmetic-fault
sources moved to 001-011; empty/whitespace scripts moved to 001-001.
The final-semicolon declaration now also belongs to 001-005. Source bytes are
unchanged in these migrations.

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
| 011 | Accepted programs that fault at runtime (including constant arithmetic) |

Rejections (`002-*`):

| Index | Meaning |
|---|---|
| 001 | Source shape and syntax |
| 002 | Mixed Int/String and unary type errors |
| 003 | Out-of-range integer literals |
| 004 | Malformed String literals/escapes |
| 005 | Local/name resolution and duplicate declarations |

## Model

The JSON Schema is [schema/compiler-case.schema.json](schema/compiler-case.schema.json).

```json
{
  "name": "remainder-int",
  "source": {
    "file": "001-002-remainder-int.lts",
    "hash": "sha256:<64 lowercase hex>"
  },
  "cases": [
    {
      "name": "default",
      "stdout": {
        "text": "1\n-1\n1\n0\n",
        "hash": "sha256:<64 lowercase hex>"
      },
      "stderr": {
        "text": "",
        "hash": "sha256:<64 lowercase hex>"
      },
      "exitCode": 0
    }
  ]
}
```

Top-level keys:

- `name` — the `title-subtitle` slug, unique across the directory.
- `source` — the entry source object.
- `cases` — a nonempty ordered list of scenarios. Case names are unique within
  the manifest.

### Source model

`source` holds exactly one of `file`, `text` or `bytes`, plus a required `hash`:

```json
{ "file": "001-001-report-int-42.lts", "hash": "sha256:…" }
{ "text": "outputLine(42);\n", "hash": "sha256:…" }
{ "bytes": [114, 101, 112, 111, 114, 116, 40, 52, 50, 41, 59, 10], "hash": "sha256:…" }
```

- `file` — a sibling source file name. Compiler fixtures normally use this.
- `text` — inline UTF-8 source.
- `bytes` — inline raw source bytes.
- `hash` — SHA-256 of the original source bytes.

### Case model

Each case holds:

- `name` — a nonempty slug unique within the manifest.
- `stdin` — optional program input. Omitted means empty. Rejection cases take
  no `stdin`.
- `stdout`, `stderr` — optional expected streams. Omitted means empty.
- `exitCode` — required process status, 0–255.

Each stream holds exactly one of `text`, `bytes` or `file`, plus a required
`hash`:

```json
{ "text": "42\n", "hash": "sha256:…" }
{ "bytes": [52, 50, 10], "hash": "sha256:…" }
{ "file": "001-001-report-int-42.stdin", "hash": "sha256:…" }
```

- `text` — inline UTF-8 text.
- `bytes` — inline byte array (0–255).
- `file` — a sibling file name, read as raw bytes.
- `hash` — SHA-256 of the resolved stream bytes.

`file` is resolved inside `igniter/tests/compiler/`; absolute paths, directories
and `..` are rejected. All streams are compared byte for byte.

### Category behavior

- `001` **program**: the tests compile `source` with both emitters, execute the
  direct igniter, emitted TS, translated ES-module JS, and native C with
  `stdin`, and compare `stdout`, `stderr` and `exitCode` exactly.
- `002` **rejected**: both compiler applications must reject `source` before
  emitting artifact bytes, with the exact `stdout`, `stderr` and `exitCode`.

The expected streams are the verification contract; they are not recomputed from
the current implementation.

## Adding a case

Follow the [compiler development guidelines](../../docs/compiler-development.md):
each feature, syntax change or bug fix needs multiple focused cases plus multiple
feature combinations. Use several named `cases` for different inputs to one
source, and separate fixtures for distinct syntax or rejection paths. Include
boundaries, diagnostics and runtime failures where relevant. A single passing
fixture does not establish support; verify each claimed generated target.

1. Choose the category and next subcategory.
2. Add `NNN-MMM-title-subtitle.lts` with the entry source.
3. Add `NNN-MMM-title-subtitle.json` with the matching `name`, a `source`
   object and one or more `cases`.
4. Add external stream files only where inline text or bytes would be unwieldy.
5. Run `./lite test` from the repository root. No test-code edit is needed.

Fixtures are sorted by filename. Keep the numeric prefixes stable for readable
diffs.

## Current coverage

The corpus uses every source and stream form:

- `source.file` — every current manifest.
- `source.text` / `source.bytes` — supported by the model and loader.
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
