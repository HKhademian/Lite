# Contextual zero initialization

Status: **proposal dated 2026-10-18; explicit `value: Type = 0` for valid semantic zero initialization, distinct from declared-default record construction**. This is not a selected universal conversion or an implementation. Empty contextual record construction and executable empty-body Unit results are already selected separately.

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

Using the proposed nested type shorthand, zeroed has empty name, points 0, and level 0. configured has name "Guest", points 0, and level 1. The record type is stated once in each binding; no redundant construction head is needed.

Recommend the explicit pair:

- `value: Type = 0`: recursively zero-initialize, bypassing declared field defaults.
- `value: Type = { ... }`: record-initialize, applying declared defaults to omitted fields; an empty list applies all available defaults.

The earlier `value: Type;` form remains an unresolved alternative. The explicit zero literal removes the need to adopt initializer omission just to make zero initialization accessible. Do not silently switch omitted declarations between modes.

## Meaning of 0

The literal is interpreted using an established expected type. This proposes a context-sensitive literal rule, not an implicit conversion from an arbitrary integer:

```text
number := 0;             /* ordinary inferred Int */
zeroed: Profile = 0;      /* contextual Profile zero */
source := 0;
bad: Profile = source;    /* rejected: Int is not Profile */
```

Likewise, a computed integer expression that happens to equal zero does not acquire record-construction meaning. This proposal introduces no general numeric truthiness, string conversion, pointer conversion, arithmetic operation on records, or universal comparison operation. Existing conversions and operations remain separately checked.

Start with the exact literal spelling 0, not an arbitrary constant-expression evaluator. Whether this contextual capability extends uniformly to call arguments, return expressions, match-value operands, and generic expressions still needs a complete literal/inference contract. The initializer examples above are the proposed concrete starting point.

## Semantic zero values

Recommend admitting this only for types with a defined valid zero:

- Int and Float: numeric zero.
- Bool: false.
- String: empty text.
- Unit: Unit.
- Option: its .None case.
- Standard collections: empty, subject to the collection/allocator contract.
- Fixed-size arrays and tuples: the same shape with each component zero-initialized.
- Records: recursively zero-initialize every field, ignoring all declared defaults, including nested defaults.

Examples such as flag: Bool = 0 and text: String = 0 illustrate the extra nonnumeric literal rule being proposed. They are not currently ordinary integer assignments, and a programmer may still use the clearer false or empty-string spelling. Broadening 0 in this way trades a compact uniform initialization form for more context-dependent reading.

Neither the integer value zero nor a zero-filled memory representation is automatically valid for every type. A required function, nonoptional reference, resource handle, validated nonzero domain value, or arbitrary union has no fabricated zero. Reject construction if its contract supplies none. An enum must not invent an unnamed backing-zero value or choose its first case; enum zero eligibility needs its own explicit contract. A record with a non-zero-initializable field is also not zero-initializable, even if that field has a valid declared default.

This preserves the absence model: an ordinary required value never becomes null. An Option's zero is the explicit absent case admitted by that particular type.

## Defaults versus partial zero initialization

An explicit field zero initializer can override that field's defaults inside otherwise default-based record construction:

```text
profile: Profile = {
    stats = 0,
};
```

The proposed result has name "Guest", points 0, and level 0. Profile's omitted name uses its declared default, while stats explicitly requests recursive zero initialization. Supplying a nested initializer stats = {} would instead apply the stats type's declared level default of 1.

## Result and error boundaries

The selected implicit-success rule still applies to a success expression in a Result context. For example, an integer success expression 0 in an Int ! E contract denotes success with integer zero. Do not reinterpret it as raw zero-filled Result storage, invent an error, or choose a discriminator from a bit pattern. Explicit errors remain .err(...) and stored outcomes keep their .ok/.err distinction.

The full expected-type rule must specify how contextual zero interacts with this existing success construction. Zero eligibility for arbitrary Result payloads or unions is not automatically established by the proposed literal.

## Grammar and runtime boundaries

- Zero initialization is a value operation; a binding still obeys independent var/mut permissions.
- No source-level raw memory clearing, implicit allocation, or guaranteed representation is selected.
- The compiler may directly construct the final representation, with no mandated default construction followed by clearing.
- It must prove a legal zero contract statically; lack of such a contract is a compile error, not a panic or recoverable runtime failure.
- Unknown generic types need an eventual zeroability constraint. Capability names and declaration syntax are open.
- If the expected type is missing or admits several incompatible zero alternatives, the compiler must not guess a record/union case.
- Empty executable bodies still produce Unit. Only established record initializer positions give {} record-default construction meaning.

Related: [record creation](record-initialization.md), [records](records.md), [types and inference](types-and-inference.md), [Result](result-and-errors.md), and [memory/performance](memory-and-performance.md).
