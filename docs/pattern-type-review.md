# Pattern matching across types and values

Status: **review dated 2026-10-18; confirmed primitives and enum/Result rules are retained, while collection and named-record additions below remain proposals**.

## Scope

The [example walkthrough](pattern-examples.md) combines the design into simple and complex examples. It uses selected inferred named-record patterns and contextual construction; list/rest syntax remains proposed; positional tuple rest shape, placement, and arity are selected.

Review records, lists, arrays, slices, sets, tuples/pairs, enums, strings, ranges, numbers, Booleans, Unit, Option, Result, maps, unions, and opaque/user-defined values as one pattern system. Supporting a type does not require automatic positional extraction or equality for every value of that type. A name can bind any admitted value; equality, type tests, and decomposition require their respective capabilities.

The review is a concrete draft for completing the initial surface, not an implemented parser or a choice of ownership, allocation, generic reification, or every container's library API. New syntax is identified explicitly rather than silently promoted to a confirmed rule.

## Confirmed common rules

```text
name                 /* bind */
_                    /* ordinary readable, unused-allowed binding */
: Type               /* type test without binding */
name: Type           /* type test plus binding */
== expected          /* compare with an existing value */
42                   /* literal value test */
.Some(value)         /* select a case and match its payload */
.Some                /* select a case without payload bindings */
```

Bare names bind even when an outer constant/type has the same name. Existing-value tests use ==. Repeated binding names shadow in recursive written order; they do not assert equality. Structural patterns route values to subpatterns without requiring equality on the entire aggregate.

The surrounding construct supplies the subject:

```text
if .Some(== expected) := find_value() { report_expected() }

match find_value() {
    .Some(== expected) { report_expected() }
    .Some(value) { use_value(value) }
    .None { report_missing() }
}
```

Whole typed bindings use name: Type = source, never name: Type := source. Typed components inside a structural pattern remain valid. Loop headers now accept only an optional item name; destructuring and selection stay inside the body. Parameters and completion/recovery receivers still need their separate mismatch policies. See [pattern contexts](pattern-contexts.md).

## 1. Numbers and Booleans

Use literals and == expected with a statically valid equality operation. Negative numeric values retain their sign. Do not coerce a numeric string into a number or silently narrow a value just to make a pattern fit.

```text
match code {
    0 { report_zero() }
    -1 { report_negative_one() }
    == expectedCode { report_expected() }
    other { report_other(other) }
}
```

true and false can cover Bool. Ordered tests already work in guards, including mathematical comparison chains. Direct <, <=, >, and >= subpatterns remain a [proposal](comparison-patterns.md).

Float patterns use the same equality contract as ordinary Float comparisons, with no approximate matching. If IEEE-style equality is selected, NaN requires an explicit predicate and signed zeros follow that contract; matching must not quietly invent different behavior. Literal precision, numeric conversions, and floating representation remain [numeric decisions](numbers.md).

## 2. Unit

Use `== Unit` to test the singleton value, or `: Unit` to test its type. Bare Unit in a binding position binds under the ordinary name rule; it is not a special constant-pattern exception. Broader type/value name resolution remains open; the Unit-specific expression/type spellings are recorded in [Unit](unit.md).

Unit is neither None nor an error. A missing match arm must not manufacture any of those values.

## 3. Tuples and pairs

The selected two-element form is `(first, second)`, and typed/literal/value subpatterns compose in its positions. Recommend treating pair as the two-element tuple shape, without a second intrinsic pair-pattern syntax. A separately declared nominal Pair would instead use its exposed record/schema contract.

Ordinary fixed-tuple positional binding follows stored order. Named tuple patterns use destination = sourceField, with exact initial coverage and no unknown/duplicate source selectors. Tuple type components use name: Type, inferred bare labels, or :Type; see [tuple routing](named-input-routing.md). Positional tuple patterns select one trailing ...rest capture preserving component types and order; an empty remainder is Unit/(), and a one-component remainder stays a singleton. Without rest, require exact arity; rest never fills missing required components. Rest preserves labels from named/mixed sources, with numeric positions restarting at zero. Rest after named selectors and ownership remain separate. See [selected tuple rest](tuple-spread-and-rest.md#positional-tuple-rest-selected). Empty/singleton value and type spellings, grouped patterns, and singleton extraction are selected. Unit is the empty tuple; the pattern () matches only Unit and binds no names. In declarations it must be irrefutable; conditional/match contexts retain their existing mismatch rules. See [empty tuple patterns](tuple-entries-and-access.md#empty-tuple-pattern-selected). Bare Unit in a binding position still follows the ordinary readable-name rule.

## 4. Records

Record declarations use record. Construction targets predefined fields on the left; named deconstruction targets bindings/subpatterns on the left:

```text
student: Student = { id = 7, name = "Ali", age = 18, };
{ studentId = id, studentName = name, years = age, } := student;
```

Construction may also explicitly name Student: student := Student { ... }. The type head may be omitted when a unique expected record type is known, including in an annotated binding or nested predefined record field. Unknown/ambiguous expected types need explicit information; do not search unrelated types by field names.

Named patterns need no redundant type head. Their source establishes the exposed fields, and the general clause is destination pattern = sourceField. Compact field == expected compares without binding; field: Type type-tests and binds that same-named field. Type-only alias syntax is : Type = sourceField. This supersedes both field-colon routing and the reversed field = destinationPattern recommendation. See [aggregate clauses](aggregate-patterns.md#named-field-clauses).

Recommend partial named selection over exposed fields, with explicit stable schemas for positional matching. Omitted private fields remain private; a pattern does not invoke a constructor, expose hidden layout, or automatically call arbitrary getters. Exact omission, duplicate field selection, aliases, and construction syntax remain under review in [aggregate patterns](aggregate-patterns.md).

## 5. Lists, arrays, and slices

Propose an ordered sequence pattern with exact length by default:

```text
[]
[first]
[first, second]
[first, ...rest]
[.Some(user), == expected]
```

One trailing rest capture matches zero or more remaining elements. Prefix elements retain the same binding/type/value/case primitives. A list pattern does not automatically consume a stream, iterate a set, or split a string. Remaining type, length, capability, and allocation questions are in [sequence patterns](sequence-patterns.md); these new bracket/rest rules are not selected yet.

## 6. Sets

Whole-set equality, membership/subset tests, and unordered extraction are different operations. Existing == expected applies when the set type supplies equality. Predicate guards can express membership without binding an arbitrarily chosen element.

Unordered element-binding patterns require a rule for ambiguous assignments, distinct matched elements, backtracking, rest, and cost. They are not equivalent to list matching. The options and worked example are in [set patterns](set-patterns.md); no unordered extraction rule is selected.

## 7. Enums, Option, and Result

Use selected .case tag selection, payload subpatterns, and tag-only omission. Raw enum codes do not make enum patterns operate on an arbitrary backing number. An enum case need not be an independently usable type. See [enums](enums-and-variants.md).

Option retains .Some/.None. Stored Result cases now use the selected lowercase forms:

```text
match attempt {
    .ok(value) { use_value(value) }
    .err(error) { report(error) }
}
```

Payload patterns may narrow success or error unions after the outer side is selected. Tag-only .ok/.err inspect just that side. No implicit unwrap, propagation, nested-Result flattening, or panic recovery follows from matching. Successful returns remain implicit. See [Result](result-and-errors.md) and [union patterns](union-patterns.md).

## 8. Strings and character/byte views

A string literal tests the entire string by its ordinary equality contract. == expectedText compares with existing text; adjacent literal concatenation retains its lexical meaning. No regex, substring, normalization, or case-folding operation is implied by a plain literal pattern.

Recommend keeping strings out of list patterns initially. Byte, Unicode scalar, and grapheme views are distinct abstractions; conversion to an explicit view should precede any sequence matching. Their actual APIs, encoding, slicing, and allocation remain [string decisions](strings.md). Character/byte literal forms are not finalized.

## 9. Ranges: values versus membership

A range object is one value; a scalar being inside that range is another test. == expectedRange compares the whole range if its type supports equality. A type/record pattern could inspect exposed range components once that contract exists.

Interval guards already work:

```text
match age {
    value and minimum <= value <= maximum { report_in_interval(value) }
    _ { report_outside() }
}
```

This example tests an ascending inclusive interval, not arbitrary strided-range membership. A range such as `(10..=1).step(3)` is intended to visit 10, 7, 4, 1; bounds alone would also admit values it never yields.

Recommend an explicit membership operation/guard before adding compact range patterns. Bare 1..=10 and an `in range` pattern prefix remain alternatives, not selected syntax. Define descending bounds, stride, end inclusion, Float behavior, and range-value equality first. Pattern membership must not secretly enumerate or consume a range/iterator. See [numbers and ranges](numbers.md).

## 10. Maps/dictionaries

Map matching should be keyed lookup, not positional extraction from iteration order. Existing body/guard matching can inspect an explicit optional lookup result. For illustration, if lookup supplies Option<Value>:

```text
if .Some(value) := lookup(mapping, wantedKey) {
    use_value(value)
}
```

The helper is illustrative, not a selected library API. Recommend missing keys cause pattern mismatch in any future map-selection pattern; they must not synthesize None as an ordinary field value or throw implicitly. Exact-versus-partial keys, duplicate keys, runtime key expressions, rest maps, and a grammar distinct from records/blocks/sets need review. General map syntax is not selected here.

## 11. Unions, interfaces, functions, references, and opaque types

Binding always remains available. Type tests require a legal static/runtime test under the type system; generic syntax does not imply universal reflection. Value tests require a declared compatible equality operation; do not invent function/closure equality or pointer identity. Structural extraction requires a deliberately exposed schema, not arbitrary memory inspection. Aliases, domain wrappers, and interfaces preserve their own type and visibility contracts.

Never/uninhabited values cannot supply a runtime subject. No universal null, uninitialized value, or implicit dereference pattern is added by this review. Ownership, references, and type-test stability still need their broader contracts.

## Evaluation and coverage to finish

Recommend checking shape/tag/length before accessing dependent components, then testing subpatterns in written recursive order with short-circuiting. Expected-value expressions should run once when reached. A failed pattern/guard does not roll back already performed side effects. Comparison fallibility must be explicit; a recoverable error is not ordinary mismatch. Those remaining evaluation rules are proposals alongside the already selected source-once and arm-order rules.

Closed enum cases, Bool alternatives, and products with irrefutable components can support coverage checks. A proposed [] plus [head, ...rest] covers all finite admitted sequences when its components are unconstrained. Runtime equality values, arbitrary guards, unordered search, NaN, and open interfaces cannot be assumed to prove exhaustive coverage. Every match now requires completeness, including actions. Ordinary _ supplies a readable catch-all binding, and _ {} explicitly ignores remaining inputs because an empty block returns Unit. Result types must still fit; see [coverage](match-coverage.md).

## Reference checks

- [Rust patterns](https://doc.rust-lang.org/reference/patterns.html): separate tuple/struct/slice/range forms, one rest element, and explicit ownership rules. Rust's nonbinding _ and duplicate-name restrictions differ from LiteScript.
- [Dart pattern types](https://dart.dev/language/pattern-types): recursive list, map, record, object, and relational patterns; list length/rest differs from partial keyed selection. Its named-field colon appears in a grammar with different binding/type markers, so it cannot settle LiteScript's ambiguity automatically.
- [Python patterns](https://docs.python.org/3/reference/compound_stmts.html#patterns): sequences exclude strings/bytes, mappings select by keys, and class patterns use attribute/positional schemas. LiteScript does not adopt Python's dynamic coercion, wildcard, or capture-scope rules.
- [Swift patterns](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Patterns.md): expression-pattern matching uses ~=, including ranges and user overloads. LiteScript has not selected an implicit general matching operator.
- [Kotlin when](https://kotlinlang.org/docs/control-flow.html#when-expressions-and-statements): distinguishes ordinary value cases, in range/collection tests, and type tests. This is useful evidence for separating membership from whole-value equality.

Sources were consulted on 2026-10-18; some pages describe development versions. No examples were compiled. The [broader syntax comparison](pattern-syntax-comparison.md) and [type-category comparison](type-categories-comparison.md) retain the other reference-language discussions.
