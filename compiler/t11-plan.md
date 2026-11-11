# T11/T12 atomic implementation plan

Historical T11/T12 slice record, 2026-11-01. The later owner-approved
[transition](transition-plan.md) and [I/O migration](parity.md#temporary-io-migration)
own current names/counts; the checkpoint counts and scope below remain historical.
Original target order was T00 → T11 → T12 only, with C/P7 waiting.

Each slice is one atomic commit. During T11/T12, verify with
`npm --prefix igniter run check`, `./bin/lite test --fast`, and focused TS tests only.
Do not run the full gate, native C, or C parity per slice; full regression and C
validation run at the P6 gate.

## Ordered slices

1. ~~Typed scalar locals~~ — done.
2. ~~Comments in compiler source scanning~~ — done.
3. ~~User-defined functions: scalar parameters/results, calls, recursion, `self`, `return`, TS/C emission~~ — TS done; C rejects clearly.
4. ~~Transparent type aliases in the compiler~~ — done (scalar aliases only).
5. ~~Flat named tuples: types, construction, fields and function signatures~~ — done (TS; C rejects tuple values clearly). Unnamed/nested tuples remain deferred.
6a. Growable list types/literals/indexing and TS types (no traversal or mutation yet) — TS done; C rejects list values clearly. Copy-on-declaration/argument/return is deferred with mutation (6c); unobservable until then.
6b. ~~Loop `seq as item` traversal over lists~~ — TS done (read-only element local); C rejects traversal clearly. `break`/`continue` and list mutation remain deferred.
6c. ~~List mutation grants and `push_back`/`pop_back` end operations~~ — TS done, including copy semantics; C rejects lists clearly.
7. ~~Value `if` expressions in the compiler emitter~~ — TS done (total, same-kind value branches); C rejects value `if` clearly.
8a. ~~I/O builtins: `inputArgs`, `inputAll`, `reportError`, `exit`, `textLength`, `textAt`, `textSlice`, with TS emission~~ — TS done; C rejects clearly.
8b. Generated compiler entry contract: read stdin/args, write stdout/stderr and exit status while preserving the existing `main(): string` corpus contract.
9. ~~Dynamic Int division/remainder (`/ % :/ :%`)~~ — done.
10. ~~Dynamic String concatenation~~ — done (TS ordinary `+`; C checked byte-copy helper with intentionally leaked results).
11. ~~`break`/`continue` lowering in compiler loops~~ — done (bare nearest-loop exits in Boolean, unconditional and list-traversal loops; TS and C).
12. ~~Leading `and`/`or`~~ — TS/C done.
12a. ~~Action `else if` chains (required by S; currently rejected)~~ — done (any number of Bool-conditioned arms, optional final else; TS and C).
12b. ~~Self-compilation preparation inside S~~ — done (Bool-literal and known-call function tails, top-level declarations between functions, statement-shaped value-`if` function tails, and explicit-return rewrites that avoid remaining block-valued `if` bodies).
13. ~~T11: stage 0 runs S on S and emits a runnable TS compiler~~ — done 2026-11-02; 243 216 bytes, strict-clean, runs.
14. ~~T12: T11 runs on S and emits TS; record hashes and compare `T12 == T11`~~ — done 2026-11-02; `T12 == T11` byte for byte (SHA-256 `8273ce69…`).
15. ~~Corpus parity for T11~~ — done 2026-11-02; all 53 program and 39 rejection cases match stage 0 byte for byte.

## Constraints

- No separate IR artifact; emit TS/C directly.
- No new language surface beyond the slice.
- Preserve the current 53 program / 39 rejection outputs unless a slice
  changes an admitted surface intentionally.
- The historical P0 `baseline-artifacts.json` retains its 50 program / 42
  rejection hashes; newly added program cases are checked by live output.
- Every slice updates the bootstrap plan, parity ledger and counts.
