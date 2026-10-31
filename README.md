# Lite

Lite is a language-design project for **LiteLang**, a readable, strongly typed language with scripting convenience. LiteLang programs are **LiteScripts**. The project aims to keep ceremony low, make consequential behavior explicit, and let people and programming agents focus on problem solving. Lightness is a core design priority: fast native execution, low memory use, small runtime support, and small final executables. Ordinary native programs should not require a VM or tracing garbage collector; memory-management and backend mechanisms remain open.

**Start with the [LiteLang white paper](docs/white-paper.md)** for LiteLang's philosophy, goals, and design criteria.

The project now has a **small experimental TypeScript/Node igniter** for a narrow
FVP checkpoint, now including Boolean logic, conditionals, action loops,
typed functions, flat tuples, fixed arrays and explicit growable-list operations.
Run `./lite run examples/001-double-sum.lts` with
Node 26.13.0; enter `7` and `5` to report `24`. See the [igniter guide](igniter/README.md)
for setup, strict typechecking, tests, supported behavior, and limitations.
The wider language remains a design draft. The first Lite-written compiler stage
now lives in [compiler/](compiler/README.md): a shared restricted front-end with
TypeScript and C backends. Run it with `./ltc --target ts file.lts` (short),
`./litec` (full binary), or `./lite compile` (CLI). It supports
arithmetic/String `report(...)` expressions, multi-value reports, and immutable
Int/String locals. Forty-one program cases have identical output bytes/status
across the igniter, TS and native C paths, and 34 rejection cases check exact
compiler diagnostics. Each case pairs a sibling `.lts` entry source with a JSON
model under [igniter/tests/compiler](igniter/tests/compiler/). These restricted
prototypes are not a full/self-hosted compiler.

Tool entry points follow one naming matrix: compiler `./ltc`, `./litec` or
`./lite compile`; runner `./lite run`; checker `./lite check`. Linker
(`./ltl`/`./lite link`) and formatter (`./lite fmt`) names are reserved but not
implemented. The verifier is `./lite verify`; the tester is `./lite test`; docs
are `./lite docs`; help is `./lite help`. See
[tool naming](docs/versioning-and-naming.md#1-canonical-names).

- [Language documentation and reading order](docs/README.md)
- [Numbered runnable examples](examples/README.md): small language demonstrations shared by the interpreter and editor tooling.
- [Lite compiler prototype](compiler/README.md): shared front-end and TS/C backends, run with `./ltc`, `./litec`, or `./lite compile`.
- [Verification cases](verifications/README.md): feature contracts and artifact manifests, run with `./lite verify`.
- [Small VS Code highlighter](editors/vscode/README.md): local Lite highlighting for `.lt` and `.lts` files, with an installable VSIX and no extension runtime code.
- [Source file kinds](docs/modules-and-packages.md#distinct-script-and-module-files): convenient `.lts` scripts and explicit `.lt` module files; module files have no implicit imports, and standard module providers are intended to be replaceable.
- [Principles and goals](docs/principles.md)
- [First working targets](docs/principles.md#first-working-targets): the interpreter and restricted TS/C emission prototypes now run; practical scripts and broader compiled subsets follow.
- [Bootstrap and target direction](docs/tooling-and-learning.md#typescript-igniter-and-early-self-hosting): readable permanent TS bootstrap, maintained TS/web and C/native export targets, and overlapping igniter/self-hosted development. Full self-rebuild and AS/Wasm compatibility remain open.
- [Lightweight native execution](docs/memory-and-performance.md#lightweight-native-execution-priority): selected priorities, proposed compiler/memory direction, and [focused investigation points](investigations/lightweight-native-execution.md).
- [Continuity and analogical coherence](docs/continuity-and-analogy.md): design-method principle for local predictability and visible semantic boundaries.
- [Current decisions and open questions](docs/decisions-and-open-questions.md)
- [Provisional grammar sketch](docs/grammar-sketch.md)
- [LiteLang current design specification](docs/spec/README.md): stable-ID summary of selected rules, subordinate to the normative pages.
- [Accepted and unreleased proposals](docs/proposals/README.md): LP IDs, revisions, selected contracts, and release boundaries.
- [Naming and versioning](docs/versioning-and-naming.md): `lite` project, LiteLang language, LiteScript programs, `litec` compiler, `literun` runtime, and the version/proposal policy.
- [Optional leading separators for expressions, additive chains, patterns, and unions](docs/leading-separators.md)
- [Tuple types, array tails, and fixed-size inference](docs/tuple-array-shapes.md)
- [Logical tuple unpacking](docs/tuple-unpacking.md): emit labeled fixed items and tail elements, then reconstruct under the destination contract.
- [Multilingual source and learning](docs/multilingual-source-and-learning.md): proposed familiar-language entry to programming, simple-English reference presentation, and [investigation points](investigations/multilingual-source-and-learning.md).
- [External references](docs/references.md): the project reference languages now include Salam; older comparisons retain their stated coverage.
- [Documentation review backlog](TASKS.md): historical 2026-10-23 snapshot; current rules are in the decision ledger.
- [Backlog by topic](ISSUES-BY-TOPIC.md): topic-grouped view of the same snapshot.
- [Investigation catalog for agents and developers](investigations/README.md): 75 topic briefs outside the language draft, scoped starter subtopics, starting references, and a reusable investigation-note template. This is an inventory, not a roadmap or a set of language decisions.

Each concept has its own document containing its purpose, working syntax, examples, constraints, and unresolved details. Earlier alternatives are retained only when they explain a decision or an outstanding choice.
