# Igniter release automation

The **igniter** is the entity responsible for bootstrapping the project. Its
release archive preserves the sources, compiler seeds and instructions needed
to perform that process at the selected version.

The umbrella and each component have independent versions and **annotated Git tags**:

- `lite-vX.Y.Z`: umbrella release, recording the complete component combination.
- `lang-vX.Y.Z`: language-only changes.
- `script-vX.Y.Z`: scripting-part changes.
- `compiler-vX.Y.Z`: compiler fixes, added language coverage and code generation.
- `igniter-vX.Y.Z`: igniter milestones.
- `cli-vX.Y.Z`: command-line tooling.
- `formatter-vX.Y.Z`: formatter changes; its implementation is still planned.
- `runtime-vX.Y.Z`: target runtime support.
- `std-vX.Y.Z`: library releases; the current libraries remain provisional.

All streams allow SemVer prerelease suffixes and build metadata. `lite-v*`,
`lang-v*` and `script-v*` are distinct streams. These are Git tags, rather than
issue or pull-request labels.

Record the selected component version in [`versions.json`](../versions.json)
and commit it with the release preparation before tagging. Igniter versions
keep their existing authority in `igniter/package.json` instead. Every tag must
match its component's recorded version. A compiler-only change can advance
`compiler` while leaving `project`, `language`, `scripting`, `cli` and the other
versions unchanged. The `project` key controls umbrella `lite-v*` releases;
`language` controls `lang-v*`; `scripting` controls `script-v*`; `stdlib`
controls `std-v*`.
`null` means unassigned, and blocks a tag for that component until its version
is explicitly selected. No initial component versions are invented here.

Every component release still packages a complete igniter snapshot of the
exact commit. The manifest records `releasedComponent` (the tagged component
and version) and `componentVersions` (the full combination), alongside exact
source and builder identities. Shipping other components in the same archive
does not release new versions of them. Source commits identify changes since a
component's last version; the version alone is not proof of identical bytes.

The [release workflow](../.github/workflows/release.yml) runs the existing full
test, coverage, strict TypeScript and editor gates, checks byte-identical
regeneration of both current compiler targets, then builds and executes the
admitted C compiler corpus on Linux x64/ARM64 and macOS Intel/Apple Silicon.
Every scenario must match its recorded stdout, stderr and exit status. Only
after all jobs succeed does it upload the assets to a draft GitHub Release and
publish it using the existing tag. A failed upload can leave a draft to inspect;
it cannot expose a partially uploaded release. Existing releases are never
overwritten, and published tags are never moved; a correction needs a new tag.
Prerelease tags produce prereleases. Releases do not automatically replace the
repository's “latest” release, since the component streams differ.

For example, set `compiler` to `0.5.1` in `versions.json`, commit that release
preparation separately from the compiler fix, and check the intended revision:

```sh
git tag -a compiler-v0.5.1 -m "Compiler 0.5.1"
git push github compiler-v0.5.1
```

The example version is illustrative; choose an unused version. No tag is
created by installing this workflow. Branch pushes and pull requests continue
to run CI. The manual **Igniter release → Run workflow** action builds the
same assets for the selected ref without publishing, even when the ref is a
tag. Download the `igniter-release` artifact to inspect that dry run.

## Release assets

- `lite-TAG-igniter.tar.gz`: complete tracked source tree, including the
  igniter and lockfile, launchers, provisional libraries and tests, compiler
  manifests, runtime support, checked-in seeds and their historical builder
  records. Its additional `release/` directory contains the selected generated
  TS and C-emitting **TS** compilers, flattened Lite sources, line maps and the
  source/builder/artifact SHA-256 map. `IGNITER.md` is this guide.
- `lite-TAG-libraries.tar.gz`: the provisional `lib/` tree, its tests and the
  matching release record. This is not a separately versioned stable stdlib.
- `lite-TAG-generated-c.tar.gz`: one `.c` and original `.lts` per admitted
  compiler program fixture, plus exact scenario input/output bytes encoded in
  base64 in `release.json`. All `001-*.json` program fixtures are required;
  emission failures fail the release instead of silently omitting programs.
- `lite-TAG-{linux,darwin}-{x64,arm64}.tar.gz`: compiled conformance programs
  under `bin/`, the release record and native build report. These are currently
  program executables, not native compiler executables. The C backend cannot
  compile the compiler itself yet. No native C fixed point is claimed.
- `manifest.json`, `release.json`, `native-*.json`, `RELEASE-NOTES.md` and
  `SHA256SUMS`: exact source commit, actual component version, compiler source
  and builder hashes, host tool versions, C flags, runner image versions,
  binary hashes, archive checksums, the released component and every component
  version. Unassigned component/ABI versions remain explicitly unassigned.

Archives preserve launchers' executable bits and symlinks. Git, Node and C
toolchains are not bundled. Native packages use their runner's system libc and
SDK, are unsigned, and do not promise compatibility with older operating
systems or bit-identical binaries across different toolchains. Current runner
labels are fixed OS generations; the exact installed compiler is recorded for
each build. Compiler source regeneration is checked byte for byte.

## Bootstrap from an extracted release

Check the downloaded assets before extraction, using `sha256sum -c SHA256SUMS`
on Linux or `shasum -a 256 -c SHA256SUMS` on macOS. Extract the igniter archive
into an empty directory and enter it. The archive is usable without `.git` and
without downloading any older release. Keep `release/release.json` to identify
the source and generated compiler pair.

Install the Node version recorded in `igniter/.node-version` (currently
26.13.0). The igniter and preserved generated TS compilers have no npm runtime
dependencies:

```sh
./lite compile igniter/tests/compiler/001-001-report-int-42.lts > hello.ts
node compiler/entry.ts hello.ts
```

This prints `42`. Public run is removed and public C output is deferred during
the TS migration. Older releases retain their documented command contracts.
For a historical package containing the C-emitting compiler, its exact artifact
can still be executed directly:

```sh
node compiler/entry.ts release/c-compiler.ts < igniter/tests/compiler/001-001-report-int-42.lts > hello.c
```

To check and rebuild the compiler after changing its Lite sources, install the
locked development tools with `npm --prefix igniter ci`, then run:

```sh
node igniter/node_modules/typescript/bin/tsc -p compiler/bootstrap/tsconfig.json
node compiler/scripts/build.ts
./lite test
./lite verify --all --coverage
```

This rebuilds changed compiler source using T11 and checks it strictly. The
historical stage-0 route remains documented in
[compiler/bootstrap/README.md](../compiler/bootstrap/README.md); all its source
is included. Host tooling still needs Node even when the resulting program is
native C. Supported language subsets and remaining input/aggregate/native
compiler gaps are recorded in [compiler/README.md](../compiler/README.md).

To rebuild and verify all packaged C programs on one of the four supported
hosts, extract the generated-C archive or retain it alongside `release.json`.
From the extracted igniter tree, run:

```sh
node compiler/scripts/release.ts native /tmp/lite-native-rebuild /path/to/downloaded-assets
```

The output directory must be empty. Set `CC` to a compiler executable if `cc`
is not the desired compiler. The build uses `-std=c11 -O2 -Wall -Wextra -Werror`
and fails on a missing compiler or any scenario mismatch.

## Local packaging and historical versions

From a clean Git checkout with the locked igniter development tools installed:

```sh
node compiler/scripts/release.ts prepare .cache/release-local
node compiler/scripts/release.ts native .cache/native-local .cache/release-local
```

Local runs produce `snapshot-COMMIT` assets and never publish. Each output
directory must be empty. Final assembly requires the reports and archives from
all four hosts, then `node compiler/scripts/release.ts finalize ASSET_DIRECTORY`.
CI uses the same script. Packaging includes only committed files and rejects a
dirty checkout so uncommitted changes cannot be mislabeled as a release.

Automation applies to tags whose commits contain this workflow and toolchain.
Existing historical tags remain unchanged; this does not retroactively create
assets for old versions that lack the generated seeds or C support. Their exact
igniter sources and rebuild instructions remain available by checking out the
original tag. New snapshots preserve the complete bootstrap route from their
own version onward.
