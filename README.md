# Lite

**Lite is light.**

**Lite** is the project. **LiteLang** is its language; a **LiteScript** is one of its programs. Lightness is what the whole thing is meant to be, in every sense the word carries here: fast native execution and low runtime weight, small runtime support and small final executables, and code that is easy to reason about, read, maintain, learn, teach, and distribute. The project keeps ceremony low, makes consequential behavior explicit, and lets people and programming agents focus on problem solving. Ordinary native programs should not require a VM or tracing garbage collector; memory-management and backend mechanisms remain open. See [name origin](docs/versioning-and-naming.md#name-origin).

**Start with [your first program](docs/start-here.md)**, then follow the
[short language tour](docs/tour.md) or browse the [reference](docs/README.md).
Read the [white paper](docs/white-paper.md) for philosophy and design criteria.

The Lite-written compiler now supplies the generated **T11** TS igniter. Compile
programs and execute their artifacts with Node 26.13.0:

```sh
./lite compile examples/001-double-sum.lts > /tmp/lite-example.ts
node compiler/entry.ts /tmp/lite-example.ts
./lite check examples/001-double-sum.lts
```

Enter `7` and `5` to print `24` after the explicit prompts. `check` compiles and
strictly checks the artifact without executing program effects. Public `run` is
removed for this migration; C output and native self-hosting resume afterward.
The generated compiler rebuilds its Lite source through its preserved seed,
with source/builder identities and fixed-point evidence in the
[bootstrap guide](compiler/bootstrap/README.md). No T00 fallback is used by
public compilation or checking.

The generated compiler still accepts a subset of the existing language. The
[current inventory](compiler/reports/current-t00-t11-inventory.md) records
112/172 matching source cases, with 60 remaining failures. T00 stays available
as an explicit reference while the remaining TS ports land. Default tests and
routine build, self-build, corpus and benchmark commands already use generated TS.
Verification now defaults to TS artifacts and reports its unsupported cases.
The [transition plan](compiler/transition-plan.md) tracks retirement separately
from the later C work. Language implementation belongs in Lite; small host,
platform and test adapters may use TypeScript under the
[source-file policy](docs/tooling-source-policy.md). The wider language remains
a design draft.

Tool entry points follow one naming matrix: compiler `./ltc`, `./litec` or
`./lite compile`; checker `./lite check`. Execute TS artifacts with
`node compiler/entry.ts program.ts [argument ...]`. Linker
(`./ltl`/`./lite link`) and formatter (`./lite fmt`) names are reserved but not
implemented. The verifier is `./lite verify`; the tester is `./lite test`; docs
are `./lite docs`; help is `./lite help`. See
[tool naming](docs/versioning-and-naming.md#1-canonical-names).

- [Language documentation and reading order](docs/README.md)
- [Numbered runnable examples](examples/README.md): small language demonstrations shared by the interpreter and editor tooling.
- [Lite compiler prototype](compiler/README.md): shared front-end and TS/C backends, run with `./ltc`, `./litec`, or `./lite compile`.
- [Compiler development guidelines](.agents/rules/compiler-development.md): Lite source implementation, multiple focused and combined-feature tests, flagged investigations, and verified generated-igniter support before compiler-source adoption.
- [Verification cases](verifications/README.md): feature contracts and artifact manifests, run with `./lite verify`.
- [Small VS Code highlighter](editors/vscode/README.md): local Lite highlighting for `.lt` and `.lts` files, with an installable VSIX and no extension runtime code.
- [Source file kinds](docs/modules-and-packages.md#distinct-script-and-module-files): convenient `.lts` scripts and explicit `.lt` module files; module files have no implicit imports, and standard module providers are intended to be replaceable.
- [Principles and goals](docs/principles.md)
- [First working targets](docs/principles.md#first-working-targets): the interpreter and restricted TS/C emission prototypes now run; practical scripts and broader compiled subsets follow.
- [Igniter and target direction](docs/tooling-and-learning.md#typescript-igniter-and-early-self-hosting): readable permanent TS igniter, maintained TS/web and C/native export targets, and overlapping igniter/self-hosted development. Full self-rebuild and AS/Wasm compatibility remain open.
- [Bootstrap and self-hosting plan](docs/bootstrap-plan.md): staged compiler-bootstrap defaults, igniter tooling, shared library layers, gates and agent workflow; implementation plan, not a language/std decision.
- [Igniter releases](docs/release-automation.md): tag-triggered GitHub releases with complete igniter sources, libraries, generated C, native program builds and rebuild instructions.
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
- [External references](docs/references.md): 17 project reference languages provide selective inspiration; individual features and design decisions are evaluated on their own. Older comparisons retain their stated coverage.
- [Documentation review backlog](TASKS.md): historical 2026-10-23 snapshot; current rules are in the decision ledger.
- [Backlog by topic](ISSUES-BY-TOPIC.md): topic-grouped view of the same snapshot.
- [Investigation catalog for agents and developers](investigations/README.md): 75 topic briefs outside the language draft, scoped starter subtopics, starting references, and a reusable investigation-note template. This is an inventory, not a roadmap or a set of language decisions.

Each concept has its own document containing its purpose, working syntax, examples, constraints, and unresolved details. Earlier alternatives are retained only when they explain a decision or an outstanding choice.
