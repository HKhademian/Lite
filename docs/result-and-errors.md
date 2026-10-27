# Result and errors

Status: **ordinary typed outcomes and first-class Result handling established; explicit postfix ? capture, flat panic-bearing failure types, generalized ! extraction, and static exhaustion selected 2026-10-27 in LP-0009/LP-0010**. Error/category details, aggregate inspection/representation, and caught-group forwarding remain open. Manual failure/inference capability is selected in LP-0012; LP-0013/LP-0014 now select typed scalar first-match/discard and directed scalar/group raise.

Normative page for the Result model: `T ! E`, declared failures, propagation, and stored outcomes. [Failure capture and unwrapping](failure-capture-and-unwrapping.md) owns explicit postfix ? boundaries, flat error/panic outcomes, and extraction after recovery. [Expression recovery](expression-recovery.md) owns the `else`/filter surface; [checked fault policy](checked-fault-policy.md) owns typed-panic triggers; [finally](finally.md) owns cleanup ordering. See the [normative page map](normative-pages.md).

## Purpose

Represent recoverable failure in a function's return type and support ordinary conditional pattern handling rather than an implicit exception channel.

## Recoverable failure contract

- A fallible function explicitly declares a recoverable error contract with `T ! E`. The shorthand `T!` means exactly `T ! Error`, selecting the predefined general recoverable error contract. `Result<T, E>` remains explanatory notation for the conceptual outcome type.
- In type declarations, `|` binds more tightly than binary `!`. Ungrouped code is valid; official reference documentation prefers explicit union grouping, as in `(A | B | C) ! (D | E | F)`, so the success and error sides are visible. See [type grouping](fallible-types-and-error-composition.md#grouping).
- To obtain the successful payload, a caller must explicitly inspect/handle the outcome, provide a fallback, or propagate the failure. A fallible call does not automatically supply its payload and silently return from the enclosing function on error.
- An outcome can remain a `Result` value for storage or later handling. Keeping an outcome does not unwrap it; exact diagnostics and rules preventing an ignored recoverable failure still need formalization.
- Implicit success means constructing a successful result from a compatible ordinary return value. It does not mean automatic success extraction or automatic error propagation at every call.
- Zero initialization of a stored `T ! E` produces `.ok(zero(T))`. Thus `attempt: Int ! ReadError;` starts as `.ok(0)`, and nested Result success payloads retain their layers under recursive zero initialization. See [Result zero initialization](zero-initialization.md#result-and-error-boundaries).
- Refined error contracts remain available through `T ! E`; `T!` deliberately selects the broader `Error` contract. An ordinary `T` does not silently become fallible. Aliases, unions, and explicit error mapping may reduce repetition; their syntax and conversion rules remain open. Inference can check a declared contract but must not silently widen a narrow one.

The earlier discussion of ordinary `: Int` signatures hiding recoverable failure with automatic propagation is superseded by this explicit caller contract. An annotation `: Int!` explicitly declares general recoverable failure; `: Int ! AgeError` declares a narrower family. Neither annotation makes callers automatically unwrap the outcome.

[Fallible types and error composition](fallible-types-and-error-composition.md) records the selected spellings, a proposed reusable error-family alias, and proposed composition rules. The exact definition and admissible error types of the general `Error` contract remain open.

## Declared error coverage

Every recoverable error that can escape a function must fit its established outward error contract. Explicit or expected contracts constrain the body and cannot silently widen. [LP-0012 r1](proposals/LP-0012-manual-failures-and-error-inference.md) now allows an eligible unannotated nonrecursive body to establish that contract by inferring escaping returned-error categories. This includes errors explicitly raised/returned, forwarded by !, or exposed by an outward fallible tail. Panics stay outside ordinary inferred E.

Selected clarification, 2026-10-26 ([LP-0004 r1](proposals/LP-0004-count-free-error-contracts.md)): `fn(...): T ! (ErrA | ErrB)` admits failure categories without occurrence counts. Callers must not predict multiplicity or repeat a catch clause per occurrence. [LP-0009 r1](proposals/LP-0009-flat-failure-capture.md) extends the earlier singular Result description: the flat failure side may preserve ordered repeated occurrences. A union lists permitted categories rather than encoding or deduplicating those occurrences. Ordinary explicit .err(error) construction is singular; capture/aggregation can retain several. No implicit Panic member is added to ordinary E.

The [whole-match clarification](expression-recovery.md#whole-match-consumption-selected), LP-0006, covers every matching pending occurrence. LP-0007 selects explicit ...errs: Error collection as [Error], singleton support, once-per-clause execution, and stable occurrence order. LP-0009 adds ...ps: Panic and ...fails: Failure. LP-0013 selects typed scalar first-match/discard; untyped binding, representation, and other failure-directed/tagged exits with unmatched remainders remain open. LP-0015 settles plain function return as abandonment of unfinished captured recovery.

- An explicit or expected plain T output declares no recoverable failure; the function must handle such errors internally. Omitting an output under eligible LP-0012 body inference instead allows an inferred T ! E contract.
- If an operation can return an error outside the declared contract, propagating it is a compile-time error unless an explicit, defined conversion or mapping makes it compatible.
- Fully handled internal errors need not appear in the enclosing function's outward contract. The producing operation still has its own declared error type.
- The compiler may verify coverage and identify missing declarations; it must not silently widen a refined contract to `Error` or admit escaping failures outside an explicit/expected contract. Eligible omitted outputs may establish an inferred contract under LP-0012; that is not widening a supplied declaration. Choosing `T!` itself declares the broad `Error` contract.

Matching-outer-outcome [fallible callable outcome widening](callable-value-variance.md#fallible-callable-views-may-widen-outcomes) is now selected for compatible callable views: source success/error payloads can be admitted into wider public success/error contracts while preserving .ok/.err. [Stored Result widening](#stored-result-values-widen-safely) now applies the same payload proofs to ordinary outcome values and matching nested layers. General error-set composition, generic error contracts, and other Result conversions remain open. [Panics](panics.md) use a separate, implicitly propagating channel and are not implicit members of every recoverable error contract. Uncaptured panics need no ! marker. Explicitly stored panic-bearing outcomes use ! to extract success or resume the retained panic channel, as specified in LP-0010.

## Stored Result values widen safely

Selected 2026-10-25: an existing `S ! E` value fits a destination `T ! F` when the selected value-compatibility rules prove safe widening of both payload types: `S` to `T` and `E` to `F`. An unchanged payload type also fits. This applies to ordinary typed initialization, assignment, arguments, and returns, subject to the other destination checks. It is an instance of [general safe widening](types-and-inference.md#safe-widening).

Assume `ReadError` and `ParseError` are established distinct error types:

```text
source: Int ! ReadError = .ok(7);
wider: (Int | String) ! (ReadError | ParseError) = source;
```

The destination still holds `.ok(7)`. For an arbitrary initialized source holding `.err(error)`, the destination instead retains `.err` with the same active `ReadError` payload. Widening permits additional outcomes in the destination contract; it neither produces a String/ParseError nor changes the source contract. The entire source contract must fit, rather than relying only on the particular `.ok(7)` shown here.

Every existing Result layer and its success/error position is preserved. Matching nested layers can widen recursively when the corresponding payload proofs hold:

```text
nested: (Int ! ReadError) ! ReadError = .ok(source);
nested_wider: ((Int | String) ! (ReadError | ParseError)) ! ReadError = nested;
```

Here the explicit `.ok(source)` constructs the outer layer. The later widening adds no layer, removes none, and does not reassociate error and success payloads. Widening an existing outcome uses its matching-layer proof; failure of that proof is not repaired by silently wrapping the whole source as a success. Deliberately adding an outer layer can use an explicit `.ok(...)`; other ambiguous success-construction cases remain separate.

The transfer follows ordinary value-copy semantics, leaves the source available under its original contract, and may require compiler representation adaptation. For generalized flat outcomes, widening must preserve every occurrence and its channel origin; singular examples do not restrict multiplicity. It does not implicitly unwrap, propagate, handle, or flatten an outcome. Widening a zero source preserves its `.ok(zero(source success type))` value, rather than replacing it with a fresh destination zero. No bitwise-layout, allocation, or ABI guarantee follows.

[Unchecked narrowing is rejected](types-and-inference.md#unchecked-narrowing-is-rejected). The reverse direction requires independently justified narrowing or explicit handling/reconstruction that proves the narrower contract. A destination annotation alone supplies no such proof. An arbitrary `(Int | String) ! (ReadError | ParseError)` cannot be assigned to `Int ! ReadError`: it may contain a String success or ParseError failure. Result widening does not authorize arbitrary error casts, broaden the errors allowed to escape an implementation, or change writable grants. A parameter accepting a Result by value may use this rule; a `var` parameter still follows its caller-location read/write contract.

## Wider fallible callable views

Selected 2026-10-25: source := fn(value: Int): Int ! ReadError { value } may be used directly as fn(value: Int): Int ! (ReadError | ParseError), as fn(value: Int): (Int | String) ! ReadError, or as a view widening both payload/error types. Assume those error types are established. Each source success must fit the destination success type and each source error the destination error type. Source keeps its own contract; narrowing from a broader view is rejected unless additional errors are explicitly handled/mapped. The compiler preserves the outcome branch and required representation/copy behavior without requiring a manual source wrapper. This uses the same payload proofs as [stored Result widening](#stored-result-values-widen-safely). No automatic unwrap, new escaping-error inference, panic conversion, flattening, or arbitrary Result coercion follows. See [fallible callable outcome widening](callable-value-variance.md#fallible-callable-views-may-widen-outcomes).

## Conceptual definition

```text
Result<T, E> = ok(T) | err(E)
```

This is explanatory singular-outcome notation, not settled enum syntax or a complete aggregate definition. Under [LP-0009 r1](proposals/LP-0009-flat-failure-capture.md), the failure side can retain several ordered occurrences admitted by E; an actual E union value still has one active member. Group access uses typed recovery collectors. The generalized .err pattern payload and exact carrier remain open.

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

Manual failure construction and inference are selected in LP-0012. [LP-0014 r1](proposals/LP-0014-directed-failure-exits.md) now specifies directed raise failure / raise ...failures, defaulting to the nearest function/closure for both Error and Panic, or an explicit @outer enclosing-block target. Error/Panic retains its outgoing channel; local handlers inside the target cannot intercept the directed transfer. Surrounding recovery of the completed target remains eligible. Tagged Error failures handled locally do not enter the function's outward error set. See [manual failures](manual-failures-and-inference.md).

## Proposed conversion boundary

- An already compatible `Result` retains its outcome branch and layers; [stored Result widening](#stored-result-values-widen-safely) may adapt its payload representation.
- A plain `T` can be lifted to success when `Result<T, E>` is expected.
- A plain error payload is not silently made an error result; construct the error explicitly.
- Without an expected `Result`, an ordinary value does not become fallible by default.
- No automatic flattening of nested results.

Ambiguous cases, including when `T` is itself a `Result`, need a precise rule and possibly an explicit constructor for exceptional cases.

## Handling and propagation

For ordinary singular outcomes, stored Result patterns explicitly select the lowercase outcome cases `.ok(value)` and `.err(error)`. Successful returns remain implicit; inspecting a success does not require constructing it explicitly at every return.

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

`outcome!` evaluates its operand once and supplies one outcome layer's success payload. Failure forwards all retained occurrences from the nearest function/closure, preserving origins, multiplicity, and order. Returned errors must fit its declared error contract; explicitly captured panics resume their panic channel through applicable cleanup. This is a directed exit, not dynamic local handler lookup or a panic assertion. Uncaptured panics during operand evaluation still use ordinary panic propagation: ! establishes no capture boundary. See [LP-0010 r1](proposals/LP-0010-outcome-extraction-and-exhaustion.md).

The example assumes the read and parse errors are covered by `LoadError`; their composition or mapping must be declared and defined, not guessed from the example. `!` must not erase error types. It participates in a left-to-right postfix chain, so calls and member access can continue from the extracted value without grouping:

```text
name := load_user(id)!.load_profile()!.name;
```

`!.` is the postfix `!` followed by ordinary member access `.`, not a separate nullable-access operator. Whitespace between those tokens does not change meaning. Each marked step extracts only its own Result; it does not automatically extract later outcomes. Complete expression precedence and recovery-clause interactions still need formalization.

Prefix try and postfix ? remain superseded as returned-error propagation spellings. Postfix ? now has the separately selected meaning of explicit failure capture in [LP-0009 r1](proposals/LP-0009-flat-failure-capture.md). No marker is needed to store an already returned Result; capturing panics is an additional explicit action. Option propagation remains open.

## Results passed as arguments

Each Result argument must have its own explicit recovery, inspection, or ! extraction when the receiving parameter expects its ordinary payload. An else around the enclosing call cannot satisfy this requirement. For example, op(exp1(), exp2()) else { fallback_result() } is rejected when exp1/exp2 return Results and op requires their plain success values. Use local argument fallbacks or explicit propagation; see [recovery boundaries](recovery-boundaries.md#result-arguments-require-their-own-handling).

This is independent of panic capture: a returned .err is not a panic. An intact Result can still be passed deliberately to a parameter that accepts Result data, just as it can be stored for later inspection.

## Keeping an outcome as data

An ordinary fallible call returns its `Result` without automatic extraction:

```text
attempt := read_text(path);
```

Here `attempt` retains the typed success-or-error outcome for storage, passing to another function, or conditional inspection. No capture marker or expected-type conversion is required. `attempt!` requests extraction and propagation later; an attached recovery clause can instead provide a fallback. Neither ordinary variable access nor storing a Result recursively unwraps or flattens it.

## Explicit capture and exhausted failure types

Selected [LP-0009 r1](proposals/LP-0009-flat-failure-capture.md): exp? captures its entire operand evaluation. Capturing outward T yields T ! Panic; capturing outward T ! E yields T ! (E | Panic), normalizing one outward layer. It can store supported panic occurrences alongside returned errors for later handling without a mandatory Captured or FailureGroup public wrapper. Error/Panic/Failure selectors mean returned errors, panics, and both respectively. The compiler need not enumerate all concrete panics. Nested Result success payloads remain data; prior escaped panics and function-targeted exits are not captured.

Selected [LP-0010 r1](proposals/LP-0010-outcome-extraction-and-exhaustion.md): exhaustive recovery leaves an ordinary value when no possible failure remains on continuing paths. With failure-free T handlers, T ! (E1 | E2 | Panic), then E1 recovery, then E2 recovery, then Panic recovery yields T ! (E2 | Panic), T ! Panic, and T. No extra ! is needed after complete recovery. A successful instance of an arbitrary fallible type does not establish static exhaustion. New handler/cleanup failures remain obligations. See [the full examples and x11–x26 types](failure-capture-and-unwrapping.md#types-of-the-review-examples).

## Early return and an unfinished recovery outcome

Selected [LP-0015 r1](proposals/LP-0015-early-return-recovery-paths.md): a handler's plain return exits the nearest function/closure normally and abandons that unfinished captured recovery. Remaining captured categories are not implicitly forwarded or grounds for an additional handling rejection for this pattern. The handler's returned value contributes to the function success contract, not the recovery's continuing normal type. Only paths that complete the recovery declaration have its residual T ! RemainingFailures type. Explicit/expected success checks, payload-evaluation failures, and cleanup retain their normal rules. See [the exact tmp1/tmp2 example](expression-recovery.md#early-function-returns-and-continuing-path-types).

## Recovery at a single operation

A programmer must be able to inspect and handle the failure of an individual fallible operation, such as a function call returning `T ! E`. Arithmetic has a separate selected contract: a basic arithmetic fault is a typed panic, not a returned `Result` error. The target-level `else` filter can recover a matching panic at an individual operation; unmatched panic and returned-error behavior remain distinct. See [arithmetic fault boundaries](arithmetic-faults.md).

- Local recovery must be available at the operation's expression, without requiring the surrounding function or a larger computation to be used as the recovery boundary.
- A requested local capture or recovery must observe the operation's outcome without a prior implicit unwrap or automatic propagation.
- Evaluate the selected operation and its executed operands once. Handling its error must not silently repeat the operation.
- Preserve a typed error value so that conditional patterns can distinguish failures and decide whether to recover or explicitly return an error.
- Supporting local recovery does not require every ordinary intermediate binding to be a programmer-visible `Result`.
- Recoverable errors require explicit handling, a default, or postfix `!` propagation before using the successful payload. Automatic propagation from ordinary code is not selected.

### Earlier arithmetic-as-Result proposal (superseded)

An earlier candidate requested an arithmetic outcome through an explicit expected `Result` type:

```text
attempt: Int ! ArithmeticError = a + b;

if .err(error) := attempt {
    report(error)
}
```

The user later selected the panic channel for basic arithmetic faults, so this candidate is superseded for those faults. An expected `Result` type does not capture or convert an arithmetic panic. Local arithmetic recovery uses target-level `else` with a matching typed filter; the example is retained only as design history.

### Expression-local recovery

The later [shared recovery direction](expression-recovery.md) extends the same attached else surface to typed panics from a non-Result operation. Operation-specific recovery is selected; operation fault attribution, block/chain integration, mixed-channel receiver typing, and fault transfer remain pending. The following paragraphs specify returned-Result handling; they do not silently settle panic behavior.

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

On success, the expression supplies the successful payload without executing the recovery block. On failure, the block executes and, if declared, its receiver gets the statically typed error. Omitting the receiver introduces no implicit `err` name and does not change value production. The selected outcome is evaluated once. Its returned error is treated as one pending occurrence for [recovery munching](expression-recovery.md#pending-occurrences-and-munching-selected); this does not wrap E in a source tuple or change Result representation. After complete recovery leaves no possible outward error, no marker is required merely to propagate the consumed error. New handler errors retain their own obligations. A failure arising in the recovery block is not handled again by that same clause; it requires its own handling or explicit propagation.

### Recovery result type

For an operation with success type `T` and a normally completing recovery block with result type `D`, the recovery expression has type `T | D`. This is a statically known union, not dynamic typing. Identical alternatives collapse: a `User` success and a `User` fallback yield `User`.

If the recovery block instead has outward outcome `R ! E2` and handles all original errors `E1`, recovering `T1 ! E1` produces `(T1 | R) ! E2`. Partial recovery also retains the unhandled original error types. This composes the handler's outward failure channel; it does not recursively flatten a Result deliberately stored as successful payload data. See [fallible handler outcomes](expression-recovery.md#fallible-handler-outcomes).

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

This Result recovery form is selected. The same target-level `else` syntax can filter typed panics. A filter handles only its matching type: unmatched panics propagate implicitly, while unmatched returned errors remain a `Result` obligation and may be explicitly propagated with postfix `!`. Full precedence, operation fault attribution, and block/chain integration remain open; evaluated operand/argument panics bypass the outer operation handler. Loop completion is receiverless result processing through `then`; Result recovery keeps its optional failure receiver and does not use the retired action-only distinction.

[Recovery receivers and fallback types](recovery-and-fallbacks.md) compares this optional receiver and union result rule with the reference languages. A precise union still requires narrowing before variant-specific use.

An arithmetic target can use a typed `else` filter to recover a matching panic. It does not become a `Result` error, and an expected `Result` type does not capture it. Exact arithmetic panic categories and operation fault attribution remain open; evaluated operand/argument panics bypass the arithmetic operation handler.

## Unit success

```text
save := fn(data: Data): Unit ! SaveError {
    write_data(data)!;
    Unit
}
```

The final `Unit` represents success without data.

## Failure boundaries

Recoverable errors and panics retain separate origins and propagation channels. Explicit ? can store them together; ! resumes retained origins rather than turning panics into returned Error. Ordinary uncaptured panics still propagate implicitly. Both forwarding paths run applicable exited-scope finally cleanup, retaining primary and secondary failures. See [capture/extraction](failure-capture-and-unwrapping.md) and [cleanup](finally.md#pending-outcomes). Transfer ABI, storage/inspection, hard-abort behavior, and full attachment grammar remain open.

Basic arithmetic faults use the typed panic channel, not the recoverable `Result` contract. The selected target-level `else` can recover a matching typed panic at the operation. Unmatched panics still propagate implicitly; returned errors still require explicit handling or `!`. Exact fault triggers remain open, including floating-point edge behavior and the fixed-width remainder % and modulo _% minimum-value/-1 cases. Arithmetic must not silently wrap, become undefined, or change between build modes. See [arithmetic fault boundaries](arithmetic-faults.md).

### Reference-language distinction

- Rust's ordinary integer division by zero panics; ordinary integer overflow is governed by overflow checks. Neither operation automatically returns a `Result`. Its `checked_add` and `checked_div` methods offer recoverable `Option` outcomes, without a detailed error payload. See [Rust operators](https://doc.rust-lang.org/reference/expressions/operator-expr.html#overflow) and [checked division](https://doc.rust-lang.org/std/primitive.i64.html#method.checked_div).
- Zig separates typed error unions from illegal arithmetic behavior. Overflow and zero division are safety-checked faults when checks are enabled, rather than automatically returned errors. Zig's inferred error sets are still statically typed; inference does not make them untyped. See [Zig errors](https://ziglang.org/documentation/master/#Errors) and [integer overflow](https://ziglang.org/documentation/master/#Integer-Overflow).
- C++ `std::expected` does not turn built-in integer division by zero or signed arithmetic overflow into returned errors. Integer division by zero and an unrepresentable signed quotient have undefined behavior in the built-in arithmetic contract. See [C++ multiplicative operators](https://eel.is/c++draft/expr.mul).

These comparisons explain why ordinary arithmetic does not require recoverable-error propagation markers in those languages. They do not select a LiteScript arithmetic policy.

## Related concepts and references

- [Functions](functions.md), [Conditionals](conditionals.md), and [Control-flow exits](control-flow.md).
- [Propagation and call chaining](propagation-and-chaining.md) compares prefix, postfix, and expression-wide approaches under the retained one-step-at-a-time constraint.
- [Rust Result handling](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html) informed explicit error values and propagation. LiteScript deliberately proposes implicit ordinary success instead of mandatory `Ok(...)` construction.
