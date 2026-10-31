# INV-022 — Fixed tuples for the next FVP increment

Status: waiting for input (implementation scope proposed; not implemented)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-022](TOPICS.md#inv-022)
Covered scope: a small positional fixed-tuple subset using existing selected syntax.

## Question and authorization boundary

After the VS Code highlighter, what small increment would let Lite carry
structured compiler data? A token needs at least a kind and text. Fixed tuples
already have selected construction, access, binding and copy contracts, while
the igniter currently accepts only scalar function parameters/results.

The user's "ok next" continues the review; it does not approve unspecified
features. This note proposes an implementation scope for explicit approval under
the [consent rule](README.md#explicit-consent-for-language-changes). It selects no
new syntax, builtins, tuple semantics, or implementation work. The earlier
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

## Proposed runnable scope

Implement flat unnamed tuples of the existing Int/Float/String/Bool/Unit values:

1. Construction, singleton/grouping distinctions, Unit/(), and fixed-position reads.
2. Fixed positional declaration patterns, preserving empty/singleton/grouped
   pattern meanings and ordered binding/shadowing.
3. Explicit tuple parameter/result types in existing fn headers, using selected
   unnamed annotations such as (:String, :String) and (:Int,).
4. Ordinary tuple value copies and compatible whole-value var replacement,
   preserving static shape and component types.

This is proposed coverage, not a restriction on the full language. Named/mixed
tuples, nested tuple components/patterns, rest/spread, array segments, component
mutation, access grants and inference remain outside this first increment.
No tuple-report formatting or new helper is proposed; report scalar components.
No native layout/ABI, ownership or performance result follows from host storage.

## Concrete acceptance example (not executable yet)

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

Before accepting implementation, test source-once destructuring, written-order
construction, copy stability after source replacement, scalar/tuple distinction,
Unit-valued positions, grouping/singleton boundaries, repeated receiver names,
and static arity/type/position rejection before I/O. These are proposed checks,
not executed Lite results. Document/link checks alone establish no runtime result.

## Handoff

Approve or revise this bounded implementation scope before code changes. No
igniter/editor files, runtime behavior, or release tags change with this note.
File I/O and broader structured data remain later gaps; this note does not choose
their APIs or authorize a complete tuple/collection implementation.
