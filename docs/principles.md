# Principles

Status: **established goals; several implementation choices remain open**.

The [LiteLang white paper](white-paper.md) is the foundational statement of the language's philosophy and design criteria. This page condenses those goals and their current consequences.

## Purpose

Let people and programming agents focus on problem solving through concise, readable programs with clear contracts. Students should be able to begin without learning type annotations, while retaining static types and a path to precise library and systems contracts.

## Design goals

- Keep ceremony low and make programs easy to read, write, and reason about.
- Make the first programming concepts approachable for learners who do not yet read English. Investigate [multilingual source and learning](multilingual-source-and-learning.md), retaining simple English as the shared reference presentation and one set of language semantics. Localized source remains a proposal; exact vocabularies and tooling are open.
- Make consequential behavior explicit through concise operations, including failure handling and caller mutation grants.
- Output and execution tracing require explicit requests, including in demonstrators and playgrounds. Evaluating a value alone does not display it. See [explicit output and tracing](tooling-and-learning.md#explicit-output-and-tracing).
- Evaluate convenience together with its semantic and runtime costs; ordinary abstractions should support efficient implementation with modest runtime machinery.
- Static, strong typing with inference for ordinary code.
- Functions, conditions, loops, modules, and packages.
- No universal `null`, `nil`, or `undefined` value.
- Optional data through `Option`; recoverable failure through `Result`.
- Express ordinary source programs through values and explicit access permissions without requiring a raw pointer vocabulary; memory and foreign-interface contracts remain to be designed.
- Declared typed recoverable errors, implicit success construction, postfix `!` propagation at each extracted Result step, and local `else` recovery with optional error receivers.
- Operation-level `else` handles faults defined by its operation, excluding evaluated argument/operand panics. An explicit `{ ... } else { ... }` block selects broad recovery for supported typed panics from its executed contents and synchronous calls. See [recovery scopes](expression-recovery.md#operation-specific-panic-boundary-selected).
- A separate typed panic path that unwinds exited scopes and runs applicable `finally` blocks before outer matching handlers; cleanup preserves any already pending failure as primary if cleanup also fails. Typed recovery filters consume matching aggregate members in declaration order. No-handler policy, hard aborts, aggregate representation/inspection, and duplicate-member handling remain open.
- Immutability by default: fixed bindings and read-only access, with practical, explicit mutation capabilities through var and mut. See [the design goal](immutability-by-default.md).
- Minimal visibility and capability exposure by default.
- Infer derived access type structure, keeping mathematical summaries such as A | var B | C out of routine code. Explicit type-side var in a function header declares caller replacement; local-only var belongs in the body. See [var access](var-access-qualifier.md) and [access ergonomics](slot-ergonomics.md).
- Interfaces, modifiers, composition, and carefully scoped reuse instead of class inheritance as the primary model.
- Collection consumers request the capabilities they need; standard and user implementations provide them. Shared element-typed APIs must not require primitive-wrapper collection families, conversion to one standard container, or a universal boxed-object representation. See [collection abstractions](collection-abstractions.md).
- Treat fast native execution, low memory use, small runtime support, and small final executables as core design priorities. Ordinary native programs should not require a VM or tracing garbage collector; ownership, reclamation, backend, and linking mechanisms remain open. See [lightweight native execution](memory-and-performance.md#lightweight-native-execution-priority).
- Syntax whose meaning does not depend on indentation, tabs, spaces, or line boundaries.
- Optional redundancy may improve writing and visual consistency without changing meaning: selected [leading separators](leading-separators.md) let every Boolean-expression, condition, pattern-alternative, or union entry use the same shape while preserving compact forms and explicit operand boundaries.
- A connected design gradient: small source changes should have local, predictable meaning; similar-looking constructs should share rules; any semantic jump needs a visible source/type/target boundary. See [continuity and analogical coherence](continuity-and-analogy.md).
- One conditional syntax for actions and values.
- One `loop` keyword for the supported iteration modes.

## First working targets

Selected 2026-10-28: begin with a tiny working demonstrator for experimenting
with LiteLang features, then grow toward a first useful milestone of practical
scripts with command-line arguments, console input/output, and file processing.
The exercise corpus supplies use cases. The
[initial correctness batch](../samples/NOTES.md#initial-correctness-batch) is
001–020, exercised incrementally; exact later milestone coverage remains open.
Foreign calls, explicit memory placement, and concurrency remain later
investigations outside that first useful milestone.

The demonstrator should execute a `.lite` source file through a minimal runner
or compilation path and provide a simple way to observe results. Supported
features must follow their selected rules; unsupported features must produce
clear diagnostics. Runner versus compiler, commands, backend, and observation
API remain open. Literals, bindings, arithmetic, and simple value display are a
proposed initial subset, with conditionals, functions, and loops added
incrementally; this feature order is not a selected implementation plan.

These are development targets, not an implemented toolchain or a release promise.
The lightweight native execution goals continue to guide the language; choosing
an experimental execution mechanism remains a separate decision.

## Representative shape

```text
double := fn(x: Int): Int {
    x * 2
}

message := if passed {
    "Congratulations"
} else {
    "Try again"
}

loop users as user {
    greet(user)
}
```

The loop's optional item identifier uses the selected `as` separator; header destructuring and receiver lists are retired. See [loop receivers](loop-receivers.md).

## Beginner-facing defaults

The compiler infers types; it does not remove them. A mutable integer binding cannot later hold text. Braces always delimit bodies. The official formatter chooses presentation without changing behavior. Its selected [chain presentation](leading-separators.md#formatter-presentation-selected) keeps multi-entry chains compact without a leader or aligns multiline entries with leading separators; source layout remains semantically irrelevant. Early returns are encouraged when they make the main path flatter.

Advanced facilities should be introduced as students need them. This is a teaching progression within one language, not a dynamically typed beginner dialect and a separate systems dialect.

Selected 2026-10-28: ordinary code should receive safe automatic storage and
cleanup without routine manual memory or explicit ownership/lifetime bookkeeping.
Advanced memory controls must remain available through an explicit step with
little ceremony, such as a possible built-in memory-module import. The
[memory-control boundary](memory-and-performance.md#ordinary-and-advanced-memory-control)
owns this goal; module/API syntax and the memory-management mechanism remain open.

## Performance expectations

Selected priority, 2026-10-28: Lite must be light in deployed cost as well as source ceremony. Aim for performance near C on suitable workloads, low allocation and memory overhead, fast startup, small runtime support, and small final executables. Review feature costs against each measure; a speed improvement does not automatically justify greater code size or runtime complexity. Preserve selected safety and observable behavior.

Measure execution time, cold/warm startup, compilation latency, executable and required support size, allocations, peak memory, and tail latency separately. Numeric budgets and representative workloads still need investigation. No universal C-speed, no-allocation, zero-runtime, or executable-size guarantee is established. See [measurement requirements](memory-and-performance.md#performance-evidence-and-size-accounting) and the [investigation focus](../investigations/lightweight-native-execution.md).

## Resolving competing goals

Selected 2026-10-28: preserve safety and defined behavior when assessing design
tradeoffs. Then judge readability, ceremony, execution speed, memory use, runtime
support, and executable size against concrete uses. Neither convenience nor
performance always wins; there is no universal ranking among those remaining
goals. An optimization must preserve selected observable contracts.

Reaffirmed 2026-10-29: assess readability and ease of reasoning explicitly in
every design decision. Use small source examples and minimal pairs to show what
a reader must know to predict the behavior. Familiarity can motivate a choice;
it is not by itself evidence that the rule is clear to a new reader. Make
semantic differences visible rather than relying on unstated contextual guesses.

For a consequential tradeoff, record the use case, goals in tension, alternatives,
chosen direction, implied costs, and supporting evidence or unresolved measurement.
Use the white paper's review questions and the continuity principle's visible
boundaries. Keep expected costs distinct from measured results. A newly selected
contract change must follow the decision process rather than being introduced
silently as an optimization. Numeric budgets and per-feature acceptance cases
remain open.

## Notes and open questions

The memory model is not selected. Type-system scope, exact visibility syntax, modules, effects, concurrency, and foreign interfaces need further design. Simplicity must be evaluated with actual beginner tasks rather than assumed from familiar syntax.

## Related concepts and references

- [Types and inference](types-and-inference.md)
- [Memory and performance](memory-and-performance.md)
- [Tooling and learning](tooling-and-learning.md)
- [References](references.md), especially the novice-syntax research.
