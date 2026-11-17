# Union match: known members and an implicit unknown guard

Status: **user-proposed direction, 2026-11-17; under review**. The examples
illustrate reasoning, not implemented syntax, a selected panic API, or a completed
revision of match semantics. The current [match](../../../docs/match.md) and
[union-pattern](../../../docs/union-patterns.md) contracts remain the baseline
until reconciled explicitly.

## User's examples and intent

The user describes a union `X := Int | String | Float` and a match with an Int
arm and `_` as its final arm. The proposed interpretation is that `_` handles
remaining **listed member types** (String or Float), followed by a mandatory
implicit guard for a Kind that does not select an allowed member. The user's
`panic_unreachable()` spelling is illustrative: it expresses a defined failure
path, not an existing built-in function or permission for undefined behavior.

The user also asks about mixed reasoning in the same match: after an Int type
arm, a string-content pattern such as `"hello {name}"` may select some String
values, with `_` handling the remaining allowed values. Each pattern needs an
implicit type selector where appropriate, so an unknown or corrupted Kind does
not accidentally run an ordinary matching or fallback body.

## Conceptual trace

Assume `X` normalizes to the distinct members `Int64 | String | Float64`. The
following descriptions do not select syntax for the string pattern, type-test
alternatives, unknown-state handling or generated code:

1. **Subject:** evaluate the matched subject once, preserving the existing
   pattern evaluation, ordering, access and control-transfer contracts.
2. **Int arm:** only an active, allowed Int64 member can enter its body. If it
   matches and returns, later arms and the final guard are not executed.
3. **String-specific pattern:** only an active, allowed String member is
   eligible for the string pattern. Run the pattern under its eventual rules;
   if it matches, enter that arm. A failed partial string pattern does not
   eliminate all String values from the remaining possibilities.
4. **Source `_` arm:** on this proposal it matches the remaining values of
   allowed member types. After the Int arm and a partial String pattern, that
   can include unmatched String values and Float64 values. The current
   subject-match contract makes `_` a readable ordinary binding, so any semantic
   type filter must preserve that binding and its scope; expanding it to
   type-only patterns must not silently discard it.
5. **Final guard:** if no selected arm handled the subject because its Kind
   was zero/no-type or otherwise did not identify an allowed member, the user's
   proposed mandatory fallback produces a defined panic/failure. Its precise
   category, syntax, recovery and interaction with an explicit unknown handler
   remain open. It must not run after an ordinary successful arm that completes
   normally or transfers control; it guards failure to select an allowed arm.

For a match with just an Int arm and `_`, the latter can be reasoned about as
covering the remaining String and Float members, subject to retaining `_`'s
binding behavior. The user's conceptual `:String or :Float` is an explanation
for this type coverage, not necessarily an equivalent source-to-source rewrite.
Arm guards or partial tests can leave values from a type in later arms; they do
not remove that whole type merely because the type appeared earlier.

## Boundaries and unresolved decisions

- **Known members versus unknown:** a zero Kind has no active type in the
  current user direction; whether the containing value is a valid observable
  zero state and how it is explicitly handled remain under review. Do not call
  every zero state corrupted. An unrecognized nonzero reference, or a globally
  known type not listed in this particular union, also needs defined handling;
  their detailed classification is not yet selected.
- **Coverage versus runtime guard:** preserve the selected requirement that a
  source match cover its known subject alternatives, unless revised explicitly.
  A runtime guard against an unknown Kind does not justify a source match that
  simply forgets a valid member or allow a failed partial String pattern to
  panic when the match claims normal exhaustive coverage.
- **Failure versus undefined behavior:** the proposed guard must perform a
  defined failure, never an optimizer-only assumption that unknown values cannot
  happen. Its exact panic or error contract, and how an explicitly written
  unknown handler interacts with it, need user decisions. The current match
  documents do not select a synthesized panic for a missing arm.
- **Payload validity:** a recognized tag alone does not establish that a
  foreign String pointer or other payload is valid, nor can a tag check detect
  corruption into another valid tag. Define external-memory validation,
  synchronization and ownership separately. Do not read, copy or clean up an
  unknown payload as a known member.
- **Optimization:** a compiler may eliminate checks only when its proof covers
  actual origins, aliasing and mutations and preserves the required observable
  failure behavior. The user is seeking a safe guard, not undefined behavior.
- **Interaction with current rules:** `_` is currently an ordinary readable
  subject binding and an unconstrained fallback. Limiting it to listed members,
  adding a default guard for unknown Kind, and allowing an observable empty union
  each require reconciliation with that contract and the older member-only zero
  rule. No compiler support for the proposed behavior is claimed.

Relevant cases for a future contract: each listed member; zero Kind; unknown
nonzero Kind; globally known but unlisted member; matching and non-matching String
patterns; a readable `_` binding; side effects in the subject and patterns;
normal completion and early return; and a valid tag with invalid payload. The
fault category, actual case syntax, diagnostics and relevant implementation
targets need a later decision.
