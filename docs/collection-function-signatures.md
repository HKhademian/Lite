# Collection contracts in function inputs and outputs

Status: **inferred local indexed-input direction and explicit public contract direction selected 2026-11-14; other signature and return models remain proposals**. The [indexed-sequence decision](lite://doc/indexed-sequence-contract) selects [T] for indexed traversal. Full generic grammar, opaque return behavior, first-class function representation, and ownership remain open.

## Local inferred indexing and explicit public contracts

Selected 2026-11-14: a local function with an omitted input type can infer a
reusable indexed-input requirement from an indexed read in its body. Its
result preserves the supplied provider's element type. Different calls can
therefore use different compatible element and provider types; the first call
does not fix the definition to its own type. An out-of-bounds read retains the
ordinary indexing fault behavior. This is a selected design direction, **not
yet implemented** by the generated compiler.

```text
first := fn (items) { items[0] }
numbers := [4, 5];
words: List<String> = ["hello", "world"];
first(numbers); /* Int 4 */
first(words);   /* String "hello" */
```

The inferred read requirement is not automatically the complete `[T]` bundle:
that written contract also promises count and ordered traversal. A static
provider retains its own representation; inference does not require a boxed or
runtime-erased value. Indexing does not by itself grant mutable access or
replacement permission. The selected ordinary access and failure rules still
apply.

Provide an explicit, complete signature for stable public APIs: it exposes the
requirements and type relationships that callers can rely on, and checks the
implementation against that boundary. Adding an undeclared operation cannot
silently strengthen an explicitly complete signature. This does not decide
that every public function must have such a signature, or select generic
parameter, constraint, export, or explicit-signature syntax.

### Pending contract cases

These cases describe intended behavior; they are not executable passes:

- **different-providers:** the array and list calls above return `4` and
  `"hello"` with their respective `Int` and `String` result types, regardless
  of call order.
- **same-element-different-provider:** an `Int` array and an `Int` list both
  satisfy the indexed read without requiring the same storage layout.
- **empty-input:** calling `first` with an empty compatible provider reaches
  the existing bounds panic; an untaken call does not panic.
- **missing-indexing:** a traversal-only input that cannot supply positional
  reads is rejected without enumeration or materialization.
- **result-type:** use of the returned `String` as `Int` is rejected, even if
  an earlier call supplied an `Int` array.
- **complete-public-boundary:** an explicit traversal-only input contract
  rejects a body that also indexes it; an explicitly indexed contract admits
  the indexed read under its existing access and bounds rules.
- **permissions:** an inferred readable input does not authorize an indexed
  write, and any future writable form must honor the caller's explicit grant.

General inference and constraint solving, unresolved or contradictory input
requirements, recursive and escaping functions, separate compilation, exact
diagnostics, and a way to spell generic relationships remain open. The pending
cases must be made independently observable and tested together with existing
calls, control flow, permissions, and failure behavior before implementation is
considered complete.

## One contract, two directions

A collection input contract states the operations the function requires from its caller. A collection output contract states the operations the function guarantees to its caller. The definition of an operation does not change between these positions.

Traversal-only signatures below use temporary Iterable<User> notation. The accepted [User] shorthand would additionally require exact count and positional indexing:

```text
visit := fn (users: Iterable<User>) {
    loop users as user {
        greet(user);
    }
}

make_users := fn (): Iterable<User> {
    [User { name = "Ali", }, User { name = "Mina", }]
}
```

Assume User exposes the illustrated field and greet accepts User with read access. The input may be supplied by compatible arrays, lists, sets, slices, or user providers under their access/lifetime contracts. The output guarantees traversal; the fixed-array implementation inferred from the known-size literal does not automatically become part of the public contract.

This is the proposed semantic interpretation, not finalized source syntax. A known-size fresh literal now supplies a fixed-array provider when the abstract expected contract does not choose a concrete collection family. An explicit expected concrete List can request growable construction. The rule does not manufacture an arbitrary caller-selected provider; see [fixed-array inference](lite://doc/tuple-array-shapes#known-size-fresh-literals-infer-fixed-arrays).

## Inferred versus explicitly complete inputs

For a simple inferred definition (the general form remains a proposal):

```text
third := fn (users): User! {
    users[2]!
}
```

The body supplies the lookup requirement and the result annotation constrains its successful value to User. Its declared general Error contract must cover the lookup failure. No named Indexable annotation is needed for authoring this example.

The inferred input still has a real generic contract visible to callers and tools. Adding indexing to a previously traversal-only inferred definition changes that contract; this can break existing callers. Inference hides boilerplate, not changes in API requirements.

An explicitly complete input contract must remain the boundary for body checking. If Iterable<User> guarantees traversal only, users[2] cannot be added while retaining that signature. The author must declare an indexing contract, such as the accepted [User] direction when its full guarantees are intended, or choose an intentionally inferred definition. Do not silently strengthen a published complete signature from its implementation.

An alternative is to make some annotations partial and infer additional constraints. If adopted, that category needs a defined boundary rather than having the same complete annotation unpredictably acquire requirements. The current recommendation is omitted inputs for inference and deliberately complete explicit contracts for stable APIs. The exact public-signature requirement remains open.

The later [ergonomics review](lite://doc/collection-signature-ergonomics) investigated partial annotations in response to the user's concern about strong shorthand spreading into library APIs. The user's subsequent source-visibility objection favors keeping written contracts complete; compiler/tool visibility alone is insufficient. The subsequent [indexed-sequence decision](lite://doc/indexed-sequence-contract) accepts [T] for the complete indexed bundle, distinct from traversal-only Iterable<T>. Examples above now use the latter notation to preserve their intended weaker requirement.

## Preserve input/output relationships

```text
keep := fn (value) {
    value
}
```

The selected indexed-read case above retains the relation between provider element and result types. The broader proposed `keep` inference would preserve the supplied concrete value type, subject to legal ownership and access, without erasing it into a shared runtime interface. Returning a view must retain its source lifetime/access relationship.

Naming an input and output with the same broad traversal contract alone does not promise the same concrete provider, ownership, element storage, or length. Generic type parameters, associated element/result types, and lifetime/access relationships need explicit semantic support even if their routine spelling is inferred. Generic syntax for writing these relationships is still deferred.

## Three output models

### Inferred concrete output

A function with no explicit result abstraction can infer the concrete type of its returned value, including a fixed array from a known-size bracket literal. Callers can use that returned type's public operations; fixed arrays do not acquire growth merely because their length was inferred. The concrete provider remains part of the result contract. Generic/opaque result identities and complete inference remain separate proposals.

Changing an inferred result from List to Set can therefore change the API even if both are traversable. Ownership and fallibility cannot be silently altered through result inference; escaping recoverable errors still need their declared contract.

### Abstract output with a static implementation

Recommended candidate for an explicit behavior-only return: the function chooses one concrete implementation per generic specialization, exposes only its declared guarantees, and lets compilation retain the implementation/layout information needed for static dispatch.

Different functions may hide different provider types behind the same behavioral description. That does not automatically make their hidden types identical or interchangeable in one reassignable location. All reachable return paths in one specialization must fit the chosen concrete output representation. Lifetimes, ownership, and caller access remain checked; hiding a provider cannot make an expiring slice safe to return.

This model need not allocate an interface object or impose dynamic dispatch merely to hide the provider's name. It still needs an opaque-type identity and compilation/ABI policy; no performance measurement or final cross-module representation is claimed.

### Runtime-varying output

If different runtime branches return unrelated providers, use an explicit common representation: for example, a tagged union with the required contract implementation, or a deliberately runtime-erased interface value. These choices have different layout, ownership, dispatch, and ABI costs. Do not silently choose heap boxing just because the source result annotation names a contract.

Neither a concrete List API nor an abstract result contract can promise construction in every possible provider requested by a caller. Such construction needs a caller-supplied factory/output destination or a separate provider-construction contract.

## Type aliases and stored function values

The selected Alias := type TypeExpression form can give a complex contract a readable name once its expression grammar is designed. A transparent alias does not create a common object superclass, turn a generic requirement into a runtime value representation, or settle opaque identity.

A generic function that works for several provider types also differs from one runtime function value accepting an erased provider. Callback parameters, closures, exports, separate compilation, and heterogeneous stored collections need representation and generic-instantiation rules. These are part of the function-type review, not automatic consequences of bracket sugar.

## Reference and recommendation

Rust makes a useful distinction: impl Trait in a parameter describes an anonymous generic input requirement, while in a result it hides one concrete implementation and exposes its declared behavior. Return paths must agree on that concrete type. Its separate trait objects provide runtime abstraction. This illustrates the mechanisms without selecting Rust's syntax, borrow system, or ABI for LiteScript. Sources: [impl Trait](https://doc.rust-lang.org/reference/types/impl-trait.html) and [trait objects](https://doc.rust-lang.org/reference/types/trait-object.html).

Recommend designing function types around these semantic boundaries first: inferred requirements for scripts; complete explicit requirements for stable APIs; preserved generic relationships; static abstract returns where appropriate; and explicit runtime-erased values when needed. Then choose beginner shorthand and full generic notation together.

Related: [operation contracts](lite://doc/collection-operation-contracts), [inference](lite://doc/collection-inference), [functions](lite://doc/functions), [type aliases](lite://doc/type-aliases), [generic notation](lite://doc/generic-notation), and [performance](lite://doc/generic-collection-performance).
