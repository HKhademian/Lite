# Modules and packages

Status: **distinct .lts scripts and .lt module files, module-owned facilities, and explicit module access selected 2026-10-30; header-free declaration lookup direction retained; exact syntax, initialization, and run-mode conveniences remain open or proposed**.

## Purpose

Support a single-file first lesson and a path to reusable, explicitly versioned libraries without requiring students to learn packaging before writing a program.

**FVP scope, clarified 2026-10-30:** the source-kind and module architecture below
is later design context, not a gate for the tiny runnable first viable product.
Do not require two source modes, imports, packages, or a script-importability
decision before that FVP. See [the immediate focus](principles.md#immediate-focus-first-viable-product).

## Intended experience

```text
lite run lesson.lts
lite build lesson.lts
```

The .lts script extension is selected. These commands describe the intended
tool experience; no run/build tool exists in this workspace, and mode behavior
and full command grammar remain under investigation.

One file should run without a manifest or handwritten entry function. A package can add metadata, dependencies, exports, and an entry point as it grows. The executable body of a run file is defined in [blocks and results](blocks-and-results.md#source-file-body); this page governs packages, imports, and visibility.

## Distinct script and module files

Selected **2026-10-30**:

- **.lts is a script source.** Keep the convenient executable file body, with
  items evaluated top to bottom and no handwritten entry wrapper required.
- **.lt is module-based source.** Its source unit is declaration-oriented and
  belongs to an owning package/module namespace. It is not an interchangeable
  script file or an implicit script entry body. Exact package headers, exports,
  entry declarations, initialization, and file-to-module mapping remain open.
- Facilities belong to packages/modules. In module-based source, access them
  through module qualification or explicit member unpacking/introduction.
  Possible local module aliases can keep qualification short; exact alias,
  unpack/import syntax (including the suggested using spelling) is not selected.
  There are no implicit imports in .lt files, including core type names such
  as Int and Bool. Short names require explicit introduction; qualified names
  retain their module owner. Language syntax/literal tokens are not imports;
  inferring the type of a literal does not implicitly import its type's name.
- Script-run conveniences must not make names ambient inside an imported .lt
  module. A module's explicit dependencies do not change because a script uses
  it. Import syntax alone does not choose host authority or operation effects.

This revises the former single .lite suffix. Current lesson/catalog paths use
.lts; .lite references in dated review snapshots remain historical. No legacy
input alias or automatic .lt-to-script fallback is selected. The distinction is
within one language, preserving shared expression, type, call, safety, and
explicit-output rules inside the corresponding constructs.

## Replaceable standard modules

Selected design goal, **2026-10-30**: even the standard module/file should be
replaceable. Standard facilities have package/module owners and are accessed
through the same explicit namespace/dependency model; the spelling std does not
itself grant an ambient namespace or special name-access permission. A project
should be able to supply an alternative provider for a standard module/file.

This does not choose a replacement mechanism. Source paths, package versions,
module aliases, toolchain configuration, provider compatibility checks, ABI,
and reproducibility details remain open. The boundary between compiler-defined
syntax/intrinsics and module-provided definitions must be specified explicitly;
replacing a standard provider does not silently settle numeric, initialization,
type, or failure contracts. No standard library or provider resolver exists yet.

Later investigations: [standard swapping, primitive boundaries, and interface/
implementation locations](../research/investigations/SUBTOPICS.md#inv-071), plus
[lean generated code](../research/investigations/SUBTOPICS.md#inv-063-05). These questions
are not started and do not choose a replacement or interface layout.

## Module lookup without header files

Selected direction, 2026-10-28: module-based source should permit safe forward
references among declarations without requiring authors to maintain separate
header files or duplicate signatures. The compiler can resolve the declarations
from their source. This is a namespace/declaration-resolution direction, not
permission to reorder arbitrary runtime initializers or access invalid storage.
Declaration dependency cycles, recursive inference, cross-file resolution,
initialization scheduling, and exact admissibility/proof rules remain open.

Every executed code block still follows
[top-to-bottom evaluation](evaluation-order.md#executable-block-items). Resolving
a later declaration is distinct from executing its initializer. Arbitrary
top-level runtime statements and import-time effects are not selected here.

The user also requested a later investigation of whether .lt should prohibit
top-level side-effect execution. Because declarations are assignments and their
initializers may call effectful code, declaration-only source does not establish
that restriction by itself. [INV-003.05](../research/investigations/SUBTOPICS.md#inv-003-05)
covers initializer effects, deferred function bodies, compile-time evaluation,
transitive dependencies, and any explicit initialization entry. It is not started;
no blanket ban or effect-checking mechanism is selected.

Compile-time evaluation and metaprogramming remain possible investigations;
declaration-oriented modules do not prohibit them. A future compile-time block
would still need defined execution order, while scheduling dependencies between
declarations is a separate question. Syntax, capabilities, permitted effects,
cycles, and reproducibility rules are open under
[INV-062](../research/investigations/TOPICS.md#inv-062). No comptime or macro facility is
selected or implemented by this direction.

The script/module distinction now uses .lts versus .lt. Growing a script into a
module may require expressing its package, dependencies, and entry behavior;
the full migration contract remains open under INV-003.04. The suffix selection
does not complete module/import grammar.

## Source imports

Owner-selected namespace collection form, **2026-11-11**:

```lite
math := import "./math.lts";
```

An import is a top-level module definition. The left side gives the immutable
module alias; imported members are accessed through that alias. Paths are
relative to the importing source file, use `/` separators, and name a source
file directly. Package lookup and version solving remain out of scope.

The implementation will first support a receiver-less import that introduces
the imported module's `pub` declarations into the importing file scope, as a
staged route away from host-side source concatenation. The codebase must migrate
to namespace collection before deciding whether this open-import form remains
or an explicit unpack form replaces it. No project source should retain a
dependency on implicit unpacking after the alias migration.

As of **2026-11-11**, the compiler lexer and parser recognize `pub` on a
top-level declaration and the receiver-less `import "path";` clause. The
generated TypeScript driver now reads and parses imported units using the
compiler's Lite-owned graph walk when invoked with a source filename. It marks
a unit visited before following imports and processed after its outgoing
imports. Receiver-less imports now expose `pub` functions and immutable scalar
values to the importing scope and emit imported definitions with per-unit
runtime identities. Private declarations remain hidden; duplicate exported
names are rejected. Public types, retained source spans for runtime
diagnostics, and module alias bindings are not implemented yet. Cycles
terminate during graph traversal, but references to declarations in a
not-yet-processed module are not resolved as mutual declarations. Parser-only
calls without a source filename remain syntax checks. Public TS compile/check/run
use the Lite graph walk; C compilation and compiler-source assembly still use the host
expander as a temporary bridge.

The target model keeps source units separate through parsing and resolution,
without splicing Lite text. The current stage parses each canonical file once,
then combines typed items into one emitted artifact; module-specific runtime
identities avoid name collisions. `visited` is set when a source is entered,
before following imports; `processed` is set after its imports and local parse
complete. A cycle edge to an already visited source does not reopen it. Retained
per-source runtime spans remain future work.

Visibility is explicit. A top-level declaration is private by default;
`pub` makes it available through an importing module alias:

```lite
// math.lts
pub sin := fn(x: Float): Float { ... }
cos := fn(x: Float): Float { ... }
```

```lite
math := import "./math.lts";
math.sin(x); // resolves
math.cos(x); // unknown through this module
```

Private declarations remain usable within their defining source unit but are
not members of its imported interface. Importing a module does not add runtime
effects or grant ambient host authority. The compiler still parses, checks and
compiles every imported unit, even when no member is referenced, so target
declarations such as explicit C FFI exports can be emitted. Runtime module
initialization order remains a separate decision.

The current host-side source expander is a bootstrap bridge, not the language
semantics. It may remain while the Lite-written compiler learns module imports;
the finished path must pass separate source units to the compiler and remove
text splicing and flattened line maps.

## Broader module import sketch

```text
import std.fs;
import school.students.{Student, find_student};
```

This is working notation for module imports, not part of the selected `.lts`
source-assembly grammar above. Explicit imports and exports are the intended
direction for modules. Re-exports should be deliberate.

The braces in the import-list sketch group imported names; they are not a block body. This ordinary import item keeps its separator. A final item may omit its separator, and block constructs now also permit an optional trailing semicolon; token classification must not depend merely on the last character being }.

## Visibility

For imported modules, top-level declarations are private by default. The
selected spelling `pub name := ...` exposes a declaration through its module
alias. Private declarations remain visible inside their defining source unit;
an inaccessible member is unknown to an importer. Visibility for record fields,
re-exports, and visibility modifiers on imported module aliases remains open.

## Package contents

The proposal includes a manifest for metadata and dependency declarations, a lockfile for exact resolved versions, and file-based modules. Manifest format, package identity, version constraints, registries, offline use, and reproducibility rules remain open.

Implicit arbitrary module initialization and package installation scripts were discouraged as defaults. This is a design preference, not implemented enforcement.

## Prelude

The former general-prelude proposal is now scoped by source kind. Module-based
.lt source has no implicit imports, including core type names and bare output
APIs. Language syntax and literal typing are distinct from namespace imports;
the exact compiler-intrinsic versus module-definition boundary remains open.

For the immediate FVP, [temporary input/reporting helpers](tooling-and-learning.md#temporary-fvp-input-and-reporting)
are selected as demonstrator scaffolding. They do not select the eventual
script convenience set or require module/stdlib implementation first.

**Proposal, not a selected convenience set:** an explicit script-running mode,
illustrated by lite run script.lts, could introduce a small set of short names
for module-owned facilities and disclose this with a warning or runner log.
Their owners remain modules; this is not a second implementation of each API.
No particular alias, output name, using syntax, warning/log class, default set,
frequency, or diagnostic destination is selected. Run/build parity for .lts and
the exact activation rule remain INV-004 questions. Merely parsing or formatting
a file does not select a convenience policy, and imported .lt modules remain
explicit. Output operations still need their own effect/failure contract and
must be called deliberately; disclosure is distinct from automatic result echo.

The selected [memory-control usability boundary](memory-and-performance.md#ordinary-and-advanced-memory-control)
keeps advanced memory controls outside the default beginner surface while
requiring a deliberate entry point with little ceremony. A built-in memory-module
import is an example, not a selected module, API, or import grammar. Availability
through an import alone does not waive checks or change ordinary code's behavior.

## Open decisions

Module path resolution; cycles; declaration resolution across files; initialization order; optional/generated interface artifacts; binary versus source packages; target-specific dependencies; C interoperability; package authenticity; and the stable public API policy. Manually maintained header files or duplicate signatures are not required by the selected direction.

## Related concepts and references

- [Visibility](visibility.md)
- [Functions](functions.md)
- [Tooling and learning](tooling-and-learning.md)
- Packaging is primarily a local design requirement. See [references](references.md) for the language comparisons already discussed; no external package manager is adopted by this file.
