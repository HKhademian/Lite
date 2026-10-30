# Lite igniter

An experimental TypeScript interpreter for the first Lite FVP checkpoint.
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
copies; integer/float/text/Unit values; `+ - * /`, unary signs and parentheses;
temporary helper calls. The whole file is parsed and checked before effects.
Statements need semicolons between them; newlines do not terminate statements.
Repeated/trailing separators, adjacent text literals, multiline text, nested
comments and raw comments are supported. Completed runs return status 0.

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

Conditions/Booleans, loops, user functions, tuples/destructuring, explicit blocks,
typed declarations, collections, modules, recovery and cleanup are unsupported.
Errors include source positions and return nonzero status. Runtime faults are
currently terminal because recovery is not implemented. Text concatenation and
advanced operators are also unsupported; unsupported source is never evaluated
as JavaScript. Lite execution uses only this parser/checker/evaluator and the helpers.

## Bootstrap milestone

Version **0.1.0-alpha.1**, intended tag **igniter-v0.1.0-alpha.1**, identifies this
first checkpoint. The tag pins the complete source commit and lockfile. It has
no predecessor compiler and cannot build a Lite-written successor compiler yet.
It requires Node 26.13.0 to run and the pinned dev dependencies to typecheck.
There is no Python implementation to preserve: the earlier Python proposal was
replaced before implementation. Preserve this TS seed once tagged; add concrete
builder/source version links when a real next-stage compiler exists.

The tests exercise the real CLI and evaluator, including overflow and negative
programs. Only lessons 001, 002 and 020 currently have focused checked outcomes
by appending explicit reports in test memory; lesson files remain unchanged.
This is not proof of the full 20-lesson or larger-language contract.

References checked for the toolchain: [Node release/downloads](https://nodejs.org/en/download),
[Node TypeScript execution](https://nodejs.org/api/typescript.html),
[TypeScript installation](https://www.typescriptlang.org/download/), and
[compiler options](https://www.typescriptlang.org/tsconfig/).
