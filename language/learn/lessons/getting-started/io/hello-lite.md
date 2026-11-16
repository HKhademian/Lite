# Hello Lite & Interactive Console I/O

Start your first runnable Lite program. Every external capability—even stdin and stdout—enters explicitly via `import`.

## Walkthrough

1. `io := import "core/io";` binds the standard I/O module cleanly without global namespace pollution.
2. `io.inputInt("First integer: ")` writes the exact prompt to stdout before reading one checked 64-bit integer from stdin.
3. `var total := first + second;` introduces a mutable `var` binding so `total = total * 2;` can replace its value cleanly.
4. `io.outputLine(total);` prints the final result followed by one newline.

> [!TIP]
> Prompts are explicit program output—if you change or omit the prompt argument in `io.inputInt()`, stdout changes deterministically too.

## Try Modifying This

1. Change **Stdin** in the runner to `12\n8\n` and click **Run** (expect `40`).
2. Change `io.outputLine(total)` to `io.outputLine("doubled:", total);` to see multi-argument spacing.

See [Handbook: Overview & Setup](../../../handbook/getting-started/overview-and-setup.md) and [Start Here](../../../../../docs/start-here.md).
