# Named input routing: concrete cases

Status: **concrete design review, 2026-10-21; not an implemented parser/runtime**. The user selected written evaluation order, fresh named initializer reordering, and explicit reconstruction when a stored tuple has a different component order. Basic positional/named/mixed calls and declared-default-only omission were selected earlier. The remaining rules below complete a proposed model and are marked as recommendations until confirmed.

## 1. Selected rule: written order is execution order

```text
pair: (l: Int, r: Int) = (r = op1(), l = op2());
```

Assume op1 and op2 complete with compatible Int values. Execute op1 for r first, then op2 for l. Each executed occurrence runs once. The initialized pair has the destination's l, r order: pair.l holds the second result and pair.r holds the first. Name routing does not run either producer again.

The proposed named tuple type/literal spellings illustrate the selected semantic rule; their complete grammar still needs formalization. Newlines, tabs, and spaces do not provide separators. Semicolons separate ordinary adjacent items; commas separate tuple components and arguments. A completed outer function or record body can end its item under the existing block-boundary rule.

For function calls, evaluate the callee first, supplied expressions in written order, and invoke only after successful argument preparation. If the first expression exits outward, do not evaluate later expressions or invoke the callee. A returned intact Result is an ordinary value when the receiving contract accepts it; it does not automatically exit or unwrap. An argument's own local recovery can finish normally and allow later arguments to run.

This contract does not choose copying, moving, borrowing, access activation, rollback, or destruction order. Those operations must preserve the selected observable expression order while obeying their own permission/lifetime rules.

## 2. Function calls: concrete routing proposal

```text
op := fn(a: Int, b: Int, c: Int): Int {
    a * 100 + b * 10 + c
}

op(1, 2, 3);
op(a = 1, b = 2, c = 3);
op(1, 2, c = 3);
```

Those three call shapes are selected. All supply a = 1, b = 2, c = 3, giving the mathematical result 123 for this illustrative body.

Recommend accepting any permutation of the named suffix:

```text
op(c = 3, a = 1, b = 2);
op(1, c = 3, b = 2);
op(1, b = 2, c = 3);
```

These have the same input mapping. Their expression evaluation order follows their written entries. In particular:

```text
op(c = third(), a = first(), b = second());
```

Executes third(), first(), second(), then op. The producer names do not change that order.

### Every complete call shape for three inputs

With these three required inputs, no spread/defaults, and the fixed mapping a = 1, b = 2, c = 3, the proposed prefix/suffix rule admits exactly ten positional-versus-named orderings:

```text
op(1, 2, 3);
op(1, 2, c = 3);
op(1, b = 2, c = 3);
op(1, c = 3, b = 2);
op(a = 1, b = 2, c = 3);
op(a = 1, c = 3, b = 2);
op(b = 2, a = 1, c = 3);
op(b = 2, c = 3, a = 1);
op(c = 3, a = 1, b = 2);
op(c = 3, b = 2, a = 1);
```

A positional prefix of length zero leaves six named permutations; length one leaves two; length two leaves one; length three leaves one. These are the ten complete routing shapes under the stated assumptions. Each evaluates its expressions in written order; several shapes have the same parameter-expression order.

### Static routing algorithm

Recommend this bounded algorithm for a known public signature:

1. Require unambiguous public labels for parameters addressable by name.
2. Accept a positional prefix of length k and map it to the first k signature positions. A positional argument does not search for the next unfilled slot after a named entry.
3. After the first named argument, require every remaining argument to be named.
4. Resolve each named label to exactly one public parameter and require that parameter to be unfilled.
5. Require every remaining input to have an applicable explicitly declared default. A supplied argument overrides its default.
6. Check each supplied/defaulted input against its own parameter type and access contract.
7. Reject invalid calls statically before any part of the call can execute. For admitted calls, evaluate the callee and supplied expressions in written order.

The routing invariant is simple: positional and named inputs select disjoint positions, every selected position is filled once, and every unfilled position has an applicable declared default. Type/access compatibility is checked for that uniquely determined destination. Neither missing labels nor equal component types require a heuristic to choose a position.

Labels are static selectors, not expressions. A local variable named b does not change what op(b = expression) selects. Parentheses/grouping must not cause the parser to guess between an argument label and ordinary assignment according to whether type checking succeeds. Complete assignment-expression grammar remains separate.

### Invalid call cases under this proposal

Each line below is an independent rejected example for the same op signature:

```text
op(1, 2);                         /* missing c: no default */
op(1, 2, 3, 4);                   /* too many positions */
op(a = 1, b = 2, d = 3);          /* unknown d, missing c */
op(a = 1, a = 2, b = 2, c = 3);   /* duplicate a */
op(1, a = 2, b = 2, c = 3);       /* a already filled positionally */
op(a = 1, 2, c = 3);              /* positional after named */
op(1, c = 3, 2);                  /* positional after named */
op(a = "one", b = 2, c = 3);      /* incompatible a value */
op(a = 1, b = 2, c = ?);          /* reserved storage marker is not a value */
```

Unknown, duplicate, or incompatible named inputs must not fall back to positional matching. Duplicate labels in a public signature cannot provide an unambiguous named-call contract. Whether to support separate positional-only declarations with repeated local names remains outside this initial routing proposal.

## 3. Omissions, defaults, and underscore

Assume a signature has inputs a, b, c and an applicable declared constant default of 20 for b. This assumption illustrates existing default semantics without selecting declaration syntax:

```text
op(a = 1, c = 3); /* supplied a and c; declared b default applies */
op(1, c = 3);     /* same input mapping */
```

Without the declared b default, both calls are rejected. A default on c alone cannot fill b. Unit, zeroable types, unnamed lambda inputs, and zero-initialized callables do not grant omission. Exact default-expression timing/scope and placement in signatures versus implementations remain explicitly open; no effect-order claim for effectful defaults is made here.

Underscore is an ordinary readable binding, not an omission marker. Passing _ supplies its bound value. A label _ selects an actual public parameter named _. Passing _ cannot mean skip this input, and does not bypass initialization or type checking.

## 4. Fresh tuple construction: selected reordering

A fresh literal under a known named tuple contract uses the destination's component order, independently of its entry evaluation order:

```text
pair: (l: Int, r: Int) = (r = 20, l = 10);
(left, right) := pair;
```

The initialized tuple has l = 10, r = 20 in that order. Under the proposed retention of ordinary positional tuple destructuring, left is 10 and right is 20.

This also applies to a known tuple-valued function input. For a function with one input pair of type (l: Int, r: Int), recommend:

```text
take_pair((r = op1(), l = op2()));
```

There is one tuple-valued argument. Its known expected type supplies the destination schema. Evaluate the callee, then op1, then op2, then invoke take_pair. This does not supply two separate function arguments.

### Fresh construction forms to include in the proposal

```text
pair: (l: Int, r: Int) = (10, 20);
pair: (l: Int, r: Int) = (l = 10, r = 20);
pair: (l: Int, r: Int) = (r = 20, l = 10);
pair: (l: Int, r: Int) = (10, r = 20);
```

All initialize the same l, r destination in this proposed completion of the selected reordering rule. A contextual literal can mix a positional prefix and named suffix by the same routing algorithm as a call. Tuple components have no newly introduced defaults; require every component to be supplied.

For two required components these are all four positional/named ordering shapes under the proposed prefix/suffix rule: two fully named permutations, one mixed form, and one fully positional form.

Under that proposal, reject:

```text
pair: (l: Int, r: Int) = (r = 20, 10);          /* positional after named */
pair: (l: Int, r: Int) = (10, l = 20);          /* duplicate l; missing r */
pair: (l: Int, r: Int) = (l = 10, unknown = 20); /* unknown label */
pair: (l: Int, r: Int) = (l = 10, r = "twenty"); /* incompatible r */
```

Missing components are also rejected; an empty/singleton spelling is not introduced merely to illustrate that diagnostic. This proposal does not define named tuple zero/default construction or relax the selected union initialization restrictions.

## 5. Inference and stored tuples: selected order boundary

Without an expected tuple contract, infer a fully named tuple in written component order:

```text
stored := (r = op1(), l = op2());
```

Its inferred order is r, l. Execution remains op1 then op2. This order belongs to the stored value's tuple contract; a later destination does not retroactively change it.

```text
pair: (l: Int, r: Int) = stored; /* rejected: stored order differs */
pair: (l: Int, r: Int) = (l = stored.l, r = stored.r); /* explicit reconstruction */
```

The second declaration reads the already produced fields; it does not invoke op1/op2 again. No implicit stored-tuple permutation is selected. This is the user-selected boundary, even when component types are identical.

A literal and a stored value are different syntactic inputs to construction. Merely writing a stored value where a literal was accepted does not enable contextual rerouting. More elaborate expected-type propagation through branches, generic calls, or overloads must not silently erase the stored-value boundary.

### Complete the type policy explicitly — recommendation

Recommend that a named tuple's ordered label/type sequence defines its structural tuple contract. Repeated identical tuple type expressions can then describe the same tuple type, while separately declared records retain their selected nominal identities. Labels differing at a position require reconstruction:

```text
size := (width = 640, height = 480);
point: (x: Int, y: Int) = size; /* proposed rejection: names differ */
point := (x = size.width, y = size.height); /* explicit renaming */
```

This name-identity completion still awaits confirmation. The selected stored-order restriction does not alone select every name-identity/conversion policy. Stored unnamed-to-named and named-to-unnamed conversions likewise remain open; recommend explicit reconstruction initially.

For initial inference, recommend fully positional or fully named literals. An inferred mixed tuple such as mixed := (10, r = 20) lacks names for its positional prefix; reject it initially unless an expected complete named tuple contract supplies that schema. This is a proposed restriction, not a new rule for existing positional tuples. Empty and singleton tuple syntax remains separate.

## 6. Destructuring and the user's original form

The original (left, right): (l, r) form does not yet have a label-routing grammar. After a colon, existing syntax expects types; l and r cannot sometimes mean types and sometimes source-field selectors according to name lookup.

Recommend extending the existing destination-first named-field clause to tuple patterns:

```text
pair: (l: Int, r: Int) = (r = 20, l = 10);
(left = l, right = r) := pair;
(right = r, left = l) := pair;
```

In either pattern, left receives 10 from l and right receives 20 from r. Pattern order does not rename or reorder the source tuple. Resolve/evaluate the whole source once before introducing pattern bindings. Source selectors on the right of = refer to fields in that source contract, not lexical variables of the same name.

By comparison, positional destructuring follows the stored tuple order:

```text
stored := (r = 20, l = 10);
(first, second) := stored; /* proposed: first = 20, second = 10 */
(left = l, right = r) := stored; /* proposed: left = 10, right = 20 */
```

Recommend exact component coverage in the initial named tuple pattern: reject unknown or duplicate source selectors, omitted components, and mixed positional/named patterns. Named rest/partial extraction needs a separate rule. This restriction is for the proposed tuple pattern, not a change to existing record-pattern questions.

Repeated destination bindings retain the already selected written-order shadowing rule:

```text
(value = l, value = r) := pair; /* final visible value binds r */
(_ = r, _ = l) := pair;         /* final readable _ binds l */
```

These select different source components, despite repeating a binding name. By contrast, (left = l, right = l) selects l twice and is rejected by the initial duplicate-source proposal. Binding order must not silently duplicate ownership, authorize overlapping writes, or specify user-defined getter/destructor effects; those remain governed by the shared pattern/memory rules.

## 7. Callables, nested inputs, and permissions

Recommend taking public call labels from the statically visible callable contract. Contextual lambda headers retain positional local naming:

```text
var difference: fn(l: Int, r: Int): Int;
difference = (x, y) { x - y }
difference(r = 2, l = 10); /* proposed public-label routing: result 8 */
```

The local x/y names do not become public argument labels. The same holds for empty/partial contextual lambda headers. Stored full-callable compatibility, public label renaming, overloads, unions of different callable contracts, and label-free function types remain separate choices; reject ambiguous routing rather than searching runtime values for names.

Nested expressions follow ordinary recursive evaluation. In op(c = outer_c(), a = nested(inner1(), inner2()), b = outer_b()), execution after evaluating op's callee is outer_c, nested's callee, inner1, inner2, nested's body, outer_b, then op's body, assuming normal completion throughout. Names at each call level route only that call's inputs.

Named inputs must preserve existing explicit caller grants. Recommend composing the label with the complete argument form:

```text
rename(user = mut mutable_user);
replace(target = var replaceable_user);
```

The actual signatures and source locations must already permit those grants. A named argument without mut/var cannot stand in for a required explicit grant. Var arguments select caller locations rather than snapshotting their payloads into substitute temporary values. Exact overlap and access-activation checks remain part of the shared memory design.

## 8. Spreading and remaining boundaries

Tuple construction spread does not automatically establish call spread. In particular, op(tuple_value) supplies one value and cannot silently fill several parameters. A future op(...tuple_value) needs an explicit positional-versus-named mapping policy. The initial routing proposal neither accepts named spreading nor allows it to bypass duplicate, missing, type, permission, or evaluation checks.

Aliases cannot hide an order mismatch; normalized tuple contracts decide it. Named-field selectors must be statically available and accessible on the source. Union-valued components retain their existing member/widening contracts; naming a field does not unwrap Result/Option or choose a union member. Generic expected-schema discovery and full source grammar remain open.

This case catalogue covers the structural success/failure classes for the proposed mapping: positional, fully named, mixed, reordered, missing, excess, unknown, duplicate, incompatible type/access, contextual versus stored, inferred versus expected, nested calls, shadowing, and outward exits. It is a design audit, not a claim that a LiteScript parser or runtime has executed these examples.

## Review evidence and limits

An independent finite routing model was evaluated for this proposal on 2026-10-21. It enumerated 781 abstract call-entry shapes for three parameters, including positional entries, known labels, an unknown label, missing entries, excess entries, and duplicate selections. Its ten accepted complete shapes exactly match the ten listed above. Giving b an explicit default admits thirteen shapes. A corresponding two-component contextual tuple model enumerated 85 entry shapes and admitted the four listed construction forms.

The model checks static position/name routing only. Types, permissions, defaults with effects, pattern ownership, source parsing, and runtime execution were reviewed as contract boundaries, not executed as LiteScript. These counts do not constitute compiler or runtime verification.

Related: [named arguments and tuples](named-arguments-and-tuples.md), [reference comparison](named-arguments-reference-comparison.md), [evaluation order](evaluation-order.md), [tuple patterns](tuples-and-patterns.md), [aggregate patterns](aggregate-patterns.md), [argument omission](union-parameter-defaults.md), and [caller grants](caller-mutation-grants.md).
