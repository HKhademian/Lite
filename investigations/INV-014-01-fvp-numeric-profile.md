# INV-014 — Temporary FVP numeric profile

Status: in progress
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-014](TOPICS.md#inv-014)
Covered subtopics: INV-014.01 (provisional representations), INV-014.03 (partial:
overflow, zero divisors, and non-finite values in the first interpreter slice)
Subtopic briefs: [INV-014.01](SUBTOPICS.md#inv-014-01), [INV-014.03](SUBTOPICS.md#inv-014-03)

This is a non-normative investigation. The profile below is a proposal, not
selected numeric semantics, an implemented evaluator, or a permanent ABI.

## Question and current contracts

Baseline: `c2d9bee`; working tree clean before this note.

What concrete numeric representations should the first interpreter support,
without waiting for every sized type, conversion, or advanced numeric library?

- The [first checkpoint](../docs/tooling-and-learning.md#first-executable-checkpoint)
  selects integer/floating values and + - * /, unary minus, and grouping.
  Numeric/text details remain open.
- [Numbers](../docs/numbers.md#representation-proposal) records a suggested
  signed 64-bit Int, but no selected width. Floating precision is also open.
- [Division](../docs/division.md#floating-calculation-and-integer-storage)
  separates calculation from typed storage. With no floating operands or result
  expectation, integer division truncates toward zero. Floating operands retain
  fractional calculation; grouping does not insert a storage conversion.
- [Arithmetic faults](../docs/arithmetic-faults.md#selected-channel) use typed
  panics rather than returned Results. Silent wrapping/undefined overflow is
  already excluded. Floating zero-divisor and non-finite policies remain open.
- [Temporary input faults](../docs/tooling-and-learning.md#temporary-input-failures)
  reject invalid input instead of substituting defaults. The helpers and FVP
  scaffolding can be replaced later.

## Proposed bounded profile

1. **Integer family:** signed 64-bit values, from -2^63 through 2^63 - 1.
   Check +, -, *, unary negation, and / for representability. An arithmetic
   result outside the range raises a typed arithmetic panic, not wraparound.
   Include the minimum-value divided by -1 and negated-minimum boundary cases.
2. **Floating family:** one 64-bit binary floating representation for the FVP's
   floating literals, arithmetic, and inputFloat success values. This does not
   assign permanent widths to the public Float/Double names or add sized types.
3. **Finite values only in this experimental profile:** reject non-finite literal/
   input values; fault if an arithmetic operation produces a non-finite result.
   Division by integer or floating zero raises an arithmetic panic. Concrete
   fault categories/payloads and exact floating rounding/underflow remain open.
4. **Preserve selected division:** integer-only 7 / 2 gives 3 and -7 / 2 gives
   -3; 7.0 / 2 gives 3.5. Do not use floating calculation and rounding as a
   shortcut for exact 64-bit integer division. Typed-storage forms remain subject
   to their existing rules if/when admitted in the supported syntax.
5. **Different failure sources stay distinct:** an out-of-range source literal
   gets a diagnostic; invalid/out-of-range helper input gets an input fault;
   failed arithmetic gets the selected typed-panic channel. Unhandled fatal
   execution failures follow the selected nonzero host completion mapping.

This is a proposed temporary profile to implement, not a host-language default.
Mixed arithmetic promotions beyond already-selected division, literal grammar
and signed-boundary parsing, exact floating rounding/subnormals, representability
checks, and formatting still need a bounded contract. Do not silently use this
proposal to settle those questions or general numeric assignment conversions.

## Alternatives and recommendation

- **A — Bounded 64-bit families:** makes the first evaluator check a concrete
  range and distinguishes invalid input/overflow. This is the recommended profile
  above, not a performance claim or a language-wide representation selection.
- **B — Arbitrary-precision integers:** removes fixed-width overflow for ordinary
  integer arithmetic, but needs an explicit growing-value cost/resource policy.
- **C — Host defaults:** avoids a stated representation choice but lets the
  implementation language choose observable behavior. Not recommended; the FVP
  should have an explicit profile, even if its implementation uses host facilities.

**Recommendation, not selected:** A, with one finite 64-bit floating family and
checked failures as above. Arbitrary precision, additional widths, decimals,
non-finite numeric APIs, and native representation/ABI remain later questions.

## Verification and handoff

Checked the existing numeric/division/fault contracts and the first checkpoint;
checked note/tracking links, fences, and focused diff consistency. No LiteLang
numeric probe or host arithmetic experiment was run. No speed/size result is
claimed.

First accept or revise the provisional widths and fault boundary. Then settle
the few remaining rounding/promotion/literal details needed for this slice,
alongside its text profile and implementation language. All permanent numeric
contracts remain reviewable; the proposal does not implement any types.
