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

Loop inference is bidirectional: body constraints and the destination's expected type cooperate. In x: Long = loop my_ints { .value + .item }, the destination constrains the loop's value type rather than selecting an unchecked cast after execution. A body containing only .value can also be inferred when the destination supplies its type. With then, the body value type and final result type remain distinct. Numeric compatibility still follows the separately defined arithmetic rules. See [loop type inference](loop-type-inference.md).

A bracket literal without a more specific expected sequence type defaults to growable List: numbers := [1, 2, 3] infers `List<Int>`. Var/mut only changes access permissions, not the inferred family; later append operations must not retroactively turn a fixed array into a list. An explicit expected array type may select fixed layout under the eventual array construction contract. Empty/heterogeneous inference and complete type/literal grammar remain open. See [lists](lists.md) and [sequence storage families](sequence-types.md).

A simple declaration can supply the type without an initializer: x: User; immediately creates its valid language-defined all-zero value, equivalent to x: User = 0. The distinct x: User = {} uses declared defaults. Var x: User; has the writable storage contract var User, whose read value type is User; replacement permission does not turn a read into a writable alias. Omitted inferred declarations still lack a type/source and are rejected. See [zero initialization](zero-initialization.md) and [var access](var-access-qualifier.md).

Binding reassignment and read/write access to held data are distinct capabilities: var permits reassignment and mut permits writable data access. Inferred var mut x := expression grants both; the typed form is var x: mut T = expression. The held value's type remains fixed under assignment. [Mutability](mutability.md) also defines read access as the operation default, with mut in affected typed receiver/parameter annotations and no additional function-level mutation marker. Full method notation and capability inference rules remain open. Inference must not silently upgrade an existing read-only borrowed view to writable access.

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

All angle-bracket generic forms in this reference are [temporary explanatory notation](generic-notation.md), including `Array<Float, 3>`, `List<Int>`, `Option<User>`, and `Result<T, E>`. They do not select future generic declaration or application syntax. In particular, an element type and a compile-time extent are different conceptual inputs; their mechanism and spelling await the generic-design review.

The [type-category review](type-categories.md) separates products, named enum alternatives, unions of existing types, domain wrappers, generated data operations, and value/reference semantics. The [reference comparison](type-categories-comparison.md) shows why data class and value class do not provide one portable contract. The [enum proposal](enums-and-variants.md#design-direction-after-the-category-review) recommends one enum concept for plain and payload cases without selecting case-specific subtypes or a memory model.

Record type declarations have selected nominal identity, including unnamed inline declarations: two independently declared records remain distinct despite identical fields. Conversion requires explicit reconstruction under their visibility and ownership contracts. Contextual record construction and headless field extraction do not introduce structural assignment compatibility. Standalone inferred record literals and generic type instantiation still need contracts; see [record identity](record-type-identity.md).

## Tuple type components

Tuple type components use the selected three forms:

```text
(l: Int, r: Int) /* named, explicit types */
(l, r)          /* named, inferred types */
(:Int, :Int)    /* unnamed, explicit types */
```

Bare entries in type context are labels; a colon requires a following type. The earlier dangling name: form is removed, and bare (Int, Int) is not an unnamed typed pair. Ordinary tuple values and binding patterns keep their context-specific meanings.

```text
(left, right): (l, r) = (r = 2, l = 1);
```

The initializer supplies values by name into l, r order, infers both component types as Int, and binds left = 1 and right = 2 positionally. Expressions execute in written order. A stored tuple with another order requires explicit reconstruction. Core construction, named/positional destructuring, and named argument routing are selected; different stored tuple labels require explicit reconstruction. Tuple identity is structural: the same ordered labels and resolved component types describe the same type wherever written. Stored named/unnamed conversions and complete recursive grammar remain open. Singleton type spellings are selected: (T) groups, (:T,) is unnamed, (label: T) is named, and (label,) infers its component type; (:T) is rejected. Grouped (pattern) bindings preserve the whole input type; (pattern,) and (local = label) extract positional and named singleton components under the selected pattern rule. The empty tuple is Unit, with () as an equivalent value/type spelling. Singleton value construction is selected: (value,) is an unnamed tuple, (= value) is a named tuple, and (value) remains grouping independently of the expected type. See [concrete tuple routing](named-input-routing.md).

### Tuple value shorthand and position types

In inferred tuple construction, explicit labels must be unique within each constructor, including labels introduced by =name shorthand. Collisions involving spread may replace an earlier slot without moving it; the final surviving contribution determines that component's type. Thus (a = "3", ...(a = 1,)) infers (a: Int), whereas both (a = "3", a = 1) and (a = 3, a = 1) are duplicate-label errors. Earlier valid expressions still evaluate in written order. This does not retype a stored tuple or widen a declared parameter type; known destination tuple types now use [fixed destination routing](named-input-routing.md#fixed-destination-routing-selected), checking every contribution against its slot type/access, requiring all components, and introducing no implicit defaults. Omitted-component inference interactions and superseded-value ownership remain separate. See [construction validation and insertion](tuple-spread-and-rest.md#append-or-replace-by-label-selected).

In value context, (cake, tea) constructs unnamed positional components unless an expected named destination supplies their roles. The selected (= cake, = tea) instead supplies named entries cake = cake and tea = tea. This does not change bare labels in tuple type context. Named and unnamed tuples both expose fixed zero-based numeric access (.0, .1, and so on), with the corresponding component's static type and compile-time bounds checking. See [tuple entries and access](tuple-entries-and-access.md); mixed standalone inference is selected: (42, = tea) infers (:Int, tea: String) when tea is String. Only explicitly named entries supply labels without an expected schema. Intact stored named/unnamed conversions remain open.

## Inferred functions

```text
double := fn(x) {
    x + x
}
```

Nonrecursive local lambdas with established input types have selected [body-result inference](functions.md#independent-lambda-result-inference). Without an explicit or expected result contract, distinct completion payload types form a [normalized plain union](functions.md#mixed-local-result-types): an Int return and String tail infer Int | String. Explicit/expected result types remain constraints, and escaping recoverable errors require an explicit contract. Unknown-input generic inference remains open. [Conditional and match results](branch-result-inference.md) separately have the same selected normalized-union inference.

One proposal is constrained generic inference: the function is valid for types supporting an appropriate addition operation. Alternatives include requiring parameter annotations in more situations. Recursive and ambiguous definitions need a specified inference boundary.

The [collection-inference proposal](collection-inference.md) applies this question to simple collection functions: infer a reusable traversal requirement rather than locking an omitted input annotation to List from one call. It also explores propagating known element types into nested record literals. Neither proposal selects structural record compatibility, automatic caller mutation, inferred escaping errors, or new generic syntax.

Explicit signatures at public library boundaries were recommended to prevent implementation changes from silently changing published contracts. That requirement is still a working policy rather than an implemented check.

Recoverable failure has a stronger selected rule: all escaping recoverable errors must fit an explicitly declared error contract, including errors forwarded by postfix `!`. `T ! E` declares a refined outcome type; `T!` means `T ! Error` and deliberately declares the general recoverable error contract. A plain `T` declares no recoverable error channel. Inference must not silently add such failures to a function promising an ordinary nonfallible result. The general Error definition, generic error contracts, and error-type composition remain open; see [Result and errors](result-and-errors.md).

Type declarations give union `|` higher precedence than binary fallible type `!`. Ungrouped code is valid; official reference documentation prefers `(A | B | C) ! (D | E | F)` with both union sides grouped. This selects their relative precedence while leaving other type constructors and repeated-`!` associativity for the full type grammar; see [type grouping](fallible-types-and-error-composition.md#grouping).

## Results and control flow

A conditional whose resolved branch-result T is a normalized multi-member plain union requires an explicit fallback if selection can normally finish without a contributor. Exhaustive chains construct the chosen member directly; an allowed single-type missing-else path still supplies zero(T). A wider destination alone is not the criterion, and then must receive a valid T before producing R. See [conditional union fallback](conditional-union-fallback.md).

Reachable completion paths must fit the enclosing type contract. Result recovery has a selected union-forming rule: success type `T` and normally completing fallback type `D` produce `T | D`, whether or not the error receiver is named. [Conditional and match branches](branch-result-inference.md) also infer normalized plain unions without an expected result contract; expected contracts still constrain every normally completing branch. Union syntax, narrowing, conversions, ownership, and layout remain open; see [Result and errors](result-and-errors.md#recovery-result-type).

Plain-union normalization is selected: member order is irrelevant, nested plain unions flatten, and exact type duplicates disappear after transparent-alias resolution. Thus recovery from User with another User yields User, not a redundant User | User. Distinct nominal records and enum cases remain distinct, and Option/Result/product structure is preserved. Automatic exact-member admission and checked narrowing are selected in [union membership](union-membership.md). [Union widening](union-widening.md) is automatic when every normalized source alternative is an exact destination member. Subtype absorption, conversions through other type constructors, and complete grammar remain open; see [union normalization](union-normalization.md).

Type-pattern narrowing is selected for union values, including unions on either the success or error side of a fallible outcome. A matching branch can use the active alternative with its narrower static type. Existing names can be tested as `if person: User` without redeclaration; explicit pattern bindings remain available. Refinement validity and further flow rules are tracked in [type tests and narrowing](type-tests-and-narrowing.md). Complete pattern grammar, type identity versus subtype tests, overlap, and ownership remain open. An intact Result retains its outer success/failure distinction even if the two payload sides overlap; see [union type patterns](union-patterns.md).

Pattern bindings have a separate selected inference rule: constrain the input by the entire pattern, then give every unannotated binding its projected concrete type or union across compatible possibilities. Explicitly constraining one component does not require annotations on its siblings, and impossible alternatives must not widen any binding. Whole composite values preserve unions of complete shapes. Match-arm result union inference is separately selected in [branch results](branch-result-inference.md). See [pattern binding inference](pattern-binding-inference.md).

[Common field reads](union-field-reads.md) require the field to be readable on every possible receiver alternative. Their result type is the normalized union of the corresponding field types. A missing or inaccessible field rejects the read before result-type combination; it does not contribute a bottom type, None, or Unit. [Field writes](union-field-writes.md) require the source value to fit every possible target field, in addition to writable access. The projected read type is not the full storage contract. [Explicit access contracts](union-values-and-access.md) are a proposal; method calls remain open.

Explicit exits do not need to provide a local continuation value at the point they exit; their payload is checked against the exit target.

An internal `Never` or bottom type can describe control flow that cannot complete locally. Its public spelling and general usability are open.

## No universal absence

An ordinary value must be initialized and valid for its type. Absence requires an optional type. No implicit uninitialized or nullable state is introduced by inference.

The explicit [reserved-storage marker](reserved-storage.md) uses value: Type = ? and derives layout from the expected annotation. It does not introduce readable uninitialized User values: storage requires tracked initialization before ordinary value use. The complete construction-state contract and stack/heap policy remain open. The earlier generic reserve() spelling remains a separate proposal.

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
