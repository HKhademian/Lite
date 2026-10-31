# Lite for VS Code

A small syntax highlighter for `.lt` and `.lts` files. The language picker shows
**Lite**. Colors follow your existing editor theme.

Highlights nested block/raw comments, multiline double-quoted strings, basic
escapes, decimal numbers, documented keywords/operators, scalar type names and the approved builtin List name,
function declarations/calls, tags, and punctuation. Block-comment toggling and
bracket/quote pairing use existing Lite delimiters. There are no `//` comments.

This is a declarative TextMate extension with no runtime code or dependencies.
It adds no language syntax, snippets, builtins, formatter, runner, or language
server. Coloring is approximate lexical feedback, not parsing, typechecking,
name resolution, or evidence that a feature is selected or implemented by the
igniter. Calls use the same coloring for any identifier; unapproved experimental
helpers receive no special builtin status. Open lexical boundaries, such as
compact underscore operators, remain open.

## Install locally

Build from this directory with Node 22 or newer:

```sh
npm ci
npm test
npm run package
```

In VS Code, open Extensions, choose **… → Install from VSIX…**, and select
`lite-0.1.0.vsix`. Open a `.lt` or `.lts` file; if it already has a manual language
association, use **Change Language Mode → Lite**. Nothing is published to the
Marketplace. `lite-local` is only the local package publisher identifier.

To preview from source, open this directory as the VS Code workspace and press
F5. The included launch configuration opens an Extension Development Host with
the existing factorial example. Use **Developer: Inspect Editor Tokens and
Scopes** to inspect highlighting.

## Checks and scope

`npm test` uses VS Code's TextMate tokenizer and Oniguruma engine, including exact
raw-fence counts, nested comments, multiline strings, keyword boundaries and
project samples and the indexed examples. The package ships only the manifest, grammar, language
configuration and this guide; testing/packaging dependencies are development-only.

Source contracts in the repository: `docs/lexical-structure.md`,
`docs/comments.md`, `docs/strings.md`, and `docs/operators.md`. Implementation references:
[VS Code syntax highlighting](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide),
[language configuration](https://code.visualstudio.com/api/language-extensions/language-configuration-guide),
and [local VSIX packaging](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).
