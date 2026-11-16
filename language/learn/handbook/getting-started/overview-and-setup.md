# Overview & Setup

Welcome to the **Shipped Lite Handbook**. Every feature, type, operator, and standard helper documented in these seven chapters compiles and runs today through Lite's verified TypeScript compiler toolchain.

> [!NOTE]
> For selected design rules still under implementation, working proposals (`LP-0001..LP-0010`), and compiler architecture notes, switch to the **Design Spec & Proposals** layer in the Docs portal or inspect [Language Documentation](../../../../docs/README.md).

## What is Lite?

Lite is a statically typed, small-runtime language and self-hosted compiler designed around three principles:

- **Explicit behavior**: Consequential operations—stdin prompts, stdout printing, mutation (`var`, `mut`), early exit (`io.exit`), and module `import`s—are visible directly in source.
- **No implicit globals**: Even standard input and output require an explicit namespace import (`io := import "core/io";`).
- **Low runtime weight**: Source files compile cleanly to strict TypeScript today, with an active C backend under development (`./bin/lite-compile-c`).

## Prepare Your Checkout

You can run `./bin/lite run` immediately with Node.js (version listed in [igniter/.node-version](../../../../igniter/.node-version)). To also run `./bin/lite check`, formatter tests, and editor checks, install the locked development packages from the repository root:

```sh
npm --prefix igniter ci
npm --prefix editors/vscode ci
```

## Your First Program

Save a script such as [double-sum.lts](../../../../language/examples/foundations/io/double-sum.lts):

```lite
io := import "core/io";

first := io.inputInt("First integer: ");
second := io.inputInt("Second integer: ");
var total := first + second;
total = total * 2;
io.outputLine(total);
```

Run it directly from the repository root:

```sh
./bin/lite run language/examples/foundations/io/double-sum.lts
```

Enter `7` and `5` at the prompts to print `24`. Other everyday commands:

- `./bin/lite check file.lts` — parse, typecheck, and check execution-trace safety without running.
- `./bin/lite compile file.lts` — print compiled TypeScript to stdout.
- `./bin/lite fmt --check file.lts` — verify canonical Lite formatting.
- `./bin/lite doctor` — validate repository consistency and docs links.

## File Kinds & Comments

Lite scripts use the `.lts` extension and execute top-level statements in file order. Library modules live in `.lt` or `.lts` files and expose symbols with `pub`.

Comments in Lite use **nestable** block syntax `/* ... */` (there are no `//` line comments):

```lite
/* Outer comment
   /* Inner comment stays balanced */
   still inside outer comment */
```

See [Comments](../../../../docs/comments.md) and [Start Here](../../../../docs/start-here.md).

## Next Chapter

Continue to [Bindings & Mutability](../foundations/bindings-and-mutability.md).
