# INV-061 — First restricted C emission and three-way byte parity

Status: recorded (bounded native prototype; maintained export/ABI goals remain open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Direction: [TS bootstrap/web and C native/export](INV-061-first-compiler-output.md)
Compatible interpreter milestone: igniter-v0.1.0-alpha.17, `d5d1c63`

## Selected scope

The user selects C as the first native target and an important maintained route
for shippable/shareable libraries and projects, including migration away from
Lite. Continue automatically within that target and the existing language subset.
No new Lite syntax, helper, ABI or build framework is needed for a first native
experiment over the same source class as the TS emitter.

[c-emitter.lts](../../compiler/c-emitter.lts) is a Lite-written
compiler application for one signed-decimal Int report source line. It reuses
the TS emitter's validation/normalization as self-contained source because imports remain
outside the FVP. Validate the admitted line and signed range before emitting C;
reject unsupported expressions/statements instead of copying arbitrary source.

The [readable C reference](../../compiler/tests/references/generated/report-42.c) for report(42);
contains a stdio include and main that writes the exact constant output text.
Only validated decimal text and an optional sign enter the C string literal.
The compiler and output have no eval, subprocess helper or injected arbitrary
source. Constant-output lowering does not require storing the Int as a C or JS
number and so retains all decimal digits at signed 64-bit limits.

After generation the C file builds/runs using the system C toolchain and C
standard library, without the Lite compiler, Node or a Lite-specific runtime.
This is a small independently inspectable/maintainable program export; it does
not implement general library packaging or prove dependency-free output for
future features.

## Reproduce the first case

With the pinned Node on PATH and a C compiler installed, run from the project root:

```sh
printf '%s\n' 'report(42);' | ./bin/lite run compiler/c-emitter.lts > /tmp/lite-report.c
cc -std=c11 -Wall -Wextra -Werror /tmp/lite-report.c -o /tmp/lite-report
/tmp/lite-report
```

Expected program stdout is 42 followed by newline, stderr empty and status 0.
The generated C file is inspectable before compiling it. No public compile-mode
CLI option or process-launch API has been added to Lite.

## Verified parity

Strict TypeScript checking and all 132 interpreter groups pass on Node
26.13.0/TypeScript 7.0.2. The native group actually runs here with Apple clang
21.0.0 targeting arm64-apple-darwin27.0.0; it is not skipped. It compiles emitted
C with -std=c11 -Wall -Wextra -Werror and compares the resulting executable with
the same source through the igniter and emitted TS plus explicit Node adapter.

The nine source cases cover 42, zero, negative zero, leading signs/zeroes,
spaces/tabs, integers beyond JS safe-number precision, and signed Int min/max.
Compare stdout/stderr Buffers, status and signal exactly, with no normalization.
Every case matches. Program input bytes are also identical; these admitted
constant-report programs do not read them. The previous portable strict-TS and
translated-JS checks continue passing. All 9 editor groups pass.

Also compare generated C exactly with its checked-in readable reference and
check unsupported/injected/trailing/out-of-range source is rejected before any
artifact bytes. A missing C compiler is an explicit skip of the native test on
other machines, not a claim of native validation there; use CC as an executable
path when the compiler is not named cc. No shell command is built from source.

## Evidence limits

This is the first actual Lite-generated native output for this tiny supported
source class, not a full Lite compiler, its own compiler-source rebuild, or a
performance/size/portability result. The host source need not change for C
emission. Tests cover ordinary captured stdio, not closed pipes, host resource
failure or all target runtime diagnostics. Those cases still require byte-parity
contracts and implementation before general equivalence can be claimed.

The output is constant text, not a proof of native arithmetic, layouts, copies,
allocation, cleanup, fault transport, source maps, functions or list lowering.
C headers/library ABI, foreign ownership, export packaging and independently
rebuildable general projects remain the linked INV-065/066/070 investigations.
The maintained C/migration goal remains selected; this small prototype does not
narrow or complete it.

Preserve this application/proof-case milestone as igniter-v0.1.0-alpha.18 with
earlier tags intact. The next whole-source compiler-input question needs an
explicit contract: inputLine currently supplies one line and faults at missing
input; silently changing it to an EOF iterator or adding a read-file/input helper
would exceed selected scope. Keep the igniter active during further self-hosting
work and preserve the readable TS seed regardless of later retirement timing.

The subsequent [whole-input increment](INV-004-fvp-whole-input.md) is explicitly
approved and implemented as inputAll(prompt?) for remaining text through EOF,
empty at immediate EOF. Optional prompting follows inputInt; the older inputLine
contract is unchanged. Compiler applications can now adopt it in a separate
bounded source-ingestion delivery.
