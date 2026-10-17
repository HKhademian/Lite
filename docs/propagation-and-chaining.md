# Propagation and call chaining

Status: **postfix `!` selected for explicit propagation at each fallible step; stored Results and optional-receiver recovery with union results retained**.

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

## Selected spelling

```text
name := load_user(id)!.load_profile()!.name;
```

Each `!` extracts one successful payload or returns its error from the nearest function or closure, subject to that function's declared error type. On failure, later calls and member accesses do not execute. On success, the postfix chain continues without extra grouping.

`!.` consists of the propagation token `!` followed by the member-access token `.`. It is not a separate nullable-access operator; inserting token-separating whitespace changes no semantics. The marker propagates recoverable failures and does not assert success or trigger a panic.

The visual similarity of Rust-style `?.` to JavaScript optional access was a reason to favor `!`. JavaScript's optional chain returns `undefined` for a nullish receiver; LiteScript's `!` instead explicitly forwards a declared recoverable error. See [ECMAScript optional chains](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-optional-chains).

The candidate compact error type notation `T ! E` aligns visually with this spelling, but the type shorthand and placement of its operands remain unselected. Selecting expression propagation does not adopt `T!`, `!T`, or a universal inferred error type.

## Reference-language comparisons

The names below illustrate hypothetical APIs; these sketches compare expression shapes rather than claim that the APIs exist in the referenced standard libraries.

### Rust: a postfix marker at each step

```rust
let name = load_user(id)?.load_profile()?.name;
```

The `?` sits exactly where one Result supplies its successful payload. Ordinary member access can immediately follow it. This retains individual propagation decisions without extra grouping. The official [Rust book](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html#the--operator-shortcut) demonstrates `File::open(...)?` followed directly by another method call and another `?`.

### V: postfix propagation and a recovery block

V uses postfix `!` to propagate a returned Result and `or { ... }` to recover, without requiring ordinary success constructors. Its [Result documentation](https://docs.vlang.io/type-declarations.html#handling-optionsresults) informed the selected LiteScript suffix spelling:

```text
name := load_user(id)!.load_profile()!.name;
```

This is LiteScript source illustrating the selected spelling. Each `!` means typed recoverable propagation, not a panic-producing forced unwrap.

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

## Stored outcomes and superseded spellings

Postfix `!` replaces the earlier prefix `try` and the candidate postfix `?` for recoverable propagation. These are not additional aliases. Optional-value handling remains separate.

The same marker permits delayed propagation of a stored outcome:

```text
attempt := load_user(id);
user := attempt!;
```

Ordinary access to `attempt` retains its Result value. The marker is not needed for capture and does not recursively flatten Result values stored inside a success payload.

## Recovery is a separate retained contract

Both `operation() else(error) { fallback }` and `operation() else { fallback }` are selected. Naming the error is optional; value production is not conditional on that name. Success type `T` and normal fallback type `D` produce `T | D`. See [Result and errors](result-and-errors.md#recovery-result-type).

Continuing from the value of a complete recovery block follows the existing parenthesized block-value continuation rule until a more general rule is selected. Selecting postfix propagation does not silently change that grammar.

## Open decisions

- Complete the postfix grammar and its interaction with arithmetic, indexing, and recovery clauses. Result propagation participates in left-to-right postfix chaining.
- Preserve a precise recovery boundary: handling one step must not accidentally catch an already propagated earlier failure.
- Define readable composition when a recovery block occurs in the middle of a chain, without silently removing the general block-continuation rule.
- Keep Option handling and panic assertions distinct from recoverable Result propagation.

## Related concepts

- [Result and errors](result-and-errors.md)
- [Functions](functions.md)
- [Blocks and results](blocks-and-results.md)
- [Grammar sketch](grammar-sketch.md)
- [Panics](panics.md)
