# Lite compiler prototype

This directory is the first Lite-written compiler stage. It is **not** an
example collection and not the igniter: the sources here are Lite programs that
parse a restricted Lite subset and emit TypeScript or C. The igniter in
[`../igniter/`](../igniter/) executes them today.

## Layout

| Path | Role |
|---|---|
| [`frontend.lts`](frontend.lts) | Shared parser, checked Int evaluation, String/Int locals, report statement stream |
| [`ts-emitter.lts`](ts-emitter.lts) | TypeScript literal encoding, report formatting and program emission |
| [`c-emitter.lts`](c-emitter.lts) | C literal encoding, `printf` report formatting and program emission |
| [`generated/report-42.ts`](generated/report-42.ts) | Checked-in TS reference for `report(42);` |
| [`generated/report-42.c`](generated/report-42.c) | Checked-in C reference for `report(42);` |
| [`generated/run-report.ts`](generated/run-report.ts) | Visible Node adapter for the TS reference |

The backends contain no duplicated parser. They define only the target-specific
literal encoders and `emitProgram`, then include the shared front-end.

## Temporary `importFlatAll`

The front-end is included with:

```text
importFlatAll "frontend.lts";
```

This is a **temporary source-loader workaround**, not a language feature:

- A top-level line `importFlatAll "path";` is replaced by the UTF-8 source of
  that file, resolved relative to the importing file.
- Imported declarations share one flat namespace.
- Each file is included at most once per load; cycles are rejected.
- Imported files are expected to be declaration-only. Do not put executable
  top-level statements in a flat-imported file.
- The loader is implemented in [`../igniter/loader.ts`](../igniter/loader.ts)
  and used by `./lite run`, `./lite run --check`, `litec`, and the test helpers.
  It is not part of the permanent module/import design.

## Run the compiler

```sh
./litec --target ts program.lts > program.ts
./litec --target c program.lts > program.c
```

Equivalent forms:

```sh
./lite compile --target ts program.lts
./lts ts program.lts
```

`lts` is a shorthand for `litec`. `litec` also accepts the target as a bare
positional word: `./litec ts program.lts`.

The compiler source is still restricted: Int arithmetic, String literals and
concatenation, `report(...)`, and immutable Int/String locals. It has no runtime
input, control flow, calls, text indexing, mutable locals, full parser or
self-rebuild. Range faults, division by zero and mixed-type operations are
compile-time rejections. Generated TS uses BigInt; generated C uses
`int64_t`/`INT64_C` and `printf` with `PRId64`.

Verification cases and expected streams live in
[`../igniter/tests/compiler/`](../igniter/tests/compiler/); the schema is in
[`../igniter/tests/README.md`](../igniter/tests/README.md). Run the suite with
`npm test` from `../igniter/`.

See [INV-061](../investigations/INV-061-string-and-multi-value-reports.md) for
the current evidence and limits.
