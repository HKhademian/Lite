# Script Arguments & Input Streams

Command-line tools in Lite read passed arguments via `io.inputArgs()` cleanly without hidden process globals.

## Walkthrough

1. `args := io.inputArgs();` returns a `List<String>` containing every CLI argument supplied after `--` (or in the **Args** box here).
2. `loop args as arg` iterates sequentially over each string in `args`.
3. `io.outputLine(...)` displays the argument count and each value in order.

> [!NOTE]
> `io.inputArgs()` returns a snapshot list of user arguments (it excludes the runtime binary name and script path, unlike `argv` in C/Node).

## Try Modifying This

1. Edit the **Args** input to `alpha beta gamma delta` and click **Run**.
2. Add a check using `list.listCountText(args) == 0` to print a custom usage message when no args are passed.

See [Handbook: Imports, Visibility & I/O](../../../handbook/modules/imports-visibility-and-io.md) and [core/io](../../../../../lib/core/io.lts).
