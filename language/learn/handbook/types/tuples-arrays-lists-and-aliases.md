# Tuples, Arrays, Lists & Aliases

Lite separates structural shapes from nominal data types: structural tuples (`(x = 1, y = 2)`), nominal `record` types (`User := record { ... }`), fixed `[T; N]` arrays for static sequences, growable `List<T>` collections for dynamic buffers, and transparent aliases.

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

Notice `saved: List<Int> = queue;` takes an independent value snapshot of `queue`—popping from `queue` afterward does not mutate `saved`. Both `push_front`/`push_back` builtins and [core/list](lite://module/core/list) methods ([`list.pushBack`](lite://module/core/list#pushBack), [`list.popFront`](lite://module/core/list#popFront), etc.) are supported.

## Typed Maps `Map<K, V>`

Store typed key-value entries with `Map<K, V>` (scalar or nominal `enum` keys, any value type). Maps zero-initialize empty, require `mut Map<K, V>` for indexed writes (`scores["alice"] = 18;`) or mutating [core/map](lite://module/core/map) calls, copy independently on assignment, and iterate `(key, value)` pairs in insertion order:

```lite
io := import "core/io";
map := import "core/map";

scores: mut Map<String, Int>;
scores["alice"] = 18;
map.set(mut scores, "bob", 25);
io.outputLine(scores["alice"], map.getOr(scores, "carol", 0), map.size(scores));
```

## Typed Sets `Set<T>`

Store unique scalar or nominal `enum` values with `Set<T>`. Sets zero-initialize empty, require `mut Set<T>` for mutating [core/set](lite://module/core/set) calls (`add`, `remove`, `clear`), copy independently on assignment, and iterate elements in insertion order:

```lite
io := import "core/io";
set := import "core/set";

tags: mut Set<String>;
set.add(mut tags, "lite");
set.add(mut tags, "typed");
set.add(mut tags, "lite");
io.outputLine(tags, set.size(tags), set.has(tags, "lite"));
```

## Nominal Plain & Value Enums

Declare nominal closed case sets with `enum { ... }` or attach scalar backing values with `enum : Type { ... }` (`Int*`, `Float*`, `String`, `Bool`). Use contextual `.Case` shorthand wherever the enum type is known, read backing values via `.value`, and rely on exhaustive `match`:

```lite
io := import "core/io";

Status := enum : Int {
    Ok = 200;
    Created;
    NotFound = 404;
};

s: Status = .Created;
label := match s { .Ok or .Created { "ok" } .NotFound { "missing" } };
io.outputLine(s, s.value, label);
```

## Transparent `type` Aliases & Inner Type Scope

The selected design spells a transparent alias `Name := alias TypeExpression`.
For example, `Point := alias (x: Int, y: Int)` names a structural tuple type.
A `distinct` declaration creates a fresh type identity. See
[aliases and distinct type declarations](lite://doc/type-aliases).

The runnable example uses `Name := type TypeExpression`, the spelling accepted
by the current Playground. `Point` names a tuple type with fields `x` and `y`.
`Pair` names a tuple type with two unnamed `Int` components scoped to the block.
The annotation `pair: Pair` uses the block's forward type lookup.

```lite
io := import "core/io";

Point := type (x: Int, y: Int);
p: Point = (x = 3, y = 4);

pairSum := {
    pair: Pair = (10, 20);
    Pair := type (:Int, :Int);
    pair.0 + pair.1
};
io.outputLine(p, pairSum);
```

The block's final expression adds the two tuple components, so `pairSum` is `30`.

See [Tuples & Patterns](lite://doc/tuples-and-patterns), [Records](lite://doc/records), [Enums & Variants](lite://doc/enums-and-variants), [Aggregate Patterns](lite://doc/aggregate-patterns), [Arrays](lite://doc/arrays), [Lists](lite://doc/lists), [Typed Maps](lite://doc/maps), [Typed Sets](lite://doc/sets), and [Type Aliases](lite://doc/type-aliases).

## Next Chapter

Continue to [Blocks, Wiring & Closures](lite://handbook/blocks-wiring-and-closures).
