# Pattern binding and shadowing

Status: **ordered shadowing within patterns selected on 2026-10-18**.

## Purpose and rule

Every binding identifier in a pattern introduces an ordinary binding. Repeated identifiers are allowed and later bindings shadow earlier ones. `_` follows exactly the same rule as x or _user; its underscore prefix only permits nonuse without unused-name warnings.

An unmarked bare identifier in a pattern binds, even if an outer value or type has that name. Use explicit case syntax such as `.None` for a payload-free constructor test. Constructor heads with payload parentheses retain their distinct role. Existing-value tests use `== expected`; type-only tests use `: Type`. Both are selected and introduce no name; see [pattern primitives](pattern-bindings-and-tests.md).

## Binding order

Traverse positional pattern components from left to right, recursively finishing each component before moving to the next. Constructor payload patterns follow that same order. For future named-field patterns, use their written pattern order, not source record layout. If whole-value-plus-subpattern syntax is adopted, introduce the whole-value name before traversing its nested pattern. These ordering rules do not select the still-proposed record, whole-value, or rest punctuation.

The body and later conditions see the last successful binding of each name. This is a name-resolution order; it does not specify observable getter, comparison, ownership-transfer, or destruction order. Those contracts must be defined separately.

```text
if (x, x: String) := pair {
    print(x)
}
```

The branch sees x as String from the second component. The first component can have a different type. This neither reassigns the first binding nor requires equal component values. Constraints on hidden bindings still participate in matching:

```text
if (x: Int, x: String) := pair {
    print(x)
}
```

This pattern requires an Int component followed by a String component. The first type test is not erased because its name is hidden.

```text
if (_, (_, _: String)) := value {
    print(_)
}
```

The final nested component is the last `_`, so it is the visible String binding. Use distinct explicit names when several matched values must remain accessible.

## Source lookup and successful scope

Resolve and evaluate a conditional/declaration source before introducing that pattern's names. For a match, evaluate the subject once before arm selection. A same-named source therefore resolves to the outer binding:

```text
if (pair, pair: String) := pair {
    print(pair)
}
```

Assume the outer pair has a compatible tuple type. Inside the branch, pair names the second component; outside, the outer binding remains in scope. Neither earlier nor final tentative bindings leak from a failed pattern.

The whole pattern must succeed before its bindings become available to subsequent and operands or the body. This decision does not introduce references to newly bound sibling names inside a pattern; use an and condition for subsequent tests:

```text
if (left, right) := pair and left == right {
    report_equal()
}
```

Later successful and operands can use existing earlier bindings. Whether a separate later pattern operand may redeclare one of those names is still a condition-chain scope decision. Within each operand's individual pattern, ordered shadowing is selected.

## Receiver lists and other scopes

Loop receiver slots retain their selected order: item, count, accumulator. Traverse each slot's pattern in order before the next slot. In `as _, _, acc`, the visible `_` names count; in `as _, _, _`, it names the accumulator. A repeated name never bypasses a receiver's phase-availability rules.

This rule does not enable duplicate independent declarations in an ordinary block, repeated function parameter declarations, or repeated record field declarations. Those enclosing declaration lists keep their own contracts. Nested lexical scopes can shadow ordinary names as before. Each match arm has its own scope, independent of sibling arms.

## Capabilities and lifetime

Each binding receives its own inferred or constrained type and declared access capabilities. Different bindings of one spelling may have different types; no individual binding changes type. Reassigning the visible binding requires var. Mutating through it requires mut and the usual permissions.

Hidden bindings remain real bindings. Shadowing does not waive ownership obligations or imply immediate destruction, a skipped extraction, or free duplication of noncopyable data. Failed matching and guards must still permit subsequent arms under the eventual ownership contract. Ownership commitment, exact lifetime, and extraction effects remain open.

## Remaining decisions

- Complete operand boundaries and composition grammar for the selected value/type tests.
- Full recursive grammar, named-field aliases, whole-value patterns, and rest captures.
- Rebinding across separate and operands and binding-producing or/not.
- Per-construct mismatch behavior outside if/match selection.
- Complete stored Result payload extraction contracts, preserving selected .ok/.err outcome-side inspection.
- Enum `.case` versus current-context `.field` collisions.
- Ownership, extraction effects, narrowing stability, coverage, and diagnostics beyond unused-name intent.

The earlier recommendation to reject duplicate names inside one pattern is superseded by ordered shadowing. See [pattern aliases](pattern-aliases.md) for the retained reference comparison and optional distinct naming.

The [pattern primitives](pattern-bindings-and-tests.md) now select bind, type match, and value match. Bare identifiers bind and `.None` selects the absent Option case explicitly. The broader [pattern context review](pattern-contexts.md#review-findings-and-decisions-to-settle-first) records the remaining matching contracts.
