# Propagation and call chaining

Status: **explicit handling at each fallible step and stored Result values retained; earlier prefix `try` spelling reopened for review; postfix alternatives are proposals**.

## Purpose

Allow a successful value to continue through ordinary calls and member access without mandatory temporary bindings or repeated grouping around propagation. A chain must still identify each fallible outcome it extracts.

## Retained constraints

- A plain fallible call returns a Result that can be stored and inspected as ordinary data.
- Each propagation step extracts one Result layer. One outer marker must not silently extract all intermediate Result values.
- Every escaping recoverable error must fit the enclosing function's declared error contract.
- A failed step prevents later chain steps from executing.
- Temporary bindings remain useful, but they must not be the only readable way to chain fallible calls.
- Extra parentheses around prefix propagation were rejected as an acceptable everyday chain style.
- Syntax is a source-ergonomics decision. No compiler or benchmark establishes runtime speed differences between spellings.

## Reference-language comparisons

The names below illustrate hypothetical APIs; these sketches compare expression shapes rather than claim that the APIs exist in the referenced standard libraries.

### Rust: a postfix marker at each step

```rust
let name = load_user(id)?.load_profile()?.name;
```

The `?` sits exactly where one Result supplies its successful payload. Ordinary member access can immediately follow it. This retains individual propagation decisions without extra grouping. The official [Rust book](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html#the--operator-shortcut) demonstrates `File::open(...)?` followed directly by another method call and another `?`.

### V: postfix propagation and a recovery block

V uses postfix `!` to propagate a returned Result and `or { ... }` to recover, without requiring ordinary success constructors. Its [Result documentation](https://docs.vlang.io/type-declarations.html#handling-optionsresults) provides the comparison for a proposed LiteScript suffix spelling:

```text
name := load_user(id)!.load_profile()!.name;
```

This is a LiteScript candidate using V's propagation spelling, not selected grammar. Each `!` would mean typed recoverable propagation, not a panic-producing forced unwrap.

### Zig: prefix extraction

Zig's `try` consumes one error union and either supplies its payload or returns the error. A later call that itself returns an error union needs its own handling. Prefix extraction can therefore require grouping when continuing with members or further fallible calls. See [Zig try](https://ziglang.org/documentation/master/#try).

This is the same ergonomic issue raised against LiteScript's earlier prefix design; using Zig's keyword alone does not resolve it.

### Swift: a throwing expression

```swift
let name = try loadUser(id).loadProfile().name
```

Swift can mark a larger throwing expression once. Throwing calls produce their ordinary successful return values through a separate throwing contract, rather than returning Result wrappers that each need extraction. Its [expression reference](https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#try-operator) explicitly describes a single `try` covering multiple throwing calls.

Adopting that behavior for a chain of LiteScript Result values would change the retained one-layer-at-a-time rule. Swift's spelling is not evidence that ordinary nested Result extraction can be omitted without defining different semantics.

### C++ expected: value composition

`std::expected` provides `and_then` for a fallible continuation and `transform` for mapping a successful value. A chain can remain an expected value until explicitly inspected, but passing functions or lambdas adds its own notation. See [C++ expected monadic operations](https://eel.is/c++draft/expected.object.monadic).

This is useful library composition, not an implicit early-return operator.

## LiteScript direction under review

The earlier prefix `try` choice is reopened. Postfix `!` and `?` are comparison candidates, not additional accepted aliases. The previous rejection of postfix `?` should not prevent evaluating its chaining shape; its eventual meaning remains unselected.

A postfix candidate would permit both immediate propagation and delayed propagation of a stored outcome:

```text
attempt := load_user(id);
user := attempt!;
```

Ordinary access to `attempt` would still retain its Result value. These templates do not select `!` as final syntax or turn it into a capture marker.

## Recovery is a separate retained contract

Both `operation() else(error) { fallback }` and `operation() else { fallback }` are selected. Naming the error is optional; value production is not conditional on that name. Success type `T` and normal fallback type `D` produce `T | D`. See [Result and errors](result-and-errors.md#recovery-result-type).

Continuing from the value of a complete recovery block follows the existing parenthesized block-value continuation rule until a more general rule is selected. No new postfix proposal silently changes that grammar.

## Open decisions

- Choose a single propagation spelling that supports readable chains.
- Define binding strength relative to calls, members, indexing, and recovery clauses.
- Preserve a precise recovery boundary: handling one step must not accidentally catch an already propagated earlier failure.
- Define readable composition when a recovery block occurs in the middle of a chain, without silently removing the general block-continuation rule.
- Keep Option handling and panic assertions distinct from recoverable Result propagation.

## Related concepts

- [Result and errors](result-and-errors.md)
- [Functions](functions.md)
- [Blocks and results](blocks-and-results.md)
- [Grammar sketch](grammar-sketch.md)
- [Panics](panics.md)
