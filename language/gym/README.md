# Lite Gym

The **Gym** corpus powers the interactive practice dojo of **Lite Academy** (`/gym/` on the published site alongside `/learn/`, `/docs/`, `/modules/`, `/tools/`, and `/play/`).

## Layout

- [catalog.json](lite://repo/language/gym/catalog.json) — machine-readable exercise manifest validated against [gym.schema.json](lite://repo/config/gym.schema.json).
- `drills/` — 24 language drills across `foundations`, `control`, `types`, `blocks`, `functions`, and `modules`.
- `workouts/` — 29 algorithmic katas across `arithmetic`, `control`, `text`, `arrays`, `collections`, `enums`, `records`, `parsing`, `algorithms`, `units`, `calendar`, and `finance`.
- Each exercise contains a `prompt.md`, a deliberately failing `starter.lts` (`compile-error` or `wrong-output`), and a passing `solution.lts`.

## Exercise Breakdown

- **Total exercises**: 53 (`24` drills, `29` katas)
- **Belts**: `11` white, `22` amber, `14` emerald, `6` obsidian
- **Verification**: every starter is verified to fail as declared and every solution is verified to compile and pass all visible + hidden cases via [site/gym-verify.ts](lite://repo/site/gym-verify.ts) and [site/features.test.ts](lite://repo/site/features.test.ts).

## Related Corpora

- [Learn curriculum](lite://repo/language/learn/README.md) — guided lessons referenced by each exercise's `relatedLessons` field.
- [Examples](lite://repo/language/examples/README.md) & [Showcases](lite://repo/language/showcases/README.md) — reference programs and feature demonstrations.
- [Site architecture](lite://doc/site-architecture) — static site build pipeline and Gym worker runner.
