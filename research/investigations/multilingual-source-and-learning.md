# Multilingual source and learning — investigation points

Status: **question map only**, 2026-10-28. All 12 newly added questions are **not
started**; contributor: unassigned. This map is not a completed investigation or
selected implementation plan.

## Motivation and current boundary

The user wants to explore learning logic and programming in a familiar human
language without first having to learn English vocabulary. The shared reference
presentation is simple English; [Salam is now a project reference language](../../docs/references.md#project-reference-languages).
The [owning proposal](../../docs/multilingual-source-and-learning.md) distinguishes
that motivation from unselected syntax, conversion, and tooling mechanisms.

Unicode names are already accepted. Localized keywords, teaching APIs, type/value
names, diagnostics, lessons, and a bridge to English are broader investigation
scope. Human language, writing system, transliteration, and text direction must
be considered separately. No translated LiteLang keyword or source-language
selection syntax is adopted by listing these questions.

## Bounded questions and ownership

- **Lexical mapping and source identity:** [INV-008.01–.04](SUBTOPICS.md#inv-008)
  cover vocabulary selection/versioning, collisions/mixing, Unicode/bidi handling,
  and script/numeric boundaries. Start with current [identifier](../../docs/identifiers.md),
  [lexical](../../docs/lexical-structure.md), and [grammar](../../docs/grammar-sketch.md)
  contracts; do not silently widen them to accommodate an example.
- **Whole learning experience and a bridge:** [INV-072.01–.04](SUBTOPICS.md#inv-072)
  cover local terms/APIs, diagnostics/editing/source positions, conversion/name
  mappings, and English/reference/collaboration workflows. Compare localized
  source files with editor-only views; explicitly state which one an experiment
  supports. Include documentation and teachers' terminology, not only keywords.
- **Evidence:** [INV-073.01–.04](SUBTOPICS.md#inv-073) cover semantic parity,
  conversion guarantees, learner evaluation, and localization footprint. Use
  [INV-074](SUBTOPICS.md#inv-074) for measurement methodology. State whether checks
  exercise documents, another language's tooling, or an actual Lite compiler.

[INV-001](TOPICS.md#inv-001) owns goal/tradeoff clarification. [INV-016](SUBTOPICS.md#inv-016)
owns text values rather than source keyword identity. Public module/API mapping
needs [INV-006](TOPICS.md#inv-006), [INV-031](SUBTOPICS.md#inv-031), and
[INV-066](SUBTOPICS.md#inv-066): translating a field or input label cannot silently
change Lite's existing label-sensitive contracts. The selected
[lightweight execution priorities](../../docs/memory-and-performance.md#lightweight-native-execution-priority)
apply to any candidate's tool and produced-program dependencies.

## Concrete cases to investigate

1. A child writes a small sum, conditional, loop, and function using familiar
   names and proposed source vocabulary. Compare the same operations in simple
   English. Explicitly label any invented translated syntax as unselected.
2. A localized keyword collides with a student name or changes in a pack upgrade;
   a dependency exposes English names. Establish reproducible selection,
   disambiguation, and unsupported-vocabulary behavior before interpreting it.
3. A local function shadows another name; a record field and named input carry
   labels; two student names translate to one English word. Test binding and
   contract preservation instead of globally replacing spellings.
4. A program contains Persian/English text, a URL, and a raw comment containing
   keyword-like words. Source conversion must preserve those contents by default;
   prose or user-facing content translation is a separate requested change.
5. Persian/Latin names appear around operators, braces, indices, and numbers.
   Check logical order, display order, caret/selection, diagnostics, copied text,
   review, and debugging. Examine letter variants, join/bidi controls, and
   confusables without assuming equivalence or banning an entire script.
6. Familiar-language and English presentations invoke an API, fail, recover, and
   clean up. Check types, argument routing, values, side effects, failure identity,
   and source positions, not merely matching output on one success path.
7. Converting to English and back preserves semantic identity but may not recover
   original names, formatting, or exact bytes. Define each guarantee and explicit
   mapping/provenance requirements; report unsupported cases rather than guessing.
8. A minimal native program is built with one vocabulary and then an equivalent
   one with another. Measure executable/support size and required dependencies;
   explain user strings/debug data separately from unused localization catalogs.

## Learner and contributor evidence

Evaluate understanding rather than spelling recall alone: ask learners to trace
an unfamiliar example, explain a condition, repair an error, and write or adapt a
small solution. Explore an optional progression from familiar-language lessons to
bilingual terms, side-by-side English, and English collaboration. Compare with
localized lessons over unchanged English source; do not presume one approach wins.

Record age/reading level and prior language/programming familiarity, comparable
lesson content, teacher support, keyboard/script familiarity, task completion,
misconceptions, and transfer to the English reference. No learner study is requested or conducted by this documentation change. Keep
results bounded to actual participants/tasks.

Use the [note template](NOTE-TEMPLATE.md), cite the current revision and primary
[Salam/Unicode sources](../../docs/references.md#salam-and-multilingual-source-reviewed-2026-10-28),
and register a note under the owning topic's Investigation line when work starts.
A question map is neither educational validation nor proof of working translation.
