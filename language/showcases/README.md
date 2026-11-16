# LiteLang Ability and Feature Showcase

A progressive six-chapter, eighteen-topic verified curriculum teaching every core **LiteLang** language ability and `lib/core/` module. Run any topic directly from the repository root with:

```sh
./bin/lite run language/showcases/foundations/bindings/bindings-and-mutability.lts
```

Every topic is backed by a verified scenario manifest under [artifacts/showcases](../verifications/artifacts/showcases/) (checked by `./bin/lite verify --all` or filtered with `--filter 'showcase.foundations.*'`) and structured machine-readable curriculum metadata in [catalog.json](catalog.json). For tiny focused semantic checks see [language/verifications/features](../verifications/features.json); for domain-grouped demos see [language/examples](../examples/README.md).

## Chapter 1 — Foundations (`foundations/`)

- [01 — Bindings, Zero Defaults, Reserved Storage, and Mutability](foundations/bindings/bindings-and-mutability.lts): `:=`, zero-initialized declarations, `= ?` reserved storage, `var`, `=`, and `+=`. ([declarations](../../docs/declarations-and-assignment.md), [zero init](../../docs/zero-initialization.md), [reserved storage](../../docs/reserved-storage.md), [mutability](../../docs/mutability.md))
- [02 — Integers, Floats, Division Families, Narrow Widths, and Power](foundations/numeric/numbers-and-division.lts): truncating `/` & `%` vs floor `:/` & `:%`, `Float` contexts, `Int8`/`Int16`/`Int32`/`Float32`, and right-associative `**`. ([numbers](../../docs/numbers.md), [operators](../../docs/operators.md), [power](../../docs/power-and-negation.md))
- [03 — Escapes, Code-Point Text Operations, and UTF-8 Conversion](foundations/strings/strings-and-unicode.lts): escapes, `core/text` code-point indexing and trimming, `core/unicode` scalar/UTF-8 round-trips, and `core/format` joins. ([strings](../../docs/strings.md))

## Chapter 2 — Control Flow (`control/`)

- [01 — Value Conditionals, Chained Comparisons, and Subjectless Match](control/branching/conditionals-and-match.lts): expression `if`/`else`, single-evaluation `a <= b < c` chains, partial statements, and subjectless Boolean `match`. ([conditionals](../../docs/conditionals.md), [comparison chains](../../docs/comparison-chains.md), [match](../../docs/match.md))
- [02 — Conditional & Sequence Loops, Metadata, Break Payloads, and Then](control/loops/loops-and-completion.lts): conditional and `loop ... as` traversal, `.index`/`.count`/`.value`, `break value`, and `then`. ([loops](../../docs/loops.md), [loop value](../../docs/loop-value.md), [loop completion](../../docs/loop-completion.md))
- [03 — Labeled @tag Transfers and LIFO Finally Cleanup](control/unwinding/tagged-blocks-and-finally.lts): `@tag` returns, multi-loop `continue @tag`, `@tag.value` forwarding, and LIFO `finally` cleanup. ([tags](../../docs/tags-and-contexts.md), [finally](../../docs/finally.md), [control flow](../../docs/control-flow.md))

## Chapter 3 — Data & Types (`types/`)

- [01 — Tuples, Shorthand Labels, Label Conversion, and Destructuring](types/tuples/tuples-and-destructuring.lts): positional/named/mixed/singleton tuples, `=name` shorthand, label conversion, and `var` destructuring. ([tuples](../../docs/tuples-and-patterns.md), [label conversions](../../docs/tuple-label-conversions.md))
- [02 — Fixed `[T; N]` Arrays vs Mutable `List<T>` Snapshots](types/collections/arrays-and-lists.lts): fixed arrays vs growable `mut` and `var mut` lists, `push_front`/`push_back`/`pop_front`/`pop_back`, and snapshots. ([arrays](../../docs/arrays.md), [lists](../../docs/lists.md), [mutability](../../docs/mutability.md))
- [03 — Transparent Type Aliases Across Root and Inner Blocks](types/aliases/type-aliases-and-scoping.lts): root and inner-block `type` aliases, forward inner alias chains, and outer alias preservation. ([type aliases](../../docs/type-aliases.md), [blocks](../../docs/blocks-and-results.md))

## Chapter 4 — Unified Block Model & Execution Trace (`blocks/`)

- [01 — Value Blocks, Final-Item Rule, Scopes, and Dead-Code Pruning](blocks/evaluation/value-blocks-and-dce.lts): value blocks vs `Unit`-tail statement scopes, pure dead-code elimination, and retained side effects. ([blocks and results](../../docs/blocks-and-results.md))
- [02 — Parallel Compile-Time Symbol Wiring and Nearer-Forward Shadowing](blocks/wiring/parallel-symbol-wiring.lts): forward references, mutual & direct own-name recursion, 4-level nearer-forward precedence, and eager outer-shadow reads. ([functions](../../docs/functions.md), [blocks](../../docs/blocks-and-results.md))
- [03 — Compile-Time Wiring vs Runtime Execution Trace Safety](blocks/trace/execution-trace-safety.lts): ordered runtime initialization past `= ?`, write-before-read inside closures, and list-queued closures. ([first initialization](../../docs/first-initialization.md), [reserved storage](../../docs/reserved-storage.md))

## Chapter 5 — Functions & Closures (`functions/`)

- [01 — Named/Shorthand Calls, Self Recursion, and Early Exit](functions/calls/named-calls-and-recursion.lts): positional/named/`=name` arguments, `self(...)` recursion, script args, and explicit `io.exit` termination. ([functions](../../docs/functions.md), [tooling and learning](../../docs/tooling-and-learning.md))
- [02 — Callable Types, Contextual Inference, and Function Dispatch](functions/callables/first-class-functions.lts): `fn(...)` type aliases, omitted-type lambda inference, `map`/`filter`/`fold`, and `List<fn>` pipelines. ([functions](../../docs/functions.md), [closures](../../docs/closures.md))
- [03 — Lexical Closures Capturing State, Lists, Loop Items, and Frames](functions/closures/lexical-closures-and-state.lts): escaping stateful counter frames, captured `mut List` writes, and per-iteration `loop` item captures. ([closures](../../docs/closures.md), [functions](../../docs/functions.md))

## Chapter 6 — Modules & Core Utilities (`modules/`)

- [01 — Namespace Imports, `pub` Contracts, and Private Module Helpers](modules/visibility/modules-and-visibility.lts): importing [math-stats](modules/visibility/helpers/math-stats.lts) for `pub` types, values, and functions while keeping helpers private. ([visibility](../../docs/visibility.md), [blocks](../../docs/blocks-and-results.md))
- [02 — Path Normalization, Temp Workspaces, File I/O, and Finally Cleanup](modules/filesystem/files-paths-and-cleanup.lts): `core/path`, `core/file` temporary directories, `core/format` alignment, and `finally` cleanup. ([tooling](../../docs/tooling-and-learning.md), [finally](../../docs/finally.md))
- [03 — Cryptographic Digests, Encodings, and Host/Clock Invariants](modules/system/crypto-time-and-env.lts): `core/crypto` SHA-256, HMAC, Hex & Base64 round-trips alongside `core/time` and `core/process` checks. ([tooling](../../docs/tooling-and-learning.md))
