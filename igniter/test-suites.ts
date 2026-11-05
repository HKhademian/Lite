/** Default regressions and the explicitly selected historical reference suite. */
export const generatedTestFiles = [
  'test.ts', '../compiler/tests/tooling.test.ts', '../compiler/tests/host.test.ts', '../compiler/tests/contracts.test.ts',
  'source-files.test.ts', '../challenges/tools/tools.test.ts',
  '../tools/docs.test.ts', '../compiler/scripts/release-streams.test.ts',
  '../tools/cases.test.ts',
  '../tools/run.test.ts',
  '../tools/release.test.ts',
] as const;
export const referenceTestFiles = ['reference.test.ts'] as const;
