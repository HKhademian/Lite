# Pattern binding and shadowing

Status: **ordered shadowing within patterns selected on 2026-10-18; shadowing across successful conditional-chain and subject-based match-guard bindings selected on 2026-10-23**.

## Purpose and rule

Every binding identifier in a pattern introduces an ordinary binding. Repeated identifiers are allowed and later bindings shadow earlier ones. `_` follows exactly the same rule as x or _user; its underscore prefix only permits nonuse without unused-name warnings.

An unmarked bare identifier in a pattern binds, even if an outer value or type has that name. Use explicit case syntax such as `.None` for a payload-free constructor test. Constructor heads with payload parentheses retain their distinct role. Existing-value tests use `== expected`; type-only tests use `: Type`. Both are selected and introduce no name; see [pattern primitives](pattern-bindings-and-tests.md).

## Binding order

Traverse positional pattern components from left to right, recursively finishing each component before moving to the next. Constructor payload patterns follow that same order. For named-field patterns, use their written pattern order, not source record layout. A supplied component uses either a variable binding or a nested pattern; no additional whole-value binding is introduced before traversing a nested pattern. Complete recursive parsing and ownership remain separate.

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

Later successful and operands can use existing earlier bindings and may introduce a new binding with the same name. Resolve the later source and comparison-pattern RHS free names before its new bindings are introduced, using the scope established by earlier successful operands. After the whole pattern succeeds, its final binding of each name shadows the earlier one for subsequent operands and the body. The bindings remain distinct and may have different types; this is not assignment, equality, or widening one binding to a union. The same rule applies from an initial match-arm pattern into its if guard and between further guard operands. A failed chain leaks no bindings to else, sibling arms, or following code; ordinary outer lookup remains. See [chain shadowing](condition-chains.md#ordered-shadowing-across-operands-selected).

Condition or alternatives each start from the same incoming scope. They must introduce the same visible names after their own recursive/and-chain shadowing. A failed alternative exposes no names to the next; the first successful alternative supplies the continuation's bindings, whose types are the normalized unions of the alternatives' final binding types. This joins possible successful bindings without reassigning or changing an earlier binding's type. See [binding-producing or](condition-chains.md#binding-producing-or-alternatives-selected).

Bindings introduced inside a grouped negated matching condition may shadow incoming names for inner tests only. No new names escape not to outer operands, the body, else, or other alternatives, even through double negation. Incoming bindings retain ordinary outside lookup with their own types/access. The negated operand exports an empty name set for surrounding or checks; comparison operators, including =!=, never introduce bindings. See [negated matching conditions](condition-chains.md#negated-matching-conditions-selected).

Initial match-arm or alternatives have a separately selected missing-name rule: the union of their final visible names is exposed to the shared guard/body, and an absent name is initialized with Unit. These new bindings shadow outer names even on their Unit paths; they do not change the alternatives' pre-pattern input lookup or escape a fully failed pattern section. Complete condition/guard or alternatives continue to require identical introduced-name sets. See [differently named arm bindings](match.md#differently-named-arm-bindings-selected).

## Receiver lists and other scopes

The former loop receiver-slot lists are retired. A loop now permits one optional item identifier; count/index/value use context metadata. Destructuring inside the body still follows the ordered shadowing rules above. See [current item naming](loop-receivers.md).

Sequential local declarations may also shadow earlier bindings in the same block; see [local shadowing and copies](local-shadowing-and-copies.md). Repeated function parameter declarations and repeated record field declarations retain separate contracts. Nested lexical scopes can shadow ordinary names as before. Each match arm has its own scope, independent of sibling arms.

## Capabilities and lifetime

Each binding receives its own inferred or constrained type and declared access capabilities. Different bindings of one spelling may have different types; no individual binding changes type. Reassigning the visible binding requires var. Mutating through it requires mut and the usual permissions.

Hidden bindings remain real bindings. Shadowing does not waive ownership obligations or imply immediate destruction, a skipped extraction, or free duplication of noncopyable data. Failed matching and guards must still permit subsequent arms under the eventual ownership contract. Ownership commitment, exact lifetime, and extraction effects remain open.

## Remaining decisions

- Complete operand boundaries and composition grammar for the selected value/type tests.
- Complete recursive grammar for selected variable-or-pattern collectors, named-field aliases, and tuple rest.
- Logical not/alternatives inside one structural pattern; grouped matching-condition negation exports no names; successful and-chain shadowing and same-name binding-producing condition or alternatives are selected.
- Per-construct mismatch behavior outside if/match selection.
- Complete stored Result payload extraction contracts, preserving selected .ok/.err outcome-side inspection.
- Enum `.case` versus current-context `.field` collisions.
- Ownership, extraction effects, narrowing stability, coverage, and diagnostics beyond unused-name intent.

The earlier recommendation to reject duplicate names inside one pattern is superseded by ordered shadowing. See [pattern aliases](pattern-aliases.md) for the retained reference comparison and optional distinct naming.

The [pattern primitives](pattern-bindings-and-tests.md) now select bind, type match, and value match. Bare identifiers bind and `.None` selects the absent Option case explicitly. The broader [pattern context review](pattern-contexts.md#review-findings-and-decisions-to-settle-first) records the remaining matching contracts.
