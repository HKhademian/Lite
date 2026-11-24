# Bindings & Mutability

Lite separates **identity**, **initialization**, and **mutation** cleanly. Bindings are immutable by default unless marked `var` or given `mut` storage permission.

## Immutable Bindings (`:=`)

Use `:=` to bind a value with an inferred static type. Reassigning a `:=` binding is a compile-time error:

```lite
io := import "core/io";

course := "LiteLang";
lesson := 1;
io.outputLine(course, lesson);
```

When you want to state the type explicitly alongside an initial value, use `: Type = value`:

```lite
limit: Int = 100;
ratio: Float = 0.75;
```

## Zero-Value Defaults

An explicit type annotation may omit the initializer to initialize the variable cleanly to its type's deterministic zero value (`0`, `0.0`, `false`, `""`, or empty `List<T>`):

```lite
io := import "core/io";

var zeroCount: Int;
flagDefault: Bool;
io.outputLine(zeroCount, flagDefault);
```

## Reserved Storage (`= ?`)

Use `= ?` to declare storage whose **first initialization** happens once later (for example inside mutually exclusive `if`/`else` branches). The compiler's execution-trace checker enforces that no path reads the binding before every path writes it:

```lite
io := import "core/io";

var greeting: String = ?;
lesson := 1;
if lesson == 1 {
    greeting = "Welcome";
} else {
    greeting = "Review";
}
io.outputLine(greeting);
```

You can also pair an immutable binding with `= ?` for definite single assignment: once assigned on a path, it cannot be overwritten later.

## Mutable Bindings (`var`) and Compound Updates

Add `var` before the name to allow later replacement (`=`) and compound updates (`+=`, `-=`, `*=`, `/=`, `%=`, `:/=`, `:%=`):

```lite
io := import "core/io";

var score := 10;
score = score + 5;
score += 20;
io.outputLine(score);
```

For growable collections (`List<T>`), `mut` grants **in-place element/length mutation** (`mut xs.pushBack(v)`), independently of `var` rebinding:

- `xs: List<Int> = [1, 2];` — immutable binding, read-only list.
- `xs: mut List<Int> = [1, 2];` — fixed variable pointing to a mutable list.
- `var mut xs: List<Int> = [1, 2];` — mutable list that can also be rebound with `xs = other`.

## Block Shadowing vs Re-Declaration

Re-declaring the same name inside the **same** `{ ... }` block is rejected by the compiler. Inner blocks may shadow an outer name cleanly; an eager right-hand side (`x := x + 1;`) reads the **outer** binding before introducing the inner shadow.

See [Declarations & Assignment](lite://doc/declarations-and-assignment) and [Mutability](lite://doc/mutability).

## Next Chapter

Continue to [Numbers, Operators & Strings](lite://handbook/numbers-operators-and-strings).
