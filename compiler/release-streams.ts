/** Independent project/component versions and their owner-selected tag prefixes. */
import assert from 'node:assert/strict';

export const componentPrefixes = Object.freeze({
  project: 'lite', language: 'lang', scripting: 'script', compiler: 'compiler', igniter: 'igniter', cli: 'cli',
  formatter: 'formatter', runtime: 'runtime', stdlib: 'std',
  builtins: 'builtins', checker: 'check', tester: 'test', verifier: 'verify',
  benchmark: 'bench', release: 'release', docs: 'docs', vscode: 'vscode', linker: 'linker', doctor: 'doctor',
});
export type Component = keyof typeof componentPrefixes;
export type ComponentVersions = Readonly<Record<Component, string | null>>;
export type ComponentRelease = Readonly<{ component: Component; version: string }>;

/** SemVer without leading zeroes in numeric core or prerelease identifiers. */
function validVersion(version: string): boolean {
  const match = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(version);
  return match !== null && (match[4] === undefined || match[4].split('.').every(part => !/^[0-9]+$/.test(part) || part === '0' || !part.startsWith('0')));
}

/** Reads explicit versions; igniter keeps its existing package.json authority. */
export function componentVersions(value: unknown, igniterVersion: string): ComponentVersions {
  assert(typeof value === 'object' && value !== null && !Array.isArray(value), 'versions.json must be an object');
  const record = value as Record<string, unknown>;
  const versions: Record<Component, string | null> = {
    project: null, language: null, scripting: null, compiler: null, igniter: igniterVersion, cli: null,
    formatter: null, runtime: null, stdlib: null,
    builtins: null, checker: null, tester: null, verifier: null, benchmark: null,
    release: null, docs: null, vscode: null, linker: null, doctor: null,
  };
  assert(validVersion(igniterVersion), 'invalid igniter package version');
  for (const key of Object.keys(record)) {
    assert(key !== 'igniter' && Object.hasOwn(componentPrefixes, key), `unknown versions.json component: ${key}`);
  }
  for (const key of Object.keys(componentPrefixes) as Component[]) {
    if (key === 'igniter') continue;
    const version = record[key];
    assert(version === null || (typeof version === 'string' && validVersion(version)), `versions.json: invalid or missing ${key} version`);
    if (key === 'vscode' && version !== null) assert(/^\d+\.\d+\.\d+$/.test(version as string), 'vscode version requires plain MAJOR.MINOR.PATCH');
    versions[key] = version;
  }
  return versions;
}

/** Parses a single stream, keeping umbrella, language and scripting identities separate. */
export function parseComponentTag(tag: string): ComponentRelease {
  for (const component of Object.keys(componentPrefixes) as Component[]) {
    const prefix = `${componentPrefixes[component]}-v`;
    if (!tag.startsWith(prefix)) continue;
    const version = tag.slice(prefix.length);
    assert(validVersion(version), `invalid release version: ${tag}`);
    return { component, version };
  }
  throw new Error(`unsupported release tag: ${tag}`);
}

/** A tag releases only its own component and must match the checked-in version. */
export function selectComponentRelease(tag: string | undefined, versions: ComponentVersions): ComponentRelease | null {
  if (tag === undefined) return null;
  const release = parseComponentTag(tag);
  assert.equal(versions[release.component], release.version,
    `${release.component} tag/version mismatch: update ${release.component === 'igniter' ? 'igniter/package.json' : 'versions.json'} before tagging`);
  return release;
}
