# Loop type inference from both directions

Status: **body type `T`, final result type `R`, destination-side expectations, and the no-contributor `Unit` default are selected; full numeric/operator and inference algorithms remain open**.

## Body and destination cooperate

A loop's value type is inferred from its body together with the expected type of the surrounding expression. The destination may be an annotated binding, a function result, an argument position, or another established expression context; there is no new loop receiver syntax.

```text
x: Long = loop my_ints {
    .value + .item
}
```

Without then, the loop's normal result is its .value. Therefore the Long expectation constrains .value to Long before its initial zero and arithmetic are typed. The compiler must not first force an Int accumulator solely from the element type and then treat the entire completed loop as an unchecked cast.

Long is the user's illustrative explicit numeric type name, not a new selection of its bit width or primitive naming scheme. The source item's declared type does not change. If it is a fixed Int while .value is Long, addition must obey the eventual numeric compatibility/promotion rules. Destination-side inference does not independently authorize every implicit cast, numeric narrowing, or a special loop-only arithmetic overload.

## A value-only body can be inferred

```text
x: Long = loop source {
    .value
}
```

The destination supplies the missing type: .value is Long, its initial value is that type's zero, and each entry recommits it. No arbitrary default type is needed.

With no independent constraint, x := loop source { .value } remains ambiguous. Knowing that every type has a zero does not decide which type the programmer meant. Require ordinary type information rather than inventing a type or choosing an arbitrary union alternative.

This is a circular contribution (`T` is constrained only by an expression whose type is also `T`), not a no-contributor loop. The `Unit` default applies only when there is no value-producing path; it must not silently resolve a self-referential `.value` tail.

## Completion can have a different result type

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

## Search loops and noncontributing paths

```text
found: Option<User> = loop users as user {
    if matches(user) {
        break Some(user)
    }
}
```

The explicit destination types the loop result and `.value` as `Option<User>`. A matching `break value` commits `Some(user)` and stops the loop. On a non-match, the final `if` has no selected arm, so its conditional context returns zero `Option<User>` (`.None`) and the loop commits that value. No explicit `continue` or `None` body is needed.

This is a deliberate value contribution, not a skip. If the loop already held a nonzero value, an unmatched conditional would replace it with zero. Use `continue` for a noncontributing loop path that must preserve `.value`, or write an explicit `else` that returns the desired existing value.

A tagged return contributes its payload as the target's T. With no then, T is also the target's result type; with then, the target's then determines R from the committed T. The example in [control flow](control-flow.md#loop-distinction) shows a targeted search without then. Exact unannotated inference for targeted-result-only searches remains formalization work, especially when zero(T) and an independent then result are involved.

## Loops with no contributing path

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

## All paths must agree with their contracts

- Body tail expressions, continue value, and break value must satisfy the selected body type T.
- Then tail expressions must satisfy final result R. A `return @loop value` must satisfy T; the named loop's `then` produces R when present, and without `then` T is the loop result.
- Bare break and plain continue preserve .value without inventing new value types. Break value commits before completion; it is not a direct R-return path.
- Assignment/declaration tails produce Unit; a Long destination does not silently turn such a body into a numeric sum.
- Conditional/match branches retain their ordinary type/union rules; inference cannot erase incompatible operations.
- Types and zero representations are determined at compile time, before runtime source checks or body execution.

Full overload resolution, literal polymorphism, numeric promotion, unions, ownership, and the inference algorithm for targeted-result-only searches remain separate formalization work. See [numbers](numbers.md), [loop value](loop-value.md), [completion](loop-completion.md), and [general inference](types-and-inference.md).
