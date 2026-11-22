# Lite Samples

Folder-grouped project samples showcasing algorithms, high-resolution RGBA canvas drawing, animation, interactive controls, Web Audio synthesis, and mini-games. Run any Play (`extra/canvas` / `extra/audio`) sample natively on desktop with `./bin/lite play <file.lts>`.

For core language-specification examples (`001`–`024`), see [language/examples](lite://repo/language/examples/README.md).

## Programs (`programs/{math,search,text,parsing,records,control,collections,enums}/`)

- [fibonacci](lite://play/fibonacci) — Iterative Fibonacci sequence and explicit formatting.
- [primes-sieve](lite://play/primes-sieve) — Prime generation up to 50 with `mut List<Int>`.
- [binary-search](lite://play/binary-search) — Binary search returning a named tuple result.
- [caesar-cipher](lite://play/caesar-cipher) — ASCII Caesar cipher round-trip over `core/text`.
- [word-frequency](lite://play/word-frequency) — Word frequency counter via `core/list`.
- [rpn-evaluator](lite://play/rpn-evaluator) — Stack-based Reverse Polish Notation evaluator.
- [inventory-ledger](lite://play/inventory-ledger) — Inventory summary combining nominal records, `=name` shorthand, named tuple returns, and fixed-array bounds.
- [packet-router](lite://play/packet-router) — Network packet classifier using subject-based `match` over records, `or` alternatives, `if` guards, and fixed-array summaries.
- [map-word-counter](lite://play/map-word-counter) — Word frequency counter using `Map<String, Int>`, `core/map` lookups, and insertion-order entry iteration.
- [loop-collect-filter](lite://play/loop-collect-filter) — Map, filter, and classify collections with loop `.collected`, partial `if`/`match` tails, and `.length`/`.isEmpty`.
- [signal-controller](lite://play/signal-controller) — Traffic signal state machine using an `Int`-backed value `enum`, `.value` durations, and exhaustive `match`.
- [set-deduplicator](lite://play/set-deduplicator) — Deduplicates a sequence in O(n) using `Set<String>`, `core/set`, and insertion-order traversal.

## Canvas Art (`graphics/art/`)

- [rgba-composition](lite://play/play-rgba-art) — `360x240` layered RGBA composition.
- [sunset-horizon](lite://play/play-sunset-horizon) — `360x220` dusk gradient, solar glow, and reflections.
- [geometric-mandala](lite://play/play-geometric-mandala) — `320x240` radial lines, concentric rings, and petals.
- [spectrum-bars](lite://play/play-spectrum-bars) — `340x200` stepped alpha palette and glaze ribbon.
- [record-mosaic](lite://play/play-record-mosaic) — `360x240` card mosaic driven by nominal `Tile` records, `=name` shorthand, and aggregate destructuring.
- [match-signal-board](lite://play/play-match-signal-board) — `360x240` RGBA signal board styled via subject-based `match` over records, comparisons, and range guards.

## Animation (`graphics/animation/`)

- [hello-play](lite://play/play-hello) — `320x180` minimal `extra/canvas` + `extra/audio` starter (runs in Browser Play and natively via `./bin/lite play`).
- [bounce-emblem](lite://play/play-bounce) — `320x200` bouncing `ℓite` emblem with chimes.
- [neon-rain](lite://play/play-neon-rain) — `320x200` falling neon streaks with alpha trails.
- [solar-orbit](lite://play/play-solar-orbit) — `320x220` multi-ring orbital motion.
- [pulse-ripples](lite://play/play-pulse-ripples) — `320x200` expanding concentric alpha ripples.

## Interactive (`graphics/interactive/`)

- [particle-pool](lite://play/play-particle-pool) — `320x200` zero-churn particle fountain powered by `extra/pool`, `extra/sparse`, and `extra/arena`.
- [cursor-paint](lite://play/play-cursor-paint) — `240x160` pointer brush with color swatches and tones.
- [studio-lamp](lite://play/play-studio-lamp) — `280x180` clickable lamp toggle with Space/Enter support.
- [color-mixer](lite://play/play-color-mixer) — `320x200` draggable RGBA channel sliders.
- [pixel-maze](lite://play/play-pixel-maze) — `286x182` maze navigator with WASD/Arrows and chimes.

## Audio & Synth (`graphics/audio/`)

- [synth-arpeggio](lite://play/play-arpeggio) — `320x180` four-pad sequencer using `audio.Note`.
- [chord-pad](lite://play/play-chord-pad) — `320x180` polyphonic triad chord pads (`1`–`4` or click).
- [step-sequencer](lite://play/play-step-sequencer) — `320x200` toggleable 4×4 grid step sequencer.
- [tone-keyboard](lite://play/play-tone-keyboard) — `320x180` clickable C-major octave keyboard (`1`–`8`).

## Games (`games/arcade/`)

- [paddle-pong](lite://play/play-paddle-pong) — `320x200` two-paddle Pong with AI tracking and audio cues.
- [brick-breaker](lite://play/play-brick-breaker) — `320x200` RGBA brick breaker with paddle controls and chimes.
- [grid-snake](lite://play/play-grid-snake) — `320x192` snake game using `List<Cell>` queue ops.
