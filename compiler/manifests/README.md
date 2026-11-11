# Compiler source manifests

Status: **manifest roots with a temporary host-expanded source bridge, 2026-11-11**. The bundle loader lives in
[`../../igniter/loader.ts`](../../igniter/loader.ts); the internal driver,
harness remain under [`../../igniter/`](../../igniter/). The default `litec`
entry is now [`../cli.ts`](../cli.ts): both targets use selected generated compilers
through the [current compiler host](../host.ts). The legacy bundle driver is an
explicit reference/audit path.
No public `bootstrap` command is exposed.

A manifest names the root source for one bootstrap target. The current old-seed
bridge expands the root's top-level `import "path";` directives into one
compiler input bundle. This is build plumbing, not the selected language import
semantics. The target language form is `module := import "path";` with explicit
`pub` visibility and separate source units; see
[`../module-import-stages.md`](../module-import-stages.md).
The manifest schema is
[`manifest.schema.json`](manifest.schema.json).

```json
{
  "target": "ts",
  "files": ["../src/ts-root.lts"]
}
```

The TS and C roots import the L0 libraries, target literal encoders, shared
front-end, target emitter and target driver. `lib/core/test.lts` is test-only
and is not part of a compiler bundle.

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
  manifest file. Import paths resolve relative to the importing source.
- Each file appears once. A duplicate is an error, not a silent include-once
  skip. Source imports are visited on open; repeated edges and cycles stop at
  the first visit. The legacy `importFlatAll` directive still rejects cycles.
- Imported files are declaration-oriented except the target root's final driver,
  which may run the bundle.
- Missing files, directories, invalid UTF-8, empty paths and unresolved nested
  directives are load errors.
- The bundle carries no `import`/`export` syntax into the generated artifact.
  The host loader owns import path resolution and explicit dependency metadata.

The temporary `importFlatAll` directive remains only in test helpers. Compiler
source roots use the older bare-import spelling only as long as the selected
seed requires the host-expansion bridge.

## Line-map contract

The loader returns the flattened text plus a line map:

```ts
type LineMapEntry = Readonly<{ path: string; line: number }>;
type Bundle = Readonly<{
  target: 'ts' | 'c';
  text: string;
  lineMap: readonly LineMapEntry[];
  files: readonly string[];
  dependencies: readonly string[];
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
