# Tooling and learning

Status: **official formatter required; compact/multiline presentation, unchanged malformed files, idempotence, verification before writing, and read-only --check mode selected 2026-10-25; broader toolchain and teaching approach proposed**.

## Purpose

Students should spend their early effort understanding programs rather than choosing build tools or interpreting parser jargon.

## Small VS Code highlighter

Requested and implemented **2026-10-31**: a local declarative
[Lite extension](../editors/vscode/README.md) recognizes .lt/.lts files and colors
existing lexical forms using the editor's theme. It includes nested/raw comments,
multiline strings, basic numbers, keywords/operators, type names and ordinary calls.
It has no extension runtime, formatter, runner or language server. Colorization is
approximate and does not validate code, choose open grammar rules, or approve
experimental builtins. See [INV-072 evidence](../investigations/INV-072-vscode-highlighter.md).

## FVP direction

The [selected first working targets](principles.md#first-working-targets) call
for a tiny executable demonstrator before practical scripting. A small interpreter
is selected for the FVP, with TypeScript/Node as the minimal igniter and early LiteLang
self-hosting selected below. The user-requested ./lite run launcher is recorded below. Temporary input/reporting
helper names are selected below; their detailed contracts remain open.

## FVP interpreter

### Root run launcher

Requested and implemented **2026-10-31**: use
`./lite run examples/006-fixed-tuples.lts` from the project root. The executable
[lite](../lite) command now links to the executable TypeScript
[`igniter/launcher.ts`](../igniter/launcher.ts), which forwards to the igniter through
node from PATH. It resolves the implementation from its own location, preserves
caller-relative source paths, arguments, stdin, output and exit status, and also
forwards the existing run --check form. No language syntax, builtin, compilation
backend or installed-command mechanism is added. Strict checking and all 63
interpreter test groups pass; see [INV-004 evidence](../investigations/INV-004-fvp-execution-path.md#root-shebang-launcher-2026-10-31).

### Interpreter direction

Selected **2026-10-30**: use a small interpreter for the first viable product.
Read one source file, parse and check the supported subset, then execute it with
the temporary input/report/exit helpers. Preserve selected evaluation, binding,
type, copy, failure, and cleanup rules for every supported feature; diagnose
unsupported features clearly. This is a bounded experimental execution path.

Native compilation remains a later language/deployment goal, not a requirement
for this first runnable FVP. Do not require both interpreted and native paths,
caching, a JIT/bytecode engine, a full debugger, or module/package machinery to
deliver this slice. TypeScript/Node hosts the minimal igniter; TypeScript emission is now also selected for early self-hosting and maintained web output. Concrete
internal structure, numeric/text details, and remaining helper contracts are open.
The first narrow checkpoint is now implemented in [igniter/](../igniter/README.md);
this is not a complete language implementation or a native performance result.

### First executable checkpoint

Selected **2026-10-30**: start with one ordered source file, comments/separators,
integer/floating/text values, inferred := bindings and reads, var bindings and =
replacement, + - * / with unary minus and parentheses, and the temporary
input/report/exit helper calls. Preserve selected shadowing, type, copy,
evaluation, and division rules for supported forms. Parse/check before execution
and clearly diagnose unsupported features or invalid names/types/replacement.

The first end-to-end probe reads 7 and 5, computes their sum in a var binding,
replaces it with twice the sum, and explicitly reports the value 24. Removing
the report leaves no requested program output; unhandled input faults fail the
run. This is an acceptance target, not an executed test.

Add conditionals/Boolean expressions, loops, user-defined functions, tuples and
destructuring, and richer types in subsequent increments; their relative order
is open. The checkpoint is not the final FVP feature ceiling or a requirement
to finish all 001–020 exercises first. Numeric/text details and helper contracts
are documented provisionally in the implemented [igniter](../igniter/README.md).
The broad language contract remains a draft.
See [INV-002.02](../investigations/INV-002-02-fvp-first-runnable-slice.md#selected-first-runnable-slice).

Implementation increment, 2026-10-30: the igniter now also supports Boolean
values/logic, scalar comparison chains, basic conditionals, and scoped block
values. Value branches currently need matching result types; partial conditionals
are supported only as actions. Union results, guarded initializers/assignments,
pattern conditions, completion/cleanup hooks, loops, and user functions remained
unsupported at that checkpoint. See [implemented conditions](../igniter/README.md#conditions-and-block-values)
and [INV-015 evidence](../investigations/INV-015-igniter-boolean-conditionals.md).

The following increment adds [action loops](../igniter/README.md#action-loops):
Boolean-condition and unconditional loop bodies, bare break/continue, and scoped
locals reinitialized on each entry. It preserves header reevaluation and
innermost targeting. Loop values/metadata, iterables, tagged/payload exits and
then/finally remain unsupported. Strict checking and all 30 test groups pass;
[INV-035](../investigations/INV-035-igniter-action-loops.md) records the evidence.

The next increment implements [typed scalar functions](../igniter/README.md#typed-user-functions),
positional calls, tail/explicit returns, own-name and self(...) recursion, with
separate call environments. Tests preserve callee/argument order, lexical/live
helper reads, and return/loop boundaries. General captures, later helper lookup,
inference, wider argument routing, and callable inputs/results remain unsupported.
The factorial CLI reports 120 for 5; strict checking and all 43 test groups pass.
See [INV-030](../investigations/INV-030-igniter-functions.md). This is another
bounded step toward the Lite-written compiler, not a self-hosting result.

The next implemented experiment adds computed String concatenation and temporary
textLength/textAt/textSlice helpers, demonstrated by a Lite-written arithmetic
tokenizer. Its code-point positions, half-open intervals and terminal bounds
faults are provisional host behavior; full Unicode/text policy remains open.
Strict checking and all 52 test groups pass, including the real CLI and Unicode/
empty/bounds cases. See [text-helper coverage](../igniter/README.md#temporary-text-operations)
and [INV-016](../investigations/INV-016-igniter-text-operations.md). This is a
scanning experiment, not the Lite lexer or a compiler bootstrap stage.
The new helpers were initially introduced without explicit consent; the user
subsequently approves their exact temporary FVP scope on 2026-10-31 after review.
The alpha.15 retained-token example now uses these approved helpers and lists.
Strict checking and 122 interpreter groups pass; broader text policy stays open.
Follow the [explicit-consent rule](../investigations/README.md#explicit-consent-for-language-changes)
before adding syntax/features, even for temporary scaffolding.

The user-approved **2026-10-31** increment adds flat fixed tuples of existing
scalars, literal positional reads, declaration destructuring and explicit tuple
function inputs/results, using already selected syntax. The runnable example is
[006-fixed-tuples.lts](../examples/006-fixed-tuples.lts). Strict checking and all
62 interpreter test groups pass. Named/nested/rest tuples, mutation/access grants,
tuple reporting and native layout remain unsupported. Text helpers were
separately approved for their temporary FVP scope on 2026-10-31. See [INV-022](../investigations/INV-022-fvp-fixed-tuples.md)
and [implemented tuple coverage](../igniter/README.md#flat-fixed-tuples).

The following named-field increment implements existing flat fully named tuple
values, =name shorthand, field reads, named function tuple annotations and
label-sensitive stored transfers. The [008 example](../examples/008-named-tuples.lts)
runs with ./lite run; strict checking and all 79 interpreter test groups pass.
Broader tuple routing, named patterns, nested tuples and mutation
remain unimplemented. See [INV-022](../investigations/INV-022-fvp-named-tuples.md)
and [named-field coverage](../igniter/README.md#named-fixed-tuples).

The user-approved fixed-array increment adds nonempty homogeneous arrays of
scalars/flat tuples, indexed reads, exact [T; N] function inputs/results and
action traversal with optional as item. The [009 example](../examples/009-fixed-arrays.lts)
runs through ./lite run. Strict checking and all 93 interpreter test groups pass.
Empty construction, mixed-type inference, nested arrays, mutation/growth, views,
count helpers and native layout remain unimplemented; see
[INV-054](../investigations/INV-054-fvp-fixed-arrays.md) and
[array coverage](../igniter/README.md#fixed-arrays-and-traversal).

The selected [temporary numeric profile](numbers.md#temporary-fvp-numeric-profile)
uses checked signed 64-bit integers and one finite 64-bit binary floating family.
Division by zero and non-finite arithmetic results fault. Exact rounding,
promotions/literal details and text profile remain open. TypeScript/Node is the selected igniter.

**FVP scope correction, 2026-10-30:** basic quoted text and the temporary
inputLine/inputWord/report helpers are enough to begin. Use a simple temporary
implementation and define concrete behavior as examples require it. The detailed
[text-profile proposal](../investigations/INV-016-01-fvp-text-profile.md#fvp-scope-correction-2026-10-30)
is deferred and unselected; detailed encoding/Unicode, escape coverage, and
mixed-input rules are not prerequisites for starting the interpreter. Existing
input-fault and explicit-output selections still apply. Record supported
behavior and limitations without presenting host defaults as permanent language
semantics.

The next INV-022 increment implements already selected interleaved named/unnamed
flat tuples, including mixed annotations, copies and array elements. Strict
checking and all 97 interpreter groups pass; see
[the evidence](../investigations/INV-022-fvp-mixed-tuples.md).

Explicit typed receiving declarations can now relabel stored flat scalar tuples
by position with exact shape/types. Ordinary transfers remain label-sensitive;
fresh-constructor routing stays unimplemented. Strict checking and 102 groups
pass; see [INV-022 evidence](../investigations/INV-022-fvp-label-conversion.md).

The INV-031 increment implements existing fixed-slot named user-function calls,
including shorthand and positional replacement, without defaults/spread or new
builtin labels. Strict checking and 108 interpreter groups pass, including
source-order effects and callee selection; see
[bounded evidence](../investigations/INV-031-fvp-named-calls.md).

The user-approved INV-055 slice adds builtin List<T> typed construction, ordinary
sequence copies, readable indexing/traversal and four explicit mut end operations.
Strict checking and 120 interpreter groups pass, including real launcher/check-only
execution of 013; editor checks include List highlighting. General generics,
capacity, views, user-function mutation grants and recovery remain outside the
increment. See [bounded evidence](../investigations/INV-055-fvp-list-slice.md).

The next application-only increment, [016](../examples/016-integer-calculator.lts),
implements a recursive integer arithmetic parser/evaluator in Lite, using retained
token lists and value/position tuple results. It runs on the preserved alpha.15
interpreter without host feature changes. Strict checking and 125 groups pass;
see [INV-061 evidence](../investigations/INV-061-lite-arithmetic-front-end.md).
This produces a calculated result, not a compiler artifact or self-hosted stage.

The first emitted-code milestone (originally example 017) is now
[the TS emitter](../compiler/ts-emitter.lts). It compiles one signed-decimal
report into readable TS. Nine admitted programs have
raw stdout/stderr/status parity against the igniter and direct TS/translated JS
execution. Strict checking and 130 interpreter groups pass; the Node-free core
and visible adapter have separate checks. This is not compiler self-hosting or
browser/Wasm execution. See [emission evidence](../investigations/INV-061-ts-emission-and-parity.md).

The selected C target now has a matching restricted
[C emitter](../compiler/c-emitter.lts).
Nine emitted native programs, their TS equivalents and the igniter have equal raw
stdout/stderr/status. Strict checking and 132 groups pass; the native test ran
with the local C compiler and skips explicitly if unavailable elsewhere. This is
first native output for the restricted class, not library export or self-hosting.
See [C evidence](../investigations/INV-061-c-emission-and-parity.md).

The restricted TS/C emitters subsequently adopt approved inputAll() for complete
source, with multi-line whitespace and rejection of later unsupported source
before any artifact. Twelve admitted cases retain byte/status parity; strict
checking and 139 interpreter groups pass. See
[whole-source evidence](../investigations/INV-061-whole-source-emission.md).

The compiler applications subsequently adopt inputArgs for an optional explicit
logical source name. Exact names prefix their own rejection diagnostics, while
valid artifact bytes stay unchanged and extra arguments fail before reads.
Strict checking and 147 groups pass; generated runtime fault locations remain
separate. See [context evidence](../investigations/INV-061-compiler-source-context.md).

Both compiler applications subsequently advance to sequence arbitrary `report(integer);`
statements across the whole input without language extensions. Emitted TS and native C
preserve exact byte/status parity across 15 admitted programs. Strict checking and 148
groups pass. See [statement sequencing evidence](../investigations/INV-061-statement-sequencing.md).

They then admit left-associative `+ - * /`, parentheses, unary signs and immutable
`x := <expression>;` locals. Expressions are checked in signed 64-bit at compile
time and lowered to runtime TypeScript BigInt or C `int64_t`; reports use BigInt
formatting or `printf` with `PRId64`, and collision-prone local names receive a
`lite_` runtime prefix. The 28-case arithmetic/local corpus has byte/status/signal
parity across emitted TS, translated JS, native C and the igniter; strict checking
and 153 groups passed. Range faults and division by zero are compile-time
rejections, not emitted runtime panic parity. See
[arithmetic/local evidence](../investigations/INV-061-arithmetic-and-locals-emission.md).

They now also admit String literals/escapes, immutable String locals, String `+`
concatenation and multi-value reports over Int/String values. Constant String
expressions fold at compile time, while dynamic concatenation lowers to TS `+`
or a checked C byte-copy helper; emitted TS/C literals escape
quotes, backslashes, control whitespace and, for C, trigraph-prone `?`. Compiler
verification data moved to `igniter/tests/compiler/`: 53 program cases and 39
rejection cases, each pairing a sibling `.lts` entry source with a JSON model
holding a `source` object (`file`/`text`/`bytes` plus `hash`) and `cases[]`
(each case has optional `stdin`/`stdout`/`stderr` and required `exitCode`; each
stream uses `text`/`bytes`/`file` plus `hash`). Filenames follow
`NNN-MMM-title-subtitle.json`
(category 001 program, 002 rejection). Program cases pass four-way parity and
rejection cases pass exact diagnostics through both compilers. Strict checking
and 234 groups pass. Text operations/indexing, NUL handling, runtime input and
self-rebuild remain open. See
[String/report evidence](../investigations/INV-061-string-and-multi-value-reports.md)
and the [fixture schema](../igniter/tests/README.md).

Current CLI entry points are `./lite run`, `./lite check`, `./lite compile`,
`./lite verify`, `./lite test`, `./lite docs` and `./lite help`; compiler aliases
are `./ltc` and `./litec`. Linker and formatter names are reserved but
unimplemented. See [tool naming](versioning-and-naming.md#1-canonical-names).

Feature and artifact verification lives in `verifications/`; `./lite verify`
runs cases affected by git changes, while `./lite verify --all` runs all 26
feature cases and all 39 artifact manifests. Eight feature cases also execute
through the restricted TS and C compiler targets. `--update`, `--coverage`,
`--filter`, `--shard i/n`, `--no-cache` and `--quiet` remain available. Passing
cases are cached. `./lite test --fast` runs unit/interpreter/verification without
native C; `./lite test` or `./lite test --full` runs the full local gate with
cached native builds. See the [verification guide](../verifications/README.md).

The compiler implementation now lives in
[`compiler/`](../compiler/README.md), not in runnable examples. Its source is
split under `compiler/src/` and assembled by ordered manifests: L0 libraries,
target literal encoders, shared front-end, target emitter and target driver.
`litec` enters through [`compiler/cli.ts`](../compiler/cli.ts): TS uses the
verified T11 seed/current Lite compiler, and C uses its Lite emitter compiled by
T11 into a TS-hosted compiler. The old
[`igniter/bundle-cli.ts`](../igniter/bundle-cli.ts) remains an explicit reference
path. There is no module/import
syntax, and compiler source no longer uses `importFlatAll`. Access is
`./litec --target ts|c file.lts`, `./lite compile ...`, or the short `./ltc`
command. This removes the duplicated parser/checker while keeping separate
target backends.

## Refreshing artifacts after a language change

When a language feature lands, audit the existing examples and samples before
calling the increment complete:

- Search for workarounds the new feature replaces, such as manual encodings,
  type-annotation-only constructions, or extra helper code.
- Rewrite an artifact only when the new form is clearer and still teaches the
  same lesson.
- Do **not** rewrite an artifact whose purpose is to demonstrate the replaced
  construct. For example, the decisions example intentionally shows `if`/`else`,
  and the calculator intentionally shows a hand-written parser.
- Refresh manifest source hashes and expected streams with `--update`, then run
  the full verification and coverage gates.
- Keep feature contracts separate: examples and samples are verified consumers,
  not the feature contract.

Audit 2026-11-01: the current examples and samples were checked for workarounds
superseded by subjectless `match`, power, floor/compound operators and inferred
`mut`. No artifact needed rewriting; the affected examples either explicitly
demonstrate the old construct or use annotations that remain necessary for
empty/typed list construction.

## TypeScript igniter and early self-hosting

Selected direction **2026-10-30**: TypeScript/Node is only the minimal, disposable
**igniter** for the experimental interpreter. Run erasable TypeScript directly
with Node, without building a lasting framework or general compiler infrastructure.
The earlier Python choice is superseded. Move compiler development into LiteLang as soon as the supported
language is sufficient to implement its compiler. Keep the selected first
executable checkpoint small; a complete self-hosted compiler is not its gate.

Clarified **2026-10-31**: first emit readable, tightly checked TypeScript to move
compiler development into Lite sooner. Keep the igniter active as a reference
and fallback during the transition, until the self-hosted path is satisfactory.
Retire handwritten igniter development after that evidence is sufficient; retain
a permanent shippable readable TS bootstrap, source provenance and fixed tags.
TypeScript remains an important maintained web target, while C is the selected
first native target and a maintained library/project export and migration path.
Possible AssemblyScript/early Wasm support needs its own compatibility checks.
Update **2026-11-02**: T11/T12 are recorded byte-identical for the bootstrap
subset, and the owner approved the [transition](../compiler/transition-plan.md)
to T11 as the default TS compiler, followed by C host migration, existing-feature
parity, native self-hosting and eventual T00 retirement. The readable generated
TS seed is shipped with exact source/builder hashes; the original T00 route and
published tags remain preserved. Default TS and C compilation have no automatic T00
fallback. T13, native C fixed points and full existing-feature parity remain
unverified. The staged
implementation route, agent gates and definition of done are in the
[bootstrap and self-hosting plan](bootstrap-plan.md); it records implementation
defaults without selecting new language, module or std rules.

The selected [bootstrap version-control rule](versioning-and-naming.md#bootstrap-source-continuity)
requires stable milestone tags tied to exact commits and a recorded map of which
builder/source revisions work together. Retain the igniter and required source
history; verify the full build chain rather than treating tags alone as proof.

Selected target route, with concrete self-rebuild stages still open:

```text
preserved TypeScript/Node igniter -> Lite-written compiler -> readable TS output
  -> TS-hosted compiler development, with overlapping igniter validation
  -> reproducible self-hosted stages and preserved TS bootstrap snapshots
C: first native target and maintained project/library export path
AssemblyScript/Wasm: possible early route, compatibility investigation required
```

An interpreter can execute the first Lite-written compiler source; producing a
usable next-stage compiler still requires a defined output/backend and execution
path. Do not equate interpreting Lite with already compiling itself. The seed's
supported language subset, first compatible compiler revision, stage artifacts,
host dependencies, source/version compatibility, preservation and verification
of the chain, and rebuild reproducibility remain open under
[INV-061.06](../investigations/SUBTOPICS.md#inv-061-06). A direct igniter-to-latest
route is not promised if later compiler source uses newer language features.

This direction chooses Lite for compiler development, TS for the first emitted
bootstrap/web path and C as the first native/export target. It does not settle
the self-rebuild/retirement threshold, general runtime lowering, web adapters,
AS compatibility or C library ABI. Keep the igniter minimal. Safety here means
matching observable output bytes, status and effects for equivalent supported
programs/inputs, with readable auditable TS and reproducible provenance. Tests
provide bounded evidence, not a universal absence-of-Trojan proof. See
[INV-061 target/safety clarification](../investigations/INV-061-first-compiler-output.md).

The implementation pins Node 26.13.0 and TypeScript 7.0.2, checked against stable
releases on 2026-10-30. Execute the TS sources directly and run the separate strict
typecheck before accepting changes; Node's type stripping does not typecheck.
See the [igniter guide](../igniter/README.md) for commands, exact provisional
helper behavior, test evidence, and the first tagged-checkpoint identity.

An isolated [AS/Wasm probe](../investigations/INV-070-assemblyscript-report-probe.md)
now compiles the unchanged emitted report core with AssemblyScript 0.28.20 and
matches all 12 output/status cases through Wasm bindings. The compiler/tools are
installed only in a temporary directory; no project dependency or permanent AS
runtime/profile is selected. This does not block TS-first self-hosting or prove
general emitted-TS compatibility.

## Explicit output and tracing

The user-approved [INV-067 increment](../investigations/INV-067-fvp-script-arguments.md)
adds inputArgs(): List<String> and the invocation
./lite run [--check] file.lts [-- argument ...]. Preserve ordered host argument
Strings after the separator, excluding runner metadata. The helper produces no
output/prompt, consumes no stdin and returns ordinary copied values. Strict
checking and 145 interpreter groups plus 9 editor groups pass. Compiler use of
source identity remains a separate application step; no file/process API is added.

The approved compiler-input [INV-004 increment](../investigations/INV-004-fvp-whole-input.md)
adds inputAll() or inputAll(String prompt) for remaining stdin text through EOF,
with empty text at immediate EOF. The optional prompt follows inputInt: stdout,
no added newline, once before reading. Preserve lookahead, CR/LF and whitespace;
other helper EOF rules are unchanged. Strict checking and 138 interpreter groups
pass, plus 9 editor groups. This addresses source ingestion, not full compiler
syntax, files or processes.

Selected 2026-10-28: program output, value display, and execution tracing require
an explicit request. Evaluating an expression or completing a source file does
not automatically print its value. A final declaration or assignment does not
automatically display the initialized or assigned value either.

This applies to ordinary scripts, the tiny demonstrator, and playgrounds.
Observation can be requested through an explicit source operation or a
deliberately enabled inspection/tracing facility. Merely running in a playground
does not enable automatic display. Once explicitly enabled, a facility may report
the values or operations within its defined scope without a separate request for
every event. It must preserve the program's evaluation and execute it only as
specified, not evaluate expressions again merely to display them.

The user's tracing analogy motivates explicit activation; it does not select a
command name, flag, module, output API, formatting rule, or failure contract.
Compiler/runtime diagnostics and unused-value warnings retain their separate
policies. This selects observation intent, not a new checked effect system.

## Temporary FVP input and reporting

Selected **2026-10-30** for the tiny FVP: provide a minimal temporary/fake helper
surface named inputInt, inputFloat, inputLine, inputWord, report(...), and
reportError(...). These are demonstrator scaffolding to try language features,
not a settled standard-library API or a requirement to implement modules first.
The names may be supplied directly by the demonstrator for now; their eventual
module ownership, public API, and migration remain later work. This does not
introduce implicit imports into the deferred .lt module design.

Reaffirmed **2026-10-30**: this FVP scaffolding is to be cleaned up later.
The temporary input/report helpers, exit surface, and any experimental teaching
flags/marks may be removed or replaced as real facilities take shape. Do not
treat their names, fake implementations, or provisional behavior as a permanent
public API or require compatibility shims solely to preserve the scaffolding.
Teaching inspection remains a proposal; this clarification does not implement it.

The intended roles are integer input, floating input, a line of text, a word of
text, explicit ordinary reporting, and explicit error reporting. The trailing
ellipsis in the user's suggestion leaves room for later helpers; it does not
select a complete I/O library. That earlier notation alone did not choose a
variadic callable contract or a formatting language. The later bounded
prompt/report selection below now supplies concrete helper behavior.

Illustrative FVP use, not a complete executable contract:

```text
first := inputInt();
second := inputInt();
report(first + second);
```

Only the explicit calls request input/reporting. Ordinary bindings and file
completion remain silent; block results are unchanged. The temporary report
name replaces the earlier illustrative show name for FVP output. A separate
all/last-binding inspector is not required for this path.

Keep the remaining choices small and explicit before implementation: real
console input versus scripted/fixed test input; token/line consumption, numeric
parsing details; complete input/output signatures, supported
reported values, formatting/newlines and destinations. A successful reportError
call is now selected to report only, as specified below. The word fake selects temporary
scaffolding, not any particular mock-input values or transport. No stdout/stderr,
prompt, exception, or panic policy is selected by these names alone.
The [igniter guide](../igniter/README.md) records implemented helper behavior and
its limitations; it does not freeze the permanent API.

### Optional integer-input prompt and multiple report values

Explicitly requested and clarified **2026-10-31** before the pending named-tuple
increment: inputInt accepts zero arguments or one String prompt. When supplied,
evaluate it once, write its exact text to stdout without an added newline, then
read the integer. Invalid input or EOF still faults with no retry or repeated
prompt. This is an explicit output request, including when stdin is redirected.

report accepts one or more ordinary scalar/Unit values and flat fixed tuples.
Evaluate each once in written order before writing the report; join displayed
values with one space and append one newline. A first String is an ordinary
value, so an optional label needs no special recognition. No template
placeholders or formatting language are selected. Single-value reporting
retains its previous behavior.

Selected 2026-11-01: a tuple argument is displayed source-like from its static
type. A one-component tuple keeps its comma, `(1,)`; longer tuples separate
components with a comma and one space, `(1, 2)`. A named component is written
`label=value`, as in `(1, left=2, right=3, 4)`; an unnamed component has no
label. Unit remains `Unit`, so `()` in value position still displays as `Unit`.
No quoting, sorting, padding or nested formatting is introduced by this rule.

The user explicitly chooses ordinary multiple arguments only: ...values in the
request describes the helper's argument count, not source-level tuple call spread.
report() and call spread stay unsupported. Arrays, lists and callables remain
unreportable, and reportError keeps its single ordinary-value contract. This is
temporary FVP scaffolding, not a general variadic function implementation or a
permanent standard-library API.

The [007 example](../examples/007-prompts-and-report.lts) runs through ./lite run.
Strict checking and all 170 interpreter test groups pass, including effect order,
prompt/output failure, invalid input, pre-effect rejection and real CLI output.
See [INV-004 evidence](../investigations/INV-004-fvp-prompt-and-report-values.md).

### Temporary input failures

Selected **2026-10-30**: invalid input or EOF before a requested value is
available raises an input fault. If unhandled, report a clear diagnostic and
finish the run with nonzero status. Do not silently return 0/empty text or
automatically retry. An intentionally supplied empty line is a valid empty
string for inputLine(); EOF without a line is a failed read.

The policy applies to the temporary inputInt, inputFloat, inputLine, and inputWord
helpers. Their exact numeric grammar/ranges, whitespace/token/line consumption,
concrete fault category/transport, recovery support, and diagnostic/status code
remain open. Preserve selected recovery/cleanup semantics for any supported
features; no host exception, raw abort, or cleanup bypass is selected here. This
is disposable FVP scaffolding, not a permanent standard-library I/O contract.

## FVP completion and explicit exit

Selected **2026-10-30**:

- A successful reportError(...) call only reports its supplied values. It does
  not request termination or mark the run failed; execution may continue.
  Failures while performing the report retain their separate open I/O contract.
- Normal FVP completion maps to host success status 0. A rejected program or
  unhandled fatal execution failure maps to nonzero; exact failure codes and
  the complete unhandled-fault policy remain open. This host mapping is distinct
  from the script block's Unit result.
- exit(errCode?) is the explicit operation to end the current program run with
  an optional code. exit() and exit(1) illustrate omission and supplying a code;
  the question mark describes optionality, not a new call-site token. This is
  program termination, not a return from the nearest block/function. Ordinary
  continuation after a successfully reached termination does not execute.

For example, assuming successful reporting:

```text
reportError("Cannot continue");
exit(1);
report("Not reached");
```

The default code for exit(), code type/range and host conversion, cleanup/finally
and unwinding, buffering/flush behavior, argument-evaluation failures, embedded
host behavior, and interception by recovery remain open. The exit selection
does not choose hard-abort semantics or silently bypass selected cleanup rules.
Neither exit(0) as a default nor any special syntax/ABI is implied by omission.
Owner of the investigation: [INV-005](../investigations/INV-005-fvp-completion-and-reporting.md#report-only-and-explicit-exit-selection-2026-10-30).

## Optional teaching inspection

**Proposal, 2026-10-30:** the user suggests an explicitly enabled run flag that
reveals identifier bindings' final values, and marked inspection points in a
debugger style so students can examine their programs. These complement explicit
report/reportError calls; they do not change the file's result or enable an
automatic dump during ordinary execution. A full debugger is not an FVP gate.

- **Final binding view:** request a summary of bindings and their final values.
  Define whether all means user bindings, hidden/compiler-generated identifiers,
  module names, or some subset. Distinguish shadowed bindings and repeated
  function/loop activations. For scopes already exited, define whether to record
  a value when the scope ends rather than assume its storage still exists.
- **Marked points:** explicitly mark places to observe values visible there.
  Define whether a mark captures a snapshot or pauses execution, which bindings
  it includes, and how repeated visits appear. Stepping/breakpoints can be later
  extensions; none is required by the temporary input/reporting helpers.

Flag/mark spelling, source versus external marks, snapshot timing, failures,
value formatting, state retention and lifetime costs, and diagnostic destinations
remain open. Observation must not reevaluate the program's earlier expressions.
Keep inspection distinguishable from deliberate program reports; no particular
output stream or UI is selected. Inventory: [INV-072.05](../investigations/SUBTOPICS.md#inv-072-05).

## Formatter

```text
lite fmt
```

An official formatter is an established requirement. The command lite fmt and its read-only --check mode are selected; remaining argument syntax and file/configuration discovery rules remain open. It should choose one presentation and preserve meaning.

The formatter must not infer missing semicolons from line breaks, change final-expression results by adding separators, or modify literal string data. Repeated separators may be normalized because their count has no semantic role.

Its selected presentation omits optional semicolons after complete block/record items at every nesting depth, including function/lambda definitions and declarations with braced initializers. Keep necessary ordinary-item separators and enclosing call/list/tuple punctuation. Recognize complete syntax rather than deleting every semicolon after a brace character; import-list braces and proposed special delimiters have different roles. See the [semicolon style rule](lexical-structure.md#semicolon-style-after-closing-braces). This is a formatter requirement, not an implemented tool claim.

### Compact and multiline chains

Selected 2026-10-25: for chains with at least two real entries, the formatter omits the optional leader in a compact layout and includes a separator before every entry in a multiline layout. This applies to Boolean expressions/conditions, initial/nested pattern alternatives, and plain unions. It may add or remove the first separator as it expands or compacts a chain; source validity remains independent of this presentation choice.

Use the outer chain's operator under existing grouping: multiline a and b or c uses leading or and still means (a and b) or c. Pattern alternatives use or and union members use |. Only admitted complete-chain/group boundaries can receive a leader; an interior operator is not another prefix position. Surrounding multiline bodies or multiline content inside one entry do not alone trigger an outer leader. A singleton receives no automatic leader; explicit-singleton normalization, exact wrap width, and comment-aware line breaking remain open.

Preserve grouping, Bool requirements, evaluation/effects, binding flow, matching/guard behavior, type identity, comments, and required delimiters. Existing syntactic alternatives remain legal; malformed/type-invalid inputs must not be silently repaired by removing punctuation. See the [formatter presentation rule](leading-separators.md#formatter-presentation-selected) for examples and remaining boundaries. No formatter implementation is claimed.

## Comment neutrality and formatting selected

Comments are neutral to code parsing, so a commented-out entry does not count toward a chain's arity or choose its operator. Ali's ready := /* and authenticated */ and connected; remains a valid singleton initializer, as does the form with the comment deleted. This establishes source validity; it does not automatically pin the initializer to a vertical formatter layout.

Selected 2026-10-25: preserve ordinary/raw comment contents as opaque text and retain their attachment to the same nearby code. Indentation at a comment's source position and surrounding line breaks may change; do not parse or reflow the body as code or prose. Only real operands/patterns/members count when formatting chains. An apparent disabled condition is neither a phantom entry nor an implicit keep-multiline directive. See the [selected comment-formatting contract](comments.md#selected-formatting-contract).

The [formatter comparison](comment-formatting-research.md) covers Deno, Bun, Rustfmt, Dart/Flutter, and Prettier. Its versioned local probes and documentation findings remain comparison evidence, not an adoption of another tool's directives. Exact attachment/line-placement algorithms, explicit-singleton normalization, documentation-comment syntax, and any future formatting escape mechanism remain open. No LiteScript formatter implementation is claimed.

## Formatter stability and idempotence

Selected 2026-10-25: after a successful format, formatting the output again with the same formatter version and effective configuration must succeed and produce byte-for-byte identical source:

```text
fmt(fmt(source)) == fmt(source)
```

This is an equation describing the tool's output, not new LiteScript source syntax. Hold the formatter version and effective settings fixed for both passes. Changing the formatter version or settings may choose a different stable presentation; this rule does not freeze formatting across upgrades or configuration changes.

Leading separators, compact/multiline choices, indentation, line wrapping, comment placement/attachment, ordinary item separators, and final whitespace must not oscillate between layouts on successive passes. Preserve opaque comment contents and the other selected meaning-preservation contracts. Exact width, singleton-leader normalization, and attachment algorithms remain open, but their eventual rules must satisfy this requirement.

Idempotence is a required formatter conformance check: for each successful-format fixture, capture the first output, format it again under the same version/settings, require both passes to succeed, and compare the complete outputs. Cover compact/multiline and mixed chains, grouped/nested expressions, pattern alternatives/shared guards, plain unions, singletons, ordinary/raw comments, and semicolon boundaries. A failed or skipped second pass is not evidence of idempotence. This does not require full type checking before formatting; it is distinct from the separately selected --check mode, which compares source against verified formatted output without requiring an extra runtime formatting pass.

Malformed input retains the separate unchanged-file/failure contract below; it is not a successful formatting fixture. This selects a future conformance requirement, not an implemented formatter, an executed LiteScript check, or proof that all inputs satisfy it.

## Native build and footprint investigations

The selected [lightweight execution priorities](memory-and-performance.md#lightweight-native-execution-priority)
call for small runtime support and final executables alongside fast execution,
startup, and low memory overhead. Investigate tooling that explains retained
runtime facilities, dependency/section sizes, allocation sources, specialization,
and eliminated or remaining checks. Build reports should identify target,
optimization, linking, stripping, debug data, and optional services. Distinguish
executable bytes, required support bytes, and loaded memory; cached launch and
cold compilation need separate timings.

These are tooling investigation requirements, not selected command-line flags or
implemented reports. C and LLVM backends should eventually share behavioral
conformance cases if both are implemented. See [investigation points](../investigations/lightweight-native-execution.md).

## Verification before writing

Selected 2026-10-25: generate a file's proposed formatted output in memory, parse it again, and verify it against the original before writing the file or applying formatter edits to an editor buffer. Successful output parsing alone is not the complete check; require preservation of executable structure, source-imposed typing requirements, and the separate comment contract.

The verifier may account only for explicitly approved formatting differences, such as optional leading separators at admitted boundaries and redundant separators under their selected rules. Preserve grouping, item/body boundaries and tail results, operation order, binding scopes, and declared constraints. Do not erase a typing requirement during normalization: ready := and connected; requires Bool even for one operand, so dropping its leader cannot be accepted merely because an unprefixed connected parses as an expression. This does not select singleton-leader removal or a type-check-dependent formatter rewrite.

Check ordinary/raw comment contents and attachment to the same nearby code separately from executable structure. Parsing that structure without comments cannot establish preservation of opaque comment text or attachment. Permit the selected indentation/surrounding line-break changes while rejecting dropped or changed comment contents and attachment to unrelated code. The verifier must not parse a comment body as code to perform this check.

Write/apply the proposed output only after verification succeeds. If the generated output cannot parse, its checked structure or requirements differ, comment checks fail, or equivalence cannot be established, discard that proposed output and leave the entire affected file/buffer unchanged. Report a formatter-verification error rather than presenting a generated-output defect as an error in the user's original source. Continue processing other valid requested files, but return overall failure if any file fails verification; exact numeric exit codes remain open. This uses the same per-file preservation scope as malformed input, without rolling back other successfully formatted files.

No full compilation, name resolution, type checking, or execution is required by this check. The comparison must retain syntactically imposed constraints even when symbol types are unavailable. Exact comparison normal forms, attachment identity, approved-normalization implementation, diagnostic rendering, and write/editor protocols remain open. Do not claim a successful verification when the implementation cannot establish the required preservation.

Future formatter conformance must cover accepted approved rewrites and rejected generated-output changes, including lost singleton Bool requirements, regrouped/reordered operations, changed binding/item boundaries, and dropped/altered/reassociated comments. The separately selected idempotence check remains required as well. This is a formatter contract and future verification requirement, not an implemented checker or an executed LiteScript conformance result.

## Incomplete or malformed source

Selected 2026-10-25: when a file has a lexical or syntax error, lite fmt reports the problem and leaves that entire file unchanged. It does not partially rewrite valid-looking regions, drop unfinished tokens, or invent missing operands. This preserves unfinished work during ordinary editing.

Ali may temporarily have:

```text
ready :=
    and connected
    and
;
```

The formatter leaves the file as supplied and reports a focused diagnostic at the dangling operator/missing operand:

```text
Expected an operand after 'and'.
```

For a request containing several files, continue formatting the other valid files. At completion, report an overall failure status if any requested file failed to parse, even when other files were formatted successfully. Exact numeric exit codes remain open. This is per-file preservation, not an all-files rollback.

Format-on-save follows the same rule: apply no formatter text edits to an invalid buffer and surface its diagnostic. Normal editing/saving remains an editor operation; this formatter rule does not discard or repair the user's unfinished buffer.

This contract covers incomplete/malformed lexical syntax, including missing operands/braces or unterminated comments. It does not require full compilation, name resolution, or type checking before formatting syntactically valid source. The existing obligation to preserve meaning and not silently repair type-invalid code through punctuation changes remains. Diagnostic rendering, parser recovery internals, and precise editor protocol remain open; no formatter implementation is claimed.

## Read-only check mode for CI

Selected 2026-10-25:

```text
lite fmt --check
```

Check mode writes no files and applies no editor-buffer edits. It generates the same proposed output as normal formatting, in memory, using the same formatter version, effective configuration, presentation rules, parsing, and preservation verification. It does not substitute a weaker whitespace-only check or skip the separate comment/typing-requirement checks.

For each requested source file, compare the original bytes with the successfully verified formatted bytes. A matching file passes. A difference is reported as requiring formatting, identifying the affected file, while leaving it unchanged. Malformed source produces its source diagnostic; failed or unestablished output verification produces a formatter-verification error. Both failure kinds identify the affected file and preserve it.

Continue checking other requested valid files. Report overall success only when every requested file parses, verifies, and already matches the formatted output. Report overall failure if any file would change, cannot parse, or fails verification. Ordinary formatting may still rewrite other successfully verified files; --check never writes any files. This lets local formatting and CI enforcement share the same decisions and configuration.

The existing future two-pass idempotence conformance requirement remains independent; --check does not require a second format pass on every invocation. It adds no full-compilation or name/type-check prerequisite. Exact numeric exit codes, diagnostic/diff presentation, file/configuration discovery, and empty-selection behavior remain open. This is a selected command contract, not an implemented CLI or an executed CI result.

## Run and build proposals

The root run launcher is now implemented as `./lite run file.lts`, as recorded
[above](#root-run-launcher). Build/native caching and broader installed-CLI
behavior below remain proposals.

```text
lite run lesson.lts
lite build lesson.lts
```

One command should run a .lts script without requiring a package manifest.
Native compilation/caching is a proposal, not an implemented path. .lt source
retains its distinct module shape and explicit dependency names regardless of
which tool loads it. See [source kinds](modules-and-packages.md#distinct-script-and-module-files).

The user proposes a script-running mode such as lite run script.lts that could
introduce selected short aliases for module-owned facilities, with warning/log
disclosure. The convenience set, exact activation, diagnostic class/frequency/
channel, and build-mode behavior remain open. This is separate from program
output or result echo, which remain explicit. Imported .lt modules receive no
such implicit imports. Whether a .lts build has a matching explicit convenience
mode or requires explicit names remains an INV-004 parity question.

## Diagnostics

Prefer a concrete cause and action:

```text
Assignment cannot be used as a condition.
Use '==' to compare values.
```

```text
This binding is immutable.
Declare it with 'var' if reassignment is intended.
```

```text
The current conditional context has no field 'count'.
Use an explicitly named loop context such as '@users.count'.
```

Diagnostics should point to declaration and use sites when relevant. Recovery should avoid reporting a long chain of unrelated errors after one missing brace or separator.

## Explicit unused-name intent

Names such as _user and _left are ordinary readable names that opt out of unused-name warnings for that binding, parameter, receiver, or declared field. Later use is legal too; the convention means unused is allowed, not that use is prohibited. `_` alone is included: it binds normally, may be read, and permits nonuse. Repeated names within a pattern shadow in order, including repeated underscores. This naming intent does not suppress required-use/error-handling checks or unrelated diagnostics. Full warning severities and configuration remain open; see [explicitly allowed unused names](unused-name-intent.md).

## Gradual learning

Begin with literals, inferred bindings, calls, braces, separators, conditions, and simple loops. Then introduce binding reassignment through var, held-data updates through mut, functions, annotations, tuple patterns, optional values, explicit errors, loop values, tags, and packaging as needed. Teach the two permissions separately before combining them in inferred var mut user := expression; neither requires a type annotation. When annotations are introduced, teach user: mut User and var user: mut User as the canonical typed forms, keeping var with the binding and mut with its access-qualified type.

There should be one language rather than different semantics for a beginner mode. Full type and ownership contracts still need to work for advanced users.

Creating, passing, and traversing collections should precede vocabulary such as Iterable and Collection. The [collection-inference proposal](collection-inference.md) explores contextual element construction and omitted parameter annotations for simple functions, while [the reference review](collection-ergonomics-comparison.md) distinguishes these mechanisms from explicit generic declarations. Tooling should explain the required operation and element type before presenting advanced protocol details.

Indexed scripts should be equally direct: values[index] can establish the required operation for an inferred parameter, and local else recovery can avoid an escaping-error annotation. Report an unsupported argument as "This value does not support positional indexing" before explaining an advanced interface name. Inference must not hide materialization or caller mutation, or silently add undeclared escaping errors. See [inferred indexing](collection-inference.md#inferred-indexing-for-small-scripts).

The [access-ergonomics goal](slot-ergonomics.md) keeps mathematical summaries inferred. Teach var as storage replacement: local var creates a reassignable binding, while type-side var receives writable caller storage through an explicit var call grant. Mut separately permits data updates through an explicit mut grant. Local-only rebinding belongs inside the body rather than in public function headers. Describe rejected writes in terms of the actual field and replacement types; advanced summaries need not become mandatory beginner annotations.

## Explicit names versus editor convenience

The language should not silently inject `it`, `count`, or `acc`. An editor may suggest explicit receiver bindings or generate a snippet, leaving names visible and editable in source.

## Familiar-language source and an English bridge

The [multilingual source proposal](multilingual-source-and-learning.md) addresses
learning programming without first understanding English vocabulary. Investigate
localized lessons, names, teaching APIs, diagnostics, editor help/completions,
and source presentation together. Simple English remains the shared reference;
one language's semantics must hold across presentations. No source locale,
translation command, vocabulary pack, or translated keyword is selected.

Compare localized files with editor-only views. A syntax/symbol-aware conversion
would need source maps, reviewed changes, collision handling, stable public and
named-label identities, and behavior checks. Preserve comments and string data
unless separately requested; keyword mapping does not automatically translate
student names or arbitrary text. Ordinary formatting preserves the chosen source
vocabulary; conversion is a separate proposed operation and must preserve the
selected [comment contract](comments.md#selected-formatting-contract).

Investigate mixed-direction selection, punctuation, debugger positions, fonts,
normalization, and visible confusable/control-character handling without silently
rejecting a whole script. Localization catalogs should remain in tooling unless
program features require them at runtime. The [question map](../investigations/multilingual-source-and-learning.md)
records lexical, tooling, conversion, learning, and footprint checks.

## Beginner validation

Braces were chosen as a promising consistent rule, not as an empirically proven universal advantage over keywords. Future usability work should compare tracing execution, identifying branch ownership, repairing delimiters, and interpreting type errors. Small tasks can reveal problems before freezing the grammar.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Loop receivers](loop-receivers.md)
- [2013 syntax experiments](https://www.vidarholen.net/~vidar/An_Empirical_Investigation_into_Programming_Language_Syntax.pdf)
- [2023 syntax-intuitiveness replication](https://link.springer.com/article/10.1007/s11219-023-09631-7)

These studies motivate evaluating novice experience; they do not isolate LiteScript's brace syntax as already validated.

## Warning suppression

Selected [LP-0016 r1](proposals/LP-0016-recapture-and-warning-policy.md): every warning is suppressible. Suppression changes diagnostics, not source typing, evaluation, or failure behavior. Exact syntax/configuration/scope and warning defaults remain open. This does not make invalid code valid or downgrade required errors.

Recapture is legal. Do not warn solely because the output type is unchanged or its failure side already includes Panic. An optional redundancy warning requires proof that the boundary is redundant; a call returning stored T ! (E | Panic) can still produce a new live panic before returning. Intentional boundaries kept for code evolution must remain usable with suppression. There is no blanket warning or rejection for already-captured values.

## Capture and recovery presentation

The selected [capture/extraction reference](failure-capture-and-unwrapping.md) distinguishes exp? (capture before operand evaluation), outcome! (one-layer extraction or outward forwarding), and else (ordered consumption and recovery). Teach ordinary stored Results before mixed panic capture, then show T ! Panic and T ! (E | Panic), ...fails: Failure with [Failure], and exhaustive recovery yielding T. Do not teach the provisional Captured/FailureGroup wrapper as source syntax. Keep handler-local tags on their explicit block, and untangle confusing chains into temporary outcome layers without promising retroactive panic recovery across eager statements. LP-0012 now selects raise expression and eligible omitted-output escaping-error inference; custom category grammar and unmatched-remainder/provenance policy remain open. LP-0013 selects typed scalar first-match/discard, and LP-0014 selects scalar/group raise plus explicit block targets.

Future formatter/parser fixtures must distinguish postfix capture from the standalone ? storage initializer and the rejected ? propagation spelling, retain grouping in `({ work() })?`, and preserve written else order and block-tag targets. Existing semicolon rules apply: omit optional semicolons after complete braced items; retain separators for continued expressions such as parenthesized block capture. This is a documentation contract, not evidence of implemented parsing, formatting, or execution.


For [manual failures](manual-failures-and-inference.md), teach assumed explicit Error/Panic category membership before raise expression. Show the inferred authenticateUser error union, then show a Panic raise excluded from E and included only by explicit capture. Distinguish omitted-output inference from checking explicit/expected contracts. Future fixtures should cover normal-return/error-raise/panic-raise paths, ! and outward-tail error contributions, handled/local stored errors, nested callable boundaries, and local panic capture. Custom category source syntax remains open. Directed raise fixtures should now include function defaults for both channels, scalar/group operands, explicit block targets, skipped inner recovery, eligible target-level recovery, and unchanged cleanup; true unmatched-remainder exits still need their policy. The [shortfalls queue](failure-handling-shortfalls.md) records the next decisions; this remains a design-only specification.


For LP-0013, distinguish err: Error (first match exposed, other Error matches intentionally discarded) from ...errs: Error (all Error payloads exposed), with other categories untouched. For LP-0014, teach return/raise function defaults together, then tagged block completion and scalar/group operands. A bare manually raised Panic is now function-directed; local recovery requires an explicitly targeted block or caller-side capture. Future conformance fixtures should retain operand-evaluation order, skipped inner handlers, eligible recovery surrounding the completed target, cleanup obligations, and occurrence order. Untyped binding, aggregate .err inspection, and nonlocal exits with other pending categories remain in [the shortfalls list](failure-handling-shortfalls.md).


LP-0015 teaching/conformance direction: contrast ordinary guard return, catch-all early return, partial typed catch returning from the function, and handler-local tagged return. The partial handler's return 1 does not add Int to the recovery expression type; it exits before the result binding is initialized, even if other captured Error/Panic categories coexist. Only continuing paths have the residual type. Reject a return value that violates an explicit function success contract, not merely because abandoned captured failures remain. New payload/cleanup failures retain their usual behavior. Broader exit policies and general ignored-result diagnostics are separate; documentation checks are not implemented language execution.


Also contrast handler-local raise: tmp1 := op()? is T ! Panic; a receiverless else @bl2 { raise @bl2 err2 } consumes all original panics and gives tmp2: T ! Err2; tmp2! supplies T or forwards Err2. Keep this separate from an early function return that prevents its recovery binding from being initialized. See [the local-raise example](manual-failures-and-inference.md#handler-local-raise-changes-the-stored-outcome).


## Current captured-outcome teaching order

Teach plain array/arithmetic values with implicit panics before explicit capture. LP-0018 prohibits checked panic-effect signature lists: distinguish a literal first-class outcome return from a live-effect annotation, and do not teach the withdrawn fn(): T ! SpecialPanic1/plain-T-call interpretation. Documentary known-fault metadata is non-exhaustive and still exploratory. Capture exposes broad Panic while patterns reveal concrete categories.

Then teach LP-0016 recapture as a legal boundary supporting code evolution, followed by LP-0017 .err(e) versus .err(...es). Future conformance fixtures should preserve occurrences despite duplicate type normalization, distinguish unchanged types from redundant boundaries, keep nested successful Results intact, test scalar subpatterns against the first occurrence only, and verify source outcome preservation. All warnings are suppressible; no warning-control syntax is selected. Indexed collector capabilities, ownership, and runtime costs require separate verification. These documentation checks are not parser/typechecker/runtime execution.
