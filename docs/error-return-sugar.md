# Throw as an error return

Status: **historical unselected throw shorthand; manual raise selected instead, 2026-10-27, LP-0012 r1**. The comparison below preserves earlier proposal reasoning. LP-0014 now makes both Error and Panic raise directed exits, with a function/closure default or explicit block target; their outgoing channels remain distinct. Eligible omitted outputs may infer escaping returned errors. See [manual failures and inference](manual-failures-and-inference.md).

## Core equivalence

Inside a function returning T ! E:

```text
return .ok(value); /* explicit success */
return value;      /* recommended implicit success when value fits T */

return .err(error); /* explicit failure */
throw error;        /* proposed shorthand for that failure return */
```

T ! E denotes the conceptual Result of T or E, and T! means T ! Error. These are semantic outcome contracts, not a promise about the physical return representation. The compiler may choose an appropriate layout or calling convention under the eventual ABI rules.

The success shorthand uses the existing contextual construction rule. An already compatible Result is forwarded unchanged under the existing conversion boundary; it is not wrapped in another success. Explicit .ok construction remains useful when an actual nested outcome is intended. Complete constructor inference and nested-Result ambiguities remain open.

## Example

```text
validate_age := fn(age: Int): Int ! AgeError {
    if age < 0 {
        throw AgeError.Negative;
    }

    age
}
```

Assume AgeError supplies the illustrated case. The final age supplies implicit success. The early throw supplies explicit failure with the same meaning as return .err(AgeError.Negative).

## Boundary and typing rules

- Evaluate the throw operand once and require its error payload to fit E under the existing declared-error compatibility rules.
- Exit the nearest function or closure with its failure outcome. Ordinary nested blocks do not become error-return boundaries.
- A plain T-returning function cannot use throw to escape with an undeclared recoverable error. An outer fallible function does not make a nested nonfallible closure fallible.
- A throw does not complete locally with a value; it has the same control-flow status as an early return. It can therefore occupy an exiting branch without adding Unit or another alternative to that branch's normal result.
- Run the same applicable structured cleanup as the equivalent return. Cleanup-failure precedence follows the selected [finally contract](finally.md#pending-outcomes); aggregate inspection and the extension to proposed cleanup mechanisms remain open.
- Require an operand initially. No bare rethrow, implicit current-error binding, or throw @tag form is proposed.

When success and error payload types overlap, choose the outcome side explicitly through the operation: a plain compatible success value uses return; a failure uses throw or return .err. An error-like payload type alone must not make a plain return select failure.

Errors can still be constructed and retained as ordinary values. A nonfallible function can inspect or store a local Result; it must handle failures before returning its ordinary success value. Declaration requirements concern errors escaping through its return channel, not a ban on local error data.

## Callers and recovery

```text
age := validate_age(input)!;

age := validate_age(input) else {
    0
}
```

The first call explicitly propagates under its enclosing declared error contract. The second handles failure locally. A plain call still yields an ordinary Result that can be stored and matched as .ok/.err; throw does not introduce automatic call-site propagation or handler lookup across calls.

For the separately proposed flat checked binding:

```text
[a, b] := values else(error) {
    throw error;
}

use_pair(a, b);
```

The new spelling makes the handler's early failure return shorter. The checked-binding grammar and its error contract remain proposals in [checked collection operations](checked-collection-operations.md).

The expansion requires only the existing typed failure-return mechanism. It does not itself require dynamic stack-handler search, an exception object hierarchy, stack traces, or a panic. Cleanup and error-value construction can still have their own costs; no measured performance claim follows from the shorthand.

## Reference comparison

Swift demonstrates that throw spelling can accompany declared fallibility without requiring traditional exception stack unwinding. Its throwing functions and try/do-catch model are not identical to LiteScript's first-class Result return contract. Source: [Swift error handling](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/ErrorHandling.md).

C# uses throw for exception handling with a search for a compatible catch along the call stack. That established association is a naming tradeoff for teaching; LiteScript would define the word through the exact local error-return equivalence above. Source: [C# throw](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements#the-throw-statement).

Historical recommendation only: the earlier throw spelling was not selected. LP-0012 now selects raise expression with category-based behavior and eligible escaping-error inference. The old explicit-annotation-only restrictions below do not override that current contract.

Related: [Result and errors](result-and-errors.md), [fallible types](fallible-types-and-error-composition.md), [control-flow exits](control-flow.md), and [panics](panics.md).
