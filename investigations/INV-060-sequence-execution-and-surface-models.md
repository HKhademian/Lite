# INV-060 — Sequence execution and operator-surface models

Status: recorded (reference survey and option analysis; no contract selected)
Contributor: redacted (agent-assisted)
Last updated: 2026-11-01
Catalog brief: [INV-060](TOPICS.md#inv-060) and [INV-059](TOPICS.md#inv-059)
Covered subtopics: whole of INV-060 (laziness, retention, mutation during traversal,
completion); the transformation and intermediate-allocation half of INV-059.
Sorting/search algorithm selection, hashing/equality (INV-058), and custom-container
protocol syntax (INV-057) are out of scope.

This is a non-normative investigation note outside the language draft. Recording
an option or recommendation here does not select a language rule.

## Investigation question

The user identifies general sequence operators as a required capability, not a
convenience: the language must support map/filter/fold-style composition over
eager collections, lazy cold sources, and hot or warm push sources, with one
coherent story for laziness, generators, repeatability, failure, and cost.

Concrete questions:

1. What should the operator surface be — free functions, dot-chained calls,
   a wrapper object, a pipeline operator, or query/comprehension syntax — and how
   does user code join that surface without a class system?
2. How should a reader tell, from the source, whether a pipeline has run or will
   run, and whether a source is cold (per-consumer) or hot (independent)?
3. What must a generator/builder block look like, given that `loop` is the
   selected traversal primitive and `yield` does not exist?
4. How do per-element failures compose with a pipeline when the language has
   typed `T ! E` outcomes?
5. Which of these can be built as replaceable standard modules over the selected
   capability contracts, without a boxed iterator object in the ordinary path?

The framing the user rejected: `map(arr, convertor)` as an isolated free function.
It is workable for one step and collapses into inside-out nesting, and it does not
by itself answer cold/hot, laziness visibility, or failure.

## Current contracts and evidence

Selected or established in the draft, and therefore constraints on any option:

- Consumers request capabilities, not one container. Traversal-only consumers use
  the temporary `Iterable<T>` notation; `[T]` is the selected indexed-sequence
  contract. Exact protocol names and generic syntax are open. See
  [consumer abstractions](../docs/collection-abstractions.md),
  [capabilities](../docs/collection-capabilities.md), and LS-009 in the
  [current design specification](../docs/spec/README.md#ls-009--collections-and-sequences).
- Storage roles are fixed array, growable List, and Slice. A fresh nonempty
  literal with known length infers `[T; N]`; `List<T>` is the only approved
  builtin generic spelling so far. See [sequence types](../docs/sequence-types.md).
- Size, indexing, contiguity, repeatability, order, and production mode are
  independent properties that must not be collapsed into one flag. Hot/cold is
  already separated from eager/lazy, and from sync/async delivery. See
  [source contracts](../docs/collection-source-contracts.md).
- No ordinary pattern may implicitly drain, subscribe, count, buffer, or
  materialize a source to make an operation fit. Missing capability is a static
  error; a supported operation's failure is a declared typed fault, not a silent
  conversion. See [operation contracts](../docs/collection-operation-contracts.md).
- Failures cannot silently become end-of-input or be skipped. Exhaustion, producer
  failure, and insufficient input are distinct. See the same page.
- Generic collection paths are meant to specialize statically; a runtime-erased
  interface representation, boxing, and indirect calls must be explicit choices,
  not the default cost of using a capability. See
  [generic performance](../docs/generic-collection-performance.md).
- Standard modules are replaceable, and `.lt` module files have no implicit
  imports. A "builtin" operator is therefore a script-run convenience over a
  provider implementation, not necessarily compiler-hardcoded behavior. See
  [modules and packages](../docs/modules-and-packages.md).
- `loop` is the traversal primitive (`loop source as item`, `.item`), `finally`
  owns cleanup, and structured exits are selected. See [loops](../docs/loops.md)
  and [finally](../docs/finally.md).
- Dot syntax currently means field, positional tuple member, and related member
  access. It is not a method-call form, and the hook-receiver exploration was
  retired. A user-extensible dot operator needs its own decision; see
  [INV-030](INV-030-method-declaration-syntax.md) and
  [receiver clauses](../docs/receiver-clauses.md).
- Generators, subscription syntax, and asynchronous delivery are explicitly
  future work in the draft. Nothing here is implemented: the only running
  collection surface is the bounded `List<T>` slice (construction, indexing,
  traversal, four end operations) and fixed-array traversal.

Related open items this note informs, without deciding: the algorithm proposal
([collection algorithms](../docs/collection-algorithms.md)) recommends lawful
customization, lazy transformations, and caller-selected sinks; the ledger records
its customization precedence, effects, cost laws, and exact output contracts as
open ([decision ledger](../docs/decisions-and-open-questions.md), collection
algorithms entry).

## Method and sources

Thirteen reference systems were surveyed against official documentation on
**2026-11-01**: Kotlin, Java, Dart, Rust, Go, TypeScript, Zig, V, Odin, Jai,
ReactiveX, Underscore.js, and Lodash. Jai is a closed beta without a public
official reference, so its entries are marked low-confidence and separated into
publicly verifiable material and community claims.

This is document review, not execution. No reference toolchain was run for this
note, no LiteLang implementation was exercised, and no benchmark was performed.
Version numbers are recorded where the reference documents one; where a page is
unversioned, the access date is the only evidence of currency.

The survey was chosen to cover the design space rather than the reference set:

- Languages with a lazy sequence type distinct from the eager collection (Kotlin's
  `Sequence`, Rust's `Iterator`) and languages whose collection surface is eager
  with an optional lazy escape (Java's explicit `Stream`, TypeScript's iterator
  helpers, Dart's lazy `Iterable` views).
- Languages with a push/event abstraction in the standard vocabulary (Kotlin
  Flow/SharedFlow, Dart Stream/StreamController) and languages with none (Zig, V,
  Odin, Rust's standard library).
- Languages with generators in the language (TypeScript, Dart, Kotlin's builders)
  and languages that deliberately do not have them (Java, Rust, Zig, V, Odin).
- Libraries whose whole purpose is chaining and laziness (ReactiveX), and
  libraries whose chaining is a wrapper over eager array methods (Underscore,
  Lodash).

## Reference findings

These sections summarize what each system's documentation states, not what
LiteLang will do. Do not cite this note as primary evidence for a foreign
contract; follow the links.

### Kotlin 2.4.21 — the closest model, at three times the price

Kotlin is the only surveyed language that puts *all* of eager, lazy, cold, and hot
into distinct types: `Iterable<T>` (eager, one intermediate collection per step),
`Sequence<T>` (lazy, vertical per-element execution), and in coroutines `Flow<T>`
(cold) versus `SharedFlow<T>`/`StateFlow<T>` (hot). Sources:
[sequences](https://kotlinlang.org/docs/sequences.html),
[flow](https://kotlinlang.org/docs/coroutines-flow.html).

The price is duplication: `map`, `filter`, and `fold` are defined once per
abstraction, with the same names and three separate extension definitions. The
intermediate/terminal split is real but only implied by return type for
`Sequence`; for `Flow` it is enforced because the terminal `collect` is `suspend`.

Costs are documented rather than promised away: one wrapper object per stage plus
a virtual call per element, no intermediate collection, and an explicit warning
that lazy sequencing "adds some overhead which may be significant when processing
smaller collections". No fusion guarantee. Stateful operators (`sorted`,
`distinct`, `groupBy`) buffer in proportion to element count.

Repeatability is the default: `Sequence` and `Iterable` can be iterated again;
`constrainOnce()` opts into one-shot and then throws on a second traversal. Hot
flows cannot be cancelled by a collector — the producing scope owns that.

Generators split by capability: `sequence {}` suspends but cannot call suspending
functions, while `flow {}` may; the builder's power follows the type's power.

Failure is the weak point. `Result<T>` exists but its combinators do not reach the
operator chain, so a fallible step means `Sequence<Result<T>>` and hand-written
traversal; `Flow.catch` handles upstream failures only, not collector failures.
Extension functions resolve statically with members taking precedence, which is
the reference model for user-defined operators.

Relevant to LiteLang: three execution types are tolerable to users, but three
copies of one operator vocabulary are not, and a coroutine runtime is not
affordable. Define each operator **once** over the weakest capability and let
lazy and hot types refine it.

### Java SE 25 — one lazy type, and the failure this design cannot express

`Stream<T>` is the only lazy type; `Collection` has no `map` or `filter`, so the
bridge is explicit (`.stream()`). Intermediate operations are "always lazy",
fusion is explicitly permitted, and a stateful stage may buffer the whole input.

Two documented hazards matter more than the API:

- One-shot reuse is *undefined*, not merely discouraged: a second traversal "may
  throw `IllegalStateException`", but "it may not be possible to detect reuse in
  all cases". The same class therefore describes a healthy pipeline and a
  silently corrupt one.
- Fusion permits eliding operations and "therefore elide invocation of behavioral
  parameters"; `peek` exists for debugging and may not run. User effects are not
  guaranteed, which no LiteLang operator may do.

Primitive specializations (`IntStream`, `LongStream`, `DoubleStream`) exist to
avoid per-element boxing — the exact API/representation split the draft rejects.

Checked exceptions cannot cross a lambda at all: JLS 11.2.3 makes it a
compile-time error for a lambda body to throw a checked exception the functional
interface does not declare, and `Function`/`Predicate` declare none. A fallible
step is therefore wrapped or smuggled, and one failure aborts the whole terminal
operation. The standard library has no per-element failure type. Push exists only
as `java.util.concurrent.Flow` (reactive-streams with `request(n)`), sharing no
operators with `Stream`.

Java 24 added `Gatherer` for user-defined intermediate operations and `Collector`
has always covered terminals — evidence that an operator extension seam is needed
even in a closed library.

Sources:
[Stream package summary](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/package-summary.html),
[JLS 11.2.3](https://docs.oracle.com/javase/specs/jls/se25/html/jls-11.html#jls-11.2.3).

### Dart 3.13.7 — one type covering eager and lazy, and a bool for hot

`Iterable<E>` covers `List`, `Set`, a lazy `map`/`where` view, and a `sync*`
generator with no static distinction. Returning another `Iterable` is documented
as lazy and is "iterate[d] ... every time the returned iterable is iterated";
eager members (`toList`, `fold`, `length`) live on the same type. Nothing tells a
reader whether a traversal is a replay or a recomputation.

`Stream<T>` covers both single-subscription (cold-ish) and broadcast (hot)
streams; the only discriminator is a runtime `isBroadcast` getter. A
single-subscription stream may be listened to once, "even after the first
subscription has been canceled". Broadcasting loses the gap, so `first` means
"first remaining" rather than "first emitted".

Generators are the cheapest syntax surveyed: `sync*`/`async*` with `yield` and
`yield*`. Cancellation is specified precisely — when a listener cancels, the next
`yield` acts as a `return` and any enclosing `finally` runs. That is the
cleanup-on-abandon rule LiteLang needs for early termination.

Failure has no type. Streams deliver errors out of band as events, most streams
stop after the first error, and the SDK has no `Result`, so per-element failure
cannot be expressed in the element position at all. `StreamTransformer` is the
one first-class *operator value* surveyed, which matters for hot sources where
closures would otherwise be re-created.

Sources:
[Iterable](https://api.dart.dev/dart-core/Iterable-class.html),
[Stream](https://api.dart.dev/dart-async/Stream-class.html),
[creating streams](https://dart.dev/libraries/async/creating-streams).

### Rust 1.99.1 — adapters as types, one-shot by construction

`Iterator` is a trait with an associated `Item` and one required method,
`next(&mut self) -> Option<Item>`; every operator is a provided method, so a user
type that implements `next` inherits the whole set. That is the cleanest
extension story in the survey, and it needs no operator table of its own.

Each adapter returns a concrete struct (`Map<I, F>`, `Filter<I, P>`), which
monomorphizes: no per-stage allocation, no boxed iterator in the ordinary path,
and laziness is visible in the type (`impl Iterator<Item = T>` versus `Vec<T>`).
The cost is that every adapter consumes `self`, so an iterator is one-shot by
construction — a second traversal is a compile-time move error rather than a
runtime surprise. There is no cleanup hook for early exit; teardown is `Drop`.

Failure is the awkward part. `?` returns from the enclosing function, so a
fallible closure turns the item into `Result<T, E>` and the whole pipeline needs
`collect::<Result<Vec<_>, _>>()` (stops at the first error, loses partial
results) or `try_fold` (keeps the residual iterator, but the closure may need to
be resumable). Stable `try` blocks and `try_collect` do not exist, and `gen`
blocks — real generators — remain unstable.

Rust also declines some capabilities deliberately: `HashSet` has no `iter_mut`,
because mutating a key can break hashing. That is the capability-honesty the
draft already asks for.

Sources: [std::iter](https://doc.rust-lang.org/std/iter/index.html),
[Iterator](https://doc.rust-lang.org/std/iter/trait.Iterator.html),
[impl Trait](https://doc.rust-lang.org/reference/types/impl-trait.html),
[Result collection](https://doc.rust-lang.org/std/result/enum.Result.html).

### Go 1.27.3 — the smallest possible protocol, and repeatability by comment

Go 1.23 made a function type the protocol:

```
type Seq[V any] func(yield func(V) bool)
```

`range` drives it; `yield` returning `false` means "stop", and calling `yield`
again after it returned `false` panics. That single `Bool` is the smallest
cancellation protocol in the survey, and it needs no coroutine object, no
`return()` method, and no subscription handle.

The cost is severe on the surface. `iter.Seq` cannot have methods (a receiver
type must be declared in the same package), so composition is free functions with
no standard `Filter`/`Take` at all — only collectors such as `slices.Collect` and
constructors such as `slices.Values`. Every project grows its own operator
package with its own argument order.

Repeatability is the worst failure mode found anywhere: sequences are repeatable
by default, single-use sequences are marked only in documentation, and traversing
one twice yields a silent empty loop with no error. `iter.Pull` bridges
push-to-pull but requires an explicit `stop()` that is easy to omit.

There is no `?`; failures are `(T, error)` returns, and `iter.Seq2[V, error]` is
a community shape the documentation never blesses (it defines `Seq2` as
key-value pairs). So a fallible stage forces a hand-written loop with a captured
error variable — no composed operator set can express it.

Sources: [pkg.go.dev/iter](https://pkg.go.dev/iter),
[Go spec, range clause](https://go.dev/ref/spec#For_statements),
[range-over-func](https://go.dev/blog/range-functions).

### TypeScript 7.0.2 — structural sources, and the explicit cleanup channel

`Iterable`/`Iterator` are structural interfaces with `next`, optional `return`,
and optional `throw`; a type joins by implementing `[Symbol.iterator]()`, which is
the cheapest source-side extensibility surveyed. `TReturn` also lets a sequence
carry a final value, not just elements.

The surface is disjoint: array methods are eager and allocate, while the ES2025
iterator helpers (`map`, `filter`, `take`, `drop`, `flatMap`, `toArray`) are lazy
and available only after a visible bridge such as `Iterator.from(x)` or `x.values()`.
The same name therefore means eager on an array and lazy on an iterator, which is
precisely the implicit materialization the draft forbids.

Generators are `function*` with `yield`; the generator object is one-shot, and a
second traversal is silently empty. The redeeming mechanism is `return()`: `for
of` and the terminal helpers call it on `break`, `throw`, or early completion, so
an explicit "consumer is done" signal reaches the producer. That is the cleanup
channel Rust's `Drop`-only model lacks.

Mutation during traversal is specified and inconsistent: the array iterator
re-reads `length`, so appends are visited, while eager methods snapshot the range
first, so appends are not. Failures are untyped exceptions and do not appear in
`Iterable<T>` at all.

Sources: [MDN iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols),
[iterator helpers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/map),
[TypeScript handbook: iterators and generators](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html).

### ReactiveX — one vocabulary for push, and the distinction it could not add later

ReactiveX is the existence proof for the required capability: `map`, `filter`,
`scan`, `take`, `zip`, `merge` mean the same thing on any observable, operators
compose as values, and the source is the last-supplied argument, so no wrapper
object is needed. Nothing runs until `subscribe`. Operators are data-last by
construction, which is why `pipe(op1(), op2())` works without a chain object.

It is also the cleanest cautionary tale. Cold and hot are real, documented, and
*not* in the type: `share()` has the signature
`share<T>(): MonoTypeOperatorFunction<T>`, so an `Observable<Row>` reads the same
whether subscribing starts a query or joins a running one. The distinction is
recoverable only from the construction site's spelling, and is lost after one
operator. Cold means a new producer per subscription and is "always unicast"; hot
means the producer exists outside the subscription and is approximately multicast.
Two subscribers to one observable have no guarantee of seeing the same sequence.

The failure model is terminal-only: `onError` "will not make further calls to
`onNext`", recovery is whole-sequence (`catch`, `retry`), and per-element outcomes
require `materialize` — converting notifications into values. The library's own
answer to "I need element-level failure" is to reify it as data, which is the same
move `T ! E` makes, but in the library rather than the type.

Teardown is deliberately weak: an unsubscribed observable "can then choose to
stop", not "will stop", and "it is not guaranteed … that the Observable will issue
no notifications" afterwards. Backpressure is optional and is documented as
poorly suited to hot sources. RxJS moved from prototype patching to pipeable
operators for tree-shaking, blind-dependency, and functional-composition reasons —
the operator-as-value design is the extensible one.

Sources: [observable](https://reactivex.io/documentation/observable.html),
[contract](https://reactivex.io/documentation/contract.html),
[publish](https://reactivex.io/documentation/operators/publish.html),
[backpressure](https://reactivex.io/documentation/operators/backpressure.html),
[RxJS operators](https://rxjs.dev/guide/operators),
[RxJS glossary](https://rxjs.dev/guide/glossary-and-semantics).

### Underscore.js and Lodash — the eager default, and fusion as a heuristic

Both wrap a plain host-language array. Underscore has no lazy mode at all: every
step computes, so a four-step pipeline allocates four arrays and no document
mentions it. Its chained object is "already ran", `value()` merely unwraps, and
`_.each` "cannot be broken out of" — short-circuiting requires switching to a
different operator. There is no source-over-time concept, so cold and hot are
simply absent.

Lodash documents lazy chaining and "shortcut fusion" to "avoid the creation of
intermediate arrays", which is the correct optimization. But eligibility is a
heuristic: fusion applies only to array-backed sections with unary iteratees, and
the documentation states that "the heuristic for whether a section qualifies for
shortcut fusion is subject to change". Fusion therefore changes how often user
iteratees run, which is observable. The wrapper also exposes array mutators
(`push`, `reverse`), so a "pipeline" can mutate its own input while deferred.

`lodash/fp` exists because data-last curried operators give three things a wrapper
cannot: reusable partial pipelines (`fp.filter(Boolean)` as a value),
composition with non-library functions, and fixed arity (the `parseInt` trap turns
`['6','8','10']` into `[6, NaN, 2]`). The cost is a second divergent surface:
different arities, renamed methods, no chaining.

Sources: [Underscore chaining](https://underscorejs.org/#chaining),
[Lodash docs, chain sequence methods](https://lodash.com/docs),
[Lodash FP guide](https://github.com/lodash/lodash/wiki/FP-Guide).

### Zig, V, Odin, Jai — what having no sequence protocol actually costs

This group is the negative control. Two of the four (Zig, and Jai as far as public
material shows) have no `map`, `filter`, or `fold` at all; the other two have
eager, allocating, non-composable versions.

- **Zig** has no iteration protocol. `for` accepts arrays, slices, ranges, and
  tuples, and no user type can join. `std.mem` supplies algorithms over slices,
  and the standard library ships five stateful iterator structs
  (`TokenIterator`, `SplitIterator`, `WindowIterator`, `ReverseIterator`, …) that
  share no interface, cannot be passed to `for`, and cannot compose with each
  other. Comptime specialization is excellent for structure and cannot suspend a
  function, so no generator is expressible. `async`/`await` was removed and the
  language reference still points at a tracking issue.
- **V** is the only one with a user-extensible protocol: a type with
  `fn (mut it T) next() ?Elem` can be used in `for`. It also has the least
  ceremony for the common case — `nums.filter(it % 2 == 0)`, with `it` implicit —
  and an `or { ... }` block that returns from the *enclosing* function rather than
  from a closure, which is exactly what a failing stage wants. But `.map` and
  `.filter` are eager, allocate a fresh array per stage, and cannot fail; the
  error type `!T` carries a dynamically typed `IError`.
- **Odin** has `core:slice.mapper`, `filter`, `reduce`, and `all_of`/`any_of`,
  all eager and allocator-explicit. Callbacks are `proc(U) -> V` with no
  environment, because Odin deliberately has no capturing closures, so a stage
  needing configuration must thread it manually. Its `or_return`, `or_else`,
  `or_continue`, and `or_break` are the best existing vocabulary for "this stage
  failed: skip the element / stop the loop / leave the function".
- **Jai** is a closed beta with no public specification; only the shape of
  `for_expansion` is worth recording, and with low confidence: a type declares how
  `for` iterates it via a compile-time macro that receives the loop body and flags
  for `break`/`continue`. That is a body-polymorphic iteration protocol with zero
  abstraction penalty, at the cost of macro-expanded control flow.

The cost of the missing abstraction is concrete and appears in the same four
places in every program: per-call-site boilerplate (allocate, index, track
length; two passes for a filter), no polymorphic combinators (Zig's five iterator
structs cannot be composed), nowhere for per-element failure to live, and every
user re-deciding two-pass versus grow-and-append with no fusion.

The important negative result for LiteLang: none of these four can distinguish
"the pipeline failed" from "this element failed". Zig can spell `[]E!T` or abort;
V's `map` cannot fail; Odin's `mapper` reports only allocation failure; Jai's
convention is a trailing success flag. A language that can write both
`Sequence<T> ! E` and `Sequence<T ! E>` is offering something none of these has.

Sources: [Zig for](https://ziglang.org/documentation/master/#for),
[Zig errors](https://ziglang.org/documentation/master/#Errors),
[V custom iterators](https://docs.vlang.io/statements-&-expressions.html#custom-iterators),
[V array methods](https://docs.vlang.io/v-types.html#array-methods),
[Odin core:slice](https://pkg.odin-lang.org/core/slice/),
[Odin or_return](https://odin-lang.org/docs/overview/#or_return-operator).

### Thirteen systems in one table

Cells are the property as the documentation states it, not a quality judgment.

| System | Lazy sequence value | Laziness in type | Cold/hot | Generator form | Repeatable | Per-element failure | User operators |
|---|---|---|---|---|---|---|---|
| Kotlin 2.4.21 | `Sequence<T>` | yes | `Flow` cold, `SharedFlow`/`StateFlow` hot | `sequence {}` (no suspend calls) | yes; `constrainOnce()` opts out | no; `Result` does not compose | extension functions |
| Java SE 25 | `Stream<T>` | yes | none in `Stream`; `Flow` separate | none (factories only) | no; reuse undefined | checked exceptions cannot cross a lambda | `Collector`, `Gatherer` |
| Dart 3.13.7 | `Iterable` | no | runtime `isBroadcast` bool | `sync*`, `async*` | `Iterable` yes; single-sub stream once | untyped error events | extension methods, `StreamTransformer` |
| Rust 1.99.1 | `Iterator` | yes | none in std | none stable (`gen` unstable) | no; moved value | `Result` items + `collect` | implement `Iterator` |
| Go 1.27.3 | `iter.Seq` | partly | comment convention only | `func(yield) bool` | yes by default, silent when not | `(T, error)`, no operators | free functions, `All()` |
| TypeScript 7.0.2 | `IteratorObject` | no | none | `function*`, `async function*` | arrays yes, generators no | untyped exceptions | structural `[Symbol.iterator]` |
| Zig 0.15.x/master | none | no | none; new `std.Io.Queue` | none | not applicable | `E!T` or abort | none (no overloading) |
| V 0.5.2 | none | no | channels | `next() ?T` protocol | arrays yes, iterators no | `!T`; `map` cannot fail | methods, `next()` |
| Odin dev-2026-10 | none | no | `core:sync/chan` | none | yes | `(T, Error)` + `or_return` | none; `->` selector call |
| Jai (low confidence) | `for_expansion` expansion | not verified | thread group, no channel verified | none verified | per call site | `(T, bool)` + `#must` | `operator`, `for_expansion` |
| ReactiveX / RxJS 7.8.2 | `Observable<T>` | no | prose and construction site only | `create`, `defer`, `from` | cold yes, hot no | terminal `onError` only | pipeable operators |
| Underscore 1.13.8 | none | no | none | none | chain already ran | untyped throw | `mixin` |
| Lodash 4.18.1 | lazy chain | no | none | `range`/`times` only | `value()` re-runs, undeclared | untyped throw | `mixin` |

## Axes that decide the design

Seven properties recur in every surveyed system. They are listed with the
LiteLang-side consequence each one forces; the evidence is in the reference
sections above and in the [matching review](../docs/references.md).

1. **Argument order.** Designs that read well put the source first: a method
   receiver, or the first argument of a free function. Designs that read badly
   put the function first, and are then never chained. The rule is mechanical:
   `xs.map(f)` and `map(xs, f)` must be the same call, or one of them must be
   abandoned.
2. **Laziness visible in the type.** A lazy pipeline value that a program can
   store and pass is only safe if its type says it has not run. Where the type
   says it, the feature is teachable and the optimizer has something to work
   with. Where it does not, the reader is back to naming conventions and docs.
3. **Cold, hot, and warm are three states.** Systems that support streaming
   distinguish per-consumer production from independent production, and retained
   history is a third thing. A boolean flag collapses them and leaks the
   difference into runtime errors. LiteLang's source contracts already forbid the
   collapse; the type surface must then carry the separation.
4. **Repeatability is a capability, not a property of the name.** A pipeline over
   an array and a pipeline over a file line reader have the same shape and
   different guarantees. The guarantee must flow through adapters and be checked
   where a second pass is needed.
5. **Generators have exactly two shapes.** Suspend/resume or yield-callback.
   There is no third option, and choosing suspension means choosing new
   control-transfer semantics and cleanup-on-abandon rules.
6. **Per-element failure has no free lunch.** Either the pipeline aborts (simple,
   loses the element), or the outcome is part of the element type (composable,
   verbose), or nothing is tracked (convenient, invisible). LiteLang's `T ! E`
   already prefers the middle option everywhere else; a sequence API that invents
   a different answer would be inconsistent.
7. **Cost is two different numbers.** Per-element representation cost scales with
   data and must be forbidden. Per-stage cost is constant and can be optimized
   later. Conflating them produces either an unaffordable design or a
   premature one.

## Options and consequences

Four independent choices are bundled in ordinary "LINQ-like" proposals. Keeping
them separate matters, because a good answer to one does not constrain the others.

### S: the surface

| Option | Observable behavior | Main cost | What it does not solve |
|---|---|---|---|
| S1 free functions only | `map(xs, f)`, `fold(xs, 0, g)` | inside-out nesting, intermediate names | composition ergonomics |
| S2 receiver-declared dot operators | `xs.map(f).fold(0, g)`, declared like `List.push_front := fn(self, ...)` | needs the open receiver-declaration and field-versus-call rules (INV-030) | nothing beyond surface |
| S3 universal first-argument sugar | `xs.map(f)` for any function whose first input is the source | a general resolution rule, diagnostics, discoverability | same as S2, with a broader blast radius |
| S4 pipeline operator | `xs \|> map(f) \|> fold(0, g)` | new operator, holes or partial application for extra arguments | receiver-first ergonomics |
| S5 wrapper object | `chain(xs).map(f)` (Underscore/Lodash) | wrapper allocation, a hidden lazy/eager policy | teaches nothing about execution |
| S6 query grammar | `from x in xs where ... select ...` (LINQ) | grammar and inference surface, duplication with `loop` | generators, streams |

S2 and S3 differ only in how much of the language becomes chainable. S2 keeps the
operator set closed and makes user extension an explicit declaration, which fits
the draft's "written contracts must be visible" position; S3 is more uniform but
turns every first-argument function into a would-be method and needs a precedence
rule against fields anyway. Either way the *definition* of an operator stays an
ordinary function, so the underlying contract is S1.

S4 is orthogonal to S2/S3 rather than a competitor: it would also be usable for
non-sequence functions. Adding both is defensible; adding neither leaves only S1.

S5 and S6 are not recommended for the first contract. S5 adds an object whose
only job is to postpone calls; its documented fusion eligibility is an
unpublished heuristic that its own documentation calls "subject to change", and
its wrapper exposes array mutators, so a deferred pipeline can still mutate its
source. S6 duplicates `loop` and would need its own inference story before
generators exist.

### E: execution models

| Option | Source spelling | Consequence |
|---|---|---|
| E1 cold-only operators | `Sequence<T>`; hot sources have no operators until converted | smallest surface; streaming becomes a separate design later |
| E2 `Sequence` + `Stream` | two types, one operator vocabulary | cold/hot visible in the type; two backends for one table |
| E3 one type plus a mode parameter | `Sequence<T, Hot>` | type noise; pushes the distinction into generic parameter lists |
| E4 dual namespaces | `Enumerable`/`Observable` with different names | the Rx/LINQ split: duplicated operator sets, no shared code |

The source-contract page already refuses to collapse production mode, laziness,
repeatability, and delivery into one flag; E3 risks exactly that collapse by
making mode a parameter of everything. E1 is honest but leaves a required
capability unaddressed. E2 is the only option that satisfies "same operators,
different execution" while keeping type-level visibility.

Warm sources do not get a fourth type. Warm = hot plus a retained window, so
`replay(n)` and `latest()` are source operations that return a `Stream`, with the
buffer and drop policy in their contracts.

### G: generators

| Option | Shape | Runtime cost | Risk |
|---|---|---|---|
| G1 suspend/resume | `generate { yield x }` | state machine or stackful coroutine per active generator | new control-transfer semantics, `finally` on early exit, locals across suspension |
| G2 emit callback | `generate((emit) { ... })`, `emit` returns `Bool` | none beyond an ordinary function call; compiles to a loop | less natural for multi-level producers; every emit must be checked |
| G3 no builder | producers are user values conforming to the source contract | none | boilerplate for the common "walk this structure and yield" case |

G2 gives the capability immediately with no new suspension semantics, and it
matches the language's stated preference for explicit control flow: early
termination is a returned `Bool` the producer must check, not a hidden throw.
G1 is friendlier and should be reconsidered once the implementation strategy for
suspension is known. G3 alone is the status quo and is what the surveyed
systems without generators require from their users.

### F: failure inside a pipeline

| Option | A fallible step looks like | Pipeline outcome |
|---|---|---|
| F1 total adapters only | `map_try(xs, f)` producing `Sequence<T ! E>` | terminal decides: fail-fast or partition |
| F2 fallible pipeline | `map(xs, f)` where `f` returns `T ! E` | the whole pipeline becomes fallible; first failure ends it |
| F3 unchecked | the callback raises, the chain aborts | no static trace; matches Java/Rx/Python defaults |

F2 is the Rust/Go/LINQ shape: correct, simple, and it throws away per-element
recovery. F3 is what most surveyed systems do and is incompatible with the
selected "failure cannot silently become end-of-input" rule. F1 keeps `map`
total, reuses `T ! E` as an ordinary element type, and lets the terminal state
the policy — at the cost of a second operator name for every fallible stage.

For hot sources F1 is not merely tidier, it is closer to required: a stream of
live events cannot be restarted cheaply, so "first error ends the subscription"
destroys the source. In-band outcomes let a consumer keep receiving.

### C: cost

Two different costs are commonly conflated:

- Per-stage allocation: one small object per adapter when a pipeline is built.
  O(1) in the number of stages, independent of element count.
- Per-element representation change: boxing primitives, allocating a wrapper per
  element, or copying elements into an intermediate collection. O(n).

The draft already forbids the second kind through the unified element-type rule
([decision ledger](../docs/decisions-and-open-questions.md)). Java's primitive
streams are the standard example of paying to avoid it with a parallel type
family; the draft explicitly wants one surface instead. The first kind is
tolerable, and specialization or inlining can remove it later without changing
semantics. Cost promises should therefore be stated as "no per-element boxing, no
intermediate collection", not as "zero allocation".

A related decision this exposes: an operator that returns a lazy adapter needs a
return type. Naming that type (`Sequence<T>`, one canonical representation) and
hiding a per-operator type (`Map<Source, F>`, Rust-style) are different answers
with different ABI and identity consequences. The draft's "abstract output with a
static implementation" candidate
([function signatures](../docs/collection-function-signatures.md)) is the same
open question, so lazy adapters cannot be finalized before it is.

### Consequences for the current draft

None of these options requires changing a selected rule. The capability model,
the `[T]` contract, the no-implicit-materialization rule, the hot/cold separation,
and the unified element-type rule all survive every option above. What the note
does show is a dependency: S2 depends on INV-030, and any lazy adapter depends on
the return-type decision. Both are already open, and neither is currently listed
as an FVP gate.

## Concrete cases

All syntax below is unselected exploration. `Sequence<T>` and `Stream<T>` are
temporary names, in the same provisional status as the draft's `Iterable<T>`
notation; dot-call operators presuppose an unsettled receiver-declaration rule.

### A pipeline is a recipe, not a result

```text
orders := load_orders();                    /* [Order; N] */

pending := orders.filter((o) { o.active }); /* Sequence<Order>; no element visited */
total := pending.map((o) { o.total })
               .fold(0, (sum, amount) { sum + amount });
```

`pending` is a value the program can store, pass, and traverse more than once. The
type, not the documentation, says no work has happened yet. This is the property
Java's one-shot `Stream` cannot provide, and the one a dynamically typed pipeline
cannot state at all.

### Repeatability is inherited, and its loss is static

```text
values := [1, 2, 3];
doubled := values.map((n) { n * 2 });       /* repeatable: values is */

a := doubled.to_list();                     /* runs */
b := doubled.to_list();                     /* runs again */
```

```text
lines := file_lines(path);                  /* Sequence<String>, not repeatable */
n := lines.count();                         /* one pass: accepted */
again := lines.to_list();                   /* rejected: this source is one-shot */
```

The second traversal is a compile-time rejection, not an `IllegalStateException`.
An operation that genuinely needs two passes (saving, lookahead, `sort` plus a
second consumer) must request `Repeatable`; the rejection names the missing
capability.

### An unbounded cold source and a terminal that stops it

```text
naturals := fn (): Sequence<Int> {
    generate((emit) {
        var n := 0;
        loop {
            if not emit(n) { break }
            n = n + 1
        }
    })
};

first_ten_squares := naturals()
    .map((n) { n * n })
    .take(10)
    .to_list();
```

`emit` returns `Bool`, so the producer learns about early termination. `take(10)`
stops pulling after ten elements, `emit` reports that, and the producer runs its
ordinary cleanup on return. This producer form needs no coroutine and no heap
suspension state.

### Hot and warm are different types, not a flag

```text
prices := price_feed();                     /* Stream<Price>, hot */

handle := prices
    .map((p) { convert(p) })
    .take(20)
    .subscribe((p) { report(p) });          /* starts the subscription */
```

`map` on a `Stream` produces another `Stream` and does nothing. `subscribe` starts
production and returns a handle; `take(20)` is part of the subscription contract,
so reaching twenty cancels it. A second `subscribe` is a second subscription with
its own lifetime, not a re-traversal.

```text
recent := prices.replay(5);                 /* Stream<Price>, warm */
```

A warm source is a hot source with a retained window. Replay is a source
operation with a stated buffer and drop policy, not something `map` may do
implicitly. A late subscriber sees up to five retained values and then the live
feed; the type says so.

### A fallible element does not destroy the pipeline

```text
parsed := lines.map_try((line) { parse(line) });  /* Sequence<Item ! ParseError> */

items := parsed.collect_try();                    /* [Item] ! ParseError, first failure */
```

or, when a bad line should not stop the file:

```text
(ok, rejected) := parsed.partition_outcomes();
```

`map` stays total. A fallible step is a different operator with a visible outcome
element type, and the terminal chooses fail-fast versus partition. Nothing is
silently dropped, and the pipeline's declared error set is the union of its
fallible steps.

### The questions the cases expose

- Does `.` before an identifier resolve to a field or to an operator when both
  exist? The field must win, or field access becomes unparsable.
- Is `pending` a borrowed recipe over `orders`, a snapshot, or a copy? Lifetimes
  and the selected ordinary-copy rules decide whether storing it is free.
- What happens when a `mut List` is traversed and the body pushes? Fail-fast,
  stale-view, or rejected statically are all defensible; the draft currently
  says nothing.
- Does a builder's cleanup run when the consumer stops early, and when a `Stream`
  subscription is cancelled?

## Verification and limits

Checked on **2026-11-01**: thirteen systems against their official documentation,
with versions recorded in the reference sections and in the
[reference register](../docs/references.md). No reference toolchain was installed
or run, no foreign program was compiled, no benchmark was measured, and no
LiteLang compiler or runtime was exercised. This note evaluates documented
contracts only.

Specific limits:

- **Jai** has no public official specification. Its material is community-derived
  from public demonstrations and is marked low-confidence; no Jai syntax from this
  note should be treated as verified or cited as precedent.
- **ReactiveX** generic documentation has no version axis; RxJS behavior was
  checked against the 7.8.2 published sources. rxjs.dev is client-rendered, so
  wording was read from the shipped JSDoc and repository content rather than the
  rendered page.
- **Java** checked exceptions are a language rule (JLS §11.2.3), not a library
  choice; the lambda prohibition is therefore structural rather than a defect of
  `java.util.stream`.
- **Zig** is moving: `async`/`await` was removed, `std.Io` is recent and unstable,
  and the documentation spans several versions.
- **TypeScript** iterator helpers are an ES2025 platform feature exposed through
  the TypeScript library files, not TypeScript syntax.
- Coverage gaps: sorting and searching algorithm selection (INV-059's remaining
  half), hashing and equality (INV-058), and quantitative performance are out of
  scope. No claim is made that any surveyed design is fast; only that its
  documented cost model was recorded.

Documentation is not behavior. Several surveyed claims — Java's undefined stream
reuse, Go's silent single-use traversal, Lodash's fusion eligibility — are
*underspecified by design*, and a language that copies them inherits the
ambiguity rather than the behavior.

## Findings and remaining questions

### Evidence

- Of thirteen systems, only Kotlin carries production mode in the type system.
  Java has push support in a separate package that shares no operators, Dart
  reduces it to a runtime boolean, and the remaining ten have no distinction at
  all.
- None of the thirteen can express a per-element failure and a whole-pipeline
  failure as distinct static types. The closest are Rust's `Result` item plus
  `collect`, Go's unblessed `Seq2[V, error]`, and ReactiveX's `materialize`.
- A second traversal is a compile error only in Rust. Elsewhere it is silently
  empty (Go single-use sequences, TypeScript/JavaScript generator objects),
  undefined (Java `Stream`), disallowed at run time (Dart single-subscription
  streams), or an undeclared re-run (Lodash chains).
- Two systems have no general sequence operators at all, and the cost appears at
  every call site: Zig ships five iterator structs that cannot compose, and Jai's
  public material shows loops plus macros.
- Only Rust combines type-level laziness with no per-stage allocation; Kotlin
  reaches low cost with wrapper objects and no fusion promise.

### Interpretation

1. The gap is composition and execution typing, not a missing container. The
   selected capability model is sufficient; every option above is buildable on it
   without a new collection type.
2. Type-level separation of eager, lazy, cold, and hot is the highest-value
   property and the one that cannot be added later. ReactiveX proves this: its
   promotion operator keeps the same type, and its own documentation cannot say
   which behavior a reader has.
3. Repeatability must be a statically checked capability. Every surveyed
   alternative — undefined, silently empty, silently re-run — violates the
   draft's no-hidden-behavior rule.
4. Per-element failure in the element type is LiteLang's clearest opening.
   `Sequence<T> ! E` and `Sequence<T ! E>` are both writable here and neither is
   writable in any surveyed system.
5. Generators should start as an emit-callback producer, because suspension needs
   a control-transfer design that does not exist yet, and the callback form
   compiles to an ordinary loop.
6. Cost should be stated as two rules: no per-element boxing and no intermediate
   collection. Per-stage allocation is acceptable and optimizable; promising
   fusion or zero allocation as semantics would repeat Lodash's heuristic or
   Kotlin's overhead warning in the wrong direction.

### Recommendation

Not a decision, and not consented. If the user accepts the shape, the ordering
that minimizes rework is:

1. **Receiver rule** (INV-030). Without it there is no dot surface, and the
   operator set cannot be written down. The field-versus-call precedence must be
   settled first.
2. **Lazy result type** — one canonical `Sequence<T>` or a per-operator type.
   This is the same open question as abstract output types in
   [collection function signatures](../docs/collection-function-signatures.md);
   lazy adapters cannot be finalized before it.
3. **Protocol names** (`Sequence`, and whether one-shot sources are a distinct
   `Cursor` or a missing `Repeatable` capability). `Iterable<T>` remains
   temporary notation in the draft.
4. **Operator table** with the adapter/terminal/materializer split and cost notes,
   in a replaceable standard module.
5. **Generator form** if the emit-callback shape is accepted.
6. **Hot sources last**, as a second backend over the same operator table.

A first implementable slice, once 1 and 2 exist: `range`, lazy `map`, lazy
`filter`, `take`, `fold`, and `to_list`, on the existing fixed-array and `List`
slices, plus one test proving that
`range(0, 1000000).map(f).take(10).to_list()` never visits a million elements and
that the intermediate `Sequence` values are inspectable and re-traversable. That
single test is worth more than the remaining operator names.

### Remaining questions

| ID | Question | Owner |
|---|---|---|
| Q1 | How does `x.f(a)` resolve, and does a field always win over an operator? | INV-030 |
| Q2 | Is a lazy result one canonical type or one type per operator; what does the ABI see? | INV-057 / [signatures](../docs/collection-function-signatures.md) |
| Q3 | Do adapters borrow the source or snapshot it; does a stored `Sequence` outlive its source? | INV-055 / [copy contract](../docs/sequence-types.md) |
| Q4 | Is mutation of a traversed `mut` collection rejected, fail-fast, or snapshot? | INV-060 |
| Q5 | What is the subscription handle, and does `finally` run before `subscribe` returns on cancel? | INV-060 |
| Q6 | What is the warm replay policy: count, time, bytes; drop oldest or newest? | INV-060 |
| Q7 | Is backpressure in scope, and is asynchronous delivery a third capability or a modifier? | INV-060 |
| Q8 | What is the full operator naming table, and which names are synonyms to reject? | INV-059 |
| Q9 | Is any hot-source support in the first milestone, or is it E1 until cold is proven? | INV-059 |
| Q10 | How do `!` and `?` capture interact with terminals that already return an outcome? | LP-0009 / LP-0010 |
| Q11 | Are standard operators script-visible without import, or an explicit module import? | [modules](../docs/modules-and-packages.md) |
| Q12 | Does a sequence type distinguish "finite but unknown count" from "possibly infinite"? | INV-060 |

## Decision references

No decision has been made. The user's 2026-11-01 direction is that general
sequence operators are required and must cover cold, warm, lazy, and generator
sources with full investigation. That direction is recorded here but does not
select syntax or semantics; explicit consent for each specific rule is still
required under the [explicit-consent rule](README.md#explicit-consent-for-language-changes).

## Handoff

Resume at Q1 and Q2. Everything else can proceed once those two are settled,
because the surface spelling and the lazy result type determine the shape of the
operator table; the protocol and cost rules do not change under any of them.

Four assumptions need explicit user confirmation before implementation, because
each changes the deliverable and none is consented:

- a chained surface is wanted at all (S1 free functions alone need no grammar and
  are a defensible first step);
- cold and hot share one vocabulary over two types (E2) rather than shipping cold
  only (E1);
- generators begin as the emit-callback producer (G2) rather than suspension;
- element failures are in-band (F1) rather than pipeline-fatal.

If any of those flips, the options in this note record the consequences; the
protocol, repeatability, and cost findings still hold.

Not investigated here: sorting/searching algorithm selection (the rest of
INV-059), hashing and equality (INV-058), quantitative performance, asynchronous
delivery policy, backpressure, and whether a `Sequence` may be stored in a field
or returned across a function boundary without materializing.

This note is non-normative and selects nothing. The next step is a user decision
on Q1/Q2, not an implementation.
