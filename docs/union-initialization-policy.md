# Union construction and omitted initialization

Status: **revised 2026-11-17:** a bare typed declaration initializes all-zero storage for every type. A zero-initialized multi-member union has Kind 0 and no known member (`UNKNOWN`). Numeric literal `0` is not a general request to zero arbitrary storage; in `Int | String` it is intended to supply the active Int member. An explicit zero-value expression is under design; `mem.zeros` examples are illustrative only. Ambiguous inference must produce an error. This is a design direction, not a compiler support claim.

## Selected rejection and explicit member choice

The heading is retained for existing links; the rejection is superseded.

The previous rule making `= 0` an all-zero request for every type is superseded. A numeric `0` intended for a union supplies a numeric member when inference uniquely resolves one; it does not zero the union wrapper. An already typed compatible member expression likewise supplies that member. `= ?` requests separate uninitialized storage. The proposed member-qualified `A{0}` spelling remains unselected.

## Bare local declarations

The general rule applies independently of whether `X` is a union, array, String, or another type: `x: X;` creates a slot of `X`'s size and layout, initialized to its all-zero value. Storage placement and physical implementation remain future design matters. For a multi-member union, all-zero storage has Kind 0 and no known active member (`UNKNOWN`). It is an initialized value of the union type, not an uninitialized slot and not a newly declared member type. In the discussed type-reference model, reference 0 cannot identify a type; no separate type entry is reserved for it.

Specification cases (not executed compiler tests):

- **union-bare-zero:** `x: (Int64 | String);` creates the zero-initialized union, Kind 0, with no known active member.
- **array-bare-zero:** `items: [Int64; 2];` creates an array slot with two zero-initialized Int64 elements.
- **string-bare-zero:** `name: String;` creates a zero-initialized String slot; its selected zero value is empty.
- **union-explicit-reservation:** `x: (Int64 | String) = ?;` requests uninitialized storage under the separate reservation rules.
- **union-literal-zero:** `x: (Int64 | String) = 0;` is intended to supply the Int64 member containing zero, not the all-zero union state.
- **union-ambiguous-numeric:** `x: (Int64 | Int32) = 0;` is an inference error when both distinct members remain viable; do not silently choose one.
- **explicit-union-zero:** illustrative `x: (Int64 | String) = mem.zeros();` and `x := mem.zeros<Int64 | String>();` request the all-zero union value; syntax and inference of this operation are undecided.
- **scalar-literal-zero:** `n: Int64 = 0;` creates an all-zero Int64 slot, interpreted as numeric zero.
- **typed-member-zero:** `n: Int64 = 0; x: (Int64 | String) = n;` supplies the existing Int64 member value, rather than requesting an all-zero union slot.

How matching, type tests and access handle this state, and how unrecognized nonzero Kinds are handled, remain under review. An earlier proposal for a guard is recorded in the [match investigation](../research/investigations/language-review/union-match-unknown-guard.md); it is not selected by this declaration decision.

## Historical declaration alternatives

The following discussion records older alternatives. Assertions based on the former member-only zero and rejection of bare declarations are superseded by the rule above. Other source policies, including conditional fallback, require separate review.

## Receiving an existing value

For the member-only model, an ordinary parameter receives an already initialized A | B value. It preserves the supplied active member and payload; it does not choose the leftmost member of its own annotation. Selected on **2026-10-25**: with valid value/payload copy contracts, ordinary union inputs and fixed temporaries preserve that active value independently of later source replacement. In the explicit Int/String example, tmp keeps Int 42 after value becomes String "ready". Copying constructs no inactive member and selects no zero/default state, implicit unwrap, or new result-narrowing rule. Copyability eligibility and reference/resource safety remain deferred; see [copyable union and enum values](parameter-values-and-slots.md#copyable-union-and-enum-values-selected).

```text
consume := fn(value: A | B): Unit {
    if value: A { use_a(value) }
    else if value: B { use_b(value) }
    else { /* unreachable for this initialized member-only value */ }
}
```

Assume the input is a stable closed union with distinct A/B alternatives and no extra empty state. The final path is logically unreachable; exact diagnostic/flow analysis remains separate. The example is not a claim that this code has been implemented or executed. If the empty-zero alternative is adopted, A/B-only coverage instead needs a nonempty proof.

Uninitialized storage cannot be passed to this ordinary parameter. Omitted arguments have a selected rule for all parameter types: require an applicable explicitly declared default, or reject the call. Such a default must supply a valid initialized value. See [argument omission](union-parameter-defaults.md); no automatic zero or uninitialized input is supplied. Explicit output-only construction would require its own contract.

## Leftmost member as a construction rule

Historical alternative: the user considered selecting the leftmost member when initializing a new union. The following bare-zero forms are now rejected by the selected rule above; they are not current accepted examples:

```text
x: (A | B) = 0 /* proposed construction: A with zero payload */
y: (B | A) = 0 /* proposed construction: B with zero payload */
```

Correction to the earlier broad claim: different construction expressions may produce different values of the same type. A spelling-directed default construction policy therefore need not make A | B and B | A different types. Admission and parameter passing can preserve the resulting member.

However, this is distinct from one type-defined all-zero byte representation. In a shared representation for the same normalized type, the compiler may need to write a nonzero member tag after clearing the payload. Identical complete all-zero bytes cannot denote A at one site and B at another without a further representation/context distinction. Choosing the leftmost member of a canonical normalized order reduces to canonical selection instead of source order.

Thus a source-directed construction policy is viable if its relationship to physical zero, literal 0, and defaults is revised explicitly. It needs a rule for transparent aliases, inferred unions with no written member list, nested unions, zero-result callables, and missing conditional/loop results. Passing an existing value avoids fresh selection at that call; it does not resolve those creation sites. The current universal all-zero contract is not silently relaxed by this review.

## Explicit declaration choice

The explicit initializer-or-reservation rule is selected above. For example:

```text
x: (A | B) = make_a() /* initialized member A */
y: (A | B) = ?        /* storage; not yet a readable union */
y = make_b()          /* first complete initialization */
```

The existing first-initialization direction already supports = ? and a first whole-value assignment using =. Later replacement requires var. A zero/default request can be another explicit initializer only after its union member-selection rule is defined; writing 0 or a default marker does not by itself solve that question. In particular, record-shaped {} is not automatically a selected union-default constructor.

This is the selected exception to the earlier general rule that bare typed declarations immediately produce zero values. Its scope is local values with normalized multi-member plain-union types; other declaration contexts require their own contracts.

## Default-uninitialized union locals

Historical alternative, not chosen: an omitted initializer for a union local would mean reserved storage. The bare declaration below is now rejected:

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

Neither explicit reservation nor default-uninitialized locals supplies a valid zero(A | B). The newly rejected undirected union-zero initializer means the earlier universal-zero construction policy needs reconciliation for recursively zeroed aggregate fields, loop state, and zero callable results. Omitted arguments without declared defaults are now rejected for all parameter types rather than creating a union zero. Conditional results are separately reconciled by [requiring explicit union fallback](conditional-union-fallback.md) and constructing exhaustive chains from the chosen member. Each must either receive a member-selection mapping or be explicitly revised. Making those hidden uninitialized reads would contradict the proposed definite-initialization boundary.

The three readable-value designs remain separate: a listed zero member, source-directed construction of a listed member, or a deliberately valid empty union state. Uninitialized storage is not a fourth readable value. Undirected union literal-zero initialization and omitted initializers on multi-member union locals are rejected. Constructor grammar, implicit zero-result sites, and complete representation rules remain under review.

## Reference comparison

Checked 2026-10-21. [Rust E0381](https://doc.rust-lang.org/error_codes/E0381.html) rejects using/capturing a possibly uninitialized variable, providing a relevant definite-initialization precedent. [Zig assignment and undefined](https://ziglang.org/documentation/master/#Assignment) requires an initializer and offers undefined for unspecified values; its documented contract is not the same as a promise of LiteScript's proposed static proof before every use. [C++ variant construction](https://eel.is/c++draft/variant.ctor) selects the first alternative for default construction when supported, but ordered variant alternatives and default construction do not establish a unique all-zero mapping for LiteScript's order-independent unions.
