# Provisional bootstrap libraries

This tree is **provisional bootstrap support**, not `lite-stdlib`. It has no
stable public API, is not imported by examples or samples, and is not part of
the language specification. Names and signatures may change with the compiler.

`lib/core/` holds declaration-only files shared by the Lite compiler sources:

| File | Capabilities |
|---|---|
| `core/io.lts` | Public host signatures for output, outputLine and errorLine; target support matches current builtins |
| `core/int.lts` | Int64 bounds, checked arithmetic, decimal formatting |
| `core/text.lts` | Public length/at/slice operations plus ASCII predicates, whitespace/name skipping, starts-with, index-of, join, text-to-Int |
| `core/source.lts` | offset clamping, line/column, line start/end/count helpers |
| `core/diag.lts` | prefix-aware `fail`/`expect` diagnostics and exit status |
| `core/format.lts` | decimal text, padding and Int-join helpers |
| `core/list.lts` | specialized index-of/contains plus source-visible, bodyless `fn<T>` signatures for the two registered `pushBack`/`popBack` intrinsics |
| `core/test.lts` | assertions for Lite test entries |

Rules:

- Read-only parameters and returned flat tuples; no `mut` parameters, records,
  generics, closures or `Result`.
- No compiler-specific types (`Parsed`, `Local`, `Item`).
- Every declaration carries a `/** ... */` doc comment.
- These files stay inside bootstrap subset L.

The bodyless declarations in `core/io.lts` are host-backed. The generated
compiler binds each exact module/member/ABI to the existing output lowering or
TypeScript error-stream helper. `...values` is the heterogeneous argument pack
for these two special output statements only; it does not add variadic
user-defined functions. The module does not grant filesystem access. Other
bodyless declarations are rejected unless their exact identity and ABI are
registered for the selected target.

The host accepts omitted prompts for `inputAll`, `inputLine`, `inputInt` and
`inputFloat`, but their provisional Lite declarations still require
`prompt: String`; the declaration syntax cannot express that optionality yet.

`lib/tests/` holds direct Lite test entries. Run them, or compile and execute them:

```sh
./bin/lite run lib/tests/text.lts
./bin/lite compile lib/tests/text.lts > /tmp/lite-text-test.ts
node compiler/entry.ts /tmp/lite-text-test.ts
```

All eight library entries pass the generated TS migration inventory. These are
library tests, not examples or samples.
