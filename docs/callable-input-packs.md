# Callable input packs and lambda shorthand

Status: **surface model selected in the 2026-10-23/24 discussion; documentation only, not an implemented parser, type checker, or runtime**. This replaces the distinction between independently typed full functions and contextual-only lambdas, and supersedes the retirement of contextual `fn` expressions. Capture/environment design remains deferred.

## One callable concept

A callable has a typed input tuple and a result contract. Its implementation may use the implicit whole-pack name, give that pack a local name, or bind its components. A lambda is the parenthesized implementation form with `fn` omitted; the keyword does not change inference, invocation, results, or permissions.

```text
operation : fn (Int): Int = fn { arguments.0 * 3 }
operation : fn (Int): Int = fn pack { pack.0 * 3 }
operation : fn (Int): Int = fn (x) { x * 3 }
operation : fn (Int): Int = (x) { x * 3 }
```

These are alternative definitions, not four declarations required for one operation. `arguments` describes the full input tuple of the nearest callable, including inputs left unnamed by its local header. A nested callable has its own input tuple; referring to an enclosing implementation's inputs is a capture question, not implicit forwarding of the outer `arguments`. A whole-pack header names the supplied tuple, not a new scalar parameter named pack. Access alongside component bindings does not grant extra copying, moves, mutation, or escaping storage access. Exact implicit-name shadowing/collision rules and noncopyable whole-pack/component interactions remain open.

The headerless form retains an expected callable's entire input contract. Without an expected input contract, `fn { ... }` and `fn : Ret { ... }` have the empty input tuple, Unit. An unresolved whole-pack name or named component must not silently become Unit or an unconstrained variadic input.

## Input signatures and the singleton boundary

The subsequent [tuple-type/array-tail decisions](tuple-array-shapes.md) extend signatures with `fn (...Params1, ...Params2, ...rest: T): Return`. Type spreads construct the fixed inputs with label overriding; a declared final variadic segment collects an array of T. Each additional input has type T, including tuple-valued T. This is not specialization to a different fixed tuple per argument count. Runtime-array spelling and complete routing remain open. Two-colon/empty-slot headers and mandatory-parentheses migrations were discussed but not selected.

```text
fn (): Ret                  /* empty input tuple */
fn (Int): Ret               /* one unnamed Int input */
fn (Int, String): Ret       /* two unnamed inputs */
fn (value: Int): Ret        /* one publicly labeled input */
```

In a callable type, parentheses immediately after `fn` delimit the input signature, so `(Int)` here is one input, not grouping of an entire function input contract. The singleton comma is optional in this signature position. A positional component supplies its type directly; a labeled component retains name: Type. In an implementation header, `(x)` likewise binds one input position and `(x: Int)` additionally constrains its type. Local receiver names do not create or rename public labels inherited from an expected callable.

This is a function-header rule, not a change to ordinary tuple values, types, or patterns. Outside that signature/header position, `(value)` groups, `(value,)` constructs a singleton, and `(:Int,)` is the existing unnamed singleton tuple type. Type context parses `fn (Int): Ret` as an input type signature; expression context parses `fn (x) { ... }` as local receiver bindings. Capitalization or successful type lookup must not reinterpret a receiver identifier as a type-only parameter. A tuple-valued component stays one input; it is not flattened because its implementation names or inspects its nested fields. Complete recursive callable input-type and header-pattern grammar remains open.

The previously selected contextual receiver rules still apply: an empty header binds no local names while retaining expected inputs, and a nonempty header may bind a positional prefix. Without an expected callable, an empty header means zero inputs. Binding a known tuple's components does not itself replace those rules with exact-coverage pattern matching. Simple trailing rest receivers now follow the array-tail extension. General nested header patterns and any replacement of prefix binding by exact destructuring require a separate decision; ordinary body-local tuple patterns retain their exact-coverage rules.

## Where the contract comes from

Input shape and component types must be established by annotations, an expected callable type, or both. Once inputs are known, a nonrecursive local implementation may infer its result from its body. An explicit or expected result remains a constraint.

```text
operation := (x: Int) { x * 3 }
operation := fn (x: Int) { x * 3 }
/* alternative definitions; one Int input and an inferred Int result */

operation := (x: Float): Float { x * 3 }
operation := fn (x: Float): Float { x * 3 }
/* both have explicit Float input/result, checked by ordinary numeric rules */

operation : fn (Int): Int = (x) { x * 3 }
operation : fn (Int): Int = fn (x) { x * 3 }
/* both receive the same expected contract */
```

Neither `operation := (x) { x * 3 }` nor `operation := fn (x) { x * 3 }` has an established input type. Their independent acceptance would require the separately open body-based/generic input-inference design. The keyword does not supply that feature. Knowing only a result type also does not determine the input shape or types.

For results, a tail expression contributes its value; an empty body or final declaration/assignment contributes Unit. No explicit return does not imply Unit. Mixed completion payloads keep the selected normalized-union rule. Escaping recoverable errors still require an explicit contract; recursive result inference remains open.

## Syntax identifies a lambda before checking its contract

In an ordinary expression position, `(receivers) [: Result] { body }` is syntactically a lambda. Expected types constrain the recognized implementation; they do not choose between a lambda, grouping, record construction, and immediate execution.

```text
predicate : fn (Int): Bool = (x) { x > 0 }
value : Int = (x) { x > 0 }
/* second declaration is rejected: a lambda cannot initialize Int */
```

Only the parenthesized implementation admits keyword omission. Keep `fn { arguments.0 > 0 }` and `fn pack { pack.0 > 0 }`: bare executable braces already run immediately, and `pack { ... }` overlaps record construction. Construct-owned headers such as `if (condition) { ... }` and `loop (source) { ... }` retain their own boundaries. Bodies always use braces; ordinary item/call separators remain unchanged.

Documentation style: omit the optional trailing semicolon whenever a complete definition, assignment, or other block item ends in `}`, at every nesting depth. Write `op := fn { ... }`, without a following semicolon. The closing body already ends that item. Semicolons remain permitted by the language; braces nested inside a call or other enclosing expression do not end the outer item. See the [shared semicolon rule and necessary separators](lexical-structure.md#semicolon-style-after-closing-braces).

## Application with an existing pack

The callable's intrinsic `.call` applies a tuple of supplied inputs. It denotes invocation, not lookup of an ordinary method value. With no operand, the supplied pack is Unit. Ordinary `f(...)` is invocation sugar that constructs/routes the supplied inputs. Both paths retain the existing named/positional routing, defaults, evaluation, permissions, and cleanup requirements.

```text
op1 := fn { 42 }
op1.call;
op1.call Unit;
op1.call ();
op1();
/* all invoke the zero-input callable and produce 42 */

op3.call params;
op3.call (...params);
op3.call(...params);
op3(...params);
/* same component routing when params is a valid supplied-input tuple */
```

Whitespace never selects a different interpretation. After intrinsic `.call`, parentheses belong to its pack operand: `(params)` groups the existing pack, while `(...params)` constructs a tuple through spread. They are not ordinary method-call argument delimiters. This makes the following boundary deliberate:

```text
pair := (10, 20);
f.call pair;       /* apply the pair's two components */
f.call(pair);      /* same grouped pack */
f(...pair);        /* same component routing */
f(pair);           /* one supplied input containing the pair */
f.call (pair,);    /* one supplied input containing the pair */

operation : fn (Int): Int = fn { arguments.0 * 3 }
operation(4);           /* 12 */
operation.call (4,);    /* 12 */
operation.call(4);      /* rejected: scalar pack operand */
operation.call;         /* rejected: missing required Int input */
```

`f.call ()` supplies zero inputs; `f.call (Unit,)` supplies one Unit input, like `f(Unit)`. An empty supplied pack does not synthesize missing parameters: every unfilled input still needs an applicable explicitly declared default. Pack application preserves labels and routes them like explicit call spread; it does not silently relabel a stored tuple-valued component.

Evaluate the callable first and the supplied pack expression once. Ordinary call sugar evaluates its supplied expressions once in written order before invocation. Superseded contributions, ignored inputs, and zero-initialized callables retain their required effects and cleanup. General `.call` operand precedence, chaining, reserved-member policy, and recursive expression integration remain open; the examples do not select parsing by expected type or whitespace.

## Inline callback probes

Assume each illustrative library operation has a known contract. These do not select standard-library APIs, collection materialization, generic syntax, or capture behavior.

```text
/* filter predicate: fn (Int): Bool */
filter([-2, -1, 0, 1, 2], fn { arguments.0 > 0 });
filter([-2, -1, 0, 1, 2], fn pack { pack.0 > 0 });
filter([-2, -1, 0, 1, 2], fn (x) { x > 0 });
filter([-2, -1, 0, 1, 2], (x) { x > 0 });
/* each selects [1, 2] */

/* map callback: fn (Int): Int */
map([1, 2, 3], (x) { x * 3 });
/* expected mapped values: [3, 6, 9] */

/* fold callback: fn (Int, Int): Int */
fold([1, 2, 3], 0, (total, x) { total + x });
/* expected result: 6 */

/* one tuple-valued item per invocation */
map([(2, 5), (7, 3)], fn {
    pair := arguments.0;
    pair.0 + pair.1
});
/* expected mapped values: [7, 10]; not two callback inputs */
```

A predicate contract checks Bool; an Int result does not become truthy implicitly. An index-aware callback has a different input contract from an item-only callback, even when a local header leaves the index unnamed. Nested callbacks resolve their own input packs. Overloaded/generic destinations must resolve enough of their expected callable contract before omitted input types can be checked; an annotation may be required.

A Python reference model checked 23 expected-value, input-shape, predicate-result, short-circuit, and ignored-input-effect cases during the discussion. It manually supplied callback bodies and contracts. It did not parse these source examples, infer their types, execute LiteScript, or measure performance. These are design probes, not compiler conformance tests.

## Remaining implementation contracts

- Captures remain private implementation state distinct from the public input/result contract; capture syntax, ownership, and lifetimes remain deferred.
- Whole-pack access, component moves, aliases, and temporary mut/var caller grants need a compatible ownership/lifetime model. An ordinary stored value tuple must not manufacture or extend caller-location permission.
- Public labels versus implementation-local names, callable variance/conversions, recursive/generic inference, and complete header/expression grammar remain open.
- A static input tuple need not allocate a heap object or require a runtime label dictionary. Exact copying, dispatch, materialization, ABI, and specialization/code-size costs depend on the eventual compiler and memory model; no performance result is established.

Related: [functions](functions.md), [types and inference](types-and-inference.md), [call routing](named-input-routing.md), [tuple boundaries](tuple-entries-and-access.md), [ordinary parameter passing](parameter-values-and-slots.md), and [deferred captures](deferred-contexts.md).
