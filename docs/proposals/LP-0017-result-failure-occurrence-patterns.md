# LP-0017 r1: Result failure occurrence patterns

- ID: `LP-0017`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: the aggregate .err inspection/binding gap retained by LP-0009/LP-0013. Recovery consumption and ordinary stored-value copying are unchanged.
- Superseded by: none.

## Scalar and collector patterns

For attempt: T ! F, `.err(e)` matches the failure side and binds its first occurrence in occurrence order as e: F. Other occurrences are not exposed through that scalar binding. `.err(...es)` matches the same failure side and binds all occurrences in order as es: [F]. For T ! Panic, the bindings are respectively Panic and [Panic]; for T ! (ErrA | ErrB | Panic), use ErrA | ErrB | Panic and [ErrA | ErrB | Panic].

Both branches run once on a match, never once per occurrence. Success matches neither failure pattern. A successful collector match has at least one occurrence. Tag-only .err tests the failure side without binding. .ok(value) binds the entire successful T, including any deliberately nested Result data, with no recursive extraction.

Pattern inspection does not mutate or consume the stored attempt. It remains available with its original outcome and every occurrence. This differs from else, whose resulting recovery outcome consumes matched failures while preserving its unmatched remainder. Neither operation silently rewrites the original stored binding. General ignored-outcome/usage diagnostics remain separate.

## Subpatterns and forwarding

An ordinary scalar payload subpattern tests the first selected occurrence. With stored (ErrA1, BoundPanic1), `.err(p: BoundPanic)` does not search ahead and therefore does not match. Use existing typed recovery filters when category-based group selection is wanted. A failed subpattern does not alter attempt or discard any occurrence.

The first occurrence is not chosen by severity or diagnostic primary promotion. An occurrence's internal arrays, tuples, fields, or nested outcomes remain intact; collection groups occurrences, never their internal contents. This Result-specific collector does not reinterpret general constructor payloads or structural tuple-rest patterns as homogeneous arrays.

`if .err(e) := attempt { raise e }` forwards only that first bound occurrence. To forward every occurrence use `.err(...es)` with raise ...es, or outcome! for complete extraction/forwarding. The remaining stored occurrences are not secretly attached to scalar e.

## Storage boundaries

The [F] collector must provide the existing readable indexed-sequence contract, including count and positional reads. Exact copying/view/ownership, escape lifetimes, provider adaptation, allocation, origin-inspection API, and physical .err carrier construction remain open. Matching supplied failure data does not define a general failure suppression rule.

## Revision history

`r1` selects first-occurrence scalar inspection, ordered all-occurrence collection, nonmutating stored-value behavior, no hidden searching in scalar subpatterns, and no internal-payload flattening. No parser/runtime execution or zero-allocation guarantee is claimed.

Normative owner: [Result failure occurrence patterns](../result-and-errors.md#failure-occurrence-patterns). Related: [typed recovery receivers](LP-0013-scalar-recovery-selection.md), [directed raise](LP-0014-directed-failure-exits.md), and [readable sequences](../indexed-sequence-contract.md#readable-t).
