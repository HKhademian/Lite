# Imports, Visibility & Core I/O

Lite keeps module dependencies explicit and local: every external capability enters a file through a named `import` binding, and only symbols marked `pub` leave a module.

## Namespace Imports & `pub` Contracts

Import standard helpers with `"core/..."` (or Play modules with `"gfx/..."` / `"media/..."`) or sibling files with a relative path (`"./helpers/math-stats.lts"`):

```lite
/* helpers/math-stats.lts */
pub Stats := alias (count: Int, total: Int);
pub scaleFactor := 2;

hiddenBoost := fn(x: Int): Int { x + 1 };

pub summarize := fn(values: List<Int>): Stats {
    var sum := 0;
    var count := 0;
    loop values as v {
        sum += hiddenBoost(v);
        count += 1;
    }
    (=count, total = sum)
};
```

Consumers can import a module (such as `"./helpers/math-stats.lts"` or `"math/scalar"`) as a namespace alias or destructure specific exports (`[pub] { Name, =Name, Local = Exported } := import "...";`) without pulling private helpers into scope:

```lite
io := import "core/io";
scalar := import "math/scalar";
{ clamp, pi = PI } := import "math/scalar";

io.outputLine(scalar.abs(-7), clamp(15, 0, 10), pi > 3.14);
```

Note that `.lts` extension scripts and `.lt` module files contain no hidden prelude—every module declares its own imports cleanly.

[Open the complete two-file example in Play](lite://play/example/showcase-modules-and-visibility)
to run the caller and inspect its helper. The
[source import rules](lite://doc/modules-and-packages#source-imports)
cover how relative paths and public symbols resolve.

## Browser-Safe Type, Core, Math, DS, Data & GFX Modules

Shipped modules documented in [Modules](lite://module) (`type/*`, `core/*`, `math/*`, `ds/*`, `data/*`, `gfx/*`, `media/*`, `ui/*`, `lite/*`) fall into three runtime environments:

| Environment | Modules | Where it runs |
| --- | --- | --- |
| **Browser + CLI (`type/*`, `core/*`)** | `type/int`, `type/float`, `type/bool`, `type/string`, `type/list`, `type/array`, `type/map`, `type/set`, `type/option`, `type/error`, `type/slice`, `type/number`, `type/rc`, `type/simd`, `type/soa`, `core/io`, `core/crypto`, `core/source`, `core/test`, `core/diag`, `core/interface`, `core/text-builder` | Runs everywhere: Browser Worker, CLI TS & native C11 |
| **Browser + CLI (`math/*`, `ds/*`, `data/*`, `gfx/color`)** | `math/scalar`, `math/random`, `math/vector`, `math/matrix`, `math/geom`, `ds/grid`, `ds/arena`, `ds/pool`, `ds/intern`, `ds/lru`, `ds/ring`, `ds/deque`, `ds/heap`, `ds/bitset`, `ds/sparse`, `ds/spatial`, `data/json`, `data/csv`, `gfx/color`, `core/timer` | Pure Lite math, geometry, data structures, codecs & allocators on TS & C11 |
| **Lite Play & Surfaces** | `gfx/canvas`, `gfx/surface`, `gfx/board`, `media/audio` | Browser Play Canvas, `./bin/lite play` desktop stage & headless tests |
| **CLI / Host OS** | `core/file`, `core/path`, `core/process`, `core/time` | Requires local `./bin/lite run` or native C11 host OS access |

## Reading Input, Arguments & Exiting Explicitly

Inside [core/io](lite://module/core/io):

- `io.inputLine()`, `io.inputInt()`, `io.inputFloat()`, `io.inputAll()` accept an optional prompt `String` argument.
- `io.output(...)` and `io.outputLine(...)` format scalars, tuples, fixed arrays, and `List<T>` values separated by single spaces.
- `io.inputArgs()` returns script CLI arguments after `--`.
- `io.exit(code)` terminates cleanly with exit status `code` (`Never` return type).

On CLI hosts, combine [core/path](lite://module/core/path) and [core/file](lite://module/core/file) with `finally` cleanup for safe temporary-workspace automation, or [core/crypto](lite://module/core/crypto) and [type/string](lite://module/type/string) for deterministic SHA-256 / HMAC digests.

See [Visibility](lite://doc/visibility) and [Tooling & Learning](lite://doc/tooling-and-learning).

## Next Chapter

Continue to [Graphics, Surfaces & Lite Play](lite://handbook/graphics-surfaces-and-play).
