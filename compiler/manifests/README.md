# Compiler source manifests

Status: **P4 implemented, 2026-11-01**. The bundle loader lives in
[`../../igniter/loader.ts`](../../igniter/loader.ts); the internal driver,
harness remain under [`../../igniter/`](../../igniter/). The default `litec`
entry is now [`../cli.ts`](../cli.ts): both targets use T11-derived compilers
through the [current compiler host](../host.ts). The legacy bundle driver is an
explicit reference/audit path.
No public `bootstrap` command is exposed.

A manifest is the ordered assembly description for one bootstrap target. It
replaces neither Lite source nor a module system: it names the files the loader
splices into one bundle, in dependency order. The schema is
[`manifest.schema.json`](manifest.schema.json).

```json
{
  "target": "ts",
  "files": [
    "../../lib/core/int.lts",
    "../../lib/core/text.lts",
    "../../lib/core/source.lts",
    "../../lib/core/diag.lts",
    "../../lib/core/format.lts",
    "../../lib/core/list.lts",
    "../src/ts-literals.lts",
    "../src/frontend.lts",
    "../src/emit-ts.lts",
    "../src/driver-ts.lts"
  ]
}
```

The current manifests list the L0 libraries, the target literal encoders, the
shared front-end, the target emitter and the target driver. `lib/core/test.lts`
is test-only and is not part of a compiler bundle.

No compiler source file or `lib/core` file contains an `importFlatAll`
directive. The temporary directive remains only in test helpers under
`compiler/tests/` and `lib/tests/`. The generated `compiler/ts-emitter.lts` and
`compiler/c-emitter.lts` compatibility bundles are exactly the flattened
manifest text.

## Manifest rules

- The top level has exactly `target` and `files`. Unknown keys are rejected so a
  schema change cannot be introduced silently.
- `target` is `ts` or `c`. The loader rejects a manifest whose target differs
  from the requested target.
- `files` is nonempty and ordered. Order is dependency order: a declaration may
  use only declarations that appeared earlier in the bundle. Backend literal
  encoders therefore appear before the shared front-end that calls them.
- Each entry is a relative UTF-8 path with `/` separators. Absolute paths,
  drive-letter paths and backslashes are rejected. Paths resolve relative to the
  manifest file, so `../../lib/core/...` is valid.
- Each file appears once. A duplicate is an error, not a silent include-once
  skip. A file-directive cycle is rejected as well.
- Files are declaration-only except the final driver entry, which may run the
  bundle. The final entry is the target driver, for example `driver-ts.lts` or
  `driver-c.lts`; it is not a shared front-end file.
- Missing files, directories, invalid UTF-8, empty paths and unresolved nested
  directives are load errors.
- The bundle carries no `import`/`export` syntax into the generated artifact.
  Assembly is entirely a loader concern (bootstrap default B2).

The temporary `importFlatAll` directive in the current compiler is a
pre-manifest loader workaround. P1 keeps it working until the bundle path
replaces it; it is not part of this schema.

## Line-map contract

The loader returns the flattened text plus a line map:

```ts
type LineMapEntry = Readonly<{ path: string; line: number }>;
type Bundle = Readonly<{
  target: 'ts' | 'c';
  text: string;
  lineMap: readonly LineMapEntry[];
  files: readonly string[];
}>;
```

- Each source is decoded as strict UTF-8 and split at `\n`. A final `\n`
  terminates the last line instead of starting an empty line; `\r` remains part
  of the line content so CRLF sources are not rewritten.
- Files are flattened in manifest order. Their lines are joined with `\n` and
  the bundle ends with one `\n`. A file without a final newline gains one; no
  blank separator line is invented.
- `lineMap` has exactly one entry per flattened line, indexed from zero:
  flattened line `N` (1-based) is `lineMap[N - 1]`.
- `path` is the normalized manifest-relative path with `/` separators, for
  example `../src/frontend.lts`. `line` is the 1-based line in that file.
- Every flattened line maps to exactly one original file and line. There are no
  synthetic or unmapped lines in a valid bundle.
- Diagnostics convert a flattened line through `lineMap` and report the original
  `path:line:column`. The loader adds no indentation, so the column is unchanged.
  A missing map entry is an internal error, never a reason to print a flattened
  line number.

Example: if `a.lts` has three lines and `b.lts` has two, the bundle is
`a1\na2\na3\nb1\nb2\n` and the map is:

```json
[
  { "path": "a.lts", "line": 1 },
  { "path": "a.lts", "line": 2 },
  { "path": "a.lts", "line": 3 },
  { "path": "b.lts", "line": 1 },
  { "path": "b.lts", "line": 2 }
]
```
