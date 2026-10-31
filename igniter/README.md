# Lite igniter

An experimental TypeScript interpreter for the first Lite FVP checkpoints.
Keep active handwritten host development minimal; move compiler development into
Lite as soon as the supported subset and TS emission permit, keeping the igniter
alongside it until the self-hosted path is satisfactory. Preserve this readable TS
bootstrap permanently. TS remains a maintained web target and C the first native/
export target; full self-hosting and library export are not implemented yet.

## Run

Use Node **26.13.0** (pinned in [.node-version](.node-version)); TypeScript
**7.0.2** and Node typings **26.6.6** are pinned in the lockfile for checking.
These were the stable npm/Node releases checked on 2026-10-30. The runtime has
no npm package dependencies and executes the `.ts` sources directly.

From the repository root:

```sh
./lite run examples/001-double-sum.lts
```

Enter `7` and `5` on separate lines; it reports `24`. Redirected stdin works too.
For basic conditions, run `./lite run examples/002-decisions.lts`
and supply an integer such as `0` or `5`.
For loops, run `./lite run examples/003-sum-positive.lts`; enter
`3`, `-2`, `4`, `0` to report `7`.
For functions and recursion, run `./lite run examples/004-factorial.lts`;
enter `5` to report `120` (or `0` to report `1`). Negative input explicitly
reports an error and exits with status 2; overflow faults instead of wrapping.
For a tiny Lite-written tokenizer, run
`./lite run examples/005-scan-arithmetic.lts`; enter `12 + 30`
to report `number: 12`, `symbol: +`, and `number: 30` on separate lines.
For tuple values, destructuring and function inputs/results, run
`./lite run examples/006-fixed-tuples.lts`. See the
[numbered project examples](../examples/README.md) for the shared index.
For explicitly prompted input and multiple report values, run
`./lite run examples/007-prompts-and-report.lts` and enter 7 and 5.
For named tuple fields and function contracts, run
`./lite run examples/008-named-tuples.lts`; no input is needed.
For fixed arrays, indexed reads and traversal, run
`./lite run examples/009-fixed-arrays.lts` and enter a token index from 0 to 2.
Prompts are written only when supplied to inputInt or inputAll; there are no automatic
binding dumps. `--check` parses and checks
without executing or reading stdin:

```sh
./lite run --check examples/001-double-sum.lts
npm --prefix igniter ci
npm --prefix igniter run check
npm --prefix igniter test
```

The root [lite launcher](../lite) is an executable POSIX shell script. It forwards
run to `node igniter/cli.ts` using node from PATH, preserving arguments, stdin,
output and exit status. It locates the igniter relative to itself while source
paths stay relative to the caller's working directory. No installation, build or
runtime npm dependencies are required. Direct Node invocation remains available
as the bootstrap entry. The pinned checking toolchain remains Node 26.13.0;
the exact launcher/example command was also smoke-tested with the current PATH's
Node 24.16.0, without changing that version policy or the user's Node selection.

Node strips types; it does **not** typecheck this code. Always run the separate
check before accepting changes. The config enables strict mode, checked indexed
access, exact optional properties, unused checks, and erasable syntax only.
The implementation uses tagged unions, exhaustive switches, `unknown` catches,
and no explicit `any`, non-null assertions, or unchecked type casts.

## Supported checkpoint

One file; fixed/inferred `:=` bindings, `var`/replacement, shadowing and scalar
copies; integer/float/text/Bool/Unit and flat fixed-tuple values;
`+ - * /`, unary signs and parentheses;
temporary helper calls and the typed user functions below. The whole file is
parsed and checked before effects, including uncalled function bodies.
Ordinary statements need semicolons between them; complete braced items do not.
Newlines do not terminate statements.
Repeated/trailing separators, adjacent text literals, multiline text, nested
comments and raw comments are supported. Completed runs return status 0.

### Conditions and block values

`true`/`false`, Bool-only `and`/`or`/`not`, and braced `if`/`else if`/`else` are
supported. Logical operators short-circuit; `not` applies to a complete comparison
chain before `and`/`or`. One optional leading `and`/`or` preserves the requirement
that the entire expression be Bool. No integer/string truthiness is admitted.

All ten comparisons (`== =!= < <! <= <!= > >! >= >!=`) chain adjacent operands,
retaining the middle value once and skipping later operands after failure. Every
pair is checked before execution. Comparisons currently require matching scalar
types; ordered pairs require Int or Float. String/Bool/Unit support equality and
inequality. Mixed numeric comparisons and custom comparison providers are unsupported.

Braced blocks introduce lexical scope and yield their last expression's value;
empty/declaration/assignment-final blocks yield Unit. Semicolons do not discard
that result. Parenthesize a block/conditional before continuing its value with an
operator. Branch-local names stay local; permitted outer var replacement persists.

Complete conditional expressions require matching result types in all branches
for now. A conditional used only as an action may omit else: its false path
contributes no value and executes no branch. Partial conditional initializers/
assignments, branch-result unions, pattern guards, `then`, and `finally` are
explicitly rejected. This implementation boundary does not change the wider
language's selected guarded-update/union rules. Keyword binding names are not
supported by the igniter; its permanent reserved-name profile remains open.

### Action loops

`loop condition { ... }` requires Bool and tests the condition before every body
entry, including after continue. `loop { ... }` runs unconditionally. Bare break
stops the nearest enclosing loop without another condition check; bare continue
skips the body tail and returns to that loop's header. Nested loops catch only
their own body transfers; program exit and runtime faults propagate outward.

Bodies have lexical scope and initialize their locals on each entry. Permitted
outer var writes persist; body shadows do not retarget the header's bindings.
The whole source, including untaken loop bodies, is checked before any I/O.

Only action-position loops are implemented. Fixed-array traversal is described
below. Value-producing loop expressions, metadata/accumulators, general iterables/
ranges, tags, payload break/continue, source/header
break/continue targeting an enclosing loop, and then/finally remain unsupported.
The body tail still evaluates for its effects, but no loop value can be observed
in this subset. This does not replace the wider language's selected loop-result
and completion semantics with an always-Unit language rule.

### Typed user functions

```text
double := fn(n: Int): Int { n * 2 }
quadruple := fn(n: Int): Int { double(double(n)) }
report(quadruple(3));
```

Parameters and results use explicit scalar, flat tuple or supported fixed-array annotations:
Int, Float, String, Bool, Unit, (:Int, :String), (:Int,), or (kind: String, text: String), for example.
The fixed-array subset below also accepts [T; N] for those scalar/flat tuple T.
These scalar spellings are the temporary script's primitive type names;
general type-name resolution is not implemented. Parameters are fixed local
value bindings. A body yields its final expression; empty/declaration/assignment
tails yield Unit. `return value` exits the nearest invoked function, including
through its loops; `return;` returns Unit. Results and supplied arguments must
match their declared types, without new implicit conversions. Complete branch
results may also include paths that return or exit instead of producing a value.
Internal flow checking is conservative; this is not complete return-path analysis.
Loops remain action-only, including at a function's tail: follow an action loop
with an explicit result/Unit when necessary. Unreachable source is still checked.

Call a named function value with positional or named arguments. Aliases copy the callable
value; var permits compatible replacements (same parameter names/types and result
in this subset). The callee is selected once before arguments, which evaluate
left to right. Each invocation has separate parameters/locals; block and loop
activations also keep separate environments. Named references retain their
lexical binding: replacement is live, while a later shadow does not retarget it.

`self(...)` calls the implementation currently executing, even after its named
binding has changed. A direct fn declaration without an earlier same-name target
also supports ordinary own-name recursion. If an earlier binding exists, the
ordinary spelling resolves that earlier binding; self still selects the current
implementation. These forms require no handwritten declaration header.

Surrounding function-valued bindings are admitted as helper dependencies in this
experimental subset. Surrounding scalar reads and all surrounding replacements
inside a function are rejected; pass data as arguments. This temporary boundary
does not settle the language's capture permissions or make functions a special
class exempt from initialization/lifetime safety. The host retains environments;
there is no native capture representation or resource-lifetime implementation.

Later helper declarations and mutual recursion, general captures, first-class
self, self binding/parameter names, keyword-free literals, omitted annotations,
default/rest arguments, access-qualified parameters, callable parameters/
results, general typed receiving declarations, and calls through arbitrary expressions
remain unsupported. The temporary builtin helpers are not first-class values.
Function reporting/comparison is also rejected. Program exit and runtime faults
propagate through function calls; cleanup and recoverable failures remain absent.

### Named user-function arguments

Existing public parameter names can be used as literal argument labels, including
=name shorthand. Unnamed arguments fill the next unfilled slot in declaration
order; a named argument may replace an earlier positional contribution. Explicit
labels must be unique and known. All required slots must be supplied, and no
extra positional slot is created. Check every expression, but only surviving
contributions must fit their parameter types.

Select the callee first, evaluate every supplied expression once in written order
(including superseded inputs), then bind the final slot values and invoke.
An exit/fault stops later preparation and the body. self uses the same routing.
Temporary builtin helpers remain positional; their public labels are unselected.
Defaults, spread, callable views and access-qualified inputs remain unsupported.
See [012](../examples/012-named-arguments.lts) and
[INV-031 evidence](../investigations/INV-031-fvp-named-calls.md).

### Flat fixed tuples

The user approved this bounded subset of existing tuple syntax:

```text
makeToken := fn(kind: String, text: String): (:String, :String) {
    (kind, text)
}
token := makeToken("number", "12");
(kind, text) := token;
report(token.0);
report(text);
```

Construct flat unnamed tuples of existing scalar values, evaluating components
once in written order. Read fixed zero-based positions with .0, .1, and so on;
the receiver evaluates once and invalid positions are rejected before execution.
Parenthesize a block/conditional before applying a member, as for other block
continuations. Tuple-valued function parameters/results use explicit annotations
such as (:Int, :String), preserving component types and fixed arity.

() is Unit. (value) groups the value; (value,) makes a distinct singleton tuple.
Its unnamed type requires a comma too: (:Int,) is valid and (:Int) is rejected.
An empty pattern matches only Unit; a singleton pattern needs its comma.
Grouped patterns preserve the whole source value. Unit-valued components retain
their positions and do not disappear from a nonempty tuple.

Positional declaration patterns evaluate the source once before introducing
their names, then bind in written order. Repeated names shadow earlier bindings,
including underscore, which remains readable. Require exact known arity and
irrefutable shapes. Each extracted name is fixed; whole-value var replacement
retains the binding's exact tuple type. Copies, ordinary arguments and results
preserve the evaluated values when the original source is subsequently replaced.
Passing one tuple is one argument, without implicit argument spread or flattening.

Nested tuple components/patterns, typed declaration patterns,
rest/spread, array segments, component writes, access grants, tuple equality and
tuple report formatting remain unsupported. Surrounding tuple data capture is
rejected just like surrounding scalar capture. Type/return-path analysis remains
conservative; a noncontinuing expression inside a tuple constructor is outside
this scalar-component subset. Report scalar members explicitly. Host storage
does not implement or validate native tuple layout, ABI, ownership or performance.

### Named fixed tuples

The selected named-field forms now work for flat fully named scalar tuples:

```text
kind := "number";
text := "12";
token := (= kind, = text);
report(token.kind, token.text);
```

The shorthand =name is exactly label = name: token above is equivalent to
(kind = kind, text = text). Explicit labels do not assign surrounding variables;
bare (kind, text) remains unnamed. Require unique labels. Member names are literal,
case-sensitive selectors, not variable lookups; numeric positions remain available
in stored order. Both forms evaluate the receiver once.

A named singleton such as (value = 42) or (= value) needs no comma. Its type is
(value: Int), also with an optional comma. It remains a one-component tuple,
including when the component is Unit. Existing positional/grouped patterns can
bind named tuples in stored order; names and values survive ordinary copies.

Explicit function inputs/results can use (kind: String, text: String). Ordinary
arguments, returns and compatible whole-value replacements check ordered labels
and component types; they never silently relabel or reorder a stored value.
Fresh constructors requesting valid contextual positional-to-named construction
or reordered fields are diagnosed as unimplemented. Write matching labels in
destination order for this subset. This is an implementation limit, not a new
restriction on the broader selected constructor-routing rules.

Nested tuples, named patterns, spread/rest, inferred label types and field mutation remain unsupported.
Keyword/self field names are outside the igniter's current identifier profile;
this does not settle the full language's reserved-name policy. Labels are checked
statically; no runtime reflection, native layout/ABI or ownership result is claimed.

### Mixed fixed tuples

Named and unnamed scalar fields may interleave in written order, for example
(7, tea = "green", 2) with type (:Int, tea: String, :Int). Numeric access covers
every position; field access covers labeled positions. Copies, function contracts
and homogeneous arrays preserve each position's label or absence of a label.
See [010](../examples/010-mixed-tuples.lts) and
[INV-022 evidence](../investigations/INV-022-fvp-mixed-tuples.md).

### Explicit tuple label conversion

A fully initialized receiving declaration such as point: (x: Int, y: Int) = size
may rename a stored flat scalar tuple by position. Labels can be added, removed
or changed; shape and ordered component types must match exactly in this subset.
The source is evaluated once and retains its own labels/value. Both fixed and var
receiving bindings work; later replacement still checks the destination labels.
Fresh constructors with matching labels work, but contextual construction needing
routing remains diagnosed as unimplemented. No numeric casts, callable label
adaptation, aliases or uninitialized typed storage are implemented here. See
[011](../examples/011-tuple-label-conversion.lts) and
[INV-022 evidence](../investigations/INV-022-fvp-label-conversion.md).

### Growable lists

The approved INV-055 slice accepts List<T> for this builtin family, with existing
scalar or flat scalar tuple T. Construct a list at an explicitly typed declaration:

```text
values: mut List<Int> = [1, 2];
saved := values;
push_front(mut values, 0);
push_back(mut values, 3);
report(pop_front(mut values), pop_back(mut values));
loop saved as value { report(value); }
```

Output is 0 3, then 1, then 2 on separate lines. A typed empty literal such as
values: mut List<Int> = [] gets its element contract from the destination;
uncontextual nonempty literals still infer fixed arrays and bare [] inference
remains unsupported. Exact element contracts, including tuple labels, are checked.
Stored list copies and ordinary List<T> function inputs/results retain evaluated
sequence values under later source mutation. Construct contextual literals only
at explicit receiving declarations in this subset; other fresh-literal contexts
remain unsupported. Read with Int bracket indices and traverse with the existing
action loop. Runtime lists have no fixed numeric dot positions.

The four selected operations are temporary positional runner bindings: pushes
require mut target plus one element and return Unit; pops require mut target and
return an element. A declaration with : mut List<T> permits held-data mutation;
var separately permits whole-binding replacement. Plain inferred copies and
ordinary function parameters receive no write grant. A separately typed mut
receiving copy can mutate its own sequence. No public helper argument labels,
permanent module placement or general generic application is selected.

Only directly named list grant targets are supported. Complex targets, overlapping
reads/replacement and simultaneous/reentrant mutation during argument preparation,
general user-function mut parameters and data captures remain unsupported before
effects. Read a needed element into a separate local before making a mut call.
The target location is selected once before the supplied element; failures/exits
stop the operation and later effects. Iteration retains the evaluated source
snapshot even if the original binding is mutated in its body.

Bounds and empty pops raise the approved temporary terminal BoundPanic diagnostic.
Catchable host resource failures retain existing terminal CLI handling; fatal host
exhaustion is not promised recoverable. No allocation Result, capacity helper,
optimizer, view, indexed write, alias framework or attached recovery is added.
Each host update builds a fresh immutable sequence, preserving previous values;
this intentionally simple implementation has no amortized growth or native
layout/performance claim. See [013](../examples/013-growable-lists.lts) and
[INV-055 evidence](../investigations/INV-055-fvp-list-slice.md).

### Fixed arrays and traversal

The approved first array subset accepts nonempty homogeneous literals of existing
scalars or flat scalar tuples, including named and mixed tuples. For example:

```text
values := [10, 20, 30];
loop values as value {
    report(value);
}
index := inputInt("Index: ");
report(values[index]);
```

All literal elements evaluate once in written order before the completed array
is used. Infer [T; N] with the literal extent; every element must currently have
the same type, including tuple labels/order. Explicit function inputs/results can
use [Int; 3] or [(kind: String, text: String); 3]. Extents are nonnegative integer
literals; exact element contracts and extents are checked. Arrays remain distinct
from tuples, including Unit-valued positions and zero-sized type shapes.

Read with array[index] using an Int or with literal .0/.1 positions. Evaluate the
receiver once, then the bracket index once. Invalid runtime indices raise terminal
BoundPanic, without negative wrapping or clamping; bounds are checked as BigInt
before host-number conversion. Invalid static dot positions fail before effects.
Report scalar elements or tuple members explicitly; array formatting is absent.

Array traversal is action-only. Evaluate its source once and visit the evaluated
elements in positional order. Optional as item introduces a fixed local name;
body/item bindings are fresh per iteration, and destructuring belongs in the body.
Without as, no implicit ordinary name or metadata is injected. Bare continue
advances to the next element; break stops the nearest loop. Returns, exit and
faults retain their existing targets/propagation. Later whole-value replacement
of the original variable does not redirect an in-progress read or traversal.
Ordinary copies/arguments/results likewise preserve their evaluated values.

Empty array construction (even under a known annotation), heterogeneous/union
element inference, nested arrays, element writes, growth, slices, access grants,
spread, array equality, metadata and loop completion/cleanup remain unsupported.
No default element type for [] or count/length helper is invented. General [T]
sequence contracts, named Boolean/unconditional loop receivers and native inline
layout/ABI/ownership remain outside this implementation. The host stores immutable
array values; it does not validate native header-free storage or performance.

### Whole input with optional prompt

inputAll() returns all remaining decoded stdin text through EOF. It preserves
unread lookahead, spaces/tabs and CR/LF, including a final newline when present.
Immediate EOF returns an empty String. inputAll("Source: ") evaluates the String
prompt once and writes it exactly to stdout without an added newline before the
first read, matching inputInt's prompt convention. Omission produces no output;
an empty prompt adds nothing. A failed prompt write prevents reading.

The helper accepts zero or one positional String argument. Named helper arguments
remain unsupported; ordinary shadowing works. Invalid signatures fail before
program effects, read failures stay terminal and the other input helpers retain
their EOF-fault rules. It reads all remaining text and may use proportional memory;
no file API, rewind, streaming guarantee or normalization is added. See
[019](../examples/019-whole-input.lts) and
[INV-004 evidence](../investigations/INV-004-fvp-whole-input.md).

### Temporary text operations

**Explicitly approved, 2026-10-31:** textLength/textAt/textSlice and their exact
code-point/half-open/terminal-bounds policy are selected as temporary FVP helpers.
The earlier alpha.5 implementation was unapproved at the time; current acceptance
comes from the user's explicit reply to the focused review. See
[INV-016](../investigations/INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31).

Computed `String + String` concatenates without adding separators, interpreting
escapes, or converting other types to text. Operands evaluate once, left to right.
This implements the existing explicit concatenation direction; adjacent literals
continue to join at parse time.

Three disposable helpers make small text-scanning experiments possible:

- `textLength(text: String): Int` counts code points using the host string iterator.
- `textAt(text: String, index: Int): String` returns one code point as a String.
  Indices start at zero and require `0 <= index < textLength(text)`.
- `textSlice(text: String, start: Int, end: Int): String` returns the half-open
  interval `[start, end)`, requiring `0 <= start <= end <= textLength(text)`.
  Empty intervals, including `(0, 0)` on empty text, are valid.

All three use the same temporary position unit. Supplementary characters such as
an emoji occupy one position; combining marks and joined emoji sequences occupy
several. No normalization or human-language segmentation is performed. This
does not select the full language's String indexing, character type, or slice/view
contract. Invalid positions raise terminal `BoundPanic`, with a source location;
there is no wrapping, clamping, or fabricated value. Arguments evaluate once in
written order before the bounds check. BigInt bounds are checked before converting
an admitted index to a host number. Arity and types are checked before program effects.

The host currently materializes code points on each helper call, so even length
and indexed access scan the text and use temporary storage. Repeated scanning
may be quadratic; no constant-time indexing, native layout, zero-copy slice,
ownership, or performance guarantee follows. Generic String indexing syntax,
byte/grapheme views, interpolation, formatting and the full text profile remain
unsupported or open. Helper parameter names above are explanatory; only
positional arguments are supported. These helper names obey ordinary shadowing and are not
first-class builtin values.

The [arithmetic tokenizer](../examples/005-scan-arithmetic.lts) groups ASCII decimal
digit runs, skips spaces/tabs, and reports individual `+ - * / ( )` symbols.
It preserves digit text, including leading zeroes. An unsupported character
explicitly reports an error and exits 2. An empty supplied line emits only the
prompt heading; EOF before a line faults. It is an experiment written in Lite, not the
Lite lexer, an arithmetic parser/evaluator, or a self-hosted compiler.

### Numeric, input and reporting helpers

- Int uses exact `bigint` computation with signed 64-bit checks, including minimum
  divided by -1. Int/Int division truncates toward zero.
- Float uses binary64 `number`; mixed Int/Float **division** is supported.
  Other mixed arithmetic and mixed-type replacement are rejected for now.
  Int-to-float promotion during division rounds through Number; this is a
  provisional igniter choice, not a permanent conversion contract. Overflow,
  zero division and non-finite arithmetic results raise `ArithmeticPanic`.
- Source/input numbers use decimal digits, optional fraction and exponent for
  floats; `.5`, digit separators, hex and non-finite input are not supported.
  Integer input permits an optional sign. Out-of-range literals are source
  errors; malformed/out-of-range input is `InputFault`.
- `inputInt()` or `inputInt(prompt)` reads an integer token. The optional prompt
  must be a String; write it exactly to stdout without adding a newline, then
  read. Its argument evaluates once before prompt output. Invalid input/EOF still
  faults after that one prompt, without retry. A prompt is also emitted with
  redirected stdin; no TTY-dependent suppression is introduced.
- `inputInt()`, `inputFloat()` and `inputWord()` read whitespace-separated tokens.
  The separator after a token is left unread. `inputLine()` returns the remaining
  line without LF/CRLF, including a valid empty line or nonempty final EOF line.
  Thus `inputInt()` followed by `inputLine()` can return empty text at a newline.
  EOF without a requested value faults; there is no retry or fabricated value.
- `report(value, ...)` accepts one or more ordinary scalar/Unit arguments.
  Evaluate them once left to right, then join their displayed values with one
  space and append one newline on stdout. An optional first String such as
  "sum:" is just another value, with no special detection or formatting syntax.
  Empty strings remain values and still participate in spacing. Embedded
  newlines are data; the helper always appends its own final newline.
  Tuple/callable values, report() and report(...tuple) remain unsupported.
  `reportError(value)` keeps its one-value stderr/report-only behavior, and
  inputFloat/inputLine/inputWord retain their zero-argument forms.
  Strings are shown as text, Unit as `Unit`, floats using Number's conversion.
  These are temporary FVP helper contracts, not a general variadic callable API.
- `exit()` currently ends the run with 0; `exit(code)` admits Int codes 0–255.
  These are provisional igniter choices for the previously open default/domain,
  not permanent language decisions. Arguments evaluate before exit. No cleanup
  construct is supported yet, so no exit/unwinding guarantee is claimed.
- Source and stdin are decoded as UTF-8; basic escapes are `\n \r \t \" \\`.
  Other escapes are rejected. Input text is not source-escape-decoded. This
  describes the temporary implementation, not acceptance of the deferred full
  text profile. Identifier admission uses the host's Unicode ID properties plus
  underscore; the full Lite identifier profile remains open.

Wider tuples/patterns, general typed declarations and collection protocols,
modules, recovery and cleanup are unsupported.
Errors include source positions and return nonzero status. Runtime faults are
currently terminal because recovery is not implemented. Advanced operators
remain unsupported; unsupported source is never evaluated
as JavaScript. Lite execution uses only this parser/checker/evaluator and the helpers.

## Bootstrap milestone

Version **0.1.0-alpha.19**, tag **igniter-v0.1.0-alpha.19**, adds approved
inputAll with an optional String prompt and exact remaining-text/EOF handling.
Previous checkpoints stay fixed:

- **igniter-v0.1.0-alpha.1**, commit `8c74537`: initial scalar/input/reporting slice.
- **igniter-v0.1.0-alpha.2**, commit `e09cf63`: Boolean conditions and scoped blocks.
- **igniter-v0.1.0-alpha.3**, commit `1dcf92f`: action loops and bare break/continue.
- **igniter-v0.1.0-alpha.4**, commit `29978ff`: typed scalar functions, return and recursion.
- **igniter-v0.1.0-alpha.5**, commit `7038ce1`: computed text concatenation and
  scanning helpers, initially unapproved and subsequently accepted for the
  temporary FVP scope on 2026-10-31.
- **igniter-v0.1.0-alpha.6**, commit `d667395`: approved flat fixed tuples,
  declaration destructuring and tuple function inputs/results.
- **igniter-v0.1.0-alpha.7**, commit `36b301f`: root ./lite run launcher.
- **igniter-v0.1.0-alpha.8**, commit `27d6f03`: optional inputInt prompts and
  multiple ordinary report arguments.
- **igniter-v0.1.0-alpha.9**, commit `fc0fb5d`: named fixed-tuple fields,
  shorthand and label-sensitive function contracts.

- **igniter-v0.1.0-alpha.10**, commit `1e253b5`: readable fixed arrays and traversal.

- **igniter-v0.1.0-alpha.11**, commit `b8583ff`: mixed flat tuple fields and annotations.

- **igniter-v0.1.0-alpha.12**, commit `54d3617`: explicit tuple label conversion.

- **igniter-v0.1.0-alpha.13**, commit `2139003`: fixed-slot named user-function calls.

- **igniter-v0.1.0-alpha.14**, commit `135972e`: approved bounded growable lists.

- **igniter-v0.1.0-alpha.15**, commit `f5f9cbe`: explicit helper approval and retained scanning.

- **igniter-v0.1.0-alpha.16**, commit `30f1d3e`: Lite-written arithmetic front end.

- **igniter-v0.1.0-alpha.17**, commit `d5d1c63`: readable TS emission and exact-byte parity.

- **igniter-v0.1.0-alpha.18**, commit `3bce277`: native C and three-way byte parity.

Each tag pins its source commit and lockfile. All run directly on Node; none
is built by an earlier Lite compiler or can build a Lite-written successor yet.
It requires Node 26.13.0 to run and the pinned dev dependencies to typecheck.
There is no Python implementation to preserve: the earlier Python proposal was
replaced before implementation. Preserve this TS seed once tagged; add concrete
builder/source version links when a real next-stage compiler exists.

All **138 test groups** pass under the pinned Node/TypeScript versions. The tests
exercise the real CLI and evaluator, including overflow and negative
programs. Only lessons 001, 002 and 020 currently have focused checked outcomes
by appending explicit reports in test memory; lesson files remain unchanged.
This is not proof of the full 20-lesson or larger-language contract.

References checked for the toolchain: [Node release/downloads](https://nodejs.org/en/download),
[Node TypeScript execution](https://nodejs.org/api/typescript.html),
[TypeScript installation](https://www.typescriptlang.org/download/), and
[compiler options](https://www.typescriptlang.org/tsconfig/).

The [retained-token example 015](../examples/015-retained-tokens.lts) returns a
named-tuple list before traversal; invalid text exits without partial token output.

The [integer calculator 016](../examples/016-integer-calculator.lts) parses the
scanner's arithmetic input using ordinary Lite recursion and position/value
pairs. It runs on the preserved alpha.15 interpreter too. This is application
front-end evidence, not a Lite compiler, AST/IR choice, code generator or
self-hosted build. See [INV-061 evidence](../investigations/INV-061-lite-arithmetic-front-end.md).

For the first emitted-code experiment, run
./lite run examples/017-report-ts-compiler.lts with input report(42);. Inspect
[its exact TS output](../examples/generated/017-report-42.ts) and
[explicit adapter](../examples/generated/017-run-report.ts), then run
node examples/generated/017-run-report.ts. Strictly check the reference/adapter
with node igniter/node_modules/typescript/bin/tsc -p examples/generated.
The emitter admits a single report of a signed decimal Int literal, validates
before producing source, and handles signed limits without JS number rounding.
Nine admitted programs match the igniter's raw stdout/stderr/status through TS
and translated JS. The emitted core checks without Node/DOM types; no actual
browser, AS/Wasm or compiler self-rebuild claim follows. See
[INV-061 evidence](../investigations/INV-061-ts-emission-and-parity.md).

The [C emitter 018](../examples/018-report-c-compiler.lts) supports the same
restricted report-literal class, with no additional host feature. Inspect its
[standalone C reference](../examples/generated/018-report-42.c) and
[build/parity evidence](../investigations/INV-061-c-emission-and-parity.md).
The native integration test needs cc (or CC as its executable path); it is
explicitly skipped if the tool is absent. It ran successfully here with Apple
clang 21.0.0. Nine emitted native programs match TS and igniter stdout/stderr
bytes, status and signal. Broader source support, error-environment parity,
C library exports and compiler self-rebuild are not established.
