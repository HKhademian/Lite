/** Playable folder-grouped canvas, animation, interactive, audio, and game showcases. */

export type PlayGroupId = 'play-art' | 'play-animation' | 'play-interactive' | 'play-audio' | 'play-games';

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
    description: 'High-resolution static compositions blending translucent RGBA layers, shapes, and frames (`extra/canvas` + `extra/board`).',
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
    description: 'Web Audio tones, polyphonic triads, keyboards, and grid step sequencers using `extra/audio`.',
    folder: 'samples/graphics/audio',
    badge: 'Audio',
  },
  {
    id: 'play-games',
    title: 'Games',
    description: 'Complete playable mini-games combining high-res canvas rendering, state lists, input hooks, and sound cues.',
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

  /* Animation */
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

  /* Audio & Synth */
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

  /* Games */
  {
    id: 'play-paddle-pong',
    group: 'play-games',
    title: 'Paddle Pong',
    note: 'Classic two-paddle Pong with pointer/W/S/Arrow control, AI opponent, score pips, and bounce tones.',
    file: 'samples/games/paddle-pong.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-brick-breaker',
    group: 'play-games',
    title: 'Brick Breaker',
    note: 'Break 18 layered bricks using arrow keys or pointer tracking with pitch-scaled hit chimes.',
    file: 'samples/games/brick-breaker.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-grid-snake',
    group: 'play-games',
    title: 'Grid Snake',
    note: 'Growable snake tracked with `core/list` queue pushFront/popBack, Arrows/WASD steering, and fruit chimes.',
    file: 'samples/games/grid-snake.lts',
    args: [],
    stdin: '',
  },
];
