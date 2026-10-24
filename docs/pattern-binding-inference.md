# Pattern binding inference

Status: **infer unannotated bindings from compatible input possibilities, preserving concrete types and unions; narrowing stable related bindings from known alternatives selected on 2026-10-23; complete inference, invalidation, and ownership algorithms open**.

## Purpose and template

An explicit annotation constrains the matched component. Other bindings are inferred from the part of the input type that can satisfy the whole pattern. A programmer need not annotate every component to keep static type checking.

```text
(x, (a, b: str, c), ...rest)
```

Here str stands for a known string type or alias. The typed component b must match it without conversion. The other names receive inferred static types, not automatically Any, a common supertype, or runtime-varying variable types. The nested component uses a pattern collector rather than also binding a whole-value name. This [collector choice](tuples-and-patterns.md#nested-tuple-patterns-and-rest-selected) is selected; complete recursive parsing and ownership remain separate. The binding-inference requirement also applies to typed destructuring.

## Inference rule

1. Start with the input's statically possible types and shapes at this match site. In a later match arm or initial alternative, use the remaining subject possibilities established by earlier failures; for closed distinct union members, an unguarded whole-type arm removes its handled member. Guarded/partial patterns do not automatically remove an entire type. See [remaining subject narrowing](type-tests-and-narrowing.md#remaining-subject-types-across-match-arms-selected).
2. Apply the complete structural and type constraints. Narrow compatible portions of each alternative and discard impossible portions; an alternative containing a union at b may be partly compatible rather than entirely accepted or rejected.
3. For each binding occurrence, obtain the type of the component or whole value it binds in every compatible possibility. Distinct occurrences of the same name remain distinct bindings.
4. For that occurrence, use the single projected type or the union of its projected alternatives, collapsing duplicates. Narrow composite values before projecting their component types; do not union different occurrences merely because their names are the same.

Every binding, including `_`, receives its own inferred local type. Ordered shadowing chooses which same-named binding is visible after a successful match; it does not merge their types or erase constraints on hidden components. An underscore-prefixed name may be left unused without a warning. See [pattern binding and shadowing](pattern-shadowing.md).

This is input narrowing and projection. A single matching arm can bind several union-typed names; its final expression follows the separately selected [branch-result inference](branch-result-inference.md): satisfy an expected result contract, or infer a normalized union across normally completing arms.

## Example: one constraint, several inferred bindings

Suppose input admits these three type shapes. This is explanatory type notation using the selected colon form for each unnamed component; complete recursive tuple grammar remains open:

```text
A = (:Int,    :(:Bool,  :String, :Int),  :Bool,   :Int)
B = (:Float,  :(:Int,   :String, :Int),  :String, :Bool)
C = (:String, :(:Float, :Int,    :Bool), :Bool,   :Float)
```

Match with str denoting String:

```text
(x, (a, b: str, c), ...rest)
```

A and B satisfy the type constraint; C cannot, because its b component is Int. Inside the successful branch:

```text
x    : Int | Float
a    : Bool | Int
b    : String
c    : Int
rest : (:Bool, :Int) | (:String, :Bool)
```

c remains Int because every compatible possibility supplies Int. C contributes nothing to the types of x, a, c, or rest. Matching does not convert C's Int component into text.

For a single statically possible input shape, every binding instead receives the corresponding concrete component type. If one source alternative has b of type `String | Int`, its matching portion retains only String for b; its other components narrow further only where the input contract establishes a relationship.

## Alternative arm binding types selected

An initial or supported nested pattern-alternative list may use one optional leading or, selected 2026-10-24. This punctuation does not participate in the alternative name/type join: or .Email(address) or .Sms(address) gives the same String | PhoneNumber binding as the compact form, with no extra Unit. If a real alternative lacks address, that alternative still contributes Unit normally. One shared arm body, optional shared guard, nested first-success behavior, and related-binding narrowing retain their existing contracts. See [leading pattern alternatives](leading-separators.md#pattern-alternatives-with-one-shared-body).

For initial match-arm alternatives, collect the union of final visible binding names and join each name's possible payload types as a normalized union, contributing Unit for alternatives where that name is absent:

```text
.Email(address) or .Sms(address) {
    deliver(address)
}
```

This is an arm fragment for cases Email(String) and Sms(PhoneNumber); deliver must accept String | PhoneNumber. The shared body has one address name whose type is String | PhoneNumber. At runtime the value is the payload from the selected case. If PhoneNumber is a distinct type with a numeric representation, retain PhoneNumber in the union. If it is a transparent alias for Number, resolve that alias and normalize to String | Number. The language's documented string spelling is String; the example does not add lowercase string or number types.

Compute each alternative's own final visible bindings using existing recursive ordered shadowing, then join the types of corresponding names across alternatives. This union is a join of mutually exclusive successful bindings; it does not merge successive same-named occurrences within a single alternative or change a binding's type during execution. Hidden bindings still retain their constraints and obligations. Different initial arm alternatives may introduce different names, including ordinary underscore bindings. For `.Email(email) or .Sms(phone)`, email has type String | Unit and phone has type PhoneNumber | Unit. The successful case supplies its payload and every absent shared name receives Unit. Shared names shadow outer bindings even on absent paths; outer values are not substituted. Identical-name `.Email(address) or .Sms(address)` retains String | PhoneNumber with no Unit contribution. Unit is an initialized value, not an unbound local or a new absence tag; a genuine Unit payload cannot be distinguished from absent-binding Unit through that binding alone. Complete condition/guard or alternatives now use the same union-of-names and payload-or-Unit rule, including Boolean-only alternatives; no missing binding is borrowed from incoming scope. See [differently named arm bindings](match.md#differently-named-arm-bindings-selected).

A composite payload preserves its complete alternative shapes under the existing union rules. No implicit conversion or common-supertype replacement is selected. Stable binding relationships established by known alternatives now support the narrowing rule below; arbitrary relationships not established by the input/pattern alternatives remain outside that rule. Access must be valid for all possible successful bindings; complete ownership/access joins remain separate. Source-once evaluation, first-success selection, and pre-pattern free-name lookup follow [alternative arm patterns](match.md#alternative-arm-patterns-selected).

## Nested alternative binding inference selected

Apply alternative name/type joins locally inside constructor payloads and tuple components, then continue the enclosing pattern's existing recursive binding/inference rules. `.Some(.Email(address) or .Sms(address))` on Option<Contact> with Email(String)/Sms(PhoneNumber) gives address: String | PhoneNumber. `.Some(.Email(email) or .Sms(phone))` instead gives email: String | Unit and phone: PhoneNumber | Unit. The constructor provides its existing payload; it does not wrap, coerce, or duplicate a scalar or create a whole-value binding alongside the nested collector.

A successful local choice produces candidate bindings for its place in the recursive written-order traversal; later same-named components can shadow them normally. No candidate name is available to a sibling pattern's comparison RHS or outside the enclosing pattern until the entire pattern succeeds. Infer against compatible enclosing input possibilities and preserve whole composite alternatives; Unit joins retain their known alternative combinations for stable related-binding narrowing, without inventing arbitrary relationships. An earlier successful local alternative is not retried if another component or shared guard fails. See [nested alternative patterns](match.md#nested-alternative-patterns-selected).

## Composite types retain their alternatives

rest is a union of complete remaining tuple shapes. Do not replace it with `(:(Bool | String), :(Int | Bool))`: that product admits combinations neither A nor B supplied. The same principle applies to other composite variable collectors, which bind their supplied value without also destructuring it in that pattern. Different remaining lengths must be retained as different shapes, rather than silently inserting missing values or converting the remainder into a homogeneous list.

Projecting individual bindings naturally gives each its own union type. Preserve their known compatible alternative combinations as well: a successful type test of one stable binding can remove impossible combinations and narrow related siblings under the selected rule below. This is limited to relationships established by the input/pattern alternatives; arbitrary cross-binding dependent typing and complete mutation/effect analysis remain open.

## Narrowing related stable bindings selected

Keep known combinations of bindings from pattern alternatives available for later type tests. Narrowing one stable binding removes incompatible combinations and reprojects the types of related bindings from the combinations that remain:

```text
match contact {
    .Email(email) or .Sms(phone) if email: String {
        send_email(email)
        /* email: String; phone: Unit */
    }
    _ {}
}
```

Assume Contact has exactly Email(String) and Sms(PhoneNumber), and send_email accepts String and returns Unit. Before the guard, email: String | Unit and phone: PhoneNumber | Unit reflect only two possible successful binding combinations: (email: String, phone: Unit) or (email: Unit, phone: PhoneNumber). They do not describe four independently interchangeable combinations. The guard email: String excludes the Sms combination, so the body sees email as String and phone as Unit. No value is reassigned or converted, and no declared binding type changes during execution; the compiler refines what is known on this path.

Apply this to finite known input/pattern alternative relationships, including nested constructor/tuple patterns and the shared successful continuation of condition or alternatives. The whole pattern/or group must first succeed under its existing scope rules; a type test in a later guard, and operand, or body can then narrow the stable bindings that still refer to those same values. Names from failed alternatives remain invisible. This adds no references to newly bound sibling names inside a pattern's comparison RHS and no binding export through negation. After a narrowed scope ends, use the knowledge established for that outer scope rather than retaining a branch-local proof unconditionally.

### Unit does not identify a unique path

If Email's payload is String | Unit, the known combinations instead include Email(String)/phone Unit, Email(Unit)/phone Unit, and email Unit/Sms(PhoneNumber). An email: String test still proves phone is Unit. An email: Unit test, however, admits both Email(Unit) and Sms, so phone remains Unit | PhoneNumber. Genuine Unit payloads and absent-binding Unit have the same ordinary value/type; this rule invents no absence discriminator or hidden tag test to distinguish them. Narrow only as far as the remaining combinations justify.

### Stability and binding identity

Track the identities of the related bindings, not just their spelling. A later shadow binding is a new binding and its tests do not automatically refine the earlier binding's siblings. Reassignment, a writable alias, or an effect that may replace a relevant value invalidates the relationship unless it can be proved preserved. When that proof is unavailable, do not narrow another binding using it; retain its independently justified type or require a fresh test. A readable/fixed binding does not freeze everything reachable through it, and extraction does not promise copies or extended lifetimes.

This selects the finite known-alternative narrowing contract, not a complete general alias/effect solver, arbitrary numeric/predicate relationships, open subtype overlap, parent reconstruction from unrelated field reads, allocation strategy, or runtime representation. Existing ownership/access obligations and guard short-circuit/no-retry behavior remain intact.

## Static meaning and capabilities

- The inferred types describe every value that may reach the successful branch, not only the concrete value observed in one execution.
- No implicit cast, numeric widening, string conversion, allocation, or cloning is introduced by pattern inference.
- Type knowledge does not grant mutation, access, or ownership permissions.
- Each supplied component uses a variable collector or a pattern collector, without an extra whole-value binding alongside its nested pattern. Inference cannot manufacture ownership, copies, or mutation permissions.
- A pattern with no compatible portion cannot normally execute its body. The exact unreachable-pattern diagnostic policy remains open.
- A generic or open input can justify only its available type bounds and refinements. Generic type-test legality and how to represent such refinements need formalization; the compiler must not guess concrete types.

## References and remaining decisions

Dart patterns bind variables with inferred types and permit typed subpatterns; Kotlin describes smart casts and common-supertype approximations because it does not expose general union types. LiteScript's selected requirement preserves concrete types or unions from compatible alternatives rather than automatically replacing them with such an approximation. See [Dart patterns](https://dart.dev/language/patterns) and [Kotlin type checks](https://kotlinlang.org/docs/typecasts.html).

Complete exact-type/subtype intersections, generics, the inference/invalidation algorithm for selected known-alternative relationships, tuple/rest type grammar, and ownership during matching. Plain-union normalization is selected separately. No compiler implementation or inference-completeness proof is implied.

Related: [typed destructuring](match-patterns.md#typed-destructuring-selected-composition-rule), [union type patterns](union-patterns.md), [types and inference](types-and-inference.md), and [tuples and patterns](tuples-and-patterns.md).
