# Evaluation order

Status: **left-to-right operator operands and function arguments established; ownership and cleanup details open**.

## Purpose

Make expressions with calls and other observable effects predictable independently of whitespace, while keeping operator grouping separate from evaluation order.

## Operator operands

Evaluate the left operand expression before the right operand expression. Apply this rule recursively to the grouped expression. Operator precedence determines grouping; it does not mean evaluating every higher-precedence expression before the left operand.

Under the selected [basic arithmetic grouping](operators.md#basic-arithmetic-grouping-selected):

```text
left() + middle() * right()
```

with grouping `left() + (middle() * right())`, evaluation is:

1. Evaluate `left()`.
2. Evaluate `middle()`.
3. Evaluate `right()`.
4. Compute the multiplication.
5. Compute the addition.

Multiplication binds more tightly than addition, but left() still runs first. The basic arithmetic ladder and binary left association are selected; exponentiation and the complete expression grammar remain open.

Each executed operand occurrence is evaluated once. `read() + read()` contains two separate calls and executes both; evaluation order does not imply memoization.

The selected [identity leading plus](leading-separators.md#additive-chains-with-leading-plus) adds no evaluation or arithmetic operation. + first() + second() evaluates the same real occurrences and performs the same binary addition as first() + second(); + first() alone evaluates that call once and preserves its admitted value/type. Do not insert/evaluate a zero seed or invoke an extra overload. Leading minus retains negation, while leading * and / gain no redundant-prefix rule. Existing grouping, effects, and failures remain unchanged.

## Function calls

Evaluate the callee expression first, then supplied argument expressions from left to right in source order, then invoke the selected callable.

```text
choose_handler()(first(), second());
```

`choose_handler()` runs first, followed by `first()`, then `second()`, then the selected handler is called with the evaluated arguments. The callee expression is not reevaluated after evaluating arguments.

For a method-call expression, evaluate the receiver as part of evaluating the callee before the other supplied arguments. The complete method/dispatch notation remains open; this order does not choose static or dynamic dispatch.

For [intrinsic pack application](callable-input-packs.md#application-with-an-existing-pack), evaluate the invokable first, then the supplied pack expression once, then route its components and invoke. Bare `.call` supplies Unit; `f(...)` is invocation sugar with the same effects/order contract. Parentheses and spaces after `.call` do not introduce another argument evaluation or turn it into ordinary method-value lookup. Tuple spread, replaced contributions, unused inputs, and zero callables retain their ordinary observable effects and required cleanup.

Argument order and the value/access contract are separate. Ordinary value arguments copy their evaluated values without implicit references, while explicit var/mut grants follow their selected access rules. Type-specific copy eligibility, future explicit modes, and the full activation/lifetime model remain deferred. An argument may be omitted only with an applicable explicitly declared default; without one, the call is rejected regardless of parameter type. Declared-default evaluation timing is selected below; ordinary default-type inference is selected separately; complete default syntax, lookup scope, and callable public-label compatibility remain separate. Core named-call routing and validation are selected; see [omitted value arguments](functions.md#omitted-value-arguments).

Zero-initialized callables follow the same order. Their zero-result behavior does not skip argument evaluation or required argument cleanup. If an argument expression exits before invocation, the zero callable is not invoked. See [zero-initialized functions](zero-initialization.md#zero-initialized-functions).

## Default argument evaluation selected

Selected on **2026-10-25**: for an admitted call, evaluate the callee once, evaluate supplied argument expressions once in written source order, finish their routing/replacement, and then evaluate applicable defaults only for still-unfilled declared inputs. Evaluate those missing defaults once per reached call in declared slot order. Invoke only after successful input preparation. Defaults do not prefill slots and their expressions do not run merely when the function is defined.

The user's header sketch makes the order visible:

```text
op := fn (
    b = default_b(),
    c = default_c(),
    a = default_a(),
    d = default_d(),
) { ... }

_ := op(
    d = new_d(),
    c = new_c(),
);
```

Assume compatible ordinary input types/defaults and unambiguous helper names are already established. The declared slot order is b, c, a, d. The supplied expressions run as new_d(), then new_c(). Only b and a remain unfilled, so default_b() runs before default_a(). Neither default_c() nor default_d() runs. This is declaration/storage order, not alphabetical label order or a reordering of supplied expressions into signature order.

A conceptual prepared-input trace is:

```text
tmp_op := op; /* evaluate the callee first, once */
tmp_d := new_d();
tmp_c := new_c();
tmp_b := default_b();
tmp_a := default_a();
tmp_resp := tmp_op(tmp_b, tmp_c, tmp_a, tmp_d);
_ := tmp_resp;
```

The final call supplies all four inputs in b, c, a, d positional order. These temporary names describe evaluation and the prepared values; they prescribe neither physical temporary allocation nor extra observable copy operations. Ordinary values follow the general copy semantics, and any source transformation must preserve valid copy-contract effects and evaluation order.

A supplied slot skips its default even when the supplied value is zero or Unit, provided it is compatible. Permitted spread/named replacement still evaluates all reached supplied expressions under the existing routing rules; a slot with a final supplied contribution is not defaulted. For op() with all four defaults applicable, evaluate b, c, a, d defaults in that order on each call. An unfilled input without an applicable declared default remains a compile-time error, with no automatic zero or runtime arity fallback.

If supplied-argument or default evaluation exits before input preparation completes, do not evaluate subsequent defaults or invoke the callee. Keep the ordinary effects, failure/exit channels, and cleanup of what was reached; no rollback, implicit unwrap, or new handler/propagation target is selected. Defaults also run before a zero-initialized callable's no-body-work invocation when omission is otherwise valid. Intrinsic application with an existing supplied tuple uses the same rule after evaluating/routing that pack once.

Current-readable entry types, accepted writes, initialization, explicit mut/var permissions, and selected-location validity must hold after all reached supplied arguments and applicable default effects. Copied ordinary inputs are not reevaluated or turned into live aliases. Earlier location selection does not freeze a payload or activate the pending callee; necessary entry facts must include default effects, without adding a general alias/effect solver or authorizing defaults to bypass a required caller grant.

This selects timing and default-to-slot association for established applicable defaults. Simple ordinary name = default_expr and name: Type = default_expr receivers now have selected [parameter-default inference](parameter-default-inference.md); complete default-header grammar, name lookup scope, references to other parameters, and signature-versus-implementation placement remain separate. Runtime-dependent spread/default shape proofs, variadic-tail defaults, and permission-bearing default forms are not newly selected. Reference syntax, memory safety, ownership/lifetimes, alias enforcement, and resources remain deferred.

## Earlier var arguments and later effects

Selected on **2026-10-24**: an earlier var argument's required readable type must hold at callee entry, after all reached supplied arguments and applicable default expressions have been evaluated. Selecting the location while its value fits is insufficient. For String | Int storage currently reading String, use_text(var x, ({ x = 42; 0 })) is rejected when use_text requires var String and Int: the later argument would leave Int before invocation. The assignment fits storage but invalidates the call's input proof. Preserve evaluation order and single location selection; no snapshot, reordering, or reevaluation repairs the call. This is a static entry obligation, not runtime rechecking or a complete borrow-activation/alias policy; see [entry facts](call-replacement-flow.md#entry-facts-after-argument-evaluation-selected).

The selected [single source write-grant rule](call-replacement-flow.md#single-source-write-grant-selected) also rejects f(var x, var x): one underlying local cannot supply two active replacement grants in the same call. This is independent of the entry-type check and preserves single-location semantics without choosing activation timing, copy-back, or runtime alias checks. Broader overlap and alias detection remain open.

For an initialized local and computed scalar argument, selecting an earlier var location permits later ordinary reads before invocation. In add(var count, count + 1) with count initially 10 and add taking var Int plus Int and adding the latter into the former, select count once, compute 11, then invoke and write 21. This grants no second writable alias and does not relax entry-type or definite-initialization checks. Retained read aliases and general activation policy remain open. See [later argument reads](call-replacement-flow.md#later-argument-reads-of-a-selected-local-allowed).

A later argument may also directly write the selected initialized local under the caller's existing grant before invocation. In add(var count, ({ count = 20; count + 1 })) with count initially 10, prepare the second input as 21 while count becomes 20, then hand the grant to add, which writes 41. The caller and callee are successive holders; selecting an argument does not create overlapping active grants. Keep the parenthesized block argument, valid writes/location, final entry compatibility, and duplicate-grant rejection. Broader aliases remain open; see [later argument writes](call-replacement-flow.md#later-argument-writes-to-a-selected-local-allowed).

A later argument may synchronously grant that same simple local to prepare(var count), regain the grant when prepare ends, then hand it to add at outer invocation. For the established scalar example, add(var count, prepare(var count)) corresponds to tmp := prepare(var count); add(var count, tmp);. The grouped direct-write argument similarly corresponds to a standalone tmp := { count = 20; count + 1 } followed by add(var count, tmp). Each preparation runs once, producing 21 while count becomes 20, and add writes 41. These equivalences assume stable callable names and the simple location; they do not authorize hoisting a later argument ahead of effectful callee/earlier-argument evaluations or changing scope/lifetimes. See [nested preparation and temporary forms](call-replacement-flow.md#nested-granting-calls-during-argument-preparation-allowed).

A later argument may establish a missing entry read proof for an already initialized simple local: with value declared String | Int and initially reading Int, use_text(var value, ({ value = "ready"; 0 })) is valid for var String plus Int inputs. The caller writes String before invocation; the callee then receives read/write String authority. The user's fresh tmp := { value = "ready"; 0 } form followed by use_text(var value, tmp) has the same effects for this stable callable/simple location. The current read becomes String while declared caller writes remain String | Int. Preserve evaluation order rather than treating this as a general hoisting rewrite; see [established entry compatibility](call-replacement-flow.md#entry-compatibility-established-during-preparation-selected).

Selecting a simple var local's location for an earlier argument need not read an initialized payload. A later argument may perform its first whole-value initialization before invocation: after var value: Int = ?, use_int(var value, ({ value = 42; 0 })) is valid for var Int / Int inputs. The equivalent scalar temporary initializes value before the call. Require definite initialization on every reaching invocation path; before that write, ordinary reads remain invalid. No uninitialized input reaches the callee. Preserve ordinary source order, permissions, failures/exits, and required cleanup; see [initialization during preparation](call-replacement-flow.md#initialization-during-argument-preparation-selected).

For the selected guarded runtime-index case, bind each index result once and test the stable Int locals with i =!= j before reaching swap(var values[i], var values[j]) in that successful branch. The call still evaluates its callee first and selects element locations left to right once each, with ordinary bounds checks/faults. Distinctness does not establish bounds, and failed argument selection prevents invocation. Require the fact and containing storage to stay valid; see [guarded runtime-index grants](call-replacement-flow.md#guarded-runtime-index-grants-selected).

An ordinary Int argument supplies the value obtained when that argument is evaluated. In read_original(var count, count) with count initially 10, select the location, read 10 for the ordinary input, then invoke. If the callee writes 20 through its var input and returns the ordinary input, the result is still 10. The user's tmp := count form captures the same value for this stable callable/simple local. Preserve the evaluated value across source writes without selecting a physical copy/borrow implementation or a general hoisting rewrite; see [ordinary Int evaluated values](parameter-values-and-slots.md#ordinary-int-evaluated-values-selected).

For a copyable record with inline Int fields, the ordinary input likewise preserves the record value obtained at its evaluation point. In read_original(var counter, counter), select the source location and evaluate the ordinary record with value 10 before invocation. Replacing the source with a record containing 20 leaves the ordinary input's field at 10. The equivalent tmp := counter form preserves that evaluated value for this stable callable/simple location. This selects value semantics rather than a mandatory physical copy, and leaves reference-bearing/resource transport open; see [ordinary record values](parameter-values-and-slots.md#copyable-records-with-inline-int-fields-selected).

For an ordinary copyable fixed tuple or fixed-array input, preserve its component values at the argument's evaluation point. Selecting a source location for an earlier var input and then evaluating the ordinary aggregate input permits the callee to replace the source while the ordinary input retains its old components. For [10, 11] replaced with [20, 30], reading the original input's first component produces 10; tmp := values makes that value capture explicit for a stable callable/simple local. Keep valid component copy contracts, source order, effects, initialized reads, and separate rest access/retention rules. Future reference-copy source syntax and memory-safety design remain deferred; see [fixed aggregate values](parameter-values-and-slots.md#copyable-fixed-tuple-and-array-values-selected).

An ordinary union/enum input with a valid copy contract preserves the active member/case and payload obtained at its evaluation point. Later source replacement does not retag that evaluated input or its corresponding fixed temporary. Copying constructs no inactive alternative; ordinary source/copy-contract effects and public result contracts remain in force. This selects no physical discriminator/byte-copy rule or implicit unwrap, and leaves reference/resource safety deferred; see [copyable union and enum values](parameter-values-and-slots.md#copyable-union-and-enum-values-selected).

The selected copy default is general across ordinary value transfers, including binding/assignment values and ordinary explicit/implicit return results. Evaluate each source value at its ordinary source-order point and preserve that copied value across later source replacement. A return that reads a var parameter copies the read value rather than exporting its temporary location grant. Physical copy elimination/indirection is allowed only while preserving values, valid copy effects, and all other observable behavior; no implicit reference or move fallback is selected. See [the general copy default](parameter-values-and-slots.md#general-copy-default-selected) and [result copies](parameter-values-and-slots.md#ordinary-return-values-are-copies-selected).

## Named inputs and destination order

Array/fixed-tuple spread evaluates each operand once at its written position, then supplies values in stored order. A declared variadic tail may receive zero elements without constructing a T value. Type-level tuple spread constructs a contract at compile time; it does not evaluate a runtime tuple. Shape inference does not authorize reordering effects, erasing superseded contributions, or assuming zero copies. See [tuple and array shapes](tuple-array-shapes.md).

The user's binding shape uses the selected inferred named annotation:

```text
(left, right): (l, r) = (r = op1(), l = op2());
```

This now uses the selected inferred named tuple annotation: (l, r) supplies labels, with component types inferred from the static initializer contract. The explicit version is (l: Int, r: Int). Both establish l, r destination order before positional binding into left/right, so left receives op2's result and right receives op1's result. Explicit field binding uses (left = l, right = r) := expr. The source expressions still execute op1 then op2. Bare labels in this annotation are not type-name lookups or source-selector expressions. Complete recursive annotation grammar remains to be formalized.

For any admitted named construction or call, preserve the existing source-order contract: evaluate op1 first for the written r entry, then op2 for the written l entry. Each executed occurrence runs once. Mapping evaluated values to destination fields or signature positions must not reorder observable expression evaluation.

Under the proposed name-routing interpretation, the resulting bindings would be left = op2's result and right = op1's result. These are descriptions of routed values, not instructions to call the operations again. Source order determines computation order; the mapping contract determines where the results go.

The corresponding selected reordered function call is:

```text
consume(r = op1(), l = op2());
```

For a signature declaring l before r, named arguments may appear in this written order. Named inputs may reorder and interleave with positional inputs. Call spread processes components in stored order while preserving supplied-expression evaluation order. For an admitted call, evaluate consume's callee expression first, then op1, then op2, then invoke the callable with l receiving the second result and r the first. For an admitted call with unique explicit labels, permitted spread collision or named replacement of a positional contribution does not erase its earlier expression evaluation; both execute in written order and the last contribution for that slot reaches the function. Superseded-value cleanup/ownership remains separate. An outward exit while evaluating op1 prevents op2 and invocation; merely returning an intact Result is not an outward exit.

The user selected the distinction between contextual construction and stored tuple order: a fresh named initializer may populate destination fields in any written order, while an already stored tuple with a different component order requires explicit reconstruction. Source expression order is preserved in both cases. Different stored tuple labels likewise require explicit reconstruction. Stored named/unnamed conversions, and complete tuple/pattern grammar remain open. See [concrete named routing](named-input-routing.md) and [named arguments and tuples](named-arguments-and-tuples.md).

## Short-circuiting and selected branches

Left-to-right order does not force evaluation of skipped expressions:

- `and` evaluates its right operand only if the left is true, under the intended Boolean short-circuit contract.
- `or` evaluates its right operand only if the left is false, under the intended Boolean short-circuit contract.
- A comparison chain skips later operands and comparisons after its first false comparison.
- A conditional evaluates only the selected branch; an `else if` condition is reached only after earlier conditions fail.
- An explicit exit during evaluation prevents subsequent operands or arguments from being evaluated.

The selected [optional leading separators](leading-separators.md) add no evaluation step: if and a and b evaluates exactly like if a and b, and if or a or b evaluates exactly like if a or b. The leading token is not a synthetic true/false operand or empty alternative. Existing condition-pattern binding and narrowing flow likewise remain unchanged.

The same prefix rule in ready := and a and b; computes and stores one Bool when that initializer executes. It does not store a deferred condition. In loop and a and b { body }, the loop's existing Bool-source contract reevaluates the expression before every body entry, preserving short-circuiting on each check. Subjectless match Boolean headers retain their existing once-when-reached evaluation. Prefix punctuation selects none of these evaluation frequencies.

The effect and overload rules for Boolean operators remain open. They cannot be used to infer eager evaluation of an otherwise skipped operand.

## Assignment targets

Assignment remains a statement producing `Unit`. Evaluate the target selection before the right-hand-side expression, then perform the write when the result is ready.

```text
mut items := make_items();
items[choose_index()] = replacement();
```

Resolve the `items` access and evaluate `choose_index()` once before `replacement()`. Do not recompute the index for the write.

For a compound update, select the target once, read its existing value, evaluate the right operand, apply the underlying operation, and write the result:

```text
items[choose_index()] += delta();
```

The target's `var`/`mut`, field, and element permissions still apply. Evaluating a target early is not permission to retain an invalidated reference if the right operand changes its storage. Ownership and borrowing rules must define or reject incompatible aliasing without silently reevaluating the target, cloning data, or changing evaluation order.

## Optimization and lifetimes

The guarantee describes observable behavior. A compiler can optimize or reorder work when doing so preserves that behavior. It cannot duplicate, omit, or reorder observable effects in a way that violates source evaluation or short-circuiting.

Temporaries may be retained according to the eventual ownership model. This order alone does not specify temporary destruction, cleanup order, deep snapshots, allocation, or borrow lifetimes. It does not inherently require heap allocation.

## Open decisions

Exponentiation, complete expression-grammar integration, record/collection initializer ordering, default-argument behavior, temporary lifetimes and destruction, borrow activation, and assignment aliasing rules remain open. No unspecified initializer or cleanup order is selected by this document.

## Related concepts and references

- [Operators](operators.md)
- [Comparison chains](comparison-chains.md)
- [Functions](functions.md)
- [Declarations and assignment](declarations-and-assignment.md)
- [Memory and performance](memory-and-performance.md)
- This is a LiteScript contract selected in the design discussion, rather than a claim that all comparison languages use the same evaluation order.
