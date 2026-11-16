# Transparent Type Aliases Across Root & Inner Blocks

Give domain names to tuple, list, or function shapes with `type` aliases—at file scope or inside any local `{ ... }` block.

## Walkthrough

1. `Point := type (x: Int, y: Int);` creates a transparent alias at file scope (interchangeable with `(x: Int, y: Int)`).
2. Inside `blockSum := { ... }`, `Alias := type RawPair;` references `RawPair` declared *later* in the same block!
3. Re-declaring `Point := type String;` inside `blockSum` shadows `Point` cleanly for that scope only; outer `Point` stays `(x: Int, y: Int)`.

> [!NOTE]
> Lite's `type` aliases are structural/transparent, so values don't need wrapping constructors to satisfy `Point`.

## Try Modifying This

1. Define a `Rect := type (origin: Point, size: Point);` alias and construct one value at root.
2. Check how inner shadowing prevents type confusion once the block closes.

See [Handbook: Tuples, Arrays, Lists & Aliases](../../../handbook/types/tuples-arrays-lists-and-aliases.md) and [Type Aliases](../../../../../docs/type-aliases.md).
