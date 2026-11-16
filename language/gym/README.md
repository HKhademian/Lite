# Lite Gym

The **Gym** corpus powers the interactive practice dojo of **Lite Academy** (`/gym/` on the published site alongside `/learn/`, `/docs/`, `/modules/`, `/tools/`, and `/play/`).

## Layout

- [catalog.json](catalog.json) — machine-readable exercise manifest validated against [gym.schema.json](../../config/gym.schema.json).
- `drills/` — 18 language drills across `foundations`, `control`, `types`, `blocks`, `functions`, and `modules`.
- `workouts/` — 24 algorithmic katas across `arithmetic`, `text`, `arrays`, `parsing`, `algorithms`, `units`, `calendar`, and `finance`.
- Each exercise contains a `prompt.md`, a deliberately failing `starter.lts` (`compile-error` or `wrong-output`), and a passing `solution.lts`.

## Exercise Breakdown

- **Total exercises**: 42 (`18` drills, `24` katas)
- **Belts**: `11` white, `11` amber, `14` emerald, `6` obsidian
- **Verification**: every starter is verified to fail as declared and every solution is verified to compile and pass all visible + hidden cases via [site/gym-verify.ts](../../site/gym-verify.ts) and [site/features.test.ts](../../site/features.test.ts).

## Related Corpora

- [Learn curriculum](../learn/README.md) — guided lessons referenced by each exercise's `relatedLessons` field.
- [Examples](../examples/README.md) & [Showcases](../showcases/README.md) — reference programs and feature demonstrations.
- [Site architecture](../../docs/site-architecture.md) — static site build pipeline and Gym worker runner.
