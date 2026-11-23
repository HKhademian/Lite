# INV-030 — Method and extension-operation declaration syntax

Status: core direction selected 2026-11-23 ([docs/type-operations.md](../../docs/type-operations.md)); compiler implementation not started
Contributor: project contributor (agent-assisted)
Last updated: 2026-11-23
Catalog brief: [INV-030](TOPICS.md#inv-030)
Covered subtopics: whole topic; method/extension declaration syntax
Subtopic brief: none

This note preserves the original 2026-10-31 exploration and records the
2026-11-23 design selection. Normative rules live in
[docs/type-operations.md](../../docs/type-operations.md) and the
[decision ledger](../../docs/decisions-and-open-questions.md).

## 2026-11-23 resolution summary

Selected direction:

- **Uniform type-qualified bindings:** `[pub] TypeName.op := fn[<TypeParams>](recv: [mut] Self[<...>], ...): Ret { ... }`, statically lowered to ordinary function calls with no classes or bound-method closures.
- **`self` versus `Self`, and `Self`-only receivers:** `self` remains the function's reference to itself (`self(...)` recursion); `Self` is the type reference to the attached receiver type. For now, the receiver parameter may only have `Self` type (`v: Self`, `v: mut Self`, or `Self<...>` for generic type families), paired with an ordinary named first parameter.
- **Generics from the beginning:** type parameters (both receiver-level like `List<T>` and operation-level like `List.map<T, U>`) live in LiteLang's separate `fn<...>` list (`items: mut Self<T>`); concrete instantiations (such as `fn(items: Self<Int>): Int`) use the same form with one unique binding per `TypeName.op`.
- **Owned nominal types only for now:** inherent operations belong only to the module defining a `record`, `enum`, `distinct` (fresh owned type), or built-in nominal type family. `pub` operations travel with the type. Because `alias` is pure transparent symbol/target substitution with no identity or namespace of its own (as if the targeted symbol were written directly), attaching operations through an `alias` or to foreign targets is disallowed for now.
- **Deferred future direction:** explicitly imported extension operations (Kotlin/Swift-like extendability without implicit global patching) are documented for future design alongside LiteLang's explicit member-introduction/`using` syntax.

Remaining open items (call-site `mut` visibility on dot calls, zero-argument properties versus calls, `Self` in generic type-family operations, explicit call-site type arguments, and future extension opt-in syntax) are tracked in [docs/type-operations.md](../../docs/type-operations.md#open-decisions).

## Historical 2026-10-31 investigation question

How should Lite declare additional operations that are called with dot syntax,
without classes, and how should the receiver bind?

The user's current direction is inspired by Kotlin's `fun T.method()` form. The
concrete candidate discussed is:

```text
List.push_front := fn(self, ...) { ... }
```

with `self` carrying special receiver meaning, so a later call can be written as
`values.push_front(...)`. This candidate is recorded, not selected.

## Current contracts and evidence

- Functions are declared as values with `name := fn (...) { ... }` and called
  positionally or with named inputs. See [functions](../../docs/functions.md).
- Dot syntax currently selects tuple fields, positional tuple members, and
  related member access. It is not a method-declaration form.
- `self` already has a selected role for explicit self-recursion: `self(...)`
  calls the current implementation. See
  [direct self-reference](../../docs/functions.md#direct-self-reference-without-an-earlier-target).
  Reusing `self` as an ordinary receiver parameter would therefore collide with
  that selected role unless the forms are distinguished.
- `mut` and `var` are separate permissions. A receiver that mutates held data
  needs a writable access contract, not merely a dot-call spelling. See
  [mutability](../../docs/mutability.md) and
  [call replacement flow](../../docs/call-replacement-flow.md).
- Lists currently use ordinary builtin end operations such as
  `push_front(mut values, item)`. The user is asking about a future way to
  declare such additional operations in source, not about changing the current
  builtin surface.

## Concrete candidate cases

All examples below are unselected exploration syntax.

```text
List.push_front := fn(self, value) { ... }
values.push_front(1)
```

```text
List.push_front := fn(mut self, value) { ... }
values.push_front(1)
```

Open points visible in these examples:

- Whether `List` is a type, a namespace, or only part of the declaration name.
- Whether the receiver is always first, explicitly marked, or inferred.
- Whether `self` is a parameter name, a keyword, or a receiver-only binding.
- Whether the existing self-recursion spelling must be renamed or distinguished
  (`self` versus a receiver keyword).
- Whether every dot call is treated as a method call, or only calls resolved
  through a declared receiver operation. The user's message left this sentence
  incomplete; it should not be completed by assumption.
- How dot-call resolution distinguishes a field from an operation.
- How receiver mutability is granted and checked.
- How generic receivers such as `List<T>` and fixed tuples are written.
- Whether operations can be declared for builtin types, user types, aliases, or
  only source-owned types.
- Overload selection, visibility, module ownership, and duplicate declarations.

## Options and consequences

1. **Receiver-type-qualified value declaration** — a declaration such as
   `List.push_front := fn(self, ...)`. This keeps the existing function-value
   syntax but gives the left side a type/namespace meaning. It needs a precise
   answer for `self`, dot-call resolution, and whether `List.push_front` is a
   readable value elsewhere.
2. **Keyword declaration form** — a Kotlin-like form such as
   `fn List.push_front(...)`. This is closer to the stated inspiration but adds
   a new declaration grammar and must coexist with `name := fn`.
3. **Free function with a receiver contract** — an ordinary function whose first
   input is marked as a receiver, with dot syntax as call sugar. This avoids
   changing declaration identity but still needs receiver binding, resolution,
   and mutation rules.
4. **No method declarations yet** — keep only builtin/free functions and revisit
   after records, namespaces, or module contracts exist. This preserves current
   semantics and avoids guessing class-like structure.

## Non-claims

This note does not select Kotlin syntax, `List.push_front := ...`, a special
`self` keyword, universal dot-call treatment, method lookup, overloading,
receiver mutation, or any implementation. It records the user's preference so a
later syntax decision can compare concrete options.
