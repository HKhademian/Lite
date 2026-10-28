# INV-NNN — Topic title

Status: not started
Contributor: unassigned
Last updated: YYYY-MM-DD
Catalog brief: [INV-NNN](TOPICS.md#inv-nnn)
Covered subtopics: INV-NNN.NN (or whole topic; name the actual coverage)
Subtopic brief: [INV-NNN.NN](SUBTOPICS.md#inv-nnn-nn) (omit for a whole-topic note)

This is a non-normative investigation note outside the language draft. Recording
an option or recommendation here does not select a language rule.

## Investigation question

State the specific question being investigated and the boundaries of this note.
Keep unrelated questions under their own catalog IDs. For multiple subtopics,
record each one's status and distinguish answered questions from remaining ones.

## Current contracts and evidence

Link the current owning language pages and relevant decisions. Distinguish
selected rules, proposals, open questions, and historical material. Record the
repository revision and any changes in progress that affect the evidence.

## Concrete cases

Use small, focused examples, including ordinary exercise use and boundary cases.
Mark unselected syntax explicitly. Vary one relevant property at a time.

## Options and consequences

For each option, explain observable behavior, safety obligations, compatibility
with selected contracts, and representation, allocation, copying, dispatch,
checking, and cleanup costs where relevant. Separate compiler work from generated
execution and shared runtime support. Identify assumptions rather than silently
choosing them.

## Verification and limits

Record exactly what was checked, how, and the result. Distinguish document
consistency checks, reference-language experiments, and actual LiteLang execution.
The current repository is design-only; document examples are not execution proof.
Use primary sources for external technical claims and record their versions or
access dates when relevant.

## Findings and remaining questions

Separate evidence, interpretation, and recommendations. Link related topic IDs
when a question crosses boundaries. A recommendation remains a recommendation
until accepted through the project's decision process.

## Decision references

Link any explicitly accepted decision or proposal separately. Summarize its
boundary without treating this note as the owning language specification. If no
decision has been made, say so.

## Handoff

Summarize the current question, evidence collected, unresolved assumptions, and
where another contributor can resume. Do not turn the handoff into an implementation
plan unless that work has been requested.

Follow the [atomic commit requirement](README.md#atomic-commit-requirement):
commit this bounded investigation update together with its tracking and all
affected decision/reference pages. Keep independent work in separate commits and
preserve unrelated changes. Check the focused diff and relevant documentation
before committing. Report the resulting commit ID and verification limits in the
handoff message; do not attempt to embed a commit's own ID in its contents. If
committing is blocked, report the blocker and exact uncommitted scope instead of
claiming completion.
