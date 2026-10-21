# Evaluation order

Status: **left-to-right operator operands and function arguments established; ownership and cleanup details open**.

## Purpose

Make expressions with calls and other observable effects predictable independently of whitespace, while keeping operator grouping separate from evaluation order.

## Operator operands

Evaluate the left operand expression before the right operand expression. Apply this rule recursively to the grouped expression. Operator precedence determines grouping; it does not mean evaluating every higher-precedence expression before the left operand.

Assuming the usual grouping in this arithmetic example:

```text
left() + middle() * right()
```

with grouping `left() + (middle() * right())`, evaluation is:

1. Evaluate `left()`.
2. Evaluate `middle()`.
3. Evaluate `right()`.
4. Compute the multiplication.
5. Compute the addition.

This example illustrates order for that grouping; the complete arithmetic precedence specification remains open.

Each executed operand occurrence is evaluated once. `read() + read()` contains two separate calls and executes both; evaluation order does not imply memoization.

## Function calls

Evaluate the callee expression first, then supplied argument expressions from left to right in source order, then invoke the selected callable.

```text
choose_handler()(first(), second());
```

`choose_handler()` runs first, followed by `first()`, then `second()`, then the selected handler is called with the evaluated arguments. The callee expression is not reevaluated after evaluating arguments.

For a method-call expression, evaluate the receiver as part of evaluating the callee before the other supplied arguments. The complete method/dispatch notation remains open; this order does not choose static or dynamic dispatch.

Argument order does not determine whether arguments move, copy, or borrow, or when borrow permissions become active. Those are separate contracts. An argument may be omitted only with an applicable explicitly declared default; without one, the call is rejected regardless of parameter type. Syntax, scope, and exact evaluation timing of declared default expressions, plus named-argument rules, still need specification; see [omitted value arguments](functions.md#omitted-value-arguments).

Zero-initialized callables follow the same order. Their zero-result behavior does not skip argument evaluation or required argument cleanup. If an argument expression exits before invocation, the zero callable is not invoked. See [zero-initialized functions](zero-initialization.md#zero-initialized-functions).

## Short-circuiting and selected branches

Left-to-right order does not force evaluation of skipped expressions:

- `and` evaluates its right operand only if the left is true, under the intended Boolean short-circuit contract.
- `or` evaluates its right operand only if the left is false, under the intended Boolean short-circuit contract.
- A comparison chain skips later operands and comparisons after its first false comparison.
- A conditional evaluates only the selected branch; an `else if` condition is reached only after earlier conditions fail.
- An explicit exit during evaluation prevents subsequent operands or arguments from being evaluated.

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

Complete arithmetic precedence and associativity, record/collection initializer ordering, default-argument behavior, temporary lifetimes and destruction, borrow activation, and assignment aliasing rules remain open. No unspecified initializer or cleanup order is selected by this document.

## Related concepts and references

- [Operators](operators.md)
- [Comparison chains](comparison-chains.md)
- [Functions](functions.md)
- [Declarations and assignment](declarations-and-assignment.md)
- [Memory and performance](memory-and-performance.md)
- This is a LiteScript contract selected in the design discussion, rather than a claim that all comparison languages use the same evaluation order.
