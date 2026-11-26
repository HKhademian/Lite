# Start with LiteLang

Lite is a small, statically typed language that compiles to TypeScript and
standalone C11. Imports, output, and changes to bindings are visible in the
source.

## Run a first program

Open [Hello Lite](lite://learn/hello-lite) and click **Run**. The lesson feeds in
`7` and `5` on separate lines. The program displays two prompts and prints
`24`. Change the multiplier from `2` to `3` and run it again to get `36`.

```lite
io := import "core/io";

first := io.inputInt("First integer: ");
second := io.inputInt("Second integer: ");
var total := first + second;
total = total * 2;
io.outputLine(total);
```

- `io := import "core/io";` imports the [I/O module](lite://module/core/io)
  under the local name `io`. Calls such as `io.inputInt` use that name.
- `:=` introduces a binding and infers its type from the value. `var total`
  allows a later assignment with `=`. See
  [Bindings & Mutability](lite://handbook/bindings-and-mutability).
- `io.inputInt` prints the prompt before reading, and `io.outputLine` prints
  the result followed by a newline. See
  [Imports, Visibility & Core I/O](lite://handbook/imports-visibility-and-io).

You can also open [double-sum in the Playground](lite://play/double-sum) to edit
it and inspect the generated TypeScript or C11. The
[verification case](lite://repo/language/verifications/artifacts/examples/foundations/io/double-sum.json)
records the program's input, output, and exit code.

## Prepare the checkout

Use Git, a shell, and the Node.js version in
[igniter/.node-version](lite://repo/igniter/.node-version). From a terminal:

```sh
git clone https://github.com/HKhademian/Lite.git
cd Lite
./bin/lite run language/examples/foundations/io/double-sum.lts
```

Enter `7`, press Enter, then enter `5` and press Enter again. Node runs
the generated TypeScript by default. The checkout already contains the
compiler needed for this step.

To start editing your own script, copy the code above into `hello.lts` at the
root of the checkout and run `./bin/lite run hello.lts`. If the shell cannot
find `./bin/lite`, check that your terminal is in the repository root. If it
cannot find `node`, check that `node --version` runs in the same terminal.
For syntax highlighting, see [VS Code support](lite://repo/editors/vscode/README.md).

## Compile, build natively, play, and check

To see the generated TypeScript, run this from the repository root:

```sh
./bin/lite compile --target ts hello.lts > hello.ts
```

Install the locked compiler dependencies to use the C11 target or
[`check`](lite://tool/check):

```sh
npm --prefix igniter ci
./bin/lite check hello.lts
```

`check` compiles and strictly checks the script without executing it.
Use the C11 target to generate C source, run it, or build an executable:

```sh
./bin/lite compile --target c hello.lts > hello.c
./bin/lite run --target c hello.lts
./bin/lite build hello.lts -o hello
./hello
```

[`compile`](lite://tool/compile) writes generated code. Native
[`run`](lite://tool/run) and [`build`](lite://tool/build) need a C compiler
on your path. See the [native build guide](lite://handbook/native-c11-and-optimization)
for compiler options and [`play`](lite://tool/play) for native graphics and audio.
See the [CLI reference](lite://tool) for arguments, help, and formatting.

## Explore

- Read a [short syntax tour](lite://doc/tour), or continue through the
  [Handbook](lite://handbook/overview-and-setup) for language features you can use today.
- Follow the [Learn course](lite://learn) or [practice in Gym](lite://gym).
- Look up an import in the [module reference](lite://module), or find a
  [runnable example](lite://repo/language/examples/README.md) to adapt.
- Check [implementation status](lite://doc/implementation-status) before using
  syntax from the [language design](lite://spec).
- To work on Lite itself, follow the [contributor setup](lite://doc/contributing).
