# Conditionals, Match & Loops

Lite unifies control flow around expressions, explicit Boolean conditions, sequence metadata, labeled `@tag` transfers, and guaranteed `finally` cleanup.

## Conditionals (`if` / `else`)

Both statement `if` and value-producing `if ... else ...` are built in. Condition expressions must have type `Bool`, without mandatory outer parentheses:

```lite
io := import "core/io";

score := 84;
label := if score >= 90 { "honors" } else if score >= 60 { "pass" } else { "retry" };

var note := "none";
if score >= 80 {
    note = "merit";
}
io.outputLine(label, note);
```

When used as a value expression, an `if` chain must end in an `else` arm with compatible branch types.

## Subjectless Boolean `match`

`match { ... }` evaluates a sequence of Boolean condition arms top-to-bottom until the first `true` arm, ending with a mandatory fallback `_` arm:

```lite
io := import "core/io";

score := 84;
grade := match {
    score >= 90 { "A" }
    score >= 80 { "B" }
    score >= 70 { "C" }
    _ { "D" }
};
io.outputLine(grade);
```

## Subject-Based `match` & Patterns

Supply a subject (`match value { ... }`) to evaluate it once and match arms with literals, all ten comparison patterns (`==`, `=!=`, `<`, `<=`, `>`, `>=`, `<!`, `<!=`, `>!`, `>!=`), `or` alternatives, `if` guards, and recursive record/tuple/fixed-array patterns:

```lite
io := import "core/io";

User := record { name: String; age: Int = 18; };

classify := fn(u: User): String {
    match u {
        { >= 65 = age, = name } { name + ":senior" }
        { = name, = age } if 18 <= age < 65 { name + ":adult" }
        { = name } { name + ":minor" }
    }
};

io.outputLine(classify(User { name = "Ada", age = 30 }), classify(User { name = "Bob", age = 70 }));
```

## Loops, Sequence Traversal & Completion (`then`)

Lite uses a single `loop` keyword for all iteration forms:

1. **Unconditional loop**: `loop { ... break; }`
2. **Conditional loop**: `loop condition { ... }`
3. **Sequence loop**: `loop items as item { ... }` (or `loop items { ... }` reading `.item`)

Inside sequence and conditional loops, dot-prefixed metadata tracks state without extra counter boilerplate:

- `.item` — current element in an unnamed sequence loop.
- `.index` — zero-based iteration index.
- `.count` — total completed iterations (`then` clause).
- `.value` — payload carried out by `break expr;` when exiting a loop early.

Attach a `then { ... }` clause to compute a result after the loop completes (either normally or via `break value`):

```lite
io := import "core/io";

firstOverFive := loop [2, 4, 6, 8] as n {
    if n > 5 { break n * 10; }
} then {
    .value + .count
};
io.outputLine(firstOverFive);
```

## Labeled `@tag` Exits & LIFO `finally`

Prefix any block, `if`, or `loop` with `@tag` to target it with `return @tag value;`, `break @tag value;`, or `continue @tag;`. On every exit—normal completion, `break`, `return @tag`, or panic unwinding—attached `finally { ... }` handlers run in strict inner-before-outer (LIFO) order:

```lite
io := import "core/io";

result := @outer {
    @grid loop [1, 2] as r {
        loop [10, 20] as c {
            if r == 2 { return @outer r * c; }
        }
    }
    0
} finally {
    io.outputLine("cleanup complete");
};
io.outputLine(result);
```

See [Conditionals](lite://doc/conditionals), [Match](lite://doc/match), [Loops](lite://doc/loops), and [Finally](lite://doc/finally).

## Next Chapter

Continue to [Tuples, Arrays, Lists & Aliases](lite://handbook/tuples-arrays-lists-and-aliases).
