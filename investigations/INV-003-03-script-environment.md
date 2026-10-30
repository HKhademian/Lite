# INV-003.03 — Script environment

Status: in progress
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-003](TOPICS.md#inv-003)
Covered subtopics: INV-003.03 (initial inventory and default output availability)
Subtopic brief: [INV-003.03](SUBTOPICS.md#inv-003-03)

This is a non-normative investigation note outside the language draft. Candidate
names, APIs, and recommendations do not select language or host contracts.

## Investigation question

Which names, inputs, and host facilities should a standalone script receive
automatically, and which should require an explicit import or other request?
Start with one bounded question: should basic explicit console output be
available by default, or require an I/O import? API spelling and behavior are
separate decisions.

## Current contracts and evidence

Evidence baseline: `cd9c044`; working tree clean before this investigation.

- [First working targets](../docs/principles.md#first-working-targets) require a
  tiny executable demonstrator with observable results, followed by practical
  scripts using command-line arguments, console I/O, and files. This does not
  select the demonstrator's observation API or a complete standard library.
- [Explicit output and tracing](../docs/tooling-and-learning.md#explicit-output-and-tracing)
  requires a deliberate source operation or enabled inspection/tracing facility,
  including in playgrounds. Expressions, declarations, and assignments do not
  echo automatically.
- [The prelude](../docs/modules-and-packages.md#prelude) is a proposal: basic
  types/collections, Option/Result, and convenient output could be predefined;
  filesystem/networking/larger libraries would use explicit imports. Neither
  the complete predefined set nor exact import/API grammar is selected.
- [Run-file bodies](../docs/blocks-and-results.md#source-file-body) execute
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
not available LiteLang APIs:

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

## Options and recommendation

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
between explicit effect requests and name availability. Checked note/catalog
links, fences, and focused diff consistency. No LiteLang parser, typechecker,
runner, output API, host experiment, or binary-size result was used or produced.
No foreign-language comparison is needed to select a local design preference.

## Decision references and handoff

Existing selected references above are current, reviewable baselines. No new
prelude or output-availability rule is selected by this note. Decide A versus B
first; then define the concrete output operation and its failure/formatting
contract, followed by process inputs and prelude-name resolution. Preserve
INV-003.02's unresolved questions; advancing this review does not resolve them.
