# INV-061.06 — Bootstrap and maintained output targets

Status: recorded (user-selected target direction; bounded TS emitter implemented)
Contributor: project contributor (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Subtopic: [INV-061.06](SUBTOPICS.md#inv-061-06)
Baseline for the earlier proposal: `30f1d3e`, igniter-v0.1.0-alpha.16

## User-selected direction

The user refines the first-output proposal in `87546c9`:

- Start with toy-like, readable TypeScript emission to reach self-hosting sooner.
  TypeScript remains an important maintained target for web support, not merely
  an artifact to discard after bootstrapping. TS-to-JavaScript and environment
  adapters belong to that web execution route.
- Explore possible AssemblyScript compatibility as an early WebAssembly route.
  This is an investigation goal, not verified compatibility or a mandatory
  prerequisite for TS emission/self-hosting.
- C is the first native target and an important maintained output target. It
  should support shipping/shareable libraries and projects and a practical path
  to migrate away from Lite, without framework trapping. The user's V comparison
  motivates that goal; it does not adopt V syntax, memory policy or ABI.
- Begin compiler development in Lite once basic facilities and reliable TS output
  are sufficient. Keep the igniter active alongside that work as a reference and
  fallback until the self-hosted path is satisfactory. Do not require abrupt
  retirement on the first successful compiler run.
- Preserve a permanent, shippable, readable TypeScript bootstrap version and the
  source/version history needed to rebuild forward. Retiring active handwritten
  igniter development does not delete this seed or abandon the TS target.

These are selected goals and target directions. Concrete full-language lowering,
compiler self-rebuild criteria, distribution format, web adapters, AS profile,
C library ABI and project-export layout still need bounded investigations.
No new Lite syntax, file/process helper or generic infrastructure follows.

## What safe means here

The user clarifies safety as behavioral equivalence: for the same supported Lite
program, inputs and corresponding environment, the TS equivalent must generate
identical observable output, byte for byte. Check stdout and stderr as raw bytes,
exit status and termination, without whitespace, encoding or newline normalization.
As features add files or other effects, parity must cover those observables too.
Generated source/binary byte identity across different targets is not the claim.

Readable emitted TypeScript and a preserved TS bootstrap let people inspect the
compiler and its support code for hidden behavior. Keep adapters, dependencies,
provenance and build steps visible. Reproducible generation/source hashes and
rebuild comparisons should connect the reviewed source to shipped artifacts.
Readability and passing finite tests are useful evidence, not a mathematical
proof that every compiler or host tool is Trojan-free. No such proof is claimed.

Until a native/backend reference exists, use the executable igniter as a
comparison implementation. Add cross-backend comparisons as each target works.
Tests establish the cases actually run; full language equivalence and compiler
self-rebuild remain goals, not current results.

## Current first TS experiment

[ts-emitter.lts](../../compiler/ts-emitter.lts) compiles one
source line containing a report of a signed decimal Int literal into a readable
TypeScript module. It uses only approved Lite features and temporary I/O/text
helpers. Validate the complete admitted line before emitting any source bytes;
reject unsupported syntax instead of copying arbitrary source into TypeScript.

The emitted main function returns the exact output text for this restricted
program. A separate, visible Node adapter writes that text to stdout. The core
contains no Node/DOM API, imports, dynamic code execution or numeric rounding.
The checked-in TS reference and adapter are in compiler/tests/references/generated. This private
prototype entry format is not a new Lite public API or a full host-I/O ABI.

See [the emission/parity evidence](INV-061-ts-emission-and-parity.md). This is not
yet a compiler that can compile its own source, a complete multi-line compiler,
a generated compiler bootstrap snapshot, or an AssemblyScript/browser proof.

## Maintained C export and migration goal

C is selected as the first native target, not just a throwaway code-generation
experiment. Investigate readable/exportable source, build recipes, documented
support-code dependencies and licensing/provenance, reusable library boundaries
and independently maintainable projects. An exported project should have an
understandable route to build without continuing to run the Lite compiler or
framework. Necessary support code must be visible and accounted for, not hidden
behind a claim of dependency-free output.

Exact C API names, headers, symbol visibility, ABI/versioning, foreign resources,
callbacks, ownership across boundaries, portable builds and export layout remain
[INV-065](TOPICS.md#inv-065), [INV-066](TOPICS.md#inv-066) and
[INV-070](TOPICS.md#inv-070) work. Do not invent source-level FFI/export syntax.
C generation must preserve selected arithmetic, evaluation order, value copies,
faults and explicit I/O rather than inheriting host accidents.

Reference context only: V documents [portable C output](https://docs.vlang.io/cross-compilation.html#portable-c-output-os-cross)
and [shared-library export](https://docs.vlang.io/v-and-c.html#export-to-shared-library).
These motivate concrete migration/library questions; they are not evidence that
Lite already supports them or that their exact implementation is adopted.

## AssemblyScript and web boundary

AssemblyScript describes itself as a TypeScript-like variant, not an arbitrary
TypeScript compiler. Its [concepts](https://www.assemblyscript.org/concepts.html)
and [types](https://www.assemblyscript.org/types.html) require a separately checked
compatibility profile, including integer widths, representation, effects and host
bindings. Its [runtime variants](https://www.assemblyscript.org/runtime.html) also
need review before claiming the native no-mandatory-tracing goal there. Strict
TypeScript typing alone does not establish AS/Wasm parity. No project AS dependency is
added. A subsequent [isolated probe](INV-070-assemblyscript-report-probe.md) now
verifies this tiny report core on AS/Wasm for 12 cases; general compatibility and
a permanent runtime profile remain unselected.

The first emitted core is deliberately independent of Node I/O. It typechecks
without Node/DOM libraries and can be translated to standard ES-module JavaScript.
This is a useful web-target boundary, not a browser execution, DOM API or bundler
implementation. Node's [direct TypeScript support](https://nodejs.org/api/typescript.html)
still needs a separate strict typecheck; stripping types does not check them.

## Earlier foreign C probe

The original proposal recommended C as the very first output before the user's
TS-first refinement. That ordering was not selected. The same user subsequently
selects C as the first native target and an important maintained export path.

The historical external-tool probe remains valid: /usr/bin/cc reported Apple
clang 21.0.0 for arm64-apple-darwin27.0.0. A hand-written stdio C program printing
42 compiled with -std=c11 -Wall -Wextra -Werror and ran with status 0, stdout
42 followed by newline and empty stderr. Temporary files were removed. This was
foreign-tool evidence, not Lite-generated output or performance evidence.
The [Clang driver documentation](https://clang.llvm.org/docs/CommandGuide/clang.html)
describes the external compile/link route. No C emitter was implemented by that
probe. The subsequent [C emitter](INV-061-c-emission-and-parity.md) now produces
actual native output for the same restricted source class, with nine three-way
parity cases. General C ABI/library export and runtime lowering remain open.
