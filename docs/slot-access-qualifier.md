# Var as a replacement qualifier

Status: **replacement contracts selected 2026-10-18; canonical var marker selected 2026-10-19**. The former slot spelling is retired; see [the var qualifier](var-access-qualifier.md). Within one complete access contract, var (A | B) and var A | var B describe the same accepted replacements. A | var B | C reads A/B/C and accepts B. Full declaration grammar, whole-contract boundaries, and first-class access values remain open. Value-union normalization and declaration var/mut retain their established meanings.

## Selected meaning and spelling

Inside one complete access contract:

```text
A | var B | C
```

describes:

```text
read:  A | B | C
write: B
```

Every listed alternative is readable. A var-marked alternative is additionally accepted as a replacement through this access path, regardless of the currently stored alternative. All examples assume exact, unrelated type alternatives.

This selects the marker and its meaning within an access contract, not an ordinary union containing a special writable-object alternative. No pointer, allocation, first-class reference value, address-taking operation, runtime wrapper, or complete declaration production is selected.

## Why var replaces the earlier mut marker

The marker describes what may be stored into the selected location. It does not mean that a currently held B exposes mutable fields. Thus it separates replacement acceptance from the existing mut permission to update held data.

Declaration var still permits replacing a whole binding. Declaration mut still permits modifying accessible held data, including a writable field. A var annotation neither manufactures that authority nor upgrades a read-only view; it describes the replacement types that a permitted write must satisfy.

For a selected field whose inferred contract is A | var B | C:

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

Both replacements fit this one binding's declared storage type. Its whole-binding access summary is var (A | B), equivalently var A | var B. The var capability permits the replacements; mut separately permits held-data updates. Removing mut would not change which whole-binding replacements var accepts.

The value type of x remains A | B. Its var-qualified access summary describes operations on the binding, not a changed value type or a requirement to repeat var in ordinary var declarations. A fixed binding with mut access still cannot be replaced merely because its held data is writable.

## Composition still needs whole-contract boundaries

If one path accepts A | B and another accepts C | B, their common contract reads A | B | C and accepts B. The proposed display becomes A | var B | C.

For example, the parent alternatives already provide distinct paths:

```text
P := record { field: A | B; }
Q := record { field: C | B; }
parent: mut (P | Q) = choose_parent();
```

P.field accepts A/B; Q.field accepts C/B. The compiler computes parent.field's common access summary as A | var B | C. It must inspect each parent's declared field contract before forming the summary. Ordinary source code needs no extra access wrapper for this field operation; the example access(...) notation below only illustrates a possible boundary for explicitly named access contracts.

Replacing the word mut with var resolves the naming conflict with payload mutation. It does not make this an ordinary union-flattening law:

```text
(var A | var B) | (var C | var B)
```

An ordinary union of those four annotated members would retain var A, var B, and var C. To retain only the shared write guarantee, the compiler must know that the inputs describe two separate access contracts.

Using the previous illustrative, unselected boundary notation:

```text
access(var A | var B) | access(var C | var B)

common access summary:
access(A | var B | C)
```

This summarizes operations available without narrowing; it is not unconditional equality with the full union of original access paths. The [earlier investigation](access-union-qualifiers.md) explains the read-union/write-intersection rule and preserved correlations.

## Selected scope and distribution

Treat var as a prefix on the following type operand, with parentheses available to supply a composite operand:

```text
A | var B | C       /* read A/B/C; accept B */
var (A | B) | C     /* read A/B/C; accept A/B */
```

This makes var bind more tightly than the surrounding union. Within one complete contract, distribution preserves the contract:

```text
var (A | B) = var A | var B
```

The equation denotes equivalent access contracts, not a new runtime equality operator. Thus var (A | B) | C has the same summary as var A | var B | C. Distribution marks the alternatives accepted by one location; it does not merge two possible locations or erase their separate storage constraints.

A transparent alias must retain its entire denoted type as the operand. If Pair := type A | B, then var Pair qualifies both alternatives, matching var (A | B); alias expansion must not accidentally turn it into var A | B. This follows the selected transparent-alias identity and operand scope. Complete placement in signatures and declarations is still open. Spaces between var and its operand have no semantic role.

## Remaining choices

The [access-ergonomics goal](slot-ergonomics.md) hides derived mathematical summaries while retaining explicit caller-replacement contracts in function headers. Existing var declarations already derive full replacement contracts. Type-side var parameters now use this same replacement permission for caller storage; local-only header modifiers are omitted. Restricted mixed contracts and advanced annotation forms still need complete grammar.

[Var parameters](slot-parameters.md) have selected temporary caller-location semantics: assignment through them replaces the supplied caller variable or field for the duration of the call. Explicit mut/var argument grants are selected; complete access compatibility, aliasing, and general lifetime rules remain open. Public pointers and general reference values are not selected.

- Is this notation visible only in inferred diagnostics, or also legal in signatures and aliases?
- What delimits a complete contract, including a read-only contract with no var member?
- How are payload permissions represented independently from replacement acceptance?
- How do ownership, lifetimes, and escaped access paths preserve the declared contract?

The var marker replaces the former slot marker for replacement acceptance and composes with local var declarations. Mut retains its held-data role. The remaining grammar and access-model decisions stay open.

Related: [value types and access contracts](union-values-and-access.md), [field writes](union-field-writes.md), [mutability](mutability.md), and [immutability by default](immutability-by-default.md).
