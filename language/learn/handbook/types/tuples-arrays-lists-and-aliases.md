# Tuples, Arrays, Lists & Aliases

Lite keeps composite data lightweight and explicit: flat structural tuples for lightweight records, fixed `[T; N]` arrays for stack-sized sequences, growable `List<T>` collections for dynamic buffers, and transparent `type` aliases.

## Tuples, Labels & `=name` Shorthand

Tuples group zero or more named or positional components:

- Unit `()` (empty tuple), singleton `(42,)` or `(x = 42)`
- Unnamed pairs `(10, 20)` with type `(:Int, :Int)`
- Named tuples `(width = 800, height = 600)` accessed as `.width`
- Shorthand labels `(=x, =y)` expanding cleanly to `(x = x, y = y)`
- Mixed tuples `(10, tag = "ok")` with type `(:Int, tag: String)`

Destructure any tuple directly into locals or `var` bindings, and convert between compatible tuple shapes:

```lite
io := import "core/io";

width := 640;
height := 480;
rect := (=width, =height);
(w, h) := rect;
io.outputLine(rect, w * h);
```

## Fixed Arrays `[T; N]` vs Growable `List<T>`

Sequence literals `[a, b, c]` infer fixed-size `[T; N]` arrays unless typed as `List<T>`. Both support bounds-checked indexing (`seq[i]`) and `loop seq as elem` iteration:

```lite
io := import "core/io";
list := import "core/list";
fmt := import "core/format";

fixed: [Int; 3] = [10, 20, 30];
queue: mut List<Int> = [2, 3];
list.pushFront(mut queue, 1);
list.pushBack(mut queue, 4);
saved: List<Int> = queue;
head := list.popFront(mut queue);
io.outputLine("fixed[1]:", fixed[1], "head:", head, "queue:", fmt.joinIntTexts(queue, ","), "saved:", fmt.joinIntTexts(saved, ","));
```

Notice `saved: List<Int> = queue;` takes an independent value snapshot of `queue`—popping from `queue` afterward does not mutate `saved`. Both `push_front`/`push_back` builtins and `core/list` methods (`list.pushBack`, `list.popFront`, etc.) are supported.

## Transparent `type` Aliases & Inner Type Scope

Declare transparent type names with `type` at root or inside any `{ ... }` block. Inner blocks support forward type references and lexical type shadowing:

```lite
io := import "core/io";

Point := type (x: Int, y: Int);
p: Point = (x = 3, y = 4);

localLen := {
    pair: Pair = (10, 20);
    Pair := type (:Int, :Int);
    pair[0] + pair[1]
};
io.outputLine(p, localLen);
```

See [Tuples & Patterns](../../../../docs/tuples-and-patterns.md), [Arrays](../../../../docs/arrays.md), [Lists](../../../../docs/lists.md), and [Type Aliases](../../../../docs/type-aliases.md).

## Next Chapter

Continue to [Blocks, Wiring & Closures](../execution/blocks-wiring-and-closures.md).
