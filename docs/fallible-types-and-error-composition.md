# Fallible types and error composition

Status: **working proposal; compact type spelling, error-family composition, and alias syntax require a decision**.

## Purpose

Keep recoverable errors explicit and precisely typed without repeating generic wrapper syntax or enumerating every error case in every function signature. This proposal builds on the selected postfix propagation and declared-error coverage rules; it does not change them.

## Proposed type template

```text
SuccessType ! ErrorType
```

This is the proposed dedicated spelling for the conceptual `Result<SuccessType, ErrorType>`. It describes an ordinary first-class outcome type, usable in variables, parameters, and function return annotations. It is not a second hidden exception channel or an instruction to unwrap automatically.

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

Under this proposal, `attempt` has type `String ! ReadError` and `text` has type `String`. The second line requires an enclosing function whose declared error contract covers `ReadError`.

## Implicit success and explicit failure

```text
validate_age := fn(age: Int): Int ! AgeError {
    if age < 0 {
        return Err(AgeError.Negative)
    }

    age
}
```

The error family and member notation follow existing explanatory examples; their complete declaration and construction grammar remain open. The final ordinary integer supplies success. Panics remain on their separate path.

`Unit ! SaveError` describes successful completion without useful data or a declared save error. This proposal does not add an implicit `Unit` abbreviation.

## Multiple error families

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

## Abbreviations to avoid in this proposal

`T!` and `!T` do not identify both the success and error types. This proposal does not give either spelling a universal default error type or allow undeclared escaping errors to be inferred. An explicit alias can shorten a recurring concrete error contract instead.

## Open decisions and notes

- Select the compact `T ! E` spelling and the transparent alias spelling independently.
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

These are LiteScript-specific proposals based on the design discussion. Existing reference-language syntax does not make any of them established rules.
