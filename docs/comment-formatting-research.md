# Comments in modern formatters

Status: **research snapshot, 2026-10-25; opaque-content/attachment-preserving LiteScript comment formatting subsequently selected on 2026-10-25; exact layout algorithms, singleton normalization, and explicit directives remain open**. Ali's editing sequence and ordinary/raw comment neutrality in parsing are selected separately. No LiteScript parser or formatter implementation is claimed.

## Question and result

A comment contributes no executable operand. Does that also mean formatting is unchanged when a comment is inserted or removed?

The evidence supports a distinction: executable parsing ignores ordinary comment bodies, while formatters retain comments and their positions as input to printing. A comment may therefore affect line breaks or its surrounding layout without becoming executable code. Special formatter directives are a separate, explicit tool contract in several ecosystems. No inspected source establishes that every commented-out entry must always pin every containing expression to a vertical layout.

For LiteScript, this is a design comparison. Ordinary/raw comment bodies remain opaque trivia; the investigation does not select parsing their contents as disabled operands or introducing implicit formatter directives.

## Deno fmt

Official Deno documentation describes its formatter's use of dprint and documents explicit deno-fmt-ignore and deno-fmt-ignore-file comments. These are recognized tool controls, not operands. The underlying dprint TypeScript documentation also describes preserving some existing binary/member-expression breaks; a single universal AST-only layout rule would not describe those choices. Sources: [Deno formatting](https://docs.deno.com/runtime/lint_and_format/), [Deno CLI ignore controls](https://docs.deno.com/runtime/reference/cli/fmt/#ignoring-code), and [dprint TypeScript behavior](https://dprint.dev/plugins/typescript/).

Locally tested: Deno 2.7.14. It compacted a plain singleton initializer, but retained the own-line comment and the multiline initializer in the corresponding comment case below. These observations cover these inputs and version, not every possible block comment. The local version does not accept the newer --no-editorconfig flag; the final successful probes used --no-config in an isolated temporary directory.

## Bun fmt

Current official Bun docs describe a built-in bun fmt, Prettier-compatible output, and explicit prettier-ignore comments for skipping the next statement/element/rule. The documented import-sorting feature moves directly preceding comments with their imports, illustrating deliberate attachment handling. These are upstream documentation findings, not observations from a local Bun formatter run. Source: [Bun formatter](https://bun.sh/docs/format).

The installed Bun is 1.3.10. Its bun fmt --help returns Script not found for fmt. This establishes only that the installed version lacks this command; it does not contradict the newer upstream formatter documentation. No Bun formatter probe or output is claimed, and no runtime was upgraded for this investigation.

## Rustfmt

Rustfmt separates formatting code from optional comment rewriting. The official configuration reference lists wrap_comments=false and normalize_comments=false by default, with both options marked unstable. The latter can convert block comments into line comments when enabled; this is not an always-active default. Source: [Rustfmt configuration](https://raw.githubusercontent.com/rust-lang/rustfmt/master/Configurations.md), sections wrap_comments and normalize_comments.

Locally tested: rustfmt 1.9.0-stable, revision 8bab26f4f6, reported date 2026-07-14, edition 2024, with an isolated config specifying max_width=100. Like the Deno probe, the plain initializer compacted while the own-line block-comment case retained its multiline placement. The binary-expression probe also retained the comment boundary. These format-only runs do not type-check or execute the undefined example flags.

## Dart and Flutter

Flutter's official formatting guide directs command-line users to dart format; it is not a separate formatter policy to infer from the Flutter brand. Dart's command reference explicitly allows moving comments across commas, and describes adding/removing trailing commas based on multiline layout. Sources: [Flutter code formatting](https://docs.flutter.dev/tools/formatting) and [dart format](https://dart.dev/tools/dart-format).

The dart_style configuration guide documents explicit width and format-off/on marker comments, with language-version constraints. Its FAQ discusses reversibility and the risks of treating commented-out imports as real imports during sorting. This supports retaining comments as print data rather than interpreting arbitrary comment bodies as code. Sources: [dart_style configuration](https://github.com/dart-lang/dart_style/wiki/Configuration) and [formatter FAQ](https://github.com/dart-lang/dart_style/wiki/FAQ).

Neither dart nor flutter is installed on PATH in this environment. These are documentation findings; no Dart/Flutter execution or exact output for Ali's scenario is claimed.

## Prettier as another reference

Prettier's rationale explicitly distinguishes opaque comment contents from difficult comment placement. Its general policy leaves ordinary comment text alone, with a described indentation exception for JSDoc-style blocks, while trying to keep comments near their original location. Its ignore documentation separately specifies prettier-ignore. This is not a guarantee of exact source coordinates or unchanged surrounding line breaks. Sources: [Prettier comments rationale](https://prettier.io/docs/rationale#comments) and [ignoring code](https://prettier.io/docs/ignore).

This is a documentation reference, not an independently executed Prettier probe or a claim that every Bun release reproduces every described case.

## Local probe inputs and outputs

The [captured results](research/formatter-comment-probes-2026-10-25.json) contain all eight successful probes, their commands, inputs, outputs, and idempotence results. Four inputs were sent to each available formatter: a plain singleton initializer, one with a disabled entry in an own-line block comment, a binary expression with an intervening disabled entry, and an initializer with an own-line line comment. The foreign-language line comments are reference syntax, not a proposed LiteScript comment form.

Representative TypeScript input:

```typescript
const ready =
  /* authenticated && */
  connected;
```

Deno 2.7.14 printed that input unchanged. Without the comment it printed:

```typescript
const ready = connected;
```

Representative Rust input and observed output:

```rust
fn main() {
    let ready =
        /* authenticated && */
        connected;
}
```

Rustfmt retained that layout. Without the comment, it put let ready = connected; on one indented line inside the function.

Commands used with source supplied on standard input:

```sh
deno fmt --no-config --ext ts -
rustfmt --emit stdout --edition 2024 --config-path /path/to/isolated/rustfmt.toml
```

The Rustfmt config contained max_width = 100. Every successful output was passed through the same command a second time; all eight second passes were unchanged. A rejected Deno attempt using --no-editorconfig is not counted as successful evidence. Version discovery confirmed the local Bun limitation above. No SDKs or dependencies were installed, and no project source was run through a foreign formatter.

LiteScript subsequently selected [formatter idempotence](tooling-and-learning.md#formatter-stability-and-idempotence) as its own required future conformance check on 2026-10-25. The foreign-tool second passes here remain evidence only for these captured inputs and versions; they neither verify a LiteScript formatter nor prove universal idempotence for those external tools.

These languages do not support LiteScript's leading and spelling. The probes isolate comment/layout handling using analogous valid syntax; they cannot verify LiteScript syntax, semantics, or future formatter output.

## Consequences for LiteScript

Selected: comments contribute no operand, including when their text resembles and authenticated. Ali may comment out or delete the first entry while the remaining and connected singleton remains valid. See [Ali's editing sequence](leading-separators.md#ali-removes-the-first-condition) and [comment neutrality](comments.md#neutrality-in-code-and-parsing).

Subsequently selected on 2026-10-25: retain ordinary/raw comment contents as opaque text and preserve their attachment to the same nearby code, while allowing indentation at the source position and surrounding line breaks to change. Count only real chain entries. Comment text is neither a phantom entry nor an implicit formatting command and does not itself require a specific vertical layout. This is the [selected comment-formatting contract](comments.md#selected-formatting-contract), not an adoption of another formatter's exact output.

A formatter can retain comments separately from the executable syntax tree. This remains an implementation possibility inferred from the behavior above, not a selected internal representation. Ordinary comment bodies are not reflowed or formatted as code/prose under the selected opaque-content rule.

Still open: exact attachment and line-placement algorithms, normalization of an explicitly written singleton leader, documentation-comment syntax/tooling, and any explicit formatting escape/directive mechanism. The previous suggestion to pin Ali's layout is not a blanket rule: comment presence alone requires no vertical layout. Existing compact/multiline formatting for real multi-entry chains remains selected. The external research findings and captured probes above are unchanged by this follow-up language decision.
