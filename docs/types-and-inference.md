# Types and inference

Status: **static typing and inference established; full type system remains a design goal**.

## Purpose

Students can write ordinary code without annotations while the compiler still rejects incompatible operations and assignments before execution.

## Templates

```text
value := expression;
value: Type = expression;
function_name := fn(parameter: Type): ResultType { body }
```

## Examples

```text
name := "Sam";
var score := 0;
score = 10;
```

```text
score = "ten"; /* rejected */
```

Inference chooses static types. It does not make a variable dynamically change type.

Binding reassignment and read/write access to held data are distinct capabilities: `var` permits reassignment, `mut` permits writable access, and `var mut` permits both. Neither changes the static value type. [Mutability](mutability.md) also defines read access as the operation default, with explicit `mut` on affected receiver/parameter bindings and no additional function-level mutation marker. Full method notation and capability inference rules remain open. Inference must not silently upgrade an existing read-only borrowed view to writable access.

## Intended type-system foundation

- Primitive values and explicit numeric representations.
- Records, tuples, and tagged unions.
- Parametric generics with interface constraints.
- Functions and closures as values.
- Pattern matching and destructuring.
- Explicitly implemented interfaces.
- Distinct nominal domain types such as `StudentId` and `CourseId`.
- `Unit`, `Option<T>`, and `Result<T, E>`.

These are desired capabilities, not a complete or implemented specification. Syntax for all of them has not been settled.

The [type-category review](type-categories.md) separates products, named enum alternatives, unions of existing types, domain wrappers, generated data operations, and value/reference semantics. The [reference comparison](type-categories-comparison.md) shows why data class and value class do not provide one portable contract. The [enum proposal](enums-and-variants.md#design-direction-after-the-category-review) recommends one enum concept for plain and payload cases without selecting case-specific subtypes or a memory model.

Record type declarations have selected nominal identity, including unnamed inline declarations: two independently declared records remain distinct despite identical fields. Conversion requires explicit reconstruction under their visibility and ownership contracts. Contextual record construction and headless field extraction do not introduce structural assignment compatibility. Standalone inferred record literals and generic type instantiation still need contracts; see [record identity](record-type-identity.md).

## Inferred functions

```text
double := fn(x) {
    x + x
}
```

One proposal is constrained generic inference: the function is valid for types supporting an appropriate addition operation. Alternatives include requiring parameter annotations in more situations. Recursive and ambiguous definitions need a specified inference boundary.

Explicit signatures at public library boundaries were recommended to prevent implementation changes from silently changing published contracts. That requirement is still a working policy rather than an implemented check.

Recoverable failure has a stronger selected rule: all escaping recoverable errors must fit an explicitly declared error contract, including errors forwarded by postfix `!`. `T ! E` declares a refined outcome type; `T!` means `T ! Error` and deliberately declares the general recoverable error contract. A plain `T` declares no recoverable error channel. Inference must not silently add such failures to a function promising an ordinary nonfallible result. The general Error definition, generic error contracts, and error-type composition remain open; see [Result and errors](result-and-errors.md).

## Results and control flow

Reachable completion paths must fit the enclosing type contract. Result recovery has a selected union-forming rule: success type `T` and normally completing fallback type `D` produce `T | D`, whether or not the error receiver is named. This does not establish automatic union inference for unrelated conditional or match branches. Union syntax, narrowing, conversions, ownership, and layout remain open; see [Result and errors](result-and-errors.md#recovery-result-type).

Plain-union normalization is selected: member order is irrelevant, nested plain unions flatten, and exact type duplicates disappear after transparent-alias resolution. Thus recovery from User with another User yields User, not a redundant User | User. Distinct nominal records and enum cases remain distinct, and Option/Result/product structure is preserved. Automatic exact-member admission and checked narrowing are selected in [union membership](union-membership.md). [Union widening](union-widening.md) is automatic when every normalized source alternative is an exact destination member. Subtype absorption, conversions through other type constructors, and complete grammar remain open; see [union normalization](union-normalization.md).

Type-pattern narrowing is selected for union values, including unions on either the success or error side of a fallible outcome. A matching branch can use the active alternative with its narrower static type. Existing names can be tested as `if person: User` without redeclaration; explicit pattern bindings remain available. Refinement validity and further flow rules are tracked in [type tests and narrowing](type-tests-and-narrowing.md). Complete pattern grammar, type identity versus subtype tests, overlap, and ownership remain open. An intact Result retains its outer success/failure distinction even if the two payload sides overlap; see [union type patterns](union-patterns.md).

Pattern bindings have a separate selected inference rule: constrain the input by the entire pattern, then give every unannotated binding its projected concrete type or union across compatible possibilities. Explicitly constraining one component does not require annotations on its siblings, and impossible alternatives must not widen any binding. Whole composite values preserve unions of complete shapes. This is not automatic union formation for incompatible match-arm result expressions. See [pattern binding inference](pattern-binding-inference.md).

[Common field reads](union-field-reads.md) require the field to be readable on every possible receiver alternative. Their result type is the normalized union of the corresponding field types. A missing or inaccessible field rejects the read before result-type combination; it does not contribute a bottom type, None, or Unit. [Field writes](union-field-writes.md) require the source value to fit every possible target field, in addition to writable access. The projected read type is not the full storage contract. [Explicit access contracts](union-values-and-access.md) are a proposal; method calls remain open.

Explicit exits do not need to provide a local continuation value at the point they exit; their payload is checked against the exit target.

An internal `Never` or bottom type can describe control flow that cannot complete locally. Its public spelling and general usability are open.

## No universal absence

An ordinary value must be initialized and valid for its type. Absence requires an optional type. No implicit uninitialized or nullable state is introduced by inference.

## Generic fields and structural matching

The [generic User example](aggregate-patterns.md#generic-aggregate-example) requires `User(: Int, == outVal)` to recognize the exposed aggregate family/schema, type-match its first field, and value-match its second, without introducing bindings. This interpretation is conditional on a valid generic type-test and matching-schema contract; it does not select generic declaration syntax.

A component's successful type test does not automatically identify a generic parameter or permit a cast of the enclosing generic value. Preserve the distinction between field-value refinement and the type argument of its container. Specialization, erasure/reification, constraints, variance, and legal tests of unknown generic parameters remain open.

## Major open decisions

Numeric widths and overflow rules; generic syntax and inference; standalone inferred record literal types; variance; associated types; literal inference; overload resolution; interface dispatch; higher-order type features; ownership and borrowing; and whether types are first-class compile-time values.

Higher-kinded types, dependent types, unrestricted compile-time evaluation, and dynamic typing are not established requirements.

## Related concepts and references

- [Functions](functions.md), [Unit](unit.md), [Option](option.md), and [Result](result-and-errors.md).
- [Composition and interfaces](composition-and-interfaces.md).
- [References](references.md): Rust, Swift, Kotlin, Odin, and Zig provide comparison points rather than a type-system specification to copy wholesale.
