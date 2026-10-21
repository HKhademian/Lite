# Named arguments and named tuples

Status: **positional calls, named arguments using =, and positional prefixes followed by named arguments selected by the user, 2026-10-21. Argument reordering, further mapping rules, callable label compatibility, and named tuples remain open**.

## Selected basic call forms

```text
op := fn(a: Int, b: Int, c: Int): Int { a + b + c }

op(1, 2, 3)
op(a = 1, b = 2, c = 3)
op(1, 2, c = 3)
```

These forms supply the same three inputs to the same callable. Naming an argument does not turn the call into a single record or tuple argument. No extra named-parameter declaration marker is required for these simple identifier parameters. The user's abbreviated fn(a,b,c) sketch describes the call shape; it does not select independent inference of unknown function input types. Omission still requires an applicable explicitly declared default.

The comparison of all twelve established reference languages, plus supplemental C#, is in [named calls and tuples across the reference languages](named-arguments-reference-comparison.md).

## Shared spelling to consider

Use colon for a type and equals for a supplied value, following existing record construction:

```text
resize := fn(width: Int, height: Int): Int {
    width * height
}

area := resize(width = 640, height = 480)
size := (width = 640, height = 480)
typed_size: (width: Int, height: Int) = (width = 640, height = 480)
```

The call supplies two inputs. The proposed tuple expression produces one value with two components. Named tuple types, named access such as size.width, and named tuple construction all require confirmation. Existing record declarations remain nominal; this review does not give record types structural compatibility.

For calls, the user selected equals; colon-value call syntax is not the selected form. Equals reuses the selected field-value convention and leaves colon for types and type tests. The complete parser must distinguish a named entry from assignment expressions by syntactic context; it must not choose whichever interpretation type-checks.

## Named calls: further rules to consider

```text
resize(640, 480)
resize(width = 640, height = 480)
resize(height = 480, width = 640) /* reordering remains a proposal */
resize(640, height = 480)
```

Propose positional arguments first, followed by named arguments in any written order. A positional argument occupies its next signature position; a named argument identifies one public parameter. Reject unknown names, ambiguous labels, supplying one input twice, and positional arguments after a named argument. For example, resize(640, width = 800, height = 480) supplies width twice.

The selected omission rule still applies: every unfilled input needs an applicable explicitly declared default. Named calls would let a programmer supply a later input while omitting an earlier defaulted one. They would not add automatic zero arguments. Default declaration syntax, evaluation timing, and where defaults belong remain open.

Evaluate the callee first, then supplied argument expressions once each in written order, consistent with the existing evaluation contract. In resize(height = read_height(), width = read_width()), read_height runs first even though width is the first parameter. Mapping names to input positions must not reorder side effects. Transfer and permission activation remain subject to the shared memory contract.

Names can be resolved statically. This feature need not require a runtime name dictionary, reflection, or heap allocation. Exact passing and ABI remain separate.

## Public names and implementation-local names

```text
var area: fn(width: Int, height: Int): Int;
area = (w, h) { w * h }
result := area(width = 640, height = 480)
```

Recommend obtaining public labels from the caller-visible callable contract. A contextual lambda binds local inputs by position, as already selected; w and h should not rename the public labels width and height. Empty or partial lambda headers likewise leave those public inputs present.

For a full independently inferred fn definition, its header is a candidate source of both public labels and local parameter bindings. This needs explicit rules for repeated parameter names, patterns, and underscore names. Underscore is an ordinary readable identifier in LiteScript; this review must not silently turn it into an unnamed-input marker.

Two policies for stored callable compatibility remain open:

- Require public labels to agree when assigning callables. This protects named calls but makes a public rename a compatibility change.
- Permit positional compatibility between differently labeled signatures, with the destination contract defining labels for calls through that binding. This is easier to adapt, but the same callable can be exposed with different names.

Do not make implementation-local lambda names part of the public contract under either policy. Additional separate external/local label syntax is not proposed yet. Whether a callable with no public labels supports only positional calls also needs a decision.

## What should a named tuple mean?

Start with the common example:

```text
size := (width = 640, height = 480)
w := size.width
(a, b) := size
```

There are materially different contracts behind that spelling.

### A. Positional tuples with access labels

Names provide readable access, while assignment follows component positions and types. A width/height tuple could be assigned to a left/top tuple with the same positional types; the destination would expose its own names. This is convenient for temporary products and keeps tuples ordered. It provides no extra type protection against exchanging two equally typed components.

Label propagation through inference, branches, unions, generic APIs, and tuple spread would need rules. Conflicting names must not be chosen arbitrarily. Removing labels would not change the underlying positional type under this option.

### B. Names participate in the tuple contract

A width/height tuple would not automatically fit a left/top tuple, even when both contain two Int values. Explicit reconstruction could rename components. This protects meaning conveyed by labels but introduces additional compatibility rules alongside nominal record declarations.

This option has a further choice: preserve tuple positions as part of identity, or make the named portion an unordered shape. For an ordered model, (width: Int, height: Int) and (height: Int, width: Int) would differ. For an unordered model, names route values and positional destructuring of named fields needs its own explicit policy. Selecting name sensitivity alone does not settle order.

### C. Keep tuples positional and use records for named values

Named calls could still exist independently. A Size record already supports named fields, contextual construction, and named extraction. This avoids another named product category but needs a record declaration for reusable named data. Inferred standalone record types are not selected by this alternative.

These options are open. Do not assume that named argument support requires any one of them.

## A tuple argument versus spreading arguments

```text
resize(size)     /* one supplied argument */
resize(...size)  /* possible future call-spread form */
```

The first form does not silently turn one product value into two inputs. Call spreading is a separate proposal: current tuple construction spread does not establish it. Positional spread could map components by position; named spread could route by labels. Choosing between them matters when a named tuple's written order differs from the signature. Duplicate inputs, mixed spreads, evaluation order, permissions, and ownership must be settled before accepting either form.

A function taking one tuple remains distinct from a function taking two parameters. Named tuple return values are ordinary single results; they do not introduce mutable named return locals or bare-return rules.

## Other grammar and type questions

- Empty and singleton tuple spelling and their relationship to Unit remain open.
- A named singleton could be distinguishable by its entry syntax, but no singleton production is selected here.
- Mixing named and unnamed tuple components, numeric access, repeated names, label inference, and named destructuring need decisions.
- Existing destination-from-source record patterns must not be reversed when named tuple extraction is specified.
- Naming a component does not add mutation permission, automatic cloning, reference semantics, default initialization, or a nullable state.

## Reference languages

- **Odin:** native named arguments use name=value; named arguments can be reordered, with positional arguments before named ones. Named results are a separate procedure facility. This is a close precedent for the proposed call surface. Sources: [named arguments](https://odin-lang.org/docs/overview/#named-arguments), [named results](https://odin-lang.org/docs/overview/#named-results).
- **Zig:** anonymous struct literals supply named fields, while tuples are anonymous structs with numbered fields. Its examples distinguish named data from positional tuple data. These are useful product representations without implying LiteScript should turn a call into a single anonymous-struct input. Sources: [anonymous struct literals](https://ziglang.org/documentation/master/#Anonymous-Struct-Literals), [tuples](https://ziglang.org/documentation/master/#Tuples).
- **V:** its docs explicitly use trailing struct-literal syntax as the alternative to native named/default arguments. A call that looks named can be construction of the final struct argument. Source: [trailing struct literal arguments](https://docs.vlang.io/structs.html#trailing-struct-literal-arguments).
- **Rust:** ordinary call grammar lists argument expressions, and tuple fields are positional, numbered from zero. These contracts keep call inputs and tuple values distinct. Sources: [call expressions](https://doc.rust-lang.org/reference/expressions/call-expr.html), [tuple types](https://doc.rust-lang.org/reference/types/tuple.html).
- **C++:** ordinary function calls use argument initializer clauses corresponding to parameters. Designated initialization belongs to aggregate construction; it is a way to label fields of an argument object, not a public function-parameter-label mechanism. Sources: [function calls](https://eel.is/c++draft/expr.call), [aggregate initialization](https://eel.is/c++draft/dcl.init.aggr).
- **C#:** tuple assignment and equality ignore field names. Friendly field names are replaced with the corresponding default member names at compile time. This is a concrete precedent for option A. Source: [tuple field names](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-tuples#tuple-field-names).
- **Dart:** its records can contain positional and named fields. Named field names participate in structural shape; their written order does not. Positional field labels are documentation only. This is a concrete precedent for option B's unordered named portion, rather than a reason to change LiteScript's selected nominal record identity. Source: [records](https://dart.dev/language/records).

Related: [functions](functions.md), [argument omission](union-parameter-defaults.md), [tuples and patterns](tuples-and-patterns.md), [tuple spread and rest](tuple-spread-and-rest.md), [records](records.md), and [evaluation order](evaluation-order.md#function-calls).
