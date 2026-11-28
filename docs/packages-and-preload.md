# Packages and preload

Status: **package-local `$preload.lt` implemented (with `lib/$preload.lt` default fallback exporting `core/option` and `core/slice`)**. See [modules and imports](lite://doc/modules-and-packages) for source syntax and visibility.

## Package contents

The proposal includes a manifest for metadata and dependency declarations, a lockfile for exact resolved versions, and file-based modules. Manifest format, package identity, version constraints, registries, offline use, and reproducibility rules remain open.

Implicit arbitrary module initialization and package installation scripts were discouraged as defaults. This is a design preference, not implemented enforcement.

## Prelude

### Package preload

Implemented with default fallback [lib/$preload.lt](lite://repo/lib/$preload.lt) (`pub import "core/option"; pub import "core/slice";`). Builtin container/vector families `Rc<T>`, `Slice<T>`, `Simd<T, N>`, `SimdNative<T>`, and `SoA<R>` are module-owned (`core/rc`, `core/slice`, `core/simd`, `core/soa`) rather than naked compiler intrinsics; by default, only `Option<T>` and `Slice<T>` are exposed implicitly through `lib/$preload.lt`.

The reserved source file `$preload.lt` configures preloaded module names for a package.
Resolve it independently for each package:

1. If the package supplies a `$preload.lt` in its sources (walking up to the package/project root), use that file.
   An empty override selects an empty preload.
2. Otherwise use Lite's own `lib/$preload.lt`, if present in Lite's source tree.
3. If neither file exists (or inside `lib/core/`), preload zero modules.

The package file's sole role is to replace the default preload. The selected
file's public symbols enter the package's source-file root scopes as private
imports. For example, `pub import "core/list";` in the preload exposes the
module's public names, such as `List` once it is exported, directly to those
root scopes. A bare `import "core/list";` in the preload makes the names
available to the preload itself. The application and each dependency compile
under their own chosen file. Public signatures preserve the types resolved
in the declaring package.

Keep the default preload's directly visible surface small. Every public
name from a module expanded with `pub import` enters each default receiving
module or script scope. For instance, expanding `core/text` directly would
introduce the bare name `UNICODE_REPLACEMENT_CHAR` everywhere that preload
applies. Prefer a small export surface for modules expanded directly. For a
broader API, export one alias:

```text
pub text := import "core/text";
```

Receiving modules and scripts then use `text.UNICODE_REPLACEMENT_CHAR`.
The alias occupies one name in each scope, and the module's public API stays
under it.

Keep `String` available as a bare type name while qualifying the text module's
constants and helpers. Today `String` is intrinsic. If its type declaration
moves to the module, the preload can expose that type explicitly. One possible
spelling, once `core/text` exports its type:

```text
pub text := import "core/text";
pub String := alias text.String;
```

Both type spellings would resolve to the same type and its attached operations.
The Unicode constant would be available as `text.UNICODE_REPLACEMENT_CHAR`.

A public operation follows its owning type where that type is visible.
For instance, public operations of intrinsic `Int` are available through
`Int`, and an alternative `List` brings its own operations. Resolution should
follow the type owner and actual dependency edges instead of preloading a
hard-coded list. The inventory of intrinsic names and default prelude exports
will be reviewed as their type contracts are settled. See
[fresh literals and defaults](lite://doc/types-and-inference#fresh-literals-and-default-types)
for how literals acquire a type.

Pending contract cases for TS and C11:

- Without a package override, an export of Lite's `$preload.lt` is available.
  An empty package preload removes that name. With both files absent, the
  implicit module graph has no preload edges.
- A preload export is visible inside a receiving module. Importing that
  module exposes only what it explicitly publishes.
- A package using an alternative list loads that list's owner and operations.
  A dependency using the default list retains its original type and operations.
  Compiling the alternative package alone has no implicit `core/list` edge.
- An unaliased import scoped to a block introduces the module's public names
  inside that block. The two public import forms expose names directly or
  through the exported alias, respectively.

## Separately compiled libraries and runtime agreement

User direction, 2026-11-17: compile-time type/form compatibility must agree with
the runtime value contract when separately compiled Lite components exchange
values through a compatible library boundary. This includes the shared union
Kind mapping; other public types and calls need their own representation,
transfer and lifetime contracts. Source-level compatibility alone cannot
silently make mismatched runtime representations compatible.

The intended future workflow supports independently compiled, linkable
Lite-written libraries consumed as Lite components without requiring consumers
to import implementation source, compile everything together, or redesign the
public interface as a C FFI boundary. Internal use of a C backend is not ruled
out. The binary compatibility scope across targets, compilers, versions and
library revisions still needs an explicit contract; this is not a promise of
unlimited compatibility.

Independent library and consumer compilations must establish consistent
meanings and mappings under their shared representation contract; correctness
cannot depend on all library implementation sources participating in one
compiler invocation. Cross-target representation and version policy remain
separate design questions.

The user's possible `.c`, `.h`, `.so`, `.a`, and `.lth` outputs illustrate a
future separately compiled library workflow; `.lth` and the import/link format
are not selected or implemented by this direction. Handling external data and
incompatible interfaces, target ABI, versioning, validation, ownership and
calling conventions remain open. See the [library compatibility investigation](lite://repo/research/investigations/language-review/separate-library-value-compatibility.md).

See [module import stages](lite://doc/compiler/module-import-stages#known-gap-in-explicit-module-imports) for the compiler gap.
