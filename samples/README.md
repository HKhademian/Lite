# Lite Samples

Folder-grouped project samples showcasing algorithms, high-resolution RGBA canvas drawing, animation, interactive controls, Web Audio synthesis, and mini-games. Run any Play (`gfx/canvas` / `media/audio`) sample natively on desktop with `./bin/lite play <file.lts>`.

For core language-specification examples (`001`–`024`), see [language/examples](lite://repo/language/examples/README.md).

## Programs (`programs/{math,search,text,parsing,records,control,collections,enums}/`)

- [fibonacci](lite://play/fibonacci) — Iterative Fibonacci sequence and explicit formatting.
- [primes-sieve](lite://play/primes-sieve) — Prime generation up to 50 with `mut List<Int>`.
- [binary-search](lite://play/binary-search) — Binary search returning a named tuple result.
- [caesar-cipher](lite://play/caesar-cipher) — ASCII Caesar cipher round-trip over `type/string`.
- [word-frequency](lite://play/word-frequency) — Word frequency counter via `type/list`.
- [persian-bookshelf](lite://play/persian-bookshelf) — Native Persian identifiers, nominal records, helper functions, and loops.
- [unicode-scripts](lite://play/unicode-scripts) — Real Unicode identifiers and UTF-8 lengths across eight approved scripts.
- [utf8-char-inspector](lite://play/utf8-char-inspector) — Unicode scalar code points, UTF-8 byte lengths, and round-trips.
- [rpn-evaluator](lite://play/rpn-evaluator) — Stack-based Reverse Polish Notation evaluator.
- [inventory-ledger](lite://play/inventory-ledger) — Inventory summary combining nominal records, `=name` shorthand, named tuple returns, and fixed-array bounds.
- [packet-router](lite://play/packet-router) — Network packet classifier using subject-based `match` over records, `or` alternatives, `if` guards, and fixed-array summaries.
- [map-word-counter](lite://play/map-word-counter) — Word frequency counter using `Map<String, Int>`, `type/map` lookups, and insertion-order entry iteration.
- [loop-collect-filter](lite://play/loop-collect-filter) — Map, filter, and classify collections with loop `.collected`, partial `if`/`match` tails, and `.length()`/`.isEmpty()`.
- [signal-controller](lite://play/signal-controller) — Traffic signal state machine using an `Int`-backed value `enum`, `.value` durations, and exhaustive `match`.
- [set-deduplicator](lite://play/set-deduplicator) — Deduplicates a sequence in O(n) using `Set<String>`, `type/set`, and insertion-order traversal.
- [soa-simd-particles](lite://play/soa-simd-particles) — `SoA<Particle>` + `Float32x4` SIMD physics integrator, `Slice.splitAt`, `loop mut`, and `comptime`.
- [plugin-pipeline](lite://play/plugin-pipeline) — Nominal `interface`/`impl` with associated types and defaults, `dyn` dispatch, lexical `context(...)`, and overloading.
- [fallible-config-parser](lite://play/fallible-config-parser) — `A | B` unions, `T!` fallible pipeline, `ToError`, postfix `!`, `else(err)` recovery, `{ ... }` records, and defaults.
- [packed-nibble-codec](lite://play/packed-nibble-codec) — Bit-packed `Slice<Int4>` & `Slice<Bool>`, `UInt8`/`Int4` bitops, `#packed` records, `Option<T>`, and `Rc<T>`.

## Canvas Art (`graphics/art/`)

- [rgba-composition](lite://play/play-rgba-art) — `360x240` layered RGBA composition.
- [sunset-horizon](lite://play/play-sunset-horizon) — `360x220` dusk gradient, solar glow, and reflections.
- [geometric-mandala](lite://play/play-geometric-mandala) — `320x240` radial lines, concentric rings, and petals.
- [spectrum-bars](lite://play/play-spectrum-bars) — `340x200` stepped alpha palette and glaze ribbon.
- [record-mosaic](lite://play/play-record-mosaic) — `360x240` card mosaic driven by nominal `Tile` records, `=name` shorthand, and aggregate destructuring.
- [match-signal-board](lite://play/play-match-signal-board) — `360x240` RGBA signal board styled via subject-based `match` over records, comparisons, and range guards.

## Animation (`graphics/animation/`)

- [hello-play](lite://play/play-hello) — `320x180` minimal `gfx/canvas` + `media/audio` starter (runs in Browser Play and natively via `./bin/lite play`).
- [bounce-emblem](lite://play/play-bounce) — `320x200` bouncing `ℓite` emblem with chimes.
- [neon-rain](lite://play/play-neon-rain) — `320x200` falling neon streaks with alpha trails.
- [solar-orbit](lite://play/play-solar-orbit) — `320x220` multi-ring orbital motion.
- [pulse-ripples](lite://play/play-pulse-ripples) — `320x200` expanding concentric alpha ripples.

## Interactive (`graphics/interactive/`)

- [particle-pool](lite://play/play-particle-pool) — `320x200` zero-churn particle fountain powered by `ds/pool`, `ds/sparse`, and `ds/arena`.
- [cursor-paint](lite://play/play-cursor-paint) — `240x160` pointer brush with color swatches and tones.
- [studio-lamp](lite://play/play-studio-lamp) — `280x180` clickable lamp toggle with Space/Enter support.
- [color-mixer](lite://play/play-color-mixer) — `320x200` draggable RGBA channel sliders.
- [pixel-maze](lite://play/play-pixel-maze) — `286x182` maze navigator with WASD/Arrows and chimes.
- [surface-ripples](lite://play/play-surface-ripples) — `360x220` pure 2D `gfx/surface` & `gfx/color` interactive ripple rings.

## Audio & Synth (`graphics/audio/`)

- [pure-chime-scale](lite://play/play-pure-chime-scale) — Pure `media/audio` pentatonic chime sequence using `audio.Note` without canvas boilerplate.
- [synth-arpeggio](lite://play/play-arpeggio) — `320x180` four-pad sequencer using `audio.Note`.
- [chord-pad](lite://play/play-chord-pad) — `320x180` polyphonic triad chord pads (`1`–`4` or click).
- [step-sequencer](lite://play/play-step-sequencer) — `320x200` toggleable 4×4 grid step sequencer.
- [tone-keyboard](lite://play/play-tone-keyboard) — `320x180` clickable C-major octave keyboard (`1`–`8`).

## 3D Scenes (`3d/`)

- [orbital-orrery](lite://play/play-orbital-orrery) — `480x300` interactive 3D solar system with orbit drag/wheel camera, planetary rings, moons, and `ui/im` controls.
- [terrain-flyover](lite://play/play-terrain-flyover) — `480x300` procedural heightmap alpine terrain flyover with fog, glider craft, and autopilot/WASD flight controls.
- [lit-polyhedra-studio](lite://play/play-lit-polyhedra-studio) — `480x300` lit 3D primitive inspector with live light azimuth/elevation sliders and material toggles.

## Games (`games/arcade/`, `games/3d/`)

- [paddle-pong](lite://play/play-paddle-pong) — `320x200` two-paddle Pong with AI tracking and audio cues.
- [brick-breaker](lite://play/play-brick-breaker) — `320x200` RGBA brick breaker with paddle controls and chimes.
- [grid-snake](lite://play/play-grid-snake) — `320x192` snake game using `List<Cell>` queue ops.
- [tunnel-racer](lite://play/play-tunnel-racer) — `480x300` 3D star-tunnel racer with banking craft, procedural rings, obstacle gates, and shields.
- [voxel-arena](lite://play/play-voxel-arena) — `480x300` 3D tank combat arena with hierarchical turret aim, chasing drones, and wave progression.
- [tower-defense](lite://play/play-tower-defense) — `480x300` tactical grid tower defense with 3 typed tower classes, frost/splash effects, and `ui/im` shop HUD.
