# LiteScript White Paper

**A readable language that keeps attention on the problem.**

Status: **foundational design statement, 2026-10-20**. LiteScript is a language-design project. The examples describe selected directions; compiler/runtime implementation and performance measurement remain future work. Detailed documents distinguish selected rules from open mechanisms.

## Abstract

LiteScript aims to make strongly typed programming feel as direct as scripting. Its primary purpose is to let people and programming agents spend their attention solving problems, expressing algorithms, and reasoning about behavior. The language should contribute little repetitive syntax, expose the contracts that matter, and make common safe operations easy to write and read.

Convenience must remain compatible with an efficient implementation. The design favors useful defaults, static reasoning, concise explicit operations, and predictable data representations. It aims for native execution with modest runtime support. Readability, safety, and performance are evaluated together throughout the design.

## 1. Keep the language out of the programmer's way

The central design question is how much language machinery a programmer must carry while working on a problem. Repeated annotations, wrapper construction, defensive absence checks, and indirect control flow consume attention. LiteScript should remove repetition wherever it can preserve a clear contract.

Ordinary code should look like ordinary work: create values, compare them, traverse collections, call functions, update permitted data, and handle failures. A small program should be approachable without first learning a framework, protocol hierarchy, memory-address model, or extensive build configuration.

That convenience must continue to work as programs grow. Strong types, explicit library contracts, controlled mutation, and defined failure paths provide the foundation for larger programs. The language should remain expressive enough for demanding programs; simplified syntax must preserve the distinctions needed to describe them correctly. Beginners, experienced developers, and programming agents use the same language and semantics.

## 2. Short syntax with a clear meaning

Reducing noise means reducing the effort needed to understand a program. Readability takes precedence over minimizing character count.

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

Inference removes annotations that can be established reliably. It preserves static types and their constraints. A reader should be able to follow declarations, values, and control flow through a small region of source.

Essential contracts must remain visible. In particular, an explicitly written library contract should reveal the operations and access it requires. An editor can explain and navigate that contract; the source must still be understandable on its own.

Presentation should reinforce meaning. For example, the compact type spelling `A|B|C!D|E|F` is valid, while official reference documentation prefers `(A | B | C) ! (D | E | F)` to expose the success and error sides clearly. Whitespace and line breaks do not change the type's meaning.

## 3. Useful defaults reduce defensive work

LiteScript uses defaults to remove recurring bookkeeping while giving values a defined meaning.

Every type must have a valid value represented by all-zero storage. A simple typed declaration can therefore create a readable value immediately:

```text
Profile := record {
    name: String = "Guest";
    points: Int = 10;
}

zeroed: Profile;
configured: Profile = {};
```

`zeroed` contains an empty name and zero points. `configured` applies the declared defaults, producing `"Guest"` and `10`. The source chooses the initialization operation; zero initialization consistently bypasses declared field defaults.

The same principle applies to other values. `Unit` is a valid value with one inhabitant. An `Option` zero is `.None`. A zero-initialized `T ! E` contains `.ok(zero(T))`. A zero-initialized function is callable and returns zero of its declared result without user-body work, while preserving ordinary argument evaluation and required cleanup. Mappings for remaining categories, including plain unions and resource values, still require design.

Ordinary values have no universal `null`, `nil`, or `undefined` state. Absence is expressed through `Option`, where it belongs in the contract. Ordinary programs use values and access permissions without a raw pointer vocabulary. Address management belongs behind the implementation and foreign-interface boundaries, whose precise contracts remain open.

A valid zero value still needs type-specific meaning. Zero initialization alone does not establish that a file is open, a resource has been acquired, or an application-level validation has passed. Those facts belong in the relevant type and operation contracts.

## 4. Make consequential operations explicit and concise

LiteScript should provide short, readable operations for behavior that affects a caller's reasoning. Failure propagation and mutation are central examples.

A recoverable result has a declared success and error contract:

```text
String ! ReadError
```

At a call site, the programmer can retain the outcome, recover locally, or propagate the error. Inside a function whose declared contract covers `ReadError`, propagation is concise:

```text
text := read_text(path)!;
```

The `!` supplies the successful payload or exits that function with the error. Local recovery is equally direct:

```text
text := read_text(path) else {
    ""
}
```

The recovery block runs on a matching failure and supplies the chosen fallback. Typed filters and composed recovery expressions support more precise handling without requiring a helper function for every variation. A function's error contract remains explicit, and each extracted fallible step has a visible handling or propagation operation.

Typed panics use a separate channel. Basic arithmetic faults follow that channel, so ordinary arithmetic does not acquire a Result wrapper at every operation. An attached typed `else` can provide local recovery. The exact fault and capture boundaries are still under review.

Mutation follows the same philosophy. Fixed bindings and read-only access are the defaults. `var` permits replacement of a binding or caller location; `mut` permits updates to held data. Caller mutation grants are explicit at the call. These permissions should be practical to use and simple to inspect.

The language can infer types and remove repeated syntax while keeping failure exits, access authority, and observable changes explainable from the source.

## 5. Convenience should preserve an efficient implementation

Readable syntax should lower to straightforward operations wherever the semantics permit it. Ordinary language features should not require a large interpreter, managed virtual machine, universal object hierarchy, or mandatory boxed representation simply to express common work.

The implementation direction favors concrete data representations, unboxed values where appropriate, static specialization, and direct dispatch when the contract allows them. Collection algorithms should accept the capabilities they need from compatible providers. Passing a collection through a common interface should not inherently require converting it to one standard container, boxing every element, or materializing a stream.

Abstractions have costs that need to be understood. Allocation, copying, indirection, runtime checks, dynamic dispatch, and cleanup all require explicit evaluation during design. Native compilation, startup time, compilation latency, binary size, memory use, and steady-state execution are separate concerns.

Safe defaults can coexist with optimization. A semantic zero initialization can be omitted physically when the compiler proves its stores unobservable. An explicit request for uninitialized storage has its own initialization requirements. Those two source contracts remain distinct even when their compiled code can coincide.

The goal is useful performance near C on suitable workloads with a modest runtime. That goal needs an implementation and measurements. The memory-management model, ownership rules, compiler backend, and runtime mechanisms remain open decisions.

## 6. Support people and programming agents through the same clarity

A person or agent reading a function should be able to identify its inputs, outputs, access permissions, and failure paths from a manageable amount of source. Predictable syntax and consistent rules make both writing and review easier.

The design should favor visible contracts, consistent composition, explicit effects, and diagnostics that explain the cause of a problem and the action needed to fix it. Formatting should be consistent and preserve meaning. Names and types should carry useful information without forcing a reader through layers of generated or implicit behavior.

This also supports teaching. A beginner can start with values, inferred bindings, calls, conditions, and loops, then learn explicit mutation, absence, failures, and stronger library contracts as the problem requires them. More advanced use retains the same basic model.

## 7. Judge convenience by its semantic cost

Some implicit behavior is useful and already selected: ordinary type inference, compatible success construction, and defined zero initialization remove repetition. Each has a specific rule that a programmer can learn and apply consistently.

Further convenience features must earn their place. A proposal that infers a type must still define its constraints. A proposal that hides copying, allocation, ownership transfer, or failure propagation must explain the resulting observable behavior and cost. Compiler optimization can change representation while preserving those contracts.

The project evaluates mechanisms individually. Existing languages provide references for specific questions; LiteScript's priorities determine which ideas fit. The [reference catalog](references.md) links the focused comparisons and their sources.

## 8. Criteria for future decisions

Every substantial proposal should be reviewed against these questions:

1. Does it help the programmer express and reason about the actual problem?
2. Can its behavior be explained from a small, visible set of rules?
3. Does it remove repetition while preserving essential contracts?
4. Are failure paths, access permissions, and meaningful effects understandable from source?
5. What representation, allocation, copying, dispatch, and cleanup does it require?
6. Can a compiler implement the ordinary path efficiently, and which claims need measurement?
7. Does it compose consistently with the rest of the language?

These criteria are the basis for design review. Brevity, familiarity, or a favorable isolated example does not by itself settle a proposal.

## 9. From philosophy to a language contract

This white paper states the project's philosophy and the criteria for future decisions. The [decision ledger](decisions-and-open-questions.md) records selected rules and unresolved contracts; detailed pages define their examples and boundaries. The [grammar sketch](grammar-sketch.md) remains provisional.

Important work remains in type inference, generics, ownership and lifetimes, special-type zero mappings, failure transport, resource management, modules, and tooling. Those mechanisms must be developed under the same priorities: readable programs, little ceremony, explicit consequential behavior, strong contracts, and an implementation whose costs can be understood.

Continue with [principles and goals](principles.md), [zero initialization](zero-initialization.md), [Result and errors](result-and-errors.md), [mutability and access](mutability.md), [memory and performance](memory-and-performance.md), and the [full reference index](README.md).
