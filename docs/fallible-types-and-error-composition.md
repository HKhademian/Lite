# Fallible types and error composition

Status: **`T ! E` fallible types, union `|` binding more tightly than binary type `!`, `T!` shorthand for `T ! Error`, and Alias := type TypeExpression selected**. Complete error-family composition, propagation membership, and general type grammar still need formalization.

## Purpose

Keep recoverable errors explicit and typed without repeating generic wrapper syntax or enumerating every error case in every function signature. Compact fallible type spelling, its default-error shorthand, and explicit transparent alias spelling are selected. Complete composition and propagation-membership contracts still need formalization and preserve the existing declared-error coverage rules.

## Selected type templates

```text
SuccessType ! ErrorType
SuccessType!
```

`T ! E` is the selected compact spelling for the conceptual `Result<T, E>`. `T!` is exactly shorthand for `T ! Error`; the missing error operand selects the predefined general recoverable error contract named `Error`. These are ordinary first-class outcome types, usable in variables, parameters, and function return annotations. They do not request automatic unwrapping.

### Fallible-type shorthand attachment selected

Selected by the user, 2026-10-23: the ! in shorthand T! must be attached directly to the end of the type it qualifies. Do not insert whitespace or a comment between that type and its shorthand suffix. The following declaration initializer = is a separate token; spacing before or after it is optional under the ordinary item rules.

```text
x: Box<Int>! = load();
x: Box<Int>!= load();  /* equivalent */
x: Box<Int>!=load();   /* equivalent */
/* rejected: x: Box<Int> != load(); detached shorthand suffix */
```

Angle-bracket generic notation in these examples remains explanatory. If it is adopted as source syntax, a grammatical type context must recognize the closing > separately from an attached fallible ! suffix and any following initializer =, even when their characters are contiguous. It must not reinterpret the detached form as an attached suffix or use name lookup/type checking to guess the boundary. This is a selected conditional boundary contract, not a complete generic grammar or a new comparison operator.

The same shorthand attachment applies to ordinary and grouped types:

```text
x: User!=load();       /* User! followed by initializer = */
x: (A | B)! = load();  /* attached to the grouped success type */
/* rejected: x: User ! = load(); missing explicit error type, detached suffix */
```

Explicit binary fallible types retain their selected T ! E form, including ordinary token-separating spaces. Thus x: User ! ReadError = load() supplies an explicit error type; it does not use the omitted-error shorthand. Presence of an explicit error operand is determined by the type grammar and its boundaries. If no error operand is supplied, the shorthand requires attachment and expands to T ! Error. This source-spelling rule does not change binary ! precedence, error propagation, or the separate expression-level postfix ! contract.

```text
read_text := fn(path: String): String ! ReadError {
    read_file_contents(path)
}
```

This template assumes the final call already returns a compatible outcome. It forwards that outcome unchanged, rather than extracting its payload. A plain successful value would instead be lifted to success under the declared contract.

For a stored outcome, annotations can remain inferred:

```text
attempt := read_text(path);
text := attempt!;
```

Here `attempt` has type `String ! ReadError` and `text` has type `String`. The second line requires an enclosing function whose declared error contract covers `ReadError`.

## Implicit success and explicit failure

```text
validate_age := fn(age: Int): Int ! AgeError {
    if age < 0 {
        return .err(AgeError.Negative)
    }

    age
}
```

The error family and member notation follow existing explanatory examples; their complete declaration and construction grammar remain open. The final ordinary integer supplies success. Panics remain on their separate path.

`Unit ! SaveError` describes successful completion without useful data or a declared save error. This proposal does not add an implicit `Unit` abbreviation.

## Multiple error families proposal

Unions on either side of `!` can be distinguished by type patterns: `(User | Guest) ! (ReadError | ParseError)` supports narrowing the successful payload or the error payload to its active alternative. That capability is selected; the composition and propagation-membership formalization below remains proposed. See [union type patterns](union-patterns.md).

```text
load_age := fn(path: String): Int ! (ReadError | ParseError) {
    text := read_text(path)!;
    parse_age(text)!
}
```

Assume `read_text` returns `String ! ReadError` and `parse_age` returns `Int ! ParseError`. Each `!` forwards only its selected outcome's error. Both error families appear in the enclosing declared contract.

A family can already contain multiple error cases and structured payloads. A function names that family rather than listing each individual case. This does not choose the syntax for declaring those cases.

## Reusing a named composition

The selected transparent alias spelling can name an error composition:

```text
LoadError := type ReadError | ParseError;
```

This follows the selected uniform binding and explicit type-prefix rule. It names a composition without introducing another nominal wrapper or losing the original error identity. Detailed union composition and propagation membership remain separate contracts.

The [alias syntax review](type-aliases.md) compared this explicit form with LoadError := ReadError | ParseError, along with simple, tuple, generic, and function aliases. One explicit type prefix is now selected for all named aliases. The keyword covers the full type expression, not just its first union member.

The function can then declare:

```text
load_age := fn(path: String): Int ! LoadError {
    text := read_text(path)!;
    parse_age(text)!
}
```

An alias is a declaration of coverage, not automatic inference from the body. Changes to the alias's members change the error contract of functions using it and should be visible in review. Public alias evolution and exhaustiveness need a separate compatibility policy.

## Proposed propagation compatibility

- If the operation's possible error type is already included in the declared error union, propagation preserves its concrete identity and payload while injecting it into that union.
- An operation whose error type is a union can propagate only when all its alternatives are covered.
- An uncovered error produces a compile-time diagnostic. The compiler does not silently enlarge the declaration or fall back to a universal error type.
- A domain-specific wrapper error needs an explicit mapping or a separately declared conversion rule. Merely sharing field names or a message does not grant that conversion.
- Errors fully recovered within the function do not need outward coverage. Errors introduced by recovery code still follow the ordinary declaration rule when they escape.

For example, if `parse_age` changes its declared error type to `ParseError | EncodingError`, its propagation into `ReadError | ParseError` must fail to type-check until the caller handles, maps, or declares the additional `EncodingError` alternative.

Plain-union exact-member admission and [exact-member union widening](union-widening.md) are selected as the value-level foundation. Matching-outer-outcome [fallible callable outcome widening](callable-value-variance.md#fallible-callable-views-may-widen-outcomes) now integrates those payload-widening proofs for callable views, preserving .ok/.err and admitting success/error payloads separately. [Stored Result widening](result-and-errors.md#stored-result-values-widen-safely) also applies these proofs to ordinary outcomes and matching nested layers, preserving each branch and layer. Other Result conversions, full propagation compatibility, and a completed subtyping system remain separate; widening an error payload does not authorize arbitrary Result coercion or layer flattening.

## Grouping

In type declarations, union `|` binds more tightly than binary fallible type `!`. Thus `A|B|C!D|E|F` means `(A | B | C) ! (D | E | F)`: the left union is the success type and the right union is the error type. This precedence does not depend on whitespace.

Official reference documentation prefers explicit grouping whenever a union occurs on either side:

```text
(User | Guest) ! LoadError
User ! (ReadError | ParseError)
(User | Guest) ! (ReadError | ParseError)
```

The ungrouped spelling is valid for users, developers, and all other code; grouping is a reference-documentation preference. The grouped spelling makes both sides immediately visible and distinguishes the outcome from `A | B | (C ! D) | E | F`, which is a different type: a union whose only fallible member is `C ! D`. A union of complete fallible types groups those operands, for example `(User ! LoadError) | (Guest ! GuestError)`.

Each nonempty union operand may use its selected optional leading |, including inside explicit grouping: (| User | Guest) ! (| ReadError | ParseError) denotes the same outcome type as (User | Guest) ! (ReadError | ParseError). The leader adds no empty member or Unit and does not change this precedence. See [optional leading separators](leading-separators.md#plain-union-types).

In type position, `!` joins success and error types. In value position, postfix `!` extracts an outcome or propagates its failure. The parser distinguishes those contexts without relying on spaces or newlines.

## General Error shorthand

```text
load_age := fn(path: String): Int! {
    text := read_text(path)!;
    parse_age(text)!
}
```

The return annotation means `Int ! Error`. The broad recoverable error contract is declared through the shorthand; it is not inferred from an unannotated successful return type. The example assumes the read and parse errors belong to the general Error contract.

- `T` declares no recoverable error channel.
- `T!` declares `T ! Error`, allowing the general recoverable error contract.
- `T ! E` retains a specific error contract when narrower coverage is desired.
- `Unit!` means `Unit ! Error`, not an omitted success type.
- `!T` is not a selected alternate spelling.

The broad form does not list exactly which concrete errors can occur, so exhaustive handling of a refined error family may require a narrower declaration or explicit narrowing. The exact definition, admissible error types, extension rules, representation, and narrowing of `Error` remain open. Selecting the shorthand does not turn panics into recoverable errors, discard structured payloads, or choose allocation and boxing rules.

Type and expression contexts distinguish `T!` from `outcome!`: one declares an outcome type and the other extracts or propagates an outcome value. The grammar must distinguish an omitted error operand from a supplied one through type boundaries, never spaces or newlines. `T!Error` and `T ! Error` have the same tokens and meaning.

## Open decisions and notes

- Define the general `Error` contract and its relationship to refined recoverable error types.
- Complete the selected alias production's scope, generic parameters, cycles, and type-expression boundaries.
- Plain-union normalization, exact-member admission, exact-member union widening, and checked member narrowing are selected. Stored Result widening is selected for matching layers with compatible success/error payloads. Other subtype relations, flow-refinement validity, and Result conversions remain open. See [union normalization](union-normalization.md) and [union widening](union-widening.md).
- Define generic error-family parameters and explicit conversion/mapping notation.
- Complete precedence with other type constructors and associativity for repeated fallible type operators; the relative precedence of `|` and binary `!` is selected above.
- Preserve the distinction between transparent aliases and new nominal error types.
- Resolve nested Result success construction and compatible Result passthrough without automatic flattening.
- Decide unused-outcome diagnostics and public error-family compatibility rules.

No runtime representation or allocation behavior is selected here. A typed union does not by itself establish a heap allocation requirement or a particular ABI, and no compiler or benchmark exists.

## Related concepts

- [Result and errors](result-and-errors.md)
- [Propagation and call chaining](propagation-and-chaining.md)
- [Recovery receivers and fallback types](recovery-and-fallbacks.md)
- [Types and inference](types-and-inference.md)
- [Declarations and assignment](declarations-and-assignment.md)
- [Panics](panics.md)

The compact `T ! E` notation and `T!` expansion record user-selected LiteScript rules. The remaining proposals are identified above; reference-language syntax does not adopt them automatically.
