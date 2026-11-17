# Unambiguous meaning

Status: **language-wide design principle selected 2026-11-17**. When a program has multiple distinct viable meanings and the language rules and available context do not determine one, Lite rejects it with a diagnostic. The compiler must not silently choose based on discovery order, implementation convenience, or an undocumented preference. Give the author useful information to resolve the ambiguity; exact diagnostic wording and disambiguation syntax are not yet specified. This is a design requirement, not a claim that all compiler checks are implemented.

This principle applies across syntax, name resolution, type and literal inference, overload-like candidate selection, and other contexts where multiple interpretations could change program meaning. Established language rules and context can resolve a case: for example, documented operator precedence determines how an expression groups. Multiple spellings or aliases of the same type do not by themselves create different type identities. Nor does the principle prohibit explicitly programmed runtime choices; a program can intentionally choose between alternatives at runtime under the relevant language rules.

Specification cases, not executed compiler tests:

- **numeric-member-unique:** `x: (Int64 | String) = 0;` is intended to produce an active Int64 value containing zero, subject to the literal and union-inference contract.
- **numeric-member-ambiguous:** `x: (Int64 | Int32) = 0;` must produce an inference error if both distinct numeric members remain viable and context supplies no unique resolution. The compiler does not silently choose one.
- **numeric-member-typed:** `n: Int64 = 0; x: (Int64 | Int32) = n;` supplies the already typed Int64 member, subject to ordinary union admission.
- **same-identity-alias:** alternative names for the same type identity do not alone create a conflict between distinct candidate types.

Exact numeric literal compatibility, the complete catalog of resolution rules, and the information required in each diagnostic remain separate design work. See [union initialization](union-initialization-policy.md) and [types and inference](types-and-inference.md).
