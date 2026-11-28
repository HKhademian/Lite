# Interfaces, Associated Types, Lexical Contexts & Overloading

Separate data schemas from nominal `interface` contracts, dispatch dynamically with `dyn Interface`, thread implicit dependencies explicitly via `context(...)`, and overload functions cleanly by arity or type.

## Walkthrough

1. `Metric` declares an associated type `Sample: Type` used by static bounded generics (`fn<T: Type<Metric>>(m: T): T.Sample`).
2. `Printable` is object-safe (no associated type) and provides a default method body `render` that `Sensor` inherits while `Badge` overrides it.
3. `context envTag := "prod";` and `context mut seqNo: Int = 0;` supply lexical defaults; `context (envTag = "stage") { ... }` scopes a temporary immutable override cleanly across calls.
4. Overloaded `fmt(Int)` and `fmt(String)` resolve statically at compile time with zero runtime ambiguity.

## Try Modifying This

1. Override `render` on `Sensor` and see `dyn Printable` pick up the new formatting automatically.
2. Wrap `emitLine(s)` inside `context (envTag = "canary") { ... }` and compare outputs.

See [Handbook: Interfaces, Contexts & Overloading](lite://handbook/interfaces-contexts-and-overloading), [Composition & Interfaces](lite://doc/composition-and-interfaces), and [Tags & Contexts](lite://doc/tags-and-contexts).
