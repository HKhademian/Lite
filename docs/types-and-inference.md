# Types and inference

Status: **static typing and inference established; full type system remains a design goal**.

## Purpose

Students can write ordinary code without annotations while the compiler still rejects incompatible operations and assignments before execution.

## Safe widening

Selected 2026-10-25: safe widening is generally accepted when established compatibility rules prove that a source value satisfies the destination contract. It preserves the represented value and active alternatives while allowing the destination to admit more possibilities. No source-level wrapper or cast is required for a supported widening, and the source keeps its own type. An inferred declaration keeps the source type unless another expected contract supplies a wider destination.

The selected proofs include [plain-union widening](union-widening.md), [stored Result widening](result-and-errors.md#stored-result-values-widen-safely), and [safe callable adaptation](callable-value-variance.md). Callable inputs/results follow their specified directions; widening does not mean replacing every type argument with a broader type. Ordinary initialization, assignment, arguments, and returns use the applicable value-compatibility proof along with their other checks.

The compiler preserves ordinary copy behavior and observable effects while adapting representation when needed. This does not require identical bytes, select an ABI, or authorize an in-place reinterpretation. [Label checks](tuple-label-conversions.md#ordinary-transfers-check-labels), nominal identity, initialization, omission promises, and access contracts still apply. In particular, a copied value's widening does not widen a caller-location write grant; [basic var parameters remain invariant](callable-value-variance.md#var-parameters-keep-their-value-type).

This principle does not by itself establish numeric coercions, arbitrary container covariance, or structural conversion of nominal records. Those families still require their own compatibility rules. Success construction, which adds a Result layer, is distinct from widening an already stored outcome.

### Unchecked narrowing is rejected

Selected 2026-10-25: unchecked narrowing is rejected as a compile-time error. A narrower destination annotation alone is not evidence that the source fits. Narrowing requires an established static proof, such as a valid flow refinement, or checked selection/handling whose successful path proves the narrower contract. The selected type tests and patterns provide such checks; this rule introduces no cast syntax or runtime cast-failure policy.

```text
inspect := fn(value: Int | String): Unit {
    narrowed: Int = value; /* rejected: String remains possible */

    if value: Int {
        checked: Int = value; /* valid: the type test proves Int */
    }
}
```

This applies to ordinary initialization, assignment, arguments, and returns, including stored Result payload contracts and callable compatibility. An earlier widening does not authorize an unchecked reverse conversion. Existing static assignment-flow facts can justify narrowing without adding a redundant runtime test; their validity and invalidation rules still apply. Safe callable adaptation continues to use its own input/result directions, and writable grants retain their separate checks.

## Templates

```text
value := expression;
value: Type = expression;
function_name := fn (parameter: Type): ResultType { body }
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

Selected contextual division separates arithmetic from storage: a floating operand supplies floating arithmetic, and an Int destination accepts the quotient rounded by / truncation or _/ floor. Thus 7.5 / 2 stores 3, -7.5 / 2 stores -3, -7.5 _/ 2 stores -4, and 2 / 0.5 stores 4 in Int. This includes established floating values and nonintegral literals; do not retype or truncate the operands. Float/Double destinations retain fractional /, including 2 / 7, rather than receiving widened integer zero. Without floating operands or a fractional expected result, integer-only division retains its integer default. General assignment casts, mixed floating widths/precision, representability/non-finite faults, and context/rounding boundaries through larger expressions/calls/returns remain open. See [division](division.md#floating-calculation-and-integer-storage).

An explicit or established expected tuple type is the reference construction contract: it determines the destination shape, and inference fills only omitted information. Without such a shape, unnamed positional tuple construction keeps the fixed prefix before the first runtime-sized array spread and collects that spread plus subsequent positional contributions into one trailing array named rest. Multiple array spreads feed that one segment; if every count is static and no explicit tail is declared, infer fixed components instead. These defaults never override an explicit shape or bypass the required coverage/type/access proof. A default tail label rest conflicting with a fixed member rest is an inference error; an explicit schema with a distinct tail label resolves it without reserving the word rest. See [destination precedence and the five cases](tuple-array-shapes.md#destination-types-take-precedence-over-inferred-shape).

Loop inference is bidirectional: body constraints and the destination's expected type cooperate. In x: Long = loop my_ints { .value + .item }, the destination constrains the loop's value type rather than selecting an unchecked cast after execution. A body containing only .value can also be inferred when the destination supplies its type. With then, the body value type and final result type remain distinct. Numeric compatibility still follows the separately defined arithmetic rules. See [loop type inference](loop-type-inference.md).

A fresh nonempty bracket literal with an established element type and statically known length N infers [T; N], unless an expected concrete collection type selects another constructor family. Thus numbers := [1, 2, 3] infers [Int; 3], and known-size array/tuple spreads contribute their lengths. This supersedes the earlier unconditional List default. Var/mut affect permissions, not family or extent; later append operations cannot retroactively make an array growable. Existing providers retain their type and access contract. For a known-size nonempty literal with established contribution types, infer their normalized union as the common element type when no expected contract selects another compatible type: [1, "tea", true] has [Int | String | Bool; 3]. Empty literals without element evidence, unresolved contribution types, and runtime-length literal provider selection remain open. See [array inference](tuple-array-shapes.md#known-size-fresh-literals-infer-fixed-arrays).

A simple declaration can supply the type without an initializer: x: User; immediately creates its valid language-defined all-zero value, equivalent to x: User = 0. The distinct x: User = {} uses declared defaults. Var x: User; has the writable storage contract var User, whose read value type is User; replacement permission does not turn a read into a writable alias. Omitted inferred declarations still lack a type/source and are rejected. See [zero initialization](zero-initialization.md) and [var access](var-access-qualifier.md).

Binding reassignment and read/write access to held data are distinct capabilities: var permits reassignment and mut permits writable data access. Inferred var mut x := expression grants both; the typed form is var x: mut T = expression. The declared value contract remains fixed under assignment, while the current read type may narrow from a successful direct local write. For declared String | Int, assigning 42 establishes Int reads without removing String from accepted replacements; see [assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected). [Mutability](mutability.md) also defines read access as the operation default, with mut in affected typed receiver/parameter annotations and no additional function-level mutation marker. Full method notation and capability inference rules remain open. Inference must not silently upgrade an existing read-only borrowed view to writable access.

For simple named entries mixed with a runtime array spread, discover the omitted tuple schema before routing values: (...items, score = 10) can infer a fixed score slot before its final rest array. Discovery does not fill/reserve that slot; an earlier positional element can be consumed into it and then replaced. Leading fixed components retain their order, later named fixed slots follow first-declaration order, and the purely positional defaults remain unchanged. An explicit expected type still controls shape. See [named tuple-slot inference](tuple-array-shapes.md#named-slot-discovery-does-not-reserve-a-value).

A fully fixed tuple spread can supply the same statically discoverable named slots as direct entries. Its established tuple type supplies labels/order/types before evaluation, while its values are routed only when the operand is evaluated in written order. Thus (...items, ...base) can infer base's fixed score/rank slots and later replace their earlier positional contributions. Explicit destinations, final-slot checks, and normal label rules still govern construction; logical unpacking also exposes fixed labels from supported rest-bearing sources while emitting tail elements anonymously. See [fixed tuple source inference](tuple-array-shapes.md#fixed-tuple-spreads-participate-in-slot-discovery).

Expression unpacking now infers from logical items: fixed labels survive, declared tails emit array elements without their container labels, and a destination reconstructs the result. Known counts can yield fixed tuples; runtime-sized portions remain inferred tails. Ordinary copy := source keeps the organization. This does not change type-level spread or pattern capture, and zero-sized Unit elements remain logical items. See [logical unpacking](tuple-unpacking.md).

Named-tail construction also retains an established source extent when no expected general schema overrides it: (...rest = fixed), for fixed: [T; C], infers (...rest: T; C). The optional ; C is an exact compile-time segment count; an explicit ...rest: T destination still requests the general count contract. A runtime-sized array's currently observed length does not establish a new static extent. Existing (...rest:) infers the element type; this revision adds no new partial-extent inference syntax. Middle collectors and their split rules remain future discussion. See [array-segment types](tuple-array-segments.md).

## Intended type-system foundation

- Primitive values and explicit numeric representations.
- Records, tuples, tagged unions, and plain unions of existing types. Plain-union normalization and widening have selected rules; see [union normalization](union-normalization.md).
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

## Optional leading union separator

An established type-expression context permits one optional leading | on a nonempty plain-union chain, selected 2026-10-24. Value := type | String | Int and Value := type String | Int denote the same transparent alias; an annotation such as value: (| String | Int) uses the same union type. This spelling neither adds Unit nor changes inference, type identity, normalization, or precedence. Leading & is conditional on future intersection-type selection. See [optional leading separators](leading-separators.md#plain-union-types).

## Tuple type components

Tuple type components use the selected three forms:

```text
(l: Int, r: Int) /* named, explicit types */
(l, r)          /* named, inferred types */
(:Int, :Int)    /* unnamed, explicit types */
```

Bare ordinary entries in type context are labels; their colon requires a following type. The earlier dangling name: form is removed, and bare (Int, Int) is not an unnamed typed pair. Declared rest segments have a scoped exception: (...rest:) names an array tail and infers its element type from sufficient static initializer/expected-contract information. (...Params) retains tuple-type expansion meaning. See [rest element inference](tuple-array-shapes.md#a-colon-distinguishes-inferred-rest-declarations-from-type-spread). Ordinary tuple values and binding patterns keep their context-specific meanings.

```text
(left, right): (l, r) = (r = 2, l = 1);
```

The initializer supplies values by name into l, r order, infers both component types as Int, and binds left = 1 and right = 2 positionally. Expressions execute in written order. A stored tuple preserves its value order; an explicitly typed receiving declaration can relabel its positions, while changing the value order requires reconstruction. Core construction, named/positional destructuring, and named argument routing are selected; different stored tuple labels permit conversion through an explicitly typed receiving declaration, while ordinary transfers check labels; see [labels under an explicit destination type](tuple-label-conversions.md). Tuple identity is structural: the same ordered labels, resolved component types, ordinary/segment roles, and extent contracts describe the same type wherever written. Label-only named/unnamed destination conversions are selected; other conversions and complete recursive grammar remain open. Singleton type spellings are selected: (T) groups, (:T,) is unnamed, (label: T) is named, and (label,) infers its component type; (:T) is rejected. Grouped (pattern) bindings preserve the whole input type; (pattern,) and (local = label) extract positional and named singleton components under the selected pattern rule. The empty tuple is Unit, with () as an equivalent value/type spelling. Singleton value construction is selected: (value,) is an unnamed tuple, (= value) is a named tuple, and (value) remains grouping independently of the expected type. See [concrete tuple routing](named-input-routing.md).

### Tuple value shorthand and position types

Label-only and partial tuple annotations fix component labels/order while inferring each omitted type from its final surviving contribution. Thus x: (a,) = (a = "3", ...(a = 1,)) has type (a: Int). A fixed or otherwise expected component type instead checks that surviving value: the same initializer also fits (a: Int), because its String contribution is superseded. Every expression must still be valid and evaluate in written order. See [patching and component inference](named-input-routing.md#patching-and-inferred-component-types-selected).

In inferred tuple construction, explicit labels must be unique within each constructor, including labels introduced by =name shorthand. Collisions involving spread may replace an earlier slot without moving it; the final surviving contribution determines that component's type. Thus (a = "3", ...(a = 1,)) infers (a: Int), whereas both (a = "3", a = 1) and (a = 3, a = 1) are duplicate-label errors. Earlier valid expressions still evaluate in written order. This does not retype a stored tuple or widen a declared parameter type; known destination tuple types now use [fixed destination routing](named-input-routing.md#fixed-destination-routing-selected), checking each surviving contribution against its slot type/access, requiring all components, and introducing no implicit defaults. Complete generic/overload inference and superseded-value ownership remain separate. See [construction validation and insertion](tuple-spread-and-rest.md#append-or-replace-by-label-selected).

In value context, (cake, tea) constructs unnamed positional components unless an expected named destination supplies their roles. The selected (= cake, = tea) instead supplies named entries cake = cake and tea = tea. This does not change bare labels in tuple type context. Named and unnamed tuples both expose fixed zero-based numeric access (.0, .1, and so on), with the corresponding component's static type and compile-time bounds checking. See [tuple entries and access](tuple-entries-and-access.md); mixed standalone inference is selected: (42, = tea) infers (:Int, tea: String) when tea is String. Only explicitly named entries supply labels without an expected schema. Label-only intact stored named/unnamed destination conversions are now selected; other shape/type conversions remain open.

## Inferred functions

```text
operation := (x: Int) { x * 3 }
operation := fn (x: Int) { x * 3 }
/* alternative definitions; one Int input and an inferred Int result */

operation := (x: Float): Float { x * 3 }
operation := fn (x: Float): Float { x * 3 }
/* alternative explicit contracts, checked by ordinary numeric rules */
```

The [unified callable model](callable-input-packs.md) uses the same inference with and without `fn`. Input shape and types must be established by annotations, an expected callable contract, or selected ordinary [parameter-default inference](parameter-default-inference.md). The nonrecursive local body can then infer its result; knowing only the shape or result is insufficient to choose unknown input types. Under `operation: fn (Int): Int`, both `(x) { x * 3 }` and `fn (x) { x * 3 }` use that expected contract. Under `operation: fn (Int): Int = fn { arguments.0 * 3 }`, the full implicit input pack is a singleton Int. Independently, headerless fn has Unit inputs, not a guessed generic pack.

Neither `operation := (x) { x * 3 }` nor `operation := fn (x) { x * 3 }` establishes x's type. Inferring reusable input requirements from body operations remains a separate proposal. The keyword does not grant another inference mode. Parsing recognizes the lambda before checking its destination; a noncallable destination is rejected, not used to choose an immediate-block interpretation.

Nonrecursive local literals with established input types have selected [body-result inference](functions.md#independent-lambda-result-inference). Without an explicit or expected result contract, distinct completion payload types form a [normalized plain union](functions.md#mixed-local-result-types): an Int return and String tail infer Int | String. Explicit/expected result types remain constraints, and escaping recoverable errors require an explicit contract. Unknown-input generic inference remains open. [Conditional and match results](branch-result-inference.md) separately have the same selected normalized-union inference.

One proposal is constrained generic inference: the function is valid for types supporting an appropriate addition operation. Alternatives include requiring parameter annotations in more situations. Recursive and ambiguous definitions need a specified inference boundary.

The [collection-inference proposal](collection-inference.md) applies this question to simple collection functions: infer a reusable traversal requirement rather than locking an omitted input annotation to List from one call. It also explores propagating known element types into nested record literals. Neither proposal selects structural record compatibility, automatic caller mutation, inferred escaping errors, or new generic syntax.

Explicit signatures at public library boundaries were recommended to prevent implementation changes from silently changing published contracts. That requirement is still a working policy rather than an implemented check.

Recoverable failure has a stronger selected rule: all escaping recoverable errors must fit an explicitly declared error contract, including errors forwarded by postfix `!`. `T ! E` declares a refined outcome type; `T!` means `T ! Error` and deliberately declares the general recoverable error contract. A plain `T` declares no recoverable error channel. Inference must not silently add such failures to a function promising an ordinary nonfallible result. The general Error definition, generic error contracts, and error-type composition remain open; see [Result and errors](result-and-errors.md).

Type declarations give union `|` higher precedence than binary fallible type `!`. Ungrouped code is valid; official reference documentation prefers `(A | B | C) ! (D | E | F)` with both union sides grouped. This selects their relative precedence while leaving other type constructors and repeated-`!` associativity for the full type grammar; see [type grouping](fallible-types-and-error-composition.md#grouping).

## Parameter defaults establish ordinary input types

Selected 2026-10-25: an ordinary default can establish an omitted input type using the same static inference as a declaration. fn(count = 3, label = "item") establishes Int and String. Explicit annotations and established expected input types constrain the defaults; later calls do not widen the fixed input contract. Inspect helper result types without executing defaults. Invalid defaults remain invalid even when supplied calls skip their runtime evaluation. Insufficient evidence requires an annotation or established context. This applies with or without fn and enables existing known-input body-result inference. See [parameter-default inference](parameter-default-inference.md) for examples and the remaining grammar, access, dependency, and placement boundaries.

## Callable value compatibility

Selected 2026-10-25: for supported ordinary value inputs, a callable implementation may accept a wider type than a public view permits callers to supply, while its result may be narrower than the public result. Thus fn(value: Int | String): Int can fit fn(value: Int): Int | String, with unchanged public labels. The compiler supplies any necessary safe argument/result representation adaptation; no user wrapper is required. This uses existing value admission rather than byte reinterpretation, does not re-infer the implementation signature, and preserves omission for the source implementation when both contracts permit it. A default remains checked against the implementation input type, not a later narrowed supplied-input view; no signature supplies or alters it. Basic var T callable inputs are invariant in the resolved value type because they read and write it, while individual argument flow checks remain unchanged; see [var T callable invariance](callable-value-variance.md#var-parameters-keep-their-value-type). Mut/other access interactions and general generic variance remain separate. See [implementation-owned default promises](callable-value-variance.md#omission-remains-an-implementation-promise). See [safe callable value adaptation](callable-value-variance.md).

Matching outer T ! E callable results also have selected [fallible callable outcome widening](callable-value-variance.md#fallible-callable-views-may-widen-outcomes): success/error payloads can be widened separately under established value admission while retaining .ok/.err. The original source callable remains usable at its original or wider compatible contracts. This is not unrestricted Result generic covariance, nominal error subtyping, layer flattening, or inference of undeclared escaping errors.

## Results and control flow

A declaration initializer whose resolved branch-result T is a normalized multi-member plain union requires an explicit `else` or `?` if selection can normally finish without a contributor, because its default `zero(T)` cannot choose a member. Assignment and loop no-match paths are noncontributing and need no union member. Exhaustive chains construct the chosen member directly. A wider destination alone is not the criterion, and `then` requires a final `else` and a valid T before producing R. See [conditional union fallback](conditional-union-fallback.md).

Reachable completion paths must fit the enclosing type contract. Result recovery has a selected union-forming rule: success type `T` and normally completing fallback type `D` produce `T | D`, whether or not the error receiver is named. [Conditional and match branches](branch-result-inference.md) also infer normalized plain unions without an expected result contract; expected contracts still constrain every normally completing branch. Union syntax, narrowing, conversions, ownership, and layout remain open; see [Result and errors](result-and-errors.md#recovery-result-type).

Plain-union normalization is selected: member order is irrelevant, nested plain unions flatten, and exact type duplicates disappear after transparent-alias resolution. Thus recovery from User with another User yields User, not a redundant User | User. Distinct nominal records and enum cases remain distinct, and Option/Result/product structure is preserved. Automatic exact-member admission and checked narrowing are selected in [union membership](union-membership.md). [Union widening](union-widening.md) is automatic when every normalized source alternative is an exact destination member. Subtype absorption, conversions through other type constructors, and complete grammar remain open; see [union normalization](union-normalization.md).

Type-pattern narrowing is selected for union values, including unions on either the success or error side of a fallible outcome. A matching branch can use the active alternative with its narrower static type. Existing names can be tested as `if person: User` without redeclaration; explicit pattern bindings remain available. Refinement validity and further flow rules are tracked in [type tests and narrowing](type-tests-and-narrowing.md). Complete pattern grammar, type identity versus subtype tests, overlap, and ownership remain open. An intact Result retains its outer success/failure distinction even if the two payload sides overlap; see [union type patterns](union-patterns.md).

Pattern bindings have a separate selected inference rule: constrain the input by the entire pattern, then give every unannotated binding its projected concrete type or union across compatible possibilities. Explicitly constraining one component does not require annotations on its siblings, and impossible alternatives must not widen any binding. Whole composite values preserve unions of complete shapes. Match-arm result union inference is separately selected in [branch results](branch-result-inference.md). See [pattern binding inference](pattern-binding-inference.md).

[Common field reads](union-field-reads.md) require the field to be readable on every possible receiver alternative. Their result type is the normalized union of the corresponding field types. A missing or inaccessible field rejects the read before result-type combination; it does not contribute a bottom type, None, or Unit. [Field writes](union-field-writes.md) require the source value to fit every possible target field, in addition to writable access. The projected read type is not the full storage contract. [Explicit access contracts](union-values-and-access.md) are a proposal; method calls remain open.

Explicit exits do not need to provide a local continuation value at the point they exit; their payload is checked against the exit target.

An internal `Never` or bottom type can describe control flow that cannot complete locally. Supported exhausted conditional type-test branches now warn and give the exhausted binding this read type; it can satisfy a known ordinary value parameter without producing a runtime value. Unrelated bindings retain their types and independent errors remain errors. Public spelling, member/generic behavior, and general usability are open, including the requested future exploration of Never | T and Never & T. See [Never and unreachable flow](never-and-unreachable-flow.md).

Explicit var caller-location calls check current reads and declared accepted replacements separately. Var String reads and writes String; it rejects a current Int. A valid String-only call preserves String, while a wide String | Int call can widen an Int read refinement. Ordinary call results and storage write contracts stay unchanged. Write-only access is a future topic, not current semantics; see [call replacement flow](call-replacement-flow.md).

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
