# Multilingual source and learning

Status: **design motivation and simple-English reference direction recorded
2026-10-28; multilingual source is a proposal for investigation**. Salam is now a
project reference language. No localized keyword set, source-language selection
syntax, translation command, Unicode profile, or implementation is selected.

## Purpose

A child who does not yet read English may face two learning tasks at once:
understanding logic/programming and learning the human-language words used to
express them. The user wants Lite to explore letting a student begin in a familiar
human language, learn fundamentals there, and later move toward the project's
simple-English reference form without relearning programming semantics.

This is an educational motivation and hypothesis, not a measured learning result.
Learners differ in literacy, age, language, and prior experience. A localized
surface should be evaluated with those learners rather than assumed to remove
all barriers. English presentation must not be a prerequisite for understanding
the first logic, value, condition, loop, or function lessons.

## Reference language and source presentation

Two meanings of reference language must stay distinct:

- **Project reference languages** are programming languages used for comparisons.
  [Salam joins that set](references.md#project-reference-languages).
- **Reference human-language presentation** is the simple English used for Lite's
  shared design vocabulary, reference examples, and cross-language comparison.
  It is a common reference, not a different execution mode or a demand that every
  learner abandon their familiar language.

The proposal is multiple human-language presentations of one LiteLang, sharing
its types, evaluation, access permissions, failures, and cleanup. It is not a
proposal for separate beginner semantics. Existing English spellings remain the
current documented syntax until specific alternatives are accepted.

Human language, script, and text direction are separate axes. Persian commonly
uses a right-to-left writing system; English commonly uses Latin letters. Latin
letters alone do not make source English, and supporting Persian/English does
not automatically support transliterated Persian or every language using those
scripts. Investigate those choices independently.

## What learning entirely in a familiar language would involve

The requested scope is broader than translating a few reserved words:

- Keywords, predefined type/value names, and the terms used to explain them.
- Student-defined variables, functions, types, fields, and module names.
- A usable first-lesson library/API vocabulary, including named input labels.
- Compiler diagnostics, editor explanations/completions, help, and documentation.
- Lesson narratives, exercises, expected outputs, and teacher materials.
- Text entry, numerals, punctuation, fonts, and mixed-direction editing/debugging.

[Unicode identifiers](identifiers.md) are already accepted, but that alone does
not localize keywords, libraries, diagnostics, or teaching. The precise identifier
profile remains open. Full localization of arbitrary third-party APIs is not
established by this proposal; define which vocabulary a supported lesson needs
and how untranslated dependencies would be introduced.

For example, these use the existing Unicode-name direction and current ASCII
numeric/separator spellings:

```text
apples := 3;
pears := 2;
total := apples + pears;
```

```text
سیب := 3;
گلابی := 2;
مجموع := سیب + گلابی;
```

They illustrate separately authored names, not an automatic renaming rule or
compiler-tested examples. They do not select Persian keyword spellings or
Persian-digit numeric literals.

## Candidate architecture and semantic boundaries

Status: **options and recommendations to investigate**.

A candidate design maps versioned language vocabularies to common token and
resolved-symbol identities before shared semantic checking. Localized diagnostics
and teaching materials could use the same terminology catalog. Compare actual
localized source with editor presentation over canonical source; they have
different file, collaboration, accessibility, and external-tool consequences.
Do not silently treat a display-only translation as support for localized files.

Source vocabulary selection must be reproducible and understandable from a
shared project. Investigate explicit file/project metadata, pack versions,
reserved-word collisions, missing translations, and mixed-language files. No
selection syntax, ambient OS-locale behavior, mixing policy, or dynamic keyword
registration is chosen. Adding a vocabulary must not silently reinterpret names
in an existing program.

Localized library aliases, if offered, should resolve to the same underlying API
contracts, not maintain independent implementations. Labels already affect tuple
and callable compatibility in Lite; translating an arbitrary user label cannot
silently make it an alias or bypass that contract. Public names, imports, nominal
types, foreign symbols, and named calls need explicit mappings and collision
rules. Diagnostics and debugger locations must still refer to the actual source.

Parser input has logical character order; visual right-to-left presentation must
not imply reversed arithmetic, evaluation, argument, or field order. Investigate
normalization, Persian/Arabic letter variants, join controls, bidirectional
controls, confusable names, cursor/selection behavior, and visible review tools.
No new normalization or character-equivalence rule is selected. String contents
retain their data meaning independently of identifier or keyword treatment.

## Moving toward simple English

A candidate teaching progression is familiar-language lessons, side-by-side
terminology, an optional English view of the same example, then explicit source
conversion or English-authored collaboration. This is an optional bridge, not an
English graduation requirement. Compare it with staying in one source language
while changing only teaching/editor language.

Separate conversion tasks: keyword vocabulary mapping, approved library aliases,
and student-chosen name renaming. Arbitrary names and comments have no guaranteed
unique English translation. Renaming must respect scope, shadowing, collisions,
public interfaces, named labels, and references. Preserve comments and string
payloads by default; any requested prose/content translation is a separate edit,
not semantics-preserving source conversion. User-facing strings may remain in the
student's language when code presentation changes.

Investigate syntax-aware conversion with a reviewed diff, original-to-converted
source locations, and type/binding/behavior checks. Do not use global text
replacement. Define whether a round trip preserves semantics, original spelling,
comments, or exact bytes; those are different promises. No Lite translation command
or universally reversible natural-language translation is implemented or selected.

## Lightness and evidence

Localization should primarily be source/tooling work. Investigate keeping unused
vocabularies, translations, and teaching resources out of final native programs.
Retain only required program data, explicitly used messages, and requested debug
information. The [lightweight execution priorities](memory-and-performance.md#lightweight-native-execution-priority)
apply; no identical-code or zero-overhead result is claimed.

Evaluate paired lessons with learners/teachers: understanding conditions/loops,
tracing execution, explaining an error, writing a small solution, and transferring
that understanding to the English presentation. Separate vocabulary familiarity,
reading ability, keyboard/script familiarity, and programming understanding.
Check translation binding/type/behavior parity, mixed-direction editing, source
locations, unsupported vocabulary, and executable footprint independently.

[Investigation points](../research/investigations/multilingual-source-and-learning.md)
record bounded questions. [Salam and Unicode references](references.md#salam-and-multilingual-source-reviewed-2026-10-28)
provide starting evidence; no LiteLang compiler execution, educational study, or
translation experiment was run to establish this proposal.
