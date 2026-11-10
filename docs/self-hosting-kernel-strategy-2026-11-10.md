# Historical self-hosting strategy: TS0 to LT1

> **Status:** Historical strategy captured 2026-11-10. This records a proposed
> development path, not proof that Lite has reached any of its gates. Use the
> current [bootstrap plan](bootstrap-plan.md) and
> [compiler transition plan](../compiler/transition-plan.md) for measured
> project status.

## Purpose

Reach a verified self-hosting point with the smallest LiteLang subset that can
express and rebuild the compiler. The whole language specification is not a
prerequisite. Keep the initial compiler and its language subset small, then
grow both through repeated implementation and comparison.

## Names used in this strategy

- **TS0** is the minimal TypeScript seed compiler: the external compiler used
  to bootstrap the first Lite-written compiler.
- **LT0** is the first Lite-written compiler source, initially limited to
  features TS0 already supports.
- **LT1** is the artifact produced when TS0 compiles LT0.
- **LT2** is the artifact produced when LT1 compiles LT0.

These names describe roles in the strategy, not the repository's version or
artifact names. In particular, LT0 is source; LT1 and LT2 are generated
compiler artifacts.

## Incremental path

1. **Keep TS0 small.** Implement the minimum compiler behavior needed to make
   progress on writing a compiler in Lite. Avoid requiring unrelated language
   features or completion of the full specification.
2. **Port the supported slice into LT0.** Write LT0 using only the behavior
   TS0 can compile. Exercise the same accepted and rejected programs through
   both compilers, and compare their observable results for this agreed
   self-hosting subset.
3. **Grow in paired increments.** When LT0 needs a compiler capability, first
   implement and verify it in TS0, then adopt it in LT0. Repeat the relevant
   comparisons after each increment. Keep differences outside the selected
   subset recorded as future parity work rather than expanding the bootstrap
   gate by default.
4. **Compile LT0 with TS0.** When TS0 can compile the complete LT0 source, use
   it to produce LT1. This begins self-hosting: the generated compiler now
   contains the Lite-written compiler implementation.
5. **Verify the fixed point.** Use LT1 to compile the same LT0 source and
   produce LT2. With deterministic inputs and build settings, compare LT1 and
   LT2 byte-for-byte (or compare a documented canonical artifact if the
   artifact embeds intentionally variable metadata). A match demonstrates a
   reproducible self-hosted fixed point for the selected compiler source and
   language subset.
6. **Continue growing by the same loop.** Add the next needed language or
   compiler feature to TS0, port it to LT0, compare behavior over the
   self-hosting subset, and re-run the fixed-point ladder. Keep each increment
   independently reviewable.

## What the comparisons establish

The TS0/LT0 differential checks establish that both implementations agree on
the explicitly selected self-hosting subset. They do not claim complete
language parity. The fixed-point check establishes that LT1 can reproduce its
own compiler artifact from LT0 under the documented build conditions. Keep
these as distinct pieces of evidence and report their exact scope.

The verification set should identify the source cases and contracts included
in the self-hosting subset, run them against TS0 and LT0, compare diagnostics,
status, output, and generated artifacts where applicable, and retain a
repeatable command for the LT1-to-LT2 build. Refresh the subset inventory as
the compiler grows; do not use a stale aggregate pass count as the kernel
definition.

## Source organization and dependencies

File concatenation through an explicit ordered manifest is acceptable while
reaching the initial self-hosting point. It is a build organization choice,
not evidence of language-level module semantics. Keep source order and
dependencies explicit in the manifest or accompanying metadata.

Source imports may be added later as a Lite capability when they provide a
clear benefit and can be implemented at reasonable cost. They are not a
precondition for the initial TS0/LT0/LT1 fixed-point ladder. Import-cycle
handling and dependency metadata belong to that later feature's contract.

## Development tooling

Keep user-facing command aliases thin. A top-level `lite` command routes to
standalone operation commands; compiler, verifier, tester, doctor, and other
tools own their implementation and checks. This makes each build and parity
step directly runnable and helps catch regressions close to the change that
introduced them.

## Historical guardrails

- A successful TS0 compile of LT0 is the beginning of self-hosting, not the
  verified fixed point.
- A fixed point over the compiler source proves only the behavior and source
  exercised by that compiler build; it does not prove full LiteLang support.
- Runtime values and compile-time definitions/symbols are different compiler
  concepts. The implementation may begin with a simpler representation, but
  name resolution and evaluation rules must preserve that distinction.
- Keep source imports, a broad standard library, native C self-hosting, and
  complete language parity out of the initial kernel unless a specific
  compiler requirement demonstrates they are necessary.

## Relationship to current plans

This record preserves the TS0/LT0 strategy as understood on its date. The
[bootstrap plan](bootstrap-plan.md) carries the current owner-facing gates and
constraints, while the
[self-hosting kernel handoff](../.agents/plans/self-hosting-kernel.md)
tracks implementation work. Update those plans when a gate is measured;
retain this document as a dated explanation of the strategy rather than an
evergreen status report.
