# INV-054 — Readable fixed arrays for the FVP

Status: recorded (explicitly approved bounded implementation)
Contributor: project contributor (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-054](TOPICS.md#inv-054)
Covered scope: fixed array values, indexed reads and action traversal.

## Question and consent boundary

Baseline: `fc0fb5d`, tagged igniter-v0.1.0-alpha.9. Named tuples can represent a
token; the next useful step is carrying several such values through a program.
Fixed arrays have existing selected syntax and avoid prematurely choosing the
open runtime-owner/list construction and growth APIs.

The proposal was recorded atomically in `7aea062`. The user then explicitly
accepted this concrete subset with "sure", authorizing the implementation
under the [consent rule](README.md#explicit-consent-for-language-changes).
This implements existing selected forms and the approved temporary diagnostic
behavior, without inventing a helper or selecting the wider collection design.

## Existing selected contracts

- [Fixed arrays](../../docs/arrays.md): a known-size literal belongs to [T; N],
  with its extent in the type. Arrays and tuples remain distinct families.
- [Fixed dot positions](../../docs/arrays.md#literal-numeric-dot-access-selected):
  values.0 reads the same element as values[0]; invalid literal dot positions
  are rejected before execution.
- [Readable indexed sequences](../../docs/indexed-sequence-contract.md#readable-t):
  positional reads are zero-based and invalid access faults safely rather
  than creating an implicit Result or wrapping to another position.
- [Array traversal](../../docs/loops.md#iterable) and
  [item naming](../../docs/loop-receivers.md): evaluate an iterable source once;
  an optional as name binds its current element. Destructure in the body.
- [Value passing](../../docs/parameter-values-and-slots.md): preserve ordinary
  evaluated values under their valid component copy contracts.

## Approved implemented scope

1. Nonempty homogeneous fixed-array literals containing existing scalar values
   or existing flat scalar tuples, including fully named token tuples.
2. Literal dot reads and Int bracket reads. Reuse the igniter's terminal
   BoundPanic diagnostic for invalid runtime indices, without negative wrapping
   or clamping; this is approved temporary diagnostic behavior, not a full
   language panic API or recovery implementation.
3. Explicit fixed-array function input/result annotations using [T; N], with
   scalar or flat tuple T and a literal extent. Preserve exact shape/types,
   ordinary copies and compatible whole-value var replacement.
4. Action-only array traversal, with optional as item, source-once evaluation,
   positional order, scoped item/body locals and bare nearest-loop break/continue.

This is bounded coverage, not a language-wide array restriction. Empty array
construction, heterogeneous union-element inference, nested arrays, runtime
growth, member writes, access grants, slices/views, spread, metadata, completion/
cleanup and general collection protocols remain outside this increment.
Do not choose an element type for [] or add a count/length helper to finish it.
No native header-free layout, ABI, ownership or performance claim follows from
the interpreter's host storage.

## Concrete example

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

Strict TypeScript no-emit checking and all 93 interpreter test groups pass on
Node 26.13.0/TypeScript 7.0.2. Added cases cover written element order, single
evaluation of receivers/indices and traversal sources, static versus runtime
bounds failures, exact extent/element/label checks, recursive function inputs/
results, copy stability after source replacement, Unit-valued positions,
scoped receivers, nearest-loop continue/break, function/program exits and rejected
unsupported forms before effects. A constructor completes all its entry effects
before traversal; break does not undo those effects or restart the source.

The real [009-fixed-arrays.lts](../../language/examples/009-fixed-arrays.lts) runs through
./bin/lite run, visits three token tuples, reads a supplied index and reports sum: 60
through a fixed-array function. Input 1 reports the + token; input -1 exits 1
with a located BoundPanic after the explicit prompt. Check-only mode neither
prompts nor reads. The current PATH Node also runs this example successfully.
No native layout, ownership, performance or full sequence-protocol result is
claimed. Empty array literals remain unsupported even under a known annotation;
no default element type or new constructor is selected.

## Handoff

Preserve this tested source as igniter-v0.1.0-alpha.10 with prior tags unchanged.
General count/length APIs, mutation, empty construction, type inference and
runtime growth remain separate investigations rather than receiving invented
helper APIs. Existing tuple/I/O behavior and experimental text-helper consent
remain unchanged; new syntax/features still require explicit user approval.
