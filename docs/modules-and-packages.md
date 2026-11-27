# Modules and packages

Status: **distinct .lts scripts and .lt module files, module-owned facilities, and explicit module access selected 2026-10-30; first-stage compile-time-known module initial values, including var/mut, selected 2026-11-14; exact module grammar, storage and later-stage runtime initialization remain open**.

## Purpose

Support a single-file first lesson and a path to reusable, explicitly versioned libraries without requiring students to learn packaging before writing a program.

**FVP scope, clarified 2026-10-30:** the source-kind and module architecture below
is later design context, not a gate for the tiny runnable first viable product.
Do not require two source modes, imports, packages, or a script-importability
decision before that FVP. See [the immediate focus](lite://doc/principles#immediate-focus-first-viable-product).

## Intended experience

```text
lite run lesson.lts
lite build lesson.lts
```

The .lts script extension is selected. These commands describe the intended
tool experience; no run/build tool exists in this workspace, and mode behavior
and full command grammar remain under investigation.

One file should run without a manifest or handwritten entry function. A package can add metadata, dependencies, exports, and an entry point as it grows. The executable body of a run file is defined in [blocks and results](lite://doc/blocks-and-results#source-file-body); this page governs packages, imports, and visibility.

## Distinct script and module files

Selected **2026-10-30**:

- **.lts is a script source.** Keep the convenient executable file body, with
  items evaluated top to bottom and no handwritten entry wrapper required.
- **.lt is module-based source.** Its source unit is declaration-oriented and
  belongs to an owning package/module namespace. It is not an interchangeable
  script file or an implicit script entry body. Exact package headers, exports,
  entry declarations, initialization, and file-to-module mapping remain open.
- Facilities belong to packages and modules. Imports introduce public names
  directly or through a namespace alias. The
  [package preload](lite://doc/modules-and-packages#package-preload) supplies
  the package's ambient imports.
- Running a script leaves the imports and preload of its dependencies scoped
  to their respective packages. Language syntax and literal typing follow
  their own rules.


Selected clarification **2026-11-15**: an ordinary assignment such as `x = 5`
is an executable assignment, not a symbol declaration. At file top level it is
allowed in a `.lts` script body and is not an allowed `.lt` module-level item.
This does not prohibit assignments inside a function or other executable block
belonging to a module. It also does not prohibit a declaration initializer from
performing an explicitly requested compile-time effect. Those operations retain
their own access, staging and failure rules.

```text
/* Illustrative script top level */
var x: Int = ?;
x = 5; /* assignment in the script's executable body */
```

The corresponding standalone top-level `x = 5;` is rejected in a module;
putting an assignment inside a function body is a distinct case. This choice
does not settle every other kind of module-level statement, reserved module
storage, or the full `.lt` grammar. These are design cases, not compiler
support claims.

Clarified **2026-11-15**: structurally, both `.lts` and `.lt` files are root
code blocks with **invisible braces**, **no parent block**, and `pub` as their
only distinction from inner braced `{ ... }` blocks (see
[source file body](lite://doc/blocks-and-results#source-file-body)). Merging `.lt` and
`.lts` into one unified file form remains open for later discussion; for now,
think of a `.lt` module file as having the same root-block structure and uniform
lookup/access rules as `.lts`, except with **no top-level runtime evaluation**
(compile-time-known initial definitions such as `x := 1`, types, `fn`
definitions, and compile-time-known `var`/`mut` initializers are admitted).

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
implementation locations](lite://repo/research/investigations/SUBTOPICS.md#inv-071), plus
[lean generated code](lite://repo/research/investigations/SUBTOPICS.md#inv-063-05). These questions
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
[top-to-bottom evaluation along the execution trace](lite://doc/evaluation-order#executable-block-items),
while sibling declarations in the block (file-level or inner `{ ... }`) share
**parallel compile-time symbol visibility** under one uniform rule. Resolving
a later declaration is distinct from executing its initializer. Arbitrary
top-level runtime statements and import-time effects are not selected here.

The user also requested a later investigation of whether .lt should prohibit
top-level side-effect execution. Although ordinary standalone assignment is
not a declaration or an allowed module-level item, declaration initializers
may call effectful code, so that distinction alone does not ban such effects.
[INV-003.05](lite://repo/research/investigations/SUBTOPICS.md#inv-003-05)
covers initializer effects, deferred function bodies, compile-time evaluation,
transitive dependencies, and any explicit initialization entry. It is not started;
no blanket ban or effect-checking mechanism is selected.

### Compile-time-known initial definitions

Selected 2026-11-14 for the **first compiler stage** (and implemented in Phase 16 via `compiler/src/comptime-eval.lt`): applicable top-level value definitions in `.lt` modules must have compile-time-known initial values. Bare top-level initializers are statically checked against direct/transitive host effects and mutable module globals before evaluation; effectful compile-time initialization uses an explicit `comptime { ... }` block, and supported scalar and owned compound results (`Record`, `List`, `[T; N]`, `Map`, `Set`, `Union`, `Result`, `Enum`, `Tuple`) materialize identically on TypeScript and C11. See [phase16-comptime-eval.test.lts](lite://repo/compiler/tests/codegen/phase16-comptime-eval.test.lts).

```text
/* Illustrative module fragments: imports and visibility omitted. */
square := fn (x: Int): Int { x * x }
width := 4 * 4;         /* compile-time-known initial value: 16 */
area := square(width);  /* compile-time-known initial value: 256 */
```

Defining `square` makes a callable definition available; it does not execute
the body merely because the function is declared. The selected module
direction permits safe forward declaration lookup, but discovering a name is
distinct from proving a dependent value is initialized. Cycles, evaluation
dependencies, scheduling, visibility, cross-file resolution and diagnostics
remain open.

An initializer requiring the eventual program's runtime input cannot supply
the first stage's compile-time-known initial value. Applications may still
perform runtime setup in runtime code; its placement, any dedicated
initialization mechanism, and runtime-dependent module initialization in later
stages remain open. Selected 2026-11-26 for the first stage: effects in a module
initializer must run inside an explicit `comptime { ... }` block. This applies
to direct effects and effects reached through ordinary function calls.
Storage and target materialization may require generated setup work; this rule
does not forbid loaders, relocations or equivalent implementation steps.

The user clarified that `var` and `mut` module bindings **are allowed in the
first stage when their initial values are compile-time known**. The existing
distinction remains: `var` permits replacement of the binding; `mut` permits
writable access to held data; `var mut` grants both. A known initial value is
not necessarily an always-known later mutable value. Precise module write grants,
aliasing, visibility, and stage-specific access remain open. Omitted
initializers, reserved storage, type and import declarations, nonmaterializable
values and function captures need complete module contracts.

```text
/* Illustrative module fragments, not current compiler evidence. */
var counter := 0;          /* known initial value; later replacement allowed */
mut entries := [1, 2];     /* known initial value; writable held data */
var mut current := [3, 4]; /* both permissions, subject to access rules */
```

Pending cases, not executable passes:

- `width` and `area` above initialize to 16 and 256; `square`'s body does not
  execute merely because its definition is encountered.
- An explicit compile-time file read can supply an initial value when its
  result is suitable for the target; that read is not repeated at program
  startup merely to recover the result.
- With build input `42`, `seed := comptime { io.readInt() };` reads once during
  compilation and supplies `42` to the program. A bare `seed := io.readInt();`
  and a bare call to a function wrapping that read are rejected before reading
  any input.
- A runtime-input-dependent top-level initializer is rejected under the first
  stage rule; declaring a function whose body reads runtime input is distinct.
- Known initial values admit `var`, `mut` and `var mut` declarations in the
  first stage; later writes follow the corresponding permission and access
  rules, and do not automatically remain compile-time known.
- Safe forward references need eventual resolution rules; a value dependency
  cycle or unavailable initial value needs a defined diagnostic.
- `.lts` script execution retains its existing top-to-bottom semantics.

The alternatives and open questions are recorded in [implicit-known values and
module initialization](lite://repo/research/investigations/INV-062-implicit-known-values-and-module-initialization.md).

Compile-time evaluation is a selected direction, while metaprogramming remains
under investigation; declaration-oriented modules do not prohibit them. A future compile-time block
would still need defined execution order, while scheduling dependencies between
declarations is a separate question. Syntax, capabilities, permitted effects,
cycles, and reproducibility rules are open under
[INV-062](lite://repo/research/investigations/TOPICS.md#inv-062). No comptime or macro facility is
selected or implemented by this direction.

The script/module distinction now uses .lts versus .lt. Growing a script into a
module may require expressing its package, dependencies, and entry behavior;
the full migration contract remains open under INV-003.04. The suffix selection
does not complete module/import grammar.

## Source imports

### Import expansion and re-exports

Design selected **2026-11-26**. Import spelling controls how the imported
module's public symbols enter the receiving scope. `pub` controls what that
scope exports to its consumers.

```text
import "./shapes";           /* public names of shapes enter this block privately */
shapes := import "./shapes"; /* the namespace alias is private in this scope */
pub import "./shapes";       /* expose the imported public names directly */
pub shapes := import "./shapes"; /* expose the namespace alias */
```

An unaliased import expands public names into its containing block. At file
scope that means the file's root block. An aliased import collects the public
names under the explicit alias. For example, if `./shapes` exports `Point`,
the two `pub` forms above let a consumer of this file access `Point` or
`shapes.Point`, respectively, under that consumer's own import of this file.
A re-export preserves the original declaration's identity and access rules.
The imported file's private declarations remain private to that file.

These are four alternative forms. A November 2026 probe verified the private
namespace form on TS and C11. Both compilers currently reject the unaliased
form with `import requires a module alias`. The public import forms and
block-local expansion are pending compiler support. See also
[visibility](lite://doc/modules-and-packages#visibility).

### Namespace import history

Owner-selected namespace collection form, **2026-11-11**:

```lite
math := import "./math";
text := import "core/text";
```

An `import` declaration introduces an immutable **compile-time token**, not a
runtime value, to refer to `pub` symbols from sibling top-level file blocks
through a namespace alias (`math.sin(...)`). Because an import is a compile-time
reference token, any compile-time initializations (or potential script-import
side effects, still open to further discussion) in the imported file are
independent of where in a file the `import` appears; deeper block-local `import`s
are prevented by the compiler for now. Import paths
use `/` separators and have three forms: `./name` and `../name` resolve from
the importing file, `/path/name` is an absolute filesystem path, and a bare
library path such as `core/text` resolves under the distribution's `lib/`
directory. Lite appends `.lts` when the path does not already end in `.lts`.
Same-directory files use the explicit `./` prefix; bare paths select library
modules. Package manifests and version solving remain out of scope.

At this historical checkpoint, generated TS supported namespace imports only. Each import has an immutable
local alias; members stay qualified, including public functions, immutable
scalar values, and public types usable in annotations. Receiverless imports
are rejected so imports cannot implicitly add names to the current scope.

As of **2026-11-12**, the compiler lexer and parser recognize `pub` and
namespace imports such as `math := import "./math";` and
`text := import "core/text";`. Relative,
absolute, and library-root paths are normalized by one host resolver shared by
compiler graph traversal and build-cache edge validation. Extensionless imports
infer `.lts`; canonical paths drive source caching and dependency tracing. The
generated TypeScript driver reads and parses imported units using the compiler's
Lite-owned graph walk. It marks a unit visited before following imports and
processed after its outgoing imports. Namespace aliases expose `pub` functions,
immutable scalar values, and public types; private declarations remain hidden.
Repeated imports of the same module share one module identity.

Duplicate aliases and exported names are rejected. Qualified public types work
in annotations and function signatures. Retained source spans for runtime
diagnostics and compiler-source adoption remain pending. Cycles terminate
during graph traversal, but references to declarations in a not-yet-processed
module are not resolved as mutual declarations. Parser-only
Host compiler input without an explicit diagnostic name uses a synthetic source
path in its working directory for relative import resolution, while keeping
diagnostics unnamed. Direct generated-compiler invocations without a source
provider path remain parser-only checks. Public TS compile/check/run use the Lite
graph walk; C compilation and compiler-source assembly still use the host
expander as a temporary bridge.

The target model keeps source units separate through parsing and resolution,
without splicing Lite text. The current stage parses each canonical file once,
then combines typed items into one emitted artifact; module-specific runtime
identities avoid name collisions. `visited` is set when a source is entered,
before following imports; `processed` is set after its imports and local parse
complete. A cycle edge to an already visited source does not reopen it. Retained
per-source runtime spans remain future work.

### Provisional core host declarations

`lib/core/io.lts` contains public bodyless declarations for the current output
operations and error stream operation:

```lite
pub output := fn(...values): Unit;
pub outputLine := fn(...values): Unit;
pub errorLine := fn(text: String): Unit;
```

The compiler binds these declarations by the resolved core module identity,
member identity, and exact ABI. An ordinary same-named function is not a host
override, and bodyless declarations outside the registered core contract are
rejected. `...values` is the heterogeneous argument pack for these special
output statements only; it does not make ordinary user functions variadic.
Imported `io.output(...)` and `io.outputLine(...)` calls keep the same one-call
argument evaluation, formatting, stream writes, and newline behavior as the
previous global forms. `io.errorLine(String)` writes to stderr with one newline.
The generated TS target supports errorLine; C preserves its current explicit
rejection of error reporting, and its output forms retain the existing scalar
subset. The global source-level forms have been removed; import `core/io` and
call the operation through its module alias.

This is a provisional importable runtime surface, not a general foreign
function interface or filesystem API. The compiler's `readSource` operation
remains an internal source-loader capability.

Visibility is explicit. A file-block declaration is private by default;
`pub` is the root file block's sole extra capability beyond an inner `{ ... }`
block and exposes chosen symbols (`fn`, `type`, immutable values, and `var`/`mut`
in the language model) through an importing module alias (authors may also keep
mutable state private and expose `pub` getter/setter helpers when narrower
encapsulation is wanted; the current generated TS compiler implements `pub`
functions, immutable scalar values, and public types):

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

The selected alias design also permits a second name for an existing import,
as in `points := alias pointLib` after `pointLib := import "./points"`.
Both names qualify the same module and apply the same visibility rules.
See [aliases and distinct type declarations](lite://doc/type-aliases) for
implementation status.

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
an inaccessible member is unknown to an importer. The [import and re-export rules](lite://doc/modules-and-packages#import-expansion-and-re-exports)
apply the same private default to imported names and namespace aliases.
Record field visibility remains open.

Within a compiled graph, modules are emitted in canonical topological
`(level, logical, path)` order rather than source `import` order so swapping
imports produces diff-stable output, and imported module symbols are keyed by
encoded logical module paths rather than visit indices.

## Package contents

See [package contents](lite://doc/packages-and-preload#package-contents).

## Prelude

### Package preload

See [package-local preload selection](lite://doc/packages-and-preload#package-preload).
Preload exports use the [import visibility rules](lite://doc/modules-and-packages#import-expansion-and-re-exports).

### Implicit core preloading gap

See [the current compiler gap](lite://doc/compiler/module-import-stages#known-gap-in-explicit-module-imports).
The compiler still has hard-coded preload and operation forwarding paths.

## Separately compiled libraries and runtime agreement

See [separate compilation and runtime agreement](lite://doc/packages-and-preload#separately-compiled-libraries-and-runtime-agreement).

## Open decisions

Module path resolution; cycles; declaration resolution across files; initialization order; optional/generated interface artifacts; binary versus source packages; target-specific dependencies; C interoperability; package authenticity; and the stable public API policy. Manually maintained header files or duplicate signatures are not required by the selected direction.

## Related concepts and references

- [Visibility](lite://doc/visibility)
- [Functions](lite://doc/functions)
- [Tooling and learning](lite://doc/tooling-and-learning)
- Packaging is primarily a local design requirement. See [references](lite://doc/references) for the language comparisons already discussed; no external package manager is adopted by this file.
