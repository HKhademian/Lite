# Overview & Setup

Welcome to the **Shipped Lite Handbook**. Every feature, type, operator, and module documented in these eleven chapters compiles and runs today through Lite's verified **dual-target TypeScript and native C11** compiler toolchain.

> [!NOTE]
> For selected design rules still under implementation, working proposals (`LP-0001..LP-0018`), and compiler architecture notes, switch to the **Design Spec & Proposals** layer in the Docs portal or inspect [Language Documentation](lite://doc/overview).

## What is Lite?

Lite is a statically typed, small-runtime language and **3-generation self-hosted compiler** (verified on both TypeScript and native C11) designed around three principles:

- **Explicit behavior**: Consequential operations—stdin prompts, stdout printing, mutation (`var`, `mut`), early exit (`io.exit`), and module `import`s—are visible directly in source.
- **No implicit globals**: Even standard input and output require an explicit namespace import (`io := import "core/io";`).
- **Dual-target lightweight execution**: Source files compile cleanly to strict TypeScript (`--target ts`) **and** standalone native C11 (`--target c`, checked under `-std=c11 -Wall -Wextra -Werror`) with optimization levels `-O0` through `-O3` and `-Os`.

## Prepare Your Checkout

You can run `./bin/lite run` immediately with Node.js (version listed in [igniter/.node-version](lite://repo/igniter/.node-version)). To also run `./bin/lite check`, formatter tests, and editor checks, install the locked development packages from the repository root:

```sh
npm --prefix igniter ci
npm --prefix editors/vscode ci
```

## Your First Program

Save a script such as [double-sum.lts](lite://play/double-sum):

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

- [`./bin/lite check`](lite://tool/check) `file.lts` — parse, typecheck, and check execution-trace safety across TS and C11 without running.
- [`./bin/lite compile`](lite://tool/compile) `[--target ts|c] [-O0..-O3|-Os] file.lts` — print compiled TypeScript or C11 to stdout.
- [`./bin/lite build`](lite://tool/build) `[-O0..-O3|-Os] file.lts [-o out]` — compile a Lite program into a standalone native executable via C11.
- [`./bin/lite play`](lite://tool/play) `file.lts` — launch interactive `extra/canvas` / `extra/audio` Play games in a native resizable/fullscreenable desktop window.
- [`./bin/lite fmt`](lite://tool/fmt) `--check file.lts` — verify canonical Lite formatting.
- [`./bin/lite doctor`](lite://tool/doctor) — validate repository consistency and docs links.

## File Kinds & Comments

Lite scripts use the `.lts` extension and execute top-level statements in file order. Library modules live in `.lt` or `.lts` files and expose symbols with `pub`.

Comments in Lite use **nestable** block syntax `/* ... */` (there are no `//` line comments):

```lite
/* Outer comment
   /* Inner comment stays balanced */
   still inside outer comment */
```

See [Comments](lite://doc/comments) and [Start Here](lite://doc/start-here).

## Next Chapter

Continue to [Bindings & Mutability](lite://handbook/bindings-and-mutability).
