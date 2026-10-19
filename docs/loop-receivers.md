# Optional loop item name

Status: **one optional item identifier using as selected by the user, 2026-10-19**.

## Template

```text
[@tag] loop [source] [as item_name] {
    body
} [then { completion_body }]
```

Brackets mean optional grammar components. There is no count/value receiver list and no completion receiver. The remaining optional identifier names the same current element as .item. It has ordinary read-only binding behavior unless a future item-access contract explicitly grants more permissions; the word item does not imply mutability.

```text
loop users {
    greet(.item);
}

loop users as user {
    greet(user);
    report_visit(.index, .count);
}
```

Leaving out the item name introduces no implicit ordinary identifier such as it. Metadata remains accessible through the current context or an explicit @tag. The item name also provides convenient lexical access inside nested conditionals, where leading-dot access refers to that nested construct instead.

## Destructuring and selection belong in the body

The current header accepts one item name, not a receiver pattern. This replaces the older tuple-pattern headers as well as the count/accumulator slots:

```text
loop pairs as pair {
    (left, right) := pair;
    process(left, right);
}

loop optional_users as candidate {
    if .Some(user) := candidate {
        greet(user);
    }
}
```

No mismatch filtering, early termination, implicit error, or unchecked unwrap comes from the header. The old filtering alternatives remain [deferred](loop-pattern-alternatives.md). General pattern shadowing remains supported inside ordinary destructuring; removing loop receiver lists does not remove that language feature.

## Other source modes

```text
loop .count < 10 {
    print(.count);
}

loop {
    work();
    if finished() { break; }
}
```

Neither mode needs a placeholder item binding to access count or value. The user supports keeping an item interface in these modes for generalization and moving code between loop forms. Unit is the proposed payload, making .item and an optional as item binding uniform without duplicating count/index. The exact synthetic item payload remains to confirm; no iterable element is fabricated.

## Retired forms

The old as item, count, previous and as _, _, acc lists, repeated receiver-slot shadowing, seeded receiver headers, and header tuple patterns are not current forms. As is the selected separator for the single optional name. The earlier colon separator is retired rather than accepted as a synonym.

Related: [loop value](loop-value.md), [tags](tags-and-contexts.md), [loops](loops.md), [patterns](pattern-contexts.md), and [examples](loop-examples.md).
