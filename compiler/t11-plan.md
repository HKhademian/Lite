# T11/T12 atomic implementation plan

Status: **active, 2026-11-01**. Target order is T00 → T11 → T12 only. C/P7 waits.

Each slice is one atomic commit: implement, verify with `./lite test --fast` plus
focused tests, then the full gate before recording the gate.

## Ordered slices

1. ~~Typed scalar locals~~ — done.
2. ~~Comments in compiler source scanning~~ — done.
3. ~~User-defined functions: scalar parameters/results, calls, recursion, `self`, `return`, TS/C emission~~ — TS done; C rejects clearly.
4. Transparent type aliases in the compiler.
5. Flat named/unnamed tuples: types, construction, fields and function signatures.
6. Growable lists: `List<T>` types, literals, indexing, copies, traversal `loop seq as`.
7. Typed collection locals and list mutation grants/end operations.
8. Value `if` expressions in the compiler emitter.
9. Dynamic Int division/remainder (`/ % :/ :%`).
10. Dynamic String concatenation.
11. `break`/`continue` lowering in compiler loops.
12. Leading `and`/`or` and any remaining S expression forms.
13. T11: stage 0 runs S on S and emits a runnable TS compiler.
14. T12: T11 runs on S and emits TS; record hashes and compare `T12 == T11`.

## Constraints

- No separate IR artifact; emit TS/C directly.
- No new language surface beyond the slice.
- Preserve the existing 50 program / 42 rejection outputs until the slice
  changes an admitted surface intentionally.
- Every slice updates the bootstrap plan, parity ledger and counts.
