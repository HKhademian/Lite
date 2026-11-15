# 9. Modules and public APIs — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Compiler module import stages](../../../compiler/module-import-stages.md)
- [Modules and packages](../../../docs/modules-and-packages.md)
- [Visibility](../../../docs/visibility.md)
- Related investigation catalog areas: INV-006, INV-007, INV-071.

## 9.1 Files and modules

**Baseline:** The design distinguishes `.lts` scripts and `.lt` modules; exact full module grammar remains open.

**Initial assessment and probes:** Compare running a script with importing a module. Determine which code executes and which names or core facilities are available in each context.

## 9.2 Imports and namespaces

**Baseline:** Explicit module access is the selected direction; maintained Lite sources use explicit aliases.

**Initial assessment and probes:** Two modules export `parse`; compare qualified access through different aliases with collision handling. Check import cycles and whether import itself causes initialization.

## 9.3 Visibility

**Baseline:** `pub` and private boundaries need coherent application to declarations and fields; complete visibility details remain under review.

**Initial assessment and probes:** An external caller can see a public record type but may not be allowed to construct or inspect a private field. Test public signatures exposing private types.

## 9.4 Initialization

**Baseline:** First-stage module values use compile-time-known initial values, including var/mut; later runtime initialization and storage are open.

**Initial assessment and probes:** Trace module A importing B and reading its initial value. Check dependencies, cycles and side effects without assuming source-order runtime initialization.

## 9.5 Packages and projects

**Baseline:** Module access and package/dependency organization are related but separate design questions.

**Initial assessment and probes:** Compare a local module, a reusable library, and two versions of a dependency. Decide identity, discovery, reproducibility, and replacement boundaries before choosing package syntax.

## Working judgment

Use explicit module qualification and minimal public surface as the starting point. Avoid coupling module identity to filesystem or package choices prematurely; compile-time-known initialization limits early flexibility but makes dependencies easier to reason about.

## Cross-topic routing

Records (3), functions (5), and compile-time effects (10) determine public and initialization contracts. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [3](03-records.md), [5](05-functions.md), [10](10-generics-comptime.md).
