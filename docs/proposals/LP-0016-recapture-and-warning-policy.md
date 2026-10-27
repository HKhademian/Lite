# LP-0016 r1: Recapture and suppressible warnings

- ID: `LP-0016`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned; diagnostic tooling target also unassigned**
- Supersedes: the repeated-capture normalization gap retained by LP-0009; one-outward-layer capture and deliberately nested successful outcomes remain unchanged.
- Superseded by: none.

## Decision

Capture of outward T ! Es yields T ! (Es | Panic). Existing plain-union normalization removes duplicate type alternatives. If normalized Es already contains broad Panic, Es | Panic equals Es; recapture adds no public type or Result layer. Recapturing a stored outcome is legal so callers can retain explicit boundaries while implementations evolve.

With no new failure during operand evaluation, recapture preserves the success value or all existing failure occurrences, including their payloads, origins, multiplicity, and occurrence order. Stored panics are not re-raised merely to capture them again. `(operation()?)?` evaluates operation once. Deliberately nested Result data inside the successful payload retains its layers. Union normalization never deduplicates actual failure occurrences.

An unchanged result type does not prove a redundant boundary. A callable returning explicit T ! (E | Panic) data may still produce a separate live panic before returning; capturing that call can be meaningful even though the capture type is unchanged. A new protected expression can also produce new failures. Capture does not scan unrelated stored locals or recover earlier escaped panics.

## Diagnostics

Never reject recapture or warn solely because Es already includes Panic or the resulting type is unchanged. A warning may identify a provably redundant capture boundary, but it must be suppressible and should not obstruct intentional boundaries kept for code evolution. All warnings are suppressible as a general diagnostic policy. Suppression affects diagnostics, not typing, evaluation, or failure propagation. Exact suppression syntax/configuration/scope and optional warning defaults remain open; this policy does not convert required errors into warnings.

## Revision history

`r1` selects legal recapture, union-based type stability, preservation of stored occurrences, proof-based optional redundancy diagnostics, and suppressibility of every warning. No representation, allocation, parser/runtime implementation, or performance result is supplied.

Normative owners: [capture and unwrapping](../failure-capture-and-unwrapping.md#recapture-is-allowed) and [warning suppression](../tooling-and-learning.md#warning-suppression). Related: [union normalization](../union-normalization.md) and [implicit panics](LP-0018-implicit-panics-without-effect-declarations.md).
