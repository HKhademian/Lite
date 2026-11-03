# Documentation maintenance

Status: selected project process, 2026-11-03.

Documentation is part of every language and tooling increment. A reader should
be able to start with a small runnable example, find its explanation, follow
the owning rule, inspect its cases and discover related topics.

## Reading and navigation

- Use [start here](start-here.md) for installation and the first working program.
- Use [the language tour](tour.md) for short examples and links into the reference.
- Use [the documentation index](README.md) for topic browsing and reading paths.
- Use [the normative map](normative-pages.md) to locate the owner of each rule.
- Use [the current compiler guide](../compiler/README.md) and
  [transition](../compiler/transition-plan.md) for implementation status.
- Use [proposals](proposals/README.md) and [investigations](../investigations/README.md)
  for unfinished design. Keep historical alternatives clearly identified.

Each new guide needs a descriptive title, purpose, status, prerequisites where
needed, concrete examples, related-topic links and a way back to the index.
Reference pages link to the owning rules rather than copying them. Preserve
stable headings and links; provide a replacement link when a page moves.

## Truth and freshness

Distinguish selected design, generated-TS support, historical T00 support,
experimental proposals and deferred C/native work. Acceptance, case registration,
successful compilation, runtime conformance and self-hosting are separate claims.
Attach measurable claims to named commands, scenarios and dated evidence.

Use current guides for current behavior and dated ledgers for history. Do not
leave current commands hidden below obsolete introductions. Never infer that a
design-reference fragment runs merely because it is valid selected syntax.

When changing a contract, search for affected explanations, snippets, examples,
samples, manifests, editor grammar and CLI help. Update them with the change.
Provisional diagnostics and unresolved semantics must remain explicitly marked.

## Accessibility

Write in plain English with short explanations and concrete examples. Use a
logical heading hierarchy, descriptive links, text alternatives for meaningful
images and fenced code with a stated purpose. Convey status with words, not
color alone. Keep source Markdown useful offline and readable on narrow screens.
Avoid requiring JavaScript, hover, animation or a diagram to understand a rule.
Future web presentation must retain keyboard navigation, visible focus, readable
contrast and a usable mobile layout; this guide does not claim a site exists.

## Checks

Check local links and fragments, heading/fence structure, document discovery,
version consistency and sample coverage. Run the exact generated compiler cases
referenced by runnable documentation. Documentation-only changes need these
checks, not an unrelated compiler rebuild. Keep failed accepted-language cases
visible rather than excluding them from status reports.

The [documentation research](research/documentation-patterns.md) records the
external patterns behind these choices. Continue with the [workflow](development-workflow.md).
