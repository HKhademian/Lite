# Immutability by default

Status: **selected language design goal, 2026-10-18**. Fixed bindings and read-only access are the baseline; mutation is an explicit, supported capability. Deep freezing, ownership, and complete access-type notation remain open.

## Goal

Make ordinary code start with the least authority needed: a fixed binding, readable data, and operations that require only read access. Programmers explicitly request additional authority when their task needs it.

Mutation should be practical and easy to express. Counters, accumulators, collection updates, and stateful algorithms are ordinary programming needs. The language should not require replacing every update with a functional encoding or rebuilding an entire value merely to express a local change.

This is one language with useful defaults, not a pure subset that students must leave before writing stateful programs.

## Binding and data permissions

```text
user := make_user(); /* fixed binding, read-only access */
name := user.name;
```

```text
var count := 0; /* explicit permission to replace this binding */
count += 1;
```

```text
mut user := make_user(); /* explicit writable access to held data */
user.age += 1;
```

Use inferred var mut user := expression when both binding replacement and held-data mutation are needed. Its annotated form is var user: mut User = expression. These capabilities remain independent, and the held value's type stays fixed under assignment. See the full [declaration forms](mutability.md).

Operation parameters and receivers require only read access by default. Qualify an affected typed parameter as user: mut User when its operation needs write access, without an additional function-level marker. Teach these capabilities as needed, while retaining inference for the value types.

## Writable access adds authority

Conceptually, writing adds an ability to the readable baseline. It also adds proof obligations: the caller must possess writable access, the target must permit the write, and the assigned value must satisfy its storage contract.

This is capability addition, not automatic type widening or an ability to upgrade a borrowed read-only view. Restricting writable access to a read-only use must follow the eventual borrowing rules. Reversing that restriction cannot manufacture authority, exclusive access, or an implicit clone.

For example, a projected union field may read C | D | E but permit writing only C. Adding mut does not widen that write contract to C | D | E. See [value types and access contracts](union-values-and-access.md).

## Meaning of the default

Read-only access prevents mutation through that path. It does not by itself guarantee that the underlying data cannot change through another authorized alias. Globally frozen values and deeply immutable graphs need separate contracts.

Likewise, a read-only receiver does not make an operation pure. Output, resource access, and effects through other explicit capabilities are separate concerns. This goal does not introduce a universal purity system or decide the I/O and concurrency models.

## Consequences for future design

- New parameters, views, captures, and interface requirements should start from readable access and expose mutation requirements explicitly. Their exact contracts still need review.
- Diagnostics should distinguish fixed-binding replacement, missing writable access, and an incompatible field write rather than treating all three as one immutable-value error.
- Explicit mutation must preserve visibility, type safety, and the chosen ownership rules.
- The compiler should not silently copy or freeze data to satisfy an access requirement. Representation and performance still need an implementation and measurement.

These are design criteria, not selection of closure capture modes, transitive read-only rules, persistent collections, or a memory-management strategy.

## Related concepts and references

- [Principles](principles.md)
- [Mutability and operation access](mutability.md)
- [Declarations and assignment](declarations-and-assignment.md)
- [Union field writes](union-field-writes.md)
- [Tooling and learning](tooling-and-learning.md)
- [Memory and performance](memory-and-performance.md)
