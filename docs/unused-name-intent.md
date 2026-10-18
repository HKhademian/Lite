# Explicitly allowed unused names

Status: **underscore-prefixed names opt out of unused-name warnings; selected 2026-10-18**.

## Purpose and rule

Use `_user`, `_left`, or another valid identifier beginning with underscore to declare that a named value or field is allowed to be unused. This is explicit diagnostic intent while retaining an ordinary, readable name.

The spelling must contain at least one character after the initial underscore. `_` alone remains the nonbinding wildcard. Names such as `__`, `_temporary`, and `_学生` are ordinary identifiers where admitted by the identifier profile and carry the unused-name intent. A trailing or internal underscore alone, as in `user_` or `user_name`, does not opt in.

## Binding examples

```text
_user := make_user();
(_left, right, _) := triple;
use(right);
```

The first declaration binds _user without requiring a later read for unused-name diagnostics. The tuple binds _left and right; the wildcard binds nothing. Unused-name warnings are suppressed for _user and _left individually, not for unrelated names in the same scope or pattern.

The names remain usable:

```text
greet(_user);
inspect(_left);
```

The prefix means **allowed to be unused**, not required to be unused. Reading such a name is legal and does not itself trigger an inverse used-underscore-name warning under this rule.

## Parameters, receivers, and fields

The rule applies to named value bindings at local or module scope, pattern bindings, function/closure parameters, loop or hook receivers, and declared record/type fields wherever unused-name diagnostics apply. For example:

```text
on_event := fn(_event: Event): Unit {
    refresh()
}
```

A field called _cache remains a real field and can be read or updated under its normal type, visibility, mutability, and ownership rules. The prefix alone does not make it private, remove it from a type, or exempt it from initialization requirements. Field declaration and representation grammar remain open independently.

With a field alias, evaluate the introduced local name independently from the source field's name. Giving a source field an underscore prefix does not automatically grant an unprefixed local alias the same diagnostic intent, and naming a local alias _left does not rename the original field. Alias punctuation itself remains a proposal.

## Normal semantics remain

- `_user` has an ordinary inferred or declared static type and is a distinct identifier from user.
- Binding reassignment requires var; held-data mutation requires mut and the usual access permissions.
- Duplicate-name and shadowing rules apply normally. `_user` is not a repeatable wildcard.
- Initializers and calls retain their normal evaluation and error behavior. A prefix does not suppress execution, drop a value early, or change a pattern's constraints.
- Naming a stored Result _attempt does not inspect, unwrap, default, or propagate it. Any separate required-use/error-handling diagnostic remains independent; its complete policy is still open.
- This suppresses unused-name diagnostics only. It does not suppress type/access errors, unreachable-code diagnostics, redundant-capability warnings, or other unrelated checks.

The basic unused-name diagnostic severities and configuration still need a full tooling policy. Where the official tools diagnose unused bindings/parameters/fields, this prefix is their explicit opt-out for that name. No compiler or linter implementation exists yet.

## Reference comparison

Rust's compiler documentation uses underscore-prefixed names to silence unused/dead-name diagnostics. TypeScript's noUnusedParameters option specifically exempts underscore-prefixed parameters; that documentation does not establish an identical rule for every local or field. LiteScript deliberately defines its intended scope above. See [Rust lints](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html#unused-variables) and [TypeScript unused parameters](https://www.typescriptlang.org/tsconfig/noUnusedParameters.html).

## Related concepts

- [Identifiers](identifiers.md)
- [Wildcards and skips](wildcards-and-skips.md)
- [Tooling and learning](tooling-and-learning.md)
- [Declarations and assignment](declarations-and-assignment.md)
