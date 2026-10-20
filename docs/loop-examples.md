# Loop examples: metadata-only state

Status: **updated to the one-item-name, typed .value, and tagged-return completion rules, 2026-10-20; design examples, not compiler-verified execution**. As, continue value, bare/value break, explicitly targeted break, and normal result rules are selected; adapter names and full inference remain open. Print, format_total, parse_int, and other helpers stand for separately defined operations.

## Full worked loop

Assume numbers has Int elements and format_total maps Int to String.

```text
numbers := [3, -2, 0, 5, -1, 99];

summary := @scan loop numbers as number {
    if number == -999 {
        return @scan 0;
    }
    if number == -1 { break; }
    if number < 0 { continue; }

    print(.item);
    print(.index);
    print(.count);

    if number == 0 {
        continue @scan.value;
    }

    .value + number
} then {
    print(.count);
    format_total(.value)
}
```

The shown input enters five iterations. Value starts at Int zero, then becomes 3, stays 3 after the skip, is explicitly recommitted as 3, becomes 8, and remains 8 on break. The value 99 is never visited. Then sees count 5 and value 8. During active entries, index is 0 through 4 while count is 1 through 5. If an input reaches the cancellation branch, return @scan 0 supplies the loop's Int T and the loop's then runs format_total(0); the old String payload was invalid for this body type.

An empty source or all-skipped source leaves Int value 0. Count distinguishes no entries from some entries; value cannot distinguish no commit from a genuine result of zero. A skipped last entry preserves the prior value. No Option is automatically inserted.

## Item name or direct context

```text
sum := loop numbers {
    .value + .item
}

sum := loop numbers as number {
    .value + number
}

loop users as user {
    greet(user);
    report_visit(.index, .count);
}
```

There are no count/previous/accumulator receiver slots. The selected normal result without then is final .value. Item names are ordinary read-only bindings; no mutable access is granted by naming an item. Destructure inside the body:

```text
loop pairs as pair {
    (left, right) := pair;
    inspect_pair(left, right, .count);
}

loop optional_users as candidate {
    if .Some(user) := candidate and user.age >= 18 {
        greet(user);
    }
}
```

Header tuple patterns and refutable patterns are not current forms.

## Three source modes

```text
/* Iterable: obtain source once, then advance. */
loop users as user { greet(user); }

/* Boolean: reevaluate before every body entry. */
loop .count < 10 { attempt(); }

/* Count and value can constrain a Boolean loop. */
total := @bounded loop @bounded.count < 10 and @bounded.value < 30 {
    @bounded.value + @bounded.count
}

/* No source: unconditional iteration. */
loop {
    work();
    if finished() { break; }
}
```

Count and typed value are initialized before the first condition. A current item is not available in the source/condition or before a body entry. Index is the zero-based active traversal position; item/index are available during active iterations and as last-visited metadata in then. If no body ran, then receives type-directed zero placeholders and `.count == 0`. A source union of Bool and iterable has no selected meaning. No post-condition loop form is added.

## Direction, stride, keys, and entries

These are provisional source/adapter spellings, not new loop keywords:

```text
loop 1..=10 as number { print(number); }
loop 10..=1 as number { print(number); }
loop (1..=10).step(2) as number { print(number); }
loop users.reverse() as user { greet(user); }
loop users.reverse().step(2) as user { greet(user); }
loop directory.keys() as key { inspect(key); }
loop directory.items() as entry {
    (key, value) := entry;
    inspect_entry(key, value);
}
```

Reversal and stepping still yield index 0, 1, 2, etc., independent of original source indices/keys. Source capabilities govern whether reverse/step is supported without hidden buffering.

## Nested loops and exits

```text
@rows loop grid as row {
    @cells loop row as cell {
        if cell < 0 { continue @rows; }
        if cell == 0 { break @rows; }
        visit(cell);
        report_position(@rows.index, @cells.index);
    }
}
```

Continue @rows abandons remaining inner work and advances the outer loop without an outer value commit. Bare break stops the nearest loop; `break @rows` stops the named outer loop. Both follow the selected loop's normal completion, and adding a tag to a loop does not change which loop bare break targets. Return @tag result supplies T to the named construct and runs that target's then if present; any inner then blocks exited on the way are skipped. A target without then returns T directly. Plain return exits the nearest function/closure. Transfers cannot cross a function/closure boundary. Break value commits its T operand and stops the selected loop before normal completion.

Nested conditionals have their own result context; read-only conditional `.value` requires an explicit tag and is available only in that conditional's attached `then`. Use an explicit loop tag or captured local for outer metadata inside a conditional; ambiguous leading-dot metadata access is rejected rather than resolved by shadowing or outward search. The optional item name is useful for lexical access inside such nested bodies.

## Completion results

```text
sum := loop numbers as number { .value + number }

text := loop numbers as number {
    .value + number
} then {
    print(.count);
    format_total(.value)
}

message := loop users as user {
    greet(user);
} then {
    "Finished"
}
```

The body's value type stays Int in the numeric examples while then can compute String. Then {} or a Unit-producing final action yields Unit; it does not silently preserve a prior value. The tag remains in scope through then; a last item is retained for completion only when that computation observes it.

## Local recovery or function propagation

Assume parse_int returns Int!, and report_error returns Unit.

```text
sum := loop texts as text {
    number := parse_int(text) else(error) {
        report_error(error);
        continue;
    }
    .value + number
}

sum_text := fn(texts: [String]): Int! {
    loop texts as text {
        number := parse_int(text)!;
        .value + number
    }
}
```

Local recovery skips a failed parse without committing a new value. Postfix ! forwards an error from the nearest function/closure and does not enter normal loop completion. Panics retain their implicit failure path. Body-wide handlers, defer, resources, and all-exit cleanup remain deferred.

## Not finalized by these examples

Full .value type inference and zero representation, optional-search inference, nonzero initialization, ownership mechanics for used last-item state, and ownership/cleanup remain separate contracts. No seeded header, extra receivers, automatic Option wrapper, or whole-loop external recovery is selected.

Related: [loops](loops.md), [item name](loop-receivers.md), [value](loop-value.md), [completion](loop-completion.md), [tags](tags-and-contexts.md), [exits](control-flow.md), and [deferred cleanup](deferred-cleanup-and-resources.md).
