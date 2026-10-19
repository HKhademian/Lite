# Slot as a replacement qualifier

Status: **slot replacement marker and grouped distribution selected, 2026-10-18**. Within one complete access contract, slot (A | B) and slot A | slot B describe the same accepted replacements. A | slot B | C reads A/B/C and accepts B. Full declaration grammar, whole-contract boundaries, and first-class access values remain open. Value-union normalization and declaration var/mut retain their established meanings.

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

## A var binding accepts its entire declared value union

```text
var x: mut (A | B) = new_A();
x = new_B();
x = new_A();
```

Both replacements fit this one binding's declared storage type. Its whole-binding access summary is slot (A | B), equivalently slot A | slot B. The var capability permits the replacements; mut separately permits held-data updates. Removing mut would not change which whole-binding replacements var accepts.

The value type of x remains A | B. Its slot-qualified access summary describes operations on the binding, not a changed value type or a requirement to repeat slot in ordinary var declarations. A fixed binding with mut access still cannot be replaced merely because its held data is writable.

## Composition still needs whole-contract boundaries

If one path accepts A | B and another accepts C | B, their common contract reads A | B | C and accepts B. The proposed display becomes A | slot B | C.

For example, the parent alternatives already provide distinct paths:

```text
P := record { field: A | B; }
Q := record { field: C | B; }
parent: mut (P | Q) = choose_parent();
```

P.field accepts A/B; Q.field accepts C/B. The compiler computes parent.field's common access summary as A | slot B | C. It must inspect each parent's declared field contract before forming the summary. Ordinary source code needs no extra access wrapper for this field operation; the example access(...) notation below only illustrates a possible boundary for explicitly named access contracts.

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

## Selected scope and distribution

Treat slot as a prefix on the following type operand, with parentheses available to supply a composite operand:

```text
A | slot B | C       /* read A/B/C; accept B */
slot (A | B) | C     /* read A/B/C; accept A/B */
```

This makes slot bind more tightly than the surrounding union. Within one complete contract, distribution preserves the contract:

```text
slot (A | B) = slot A | slot B
```

The equation denotes equivalent access contracts, not a new runtime equality operator. Thus slot (A | B) | C has the same summary as slot A | slot B | C. Distribution marks the alternatives accepted by one location; it does not merge two possible locations or erase their separate storage constraints.

A transparent alias must retain its entire denoted type as the operand. If Pair := type A | B, then slot Pair qualifies both alternatives, matching slot (A | B); alias expansion must not accidentally turn it into slot A | B. This follows the selected transparent-alias identity and operand scope. Complete placement in signatures and declarations is still open. Spaces between slot and its operand have no semantic role.

## Remaining choices

The [slot-ergonomics goal](slot-ergonomics.md) is to minimize explicit slot syntax in ordinary code. Existing var declarations already derive full replacement contracts. Proposed var parameters could extend that approach to common APIs; restricted contracts and public annotation forms still need a decision.

[Slot parameters](slot-parameters.md) have selected temporary caller-location semantics: assignment through them replaces the supplied caller variable or field for the duration of the call. Explicit argument markers and complete access compatibility remain proposals, as do aliasing and general lifetime rules. Public pointers and general reference values are not selected.

- Is this notation visible only in inferred diagnostics, or also legal in signatures and aliases?
- What delimits a complete contract, including a read-only contract with no slot member?
- How are payload permissions represented independently from replacement acceptance?
- How do ownership, lifetimes, and escaped access paths preserve the declared contract?

The slot marker is now selected over mut for replacement acceptance. The remaining grammar and access-model decisions stay open. It does not replace var or mut declarations.

Related: [value types and access contracts](union-values-and-access.md), [field writes](union-field-writes.md), [mutability](mutability.md), and [immutability by default](immutability-by-default.md).
