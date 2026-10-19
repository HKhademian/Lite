# Naming caller-location parameters

Status: **historical comparison, 2026-10-18; spelling recommendation superseded 2026-10-19**. The [var access decision](var-access-qualifier.md) now uses type-side var for caller replacement and retires slot as a source keyword. The examples and assessment below preserve the earlier alternatives; they are not current canonical spellings.

An intermediate clarification retained slot receivers while hiding derived mathematics. The later user decision uses fn(target: var T), with explicit var call grants. Local-only header modifiers are omitted; use body declarations instead. See [access ergonomics](slot-ergonomics.md) and [parameter permissions](parameter-permissions.md) for current contracts.

The later [mut qualifier placement decision](mut-qualifier-placement.md) selects fn(target: mut T), superseding the earlier typed name prefix. The examples below use the selected placement without changing capability distinctions or selecting a ref parameter mode.

## The naming concern

The current sketch uses target: slot (A | B). Slot already describes accepted replacement alternatives; its use as a parameter also identifies caller-location access. Decide whether these are one location-capability concept expressed uniformly, or whether parameter passing deserves a separate marker.

The comparison must preserve three different questions:

- Does the parameter denote a caller-supplied location?
- May the operation mutate the currently held data?
- Which values may replace the content of the location?

No public pointers, address arithmetic, escaping reference values, or mandatory runtime representation follow merely from choosing one of these words.

## 1. ref

One possible alternative is:

```text
replace := fn(ref target: A | B) {
    target = new_B()
}
```

If ref is defined specifically as a writable caller-location mode, this resembles the current full slot contract. The word emphasizes aliasing the caller location and is familiar from C#.

However, ref then grants writes itself. If instead ref means aliasing without mutation authority, the same declaration must be read-only under LiteScript's default-access goal. These are different designs; the name alone cannot decide which one is intended.

A separate aliasing mode can retain existing permissions explicitly:

```text
fn(ref target: T)                 /* proposed read-only caller view */
fn(ref target: mut T)             /* proposed held-data mutation */
fn(ref target: slot T)            /* proposed replacement with T */
fn(ref target: A | slot B | C)    /* proposed read A/B/C, replace with B */
```

These are illustrative parameter headers, not complete selected grammar or alternate spellings already supported. This design adds a scoped read-only caller-view feature and makes ref and slot independent concepts. It is more expressive but longer. If chosen, it should replace the earlier receiver spelling consistently instead of keeping duplicate ways to declare identical requirements.

## 2. mut

The existing form is:

```text
rename := fn(user: mut User, name: String) {
    user.name = name
}
```

Mut already requests writable access to held data. It does not by itself select borrowing or allow replacing the caller's variable. Using the same spelling for caller replacement would require broadening its selected meaning or introducing a special meaning for parameters.

Keeping the word count small is useful, but this would blur the distinction that permits a fixed mut binding and a reassignable read-only var binding. Recommend retaining mut's current role, not using it alone as the new caller-replacement marker.

## 3. slot

The current form is:

```text
replace := fn(target: slot (A | B)) {
    target = new_B()
}
```

Slot describes a location's accepted replacements. Receiving that location through a parameter is a direct use of this capability contract. This can be a uniform concept rather than an unrelated second meaning of the keyword.

The partial-write form stays compact:

```text
put_b := fn(target: A | slot B | C) {
    target = new_B()
}
```

Its strengths are precise replacement limits, compatibility with the selected distribution rule, and a small initial feature scope. It does not imply permission to mutate fields of the current payload.

Its limitation is that a contract with no slot alternatives does not by itself distinguish a read-only caller view from an ordinary read-only parameter. First-class access values and a separate read-only caller-view feature would still need review. Receiver semantics should remain explicit in the specification, even though the spelling combines location access and replacement permission.

## 4. mut ref

The illustrative form is:

```text
fn(ref target: mut T)
```

This can cleanly compose caller aliasing with permission to mutate the referenced data. Under LiteScript's existing mut/slot separation, however, it does not automatically grant replacing the entire supplied location. Replacing it still requires a slot contract unless the language deliberately broadens mut.

Rust's &mut T permits mutable access to the referent, including assignment through dereferencing; adopting those permissions wholesale would not preserve LiteScript's narrower distinction between held-data mutation and allowed replacements. The analogy is useful, but the permission boundary needs an explicit decision.

If a separate ref parameter mode is introduced, combining ref with mut-qualified access is useful, not necessarily synonymous with the current writable-slot parameter. The user-requested label mut ref names that combination; the current illustrative spelling puts mut after the colon. Ref-mode grammar and interaction with type aliases remain open.

## Comparison with reference languages

C# uses ref as a by-reference parameter mode that can update the caller variable, with separate in and ref readonly modes for read-only access. A C# reference-type value passed by value is a different concept again. This supports using ref for caller-location identity, but does not require LiteScript to make plain ref writable or adopt C#'s other modes. Source: [C# method parameters](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters).

Rust distinguishes mut on a local binding or parameter from a mutable reference. Its reference syntax combines the reference operation with mut for writable borrowing, and explicit dereferencing can assign the referent. This supports distinguishing the two axes rather than treating bare mut as automatic caller aliasing. Sources: [Rust mut keyword](https://doc.rust-lang.org/std/keyword.mut.html) and [references and borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html).

V uses mut on parameters and at calls for supported caller-data updates. Its documented restrictions and type-specific behavior differ from LiteScript's separate field-update and replacement contracts; brevity alone does not make these keywords equivalent. Source: [V mutable arguments](https://docs.vlang.io/functions-2.html#mutable-arguments).

## Assessment

For the currently selected feature of temporary writable caller locations, recommend retaining slot: it already describes the precise replacement capability, including partial-write unions. It is not necessary to add a separate ref word solely to rename that same capability.

If the intended next feature is explicit borrowed views with independently specified data mutation and replacement rights, a separate ref mode becomes useful. In that larger design, recommend keeping ref, mut, and slot orthogonal, with plain ref read-only by default. This would be a deliberate feature extension, not a keyword-only substitution.

Do not silently broaden mut or mut ref into full replacement authority. Do not retain multiple synonymous receiver spellings without a demonstrated need. Call-site markers remain a separate choice; none is selected by this comparison.

Related: [slot parameters](slot-parameters.md), [ordinary parameters and slots](parameter-values-and-slots.md), [mutability](mutability.md), [slot qualifier](slot-access-qualifier.md), and [immutability by default](immutability-by-default.md).
