# Type categories: data shape, identity, and representation

Status: **conceptual review dated 2026-10-18; vocabulary for evaluating LiteScript, not new declaration grammar or a selected memory model**.

## Purpose

Separate questions that language keywords often combine. Enum, data class, value class, struct, and sealed interface do not name one common axis. A simpler language can expose fewer constructs if it gives each a precise responsibility.

A type describes which values and operations are admitted. An enum declaration defines a type; a payload-free case is a value, and a payload-bearing case supplies a constructor for values. Some languages additionally expose cases as distinct subtypes. These are different models, not a choice between enums being values or types at all.

## 1. Product: all fields together

A record, tuple, or struct combines components. A Point has both x and y; it is not a choice between them.

```text
Point = { x: Int, y: Int }
```

This is explanatory notation. LiteScript's exact record declaration, constructor, and positional matching-schema syntax remain open. A product can be nominal or structural, mutable or read-only, copied or moved, inline or reference-bearing. The shape alone does not decide those other contracts.

## 2. Sum: one alternative at a time

A sum selects one alternative, optionally with that alternative's payload:

```text
Status = Ready | Busy | Stopped
Event  = Click(Point) | Key(String) | Quit
```

These are conceptual definitions, not adopted source declarations. A plain finite enum is the payload-free case. A payload enum has a finite set of case names but may have arbitrarily many values because its payloads vary.

The case identity is meaningful independently of the payload type:

```text
Count = Items(Int) | Retries(Int)
```

Items(3) and Retries(3) identify different alternatives. A union containing Int twice cannot preserve that distinction merely by inspecting Int. Named cases provide identities that a plain union of existing types does not.

There are two common ways to express a sum:

- **Named variants of one nominal type:** every case constructs a value of the enclosing enum; case-specific annotation types are not necessarily available.
- **A closed family of distinct types:** each alternative is a separately usable type admitted by an explicit union or restricted subtype family.

Neither requires that the implementation be an open class hierarchy. An empty ordinary interface does not by itself close its implementer set. A sealed root also needs rules about any open branches beneath it before claiming all concrete leaves are known.

## 3. Raw mapping and physical storage

A named case may map to a protocol number or string. That is separate from the case's identity and from the representation used to store it in memory.

For example, a case can expose a Float code without requiring a machine union discriminator to be stored as Float. Conversely, an integer-backed enum can admit unnamed integer values in some languages; a list of named constants does not universally guarantee a closed set of valid values.

Distinguish:

- Case identity and equality.
- External raw codes and explicit conversion/validation.
- A physical tag's width, layout, and ABI.
- Flag sets that allow combinations, rather than one alternative.
- Whether names or reflection tables exist at runtime.
- Compile-time substitution of constants, such as TypeScript const-enum emission.

None of these choices is automatically settled by writing `enum`.

## 4. Distinct domain types and aliases

An alias gives another name to the same type. A distinct domain type gives a new identity to an existing representation or wraps one value with a restricted API.

```text
UserId  = distinct Int
OrderId = distinct Int
```

This is conceptual notation, not selected LiteScript grammar. The intent is to reject accidental interchange while retaining a compact representation where the eventual implementation contract allows it. Do not assume an alias creates that protection.

A newtype, inline/value class, opaque type, and static extension type approach this problem differently. Their boxing, erasure, runtime tests, generic behavior, and abstraction boundaries are not interchangeable. A type can have distinct compile-time identity without preserving that identity for runtime reflection.

## 5. Generated data operations

A data class or case class commonly requests generated construction, equality, hashing, printing, copying, or destructuring. Which operations and which fields participate are language-specific.

Generation is a behavior policy, not a complete storage model. It does not by itself mean:

- Assignment performs a deep copy.
- Every field is immutable.
- Referenced collections are frozen.
- The value has no observable identity.
- An instance never allocates.
- All private fields are publicly matchable.

For LiteScript, generated operations must also respect explicit visibility, access capabilities, effects, and ownership. An automatically generated copy operation cannot silently clone a noncopyable field.

## 6. Value semantics, references, and access

These are separate questions:

1. Does assignment copy, move, borrow, or share a reference?
2. Do equal contents mean equality, or is object identity observed?
3. Can access through this binding mutate held data?
4. Does a nested field itself refer to shared mutable state?
5. How long do values live, and who destroys them?
6. What is stored inline versus behind an explicit reference?

LiteScript has selected independent var and mut binding capabilities. Those permissions do not settle deep immutability, copying, ownership, or allocation. A value-shaped aggregate can hold references; a read-only binding is not a universal freeze.

## 7. Interfaces versus unions

An interface describes behavior accepted from its implementers. A closed union describes a listed set of possible alternatives. A tagged enum describes named alternatives of one declared family. All three can be useful together without being aliases for one another.

A payload type may implement an interface, an enum as a whole may implement one, and a union can contain several records. None of those operations requires inheriting common mutable state or adding a superclass to every enum case.

## Applying this vocabulary to matching

The selected LiteScript pattern operations remain bind, type match, and value match:

- `User(: Int, == outVal)` first recognizes its exposed aggregate schema, then applies component tests. Generic-family details remain open.
- `.Click(point)` tests a case and binds its payload. It does not imply Click is an independent subtype usable in an annotation.
- `: Click` is a type test only if Click actually denotes a separately defined type under the chosen type model.
- `_` binds the entire supplied value at its pattern position and permits nonuse.

A type test of an enum's payload cannot silently skip the enum's outer tag. A class-family representation must not be inferred merely because a pattern can deconstruct payloads.

## Review boundary

This taxonomy explains the options. It selects no additional keywords, inheritance model, enum ABI, or default equality/copy policy. The [reference-language comparison](type-categories-comparison.md) grounds the distinctions; [enums and variants](enums-and-variants.md) tracks LiteScript's existing enum direction and open contracts.

Related: [types and inference](types-and-inference.md), [composition and interfaces](composition-and-interfaces.md), [mutability](mutability.md), and [memory and performance](memory-and-performance.md).
