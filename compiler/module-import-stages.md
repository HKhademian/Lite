# Module imports and compiler stages

Status: **owner-selected surface; implementation architecture in progress**

## Selected import surface

The initial module import is a top-level immutable binding:

```lite
math := import "./math.lts";
```

There is no bare import, implicit unpack, selective import, package lookup, or
block-local import in this increment. Top-level declarations are private by
default. `pub name := ...` adds a declaration to the module interface; importers
can resolve it only through their alias, such as `math.sin`. A private `cos`
remains available within its defining module and appears unknown through
`math.cos` in another module.

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

The current host source expander may remain as a temporary bridge while the
Lite-written compiler gains this pipeline. First establish the import contract
in generated compiler support; then adopt imports in compiler source and move
normal builds to separate source units. Remove `loadBundle`-style text
expansion, flattened line maps and compatibility bundles from active build
paths after the selected generated compiler can rebuild the separate-unit
compiler source to a fixed point.
