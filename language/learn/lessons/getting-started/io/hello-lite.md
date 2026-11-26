# Hello Lite & Interactive Console I/O

Click **Run** to execute your first Lite program. The **Stdin** field already
contains `7\n5\n`, so the output ends in `24`.

## Walkthrough

1. `io := import "core/io";` gives the standard I/O module the local name `io`.
2. `io.inputInt("First integer: ")` writes the exact prompt to stdout before reading one checked 64-bit integer from stdin.
3. `var total := first + second;` introduces a mutable `var` binding so `total = total * 2;` can replace its value cleanly.
4. `io.outputLine(total);` prints the final result followed by one newline.

> [!TIP]
> Prompts are explicit program output—if you change or omit the prompt argument in `io.inputInt()`, stdout changes deterministically too.

## Try Modifying This

1. Change **Stdin** in the runner to `12\n8\n` and click **Run** (expect `40`).
2. Change `io.outputLine(total)` to `io.outputLine("doubled:", total);` to see multi-argument spacing.

Follow [local setup](lite://doc/start-here#prepare-the-checkout) to run the same
program in your terminal. Read [Bindings & Mutability](lite://handbook/bindings-and-mutability)
to learn more about `:=` and `var`, or continue to
[Script Arguments & Input Streams](lite://learn/cli-and-inputs).
