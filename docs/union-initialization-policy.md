# Union construction and omitted initialization

Status: **alternatives proposed by the user, open review 2026-10-21**. The user compares leftmost-member initialization, explicit initialization/reservation, and making uninitialized storage the default for union declarations. None is adopted yet. Separate these questions from the earlier empty-but-readable union proposal and the selected universal all-zero value requirement.

## Receiving an existing value

For the member-only model, an ordinary parameter receives an already initialized A | B value. It preserves the supplied active member and payload; it does not choose the leftmost member of its own annotation.

```text
consume := fn(value: A | B): Unit {
    if value: A { use_a(value) }
    else if value: B { use_b(value) }
    else { /* unreachable for this initialized member-only value */ }
}
```

Assume the input is a stable closed union with distinct A/B alternatives and no extra empty state. The final path is logically unreachable; exact diagnostic/flow analysis remains separate. The example is not a claim that this code has been implemented or executed. If the empty-zero alternative is adopted, A/B-only coverage instead needs a nonempty proof.

Uninitialized storage cannot be passed to this ordinary parameter. Omitted arguments are a separate creation case: the selected parameter-default/zero rule still needs to create a valid value, and cannot silently supply uninitialized storage. Explicit output-only construction would require its own contract.

## Leftmost member as a construction rule

The user suggests selecting the leftmost member when initializing a new union. For illustration:

```text
x: (A | B) = 0 /* proposed construction: A with zero payload */
y: (B | A) = 0 /* proposed construction: B with zero payload */
```

Correction to the earlier broad claim: different construction expressions may produce different values of the same type. A spelling-directed default construction policy therefore need not make A | B and B | A different types. Admission and parameter passing can preserve the resulting member.

However, this is distinct from one type-defined all-zero byte representation. In a shared representation for the same normalized type, the compiler may need to write a nonzero member tag after clearing the payload. Identical complete all-zero bytes cannot denote A at one site and B at another without a further representation/context distinction. Choosing the leftmost member of a canonical normalized order reduces to canonical selection instead of source order.

Thus a source-directed construction policy is viable if its relationship to physical zero, literal 0, and defaults is revised explicitly. It needs a rule for transparent aliases, inferred unions with no written member list, nested unions, zero-result callables, and missing conditional/loop results. Passing an existing value avoids fresh selection at that call; it does not resolve those creation sites. The current universal all-zero contract is not silently relaxed by this review.

## Requiring an explicit declaration choice

Another proposal is to reject an omitted initializer for union locals and require a valid initializer or explicit reservation:

```text
x: (A | B) = make_a() /* initialized member A */
y: (A | B) = ?        /* storage; not yet a readable union */
y = make_b()          /* first complete initialization */
```

The existing first-initialization direction already supports = ? and a first whole-value assignment using =. Later replacement requires var. A zero/default request can be another explicit initializer only after its union member-selection rule is defined; writing 0 or a default marker does not by itself solve that question. In particular, record-shaped {} is not automatically a selected union-default constructor.

This makes the choice visible but changes the selected rule that bare typed declarations immediately produce zero values. The scope of any union exception must be stated, rather than inferred from generic source syntax.

## Default-uninitialized union locals

The user's latest suggestion is that an omitted initializer for a union local means reserved storage:

```text
var x: (A | B)       /* proposed: uninitialized */
if x: A { use_a(x) } /* rejected: the test reads uninitialized storage */

x = make_a()        /* establishes an initialized A | B value */
if x: A { use_a(x) } /* permitted */
```

This is coherent with definite-initialization checking. Before first initialization, reject type tests, matching, field access, ordinary passing/returning, copying, and any other value read. There is no valid empty value whose tests return false: the tests are disallowed. After successful initialization, exactly one listed member is active in the member-only model, so exhaustive A/B coverage is preserved.

A compiler must establish initialization on every path reaching a read. A one-branch assignment without an else cannot prove initialization on the unmatched path. This can use the already selected whole-value first-initialization machinery; it does not imply mandatory runtime flags, a hidden nil state, or initialization by a type test. Required cleanup must distinguish uninitialized storage from a live member.

Relative to requiring = ?, this removes a marker but makes omitted initialization type-dependent. Transparent aliases must not bypass the policy. Whether this applies only to local bindings or also to record fields, globals, parameter defaults, generic T, and nested union fields is open. If a type normalizes from A | A to A, spelling alone cannot silently change its initialization behavior without another source-policy rule. Mutation/replacement permission remains independent of first initialization.

## What declaration policy does not settle

Neither explicit reservation nor default-uninitialized locals supplies a valid zero(A | B). The current universal zero requirement still covers explicit union zero construction, recursively zeroed aggregate fields, omitted argument defaults without a declared value, missing-else results, loop state, and zero callable results. Each must either receive a member-selection mapping or be explicitly revised. Making those hidden uninitialized reads would contradict the proposed definite-initialization boundary.

The three readable-value designs remain separate: a listed zero member, source-directed construction of a listed member, or a deliberately valid empty union state. Uninitialized storage is not a fourth readable value. The latest proposals are under review and do not yet replace the selected bare-declaration zero rule or universal all-zero rule.

## Reference comparison

Checked 2026-10-21. [Rust E0381](https://doc.rust-lang.org/error_codes/E0381.html) rejects using/capturing a possibly uninitialized variable, providing a relevant definite-initialization precedent. [Zig assignment and undefined](https://ziglang.org/documentation/master/#Assignment) requires an initializer and offers undefined for unspecified values; its documented contract is not the same as a promise of LiteScript's proposed static proof before every use. [C++ variant construction](https://eel.is/c++draft/variant.ctor) selects the first alternative for default construction when supported, but ordered variant alternatives and default construction do not establish a unique all-zero mapping for LiteScript's order-independent unions.
