# Overview & Setup

The Handbook teaches the language you can use with the current compiler.
For a quick first run, open the [Hello Lite lesson](lite://learn/hello-lite).
Check [implementation status](lite://doc/implementation-status) before trying a
feature from the [language design](lite://spec).

## What is Lite?

Lite is a statically typed language with a small runtime. Its compiler is
written in Lite and produces TypeScript or standalone C11. The language makes
consequential operations visible in the program text.

- Standard input and output use the explicitly imported [I/O module](lite://module/core/io).
- `var` marks a binding that can be reassigned. `mut` marks permission to change a value
  through a function call.

## Prepare Your Checkout

Follow [local setup](lite://doc/start-here#prepare-the-checkout) for the clone
and run commands. Use [`lite check`](lite://tool/check) to catch errors before
running, [`lite fmt`](lite://tool/fmt) to format, and
[`lite build`](lite://tool/build) to build a native executable. The
[CLI reference](lite://tool) lists the other commands. See
[the contributor guide](lite://doc/contributing) for repository development.

## Your First Program

Open the [guided run](lite://learn/hello-lite) or follow the
[local walkthrough](lite://doc/start-here). The program imports `core/io` as
`io`, reads two integers, and prints twice their sum:

```lite
io := import "core/io";

first := io.inputInt("First integer: ");
second := io.inputInt("Second integer: ");
var total := first + second;
total = total * 2;
io.outputLine(total);
```

Enter `7` and `5` at the prompts to print `24`. To edit the program on its
own, [open double-sum in the Playground](lite://play/double-sum). Look up the calls in
[`core/io`](lite://module/core/io) or open the
[I/O chapter](lite://handbook/imports-visibility-and-io) when you need to parse
arguments or import from another file.

## File Kinds & Comments

Lite scripts use the `.lts` extension and execute top-level statements in file order. Library modules live in `.lt` or `.lts` files and expose symbols with `pub`.

Comments in Lite use **nestable** block syntax `/* ... */` (there are no `//` line comments):

```lite
/* Outer comment
   /* Inner comment stays balanced */
   still inside outer comment */
```

See [Comments](lite://doc/comments) and [module imports](lite://handbook/imports-visibility-and-io).

## Next Chapter

Continue to [Bindings & Mutability](lite://handbook/bindings-and-mutability).
