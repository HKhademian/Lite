# Principles

Status: **established goals; several implementation choices remain open**.

## Purpose

Provide a language that students can begin using without learning type annotations, while retaining static types and a path to precise library and systems contracts.

## Design goals

- Static, strong typing with inference for ordinary code.
- Functions, conditions, loops, modules, and packages.
- No universal `null`, `nil`, or `undefined` value.
- Optional data through `Option`; recoverable failure through `Result`.
- Declared typed recoverable errors, implicit success construction, postfix `!` propagation at each extracted Result step, and local `else` recovery with optional error receivers.
- A separate panic path, with its execution and cleanup contract still open.
- Immutable and minimally visible declarations by default.
- Interfaces, modifiers, composition, and carefully scoped reuse instead of class inheritance as the primary model.
- Small runtime requirements and native execution as an intended implementation direction.
- Syntax whose meaning does not depend on indentation, tabs, spaces, or line boundaries.
- One conditional syntax for actions and values.
- One `loop` keyword for the supported iteration modes.

## Representative shape

```text
double := fn(x: Int): Int {
    x * 2
}

message := if passed {
    "Congratulations"
} else {
    "Try again"
}

loop users as user {
    greet(user)
}
```

The loop receiver separator is still a working choice. See [loop receivers](loop-receivers.md).

## Beginner-facing defaults

The compiler infers types; it does not remove them. A mutable integer binding cannot later hold text. Braces always delimit bodies. The official formatter chooses presentation without changing behavior. Early returns are encouraged when they make the main path flatter.

Advanced facilities should be introduced as students need them. This is a teaching progression within one language, not a dynamically typed beginner dialect and a separate systems dialect.

## Performance expectations

The aim is performance near C on suitable workloads with a modest runtime. No claim that the language universally outperforms C has been established. Execution time, cold startup, compilation latency, binary size, allocations, and memory usage are separate targets.

## Notes and open questions

The memory model is not selected. Type-system scope, exact visibility syntax, modules, effects, concurrency, and foreign interfaces need further design. Simplicity must be evaluated with actual beginner tasks rather than assumed from familiar syntax.

## Related concepts and references

- [Types and inference](types-and-inference.md)
- [Memory and performance](memory-and-performance.md)
- [Tooling and learning](tooling-and-learning.md)
- [References](references.md), especially the novice-syntax research.
