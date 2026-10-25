# Lite

Lite is a language-design project for **LiteLang**, a readable, strongly typed language with scripting convenience. LiteLang programs are **LiteScripts**. The project aims to keep ceremony low, make consequential behavior explicit, and let people and programming agents focus on problem solving. Native execution with modest runtime support is a performance goal.

**Start with the [LiteLang white paper](docs/white-paper.md)** for LiteLang's philosophy, goals, and design criteria.

The project is currently **planning only**. These documents record the design discussion through **2026-10-25**. They are not an implemented compiler specification, and the examples have not been compiled.

- [Language documentation and reading order](docs/README.md)
- [Principles and goals](docs/principles.md)
- [Continuity and analogical coherence](docs/continuity-and-analogy.md): design-method principle for local predictability and visible semantic boundaries.
- [Current decisions and open questions](docs/decisions-and-open-questions.md)
- [Provisional grammar sketch](docs/grammar-sketch.md)
- [LiteLang current design specification](docs/spec/README.md): stable-ID summary of selected rules, subordinate to the normative pages.
- [Naming and versioning](docs/versioning-and-naming.md): `lite` project, LiteLang language, LiteScript programs, `litec` compiler, `literun` runtime, and the version/proposal policy.
- [Optional leading separators for expressions, additive chains, patterns, and unions](docs/leading-separators.md)
- [Tuple types, array tails, and fixed-size inference](docs/tuple-array-shapes.md)
- [Logical tuple unpacking](docs/tuple-unpacking.md): emit labeled fixed items and tail elements, then reconstruct under the destination contract.
- [External references](docs/references.md)
- [Documentation review backlog](TASKS.md): historical 2026-10-23 snapshot; current rules are in the decision ledger.
- [Backlog by topic](ISSUES-BY-TOPIC.md): topic-grouped view of the same snapshot.

Each concept has its own document containing its purpose, working syntax, examples, constraints, and unresolved details. Earlier alternatives are retained only when they explain a decision or an outstanding choice.
