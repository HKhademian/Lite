# LiteScript current design specification

Status: **draft current-design summary, 2026-10-25**. This page states the selected design at area level with stable IDs. It is not yet a complete language specification, and it is not a compiler contract. The linked normative page and the [decision ledger](../decisions-and-open-questions.md) remain authoritative if wording here is incomplete or conflicts.

## Using the IDs

- `LS-001` through `LS-010` identify stable design areas. The number does not change when wording is refined.
- A removed area is marked **superseded** and its ID is never reused.
- Cite the area ID for the broad decision and the linked normative page for details.
- “Selected” means a user choice or retained rule. “Open” means no current contract.

## LS-001 — Source, syntax, and evaluation

Selected:

- Blocks use braces. `if`, `else if`, `else`, `loop`, `then`, and `finally` are the ordinary control constructs.
- Newlines do not terminate or group expressions. Semicolons are ordinary separators and may be omitted after complete block/record items.
- Operands and named call inputs evaluate left to right in written order.
- Operator grouping, tighter to looser: prefix `-`; `* / // % %%`; `+ -`; comparison; `not`; `and`; `or`. Binary levels associate left to right, and parentheses override grouping.
- All ten comparison forms share one precedence. A comparison chain compares adjacent operands, evaluates each operand at most once left to right, and stops at the first false comparison.
- `=` is assignment, `==` is equality, and `=!=` is inequality. `**` is power; an unparenthesized unary-minus/power spelling is rejected, and chained-power association remains open.
- Conditions require `Bool`; there is no implicit truthiness. A complete Boolean expression may start with one optional `and`/`or`, which adds no operand and no binding.
- Postfix `!` forwards a returned recoverable error; typed panics use a separate channel.
- The [grammar sketch](../grammar-sketch.md) and [lexical structure](../lexical-structure.md) own the detailed syntax; [operators](../operators.md) owns the selected precedence ladder, and [evaluation order](../evaluation-order.md) owns sequencing details.

Open: complete grammar/parser, expression integration, power association and result typing, numeric/fault semantics, and exact diagnosis/recovery rules.

## LS-002 — Bindings, permissions, and assignment

Selected:

- `name := expression` declares and infers a binding.
- `name: Type = expression` declares with an explicit type. Declarations use `:=` or `: Type =`; no `let` keyword is added.
- Bindings are fixed and read-only by default.
- `var` permits whole-binding replacement. `mut` permits writable access to held data. `var mut` grants both, in that order.
- In typed forms, `var` stays with the binding and `mut` follows the colon, as in `var user: mut User`.
- `=` does not declare a name. Assignment selects its target once, evaluates the right-hand side, and only then writes. A compound update reads the target's current value before evaluating its right operand.
- Assignment is a statement producing `Unit` and cannot be used as a value.
- `name: Type = ?` explicitly reserves storage. The first whole-value write may initialize it without `var`; later replacement requires `var`.
- Definite initialization is path-sensitive: every path reaching a read must have initialized the binding.
- Ordinary local shadowing is lexical and sequential; a shadow binding is a distinct binding.

Open: partial construction, initialization through callees, and full field/element construction contracts.

## LS-003 — Types, unions, and zero

Selected:

- `T ! E` is a recoverable outcome type; `T!` is its shorthand. Success and error handling are explicit.
- `A | B` is a normalized plain union: order-independent, flattened, and duplicate-free.
- A value is admitted to a union when its normalized type is an exact member; widening preserves the source member. Narrowing is checked.
- All-zero storage is a valid language-defined value for every type. Result zero is `.ok(zero(T))` for `T ! E`.
- A multi-member union's active member for `zero(T)` is still open; do not choose a canonical or leftmost member.

Open: generic declaration/application syntax, union-zero priority, and zero mappings for enums, references, resources, and constrained domains.

## LS-004 — Initialization and defaults

Selected:

- An omitted typed local `name: Type` immediately zero-initializes that type.
- `name: Type = 0` uses the language-defined zero. `name: Type = {}` uses declared field defaults.
- A bare local whose normalized type has multiple distinct union members requires an initialized expression or `= ?`; `= 0` cannot choose a member.
- A conditional initializer without `else` leaves the declaration default on no match. `else { ? }` leaves the binding reserved on that path.
- Record construction must satisfy required fields and the type's validity contract.

Open: field-default mechanics, partial construction, and allocation/cleanup details.

## LS-005 — Functions and calls

Selected:

- Function types and literals use `fn`; ordinary parameters are written `name: Type`.
- Access qualifiers follow the colon: `fn(user: mut User)` for held-data mutation and `fn(target: var T)` for caller-storage replacement.
- A zero-initialized callable is callable, performs no user-body work, and returns `zero(R)` after ordinary argument evaluation and required cleanup.
- Argument omission is rejected unless an applicable explicitly declared default supplies a valid value. Supplied arguments take precedence.
- Missing defaults evaluate at call time, after supplied expressions, in declared slot order.

Open: complete default grammar and lookup, generic callable compatibility, signature/implementation placement, and ownership/ABI details.

## LS-006 — Conditionals

Selected:

- A conditional is total only with a final `else`.
- A no-`else` conditional is partial. Matching branches supply `T`; no match is noncontributing.
- Declaration initializer: the declaration default remains (`zero(T)` or reserved with `?`).
- Assignment: no match performs no write.
- Loop body: no match contributes nothing and preserves `.value`.
- Value-required context — argument, return, arithmetic, nested expression, or `then` — requires a final `else`.
- `then` requires a final `else`, receives the selected `T`, and produces `R`.
- `else { ? }` is an explicit no-initialization/no-write/no-contribution branch. `?` is not `Unit`, `None`, or `zero(T)`.
- A conditional's tagged `.value` is readable only inside its attached `then` via `@tag.value`; condition metadata is hidden.
- A multi-member union declaration initializer requires an explicit `else` or `?`; assignment and loop no-match paths do not.

Open: exact cleanup attachment scope, the `&` form's public value/operations, and general coverage proofs.

## LS-007 — Loops

Selected:

- One `loop` keyword supports iterable, Boolean, and unconditional sources.
- `as` names one optional item. Destructuring happens inside the body; positional receiver lists and completion receivers are retired.
- `.item`, `.index`, `.count`, and `.value` are loop metadata. `.value` has static type `T` and starts at `zero(T)`.
- A normally completing tail value, `continue value`, or `break value` commits to `.value`. Plain `continue` and bare `break` preserve it.
- A receiverless `then` processes the completion result. Without `then`, the selected result is final `.value`.
- `break`, `continue`, and `return` may target an explicit `@tag`. A targeted return runs only the named target's `then`.
- If no path contributes and no expected type constrains `T`, `T` defaults to `Unit`.

Open: complete body/result inference, nonzero `.value` initialization, lifetime/retention, and cleanup attachment.

## LS-008 — Errors, recovery, and cleanup

Selected:

- Returned errors use `T ! E`; postfix `!` forwards them. Typed panics are a separate fault channel.
- `else` recovery is target-level: an operation or block expression.
- Typed filters may select an error/panic type, preserve declared order, and bind a receiver where selected.
- `A | B` is an alternative; `A & B` is an order-insensitive co-occurrence set and binds no value.
- Ordered failure tuples use existing tuple syntax and bind a real tuple; positional access works, labels only in the named form.
- `finally` is cleanup-only: it has no receiver, does not recover failures, and does not replace a pending result/exit.
- `then` runs before `finally` on normal loop/conditional completion. Cleanup failures follow the selected primary/secondary precedence.

Open: `Error`'s full contract, the `&` form's public value/operations, exact `finally` attachment scope, and hard-abort behavior.

## LS-009 — Collections and sequences

Selected:

- Consumers request capabilities rather than one concrete collection type.
- Fixed arrays, growable lists, and slice views are the sequence storage roles.
- A fresh nonempty bracket literal with an established element type and statically known total length `N` infers `[T; N]` unless an expected concrete collection type selects another family.
- Indexed reads/writes and pops use ordinary syntax; invalid bounds are typed faults recoverable by an attached `else`.
- Iteration does not require conversion to a standard list or exposure of static size.

Open: collection/iterator protocol names and syntax, empty/unresolved-element literal inference, generic constraints, conversions, ownership, and runtime-array spelling.

## LS-010 — Modules, tooling, and project stage

Selected:

- Modules default to private visibility.
- The official formatter is `lite fmt`. `lite fmt --check` is read-only and suitable for CI.
- The formatter preserves meaning, is idempotent, and leaves a malformed or unverified file unchanged while reporting a diagnostic and failure status.
- The project remains planning-only; no compiler implementation is claimed.

Open: package/build syntax, runtime/native ABI, complete formatter implementation, and module resolution details.

## Open contracts at a glance

These are not missing documentation; they are deliberately unresolved design questions:

- complete grammar and operator coverage;
- generic declaration/application syntax;
- active-member selection for multi-member union zero;
- zero mappings for enums, references, resources, and constrained domains;
- partial construction and initialization through callees;
- default-parameter grammar/lookup and callable adaptation details;
- exact cleanup attachment, `&` value/operations, and hard-abort policy;
- collection protocols, empty-literal inference, and ownership/conversion rules;
- module/package and runtime ABI contracts.
