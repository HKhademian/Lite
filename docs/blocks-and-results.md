# Blocks and results

Status: **established direction; source-file body selected 2026-10-28**.

## Purpose and template

Generated compiler coverage, 2026-11-16: TS supports full value-producing and
statement `{ ... }` blocks, lexical closures, inner-block `type` aliases,
parallel forward symbol wiring across root and inner blocks, compile-time
execution-trace safety, and side-effect-free dead-code elimination. Generated C
supports statement scopes, inner `type` aliases, parallel non-`fn` type wiring,
and scalar DCE while explicitly rejecting `fn` values. See the
[transition queue](lite://doc/compiler/gaps).

An executable block groups items, introduces lexical scope, and produces its final item's result when execution reaches the end.

```text
{
    declaration_or_statement;
    expression
}
```

Bodies always use braces. Optional single-statement bodies and earlier `do/end` or `then/endif` block systems are superseded.

## Item boundaries

A complete block construct ends its item without requiring `;`. Write it without a trailing semicolon, at top level and inside other blocks. This includes declarations initialized directly by blocks, functions/lambdas, conditionals, matches, loops, or record constructions. The grammar still allows an optional trailing semicolon. The entire construct includes its attached else/then/finally clauses; punctuation must not split those clauses from their owner. See the [semicolon style and required exceptions](lite://doc/lexical-structure#semicolon-style-after-closing-braces).

```text
answer := {
    42
}
use(answer);
```

Both items can also appear on the same line. Whitespace never determines the boundary.

```text
answer := { 42 } use(answer);
```

The closing body separates the declaration from use(answer), even on the same line. An optional semicolon would not change the block's value; omitting it is the documentation/formatter style, not a syntax ban.

Record construction also ends an outer initializer item: `x: User = {}` and `x := User {}` need no trailing semicolon. Its braces construct data rather than execute a block; sharing a boundary rule does not give it block-result semantics. See [record literal boundaries](lite://doc/record-literal-boundaries) for the requested inferred form and remaining disambiguation.

To continue a block's or record construction's value with an operator, call, member access, or indexing, parenthesize the construct:

```text
answer := ({ calculate() }) + 1;
result := (fn(x: Int): Int { x * 2 })(3);
name := ({ make_user() }).name;
```

These outer items are ordinary expressions or declarations and use ordinary separators. A closing brace inside a call argument or other enclosing expression does not terminate that enclosing item. See [lexical structure](lite://doc/lexical-structure) for the complete separator direction.

## Explicit failure capture

Selected [LP-0009 r1](lite://doc/proposals/LP-0009-flat-failure-capture): `({ work() })?` captures supported failures during block execution into a flat outcome. The boundary is active before the first item and includes executed synchronous calls. A final outward T ! E becomes T ! (E | Panic); deliberately nested success payloads remain data. Postfix ? also applies to other expressions. Existing grouping for continuation after a complete braced construct remains required. Normal exits and function-targeted ! are not captured. See [failure capture and unwrapping](lite://doc/failure-capture-and-unwrapping).

## Final-item rule

- A final expression supplies the block's value.
- A final declaration or assignment produces `Unit`.
- An empty executable block produces `Unit`. Contextual record initializer braces such as `user: User = {}` are data construction, not executable blocks, and apply the record's defaults instead.
- An empty match-arm body therefore produces Unit too: `_ {}` and `_ { Unit }` have the same result.
- Separators are ignored when locating the final item.
- The compiler does not search backward past a final declaration or assignment for an earlier expression.
- An explicit exit transfers control instead of completing the block normally.

## Examples

```text
price := {
    discounted := calculate_discount(base);
    discounted + shipping
}
```

```text
{ 2 * x }
```

```text
{ 2 * x;;;;;;;;;; }
```

The last two blocks produce the same value. Semicolons inside a block may follow its final ordinary item without changing its result. They may also follow a completed block item, including a nested block, without changing its result. An empty block may contain extra separators. Semicolons are separators, not result-discard operators.

```text
{ x = 3 }       /* Unit */
{ x += 3 }      /* Unit */
{ x := 3 }      /* Unit */
{ x := 3; x }   /* Int */
{ ;;;;; }       /* Unit */
```

The whole-binding assignment examples assume an existing `var x` where needed. `mut` alone does not permit assigning the whole binding.

## Explicit Unit and unused values

```text
{
    perform_action();
    Unit
}
```

```text
{ _ := calculate(); }
```

The second block produces Unit because its final item is a declaration. calculate still runs and its value is bound to the readable name `_`, with permission to be unused. `_ = calculate()` would instead assign an existing var binding; it is not discard syntax.

Exactly which unused results require explicit handling, particularly Result values, and whether a separate discard operation is needed remain open. Naming a value `_` must not silently exempt it from that future policy; see [underscore bindings and skips](lite://doc/wildcards-and-skips).

## Block value versus return

```text
answer := {
    42
}

use(answer);
```

The block's final expression does not exit the surrounding function. `return` does. A prefix tag can identify a block as an explicit return target.

## Source file body

Selected **2026-10-28**, clarified **2026-11-15**: a LiteLang source file (`.lts`
script or `.lt` module) is modeled as the outermost code block with **invisible
braces** and **no parent block**, whereas every inner block construct requires
written `{ ... }` braces and has a parent block. Its **only** structural
difference from an inner braced block is `pub`, which exposes selected symbols
(`fn`, `type`, `var`, `mut`, immutable values) across the file boundary because
inner braced blocks cannot be imported as namespaces.

Four consequences follow directly from that model without separate top-level
syntax rules:

- Item, semicolon, and closing-brace boundaries apply identically at file level
  and inside `{ ... }`.
- `return`, `break`, `continue`, and `@tag` exits fail at file level simply
  because the root file block has no parent `fn`, `loop`, or `@tag` block.
- Because the root file block has no parent block to receive a result (and no
  written closing `}` to attach `finally`), a trailing expression evaluates for
  its effects and its value is unobserved; the file completes with `Unit`.
- Inner `{ ... }` blocks have parent blocks and cannot be imported as modules,
  so `pub` has meaning only in the root file block.

Clarified **2026-10-30** and **2026-11-15**: `.lts` is the script source form
with top-to-bottom runtime evaluation, while `.lt` shares the same invisible-brace
root block structure and `pub` capability except that it prohibits top-level
runtime evaluation (admitting compile-time-known initial definitions such as
`x := 1`, types, `fn` definitions, and compile-time-known `var`/`mut`
initializers; merging `.lt` and `.lts` into one source unit remains open). A `.lt`
file has explicit package/module access and no implicit imports; it does not
become an executable script body merely because a script loads it. See
[source kinds](lite://doc/modules-and-packages#distinct-script-and-module-files).

In a `.lts` script body, items execute in written order under the ordinary block
rules, including the final-item rule. The final item's result is computed and
then not observed: a trailing expression is evaluated for its effects, and its
value is discarded rather than reported as an error. The file body completes
with `Unit` whether it is empty, ends in a declaration or assignment, or ends
in an expression.

Reaffirmed 2026-10-28: this discarded result is never an implicit request for
output. Scripts, demonstrators, and playgrounds require an explicit output
operation or deliberately enabled inspection/tracing facility to display it.
Declarations and assignments likewise do not echo their values. See
[explicit output and tracing](lite://doc/tooling-and-learning#explicit-output-and-tracing).
Discarding an ordinary result does not skip its evaluation or suppress its effects
or failures.

Generated compiler coverage, 2026-11-02: ordinary expression items now preserve
evaluation and discard the result silently over each target's admitted forms.
Empty separators are accepted; trailing separators preserve a function's final
expression result and its type check. Generated C evaluates discarded scalar
expressions explicitly; functions and aggregates remain in its transition queue.
See the [expression-item evidence](lite://doc/compiler/parity#ordinary-expression-items).

Because there is no enclosing function, loop, or tagged block at this boundary, a
top-level `return`, `break`, or `continue` has no valid target. Exact diagnostics
and any future top-level exit spelling remain open.

Ordinary eager lookup and shadowing in this executable body follow the selected
[block-order rule](lite://doc/evaluation-order#executable-block-items), with the separate
[deferred function-body exception](lite://doc/functions#deferred-body-lookup).

This section selects the execution model only. Module-declaration uniqueness,
imported-file behavior and module
initialization, recursive initialization of a named function literal, process
exit status, and observable effects remain with their owning contracts. Contrast
[declaration bodies](#declaration-bodies) below, which contain declarations and
never supply an executable result.

For the FVP, [host completion and explicit exit](lite://doc/tooling-and-learning#fvp-completion-and-explicit-exit)
now select normal completion as status 0, rejected programs/unhandled fatal
execution failures as nonzero, and exit(errCode?) for explicit program end.
These do not change this block's Unit value or make top-level return valid;
exit's omitted-code default and cleanup behavior remain open.

## Unified block model

In LiteLang, a source file (`.lts` script or `.lt` module) acts as the root block
with invisible braces and no parent block; every inner `{ ... }` block has a
parent block and shares the same core block rules:

- Same-block redeclaration across values, `var`/`mut`, `fn`, `type` aliases,
  and imports is rejected in both root and inner blocks.
- Symbol visibility within a block is wired in parallel at compile time for
  types, functions, and inner declarations; deferred `fn` bodies resolve
  nearer same-block declarations (including forward ones) before outer blocks
  (see [deferred-body lookup](lite://doc/functions#deferred-body-lookup)).
- Runtime values and initialization follow sequential execution-trace order,
  preventing early eager reads/calls before later declarations or `?`
  reserved locals initialize (see [first initialization](lite://doc/first-initialization)).
- Only the parentless file root admits `pub` exports and module `import`
  bindings.

## Dead-code elimination in blocks

Clarified **2026-11-15**: dead declarations and side-effect-free dead code inside
any block (the invisible-brace root file block or an inner `{ ... }` block) may
be eliminated when doing so preserves observable effects:

```text
/* Design example */
x := {
    y := 1;
    z := fn { ... }
    5
}
/* reducible to */
x := 5;
```

## Declaration bodies

A record, interface, enum, module, or implementation body contains declarations. Its last declaration does not become an executable block result merely because the syntax uses braces.

## Notes

The final expression is a syntactic final item, not simply the last value computed on any execution path. In particular, adding logging after a calculation can change an inferred block result to `Unit`; result annotations at public boundaries help detect that change.

## Related concepts and references

- [Unit](lite://doc/unit)
- [Functions](lite://doc/functions)
- [Control-flow exits](lite://doc/control-flow)
- [Rust block expressions](https://doc.rust-lang.org/reference/expressions/block-expr.html) are a comparison. LiteScript deliberately does not copy Rust's trailing-semicolon result suppression.
