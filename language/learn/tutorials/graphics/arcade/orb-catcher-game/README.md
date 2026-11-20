# Tutorial 3: Play Canvas & Audio Orb Catcher

Build an interactive 240x160 arcade mini-game using `extra/canvas`, `extra/board`, and `extra/audio`.

## Architecture

- **`canvas.play(...)` + Play Hooks**:
  - `onCanvasInit()` draws the opening frame immediately (and generates the static preview).
  - `onCanvasUpdate(dt)` advances orb physics smoothly on animation ticks and detects paddle catches vs misses.
  - `onCanvasKeyDown(key)` and `onCanvasPointerMove(col, row)` move the paddle cleanly via `clampPaddle` and trigger `audio.tone(...)` feedback.
- **Keepalive & DCE**: Pure user callbacks defined at top level stay alive in browser Play runs automatically through the playground/learn worker bridge.

## Controls

- Move with **Left/Right Arrows**, **A / D**, or by moving your pointer across the canvas stage.
- Press **Space** to reset score and miss counters.

See [extra/canvas](lite://module/extra/canvas), [extra/audio](lite://module/extra/audio), and [Paddle Pong sample](lite://play/play-paddle-pong).
