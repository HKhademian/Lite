# Decisions and open questions

Snapshot: **2026-10-17**. Source: the language-design discussion in this chat. No compiler implementation or conformance result is implied.

## Established direction

### Audience and defaults

- Static, strong typing, with ordinary type inference so first examples need no annotations.
- Immutable bindings by default; explicit mutation through `var`.
- Minimal visibility and capability exposure by default.
- Explicit optional data and typed errors instead of universal nullability.
- Composition and interfaces as the primary reuse direction.
- Small runtime and native performance as goals, not measured achievements.

### Syntax and results

- Braces are required for bodies.
- Whitespace outside token separation and literal data does not determine structure.
- Ordinary `/* ... */` comments nest; raw `/*# ... #*/` comments use matching hash fences and do not nest.
- Comments do not parse source text or insert item separators; missing closing delimiters are errors.
- Unicode identifiers are supported; the precise Unicode profile and normalization policy remain open.
- Explicit semicolons separate items; there is no automatic insertion.
- Extra semicolons do not become empty result-producing statements.
- Final expressions produce block results; final declarations/assignments produce `Unit`.
- Explicit `Unit` should be supported as a value.
- `:=` declares with inference; `: Type =` declares with annotation; `=` assigns.
- Assignments are not general expressions or chained value assignments.
- Function result annotations use `:`, not `->`.
- Uniform name bindings can hold function and type definitions.
- Early returns are encouraged.
- Ordinary `Result` success is implicit when an appropriate contract is expected; errors are explicit.
- Multiline strings and adjacent literal joining are desired.

### Operators

- Use `and`, `or`, and `not`.
- Use `==` for equality; express inequality through negation.
- Comparison binds more tightly than `not`, followed by `and` and `or`.
- `?=` and `!=` have no selected meaning in the current design.
- Supported `op=` updates use defined underlying operations and evaluate the target once.

### Conditional and loop direction

- One `if` form works for actions and values; branch braces establish ownership.
- One `loop` keyword handles Boolean, iterable, and unconditional sources.
- Remove post-condition loop syntax; use inner conditions and explicit exits.
- Loop receiver slots are item, count, accumulator; trailing slots can be omitted and `_` skips a slot.
- Tuple destructuring within a slot operates on that slot's actual value.
- Do not inject implicit ordinary names such as `it` or `acc`.
- Direction and stepping should be source/range capabilities rather than more loop keywords.
- An accumulator represents previous contributions, with absence modeled explicitly.
- Plain `continue` and bare `break` contribute nothing.
- Completion receivers are optional; `_` can opt into producing a replacement while ignoring the input.
- Concise optional search loops should not require redundant `None` bodies or `else { None }`.

### Tags

- A tag is an explicit typed construct context, not a global loop object.
- Put it before the construct: `@name loop ...`, `@name if ...`, or `@name { ... }`.
- Construct kind determines metadata and permitted operations.
- Tags follow lexical shadowing; an inner tag may reuse a name.
- `.field` refers only to the current construct, with no outward fallback.
- `@name.field` explicitly selects a named context.
- `return @tag [value]` exits a named construct; omitted payload is `Unit`.

## Working proposals requiring confirmation or formalization

- Identifiers use `XID_Start` plus `_` initially and `XID_Continue` thereafter, with case-sensitive lookup; pin the Unicode version and settle normalization separately.
- Counter value zero before the first condition, then one-based body-entry counts.
- Boolean and unconditional item payloads use `Unit`.
- Receiver aliases are read-only snapshots of loop state.
- Count/accumulator names cover the entire header and body despite textual declaration position.
- Iterable expressions evaluate once; Boolean sources are reevaluated through static mode selection.
- Public functions require explicit signatures.
- `Int` is a checked signed 64-bit default, with explicit other representations.
- A small prelude includes output, basic collections, `Option`, and `Result`.
- Module-private declarations, type-private fields, explicit exports, a manifest, and a lockfile.
- Native compilation/caching behind a run command.
- Ownership, deterministic cleanup, and explicit shared ownership as a candidate memory model.
- A general `match` expression with exhaustive value arms, but no selected arm punctuation.

## Contracts to settle next

### 1. Loop contribution and construct-result inference

Define iteration type `T`, accumulator state `Option<T>`, and final result type `R` independently. Explain all of these with one coherent system:

- Last-value loops.
- Action loops with `Unit` bodies.
- Search loops whose only non-Unit values come from targeted returns.
- Empty loops and loops whose every entry skips.
- Existing `Option` values without accidental nested wrapping or flattening.
- Explicit seeds that may or may not count as body contributions.

### 2. Completion hooks and abrupt exits

Set the exact relationship between receiving `then` and a separate `else`. The latest optional-state proposal lets `then` handle both presence and absence, so a separate `else` must not process the same empty case again.

Define receiving `finally` inputs and normal-result transformations. It must be possible to perform cleanup during early returns or propagated errors without inventing a successful result or suppressing the pending exit.

Confirm whether `break value` remains alongside `return @tag value`, and whether labeled contribution-bearing `continue` is accepted.

### 3. Receiver punctuation and initialization

Choose one separator. `:` was explicitly favored for all modes, but later receiver and tag examples continued using `as`. The documentation uses `as` provisionally rather than silently accepting both.

Define explicit seed syntax in the final receiver-list form. Retired parenthesized prototypes should not become an accidental second syntax.

### 4. Context phase rules

Specify initialized fields during source evaluation, conditions, bodies, hooks, and cleanup. Define whether a standalone untagged expression block establishes a new current context. Ordinary body braces do not add a wrapper context.

For an `if` chain, distinguish the selected branch from conditions that were never evaluated. Do not represent an unevaluated condition as if it had evaluated false.

### 5. Type-system and ownership foundations

Choose generics, nominal identity, interfaces, variance, borrowing/moves/copies, shared values, closure captures, and type-level values. Define how the `Unit` type and requested `Unit` value coexist with uniform bindings.

### 6. Standard library and project boundaries

Specify range/iterator capabilities, invalid dynamic stride handling, collection ownership, I/O failure, import/export grammar, package identity, and build behavior.

## Superseded suggestions

- Indentation or newlines as statement/body delimiters.
- Optional unblocked function, conditional, and loop bodies.
- `do/end`, `then/endif`, or specialized `endfn/endloop` as the selected block system.
- Mandatory parentheses around every conditional as the chosen source/body divider.
- Post-tested loop syntax and a separate required `loop if` spelling.
- Treating every loop receiver as an automatic metadata tuple.
- Changing the supplied value based on whether a pattern is a simple name or tuple.
- Requiring `.with_state()` or a separate `with` clause just to access ordinary loop metadata.
- Implicit `it`, global `loop.field`, or a current-context lookup that searches outward.
- A prohibition on nested tag shadowing.
- Suffix tags or `name: construct` as the current tag placement.
- Mandatory `Ok(...)` on normal success paths.
- Mandatory trailing `None` or redundant empty clauses for simple searches.
- Semicolons suppressing final-expression results.
- `?=` equality or conventional `!=` inequality as currently selected operators.

## Documentation boundaries

These files preserve the design's evolution without claiming every assistant suggestion was approved. External languages supply comparisons, not inherited semantics. No parser, runtime, package manager, tests, or benchmarks are present or claimed.

See the [index](README.md), [grammar sketch](grammar-sketch.md), and [references](references.md).
