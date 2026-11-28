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

rect := do { width := 640; height := 480; (=width, =height) };
(w = width, = height) := rect;
io.outputLine(rect, w * height);
```

## Nominal `record` Types & Field Shorthand

Declare distinct nominal records with `record { ... }`, optional field defaults, zero initialization (`= 0`), `Type { = name }` construction, contextual `{ ... }`, and `{ alias = field, = same, bare } := value;` destructuring (`{ name } := rec` expands `name` to `name = name`, while bare `{ _ }` is rejected in favor of `_ = field`):

```lite
io := import "core/io";

Config := record {
    host: String = "localhost";
    port: Int = 8080;
};

cfg := do { port := 9090; Config { = port } };
defaulted: Config = {};
{ endpoint = host, port: Int } := cfg;
io.outputLine(endpoint, port, defaulted.host, defaulted.port);
```

## Fixed Arrays `[T; N]` vs Growable `List<T>`

Sequence literals `[a, b, c]` infer fixed-size `[T; N]` arrays unless typed as `List<T>`. Both support bounds-checked indexing (`seq[i]`) and `loop seq as elem` iteration; fixed `[T; N]` arrays also support `[first, second, third] := fixed;` destructuring (runtime-sized `List<T>` requires indexing):

```lite
io := import "core/io";

fixed: [Int; 3] = [10, 20, 30];
[first, _, third] := fixed;
mut queue: List<Int> = [2, 3];
mut queue.pushFront(1);
mut queue.pushBack(4);
saved: List<Int> = queue;
head := mut queue.popFront();
io.outputLine("ends:", first, third, "head:", head, "queue:", queue.map(fn(x: Int): String { x.toText() }).join(","), "saved:", saved.map(fn(x: Int): String { x.toText() }).join(","));
```

Notice `saved: List<Int> = queue;` takes an independent value snapshot of `queue`—popping from `queue` afterward does not mutate `saved`. Both indexing and [type/list](lite://module/type/list) operations ([`List.pushBack`](lite://module/type/list#List.pushBack), [`List.popFront`](lite://module/type/list#List.popFront), etc.) are supported.

[Run Growable Lists in Play](lite://play/growable-lists) to see the saved list
alongside the changed list. The [list copy rule](lite://doc/lists#copy-and-ownership-decision)
explains why the saved value stays independent.

## Typed Maps `Map<K, V>`

Store typed key-value entries with `Map<K, V>` (scalar or nominal `enum` keys, any value type). Maps support `[k = v, ...]` / `[]` literals and zero-initialization (`Map<K, V>;`), require `mut Map<K, V>` for indexed writes (`scores["alice"] += 1;`) or mutating [type/map](lite://module/type/map) operations, expose `.size()` and `.isEmpty()`, copy independently on assignment, and iterate `(key, value)` pairs in insertion order:

```lite
io := import "core/io";

mut scores: Map<String, Int> = ["alice" = 10];
scores["alice"] += 8;
mut scores.set("bob", 25);
io.outputLine(scores["alice"], scores.getOr("carol", 0), scores.size(), scores.isEmpty());
```

## Nominal Plain & Value Enums

Declare nominal closed case sets with `enum { ... }` or attach scalar backing values with `enum : Type { ... }` (`Int*`, `UInt*`, `Float*`, `String`, `Bool`). Use contextual `.Case` shorthand wherever the enum type is known, read backing values via `.value`, parse raw values with `Enum.from(raw): Option<Self>`, and rely on exhaustive `match`:

```lite
io := import "core/io";

Status := enum : Int {
    Ok = 200;
    Created;
    NotFound = 404;
};

s: Status = .Created;
parsed := Status.from(200);
label := match s { .Ok or .Created { "ok" } .NotFound { "missing" } };
io.outputLine(s, s.value, parsed, label);
```

## Transparent `alias`, Static Properties & Scoped `Alias.op`

The selected design spells a transparent alias `Name := alias TypeExpression`. For example, `Point := alias (x: Int, y: Int)` names a structural tuple type. A `distinct` declaration creates a fresh type identity. Local aliases (including narrowed generics) also support static properties (`Alias.PROP := expr;`) and lexically scoped operations (`Alias.op := fn(...) ...`). See
[aliases and distinct type declarations](lite://doc/type-aliases).

```lite
io := import "core/io";

Point := alias (x: Int, y: Int);
Point.ORIGIN := (x = 0, y = 0);
Point.sum := fn(p: Self): Int { p.x + p.y };

p: Point = .ORIGIN;
pairSum := do {
    pair: Pair = (10, 20);
    Pair := alias (:Int, :Int);
    pair.0 + pair.1
};
io.outputLine(Point.sum(p), p.sum(), pairSum);
```

## Typed Sets `Set<T>`

Store unique scalar or nominal `enum` values with `Set<T>`. Sets zero-initialize empty, require `mut Set<T>` for mutating [type/set](lite://module/type/set) calls (`add`, `remove`, `clear`), copy independently on assignment, and iterate elements in insertion order:

```lite
io := import "core/io";
set := import "type/set";

mut tags: Set<String>;
set.add(mut tags, "lite");
set.add(mut tags, "typed");
set.add(mut tags, "lite");
io.outputLine(tags, set.size(tags), set.has(tags, "lite"));
```

See [Tuples & Patterns](lite://doc/tuples-and-patterns), [Records](lite://doc/records), [Enums & Variants](lite://doc/enums-and-variants), [Aggregate Patterns](lite://doc/aggregate-patterns), [Arrays](lite://doc/arrays), [Lists](lite://doc/lists), [Typed Maps](lite://doc/maps), [Typed Sets](lite://doc/sets), and [Type Aliases](lite://doc/type-aliases).

## Dependent Record Defaults & Structural `{ ... }` Records

Nominal record fields can reference earlier declared fields in their default expressions (with omitted defaults evaluated in declaration order after written overrides). Outside nominal constructors, standalone `{ ... }` literals construct anonymous structural records (`Record<$anon;...>`) directly—and `{}` creates an empty structural record:

```lite
io := import "core/io";

Span := record {
    start: Int = 2;
    end: Int = start + 10;
};

s := Span { start = 5 };
entry := { "label" = "total", value = s.end - s.start };
io.outputLine(s.start, s.end, entry."label", entry.value);
```

See also [Comptime, Defaults & Variance](lite://handbook/comptime-defaults-and-variance) for unified symbol/function `alias` declarations.

## Next Chapter

Continue to [Blocks, Wiring & Closures](lite://handbook/blocks-wiring-and-closures).
