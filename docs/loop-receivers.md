# Optional loop item name

Status: **one optional item identifier selected by the user, 2026-10-19; separator spelling remains provisional**.

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

Neither mode needs a placeholder item binding to access count or value. Whether either mode exposes Unit through .item remains a protocol question; no fabricated source item is introduced by the optional-name syntax.

## Retired forms

The old as item, count, previous and as _, _, acc lists, repeated receiver-slot shadowing, seeded receiver headers, and header tuple patterns are not current forms. As remains working notation for the single optional name; colon is an earlier candidate, not an automatically accepted synonym.

Related: [loop value](loop-value.md), [tags](tags-and-contexts.md), [loops](loops.md), [patterns](pattern-contexts.md), and [examples](loop-examples.md).
