# Core and host modules

Status: **inventory complete; implementation design scoped; no new source-level host capability selected beyond current builtins**

This plan adapts Mini's useful separation between `core/`, `util/`, and
optional `extra/` libraries. It does not copy Mini syntax or assume Lite has
the same runtime. `core/` is for the smallest supported language and host
contracts; `util/` will contain reusable Lite implementations; `extra/` may
contain optional packages that are never required to compile or bootstrap Lite.
Compiler-specific support remains in `compiler/`.

## Current capability inventory

| Current name or operation | Current source/implementation | Boundary and status |
|---|---|---|
| `outputLine(...values)` and `output(...values)` | Selected Lite source contract; generated TS and restricted C emission | Program display operations. Multiple values and zero arguments are supported according to the current contract. C supports only its admitted scalar forms. These are not currently ordinary imported functions. |
| `inputAll(prompt?)`, `inputLine(prompt?)`, `inputInt(prompt?)`, `inputFloat(prompt?)` | Generated TS artifact helpers; C emitter explicitly rejects input | Optional prompt and input-fault behavior are already specified. Keep the C target gap explicit. |
| `inputArgs()` | Generated TS artifact helper; C emitter explicitly rejects input | Reads process arguments as `List<String>` in generated TS. |
| `reportError(String)`, `exit(Int)` | Generated TS artifact helpers; C emitter explicitly rejects these operations | Host process effects; existing source contracts remain authoritative. |
| `textLength(String)`, `textAt(String, Int)`, `textSlice(String, Int, Int)` | Generated TS artifact helpers; C emitter explicitly rejects these source builtins | Pure text operations with checked access/slice behavior. They are compiler/runtime support today, not a promised cross-target host API. |
| `push_back`, `pop_back`, `listAt`, list construction/copy | Frontend/compiler lowering and generated target support | Language/compiler operations with target-specific lowering. Not currently an importable general collection library API. |
| `readSource(importer, path)` | Generated compiler's source-import driver and Node source reader | Compiler-only capability used to implement Lite imports. It is not an application filesystem API. |
| Node filesystem/process operations | TypeScript entry and compiler host adapters (`node:fs`, `process`, child processes) | Tool/compiler host plumbing. No general Lite filesystem module or filesystem operation set has been selected. |

The exact source contracts for display and input live in
[`docs/tooling-and-learning.md`](../docs/tooling-and-learning.md#temporary-input-and-output-helpers-selected-2026-11-02).
The module graph and `pub`/namespace behavior live in
[`docs/modules-and-packages.md`](../docs/modules-and-packages.md#source-imports).

## Implementation boundaries

1. **Host declaration and binding model.** Reuse Lite's top-level declaration
   shape for a bodyless function signature, provisionally
   `pub length := fn(text: String): Int;`. This reads as an ordinary public
   function declaration with its type known at compile time and no Lite runtime
   body. The compiler accepts it only when the canonical module/member has an
   explicit binding in its target host catalog; an unbound declaration is an
   error. Import it through the existing namespace alias and type-check calls
   from its signature. Ordinary public functions keep their current body and
   behavior. This is a bounded host binding, not a user-extensible plugin or
   FFI system. The first proof should cover the fixed-arity, pure text helpers;
   optional-prompt I/O and variadic display need their existing special call
   contracts preserved and are later substeps.
2. **Pure core operations.** Expose existing pure, stable contracts through
   importable modules where their current target support permits it. Keep pure
   source implementations in Lite when they already are ordinary Lite
   functions; host-backed implementations are reserved for operations already
   implemented as target/runtime primitives. Do not make compiler-only source
   reads application-visible.
3. **Process and I/O modules.** Give current input, output, error-reporting,
   exit, and argument operations explicit namespaces and signatures. Preserve
   the selected optional-prompt and variadic-display contracts, source spans,
   error streams/statuses, evaluation order, and each target's current support
   gaps. Migrate callers only after aliases pass the shared contract tests.
4. **Platform capabilities.** No general filesystem API is in the current
   Lite source contract. Keep Node source loading private to the compiler host.
   A future filesystem module needs a separate contract and target-by-target
   capability review before any operations or portability claim are added.
5. **Utility stage.** After the core/import stage is verified, inventory
   repeated non-compiler-specific helpers in `compiler/src/` and `tools/`.
   Move only useful shared algorithms into small `lib/util/` modules, and
   migrate actual callers to namespace imports. Existing `lib/core/` modules
   are provisional implementations, not a reason to build generic frameworks.
6. **Optional extras.** Keep exploratory conveniences under `lib/extra/` only
   when Lite has a real supported host contract for them. They must not enter
   compiler manifests or become self-hosting prerequisites.

## Acceptance gates

Each language/source increment gets its own atomic commit. Before adopting a
new declaration form in the compiler source, first verify its parser, signature
checking, visibility, positive and negative cases, runtime binding, supported
target behavior, deterministic rebuild, seed fixed point and corpus parity.
Run the full project gates required by
[`compiler development`](../.agents/rules/compiler-development.md). Never
edit generated bootstrap seeds by hand. The source-location table is out of
scope and must remain byte-for-byte unchanged.
