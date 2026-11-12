/** Curated showcase groups and verified examples for the public Lite site. */

export type SampleGroupId = 'basics' | 'control' | 'types' | 'input';

export type SampleGroup = Readonly<{
  id: SampleGroupId;
  title: string;
  description: string;
}>;

export type ShowcaseSample = Readonly<{
  id: string;
  group: SampleGroupId;
  title: string;
  note: string;
  file: string;
  args: readonly string[];
  stdin: string;
  /** Only fast, short-output samples display output directly on cards. */
  showOutput?: boolean;
}>;

export const sampleGroups: readonly SampleGroup[] = [
  {
    id: 'basics',
    title: 'Basics & Recursion',
    description: 'Explicit bindings, arithmetic, prompts, and recursive functions.',
  },
  {
    id: 'control',
    title: 'Control Flow & Loops',
    description: 'Expression-oriented conditionals, chained comparisons, and explicit loops.',
  },
  {
    id: 'types',
    title: 'Types & Collections',
    description: 'Transparent type aliases, named tuples, and growable lists.',
  },
  {
    id: 'input',
    title: 'Input & Arguments',
    description: 'Explicit stream reading, token retention, and command-line arguments.',
  },
];

export const heroSample: ShowcaseSample = {
  id: 'type-aliases',
  group: 'types',
  title: 'Type aliases and collections',
  note: 'Transparent named contracts, mutable lists, and explicit iteration with zero hidden runtime overhead.',
  file: 'language/examples/021-type-aliases.lts',
  args: [],
  stdin: '',
  showOutput: true,
};

export const showcaseSamples: readonly ShowcaseSample[] = [
  {
    id: 'double-sum',
    group: 'basics',
    title: 'Double sum',
    note: 'Read two integers with explicit prompts and print twice their sum.',
    file: 'language/examples/001-double-sum.lts',
    args: [],
    stdin: '7\n5\n',
    showOutput: true,
  },
  {
    id: 'factorial',
    group: 'basics',
    title: 'Recursive factorial',
    note: 'Function declaration with self-recursion and explicit error exit.',
    file: 'language/examples/004-factorial.lts',
    args: [],
    stdin: '6\n',
    showOutput: true,
  },
  {
    id: 'prompts-and-report',
    group: 'basics',
    title: 'Prompts and report',
    note: 'Explicit prompt ordering and formatted output.',
    file: 'language/examples/007-prompts-and-report.lts',
    args: [],
    stdin: '10\n20\n',
  },
  {
    id: 'decisions',
    group: 'control',
    title: 'Decisions & chained comparisons',
    note: 'If-expressions, chained range checks, and short-circuiting.',
    file: 'language/examples/002-decisions.lts',
    args: [],
    stdin: '5\n',
    showOutput: true,
  },
  {
    id: 'sum-positive',
    group: 'control',
    title: 'Sum positive integers',
    note: 'Loop over input values while filtering negative entries.',
    file: 'language/examples/003-sum-positive.lts',
    args: [],
    stdin: '4\n-2\n9\n0\n',
  },
  {
    id: 'scan-arithmetic',
    group: 'control',
    title: 'Scan arithmetic',
    note: 'Simple token scanning and arithmetic dispatch.',
    file: 'language/examples/005-scan-arithmetic.lts',
    args: [],
    stdin: '12 + 30\n',
  },
  heroSample,
  {
    id: 'input-history',
    group: 'input',
    title: 'Input history',
    note: 'Collect and replay entered values explicitly.',
    file: 'language/examples/014-input-history.lts',
    args: [],
    stdin: '3\n7\n10\n0\n',
  },
  {
    id: 'retained-tokens',
    group: 'input',
    title: 'Retained tokens',
    note: 'Retain and inspect scanned tokens from standard input.',
    file: 'language/examples/015-retained-tokens.lts',
    args: [],
    stdin: '10 + 20 * 3\n',
  },
  {
    id: 'whole-input',
    group: 'input',
    title: 'Whole input',
    note: 'Read all standard input into a single string.',
    file: 'language/examples/019-whole-input.lts',
    args: [],
    stdin: 'hello from lite\n',
  },
  {
    id: 'script-arguments',
    group: 'input',
    title: 'Script arguments',
    note: 'Read and iterate over command-line arguments.',
    file: 'language/examples/020-script-arguments.lts',
    args: ['one', 'two', 'three'],
    stdin: '',
    showOutput: true,
  },
];
