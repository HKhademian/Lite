# Match pattern capabilities

Status: **equality, plain enums, payload enums, destructuring, and type matching required; complete productions and evaluation contracts open**.

## Purpose and template

The [all-type finalization review](pattern-type-review.md) extends this capability checklist to records, lists/arrays/slices, sets, tuples/pairs, enums, strings, range values and membership, numbers, maps, Unit, and stored Results. Confirmed primitives are retained; new collection and named-record forms are explicitly marked as proposals.

One match construct must cover ordinary value selection and structured pattern matching. A separate switch construct is unnecessary for these capabilities.

```text
match subject {
    pattern { body }
    pattern { body }
}
```

The five capabilities below are selected requirements. Where a spelling extends the selected constructor, tuple, or typed-binding examples, it is an illustrative surface candidate rather than a completed grammar. Fallback syntax remains a proposal; and-chained arm conditions and additional matches are selected. Each match evaluates its subject once and uses the same action/value body form.

## 1. Equality

Match by equality with a value: numbers, strings, Booleans, named constants, and compatible values computed or obtained at runtime. This is more than an integer-only jump-table switch.

Literal value-match arms:

```text
match answer {
    42 { celebrate() }
    /* Remaining arms or fallback go here. */
}
```

Require compatible operand types and a defined equality contract; do not add implicit truthiness or unrelated coercions. Match an existing runtime value with `== expected { ... }`. The explicit value-match marker prevents silently creating a binding named expected. A literal such as 42 can be written directly as a concise value-match pattern.

The selected base operations are bind (`name`), type match (`: Type`), and value match (`== expected`). Typed binding `name: Type` composes the first two. The [binding-versus-testing reference review](pattern-bindings-and-tests.md) explains their distinctions and remaining semantic contracts. Bare identifiers and `.None` keep their selected roles; no prelude constant or type name silently changes a bare binding into a test.

Decide how many times and when a computed comparison value is evaluated, whether matching uses ordinary `==` or a restricted equality capability, and how side effects or fallible equality participate. The subject-once rule does not automatically answer those questions. Custom equality must not silently swallow recoverable errors or force every structural pattern to call user-defined equality.

## 2. Plain enums

Support conventional payload-free enum cases:

```text
match status {
    .Ready { start() }
    .Busy { wait() }
    .Stopped { finish() }
}
```

Assume these are the enum's complete cases and the called operations produce Unit. The subject supplies the enum owner for these contextual case names. Complete enum declarations, raw representations, conversion, aliases, and invalid foreign values require separate contracts. Plain enum support does not automatically adopt implicit C-style integer conversion. See [enums and variants](enums-and-variants.md).

## 3. Enums with payloads

Select a case and extract its associated data:

```text
match event {
    Event.Click(x, y) { handle_click(x, y) }
    Event.Key(key) { handle_key(key) }
    Event.Quit { close_window() }
}
```

Assume these are the complete cases, handlers produce Unit, and each case exposes the illustrated payload. Parenthesized case payloads are a constructor-pattern candidate consistent with existing `Some(value)` examples; this does not finalize enum declaration or construction syntax.

This is a variant-tag test followed by payload matching. It is not an ordinary call to `Event.Click`, and it does not require an equality implementation for the entire Event value. Payload ownership and visibility still apply.

## 4. Destructuring

Extract components while matching their structure:

```text
match point {
    (x, y) { use_coordinates(x, y) }
}
```

Assume point has a compatible two-element tuple type. This pattern receives the whole point and destructures that same value. It does not switch to unrelated metadata because a tuple pattern was written.

Tuple, record/field, and nested patterns belong to this capability. Positional tuples and destination = sourceField named tuple/record patterns have selected forms. Complete recursive grammar, record positional schemas, and sequence/rest extensions remain open; see [tuple routing](named-input-routing.md) and [aggregate patterns](aggregate-patterns.md). Literal or type constraints should compose with extraction, subject to the full pattern grammar. This does not imply heap allocation or automatic calls to arbitrary user getters.

Newly bound component names are branch-local and may shadow outer names. A name in a binding position inside a constructor pattern, such as `Event.Key(key)`, binds its payload; an outer variable with the same spelling must not silently change it into an equality test. Repeated binding names within a pattern shadow in recursive written order, without asserting equality. `_` follows the same rule as every other binding name and explicitly permits nonuse. Typed underscore bindings can constrain components and remain readable; see [pattern shadowing](pattern-shadowing.md) and [underscore bindings and skips](wildcards-and-skips.md).

## 5. Type checking and matching

Select an active union alternative and use its narrower static type:

```text
match person {
    user: User { greet_user(user) }
    guest: Guest { greet_guest(guest) }
}
```

Assume person has type `User | Guest`. These explicit typed-binding arms are selected. Type-only patterns use `: User` without introducing a name, including in nested structures. They narrow a stable existing subject where its identity remains valid. Bare `User` is an ordinary binding under the selected bare-name rule, not a type-test alternative. See [type tests and narrowing](type-tests-and-narrowing.md).

A type test is different from an enum-case test. `Event.Click` and `Event.Key` can share the same declared type Event; `event: Event` cannot distinguish them. Similarly, testing a payload type cannot distinguish an intact Result's success from failure when the two payload types overlap.

## Typed destructuring: selected composition rule

Type patterns can occur inside destructuring patterns, not only as top-level arms. Check the structure and its component types together; bind the narrowed components only on a successful whole-pattern match. No nested conditional or match is required merely to narrow extracted values.

Assume pair is either an Int/String tuple or a String/Int tuple:

```text
match pair {
    (x: Int, y: String) { handle_number_text(x, y) }
    (x: String, y: Int) { handle_text_number(x, y) }
}
```

In the first arm x is Int and y is String; the second arm reverses those types. The annotations are matching constraints, not requests to convert incompatible components. Failure of any required component makes the whole pattern fail. Branch bindings do not become accessible to later arms or outside the matching branch; this does not promise rollback of arbitrary user side effects. Borrow/move/copy commitment during partial matching still needs ownership rules.

The same composition applies to constructor payload patterns. With an Event.Data case carrying a pair whose components admit several types, this arm can constrain its nested payload directly:

```text
Event.Data((x: Int, y: String)) { handle_number_text(x, y) }
```

This assumes the illustrated case schema and is an arm fragment requiring other coverage as appropriate. Qualified case spelling remains illustrative, and contextual `.Data(...)` uses the selected enum shorthand when its owner and payload schema are known.

Conditional matching shares these component patterns:

```text
if (x: Int, y: String) := pair {
    handle_number_text(x, y)
}
```

The capability and typed tuple shape are selected. Complete tuple/record productions, generic/subtype tests, field visibility, evaluation effects, and ownership remain to formalize. A typed pattern whose component type is already statically known may need no runtime test; an impossible type constraint cannot be made valid by an implicit cast. In an ordinary declaration, the same destructuring must be irrefutable for its input type or use an explicitly defined failure contract.

Unannotated components still receive precise inferred types. Apply the whole pattern's constraints to the possible input alternatives, then infer each binding as its corresponding concrete type or union across compatible portions. A constraint on b can therefore exclude an alternative from every other binding's inference too. Composite bindings preserve complete alternative shapes. See [pattern binding inference](pattern-binding-inference.md); this rule does not change how arm result expressions are checked.

Nested tuple destructuring uses `(x, (a, b: str, c), ...rest)`, with str denoting a known type. The second outer component is collected by its nested pattern; it does not also introduce a whole-value name y. A variable binding in that position instead collects the whole component. This [collector choice](tuples-and-patterns.md#nested-tuple-patterns-and-rest-selected) is selected; complete recursive parsing and ownership remain separate.

## Sixth capability: arm condition chains

After a structural pattern succeeds, Boolean conditions and additional pattern bindings can refine selection:

```text
Event.Click(x, y) and x >= 0 and y >= 0 { handle_click(x, y) }
```

If a condition is false or an additional pattern fails, selection continues to later arms. Earlier bindings are available to later operands and the successful body, with left-to-right short-circuiting. Nested destructuring can appear in these additional matches. Mutation, recursive extraction effects, and ownership commitment need further rules. A guarded arm does not establish full coverage of its structural pattern. See [match arm chains](match-guards.md).

Other useful follow-ups are alternatives in one arm, range patterns, and a remainder/fallback arm. They are separate decisions rather than additional requirements inferred from the numbered list. Combined whole-value-plus-payload binding is rejected; choose a variable collector or a nested pattern for the supplied component.

## Common contracts still to settle

- Complete recursive composition and operand boundaries for the selected binding, type-match, and value-match primitives, together with constructor and enum-case selection. No interpretation may rely on capitalization or whitespace.
- Every match must now be exhaustive, including actions; _ {} explicitly ignores remaining values. Specify overlap, unreachable arms, optional else fallback syntax, and the coverage algorithm.
- Define borrow/copy/move behavior and field access permissions, especially after a nested match fails.
- Specify equality semantics, effects, and comparison-operand evaluation without sacrificing the once-evaluated subject contract.
- Share the applicable patterns with conditional matching; do not create an unrelated `if` pattern language.

Some fragments intentionally omit remaining arms to isolate a pattern category. They are not claims of exhaustive or executable examples. These capabilities do not establish a parser, representation, or benchmark result.

## References and related concepts

- [Rust patterns](https://doc.rust-lang.org/reference/patterns.html): literals, constant paths, variants, tuples, records, and name-resolution distinctions; its complete grammar and ownership rules are not adopted automatically.
- [Dart pattern types](https://dart.dev/language/pattern-types): constant, variable, typed, object, and record patterns.
- [Swift enumerations](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Enumerations.md): payload-free and associated-value enum cases.
- [Match](match.md), [tuples and patterns](tuples-and-patterns.md), and [reference comparison](pattern-syntax-comparison.md).
