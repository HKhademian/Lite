# Universal zero initialization

Status: **all-zero storage is a valid language-defined value for every type, explicitly selected by the user 2026-10-19; Result zero and zero-result callable behavior selected 2026-10-20**. Result zero is `.ok(zero(T))` for `T ! E`. A zero-initialized callable returns zero of its declared result type after ordinary argument evaluation, with required cleanup preserved. This replaces the earlier valid-zero eligibility/zeroability restriction. Concrete mappings for the remaining type categories still need design.

## Core distinction

```text
Profile := record {
    name: String = "Guest";
    stats: {
        points: Int;
        level: Int = 1;
    };
}

zeroed: Profile = 0;
configured: Profile = {};
```

Zeroed has empty name, points 0, and level 0. Configured has name Guest, points 0, and level 1. Both are initialized values. The implementation must choose representations and operations such that zero-filled storage maps to each field's valid zero value.

Selected forms:

- value: Type; initializes the all-zero value of Type.
- var value: Type; does the same and permits whole-binding replacement.
- value: Type = 0 explicitly selects the same zero initialization.
- value: Type = { ... } selects record construction with declared defaults for omitted fields.

Zero initialization bypasses declared defaults at every depth. It creates a readable value immediately, not reserved/uninitialized storage awaiting a first assignment. No var/mut permission follows from initialization mode. Omitted initialization is selected for simple typed declarations, not source-free inferred declarations. An omitted ordinary function argument follows its separate default-initialization rule: use the declared parameter default, or zero of its type when no default is specified. See [omitted value arguments](functions.md#omitted-value-arguments).

## Universal type rule

Every type must have a meaningful zero value represented by all-zero storage. A compiler must not reject zero construction because a type lacks a valid zero. Designing a type includes defining this mapping; raw foreign representations cannot silently invalidate the language rule.

Zero is neither a universal null expression nor automatically absence for every type. A zero function must be callable with defined behavior. A zero reference/access value, resource wrapper, enum, union, or constrained domain must have defined language meaning too. Their operations may have ordinary specified outcomes/faults, but zero state alone cannot be dismissed as an invalid value or unchecked memory access.

There is no generic zeroability constraint excluding some types. Full type layouts, ownership/disposal, and mappings for the categories below remain open; the universal requirement is selected independently of those details.

## Meaning of 0

Only literal 0 has the selected contextual zero-initializer meaning. Inferred 0 remains an Int. An integer variable or nonzero literal is not implicitly converted to a record:

```text
number := 0;
zeroed: Profile = 0;
source := 0;
bad: Profile = source; /* rejected: Int is not Profile */
badLiteral: Profile = 5; /* rejected: nonzero Int literal is not Profile */
```

All types supporting zero initialization does not make arbitrary numeric expressions universally assignable. Broader expected-type contexts for literal 0 still need complete inference rules. No numeric truthiness, automatic string conversion, or record arithmetic follows.

## Semantic zero values

The selected universal rule must map zero storage to meaningful values. Straightforward mappings include numeric 0, Bool false, empty String, Unit, empty variable-size collections, recursively zeroed records, and fixed-size arrays/tuples with each element zeroed. These meanings must be reconciled with actual representation, not merely assumed from C/OS conventions.

Since `Unit` has one value, the selected universal zero rule makes `zero(Unit) = Unit`. The user proposes a zero-sized physical representation, with no bytes to write for that semantic value. Unit remains a valid value, not an absent or invalid state. Calling convention and foreign ABI lowering for a zero-sized value remain representation details to define separately.

Option's zero is its explicit .None state. A loop value of type T starts as zero(T), without automatically wrapping T in Option. Typed values remain statically typed even though every type has zero.

Some mappings require further decisions:

- Enums and unions: choose a zero case/mapping consistent with exhaustive matching, backing values, nominal identity, and order-independent union normalization. Do not silently pick the first written union member or invent an unnamed enum case.
- References and writable access: provide meaningful zero behavior without dereferencing an invalid machine address or silently choosing an aliasing/ownership model.
- Resources and constrained domains: specify the valid zero state, its allowed operations, cleanup, and relation to construction/validation invariants. Zero initialization does not conjure an external resource.

These are representation/semantic design tasks, not exceptions permitting types with no zero. A zero value is not necessarily an identity for every operator: for example, zero initialization alone does not make a product fold start at 1.

## Zero-initialized functions

A zero-initialized function is callable. Its invocation performs no user-body work and returns `zero(R)`, where `R` is its declared result type. An `Int` result is `0`, a `String` result is empty, and a `Unit` result is `Unit`. If the declared result is `T ! E`, it returns `.ok(zero(T))` under the selected Result zero rule.

Normal call evaluation still applies: evaluate the callee, then each reached argument expression from left to right, then invoke the zero callable. Ignoring the evaluated argument values does not skip their evaluation or effects. An exit during argument evaluation follows its ordinary rules and can prevent invocation. Required argument ownership and cleanup behavior still applies; ignoring a value does not exempt it from that contract.

The zero callable performs no updates through `mut` or `var` parameter grants. This does not make the entire call expression free of effects: argument evaluation and required cleanup can have observable behavior. Complete ownership/cleanup timing, callable type grammar, representation, and ABI remain open. See [function calls](functions.md#zero-initialized-callables) and [evaluation order](evaluation-order.md#function-calls).

## Defaults versus partial zero initialization

```text
profile: Profile = {
    stats = 0,
};
```

Name uses its declared default Guest; stats explicitly zeroes its fields and bypasses level's default 1. Stats = {} would apply its defaults. Default construction and universal zero remain distinct operations.

## Separate explicit uninitialized storage

Value: Type = ? requests storage without zeroing or default construction. It is a distinct state containing unspecified bytes, not the type's initialized zero value, and still needs the separate definite-initialization rules before value use. The old reserve() operation remains unselected. See [reserved storage](reserved-storage.md).

## Result and error boundaries

The selected zero value of a fallible outcome is success with a zero-initialized payload:

```text
zero(T ! E) = .ok(zero(T))

attempt: Int ! ReadError; // .ok(0)
explicit_zero: Int ! ReadError = 0; // .ok(0)
```

An ordinary success expression `0` in an `Int ! E` function likewise remains implicit success with numeric zero. A stored zero outcome has no error payload to handle. Recursive zero initialization preserves outcome boundaries: the zero of `(T ! E1) ! E2` is `.ok(.ok(zero(T)))`.

This mapping also applies wherever a conditional's missing-else path or a loop's value context uses zero of a fallible type. Representation, tag layout, and FFI adaptation must honor this semantic mapping and remain to be specified.

## Grammar and runtime boundaries

- Zeroing initializes the type's own storage. It does not follow and clear objects referenced from fields or imply deep allocation.
- Zero-filled references/functions must have language-defined mappings; the implementation must not import undefined behavior from a raw ABI accidentally.
- No constructor/default initialization followed by clearing is required.
- The optimizer may omit unobservable zero stores or storage entirely, preserving all defined reads, aliases, cleanup, and exits before replacement. See [initialization and physical writes](memory-and-performance.md#semantic-initialization-versus-physical-writes).
- Empty executable bodies return Unit; established record-initializer positions give {} default-construction meaning.
- Representation, FFI adaptation, layout, generic inference, ownership, and exact special-type zero behavior remain unimplemented design work.

Related: [record initialization](record-initialization.md), [declarations](declarations-and-assignment.md), [loop value](loop-value.md), [types](types-and-inference.md), [Result](result-and-errors.md), and [memory/performance](memory-and-performance.md).
