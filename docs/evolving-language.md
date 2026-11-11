# Evolving Lite with its own compiler

Lite’s compiler can adopt language features a few at a time. Self-hosting does
not require the compiler to use or implement the entire language specification;
it requires the supported Lite subset to express, rebuild, and verify the
compiler source.

## A verified feature increment

1. **Record the baseline.** Keep the selected generated compiler, its source
   identity, the compiler-source subset, and its current fixed-point evidence.
   The selected compiler remains the active builder while a candidate is being
   prepared.
2. **Define and test the contract.** List accepted forms, rejected forms,
   diagnostics, runtime behavior, target support, and interactions. Keep
   unsupported target behavior explicit. Cases describe the intended contract;
   generated output must not author its own expectations.
3. **Add compiler support in Lite.** Write the implementation using constructs
   accepted by the active seed. Add focused tests and interactions, then build
   the candidate compiler from the Lite source. Do not edit generated compiler
   artifacts by hand.
4. **Verify the candidate.** Strictly check generated code, run the relevant
   corpus and feature cases, and rebuild the unchanged compiler source through
   successive generations. Record exact source, builder, and artifact
   identities, including whether the new fixed point differs from the previous
   seed.
5. **Promote before adoption.** Select the candidate seed only after its
   behavior and fixed point are verified. Then, in a separate compatible step,
   the compiler source may start using the newly supported syntax. Rebuild from
   the selected seed so the source never requires a feature its seed lacks.

Each increment should make one behavior understandable and reviewable. Add the
next feature after the current support or migration commit has its own evidence.
The remaining language specification is not a gate when the compiler can be
expressed and rebuilt with a smaller subset.

## Breaking source-form migrations

When changing the syntax used by the compiler source, keep the old verified
compiler paired with its old source while preparing a temporary bridge:

1. Use the old compiler to build a migration compiler that accepts the new
   source form. The migration compiler may temporarily support both forms.
2. Rewrite the compiler source and the affected libraries to the new form.
3. Use the migration compiler to build the rewritten source, then rebuild that
   unchanged source through later generations.
4. Promote the new compiler and source together only after the new generations
   are byte-identical, strict checks pass, and behavior cases still match.
5. Remove the temporary bridge after maintained source has migrated. Do not
   retain obsolete syntax or host-side compiler logic merely to avoid the
   migration.

Generated builds can differ between language versions. Fixed-point equality is
required within the completed version; the temporary migration compiler does
not need to equal the prior seed.

## Imports and other compiler dependencies

Import support follows the same boundary. A Lite source reader may be provided
by a small host adapter, but Lite owns import syntax, graph traversal, symbol
visibility, and compilation stages. Keep source flattening only as a temporary
bridge while the compiler learns separate source units. Once Lite can rebuild
those units, migrate project source to the new form and remove the bridge from
active build paths.

See the [compiler development rules](../.agents/rules/compiler-development.md),
[bootstrap guide](../compiler/bootstrap/README.md), and
[module import stages](../compiler/module-import-stages.md) for current
implementation evidence and required checks.
