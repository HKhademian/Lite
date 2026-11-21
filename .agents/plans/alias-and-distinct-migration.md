---
name: alias-and-distinct-migration
status: pending
created: 2026-11-21
todos:
  - id: contract-and-baseline
    content: Pin baseline and specify migration cases
    status: pending
  - id: type-alias-bridge
    content: Accept alias for types in both compiler paths
    status: pending
  - id: symbol-aliases
    content: Resolve and lower aliases for variables, functions, and modules
    status: pending
  - id: distinct-types
    content: Implement fresh identities and verified target behavior
    status: pending
  - id: migrate-consumers
    content: Migrate maintained source, examples, and tools
    status: pending
  - id: retire-bridge
    content: Retire old spelling and verify the release candidate
    status: pending
---

# Alias and distinct migration

## Mission

Implement `Name := alias Target` for type expressions and existing symbols,
and `Name := distinct TypeExpression` for fresh type identities. Migrate the
compiler, libraries, tests, examples, and tooling from the old `:= type`
spelling while keeping the generated compiler able to rebuild itself.

## Done

- The [language reference](../../docs/type-aliases.md) and grammar sketch record
  identity, symbol access, supported declaration forms, and open behavior.
- Current runnable documentation identifies `:= type` as the spelling accepted
  by the active compiler and Playground.

## Read first

- [Alias and distinct reference](../../docs/type-aliases.md)
- [Core-type review](../../research/investigations/language-review/01-core-types.md)
- [Breaking source-form migrations](../../docs/evolving-language.md#breaking-source-form-migrations)
- [Generated bootstrap](../../compiler/bootstrap/README.md)
- [Compiler development rules](../rules/compiler-development.md)

## Implementation order

### Step 1 — contract-and-baseline

**Depends on:** none

**Files:** extend `language/verifications/features/`, `language/cases/`,
`compiler/tests/`, and relevant manifests.

- Record the exact compiler seed and source identities and baseline failures.
  Inventory old spelling with `git grep -n -E ':=[[:space:]]*type\b'` plus a
  multiline scan. Classify live sources, fixtures, executable fences, and history.
- Specify independent cases for structural aliases, aliases of nominal types,
  complete union/fallible and callable targets, local forward references,
  imports, shadowing, cycles, unknown targets, and declaration boundaries.
- Specify same-slot mutation and permissions, callable/module identity and
  visibility, and distinct type admission, equality, hashing and representation.
  Resolve keyword reservation, lookup/order details, and the initial distinct
  type surface before enabling behavior that depends on those decisions.
  Track indexed places, aggregate operations and explicit conversion syntax as
  open wherever the reference leaves them open.

**Acceptance:** Each selected rule maps to a named fixture or feature case,
with independently observable acceptance, rejection and runtime outcomes.

### Step 2 — type-alias-bridge

**Depends on:** contract-and-baseline

**Files:** `compiler/src/lexer.lts`, `parser.lts`, `check.lts`,
`frontend-syntax.lts`, `frontend-types.lts`, `frontend-expr.lts`,
`frontend.lts`, and `modules.lts` under `compiler/src/`.

- Add `alias` as a declaration head and share type alias parsing and lookup
  with the existing implementation. Cover the token parser/checker and all
  source frontend scope collectors, including control-flow and module scopes.
  Resolve ambiguous named operands by symbol kind and keep unsupported kinds
  diagnosed until their implementation lands.
- Use the unchanged selected seed and existing source syntax to build the
  candidate. Keep `:= type` temporarily usable for staged self-hosting.

**Acceptance:** New and old type alias spellings agree on the existing admitted
cases. Rejections cover malformed operands and cycles with source positions.

### Step 3 — symbol-aliases

**Depends on:** type-alias-bridge

**Files:** `compiler/src/{check,modules,frontend,frontend-context,frontend-expr,frontend-ir,reachability,emit-ts,emit-c}.lts`
and the Step 1 cases.

- Bind aliases to canonical symbols or storage identities. Carry that identity
  into reads, assignments, capture and caller-write grant checks. Exercise
  shadowing, uninitialized storage, closure capture, read-only access, and
  overlapping write grants through two names for one slot.
- Resolve callable and namespace aliases through the original entity, including
  public member lookup, visibility, signature information, reachability and
  module initialization. Test chained aliases, name collisions, and invalid
  qualified references. Keep unsupported computed targets explicitly rejected.

**Acceptance:** Writes through writable aliases and original names are mutually
observable. Read-only aliases cannot write, duplicate grants are rejected, and
calling through an alias or qualifying through an aliased module preserves the
target and its permissions.

### Step 4 — distinct-types

**Depends on:** type-alias-bridge and symbol-aliases

**Files:** `compiler/src/{parser,check,frontend-types,frontend-ir,frontend,frontend-expr,emit-ts,emit-c}.lts`
and the Step 1 cases.

- Resolve the backing type and assign canonical nominal identity per distinct
  declaration, including when used through aliases and module imports. Keep
  backing representation and nominal identity separate through checking,
  unions, lowering, and type-keyed operations.
- Implement the admitted operations and conversions from the agreed contract.
  Cover distinct declarations from named and inline shapes, separate
  declarations sharing a backing type, distinct-to-backing assignment in both
  directions, and same-type equality and hash reuse under the selected rules.
  Verify zeroing, copies, and runtime representation for supported backings.
- Check generated TS and the TS-hosted C emitter where supported. Add explicit
  diagnostics and target cases for unsupported behavior.

**Acceptance:** The two spellings of `Point4` have the same semantics when used
in place of one another. Independently declared nominal types stay distinct even
when they share backing storage representation.

### Step 5 — migrate-consumers

**Depends on:** symbol-aliases, distinct-types

**Files:** `compiler/src/`, `compiler/tests/`, `lib/`, `tools/`, `language/`,
`samples/`, `docs/`, `site/`, `editors/vscode/`, and bootstrap metadata.

- Verify and promote the supporting bridge seed before adopting new syntax in
  compiler source. Migrate live declarations and expectations with a
  syntax-aware pass, preserving unrelated uses of `type`, fixture intent,
  chronology, and behavior. Review emitted artifact and diagnostic changes.
- Update formatter and token consumers, Playground highlighting and snippets,
  site and editor grammars, editor tests, lesson catalogs and linked source,
  verification manifests and hashes, and CLI examples. Convert runnable fences
  with their source and remove temporary status notes once the active compiler
  supports the examples. Keep the linked tuple alias example runnable.
- Rebuild from the selected seed with the migrated compiler source and verify
  byte equality across generations before removing compatibility.

**Acceptance:** All maintained live consumers use the new spelling.
Historical records and intentional migration rejections keep the old spelling.

### Step 6 — retire-bridge

**Depends on:** migrate-consumers

**Files:** `compiler/src/`, `compiler/bootstrap/`, `compiler/tests/`,
`language/verifications/`, `docs/`, and release notes.

- Remove old alias parsing and document the source change. Add rejection cases
  for the retired declaration form and verify unrelated uses of `type`.
- Rebuild and verify the final seed, strict TS, site build and tests, editor
  checks, source coverage, and supported target behavior. Record target gaps,
  builder identity, artifact hashes, and before/after case results.
- Verify the published handbook and Playground against the release revision
  after an authorized publication.

**Acceptance:** A clean checkout rebuilds itself, the new examples run through
normal entry points, and the only old alias spellings are deliberate history or
rejection inputs. Release and publication follow repository rules.

## Verification and commit boundaries

- Run focused fixtures and `./bin/lite test --fast` during implementation.
  Run `./bin/lite test --full`, `./bin/lite verify --coverage`,
  `./bin/lite verify --all`, `./bin/lite doctor`, and
  `./bin/lite docs --check` before final acceptance.
- Run `node compiler/scripts/build.ts`,
  `node compiler/scripts/self-host.ts --out /tmp/lite-alias-selfhost`, and
  `node compiler/scripts/corpus-parity.ts` with the intended seed or recorded
  candidate artifact. Run the site checks in `.github/workflows/pages.yml`.
- Keep specification, support, source adoption and bridge removal reviewable
  in atomic commits. Generate bootstrap artifacts from Lite source. Preserve
  unrelated work and historical evidence.

## Key project facts

- Generated TypeScript is the active compiler and verification path. The C
  emitter runs on TypeScript and has separate C output and execution evidence.
- `AliasDecl` and block alias collection exist in multiple frontend paths.
  Renaming one token alone cannot update the full language entry points.
- The original playable handbook example uses tuple dot positions and evaluates
  to `(x=3, y=4) 30`. Preserve that result through the spelling migration.
