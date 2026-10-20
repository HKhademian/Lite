# Recovery receivers and fallback types

Status: **optional error receivers, lazy local recovery, and `T | D` result typing selected; reference-language comparisons do not change those rules**.

## Purpose

Separate two questions: whether a handler names the error, and which values the expression can produce after recovery. Omitting the error name does not mean omitting the fallback or suppressing its value.

## LiteScript templates

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

These paragraphs describe returned-Result recovery. The later shared else direction also supports typed panic capture, with combined receiver typing under review in [recovery receiver types](recovery-receiver-types.md). An omitted receiver introduces no implicit error variable. The selected operation is evaluated once. A handler does not catch its own failure; that failure follows its appropriate outward channel.

## Result typing and narrowing

An operation with success type `T` and a normally completing fallback with type `D` produces `T | D`. Equal alternatives collapse. A fallback that explicitly exits adds no local value alternative.

A fallible handler with outward outcome `R ! E2`, handling all of `E1` from `T1 ! E1`, produces `(T1 | R) ! E2`. If only part of the original error type is handled, the outgoing error types also include the unhandled remainder. A later recovery can handle `E2`; the handler cannot catch its own newly produced failure. See [fallible handler outcomes](expression-recovery.md#fallible-handler-outcomes) for the type derivation and the distinction from Results carried as successful payload data.

```text
value := load_user(id) else {
    "Unavailable"
}
```

If the successful payload is `User`, `value` is `User | String`. It must be narrowed before an operation specific to `User`. Inferring the union does not make `.name` or another variant-specific member automatically accessible, invent a null state, or widen the value to an untyped container.

Type-pattern matching is the selected narrowing capability for these union alternatives and for an error union received by the handler. Matching yields a branch-local value with the narrower static type. Nested pattern grammar and overlap rules remain open; see [union type patterns](union-patterns.md).

A fallback returning `Unit` similarly produces `T | Unit`. A declared result type still constrains the expression: an annotation requiring `User` cannot erase a possible `String` or `Unit`. General union grammar, narrowing syntax, common-interface access, ownership, conversions, and representation remain open.

## Reference-language comparisons

### Rust

`Result<T, E>::unwrap_or_else` calls a fallback closure with the error and returns `T`; the fallback must also produce `T`. Ignoring its input still uses a closure parameter pattern, such as `|_|`. `unwrap_or` accepts a fallback value without an error input, but that value is eagerly evaluated; the closure form is lazy. Neither operation automatically infers a new `T | D` union. See [Rust Result](https://doc.rust-lang.org/std/result/enum.Result.html#method.unwrap_or_else).

### Zig

`operation() catch fallback` needs no error binding; `operation() catch |err| recover(err)` names the error. The fallback must fit the successful payload type or not return locally. This is close to LiteScript's optional receiver, but not its automatic recovery-union rule. See [Zig catch](https://ziglang.org/documentation/master/#catch).

### V

`operation() or { fallback }` has no explicit receiver declaration. For Result recovery, V supplies an implicit `err` value that the block can use. Its documentation requires the fallback to fit the unwrapped value type; it does not describe automatically inferring an unrelated success/fallback union. See [V Result handling](https://docs.vlang.io/type-declarations.html#handling-optionsresults).

### C++ expected

`expected<T, E>::value_or` takes a fallback convertible to `T` and returns `T`. It does not provide an error receiver or infer a success/fallback union. `or_else` separately invokes a callable with the error and returns another expected outcome whose value type remains `T`. See [expected observers](https://eel.is/c++draft/expected.object.obs) and [monadic operations](https://eel.is/c++draft/expected.object.monadic).

### Kotlin

`try/catch` is an expression. Its type is the least upper bound of the success and catch-block result types, which can broaden to a common supertype rather than preserve a source-level union of exactly the alternatives. A catch parameter can be ignored with `_`, but the catch still declares an exception type. Kotlin's separate `Result.getOrElse` also allows widening the result through a supertype of the original success type. See [try-expression typing](https://kotlinlang.org/spec/expressions.html#try-expressions), [exception examples](https://kotlinlang.org/docs/exceptions.html), and [getOrElse](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/get-or-else.html).

### Swift

`catch { ... }` can omit an explicit pattern and then gets an implicit `error` binding. Explicit catch patterns allow selective handling. This differs from LiteScript's chosen absence of an implicit receiver name. Swift's `try?` is another convenience: it discards the error and produces an optional result rather than choosing an arbitrary fallback type. See [Swift error handling](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/ErrorHandling.md).

### Odin

`or_else` supplies a default for expressions with optional-ok semantics without an explicit error receiver. It is not the same contract as matching a typed `Result<T, E>` failure. See [Odin or_else](https://odin-lang.org/docs/overview/#or_else-expression).

### Dart, Python, and Lua

Dart can handle an exception type with `on SomeException { ... }` without naming the exception. Python permits `except SomeException:` without `as error`. Their ordinary try statements do not supply LiteScript's typed Result-recovery expression and its `T | D` rule. See [Dart error handling](https://dart.dev/language/error-handling) and [Python exceptions](https://docs.python.org/3/tutorial/errors.html).

Lua's `pcall` returns a success status followed by successful return values or an error object, which the caller can inspect or ignore. It does not impose a static success/fallback union. See [Lua protected calls](https://www.lua.org/manual/5.4/manual.html#pdf-pcall).

## Design consequence

Optional error naming is common. Preserving exactly `T | D` for an ordinary recovery expression is a deliberate LiteScript choice. It retains more precise alternatives than widening to a universal supertype, while requiring narrowing before variant-specific operations.

## Related concepts

- [Result and errors](result-and-errors.md)
- [Propagation and call chaining](propagation-and-chaining.md)
- [Types and inference](types-and-inference.md)
- [Receiver clauses](receiver-clauses.md)
- [Match and exhaustive selection](match.md)
