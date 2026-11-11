# INV-003.04 — Growing a script into a module

Status: recorded (discussion deferred beyond the immediate FVP; question unresolved)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-003](TOPICS.md#inv-003)
Covered subtopic: INV-003.04 (importable source kinds and code extraction)
Subtopic brief: [INV-003.04](SUBTOPICS.md#inv-003-04)

This is a non-normative investigation note outside the language draft. Options
and recommendations below are not selected language rules.

## FVP scope correction, 2026-10-30

The user said this .lt/.lts discussion is premature while pursuing the **FVP
(first viable product)**. Defer the importability question and further module
architecture work. The source-kind direction remains recorded but implementing
both modes or resolving their import boundary is not an immediate FVP gate.
The recommendation below remains unselected; no answer is requested now.

Resume only when module reuse is in scope or concrete FVP needs justify revisiting
this question. The current investigation focus is the smallest runnable subset
with explicit observation, as recorded in [principles](../../docs/principles.md#immediate-focus-first-viable-product)
and the [decision ledger](../../docs/decisions-and-open-questions.md#fvp-focus-before-module-architecture-2026-10-30).

## Investigation question

Can an ordinary module import target a .lts script, or must reusable definitions
first be expressed in a .lt module? Start with the import boundary before choosing
package headers, member-unpacking syntax, or the complete migration procedure.

## Current contracts and evidence

Repository baseline: `05511d3`; working tree clean before this note.

- [Source kinds](../../docs/modules-and-packages.md#distinct-script-and-module-files)
  select convenient .lts executable bodies and declaration-oriented .lt module
  files. .lt has no implicit imports, including core type names. Scripts cannot
  grant their convenience names to imported modules.
- [Script bodies](../../docs/blocks-and-results.md#source-file-body) execute reached
  items top to bottom; discarded values do not suppress their effects. Output
  remains an explicit operation.
- [The previous note](INV-003-03-script-environment.md#source-kind-and-standard-module-selection-2026-10-30)
  covers INV-003.04 only at the selected source-kind boundary. It does not decide
  whether scripts are importable or define module initialization.
- [Module lookup](../../docs/modules-and-packages.md#module-lookup-without-header-files)
  does not require handwritten headers. Module ownership syntax, exports,
  initialization, and file-to-module mapping remain open.
- A possible restriction on module initializer effects is deferred to
  [INV-003.05](SUBTOPICS.md#inv-003-05). Compile-time execution and generation
  remain under [INV-062](SUBTOPICS.md#inv-062). Do not settle either through an
  import-kind choice.

## Concrete cases

These are conceptual dependency cases, not selected import syntax:

1. **Script uses a helper module:** lesson.lts imports math.lt and explicitly
   calls an exported helper. The script owns its executable steps; math.lt
   supplies declarations with its own explicit dependencies.
2. **Module uses another module:** math.lt imports numbers.lt. Its meaning must
   not depend on which script eventually uses math.lt.
3. **Script uses another script:** lesson.lts imports demo.lts, where demo.lts
   defines a helper and also explicitly prints a demonstration. Does import run
   that body, reject the target, or expose declarations without running it?
4. **Module uses a script:** math.lt imports demo.lts. Does that introduce script
   execution and convenience-name rules into the module dependency graph?
5. **Extract reusable code:** move the helper to math.lt, explicitly introduce its
   dependencies, and leave the demonstration call/output in demo.lts. Other
   scripts or modules can then consume math.lt. Exact export/import spelling is
   still open; changing only the suffix does not establish a valid conversion.

## Options and consequences

- **A — Ordinary imports target modules, not .lts scripts.** Cases 3 and 4 are
  rejected as ordinary imports. Extract shared definitions into .lt as in case 5.
  This keeps the executable script body out of the library-import contract, but
  adds an extraction step when two small scripts want to share helpers. It does
  not prove that all module initializers are effect-free.
- **B — Import a script and execute its body.** Requires decisions about once
  versus repeated execution, order, failures, cycles, exposed bindings, and script
  convenience resolution. Merely writing an import could then run the script's
  explicit output or other operations.
- **C — Import a script's declarations without its executable body.** Requires
  defining which items count as declarations and which initializers execute.
  Since declarations are assignments, a helper may depend on earlier executable
  work. The same source would need a precise run-versus-import interpretation.

**Recommendation, not selected:** A. Let a .lts script be an executable entry
source and use .lt modules for shared definitions. Consider any future explicit
script-running/include facility separately; do not invent one here. A does not
choose .lt program entry syntax, package layout, module purity, a main function,
or compiler/runtime implementation.

## Verification and limits

Read the owning source-kind, file-body, and module-lookup contracts. Checked the
new note and tracking links, balanced code fences, and focused diff consistency.
The cases are design probes only: no LiteLang parser, import resolver, runner,
typechecker, or runtime experiment exists or was used. No foreign-language
behavior is assumed or needed for this local boundary choice.

## Findings, decision references, and handoff

The source-kind split remains recorded; script importability is **open and
deferred beyond the immediate FVP**. No importability decision is recorded. When
resumed, compare whether ordinary imports should accept only .lt module source
or also .lts scripts, starting with case 3's visible demonstration effect. Module
ownership/exports and the practical extraction procedure also remain deferred.
Preserve script convenience/disclosure questions from INV-003.03 and the later
module-effects/metaprogramming investigations; this note does not complete them.
