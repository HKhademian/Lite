# INV-061.06 — Proposed first compiler output route

Status: proposed (first output/execution route needs explicit consent)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Subtopic: [INV-061.06](SUBTOPICS.md#inv-061-06)
Baseline: `30f1d3e`, preserved as igniter-v0.1.0-alpha.16

## Concrete boundary reached

The approved subset now runs a scanner and recursive arithmetic parser written
in Lite, using named-token lists and value/position tuple results. The preserved
alpha.15 interpreter runs that new source unchanged. This demonstrates useful
front-end expressiveness, but produces a calculated value rather than compiler
output. The selected early-self-hosting direction still lacks a chosen first
compiler artifact and its execution route.

The [native-execution investigation](lightweight-native-execution.md) lists C
emission and a possible LLVM path as candidates, not decisions. The automatic
selected-scope workflow does not authorize silently choosing one. No backend,
IR, ABI, runtime design or new source/file/process helper is selected here.

## Recommendation for the first experiment

Use C source as the first output of a tiny Lite-written compiler. Run that
compiler source in the preserved TypeScript/Node igniter, emit C text through
existing explicit report calls, and use an external system C compiler to produce
a native executable. Keep this external build step visible rather than adding
a process-launch API or build framework to the igniter.

This recommendation is a bounded engineering judgment: existing Lite code can
produce text, C output is inspectable, and the local C compilation route is now
verified. It does not claim a speed/size advantage, settle a permanent backend,
require C source in future releases, or select a common typed IR/LLVM backend.

The first vertical experiment should accept a deliberately restricted existing
Lite source line sufficient for report(42);, emit a C program with matching
observable output, then compile/run it and compare stdout/status against the
igniter. Reject unsupported source in the admitted input before emitting a
completed C program. The prototype input contract is one source line through
inputLine; full multi-line/file/argument handling remains a separate need.

For this initial constant-report case, C generation need not add arithmetic,
allocation, copies, user functions, strings as source inputs, or native runtime
machinery. Later compiler increments must preserve Lite's selected checked
arithmetic, evaluation order, value copies, faults and explicit I/O; producing
C text does not prove those lowerings or authorize inheriting foreign semantics.

This proposal changes no Lite syntax or language feature. The backend/output
route itself is the needed user decision, not another request to implement
already selected list/text rules.

## External-tool probe actually performed

On 2026-10-31, /usr/bin/cc reports Apple clang 21.0.0 targeting
arm64-apple-darwin27.0.0. A temporary, hand-written foreign C file contained:

```c
#include <stdio.h>
int main(void) {
    puts("42");
    return 0;
}
```

Compile it with cc -std=c11 -Wall -Wextra -Werror and run the temporary executable.
Observed status 0, stdout 42 followed by newline, and empty stderr. Temporary
source/executable were removed. This validates only the installed foreign build
route; no Lite compiler emitted this C and no generated-Lite native result is
claimed. No benchmark or deployment-size measurement was performed.

The official [Clang driver documentation](https://clang.llvm.org/docs/CommandGuide/clang.html)
describes compiling C and the driver stages through linking, with -std=c11
available. That supports the proposed external build mechanism, not a claim
about a Lite backend, target portability or the project's future semantics.

## Proposed next delivery after selection

1. Implement the small source-line-to-C compiler as ordinary Lite application
   code using the approved subset, without a new host helper or framework.
2. Validate its supported source shape and diagnostic/exit behavior, preserve
   explicit output, and test accepted/rejected inputs before calling it a compiler
   for that restricted subset.
3. Compile its emitted C with the visible external command and compare the
   resulting native program's output/status with the same supported Lite program
   on the igniter. Record the compiler-source commit/tag, exact compatible
   interpreter tag, C tool version and build/check command.
4. Commit source, tests, examples and evidence atomically; preserve prior tags.
   Continue toward the next required subset without treating this tiny result
   as permission to add unselected syntax, helpers or language semantics.

Even if successful, this first experiment would not compile its own compiler
source or establish a compiler-to-compiler rebuild chain. Keep the igniter active
until a Lite-written successor has a defined execution path and reproducibly
builds the needed next stage. The later retirement threshold and stage map remain
INV-061.06 work.

## Decision required

Select C source plus an external C compiler for this first restricted native
experiment, or keep the output route open for a different backend discussion.
The proposal remains unselected until the user explicitly decides. No Lite
compiler or emitter implementation is added by this investigation.
