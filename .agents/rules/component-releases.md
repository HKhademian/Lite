# Component releases and versioning

Every independently versioned, non-null component stream in
[the version registry](../../config/versions.json) (plus `igniter` in
[igniter/package.json](../../igniter/package.json)) must publish new versions as
verified milestones land, respecting `MAJOR.MINOR.PATCH` SemVer rules and pushing
immutable annotated tags to remote `github`.

See [naming and versioning](../../docs/versioning-and-naming.md) and
[release automation](../../docs/release-automation.md) for the authoritative stream
prefixes, version bump classification rules, and readiness profiles.

## Release cadence & eligibility

- Cut a separate atomic release-preparation commit and annotated tag for each affected
  assigned component after completing a verified feature, behavior fix, optimization
  milestone, seed promotion, or coordinated batch so released tags never lag far
  behind `main`.
- Respect `MAJOR.MINOR.PATCH`: incompatible changes increment `MAJOR` (or a reviewed,
  documented `MINOR` while `< 1.0.0`, never `PATCH`); backward-compatible additions or
  observable compiler/output changes increment `MINOR`; behavior-preserving fixes,
  optimizations, or packaging fixes increment `PATCH`.
- Never assign or release a component currently marked `null` in `config/versions.json`
  without explicit owner approval.
- Keep `vscode` strictly plain `MAJOR.MINOR.PATCH` (no prerelease suffix) and synchronized
  across `config/versions.json`, `editors/vscode/package.json`, and
  `editors/vscode/package-lock.json`.

## Tagging & publication rules

1. **Separate commits**: Keep implementation changes and release-preparation version bumps
   in distinct atomic commits.
2. **Create annotated tags on verified `HEAD` first — with proper release text**: After
   all required checks pass on a clean checkout, create annotated tags (`git tag -a <prefix>-v<ver> -F -`)
   pointing at `HEAD`. Every annotated tag message MUST include a clear subject line, a
   blank line, and a concise bulleted list of features, fixes, optimizations, and
   compatibility notes since the previous tag (never a bare one-line placeholder), because
   `./bin/lite release` embeds the annotated tag text into `RELEASE-NOTES.md` (`## Summary`)
   and GitHub Releases. Also record the milestone summary in [releases](../../docs/releases.md).
3. **Validate packaging locally before pushing**: Run `./bin/lite release <out-dir> <tag>`
   for each tag under release (cleaning `<out-dir>` immediately afterward so `git status`
   remains clean).
4. **Push in batches of at most 3 tags**: Push `main` and new tags to remote `github`
   sending at most 3 tags per `git push` command so GitHub Actions triggers `release.yml`
   workflows reliably for every tag. Never reuse, move, or overwrite a published tag.
