# Atomic commits

Owner direction, 2026-11-02: always keep project changes in atomic commits.

- Apply this workflow to all project changes: compiler, language specification,
  investigations, tests, tooling, documentation, configuration and generated assets.
- Keep each commit to one coherent purpose, including the related tests,
  documentation and generated artifacts needed for that change to work.
- Split independent fixes, refactors, design decisions and release/version work
  into separate commits. Keep feature support and later compiler-source adoption
  separately reviewable, with working bootstrap steps between them.
- Review the diff and run checks appropriate to the scope before committing.
  Documentation-only work needs link/consistency checks; behavior changes need
  the applicable focused tests and project gates.
- Stage only owned files or hunks. Preserve unrelated and concurrent work;
  do not blanket-stage a mixed working tree.
- Create the commit before reporting a unit complete or moving to independent
  work. Report the commit ID and verification performed. If committing is blocked,
  report the blocker and exact uncommitted scope.
- Do not amend others' commits, rewrite published history, push or create release
  tags without authorization. A commit does not imply language-design acceptance.

For example, commit a compiler fix with its regressions and contract updates;
commit an unrelated release workflow separately.

See [compiler development guidelines](compiler-development.md) for feature
coverage, experiments and seed adoption.
