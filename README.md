# Lite

**Lite is light.**

**Lite** is the project. **LiteLang** is its language; a **LiteScript** is one of its programs. Lightness is what the whole thing is meant to be, in every sense the word carries here: fast native execution and low runtime weight, small runtime support and small final executables, and code that is easy to reason about, read, maintain, learn, teach, and distribute. The project keeps ceremony low, makes consequential behavior explicit, and lets people and programming agents focus on problem solving. Ordinary native programs should not require a VM or tracing garbage collector; memory-management and backend mechanisms remain open. See [name origin](docs/versioning-and-naming.md#name-origin).

**Start with [your first program](docs/start-here.md)**, then follow the
[short language tour](docs/tour.md) or browse the [reference](docs/README.md).
Read the [white paper](docs/white-paper.md) for philosophy and design criteria.

The Lite-written compiler now supplies the generated **T12** TS igniter. Run a
script, or compile it and execute the artifact, with Node 26.13.0:

```sh
./bin/lite run language/examples/001-double-sum.lts
./bin/lite compile language/examples/001-double-sum.lts > /tmp/lite-example.ts
node compiler/entry.ts /tmp/lite-example.ts
./bin/lite check language/examples/001-double-sum.lts
```

Enter `7` and `5` to print `24` after the explicit prompts. `run` compiles to a
temporary artifact, executes it and forwards arguments, streams and status;
`check` compiles and strictly checks without executing program effects. C output
and native self-hosting resume afterward.
The generated compiler rebuilds its Lite source through its preserved seed,
with source/builder identities and fixed-point evidence in the
[bootstrap guide](compiler/bootstrap/README.md). No T00 fallback is used by
public compilation or checking.

## Repository layout

- `bin/` contains executable command links. `lite` routes project commands;
  `lite-compile` routes compiler targets.
- `compiler/` and `lib/` contain compiler and shared-language sources. Tracked
  bootstrap seeds stay in `compiler/bootstrap/`; checked-in compiler references
  stay in `compiler/tests/references/generated/`.
- `language/` groups semantic cases, runnable examples, learning samples and
  verifications. Tooling-only cases live in `tools/cases/`.
- `research/investigations/` contains design and implementation investigations.
- `benchmark/` contains compiler measurements and the separate
  `benchmark/challenges/` corpus.
- `dist/` is ignored and holds generated builds, caches, ladders and release output.

The generated compiler still accepts a subset of the existing language. The
archived [T00/T12 inventory](compiler/reports/current-t00-t11-inventory.md)
records 112/173 matching source cases, with 61 remaining rejections. The
handwritten implementation and active reference routes have been retired.
Tests, build, self-build, corpus, verification and benchmark commands use
generated TS. The [transition plan](compiler/transition-plan.md) tracks the next
compiler-stage and language-growth work separately from later C work. Language
implementation belongs in Lite; small host,
platform and test adapters may use TypeScript under the
[source-file policy](docs/tooling-source-policy.md). The wider language remains
a design draft.

Tool entry points follow one naming matrix: compiler router `./bin/lite-compile`,
TypeScript backend `./bin/lite-compile-ts`, C backend slot `./bin/lite-compile-c`,
or routed alias `./bin/lite compile`; runner `./bin/lite run`;
checker `./bin/lite check`. The `lite` command only routes to standalone operation
commands such as `lite-verify` and `lite-doctor`. Execute TS
artifacts with `node compiler/entry.ts program.ts [argument ...]`. Linker
(`./ltl`/`./bin/lite link`) and formatter (`./bin/lite fmt`) names are reserved but not
implemented. The verifier is `./bin/lite verify`; the tester is `./bin/lite test`; docs
are `./bin/lite docs`; help is `./bin/lite help`. See
[tool naming](docs/versioning-and-naming.md#1-canonical-names).

Commands also live under `bin/`. Use `./bin/lite docs QUERY` to search documentation
offline, `./bin/lite doctor` for repository checks, `./bin/lite test --cases` for
declarative command/program cases, and `./bin/lite release OUTPUT` for an unpublished
source snapshot. `./bin/lite check FILE` remains source checking.
`./bin/lite test` runs the short smoke suite; `--fast` runs the generated regression
suite without full-source sweeps, and `--full` runs every regression used by CI.

- [Language documentation and reading order](docs/README.md)
- [Numbered runnable examples](language/examples/README.md): small language demonstrations shared by the interpreter and editor tooling.
- [Lite compiler prototype](compiler/README.md): shared front-end and TS/C backends, run with `./bin/lite-compile`, `./bin/lite-compile-ts`, or `./bin/lite compile`.
- [Compiler development guidelines](.agents/rules/compiler-development.md): Lite source implementation, multiple focused and combined-feature tests, flagged investigations, and verified generated-igniter support before compiler-source adoption.
- [Verification cases](language/verifications/README.md): feature contracts and artifact manifests, run with `./bin/lite verify`.
- [Small VS Code highlighter](editors/vscode/README.md): local Lite highlighting for `.lt` and `.lts` files, with an installable VSIX and no extension runtime code.
- [Source file kinds](docs/modules-and-packages.md#distinct-script-and-module-files): convenient `.lts` scripts and explicit `.lt` module files; module files have no implicit imports, and standard module providers are intended to be replaceable.
- [Principles and goals](docs/principles.md)
- [First working targets](docs/principles.md#first-working-targets): the interpreter and restricted TS/C emission prototypes now run; practical scripts and broader compiled subsets follow.
- [Igniter and target direction](docs/tooling-and-learning.md#typescript-igniter-and-early-self-hosting): readable permanent TS igniter, maintained TS/web and C/native export targets, and overlapping igniter/self-hosted development. Full self-rebuild and AS/Wasm compatibility remain open.
- [Bootstrap and self-hosting plan](docs/bootstrap-plan.md): staged compiler-bootstrap defaults, igniter tooling, shared library layers, gates and agent workflow; implementation plan, not a language/std decision.
- [Component releases](docs/release-automation.md): independent annotated tags, component readiness gates, complete sources and generated bootstrap evidence; native packaging remains deferred.
- [Lightweight native execution](docs/memory-and-performance.md#lightweight-native-execution-priority): selected priorities, proposed compiler/memory direction, and [focused investigation points](research/investigations/lightweight-native-execution.md).
- [Continuity and analogical coherence](docs/continuity-and-analogy.md): design-method principle for local predictability and visible semantic boundaries.
- [Current decisions and open questions](docs/decisions-and-open-questions.md)
- [Provisional grammar sketch](docs/grammar-sketch.md)
- [LiteLang current design specification](docs/spec/README.md): stable-ID summary of selected rules, subordinate to the normative pages.
- [Accepted and unreleased proposals](docs/proposals/README.md): LP IDs, revisions, selected contracts, and release boundaries.
- [Naming and versioning](docs/versioning-and-naming.md): `lite` project, LiteLang language, LiteScript programs, `lite-compile` compiler, `literun` runtime, and the version/proposal policy.
- [Optional leading separators for expressions, additive chains, patterns, and unions](docs/leading-separators.md)
- [Tuple types, array tails, and fixed-size inference](docs/tuple-array-shapes.md)
- [Logical tuple unpacking](docs/tuple-unpacking.md): emit labeled fixed items and tail elements, then reconstruct under the destination contract.
- [Multilingual source and learning](docs/multilingual-source-and-learning.md): proposed familiar-language entry to programming, simple-English reference presentation, and [investigation points](research/investigations/multilingual-source-and-learning.md).
- [External references](docs/references.md): 17 project reference languages provide selective inspiration; individual features and design decisions are evaluated on their own. Older comparisons retain their stated coverage.
- [Documentation review backlog](TASKS.md): historical 2026-10-23 snapshot; current rules are in the decision ledger.
- [Backlog by topic](ISSUES-BY-TOPIC.md): topic-grouped view of the same snapshot.
- [Investigation catalog for agents and developers](research/investigations/README.md): 75 topic briefs outside the language draft, scoped starter subtopics, starting references, and a reusable investigation-note template. This is an inventory, not a roadmap or a set of language decisions.

Each concept has its own document containing its purpose, working syntax, examples, constraints, and unresolved details. Earlier alternatives are retained only when they explain a decision or an outstanding choice.
