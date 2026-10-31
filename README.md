# Lite

Lite is a language-design project for **LiteLang**, a readable, strongly typed language with scripting convenience. LiteLang programs are **LiteScripts**. The project aims to keep ceremony low, make consequential behavior explicit, and let people and programming agents focus on problem solving. Lightness is a core design priority: fast native execution, low memory use, small runtime support, and small final executables. Ordinary native programs should not require a VM or tracing garbage collector; memory-management and backend mechanisms remain open.

**Start with the [LiteLang white paper](docs/white-paper.md)** for LiteLang's philosophy, goals, and design criteria.

The project now has a **small experimental TypeScript/Node igniter** for a narrow
FVP checkpoint, now including Boolean logic, basic conditionals, and action loops.
Run `node igniter/cli.ts igniter/examples/double-sum.lts` with
Node 26.13.0; enter `7` and `5` to report `24`. See the [igniter guide](igniter/README.md)
for setup, strict typechecking, tests, supported behavior, and limitations.
The wider language remains a design draft; there is no native or self-hosted compiler.

- [Language documentation and reading order](docs/README.md)
- [Small VS Code highlighter](editors/vscode/README.md): local Lite highlighting for `.lt` and `.lts` files, with an installable VSIX and no extension runtime code.
- [Source file kinds](docs/modules-and-packages.md#distinct-script-and-module-files): convenient `.lts` scripts and explicit `.lt` module files; module files have no implicit imports, and standard module providers are intended to be replaceable.
- [Principles and goals](docs/principles.md)
- [First working targets](docs/principles.md#first-working-targets): the small interpreter implements the first experimental checkpoint; practical scripts, wider features, and native compilation follow.
- [Bootstrap direction](docs/tooling-and-learning.md#typescript-igniter-and-early-self-hosting): disposable TypeScript/Node igniter, early transition to a Lite-written compiler, and a preserved source-bootstrap route. The self-hosted chain is not implemented yet.
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
