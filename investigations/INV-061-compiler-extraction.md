# INV-061 — Compiler extraction, shared front-end and temporary flat imports

Status: recorded (compiler sources moved out of examples; shared front-end; temporary loader)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Compatible interpreter: alpha.22 and the later alias checkpoint `d7fdd3e`; the loader is a host addition

## Why the move

Examples 017 and 018 began as small `report(...)` demonstrations. Through the
recorded sequencing, arithmetic/local, String and multi-value increments they
became the first Lite-written compiler stage: roughly 900 lines of parser,
checked evaluation and target code generation. They had stopped being examples
and had become compiler implementation, while `examples/` remained their home.

The compiler sources now live under [compiler](../compiler/README.md):

```text
compiler/
  frontend.lts
  ts-emitter.lts
  c-emitter.lts
  generated/
    report-42.ts
    report-42.c
    run-report.ts
    package.json
    tsconfig.json
```

`examples/` keeps only runnable language demonstrations. The 017/018 numbering
gap is intentional; the compiler is no longer listed there.

## Shared front-end, no duplicated parser

The parser, checked Int evaluation, String/Int value model, local lookup,
report statement stream and source-prefix handling are in
[`frontend.lts`](../compiler/frontend.lts). Each backend defines only:

- `intLiteralCode` and `textLiteralCode` (target literal syntax/escaping),
- `emitProgram` (target artifact assembly),
- a four-line driver reading the source and calling the front-end.

The front-end returns one flat `Items` stream instead of nested report lists
(the FVP does not admit list-valued list elements). Item kinds are `Int`,
`String`, `End`, `LocalInt` and `LocalString`. `End` terminates one report
statement; locals carry their runtime name and value kind. This representation
preserves single- and multi-value report formatting and keeps the checked-in
reference artifacts byte-identical.

## Temporary `importFlatAll`

The backends include the shared front-end with:

```text
importFlatAll "frontend.lts";
```

This is a **temporary source-loader workaround**, not language syntax:

- Implemented in [`igniter/loader.ts`](../igniter/loader.ts), used by `./lite
  run`, `--check`, `litec` and test helpers before `compile`.
- A top-level `importFlatAll "path";` line is replaced by the target file's
  UTF-8 source, resolved relative to the importing file.
- Declarations share one flat namespace. Imported files are expected to be
  declaration-only; executable top-level statements are not given import
  semantics.
- Each file is included at most once per load; cycles report a path chain.
- The directive is recognized outside comments and multiline strings; absolute
  paths are rejected.
- Flattening shifts diagnostics relative to the original file layout. Compiler
  application diagnostics are its own, but this remains a loader limitation.
- It is not a permanent module/import design and does not freeze module syntax,
  visibility, declarations/statements separation, caching or dependency rules.

## Command access

- `./ltc --target ts file.lts` (also `./ltc ts file.lts`)
- `./litec --target ts|c file.lts` (full binary)
- `./lite compile --target ts|c file.lts` (CLI form)
- `./lite check file.lts` — check-only validation; `lite run --check` remains
- `./lite docs` and `./lite help` — documentation roots and the command matrix
- `./ltl`, `./lite link`, `./lite fmt`, `./lite verify`, `./lite test` are
  reserved component/CLI names but are not implemented

`ltc`/`litec` require an existing `.lts` file, pass its path as the logical
source name for compiler diagnostics, and write the artifact to stdout. `lite`
keeps `run` and `--check`, adds `check`, `docs` and `help`, and delegates
`compile` to `litec`. Usage errors exit 2. The canonical alias matrix is in
[docs/versioning-and-naming.md](../docs/versioning-and-naming.md#1-canonical-names).

## Verification

- All **172 interpreter test groups** pass under Node 26.12.1/TypeScript 7.0.2;
  all 9 editor grammar groups pass; strict `tsc --noEmit` passes.
- The 43 program and 34 rejection cases under
  [`igniter/tests/compiler/`](../igniter/tests/compiler/) are unchanged in
  expected behavior. Program cases still pass four-way parity across the
  igniter, emitted TS, translated JS and native C; rejection cases still match
  exact diagnostics through both backends.
- Every compiler type/function carries a `/** ... */` doc comment, and a test
  enforces presence for declarations in `frontend.lts`, `ts-emitter.lts` and
  `c-emitter.lts`.
- New tests cover nested/duplicate flat imports, comments and multiline strings
  containing the directive, missing files, cycles, `--check`, and the
  `litec`/`lite compile`/`ltc` commands.
- `compiler/generated/report-42.ts` and `report-42.c` are unchanged after the
  split, and the adapter was updated to import `report-42.ts`.

## Limits

The compiler remains the same restricted subset: Int/String expressions,
immutable Int/String locals and `report(...)`. It has no runtime input, control
flow, calls, text indexing, mutable locals, full parser or self-rebuild.
`importFlatAll` is deliberately replaceable by the future module/import design;
until then it removes parser duplication but is not a language feature.
Distinct target backends remain independent and auditable. C output still
depends on C11 stdlib and `int64_t`/`PRId64`; TS still requires BigInt.
