# Graphics, Surfaces & Lite Play

Lite ships two complementary 2D graphics stacks plus portable color, audio, board, and timing modules so the same creative-coding and game skills work in both the **Browser Playground** and **native desktop windows** via `./bin/lite play`.

## Browser & Portable Play Canvas (`extra/canvas`, `extra/board`, `extra/audio`)

[extra/canvas](lite://module/extra/canvas) provides a lightweight pixel/rectangle canvas with packed ARGB colors (`0xAARRGGBB` or `canvas.rgb(r, g, b)`). Combine it with [extra/board](lite://module/extra/board) for pixel-grid sprites and [extra/audio](lite://module/extra/audio) for WebAudio / native PCM tones:

```lite
canvas := import "extra/canvas";
audio := import "extra/audio";

canvas.create(160, 100, "Lite Canvas");
canvas.clear(canvas.rgb(11, 12, 14));
canvas.fillRect(20, 20, 120, 60, canvas.rgb(201, 123, 20));
canvas.fillRect(36, 36, 88, 28, canvas.rgb(240, 180, 90));
audio.tone(440, 120, 40);
```

For interactive games, switch to `canvas.play(width, height, title)` and export `pub onFrame := fn(dt: Int): Unit`, `pub onKey := fn(key: String): Unit`, or `pub onPointer := fn(x: Int, y: Int, down: Bool): Unit`. The same `.lts` game runs directly in the Browser Playground **and** natively on desktop with `./bin/lite play`.

## Native Desktop & Headless Surfaces (`extra/surface`, `extra/color`)

[extra/surface](lite://module/extra/surface) is Lite's target-independent 2D desktop and headless surface API (`lite.extra.surface.v1`). On macOS it opens a native resizable, fullscreenable AppKit `NSWindow` with GPU-backed presentation, keyboard/pointer polling, native `NSSound` audio (`surface.playTone`), and live frame pacing and resource vitals.

[extra/color](lite://module/extra/color) provides encoding-independent normalized RGBA/HSL colors (`fromRgb`, `fromRgba8`, `fromHsl`, `mix`, `withAlphaFloat`) shared by `extra/surface`:

```lite
io := import "core/io";
color := import "extra/color";

amber := color.fromHsl(36.0, 0.85, 0.55);
dusk := color.fromRgb(0.08, 0.10, 0.16);
mid := color.mix(dusk, amber, 0.5);
io.outputLine(color.red8(mid), color.green8(mid), color.blue8(mid));
```

Key `extra/surface` capabilities:

- **Window & geometry control**: `surface.open`, `surface.openWithFps`, `surface.resize(s, w, h)`, `surface.setFullscreen(s, on)`, `surface.toggleFullscreen(s)`.
- **Passive geometry queries**: `surface.bounds(s)` (returns `Bounds { x, y, width, height, fullscreen }`), `surface.size(s)`, `surface.position(s)`, `surface.isFullscreen(s)`.
- **Drawing primitives**: `clear`, `fillRect`, `strokeRect`, `drawLine`, `fillCircle`, `strokeCircle`, `fillPixel`, `drawText`, and `present`.
- **Frame pacing & vitals**: `surface.setTargetFps(s, fps)` (default 60 FPS, `0.0` uncapped) and `surface.vitals(s)` (`frameCount`, `frameTimeMs`, `avgFrameTimeMs`, `fps`, `cpuTimeMs`, `memoryBytes`).

## Fixed-Timestep Clocks & Cooldowns (`extra/timer`)

[extra/timer](lite://module/extra/timer) supplies nominal `record` game-loop timing primitives: fixed-timestep accumulators (`StepClock.create`, `advance`, `reset`), cooldowns (`Cooldown.create`, `tick`, `trigger`, `isReady`, `progress`), and monotonic stopwatches (`Stopwatch.start`, `elapsedMs`, `lap`):

```lite
io := import "core/io";
timer := import "extra/timer";

mut clock := timer.StepClock.create(60.0, 0.25);
mut clock.advance(0.05);
mut cd := timer.Cooldown.create(1.0, false);
mut cd.tick(0.4);
io.outputLine(clock.lastSteps, clock.totalSteps, cd.isReady());
```

## Native Desktop Runner (`./bin/lite play`)

Launch any `extra/canvas` Play game in a native desktop window with `./bin/lite play`:

```sh
./bin/lite play samples/games/arcade/paddle-pong.lts
./bin/lite play --fullscreen samples/graphics/animation/hello-play.lts
./bin/lite play --hide-bar --debug samples/games/arcade/paddle-pong.lts
```

The native Play Stage includes a bottom control bar (`[PAUSE] [RST] [SOUND] [60FPS] [DBG] [FULL]`) and built-in keyboard shortcuts:

| Shortcut | Action |
| --- | --- |
| `F` | Toggle native fullscreen (also available via the Playground Fullscreen button) |
| `T` | Cycle target FPS cap (`60` → `120` → `30` → uncapped) |
| `F12` | Toggle the Play Stage bottom control bar |
| `Space` / `R` / `M` / `D` | Pause/resume, restart, mute/unmute audio, toggle live vitals overlay |

Explore the module references: [extra/canvas](lite://module/extra/canvas), [extra/surface](lite://module/extra/surface), [extra/color](lite://module/extra/color), [extra/audio](lite://module/extra/audio), [extra/board](lite://module/extra/board), and [extra/timer](lite://module/extra/timer).

## Next Chapter

Continue to [Math, Vectors, Matrices & Grids](lite://handbook/math-vectors-and-matrices).
