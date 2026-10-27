# LP-0018 r1: Implicit panics without effect declarations

- ID: `LP-0018`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: the unselected checked panic-effect signature direction discussed after LP-0015. No accepted checked panic-effect system existed; LP-0009/LP-0012 outcome and implicit-channel separation is retained.
- Superseded by: none.

## Decision

Live panics remain implicit. Checked panic-effect declarations are prohibited: functions do not declare or infer exhaustive lists of every live panic that may escape from indexing, arithmetic, helpers, or other executed operations. There is no caller obligation to enumerate, handle, or add postfix extraction merely because a supported live panic is possible.

```text
calculate := fn(values: [Int], i: Int): Int {
    values[i] + 1
}

value := calculate(values, i);
/* Int; live panics may propagate implicitly. */
attempt := calculate(values, i)?;
/* Int ! Panic; supported panics are captured as explicit data. */
```

Known fault information may be useful as non-exhaustive documentation. Its format/tooling remains under investigation. It must not affect callable type compatibility, add escaping error alternatives, require transitive panic lists, or supply an exhaustive proof that other panics cannot occur. No documentary annotation syntax is selected. Existing operation-specific recovery eligibility remains a separate boundary/attribution contract; this decision does not broaden bare operation handlers.

## Explicit outcomes retain compile-time and runtime presence

Returned recoverable errors remain explicit T ! E outcomes. Capturing outward T yields T ! Panic; capturing outward T ! E yields T ! (E | Panic). Concrete categories of newly captured live panics are exposed through broad Panic rather than enumerated in the public capture type. Their concrete identity, payloads, origins, multiplicity, and order remain retained for typed matching. Specific panic category definitions and typed construction/matching remain available; prohibiting effects does not prohibit those types.

A function deliberately returning captured outcomes returns ordinary first-class data. A literal fn(): T ! Panic annotation means an explicit outcome return; an ordinary call receives T ! Panic. It is not an effect annotation whose Panic alternative is silently stripped to produce T. Capture of that call follows the same outward normalization/recapture rule as any other expression. This preserves storage, passing, and returning of captured failures without a special capture wrapper.

The exploratory `op: fn(): T ! SpecialPanic1` interpreted as a live-effect declaration with a plain T call result is withdrawn. The same ordinary outcome-type syntax can still describe explicitly returned failure data; it never guarantees which separate live panics may escape. Likewise, a normal T or T ! Error return contract does not prove panic freedom.

## Runtime and scope boundaries

No universal language-level Result return is introduced for every array access or arithmetic operator. Live faults still need supported detection/transport, and explicit captured data still needs a representation supporting typed matching and retained occurrences. This decision does not select an unwinder, heap allocation, layout, ownership, hard-abort recovery, foreign-boundary behavior, or zero-runtime implementation. Directed manual raise, applicable cleanup, and explicit capture retain their existing scope rules.

## Revision history

`r1` selects implicit live panics, forbids checked panic-effect declarations, preserves literal first-class outcome returns and broad live-panic capture, and leaves documentary fault annotations for investigation. No language/component release or execution conformance is created.

Normative owner: [panics](../panics.md#no-checked-panic-effect-declarations). Related: [capture](../failure-capture-and-unwrapping.md), [Result data](../result-and-errors.md), [manual failures](../manual-failures-and-inference.md), and [recapture](LP-0016-recapture-and-warning-policy.md).
