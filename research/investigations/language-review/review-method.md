# The onion method for language review

Status: **review workflow agreed 2026-11-15**. This document guides how the
user and contributors review Lite; it does not select language features or
claim implementation support.

## Why we are changing the process

The user observed that Lite's language design has become uneven: some areas
have accumulated detailed rules and edge cases while other fundamental areas
have barely been sketched. This makes it difficult to judge how the language
fits together, and detailed decisions may depend on foundations that remain
unsettled. Earlier discussion also drifted from the current review topic into
new questions before the original topic was finished.

The user's image is an onion: **peel one layer across the whole language before
moving to the next**, rather than extracting detail from one spot. The goal is
comparable breadth and depth, not a requirement that every topic has exactly
the same number of decisions or pages.

## The layers

Walk the ten areas in the [agreed order](README.md#ten-topics) for each layer.
The following descriptions guide the discussion; their boundaries and the
number of later passes can be adjusted as we learn more.

1. **Purpose and basic shape.** For each area, identify what it is for, its
   essential concepts, and ordinary use cases. Sketch enough to understand how
   programmers encounter it; avoid resolving detailed syntax or rare cases.
2. **Connections and boundaries.** Compare the areas, clarify the interfaces
   between them, and identify missing foundations and material conflicts.
3. **Main rules and tradeoffs.** Evaluate the principal alternatives and their
   consequences for clarity, implementation, performance, and footprint.
4. **Further layers.** Return as needed for concrete syntax, detailed
   semantics, edge cases, diagnostics, coverage, and implementation contracts.

Each pass is a review with the user, not an automatic acceptance of a complete
design. A topic may require a small prerequisite from another area before its
current layer makes sense. Bring forward only what is needed, record the
dependency and its owner, then return to the current place. Do not use an
interesting edge case as a reason to complete a later layer for one topic while
the others still lack their current layer.

## Working rules

- Maintain a visible cursor: current layer and topic, completed discussions,
  and the next bounded question. Do not count the existing preliminary notes as
  completed joint discussion merely because they are written.
- Park newly discovered questions in their owning topic and link them from the
  active discussion. Record why and when they matter; return to them in the
  appropriate layer instead of losing the original review path.
- Existing selected rules remain the baseline until deliberately revised. Their
  age or level of detail is not proof of correctness. Revisit a selected rule
  when a missing foundation, contradiction, changed assumption, or cost justifies
  it; identify what a proposed change would supersede.
- Separate selected rules, user directions under review, examples, proposals,
  open questions, and measured compiler behavior. State uncertainty explicitly.
  Illustrative `cast<UserID>(raw)` expresses conversion intent only; it is not
  selected syntax, a selected builtin, or evidence of compiler support.
- Use the existing topic notes and [cross-feature assessment](cross-feature-assessment.md)
  as prior analysis, not as accepted answers. Recheck the owning source and
  current compiler evidence when a consequential claim may have changed.
- Evaluate designs against the user's priorities: a small, lightweight Lite,
  no GC and no runtime footprint as goals, and performance competitive with or
  better than C on suitable complex applications. Distinguish these goals and
  prospective implementation opportunities from measured results. Surface
  unavoidable state, code, allocation, copying, dispatch, and cleanup costs.
- Keep the user's existing consent process: review and provisional judgments do
  not select new semantics, authorize compiler implementation, or prove native
  performance. Record accepted changes in their owning documents and the
  decision process, with the cases and checks required by project rules.

## Current position and parked work

- **Active pass:** first layer, purpose and basic shape.
- **Next topic:** 1. Core types and values, considered at the same first-layer
  depth that will later be applied to the other nine areas.
- **Joint layer completion:** no full pass has yet been completed. The ten
  preliminary assessments are starting material, not completed user review.
- **Recent direction to preserve:** the user sees UserID as equally distinct
  from String and from another distinct type such as TeacherID. Fresh
  string-like literals and established typed values have different treatment;
  the type shaping a literal must be explicitly written at its use site. See
  [the bounded discussion](01-core-types.md#user-direction-literals-and-established-values)
  for examples and unresolved conversion syntax and eligibility. These are not
  a complete distinct-type contract or a claim of compiler support.
- **Parked:** which operations a distinct type provides, including same-type
  equality and result-producing String operations, belongs to 1.5 value
  operations. Review it in the appropriate later layer rather than allowing it
  to redirect the current pass.

