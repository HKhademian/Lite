# Nominal Records, `=name` Shorthand & Aggregate Destructuring

Model structured data with nominal `record` types, explicit field defaults, contextual `{ ... }` literals, `=name` shorthand, and uniform destructuring across `{ ... }`, `( ... )`, and `[ ... ]`.

## Walkthrough

1. `Config := record { host: String = "localhost"; ... };` declares a distinct nominal type; omitting a field in `Config {}` uses its declared default (or zero value like `false` / `0` when omitted from `Config` itself).
2. `= port` inside `Config { host = "api.lite", = port }` and `{ = port: Int, = tls } := primary;` expands cleanly to `port = port` without repeating field names.
3. Named and mixed tuples support selective extraction with `(state, statusCode = code, = region) := status;`.
4. Fixed-extent `[T; N]` arrays destructure directly with `[soft, _, hard] := limits;` (`var` makes every bound local mutable).

> [!NOTE]
> Two nominal `record` types remain distinct even when they declare the exact same field names and types; assign explicitly across distinct records, and destructure records with `{ ... }` rather than bare `{ name }`.

## Try Modifying This

1. Switch `{ endpoint = host, ... }` to a `var { ... }` pattern and adjust `endpoint` before printing.
2. Add a second `record` type with a nested record default and destructure both levels into locals.

See [Handbook: Tuples, Arrays, Lists & Aliases](../../../handbook/types/tuples-arrays-lists-and-aliases.md), [Records](../../../../../docs/records.md), and [Aggregate Patterns](../../../../../docs/aggregate-patterns.md).
