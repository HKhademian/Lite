# Named/Shorthand Calls, `self` Recursion & Explicit Exit

Route arguments cleanly by position, parameter label, or `=arg` shorthand, recurse anonymously with `self(...)`, and exit explicitly via `io.exit(code)`.

## Walkthrough

1. `weighted(a, =b, weight = 3)` mixes positional (`a`), shorthand (`=b` -> `b = b`), and explicit named (`weight = 3`) arguments.
2. `gcd` calls `self(b, a % b)` positionally, while `sumDown` calls `self(n = n - 1, acc = acc + n)` using named parameter routing!
3. `args := io.inputArgs();` inspects passed CLI/runner arguments (`args` box) and invokes `failZeroDivisor` -> `io.errorLine` + `io.exit(2)` (`Never` return type) when `args[0]` is `"0"`.

> [!TIP]
> Try entering `0` into the **Args** box and clicking **Run** to observe stderr diagnostics and exit code `2` cleanly!

## Try Modifying This

1. Pass `5` in **Args** to verify integer argument parsing (`sumDown(5, 0) / 5`).
2. Inspect [`String.toInt`](lite://module/core/text#String.toInt) in [core/text](lite://module/core/text).

See [Handbook: Blocks, Wiring & Closures](lite://handbook/blocks-wiring-and-closures) and [Functions](lite://doc/functions).
