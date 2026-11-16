# Modules, Namespace Imports & `pub` Visibility Boundaries

Split reusable logic into separate module files exposing only intentional `pub` types, constants, and functions while keeping helper internals private.

## Walkthrough

1. `stats := import "./helpers/math-stats.lts";` imports a sibling module under a local namespace alias (`stats`).
2. `math-stats.lts` exports `pub RangeStats := type ...`, `pub VERSION`, `pub summarize`, and `pub span`, while keeping `minOf` and `maxOf` file-private.
3. Consumers qualify exported names (`stats.RangeStats`, `stats.summarize(...)`); private helpers cannot leak outside `math-stats.lts`.

> [!NOTE]
> The Browser Learn & Playground runner bundles `./helpers/math-stats.lts` cleanly into `extraModules`, so multi-file imports execute live right in your browser!

## Try Modifying This

1. Try calling `stats.minOf(3, 5)` from the main script to verify private visibility enforcement.
2. Add another value to `[4, 9, 2, 15, 7]` and check `report.sum` and `stats.span(report)`.

See [Handbook: Imports, Visibility & I/O](../../../handbook/modules/imports-visibility-and-io.md) and [Visibility](../../../../../docs/visibility.md).
