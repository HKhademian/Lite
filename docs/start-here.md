# Start with LiteLang

Lite is an experimental language project with a LiteLang-written compiler and a
generated TypeScript bootstrap. The generated compiler supports a subset of the
design. C output and native self-hosting are deferred during the TS migration.

## Prepare the checkout

Compiling and running a script use the checked-in generated compiler and need no
installed packages. Use the Node version in
[igniter/.node-version](../igniter/.node-version).

`./bin/lite check`, the test tools and editor grammar checks use locked development
dependencies. Install them from the repository root:

```sh
npm --prefix igniter ci
npm --prefix editors/vscode ci
```

The editor dependencies are needed for grammar checks and extension packaging.
Public compilation uses the checked-in generated compiler, without a T00 fallback.

## Run a first program

The [double-sum example](../language/examples/001-double-sum.lts) reads two integers and
prints twice their sum:

```text
first := inputInt("First integer: ");
second := inputInt("Second integer: ");
var total := first + second;
total = total * 2;
outputLine(total);
```

From the repository root:

```sh
./bin/lite run language/examples/001-double-sum.lts
```

Enter `7` and `5`; the final value is `24`. Prompts are explicit program output.
`run` compiles the script to a temporary artifact, executes it with Node,
forwards script arguments after an optional `--` and exits with the program
status without leaving the artifact behind.

## Compile and check it

Compile the artifact yourself, or check the source without executing it:

```sh
./bin/lite compile language/examples/001-double-sum.lts > /tmp/lite-example.ts
node compiler/entry.ts /tmp/lite-example.ts
./bin/lite check language/examples/001-double-sum.lts
```

`check` compiles and strictly checks without executing the program.
The [verification case](../language/verifications/artifacts/examples/001-double-sum.json)
records exact expected streams.

## Explore

Continue with [the tour](tour.md), [examples](../language/examples/README.md) or
[the reference index](README.md). Use [compiler status](../compiler/README.md)
and [the transition](../compiler/transition-plan.md) before relying on a feature.
Use [contributing](../CONTRIBUTING.md) to work on the project.
