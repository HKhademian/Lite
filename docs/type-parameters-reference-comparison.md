# Type parameters: reference language comparison

Status: **research, 2026-11-14; no new Lite syntax selected**. This compares
how a function names a type parameter, how a caller supplies or infers it,
and whether types also appear as compile-time arguments. Examples are small
excerpts of the cited documentation, not tested Lite programs. Jai remains
an evidence gap, not a negative finding about its features.

## Named generic parameters

- **Rust:** `fn largest<T>(list: &[T]) -> &T` declares `T` after the function
  name. Calls commonly infer it from arguments. A slice is a Rust-specific
  borrowed representation; it is not Lite's `[T]` capability. [Rust book](https://doc.rust-lang.org/book/ch10-01-syntax.html).
- **Nim:** `func binarySearch[T](a: openArray[T]; elem: T): int` declares
  `T` in square brackets. Nim also has type descriptors (`typedesc`) as
  parameters, so one syntax does not describe every form. [Nim manual](https://nim-lang.org/docs/manual.html#generics).
- **C++:** `template<class T> void sort(Array<T>&);` declares a function
  template in a separate header. Template arguments can be deduced from
  function arguments; explicit template arguments are another route. [C++ draft](https://eel.is/c++draft/temp.fct).
- **Kotlin:** `fun <T> singletonList(item: T): List<T>` declares the type
  parameter before the function name. `singletonList(1)` infers it, while
  `singletonList<Int>(1)` gives it explicitly. [Kotlin generics](https://kotlinlang.org/docs/generics.html#generic-functions).
- **Dart:** `T first<T>(List<T> ts)` declares it after the name and can use
  it in the input and result. Generic type arguments can be inferred in
  applicable contexts. [Dart generics](https://dart.dev/language/generics#using-generic-methods),
  [Dart inference](https://dart.dev/language/type-system#type-inference).
- **Salam:** `func larger<T>(a: T, b: T): T:` declares it after the name.
  The official guide says the argument types infer `T`, and an explicit
  function call such as `larger<int>(3, 9)` does not parse. Generic bounds
  and dynamic interfaces are separate constructs. [Salam generics lesson](https://salamlang.github.io/Salam/learn/generics/).
- **C3:** generic functions and types may declare generic parameters in
  angle brackets, including a function form `fn Foo test2(Test b) <Test>`.
  The guide shows explicit instantiation with braces, as in
  `foo_test::test{int, 3}(1, &g)`. Generic module parameters and macros
  offer other mechanisms. The docs warn that they may drift from the compiler;
  no C3 toolchain was run. [C3 generics](https://c3-lang.org/all/#generic-programming-generics-using-generics).

## Type values in parameter lists

- **Zig:** `fn LinkedList(comptime T: type) type` takes a compile-time type
  argument, as in `LinkedList(i32)`. Zig also has `anytype` value parameters
  whose types are inferred at calls; that is a distinct form, not evidence
  that the explicit `comptime T` argument is automatically omitted. [Zig reference](https://ziglang.org/documentation/master/#struct).
- **Odin:** `my_new :: proc($T: typeid) -> ^T` takes an explicit constant
  type argument, called as `my_new(int)`. Odin also uses `$` in parameter
  types for inferred polymorphic names. [Odin overview](https://odin-lang.org/docs/overview/#parametric-polymorphism).
- **Jai:** the project's earlier research describes Jai as closed beta with
  limited public official specification. This review did not verify an
  authoritative current declaration and call example, so its exact syntax,
  type-argument inference, and passing rules remain **unverified here**.
  Creator demonstrations are a possible follow-up. See [the prior research](../research/investigations/INV-060-sequence-execution-and-surface-models.md).

## What this means for Lite

An explicit type parameter in a declaration and an explicit type argument at
a call are independent choices. A separate parameter list can be inferred at
the call; a type-valued ordinary parameter can be required at the call. The
references also show shorthand inference and language-specific exceptions.
Their punctuation does not select Lite's design.

Candidate shapes, only for comparison:

```text
first := fn <T>(items: [T]): T { items[0] }
first := fn (T: type, items: [T]): T { items[0] }
```

Both would state the input/result relationship, but the second raises a
separate question: when may the type input be omitted or named at a call?
`type` as a parameter type, generic parameter binding, angle brackets, argument
omission, compile-time execution, and type-value semantics are **not selected**.
`[T]` is Lite's already selected full indexed-sequence contract, stronger than
the minimum read requirement inferred in the local `first` example.

Other cases needing decisions include a type used only in the result, multiple
possible inferences, explicit type arguments that conflict with values,
interactions with named arguments and defaults, and type inputs versus ordinary
compile-time values such as array lengths. A public complete contract must
remain visible and must not silently gain body-derived requirements. See
[collection function signatures](collection-function-signatures.md).
