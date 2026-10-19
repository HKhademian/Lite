# Checked indexing and flat destructuring

Status: **design proposal, 2026-10-19**. The user wants individual collection accesses to support explicit recovery/propagation and successful destructuring bindings to remain at the surrounding scope. This document proposes operation contracts and a new checked-binding extension; neither indexing fallibility nor that extension is selected grammar yet.

## Checked indexing

Proposed dynamic indexing returns a typed recoverable outcome, conceptually T ! BoundsError:

```text
user := users[index] else {
    default_user()
}

user := users[index]!;
```

Assume users provides supported random indexing over User elements. BoundsError is an explanatory error-family name; its exact declaration and payload are open. The first form handles failure locally; the second propagates it under the enclosing function's declared error contract. A stored outcome can also be inspected later. Recovery still combines success and fallback types under the existing T | D rule.

An unhandled fallible access must not silently yield User. Known collection size alone does not prove that an arbitrary index is valid. Conversely, a language-defined static extent/index proof could permit infallible access; decide that rule explicitly. Removing a runtime bounds check in optimization must not independently change the source operation's public Result contract or erase required handling.

Unsupported indexing is a compile-time capability error, not a BoundsError. A set or generator does not gain indexed access by potentially failing it. Access must validate and read under a stable source contract; checking length and later accessing independently is insufficient when the source may change.

This proposal does not select indexing writes, addressable element references, ownership transfer, concurrent collection semantics, or arithmetic failure policy. Iteration over a suitable collection can obtain its valid elements through the traversal protocol without making the body separately index and handle a BoundsError for each item.

## A shape test is not an invalid element access

```text
if [a, b] := values {
    use_pair(a, b);
}
```

The condition asks whether the supported sequence has exactly two matching elements. The implementation establishes shape before extracting components. A short sequence makes the pattern false; it must not attempt an out-of-bounds read to discover the mismatch. This remains a useful selection form with branch-local bindings.

Checked extraction asks for required components. An insufficient shape is then a recoverable extraction failure. Sharing shape checks with a pattern test does not force both constructs to have the same mismatch behavior. A producer's own failure is a separate error and must not be silently treated as pattern mismatch.

## Proposed flat checked binding

```text
[a, b] := values else(error) {
    return .err(error)
}

use_pair(a, b);
```

This would explicitly handle a fallible exact-length extraction while leaving a and b at the surrounding scope. The example assumes the enclosing function declares the relevant error contract. Before successful completion of the whole extraction, neither new binding is available to the handler or following code. Shadowed old bindings remain governed by the existing source-before-binding rules. Failure must not publish a partial declaration; this does not promise rollback of arbitrary side effects.

The else is a **new proposed handler for the checked binding**, not ordinary Result recovery on values. A stored List is still a List. Error shape, typed-subpattern failures, complete grammar, ownership, and diagnostic behavior need review before extending this to all refutable declarations.

A normally completing handler could instead provide a replacement source guaranteed to match:

```text
[a, b] := values else {
    [0, 0]
}

use_pair(a, b);
```

The fallback must satisfy the entire pattern. It is evaluated only on extraction failure, once; do not recursively invoke the same handler if the fallback fails. Bindings are inferred from all admitted successful sources, including the fallback, under the existing compatible-input rule. An empty handler returning Unit cannot supply the two required elements. Full fallback proof and type rules remain proposals.

## Plain declarations and propagation

Without a handler, keep the existing recommendation that direct declarations require a proof of success:

```text
[a, b] := [1]; /* compilation error */
```

For a runtime shape, choose explicit selection or the proposed checked handler. A compact propagation form for checked patterns is still open. Do not pretend [a, b] := values! propagates a pattern failure: postfix ! only extracts an actual Result, and values may be an ordinary List. A future explicit checked-extraction operation returning a Result could reuse ! directly, once its API is designed.

## Source restrictions

Initially limit bracket extraction to suitable ordered sequence contracts. Runtime-known size, repeatability, contiguity, and indexed access are independent properties. Future hot/cold producers and generators require explicit consumption and delivery rules; exact-length matching must not implicitly drain, subscribe, wait for completion, or materialize them. See [source contracts](collection-source-contracts.md).

Related: [sequence patterns](sequence-patterns.md), [pattern contexts](pattern-contexts.md), [Result](result-and-errors.md), [fallbacks](recovery-and-fallbacks.md), and [capabilities](collection-capabilities.md).
