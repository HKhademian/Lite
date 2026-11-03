/** Default regressions and the explicitly selected historical reference suite. */
export const generatedTestFiles = [
  'test.ts', '../compiler/tests/host.test.ts', '../compiler/tests/contracts.test.ts',
  'source-files.test.ts', '../challenges/tools/tools.test.ts',
] as const;
export const referenceTestFiles = ['reference.test.ts'] as const;
