# INV-054 — Readable fixed arrays for the FVP

Status: waiting for input (bounded implementation scope proposed)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-054](TOPICS.md#inv-054)
Covered scope: fixed array values, indexed reads and action traversal.

## Question and consent boundary

Baseline: `fc0fb5d`, tagged igniter-v0.1.0-alpha.9. Named tuples can represent a
token; the next useful step is carrying several such values through a program.
Fixed arrays have existing selected syntax and avoid prematurely choosing the
open runtime-owner/list construction and growth APIs.

The user's "ok next" continues investigation. This note proposes a concrete
implementation scope for approval under the
[consent rule](README.md#explicit-consent-for-language-changes). It adds no
language rule, helper, runtime behavior or implementation yet.

## Existing selected contracts

- [Fixed arrays](../docs/arrays.md): a known-size literal belongs to [T; N],
  with its extent in the type. Arrays and tuples remain distinct families.
- [Fixed dot positions](../docs/arrays.md#literal-numeric-dot-access-selected):
  values.0 reads the same element as values[0]; invalid literal dot positions
  are rejected before execution.
- [Readable indexed sequences](../docs/indexed-sequence-contract.md#readable-t):
  positional reads are zero-based and invalid access faults safely rather
  than creating an implicit Result or wrapping to another position.
- [Array traversal](../docs/loops.md#iterable) and
  [item naming](../docs/loop-receivers.md): evaluate an iterable source once;
  an optional as name binds its current element. Destructure in the body.
- [Value passing](../docs/parameter-values-and-slots.md): preserve ordinary
  evaluated values under their valid component copy contracts.

## Proposed first implementation scope

1. Nonempty homogeneous fixed-array literals containing existing scalar values
   or existing flat scalar tuples, including fully named token tuples.
2. Literal dot reads and Int bracket reads. Reuse the igniter's terminal
   BoundPanic diagnostic for invalid runtime indices, without negative wrapping
   or clamping; this is proposed temporary diagnostic behavior, not a full
   language panic API or recovery implementation.
3. Explicit fixed-array function input/result annotations using [T; N], with
   scalar or flat tuple T and a literal extent. Preserve exact shape/types,
   ordinary copies and compatible whole-value var replacement.
4. Action-only array traversal, with optional as item, source-once evaluation,
   positional order, scoped item/body locals and bare nearest-loop break/continue.

This is proposed coverage, not a language-wide array restriction. Unannotated
empty literals, heterogeneous union-element inference, nested arrays, runtime
growth, member writes, access grants, slices/views, spread, metadata, completion/
cleanup and general collection protocols remain outside this increment.
Do not choose an element type for [] or add a count/length helper to finish it.
No native header-free layout, ABI, ownership or performance claim follows from
the interpreter's host storage.

## Concrete proposed example (not executable yet)

```text
tokens := [
    (kind = "number", text = "12"),
    (kind = "symbol", text = "+"),
    (kind = "number", text = "30"),
];
loop tokens as token {
    report(token.kind, token.text);
}
index := inputInt("Token index: ");
report(tokens[index].text);
```

A scalar function annotation would be fn(values: [Int; 3]): Int. No generic,
growable-owner, implicit prelude or new printing syntax is needed.

Acceptance checks should cover written element order, single evaluation of
receivers/indices and traversal sources, bounds failures, exact shape/type checks,
copy stability after source replacement, tuple element labels, scoped receivers,
continue/break behavior, and rejected unsupported forms before effects. These
are proposed checks, not executed array results. The next accepted example
should use an indexed filename under root ./examples.

## Handoff

Approve or revise this scope before code changes. Array counts/types, mutation,
empty construction and runtime growth can be investigated independently rather
than receiving invented helper APIs. Existing tuple/I/O behavior, experimental
text-helper consent and alpha.9's source/tag remain unchanged.
