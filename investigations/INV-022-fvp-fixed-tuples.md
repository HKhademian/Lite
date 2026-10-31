# INV-022 — Fixed tuples for the next FVP increment

Status: recorded (user-approved bounded implementation; wider tuple contracts open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-022](TOPICS.md#inv-022)
Covered scope: a small positional fixed-tuple subset using existing selected syntax.

## Question and authorization boundary

After the VS Code highlighter, what small increment would let Lite carry
structured compiler data? A token needs at least a kind and text. Fixed tuples
already have selected construction, access, binding and copy contracts. At the
proposal baseline, the igniter accepted only scalar function parameters/results.

The proposal was recorded in 73b19c0 before implementation. The user then
explicitly accepted its construction, .0/.1 reads, positional destructuring and
tuple function inputs/results scope with "awesome" on the selected scope text,
2026-10-31. This authorizes the bounded implementation below under the
[consent rule](README.md#explicit-consent-for-language-changes), using existing
selected syntax rather than inventing a new form or helper. The earlier
experimental text helpers still await their separate consent.

## Existing selected contracts

- [Tuple values and access](../docs/tuple-entries-and-access.md): unnamed fixed
  components, zero-based .0/.1 reads, static rejection of invalid positions,
  Unit/() identity, and singleton commas distinct from grouping.
- [Tuple patterns](../docs/tuples-and-patterns.md): ordinary irrefutable
  destructuring, exact arity without rest, and source evaluation before binding.
- [Pattern shadowing](../docs/pattern-shadowing.md): repeated receiver names bind
  in written order; underscore is an ordinary readable name.
- [Fixed-tuple value inputs](../docs/tuple-entries-and-access.md#ordinary-fixed-tuple-value-inputs-selected):
  preserve evaluated component values under valid copy contracts; no implicit
  live alias to a subsequently replaced source location.

## Approved runnable scope

Implemented flat unnamed tuples of the existing Int/Float/String/Bool/Unit values:

1. Construction, singleton/grouping distinctions, Unit/(), and fixed-position reads.
2. Fixed positional declaration patterns, preserving empty/singleton/grouped
   pattern meanings and ordered binding/shadowing.
3. Explicit tuple parameter/result types in existing fn headers, using selected
   unnamed annotations such as (:String, :String) and (:Int,).
4. Ordinary tuple value copies and compatible whole-value var replacement,
   preserving static shape and component types.

This is bounded implementation coverage, not a restriction on the full language.
Named/mixed tuples, nested tuple components/patterns, rest/spread, array segments,
component mutation, access grants and general type/header inference remain
outside this first increment.
No tuple-report formatting or new helper is added; report scalar components.
No native layout/ABI, ownership or performance result follows from host storage.

## Concrete acceptance example

```text
makeToken := fn(kind: String, text: String): (:String, :String) {
    (kind, text)
}

token := makeToken("number", "12");
(kind, text) := token;
report(kind);
report(token.1);
```

Expected requested output: number, then 12, on separate lines. A tuple-valued
parameter should likewise read a supplied tuple without splitting it into
separate call arguments. Existing callee/argument evaluation order remains.

Strict TypeScript no-emit checking and all 62 interpreter test groups pass on
Node 26.13.0/TypeScript 7.0.2. Added tests verify source-once destructuring,
written-order construction, receiver-once access, copy stability after source
replacement, scalar/tuple and Unit-valued position distinctions, grouping/
singleton boundaries, repeated receiver names, tuple parameters/results and
recursion, and static arity/type/position rejection before I/O. Tuple data
captures remain rejected; whole-value aliases cannot become writable member views.

The real CLI [006-fixed-tuples.lts](../examples/006-fixed-tuples.lts) reports
number, 12, number: 12, and 42. It is stored in the user's root examples collection,
not inside the igniter. The editor's sample discovery also scans this example.
Nested tuple components/types/patterns, tuple equality, general typed declarations
and noncontinuing expressions inside tuple construction are explicitly unsupported.
No native layout or compiler-to-compiler rebuild chain is verified.

## Handoff

Preserve this tested source milestone as igniter-v0.1.0-alpha.6, keeping all
previous tags fixed. File I/O and broader structured data remain later gaps;
this accepted subset does not choose their APIs or authorize a complete tuple/
collection implementation. New syntax/features still require explicit consent;
new examples belong under ./examples with indexed names and a guide entry.
