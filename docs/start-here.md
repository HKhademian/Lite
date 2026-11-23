# Start with LiteLang

Lite is a small, explicit programming language with a **3-generation self-hosted
compiler** written in LiteLang, targeting both **strict TypeScript** and
**standalone native C11** (`-std=c11 -Wall -Wextra -Werror`) with 36 `core/*`
and `extra/*` standard and experimental modules.

## Prepare the checkout

Compiling and running a script use the checked-in generated compiler and need no
installed packages. Use the Node version in
[igniter/.node-version](lite://repo/igniter/.node-version).

`./bin/lite check`, the test tools and editor grammar checks use locked development
dependencies. Install them from the repository root:

```sh
npm --prefix igniter ci
npm --prefix editors/vscode ci
```

The editor dependencies are needed for grammar checks and extension packaging.
Public compilation uses the checked-in generated compiler, without a T00 fallback.

## Run a first program

The [double-sum example](lite://play/double-sum) reads two integers and
prints twice their sum:

```text
io := import "core/io";

first := io.inputInt("First integer: ");
second := io.inputInt("Second integer: ");
var total := first + second;
total = total * 2;
io.outputLine(total);
```

From the repository root:

```sh
./bin/lite run language/examples/foundations/io/double-sum.lts
```

Enter `7` and `5`; the final value is `24`. Prompts are explicit program output.
`run` compiles the script to a temporary artifact, executes it with Node,
forwards script arguments after an optional `--` and exits with the program
status without leaving the artifact behind.

## Compile, build natively, play, and check

Compile to TypeScript or C11, build a standalone native executable, launch a
native Play game window, or check without executing:

```sh
./bin/lite compile --target ts language/examples/foundations/io/double-sum.lts > /tmp/lite-example.ts
./bin/lite compile --target c language/examples/foundations/io/double-sum.lts > /tmp/lite-example.c
./bin/lite build -O2 language/examples/foundations/io/double-sum.lts -o /tmp/double-sum
./bin/lite play samples/games/arcade/paddle-pong.lts
./bin/lite check language/examples/foundations/io/double-sum.lts
```

`check` compiles and strictly checks without executing the program.
The [verification case](lite://repo/language/verifications/artifacts/examples/foundations/io/double-sum.json)
records exact expected streams.

## Explore

Continue with [the tour](lite://doc/tour), [examples](lite://repo/language/examples/README.md) or
[the reference index](lite://doc/overview). Use [compiler status](lite://doc/compiler/overview)
and [the transition](lite://doc/compiler/transition-plan) before relying on a feature.
Use [contributing](lite://doc/contributing) to work on the project.
