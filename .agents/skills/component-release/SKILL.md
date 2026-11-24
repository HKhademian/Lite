---
name: component-release
description: >-
  Use this skill when preparing, verifying, tagging, or publishing Lite component
  versions according to MAJOR.MINOR.PATCH SemVer rules, config/versions.json, and
  igniter/package.json.
---

# Component Release Workflow

Follow this procedure whenever cutting and publishing one or more Lite component releases.

## 1. Component Authority & Version Rules

Refer to [naming and versioning](../../../docs/versioning-and-naming.md) for the authoritative
stream table, tag prefixes, and `MAJOR.MINOR.PATCH` change classification rules.

Check which files hold each version before editing:
- **`igniter`** (`igniter-v<ver>`): `igniter/package.json` (`version`) and
  `igniter/package-lock.json` (root `version` + `packages[""].version`). When bumping
  `igniter`, also update `tools/cases/tooling/packaging/release-archive.case.json`
  where the `lightweight` test case checks `igniter-v<ver>`.
- **`vscode`** (`vscode-v<ver>`): plain `MAJOR.MINOR.PATCH` only — update
  `config/versions.json`, `editors/vscode/package.json` (`version` + `scripts.package`
  VSIX filename), `editors/vscode/package-lock.json` (root `version` + `packages[""].version`),
  `editors/vscode/README.md`, and `site/src/tools.lts`.
- **All other active streams**: `config/versions.json` (`compiler`, `cli`, `formatter`,
  `runtime`, `builtins`, `checker` -> `check-v*`, `tester` -> `test-v*`, `verifier` ->
  `verify-v*`, `benchmark` -> `bench-v*`, `release`, `docs`, `doctor`). Never release a
  `null` stream unless explicitly approved.
- Document notable release milestones in `docs/releases.md` while preserving historical entries.

## 2. Verify Clean Implementation Base

Before modifying any version files:
1. Confirm `git status --short` is empty.
2. Confirm implementation/bootstrap tests have already passed on the commit being released
   (`./bin/lite doctor`, `./bin/lite bootstrap verify`, `./bin/lite test --full`,
   `./bin/lite verify --coverage`, and affected CI tasks via `node tools/ci.ts`).

## 3. Atomic Release-Preparation Commit

1. Update only the released component versions in the authoritative manifests, synced
   lockfiles/docs, and `docs/releases.md`.
2. Verify consistency and tests BEFORE committing:
   ```sh
   ./bin/lite doctor
   ./bin/lite test --unit compiler/scripts/release-streams.test.lts
   ./bin/lite test --unit tools/release.test.lts
   ./bin/lite test --unit tools/cases.test.lts
   ```
   (Plus `./bin/lite test --unit tools/fmt.test.lts`, editor tests, and site tests when
   `vscode`, `formatter`, or `site` references are updated.)
3. Stage only the owned release-preparation files and commit atomically:
   ```sh
   git add <updated-version-and-release-files>
   git commit -m "chore(release): <summary>"
   ```
4. Confirm `git status --short` is clean (`./bin/lite release` requires a clean checkout).

## 4. Tag Locally First & Validate Packaging

`./bin/lite release` requires the local annotated tag pointing at `HEAD` to exist before it
validates packaging for that tag.

1. Create immutable annotated tags on `HEAD` with proper, substantive release notes
   (clear title line, blank line, and concise bulleted changelog of features, fixes,
   optimizations, and compatibility notes since the previous tag — never a bare one-line
   placeholder). `./bin/lite release` embeds the tag message into `RELEASE-NOTES.md`
   under `## Summary`, which GitHub Actions publishes verbatim as the GitHub Release notes:
   ```sh
   git tag -a <prefix>-v<version> -F - <<'EOF'
   <Component> <version>

   - <Key feature, fix, or optimization since previous tag>
   - <Compatibility or verification highlights>
   EOF
   ```
2. Validate local snapshot packaging across affected profiles (`tools`, `compiler`,
   `language`), then remove temporary output directories immediately:
   ```sh
   ./bin/lite release dist/release-<comp> <tag>
   rm -rf dist/release-<comp>
   ```
   Confirm `git status --short` remains clean.

## 5. Push to Remote `github` (`<= 3` Tags per Push)

GitHub Actions skips `push` tag workflows if more than 3 tags are pushed at once.
Push `main` and new tags to `github` in batches of at most 3 tags per push:

```sh
git push github main
git push github <tag1> <tag2> <tag3>
git push github <tag4> <tag5> <tag6>
```

Verify remote tags with `git ls-remote --tags github` and confirm CI / GitHub Releases status
when `release.yml` is enabled. Never move, overwrite, or delete a published tag.
