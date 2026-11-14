# Lite Samples

Folder-grouped project samples showcasing algorithms, high-resolution RGBA canvas drawing, animation, interactive controls, Web Audio synthesis, and mini-games.

For core language-specification examples (`001`–`024`), see [language/examples](../language/examples/README.md).

## Programs (`programs/`)

- [fibonacci](programs/fibonacci.lts) — Iterative Fibonacci sequence and explicit formatting.
- [primes-sieve](programs/primes-sieve.lts) — Prime generation up to 50 with `mut List<Int>`.
- [binary-search](programs/binary-search.lts) — Binary search returning a named tuple result.
- [caesar-cipher](programs/caesar-cipher.lts) — ASCII Caesar cipher round-trip over `core/text`.
- [word-frequency](programs/word-frequency.lts) — Word frequency counter via `core/list`.
- [rpn-evaluator](programs/rpn-evaluator.lts) — Stack-based Reverse Polish Notation evaluator.

## Canvas Art (`graphics/art/`)

- [rgba-composition](graphics/art/rgba-composition.lts) — `360x240` layered RGBA composition.
- [sunset-horizon](graphics/art/sunset-horizon.lts) — `360x220` dusk gradient, solar glow, and reflections.
- [geometric-mandala](graphics/art/geometric-mandala.lts) — `320x240` radial lines, concentric rings, and petals.
- [spectrum-bars](graphics/art/spectrum-bars.lts) — `340x200` stepped alpha palette and glaze ribbon.

## Animation (`graphics/animation/`)

- [bounce-emblem](graphics/animation/bounce-emblem.lts) — `320x200` bouncing `ℓite` emblem with chimes.
- [neon-rain](graphics/animation/neon-rain.lts) — `320x200` falling neon streaks with alpha trails.
- [solar-orbit](graphics/animation/solar-orbit.lts) — `320x220` multi-ring orbital motion.
- [pulse-ripples](graphics/animation/pulse-ripples.lts) — `320x200` expanding concentric alpha ripples.

## Interactive (`graphics/interactive/`)

- [cursor-paint](graphics/interactive/cursor-paint.lts) — `240x160` pointer brush with color swatches and tones.
- [studio-lamp](graphics/interactive/studio-lamp.lts) — `280x180` clickable lamp toggle with Space/Enter support.
- [color-mixer](graphics/interactive/color-mixer.lts) — `320x200` draggable RGBA channel sliders.
- [pixel-maze](graphics/interactive/pixel-maze.lts) — `286x182` maze navigator with WASD/Arrows and chimes.

## Audio & Synth (`graphics/audio/`)

- [synth-arpeggio](graphics/audio/synth-arpeggio.lts) — `320x180` four-pad sequencer using `audio.Note`.
- [chord-pad](graphics/audio/chord-pad.lts) — `320x180` polyphonic triad chord pads (`1`–`4` or click).
- [step-sequencer](graphics/audio/step-sequencer.lts) — `320x200` toggleable 4×4 grid step sequencer.
- [tone-keyboard](graphics/audio/tone-keyboard.lts) — `320x180` clickable C-major octave keyboard (`1`–`8`).

## Games (`games/`)

- [paddle-pong](games/paddle-pong.lts) — `320x200` two-paddle Pong with AI tracking and audio cues.
- [brick-breaker](games/brick-breaker.lts) — `320x200` RGBA brick breaker with paddle controls and chimes.
- [grid-snake](games/grid-snake.lts) — `320x192` snake game using `List<Cell>` queue ops.
