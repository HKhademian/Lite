# 1. Core types and values — initial review

Status: **joint review in progress**. The bounded direction below was clarified by the user; other recommendations remain hypotheses, not compiler support. Recheck sources before further decisions.

## Baseline and sources

- [Type categories](../../../docs/type-categories.md)
- [Types and inference](../../../docs/types-and-inference.md)
- [Tuple label conversions](../../../docs/tuple-label-conversions.md)
- [Records](../../../docs/records.md)
- [Arrays](../../../docs/arrays.md)
- [Union initialization policy](../../../docs/union-initialization-policy.md)
- [Universal zero initialization](../../../docs/zero-initialization.md)
- Related investigation catalog areas: INV-018, INV-019, INV-020, INV-022, INV-024, INV-029.

## First layer: values, type and storage

The user describes a value as having a type and storage with an address. Its
type describes the memory layout, including its size and the locations of
inner values identified by names or positions. This is the first-layer model
for discussion; exact layouts, address observability and optimizer obligations
remain to be reviewed. In particular, [Unit has zero-sized storage](../../../docs/unit.md)
and unique addresses for zero-sized positions have not been selected.

The user reaffirmed that **all-zero storage is an initialized, valid
language-defined value for every type**. This matches the existing universal
rule in [zero initialization](../../../docs/zero-initialization.md); it is not a
claim that every type-specific zero mapping is complete or implemented. Zero
initialization is distinct from reserved, uninitialized storage and from
declared field defaults.

For plain multi-member unions, the mapping from zero storage to an observable
value remains unresolved. Existing source restrictions on omitted or `= 0`
union initialization remain in force until deliberately revised. An earlier
discussion example using `1 | 2` did not settle whether values can serve as
types or whether that is valid union syntax; both are open. Record those
questions for a later layer without choosing an active member or an extra value.

## 1.1 Primitives and literals

**Review naming:** The user asks that this review use `Int64`, `Float64`,
`Bool`, and `String` when naming the basic types. `Int` is a transparent alias
for `Int64`, not a distinct type. The existing [numeric-width contract](../../../docs/numbers.md)
also treats `Float` and `Double` as aliases of the same `Float64` type. These
names do not create additional type identities; narrower numeric types remain
separate from these aliases. Use the explicit-width names in review examples.

**Signed aliases:** The user directs that `SignedInt*` names are transparent
aliases of the corresponding `Int*` types for naming symmetry. For example,
`SignedInt8` and `Int8` name the same type, as do `SignedInt64` and `Int64`;
`SignedInt` likewise names the same type as `Int`. These aliases do not create
new identities or conversions. Their complete spelling/availability and
compiler support still need verification; this note does not claim they are
implemented.

### Special types to review

The user identifies these alongside the numeric types. This list records the
discussion, not a completed primitive-type contract or compiler support:

- `Bool`: Boolean values, already part of the language draft.
- `Bit`: a future discussion, including its meaning, operations and storage.
- `Nibble`: a future discussion, including its relationship to four bits,
  operations and storage.
- `Byte`: the user associates it with `UnsignedInt8`; whether that means a
  transparent alias or a distinct type, its final spelling, operations and
  target support need review.
- `Char`: a Unicode character. The user leaves open whether its representation
  relates to UTF-8, UTF-16, UTF-32, a union, an enum or another model. Define
  what one character means (code point, scalar value or user-perceived grapheme)
  separately from its encoding and storage, and compare their costs and zero
  behavior before selecting a representation.
- `Ref64`: a possible future facility for C FFI. Its meaning, ownership and
  access rules, width, portability and relationship to target pointer/ABI
  representations remain open; do not assume a 64-bit pointer on every target.

Except for `Bool`, these entries do not establish selected language syntax or
prove generated compiler support. The list does not resolve their relationships
to `String`, collections, references, numeric conversions, or the universal
zero rule.

### Unsigned integers: explicit, portable capability

The user favors signed integers for ordinary Lite code and sees unsigned
integers as an explicit, niche capability that may eventually be supported
across emission targets. Support need not be a priority on every platform and
can arrive later; no common delivery date or initial target matrix is selected.
Ordinary language semantics and core implementation should not require Lite
programmers to use unsigned types. Longer, conspicuous type symbols are desired
for code that deliberately needs them; `UnsignedInt64` is an illustrative name,
not a finalized spelling or alias rule.

Unsigned values can be useful at low-level boundaries such as C FFI and in
binary representations. Supporting the same Lite-level capability across
targets may require different lowering strategies: a target without a directly
matching type can need generated operations and may be slower. Backend use of
host unsigned operations or storage for an explicitly required representation
is not, by itself, a requirement that ordinary Lite programs use unsigned
types. Cross-target portability is a possible longer-term direction, not a
requirement that all targets implement the feature immediately, a claim of
current implementation, or a promise of identical target performance or ABI.
Keep unsupported targets and their diagnostics visible rather than implying
support or silently changing unsigned behavior.

The exact widths and names, overflow and conversion behavior, literal rules,
FFI layout and ABI, unsupported-target diagnostics, and generated costs remain
to be reviewed. No particular feature or program acquires a new implicit
unsigned dependency through this direction. The current numeric documentation
reports unsigned widths as unimplemented; see [numbers](../../../docs/numbers.md).

**Baseline:** A literal such as `raw := "user-42"` is used as String in current inference examples. Literal grammar and context-sensitive typing are not a complete contract.

**Fresh numeric literals:** The user describes a fresh integer-spelled literal
such as `42` as integer-like rather than inherently an already-established
`Int64` value. It can be supplied directly to functions expecting `Int8`,
`Int16`, `Int32`, or the proposed `UnsignedInt8`; contextual admission and
range boundaries require further specification. This is not automatic
conversion of a previously bound `Int64` value. The current compiler's default
inference and bounded numeric literal admission are described in
[numbers](../../../docs/numbers.md); the proposed unsigned spelling is not
implemented. The user included `3.5` in the examples; whether fractional
literals may feed integer parameters remains explicitly unresolved. The
string-like literal direction below has its own explicit-use-site requirement;
do not silently generalize it to numeric literals or vice versa.

### User direction: inference from uses of a fresh value

The user favors considering the relevant uses of an inferred fresh
integer-like binding together at compile time, rather than letting the first
use prematurely fix its type. In the discussed example, `value := 10` is used
only where `UserID` is expected; the compiler could infer `UserID`. If another
use instead requires incompatible `Int64`, the user's preferred outcome is an
**inference conflict**, not accepting the first use as proof that the binding is
already `UserID`. If no use determines its type, the proposed default is `Int`
(the same type as `Int64`). This is static inference, not a runtime type change.

```text
value := 10;
searchUserId(value);  /* illustrative parameter expectation: UserID */
printCount(value);    /* illustrative incompatible expectation: Int64 */
/* Direction: report an inference conflict; do not select first use. */
```

This direction is under investigation, not an implemented rule. Scope of
“relevant uses,” compatible constraints, ambiguity, recursion, public APIs,
diagnostics, unused bindings, and the precise commitment point remain to be
specified. For a uniquely resolved binding, the type produced by inference
must be established consistently; individual uses do not give it different
runtime types. The interaction with distinct-type explicitness and the earlier
string-like literal rule is unresolved; do not silently generalize or revise
either contract. Some selected ordinary widening rules may produce compatible
uses; do not treat every differently written expected type as a conflict without
a compatibility analysis.

**Parked for future discussion:** The user names five related concepts:
`Float-Like`, `Int-Like`, `String-Like`, `Array-Like`, and `Record-Like`.
Review them together, including their relationship to fresh expressions,
established values, contextual typing, inference and explicit type boundaries.
These labels do not yet select syntax, type identity, a common conversion rule,
or whether they describe literals only, types, capabilities, or another concept.
Preserve the already discussed distinctions until explicitly revised. The
relationship to array and record construction belongs across topics 1, 3 and 7;
record dependencies without leaving the current review layer. The user also
asks whether JSON-Like, YAML-Like and other direct data forms or static file
imports are worthwhile; see [structured data and static imports](structured-data-like.md).

### User direction: Like-category defaults

The user states the general principle: when a fresh `X-Like` value needs its
default, its default is `X`. Examples include `64` as `Int-Like`, defaulting to
`Int` (transparent alias of `Int64`), and `64.0` as `Float-Like`, defaulting
to `Float` (an alias of `Float64`). The same intended pattern extends to
String-Like, Array-Like, Record-Like and JSON-Like. These names are discussion
labels; they do not by themselves select language syntax, compiler support or
the complete type rules.

This defaulting direction must be reconciled with the proposed compile-time
inference from relevant uses above: an applicable unique inferred type may
resolve the fresh value, while incompatible use constraints are an inference
conflict, not a reason to silently choose the default. The exact conditions for
defaulting and compatibility remain to be defined.

For categories beyond the existing numeric and string defaults, the concrete
meaning of `X` remains to be specified. In particular, do not invent a single
universal Array, Record or JSON type, assume a map layout or compiler feature,
or silently replace the existing known-size fixed-array inference and
record-identity rules. Compare those contracts explicitly in the relevant
category review. JSON-like external formats and their result types remain a
separate [structured-data investigation](structured-data-like.md).

**Initial assessment and probes:** Compare a direct literal in a `UserID` destination with an already bound String; do not assume they must be treated identically. Check numeric bounds and contextual inference too.

## 1.2 Identity and distinct types

**Baseline:** Transparent aliases retain identity; record declarations are nominal. The user likes `UserID := distinct String` and `UserData := distinct (name: String, age: Int)` and favors distinctness in both directions; general distinct syntax and semantics need review.

**User clarification:** A type alias gives the same type concept another
symbol: `Int` and `Int64` name the same type. A distinct type has its own type
identity while sharing its underlying type's memory layout or storage. Thus
`UserID` and `String` are different types even though UserID is based on
String. A second distinct type based on String has its own identity too.

The exact definition of shared layout/storage, ABI, conversion eligibility,
validation, and whether a conversion needs any work remain to be specified.
Sharing a layout does not by itself authorize implicit conversion or unchecked
memory reinterpretation. This is a type-design direction, not evidence that
the current compiler implements general distinct types.

**Parked for future discussion:** The user is considering making alias and
distinct type definitions explicit parts of the language syntax. Review how
the two concepts should be expressed and distinguished, including their effect
on readability and grammar. `Alias := type TypeExpression` is the currently
selected transparent-alias spelling; the illustrated `distinct` form has not
settled the full syntax. This question does not select new keywords or replace
the existing alias rule.

**Initial assessment and probes:** Keep separate UserID and OrderID even with String underneath. Compare nominal wrappers with transparent aliases and ask which operations, invariants and representation each preserves.

## 1.3 Tuples, records, and arrays

**Baseline:** Tuple identity includes ordered labels and types; records are field-oriented and nominal; fixed arrays have homogeneous elements and tuple-equivalent inline layout. Shared layout does not establish identity.

**Initial assessment and probes:** Compare `(1, 2)` with `[1, 2]`: runtime indexing, extent, homogeneous typing, zero and distinct empty shapes are decision tests. Avoid assuming record fields are tuple positions.

**User clarification, 2026-11-17:** `[Int64; 2]` and
`(:Int64, :Int64)` are not the same type. Their matching layout and even equal
stored values do not establish type identity. The user illustrates the broader
principle with a distinct `UserID` and an `Int` both holding 5; the exact
distinct-declaration syntax and general conversions are separate questions.
See [equal layout and type identity](../../../docs/arrays.md#equal-layout-does-not-determine-type-identity).
The decision does not infer identity for every other array/tuple shape.

### Proposed tuple indexing by possible index values

The user proposes that tuple indexing can yield different static types depending
on the compile-time-known index values or range, including a `Never` result or
a compiler error when no value can be selected. A dynamic index requires a
runtime range check; an access whose index is known at compile time to be valid
does not need one. This would reconsider the current selected rule rejecting
runtime-variable tuple indexing; see [tuple access](../../../docs/tuple-entries-and-access.md#runtime-indexing-rejected).
It is a design discussion, not a claim that compiler support exists or that the
existing rule has already been formally replaced.

For a tuple whose zero-based components have types `(Int64, String)`, use
these conceptual cases to review the direction:

- A statically known index of 0 selects `Int64`; 1 selects `String`.
- The user gives `pair := (10, "Ali"); i := 1; pair[i]`: `i` is a
  compile-time-known value, so `pair[i]` has type `String` and needs no runtime
  bounds check. Bracketed tuple indexing is under discussion, not implemented or
  selected by the existing tuple-access rule.
- A dynamic index whose possible in-range positions are 0 and 1 could produce
  `Int64 | String`; it must also satisfy the required runtime range check.
- An index known to have no valid position raises the unresolved question of
  static rejection versus a `Never`-typed or always-faulting expression.

The user proposes **conditional range narrowing** as a way to establish an
index's possible values. For a two-component tuple, `if i >= 0 and i < 2`
establishes the valid range inside the successful branch, provided the relevant
facts remain valid. An early-exit guard can establish it after the conditional:
`if i < 0 or i >= 2 { return ... }`. The user's `and` in the latter guard is
not sufficient: no ordinary integer can be both below 0 and at least 2, so its
false path would not prove the range. The return expression and enclosing
function are schematic here.

The runtime index may still be either 0 or 1 after either guard, so the
heterogeneous tuple result can still be `Int64 | String`; knowing a range is
not the same as knowing one compile-time value. Evaluate whether a proven
range permits removing a separate access bounds check while retaining the
executed guard. A prior [early-exit distinctness rule](../../../docs/call-replacement-flow.md#element-distinctness-after-an-early-exit-selected)
does not itself establish this new bounds-narrowing contract. Invalidation
after replacement, effects or aliasing and the supported proof forms remain open.

The exact interpretation of “index values must be known at compile time” needs
clarification alongside the dynamic-index requirement: for example, whether the
compiler must know the exact value, a finite set, a range, or can conservatively
consider every tuple position. The static analysis, narrowing/proof language,
bounds fault, union result representation, access grants, evaluation order,
tuple tails and empty tuple cases remain open. Similar layout with a homogeneous
array does not by itself settle tuple/array identity or conversion.

## 1.4 Inference and conversion

**Baseline:** Typed receiving declarations already allow specific tuple label conversions; this does not establish a general distinct-type conversion rule. The user requires an explicit operation for established values crossing into a distinct type.

### User direction: literals and established values

The following is a bounded design direction, not an implemented feature. The
declaration and `cast<T>` notation are illustrative; final distinct-type and
explicit-conversion syntax, operation semantics, and implementation are open.
The term `cast` here denotes explicit conversion intent, not a selected builtin,
unchecked reinterpretation, or promise that every conversion is allowed.

```text
UserID := distinct String;
ArticleDescription := distinct String;

raw := "hello";                         /* inferred String */
desc: ArticleDescription = "hello";     /* fresh literal takes destination shape */
id: UserID = "hello";                   /* fresh literal takes destination shape */
TeacherID := distinct String;
teacher: TeacherID = "hello";

id_from_raw: UserID = raw;              /* rejected: established String value */
id_from_desc: UserID = desc;            /* rejected: established distinct value */
id_from_teacher: UserID = teacher;       /* rejected: established distinct value */
text_from_id: String = id;              /* rejected: established UserID value */
id_from_raw := cast<UserID>(raw);        /* illustrative explicit conversion intent */
id_from_desc := cast<UserID>(desc);      /* illustrative explicit conversion intent */
text_from_id := cast<String>(id);        /* illustrative explicit conversion intent */
id_from_literal := cast<UserID>("hello"); /* illustrative explicit conversion intent */
```

The user describes a fresh `"..."` literal as string-like: it takes the shape
of its destination rather than first requiring a stored String value. The user
limits this direction to a type explicitly written at the literal's use site,
so code remains easy to reason about and issues are easier to catch. In
particular, the typed declaration `id: UserID = "hello"` qualifies; merely
knowing that a called function's parameter is UserID does not make
`find_user("hello")` valid under this rule. The complete set of explicit
type-bearing forms and their placement remains to be defined; do not extend
the rule to implicit return or aggregate contexts without a decision. An
uncontextualized `raw := "hello"` is treated as String in current examples;
complete literal typing and inference remain open. Once `raw` or `desc` has an
established type, a destination annotation alone is insufficient to cross into
`UserID`. The user clarifies that UserID is as distinct from String as from
TeacherID: the underlying representation gives String no special implicit
conversion privilege in either direction. This supersedes the earlier recommendation to treat that annotation
as a conversion request. It does not revise the separately selected tuple-label
conversion. Direct conversion eligibility between distinct types, validation,
failure behavior, and literal use with explicitly written types in other
contexts all remain to review. The examples show explicit conversion intent, not a decision that every
pair of distinct types must admit conversion or that conversion is infallible.

## 1.5 Unions and value operations

**Baseline (updated 2026-11-17):** Plain unions normalize order and duplicates. A bare typed declaration zero-initializes every type; a multi-member union zero is initialized with Kind 0 and no known active member. Explicit `= 0` initializes the same all-zero storage for every type, including unions.

**Initial assessment and probes:** Compare `Int | String` with `String | Int`; first-written-member zero would conflict with order-independent identity. Revisit equality, numeric operations, valid zero and distinct-type invariants together, without choosing a zero member now.

### User question: union Kind and zero

**Update 2026-11-17:** The user confirmed universal zero-initialization for bare typed declarations, and the no-known-member union zero. The discussion below records earlier questions and alternatives; its statements that those choices and explicit `= 0` are unresolved are historical. Matching and other operations remain under review. See [current union initialization](../../../docs/union-initialization-policy.md#bare-local-declarations).

The user asks whether the hidden `Kind` should number cases from zero or one,
whether zero should always represent `UNKNOWN`, and whether changing written
member order should change Kind values. These are questions for review, not a
newly selected tag encoding or union-zero rule.

The current [union-zero decision](../../../docs/union-zero.md) requires all-zero
union storage to represent a valid value with exactly one listed member active;
the member choice is open. A zero `UNKNOWN` with no listed active member is an
alternative already investigated, not the selected baseline. Adopting it would
reconsider the membership and exhaustiveness contracts and must be reconciled
with the selected universal all-zero value and reserved-storage rules.

**User clarification:** In the discussed three-section type-reference model,
type reference `0` cannot identify a type. It therefore means **no known type**;
this is not a separately reserved type entry. A zero-initialized union then
starts with Kind 0 and an `UNKNOWN` active-type state, rather than arbitrarily
selecting a known member. The proposed library/file/type split is illustrative;
exact field allocation and identity assignment remain open. A reference that
identifies no type is distinct from
the question whether the containing union value is valid. The user's earlier
universal-zero direction requires all-zero storage to be a valid initialized
value for every type; treating UNKNOWN as a valid union state is a possible
reconciliation, not a selection of match or access semantics.

This direction conflicts with the older listed-member-only union-zero rule and
must be reconciled through the decision process; see [the existing empty-zero
review](../../../docs/union-empty-zero-proposal.md). Do not automatically equate
zero with an unrecognized nonzero Kind or decide how Kind 99 is handled. The
source-level rules for `= 0` and omitted union initializers, match exhaustiveness,
type tests, fault behavior, and treatment of the payload remain open. No
implementation is implied.

Compare at least: (a) zero identifies one listed member; (b) zero identifies a
valid extra unknown/empty state and listed members begin at one; and (c) a
zero state only when explicitly included as a member. Check type tests, matching,
copying, zero payloads, handling of `Unit`, and whether any extra state is
observable. A 0- versus 1-based numbering alone does not select these semantics.

Plain-union identity is normalized and order-independent. The user now requires
the same member-to-Kind mapping for equivalent spellings and consumers sharing
a representation, including compatible separately compiled applications. Source
order or occurrence cannot independently assign conflicting meanings. Numeric
assignments, canonicalization and ABI/version details remain open; see [the
shared mapping rule](../../../docs/union-zero.md#one-kind-mapping-for-the-same-union-type).
This mapping is a property of the shared type representation, not a claim that
every value of the type has the same active Kind.

**User idea:** A two-level type-reference table could distinguish modules and
inner types, give distinct types separate references, and resolve aliases to
the same reference. Whether a 64-bit reference is sufficient depends on identity
scope and assignment; see the [type-reference investigation](type-reference-table.md).

**User's C interoperability question:** Given raw storage viewed through a
C-style struct containing a `kind` field and overlapping union payloads, a
consumer needs a defined mapping between kind values and member types. Who
defines it: a language-wide rule, a target/ABI contract or compiler-generated
interface, or an explicit per-union declaration? Compare the scope and
stability of each option rather than assuming a single public ABI or an encoding
from source order. Illustrative tag numbers are not selections.

An interoperable bytes-to-value contract also needs the target's size,
alignment, padding, integer representation and endianness, payload and string
representation, lifetime/ownership, and validation of invalid tags and payloads.
Defining the kind mapping is necessary but not sufficient to make arbitrary raw
bytes valid values or make one target's in-memory layout portable to another.
The selected requirement that all-zero Lite storage is a valid value remains;
how that maps to a union member is unresolved. Separate a public C representation
from the compiler's internal representation and possible optimized encodings.

**User's external-memory concern, 2026-11-17:** Memory may be owned or supplied
outside Lite and the Kind field may contain 0, a known member tag, or some other
representable value. The user is considering an implicit `UNKNOWN`/other union
state, with all-zero storage mapping to `UNKNOWN`; this is under investigation,
not yet a replacement for the selected listed-member-only union-zero rule.
Distinguish the zero case from the separate question of handling every other
unrecognized tag: options include rejecting at an external-memory boundary,
mapping unknown tags to a state, or preserving the raw tag. What to do with an
unknown payload and what matching, copying, equality and cleanup mean remain
open. Validating a tag alone cannot prove a purported String payload, pointer,
allocation lifetime, alignment, or concurrent external access is valid.

**New direction to review:** The user proposes implicit allowed-type filters
for match arms and a mandatory final failure guard when the subject Kind is
unknown, including matches combining type and value patterns. The programmer's
`_` arm is written for the remaining listed types, not a bad Kind. The user
clarifies that this question concerns bad Kind values, not general bit flips or
malformed payloads; see the [union match guard investigation](union-match-unknown-guard.md).

**User's enum/match safety concern:** An `OrderStatus` enum with named cases
such as created, failed, canceled, shipped and paid may be read from externally
owned or corrupted memory. The user asks whether a match listing all known
cases is truly exhaustive, whether an unknown tag must cause an implicit panic,
and whether a catch-all must always be written. A catch-all that ships an order
shows that directing unrecognized data to an ordinary business fallback could
produce an unintended side effect.

Separate these questions: whether an unknown representation can enter a typed
value at all; whether it is a valid semantic `UNKNOWN` case; which match arms
handle that case; and what happens if it is not handled. Compare validation at
a raw/FFI boundary, a defined unknown state, and a defined fault. Requiring a
catch-all cannot by itself ensure safe business behavior: its body may itself
perform the wrong action. An unknown-tag handler must not read or destroy an
unidentified payload as if it belonged to a known case. These alternatives and
the scope of any runtime check are not selected by this investigation.

No tag check can detect every corruption: a corrupted status can become a
different valid tag, and a valid tag may accompany invalid payload bytes. Full
assurance depends on ownership, synchronization and external data validation
as well as application invariants. The proposed fail-closed default is a
design option, not a guarantee against all memory corruption; the final match
syntax, whether source `_` or another notation handles unknown tags, and the
policy for untouched external memory remain open.

**Reference comparison:** Rust's valid enum values have a valid discriminant
and valid active-variant fields; producing an invalid enum is undefined
behavior, not an implicit unknown case. Even its `repr(C)` field-bearing enum
uses the selected C-shaped tagged layout without accepting arbitrary tags. See
the [Rust validity rules](https://doc.rust-lang.org/reference/behavior-considered-undefined.html#invalid-values)
and [C representation](https://doc.rust-lang.org/reference/type-layout.html#reprc-enums-with-fields).
Zig's [non-exhaustive enum](https://ziglang.org/documentation/master/#Non-exhaustive-enum)
can accept unnamed tag values and requires handling them in a switch; this is a
comparison for an integer-backed enum, not proof that arbitrary tagged-union
payloads are valid or a selected Lite representation. Rust and Zig choices
are comparative evidence and do not decide Lite's contract.

## Working judgment

Treat type identity, conversion, operations, and physical representation as separate decisions. The user's direction distinguishes contextual fresh literals from established typed values; a typed declaration does not itself authorize converting an established String or another distinct value into `UserID`.

## Expanded assessment

### Compiler evidence and boundaries

The generated TS verifier passes `num.widths`, `num.aliases`, `tuple.shape`, `array.fixed`, and `alias.transparent`. These are named finite scenarios: they establish neither arbitrary recursive types nor native representation. The direct `distinct` and `Int | String` probes reject. The historical probe containing `UserID(raw)` stops at `distinct`; it establishes nothing about the later expression's meaning or validity. [Baseline and exact probes](compiler-baseline.md).

### Benefits and cost model

- **1.1 Literals and primitives:** default inference keeps simple programs short; statically known constants can eliminate runtime work. Checked integer overflow and precise string encoding can add checks or conversion work. Constant folding must preserve overflow and fault timing on untaken paths. Exact widths, signedness, overflow, and Unicode behavior matter to native interoperability and vectorization.
- **1.2 Type identity:** a distinct UserID can prevent mixing identifiers at compile time while sharing the underlying type's layout or storage, as the user clarified. A per-value runtime discriminator is not needed merely to identify a statically known type. Exact ABI, conversion behavior, and performance remain open. A domain with validation creates a harder question: can every underlying String become an ID, and can all-zero storage be valid? If invalid values exist, unrestricted conversion and universal zero may conflict.
- **1.3 Aggregates:** tuple labels are static information in principle; ordered tuple positions, named record fields, and runtime array indexing expose different operations. Header-free fixed arrays have a selected inline layout, but union elements may still need per-element discrimination. Separate models cost language and compiler complexity; over-unification can make positional record access or runtime indexing semantically awkward.
- **1.4 Conversion:** The user rejects a typed declaration as sufficient to cross between an established String and UserID in either direction, or between UserID and another distinct type; an explicit conversion operation is needed. Fresh string-like literals may instead take the typed destination's shape. Compare arguments, return, generic contexts, eligibility, and validation failure; the precise explicit-conversion mechanism remains open.
- **1.5 Unions and values:** tagged inline payloads permit heterogeneous values without mandatory boxing, at the cost of tag storage, branch selection and layout; optimizations may remove a tag only when its observation is preserved. Order-independent union identity conflicts with simply picking the first written member for zero. Equality, copying and resource cleanup must use the active payload.

### Blockers and cross-feature cases

Compare `UserID | String` narrowing, a record field of that union, a `[UserID; 0]`, and a function that returns either type: identity, zero, widening, generic compatibility and matching all meet here. Decide conversions and valid zero before promising that constrained IDs are interchangeable with their storage. Defer cross-cutting copy/borrow and failure details to [2](02-bindings.md) and [8](08-failure-cleanup.md); decide the feature contract here before runtime layout in [7](07-collections.md).

## Cross-topic routing

Records (3), enums (4), collections (7), and generic constraints (10) depend on these choices. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [3](03-records.md), [4](04-enums.md), [7](07-collections.md), [10](10-generics-comptime.md).
