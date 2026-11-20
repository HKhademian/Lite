# Tuples, Arrays, Lists & Aliases

Lite separates structural shapes from nominal data types: structural tuples (`(x = 1, y = 2)`), nominal `record` types (`User := record { ... }`), fixed `[T; N]` arrays for static sequences, growable `List<T>` collections for dynamic buffers, and transparent `type` aliases.

## Tuples, Labels & `=name` Shorthand

Tuples group zero or more named or positional components:

- Unit `()` (empty tuple), singleton `(42,)` or `(x = 42)`
- Unnamed pairs `(10, 20)` with type `(:Int, :Int)`
- Named tuples `(width = 800, height = 600)` accessed as `.width`
- Shorthand labels `(=x, =y)` expanding cleanly to `(x = x, y = y)`
- Mixed tuples `(10, tag = "ok")` with type `(:Int, tag: String)`

Destructure any tuple positionally or by named field (using `alias = field` and `=name` shorthand), and convert between compatible tuple shapes:

```lite
io := import "core/io";

rect := { width := 640; height := 480; (=width, =height) };
(w = width, = height) := rect;
io.outputLine(rect, w * height);
```

## Nominal `record` Types & `=name` Shorthand

Declare distinct nominal records with `record { ... }`, optional field defaults, zero initialization (`= 0`), `Type { = name }` construction, contextual `{ ... }`, and `{ alias = field, = same } := value;` destructuring (bare `{ name } := rec` without `=` is rejected):

```lite
io := import "core/io";

Config := record {
    host: String = "localhost";
    port: Int = 8080;
};

cfg := { port := 9090; Config { = port } };
defaulted: Config = {};
{ endpoint = host, = port: Int } := cfg;
io.outputLine(endpoint, port, defaulted.host, defaulted.port);
```

## Fixed Arrays `[T; N]` vs Growable `List<T>`

Sequence literals `[a, b, c]` infer fixed-size `[T; N]` arrays unless typed as `List<T>`. Both support bounds-checked indexing (`seq[i]`) and `loop seq as elem` iteration; fixed `[T; N]` arrays also support `[first, second, third] := fixed;` destructuring (runtime-sized `List<T>` requires indexing):

```lite
io := import "core/io";
list := import "core/list";
fmt := import "core/format";

fixed: [Int; 3] = [10, 20, 30];
[first, _, third] := fixed;
queue: mut List<Int> = [2, 3];
list.pushFront(mut queue, 1);
list.pushBack(mut queue, 4);
saved: List<Int> = queue;
head := list.popFront(mut queue);
io.outputLine("ends:", first, third, "head:", head, "queue:", fmt.joinIntTexts(queue, ","), "saved:", fmt.joinIntTexts(saved, ","));
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

See [Tuples & Patterns](../../../../docs/tuples-and-patterns.md), [Records](../../../../docs/records.md), [Aggregate Patterns](../../../../docs/aggregate-patterns.md), [Arrays](../../../../docs/arrays.md), [Lists](../../../../docs/lists.md), and [Type Aliases](../../../../docs/type-aliases.md).

## Next Chapter

Continue to [Blocks, Wiring & Closures](../execution/blocks-wiring-and-closures.md).
