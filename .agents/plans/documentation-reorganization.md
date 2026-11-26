---
name: documentation-reorganization
status: pending
created: 2026-11-26
todos:
  - id: baseline
    content: "Inventory current rule owners, examples, and public links"
    status: pending
  - id: reconcile
    content: "Reconcile contradictory current pages with paths intact"
    status: pending
  - id: core-text-pilot
    content: "Verify one path from source comments to module docs and Handbook"
    status: pending
  - id: records-and-blocks
    content: "Consolidate record and block documentation with stable links"
    status: pending
  - id: remaining-topics
    content: "Consolidate remaining high-overlap topics and archive history"
    status: pending
  - id: shared-status
    content: "Publish evidence-backed support in CLI and site navigation"
    status: pending
  - id: integration
    content: "Verify the final docs, generated references, and runnable examples"
    status: pending
---

# Lite documentation reorganization

## Mission

Make it easy to learn shipped Lite, look up an exact language rule or public
operation, confirm current implementation coverage, and follow design history.
Give each rule one current owner. Connect source doc comments, the generated
module reference, the Handbook, Learn, Gym, Playground, and CLI documentation
through tested examples and stable links.

## Done

- Audited the spec, normative map, Handbook, and generated docs at `0b1f9c9a`.
  Found conflicting current summaries for partial initialization and module
  imports. The partial-initializer probe printed `8 0` on both backends, while
  the selected rule leaves the inferred binding uninitialized.
- Recorded the reviewed preload, import/re-export, contextual constructor,
  dimension checking, generic parameter, and mutation directions in their
  topic pages. Recheck implementation status at execution time.
- Independently reviewed the TS live record mutation box fix and exercised
  strict TS and stripped JavaScript at `-O0` and `-O3`. Keep its language
  contract separate from backend representation details.

## Read first

- [Documentation maintenance](../../docs/documentation.md) and [normative map](../../docs/normative-pages.md)
- [Stable spec area IDs](../../docs/spec/README.md) and [proposal register](../../docs/proposals/README.md)
- [Site architecture](../../docs/site-architecture.md), [documentation configuration](../../config/documentation.json), and [verification manifest guide](../../language/verifications/README.md)
- [Atomic commits](../rules/atomic-commits.md) and [documentation rules](../rules/documentation.md)

## Implementation order

### Step 1 — baseline

**Depends on** none.

**Files** Audit `docs/`, `compiler/`, `lib/`, `language/learn/`, `language/verifications/`, `config/documentation.json`, `site/src/docs.lt`, and `site/lite-uri.ts`.

- Capture the existing public routes, LS and LP IDs, heading fragments, module symbol links, and runnable example registrations.
- Inventory each candidate page as a current rule owner, shipped guide, generated API, implementation evidence, or historical design. List contradictions and the evidence for resolving them.
- Record the current docs-check and site-build baseline. Track pre-existing failures separately.

**Acceptance** The migration list identifies the owner and compatibility destination for every page or section scheduled to move. The baseline records which checks and examples pass.

### Step 2 — reconcile

**Depends on** baseline.

**Files** `docs/spec/README.md`, `docs/README.md`, `docs/normative-pages.md`, `docs/decisions-and-open-questions.md`, and the affected owning topic pages.

- Reconcile partial initialization, conditional payload patterns, package preload and re-exports, generic parameter annotations, and the first-call mutation grant.
- Keep LS-001 through LS-011 and their anchors as entry points. Give each entry a short description and link to the current owner.
- Leave the decision ledger and LP records available as dated evidence. Make the current-rule map point to the owning page when a record is superseded.
- Distinguish the selected behavior from the compiler behavior verified for this revision. Keep the existing public paths during this phase.

**Acceptance** A reader reaches one current rule for each reviewed topic. Pending behavior is visible as pending. `./bin/lite docs --check` passes, subject to any documented baseline failures.

### Step 3 — core-text-pilot

**Depends on** reconcile.

**Files** `lib/core/text.lt`, `lib/README.md`, `lib/util/docgen.lt`, `docs/strings.md`, `language/learn/handbook/foundations/numbers-operators-and-strings.md`, and the relevant Unicode example, manifest, and Learn/Gym links.

- Audit public doc comments for the UTF-8 operations, keeping effects, failure modes, and return values beside the declarations. Use internal comments for implementation rationale.
- Generate the module reference and inspect signatures, attached operations, symbol ownership, and links for Unicode helpers. Keep the namespace guide short and link to generated API detail.
- Reuse one verified UTF-8 round trip in the Handbook and link to it from the relevant Learn, Gym, and Playground surfaces. Keep the language rule on fresh string literals with its spec owner.
- Write down the comment format and example-linking pattern in `docs/documentation.md` after verifying the pilot.

**Acceptance** The same operation is discoverable from source, generated API output, Handbook, and its executable case. The API shows the source signature and the verified example demonstrates the stated result.

**Verify** `./bin/lite docs --modules-json`, the focused Unicode fixture or verification manifest registered by the pilot, and `./bin/lite docs --check`.

### Step 4 — records-and-blocks

**Depends on** core-text-pilot.

**Files** `docs/records.md`, `docs/record-initialization.md`, `docs/record-type-identity.md`, `docs/record-literal-boundaries.md`, `docs/blocks-and-results.md`, and affected grammar and index links.

- Consolidate the current construction rules and defaults under one Record construction chapter. Preserve the contextual literal's equivalence to the explicitly named constructor and the required nested propagation. Mark pending syntax at the rule and example.
- Keep executable blocks and the `do` draft together. Link the construction chapter from the relevant brace grammar.
- Keep old `lite://` URLs and fragments working through registered aliases or short forwarding pages.

**Acceptance** One construction chapter explains explicit, contextual, and nested forms. Old links resolve and the Handbook shows only supported forms as runnable examples.

### Step 5 — remaining-topics

**Depends on** records-and-blocks.

**Files** Related pages under `docs/`, `compiler/module-import-stages.md`, `compiler/transition-plan.md`, and affected Handbook chapters.

- Consolidate loop result typing, `.value`, `.collected`, `then`, and zero-iteration rules into Loop results and completion. Retain the main Loops page for source forms and iteration.
- Separate import syntax and visibility from package preload and compiler rollout. Preserve package-local override, default-file absence, private import expansion, and both public import forms.
- Keep binding permissions, caller grants, and operation syntax in their respective owning pages. Move live TS accessor boxes and C11 field addresses into compiler documentation with regression links.
- Turn historical pages and superseded notes into archived reading paths. Keep accepted LP text, historical identifiers, and link destinations. Leave recovery and cleanup consolidation for their design review.

**Acceptance** Each topic ships as a small, independently reviewable migration. Public aliases and fragments continue to resolve across the CLI and site.

### Step 6 — shared-status

**Depends on** remaining-topics.

**Files** `config/documentation.json`, `site/src/docs.lt`, `site/lite-uri.ts`, and the existing documentation and site tests.

- Add a compact status index linking the rule or feature ID, design decision, and actual TS/C11 or host-specific verification evidence. Reuse the existing case IDs. A registered case alone does not establish a pass.
- Point the CLI Status navigation and site badges at the same data. Remove the category-driven Handbook badge claim and use an evidence-based label where the data supports it.
- Extend the `core/text` documentation pattern to modules touched by the migration. Preserve source comments as the API text and generate signatures. Move duplicated handwritten API inventories to the generated reference.
- Reconcile CLI docs with help output and CLI contract fixtures. Link Handbook, Learn, and Gym examples to the appropriate Playground entries.

**Acceptance** Status, supported targets, and pending design are legible from both CLI and site. Module signatures and public comments come from the same declarations.

### Step 7 — integration

**Depends on** shared-status.

**Files** Documentation indexes, site and CLI navigation, link aliases, and verification registrations affected by earlier steps.

- Run `./bin/lite docs --check`, the affected documentation and site tests, focused runnable examples on their advertised targets, and `./bin/lite verify --coverage`.
- Run `node ./site/build.ts` and check built routes, fragments, search entries, module symbols, and Open in Play handoffs against the baseline.
- Check representative paths from a Handbook example to its module reference, owning rule, and evidence. Verify that a pending feature points to its design and a retired page points to its current owner.
- Review code and docs for changed behavior before committing. Run the broader gates for any changed documentation tooling.

**Acceptance** The reorganized material passes its local and built-site checks. Each migration is committed with exact verification evidence and any remaining baseline failures.

## Constraints

Work in atomic commits. Preserve concurrent changes and stage only the current phase's files.
This plan covers documentation, examples, and the tooling needed to generate and validate
them. Compiler feature work and new language decisions have their own scope.

## Key facts

- `docs/spec/README.md` exposes stable LS area IDs. `docs/proposals/` retains LP revisions.
- `lib/util/docgen.lt` extracts public declarations and comments for the module reference.
- `config/documentation.json` owns CLI navigation and snippet registrations.
- `site/src/docs.lt` builds the docs catalog and badges. `site/lite-uri.ts` resolves canonical and legacy documentation links.
- Hand-authored Handbook sources live in `language/learn/handbook/`. The current verification corpus exercises TS and C11.
