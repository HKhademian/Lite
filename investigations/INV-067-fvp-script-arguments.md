# INV-067 — Proposed script arguments for compiler source context

Status: proposed (new temporary helper and runner suffix need explicit consent)
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
:1:10: ArithmeticPanic: division by zero and newline on stderr. The current
launcher invocation with -- and script arguments produces usage/status 2; its
CLI accepts no script-argument suffix and Lite exposes no argument helper.

This does not mean argument access alone establishes runtime-fault parity.
Source-position tracking, checked target lowering and corresponding adapters
still need implementation. It identifies one missing input rather than choosing
a placeholder filename, weakening byte comparisons, or building a Node-only
compiler driver that hides the context from Lite code.

## Proposed temporary surface

Add inputArgs(): List<String> to the FVP runner. It takes no arguments and returns
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
./lite run [--check] file.lts [-- argument ...]
```

Require the first -- after the script path when arguments are supplied. Treat
every following value as script data, including another -- or --check; do not
interpret those as runner flags. Existing no-suffix commands remain valid, and
--check still checks without running the program or reading stdin.

For a compiler application, an illustrative use is:

```sh
./lite run compiler.lts -- examples/program.lts < examples/program.lts
```

The program can use the first argument as its logical source name and inputAll()
as source text, with no new file-reading or process-launch operation. That name
is ordinary untrusted data: any later embedding in emitted source must use a
valid encoder, not raw code concatenation. This proposal does not choose general
compiler target/output flags, generated diagnostic ABI or library-export syntax.

## Checks planned after selection

Verify empty/repeated argument lists, order, empty/spaced/Unicode/dash arguments,
helper arity and shadowing, lack of stdin/output effects, caller-relative script
paths, -- separation and literal later flags, usage errors and silent --check.
Use a minimal indexed argument demonstration. Record exact invocation/context
in later emitted fault-parity checks instead of normalizing the expected bytes.

This is a new helper and CLI capability, so the automatic selected-scope workflow
stops for explicit consent. No implementation, runtime-fault backend, file API
or new language syntax is added by this proposal.
