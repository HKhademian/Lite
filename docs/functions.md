# Functions

Status: **one callable model with typed input tuples, intrinsic pack application, and parenthesized lambdas with optional `fn`, clarified 2026-10-24. Context, annotations, or selected ordinary parameter defaults establish input types; known-input local result inference applies equally with or without the keyword. Complete parsing, captures, ownership, and callable representation remain open. Optional trailing semicolons, colon result types, tail results, and zero-result callable behavior are established**.

The [callable input-pack model](callable-input-packs.md) records the selected syntax, inline callback probes, and remaining limitations. It supersedes the earlier retirement of contextual `fn` and the distinction between independently typed functions and contextual-only lambdas. This is language design, not compiler/runtime verification.

Implementation coverage, **2026-10-30**: the experimental
[igniter](../igniter/README.md#typed-user-functions) now executes explicitly
annotated scalar fn literals, positional named-value calls, tail/explicit
returns, direct no-earlier-target recursion, and self(...) calls. It preserves
callee-before-arguments order and lexical/live helper binding reads, with
separate invocation environments. Surrounding scalar captures, surrounding
writes, later helper references, inference, and the wider callable model remain
unsupported. Admitting surrounding function-valued helper dependencies is a
temporary implementation boundary, not a general capture-policy selection.
See [INV-030 evidence](../investigations/INV-030-igniter-functions.md).

The approved **2026-10-31** [fixed-tuple increment](../igniter/README.md#flat-fixed-tuples)
extends explicit function inputs/results to flat unnamed tuples of scalar values,
using existing annotations such as (:Int, :String) and (:Int,). A tuple remains
one ordinary argument and preserves its evaluated component values. It does not
implement intrinsic pack application, argument spread, callable-valued inputs/
results, tuple data captures, or the wider callable model. See
[INV-022 evidence](../investigations/INV-022-fvp-fixed-tuples.md).

The [named-field follow-up](../investigations/INV-022-fvp-named-tuples.md) extends
these explicit tuple inputs/results to fully named scalar shapes. Stored values
must retain compatible ordered labels and component types. This does not add
contextual field routing; valid fresh-constructor routing requests receive an unsupported diagnostic.

The approved [fixed-array increment](../investigations/INV-054-fvp-fixed-arrays.md)
also admits explicit [T; N] inputs/results for the supported scalar or flat-tuple
element T and literal extent N. Exact extents and element contracts are checked;
ordinary arguments retain their evaluated values when the original variable
changes. General [T] contracts, array views/access grants and nested arrays
remain outside the interpreter subset.

The subsequent [INV-031 increment](../investigations/INV-031-fvp-named-calls.md)
implements existing named/positional user-function routing and =name shorthand,
including named self calls. It preserves supplied evaluation order and validates
only surviving contributions against destination slots. Stored tuple receiving
label conversion is also [implemented narrowly](../investigations/INV-022-fvp-label-conversion.md).
Defaults, spread and named builtin helper arguments remain unsupported.

The approved [INV-055 slice](../investigations/INV-055-fvp-list-slice.md) adds
ordinary List<T> inputs/results with exact element contracts and preserved
sequence copies. Mut grants are limited to the four temporary list operations;
general user-function mut parameters remain unsupported.

## Template

```text
name := fn (parameter: ParameterType): ResultType {
    body
}
```

Functions are definitions bound to names, not a separate category requiring a second named-definition syntax. `fn name(...)` occurred in early sketches; uniform binding syntax is the current direction.

## Example

```text
double := fn (x: Int): Int {
    2 * x
}
```

Use `:` for result annotations, matching other type annotations. The earlier `->` spelling is superseded.

## Function types, literals, and reassignment

The [tuple-type spread and array-tail extension](tuple-array-shapes.md) selects `fn (...Params, ...rest: T): Return`: type spreads construct fixed inputs, and a declared trailing segment accepts zero or more additional T values collected as an array. T may itself be a tuple. This tail is also valid in an ordinary tuple schema. Type-spread overrides replace labeled slots in place. Two-colon header candidates remain unselected. Write a space after fn in examples; whitespace still has no semantic role.

An explicitly written function type uses a signature without a body: `fn (a: Int): Int!`. The type after the signature's result colon is the callable's result type; here `Int!` means `Int ! Error`. A function literal can use the corresponding named typed implementation header followed by its executable body. It is a value expression usable in an initializer or an assignment. Callable type headers describe types; implementation headers introduce local receivers, without using name lookup to choose between those syntactic roles.

```text
var myfn: fn (a: Int): Int!;

_ := myfn(0); // supplied a = 0; zero callable returns .ok(0)

myfn = fn (a: Int): Int! {
    a + 1
}

_ := myfn(0); // supplied a = 0; replacement returns .ok(1)
_ := myfn(5); // supplied a = 5; replacement returns .ok(6)
```

The declaration immediately initializes `myfn` to the callable type's zero value. Ordinary `=` replaces that value because the binding is declared `var`; the assigned function must fit the binding's declared callable contract. The example uses the same parameter and result types on both sides. `mut` is not required for whole-binding replacement and does not substitute for `var`.

The calls store their `Int ! Error` outcomes in the ordinary readable `_` binding. They do not implicitly extract success or discard errors; underscore unused-name intent has its separate diagnostic rules. Omitted arguments require an applicable explicitly declared default, as specified below.

The explicit signature form and function-literal assignment are selected. Callable input signatures also admit unnamed positional types: `fn (Int): Int`, `fn (Int, String): Bool`, and `fn (): Unit`. Parentheses immediately after `fn` in a callable type delimit its input tuple, not grouping, so a one-input signature needs no trailing comma. Existing labeled forms such as `fn (a: Int): Int` remain available. Ordinary tuple type/value/pattern grouping and singleton commas are unchanged. Parameter-name identity in function types, remaining callable compatibility beyond selected [safe callable value adaptation](callable-value-variance.md), captures, ownership, and complete recursive type grammar remain to be specified.

## Safe value input and result adaptation

Selected 2026-10-25: wide := fn(value: Int | String): Int { 0 } can be assigned directly as view: fn(value: Int): Int | String = wide. Every allowed public Int input fits the implementation, and its Int result fits the public union. Omission-capable narrowed views are also valid when the source contract promises omission; the signature cannot provide or alter defaults, and the adapter preserves omission for the implementation. See [implementation-owned default promises](callable-value-variance.md#omission-remains-an-implementation-promise). A manual wrapper is valid but not required; the compiler preserves necessary argument/result adaptation, copies, and effects. Reverse unsafe directions are rejected. Normal label checks and explicit relabeling remain independent; basic var T parameters remain invariant under [var T callable invariance](callable-value-variance.md#var-parameters-keep-their-value-type); mut/other access adaptation, other error/effect transformations, and broader callable grammar remain separate. See [safe callable value adaptation](callable-value-variance.md).

For matching outer T ! E callable results, the source may now be viewed with a wider success type, a wider declared error type, or both, when each payload admission is valid. Use source directly; making a wider view does not change its original contract. A broader view cannot silently narrow errors, and outcomes still require ordinary caller handling. This is compiler-supported safe adaptation, not byte reinterpretation or a required manual wrapper; see [fallible callable outcome widening](callable-value-variance.md#fallible-callable-views-may-widen-outcomes).

## Whole input tuples and implicit arguments

```text
operation : fn (Int): Int = fn { arguments.0 * 3 }
operation : fn (Int): Int = fn pack { pack.0 * 3 }
operation : fn (Int): Int = fn (x) { x * 3 }
operation : fn (Int): Int = (x) { x * 3 }
```

These are alternative implementations of the same contract. `arguments` denotes the nearest callable's complete input tuple; a whole-pack header names that tuple, and a parenthesized header binds its components locally. Local binder names do not change expected public labels. Access to the pack alongside local components grants no extra copying, moves, mutation, or escaping caller-location permissions. Complete implicit-name collision/shadowing and ownership rules remain open.

With an expected input contract, headerless `fn { ... }` retains all its inputs. Independently, a headerless `fn { ... }` or `fn : Ret { ... }` has Unit inputs. A named pack or component without an established type does not default to Unit. The selected contextual empty/prefix receiver rules below are preserved; simple trailing rest receivers are selected by the array-tail extension, while general exact/nested header patterns need a separate decision. See [input packs](callable-input-packs.md).

## Intrinsic application and invocation sugar

```text
constant := fn { 42 }
constant.call;
constant.call Unit;
constant.call ();
constant();
/* each invokes with zero supplied inputs and produces 42 */

operation.call pack;
operation.call (...pack);
operation.call(...pack);
operation(...pack);
/* same component routing for a valid pack */
```

Intrinsic `.call` invokes using a tuple of supplied inputs, with Unit when no operand is written; it is not ordinary method-value lookup. `f(...)` is invocation sugar that constructs/routes supplied inputs. After `.call`, `(pack)` groups the operand and `(...pack)` constructs one through spread; whitespace does not distinguish them. Thus `f.call(pack)` applies pack's components, while `f(pack)` supplies one tuple-valued input and `f.call (pack,)` does the same. `f.call (4,)` supplies one Int; `f.call(4)` rejects a scalar operand. Zero inputs remain distinct from one Unit input.

Both paths use existing named/positional routing, declared-default-only omission, source-order evaluation, permissions, and cleanup. An empty supplied pack does not create a missing required input. General operand precedence, chaining, reserved-member policy, and expression integration remain open; see [application boundaries](callable-input-packs.md#application-with-an-existing-pack).

## Omitted value arguments

For ordinary value inputs, omission requires public permission and valid handling by the selected implementation: an applicable declared default in an ordinary user implementation, or the selected zero-callable no-execution rule. See [public omission contracts and implementation defaults](callable-default-contracts.md). Without such handling, omission is a compile-time error for every parameter type, including Int, Unit, records, and plain unions. A supplied argument takes precedence over the default. There is no automatic zero or declared-type default construction merely because a type supports it.

This supersedes the earlier default-or-zero argument rule. For fn (a: Int): Int! without a declared parameter default, myfn() is rejected; myfn(0) explicitly supplies zero. The rule applies before invoking either a user implementation or a zero-initialized callable, and inputs left unnamed by a lambda implementation still belong to its full callable contract. A genuinely zero-input function may of course be called with ().

Default-expression timing for ordinary user implementations is selected on **2026-10-25**: evaluate the callee first, supplied arguments once in written order, then only missing declared defaults once in declared slot order before invocation. For the user's b, c, a, d header with d and c supplied, execute new_d(), new_c(), default_b(), default_a(); c/d defaults are skipped. See [default evaluation](evaluation-order.md#default-argument-evaluation-selected). Ordinary [parameter-default inference](parameter-default-inference.md) is now selected. Ordinary [earlier-parameter defaults](parameter-default-inference.md#defaults-may-read-earlier-parameters) may read final prepared earlier inputs; self/later references are rejected independently of supplied call arguments. Complete default-header grammar, general lexical lookup/captures, access-aware dependencies, complete public function-type/header integration, general callable compatibility beyond omission, and parameter-pattern integration remain separate. The public contract exposes omission permission using the selected [public omission marker](callable-default-contracts.md#public-omission-marker) n?: Int / ?:Int on ordinary fixed named or unnamed input slots; compatible implementations own and may change their default expressions. A required-input public contract hides omission even when its implementation has a default. Core named-call omission is selected: ordinary user implementations require applicable declared defaults for unfilled inputs. Zero-callable omission is now selected separately and needs no actual default definition/execution; see [zero-callable omission](callable-default-contracts.md#zero-callable-omission-selected). The public contract still rejects missing required inputs; this does not newly authorize defaults that bypass mut/var permission or caller-location requirements. See [argument omission and union defaults](union-parameter-defaults.md) and [evaluation order](evaluation-order.md#function-calls).

## Named arguments under review

The user selected positional calls, name = value at call sites, and a positional prefix followed by named inputs: op(1,2,3), op(a=1,b=2,c=3), and op(1,2,c=3). Simple identifier parameters need no additional named-parameter declaration marker. Supplied expressions retain written evaluation order; omitted inputs still need explicitly declared defaults. The 2026-10-23 extension selects interleaving, =name shorthand, and explicit tuple call spread. Unnamed inputs fill the next unfilled declared slot; named inputs select a declared slot and may replace an earlier supplied value. Spread preserves labels: labeled components route by name, and unnamed components route positionally. Explicit argument labels must be unique within the call after =name expansion; spread labels do not count as explicit labels of that call. Permitted spread collisions and named replacement of positional contributions retain their selected routing. The fixed signature constrains each final surviving input. Superseded expressions must still be valid and evaluate, but need not fit their eventual destination; op(...(a = "old",), a = 1) is therefore valid for a: Int. Replacement does not retype the parameter or permit a wrong-typed final input. Reject unknown/ambiguous labels, excess positional inputs, missing-without-default inputs, and incompatible types/access. Evaluate the callee and supplied expressions once in written order. Public input labels follow the visible callable contract. Explicit typed receiving declarations can adapt stored callable labels, but ordinary reassignment/arguments/returns still check labels; implementation receiver/default names remain local. See [labels under an explicit destination type](tuple-label-conversions.md). Other stored-callable compatibility, superseded-value cleanup, and complete recursive call grammar remain open. See [named arguments and named tuples](named-arguments-and-tuples.md).

The [concrete named routing review](named-input-routing.md) records named permutations, interleaving, named replacement subject to explicit-label uniqueness, shorthand, explicit tuple spread, and static routing checks, plus expected tuple-valued inputs and proposed composition with mut/var caller grants. Written argument evaluation order and declared-default-only omission are already selected; complete recursive call grammar and remaining callable compatibility beyond destination label adaptation remain open.

## Compact implementations under review

Use one callable-literal model. `fn (parameters) { body }` and `(parameters) { body }` have identical meaning; the latter omits the keyword where the parenthesized header still identifies a function. Input shape/types come from annotations, an expected contract, or selected ordinary [parameter-default inference](parameter-default-inference.md). A nonrecursive local result may be inferred once inputs are established. No signature-only declaration is required. Independent unknown-input and recursive result inference remain separate.

### Two scenarios: full definition and contextual implementation

**1. An independent definition establishes its input types through annotations or ordinary parameter defaults.**

```text
var x := fn (a: Int): String {
    "original"
}
```

The initializer establishes `x`'s callable contract independently of an expected callable type. It could equally be `(a: Int): String { "original" }`; the keyword does not select different typing or execution. A known-input local body can also supply an omitted result type. `var` allows replacing the function value later. The complete function body ends this declaration's item; a trailing semicolon is optional and allowed.

**2. A replacement supplies only its parameter header and body.**

```text
x = (a) {
    "replacement"
}
```

Here the existing callable contract supplies the parameter type `Int` and result type `String`. The implementation names its local parameters and provides the body without repeating those types. Omitting annotations does not change the established contract; the replacement must satisfy it. The function body also ends this assignment's item, so its trailing semicolon is optional and allowed. The body above returns a string literal to keep the example focused on function syntax.

The same contextual lambda can be used when a method signature or callback parameter supplies the expected callable type. A separate declaration such as `var x: fn (a: Int): String;` is another source of that contract, not a prerequisite for the normal definition above. See [item boundaries](blocks-and-results.md#item-boundaries).

For an imaginary map API expecting `fn (item: Int): Int`, the full and contextual forms are:

```text
doubled := map(numbers, fn (n: Int): Int { n * 2 });
doubled := map(numbers, fn (n) { n * 2 });
doubled := map(numbers, (n) { n * 2 });
```

These are equivalent alternative implementations under the same expected callable contract, not declarations required together. Predicate examples are in the [inline callback probes](callable-input-packs.md#inline-callback-probes).

For the declared `var myfn: fn (a: Int): Int!;`, either keyword spelling gets the parameter's `Int` type and checks its body against `Int ! Error`. The comparison below retains earlier alternatives as review history; B and C now share the selected semantics. Arrows, pipes, and signature-inherited local names remain unselected alternatives.

### Solutions in the modern reference languages

Checked against official documentation on **2026-10-20**. These examples compare callable syntax with ordinary integer results; LiteScript's fallible result and default-callable policies are separate. They are documentation examples, not locally compiled fixtures.

**Rust: general closures with explicit local names and inferred types.**

```rust
let mut myfn: fn(i32) -> i32 = |a| a + 1;
myfn = |a| a * 2;
// A block body is also available:
myfn = |a| { a + 1 };
```

The `|a| expression` form binds names at the implementation site and can infer parameter types from context. Zero parameters use `||`; several use `|a, b|`. An explicitly annotated result requires a block. See [Rust closure expressions](https://doc.rust-lang.org/reference/expressions/closure-expr.html). Non-async closures without captures can coerce to matching function pointers, as above. Capturing closures have their own types and callable-trait contracts; the shown `fn` pointer is not a universal container for them. See [closure types and coercions](https://doc.rust-lang.org/reference/types/closure.html#call-traits-and-coercions).

**V: general function literals, callback lambdas, and specialized array shorthand.**

```v
increment := fn (a int) int { return a + 1 }
doubled := numbers.map(|n| n * 2)
positive := numbers.filter(it > 0)
```

V documents `|variables| expression` lambdas specifically inside higher-order function calls. Its full anonymous `fn` form can be stored as a value. Closures use explicit capture lists such as `fn [offset] (a int) int { return a + offset }`; ordinary captured variables are copied. See [V anonymous functions, lambdas, and closures](https://docs.vlang.io/functions-2.html#anonymous--higher-order-functions). Separately, `it` is the builtin current element in array map/filter expressions, which can also accept anonymous functions. See [V array methods](https://docs.vlang.io/v-types.html#array-methods). The callback-only lambda restriction matters for LiteScript's `myfn = ...` use case; array `it` does not inherit arbitrary API parameter names.

**Odin: reuse the procedure literal.**

```odin
increment := proc(a: int) -> int { return a + 1 }
```

The documented procedure literal has an explicit signature and executable body. This provides an inline implementation without a separate arrow form; see [Odin procedures](https://odin-lang.org/docs/overview/#procedures). Odin's [closure FAQ](https://odin-lang.org/docs/faq/#does-odin-have-closures) distinguishes its anonymous procedures from closures over surrounding local variables. This is a useful reference for keeping literal syntax independent from the decision to support captures.

**Zig: named functions and function pointers, with a container for an inline declaration.**

```zig
const increment: *const fn (i32) i32 = struct {
    fn call(a: i32) i32 { return a + 1; }
}.call;
```

This example composes Zig's documented struct namespace and function-pointer rules. It declares a function in an anonymous container and selects that declaration. The language reference distinguishes compile-time function bodies from potentially runtime-known function pointers; see [Zig functions](https://ziglang.org/documentation/master/#Functions) and [struct namespaces](https://ziglang.org/documentation/master/#struct). This is a more verbose solution to the inline callback problem than Rust/V pipes. `anytype` parameter inference at a call is a separate feature from contextually omitting a callback parameter's type.

For LiteScript, the most directly relevant precedents are Rust's generally usable inferred closures, V's short callback notation, and Odin's reuse of its full literal. The following evaluation is a LiteScript design recommendation, not an assertion that those languages provide the proposed spellings.

### A. Explicit arrow with local parameter names

```text
myfn = a => a + 1;
myfn = a => { a + 1 }

doubled := map(numbers, n => n * 2);
positive := filter(numbers, n => n > 0);
```

A single local parameter name precedes the arrow; parentheses would support zero or multiple parameters, as in `() => 42` and `(a, b) => a + b`. Both expression and block bodies are possible. Parameter bindings and the start of a function are visible at the implementation site. This introduces an arrow token and needs expression-boundary/precedence rules.

### B. Parenthesized fn with optional annotations

```text
myfn = fn (a) { a + 1 }
doubled := map(numbers, fn (n) { n * 2 });
positive := filter(numbers, fn (n) { n > 0 });
```

The 2026-10-24 clarification supersedes the earlier retirement of this form. It has exactly the same semantics as `(parameters) { body }`; retaining `fn` is an explicit function marker, not another inference mode. Both spellings accept contextual, annotated, or default-inferred ordinary inputs and known-input local result inference. Without an expected input contract, `fn (x) { x * 3 }` and `(x) { x * 3 }` have the same unresolved input type; adding the keyword does not infer an arbitrary numeric/generic contract.

### C. Arrow-free lambda: parameter list followed by a block (current direction)

```text
myfn = (a) { a + 1 }
doubled := map(numbers, (n) { n * 2 });
positive := filter(numbers, (n) { n > 0 });
```

The current direction omits `=>` completely and reserves a parameter-list-plus-block shape for lambdas in ordinary expression positions. It is the corresponding parenthesized `fn` literal with its keyword omitted, including when annotations establish an independent input contract. It always uses a brace body. A direct assignment ending in that body permits an optional trailing semicolon. Complete parsing and integration with other headers remain to be formalized.

Proposed grammar boundary, not yet a selected complete production:

```text
lambda := "(" [lambda_parameters] ")" [":" type] block
lambda_parameter := identifier [":" type]
```

This simple version supports `() { ... }`, `(a) { ... }`, and `(a, b) { ... }` under expected callable contracts, or independent inputs when annotations or ordinary defaults establish their types. The user selected the empty contextual header as no local input bindings, not a zero-arity declaration; its actual callable signature comes from the expected contract. A one-position receiver header needs no singleton comma because it is syntactically a header. Simple trailing rest receivers now follow the array-tail extension; complete nested patterns still need integration with the eventual grammar; ordinary tuple patterns are unchanged.

Capture-header syntax and semantics are [pinned for later](deferred-contexts.md). Earlier `[offset]` and `[var offset]` examples remain in the deferred closure review; they are not part of the current lambda grammar outline.

#### Optional lambda signatures

Lambda parameter and result annotations are optional; this direction is selected. Being a lambda does not require omitting annotations. Reuse the ordinary colon notation, with optional annotations on each named parameter and after the closing parameter parenthesis:

```text
/* Expected callback contract: fn (item: Int): Int */
map(numbers, (n) { n * 2 });
map(numbers, (n: Int) { n * 2 });
map(numbers, (n): Int { n * 2 });
map(numbers, (n: Int): Int { n * 2 });
```

The expected callable contract supplies omitted types. Explicit annotations must satisfy that contract; they do not change an existing binding or callback parameter's declared type. Ordinary value [safe callable value adaptation](callable-value-variance.md) is now selected: implementation inputs may accept more values than a public view permits callers to supply, and implementation results may be narrower than the public result. Other variance/callable compatibility remains open. An explicit fallible result uses the same `T ! E` notation as a full `fn` definition.

With all named input types and the result annotated, the lambda can provide its own signature without an expected callable type:

```text
double := (n: Int): Int {
    n * 2
}
```

Clear local result inference is selected below; inference of unknown input types from arbitrary body operations remains open. The empty contextual header `()` still leaves expected inputs unnamed: adding a result annotation, as in `x = (): String { "replacement" }`, does not redefine `x` as zero-arity. Without an expected callable type, an empty header declares zero inputs; see [independent empty headers](#empty-headers-without-an-expected-callable).

Typed lambdas and typed `fn` expressions are now explicitly one model: `fn (n: Int): Int { n * 2 }` and `(n: Int): Int { n * 2 }` provide the same input/result contract and implementation behavior. Neither spelling is removed. The keyword remains necessary for headerless and whole-pack forms; omitting it from `fn { ... }` would leave executable braces, and omitting it from `fn pack { ... }` would overlap record construction.

Rust provides a direct reference for optional closure signatures: `|n: i32| -> i32 { n * 2 }`, with parameter annotations and an optional result annotation. See [Rust closure expressions](https://doc.rust-lang.org/reference/expressions/closure-expr.html), checked 2026-10-21. LiteScript's proposed delimiters and result colon retain its own notation.

#### Independent lambda result inference

Selected rule: a nonrecursive local function literal, with or without `fn`, can infer its unambiguous result type from the body once all input types are known. An expected callable contract can also supply omitted parameter and result types. A receiver type is therefore one source of the contract, not a requirement when annotations or ordinary defaults already establish the inputs.

```text
double := (n: Int) { n * 2 }
/* Inferred signature: fn (n: Int): Int */

constant := () { 42 }
/* Inferred signature: fn (): Int */

greeting := () { "hello" }
/* Inferred signature: fn (): String */

empty := () {}
/* Inferred signature: fn (): Unit */

operation := (x: Int) { x * 3 }
/* One Int input, inferred Int result; fn (x: Int) has the same inference */

operation := (x: Float): Float { x * 3 }
/* Alternative definition: explicit input/result, checked by ordinary numeric rules */
```

Permit this result inference for nonrecursive local lambdas. Use the existing body-result rules: normal completion comes from the final item, an empty body or final declaration/assignment produces Unit, and explicit returns must satisfy the resulting type constraints. Require an annotation when the result cannot be determined unambiguously. Distinct completion payload types form a normalized plain union under the selected rule below.

Keep the scope narrow: input types must already be established by annotations, an expected callable, or selected ordinary parameter defaults. This does not select generic inference for `(n) { n * 2 }` without such information. Recursive result inference, no-normal-completion types, and public/stable API signature policy remain separate. LP-0012 now permits eligible omitted outputs to infer escaping returned errors. Explicit/expected output contracts remain constraints and cannot silently gain failures. Result-valued bodies and nested Result boundaries retain their separate rules.

Requiring an expected result type or a written result annotation for every independent local lambda was considered and not chosen.

Rust supports closure result-type inference, for example `let double = |n: i32| { n * 2 };`; see [inferring closure types](https://doc.rust-lang.org/book/ch13-01-closures.html#inferring-and-annotating-closure-types). Zig's ordinary function declarations explicitly write a return type, such as `fn double(n: i32) i32 { return n * 2; }`; see [Zig functions](https://ziglang.org/documentation/master/#Functions). These are contrasting annotation policies, not a claim that Zig has LiteScript-style lambda syntax.

#### Mixed local result types

Selected rule: when a nonrecursive local lambda has known input types and no explicit or expected result contract, infer the normalized plain union of its completion payload types.

```text
choose := (flag: Bool) {
    if flag { return 1 }
    "none"
}
/* Inferred signature: fn (flag: Bool): (Int | String) */
```

The explicit return supplies Int to the lambda, while normal completion supplies String. Both contribute to its inferred result. The guard's exiting branch does not itself produce a local conditional value. Returns belonging to a nested callable do not contribute to the enclosing lambda's result.

Use the existing plain-union normalization: duplicate types disappear and nested plain unions flatten. Int and Int therefore infer Int; Int and String infer Int | String. Preserve composite structure, nominal identity, and Result boundaries; this does not merge Result layers or infer a new escaping error channel. Numeric compatibility remains governed by its separate rules.

Explicit and expected result contracts remain constraints. An expected Int result rejects a String completion rather than widening to Int | String. The programmer may still write the union explicitly:

```text
choose := (flag: Bool): (Int | String) {
    if flag { return 1 }
    "none"
}
```

Genuine Unit completion payloads participate like other types. A no-`else` conditional is noncontributing; a declaration default uses zero(T) and does not add a Unit alternative. Paths that leave by failure or another exit without producing a lambda result do not add a result payload type. Eligible omitted outputs now infer escaping returned errors under LP-0012; explicit/expected outputs still constrain the body and exclude undeclared errors.

Requiring an explicit or expected union for distinct local completion payloads was considered and not chosen. A changed completion payload can change the inferred local result; an annotation can pin the contract. This decision concerns lambda completion payloads. [Conditional and match results](branch-result-inference.md) now use the same selected normalized-union inference when no expected result contract supplies their type. Recursive inference, context/capture work, and union representation remain separate.

Reference comparison, checked 2026-10-21: [Rust if expressions](https://doc.rust-lang.org/reference/expressions/if-expr.html) must have one type across their outcomes; Rust does not form a plain Int | String union for mismatched branches. [TypeScript's inference documentation](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#return-type-annotations) describes inferred function results, and its [union examples](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) include an inferred number[] | string result. LiteScript selects union formation for the local lambda completion case described above.

#### Named, underscore, and empty headers

The user compares three implementation headers under the existing `x: fn (a: Int): String` contract:

```text
x = (a) {
    "replacement"
}

x = (_) {
    "replacement"
}

x = () {
    "replacement"
}
```

In the contextual lambda, `(a)` binds the input as a local `Int` named `a`. `(_)` binds the input as the ordinary readable `Int` name `_`, explicitly permitting nonuse. It is not a discard pattern and does not remove the input from the callable contract; see [unused-name intent](unused-name-intent.md). Both bodies return `String`, and trailing item semicolons remain optional.

With an expected callable type, the empty header `()` retains its entire signature and binds none of its inputs locally. For this `x`, the implementation remains `fn (a: Int): String`: the one `Int` input is accepted without a local parameter name, and the body must produce `String`. The original signature's name `a` is not implicitly introduced into the implementation body. A zero-parameter expected signature also admits the empty header. Without an expected callable type, the empty header declares zero inputs.

Calls retain their normal input evaluation, passing, permission, and cleanup contracts even when the implementation leaves inputs unnamed. This does not make caller argument expressions optional or skip their effects. Omitted call arguments still require applicable explicitly declared defaults. Nonempty lambda headers may likewise leave trailing inputs unnamed, as specified below. These rules do not revise explicitly declared callable parameter lists or choose general standalone inference without an expected contract.

#### Empty headers without an expected callable

Selected rule: preserve the expected input contract when one exists; otherwise an empty header declares zero inputs.

```text
constant := (): Int { 42 }
/* Independent signature: fn (): Int */

ignore_input: fn (n: Int): Int = (): Int { 42 }
/* Established contextual rule: one Int input, no local input binding */
```

`constant()` returns 42, while `ignore_input(7)` accepts its Int input and returns 42. These are fixed input contracts, not a variadic callable or a runtime decision about how many arguments to accept. Ordinary omitted-argument defaults remain separate. General compatibility/conversion of already-created callable values is not decided here.

Requiring an expected callable type for every empty-header lambda was considered and not chosen. Local body-result inference has its own selected rule above; unknown input types and recursive result inference remain open. Nonempty contextual header omission has its own selected rule below.

Rust's zero-input closure spelling is `|| { 42 }`, with an explicitly empty parameter list; see [Rust closure syntax](https://doc.rust-lang.org/reference/expressions/closure-expr.html). LiteScript's already selected contextual `()` rule is a separate convenience that preserves expected inputs.

#### Partially named input headers

An expected callable may have more inputs than the lambda body needs:

```text
/* Expected contract: fn (left: Int, right: Int): Int */
combine: fn (left: Int, right: Int): Int = (left) { left * 2 }
```

Selected rule: allow omitted trailing names. A nonempty header binds a positional prefix of the expected inputs. Here left binds the first Int; the second input remains unnamed. `()` is the zero-name case of the same principle. The callable still has the expected two-input signature. Writing `(left, _) { left * 2 }` is also legal, but naming the trailing position is not required.

Use `(_, right) { right * 2 }` when the second input is needed and the first is unused. Parameter bindings are positional; a lone `(right)` does not select the expected parameter by matching its name. `_` remains the ordinary readable name with permitted nonuse, not a discard wildcard. More binding positions than the expected input count are rejected.

All expected inputs retain their argument evaluation, permission, passing, and cleanup contracts. This applies equally to the corresponding `fn` implementation. Its implicit `arguments` still describes the full input tuple. This does not remove inputs from the public signature or decide compatibility of already-created callables. Complete parameter patterns, stored-function adaptation, and general type compatibility remain separate. Requiring every nonempty-header position was considered and not chosen; describing receivers as tuple unpacking does not silently reverse that selected prefix rule.

TypeScript permits callbacks with fewer declared parameters than the target signature, explicitly motivated by APIs that provide extra inputs such as indices; see [comparing functions](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#comparing-two-functions). Rust requires matching argument counts for its callable-trait contracts; see [E0593](https://doc.rust-lang.org/error_codes/E0593.html). LiteScript's header-prefix rule applies while constructing a lambda under an expected contract and does not import all TypeScript function-assignment rules.

#### Parsing boundaries

- In an ordinary expression position, `(a) { ... }` is one lambda expression. `(a)` alone remains grouping; this proposal does not reinterpret every parenthesized expression as parameters. A grouped value followed by a separate executable block needs an item separator: `(a); { ... }`.
- A construct's own header/body delimiters take precedence: `if (condition) { ... }` remains a conditional and `loop (source) { ... }` remains a loop. The eventual expression grammar must stop these header expressions before their owner's body instead of consuming that body as a lambda. This restriction needs explicit integration in other brace-owning headers as well.
- Parsing must depend on tokens and syntactic position, not whitespace, expected types, or whether `a` resolves to a type. This reserves `(T) { ... }` for the lambda reading in an ordinary expression position too; it cannot also mean construction through a grouped record type. Existing `T { ... }` construction and grouping the entire construction, `(T { ... })`, retain their separate forms. See [record boundaries](record-literal-boundaries.md).
- Inside a call argument, the lambda body does not close the enclosing call item. Argument commas and ordinary call-item separators still apply. This proposal does not add trailing-block call arguments.

An expected callable supplies omitted types; annotations can instead establish independent inputs, with local body-result inference. A nonempty header creates local parameter bindings. A lambda parsed in a noncallable destination is rejected, not reinterpreted as immediate work or record construction. The body is deferred until invocation and uses ordinary function result/return rules. Omitting `fn` does not choose capture representation, allocation, or a different calling convention. Complete the grammar boundaries above for this direction. Arrow and pipe alternatives remain unselected comparisons.

### D. Arrow inheriting parameter names from the signature

```text
myfn = => a + 1;
myfn = => { a + 1 }
```

The expected signature supplies both parameter types and the name `a`. The arrow marks a function boundary with little repeated syntax. This makes signature parameter names significant to implementation scope: renaming them or introducing a same-named enclosing local needs a precise rule. In map/filter calls, the programmer would need the callback parameter names supplied by the API, or a separately designed implicit-name convention. Parameter-name identity in callable types is still open.

A further reduction, `myfn = { a + 1 }`, also inherits parameter names and would make expected type decide whether ordinary executable braces describe immediate work or a deferred function body. That would need an explicit revision to the current block rules and is not the recommended starting point.

### E. Pipe-delimited local parameter names

```text
myfn = |a| a + 1;
myfn = |a| { a + 1 }
doubled := map(numbers, |n| n * 2);
positive := filter(numbers, |n| n > 0);
```

This follows the visible shape used by Rust and V, with Rust's ability to use it for assignment as well as callback arguments. It offers one parameter-list shape for one or several names, without a new arrow token. A zero-parameter spelling such as `|| 42` needs review against existing tokens. LiteScript already uses `|` in type unions, so typed parameter syntax, delimiters, and expression precedence need a precise grammar. Local names remain explicit; expected types do not inject names into scope.

B and C are the keyword-present and keyword-omitted spellings of one selected callable-literal model. A, D, and E remain unselected comparisons. V-style implicit `it` can be evaluated separately if collection-specific shorthand is needed; the selected general implicit input name is the whole tuple `arguments`. The illustrative map/filter APIs provide expected callback contracts; their library and generic declarations are not selected by these examples.

All candidates use ordinary function result and return rules. Lambda annotations may provide their own types, or an expected callable contract supplies omitted types. Callable/environment context design is [postponed](deferred-contexts.md); unknown-input inference, recursive result inference, and complete compact-expression grammar remain open.

## Call evaluation order

Evaluate the callee expression first, then the supplied argument expressions from left to right in source order, then invoke the callable. A function argument is not evaluated before an earlier supplied argument merely because of parameter type, dispatch, or optimization. Ordinary value arguments follow the selected copy default, with no implicit references; type-specific eligibility, explicit access modes, and temporary lifetimes remain separate. See [evaluation order](evaluation-order.md).

## Zero-initialized callables

A zero-initialized function performs no user-body or default-expression work and returns zero of its declared result type. For ordinary inputs the public contract allows omitting, it needs no actual default definition; zero(TP) is a safe conceptual value, without mandated parameter materialization. A possible internal non-public unvalued state remains a future discussion, not public undefined semantics. See [zero-callable omission](callable-default-contracts.md#zero-callable-omission-selected). For example, a callable declared to return `Int` returns `0`; one returning `T ! E` returns `.ok(zero(T))`.

In `callback(make_value())`, if `callback` is zero-initialized, `make_value()` still evaluates before invocation. The ordinary callee/argument evaluation order and required ownership/cleanup rules apply. The zero callable itself makes no updates through granted `mut` or `var` parameters. Argument evaluation or required cleanup can still have effects or failures.

This selects invocation semantics. Complete callable type grammar, ownership and cleanup details, representation, and ABI remain open; see [zero-initialized functions](zero-initialization.md#zero-initialized-functions).

## Collection input requirements

Simple collection functions should not require beginner authors to know protocol names. The [inference proposal](collection-inference.md) explores fn (icons) with reusable requirements inferred from the body, plus contextual construction of collection elements. Generalization, public signatures, and any short annotation remain open; omitting a parameter type does not yet select a generic mechanism.

The [signature proposal](collection-function-signatures.md) separates required input behavior from guaranteed output behavior, inferred inputs from explicitly complete contracts, and static abstract returns from runtime-erased values. A common contract alone does not preserve concrete input/output identity or choose a stored representation. The [operation-contract model](collection-operation-contracts.md) resolves loop/bracket sugar statically and distinguishes unsupported operations from supported operations returning typed failures.

The user-selected direction is to constrain collection inputs by the operations required, not their provider type or compile-time size. Conceptually, fn (icons: `Iterable<Icon>`) can traverse compatible list, array, set, slice, or generated sources without requiring a List conversion. The angle-bracket/interface notation is provisional and does not mandate boxed runtime dispatch. Sized, repeatable, indexed, or contiguous requirements belong in a signature only when needed. Cursor consumption, yielded access, and retained-source lifetimes must remain explicit in their eventual contracts. See [collection abstractions](collection-abstractions.md) and [capabilities](collection-capabilities.md).

## Parameter mutation contracts

The selected [placement rule](mut-qualifier-placement.md) is user: mut User for typed parameters. It replaces the earlier name-prefix spelling while preserving the mutation contract.

Parameters provide read access by default. Qualify the affected parameter's type with mut to request writable access:

```text
rename := fn (user: mut User, name: String): Unit {
    user.name = name
}
```

The example assumes `name` is an accessible writable field in the implementation context. The operation requires writable access to `user`; it only reads the replacement `name` parameter. Each affected receiver or parameter needs its own `mut` marker. A read-only argument cannot satisfy a writable-access requirement.

The same rule applies to a method's receiver binding. The complete method notation and whether it uses an explicit `self` parameter remain open. The Kotlin-inspired `List.push_front := fn(self, ...)` candidate and its many open questions are recorded in [method declaration syntax](../investigations/INV-030-method-declaration-syntax.md); neither that spelling nor `self` as a receiver is selected. There is no additional `mut fn` or other function-level mutation marker.

The declaration `mut rename := fn (...) { ... }` would instead describe writable access to the held function value. It does not replace the mutation contracts on the function's parameters.

Calling a mut-qualified parameter requires an explicit grant, as in rename(mut userVar, "Ali"). The caller must already provide mutable access. Updates affect that supplied data; the compiler must not silently mutate a detached copy or upgrade a read-only argument. This selects temporary writable caller-data access for mut parameters. General aggregate and other-type read-only input transfer, complete alias/lifetime rules, capture permissions, and purity remain open; see [caller grants](caller-mutation-grants.md).

[Var parameters](slot-parameters.md) provide temporary access to a caller-supplied location: assignment through the parameter replaces the supplied variable or field. The explicit call grant replace(var value) requires a compatible writable location; a whole-binding argument must be var. Var alone grants no payload mutation. General reference values, public pointers, and complete compatibility/alias rules remain open.

The [ordinary parameter review](parameter-values-and-slots.md) selects a general rule: ordinary values are copied, including call inputs and ordinary explicit/implicit return results; no implicit references are introduced. Existing var and mut inputs explicitly grant caller-location or writable-payload access. Copy semantics preserve evaluated values, aggregate components, and active union/enum values; already-declared reference fields keep their shallow targets/permissions. See [the general copy default](parameter-values-and-slots.md#general-copy-default-selected) and [result copies](parameter-values-and-slots.md#ordinary-return-values-are-copies-selected). This imposes no physical-copy ABI: registers, indirect passing, direct result construction, or copy elimination must preserve observable value behavior and valid copy effects. Copyability/eligibility, future explicit reference-copy modes, reference syntax, memory safety, ownership/lifetimes, aliases, and resources remain deferred. The earlier type-specific examples illustrate the general rule rather than leaving other ordinary inputs open to implicit borrowing.

For explicit var caller-location grants, validate current readable possibilities against the callee input and every permitted replacement against the caller's declared writes. Var String is read/write String, so it rejects a current Int; an accepted String-only call leaves String, while a wide replacement call can widen Int to String | Int. This is not output-only access or a required-write promise. Write-only access is deferred; see [call replacement flow](call-replacement-flow.md).

A received var parameter may be forwarded to one nested call by explicit var argument syntax. This temporarily hands off the same source write grant: the outer holder is suspended during nested active access and regains the same location on normal return. Read/write compatibility and authority remain bounded by the outer received contract, with no extra local var, detached copy, duplicated grant, or escaping reference. See [nested forwarding](call-replacement-flow.md#nested-forwarding-of-a-write-grant-selected); activation/callback/reentrancy policy remains separate.

The [access-ergonomics goal](slot-ergonomics.md) hides derived mathematical type structure. Use local declarations and shadowing for working values: fn (count: Int) { var count := count; count += 1; count }. Left-side local-only var headers are omitted; type-side var declares caller replacement. The shorthand fn (param: var) requires an inferable value type under the eventual inference rules. See [var access](var-access-qualifier.md) and [parameter permissions](parameter-permissions.md).

Basic var T callable parameters are invariant in their resolved read/write value type; label renaming cannot bypass that rule. Individual caller-location admission still uses current readable facts and declared accepted writes, rather than requiring identical caller storage declarations. This selects no mut variance or future write-only mode. See [var T callable invariance](callable-value-variance.md#var-parameters-keep-their-value-type).

## Result rules

The body's final expression supplies normal completion. A final declaration or assignment produces `Unit`. Trailing separators after an ordinary body item change nothing. A completed function/lambda definition or assignment already ends at its closing body: omit the optional trailing semicolon, including inside another block. A callback body inside a call does not end the enclosing call item; retain that call's required separator. See [blocks and results](blocks-and-results.md) and the [shared semicolon rule](lexical-structure.md#semicolon-style-after-closing-braces).

```text
greet := fn (name: String): Unit {
    print("Hello, " + name)
}
```

## Early return

```text
validate := fn (value: Int): Int ! ValidationError {
    if value < 0 {
        return .err(ValidationError.Negative)
    }

    value
}
```

Early returns are encouraged for guards and invalid cases. Explicit final `return` was recommended to remain legal, rather than adding a prohibition with little semantic benefit. Whether a formatter or linter expresses a preference is open.

`return` is control flow, never a parser's ambiguity-breaking hint.

## Recovering at a call

A fallible function exposes a statically typed recoverable error contract. A caller must explicitly handle/inspect the outcome, provide a default, or propagate the error before using the successful payload. Keeping the returned outcome as a `Result` for later handling does not unwrap it. Implicit success construction inside a fallible function does not grant automatic propagation at its callers.

Postfix `operation()!` extracts success or forwards its recoverable error from the nearest function or closure. Member access and calls can continue directly, as in `load_user(id)!.load_profile()!.name`; see [propagation and call chaining](propagation-and-chaining.md). Use `operation() else(error) { ... }` for a local fallback or explicit exit. Without handling or extraction, the call retains its Result as ordinary data. Every escaping recoverable error must fit the established explicit, expected, or eligible inferred outward error contract. An explicit or expected output promising no recoverable failure cannot silently gain one through inference; an omitted output may infer its error side under LP-0012. One outer propagation marker must not silently extract all intermediate Results in a chain.

The recovery receiver may be omitted: `operation() else { fallback }`. Both recovery forms combine success type `T` and normal fallback type `D` as `T | D`. A fallback need not have the same type as the original success. Returning that union still needs to satisfy the enclosing function's declared return type.

Fallible return annotations use `T ! E`; `T!` is shorthand for `T ! Error`. The general form declares broad recoverable failure, while the explicit error type can retain a refined contract. A return annotation `T` still declares no recoverable error channel. The exact general Error contract remains open.

Local handling does not require a catch boundary around unrelated statements. Complete expression precedence, error conversion rules, and ignored-outcome diagnostics remain open; see [result and errors](result-and-errors.md). [Panics](panics.md) use a separate path. Existing arithmetic examples illustrate success paths and do not settle whether ordinary operators expose recoverable errors or another checked-fault policy.

## Closures

```text
double := fn (x: Int) {
    x * 2
}
```

The same body-result rule applies to anonymous functions. A plain `return` inside a closure exits that closure, not the function that created it. Capture/context design is [postponed](deferred-contexts.md), with earlier capture-header ideas retained for later review.

## Implicit live panics are not callable effects

Selected [LP-0018 r1](proposals/LP-0018-implicit-panics-without-effect-declarations.md): ordinary array access, arithmetic, and helper calls do not force live panic alternatives into function signatures. Checked panic-effect declarations and exhaustive inferred live-panic lists are prohibited. A function annotated T returns T even though a supported live panic may propagate implicitly. A normal T ! E outcome exposes returned errors, not an exhaustive list of live panics.

A function deliberately returning captured T ! Panic data literally returns that outcome; an ordinary call receives T ! Panic. No type-based rule strips Panic from a return annotation and silently supplies T. Explicit ? capture produces broad Panic for newly captured live occurrences and is legal again on stored outcomes under LP-0016. Known-fault documentary annotations may be investigated, but cannot alter callable compatibility or prove panic freedom. Specific panic category definitions/construction/matching remain available. See [panics](panics.md#no-checked-panic-effect-declarations) and [outcome returns](result-and-errors.md#implicit-live-panics-and-explicit-outcome-returns).

## Manual failures and inferred errors

LP-0012 selects custom failure capability and eligible omitted-output error inference. [LP-0014 r1](proposals/LP-0014-directed-failure-exits.md) now makes raise failure / raise ...failures a nearest-function/closure failure exit for both Error and Panic; explicit @outer instead selects a named enclosing block. Error/Panic chooses the outgoing channel. Input-established nonrecursive bodies without explicit/expected outputs infer normal success and escaping returned errors from raises, .err returns, !, and outward fallible tails. A tagged Error raise recovered locally does not escape and adds no outward E. Implicit panics, handled/local stored errors, and nested uninvoked bodies remain excluded. Explicit/expected outputs remain constraints. See [manual failures and inference](manual-failures-and-inference.md).

## Early returns from recovery and result inference

[LP-0015 r1](proposals/LP-0015-early-return-recovery-paths.md) selects ordinary early-return behavior inside captured recovery. A handler's return 1 contributes to the enclosing function's normal success contract, not the recovery expression's continuing success type. The recovery declaration is never initialized on that exiting path. Its residual failure type is computed on continuing paths only. Unmatched captured errors/panics in the abandoned expression are not implicitly forwarded and do not force an extra error declaration or rejection for that path. Explicit/expected function success contracts still check the returned 1; other paths may independently expose outward failures. Handler-local tagged completion, new live failures, and cleanup retain their own rules. See [the tmp1/tmp2 example](expression-recovery.md#early-function-returns-and-continuing-path-types).

## Deferred-body lookup

Selected direction, 2026-10-28: a function body may refer to identifiers declared
later in its enclosing code block. Creating a function value does not execute
its body. When invoked, the body's executable blocks still run top to bottom;
ordinary eager expressions inside them do not acquire general forward lookup.
This direction applies equally to full function literals and lambda spellings.

The exception concerns a deferred body, not early availability of its containing
binding. Calling an ordinary function-valued binding before its initializer is
not permitted by the exception. Nor does future-name visibility authorize reading
an uninitialized value or implicitly run a later initializer early.

```text
op := fn(): Int { tmp2 }
tmp1 := op();
tmp2 := 1;
```

The body may name tmp2, but its attempted read occurs before tmp2's initializer
has run. Safe execution cannot supply 1, an invented zero, or unspecified bytes
as that read's value. The later static-first selection below rejects this
evident early read at compile time.
Calling after initialization removes this particular ordering problem, subject
to the remaining binding, inference, and environment contracts.

Nested-scope forward lookup, self-name collisions and mutual recursion,
initialization proofs through calls/callbacks, and inaccessible/cyclic future
definitions remain open. Capture representation, ownership, and escaping
lifetimes remain deferred; no public capture-parameter or checked panic-effect
list is introduced. See [INV-003.02](../investigations/INV-003-02-declarations-and-lookup.md).

### Existing bindings survive later shadowing

Selected **2026-10-29**, for surrounding references admitted by the applicable
access/capture rules: a free reference in a deferred function body retains
the binding already visible under ordinary lexical lookup where that function
is defined. A later same-name declaration in the defining scope creates a new
binding; it does not redirect that reference. Deferring execution does not erase
source order for binding selection.

```text
value := 1;
read_value := fn(): Int { value }
value := 2;
answer := read_value(); /* 1 */
```

This selects binding identity, not permission for implicit surrounding-local
capture. The live-read rule below defines when an admitted reference reads the
binding's value; deliberate value copies retain their ordinary behavior.
The permitted surrounding-access surface is under reconsideration in
[INV-003.02](../investigations/INV-003-02-declarations-and-lookup.md#surrounding-access-reconsideration-2026-10-29).
Mutation, retention, and escaping lifetimes keep
their separate contracts. The forward-reference direction applies when no
appropriate earlier binding is visible; the same-block rule below selects its
first subsequent declaration. Nested-scope lookup, self-name collisions, and mutual recursion
remain open. Ordinary local bindings
inside the function body still follow their own sequential lexical scope.

### First later binding in the defining block

Selected **2026-10-29**: for an admitted deferred-body reference with no earlier
lexical binding target, select the first subsequent same-name ordinary binding
declaration in the defining executable block. Keep that binding identity;
later shadows and call positions do not redirect the reference. This selection
is the same for callable-valued and other ordinary bindings.

```text
read_value := fn(): Int { value }
value := 1;
a := read_value(); /* 1 */
value := 2;
b := read_value(); /* 1 */
```

Do not hoist the selected initializer. A call that reaches the binding before
initialization is subject to the initial static-enforcement rule. An earlier
visible binding, including an initialized zero callable, is retained under the
preceding rule instead of falling through to a later declaration.

The direct self-reference rule below handles the declaration currently being
initialized before falling through to strictly later declarations.

This selects the demonstrated same-block case. Nested-scope search, declarations
inside separate conditional regions, self-name collisions,
and module declaration resolution remain separate questions. Surrounding-access
eligibility and lifetime requirements still apply; visibility alone is not a grant.

### Direct self-reference without an earlier target

Selected **2026-10-29**: when a direct function-valued declaration has no earlier
visible same-name binding, its own name is available in its deferred body.
This includes the following established-input/result function-literal case:

```text
countdown := fn(n: Int): Int {
    if n == 0 { 0 } else { countdown(n - 1) }
}
answer := countdown(3); /* 0 */
```

The self-reference selects this binding rather than a strictly later shadow.
No separate signature-only declaration or handwritten header is required. The
function value must still be initialized before a call can execute; making the
name resolvable in a deferred body does not permit an eager uninitialized read
in its initializer or change top-to-bottom execution.

This selects the shown no-earlier-target case. Ordinary named references keep
ordinary lexical lookup when an earlier same-name binding exists; the explicit
self-call form below identifies the current implementation instead. Recursive
result inference, mutual recursion, and remaining callable storage/escaping
lifetime rules remain open. Full and keyword-omitted lambda
spellings retain their shared function-body model where the signature is
established. Surrounding-value eligibility remains separate.

### Explicit current-function self calls

Selected **2026-10-29**, recorded 2026-10-30: self(...) explicitly calls the
function implementation currently executing, with its current implementation
environment. It does not resolve an ordinary binding by the function's name
or reread the live contents of that original binding.

```text
step := fn(n: Int): Int { n * 2 }
step := fn(n: Int): Int {
    if n == 0 { 0 } else { self(n - 1) }
}
answer := step(3); /* 0 */
```

In this example, self calls the second implementation recursively. Replacing
self(n - 1) with the ordinary step(n - 1) instead selects the earlier visible
step binding and gives 4. A later shadow or permitted replacement of the source
binding cannot redirect an explicit self call from the implementation executing.

This is an ordinary function call, with ordinary argument evaluation, type and
access checks, result checking, and failure/cleanup behavior. It is not a loop
transfer, a tail-position-only construct, or a tail-call optimization guarantee.
No handwritten header or extra declaration is needed. The already selected
implicit own-name case with no earlier target remains available; self is not
made mandatory for every recursive function by this selection.

The selected form is self(...). A standalone first-class self value, storing or
returning it, other invocation spellings, parameter/local name collisions,
global versus contextual keyword reservation, and full nested/outer-function
target rules remain open. No object-receiver meaning is selected. This does not
make functions tag targets or grant unrelated surrounding-value access.

### Live reads of admitted surrounding bindings

Selected **2026-10-29**: when surrounding binding access is permitted, a deferred
function body reads the current value of its original lexical binding when the
body evaluates that name. Do not silently snapshot the value at function
creation. An = replacement of a var binding can therefore change what a later
body evaluation reads; a later := shadow does not redirect the reference.

With both double declarations marked var in INV-003.02's mixed replacement/
shadow probe, x1, x2, x3, and x4 are respectively 0, 4, 4, and 16. The original
binding changes from the zero callable to times-two; the newer shadow and its
times-four replacement are different storage.

This does not turn saved := double into a storage alias: that ordinary value
initializer copies the callable value when it runs. Using a separate fixed
saved binding can express deliberate value freezing where its use is admitted.
That freezes the callable value, not transitive mutable state in its own
environment; ordinary copying does not become deep cloning.
No new snapshot/capture-header syntax is selected.

Preserve [callee-before-arguments evaluation](evaluation-order.md#function-calls).
Each call reads/selects its callee once before evaluating supplied arguments.
If argument evaluation is permitted to replace the source binding, the already
selected callable remains the callee for that invocation. A nested call can
read a newer value; the outer call is not reevaluated afterward.

Eligibility/permissions for surrounding values, capture representation,
ownership, retention, and escaping lifetimes remain open. Live reads are not
blanket permission to capture local state or to use an uninitialized/expired
binding. Required safety must be established under the initial static-first
direction; unknown access is not assumed safe. The implementation environment
can remain private without adding its fields to the public callable inputs.

### Surrounding access under review

The 2026-10-29 discussion requires a defined eligibility policy for surrounding
values, even read-only uses, while preserving ordinary helper calls. It does not
select a blanket ban on outer names or unrestricted implicit local capture.
Lookup/binding identity and permission to retain surrounding runtime state are
separate questions.

A statically resolved noncapturing helper can be called without retaining an
enclosing stack environment. A runtime-selected callable or a helper carrying
state may need different rules. Constant/type/module lookup is also distinct
from capturing a runtime local. Each case must preserve scope, initialization,
copy/access, and eventual lifetime contracts; assignment of a callable alone
does not settle any of them. Exact permitted categories and capture syntax
remain open in INV-003.02.

### Initial static enforcement

Selected starting direction, **2026-10-29**: reject a call at compile time when
its reached body would read a binding before initialization. In the initial
supported subset, also reject a call when its initialization safety cannot be
established. Distinguish a demonstrated early read from insufficient proof in
diagnostics; uncertainty is not evidence that the program would actually fail.

No runtime readiness-check fallback is selected for this subset. Exact proof
rules, conditional/indirect callbacks, escaping functions, and the full language's
long-term policy remain open. Review concrete callback cases before extending
this conservative starting point into a universal rejection rule. This selects
a design requirement, not an implemented analysis, lifetime guarantee, or new
public callable dependency/effect list.

## Recursion and inference

Destructured parameter forms need both surface grammar and a mismatch policy. The [pattern context review](pattern-contexts.md#5-function-and-closure-parameters) recommends patterns irrefutable under the declared parameter contract; no implicit runtime dispatch, skipped call, or new failure channel is selected by writing a parameter pattern.

The [direct self-reference rule](#direct-self-reference-without-an-earlier-target) permits the shown no-earlier-binding recursive definition without a separate header. [Explicit self calls](#explicit-current-function-self-calls) distinguish current-implementation recursion from ordinary named binding lookup. Mutual recursion and full declaration-resolution rules remain open without making arbitrary initialization order implicit. Unannotated parameter inference, public signature requirements, generic constraints, and recursive result inference are still open.

## Tagged exits

`return @tag value` exits a lexically enclosing named construct. It cannot jump across a function or closure boundary. Functions and closures currently use plain `return`; they are not tagged-return targets. Whether a nested function or lambda can return to an enclosing function, and whether a function declaration can carry a tag for visibility or future metadata, are deferred to the nested-function review.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Types and inference](types-and-inference.md)
- [Result and errors](result-and-errors.md)
- [Control-flow exits](control-flow.md)
- [Rust blocks](https://doc.rust-lang.org/reference/expressions/block-expr.html) and [Kotlin functions](https://kotlinlang.org/docs/functions.html) provide comparisons. LiteScript's proposed rule is not a claim that all compared languages handle function bodies identically.
