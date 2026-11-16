# Bindings, Zero Defaults, Reserved Storage & Mutability

Lite separates **identity**, **initial storage**, and **mutation**. Bindings are immutable unless explicitly declared with `var`.

## Walkthrough

1. `course := "LiteLang";` infers `String` cleanly as an immutable binding. Attempting to reassign `course` later is rejected at compile time.
2. `var zeroCount: Int;` and `flagDefault: Bool;` omit initializers and take deterministic zero values (`0`, `false`).
3. `var greeting: String = ?;` reserves storage without an initial value; both arms of the `if`/`else` initialize it before `io.outputLine` reads it.
4. `score += 20;` applies a compound update on a mutable `var` binding.

> [!IMPORTANT]
> If even one branch leaves an `= ?` binding unassigned before a read, Lite rejects the program at compile time.

## Try Modifying This

1. Try adding `lessonNumber = 2;` to observe the immutable-binding error in **Output**.
2. Comment out `greeting = "Review";` in the `else` branch and watch execution-trace safety catch the uninitialized path.

See [Handbook: Bindings & Mutability](../../../handbook/foundations/bindings-and-mutability.md) and [Declarations & Assignment](../../../../../docs/declarations-and-assignment.md).
