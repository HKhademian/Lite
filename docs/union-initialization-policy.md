# Union construction and omitted initialization

Status: **undirected multi-member union literal-zero initialization rejected, selected 2026-10-21; local multi-member union declarations require an initializer or = ?, selected 2026-10-21; member-qualified zero-constructor grammar remains under review**. The user requires a visible member choice rather than an implicit leftmost/canonical selection for x: A | B = 0. Existing explicit reservation and ordinary expression admission remain available. Earlier alternatives are retained below as review history.

## Selected rejection and explicit member choice

```text
x: (A | B) = 0 /* rejected: bare zero does not identify a member */
```

Apply this to a destination that remains a plain union of multiple distinct member identities after normalization, including through transparent aliases. Do not silently choose the leftmost/canonical member or insert a readable empty state. This is a source-construction rule, not permission to expose invalid or uninitialized values. A | A normalizes to A, so this particular multi-member ambiguity does not arise there; any other initialization constraints still apply.

The user proposes the following declaration forms:

```text
x: (A | B) = ?
x: (A | B) = expr
x: (A | B) = A{0}
x: (A | B) = B{0}
x: (A | B) = A{}
x: (A | B) = B{}
```

Their intended roles are distinct:

- = ? reserves storage without a readable value; every path reaching a read must first initialize it. This reuses selected reservation and first-initialization rules.
- = expr supplies an initialized value whose type is admitted by the union, including an existing compatible union value whose active identity is preserved.
- A{0} and B{0} explicitly name the desired member and propose zero construction of that member, bypassing its declared defaults. This compact sole-zero constructor marker is new grammar under review, not already supported named-field record syntax or positional field initialization.
- A{} and B{} explicitly name the member and, for record types with valid default construction, apply that member's declared-default policy. The name chooses the member before union admission. These forms do not imply that every possible non-record type admits brace construction.

Every chosen member must itself be validly constructed; the destination union does not bypass visibility, nested-field initialization, ownership, or permission rules. Constructing zero of a chosen member does not require all union metadata bytes to be zero: the wrapper records the selected identity. No additional tag width, layout, ABI, or public constructor API is selected.

A bare literal 0 in a multi-member union initializer is rejected even if Int is a member; it must not silently choose between contextual union zero and an Int payload. An already typed Int zero remains an ordinary admissible value:

```text
number := 0
x: (Int | B) = number /* admits the existing Int value */
```

A local x: A | B without an initializer is rejected. Require an initialized compatible expression or explicit = ?; omission is neither implicit zero nor implicit reservation for a normalized multi-member union. Likewise, the source ban qualifies earlier universal source-level zero construction; recursively zeroed union fields and other implicit zero-result sites need explicit reconciliation, not hidden member selection. This page does not automatically choose a new policy for those sites.

## Bare local declarations

Selected rule: reject a local declaration without an initializer when its normalized type has several distinct plain-union members:

```text
x: (A | B)
```

Do not infer a zero member or reserve implicitly. The selected bare-zero rejection also rules out using implicit = 0 to conceal a member choice.

### Require an initializer or explicit reservation (selected)

Reject the bare declaration. The author writes an initialized compatible expression or the existing = ? marker:

```text
x: (A | B) = ?
if choose_a {
    x = make_a()
} else {
    x = make_b()
}
use(x)
```

This records deferred initialization visibly. The existing path-sensitive first-write rule permits exactly one initialization per reaching path without var; later replacement needs var. A path reaching use(x) without initializing x is rejected. The tradeoff is the required = ? marker when the author wants to supply the value later.

### Reserve by default (not chosen)

The alternative was to accept the bare declaration as an implicit = ? for union locals. It has the same no-read-before-initialization rules, not a readable empty state:

```text
x: (A | B)
if x: A { use_a(x) } /* rejected: uninitialized read */
x = make_a()
use(x)               /* permitted after initialization */
```

This avoids the marker. Omitted initialization would then mean zero for ordinary eligible non-union locals but reserved storage for multi-member union locals. A reader must know the resolved type, including aliases, to know which applies. This is statically checkable; it does not imply a runtime initialization flag or permit reading unspecified bytes.

### Shared boundaries

The user selected the explicit initializer-or-reservation rule. The deferred state is visible through = ?. Ordinary value-passing and member-only exhaustive matching after initialization remain intact. This does not select A{0} grammar, give a default to a union, or settle implicit union-zero result sites.

Apply the selected rule after transparent-alias resolution and normalization; a spelling alias cannot bypass it. A | A normalizes to A and follows that type's declaration policy. Var controls subsequent replacement, not whether a value has been initialized. This review is about local value declarations, not incoming parameter headers, record-field declarations, globals, or an output-construction API; those contexts need their own policies.

Reference comparison checked 2026-10-21: [Rust permits declaration before initialization](https://doc.rust-lang.org/rust-by-example/variable_bindings/declare.html) and rejects use before a value is installed. [Zig requires an initializer](https://ziglang.org/documentation/master/#Assignment) and offers undefined for unspecified storage; that facility is not the same guarantee as LiteScript's selected definite-initialization checks. These provide contrasting declaration styles without selecting a LiteScript policy.

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
