# LiteLang current design specification

Status: **draft current-design summary, 2026-10-26**. This page states the selected design at area level with stable IDs. It is not yet a complete language specification, and it is not a compiler contract. The linked normative page and the [decision ledger](../decisions-and-open-questions.md) remain authoritative if wording here is incomplete or conflicts.

## Using the IDs

- `LS-001` through `LS-011` identify stable design areas. The number does not change when wording is refined.
- A removed area is marked **superseded** and its ID is never reused.
- Cite the area ID for the broad decision and the linked normative page for details.
- “Selected” means a user choice or retained rule. “Open” means no current contract.

## LS-001 — Source, syntax, and evaluation

Selected:

- Blocks use braces. `if`, `else if`, `else`, `loop`, `then`, and `finally` are the ordinary control constructs.
- Newlines do not terminate or group expressions. Semicolons are ordinary separators and may be omitted after complete block/record items.
- Operands and named call inputs evaluate left to right in written order.
- Operator grouping, tighter to looser: prefix `-`; `* / _/ % _%`; `+ -`; comparison; `not`; `and`; `or`. Binary levels associate left to right, and parentheses override grouping.
- All ten comparison forms share one precedence. A comparison chain compares adjacent operands, evaluates each operand at most once left to right, and stops at the first false comparison.
- Division distinguishes calculation from storage: floating operands supply floating arithmetic, including nonintegral values; Int storage applies / truncation or _/ floor to the quotient. For example -7.5 / 2 stores -3 and -7.5 _/ 2 stores -4. Preserve the operands. Float/Double results retain fractional /, including 2 / 7; integer-only division without floating evidence/expectation keeps its integer default. See [division](../division.md#floating-calculation-and-integer-storage) for numeric/context limits.
- Preserve floating intermediates until the complete admitted expression reaches Int storage: (7.5 / 2) * 2.0 stores 7. Parentheses group without converting; a typed Int intermediate stores its rounded value before later arithmetic. Explicit rounding operations retain their meanings. See [storage boundaries](../division.md#floating-intermediates-and-storage-boundaries).
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
- `Option<T>` is a named explicit optional type. There is no implicit null or nullable ordinary value. `Unit` is a real type.
- `A | B` is a normalized plain union: order-independent, flattened, and duplicate-free. Normalization does not collapse nominal records, enum cases, `Option`, or `Result` into their payloads or into `Unit`.
- A value is admitted to a union when its normalized type is an exact member; widening preserves the source member. Narrowing is checked.
- A union field read is valid when every possible alternative exposes that readable field; its type is the normalized union of the field types. A field write must be compatible with every possible target.
- Fixed-array [S; N] values widen to [T; N] through ordinary copying when S safely widens to T and access/initialization/copy contracts hold. Preserve extent, order, values, and the source contract; adapt representation if needed. Widening grants no write permission and introduces no shared view or write grant. See [fixed-array widening](../arrays.md#fixed-array-values-widen-element-by-element).
- Tuple values widen component by component when every corresponding payload fits ordinary value compatibility and the remaining label/access/copy contracts hold. Preserve ordered shape, nesting, source type, segment roles/extents, and write-grant restrictions. Explicit typed label conversion remains a separate bypass; no reconstruction or same-layout guarantee is required. See [tuple widening](../types-and-inference.md#tuple-values-widen-component-by-component).
- Generic value widening requires proof of compatibility of the complete instantiated contracts; compatible type arguments alone are insufficient. Simple compatible inline payload copying may fit; an Int-only stored callback cannot promise to accept String. Reject conversions without a valid proof. Syntax and the complete generic proof system remain open; see [generic widening](../types-and-inference.md#generic-widening-requires-complete-compatibility).
- Unchecked narrowing is a compile-time error. A narrower annotation alone is insufficient; an established static proof or checked selection/handling must justify the narrower contract. See [checked narrowing](../types-and-inference.md#unchecked-narrowing-is-rejected).
- All-zero storage is a valid language-defined value for every type. Result zero is `.ok(zero(T))` for `T ! E`.
- A multi-member union's active member for `zero(T)` is still open; do not choose a canonical or leftmost member.

Open: generic declaration/application syntax, union-zero priority, and zero mappings for enums, references, resources, and constrained domains.

## LS-004 — Initialization and defaults

Selected:

- An admitted omitted typed local `name: Type` immediately zero-initializes that type, subject to the multi-member union restriction below and the unresolved zero mappings in LS-003.
- Where admitted, the initializer spelling selects the mechanism: omitted typed local → zero; `= 0` → zero; `= {}` → declared field defaults; `= ?` → reserved storage.
- Where zero construction is admitted, `name: Type = 0` uses the language-defined zero. `name: Type = {}` uses declared field defaults.
- Reserved `= ?` storage is not readable before initialization and adds no `Unit`, `None`, or unknown union member.
- A bare local whose normalized type has multiple distinct union members requires an initialized expression or `= ?`; `= 0` cannot choose a member.
- A conditional initializer without `else` leaves the declaration default on no match. `else { ? }` leaves the binding reserved on that path, correlated with the condition.
- A fixed binding's first whole-value write initializes it; later replacement requires `var`.
- Record construction must satisfy required fields and the type's validity contract.

Open: field-default mechanics, partial construction, and allocation/cleanup details.

## LS-005 — Functions and calls

Selected:

- Function types and literals use `fn`; ordinary parameters are written `name: Type`.
- A function type is its signature without a body; function literals are ordinary value expressions.
- A compatible fallible callable view may widen success and/or declared error payload types in one outer `T ! E` result, preserving `.ok`/`.err`; narrowing extra errors requires explicit handling/mapping. The original source retains its contract. See [callable outcome widening](../callable-value-variance.md#fallible-callable-views-may-widen-outcomes).
- Access qualifiers follow the colon: `fn(user: mut User)` for held-data mutation and `fn(target: var T)` for caller-storage replacement.
- Basic `var T` parameter types stay invariant when converting callable signatures: reading and writing require the same resolved `T`. Explicit public-label conversion cannot change that value/access contract. Individual `var` argument admission still uses current read facts and accepted writes; see [callable var invariance](../callable-value-variance.md#var-parameters-keep-their-value-type).
- A zero-initialized callable is callable, performs no user-body work, and returns `zero(R)` after ordinary argument evaluation and required cleanup.
- The public callable contract must permit argument omission. Ordinary user implementations need an applicable declared default; supplied arguments take precedence.
- Call evaluation prepares the callee and supplied arguments in source order. Ordinary user implementations then evaluate missing applicable defaults in declared slot order at call time. An exit stops later preparation.
- A zero implementation runs no defaults and needs no actual default definition for omission-capable ordinary inputs. It preserves supplied-argument evaluation and required cleanup, returns `zero(R)`, and grants no omission of required inputs or fabricated access permission. See [zero-callable omission](../callable-default-contracts.md#zero-callable-omission-selected).

Open: complete default grammar and lookup, generic callable compatibility, signature/implementation placement, and ownership/ABI details.

## LS-006 — Conditionals

Selected:

- A conditional is total only with a final `else`.
- A no-`else` conditional is partial. Matching branches supply `T`; no match is noncontributing.
- Declaration initializer: the declaration default remains (`zero(T)` or reserved with `?`).
- Assignment: no match performs no write.
- Loop body: no match contributes nothing and preserves `.value`.
- Value-required context — argument, return, arithmetic, nested expression, or `then` — requires a final `else`.
- `then` requires a final `else`, receives the selected `T`, and produces `R`. A partial no-`else` conditional cannot carry `then`.
- `else { ? }` is an explicit no-initialization/no-write/no-contribution branch. `?` is a control-flow marker, not a value: it cannot be stored, passed, returned, compared, or used in arithmetic.
- A conditional's tagged `.value` is readable only inside its attached `then` via `@tag.value`; condition metadata is hidden.
- A returned error or unhandled panic supplies no conditional `T`, so result-processing `then` is skipped. A locally recovered failure may still complete a branch normally.
- A multi-member union declaration initializer requires an explicit `else` or `?`; assignment and loop no-match paths do not.

Open: exact cleanup attachment scope, the `&` form's public value/operations, and general coverage proofs.

## LS-007 — Loops

Selected:

- One `loop` keyword supports iterable, Boolean, and unconditional sources.
- `as` names one optional item. Destructuring happens inside the body; positional receiver lists and completion receivers are retired.
- `.item`, `.count`, and `.value` are loop metadata; `.index` is additionally available only for positional sources such as arrays, lists, and slices, not for a unique set. `.value` has static type `T` and starts at `zero(T)`.
- `.item` is `Unit` in Boolean and unconditional loops. After zero body entries, `then` exposes type-directed zero placeholders and `.count == 0`.
- A normally completing tail value, `continue value`, or `break value` commits to `.value`. Plain `continue` and bare `break` preserve it.
- A no-`else` conditional in loop tail position contributes nothing on no match; a declaration such as `x := if ...; x` still contributes `x`'s declaration default.
- A receiverless `then` processes the completion result. Without `then`, the selected result is final `.value`.
- `break`, `continue`, and `return` may target an explicit `@tag`. A targeted return runs only the named target's `then`.
- If no path contributes and no expected type constrains `T`, `T` defaults to `Unit`.

Open: complete body/result inference, nonzero `.value` initialization, lifetime/retention, and cleanup attachment.

## LS-008 — Errors, recovery, and cleanup

Selected:

- Returned errors use `T ! E`; postfix `!` forwards them. It does not assert success, catch a panic, or handle an untyped failure. Typed panics are a separate fault channel.
- Stored `S ! E` values widen to `T ! F` when both payload types fit by selected safe widening, recursively across matching layers. Preserve `.ok`/`.err`, active payloads, ordinary copies, and the source contract; no flattening, added layer, unwrap, unchecked narrowing, or writable-grant widening. See [stored Result widening](../result-and-errors.md#stored-result-values-widen-safely) and [general safe widening](../types-and-inference.md#safe-widening).
- `else` recovery is target-level. An operation handles only its defined faults; argument/operand panics bypass that handler ([LP-0001 r1](../proposals/LP-0001-operation-specific-panic-recovery.md)). An explicit `{ ... } else { ... }` block covers supported typed panics from its contents, argument evaluation, and synchronously called code ([LP-0002 r1](../proposals/LP-0002-explicit-block-panic-recovery.md)). The block boundary is active before its first item; the handler is outside its own protection.
- Typed filters may select an error/panic type, preserve declared order, and bind a receiver where selected.
- Recovery munches pending occurrences in written else order, independently of error occurrence order ([LP-0003 r1](../proposals/LP-0003-pending-failure-munching.md)). A single failure is schematically (ErrSingle,), an aggregate contains several occurrences, and () means none. A match consumes only its match; no match runs no handler and consumes nothing. A proven empty remainder needs no further catch or returned-error propagation for those handled failures, provided no new failures are introduced. This is a recovery-state model, not a selected tuple ABI or primary-promotion rule.
- Error declarations admit types without occurrence counts ([LP-0004 r1](../proposals/LP-0004-count-free-error-contracts.md)). Complete type-directed recovery must not require predicting aggregate multiplicity or writing one clause per unknown occurrence. Repeated-type handler invocation, payload binding, and the exact count-independent consumption mechanism remain open; no loop/group receiver or count syntax is selected.
- `A | B` is an alternative; `A & B` is an order-insensitive co-occurrence set and binds no value.
- Ordered failure tuples use existing tuple syntax and bind a real tuple; positional access works, labels only in the named form.
- `finally` is cleanup-only: it has no receiver, does not recover failures, and does not replace a pending result/exit.
- `finally` runs on normal and abrupt exits and preserves the pending outcome when cleanup completes normally. Cleanup failures follow the selected primary/secondary precedence.
- `then` runs before `finally` on normal loop/conditional completion. A handler in the same scope recovers a matching typed panic before that scope's `finally` runs once on exit.

Open: `Error`'s full contract, operation fault attribution, complete recovery-chain/assignment attachment, the `&` form's public value/operations and transport, exact `finally` attachment scope, and hard-abort behavior.

## LS-009 — Collections and sequences

Selected:

- Consumers request capabilities rather than one concrete collection type.
- Fixed arrays, growable lists, and slice views are the sequence storage roles.
- A fresh nonempty bracket literal with an established element type and statically known total length `N` infers `[T; N]` unless an expected concrete collection type selects another family.
- Statically known spreads contribute their lengths to `[T; N]`. `var`/`mut` and later operations do not by themselves change the inferred family or extent; an expected concrete growable collection can request a list.
- Indexed reads/writes and pops use ordinary syntax; invalid bounds are typed faults recoverable by an attached `else`.
- Iteration does not require conversion to a standard list or exposure of static size.

Open: collection/iterator protocol names and syntax, empty/unresolved-element literal inference, generic constraints, conversions, ownership, and runtime-array spelling.

## LS-010 — Modules, tooling, and project stage

Selected:

- Modules default to private visibility.
- The official formatter is `lite fmt`. `lite fmt --check` is read-only and suitable for CI.
- Formatting is a presentation transform. It requires syntactically valid source but is not a type checker or name resolver.
- The formatter preserves meaning, is idempotent, and leaves a malformed or unverified file unchanged while reporting a diagnostic and failure status.
- The project remains planning-only; no compiler implementation is claimed.

Open: package/build syntax, runtime/native ABI, complete formatter implementation, and module resolution details.

## LS-011 — Naming and versioning

Selected:

- The umbrella project is **Lite** (`lite`); the language is **LiteLang** (`litelang`).
- A program or source unit is a **LiteScript** (`litescript`); the plural is **LiteScripts**.
- The compiler is the **Lite compiler**, package `lite-compiler`, binary `litec`.
- The runtime is the **Lite runtime**, package `lite-runtime`, binary `literun`.
- The command-line tool is `lite`; LiteScript files use `.lite`.
- Language, compiler, runtime, and CLI have independent semantic versions. The runtime also has an integer ABI version.
- A language version changes only through an accepted Lite Proposal (`LP-NNNN`) or a recorded ledger decision. Releases use a project manifest tag such as `lite-v1.2.0` plus component tags such as `lang-v1.2.0` and `compiler-v0.4.1`.
- A proposal uses `LP-NNNN rN` with status, target version, and supersession links. Accepted proposals are not silently edited.
- Same language MAJOR promises source compatibility; the runtime must match the compiler's declared ABI or a declared compatibility range.
- Existing pages that say “LiteScript” for the language are legacy usage. New and edited text uses LiteLang for the language and LiteScript only for a program.

Open: package-registry spelling, release automation, and standard-library versioning details beyond the reserved `lite-stdlib` name.

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
