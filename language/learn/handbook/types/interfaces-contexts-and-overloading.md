# Interfaces, Contexts & Overloading

Lite separates data declarations from behavior contracts (`interface` / `impl`), threads implicit dependencies explicitly through lexical `context(...)`, and resolves overloaded functions statically.

## Nominal `interface`, `impl`, Associated Types, & Defaults

Declare a contract with `interface { ... }`—including method signatures, associated types (`Item: Type`), and optional default method bodies—then opt concrete types in explicitly with `impl Interface for Type`. Use bounded generics (`fn<T: Iface>(x: T)`) for zero-vtable static specialization, or `dyn Interface` / `mut dyn Interface` for borrowed 16-byte fat-pointer dispatch:

```lite
io := import "core/io";

Show := interface {
    unitName: fn(self: Self): String;
    describe := fn(self: Self): String { "unit=" + self.unitName() };
};

Source := interface {
    Item: Type;
    nextVal: fn(self: Self): Self.Item;
};

Meter := record { scale: Int = 1; };
impl Show for Meter {
    unitName := fn(self: Meter): String { "m*" + self.scale.toText() };
};
impl Source for Meter {
    Item := Int;
    nextVal := fn(self: Meter): Int { self.scale * 10 };
};

Pixel := record { dpi: Int = 96; };
impl Show for Pixel {
    unitName := fn(self: Pixel): String { "px@" + self.dpi.toText() };
    describe := fn(self: Pixel): String { "screen:" + self.unitName() };
};

readFirst := fn<T: Type<Source>>(src: T): T.Item { src.nextVal() };
printDyn := fn(x: dyn Show): String { x.describe() };

m := Meter { scale = 10 };
p := Pixel { dpi = 144 };
io.outputLine(readFirst(m), m.describe(), printDyn(p));
```

## Lexical Contexts (`context(...)`) & `$context.lt`

Functions declare ambient dependencies with `context(name: Type)` (or `mut Type`). Callers provide package defaults in `$context.lt` (or module-level `context name := value`), or establish scoped overrides with `context (name = value) { ... }`:

```lite
io := import "core/io";

context prefix := "[app]";
context mut counter: Int = 0;

emitEvent := fn(msg: String) context(prefix: String, counter: mut Int): String {
    counter += 1;
    prefix + "#" + counter.toText() + ":" + msg
};

a := emitEvent("boot");
b := context (prefix = "[auth]") { emitEvent("login") };
c := emitEvent("ready");
io.outputLine(a, b, c);
```

## Function Overloading & `Index` / `Range`

Multiple free functions or type operations can share one name when their parameter arities or concrete/bound parameter types differ. The compiler ranks candidates statically (`concrete > multi-bound > single-bound > dyn > generic`). Standard [core/interface](lite://module/core/interface) `Index` / `Range` hooks unify indexing and slicing uniformly:

```lite
io := import "core/io";

fmtVal := fn(n: Int): String { "int=" + n.toText() };
fmtVal := fn(s: String): String { "str=" + s };
fmtVal := fn(a: Int, b: Int): String { (a + b).toText() };

io.outputLine(fmtVal(7), fmtVal("ok"), fmtVal(10, 20));
```

See [Composition & Interfaces](lite://doc/composition-and-interfaces), [Tags & Contexts](lite://doc/tags-and-contexts), and [core/interface](lite://module/core/interface).

Try [Interfaces & Dyn Dispatch](lite://play/interfaces-and-dyn), [Lexical Contexts & Overloads](lite://play/lexical-context-and-overloads), and the [verified Interfaces, Contexts & Overloads showcase](lite://play/example/showcase-interfaces-contexts-and-overloads).

## Next Chapter

Continue to [Slices, SIMD, SoA & Layout](lite://handbook/slices-simd-and-layout).
