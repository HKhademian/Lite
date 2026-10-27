# LP-0012 r1: Manual failures and escaping-error inference

- ID: `LP-0012`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: the blanket explicit-result-annotation requirement for escaping returned errors in eligible unannotated body inference; selects raise rather than the unselected throw error shorthand. Revises the manual Panic raise direction explored by draft LP-0011 without selecting group-forwarding or remainder policy.
- Superseded by: none.

## Selected behavior

Programs may define custom recoverable Error categories and implicit-failure Panic categories. Classification is explicit in the type's contract, not guessed from a name; exact declaration/conformance grammar and overlapping membership rules remain open.

raise expression evaluates its required operand once. An established Error-category operand exits the nearest function/closure with a returned failure, like return .err(expression). An established Panic-category operand initiates ordinary typed-panic propagation and can reach eligible local recovery/capture. Raising supplies no normal local value and runs required cleanup under existing retention rules. Constructing a failure value alone does not raise it. Reusing a caught value does not secretly change raise into a bypass-local-handlers operation.

Extend existing nonrecursive callable body-result inference with established inputs: when no explicit or expected result contract supplies the output, infer successful completion type T and the normalized union E of escaping returned errors. Include Error raises, explicit .err returns, errors forwarded by !, and outward fallible tails. Exclude locally handled/stored nonescaping errors, nested callable bodies until their outcomes are used outward, and implicit panics. Declarations contain categories without counts. Deliberately nested successful Result payloads remain data.

Explicit/expected outputs remain constraints. A declared plain T allows no escaping returned errors; a declared T ! E cannot silently widen. An inferred contract also must cover all its escaping errors. Recursive cycles need enough explicit contract to establish the result; general recursive inference, public signature policy, and no-normal-completion success inference remain open.

## Example

Assume InvalidUser belongs to Error, CorruptedAuthState belongs to Panic, and createSession returns Session:

```text
authenticateUser := fn(user: User) {
    if not isUserValid(user) {
        raise InvalidUser { reason = "Invalid credentials" };
    }
    if isAuthStateCorrupted() {
        raise CorruptedAuthState {};
    }
    createSession(user)
}
/* inferred fn(user: User): Session ! InvalidUser */
```

authenticateUser(user)? has Session ! (InvalidUser | Panic). Ordinary calls do not capture or enumerate panics. Existing ?, !, ordered munching, collectors, and cleanup contracts remain selected. In particular, a block-level ? does not intercept an Error raise's function-directed exit; capturing a call can instead receive that function's returned error outcome. Manual Panic raise can reach an active local capture boundary. Manual raise and inference add no new mandatory runtime service; transport/storage costs remain separate and unmeasured.

## Remaining boundaries

Manual panic emission is distinct from explicit outward forwarding of a caught group. The latter remains draft LP-0011 r2, especially scalar multi-match binding and unmatched remainders. A nonlocal Error raise inside a partially handling catch cannot silently discard other pending failures. Exact custom category syntax, overlapping/mixed operand classification, re-emission provenance, general grammar, and implementation remain open.

## Revision history

`r1` selects custom failure capability, required-operand manual raise with category-based channels, and escaping-error inference within the existing eligible body-inference boundary. It retains explicit/expected contract checking and records unresolved declaration, forwarding, and recursive-inference boundaries. No release or execution result is created.

Normative owner: [manual failures and inference](../manual-failures-and-inference.md). Related: [functions](../functions.md), [Result](../result-and-errors.md), [capture](../failure-capture-and-unwrapping.md), and [remaining shortfalls](../failure-handling-shortfalls.md).
