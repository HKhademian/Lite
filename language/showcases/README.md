# LiteLang Ability and Feature Showcase

A progressive six-chapter, twenty-topic verified curriculum teaching every core **LiteLang** language ability and `lib/core/` module. Run any topic directly from the repository root with:

```sh
./bin/lite run language/showcases/foundations/bindings/bindings-and-mutability.lts
```

Every topic is backed by a verified scenario manifest under [artifacts/showcases](lite://repo/language/verifications/artifacts/showcases) (checked by `./bin/lite verify --all` or filtered with `--filter 'showcase.foundations.*'`) and structured machine-readable curriculum metadata in [catalog.json](lite://repo/language/showcases/catalog.json). For tiny focused semantic checks see [language/verifications/features](lite://repo/language/verifications/features.json); for domain-grouped demos see [language/examples](lite://repo/language/examples/README.md).

## Chapter 1 — Foundations (`foundations/`)

- [01 — Bindings, Zero Defaults, Reserved Storage, and Mutability](lite://play/example/showcase-bindings-and-mutability): `:=`, zero-initialized declarations, `= ?` reserved storage, `var`, `=`, and `+=`. ([declarations](lite://doc/declarations-and-assignment), [zero init](lite://doc/zero-initialization), [reserved storage](lite://doc/reserved-storage), [mutability](lite://doc/mutability))
- [02 — Integers, Floats, Division Families, Narrow Widths, and Power](lite://play/example/showcase-numbers-and-division): truncating `/` & `%` vs floor `:/` & `:%`, `Float` contexts, `Int8`/`Int16`/`Int32`/`Float32`, and right-associative `**`. ([numbers](lite://doc/numbers), [operators](lite://doc/operators), [power](lite://doc/power-and-negation))
- [03 — Escapes, Code-Point Text Operations, and UTF-8 Conversion](lite://play/example/showcase-strings-and-unicode): escapes, `core/text` code-point indexing and trimming, `core/unicode` scalar/UTF-8 round-trips, and `core/format` joins. ([strings](lite://doc/strings))

## Chapter 2 — Control Flow (`control/`)

- [01 — Value Conditionals, Chained Comparisons, and Subjectless Match](lite://play/example/showcase-conditionals-and-match): expression `if`/`else`, single-evaluation `a <= b < c` chains, partial statements, and subjectless Boolean `match`. ([conditionals](lite://doc/conditionals), [comparison chains](lite://doc/comparison-chains), [match](lite://doc/match))
- [02 — Conditional & Sequence Loops, Metadata, Break Payloads, and Then](lite://play/example/showcase-loops-and-completion): conditional and `loop ... as` traversal, `.index`/`.count`/`.value`, `break value`, and `then`. ([loops](lite://doc/loops), [loop value](lite://doc/loop-value), [loop completion](lite://doc/loop-completion))
- [03 — Labeled @tag Transfers and LIFO Finally Cleanup](lite://play/example/showcase-tagged-blocks-and-finally): `@tag` returns, multi-loop `continue @tag`, `@tag.value` forwarding, and LIFO `finally` cleanup. ([tags](lite://doc/tags-and-contexts), [finally](lite://doc/finally), [control flow](lite://doc/control-flow))
- [04 — Subject-Based Match, Comparison Patterns, Or Alternatives & Guards](lite://play/example/showcase-subject-match-and-patterns): subject-based `match` with literals, comparison patterns, `or` alternatives, `if` guards, `Bool` exhaustiveness, and record/array patterns. ([match](lite://doc/match), [comparison patterns](lite://doc/comparison-patterns), [match guards](lite://doc/match-guards))

## Chapter 3 — Data & Types (`types/`)

- [01 — Tuples, Shorthand Labels, Label Conversion, and Destructuring](lite://play/example/showcase-tuples-and-destructuring): positional/named/mixed/singleton tuples, `=name` shorthand, label conversion, and `var` destructuring. ([tuples](lite://doc/tuples-and-patterns), [label conversions](lite://doc/tuple-label-conversions))
- [02 — Fixed `[T; N]` Arrays vs Mutable `List<T>` Snapshots](lite://play/example/showcase-arrays-and-lists): fixed arrays vs growable `mut` and `var mut` lists, `push_front`/`push_back`/`pop_front`/`pop_back`, and snapshots. ([arrays](lite://doc/arrays), [lists](lite://doc/lists), [mutability](lite://doc/mutability))
- [03 — Transparent Type Aliases Across Root and Inner Blocks](lite://play/example/showcase-type-aliases-and-scoping): root and inner-block `type` aliases, forward inner alias chains, and outer alias preservation. ([type aliases](lite://doc/type-aliases), [blocks](lite://doc/blocks-and-results))
- [04 — Nominal Records, =name Shorthand, and Aggregate Destructuring](lite://play/example/showcase-records-and-patterns): nominal `record` declarations, defaults and zero-init, `=name` construction/destructuring, named/mixed tuple patterns, and fixed-array destructuring. ([records](lite://doc/records), [aggregate patterns](lite://doc/aggregate-patterns))

## Chapter 4 — Unified Block Model & Execution Trace (`blocks/`)

- [01 — Value Blocks, Final-Item Rule, Scopes, and Dead-Code Pruning](lite://play/example/showcase-value-blocks-and-dce): value blocks vs `Unit`-tail statement scopes, pure dead-code elimination, and retained side effects. ([blocks and results](lite://doc/blocks-and-results))
- [02 — Parallel Compile-Time Symbol Wiring and Nearer-Forward Shadowing](lite://play/example/showcase-parallel-symbol-wiring): forward references, mutual & direct own-name recursion, 4-level nearer-forward precedence, and eager outer-shadow reads. ([functions](lite://doc/functions), [blocks](lite://doc/blocks-and-results))
- [03 — Compile-Time Wiring vs Runtime Execution Trace Safety](lite://play/example/showcase-execution-trace-safety): ordered runtime initialization past `= ?`, write-before-read inside closures, and list-queued closures. ([first initialization](lite://doc/first-initialization), [reserved storage](lite://doc/reserved-storage))

## Chapter 5 — Functions & Closures (`functions/`)

- [01 — Named/Shorthand Calls, Self Recursion, and Early Exit](lite://play/example/showcase-named-calls-and-recursion): positional/named/`=name` arguments, `self(...)` recursion, script args, and explicit `io.exit` termination. ([functions](lite://doc/functions), [tooling and learning](lite://doc/tooling-and-learning))
- [02 — Callable Types, Contextual Inference, and Function Dispatch](lite://play/example/showcase-first-class-functions): `fn(...)` type aliases, omitted-type lambda inference, `map`/`filter`/`fold`, and `List<fn>` pipelines. ([functions](lite://doc/functions), [closures](lite://doc/closures))
- [03 — Lexical Closures Capturing State, Lists, Loop Items, and Frames](lite://play/example/showcase-lexical-closures-and-state): escaping stateful counter frames, captured `mut List` writes, and per-iteration `loop` item captures. ([closures](lite://doc/closures), [functions](lite://doc/functions))

## Chapter 6 — Modules & Core Utilities (`modules/`)

- [01 — Namespace Imports, `pub` Contracts, and Private Module Helpers](lite://play/example/showcase-modules-and-visibility): importing [math-stats](lite://repo/language/showcases/modules/visibility/helpers/math-stats.lts) for `pub` types, values, and functions while keeping helpers private. ([visibility](lite://doc/visibility), [blocks](lite://doc/blocks-and-results))
- [02 — Path Normalization, Temp Workspaces, File I/O, and Finally Cleanup](lite://play/example/showcase-files-paths-and-cleanup): `core/path`, `core/file` temporary directories, `core/format` alignment, and `finally` cleanup. ([tooling](lite://doc/tooling-and-learning), [finally](lite://doc/finally))
- [03 — Cryptographic Digests, Encodings, and Host/Clock Invariants](lite://play/example/showcase-crypto-time-and-env): `core/crypto` SHA-256, HMAC, Hex & Base64 round-trips alongside `core/time` and `core/process` checks. ([tooling](lite://doc/tooling-and-learning))
