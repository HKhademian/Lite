# Structured data, Like forms, and static imports

Status: **future investigation requested 2026-11-17**. This note collects
questions and preliminary comparisons, not selected syntax, library APIs,
supported formats, or compiler behavior. It extends the related
[Like categories](01-core-types.md#11-primitives-and-literals).

## User's direction

Consider whether Lite could or should support `Json-Like`, `Yaml-Like`, and
other forms for writing data directly in source, and whether static data such
as raw files, JSON, YAML, or XML could be imported. It is open whether these
names describe syntax, fresh values, types, conversion capabilities, or
something else. Do not assume that a structured-data form must behave like
`Int-Like`, `String-Like`, `Array-Like`, or `Record-Like` before those concepts
are reviewed together.

The user suggests a Jai-inspired approach: a **directive changes the language
or interpretation of a bounded source region** from Lite to another language,
such as JSON. This could provide a reusable extension boundary instead of
changing Lite's own grammar for each new format. This records the user's idea;
it does not assert a particular Jai mechanism, select directive syntax, or
claim that such a mechanism is implemented.

## Candidate: a directive for another language

Conceptually, Lite recognizes a directive and the boundaries of its region;
the selected language's parser interprets that region; then the produced data
must cross an explicitly defined boundary back into Lite. The directive's
spelling, source delimiters, result type, conversion and integration are all
open. No example spelling is selected by this note.

Adding formats through a common boundary could keep the core grammar stable
and make format handling modular. It does not automatically eliminate the cost
of parsers, adapters, type checking, diagnostics, tooling or maintenance. An
implementation might bundle handlers, load compiler extensions, or run
compile-time providers; which models are permitted and how they are trusted,
versioned and distributed remain open. A data parser used only during builds
need not be linked into the resulting program, but materialized data still has
size and storage costs.

The boundaries need explicit investigation:

- How to identify the embedded region without mistaking a delimiter inside
  strings, comments, escaped content or nested structures for its end.
- Whether the other language's entire grammar or a documented subset is
  supported, and which parser/version supplies its meaning.
- How the result becomes a Lite value, including type identity, missing values,
  validation and the distinction between a fresh Like form and a stored value.
- How compile-time diagnostics map to the embedded source, and how editors,
  formatters, syntax highlighting and navigation handle both languages.
- How static files relate to inline regions, and how their content and parser
  versions become tracked build dependencies.
- Whether a directive permits interpolation, effects or executable code, and
  how such capabilities are bounded; none is implied by parsing JSON data.

The user's goal is extensibility without bending Lite's syntax. The exact
extension mechanism and supported formats remain decisions for a future layer.

## Question: use Lite's own data expressions?

The user asks whether special parsing and source regions are necessary at all,
or whether Lite itself should provide a JSON-like (not necessarily JSON-matching)
data-definition operation. This is a candidate to compare, not a selected new
grammar or a decision to remove embedded external-language support.

The language draft already selects typed record construction using named fields,
array expressions and named tuple values; standalone inferred record literals
and their identities are still open. If Lite's ordinary expressions can express
the intended structured data, a program may construct the values directly and
may not need a JSON parser or a special source region for that case. How much
additional data-definition syntax Lite needs is itself open. Existing record
and tuple rules, including field names, identity, contextual construction and
the difference between executable blocks and data braces, still apply until
explicitly revised.

Compare these needs independently:

1. **Write data in Lite:** a Lite-like structured expression is parsed and
   checked by Lite; its syntax need not match JSON, and it can use Lite's own
   value and type rules.
2. **Consume external format text or a file:** a JSON parser is still needed if
   arbitrary JSON must be interpreted as JSON. It may be called at compile time
   when supported, or at runtime; Lite-like syntax does not by itself parse it.
3. **Put exact external text directly in source:** a multiline string or an
   explicitly delimited region could pass that text to a parser. Compare those
   mechanisms only if the use case needs preserving the other language's text;
   neither one is selected or required for Lite-native data.

Direct Lite data can reduce parsing and runtime support, make errors refer to
normal Lite expressions and permit static layouts; inferred shapes, dynamic
keys and exact conversion to nominal records still need contracts. External
formats remain useful for interoperability and non-Lite producers, but their
parsers and representation mapping carry costs. Compile-time work may keep a
parser out of the final program; it does not remove the cost of stored data or
guarantee any particular layout. Review whether each use case earns special
syntax rather than assuming a format-specific mechanism is required.

## Candidate: source region passed to a compile-time operation

The user suggests combining directives or source regions with ordinary
compile-time operations and gave this illustrative example:

```text
json.parse(### {
  "name": "Ali",
  "age": 10
}###)
```

The intended direction is that a possibly multiline region of source can be
supplied to an operation such as `json.parse`, and that compile-time processing
could produce a type-safe result. This is an exploration: `###`, the exact
delimiters, `json.parse`, compile-time triggering, parser API, output type and
all conversion behavior are not selected syntax or implemented features.

Separate the parts when evaluating the design:

1. **Capture:** identify the exact source region and what value or compile-time
   input the operation receives. Delimiters, embedded delimiters, source
   location, encoding and multiline content remain open.
2. **Stage:** determine whether this form explicitly requests compile-time
   execution, inherits a surrounding compile-time context, or uses another
   mechanism. Do not assume the example itself settles staging or that every
   call to `json.parse` runs during compilation. The existing compile-time
   direction permits ordinary functions, subject to its unfinished contract.
3. **Interpretation:** the selected operation parses or transforms the input;
   a JSON parser handles JSON, while other functions may interpret the same
   region differently. How a function is resolved, loaded and versioned is open.
4. **Result and type safety:** decide whether a statically known result can
   infer a record-like shape, be checked against an explicit Lite type, produce
   a general structured value, or offer several modes. Define errors and how
   they refer to the original region. Type-safe parsing does not imply an
   implicit conversion to a nominal record, an automatic runtime allocation,
   or an `Any` type.

An ordinary-function interface could allow new formats without adding a
dedicated directive grammar for each one. The compiler may need only a general
region boundary and compile-time function support, but input representation,
editor tooling, compiler-provider trust, build dependencies and evaluation
limits still require design. If the operation is fully evaluated during the
build, its parser need not be included in the generated program; the materialized
result and any required runtime operations still have costs.

## Initial language list and possible results

The user initially proposes text (including multiline text), raw data, JSON,
YAML, INI, XML, Markdown, HTML and potentially others. These names identify
different inputs; their output contracts remain proposals for discussion:

- **Text:** a `String` is a natural candidate. Define decoding, line endings,
  escaping and whether the source region preserves its contents exactly.
- **Raw:** an uninterpreted byte sequence is a candidate when arbitrary binary
  data is needed. Whether it is a fixed array, owned storage, or a view, and
  what `Byte` means, remain open. Raw bytes need not be valid text.
- **JSON and YAML:** nested mappings, sequences and scalar values are possible
  results. A known object could potentially become a record-shaped value, or
  parsing could return a general structured data value. JSON null and YAML's
  richer features require explicit mappings; do not silently equate them with
  Lite zero or assume the two formats have identical semantics.
- **INI:** sections and key/value pairs suggest a mapping, possibly nested,
  but accepted dialects, repeated keys and whether values remain strings need
  a specified contract.
- **XML:** a document/tree preserving element names, attributes, order, text,
  namespaces and mixed content is a candidate. Reducing it to a simple map may
  lose information; the supported model and exact subset remain open.
- **Markdown and HTML:** either can be embedded as `String` for later use;
  optional parsing could instead produce a document structure. HTML can carry
  nested elements, attributes, text and ordering; a plain map is not necessarily
  a faithful representation. Markdown's dialect and parsing are separate choices.

### Possible structured-result strategies

The directive could produce a fresh Like value whose eventual Lite shape is
established during compilation, a general structured data value used at
runtime, or a value checked against an explicitly supplied Lite type. These are
alternatives to investigate, not an assumption that they share one mechanism.
For example, a known JSON object might become a record-shaped value or a map:
one fixed field shape is different from dynamic string-key lookup. Nested and
heterogeneous values also require a defined model. The term “unknown record” is
an open question, not a selected type, implicit `Any`, or promise of reflection.

Compile-time parsing can validate a static input and potentially specialize
its representation without a runtime parser, subject to Lite's type, layout,
zero, ownership and error rules. Runtime data may need a general representation
and runtime parser instead. An inferred shape alone does not grant implicit
conversion to a separately declared nominal record or select a map ABI.

### User idea: anonymous data shaped by a destination

The user asks for an anonymous Data-Like form that can be accepted as a
left-hand destination type when its data matches, with a possible general
map/list-style representation otherwise. This is a direction for investigation,
not selected syntax, a universal conversion to any type, or compiler support.
The relationship between this Data-Like form and JSON-like external input remains
open.

Review at least these cases separately:

1. **Known compatible destination:** a fresh anonymous shape provides named
   fields and values to a written destination such as a record type. The
   destination's identity, visibility, defaults and field contracts still apply.
   This can be construction of that destination, not a stored anonymous value
   silently changing its nominal identity. Existing contextual record
   construction is relevant but does not establish every proposed Data-Like form.
2. **No explicit compatible destination:** consider an inferred fixed shape, a
   general mapping/list representation, or another model. They differ in
   arbitrary-key access, heterogeneous values, static checking, storage,
   extensibility and runtime cost. An anonymous record is not automatically a
   dynamic map, nor does a map require an `Any` type or heap allocation by
   definition.
3. **Written but incompatible destination:** clarify the user's intended
   behavior. Falling back to a map/list cannot produce a value of the written
   incompatible type without a separate conversion rule; compare a diagnostic
   with an explicitly designed alternative. Do not silently change the type of
   an explicitly typed binding.
4. **Nested data:** an inner object or array can require its own destination,
   inference and mismatch rules. Evaluate missing or extra fields, duplicate
   keys, empty values, heterogeneous elements, null and initialization without
   imposing unselected defaults.

The exact data syntax, destination matching, anonymous identity, general data
model and representation are all unresolved. Keep parser-stage work and runtime
storage/cost separate: known static data might be materialized compactly, but
the compiler must preserve the selected value and access behavior.

### User question: anonymous braces or a named tuple?

The user distinguishes normal typed record construction and typed arrays from
the ambiguous standalone form `data := { name = "Ali", grade = 10, }`, whose
braces resemble an executable block. A named tuple such as
`data := (name = "Ali", grade = 10)` is another existing surface, but the user
asks whether a tuple is the desired concept for anonymous data.

The [record literal boundary review](../../../docs/record-literal-boundaries.md#requested-inferred-inline-form)
already records a requested inferred record form and its unselected parsing and
identity choices. In particular, a single-field brace form can resemble an
assignment inside a block, and empty `{}` already has an executable-block
meaning outside record-initializer context. A comma-based distinction is one
existing proposal, not a selected rule. Do not rely on whitespace,
capitalization, lookup or whichever interpretation type-checks.

The alternatives differ in semantics, not just punctuation: named tuples are
ordered structural values with positional access under current rules; records
are field-oriented, and record declaration identity is nominal. The type and
identity of an inferred standalone record literal are open. A dynamic map has
keyed lookup and potentially varying keys; it is not automatically either a
tuple or record. Similar field syntax or a known layout does not make these
concepts identical.

Compare keeping anonymous fixed-shape data as named tuples, providing an
unambiguously marked inferred record form, and providing a separate general
data/map form. Some may coexist; none is selected by this comparison. Check
empty, one-field and multiple-field forms, nesting, field order, positional
access, computed keys, effects and compatibility with an explicit record
destination. Any reinterpretation of selected tuple, record, or block rules
requires explicit review.

## Separate choices

1. **Lite-native data expressions.** Existing or future Lite record, tuple,
   array and literal forms could express static data using Lite's grammar and
   type rules. This could need no separate format parser; it also would not
   automatically accept arbitrary JSON, YAML, or XML syntax.
2. **Embedded external-format text.** A delimited source region could carry
   JSON, YAML, or XML to be parsed. This makes data readily visible beside code,
   but needs unambiguous boundaries, diagnostics and a defined parser stage.
   The form, parsing, validation and conversion are all unselected.
3. **Static external-file input.** Compile-time code could read a file, then
   parse or transform it and include a supported result in the program. The
   selected [compile-time direction](../../../docs/compile-time-evaluation.md)
   intends ordinary functions and effectful I/O during compilation, but its
   syntax, API and full execution contract are not implemented or complete.
4. **Runtime input.** An ordinary program could read and parse data when it
   runs instead. This supports changing data without rebuilding, but the used
   parser and I/O carry runtime costs and failures.

These approaches can coexist; the investigation should also consider choosing
only a subset. An import of raw bytes, parsed dynamic data, or a statically typed
Lite value is a different contract in each case. No particular import spelling
or automatic conversion is selected here.

## Benefits, costs and questions

- **Use cases:** small configuration written next to code; a static game map;
  binary assets; data generated by external tools; runtime configuration. Each
  can have a different need for validation, editing, rebuilds and size.
- **Type and data semantics:** decide when data has a known Lite type, how it
  maps to records/arrays/enums, and whether fields are missing, extra, or
  duplicated. JSON `null`, YAML's richer value model and XML's tree/attributes
  must not silently become Lite `Unit`, zero, or another selected value. Ask how
  the user's fresh/established-value distinction and explicit type intent apply.
- **Build dependencies:** a compile-time file read must be tracked so changes
  invalidate relevant build outputs and caches. Relative paths, input identity,
  diagnostics, reproducibility, offline behavior and untrusted input remain open.
- **Footprint:** compile-time parsing can avoid including a runtime parser, but
  the produced data still occupies executable or linked-resource space. Embedded
  files do not imply a mandatory heap allocation or a zero-copy view; ownership,
  alignment, target layout and lifetime need explicit treatment. Runtime parsing
  may increase linked code, startup work and temporary memory.
- **Format scope:** each supported format adds grammar, implementation,
  maintenance and testing cost. A normal library or compile-time provider could
  handle a format without making its grammar a built-in language feature; the
  provider and library mechanisms themselves remain to be specified. Consider
  raw import first when parsing is unnecessary, but do not select a priority or
  forbid richer direct syntax without the user's decision.
- **Failures and safety:** compare compile-time invalid data with runtime parse
  errors; retain the selected failure/cleanup contracts. No parser security,
  unrestricted network access, or resource bound is assumed.

## Review routing

Core syntax and contextual values belong in topic 1; record construction in
topic 3; collections and storage in topic 7; failures in topic 8; module/file
discovery in topic 9; and compile-time effects and reproducibility in topic 10.
Return to the current onion layer after recording the dependency. Existing
examples are conceptual and no compiler support is asserted by this note.
