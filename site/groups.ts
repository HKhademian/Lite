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
    description: 'Explicit bindings, named arguments, arithmetic, prompts, and recursive functions.',
  },
  {
    id: 'control',
    title: 'Control Flow & Loops',
    description: 'Expression-oriented conditionals, chained comparisons, compound updates, and explicit loops.',
  },
  {
    id: 'types',
    title: 'Types & Collections',
    description: 'Transparent type aliases, named and mixed tuples, fixed arrays, and growable lists.',
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
  title: 'Type aliases and lists',
  note: 'Named type aliases, mutable lists, and loop iteration.',
  file: 'language/examples/021-type-aliases.lts',
  args: [],
  stdin: '',
  showOutput: true,
};

export const playgroundDefaultSample: ShowcaseSample = {
  id: 'sum-loop',
  group: 'control',
  title: 'Sum loop',
  note: 'Mutable variables, compound updates, loop control, and conditional branching.',
  file: 'language/examples/022-sum-loop.lts',
  args: [],
  stdin: '',
  showOutput: true,
};

export const showcaseSamples: readonly ShowcaseSample[] = [
  playgroundDefaultSample,
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
    id: 'named-arguments',
    group: 'basics',
    title: 'Named arguments',
    note: 'Interleaved named and positional arguments, =name shorthand, and named self calls.',
    file: 'language/examples/012-named-arguments.lts',
    args: [],
    stdin: '',
    showOutput: true,
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
    id: 'fixed-tuples',
    group: 'types',
    title: 'Fixed tuples',
    note: 'Unit, singleton, grouped, and nested tuple destructuring.',
    file: 'language/examples/006-fixed-tuples.lts',
    args: [],
    stdin: '',
    showOutput: true,
  },
  {
    id: 'named-tuples',
    group: 'types',
    title: 'Named tuples',
    note: 'Named fields, =name shorthand construction, and positional destructuring.',
    file: 'language/examples/008-named-tuples.lts',
    args: [],
    stdin: '',
    showOutput: true,
  },
  {
    id: 'fixed-arrays',
    group: 'types',
    title: 'Fixed arrays',
    note: 'Fixed-extent array literals, checked indexing, and sequence traversal.',
    file: 'language/examples/009-fixed-arrays.lts',
    args: [],
    stdin: '1\n',
    showOutput: true,
  },
  {
    id: 'mixed-tuples',
    group: 'types',
    title: 'Mixed tuples',
    note: 'Interleaved named and unnamed tuple fields with stored-order destructuring.',
    file: 'language/examples/010-mixed-tuples.lts',
    args: [],
    stdin: '',
    showOutput: true,
  },
  {
    id: 'tuple-label-conversion',
    group: 'types',
    title: 'Tuple label conversion',
    note: 'Relabel stored tuple positions through explicit receiving contracts.',
    file: 'language/examples/011-tuple-label-conversion.lts',
    args: [],
    stdin: '',
    showOutput: true,
  },
  {
    id: 'growable-lists',
    group: 'types',
    title: 'Growable lists',
    note: 'Module front/back list mutations and independent value snapshots.',
    file: 'language/examples/013-growable-lists.lts',
    args: [],
    stdin: '',
    showOutput: true,
  },
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
    id: 'integer-calculator',
    group: 'input',
    title: 'Integer calculator',
    note: 'Tokenize and recursively evaluate integer arithmetic expressions.',
    file: 'language/examples/016-integer-calculator.lts',
    args: [],
    stdin: '2 + 3 * (4 - 1)\n',
    showOutput: true,
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
