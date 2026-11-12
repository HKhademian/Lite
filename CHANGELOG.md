# Changelog

All notable changes to the Lite project are documented in this file.

## Unreleased

- Added public showcase site and Mini-style sample playground (`site/build.ts`, `site/serve.ts`) with GitHub Pages deployment (`.github/workflows/pages.yml`) and CI verification.
- Updated `brand/` identity assets (`lite-wordmark.svg`, `lite-mark.svg`, `lite-mark-minimal.svg`, `lite-favicon.svg`) and `ℓite` naming guidelines.
- Synced `docs/tour.md`, `docs/start-here.md`, and `tools/run.test.ts` with `core/io` module-aliased imports.

## Alpha Milestones

- **T13 Generated Compiler**: Generated TypeScript igniter rebuilds its supported Lite source subset with verified fixed-point bootstrap (`compiler/bootstrap/`).
- **CLI Tooling**: Unified `./bin/lite` router supporting `run`, `compile`, `check`, `test`, `verify`, `doctor`, `bench`, `docs`, and `release`.
- **Editor Support**: VS Code TextMate syntax highlighting for `.lt` and `.lts` (`editors/vscode/`).
