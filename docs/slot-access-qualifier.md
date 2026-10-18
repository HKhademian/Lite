# Slot as a replacement qualifier

Status: **slot selected as the replacement marker, 2026-10-18**. In a complete access contract, A | slot B | C describes readable A/B/C with B accepted for replacement. Full type grammar, grouped scope, whole-contract boundaries, and first-class access values remain open. Value-union normalization and declaration var/mut retain their established meanings.

## Selected meaning and spelling

Inside one complete access contract:

```text
A | slot B | C
```

describes:

```text
read:  A | B | C
write: B
```

Every listed alternative is readable. A slot-marked alternative is additionally accepted as a replacement through this access path, regardless of the currently stored alternative. All examples assume exact, unrelated type alternatives.

This selects the marker and its meaning within an access contract, not an ordinary union of values where one alternative happens to be a slot object. No pointer, allocation, first-class reference value, address-taking operation, runtime wrapper, or complete declaration production is selected.

## Why slot replaces the earlier mut marker

The marker describes what may be stored into the selected location. It does not mean that a currently held B exposes mutable fields. Thus it separates replacement acceptance from the existing mut permission to update held data.

Declaration var still permits replacing a whole binding. Declaration mut still permits modifying accessible held data, including a writable field. A slot annotation neither manufactures that authority nor upgrades a read-only view; it describes the replacement types that a permitted write must satisfy.

For a selected field whose inferred contract is A | slot B | C:

```text
value := parent.field; /* reads A | B | C */
parent.field = b;      /* type-compatible if b: B; needs writable access */
parent.field = a;      /* rejected without additional narrowing if a: A */
parent.field = c;      /* rejected without additional narrowing if c: C */
```

The original parent alternatives and flow/ownership proofs remain relevant. A type test of the field's current payload does not itself expand the location's write contract.

## Composition still needs whole-contract boundaries

If one path accepts A | B and another accepts C | B, their common contract reads A | B | C and accepts B. The proposed display becomes A | slot B | C.

Replacing the word mut with slot resolves the naming conflict with payload mutation. It does not make this an ordinary union-flattening law:

```text
(slot A | slot B) | (slot C | slot B)
```

An ordinary union of those four annotated members would retain slot A, slot B, and slot C. To retain only the shared write guarantee, the compiler must know that the inputs describe two separate access contracts.

Using the previous illustrative, unselected boundary notation:

```text
access(slot A | slot B) | access(slot C | slot B)

common access summary:
access(A | slot B | C)
```

This summarizes operations available without narrowing; it is not unconditional equality with the full union of original access paths. The [earlier investigation](access-union-qualifiers.md) explains the read-union/write-intersection rule and preserved correlations.

## Proposed scope rule

Recommend treating slot as a prefix on the following type operand, with parentheses available to supply a composite operand:

```text
A | slot B | C       /* read A/B/C; accept B */
slot (A | B) | C     /* proposed: read A/B/C; accept A/B */
```

This makes slot bind more tightly than the surrounding union. Within one complete contract, the grouped form would have the same summary as slot A | slot B | C. It would not merge two possible access paths or erase their boundaries.

A transparent alias must retain its entire denoted type as the operand. If Pair := type A | B, then slot Pair would qualify both alternatives, matching slot (A | B); alias expansion must not accidentally turn it into slot A | B. These grouping and alias rules are recommendations pending confirmation, not newly selected grammar. Spaces between slot and its operand have no semantic role.

## Remaining choices

- Is this notation visible only in inferred diagnostics, or also legal in signatures and aliases?
- What delimits a complete contract, including a read-only contract with no slot member?
- Confirm the proposed prefix scope, grouped operands, and transparent-alias treatment above.
- How are payload permissions represented independently from replacement acceptance?
- How do ownership, lifetimes, and escaped access paths preserve the declared contract?

The slot marker is now selected over mut for replacement acceptance. The remaining grammar and access-model decisions stay open. It does not replace var or mut declarations.

Related: [value types and access contracts](union-values-and-access.md), [field writes](union-field-writes.md), [mutability](mutability.md), and [immutability by default](immutability-by-default.md).
