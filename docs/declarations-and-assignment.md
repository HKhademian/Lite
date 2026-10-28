# Declarations and assignment

Status: **established direction; full declaration grammar remains open**.

## Templates

```text
name := initializer;
name: Type;
name: Type = initializer;
mut name := initializer;
name: mut Type = initializer;
var name := initializer;
var name: Type;
var name: Type = initializer;
var mut name := initializer;
var name: mut Type = initializer;
name = replacement;
```

## Value transfers copy; no implicit references

Selected on **2026-10-25**: ordinary binding initializers and assignment right-hand sides copy their evaluated values under the applicable valid copy contract. In b := a or b = a, later replacement of a does not retarget b. Location selection for the assignment is not a read of uninitialized payload bytes, and var/mut permissions and definite-initialization rules still apply. Already-declared reference fields preserve their shallow reference values and permitted access; this is not a deep graph clone. The compiler may elide unobservable physical copies, but cannot silently substitute a live reference, borrow, sharing mode, or move for an ordinary value transfer. Copy eligibility and future explicit reference/resource/safety contracts remain deferred; see [the general copy default](parameter-values-and-slots.md#general-copy-default-selected).

## Boolean initializers with a leading separator

A complete Boolean initializer may begin with one optional `and` or `or` without enclosing parentheses:

```text
ready :=
    and connected
    and authenticated
    and permitted
;
```

Assume the three inputs are Bool. This infers Bool and evaluates exactly like ready := connected and authenticated and permitted;. The semicolon ends the ordinary declaration item regardless of line placement; newlines do not terminate or group the expression. A typed initializer after = or an assignment's replacement expression uses the same rule. A prefixed initializer requires a real operand and must type-check as Bool; no implicit operand, reevaluation, or condition-pattern binding is added. See [optional leading separators](leading-separators.md#boolean-values-without-extra-parentheses), selected 2026-10-24.

## Multi-member union initialization

[x: A | B = 0 is rejected](union-initialization-policy.md#selected-rejection-and-explicit-member-choice): an undirected zero request must not choose among distinct normalized members. Use = ? for explicit reservation, or supply an initialized compatible expression. A{} names a record member and applies its defaults; the proposed A{0} spelling would name and zero that member. Bare local multi-member union declarations are rejected: require an initialized expression or explicit = ?. Apply after alias resolution/normalization; the general omitted-initializer rule below has this selected exception.

## Rules

- `:=` declares a binding and infers its type.
- `: Type =` declares a binding with an explicit type and supplied initializer.
- A simple typed binding may omit its initializer: name: Type; immediately zero-initializes that type, bypassing declared field defaults. It is equivalent to name: Type = 0 and uses the language-defined valid all-zero value of every type. It does not leave an uninitialized or late-assignment state.
- A whole explicitly typed binding uses `name: Type = source`; `name: Type := source` is rejected, including after an allowed binding modifier. Type constraints inside a destructuring pattern remain valid, such as `(age: Int, name) := pair`, subject to the declaration's mismatch contract.
- Bindings are fixed and provide read-only access by default.
- `var` opts into binding reassignment, without granting writable access to held data.
- `mut` opts into writable access to held data, without granting binding reassignment.
- `var mut` opts into both capabilities, in that order.
- Either capability leaves the binding's declared value contract fixed; a flow-sensitive read type may narrow without narrowing the accepted replacement contract.
- `=` does not declare a name. For a binding explicitly reserved with = ?, its first whole-value = may initialize it without var, subject to definite-initialization checks. Later whole-binding replacement requires var. A field or element update through an initialized binding requires mut, permitted field/element access, and a compatible ownership contract. Partial construction has a separate open contract.
- An assignment RHS that is a partial no-`else` conditional is a guarded update: a matching branch supplies the value to assign; no match performs no write. A final `else { ? }` is the explicit no-write form. The target's fixed/var first-write or replacement rules still apply.
- A conditional initializer without a final `else` leaves the declaration default on no match. With `else { ? }` it leaves the binding reserved on that path, subject to definite-initialization checks.
- `:=` never means "declare if absent, otherwise update."
- Declarations and assignments are statements producing `Unit`.
- Assignment cannot be embedded in a condition or chained as a value-producing expression.

The modifiers name two independent capabilities. For `x := make_user()`, `x.age = 13` is rejected because the binding does not provide writable access. `mut x := make_user()` permits that update when the field and ownership rules permit it, but still rejects `x = another_user`. These rules concern access through the binding, not a promise of deep global immutability; see [mutability, access, and operations](mutability.md).

For inferred declarations, the prefixes are `mut`, `var`, or `var mut`; `mut var` and repeated modifiers are rejected. For explicitly typed declarations, `var` before the name still marks local binding reassignment; access qualifiers go after the colon, as in user: mut User, var user: mut User, or target: var User. The old typed-prefix spelling mut user: User is superseded and rejected. Typed parameters likewise place qualifiers after the colon, with both fn(user: mut User) for held-data mutation and fn(target: var T) for caller-storage replacement; fn(var target: T) is retired. No additional function-level mutation marker is required; see [placement](mut-qualifier-placement.md) and [functions](functions.md).

## Omitted, zero, and default initialization

```text
x: User;       /* implicit zero initialization; read-only User */
var x: User;   /* implicit zero initialization; reassignable User storage */
x: User = 0;   /* explicit zero initialization; bypass field defaults */
x: User = {}  /* default construction; apply declared field defaults */
x: User = ?;   /* explicit reserved storage; payload not yet initialized */
```

The first four declarations fully initialize their bindings immediately. The final = ? form explicitly reserves storage instead; it is not usable as an ordinary User before initialization. Its first whole-value x = value is permitted once per execution path without var; later replacement requires var. Every path reaching an ordinary use must have initialized the binding. The already-initialized fixed bindings cannot receive a later first assignment as an initialization exception. Var permits subsequent whole-binding replacement, but not field mutation without mut. Repeated x declarations use the selected sequential local shadowing rule. See [first initialization](first-initialization.md).

The first binding exposes User. The var binding exposes the writable storage contract var User: it reads User and accepts replacement User values. Reading that binding still produces a User value; it does not produce a writable reference or transfer its storage permission. See [var access](var-access-qualifier.md).

Omission and = 0 use the same universal all-zero rule; = {} uses the separate declared-default policy. Every type must map zero storage to a valid value; the earlier zero-eligibility restriction is retired. An inferred name := still requires a source, and omitted-source destructuring is not introduced. Function parameters and record fields have their own declaration contracts. The separately selected [omitted-value-argument rule](functions.md#omitted-value-arguments) requires an applicable explicitly declared parameter default; without one, omission is rejected for every argument type. See [zero initialization](zero-initialization.md).

The = ? marker is selected for simple typed value declarations; it is not an ordinary unknown-value expression. A source-level explicit reservation differs from the optimizer omitting unobservable zero stores in otherwise initialized code. Whole-value first = is selected; partial construction, caller initialization, lifetime, and cleanup contracts remain open. See [reserved storage](reserved-storage.md).

## Examples

```text
age := 12;
limit: Int = 18;
var attempts := 0;

attempts += 1;
```

```text
var score := 10;
score = 20;       /* accepted */
score = "twenty"; /* rejected: incompatible type */
```

```text
score := 10;
score = 20;       /* rejected: immutable binding */
```

The second example isolates type safety; the third isolates immutability.

Function values follow the same declaration and replacement rules. `var myfn: fn(a: Int): Int!;` starts as the zero callable. `myfn = fn(a: Int): Int! { a + 1 }` replaces it with a function literal fitting that contract. An initialized binding without `var` cannot be replaced this way. See [function types and reassignment](functions.md#function-types-literals-and-reassignment).

## Read types after assignment

Selected on **2026-10-24**: direct local writes check against the declared value/storage contract, while reads use the type justified at the current program point. With var x: String | Int = ? followed by x = 42, x reads as Int but still accepts a later String replacement. After x = "hello", reads are String; Bool still fails the declared union. This applies throughout ordinary code blocks, including outside if branches. The assignment expression itself still produces Unit. A bare local multi-member union declaration remains rejected; = ? is the explicit reservation and x must be initialized before use. See [assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected) for control-flow joins, shadowing, successful-write timing, and stability limits.

## Held-data updates versus binding updates

```text
mut user := make_user();
user.age = 13;              /* permitted if the field is accessible and writable */
user = make_another_user(); /* rejected: no var */
```

```text
var user := make_user();
user = make_another_user(); /* permitted with a compatible type and ownership contract */
user.age = 13;             /* rejected: no mut */
```

```text
var mut user := make_user();
user.age = 13;
user = make_another_user();
```

These examples assume fresh owned construction and an accessible writable `age` field. `mut` does not create write permission through an existing read-only borrowed view or override field privacy.

`count += 1` with `var count := 0` remains valid: it computes a result and assigns the `count` binding. Conversely, `user.age += 1` updates a field and requires writable access through `user`. Compound updates follow the permission of their assignment target.

Select an assignment target once before evaluating the right-hand side. A compound update reads the selected target's current value before evaluating its right operand, then applies the operation and writes the result. The ownership contract must make target retention valid; it cannot silently change this order or reevaluate an index. See [evaluation order](evaluation-order.md).

## Uniform definitions

Functions and types can be bound through the same declaration form:

```text
double := fn(x: Int): Int {
    x * 2
}

Student := record {
    name: String;
    grade: Int;
}
```

The record keyword and typed-field surface are selected; see [records](records.md). Uniform binding syntax does not imply that a type can be dynamically replaced at runtime. Constructor, identity, and memory contracts remain open.

## Scope

Selected tuple declarations include (left, right): (:Int, :Int) = (1, 2), inferred named annotations such as (left, right): (l, r) = (r = 2, l = 1), and named patterns (left = l, right = r) := tuple. A type annotation establishes the initializer contract; := infers it. See [tuple component grammar](named-input-routing.md#selected-tuple-type-component-grammar).

Destructuring declarations and possible future destructuring assignments need separate contracts: declarations introduce names, while assignments update permitted existing targets. Refutable declaration failure and tuple assignment behavior must not be inferred from match syntax. See the [pattern context review](pattern-contexts.md#1-ordinary-declarations).

Sequential local declarations may shadow earlier bindings in the same block, just as nested scopes may shadow names. Resolve an ordinary initializer against the previously visible bindings before introducing its new names. Thus x := make_user(); var x := x; mut x := x; introduces three successive bindings, rather than upgrading the first binding's permissions. Duplicate parameter, record-field, and module declaration lists retain separate contracts. The deferred-body exception below permits later-name references without eager script hoisting; recursive binding selection and exact module resolution remain open. See [local shadowing and copies](local-shadowing-and-copies.md).

Within one destructuring pattern, names bind in recursive written order and later occurrences shadow earlier ones; former loop receiver lists are retired, while body-local loop destructuring uses the ordinary pattern rule. `_` is an ordinary readable underscore-prefixed name with permission to be unused, not a discard operation. Assignment to it needs var like assignment to any other binding. Tag shadowing follows its own explicit @name namespace and nearest-enclosing lookup. See [pattern binding and shadowing](pattern-shadowing.md).

A conditional pattern binding may shadow the outer source name inside its matching branch. Resolve the source expression before introducing the narrowed name; the new binding does not alter the outer binding's type or mutability and is not visible in sibling branches. See [union type patterns](union-patterns.md).

For every executable block, including a run file, ordinary eager code cannot use
a later binding. The [deferred function-body exception](functions.md#deferred-body-lookup)
permits later-name references without moving initialization. It does not make a
callable available before its own initializer or permit uninitialized reads.
Exact future-name/shadow selection and early-call checks remain open. Module
declaration lookup follows its separately selected direction. See
[block order](evaluation-order.md#executable-block-items) and
[module lookup](modules-and-packages.md#module-lookup-without-header-files).

## Rejected forms

```text
if attempts = 3 { ... }
```

```text
a = b = 3;
```

Neither is a value-producing assignment expression in this design.

## Related concepts and references

- [Operators](operators.md)
- [Identifiers](identifiers.md)
- [Loop receivers](loop-receivers.md)
- [Functions](functions.md)
- [Types and inference](types-and-inference.md)
- [Odin declarations](https://odin-lang.org/docs/overview/) informed the discussion; LiteScript's immutable default is its own choice.
