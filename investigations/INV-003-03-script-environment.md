# INV-003.03 — Script environment

Status: in progress
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-003](TOPICS.md#inv-003)
Covered subtopics: INV-003.03 (environment and explicit module dependencies), INV-003.04 (partial: source-kind boundary only)
Subtopic briefs: [INV-003.03](SUBTOPICS.md#inv-003-03), [INV-003.04](SUBTOPICS.md#inv-003-04)

This is a non-normative investigation note outside the language draft. Candidate
names, APIs, and recommendations do not select language or host contracts.

## Investigation question

Which names, inputs, and host facilities should a standalone script receive
automatically, and which should require an explicit import or other request?
The initial output-availability question exposed a prior boundary: scripts and
module files must be distinct before choosing any convenience names.

## Source-kind and standard-module selection, 2026-10-30

The user selected distinct source kinds, answered the core-name clarification
with **“no implicit import at all”**, and stated that even std should be
replaceable. Record these as reviewable design choices:

- **.lts scripts:** retain the convenient, ordered executable file body.
- **.lt module source:** declarations belong to packages/modules. No implicit
  imports, including Int and Bool. Access definitions through module qualification
  or explicit member introduction/unpacking. Language syntax and literal typing
  do not import the corresponding namespace names.
- **Standard modules/files are replaceable:** select this design goal using the
  same explicit dependency/provider model. std is not a magic ambient namespace.
  Selection/configuration, compatibility, versions/ABI, and the boundary between
  compiler primitives and replaceable library definitions remain open.
- **Module identity and shape remain unfinished:** header/using/import/unpack
  grammar, export declarations, initialization, and file-to-module mapping are
  open. Local module aliases are a possible interpretation of short linked names;
  actual filesystem symlinks and their resolver behavior are not selected.

**Proposal only:** explicit script-running mode, illustrated by
lite run script.lts, may introduce convenient names for module-owned facilities
and disclose them with a warning or runner log. The user said “maybe”; do not
treat a convenience set, output API, warning/log class, frequency, channel, or
activation default as selected. Run/build parity remains open. Loading a .lt
module from a script does not grant that module implicit names.

Output effects remain explicit calls or deliberately enabled tool observation.
Runner disclosure is a separate diagnostic question, not expression-result echo.
The original general-prelude recommendation below is superseded in scope:
neither candidate may introduce implicit imports in .lt source.

Owners: [source kinds](../docs/modules-and-packages.md#distinct-script-and-module-files),
[replaceable standard modules](../docs/modules-and-packages.md#replaceable-standard-modules),
[script convenience proposal](../docs/modules-and-packages.md#prelude),
[source naming](../docs/versioning-and-naming.md#source-file-kinds), and
[decision ledger](../docs/decisions-and-open-questions.md#distinct-source-kinds-and-replaceable-standard-modules-2026-10-30).

The source suffix selection migrates 20 lesson files and 520 catalog paths from
.lite to .lts without editing lesson bodies. The other 500 catalog paths remain
planned exercises. Dated review snapshots retain historical names. No legacy
tool alias, script/module conversion, parser, or runner is implemented.

## Current contracts and evidence

Initial evidence baseline: `cd9c044`; working tree clean before this
investigation. Selection/migration baseline: `a37f568`.

- [First working targets](../docs/principles.md#first-working-targets) require a
  tiny executable demonstrator with observable results, followed by practical
  scripts using command-line arguments, console I/O, and files. This does not
  select the demonstrator's observation API or a complete standard library.
- [Explicit output and tracing](../docs/tooling-and-learning.md#explicit-output-and-tracing)
  requires a deliberate source operation or enabled inspection/tracing facility,
  including in playgrounds. Expressions, declarations, and assignments do not
  echo automatically.
- **Historical starting proposal, revised above:** [the prelude](../docs/modules-and-packages.md#prelude)
  proposed that basic types/collections, Option/Result, and convenient output could be predefined;
  filesystem/networking/larger libraries would use explicit imports. Neither
  the complete predefined set nor exact import/API grammar is selected.
- [.lts file bodies](../docs/blocks-and-results.md#source-file-body) execute
  without handwritten entry braces/functions. This does not inject process
  arguments, environment variables, current-directory state, or host handles.
- [Small native support](../docs/memory-and-performance.md#lightweight-native-execution-priority)
  is a selected goal. Optional support should stay out of programs that do not
  use it where practical; no footprint or linker result has been demonstrated.

## Environment inventory

Keep these questions separate rather than treating every ambient name as one
feature or every visible API as an executed effect:

1. **Core/prelude names:** primitive/type names, Unit, Option/Result, core
   operations, and possible collection names. Exact numeric representations,
   generic/type syntax, and individual APIs retain their owning open questions.
2. **Explicit console output:** default name availability, output destination,
   newline/formatting, supported values, and the operation's failure contract.
3. **Process inputs:** argument list and encoding, standard input, environment,
   working directory, and access through names versus an explicit host API.
4. **Larger services:** files, networking, clocks/randomness, and advanced memory
   tools. Namespace/import policy does not by itself settle host authority or
   service behavior.
5. **Name resolution:** whether and how local names can shadow prelude names,
   diagnostic clarity, and script/module consistency.
6. **Context-only language forms:** self(...) belongs to an executing function
   body; it is not a global script host function. Callable input-pack/context
   facilities must not be silently equated with process command-line arguments.
7. **Tool observation:** explicit debugger/playground inspection versus program
   output, without implicitly enabling result echo or executing expressions twice.

Process lifecycle/exit status belongs to INV-005, concrete host operations to
INV-067, standard-library scope to INV-071, and build/runtime costs to
INV-004/INV-064/INV-074. This note does not select those contracts indirectly.

## Concrete output-availability cases

The following names and import/member spelling are illustrative proposals,
not available LiteLang APIs. A is now only a possible .lts script-mode
convenience; .lt always needs explicit module access/member introduction.

```text
/* Candidate A: a predefined output operation */
print(7 + 5);
```

```text
/* Candidate B: explicitly import the I/O namespace */
import std.io;
io.print(7 + 5);
```

Both request output explicitly at the call. Merely making a name available or
importing its namespace is not a request to print an expression's value. A
bare 7 + 5 or apples := 7 + 5 remains silent under either candidate. Output
failure and formatting rules must be selected before these become executable
acceptance examples.

## Original options and recommendation, before source-kind selection

Historical comparison: its general-prelude scope is superseded by the selection
above. Any further convenience comparison applies only to explicit .lts modes.

- **A — Small prelude including a basic explicit output operation.** Keeps the
  first observable program short and avoids requiring module syntax before the
  first arithmetic experiment. It adds a predefined name and needs a precise
  shadowing, host, formatting, and failure contract. Availability alone must not
  be confused with running an effect or proving that unused support is removed.
- **B — Core names only; output requires an import.** Makes the I/O namespace
  visible in source and reduces the default name set, at the cost of teaching
  import/member notation for the first observable arithmetic experiment. This
  does not by itself guarantee less linked code or safer host access than A.

Recommend A for the tiny demonstrator: a small predefined core plus one simple
explicit console-output operation. Keep larger services deliberately imported
and investigate the precise prelude/API set separately. This recommendation
does not select print as its name, a formatting interface, error transport,
input APIs, module-loading behavior, or an implementation order. It remains open
for the user's decision. Either policy preserves explicit output.

## Verification and limits

Read the current owning pages and selected targets; checked the distinction
between explicit effect requests and name availability. Checked 1,479 local
links/anchors and balanced fences across 19 changed Markdown files, plus focused
diff consistency. All 20 renamed lessons are byte-identical to their baseline;
the catalog has 520 unique .lts paths, 20 present and 500 planned.
No LiteLang parser, typechecker,
runner, output API, host experiment, or binary-size result was used or produced.
No foreign-language comparison is needed to select a local design preference.

## Decision references and handoff

Later investigation requests, 2026-10-30: standard swapping, primitive/library
boundaries, and interface/implementation locations are inventoried under
[INV-071.01–.03](SUBTOPICS.md#inv-071), lean code under
[INV-063.05](SUBTOPICS.md#inv-063-05), and a possible ban on module top-level
side effects under [INV-003.05](SUBTOPICS.md#inv-003-05). All are **not started**.
Declarations can evaluate effectful initializers, so forbidding bare statements
alone would not establish such a ban. No new effect restriction is selected.

The source-kind split, .lt explicit dependencies, and replaceable-standard goal
are selected, reviewable baselines. Script convenience names and disclosure
remain proposals. Next define the module's explicit dependency/source shape and
the compiler-primitive/library boundary, then return to any script-mode aliases
and concrete output operation with its failure/formatting contract. Process
inputs and name-conflict policy remain open. INV-003.04 is covered only at its
source-kind boundary; full script-to-module migration is not decided. Preserve
INV-003.02's unresolved questions; advancing this review does not resolve them.
