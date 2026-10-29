# INV-003.02 — Declarations and lookup

Status: in progress
Contributor: redacted (agent-assisted)
Last updated: 2026-10-29
Catalog brief: [INV-003](TOPICS.md#inv-003)
Covered subtopics: INV-003.02 (partial direction selected; safety and binding details open)
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

## Selected direction and safety gap, 2026-10-28

The user clarifies that all executed code blocks run top to bottom. Ordinary
eager code does not know lower bindings, and shadowing preserves that order.
Function bodies are the exception: their execution is deferred, so they may
refer to lower identifiers. This does not make the callable binding itself
available before its initializer.

The user also rejects mandatory header-file/duplicate-signature ceremony and
accepts more flexible declaration lookup in modules subject to safety. Module
declarations can be resolved from source without making their initialization
arbitrary. Compile-time computation and metaprogramming remain open
possibilities, not reasons to abandon ordering within executed blocks.

Owners: [block order](../docs/evaluation-order.md#executable-block-items),
[function bodies](../docs/functions.md#deferred-body-lookup),
[module lookup](../docs/modules-and-packages.md#module-lookup-without-header-files),
and the [ledger](../docs/decisions-and-open-questions.md#block-order-deferred-bodies-and-module-lookup-2026-10-28).
These are selected directions and safety requirements, not completed closure,
initialization, module, or compile-time semantics.

The user's gap, using a selected explicit function header for the probe:

```text
op := fn(): Int { tmp2 }
tmp1 := op();
tmp2 := 1;
```

Creation does not execute the body. The next item invokes it before tmp2's
initializer has run. A later name can be known without its value being ready:
safe execution cannot supply 1 early, substitute zero, or read unspecified
storage. This is not repaired by the universal zero-mapping rule, because this
inferred declaration has not executed. Moving the call below tmp2 removes the
particular ordering hazard, subject to the unresolved environment contracts.

### Initial enforcement alternatives (follow-up selection below)

- **Static proof/rejection.** Reject a call whose reached body would read an
  uninitialized binding; reject uncertain cases conservatively if safety cannot
  be established. This avoids requiring runtime readiness checks but can reject
  safe indirect/conditional calls unless analysis is sufficiently precise.
- **Checked execution where proof is unavailable.** Reject obvious bad calls
  statically and define a checked failure before an uncertain invalid access.
  This admits more indirect uses but needs a selected fault category, attribution,
  cleanup behavior, and readiness/lifetime mechanism. No such runtime fallback
  is selected here, and implicit live panics must not become public effect lists.

Initial recommendation: diagnose the directly evident early call at compile
time. Before choosing a fallback, probe a callback invoked by an opaque helper,
a conditional call that does not actually read tmp2, and a function escaping
the defining block. Do not assume name visibility proves readiness or lifetime.
These cases partly reopen a dependency on deferred capture/lifetime work; the
lookup direction alone does not select that machinery or reopen every context
proposal. Also resolve which binding a future name selects when shadows exist.

## Initial static enforcement selection, 2026-10-29

Selected starting direction: diagnose the directly evident op() early read at
compile time. In the initial supported subset, also reject calls whose
initialization safety cannot be established, rather than assuming safe timing
or adding a runtime readiness fallback. Distinguish a known invalid read from
insufficient proof in diagnostics.

The [owning function page](../docs/functions.md#initial-static-enforcement) and
[ledger](../docs/decisions-and-open-questions.md#initial-static-initialization-enforcement-2026-10-29)
record the selection. This is a conservative starting subset, not a permanent
ban on every safe program that needs more precise analysis. Exact proof rules,
callbacks/conditional accesses, escaping functions, and the full language's
long-term rejection-versus-checked-execution policy remain open. No capture
representation, public callable dependency list, or new panic category is selected.

Evidence baseline for this update: `a015e54`. Reviewed the current owners and
their selected/open boundaries, local links, fences, and diff consistency.
No LiteLang parsing, type checking, runtime check, or safety proof was executed.

### Binding-selection probe

```text
value := 1;
read_value := fn(): Int { value }
value := 2;
answer := read_value();
```

The original question was whether the deferred-body exception could select the
later shadow. The recommendation was to keep the earlier lexical binding. The
selection below now adopts that recommendation, with capture modes still separate.

## Binding identity selection, 2026-10-29

The user agrees that the reference-language comparison still shows source order
matters. Select retention of the already-visible lexical binding: read_value's
value refers to the first binding, and the later declaration does not redirect
it. The fixed-scalar probe returns 1. Deferring a body's execution does not make
binding selection depend on the caller's source position.

The [owning function rule](../docs/functions.md#existing-bindings-survive-later-shadowing)
and [ledger](../docs/decisions-and-open-questions.md#deferred-body-binding-identity-and-shadowing-2026-10-29)
record the selection for surrounding references admitted by the access/capture
rules. It does not grant implicit local capture. This does not select creation-time value snapshots, live
mutable captures, or retention/lifetime machinery. When no suitable earlier
binding exists, the future-name exception still needs an exact selection rule.

Next probe, with no earlier value binding:

```text
read_value := fn(): Int { value }
value := 1;
value := 2;
answer := read_value();
```

Candidate: select the first subsequent declaration in the defining block, then
keep that binding identity. Alternatives include selecting a later declaration
or rejecting an ambiguous forward reference. None is selected. Compare a call
between the two declarations, nested scopes, and a recursive name before
generalizing the future-name rule. Existing initialization safety still applies.

Evidence baseline for this update: `25de30b`. Reviewed the current owners and
comparison findings; checked links, fences, and diff consistency. This is a
documentation decision; no LiteLang program was compiled or executed.

## Surrounding-access reconsideration, 2026-10-29

The user wants to minimize surrounding identifier access and asks whether
function-valued bindings make such access unavoidable. They do not: assigning or
storing a callable does not itself define lexical scope or require captured
runtime locals. A noncapturing callable and a callable carrying private state
can have different implementation requirements. LiteLang has not selected their
physical representation, and a callable value need not be only a code address.

Primary comparison evidence: Rust's [function-pointer reference](https://doc.rust-lang.org/reference/types/function-pointer.html)
admits coercion from noncapturing closures, while its [closure-type reference](https://doc.rust-lang.org/reference/types/closure.html)
describes closure values in terms of captured state. These demonstrate that
first-class function storage does not force implicit local capture; they do not
select LiteLang's representation or ownership mechanism.

Relevant earlier material: [deferred contexts](../docs/deferred-contexts.md) and
[closure capture history](../docs/closures.md#implementation-captures-deferred)
already distinguish private captured state from public call inputs. The older
explicit-capture sketches are deferred, not available syntax. This investigation
can reopen the access boundary without reinstating all those mechanisms.

The user clarified that the concern is blindly granting access to every
surrounding value, even for reading, rather than demanding a blanket prohibition
that would also prevent simple helper calls. Select the design requirement of a
defined access policy that keeps ordinary helper calls expressible. No complete
implicit/explicit capture policy is chosen yet. Static module/type/constant
lookup must be distinguished from retaining enclosing runtime locals.

Proposed classification probe:

```text
double := fn(n: Int): Int { n * 2 }
quadruple := fn(n: Int): Int { double(double(n)) }
```

If double resolves to a known noncapturing helper, calling it need not retain
the enclosing stack as captured state. The ordinary script binding must still
be available in order. This is different from reading an enclosing runtime
value, invoking a replaceable/runtime-computed callable, or retaining a helper
that itself has an environment. Merely classifying a value's type as callable
is not sufficient to waive those obligations. The exact eligibility categories
are a proposal for investigation, not a complete selected rule.

### Helper ordering and later-shadow probes

The user reverses the helper definitions:

```text
quadruple := fn(n: Int): Int { double(double(n)) }
double := fn(n: Int): Int { n * 2 }
answer := quadruple(2);
```

Proposed outcome for an admitted known noncapturing helper reference: 8. The
first item creates quadruple without executing its body; the next initializes
double; only then does the call execute. This exercises the existing deferred-
body direction without hoisting double's initialization. Moving the call
between the definitions would reach double before its initializer and must be
rejected under the initial static safety direction. Exact helper eligibility
and future-name selection remain open, so this is a proposed admitted case,
not a complete new access policy.

The user then keeps an earlier helper and adds a later shadow:

```text
double := fn(n: Int): Int { n * 2 }
quadruple := fn(n: Int): Int { double(double(n)) }
double := fn(n: Int): Int { n * 3 }
answer := quadruple(2);
later_answer := double(2);
```

For an admitted helper reference, the selected existing-binding rule gives
answer = 8 and later_answer = 6. The two occurrences inside quadruple identify
the first double binding. The final direct call identifies the new binding.
The later := does not replace the old binding, patch earlier bodies, or require
looking up the most recent declaration by spelling at each call. The compiler
can distinguish the declarations by binding identity; no physical closure
representation or runtime environment is selected by this reasoning.

These probes distinguish a forward body reference with no earlier target from
a reference already resolved to a visible helper. They do not settle reassignment
through a var callable, captures of runtime-computed/stateful helpers, a forward
reference with multiple later shadows, or recursive-self lookup. Evidence:
traced from the current selected block-order, existing-binding, and initial
static-enforcement pages at baseline `88ba9e3`; no LiteLang execution occurred.

For example, an ordinary parameter can avoid a surrounding reference entirely:

```text
read_value := fn(value: Int): Int { value }
answer := read_value(value);
```

Only the caller reads its own value binding. The function body uses its input.
This is not a requirement to expose hidden capture fields in public signatures;
an eventual deliberate capture facility could still bind implementation-private
state. The previously recorded binding-identity rule applies only where such
surrounding access is admitted. Its fixed-scalar shadow probe does not decide
whether plain fn permits implicit local capture.

Continue with concrete allowed-name/access categories before revising the
earlier deferred-body access direction. Do not infer that all outer names are
forbidden or that every surrounding read is automatically permitted. The actual
safe lowering, initialization analysis, and lifetime policy remain open.

## Reference-language comparison, 2026-10-29

Question: how do other languages handle the next binding-selection probe? Keep
redeclaration/shadowing distinct from assigning a new value to an existing
binding, and keep binding identity distinct from capture mode. This comparison
does not select a LiteLang rule.

- **Rust:** a later local let can introduce a new binding with the same name.
  The earlier closure still refers to the first binding, so the analogous
  shadow probe returns 1. A closure cannot resolve a later local let that was
  not in scope at its definition. Function items are different: their names
  extend through the containing block/module, permitting forward uses.
  Source: [Rust Reference, scopes](https://doc.rust-lang.org/reference/names/scopes.html#pattern-binding-scopes).
- **JavaScript:** repeating let/const with the same name in one lexical scope
  is a SyntaxError. If the second line instead assigns value = 2 to the existing
  let binding, an earlier closure reads 2. A closure may name a later lexical
  declaration, but calling before initialization throws ReferenceError; calling
  afterward works. Sources: [let and its temporal dead zone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let),
  [closure environments](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures).
- **Python:** assigning value = 2 again in the same enclosing function updates
  its existing local binding; it is not Rust/Lite-style same-block shadowing.
  An inner function reads 2 when called afterward. It can reference a name
  assigned later in that enclosing function, but the early-call free-variable
  probe raises NameError. Source: [Python execution model](https://docs.python.org/3/reference/executionmodel.html).
- **C++:** capture mode adds a separate choice. With an existing local integer,
  a lambda capturing [value] retains its copied 1 after the original variable
  is assigned 2; [&value] reads the updated original and returns 2. This probe
  changes the original value, not binding identity through shadowing.
  Source: [Microsoft C++ lambda capture documentation](https://learn.microsoft.com/en-us/cpp/cpp/lambda-expressions-in-cpp?view=msvc-170#capture-clause).
- **Zig 0.15.2:** shadowing a visible identifier is forbidden, so the proposed
  same-name local shadow model is not admitted. Container declarations are
  separately order-independent and lazily analyzed, with compile-time
  initialization. This supports separating local execution from module
  declaration lookup, without copying Zig's shadowing restriction into LiteLang.
  Sources: [shadowing](https://ziglang.org/documentation/0.15.2/#Shadowing),
  [container variables](https://ziglang.org/documentation/0.15.2/#Container-Level-Variables).

### Probe evidence and limits

Primary documentation above was read on 2026-10-29. Local foreign-language
probes used rustc 1.97.1 (Rust 2021 edition), Node v24.16.0, Python 3.15.1, and
Apple clang 21.0.0 with C++17. Temporary sources/executables were outside the
repository and removed after use. Observed:

- Rust shadow closure returned 1; a closure naming a later local let failed
  compilation with E0425.
- JavaScript lexical redeclaration failed with SyntaxError; reassignment read
  2; a later-name closure reported ReferenceError before initialization and 1
  afterward.
- Python enclosing-function reassignment read 2; the later-name inner-function
  probe reported NameError before initialization and 1 afterward.
- C++ scalar copy/reference captures returned 1 and 2 respectively after
  reassignment, checked by a compiled executable's success exit status.

Zig was checked against its versioned reference only; no Zig compiler was
available. Python's current online reference and the local interpreter have
different patch versions; the recorded probe version is the execution evidence.
No LiteLang program was compiled or run. These comparisons do not settle
LiteLang's future-shadow rule, capture representation, or readiness analysis.

Interpretation: retaining the earlier binding in the proposed Lite shadow probe
has a direct Rust precedent. Python/JavaScript results of 2 under reassignment
are not counterexamples, because those probes update one binding. C++ shows why
capture policy must be reviewed separately. The earlier Lite recommendation
was unselected when the comparison was recorded. The later binding-identity
selection above now adopts it; other capture/future-name rules remain open.

## Initial contracts and evidence

The following inventory and alternatives retain their initial scope; the later
partial selection above supersedes the earlier recommendation where they differ.

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

Original recommendation (partly superseded by the selection above): retain sequential initialization for ordinary values;
use declare-before-use for ordinary function-valued bindings unless a distinct
early-availability contract is chosen. Review self/mutual recursion separately,
especially the shadowing counterexample. This keeps the simple case predictable,
at the cost of ordering helpers before callers. It is not a selected rule.

Original discussion question: should case 3 work as written? If yes, decide which
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

Selected, reviewable direction: sequential eager script/block evaluation;
deferred bodies may name lower declarations; module declaration lookup may be
more flexible without mandatory handwritten headers, subject to safety. Script
case 3 is not admitted by the deferred-body exception. Case 4 is eligible in
direction but needs environment/readiness rules. An already-visible lexical
binding is now retained across later shadows; a body without an earlier target
still needs future-name and recursive-self selection. The 2026-10-29 selection makes evident op/tmp2 early reads static
errors and uses conservative proof/rejection for the initial subset, with the
full language's long-term fallback still open.

The owning pages and ledger linked above record this partial selection. Resume
with concrete surrounding-access categories above, then future-name selection
when no earlier binding exists and self/mutual
recursion and concrete callback probes.
Module-growth and compile-time details belong to INV-003.04/INV-006/INV-062.
No capture representation, readiness-check runtime, or recursive inference rule
is selected. No LiteLang execution or safety implementation has been verified.
