# Functions

Status: **binding syntax, explicit function types, full and contextually typed `fn` implementations, optional trailing semicolons, colon result types, tail results, early-return direction, and zero-result callable behavior established; lambda shorthand under review**.

## Template

```text
name := fn(parameter: ParameterType): ResultType {
    body
}
```

Functions are definitions bound to names, not a separate category requiring a second named-definition syntax. `fn name(...)` occurred in early sketches; uniform binding syntax is the current direction.

## Example

```text
double := fn(x: Int): Int {
    2 * x
}
```

Use `:` for result annotations, matching other type annotations. The earlier `->` spelling is superseded.

## Function types, literals, and reassignment

An explicitly written function type uses the signature without a body: `fn(a: Int): Int!`. The type after the signature's result colon is the callable's result type; here `Int!` means `Int ! Error`. A function literal uses the same signature followed by its executable body. It is a value expression usable in an initializer or an assignment.

```text
var myfn: fn(a: Int): Int!;

_ := myfn(); // a defaults to 0; zero callable returns .ok(0)

myfn = fn(a: Int): Int! {
    a + 1
};

_ := myfn(); // a defaults to 0; replacement returns .ok(1)
_ := myfn(5); // supplied a = 5; replacement returns .ok(6)
```

The declaration immediately initializes `myfn` to the callable type's zero value. Ordinary `=` replaces that value because the binding is declared `var`; the assigned function must fit the binding's declared callable contract. The example uses the same parameter and result types on both sides. `mut` is not required for whole-binding replacement and does not substitute for `var`.

The calls store their `Int ! Error` outcomes in the ordinary readable `_` binding. They do not implicitly extract success or discard errors; underscore unused-name intent has its separate diagnostic rules. Omitted ordinary value arguments follow the default-initialization rule below.

The explicit signature form and function-literal assignment are selected. Parameter-name identity in function types, broader callable compatibility/variance, captures, ownership, and complete recursive type grammar remain to be specified.

## Omitted value arguments

An omitted ordinary value argument is default-initialized. Use its declared parameter default when one is specified; otherwise its default is zero of its type. Thus an `a: Int` parameter without a specified default receives `0` in `myfn()`, both before and after replacing the callable. A supplied argument takes precedence over that default.

This settles ordinary value parameters. Default-expression syntax, evaluation timing and scope, defaults in callable signatures versus assigned implementations, named-argument omission, and interactions with parameter patterns still need formalization. Omission of caller-access parameters must be reviewed with their `mut`/`var` permission and location contracts. See [initialization](zero-initialization.md) and [evaluation order](evaluation-order.md#function-calls).

## Compact implementations under review

Two forms are selected for the same kind of function: a normal definition with explicit types, and `fn(parameters) { body }` without repeated annotations when an existing contract supplies the types. A separate function-type declaration is not required before a normal definition. Additional lambda shorthand remains under review.

### Two scenarios: full definition and contextual implementation

**1. A normal definition includes its parameter and result types.**

```text
var x := fn(a: Int): String {
    "original"
}
```

The initializer establishes `x`'s callable contract independently of an expected callable type. `var` allows replacing the function value later. The complete function body ends this declaration's item; a trailing semicolon is optional and allowed.

**2. A replacement supplies only its parameter header and body.**

```text
x = fn(a) {
    "replacement"
}
```

Here the existing callable contract supplies the parameter type `Int` and result type `String`. The implementation names its local parameters and provides the body without repeating those types. Omitting annotations does not change the established contract; the replacement must satisfy it. The function body also ends this assignment's item, so its trailing semicolon is optional and allowed. The body above returns a string literal to keep the example focused on function syntax.

The same contextual implementation can be used when a method signature or callback parameter supplies the expected callable type. A separate declaration such as `var x: fn(a: Int): String;` is another source of that contract, not a prerequisite for the normal definition above. The selected contextual `fn` form is separate from the additional lambda spelling discussed below. See [item boundaries](blocks-and-results.md#item-boundaries).

For the declared `var myfn: fn(a: Int): Int!;`, the implementation can infer the parameter's `Int` type and check its body against `Int ! Error`. The candidates differ in how they identify the function and bind its local parameter names.

### Solutions in the modern reference languages

Checked against official documentation on **2026-10-20**. These examples compare callable syntax with ordinary integer results; LiteScript's fallible result and default-callable policies are separate. They are documentation examples, not locally compiled fixtures.

**Rust: general closures with explicit local names and inferred types.**

```rust
let mut myfn: fn(i32) -> i32 = |a| a + 1;
myfn = |a| a * 2;
// A block body is also available:
myfn = |a| { a + 1 };
```

The `|a| expression` form binds names at the implementation site and can infer parameter types from context. Zero parameters use `||`; several use `|a, b|`. An explicitly annotated result requires a block. See [Rust closure expressions](https://doc.rust-lang.org/reference/expressions/closure-expr.html). Non-async closures without captures can coerce to matching function pointers, as above. Capturing closures have their own types and callable-trait contracts; the shown `fn` pointer is not a universal container for them. See [closure types and coercions](https://doc.rust-lang.org/reference/types/closure.html#call-traits-and-coercions).

**V: general function literals, callback lambdas, and specialized array shorthand.**

```v
increment := fn (a int) int { return a + 1 }
doubled := numbers.map(|n| n * 2)
positive := numbers.filter(it > 0)
```

V documents `|variables| expression` lambdas specifically inside higher-order function calls. Its full anonymous `fn` form can be stored as a value. Closures use explicit capture lists such as `fn [offset] (a int) int { return a + offset }`; ordinary captured variables are copied. See [V anonymous functions, lambdas, and closures](https://docs.vlang.io/functions-2.html#anonymous--higher-order-functions). Separately, `it` is the builtin current element in array map/filter expressions, which can also accept anonymous functions. See [V array methods](https://docs.vlang.io/v-types.html#array-methods). The callback-only lambda restriction matters for LiteScript's `myfn = ...` use case; array `it` does not inherit arbitrary API parameter names.

**Odin: reuse the procedure literal.**

```odin
increment := proc(a: int) -> int { return a + 1 }
```

The documented procedure literal has an explicit signature and executable body. This provides an inline implementation without a separate arrow form; see [Odin procedures](https://odin-lang.org/docs/overview/#procedures). Odin's [closure FAQ](https://odin-lang.org/docs/faq/#does-odin-have-closures) distinguishes its anonymous procedures from closures over surrounding local variables. This is a useful reference for keeping literal syntax independent from the decision to support captures.

**Zig: named functions and function pointers, with a container for an inline declaration.**

```zig
const increment: *const fn (i32) i32 = struct {
    fn call(a: i32) i32 { return a + 1; }
}.call;
```

This example composes Zig's documented struct namespace and function-pointer rules. It declares a function in an anonymous container and selects that declaration. The language reference distinguishes compile-time function bodies from potentially runtime-known function pointers; see [Zig functions](https://ziglang.org/documentation/master/#Functions) and [struct namespaces](https://ziglang.org/documentation/master/#struct). This is a more verbose solution to the inline callback problem than Rust/V pipes. `anytype` parameter inference at a call is a separate feature from contextually omitting a callback parameter's type.

For LiteScript, the most directly relevant precedents are Rust's generally usable inferred closures, V's short callback notation, and Odin's reuse of its full literal. The following evaluation is a LiteScript design recommendation, not an assertion that those languages provide the proposed spellings.

### A. Explicit arrow with local parameter names

```text
myfn = a => a + 1;
myfn = a => { a + 1 };

doubled := map(numbers, n => n * 2);
positive := filter(numbers, n => n > 0);
```

A single local parameter name precedes the arrow; parentheses would support zero or multiple parameters, as in `() => 42` and `(a, b) => a + b`. Both expression and block bodies are possible. Parameter bindings and the start of a function are visible at the implementation site. This introduces an arrow token and needs expression-boundary/precedence rules.

### B. Contextually typed fn (selected)

```text
myfn = fn(a) { a + 1 }
doubled := map(numbers, fn(n) { n * 2 });
positive := filter(numbers, fn(n) { n > 0 });
```

This selected form retains the existing function keyword and body shape while inferring parameter and result types from the expected contract. It needs no arrow spelling and keeps a clear function boundary. The complete brace body makes a trailing item semicolon optional; braces inside a callback argument do not end the enclosing call item. Broader standalone parameter inference remains separate.

### C. Arrow-free lambda: parameter list followed by a block (requested review)

```text
myfn = (a) { a + 1 }
doubled := map(numbers, (n) { n * 2 });
positive := filter(numbers, (n) { n > 0 });
```

The user asks whether the lambda form can omit `=>` completely. Yes, this is a viable surface proposal if the grammar reserves a parameter-list-plus-block shape for lambdas in ordinary expression positions. It keeps local parameter bindings explicit and removes both the keyword and arrow. It always uses a brace body. A direct assignment ending in that body would permit an optional trailing semicolon, like the selected `fn` forms.

Proposed grammar boundary, not yet a selected complete production:

```text
contextual_lambda := "(" [identifier {"," identifier}] ")" block
```

This simple version supports `() { ... }`, `(a) { ... }`, and `(a, b) { ... }` under corresponding expected callable contracts. Patterns, annotations, and trailing commas need integration with the eventual parameter-list grammar.

- In an ordinary expression position, `(a) { ... }` is one lambda expression. `(a)` alone remains grouping; this proposal does not reinterpret every parenthesized expression as parameters. A grouped value followed by a separate executable block needs an item separator: `(a); { ... }`.
- A construct's own header/body delimiters take precedence: `if (condition) { ... }` remains a conditional and `loop (source) { ... }` remains a loop. The eventual expression grammar must stop these header expressions before their owner's body instead of consuming that body as a lambda. This restriction needs explicit integration in other brace-owning headers as well.
- Parsing must depend on tokens and syntactic position, not whitespace, expected types, or whether `a` resolves to a type. This reserves `(T) { ... }` for the lambda reading in an ordinary expression position too; it cannot also mean construction through a grouped record type. Existing `T { ... }` construction and grouping the entire construction, `(T { ... })`, retain their separate forms. See [record boundaries](record-literal-boundaries.md).
- Inside a call argument, the lambda body does not close the enclosing call item. Argument commas and ordinary call-item separators still apply. This proposal does not add trailing-block call arguments.

The expected callable supplies parameter and result types; the header still creates local parameter bindings. The body is deferred until invocation and uses ordinary function result/return rules. Omitting the arrow does not choose capture representation, allocation, or a different calling convention. Recommendation: use this as the primary lambda proposal alongside the selected contextual `fn`, and settle these grammar boundaries before selecting it. Arrow and pipe alternatives remain comparisons.

### D. Arrow inheriting parameter names from the signature

```text
myfn = => a + 1;
myfn = => { a + 1 };
```

The expected signature supplies both parameter types and the name `a`. The arrow marks a function boundary with little repeated syntax. This makes signature parameter names significant to implementation scope: renaming them or introducing a same-named enclosing local needs a precise rule. In map/filter calls, the programmer would need the callback parameter names supplied by the API, or a separately designed implicit-name convention. Parameter-name identity in callable types is still open.

A further reduction, `myfn = { a + 1 };`, also inherits parameter names and would make expected type decide whether ordinary executable braces describe immediate work or a deferred function body. That would need an explicit revision to the current block rules and is not the recommended starting point.

### E. Pipe-delimited local parameter names

```text
myfn = |a| a + 1;
myfn = |a| { a + 1 };
doubled := map(numbers, |n| n * 2);
positive := filter(numbers, |n| n > 0);
```

This follows the visible shape used by Rust and V, with Rust's ability to use it for assignment as well as callback arguments. It offers one parameter-list shape for one or several names, without a new arrow token. A zero-parameter spelling such as `|| 42` needs review against existing tokens. LiteScript already uses `|` in type unions, so typed parameter syntax, delimiters, and expression precedence need a precise grammar. Local names remain explicit; expected types do not inject names into scope.

Contextually typed `fn` is selected. A, C, D, and E remain comparisons for additional lambda shorthand; adopting `fn(a) { ... }` does not select an arrow or pipe form. Keep local parameter names visible in the ordinary contextual form. V-style implicit `it` can be evaluated separately if collection-specific shorthand is needed; it does not by itself solve general function assignment. The illustrative map/filter APIs provide expected callback contracts; their library and generic declarations are not selected by these examples.

All candidates are intended to use ordinary function result and return rules, with type information supplied by the expected callable contract. They propose no separate runtime abstraction. Captures, lifetime and representation, broader standalone inference, and complete compact-expression grammar remain open.

## Call evaluation order

Evaluate the callee expression first, then the supplied argument expressions from left to right in source order, then invoke the callable. A function argument is not evaluated before an earlier supplied argument merely because of parameter type, dispatch, or optimization. This does not choose move/copy/borrow rules or temporary lifetimes; see [evaluation order](evaluation-order.md).

## Zero-initialized callables

A zero-initialized function performs no user-body work and returns zero of its declared result type. For example, a callable declared to return `Int` returns `0`; one returning `T ! E` returns `.ok(zero(T))`.

In `callback(make_value())`, if `callback` is zero-initialized, `make_value()` still evaluates before invocation. The ordinary callee/argument evaluation order and required ownership/cleanup rules apply. The zero callable itself makes no updates through granted `mut` or `var` parameters. Argument evaluation or required cleanup can still have effects or failures.

This selects invocation semantics. Complete callable type grammar, ownership and cleanup details, representation, and ABI remain open; see [zero-initialized functions](zero-initialization.md#zero-initialized-functions).

## Collection input requirements

Simple collection functions should not require beginner authors to know protocol names. The [inference proposal](collection-inference.md) explores fn(icons) with reusable requirements inferred from the body, plus contextual construction of collection elements. Generalization, public signatures, and any short annotation remain open; omitting a parameter type does not yet select a generic mechanism.

The [signature proposal](collection-function-signatures.md) separates required input behavior from guaranteed output behavior, inferred inputs from explicitly complete contracts, and static abstract returns from runtime-erased values. A common contract alone does not preserve concrete input/output identity or choose a stored representation. The [operation-contract model](collection-operation-contracts.md) resolves loop/bracket sugar statically and distinguishes unsupported operations from supported operations returning typed failures.

The user-selected direction is to constrain collection inputs by the operations required, not their provider type or compile-time size. Conceptually, fn(icons: `Iterable<Icon>`) can traverse compatible list, array, set, slice, or generated sources without requiring a List conversion. The angle-bracket/interface notation is provisional and does not mandate boxed runtime dispatch. Sized, repeatable, indexed, or contiguous requirements belong in a signature only when needed. Cursor consumption, yielded access, and retained-source lifetimes must remain explicit in their eventual contracts. See [collection abstractions](collection-abstractions.md) and [capabilities](collection-capabilities.md).

## Parameter mutation contracts

The selected [placement rule](mut-qualifier-placement.md) is user: mut User for typed parameters. It replaces the earlier name-prefix spelling while preserving the mutation contract.

Parameters provide read access by default. Qualify the affected parameter's type with mut to request writable access:

```text
rename := fn(user: mut User, name: String): Unit {
    user.name = name
}
```

The example assumes `name` is an accessible writable field in the implementation context. The operation requires writable access to `user`; it only reads the replacement `name` parameter. Each affected receiver or parameter needs its own `mut` marker. A read-only argument cannot satisfy a writable-access requirement.

The same rule applies to a method's receiver binding. The complete method notation and whether it uses an explicit `self` parameter remain open. There is no additional `mut fn` or other function-level mutation marker.

The declaration `mut rename := fn(...) { ... }` would instead describe writable access to the held function value. It does not replace the mutation contracts on the function's parameters.

Calling a mut-qualified parameter requires an explicit grant, as in rename(mut userVar, "Ali"). The caller must already provide mutable access. Updates affect that supplied data; the compiler must not silently mutate a detached copy or upgrade a read-only argument. This selects temporary writable caller-data access for mut parameters. Ordinary read-only input transfer, complete alias/lifetime rules, capture permissions, and purity remain open; see [caller grants](caller-mutation-grants.md).

[Var parameters](slot-parameters.md) provide temporary access to a caller-supplied location: assignment through the parameter replaces the supplied variable or field. The explicit call grant replace(var value) requires a compatible writable location; a whole-binding argument must be var. Var alone grants no payload mutation. General reference values, public pointers, and complete compatibility/alias rules remain open.

The [ordinary parameter review](parameter-values-and-slots.md) keeps the current feature scope to ordinary inputs and writable slots. Read-only defaults do not decide copying versus borrowing. An efficient indirect calling convention must preserve the eventual observable semantics; it does not by itself introduce a public reference feature or caller writeback.

The [access-ergonomics goal](slot-ergonomics.md) hides derived mathematical type structure. Use local declarations and shadowing for working values: fn(count: Int) { var count := count; count += 1; count }. Left-side local-only var headers are omitted; type-side var declares caller replacement. The shorthand fn(param: var) requires an inferable value type under the eventual inference rules. See [var access](var-access-qualifier.md) and [parameter permissions](parameter-permissions.md).

## Result rules

The body's final expression supplies normal completion. A final declaration or assignment produces `Unit`. Trailing separators after an ordinary body item change nothing. The completed function definition ends its outer item with an optional trailing semicolon; see [blocks and results](blocks-and-results.md).

```text
greet := fn(name: String): Unit {
    print("Hello, " + name)
}
```

## Early return

```text
validate := fn(value: Int): Int ! ValidationError {
    if value < 0 {
        return .err(ValidationError.Negative)
    }

    value
}
```

Early returns are encouraged for guards and invalid cases. Explicit final `return` was recommended to remain legal, rather than adding a prohibition with little semantic benefit. Whether a formatter or linter expresses a preference is open.

`return` is control flow, never a parser's ambiguity-breaking hint.

## Recovering at a call

A fallible function exposes a statically typed recoverable error contract. A caller must explicitly handle/inspect the outcome, provide a default, or propagate the error before using the successful payload. Keeping the returned outcome as a `Result` for later handling does not unwrap it. Implicit success construction inside a fallible function does not grant automatic propagation at its callers.

Postfix `operation()!` extracts success or forwards its recoverable error from the nearest function or closure. Member access and calls can continue directly, as in `load_user(id)!.load_profile()!.name`; see [propagation and call chaining](propagation-and-chaining.md). Use `operation() else(error) { ... }` for a local fallback or explicit exit. Without handling or extraction, the call retains its Result as ordinary data. Every recoverable error that can escape, directly or through propagation, must be covered by the function's declared error type. A declaration that promises no recoverable failure cannot silently gain one through inference. One outer propagation marker must not silently extract all intermediate Results in a chain.

The recovery receiver may be omitted: `operation() else { fallback }`. Both recovery forms combine success type `T` and normal fallback type `D` as `T | D`. A fallback need not have the same type as the original success. Returning that union still needs to satisfy the enclosing function's declared return type.

Fallible return annotations use `T ! E`; `T!` is shorthand for `T ! Error`. The general form declares broad recoverable failure, while the explicit error type can retain a refined contract. A return annotation `T` still declares no recoverable error channel. The exact general Error contract remains open.

Local handling does not require a catch boundary around unrelated statements. Complete expression precedence, error conversion rules, and ignored-outcome diagnostics remain open; see [result and errors](result-and-errors.md). [Panics](panics.md) use a separate path. Existing arithmetic examples illustrate success paths and do not settle whether ordinary operators expose recoverable errors or another checked-fault policy.

## Closures

```text
double := fn(x: Int) {
    x * 2
}
```

The same body-result rule applies to anonymous functions. A plain `return` inside a closure exits that closure, not the function that created it. Capture modes and escaping lifetime rules depend on the memory model.

## Recursion and inference

Destructured parameter forms need both surface grammar and a mismatch policy. The [pattern context review](pattern-contexts.md#5-function-and-closure-parameters) recommends patterns irrefutable under the declared parameter contract; no implicit runtime dispatch, skipped call, or new failure channel is selected by writing a parameter pattern.

The language needs a declaration-resolution rule allowing recursive definitions without making arbitrary initialization order implicit. Unannotated parameter inference, public signature requirements, generic constraints, and recursive result inference are still open.

## Tagged exits

`return @tag value` exits a lexically enclosing named construct. It cannot jump across a function or closure boundary. Whether function definitions themselves can carry tags, and how that would interact with ordinary `return`, is not yet specified.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Types and inference](types-and-inference.md)
- [Result and errors](result-and-errors.md)
- [Control-flow exits](control-flow.md)
- [Rust blocks](https://doc.rust-lang.org/reference/expressions/block-expr.html) and [Kotlin functions](https://kotlinlang.org/docs/functions.html) provide comparisons. LiteScript's proposed rule is not a claim that all compared languages handle function bodies identically.
