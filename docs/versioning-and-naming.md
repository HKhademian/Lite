# Naming and versioning

Status: **selected naming and version policy, 2026-10-25; distinct script/module suffixes selected 2026-10-30**. Package-registry spelling and release automation remain open.

## 1. Canonical names

| Thing | Prose name | Machine name | Notes |
|---|---|---|---|
| Umbrella project | **Lite** | `lite` | The whole project; not a language name |
| Language | **LiteLang** | `litelang` | The language and its reference |
| Program | **LiteScript** | `litescript` | A script/program; module source is a distinct file kind |
| Compiler | **Lite compiler** | `lite-compiler`; binary `litec` | Compiles LiteLang programs |
| Runtime | **Lite runtime** | `lite-runtime`; binary `literun` | Executes compiled LiteScript programs |
| Command-line tool | **Lite CLI** | `lite` | Dispatcher for `lite fmt`, `lite build`, `lite run` |
| Script source | **LiteScript file** | `.lts` | Convenient standalone script body |
| Module source | **LiteLang module file** | `.lt` | Package/module-owned declarations and explicit module access |
| Formatter | **Lite formatter** | `lite fmt` | Part of the CLI |
| Standard library | **Lite standard library** | `lite-stdlib` | Reserved default implementation name; replaceable standard providers are intended |

### Name rules

- Write **Lite** for the project, **LiteLang** for the language, and **LiteScript** for a script/program. A .lt source unit is a LiteLang module file, distinct from a .lts script body.
- Use **LiteScripts** (plural) for several programs or a collection of scripts. Use `litescripts` only as a machine path/identifier.
- Use `litelang` for the language identifier and in language-level package or metadata fields.
- Use `litescript` for one program identity, not as the language identifier.
- Do **not** write `Lite Script`, `Litescript`, `Lite Lang`, `litelang` in prose, or `LITE` as a name.
- Do not call the language “LiteScript”; that names a program. Do not call the project “LiteLang”.
- The project is `lite`. Do not say “write lite code”; code is written in LiteLang.
- The compiler is the **Lite compiler**, package `lite-compiler`, executable `litec`.
- The runtime is the **Lite runtime**, package `lite-runtime`, executable `literun`.
- The CLI is `lite`. `lite` is not the compiler binary and must not be used as a synonym for `litec`.
- Binary names are lowercase and contain no spaces. Prose names may contain spaces.
- Existing `lite fmt` documentation is consistent with this policy.
- Do not introduce a second short name for the language. “Lite” alone is not a language name.

### Source file kinds

Selected 2026-10-30: .lts identifies scripts and .lt identifies module-based
source. The [module/source-kind contract](modules-and-packages.md#distinct-script-and-module-files)
owns their different shapes and access policy. The former .lite suffix is
superseded; the existing 20 lesson files and 520 catalog paths have been
migrated to .lts without changing lesson source contents. Historical review
snapshots retain old path spellings where they describe their original revision.
No implemented lexer/tool, legacy .lite acceptance, or automatic conversion
between script and module semantics is implied. Naming changes do not themselves
publish a release or bump a component version.

Repository [Git attributes](../.gitattributes) declare both .lt and .lts as
LiteLang, the canonical language name. GitHub's Linguist registry checked
2026-10-30 does not yet list LiteLang: this declaration does not register a new
language or by itself enable a LiteLang statistics/highlighting label. See
[Linguist's override limits](https://github.com/github-linguist/linguist/blob/main/docs/overrides.md#detectable).

### Legacy prose migration

Many existing pages say “LiteScript” when they mean the language. That usage is **legacy**:

- New or edited pages must use **LiteLang** for the language and **LiteScript** only for a program.
- A mass rename of existing pages is a separate migration; until then, “LiteScript language” in old prose is understood as legacy LiteLang usage, not a second official name.
- Tool metadata may accept `litescript` as a legacy language id through the `0.x` migration period. New metadata uses `litelang`.
- Do not add new legacy usage while editing a page for another reason.

### Bootstrap source continuity

Selected direction 2026-10-30: keep a downloadable, versioned TypeScript/Node igniter and
compatible compiler source revisions sufficient to build forward to the current
Lite-written compiler after active development becomes self-hosted. Preserve
the bootstrap path when source language requirements change. Exact required
revisions, stage dependencies, preservation/rebuild verification, and distribution
procedure remain open under [INV-061.06](../investigations/SUBTOPICS.md#inv-061-06).
See [the owning self-hosting direction](tooling-and-learning.md#typescript-igniter-and-early-self-hosting).
The first [igniter checkpoint](../igniter/README.md) exists; there is no self-hosted
bootstrap bundle or verified compiler-to-compiler rebuild chain yet.

Reaffirmed **2026-10-30**: version control and stable version tags are required
for bootstrap continuity. Tag the igniter and compiler milestones needed by the
build chain, each tied to an exact source commit. Once published or referenced
by that chain, do not move/delete those tags or rewrite away their source
history; corrections get a new version/tag. Routine investigation commits do
not each require a release tag.

For each required stage, record the builder's version/tag and exact commit,
the source version/tag and exact commit it builds, and how to produce and check
the next stage, including required host tools. Preserve this compatibility map
alongside the sources so users do not have to guess which historic revisions
work together. Tags identify sources; successful end-to-end rebuilds must still
verify the route. Exact tag naming for the igniter, first milestone versions,
and bootstrap record format remain open. No tag or release is created by this
documentation decision.

## 2. Version streams

These are independent version streams. A release manifest records the exact combination.

| Stream | Version form | Git tag | Example |
|---|---|---|---|
| Project release | `MAJOR.MINOR.PATCH` | `lite-vX.Y.Z` | `lite-v0.3.0` |
| Language | `MAJOR.MINOR.PATCH` | `lang-vA.B.C` | `lang-v1.2.0` |
| Compiler | `MAJOR.MINOR.PATCH` | `compiler-vX.Y.Z` | `compiler-v0.4.1` |
| Runtime | `MAJOR.MINOR.PATCH` plus ABI integer | `runtime-vX.Y.Z` | `runtime-v0.3.0` |
| CLI/tooling | `MAJOR.MINOR.PATCH` | `cli-vX.Y.Z` | `cli-v0.5.0` |
| Standard library | `MAJOR.MINOR.PATCH` | `stdlib-vX.Y.Z` | reserved |

The project release version labels the umbrella manifest. It is not the language version and not the `lite` CLI version. The manifest names the exact component versions.

Version identifiers in output:

```text
LiteLang 1.2.0
litec 0.4.1 (LiteLang 1.2.0, ABI 3)
literun 0.3.0 (ABI 3)
lite 0.5.0
LP-0007 r2
```

The compiler and runtime versions are not the language version. A compiler patch release does not change the language version, and a language minor release does not require equal compiler/runtime numbers.

## 3. Language version rules

The language starts its published design line at `0.1.0`. `1.0.0` is the first stable language release.

After `1.0.0`:

- **MAJOR** — incompatible source or semantic change; removal of a selected rule.
- **MINOR** — backward-compatible language addition.
- **PATCH** — backward-compatible correction or clarification with no intended behavior change.

Before `1.0.0`, a MINOR release may break compatibility, but the break must be listed in the release notes and tied to an accepted proposal. Do not hide a break in a PATCH release.

Additional rules:

- A language version changes only through an accepted proposal (`LP-NNNN`) or a recorded ledger decision.
- Do not use date-only language versions such as `2026.10`.
- Pre-releases use `-alpha.N`, `-beta.N`, or `-rc.N`; they are not stable releases.
- Build metadata is allowed on compiler/runtime package versions but is not part of the language version.
- Never reuse a language version number.
- A documentation typo that cannot change behavior may ship as a language PATCH clarification, but must not be presented as a semantic change.

## 4. Compiler version rules

- `litec` uses independent semantic versioning.
- `litec --version` reports its own version, the language version it implements, and the ABI it emits.
- A compiler release may fix diagnostics, code generation, or performance without changing the language version.
- A compiler must not silently accept a language version it does not implement. It declares a supported language range or an exact target.
- Compiler MAJOR changes for incompatible CLI/configuration or code-generation contract changes; source-language compatibility is governed separately by the language version.
- Compiler PATCH is used for behavior-preserving fixes. A changed observable compilation result is at least a compiler MINOR, even when the language version is unchanged.
- The compiler version is never used as a substitute for the language version.

## 5. Runtime version rules

- `literun` uses independent semantic versioning plus an integer **ABI version**.
- `literun --version` reports its own version and ABI version.
- A binary-incompatible runtime interface change increments the ABI version and requires a runtime MAJOR release.
- A binary-compatible runtime addition may keep the ABI version and use a runtime MINOR release.
- A runtime that changes observable language behavior must match a language release whose rules authorize that behavior; otherwise it is a bug fix, not a new language rule.
- A compiler emits the ABI it requires. The runtime must match exactly or satisfy a declared compatibility range. “Latest runtime” is not a compatibility claim.
- Runtime PATCH is for behavior-preserving fixes.

## 6. CLI and tooling version rules

- `lite` uses independent semantic versioning.
- `lite fmt` output changes are CLI/tooling changes, not language changes.
- Formatter style changes require a CLI MINOR release when they alter default output.
- Formatter bug fixes that preserve the documented style may use CLI PATCH.
- A tool must report its own version separately from the language version.
- Tool output text, diagnostics, and formatting are not language ABI.

## 7. Compatibility contract

- Same language MAJOR: source compatibility is expected. A deprecated rule remains for at least one MINOR before removal in the next MAJOR.
- A compiler declares the language versions it supports. Support for a new language MINOR is explicit, not inferred from a newer compiler version.
- A runtime declares its ABI and supported language range.
- Incompatible combinations are rejected with a clear diagnostic; do not guess or silently downgrade.
- Diagnostic wording, formatting output, and internal metadata are not stable interfaces.
- A release manifest is the authoritative combination of language, compiler, runtime, CLI, ABI, and standard-library versions.

## 8. Proposal versioning

Every design proposal that can affect the language, compiler, runtime, CLI, or standard library uses a **Lite Proposal** ID:

```text
LP-0001 r1
```

Required fields:

- stable ID `LP-NNNN`, never reused;
- title;
- revision `rN` (starts at `r1`);
- status: `draft`, `accepted`, `rejected`, `withdrawn`, or `superseded`;
- target language version and, when applicable, target component version, or `unassigned`;
- `supersedes` / `superseded-by` when applicable.

Rules:

- An accepted proposal is never silently edited. A change creates `r2` or a new proposal.
- Every revision states what changed from the previous revision.
- A rejected or withdrawn proposal is retained; it is not deleted or renumbered.
- An accepted proposal is assigned to a language version at release time. “Accepted but unreleased” is a valid state.
- The decision ledger cites the proposal ID from 2026-10-25 forward. Historical entries are not retroactively renumbered.
- A proposal without an ID, revision, and status is not a decision record.
- The language version is not bumped merely because a proposal was accepted; it is bumped when the accepted change ships.

## 9. Release and tagging

- Use `lite-vX.Y.Z` for the project release manifest.
- Use component tags: `lang-vA.B.C`, `compiler-vX.Y.Z`, `runtime-vX.Y.Z`, `cli-vX.Y.Z`, and `stdlib-vX.Y.Z` when introduced.
- A release manifest lists every component version and the ABI version.
- Release notes list accepted proposal IDs and any compatibility break.
- A single repository may contain all components; tags remain component-specific.
- Do not use a bare `vX.Y.Z` tag. `lite-vX.Y.Z` is the project manifest, not a substitute for component tags.
- Never move or reuse a release tag. A yanked release remains visible and is marked yanked.
- Pre-release tags include the pre-release suffix, for example `lite-v0.3.0-rc.1` and `lang-v1.0.0-rc.1`.

## 10. Change classification

| Change | Language | Compiler | Runtime | CLI |
|---|---|---|---|---|
| Typo or clarification, no behavior change | PATCH | — | — | PATCH if output changes |
| Backward-compatible language addition | MINOR | MINOR when implemented | as needed | as needed |
| Incompatible source/semantic change | MAJOR | MAJOR when implemented | as needed | as needed |
| Compiler bug fix, same language behavior | — | PATCH | — | — |
| Compiler optimization, same observable behavior | — | MINOR or PATCH by policy | — | — |
| Binary-incompatible runtime change | — | — | MAJOR + ABI increment | — |
| Formatter default-output change | — | — | — | MINOR |
| Proposal accepted but not shipped | — | — | — | — |

“—” means no required bump in that stream. A release manifest still records the tested combination.

## 11. Forbidden practices

- Do not call the project “LiteLang”, the language “LiteScript”, or a program “LiteLang”.
- Do not use `lite` as the compiler binary; use `litec`.
- Do not use `litec` or `literun` as language version names.
- Do not use a date as the language version.
- Do not reuse, skip, or renumber proposal IDs or release tags.
- Do not silently edit an accepted proposal.
- Do not change runtime ABI without incrementing the ABI version.
- Do not claim compatibility with “latest”; name exact versions or a declared range.
- Do not bump the language version for a compiler-only fix or formatter-only change.
- Do not ship a semantic change in a language PATCH release.

## 12. Worked examples

A backward-compatible language addition:

```text
LP-0012 r1 accepted, target LiteLang 0.3.0
lite-v0.3.0
lang-v0.3.0
compiler-v0.5.0 (LiteLang 0.3.0, ABI 1)
runtime-v0.4.0 (ABI 1)
cli-v0.6.0
```

A compiler-only fix:

```text
no language change
compiler-v0.5.1 (LiteLang 0.3.0, ABI 1)
```

A breaking language and ABI release:

```text
LP-0020 r3 accepted, target LiteLang 1.0.0
lite-v1.0.0
lang-v1.0.0
compiler-v1.0.0 (LiteLang 1.0.0, ABI 2)
runtime-v2.0.0 (ABI 2)
cli-v1.0.0
```
