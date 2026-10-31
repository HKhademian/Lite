# INV-030 — Typed-function igniter increment

Status: recorded (bounded implementation; full callable/capture contracts open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-030](TOPICS.md#inv-030)
Covered scope: explicit scalar signatures, positional calls, returns and recursion.

## Contracts and implementation boundary

Baseline: `1dcf92f`, preserved as igniter-v0.1.0-alpha.3. The user requests the
next runnable increment toward a Lite-written compiler. This implements a subset
of the existing [function contracts](../docs/functions.md),
[callee/argument evaluation](../docs/evaluation-order.md#function-calls),
[self calls](../docs/functions.md#explicit-current-function-self-calls), and
[ordinary returns](../docs/control-flow.md#plain-return). No handwritten headers
are needed and no new full-language capture policy is selected.

The [igniter](../igniter/README.md#typed-user-functions) accepts fn literals with
named, explicitly scalar-annotated parameters and results. It checks complete
bodies before effects, including uncalled functions. Named calls accept positional
inputs with exact scalar types; parameters are fixed local values. Function values
can be copied to aliases and compatible var bindings replaced. Compatibility in
this subset requires the same parameter names/types and result type.

Each invocation has separate locals, and repeated block/loop executions retain
distinct environments. The callee is selected once before left-to-right argument
evaluation. Surrounding function-valued helper reads preserve lexical identity and
live replacement; later shadows do not redirect them. Own-name recursion is
implemented for direct fn declarations without an earlier target. An earlier
same-name target still wins ordinary lexical lookup; self(...) invokes the current
implementation regardless of replacement of its original named binding.

Tail results and explicit return payloads are checked against the scalar result.
Bare return yields Unit. Return crosses loops to the nearest invoked function;
break/continue cannot cross into a caller's loop. Exit/faults propagate. Internal
noncontinuing-path information handles return/exit statements and complete
returning branches without exposing a new public type. Analysis is conservative;
action loops still cannot supply a value, even at a function tail.

Surrounding scalar reads and all surrounding replacements inside functions are
rejected. Pass runtime data as arguments. Admitting function-valued dependencies
here is a temporary implementation boundary, not permission for general implicit
captures. Host-retained environments provide this interpreter's storage; native
ownership, capture representation, cleanup, lifetime proof, and resource behavior
remain unimplemented. It is not evidence of the native deployment goals.

Later helper lookup/mutual recursion, general type resolution/inference,
keyword-free literals, first-class self and its name collisions, named/default/rest
inputs, access qualifiers, callable inputs/results, typed receiving declarations,
arbitrary expression callees, and function comparison/reporting remain unsupported.
The selected broader deferred-body lookup direction is unchanged; this implementation
rejects its unimplemented forward cases instead of executing an uninitialized read.

## Evidence

Strict TypeScript no-emit checking and all 43 Node test groups pass on Node
26.13.0/TypeScript 7.0.2. Added probes cover scalar results and explicit return,
aliases/replacement, callee selection before argument effects, left-to-right inputs,
recursive Fibonacci with live caller locals, named versus self recursion, live
helper replacement versus shadowing, and escaped helpers from distinct loop
activations. Return through loops, nearest-function targeting, exit/fault propagation,
and invalid captures/signatures/unsupported forms are checked. Invalid uncalled
bodies are rejected before any I/O.

The real CLI [factorial example](../samples/fvp/004-factorial.lts) reports 120 for
5 and exits 2 with an explicit error for negative input. The evaluator reports 1
for 0 and faults on 21! overflow. Existing lesson files are unchanged; this does
not claim full language or 20-lesson coverage.

## Handoff

Preserve this source as igniter-v0.1.0-alpha.4; alpha.1–alpha.3 remain fixed.
Collections/text operations and file I/O remain practical steps toward the
Lite-written compiler. No native compilation or compiler-to-compiler rebuild
chain exists yet. Keep the host disposable and add bootstrap-stage links when
a successor actually builds.
