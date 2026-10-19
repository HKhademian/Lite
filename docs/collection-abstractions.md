# Collection consumers depend on capabilities

Status: **API design direction selected by the user, 2026-10-19**. Consumers request the operations they need rather than a particular collection implementation or static size. Standard collections are providers of those contracts. Exact protocol names, generic/constraint syntax, yielded access modes, and dispatch remain open.

## The icons example

```text
render_icons := fn(icons: Iterable<Icon>) {
    loop icons as icon {
        render(icon);
    }
}
```

`Iterable<Icon>` is temporary explanatory notation for a traversal capability, not selected generic syntax or a boxed interface-object representation. This operation needs one traversal of Icon elements. It does not inherently need indexing, a count, contiguous storage, growth, or a compile-time length.

```text
render_icons(icon_list);
render_icons(icon_array);
render_icons(icon_set);
render_icons(icon_slice);
render_icons(icon_producer);
```

These are conceptual calls with compatible providers. A provider must meet the traversal, element-access, and lifetime contract; no conversion to the standard List implementation or materialization into a temporary collection should be required merely by this signature. User collections and adapters can participate through explicit conformance under the eventual interface rules.

The implementation's array length, tree shape, chunks, allocator, or reserved capacity stays with the provider. The compiler may retain such information for specialization without requiring it in the consumer's source signature.

## Shared base means shared behavior

The common foundation is an element-typed capability, not a universal object superclass. Primitive values and records must be usable through the same generic APIs without forcing primitive-wrapper collection families or object boxing merely to satisfy a common input contract.

Do not make every provider implement a large interface with unsupported indexing, size, sorting, or insertion methods. Add the requirements the operation genuinely needs. Shared consumer contracts do not make a set into a list, grant an iterator a known size, or make separated chunks physically contiguous.

Read access remains the baseline. A mutating algorithm additionally needs a write operation supplied by its capability contract and the existing explicit mut grant. Mut does not manufacture a setter or make arbitrary mutation of set keys valid. Whole caller-location replacement still follows var separately.

## Honest traversal semantics

The minimum proposed traversal contract is one pass. A single-pass producer does not become repeatable merely by satisfying the input abstraction. Iterating an existing cursor can consume state, so borrowing, ownership transfer, and any required mutation grant must be defined rather than hidden behind a read-only parameter. Fresh traversal state can be local; a shared caller cursor cannot silently be cloned or advanced without its required authority.

Repeatability, exact cheap size, stable order, reverse traversal, and indexed/contiguous access are additional capabilities. A set may expose an implementation-defined traversal order. An operation promising a particular display order needs a suitable order contract or an explicit ordering step. A stream does not promise eventual termination or a finite count.

A renderer that retains icons for later frames needs suitable retained ownership/lifetime and traversal guarantees. It cannot silently store a borrowed temporary or traverse a one-shot producer again. An explicit snapshot/materialization is an alternative when the caller chooses it.

Fallible or asynchronous producers must expose their errors/suspension through appropriate contracts. Failure cannot silently become end-of-input or an ignored icon. This direction does not select one iterator error or async protocol.

## When a narrower requirement is justified

Use a cheap-size capability when the algorithm requires an exact count without traversal; an indexing capability for random access; and a contiguous-view capability when it genuinely needs a Slice or equivalent region. These requirements are meaningful and should be explicit. If the body only loops over values, a Slice or List requirement is unnecessarily specific.

An operation may still explicitly construct and return a standard List when that is its documented result. The broader library design should also allow lazy results, caller-provided destinations, and explicit collection factories where appropriate, so standard providers do not become mandatory at every boundary.

## Direction versus unfinished mechanism

The user-selected principle is capability-based APIs with unified element typing. The capability vocabulary, complexity laws, explicit conformance/coherence, static specialization versus erased runtime values, and exact generic syntax still need design. See [collection capabilities](collection-capabilities.md).

Related: [interfaces](composition-and-interfaces.md), [sequence storage providers](sequence-types.md), [iteration](collections-and-iterators.md), [temporary generic notation](generic-notation.md), and [caller mutation grants](caller-mutation-grants.md).
