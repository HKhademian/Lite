# Loop examples: complete working design

Status: **design examples, 2026-10-19; no compiler implementation or execution claim**. These examples use the latest unified-completion proposal with tag access. They do not finalize the receiver separator, completion keyword, library adapters, or other contracts explicitly marked open below. Helpers such as print, format_total, visit, and parse_int stand for separately defined operations.

## Full worked example

Assume format_total takes an Int and returns a String.

```text
numbers := [3, -2, 0, 5, -1, 99];

summary := @scan loop numbers as number, count, previous {
    /* Exit the tagged loop directly, bypassing then. */
    if number == -999 {
        return @scan "Cancelled";
    }

    /* Stop without adding a contribution; then still processes state. */
    if number == -1 {
        break;
    }

    /* Skip without replacing the previous contribution. */
    if number < 0 {
        continue;
    }

    print(count);
    print(.count);
    print(@scan.item);

    total := previous.value_or(0);

    /* Contribute early, then advance to the next iteration. */
    if number == 0 {
        continue total;
    }

    /* Normal tail expression commits the next accumulator value. */
    total + number
} then(done) {
    /* The loop tag remains readable in completion. */
    print(@scan.count);

    if done.count == 0 {
        "No iterations"
    } else {
        match @scan.acc {
            .Some(total) { format_total(total) }
            .None { "Iterations ran, but all skipped" }
        }
    }
}

print(summary);
```

Under the proposed completion rules, the shown input enters five iterations. Contributions are 3, skip, 3, 8, then break preserving 8. The value 99 is never visited. Then runs once with count 5 and acc .Some(8); its final String becomes summary. The receiver count is not a zero-based source index.

Previous is the accumulator before this iteration; done.acc and @scan.acc refer to the final accumulator during completion. An explicit tag works inside nested if/match contexts, where leading-dot lookup must not search outward. Metadata is read-only.

Useful alternative inputs:

- []: count 0, acc .None, producing "No iterations". Empty literal element typing comes from context; standalone empty-literal inference remains separate.
- [-2, -3]: count 2, acc .None, producing the all-skipped message.
- [3, -2]: count 2, acc .Some(3), retaining a contribution despite the final skip.
- [0]: count 1, acc .Some(0), because continue total explicitly contributes zero.
- [-1]: count 1, acc .None, because bare break contributes nothing.
- [-999]: the direct result is "Cancelled" and then is bypassed.

## Three source modes

### Iterable: source evaluated once

```text
loop users as user {
    greet(user);
}
```

An expression that produces an iterable is evaluated once to obtain the source. Iteration then advances that source.

### Boolean: condition reevaluated before each entry

```text
@attempts loop @attempts.count < 10 {
    attempt();
}
```

Count starts at zero before the first condition and increments on entry. The body is entered with counts 1 through 10. The untagged current-context form is:

```text
loop .count < 10 {
    attempt();
}
```

Accumulator state can also participate in the condition:

```text
total := @bounded loop @bounded.count < 10
    and @bounded.acc.value_or(0) < 30
    as _, count, previous {
    previous.value_or(0) + count
} then(done) {
    done.acc.value_or(0)
}
```

Line breaks have no grammatical meaning. Count and accumulator are initialized before the first condition; there is no current item before body entry. Boolean/unconditional item payload Unit remains a proposed choice.

### Unconditional: no source

```text
loop {
    work();
    if finished() {
        break;
    }
}
```

There is no post-condition syntax. Put a check after work inside the body when needed. Naming the count also works without a source:

```text
loop as _, count {
    print(count);
    if count >= 10 {
        break;
    }
}
```

## Receiver combinations

These are alternative forms, not clauses of one loop:

```text
loop users { record_visit(); }
loop users as user { greet(user); }
loop users as user, count { report_visit(user, count); }
loop users as user, _, previous { previous.value_or(0) + user.age }
loop users as _, count { print(count); }
loop users as _, _, previous { inspect(previous); }
```

The slots are item, entered-iteration count, previous optional accumulator. Trailing slots may be omitted. Underscore-prefixed names are ordinary bindings allowed to be unused; _ also binds normally. Repeated names shadow from left to right, so as _, _, _ leaves _ naming the accumulator. No implicit ordinary names are introduced.

An item may be destructured when every admitted item has that shape:

```text
loop pairs as (left, right), count {
    inspect_pair(left, right, count);
}
```

Refutable selection stays in the body:

```text
loop optional_users as candidate {
    if .Some(user) := candidate and user.age >= 18 {
        greet(user);
    }
}
```

Do not replace candidate in that header with a refutable .Some(user) pattern. Filtering and mismatch behavior are not part of loop receiver syntax.

## Direction, stride, keys, and entries

These are source/adaptor candidates, not new loop keywords. The exact range and library spellings remain provisional:

```text
loop 1..=10 as number { print(number); }
loop 10..=1 as number { print(number); }
loop (1..=10).step(2) as number { print(number); }
loop users.reverse() as user { greet(user); }
loop users.reverse().step(2) as user { greet(user); }
loop directory.keys() as key { inspect(key); }
loop directory.items() as (key, value) { inspect_entry(key, value); }
```

Reverse/step availability depends on source capabilities. Reversing an arbitrary stream must not silently promise cheap traversal or hidden buffering. Count still counts entered iterations rather than original collection positions.

## Nested loops and targeted exits

```text
@rows loop grid as row {
    @cells loop row as cell {
        if cell < 0 {
            continue @rows;
        }

        if cell == 0 {
            break;
        }

        visit(cell);
        report_position(@rows.count, @cells.count);
    }
}
```

Bare break ends the nearest loop. Continue @rows abandons the remaining inner work and advances the outer loop without an outer contribution; it does not normally complete the inner loop. Targeted transfers do not cross function/closure boundaries. Cleanup during escaping transfers belongs to the separate deferred lifecycle review.

A tagged return can supply a complete outer-loop result directly:

```text
found := @search loop users as user {
    if matches(user) {
        return @search Some(user);
    }
}
```

This is the requested concise optional-search direction: exhaustion supplies None. Its precise result inference is still open, so it is not a completed typing rule. Return @search supplies the final loop result and bypasses completion processing. Bare return @search supplies Unit, not an inferred empty Option. Break value remains unconfirmed shorthand; use the established tagged-return form when showing an explicit final-result exit.

## Completion receiver variants

The receiving candidate can transform an Int contribution into another final type:

```text
description := @total loop numbers as number {
    @total.acc.value_or(0) + number
} then(done) {
    format_total(done.acc.value_or(0))
}
```

An unused-allowed receiver still opts into a value-producing hook:

```text
message := loop users as user {
    greet(user);
} then(_) {
    "Finished"
}
```

The action-only candidate remains:

```text
loop users as user {
    greet(user);
} then {
    print("Finished");
}
```

The action-only preservation contract and exact result inference without completion remain open. Neither example defines how Unit participates in accumulator contributions. The unified proposal does not add separate loop empty-else or finally clauses; all-exit cleanup remains deferred.

## Local error handling and function exits

Assume parse_int returns Int! and report_error returns Unit. Recover an individual parse by skipping that iteration:

```text
sum := loop texts as text, _, previous {
    number := parse_int(text) else(error) {
        report_error(error);
        continue;
    }

    previous.value_or(0) + number
} then(done) {
    done.acc.value_or(0)
}
```

Or explicitly forward its error from a declared fallible function:

```text
sum_text := fn(texts: [String]): Int! {
    loop texts as text, _, previous {
        number := parse_int(text)!;
        previous.value_or(0) + number
    } then(done) {
        done.acc.value_or(0)
    }
}
```

Postfix ! exits the function on a returned error; it is not a loop break and does not enter the normal-completion block. A plain return likewise exits the nearest function/closure, not the nearest loop. Panics follow their implicit failure path. Body-wide recovery/cleanup syntax is deferred; these examples use only existing operation-local recovery.

## Boundaries still to settle

The examples cover the current forms and explicit candidates without introducing seeded-header syntax, break-value shorthand, whole-loop external recovery, post-tested loops, or all-exit completion semantics. Receiver separator, unified then adoption, seed syntax, some Unit/result inference rules, optional-search inference, adapter APIs, ownership, and cleanup still need decisions. No runtime cost or execution result here is compiler-verified.

Related: [loops](loops.md), [receivers](loop-receivers.md), [accumulator](loop-accumulator.md), [unified completion](unified-loop-completion.md), [tags](tags-and-contexts.md), [control-flow exits](control-flow.md), and [deferred cleanup/resources](deferred-cleanup-and-resources.md).
