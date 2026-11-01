# T11/T12 atomic implementation plan

Status: **active, 2026-11-01**. Target order is T00 → T11 → T12 only. C/P7 waits.

Each slice is one atomic commit: implement, verify with `./lite test --fast` plus
focused tests, then the full gate before recording the gate.

## Ordered slices

1. ~~Typed scalar locals~~ — done.
2. ~~Comments in compiler source scanning~~ — done.
3. ~~User-defined functions: scalar parameters/results, calls, recursion, `self`, `return`, TS/C emission~~ — TS done; C rejects clearly.
4. ~~Transparent type aliases in the compiler~~ — done (scalar aliases only).
5. ~~Flat named tuples: types, construction, fields and function signatures~~ — done (TS; C rejects tuple values clearly). Unnamed/nested tuples remain deferred.
6a. Growable list types/literals/indexing and TS types (no traversal or mutation yet) — TS done; C rejects list values clearly. Copy-on-declaration/argument/return is deferred with mutation (6c); unobservable until then.
6b. ~~Loop `seq as item` traversal over lists~~ — TS done (read-only element local); C rejects traversal clearly. `break`/`continue` and list mutation remain deferred.
6c. ~~List mutation grants and `push_back`/`pop_back` end operations~~ — TS done, including copy semantics; C rejects lists clearly.
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
