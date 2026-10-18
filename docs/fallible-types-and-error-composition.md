# Fallible types and error composition

Status: **`T ! E` fallible types and `T!` shorthand for `T ! Error` selected; error-family composition, aliases, and general type grammar remain proposals**.

## Purpose

Keep recoverable errors explicit and typed without repeating generic wrapper syntax or enumerating every error case in every function signature. Compact fallible type spelling and its default-error shorthand are selected. The composition and alias mechanisms below remain proposals and preserve the existing declared-error coverage rules.

## Selected type templates

```text
SuccessType ! ErrorType
SuccessType!
```

`T ! E` is the selected compact spelling for the conceptual `Result<T, E>`. `T!` is exactly shorthand for `T ! Error`; the missing error operand selects the predefined general recoverable error contract named `Error`. These are ordinary first-class outcome types, usable in variables, parameters, and function return annotations. They do not request automatic unwrapping.

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

The proposed transparent alias form is:

```text
LoadError := type ReadError | ParseError;
```

This follows the uniform binding direction, but the `type` alias expression is still proposed grammar. It names a composition without introducing another nominal wrapper or losing the original error identity.

The [alias syntax review](type-aliases.md) compares this explicit form with LoadError := ReadError | ParseError, along with simple, tuple, generic, and function aliases. It recommends one explicit type prefix for all named aliases; neither form is selected yet. The keyword would cover the full type expression, not just its first union member.

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

These membership rules are proposals for general error union composition, not a completed subtyping system or selected implicit conversion mechanism for arbitrary values.

## Grouping

Prefer explicit grouping whenever a union occurs on either side:

```text
(User | Guest) ! LoadError
User ! (ReadError | ParseError)
(User | Guest) ! (ReadError | ParseError)
```

The proposal rejects an ungrouped mixture such as `User ! ReadError | ParseError` until a single type grammar is selected. That prevents readers from guessing whether the union belongs to the success or error side.

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
- Select the transparent alias spelling independently of the now-selected compact type notation.
- Define general union identity, duplicate removal, flattening, membership, and narrowing.
- Define generic error-family parameters and explicit conversion/mapping notation.
- Set type-expression precedence and grouping consistently with other type constructors.
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
