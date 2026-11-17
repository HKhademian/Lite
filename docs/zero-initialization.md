# Universal zero initialization

Status: **all-zero storage is a valid language-defined value for every type, explicitly selected by the user 2026-10-19; Result zero and zero-result callable behavior selected 2026-10-20**. Unit, Result, callable, record, tuple, and fixed-array mappings are selected; enum, reference/access, resource, and constrained-domain mappings remain open; multi-member union zero has no known active member. Zero-dependent contracts are conditional until those mappings are defined. Result zero is `.ok(zero(T))` for `T ! E`. A zero-initialized callable returns zero of its declared result type after ordinary argument evaluation, with required cleanup preserved. This replaces the earlier valid-zero eligibility/zeroability restriction.

Implementation checkpoint, 2026-11-01: the igniter supports omitted
initializers on typed locals for Int, Float, String, Bool, Unit, flat tuples and
fixed arrays. `name: Type = value` also works for those scalar/tuple/array
declarations. Zero initialization of List and function values remains
unsupported and reports a type error. Reserved `name: Type = ?` storage with
first whole-value initialization is implemented for the same scalar/tuple/array
locals; List and function reservation remain unsupported.

## Plain-union construction restriction

A bare typed declaration and an explicit `= 0` initializer each zero-initialize every type, including multi-member unions. Union zero has Kind 0 and no known active member; see [union initialization](union-initialization-policy.md#bare-local-declarations). Earlier restrictions rejecting either declaration form are superseded. Conditional fallback remains a separate source rule to review.

## Core distinction

```text
Profile := record {
    name: String = "Guest";
    stats: {
        points: Int;
        level: Int = 1;
    }
}

zeroed: Profile = 0;
configured: Profile = {}
```

Zeroed has empty name, points 0, and level 0. Configured has name Guest, points 0, and level 1. Both are initialized values. The implementation must choose representations and operations such that zero-filled storage maps to each field's valid zero value.

Selected forms:

- value: Type; initializes the all-zero value of Type.
- var value: Type; does the same and permits whole-binding replacement.
- value: Type = 0 explicitly selects the same zero initialization for every type.
- value: Type = { ... } selects record construction with declared defaults for omitted fields.

Zero initialization bypasses declared defaults at every depth. It creates a readable value immediately, not reserved/uninitialized storage awaiting a first assignment. No var/mut permission follows from initialization mode. Omitted initialization is selected for simple typed declarations, not source-free inferred declarations. Function argument omission requires public omission permission. Ordinary user implementations need an applicable declared default; the selected zero implementation needs no actual default definition or execution, as described below. Required inputs remain required; a type merely supporting zero does not grant omission to an ordinary user implementation. See [omitted value arguments](functions.md#omitted-value-arguments).

A typed declaration creates a slot sized and laid out for its type and initializes it to all-zero, regardless of type. Where and how storage is allocated remains to be discussed. A zero-initialized union is initialized even though it has no known active member; explicit `= ?` instead requests uninitialized storage.

## Universal type rule

User clarification, 2026-11-17: zero initialization describes the storage: every byte in the slot, including any padding, is zero. The bytes themselves carry no inherent type-specific meaning; interpreting them as a value depends on the slot's type and its representation. For example, a String representation whose length is zero can interpret zero-filled storage as an empty String; its complete layout remains to be specified. A union's zero Kind identifies no known active member. Zero initialization does not invoke a type-specific constructor to choose these outcomes. A zero-sized type has no bytes to clear. The semantic requirement is compatible with the separately specified optimization of unobservable writes; storage placement remains open.

Every type must have a meaningful zero value represented by all-zero storage. A compiler must not reject zero construction because a type lacks a valid zero. Designing a type includes defining this mapping; raw foreign representations cannot silently invalidate the language rule.

Zero is neither a universal null expression nor automatically absence for every type. A zero function must be callable with defined behavior. A zero reference/access value, resource wrapper, enum, union, or constrained domain must have defined language meaning too. Their operations may have ordinary specified outcomes/faults, but zero state alone cannot be dismissed as an invalid value or unchecked memory access.

There is no generic zeroability constraint excluding some types. Full type layouts, ownership/disposal, and mappings for the categories below remain open; the universal requirement is selected independently of those details.

## Mapping dependency and conformance

Universal zero is a design requirement, not yet a completed mapping for every type category. Unit, Result, callable, record, tuple, and fixed-array mappings have selected rules. Enum case selection, reference/access values, resource wrappers, and constrained domains remain open. Multi-member plain-union zero has no known active member.

Until a category's mapping is defined, any loop `.value` initialization, conditional missing-`else` fallback, omitted typed initializer, or recursive aggregate zero that depends on zero of that category is conditional and not implementation-ready. Do not reject the type, invent a different default, or treat zero as an invalid state; complete the mapping before claiming conformance. The dependent contracts remain selected as requirements, not as evidence that every mapping is finished.

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

Since `Unit` has one value, the selected universal zero rule makes `zero(Unit) = Unit`. The user selected a zero-sized physical representation on 2026-10-22, with no payload bytes to write for that semantic value. Unit remains a valid value, not an absent or invalid state. Calling convention and foreign ABI lowering for a zero-sized value remain representation details to define separately.

Option's zero is its explicit .None state. A loop value of type T starts as zero(T), without automatically wrapping T in Option. Typed values remain statically typed even though every type has zero.

Some mappings require further decisions:

- Enums: choose a zero case/mapping consistent with exhaustive matching, backing values and nominal identity. Union matching and operations on the no-known-member zero state remain under review.
- References and writable access: provide meaningful zero behavior without dereferencing an invalid machine address or silently choosing an aliasing/ownership model.
- Resources and constrained domains: specify the valid zero state, its allowed operations, cleanup, and relation to construction/validation invariants. Zero initialization does not conjure an external resource.

These are representation/semantic design tasks, not exceptions permitting types with no zero. A zero value is not necessarily an identity for every operator: for example, zero initialization alone does not make a product fold start at 1.

The [plain-union zero review](union-zero.md) records the clarified metadata-plus-overlapping-payload model. Zero initialization clears both metadata and payload; total wrapper storage includes metadata and alignment beyond max-member payload capacity. Zero metadata identifies no known member; the zero-initialized union itself is a valid initialized value.

## Zero-initialized functions

A zero-initialized function is callable. Its invocation performs no user-body work and returns `zero(R)`, where `R` is its declared result type. An `Int` result is `0`, a `String` result is empty, and a `Unit` result is `Unit`. If the declared result is `T ! E`, it returns `.ok(zero(T))` under the selected Result zero rule.

Selected 2026-10-25: the zero implementation runs no default expressions and needs no actual default definition for an ordinary input the public contract permits omitting. Its no-body result is zero(R). Omitted TP inputs can be reasoned about as zero(TP), without materializing them or executing a synthetic default. The internal representation, including a possible special non-public unvalued state analogous to undefined, remains deferred; no public undefined value/type or argument hole is introduced. See [zero-callable omission](callable-default-contracts.md#zero-callable-omission-selected). This supersedes the earlier requirement to run applicable default expressions before zero invocation.

Normal caller-side evaluation still applies: evaluate the callee, then each reached supplied argument expression from left to right, then invoke the zero callable. Ignoring the evaluated argument values does not skip their evaluation or effects. An exit during argument evaluation follows its ordinary rules and can prevent invocation. Required argument ownership and cleanup behavior still applies; ignoring a value does not exempt it from that contract.

A zero callable still rejects missing required public inputs. Only ordinary omission-capable inputs have the selected zero-implementation handling; no permission-bearing default or caller grant is fabricated.

The zero callable performs no updates through `mut` or `var` parameter grants. This does not make the entire call expression free of effects: argument evaluation and required cleanup can have observable behavior. Complete ownership/cleanup timing, callable type grammar, representation, and ABI remain open. See [function calls](functions.md#zero-initialized-callables) and [evaluation order](evaluation-order.md#function-calls).

## Defaults versus partial zero initialization

```text
profile: Profile = {
    stats = 0,
}
```

Name uses its declared default Guest; stats explicitly zeroes its fields and bypasses level's default 1. Stats = {} would apply its defaults. Default construction and universal zero remain distinct operations.

## Separate explicit uninitialized storage

Value: Type = ? requests storage without zeroing or default construction. It is a distinct state containing unspecified bytes, not the type's initialized zero value, and still needs the separate definite-initialization rules before value use. The igniter now enforces those rules for whole-value scalar/tuple/fixed-array locals; partial construction and ownership remain open. The old reserve() operation remains unselected. See [reserved storage](reserved-storage.md) and [first initialization](first-initialization.md).

## Result and error boundaries

The selected zero value of a fallible outcome is success with a zero-initialized payload:

```text
zero(T ! E) = .ok(zero(T))

attempt: Int ! ReadError; /* .ok(0) */
explicit_zero: Int ! ReadError = 0; /* .ok(0) */
```

An ordinary success expression `0` in an `Int ! E` function likewise remains implicit success with numeric zero. A stored zero outcome has no error payload to handle. Recursive zero initialization preserves outcome boundaries: the zero of `(T ! E1) ! E2` is `.ok(.ok(zero(T)))`.

This mapping also applies where a declaration default or a loop's value context uses zero of a fallible type. A no-`else` conditional is noncontributing; its declaration default supplies the zero on no match. Representation, tag layout, and FFI adaptation must honor this semantic mapping and remain to be specified.

## Grammar and runtime boundaries

- Zeroing initializes the type's own storage. It does not follow and clear objects referenced from fields or imply deep allocation.
- Zero-filled references/functions must have language-defined mappings; the implementation must not import undefined behavior from a raw ABI accidentally.
- No constructor/default initialization followed by clearing is required.
- The optimizer may omit unobservable zero stores or storage entirely, preserving all defined reads, aliases, cleanup, and exits before replacement. See [initialization and physical writes](memory-and-performance.md#semantic-initialization-versus-physical-writes).
- Empty executable bodies return Unit; established record-initializer positions give {} default-construction meaning.
- Representation, FFI adaptation, layout, generic inference, ownership, and exact special-type zero behavior remain unimplemented design work.

Related: [record initialization](record-initialization.md), [declarations](declarations-and-assignment.md), [loop value](loop-value.md), [types](types-and-inference.md), [Result](result-and-errors.md), and [memory/performance](memory-and-performance.md).
