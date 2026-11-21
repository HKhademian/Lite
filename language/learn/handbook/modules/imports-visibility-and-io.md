# Imports, Visibility & Core I/O

This runnable example uses the current compiler's `:= type` syntax for
transparent type aliases. The selected replacement is `:= alias`. See
[aliases and distinct type declarations](lite://doc/type-aliases).

Lite keeps module dependencies explicit and local: every external capability enters a file through a named `import` binding, and only symbols marked `pub` leave a module.

## Namespace Imports & `pub` Contracts

Import standard helpers with `"core/..."` (or Play modules with `"extra/..."`) or sibling files with a relative path (`"./helpers/math-stats.lts"`):

```lite
/* helpers/math-stats.lts */
pub Stats := type (count: Int, total: Int);
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

Consumers import the module into a local namespace without pulling private helpers into scope:

```lite
stats := import "./helpers/math-stats.lts";
/* `stats.hiddenBoost` is private and cannot be accessed here */
```

Note that `.lts` extension scripts and `.lt` module files contain no hidden prelude—every module declares its own imports cleanly.

## Browser-Safe Core Modules vs Host OS Modules

All 17 modules documented in [Modules](lite://module) split into three clear environments:

| Environment | Examples | Where it runs |
| --- | --- | --- |
| **Browser + CLI** | `core/io`, `core/int`, `core/text`, `core/list`, `core/unicode`, `core/format`, `core/source`, `core/test`, `core/diag` | Runs everywhere: CLI & Browser Worker |
| **Lite Play** | `extra/canvas`, `extra/board`, `extra/audio` | Browser Canvas/WebAudio stage & headless tests |
| **CLI / Host OS** | `core/file`, `core/path`, `core/process`, `core/time` (`core/crypto` on CLI) | Requires local `./bin/lite run` host OS access |

## Reading Input, Arguments & Exiting Explicitly

Inside [core/io](lite://module/core/io):

- `io.inputLine()`, `io.inputInt()`, `io.inputFloat()`, `io.inputAll()` accept an optional prompt `String` argument.
- `io.output(...)` and `io.outputLine(...)` format scalars, tuples, fixed arrays, and `List<T>` values separated by single spaces.
- `io.inputArgs()` returns script CLI arguments after `--`.
- `io.exit(code)` terminates cleanly with exit status `code` (`Never` return type).

On CLI hosts, combine [core/path](lite://module/core/path) and [core/file](lite://module/core/file) with `finally` cleanup for safe temporary-workspace automation, or [core/crypto](lite://module/core/crypto) and [core/format](lite://module/core/format) for deterministic SHA-256 / HMAC digests.

See [Visibility](lite://doc/visibility) and [Tooling & Learning](lite://doc/tooling-and-learning).
