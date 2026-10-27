# Failure capture, flat outcomes, and unwrapping

Status: **selected, 2026-10-27; unreleased design**, [LP-0009 r1](proposals/LP-0009-flat-failure-capture.md) and [LP-0010 r1](proposals/LP-0010-outcome-extraction-and-exhaustion.md). Manual raise and eligible escaping-error inference are selected in [LP-0012 r1](proposals/LP-0012-manual-failures-and-error-inference.md). Directed scalar/group raise and explicit block targets are now selected in [LP-0014 r1](proposals/LP-0014-directed-failure-exits.md). Its unmatched-remainder policy remains a [draft](proposals/LP-0011-explicit-failure-raising.md), especially exits with unmatched failures. No parser, runtime, storage layout, or benchmark is supplied.

Normative for explicit capture and extraction; [Result and errors](result-and-errors.md) owns ordinary outcomes, [expression recovery](expression-recovery.md) owns matching and consumption, and [finally](finally.md) owns cleanup.

## Ordinary calls keep their contracts

Assume op1 returns T, and op2 returns T ! (E1 | E2), with E1/E2 returned-error categories. Either operation may also panic on the separate implicit channel.

```text
x11 := op1();  /* T */
x21 := op2();  /* T ! (E1 | E2) */
```

The ordinary op2 outcome can be stored or passed without extraction. Neither declaration captures a panic from its call. If that call panics, the declaration does not finish. A function's T ! E annotation does not automatically include Panic in E; T! still means T ! Error.

## Explicit capture covers its operand evaluation

Postfix `?` establishes a capture boundary before evaluating its operand. It evaluates the operand once and stores supported failures rather than immediately recovering or propagating them. It may apply to any expression; a block supplies an explicit multi-item scope.

```text
x12 := ({ op1() })?;  /* T ! Panic */
x24 := ({ op2() })?;  /* T ! (E1 | E2 | Panic) */

a := op2()?;          /* same coverage as the one-call block above */
b := op2(make_key())?;
```

In the last example, assume the appropriate op2 overload takes a key. A supported panic from make_key is captured and op2 is not invoked on that path. This broad operand boundary is explicit in `?`; it does not change the narrower operation-specific meaning of an unmarked `op2(make_key()) else { ... }`.

Continue a complete braced construct through parentheses, following the existing [block continuation rule](blocks-and-results.md#item-boundaries): `({ ... })?`. Grouping itself adds no failure boundary.

```text
attempt := ({
    key := make_key();
    op2(key)
})?;
```

The boundary covers supported synchronous panics in executed statements, arguments, receivers/callees, and called code within that operand. Applicable cleanup runs with the existing ordering and retention rules; failures from cleanup inside the protected extent are retained too. Exact finally attachment remains governed by its own contract. No retry, rollback, or safe capture of arbitrary foreign crashes or hard process aborts is promised.

Capture is not retroactive:

```text
before := op2();
after := before?;
```

The second statement cannot capture a panic that already escaped the first call. It can only capture evaluation of its own operand. Repeated capture of an already panic-bearing outcome needs a separate normalization rule; no general idempotence or recursive flattening is selected.

## Flat type, retained occurrences

The public spelling is T ! (E1 | E2 | Panic), not a mandatory Captured or FailureGroup wrapper. It admits returned errors E1/E2 and captured panics. The compiler does not need to enumerate every concrete panic that might arise. Panic is the broad typed-panic family; concrete categories retain identity/payload sufficient for typed recovery. BoundPanic is an illustrative category name, not a complete selected category declaration or field schema.

Failure is the broad error-or-panic selector, conceptually Error | Panic. Error selects returned errors; Panic selects panic occurrences; Failure selects both. These roles do not require object inheritance or a boxed common superclass. Channel origin is retained; if payload types overlap, their plain union alone cannot reconstruct origin. The full admissible-error and overlapping-payload rules remain open.

The failure side preserves one or several ordered occurrences, including repeated categories. There is no occurrence count in the type. A normalized E1 | E2 union describes permitted categories; it does not merge two E1 payloads or itself encode several values. An ordinary explicit .err(error) constructs a singular failure; failure aggregation and capture can preserve several under the same flat outcome contract. This extends the earlier one-error-only description of Result without changing ordinary success construction or the count-free declaration rule. A single active success-or-failure outcome is still distinct from simultaneous success and failure.

The public type must suffice for recovery: passing/storing an outcome cannot lose multiplicity because its capture provenance is no longer visible at a call site. Ordinary stored-value widening must preserve all occurrences and origins. Ordered collector recovery is selected; the generalized .err pattern payload shape, public origin-inspection API, carrier construction, ownership, and ABI remain open. Existing scalar .err examples describe ordinary singular outcomes and do not define aggregate inspection.

## Capture normalizes one outward outcome layer

Capturing an operand with outward result T ! E produces T ! (E | Panic), rather than (T ! E) ! Panic. On ordinary success the payload is T; on returned failure its E occurrences enter the captured failure side. This is an explicit operation at the capture boundary, not implicit extraction of every Result encountered during execution.

A deliberately nested Result inside the success type T stays data. Discarded or stored inner Results are not scanned for .err. Result-valued arguments still need their own explicit handling when a parameter expects a plain payload. Plain return, tagged return, break/continue, and function-targeted postfix ! remain exits; `?` does not convert those transfers into successful or failed captured values.

## Recover stored failures later

An else on a stored flat outcome inspects its retained occurrences. A matching clause consumes all matches and runs once; the unmatched remainder remains in the resulting outcome. New handler failures join that remainder. This processing does not rerun the original operation.

```text
attempt := ({ op2() })?;  /* T ! (E1 | E2 | Panic) */

value := attempt
    else ...bounds: BoundPanic {
        /* bounds: [BoundPanic] */
        recover_bounds(bounds)
    }
    else ...panics: Panic {
        /* panics: [Panic]; the remaining panics */
        recover_panics(panics)
    }
    else ...errors: Error {
        /* errors: [Error]; the returned errors */
        recover_errors(errors)
    }
```

Assume all helpers return T and introduce no new failures: value has type T. With no matching occurrences, skip the clause. Each collector preserves occurrence order within its matches. Clauses execute in written else order, independently of occurrence order; splitting categories can regroup the original mixed stream.

To inspect the complete mixed stream before consuming any entries:

```text
value := attempt
    else ...fails: Failure {
        /* fails: [Failure] */
        loop fails as failure { report_failure(failure) }
        default_value
    }
```

Failure supplies the previously missing all-failures selector. Receiverless else still consumes everything supported by its target and executes once. Explicit collection is for payload access, not a prerequisite for complete munching. LP-0013 now selects typed scalar p: BoundPanic: expose the first match in occurrence order, consume/discard its other matches, and leave different categories untouched. Use ...ps: BoundPanic to expose every matching payload. Untyped broad binding and generalized .err inspection remain open.

## Types of the review examples

Assume normally completing handlers return T with no new failures. Each line below is an independent use of op1/op2; E1 and E2 are distinct returned-error categories.

```text
x11 := op1();                         /* T */
x12 := ({ op1() })?;                  /* T ! Panic */

x21 := op2();                         /* T ! (E1 | E2) */
x22 := op2() else :E1 { default_value } /* T ! E2 */
x23 := op2() else { default_value }    /* T */
x24 := ({ op2() })?;                  /* T ! (E1 | E2 | Panic) */
x25 := ({ op2() })? else :E1 { default_value } /* T ! (E2 | Panic) */
x26 := ({ op2() })? else { default_value }     /* T */
```

x23's normal type T does not promise that the original call cannot panic: bare operation recovery retains its selected scope. x26 handles the panics already stored by explicit capture. x25 removes returned E1 occurrences while retaining E2 and panics. Handling only BoundPanic cannot exhaust the open Panic family; the remaining type is conservatively Panic unless a separate proof establishes full coverage. No public subtraction-type syntax is selected.

If a handler returns U, successful recovery may produce T | U. A handler's new outward failures remain possible. A handler that transfers out supplies no normal value at this continuation.

## Explicit extraction and propagation

```text
attempt: T ! Panic;
value := attempt!;  /* T on the continuing path */
```

Postfix ! evaluates its operand once. Success supplies one outcome layer's payload. Failure forwards every retained occurrence, preserving categories, origins, multiplicity, and order. Returned errors leave the nearest function/closure subject to its declared error coverage; captured panics resume their panic channel through applicable exited-scope cleanup. They do not become ordinary returned errors merely because capture stored them. Mixed forwarding needs an eventual transport implementation that preserves both channels and existing primary/secondary provenance.

This is a function/closure-directed exit on failure, not emission of a new local failure for the next else to catch. It does not dynamically search surrounding local handlers before returning from that function/closure. Panic delivery outside the exited activation retains the ordinary panic policy. A later enclosing recovery clause cannot intercept the ! control-flow transfer itself. Cleanup can still introduce failures under its existing rules. Uncaptured panics arising while evaluating the operand retain their ordinary boundary behavior; ! does not establish a capture boundary.

```text
value := (
    attempt
        else :BoundPanic { default_value }
)!;
```

This recovers bounds panics locally and forwards whatever remains. The stored attempt binding retains its declared T ! Panic contract; the expression producing value has normal type T. A plain T function may forward captured panics without inventing a returned-error declaration. Forwarded E errors still require E coverage. A successful instance of a fallible type does not silently become statically infallible.

## Exhausted failures yield an ordinary value

No extra extraction is necessary when recovery proves that no possible failure remains on the continuing path:

```text
attempt: T ! (E1 | E2 | Panic);

a := attempt else :E1 { default_value } /* T ! (E2 | Panic) */
b := a else :E2 { default_value }       /* T ! Panic */
c := b else :Panic { default_value }   /* T */
```

Again assume each handler produces T without new failures. With no remaining failure alternative, the recovery expression is T. An actually empty remainder during one execution is insufficient if other admitted paths can still fail. Recovery or explicit propagation must account for those paths. This introduces no public empty-failure type or general coercion from an arbitrary T ! E to T, and does not recursively unwrap a Result deliberately stored inside T.

## Manual raise and remaining caught-group forwarding

LP-0012 selects manual failure capability and eligible error inference; [LP-0014 r1](proposals/LP-0014-directed-failure-exits.md) now makes raise failure / raise ...failures a directed failure exit to the nearest function/closure, or an explicit enclosing block with @outer. The transfer bypasses inner else/? boundaries after operand evaluation; surrounding recovery/capture of the completed target may handle its outgoing failures. Error/Panic origin determines the channel, not a different target. LP-0013 selects typed scalar first-match exposure and intentional discard of other matches; ellipsis exposes all matches. Other unmatched failures during a nonlocal exit remain [draft LP-0011 r3](proposals/LP-0011-explicit-failure-raising.md). See [boundary examples](manual-failures-and-inference.md#directed-raise-boundaries) and [the shortfalls list](failure-handling-shortfalls.md).

## Implementation and remaining decisions

An open Panic family requires enough retained category/payload information for supported typed matching across separate compilation. It does not require a complete static panic-effect list, reflection on arbitrary objects, a common heap object, or a mandated unwinder. Retaining dynamic occurrences and providing [T] count/indexing have real storage/provider requirements. Allocation, retention failure, ownership, foreign boundaries, repeated capture, complete postfix precedence, aggregate .err inspection, and mixed-channel forwarding ABI remain open. No zero-runtime or allocation-free guarantee follows from the flat spelling.
