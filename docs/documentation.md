# Documentation maintenance

Status: selected project process, 2026-11-03.

Documentation is part of every language and tooling increment. A reader should
be able to start with a small runnable example, find its explanation, follow
the owning rule, inspect its cases and discover related topics.

## Reading and navigation

- Use [start here](lite://doc/start-here) for installation and the first working program.
- Use [the language tour](lite://doc/tour) for short examples and links into the reference.
- Use [the documentation index](lite://doc/overview) for topic browsing and reading paths.
- Use [the site architecture guide](lite://doc/site-architecture) for the static site pipeline, browser worker protocol, and portable Learn/Gym schemas.
- Use [the normative map](lite://doc/normative-pages) to locate the owner of each rule.
- Use [the current compiler guide](lite://doc/compiler/overview) and
  [transition](lite://doc/compiler/transition-plan) for implementation status.
- Use [proposals](lite://doc/proposals/README) and [investigations](lite://repo/research/investigations/README.md)
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
Link historical implementation files to an exact preserved Git revision, so
those links remain useful in archives that omit the handwritten reference.

When changing a contract, search for affected explanations, snippets, examples,
samples, manifests, editor grammar and CLI help. Update them with the change.
Provisional diagnostics and unresolved semantics must remain explicitly marked.

## Accessibility

Write in plain English with short explanations and concrete examples. Use a
logical heading hierarchy, descriptive links, text alternatives for meaningful
images and fenced code with a stated purpose. Convey status with words, not
color alone. Keep source Markdown useful offline and readable on narrow screens.
Avoid requiring JavaScript, hover, animation or a diagram to understand a rule.
The generated static website retains keyboard navigation, visible focus, readable
contrast, and a responsive layout across `/learn/`, `/gym/`, `/docs/`, `/modules/`,
`/tools/`, `/gallery/`, and `/playground/`; see [site architecture](lite://doc/site-architecture).

## Checks

Run `./bin/lite doctor --docs` for local Markdown links/fragments, fences and editor
version consistency. `./bin/lite doctor` also runs both strict TS configurations.
Cross-document links across branding, spec, design, proposals, compiler, and Academy
use canonical `lite://` URIs validated by `./bin/lite docs --check` and post-build
site verification (`validateBuiltSiteReferences`).
The [documentation configuration](lite://repo/config/documentation.json) owns landing
destinations and source-backed snippet registrations. Registered fences are
compared with their separate source files, so entry-guide examples cannot drift
silently. Register additional runnable snippets as their cases become available.
Use `./bin/lite docs QUERY` to search titles/headings/paths offline, or
`./bin/lite docs --json QUERY` for structured discovery. The same entry points live
under `bin/`; `lite check FILE` retains its source-checking meaning.

Check local links and fragments, heading/fence structure, document discovery,
version consistency and sample coverage. Run the exact generated compiler cases
referenced by runnable documentation. Documentation-only changes need these
checks, not an unrelated compiler rebuild. Keep failed accepted-language cases
visible rather than excluding them from status reports.

The [documentation research](lite://doc/research/documentation-patterns) records the
external patterns behind these choices. Continue with the [workflow](lite://doc/development-workflow).
