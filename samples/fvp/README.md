# Runnable FVP examples

Short programs for exploring the current Lite interpreter. These are project
samples, shared by the interpreter tests and editor tooling. Their local index
is independent of the [520 learning exercises](../list.md).

Run from the repository root with Node 26.13.0:

```sh
node igniter/cli.ts samples/fvp/001-double-sum.lts
```

- [001 — Double a sum](001-double-sum.lts): enter 7 and 5; reports 24.
- [002 — Decisions](002-decisions.lts): enter an integer; reports its sign,
  checks a range, and demonstrates short-circuiting before division.
- [003 — Sum positive inputs](003-sum-positive.lts): enter 3, -2, 4, 0;
  skips the negative number, stops at zero, and reports 7.
- [004 — Recursive factorial](004-factorial.lts): enter 5; reports 120.
  Zero reports 1; negative input explicitly exits 2; overflow faults.
- [005 — Arithmetic scanning experiment](005-scan-arithmetic.lts): enter
  12 + 30; reports number/symbol tokens. **Its agent-added text helpers and
  their policies still await explicit consent.** This is implementation
  evidence, not an accepted language feature or the full Lite lexer.

Each file is self-contained. Its visible output is explicitly requested with
report/reportError. Keep future demonstrations here with the next three-digit
index, a descriptive hyphenated filename and an entry in this guide. Module
examples, when supported, should use .lt; runnable scripts use .lts. No .lite
compatibility extension is introduced.

See the [interpreter guide](../../igniter/README.md) for supported features and
limits. Numbering/navigation and successful tests do not select language designs.
