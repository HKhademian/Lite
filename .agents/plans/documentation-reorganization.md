---
name: documentation-reorganization
status: in_progress
created: 2026-11-26
todos:
  - id: baseline
    content: "Inventory current rule owners, examples, and public links"
    status: completed
  - id: reconcile
    content: "Reconcile contradictory current pages with paths intact"
    status: completed
  - id: core-text-pilot
    content: "Verify one path from source comments to module docs and Handbook"
    status: completed
  - id: records-and-blocks
    content: "Consolidate record and block documentation with stable links"
    status: completed
  - id: remaining-topics
    content: "Consolidate remaining high-overlap topics and archive history"
    status: completed
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

- Started the documentation worktree and reconciled the public spec index.
  The LS pages link to their owning rules, the ledger is dated history, and
  import implementation status matches the TS and C11 probes.
  `lite docs --check` and the built site checks passed. A comparison retained
  all 375 baseline HTML routes and 11,677 captured anchor IDs.

- Connected the existing UTF-8 showcase to public API comments, Handbook, Learn, Gym, and Playground. Module JSON and both filtered TS/C11 verification runs passed.

- Moved contextual construction and defaults to Record initialization and standalone do to Blocks and results. Preserved prior headings as compatibility entry points. The docs check passed.

- Consolidated loop results, separated package-local preload, and documented backend mutation lowering. Kept old headings and historic links. Offline docs and full site validation passed.

## Baseline inventory

Completed against `6bb53592ef2e` in the documentation worktree. The offline
docs check and module JSON export passed. The full site build passed using
Node `26.12.1` with local dependencies whose lockfiles matched the checkout.
It checked 375 HTML pages, 79,335 links, and 13,819 fragment links. The
build covered 66 showcase and play entries, 25 lessons, 3 tutorials, and
56 Gym exercises. Module JSON listed 39 modules and 854 symbols.

The worktree's ignored `dist/documentation-baseline/` holds the route and
anchor snapshot, link graph, search index, module JSON, build logs, source
registrations, and focused probe sources. It records 11 LS IDs, 18 LP
records, 11 Handbook chapters, and 2 registered snippets. The snapshot can
be rebuilt from the baseline revision with `./bin/lite docs --check`,
`./bin/lite docs --modules-json`, and `node ./site/build.ts --verbose`.

### Rule ownership and link destinations

- Keep `docs/spec/README.md` and its LS anchors as the entry index.
  `docs/normative-pages.md` should point directly to current rules. Keep the
  ledger and LP record paths available as history.
- Partial initialization goes to `conditionals#no-final-else-guarded-update`
  and `first-initialization#conditional-reservation`. Conditional payload
  guards go to `conditionals#pattern-binding-followed-by-guards`. Remove the
  historical conditional union fallback from the list of current rule owners.
- Import and re-export names go to the Imports and visibility chapter.
  Preload resolution and policy go to Packages and preload. Preserve
  `modules-and-packages#import-expansion-and-re-exports`,
  `#package-preload`, and `#implicit-core-preloading-gap` as entry points.
  The compiler implementation gap stays owned by `compiler/module-import-stages.md`.
- Keep the `generic-notation#explicit-generic-names-and-inferred-parameter-declarations`
  and `type-operations#mutation-grants-for-field-receivers` anchors as
  owners of those syntax directions. Caller-visible writes belong in
  `caller-mutation-grants#evaluation-and-scope`. Backend lowering goes in
  compiler documentation.
- Record construction and defaults move to the current `record-initialization`
  route as the construction chapter. Record identity stays under Records.
  Executable blocks and `do` go to `blocks-and-results`. Preserve the old
  `record-literal-boundaries` route and relevant anchors.
- Use `loop-completion` for loop results, `.value`, `.collected`, and
  `then`. Preserve routes and anchors from `loop-value`,
  `loop-type-inference`, and `loop-last-item`. Keep source modes and item
  binding under `loops`. Keep the old accumulator page reachable as history.

### Current implementation evidence

Both generated targets still print `8 0` for the partial initializer
probe. Both reject guarded `.Some(n) := ...` conditionals, omitted
`: Int` on a generic dimension parameter in the receiver example,
`do { ... }`, and a plain import without an alias. Both compile the
qualified import version. The selected or draft source rules remain in the
owning topic pages, and these observations describe the baseline compiler.

## Read first

- [Documentation maintenance](../../docs/documentation.md) and [normative map](../../docs/normative-pages.md)
- [Stable spec area IDs](../../docs/spec/README.md) and [proposal register](../../docs/proposals/README.md)
- [Site architecture](../../docs/site-architecture.md), [documentation configuration](../../config/documentation.json), and [verification manifest guide](../../language/verifications/README.md)
- [Atomic commits](../rules/atomic-commits.md) and [documentation rules](../rules/documentation.md)

## Implementation order

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
