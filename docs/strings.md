# Strings

Status: **multiline strings and adjacent literal joining requested; detailed literal grammar open**.

## Purpose

Allow readable text without making source-code indentation or line breaks determine executable structure.

## Templates

```text
message := "Hello";
message := "Hello, " "world";
```

## Adjacent literal joining

Implementation coverage, 2026-11-02: generated TS and C join admitted quoted
literals across whitespace and nested/raw comments. Both parser paths retain
the token boundary before checking expression and statement separators. The
[compiler ledger](lite://doc/compiler/parity#adjacent-string-literals) records
generated execution, malformed-source checks and performance evidence.

Adjacent string literal tokens concatenate without inserting whitespace:

```text
message := "Hello, "
           "world";
```

is equivalent to:

```text
message := "Hello, world";
```

The join applies to literal tokens, not arbitrary adjacent expressions. Use an explicit operation for computed strings:

```text
message := prefix + name;
```

A semicolon separates items, so these are two expression items, not one joined literal:

```text
"Hello"; "world"
```

## Multiline contents

```text
message := "Hello,
world";
```

The newline inside the quotes is data. The working direction preserves literal contents exactly; indentation is not automatically removed. The formatter must not alter the data when formatting surrounding code.

## String properties

In the generated-TS compiler, every `String` exposes two read-only metadata properties without importing `core/text`:

- `s.length` (`Int`): Unicode code-point count (matching `core/text.length(s)`).
- `s.isEmpty` (`Bool`): `true` when `s` is `""`.

## Notes

The next [focused FVP review](lite://repo/research/investigations/INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31)
records the explicit acceptance of textLength/textAt/textSlice as temporary
positional code-point helpers with terminal bounds faults. This review does not settle ordinary String indexing, graphemes,
normalization, native representation or the deferred complete text profile.

String literal patterns test the whole string through its ordinary equality contract. Existing text uses == expectedText. Neither spelling implies regex, substring, case-folding, or normalization operations. Unicode equality details remain a String contract, not a special pattern conversion.

The [pattern review](lite://doc/pattern-type-review#8-strings-and-characterbyte-views) recommends explicit byte/scalar/grapheme views before sequence matching. A proposed [list pattern](lite://doc/sequence-patterns) must not silently choose one text unit or treat every string as a list.

Whitespace outside literals can move freely without changing executable structure. Whitespace inside literals is part of the value. These are separate rules, not an exception that makes indentation structural.

## Open decisions

- Exact escape sequences and raw-string syntax.
- Interpolation syntax, if any.
- Unicode model, indexing, and normalization.
- Whether physical line endings are normalized when reading source.
- String ownership, slicing, and allocation behavior.
- How adjacent literals with different encodings or future literal prefixes interact.

## Approved temporary igniter coverage

The user explicitly approves the exact temporary positional code-point helpers
on 2026-10-31 after the consent correction and focused review. Acceptance comes
from that reply, not the earlier implementation/tag. See
[INV-016 approval and evidence](lite://repo/research/investigations/INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31).

Implementation increment, **2026-10-30**: the
[igniter](lite://repo/igniter/README.md#temporary-text-operations) now executes computed
String + String concatenation, plus temporary textLength/textAt/textSlice helpers
for a small Lite-written arithmetic tokenizer. The helpers consistently use
zero-based code-point positions and half-open slices, without normalization;
invalid bounds raise a terminal BoundPanic. Code points are materialized on each
helper call, so these operations do not promise constant-time access or a native
representation. This records disposable host behavior, not a language-wide
String indexing/character/slicing policy. The detailed FVP text-profile proposal
remains deferred; [INV-016 evidence](lite://repo/research/investigations/INV-016-igniter-text-operations.md)
records exact coverage and limitations.

The restricted compiler's TS path now accepts the same three helpers as checked
calls and emits self-contained code-point helpers: `textLength` returns an Int,
`textAt` a one-code-point String and `textSlice` a half-open String, with the
same zero-based positions and terminal `BoundPanic` bounds faults as the
igniter. The C path rejects them clearly for now. This changes no language
policy: graphemes, normalization, generic String indexing and native
representation remain open.

Implementation increment, **2026-11-01**: the restricted TS/C compiler also
admits dynamic `prefix + name` concatenation instead of rejecting non-constant
String operands. Constant-only concatenation continues to fold at compile time.
The TS path emits ordinary `+` concatenation, so operands evaluate left to
right. The C path emits a checked `lite_concat` helper that allocates and copies
the UTF-8 bytes of both operands. That helper intentionally leaks each
short-lived result in this bootstrap slice; allocation failure reports a
terminal `MemoryFault` and exits nonzero. Sources without dynamic concatenation
keep their existing emitted bytes. This records disposable host behavior, not a
language-wide String ownership or allocation policy; those questions remain
open below.

## Related concepts and references

- [Lexical structure](lite://doc/lexical-structure)
- [Memory and performance](lite://doc/memory-and-performance)
- Adjacent literal joining was requested as a C-style convenience; no complete C string or encoding semantics are adopted by this note.

## Joint review: text semantics

The selected direction uses valid UTF-8 for native `String` storage and Unicode scalar values for `Char`. `String` length counts scalars and scalar indexing selects one whole `Char`. Its cost may include a scan. Exact API names, native layout and invalid-input failure policy remain open. A byte sequence has its own operations and can hold arbitrary bytes. Expose or convert encoded bytes explicitly. Grapheme traversal is a separate operation.

A text operation uses `Char` positions. Indexing and slicing a byte sequence operate on bytes. A range selecting characters produces a `String` under the copy-by-default rule. A compiler can elide the physical copy when it preserves the observable behavior. With illustrative half-open range syntax, `"aé😀b"[1..3]` yields `"é😀"`. Slicing by scalars can separate a combining mark from its base scalar.

Text tooling can consume a stream of `Char` values from UTF-8, UTF-16, UTF-32 or another decoder and emit via an encoding adapter. Contiguous output in a different encoding requires transcoding. A decoder can stream values without allocating a converted copy of the whole input.

Encoding is part of the contract of an encoded buffer or adapter. An operation that returns encoded text in the same encoding preserves that encoding. Explicit transcoding selects a new encoding and preserves the scalar sequence for representable, valid input. For example, decoding UTF-16 into native `String` preserves the text. Code that needs the original UTF-16 bytes retains the encoded buffer. Exact adapter and conversion APIs remain open.

The proposed type model makes `String` a transparent alias of the default concrete `Utf8String`. `Utf16String` and `Utf32String` would be other concrete string types implementing the same text contract. A function that only needs text operations can request that shared contract and consume any provider as `Char` values. An API that specifically takes `String` requests the UTF-8 type under this alias model. The shared contract's name, concrete type spellings, byte order at binary boundaries, and conversion syntax remain open.

Reading a file as `Utf16String` produces a UTF-16-backed text value. Length, scalar indexing, and other reads through the shared text contract preserve that representation. Converting the value to `Utf8String` requires an explicit request. This guarantees the resulting text encoding. A byte-for-byte file round trip depends on separate file-format details such as byte order and the byte order mark.

A fresh quoted literal such as `"test"` is String-Like. In the absence of a context selecting another text type, it realizes as `String`, the alias for `Utf8String`. For append, the left operand determines the result encoding. Appending UTF-8 text to a UTF-16 value produces UTF-16 text, and reversing the operands produces UTF-8 text in the reversed concatenation order. The right operand supplies its `Char` sequence, which is encoded for the destination as part of the append. Both stored operands retain their types. This rule is specific to append and leaves ordinary assignment conversions and literal realization in ambiguous contexts for separate review.

Equality compares the exact scalar sequence. Normalization is explicit. Two valid native strings can compare byte lengths and byte contents. Cross-encoding algorithms can compare decoded scalars as they advance. Ordering is lexicographic by scalar value. The first differing scalar determines order. When one string is a prefix, it comes first. Embedded U+0000 is a real scalar and comparison can continue past it. Unsigned-byte comparison gives the same order for valid native UTF-8.

Hashing must agree with equality. If a map or set accepts lookup through other encoding adapters under the same equality contract, it must hash equal scalar sequences consistently. It could feed the corresponding UTF-8 bytes incrementally. Cross-encoding lookup and hash API design remain open. See the [encoding comparison](lite://repo/research/investigations/language-review/07-collections.md#prior-art-string-storage-and-indexing).
