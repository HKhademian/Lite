# INV-067 — Script arguments for compiler source context

Status: recorded (explicitly approved helper/runner suffix implemented)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-067](TOPICS.md#inv-067)
Related: [INV-061 compiler output/parity](INV-061-first-compiler-output.md)
Baseline: `9669ee5`, igniter-v0.1.0-alpha.20

## Concrete next need

The emitters now obtain complete source through inputAll(), but only support a
constant report. Extending exact-byte parity to runtime faults requires source
context as well as checked operations. The existing igniter CLI renders the
source filename, line and column in diagnostics. A compiler reading stdin does
not automatically know the filename supplied to the comparison invocation.

Probe performed at the baseline: two files containing report(1 / 0); each produce
status 1, empty stdout, and their own exact supplied path followed by
:1:10: ArithmeticPanic: division by zero and newline on stderr. At that baseline, the
launcher invocation with -- and script arguments produced usage/status 2; no
script-argument suffix or Lite argument helper existed.

This does not mean argument access alone establishes runtime-fault parity.
Source-position tracking, checked target lowering and corresponding adapters
still need implementation. It identifies one missing input rather than choosing
a placeholder filename, weakening byte comparisons, or building a Node-only
compiler driver that hides the context from Lite code.

## Selected temporary surface

The proposal was recorded in `7c7d383`; the user explicitly replies
"Approve inputArgs() and the -- argument suffix". Add inputArgs(): List<String>
to the FVP runner. It takes no arguments and returns
the supplied script arguments in order as ordinary readable copied values:

- Exclude the Node/interpreter executable, runner options, Lite script path and
  the separating -- token. With no supplied arguments, return an empty list whose
  known element type is String; this does not choose bare [] inference.
- Preserve each host argument String exactly, including empty arguments, spaces,
  Unicode and strings beginning with a hyphen. Perform no path normalization,
  option parsing, quoting removal, glob expansion or type conversion inside Lite.
  Shell argument processing occurs before the runner, as usual.
- Produce no output or prompt and consume no stdin. Repeated calls retain the
  same argument values; no host-location/write grant is exposed. Ordinary local
  copies retain the existing value and permission contracts.
- Check the zero-argument signature before effects and retain normal helper
  shadowing. This is temporary runner scaffolding, not a selected module layout,
  environment-variable API, process API or permanent standard-library name.

Extend the existing tool invocation to:

```sh
./bin/lite run [--check] file.lts [-- argument ...]
```

Require the first -- after the script path when arguments are supplied. Treat
every following value as script data, including another -- or --check; do not
interpret those as runner flags. Existing no-suffix commands remain valid, and
--check still checks without running the program or reading stdin.

For a compiler application, an illustrative use is:

```sh
./bin/lite run compiler.lts -- language/examples/program.lts < language/examples/program.lts
```

The program can use the first argument as its logical source name and inputAll()
as source text, with no new file-reading or process-launch operation. That name
is ordinary untrusted data: any later embedding in emitted source must use a
valid encoder, not raw code concatenation. This selection does not choose general
compiler target/output flags, generated diagnostic ABI or library-export syntax.

## Implemented evidence

Implement optional readonly host argument data on the embedding I/O interface,
snapshot its String values at execute entry, and expose an ordinary readable
List<String>. Existing callers that omit host arguments get an empty known-type
list. End-operation updates publish new sequences, so explicitly writable
receiving copies do not mutate the host argument snapshot.

The CLI accepts only a -- separated suffix after the script path; all following
values are script data. The root shell forwarding remains unchanged apart from
its usage text. Existing no-suffix invocations remain valid. Invalid suffixes
produce usage/status 2 before source execution, and --check validates normally
without executing or consuming stdin. No public compiler flag scheme is added.

Strict TypeScript checking and all 145 interpreter groups pass on pinned Node
26.13.0/TypeScript 7.0.2. Six new groups cover default/ordered arguments, typed
copies and permissions, lack of stream effects, host snapshot stability under
external mutation, before-effects signatures, shadowing, real launcher/direct CLI,
empty/spaced/Unicode/dash/wildcard-looking/newline values, literal later --/--check,
invalid suffixes, check-only, caller-relative paths and filenames with spaces.
The [020 example](../../language/examples/020-script-arguments.lts) reports supplied values;
no arguments or an empty suffix produces no output. All 9 editor groups pass.

Commit helper, CLI, example, checks and references atomically as
igniter-v0.1.0-alpha.21, keeping prior tags fixed. The helper/runner contract is
selected; source-context use in compiler applications is the next bounded step.
It does not itself implement target runtime fault locations, file/process APIs,
a self-hosted compiler or a new Lite language grammar.
