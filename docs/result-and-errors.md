# Result and errors

Status: **`T ! E` and `T!` outcome types, typed declared recoverable failures, implicit success construction, postfix `!` propagation, optional-receiver `else` recovery with union results, and first-class Result outcomes established; Error's full contract and arithmetic failure policy open**.

## Purpose

Represent recoverable failure in a function's return type and support ordinary conditional pattern handling rather than an implicit exception channel.

## Recoverable failure contract

- A fallible function explicitly declares a recoverable error contract with `T ! E`. The shorthand `T!` means exactly `T ! Error`, selecting the predefined general recoverable error contract. `Result<T, E>` remains explanatory notation for the conceptual outcome type.
- To obtain the successful payload, a caller must explicitly inspect/handle the outcome, provide a fallback, or propagate the failure. A fallible call does not automatically supply its payload and silently return from the enclosing function on error.
- An outcome can remain a `Result` value for storage or later handling. Keeping an outcome does not unwrap it; exact diagnostics and rules preventing an ignored recoverable failure still need formalization.
- Implicit success means constructing a successful result from a compatible ordinary return value. It does not mean automatic success extraction or automatic error propagation at every call.
- Refined error contracts remain available through `T ! E`; `T!` deliberately selects the broader `Error` contract. An ordinary `T` does not silently become fallible. Aliases, unions, and explicit error mapping may reduce repetition; their syntax and conversion rules remain open. Inference can check a declared contract but must not silently widen a narrow one.

The earlier discussion of ordinary `: Int` signatures hiding recoverable failure with automatic propagation is superseded by this explicit caller contract. An annotation `: Int!` explicitly declares general recoverable failure; `: Int ! AgeError` declares a narrower family. Neither annotation makes callers automatically unwrap the outcome.

[Fallible types and error composition](fallible-types-and-error-composition.md) records the selected spellings, a proposed reusable error-family alias, and proposed composition rules. The exact definition and admissible error types of the general `Error` contract remain open.

## Declared error coverage

Every recoverable error that can escape a function must be covered by its declared error type. This includes errors explicitly returned by the function and errors forwarded when a postfix `!` operation fails. Compiler-generated forwarding does not exempt an error from declaration.

- A function declaring no recoverable failure must handle such failures internally; it cannot use `!` to let them escape.
- If an operation can return an error outside the declared contract, propagating it is a compile-time error unless an explicit, defined conversion or mapping makes it compatible.
- Fully handled internal errors need not appear in the enclosing function's outward contract. The producing operation still has its own declared error type.
- The compiler may verify coverage and identify missing declarations; it must not silently widen a refined contract to `Error` or infer additional escaping failures outside the declared contract. Choosing `T!` itself declares the broad `Error` contract.

Exact error-set composition, generic error contracts, and conversion rules remain open. [Panics](panics.md) use a separate, implicitly propagating channel and are not implicit members of every recoverable error contract. The postfix ! marker is needed for Result forwarding, not panic forwarding.

## Conceptual definition

```text
Result<T, E> = ok(T) | err(E)
```

This explanatory notation does not settle enum declaration syntax. Ordinary success paths should not require an `Ok(...)` wrapper.

## Function template

```text
validate_age := fn(age: Int): Int ! AgeError {
    if age < 0 {
        return .err(AgeError.Negative)
    }

    age
}
```

The expected `Int ! AgeError` contract makes the final integer a success. Errors are explicit. Early returns are encouraged when they keep the normal path flat.

The user has proposed throw error as exact shorthand for return .err(error). Its [error-return proposal](error-return-sugar.md) preserves declared error coverage, nearest-function/closure exits, and explicit caller handling. Explicit return .ok(value) remains available alongside implicit success. The throw spelling is not yet selected; it adds no implicit exception channel or panic operation.

## Proposed conversion boundary

- An already compatible `Result` passes through unchanged.
- A plain `T` can be lifted to success when `Result<T, E>` is expected.
- A plain error payload is not silently made an error result; construct the error explicitly.
- Without an expected `Result`, an ordinary value does not become fallible by default.
- No automatic flattening of nested results.

Ambiguous cases, including when `T` is itself a `Result`, need a precise rule and possibly an explicit constructor for exceptional cases.

## Handling and propagation

Stored Result patterns explicitly select the lowercase outcome cases `.ok(value)` and `.err(error)`. Successful returns remain implicit; inspecting a success does not require constructing it explicitly at every return.

```text
match attempt {
    .ok(value) { use_value(value) }
    .err(error) { report(error) }
}
```

Matching a stored Result does not implicitly extract success, propagate failure, or reinterpret a payload type pattern as an outcome pattern. After selecting the outcome, its payload can use the shared type, value, and structural subpatterns. Tag-only `.ok` and `.err` patterns select the side without binding a payload. Successful construction remains implicit at appropriate return contracts independently of explicit outcome inspection. Complete constructor inference remains a separate type-system contract.

Match-arm and chains can inspect fields or match additional values after an outcome pattern succeeds. They must not erase the outer tag, flatten nested Results, or treat a later error as a false guard. If successful and error payloads have overlapping types, their payload type alone still cannot identify the outcome side.

```text
if .err(error) := validate_age(text_age) {
    report(error)
}
```

Propagation uses postfix `!`:

```text
load_age := fn(path: String): Int ! LoadError {
    text := read_text(path)!;
    parse_age(text)!
}
```

`outcome!` evaluates its operand once. For success it supplies one Result layer's payload; for a recoverable error it exits the nearest function or closure with that error, subject to the enclosing declared error contract. It does not dynamically search for a handler or cross a function boundary to return from an outer caller. Applicable structured cleanup follows the existing exit rules. This is recoverable propagation, not a panic-producing assertion of success.

The example assumes the read and parse errors are covered by `LoadError`; their composition or mapping must be declared and defined, not guessed from the example. `!` must not erase error types. It participates in a left-to-right postfix chain, so calls and member access can continue from the extracted value without grouping:

```text
name := load_user(id)!.load_profile()!.name;
```

`!.` is the postfix `!` followed by ordinary member access `.`, not a separate nullable-access operator. Whitespace between those tokens does not change meaning. Each marked step extracts only its own Result; it does not automatically extract later outcomes. Complete expression precedence and recovery-clause interactions still need formalization.

Prefix `try` and postfix `?` are superseded as recoverable-error propagation spellings. No marker is required to retain a Result as data. Optional-value propagation remains a separate open decision. See [propagation and call chaining](propagation-and-chaining.md).

## Results passed as arguments

Each Result argument must have its own explicit recovery, inspection, or ! extraction when the receiving parameter expects its ordinary payload. An else around the enclosing call cannot satisfy this requirement. For example, op(exp1(), exp2()) else { fallback_result() } is rejected when exp1/exp2 return Results and op requires their plain success values. Use local argument fallbacks or explicit propagation; see [recovery boundaries](recovery-boundaries.md#result-arguments-require-their-own-handling).

This is independent of panic capture: a returned .err is not a panic. An intact Result can still be passed deliberately to a parameter that accepts Result data, just as it can be stored for later inspection.

## Keeping an outcome as data

An ordinary fallible call returns its `Result` without automatic extraction:

```text
attempt := read_text(path);
```

Here `attempt` retains the typed success-or-error outcome for storage, passing to another function, or conditional inspection. No capture marker or expected-type conversion is required. `attempt!` requests extraction and propagation later; an attached recovery clause can instead provide a fallback. Neither ordinary variable access nor storing a Result recursively unwraps or flattens it.

## Recovery at a single operation

A programmer must be able to inspect and handle the failure of an individual fallible operation, including arithmetic and a function call. Addition overflow is included; this is not solely a division-by-zero mechanism.

- Local recovery must be available at the operation's expression, without requiring the surrounding function or a larger computation to be used as the recovery boundary.
- A requested local capture or recovery must observe the operation's outcome without a prior implicit unwrap or automatic propagation.
- Evaluate the selected operation and its executed operands once. Handling its error must not silently repeat the operation.
- Preserve a typed error value so that conditional patterns can distinguish failures and decide whether to recover or explicitly return an error.
- Supporting local recovery does not require every ordinary intermediate binding to be a programmer-visible `Result`.
- Recoverable errors require explicit handling, a default, or postfix `!` propagation before using the successful payload. Automatic propagation from ordinary code is not selected.

### Arithmetic capture proposal

One earlier candidate for arithmetic is an explicit expected `Result` type at the capture point:

```text
attempt: Int ! ArithmeticError = a + b;

if .err(error) := attempt {
    report(error)
}
```

This is a proposal for requesting a recoverable arithmetic outcome. It does not establish that ordinary `+` returns a `Result`, or that expected types can change the operator's failure policy. Expected-type capture, distinct from ordinary success lifting, has not been selected. The example handles the error case only; success extraction still follows the eventual pattern contract.

### Expression-local recovery

The later [shared recovery direction](expression-recovery.md) extends the same attached else surface to typed panics from a non-Result operation. Scope, mixed-channel receiver typing, and fault transfer remain pending. The following paragraphs specify returned-Result handling; they do not silently settle panic behavior.

An attached `else` handles the selected Result outcome. Its error receiver is optional:

```text
user := load_user(id) else(error) {
    report(error);
    guest_user()
}
```

```text
user := load_user(id) else {
    guest_user()
}
```

On success, the expression supplies the successful payload without executing the recovery block. On failure, the block executes and, if declared, its receiver gets the statically typed error. Omitting the receiver introduces no implicit `err` name and does not change value production. The selected outcome is evaluated once. A failure arising in the recovery block is not handled again by that same clause; it requires its own handling or explicit propagation.

### Recovery result type

For an operation with success type `T` and a normally completing recovery block with result type `D`, the recovery expression has type `T | D`. This is a statically known union, not dynamic typing. Identical alternatives collapse: a `User` success and a `User` fallback yield `User`.

```text
message := load_user(id) else {
    "Unavailable"
}
```

If `load_user` succeeds with `User`, `message` has type `User | String`. A caller must narrow it before using an operation specific to only one alternative. An expected `User` annotation cannot erase the `String` alternative.

Union alternatives can be narrowed by matching their type. This applies both to the recovered success/fallback union and to error-union receivers such as `ReadError | ParseError`. An intact Result first retains its success/failure distinction; payload type tests cannot decide that distinction when the sides overlap. See [union type patterns](union-patterns.md) for selected conditional patterns and the remaining semantic decisions.

- An explicitly exiting recovery branch supplies no local alternative; an early `return`, valid `break`, or other exit is checked against its own target.
- A recovery block ending in `Unit` contributes a `Unit` alternative; `Result<User, E>` recovered this way yields `User | Unit`, without inventing null or a default User.
- This is a selected union-forming boundary for Result recovery. It does not automatically make unrelated `if` or `match` branches infer unions.
- General union syntax, narrowing, conversions, layout, and ownership rules remain open. `T | D` records the type relationship without settling all type grammar.

This Result recovery form is selected. It does not introduce dynamic handler lookup through arbitrary callees or catch a panic. Full precedence and evaluation scope for nested operands remain open. The separate loop-completion hook's rule that a missing receiver denotes action-only behavior does not apply to Result recovery.

[Recovery receivers and fallback types](recovery-and-fallbacks.md) compares this optional receiver and union result rule with the reference languages. A precise union still requires narrowing before variant-specific use.

Applying the same form to `(a + b) else(error) { ... }` remains an arithmetic-recovery proposal until operator failure contracts are settled. Selecting Result recovery does not silently make ordinary arithmetic return Result.

## Unit success

```text
save := fn(data: Data): Unit ! SaveError {
    write_data(data)!;
    Unit
}
```

The final `Unit` represents success without data.

## Failure boundaries

Recoverable errors and panics have separate paths. Postfix `!` and Result recovery operate on declared recoverable outcomes; they do not turn panics into returned errors. Which conditions panic, how a panic is triggered, termination versus unwinding, and panic cleanup guarantees remain open; see [panics](panics.md). Process termination and allocation failure have not been assigned a universal mechanism.

An arithmetic fault is not automatically a recoverable returned error merely because it can be detected. Whether ordinary fixed-width addition overflow, integer division by zero, and unrepresentable quotients belong to the recoverable contract remains open. Any selected policy must reconcile concise ordinary arithmetic with the existing requirement for local arithmetic recovery. No implicit trapping, wrapping, undefined behavior, or build-dependent change is adopted by this distinction.

### Reference-language distinction

- Rust's ordinary integer division by zero panics; ordinary integer overflow is governed by overflow checks. Neither operation automatically returns a `Result`. Its `checked_add` and `checked_div` methods offer recoverable `Option` outcomes, without a detailed error payload. See [Rust operators](https://doc.rust-lang.org/reference/expressions/operator-expr.html#overflow) and [checked division](https://doc.rust-lang.org/std/primitive.i64.html#method.checked_div).
- Zig separates typed error unions from illegal arithmetic behavior. Overflow and zero division are safety-checked faults when checks are enabled, rather than automatically returned errors. Zig's inferred error sets are still statically typed; inference does not make them untyped. See [Zig errors](https://ziglang.org/documentation/master/#Errors) and [integer overflow](https://ziglang.org/documentation/master/#Integer-Overflow).
- C++ `std::expected` does not turn built-in integer division by zero or signed arithmetic overflow into returned errors. Integer division by zero and an unrepresentable signed quotient have undefined behavior in the built-in arithmetic contract. See [C++ multiplicative operators](https://eel.is/c++draft/expr.mul).

These comparisons explain why ordinary arithmetic does not require recoverable-error propagation markers in those languages. They do not select a LiteScript arithmetic policy.

## Related concepts and references

- [Functions](functions.md), [Conditionals](conditionals.md), and [Control-flow exits](control-flow.md).
- [Propagation and call chaining](propagation-and-chaining.md) compares prefix, postfix, and expression-wide approaches under the retained one-step-at-a-time constraint.
- [Rust Result handling](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html) informed explicit error values and propagation. LiteScript deliberately proposes implicit ordinary success instead of mandatory `Ok(...)` construction.
