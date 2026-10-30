# Lite igniter

An experimental TypeScript interpreter for the first Lite FVP checkpoints.
Disposable bootstrap code: move compiler development into Lite as soon as it
can support it. This is not a native compiler or a self-hosted build chain.

## Run

Use Node **26.13.0** (pinned in [.node-version](.node-version)); TypeScript
**7.0.2** and Node typings **26.6.6** are pinned in the lockfile for checking.
These were the stable npm/Node releases checked on 2026-10-30. The runtime has
no npm package dependencies and executes the `.ts` sources directly.

From the repository root:

```sh
node igniter/cli.ts igniter/examples/double-sum.lts
```

Enter `7` and `5` on separate lines; it reports `24`. Redirected stdin works too.
For basic conditions, run `node igniter/cli.ts igniter/examples/decisions.lts`
and supply an integer such as `0` or `5`.
For loops, run `node igniter/cli.ts igniter/examples/sum-positive.lts`; enter
`3`, `-2`, `4`, `0` to report `7`.
For functions and recursion, run `node igniter/cli.ts igniter/examples/factorial.lts`;
enter `5` to report `120` (or `0` to report `1`). Negative input explicitly
reports an error and exits with status 2; overflow faults instead of wrapping.
For a tiny Lite-written tokenizer, run
`node igniter/cli.ts igniter/examples/scan-arithmetic.lts`; enter `12 + 30`
to report `number: 12`, `symbol: +`, and `number: 30` on separate lines.
There are no automatic prompts or binding dumps. `--check` parses and checks
without executing or reading stdin:

```sh
node igniter/cli.ts --check igniter/examples/double-sum.lts
npm --prefix igniter ci
npm --prefix igniter run check
npm --prefix igniter test
```

Node strips types; it does **not** typecheck this code. Always run the separate
check before accepting changes. The config enables strict mode, checked indexed
access, exact optional properties, unused checks, and erasable syntax only.
The implementation uses tagged unions, exhaustive switches, `unknown` catches,
and no explicit `any`, non-null assertions, or unchecked type casts.

## Supported checkpoint

One file; fixed/inferred `:=` bindings, `var`/replacement, shadowing and scalar
copies; integer/float/text/Bool/Unit values; `+ - * /`, unary signs and parentheses;
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

Only action-position loops are implemented. Value-producing loop expressions,
metadata/accumulators, iterables/ranges, tags, payload break/continue, source/header
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

Parameters and results require explicit scalar annotations: Int, Float, String,
Bool, or Unit. These spellings are the temporary script's primitive type names;
general type-name resolution is not implemented. Parameters are fixed local
value bindings. A body yields its final expression; empty/declaration/assignment
tails yield Unit. `return value` exits the nearest invoked function, including
through its loops; `return;` returns Unit. Results and supplied arguments must
match their declared types, without new implicit conversions. Complete branch
results may also include paths that return or exit instead of producing a value.
Internal flow checking is conservative; this is not complete return-path analysis.
Loops remain action-only, including at a function's tail: follow an action loop
with an explicit result/Unit when necessary. Unreachable source is still checked.

Call a named function value with positional arguments. Aliases copy the callable
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
named/default/rest arguments, access-qualified parameters, callable parameters/
results, typed receiving declarations, and calls through arbitrary expressions
remain unsupported. The temporary builtin helpers are not first-class values.
Function reporting/comparison is also rejected. Program exit and runtime faults
propagate through function calls; cleanup and recoverable failures remain absent.

### Temporary text operations

**Awaiting explicit consent:** textLength/textAt/textSlice and their indexing/
bounds policy were agent-added experiments, not user-approved language features.
Their implementation and alpha.5 tag record behavior only. Review/investigate
them before accepting or extending them; see the
[consent correction](../investigations/INV-016-igniter-text-operations.md#scope-and-contracts).

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
unsupported or open. These helper names obey ordinary shadowing and are not
first-class builtin values.

The [arithmetic tokenizer](examples/scan-arithmetic.lts) groups ASCII decimal
digit runs, skips spaces/tabs, and reports individual `+ - * / ( )` symbols.
It preserves digit text, including leading zeroes. An unsupported character
explicitly reports an error and exits 2; an empty supplied line has no output,
while EOF before a line faults. It is an experiment written in Lite, not the
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
- `inputInt()`, `inputFloat()` and `inputWord()` read whitespace-separated tokens.
  The separator after a token is left unread. `inputLine()` returns the remaining
  line without LF/CRLF, including a valid empty line or nonempty final EOF line.
  Thus `inputInt()` followed by `inputLine()` can return empty text at a newline.
  EOF without a requested value faults; there is no retry or fabricated value.
- `report(value)` writes one value and a newline to stdout; `reportError(value)`
  does the same on stderr and continues. Each currently accepts exactly one
  scalar/Unit. String values are shown as text, Unit as `Unit`, floats using
  Number's string conversion. These are provisional helper contracts.
- `exit()` currently ends the run with 0; `exit(code)` admits Int codes 0–255.
  These are provisional igniter choices for the previously open default/domain,
  not permanent language decisions. Arguments evaluate before exit. No cleanup
  construct is supported yet, so no exit/unwinding guarantee is claimed.
- Source and stdin are decoded as UTF-8; basic escapes are `\n \r \t \" \\`.
  Other escapes are rejected. Input text is not source-escape-decoded. This
  describes the temporary implementation, not acceptance of the deferred full
  text profile. Identifier admission uses the host's Unicode ID properties plus
  underscore; the full Lite identifier profile remains open.

Tuples/destructuring, general typed declarations, collections,
modules, recovery and cleanup are unsupported.
Errors include source positions and return nonzero status. Runtime faults are
currently terminal because recovery is not implemented. Advanced operators
remain unsupported; unsupported source is never evaluated
as JavaScript. Lite execution uses only this parser/checker/evaluator and the helpers.

## Bootstrap milestone

Version **0.1.0-alpha.5**, tag **igniter-v0.1.0-alpha.5**, adds computed text
concatenation, temporary scanning helpers, and a Lite-written tokenizer example.
Previous checkpoints stay fixed:

- **igniter-v0.1.0-alpha.1**, commit `8c74537`: initial scalar/input/reporting slice.
- **igniter-v0.1.0-alpha.2**, commit `e09cf63`: Boolean conditions and scoped blocks.
- **igniter-v0.1.0-alpha.3**, commit `1dcf92f`: action loops and bare break/continue.
- **igniter-v0.1.0-alpha.4**, commit `29978ff`: typed scalar functions, return and recursion.

Each tag pins its source commit and lockfile. All run directly on Node; none
is built by an earlier Lite compiler or can build a Lite-written successor yet.
It requires Node 26.13.0 to run and the pinned dev dependencies to typecheck.
There is no Python implementation to preserve: the earlier Python proposal was
replaced before implementation. Preserve this TS seed once tagged; add concrete
builder/source version links when a real next-stage compiler exists.

All **52 test groups** pass under the pinned Node/TypeScript versions. The tests
exercise the real CLI and evaluator, including overflow and negative
programs. Only lessons 001, 002 and 020 currently have focused checked outcomes
by appending explicit reports in test memory; lesson files remain unchanged.
This is not proof of the full 20-lesson or larger-language contract.

References checked for the toolchain: [Node release/downloads](https://nodejs.org/en/download),
[Node TypeScript execution](https://nodejs.org/api/typescript.html),
[TypeScript installation](https://www.typescriptlang.org/download/), and
[compiler options](https://www.typescriptlang.org/tsconfig/).
