# Language documentation patterns

Inspected 2026-11-03. These are documentation presentation observations and Lite
adaptations, not language-feature adoption or claims about compiler correctness.

## C3

The [C3 site](https://c3-lang.org/) combines a concise introduction and code
examples with grouped learning/reference navigation, search, a playground link,
single-page documentation, specification and standard-library destinations.
Its [examples](https://c3-lang.org/language-overview/examples/) present language
constructs as inspectable code.

Apply in Lite: a brief entry page, an example-led tour, grouped reference topics,
clear routes to tools and implementation status, stable links and search.

## V

[V's home page](https://vlang.io/) showcases practical code and links to examples,
documentation, tutorials, library docs and a playground. Its
[documentation](https://docs.vlang.io/) has search, topic navigation, a single-page
view and section pages, with source/edit links and revision information.

Apply in Lite: easy movement between examples and owning explanations, a searchable
local index, and explicit revision/status evidence. Performance claims need their
own reproducible measurements; a showcase is not evidence of conformance.

## Rust

[Rust's learning page](https://rust-lang.org/learn/) gives separate routes into a
book, example-based learning, exercises, the reference, library documentation,
tool books and error explanations. It also identifies offline documentation.

Apply in Lite: label reading paths by reader purpose, retain a detailed reference,
and keep beginner entry pages short. Source Markdown remains the offline baseline.

## Lite's current constraints

Lite has substantial selected design but partial generated compiler coverage.
Runnable showcases must link to reviewed cases and state the execution lane.
Reference fragments may describe selected but unimplemented behavior. Expose that
distinction throughout navigation instead of presenting the whole design as shipped.

See [documentation maintenance](../documentation.md) and [the index](../README.md).
