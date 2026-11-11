# INV-029 — Alias names versus ordinary value shadowing

Status: approved (one ordinary lexical binding namespace selected; ready for implementation)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-029](TOPICS.md#inv-029)
Baseline: igniter-v0.1.0-alpha.22, `dd31cb0`

## Selected decision

The user selects Option 1 (one ordinary lexical binding namespace) and explicitly
rejects Option 2 (dual namespaces):
"easier to reason; a value identifier could contain a value and has a type, but a
type could not have any mem address."

- Names introduced by `Alias := type TypeExpression;` and ordinary value
  bindings share a single lexical scope.
- In type annotations, identifier resolution checks the nearest visible lexical
  binding. If the binding is a value binding, it fails with a compile-time static
  `TypeError` (`binding <name> does not denote a type`). It does not skip the
  value binding to find an earlier alias in a hidden namespace.
- If a type alias is referenced in value/expression context, it fails with a
  static `TypeError` (`type alias <name> cannot be used as a value`).
- Type aliases are purely static compile-time contracts with zero runtime memory,
  allocation, wrapper, or storage overhead. Transparent identity is preserved.

## Why this is the next bounded question

Compiler sources currently repeat annotations such as
List<(kind: String, text: String)>. The selected transparent-alias spelling can
make them readable without inventing record or generic syntax:

```text
Token := type (kind: String, text: String);
Tokens := type List<Token>;
take := fn(token: Token): String { token.text }
```

The [owning contract](../../docs/type-aliases.md#selected-rule) already selects
Alias := type TypeExpression and transparent identity. Direct Alias := Existing
is not an alternative alias spelling. But that same contract explicitly leaves
namespace/shadowing rules open; the [Unit contract](../../docs/unit.md) likewise does
not select a general type/value namespace. The igniter has no type-alias support
yet. Do not interpret the example as a verified runnable program.

## Concrete decision case

```text
Token := type (kind: String, text: String);
earlier := fn(token: Token): String { token.text }
Token := 7;
later := fn(token: Token): String { token.text }
```

Two possible readings remain:

1. One ordinary lexical binding namespace: the new value binding shadows the
   earlier alias. The later annotation finds the Int-valued Token and fails
   because that binding does not denote a type. It does not skip the nearest
   binding to recover an older alias. The earlier function keeps its already
   resolved input contract.
2. Separate type/value lookup: the value Token is 7, but the later annotation
   still finds the earlier type alias in a separate namespace. The same spelling
   can therefore refer to two visible entities depending on its syntactic role.

Recommend the first reading for ordinary source-introduced names: it follows
the user's top-down reasoning and ordinary := shadowing direction, with one
visible binding to resolve. This is a recommendation, not a recorded selection.
Choosing the second is possible, but must be explicit rather than an accidental
result of maintaining two compiler maps.

## Decision boundary

The choice concerns lookup of ordinary declared aliases versus ordinary value
bindings. It does not introduce runtime Type objects, reflection, dynamic type
mutation, generic declarations, implicit constructors/casts or a new alias form.
Builtin/core name visibility, Unit's special existing meaning, import/module
namespaces, parameter-header scopes, cycles and later/deferred type lookup retain
their own contracts/questions; do not silently settle them through this case.

Keep selected alias transparency: the alias names its resolved target identity
and grants no permissions or wrapper. Earlier resolved contracts are not
retroactively rewritten by a later source shadow. This question is about which
binding a new use finds, not converting or changing the underlying type.

## Evidence and handoff

This is a selected-contract review and concrete semantic probe, not executable
alias validation. The current interpreter still has 147 passing groups, and the
existing compiler examples remain unchanged. The isolated AS experiment is
separate evidence and does not settle Lite name lookup.

Record the question and owning references atomically. Obtain the namespace
decision before implementing ordinary alias/value collisions or claiming a
general lookup model. Preserve selected syntax and propose no additional type
feature merely to answer this question.
