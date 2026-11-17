# Dependency build identity and resolution

Status: **user-proposed model under investigation, 2026-11-17**. The resolution
policy, artifact schema, linker mechanism, hash inputs and compatibility rules
are not selected or implemented by this note.

## The user's correction

The user points out that linking library `A`, built with `B#h1`, alongside an
application using `B#h2` is a **dependency identity question**. In the proposed
model, each library build has a hash over its module and compilation metadata,
including build start and end. A different build can therefore have a different
hash even if compiled again from unchanged source. For this discussion,
`B#h1` and `B#h2` are entirely different dependency instances; think of them
as `C` and `D`, not automatically as compatible revisions of one object.

The hash spelling and `#` notation are conceptual. Exact hash construction,
which metadata it includes, collision handling, dependency and toolchain
inputs, timestamp rules, identity/version policies and any self-referential
hash field are open. The user has not selected a particular hash algorithm or
artifact format.

This build-identity model must still distinguish **a library build** from
**the identity of every type referenced by that build**. For example, both
libraries may refer to the same built-in `Int64`, or an exported transparent
alias may resolve to a shared target. Do not automatically make every built-in,
alias or structurally normalized type distinct merely because it is mentioned
in a different build. How a public nominal type's identity incorporates the
exact dependency instance and its compatibility boundary remains to be defined.

## Resolution options named by the user

1. **Link or compile error.** Reject the conflicting dependency instances or an
   ambiguous composition and require the developer to resolve it. Whether merely
   having two instances is an error, or only connecting incompatible interfaces,
   is itself a policy question.
2. **Replace one with the other.** Deliberately select one dependency instance
   for the affected graph. This needs an explicit rule for when replacement is
   allowed, whether dependents must be rebuilt or adapted, and what validation
   demonstrates compatibility. It must not silently claim distinct builds are
   identical solely because their names match.
3. **Allow both side by side.** Treat `B#h1` and `B#h2` like separate `C` and
   `D` instances with distinct linkage/reference namespaces where needed. A
   program must not silently treat incompatible instance-specific public types
   or representations as identical. How explicit conversion, ABI symbols,
   resources, shared transitive dependencies, isolation and memory costs work
   remains open.

No option, default, user interface or automatic replacement is selected. These
are related to but more precise than a general suggestion to reconcile any two
apparently compatible builds. A mapping fix within one dependency instance is
separate from replacing one instance with another.

## Clean builds, reuse and determinism

A clean consumer can use the exact published `B#h1` artifact/table selected as
an input without retaining the consumer's earlier compiler cache. If A is built
against `B#h1` and the app uses `B#h2`, the graph must apply an explicit
resolution policy; simply using the newest table does not retroactively make
A's dependency `B#h2`.

Including build start/end timestamps in the identity hash means two clean builds
from the same logical source may produce different build identities. That is
consistent with the user's proposed exact-build model, but has consequences for
reproducible artifacts, caching and reuse that need exploration. A separate
source, API, ABI or content-equivalence digest might be investigated for those
purposes; it must not silently replace or collapse the user's distinct build
identity. Hashes and dependency resolution are compile/link concerns and do not
by themselves require a runtime registry or imply persistent application data
contains runtime type references.

## Cases to examine

- A and the application both select the exact same `B#h1` artifact: establish
  agreement in separate clean compiler invocations and at link/runtime.
- A selects `B#h1`, the application selects `B#h2`, and both export a nominal
  type with the same spelling: test each of the three user-listed resolutions.
- `h1` and `h2` are builds of identical source with different build metadata:
  they still have different build identities in the proposed model. Do not
  assume they are merged; compare optional explicit compatibility proofs.
- Both instances use the same builtin or transparent alias: preserve its own
  type identity instead of duplicating it merely because the instances differ.
- A declares a type from `h1` in a public function contract and the consumer
  supplies a corresponding `h2`-specific value: do not silently treat the
  distinct identities as interchangeable without a selected replacement or
  conversion rule.
- Relink, load side-by-side or use an incompatible artifact: determine symbol
  namespaces, Kind mapping, diagnostics and whether generated code or already
  existing values require adaptation.

These are design cases, not executed tests. See [type-reference table](type-reference-table.md),
[precompiled representation](precompiled-lite-representation.md) and
[separate-library compatibility](separate-library-value-compatibility.md).
