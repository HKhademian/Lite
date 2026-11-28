/** Playable folder-grouped canvas, animation, interactive, audio, and game showcases. */

export type PlayGroupId = 'play-art' | 'play-animation' | 'play-interactive' | 'play-audio' | 'play-3d' | 'play-games';

export type PlayGroup = Readonly<{
  id: PlayGroupId;
  title: string;
  description: string;
  folder: string;
  badge: string;
}>;

export type PlaySample = Readonly<{
  id: string;
  group: PlayGroupId;
  title: string;
  note: string;
  file: string;
  args: readonly string[];
  stdin: string;
  showOutput?: boolean;
}>;

export const playGroups: readonly PlayGroup[] = [
  {
    id: 'play-art',
    title: 'Canvas Art',
    description: 'High-resolution static compositions blending translucent RGBA layers, shapes, and frames (`gfx/canvas` + `gfx/board`).',
    folder: 'samples/graphics/art',
    badge: 'RGBA Art',
  },
  {
    id: 'play-animation',
    title: 'Animation',
    description: 'Smooth real-time motion driven by `onCanvasUpdate(dt)` loops, halos, and fading alpha trails.',
    folder: 'samples/graphics/animation',
    badge: 'Animated',
  },
  {
    id: 'play-interactive',
    title: 'Interactive',
    description: 'Pointer clicks, drag gestures, and keyboard controls handled through `onCanvasPointer*` and `onCanvasKey*` hooks.',
    folder: 'samples/graphics/interactive',
    badge: 'Interactive',
  },
  {
    id: 'play-audio',
    title: 'Audio & Synth',
    description: 'Web Audio tones, polyphonic triads, keyboards, and grid step sequencers using `media/audio`.',
    folder: 'samples/graphics/audio',
    badge: 'Audio',
  },
  {
    id: 'play-3d',
    title: '3D Scenes',
    description: 'Real-time 3D software scenes rendered with `gfx/camera`, `gfx/scene`, `math/transform`, and `ui/im` HUD controls.',
    folder: 'samples/3d',
    badge: '3D',
  },
  {
    id: 'play-games',
    title: 'Games',
    description: 'Complete playable 2D and 3D games combining surface rendering, `ui/im` overlays, input handling, and synthesized audio.',
    folder: 'samples/games',
    badge: 'Game',
  },
];

export const playSamples: readonly PlaySample[] = [
  /* Canvas Art */
  {
    id: 'play-rgba-art',
    group: 'play-art',
    title: 'RGBA Layered Composition',
    note: 'Translucent RGBA disks, gradient bands, highlights, and nested 24px grid frames (360×240).',
    file: 'samples/graphics/art/rgba-composition.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-sunset-horizon',
    group: 'play-art',
    title: 'Sunset Horizon',
    note: 'Layered dusk gradient bands, atmospheric solar glow halos, silhouette ridge, and water reflections (360×220).',
    file: 'samples/graphics/art/sunset-horizon.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-geometric-mandala',
    group: 'play-art',
    title: 'Geometric Mandala',
    note: '16-fold radial spokes with midpoint `drawCircle` rings and overlapping translucent petals (320×240).',
    file: 'samples/graphics/art/geometric-mandala.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-spectrum-bars',
    group: 'play-art',
    title: 'Spectrum & Alpha Bars',
    note: 'Six-column RGBA opacity ladder crossed by a translucent glaze ribbon (340×200).',
    file: 'samples/graphics/art/spectrum-bars.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-record-mosaic',
    group: 'play-art',
    title: 'Record Card Mosaic',
    note: 'Layered 2×2 translucent glass cards driven by nominal records, =name shorthand, and aggregate destructuring (360×240).',
    file: 'samples/graphics/art/record-mosaic.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-match-signal-board',
    group: 'play-art',
    title: 'Match Signal Board',
    note: 'Six-tile telemetry board styled with subject-based match over records, comparison patterns, and range guards (360×240).',
    file: 'samples/graphics/art/match-signal-board.lts',
    args: [],
    stdin: '',
  },

  /* Animation */
  {
    id: 'play-hello',
    group: 'play-animation',
    title: 'Hello Play — Minimal Starter',
    note: 'Compact gfx/canvas + media/audio boilerplate with bounce chimes, Space reverse, and click-to-place; runs in Browser Play and natively via ./bin/lite play (320×180).',
    file: 'samples/graphics/animation/hello-play.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-bounce',
    group: 'play-animation',
    title: 'Bounce — ℓite Mark & Chime',
    note: '6× scaled ℓite emblem with soft shadow, RGBA halo, and wall-bounce chimes (320×200).',
    file: 'samples/graphics/animation/bounce-emblem.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-neon-rain',
    group: 'play-animation',
    title: 'Neon Rain',
    note: 'Multi-speed falling columns with six-segment fading RGBA alpha trails (320×200).',
    file: 'samples/graphics/animation/neon-rain.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-solar-orbit',
    group: 'play-animation',
    title: 'Solar Orbit',
    note: 'Three concentric planetary rings animated with deterministic integer LUT waypoints (320×220).',
    file: 'samples/graphics/animation/solar-orbit.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-pulse-ripples',
    group: 'play-animation',
    title: 'Pulse Ripples',
    note: 'Twin expanding concentric wave emitters fading across alpha levels via `drawCircle` (320×200).',
    file: 'samples/graphics/animation/pulse-ripples.lts',
    args: [],
    stdin: '',
  },

  /* Interactive */
  {
    id: 'play-particle-pool',
    group: 'play-interactive',
    title: 'Particle Pool — Zero-Churn ECS',
    note: 'Interactive 128-slot particle fountain backed by ds/pool, ds/sparse, and ds/arena frame scratch resets (320×200).',
    file: 'samples/graphics/interactive/particle-pool.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-cursor-paint',
    group: 'play-interactive',
    title: 'Pointer Paint & Keys',
    note: 'Drag brush circles, click bottom color swatches or press 1–4/Arrows, Space clears (240×160).',
    file: 'samples/graphics/interactive/cursor-paint.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-studio-lamp',
    group: 'play-interactive',
    title: 'Studio Lamp',
    note: 'Click bulb or press Space/Enter to toggle warm RGBA illumination and high/low chimes (280×180).',
    file: 'samples/graphics/interactive/studio-lamp.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-color-mixer',
    group: 'play-interactive',
    title: 'RGBA Color Mixer',
    note: 'Drag R/G/B/A channel faders or use Up/Down + Left/Right to inspect live checkerboard alpha blending.',
    file: 'samples/graphics/interactive/color-mixer.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-pixel-maze',
    group: 'play-interactive',
    title: 'Pixel Maze',
    note: 'Steer through brick corridors with Arrows/WASD, reach the emerald goal for a chord, Space resets.',
    file: 'samples/graphics/interactive/pixel-maze.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-surface-ripples',
    group: 'play-interactive',
    title: 'Surface 2D Ripples',
    note: 'Pure 2D `gfx/surface` and `gfx/color` ripple study with pointer click spawn, Space palette shift, and nominal `Point`/`Rect` types (360×220).',
    file: 'samples/graphics/interactive/surface-ripples.lts',
    args: [],
    stdin: '',
  },

  /* Audio & Synth */
  {
    id: 'play-pure-chime-scale',
    group: 'play-audio',
    title: 'Pure Audio Chime Scale',
    note: 'Pure `media/audio` pentatonic chime sequence using `audio.Note` and `audio.playNote` without canvas boilerplate.',
    file: 'samples/graphics/audio/pure-chime-scale.lts',
    args: [],
    stdin: '',
    showOutput: true,
  },
  {
    id: 'play-arpeggio',
    group: 'play-audio',
    title: 'Synth Arpeggio',
    note: 'Four-pad sequencer using typed `audio.Note` values, clickable pads, and Space/Arrows control (320×180).',
    file: 'samples/graphics/audio/synth-arpeggio.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-chord-pad',
    group: 'play-audio',
    title: 'Chord Pad',
    note: 'Polyphonic C, F, G, and Am triads triggered by clicking pads or pressing Keys 1–4 / Arrows (320×180).',
    file: 'samples/graphics/audio/chord-pad.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-step-sequencer',
    group: 'play-audio',
    title: '4×4 Step Sequencer',
    note: 'Click grid cells to toggle active notes on four pitch rows as the playhead sweeps across steps.',
    file: 'samples/graphics/audio/step-sequencer.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-tone-keyboard',
    group: 'play-audio',
    title: 'Tone Keyboard',
    note: 'One-octave C-major keyboard controlled by pointer clicks, Keys 1–8, or Left/Right arrows (320×180).',
    file: 'samples/graphics/audio/tone-keyboard.lts',
    args: [],
    stdin: '',
  },

  /* 3D Scenes */
  {
    id: 'play-orbital-orrery',
    group: 'play-3d',
    title: 'Orbital Orrery 3D',
    note: 'Interactive 3D solar system with orbit drag/wheel camera, planetary rings, moons, and `ui/im` time controls (480×300).',
    file: 'samples/3d/orbital-orrery.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-terrain-flyover',
    group: 'play-3d',
    title: 'Alpine Terrain Flyover 3D',
    note: 'Procedural heightmap biomes, distance fog, banking glider craft, and autopilot/manual WASD flight controls (480×300).',
    file: 'samples/3d/terrain-flyover.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-lit-polyhedra-studio',
    group: 'play-3d',
    title: 'Lit Polyhedra Studio 3D',
    note: 'Inspect procedural 3D primitives over a wireframe grid with live light azimuth/elevation sliders and material toggles (480×300).',
    file: 'samples/3d/lit-polyhedra-studio.lts',
    args: [],
    stdin: '',
  },

  /* Games */
  {
    id: 'play-paddle-pong',
    group: 'play-games',
    title: 'Paddle Pong',
    note: 'Classic two-paddle Pong with pointer/W/S/Arrow control, AI opponent, score pips, and bounce tones.',
    file: 'samples/games/arcade/paddle-pong.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-brick-breaker',
    group: 'play-games',
    title: 'Brick Breaker',
    note: 'Break 18 layered bricks using arrow keys or pointer tracking with pitch-scaled hit chimes.',
    file: 'samples/games/arcade/brick-breaker.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-grid-snake',
    group: 'play-games',
    title: 'Grid Snake',
    note: 'Growable snake tracked with `type/list` queue pushFront/popBack, Arrows/WASD steering, and fruit chimes.',
    file: 'samples/games/arcade/grid-snake.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-tunnel-racer',
    group: 'play-games',
    title: '3D Tunnel Racer',
    note: 'High-speed 3D star-tunnel racer with banking craft, procedural obstacle gates, shields, boost, and audio cues (480×300).',
    file: 'samples/games/3d/tunnel-racer.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-voxel-arena',
    group: 'play-games',
    title: '3D Voxel Tank Arena',
    note: '3D arena combat with hierarchical hull/turret transforms, ray-aimed cannon fire, chasing drones, and waves (480×300).',
    file: 'samples/games/3d/voxel-arena.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-tower-defense',
    group: 'play-games',
    title: 'Tower Defense Tactical',
    note: 'Grid tactical tower defense with 3 typed tower classes, splash & frost effects, wave progression, and `ui/im` shop HUD (480×300).',
    file: 'samples/games/arcade/tower-defense.lts',
    args: [],
    stdin: '',
  },
];
