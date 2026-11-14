/** Playable canvas and audio showcase samples for the Playground & Play Gallery. */

export type PlaySample = Readonly<{
  id: string;
  title: string;
  note: string;
  file: string;
  args: readonly string[];
  stdin: string;
  showOutput?: boolean;
}>;

export const playSamples: readonly PlaySample[] = [
  {
    id: 'play-bounce',
    title: 'Bounce — ℓite Mark & Chime',
    note: 'Animated canvas with typed Context, RGBA shadow blending, and wall-bounce tones.',
    file: 'language/examples/play/01-bounce.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-rgba-art',
    title: 'RGBA Layered Composition',
    note: 'Static canvas composition blending translucent rgba circles, grid lines, and rectangles.',
    file: 'language/examples/play/02-rgba-art.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-cursor-paint',
    title: 'Pointer Paint & Keys',
    note: 'Interactive canvas: move or click to draw pixels and trigger tones; Space clears via canvas.clear(bg).',
    file: 'language/examples/play/03-cursor-paint.lts',
    args: [],
    stdin: '',
  },
  {
    id: 'play-arpeggio',
    title: 'Synth Arpeggio',
    note: 'Four-note sequencer using typed audio.Note values, keyboard Space/Arrows, and clickable pads.',
    file: 'language/examples/play/04-arpeggio.lts',
    args: [],
    stdin: '',
  },
];
