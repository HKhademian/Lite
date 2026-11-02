# Provisional bootstrap libraries

This tree is **provisional bootstrap support**, not `lite-stdlib`. It has no
stable public API, is not imported by examples or samples, and is not part of
the language specification. Names and signatures may change with the compiler.

`lib/core/` holds declaration-only files shared by the Lite compiler sources:

| File | Capabilities |
|---|---|
| `core/int.lts` | Int64 bounds, checked arithmetic, decimal formatting |
| `core/text.lts` | ASCII predicates, whitespace/name skipping, starts-with, index-of, join, text-to-Int |
| `core/source.lts` | offset clamping, line/column, line start/end/count helpers |
| `core/diag.lts` | prefix-aware `fail`/`expect` diagnostics and exit status |
| `core/format.lts` | decimal text, padding and Int-join helpers |
| `core/list.lts` | specialized index-of/contains for supported element types |
| `core/test.lts` | assertions for Lite test entries |

Rules:

- Read-only parameters and returned flat tuples; no `mut` parameters, records,
  generics, closures or `Result`.
- No compiler-specific types (`Parsed`, `Local`, `Item`).
- Every declaration carries a `/** ... */` doc comment.
- These files stay inside bootstrap subset L.

`lib/tests/` holds direct Lite test entries. Compile and execute them:

```sh
./lite compile lib/tests/text.lts > /tmp/lite-text-test.ts
node compiler/entry.ts /tmp/lite-text-test.ts
```

All eight library entries pass the generated TS migration inventory. These are
library tests, not examples or samples.
