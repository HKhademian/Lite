# INV-072 — Small VS Code highlighter

Status: recorded (bounded editor implementation; wider tooling questions open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-072](TOPICS.md#inv-072)
Covered scope: local VS Code syntax highlighting for .lt and .lts.

Subsequent status, **2026-10-31**: the user explicitly approves the temporary
textLength/textAt/textSlice helpers after the focused review. Earlier pending
consent statements in this dated increment describe its original baseline, not
the current status. See [INV-016 approval](INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31).

## Authorization and scope

The user explicitly requested a small VS Code highlighter after requiring
explicit consent for new language syntax/features. This implements that editor
request using existing documented lexical forms. It adds no language syntax,
new builtin, diagnostic rule, or runtime behavior. Coloring a token is not
approval for the token's design or proof that the igniter implements it.

The [extension](../../editors/vscode/README.md) is a declarative TextMate grammar,
language registration and small editor configuration, with no activation code
or runtime dependencies. Both file extensions use the visible language name
Lite. Standard scopes let the current VS Code theme choose the colors.

Nested ordinary comments and exact-hash-count raw comments follow
[existing comment rules](../../docs/comments.md), including raw comments inside
ordinary comments and no // line comments. Multiline double-quoted strings,
basic escapes, decimal numbers, documented keywords/operators, common scalar
type names, function declarations/calls, tags and punctuation receive lexical
scopes. Ordinary call coloring makes no builtin/permission/name-resolution claim.
Block-comment toggling and bracket/quote pairs use existing delimiters.

The full grammar remains open: highlighting is approximate and preserves that
boundary, including compact colon-prefixed operators and Unicode identifier details.
No snippets, formatting, code execution, language server, debugger, new warning,
or semantic validation is included. The earlier experimental text helpers remain
unapproved and receive no special builtin scope.

## Evidence and distribution

Nine tests use VS Code's real TextMate/Oniguruma engine. They cover ordinary and
Unicode names, strings/escaped quotes, nested/raw comments, exact raw fences,
unfinished multiline regions, keyword boundaries, no line comments, longer
operators, and tokenization of all current lessons and igniter examples.
Development tools are version-pinned in the lockfile and excluded from the VSIX.
The standard VS Code packager builds a roughly 4.3 KB VSIX. VS Code 1.143.1
successfully installs it into an isolated temporary profile; the normal editor
profile is unchanged. No rendered-editor/theme appearance check is claimed.

The package is local and unpublished; lite-local is its local publisher ID,
not a Marketplace account claim. The extension guide explains building the VSIX,
installing through Install from VSIX, and previewing with the supplied F5 launch
configuration. Tokenization/packaging evidence is not language conformance or
proof of every theme's visual appearance. No interpreter changes are required.

Primary implementation references:
[syntax highlighting](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide),
[language configuration](https://code.visualstudio.com/api/language-extensions/language-configuration-guide),
and [VSIX packaging](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## Handoff

Commit the editor package, test/lockfile, installation guide and tracking links
atomically. No igniter release tag changes: this is independent editor tooling.
Any new syntax/features discovered while using the highlighter still need an
investigation when appropriate and explicit user consent before implementation.
