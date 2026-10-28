# INV-003.02 — Declarations and lookup

Status: in progress
Contributor: redacted (agent-assisted)
Last updated: 2026-10-28
Catalog brief: [INV-003](TOPICS.md#inv-003)
Covered subtopics: INV-003.02 (initial investigation; no new rule selected)
Subtopic brief: [INV-003.02](SUBTOPICS.md#inv-003-02)

This is a non-normative investigation note outside the language draft. Options
and recommendations do not select a language rule.

## Investigation question

When can a run file refer to a top-level binding, and how do ordinary values,
function-valued bindings, later helper definitions, and recursion interact?
Separate lexical visibility, signature availability, and initialized value
availability. Review existing rules rather than treating selection as final.
Imports/module declaration lists belong to INV-003.04/INV-006; general lookup
belongs to INV-011; recursion/inference also belongs to INV-030/INV-018.

## Current contracts and evidence

Evidence baseline: `2fdb250`; working tree clean before writing this note.

- [Source-file bodies](../docs/blocks-and-results.md#source-file-body) execute
  items in written order. That page explicitly leaves duplicate top-level names
  and recursive function-literal initialization open.
- [Local shadowing](../docs/local-shadowing-and-copies.md#new-bindings-rather-than-permission-upgrades)
  resolves an ordinary initializer against the previously visible bindings,
  then introduces the new binding. It explicitly leaves recursive function
  initialization unsettled.
- [Declarations](../docs/declarations-and-assignment.md) and
  [identifiers](../docs/identifiers.md#names-and-scope) distinguish new bindings
  from assignment and retain separate module-declaration contracts.
- [Function inference](../docs/functions.md#independent-lambda-result-inference)
  admits nonrecursive local result inference once inputs are known.
  [Recursion](../docs/functions.md#recursion-and-inference) still needs a
  declaration-resolution rule; adding a result annotation alone does not define
  lexical lookup or when a callable value becomes initialized.

No rule currently gives all top-level function-valued bindings early
availability. A function literal's body executes when called, while its
initializer creates the callable value; these are distinct events. Future
capture/storage details remain with their owning topics.

## Concrete cases

These are source-level design probes, not executed programs. Proposed outcomes
for top-level lookup remain alternatives until selected.

```text
/* 1. Direct forward value read */
answer := later + 1;
later := 10;
```

```text
/* 2. Ordinary sequential shadowing */
x := 1;
x := x + 1;
```

```text
/* 3. Call a helper before its initializer */
answer := double(3);
double := fn(n: Int): Int { n * 2 }
```

```text
/* 4. Earlier function body names a later value, called after initialization */
scale := fn(n: Int): Int { n * factor }
factor := 2;
answer := scale(3);
```

Case 4 separates early lookup of a deferred body from an early value read.
Whole-file lookup could find factor, but still needs a safe initialization and
environment contract. Moving the call before factor would require another
readiness check; merely knowing its type is insufficient.

```text
/* 5. Self-reference versus shadowing an earlier callable */
step := fn(): Int { 1 }
step := fn(): Int { step() + 1 }
```

Under ordinary initializer lookup, the inner step names the earlier binding.
A special recursive self-binding rule could instead select the new binding and
change this into recursion. That choice cannot be inferred just from spelling
the initializer as fn. Genuine self-recursion and mutually recursive helpers
need explicit contracts for names, signatures, and initialized values too.

## Options and consequences

- **A — Sequential ordinary bindings.** Make a new binding visible after its
  initializer, including ordinary function-valued initializers. Case 2 yields a
  new x with value 2; cases 1 and 3 cannot read the later binding. Case 4 cannot
  resolve factor lexically under this rule. This reuses local reasoning and
  avoids startup reordering, but helpers must be written before their callers.
  Self/mutual recursion still needs a separate, explicit rule.
- **B — Whole-file visibility with initialization checks.** Resolve later names
  early but preserve written initialization. This may admit case 4 once its
  environment and readiness are defined. It does not by itself make cases 1 or
  3 safe: their values are not initialized yet. Calls/callbacks and shadowing
  complicate readiness proof; any dynamic fallback needs a selected failure
  contract. Runtime overhead is not assumed or measured here.
- **C — Early function availability.** Register supported function definitions
  before running other items. This could allow case 3 and aid recursion, but
  requires a definition category, signature checking, and environment policy.
  Distinguish a plain literal from a computed callable initializer such as
  make_function(). Do not silently move arbitrary initializer effects. A
  dedicated declaration or restriction would need a visible contract; no new
  syntax is proposed here. This may revise the current file-initialization rule.

These choices can be combined with deliberately defined boundaries; they are
not three complete language architectures. In particular, choosing A for
ordinary values does not require banning recursion or every forward reference.

## Findings and remaining questions

Written execution order alone does not settle lookup. Existing ordinary local
shadowing is a useful baseline, but neither that baseline nor knowing a
function signature settles top-level helper availability and recursion.

Initial recommendation: retain sequential initialization for ordinary values;
use declare-before-use for ordinary function-valued bindings unless a distinct
early-availability contract is chosen. Review self/mutual recursion separately,
especially the shadowing counterexample. This keeps the simple case predictable,
at the cost of ordering helpers before callers. It is not a selected rule.

First discussion question: should case 3 work as written? If yes, decide which
function initializers qualify and what happens to earlier captured values and
side effects. If no, discuss a small recursion mechanism without accidentally
changing case 5. Module growth must be checked before generalizing either answer.

## Verification and limits

Read the current source-file, declaration, identifier, shadowing, and function
pages and checked their selected/open boundaries at the evidence baseline.
Checked local links, note fences, and catalog tracking. No LiteLang parser,
typechecker, runtime, performance measurement, or foreign-language probe was
used. All proposed case outcomes above are design analysis.

## Decision references and handoff

Current source-file execution and local shadowing remain selected, reviewable
baselines. No new top-level lookup, hoisting, capture, or recursion rule is
selected by this note. Resume with case 3, then the scope/readiness distinction
and case 5. Keep changes to related owners in the same atomic commit if a rule
is accepted; findings alone do not revise those owners.
