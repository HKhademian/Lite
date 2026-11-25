# Transparent Type Aliases Across Root & Inner Blocks

This runnable lesson uses the current compiler's `:= alias` syntax for transparent
aliases at file and block scope. The selected replacement is `:= alias`.
See [aliases and distinct type declarations](lite://doc/type-aliases).

## Walkthrough

1. `Point := alias (x: Int, y: Int);` creates a transparent alias at file scope (interchangeable with `(x: Int, y: Int)`).
2. Inside `blockSum := { ... }`, `Alias := alias RawPair;` references `RawPair` declared *later* in the same block!
3. Re-declaring `Point := alias String;` inside `blockSum` shadows `Point` cleanly for that scope only; outer `Point` stays `(x: Int, y: Int)`.

> [!NOTE]
> Lite's `type` aliases are structural/transparent, so values don't need wrapping constructors to satisfy `Point`.

## Try Modifying This

1. Define a `Rect := alias (origin: Point, size: Point);` alias and construct one value at root.
2. Check how inner shadowing prevents type confusion once the block closes.

See [Handbook: Tuples, Arrays, Lists & Aliases](lite://handbook/tuples-arrays-lists-and-aliases) and [Type Aliases](lite://doc/type-aliases).
