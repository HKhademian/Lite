# Writing fields through a plain union

Status: **selected 2026-10-18: an assignment through a union receiver must be accepted by the field of every possible receiver alternative, with mut and writable access required**. Explicit access-type notation and complete ownership/flow rules remain open.

## Read possibilities versus write requirements

A [common field read](union-field-reads.md) combines every possible field result. This read type does not replace the storage contract of each parent record. To write without narrowing, the assigned value must satisfy every possible target's field type.

For exact plain unions, normalize the source value type and each target field type. Every possible source alternative must be admitted by every possible target field type. A missing or unwritable field rejects the assignment. Existing permissions, visibility, and ownership requirements still apply.

## A standalone union slot

Assume A and B are distinct existing types and a and b provide valid values:

```text
var value: A | B = a;
value = b; /* accepted: this binding's storage permits A or B */
value = a; /* accepted */
```

The binding itself is declared to hold either type. It can change its active alternative through a compatible whole-binding assignment requiring var.

## Separate parent fields

```text
P := record { field: A; }
Q := record { field: B; }

parent: mut (P | Q) = choose_parent();
value := parent.field; /* read type: A | B */

parent.field = a; /* rejected: Q.field does not accept A */
parent.field = b; /* rejected: P.field does not accept B */
```

These examples assume accessible fields and distinct A/B with no applicable conversion. Merely possessing mut access cannot change either record's declared field type. A field update also cannot turn a P into a Q.

## Overlapping field unions

Assume C, D, and E are distinct existing types:

```text
P := record { field: C | D; }
Q := record { field: C | E; }

parent: mut (P | Q) = choose_parent();
c: C = make_c();
d: D = make_d();
e: E = make_e();

value := parent.field; /* C | D | E */
parent.field = c;      /* accepted by both field declarations */
parent.field = d;      /* rejected: Q.field excludes D */
parent.field = e;      /* rejected: P.field excludes E */
parent.field = value;  /* not justified by value's read type alone */
```

After a valid refinement to P, its field can accept C or D. After refinement to Q, it can accept C or E. Refinements remain subject to mutation and alias invalidation; this rule grants no additional flow proof.

## Assignment and access contracts

The existing assignment order remains: select the target once before evaluating the right-hand side. Ownership/lifetime checks must keep that target valid. Compatibility is static; the compiler must not silently accept D and generate a runtime failure when the active parent happens to be Q.

Compound updates must support the operation on all possible input field types and satisfy the write contract for the computed result. A wide read type alone does not establish a safe write. More precise correlation proofs, overload resolution, and effects remain separate work.

An eventual writable-reference or access-view feature must preserve these restrictions when the target escapes. Reading as C | D | E cannot justify granting an unrestricted writable slot of that type. This is a constraint on that future feature, not selection of reference syntax or variance rules.

## Conceptual distinction

See [union values and access contracts](union-values-and-access.md): a slot containing a union and a union of possible slots have different write permissions. There is one ordinary value-union operation; an access contract records which values can be read and which can be written.

No intersection operator, public bottom type, implicit conversion, property setter, or runtime representation is selected here.

Related: [mutability](mutability.md), [assignment](declarations-and-assignment.md), [evaluation order](evaluation-order.md), [union widening](union-widening.md), and [type tests](type-tests-and-narrowing.md).
