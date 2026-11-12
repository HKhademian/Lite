# Module imports and compiler stages

Status: **both generated targets build from one source root and follow Lite imports; compiler source now uses namespace aliases; no build, CLI, self-host or release path concatenates compiler source**

## Implementation sequence selected 2026-11-11

1. Recognize `pub` in the lexer and parser without changing visibility yet.
2. Add a receiver-less source import that introduces that module's `pub`
   declarations into the importing file scope. This is a migration stage that
   lets the compiler source stop relying on host-side source glue.
3. Add namespace collection with `math := import "./math.lts";` — implemented
   for public functions, immutable scalar values, and public types in generated TS.
4. Migrate project source to namespace imports incrementally, so no project
   source continues to depend on implicit unpacking. **Complete for
   `compiler/src/` and `lib/core/`.**
5. Remove external source concatenation from active build paths after the
   compiler source and its bootstrap use the import graph reproducibly. **Complete
   for build, CLI, self-host, release, verification and current benchmark paths.**

With a logical source filename, the generated TS driver uses `readSource` and
a Lite-written recursive walk to read and parse imports. It marks a canonical
path visited before following imports and processed after parsing the unit.
Receiver-less imports seed the importing scope with `pub` declarations, then
emit imported definitions under per-unit runtime identities. Private
declarations stay out of the importing scope. Namespace aliases expose public
functions, immutable scalar values, and types through qualified lookups,
including qualified type annotations and function signatures. Repeated aliases
to one canonical source share its graph identity. Original runtime source spans
remain pending. A cycle terminates
at its visited edge; references to declarations in a not-yet-processed module
are not resolved as mutual declarations yet. Parser-only calls without a filename validate syntax
only. Public TS compile/check/run use this path. Both TS and C compilation use
this same generated TS compiler and Lite-owned source graph; the C emitter is
still a TS-hosted backend, not a native self-hosted compiler.

The first isolated library alias case was `integer := import ".../int.lts";`.
The checked integer operations are explicitly `pub`. Compiler modules now
qualify cross-file references, including the shared frontend's target-aware
literal operations. Build dependencies and hashes come from the files the Lite
graph visitor actually reads, rather than a parallel host-side import scanner.

## Selected import surface

The initial module import is a top-level immutable binding:

```lite
math := import "./math.lts";
```

Namespace import is the intended explicit collection form. A receiver-less
import is also part of the migration sequence and introduces `pub` declarations
into the importing file scope; whether this stays as permanent implicit
unpacking or is replaced by an explicit unpack form remains open until source
migration is complete. Package lookup, selective imports, and block-local
imports are outside this sequence. Top-level declarations are intended to be
private by default. `pub name := ...` will add a declaration to a module
interface; a private `cos` will remain usable in its source unit but unknown to
an importer.

Two aliases to the same canonical source denote the same module and definition
identities. The module namespace is fixed; aliases cannot add or replace
members. This does not choose the runtime mutability of a value explicitly
declared by a module.

## Per-source compiler pipeline

Source files remain separate through parsing, name resolution and checking.
The compiler must not concatenate their Lite text or recover original locations
through a flattened line map. Each syntax node, definition and diagnostic owns
a source identity and a span within that source.

1. **Source access:** a small host adapter reads a requested source file and
   returns its canonical identity, text and decoding/path errors. It does not
   parse import declarations, traverse the graph, choose compilation order, or
   splice source text.
2. **Import graph:** Lite recognizes `name := import "path";`, resolves the
   dependency edge, and retains the module alias and import-site span. On first
   entry it sets `visited` before following imports. This terminates cycles and
   avoids reopening repeated paths. Every edge remains recorded.
3. **Unit parsing:** each visited source is parsed once into its own typed
   module/unit representation. `processed` is tracked separately from
   `visited`; it denotes completed compiler work on that unit, not merely that
   traversal entered it.
4. **Definition and interface collection:** each unit gets its own definition
   table. The local table includes private and public declarations; its public
   interface contains only `pub` declarations. Repeated aliases point at the
   same interface and symbol identities.
5. **Resolution and checking:** qualified lookups resolve through the alias's
   module interface. A private or absent member is unknown to an importing
   unit. Definitions remain compile-time facts, distinct from runtime values
   and initializer execution.
6. **Lowering and emission:** backends consume checked module units or a
   target-neutral lowered form. They do not receive flattened Lite source.
   Emitted artifact organization may differ by target while preserving source
   ownership, module identity and explicit dependency metadata.

## Example through the stages

```lite
// math.lts
pub twice := fn(x: Int): Int { x * 2 }
```

```lite
// app.lts
math := import "./math.lts";
answer := math.twice(4);
```

- **Graph:** `app.lts` has an alias `math` pointing to the one `ModuleId` for
  `math.lts`; the import edge keeps its own source span.
- **Parsed units:** `twice` and `answer` remain definitions in their original
  units. The call stores the span of `math.twice` in `app.lts`.
- **Interface:** `math.lts` publishes `twice` as a `SymbolId`. A private
  declaration would stay in its unit's local definition table.
- **Resolved/checkable form:** the member reference becomes that `SymbolId`;
  its callable type is checked against the `Int` argument. The compile-time
  symbol is known before the runtime value of `answer` is initialized.
- **Lowering:** the target-neutral call references the resolved function
  identity and preserves the originating unit/span for diagnostics.
- **Emission:** the target backend emits the module's target-visible definitions and
  the `answer` initializer without needing concatenated Lite source.

`visited` only guarantees finite graph discovery. Whether cyclic dependencies
are admissible for symbol resolution, and the order of any runtime
initialization, remain separate decisions. Importing a module causes its source
to pass through parsing, checking and emission even if no member is referenced;
explicit target declarations such as C FFI exports must therefore survive
unused-member elimination.

## Bootstrap transition

The selected TS seed now rebuilds the TS and C compiler roots through the Lite
import graph. The host reads only each manifest's root file; the compiler trace
supplies dependency identities from actual source reads. Release and self-host
paths pass a root path and source bytes to the generated compiler. The loader's
flattening helpers remain for legacy phase fixtures and historical reports;
they are not used by active compiler production paths. Native C self-hosting is
still a separate, unproven milestone.
