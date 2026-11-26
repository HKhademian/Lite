# Loop completion

Status: **one receiverless then block using loop metadata selected; .value typed and zero-initialized; tagged return, explicit targeted break/continue, and then execution selected, 2026-10-19. Remaining open: complete loop/result inference, cleanup ordering/attachment, and nonzero initialization**.

This page owns loop result typing, contributions, metadata, and completion.
[Loops](lite://doc/loops) owns source forms and iteration. See the shipped
[control-flow Handbook](lite://handbook/conditionals-match-and-loops) and
[verification cases](lite://repo/language/verifications/README.md) for executable support.

## Template

```text
sum := loop numbers as number {
    .value + number
} then {
    print(.count);
    .value
}
```

Every loop has a context even without a named tag. Then is an attached phase of that same loop, with final .count and .value available directly. There is no done/result receiver and no .acc or automatic Option wrapper.

## Results

Then follows the ordinary final-expression rule and can transform body value type T into final result type R:

```text
then { .value }             /* body's final T value */
then { format_total(.value) } /* a transformed result */
then { "Finished" }         /* String */
then { Unit }               /* Unit */
then {}                     /* Unit */
```

These are clause fragments. A Unit tail does not silently preserve an earlier value. Trailing semicolons do not discard expression values. Without then, the selected normal-completion result is .value; the exact inference rules remain to formalize.

## Empty, skipped, and zero-valued loops

For Int-valued loops, .value starts at 0. An empty source or all-skipped entries leave it at 0; no value_or helper is required. A positive .count means entries ran, not that any entry committed a value. A genuine contribution of 0 is also 0, so .value alone cannot distinguish these histories.

Capture metadata before entering another construct context:

```text
message := loop items as item {
    if not eligible(item) { continue; }
    score(item)
} then {
    entered := .count;
    total := .value;

    if entered == 0 {
        "No iterations"
    } else {
        format_score(total)
    }
}
```

Assume score returns Int and format_score returns String. All-skipped nonempty input reaches format_score(0). There is no separate loop empty-else.

## Scope and availability

An explicit @name tag remains readable through then. Use a tag or captured local for outer metadata inside nested conditionals. Conditional `.value` requires an explicit conditional tag and is readable only in that conditional's attached `then`; ambiguous leading-dot metadata access is rejected rather than resolved by shadowing or outward search.

The final .value stays alive while then computes its result. Count/value are also available before the first condition. Item is readable during active iterations and as the last entered iteration in then if one exists; index is readable there only for positional sources. The optional as item binding itself remains iteration-local. With zero entries, then receives a type-directed zero `.item`; for positional sources `.index == 0`, while nonpositional sources have no `.index`. `.count == 0` distinguishes placeholders from an actual first entry. See [zero-iteration placeholders](lite://doc/loop-completion#zero-iteration-placeholders).

[Use-based retention](lite://doc/loop-completion#use-based-retention) covers the lifetime of the last item.

## Exits and cleanup

Then runs after source exhaustion, a false condition, any `break` targeting this loop (bare, named without a payload, or with a value), or a tagged return to this loop. `continue` stays in iteration. A `return @loop result` commits T and runs this loop's `then` to produce R; if it targets an outer construct instead, this loop's `then` is skipped. Unqualified `return`, forwarded errors via `!`, and panics leave without supplying a loop T. A payloadless break—bare or `break @loop`—preserves the existing value; a break value, including `break @loop value`, commits T and then runs normal completion.

Then is not an all-exit cleanup guarantee. When a loop has both `then` and construct-level `finally`, `then` runs first and `finally` cleans up as the loop exits; successful cleanup preserves the loop result and cleanup does not recover failures. Applicable cleanup still runs on exits that skip `then`. Exact attachment syntax/scope remains open. If any failure is already pending, it remains primary and cleanup failures are retained as secondary; otherwise the first cleanup failure becomes primary and cancels normal completion. The `&` form's public value/operations remain open. Body-wide recovery/cleanup sections, defer, and disposal remain [deferred](lite://doc/deferred-cleanup-and-resources). Operation-local recovery inside bodies remains available.

## Historical forms

Separate loop empty-else and completion-receiver clauses, action-preservation modes, optional accumulators, and previous-value receiver slots are superseded. The selected `finally` is the cleanup-only hook described above; general Option/Result values and error receivers are unchanged.

Related: [unified completion](lite://doc/unified-loop-completion), [loop value](lite://doc/loop-value), [item naming](lite://doc/loop-receivers), [examples](lite://doc/loop-examples), and [exits](lite://doc/control-flow).

Historical implementation checkpoint, 2026-11-21: the TypeScript backend implements a typed,
zero-initialized `.value` for value-producing loops, `.collected` (`List<T>` of
committed contributions, zero-cost when unused), direct loop suffixes
(`.collected`, `.count`, `.value`), and `then`. A normally completing body
commits its tail value; partial `if` and `match` tails commit on matching
branches and leave `.value`/`.collected` untouched otherwise; plain `continue`
and bare `break` preserve them. Without `then` or a suffix, the loop result is
the final `.value`. Type `T` comes from an expected destination (typed
declaration, assignment, return, or function result), a `then` body's
`.value`/`@tag.value` reads, payload `break`/`continue` expressions, a named
sequence source's element type when the body reads `.value`, or the body tail;
reading `.value` with none of those sources is rejected rather than guessed.
Action loops without `then` keep `Unit` and commit nothing. `.count`, `.item`,
and (for positional sources) `.index` are readable in the body (including
unambiguously inside `if`/`match` conditionals); `then` also sees the last
entered item/index (or typed zero/0 after zero entries), the final count, and
`.collected`. `break value` and `continue value` commit to the nearest loop;
`break @tag` and `continue @tag` target a tagged enclosing loop; `return @tag`
commits and stops its target loop, running that loop's `then`. Tagged
`@tag.value`, `@tag.count`, `@tag.item`, `@tag.index`, and `@tag.collected`
access an enclosing loop from nested code, and conditional tags (`@tag if`/`@tag
match ... then { ... }`) are supported as well. C backend support for loop
values and payload exits remains deferred.

## Collected contributions

`.collected` reports committed body contributions in order. A partial
condition in tail position, a skipped iteration, or a payloadless exit
leaves the contribution list unchanged. See [loop contexts](lite://doc/loops#context-state)
for spelling and [the Handbook](lite://handbook/conditionals-match-and-loops)
for runnable examples.

## Accumulated loop value

### Core rule

Every loop owns a .value with a compile-time type T inferred from the body's value-producing paths and any applicable expected type. It is initialized once to T's language-defined all-zero value before the first condition check. All-zero storage must map to a valid T value. This is not an automatically inserted Option<T> or an untyped cell.

```text
sum := loop numbers as number {
    .value + number
}
```

For Int elements with no different expected type, addition constrains T to Int and its initial value is 0. A completed tail expression replaces .value; the next iteration sees that committed value. The selected normal-result rule without then is final .value, including its initialized zero when the loop produces nothing. Destination-side expected types also constrain T, as explicitly selected by the user; see [bidirectional loop inference](lite://doc/loop-type-inference).

### Updates and exits

- Normal body completion: commit the tail expression as the next T value.
- continue value: commit the explicitly supplied T value and advance; this early-value form is selected.
- Plain continue: advance without changing .value.
- Bare break: stop without changing .value, then run normal completion processing.
- Break value: commit a T value, stop the nearest loop, and run then if present. Without then, the committed .value is the result.
- Break @loop [value]: the same targeted stop-and-complete operation. Without a payload it preserves .value; with a payload it commits T before stopping the named loop.
- Return @loop result: commit the payload as T and stop the named loop. Its `then` runs to produce R if present; without `then`, T is the result. Any inner constructs exited on the way skip their own `then` blocks.

The old acc/previous receiver slots and .acc field are retired. .value is loop-owned read-only metadata; these rules describe its internal commits, not a new permission to assign to metadata.

```text
sum := @total loop numbers as number {
    if number < 0 { continue; }
    if number == 100 { break; }
    @total.value + number
} then {
    print(.count);
    .value
}
```

Count includes skipped entries. A skipped final entry does not erase an earlier value. Skipping does not roll back effects or consumed source items.

### Zero is universal and typed

The user explicitly requires [all-zero storage to be a valid value of every type](lite://doc/zero-initialization), including functions, references, enums, and unions. The earlier zeroability restriction is superseded. The implementation must define meaningful representations/operations for these zeros, not turn them into invalid values.

For ordinary numeric T this gives 0, for String empty text, for Unit its unique `Unit` value, and for records recursively zeroed fields without declared defaults. Since Unit has one inhabitant, `zero(Unit) == Unit`; the user proposes that its physical representation has zero size, requiring no stored bytes. If T is Option, its zero is .None; there is no extra Option wrapper. Exact mappings for special types remain to design under the universal requirement. Explicit nonzero initialization is separate future work, not a requirement just to admit a type into a loop.

Zero initialization still needs a known T. A .value-only body can be typed from its destination, such as x: Long = loop source { .value }. Without a destination hint or another independent constraint, reading .value alone does not establish T; the compiler must not guess a type or union member. Representation mapping is type-directed, not an arbitrary runtime default choice.

A `.value`-only body is a circular value-producing path, so the no-contributor `Unit` default does not resolve it. By contrast, a body whose reachable paths only use plain `continue` or bare `break` has no value-producing path; its `T` defaults to `Unit` unless an expected type reaches `T` through the loop result or a `.value` read in `then`.

### Completion and result types

```text
text := loop numbers as number {
    .value + number
} then {
    format_total(.value)
}
```

Assume format_total maps Int to String. The body's .value remains Int while then computes a String result. The final construct result is not readable from .value before then has computed it. Then uses ordinary tail-expression semantics; then {} returns Unit.

Action-only bodies produce Unit. A final assignment also produces Unit: an earlier calculation must not secretly remain the body's contribution. All committed paths must satisfy T's typing contract. When T is Unit, `.value` starts as the unique `Unit` value. A body that completes with Unit commits that same value; plain `continue` and bare `break` still take noncontributing control-flow paths, although `.value` looks identical afterward. `.count` measures entered iterations, not commits.

For an empty or all-skipped Int-valued loop, .value remains 0. A loop that actually produced 0 has the same value. .count separates zero entries from entered iterations, but does not reveal whether any entry committed a value. If that distinction is needed, explicit state or a future documented metadata field is required; no hidden Option/discriminator is promised by this change.

### Open contracts

- Full inference for circular .value uses, action paths, and loops with only targeted exits. When no path contributes and nothing else constrains T, T defaults to Unit; an expected type can override it.
- Complete typing algorithms for the selected no-then .value result and optional-search inference.
- Explicit nonzero seeds and complete generic/result inference under universal zero initialization.
- Ownership, replacement cleanup, moves, and borrowing of .value across iterations/completion.
- Any future contribution-count or completion-reason metadata.

## Loop result inference

### Body and destination cooperate

A loop's value type is inferred from its body together with the expected type of the surrounding expression. The destination may be an annotated binding, a function result, an argument position, or another established expression context; there is no new loop receiver syntax.

```text
x: Long = loop my_ints {
    .value + .item
}
```

Without then, the loop's normal result is its .value. Therefore the Long expectation constrains .value to Long before its initial zero and arithmetic are typed. The compiler must not first force an Int accumulator solely from the element type and then treat the entire completed loop as an unchecked cast.

Long is the user's illustrative explicit numeric type name, not a new selection of its bit width or primitive naming scheme. The source item's declared type does not change. If it is a fixed Int while .value is Long, addition must obey the eventual numeric compatibility/promotion rules. Destination-side inference does not independently authorize every implicit cast, numeric narrowing, or a special loop-only arithmetic overload.

### A value-only body can be inferred

```text
x: Long = loop source {
    .value
}
```

The destination supplies the missing type: .value is Long, its initial value is that type's zero, and each entry recommits it. No arbitrary default type is needed.

With no independent constraint, x := loop source { .value } remains ambiguous. Knowing that every type has a zero does not decide which type the programmer meant. Require ordinary type information rather than inventing a type or choosing an arbitrary union alternative.

This is a circular contribution (`T` is constrained only by an expression whose type is also `T`), not a no-contributor loop. The `Unit` default applies only when there is no value-producing path; it must not silently resolve a self-referential `.value` tail.

### Completion can have a different result type

```text
label: String = loop numbers as number {
    .value + number
} then {
    format_total(.value)
}
```

Assume numbers has Int elements and format_total accepts Int and returns String. Here the body's value type T is Int while the final result R is String. The destination constrains R; then and its operations can transmit constraints to T. A String destination does not force an unrelated body accumulator to become String.

When then simply returns .value, T and R are directly connected and the destination can constrain both. When then returns a constant unrelated to .value, the body still needs its own T constraints.

The expected type reaches the type variable it constrains:

```text
body_value: Long = loop items { continue }
then_value: Long = loop items { continue } then { .value }
finished: String = loop items { continue } then { "Finished" }
```

In the first example there is no `then`, so the expected loop result constrains `T`. In the second, `then` reads `.value`, connecting `R` back to `T`. In the third, the expected type constrains only `R`; since the body has no contribution, `T` remains its `Unit` default. An independent `then` result must not choose the hidden `.value` type.

### Search loops and noncontributing paths

```text
found: Option<User> = loop users as user {
    if matches(user) {
        break Some(user)
    }
}
```

The explicit destination types the loop result and `.value` as `Option<User>`. A matching `break value` commits `Some(user)` and stops the loop. On a non-match, the final `if` contributes nothing, so `.value` remains its default `Option<User>.None`. No explicit `continue` or `None` body is needed.

This is a noncontributing path, not a zero-contribution. A prior committed value is preserved. A declaration such as `x := if cond { value }; x` is different: `x` is zero-initialized on no match, and the tail `x` contributes that zero. Put the conditional itself in tail position, or use `else { ? }`/`continue`, to skip the contribution. An explicit `else` can contribute a replacement value.

A tagged return contributes its payload as the target's T. With no then, T is also the target's result type; with then, the target's then determines R from the committed T. The example in [control flow](lite://doc/control-flow#loop-distinction) shows a targeted search without then. Exact unannotated inference for targeted-result-only searches remains formalization work, especially when zero(T) and an independent then result are involved.

### Loops with no contributing path

An action-only body that normally completes with `Unit` gives T an ordinary type. A body whose paths all end in plain `continue` or bare `break` has no contribution expression; those exits preserve `.value` rather than supplying T. When no path contributes and nothing else constrains T, T defaults to `Unit`. An expected type can override that default.

```text
status := loop items {
    continue
} then {
    "Finished"
}
```

Here `then` establishes R as `String`, but it does not constrain T because it never reads `.value`. The type of the zero-initialized storage is unobservable in this example. If `then` instead returns `.value`, T and R become connected: without an expected type, T defaults to `Unit` and R follows; with an expected type, that constraint can override the default. With no `then`, the loop result is `.value`, so a context such as `status: Int = loop items { continue }` can provide T.

In the example above, T is `Unit` and R is `String`. The same default applies when paths end only in bare `break`. A targeted return is different: its payload contributes a T value, and the named target's `then` runs if present.

### All paths must agree with their contracts

- Body tail expressions, continue value, and break value must satisfy the selected body type T.
- Then tail expressions must satisfy final result R. A `return @loop value` must satisfy T; the named loop's `then` produces R when present, and without `then` T is the loop result.
- Bare break and plain continue preserve .value without inventing new value types. Break value commits before completion; it is not a direct R-return path.
- Assignment/declaration tails produce Unit; a Long destination does not silently turn such a body into a numeric sum.
- Conditional/match branches retain their ordinary type/union rules; inference cannot erase incompatible operations.
- Types and zero representations are determined at compile time, before runtime source checks or body execution.

Full overload resolution, literal polymorphism, numeric promotion, unions, ownership, and the inference algorithm for targeted-result-only searches remain separate formalization work. See [numbers](lite://doc/numbers), [loop value](lite://doc/loop-value), [completion](lite://doc/loop-completion), and [general inference](lite://doc/types-and-inference).

## Last entered item

### What it is useful for

- Report which item caused bare break, including its traversal position.
- Record the last visited item after normal source exhaustion.
- Resume external work from a visited position, when the source offers a suitable protocol; an index alone does not make an arbitrary stream replayable.
- Distinguish the last visited input from the last committed .value when an iteration skips or breaks.

No lookahead is required to know the last entered iteration after the loop ends. If completion observes .item, preserve the last entered item until its last required use. If completion does not observe it, no retention is required solely for completion.

### Reuse existing field names

```text
report := @scan loop [4, 8, 12] as number {
    if number > 5 { break; }
    number * 10
} then {
    entered := .count;

    if entered == 0 {
        "No items"
    } else {
        describe_last(@scan.item, @scan.index, @scan.value)
    }
}
```

Assume describe_last returns String and the source is positional. With these rules, bare break on 8 leads to then with item 8, index 1, count 2, and value 40. The item and positional index describe the last entered body, not the last committed body value. If the last entry instead used continue, it would likewise remain the last visited item without overwriting .value.

This adds no last/last_item field names or completion receivers. `.item` and, for positional sources, `.index` directly inside then select the same loop context even without an explicit tag. A nested if/match still requires a tag or captured locals; no outward field lookup is added. The optional as number binding remains iteration-local rather than being reintroduced implicitly in then.

### Zero-iteration placeholders

The user selected zero placeholders for `.item` and, for positional sources, `.index` in `then` when no body was entered. The loop's `.count` is 0, and its typed `.value` remains its initialized zero. These are distinct metadata fields with their own types.

For an iterable loop, `.item` is the language-defined zero of the source element type. For a Boolean or unconditional loop, `.item` is `Unit`, which is its own zero value because Unit has one inhabitant. Under the user's selected zero-sized representation, no payload bytes need to be stored. For a positional source, `.index` is zero; a unique set or other nonpositional source exposes `.item` but not `.index`. `.count == 0` distinguishes these placeholders from the item and, where available, index of an actual first entry. The placeholder does not claim that a source element existed or that a body ran. If completion reads this field after zero entries, no last source item needs to be retained.

This rule applies to `then` after the loop. `.item` and, for positional sources, `.index` are not available in a loop source expression or condition before an iteration is entered. Index means zero-based traversal position for positional sources, independent of source keys, reversed positions, or stride.

### Use-based retention

Retention is field-sensitive and driven by observable use, not merely by declaring a tag or adding then:

- Completion reads .item: preserve the last visited item for that read.
- Completion reads .index but not .item: preserve/reconstruct the index without keeping item storage for completion.
- Completion reads only .count/.value: no last-item retention is needed.
- A tagged access or a capture into a local counts as a use of the referenced field. Merely naming @scan or reading @scan.count does not retain every loop field.
- Retain only the latest item required by the computation, not a history of all items.

```text
score := loop large_records as record {
    score_record(record)
} then {
    .value
}
```

Here then never observes .item, so the language does not require retaining a large record for completion. Ordinary source lifetimes, body effects, captures, and required cleanup still retain their own semantics.

The implementation must keep a used item valid under the eventual ownership/borrowing rules. Use-based retention does not require an unconditional snapshot, clone, heap allocation, or runtime metadata dictionary. Exact representation and lifetime analysis remain part of the shared ownership design, rather than a reason to retain unused fields.
