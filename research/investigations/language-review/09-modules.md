# 9. Modules and public APIs — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Compiler module import stages](../../../compiler/module-import-stages.md)
- [Modules and packages](../../../docs/modules-and-packages.md)
- [Visibility](../../../docs/visibility.md)
- Related investigation catalog areas: INV-006, INV-007, INV-071.

## 9.1 Files and modules

**Baseline (updated 2026-11-15):** Every LiteLang file (`.lts` script or `.lt` module) is modeled as an **invisible-brace root code block** with **no parent block** and `pub` as its sole distinction from inner `{ ... }` blocks. Merging `.lt` and `.lts` later remains open; for now, `.lt` mirrors `.lts` without top-level runtime evaluation (admitting compile-time-known definitions such as `x := 1`, types, `fn`s, and compile-time-known `var`/`mut` initializers). Same-block redeclaration shadowing is postponed in both file blocks and inner blocks, and side-effect-free dead code in any block may be eliminated.

**Initial assessment and probes:** Compare running a `.lts` script with importing a `.lt` or `.lts` file. Determine which compile-time initializers evaluate, whether script-import side effects could ever be permitted, and verify that root-block symbol wiring matches inner braced blocks except for `pub`.

## 9.2 Imports and namespaces

**Baseline (updated 2026-11-15):** An `import` is a **compile-time token** (not a runtime value) referring to `pub` symbols of sibling top-level file blocks through an explicit alias; maintained Lite sources use namespace aliases, and deeper block-local `import`s are prevented by the compiler for now even though any compile-time effects would be placement-independent.

**Confirmed in joint review:** A block can declare a symbol name only once. Type aliases, distinct types, records, values, functions, and import aliases participate in the same duplicate-name check. For example, `Item := type Int; Item := 1;` is rejected in one block. Distinct import aliases can qualify identically named exports from separate modules. The rule applies to root file blocks and inner blocks. [Local shadowing](../../../docs/local-shadowing-and-copies.md)

**Initial assessment and probes:** Two modules export `parse`; compare qualified access through different aliases with collision handling. Check import cycles and verify compile-time initialization order independently of where the `import` token appears in the importing file.

## 9.3 Visibility

**Baseline (updated 2026-11-15):** `pub` is the root file block's sole capability beyond an inner braced block and can expose `fn`, `type`, immutable values, and `var`/`mut` bindings in the language model (getters/setters remain idiomatic for encapsulated state; current generated TS implements `pub` functions, types, and immutable scalar values). Private-by-default declarations and type fields remain baseline; complete visibility/export details remain under review.

**Initial assessment and probes:** An external caller can see a public record type but may not be allowed to construct or inspect a private field. Test public signatures exposing private types.

**Joint review status:** Publishing a top-level type and exposing access to its fields are separate decisions. The review covered top-level exports, then moved to same-block declarations and initialization. Direct external construction, private-field access, and private types appearing in public signatures remain open.

## 9.4 Initialization

**Baseline:** First-stage module values use compile-time-known initial values, including var/mut; later runtime initialization and storage are open.

**Confirmed in joint review:** Top-level value initializers in first-stage `.lt` modules must be known at compile time. This also applies to the initial value of a `var` or `mut` binding. Runtime-dependent module initialization remains open for later stages. [Module initialization](../../../docs/modules-and-packages.md#compile-time-known-initial-definitions)

**Initial assessment and probes:** Trace module A importing B and reading its initial value. Check dependencies, cycles and side effects without assuming source-order runtime initialization.

## 9.5 Packages and projects

The user also wants to explore a precompiled Lite-level representation for libraries, modules and files, supporting incremental builds and publication; see [precompiled Lite representation](precompiled-lite-representation.md).

The user's separately compiled library direction requires compile-time type
agreement to match runtime value behavior across compatible library boundaries;
see [type agreements and values](separate-library-value-compatibility.md).

**Baseline:** Module access and package/dependency organization are related but separate design questions.

**Initial assessment and probes:** Compare a local module, a reusable library, and two versions of a dependency. Decide identity, discovery, reproducibility, and replacement boundaries before choosing package syntax.

## Working judgment

Use explicit module qualification and minimal public surface as the starting point. Avoid coupling module identity to filesystem or package choices prematurely; compile-time-known initialization limits early flexibility but makes dependencies easier to reason about.

## Expanded assessment

### Compiler evidence and boundaries

The generated compiler uses a Lite-written import graph; namespace aliases expose documented public functions, immutable scalar values and public types. The compiler and core sources themselves use namespace imports, and the full verifier passes module consumers. A direct `core/io` namespace source passes checking. Cycle termination does not prove mutual declaration resolution; runtime source spans, package resolution, complete visibility and runtime initialization remain limited or open. [Module implementation](../../../compiler/module-import-stages.md); [baseline](compiler-baseline.md).

### Benefits, costs, and constraints

- **9.1 Source units:** independent units support incremental compilation and encapsulation. Static namespace resolution can disappear in generated code; separate compilation and stable binary interfaces can limit cross-module inlining unless link-time information is available.
- **9.2 Imports:** explicit aliases reduce collisions and clarify dependencies. Compile-time graph traversal and canonical identities need no required runtime module registry, though initialization and dynamic loading would impose their own costs. Cycles need well-defined declaration and initialization rules rather than merely a visited set.
- **9.3 Visibility:** private-by-default boundaries support small APIs and optimization, especially when internal representations can change. Cross-module construction of records with private fields and public signatures containing private types must be checked explicitly. Reflection or dynamic discovery would need a separate footprint justification.
- **9.4 Initialization:** compile-time-known module values can reduce startup work, but not every immutable value is compile-time known. Side-effect order, lazy initialization, cycles and concurrency may introduce guards or runtime dependencies; current first-stage known initialization does not settle later runtime policy.
- **9.5 Packages:** dependency versions, reproducible sources, binary linkage and replacement of standard providers affect both build size and integration. A package manager is not itself runtime machinery; linked libraries, static duplication, generated glue and dynamic loading must be measured separately.

### Blockers and cross-feature cases

Analyze two modules importing each other, a public record with a private field, an initialized module list, and the same generic specialized in two modules. Imports and type identities [1](01-core-types.md), visibility [3](03-records.md), generic code generation [10](10-generics-comptime.md), and resource cleanup [8](08-failure-cleanup.md) determine whether modules remain link-time only or need runtime work.

## Cross-topic routing

Records (3), functions (5), and compile-time effects (10) determine public and initialization contracts. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [3](03-records.md), [5](05-functions.md), [10](10-generics-comptime.md).
