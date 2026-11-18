/** Validates component release streams directly against the Lite implementation (`lib/util/release.lts`). */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { compileTs } from '../host.ts';
import { checkTsArtifact, runTsArtifact } from '../../igniter/artifacts.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const releaseLibPath = join(root, 'lib/util/release.lts').replaceAll('\\', '/');

function runReleaseProbe(body: string): string {
  const source = `
    io := import "core/io";
    rel := import "${releaseLibPath}";
    ${body}
  `;
  const compiled = compileTs({ text: source, name: 'release-streams-probe.lts', cwd: root });
  assert.equal(compiled.status, 0, compiled.stderr.toString('utf8'));
  const ts = compiled.stdout.toString('utf8');
  assert.equal(checkTsArtifact(ts).status, 0);
  const res = runTsArtifact(ts);
  assert.equal(res.status, 0, res.stderr.toString('utf8'));
  return res.stdout.toString('utf8');
}

function withReleaseCheckout(
  versionsObj: Record<string, string | null>,
  igniterVersion: string,
  fn: (dir: string) => void,
): void {
  const dir = mkdtempSync(join(tmpdir(), 'lite-rel-streams-'));
  try {
    mkdirSync(join(dir, 'config'), { recursive: true });
    mkdirSync(join(dir, 'igniter'), { recursive: true });
    writeFileSync(join(dir, 'config/versions.json'), JSON.stringify(versionsObj, null, 2));
    writeFileSync(join(dir, 'igniter/package.json'), JSON.stringify({ version: igniterVersion }, null, 2));
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const baseVersions: Record<string, string | null> = {
  project: '0.8.0', scripting: '0.3.0',
  language: '0.2.0', compiler: '0.5.1', cli: '0.3.0', formatter: '0.1.0-alpha.1',
  runtime: '0.4.0', stdlib: null,
  builtins: null, checker: null, tester: null, verifier: null, benchmark: null,
  release: null, docs: null, vscode: '0.1.1', linker: null, doctor: null,
};

test('umbrella, language, scripting and tool releases keep independent versions', () => {
  withReleaseCheckout(baseVersions, '0.1.0-alpha.38', dir => {
    const out = runReleaseProbe(`
      forTags: List<String> = [
        "lite-v0.8.0", "lang-v0.2.0", "script-v0.3.0", "compiler-v0.5.1",
        "cli-v0.3.0", "formatter-v0.1.0-alpha.1", "runtime-v0.4.0", "igniter-v0.1.0-alpha.38"
      ];
      loop forTags as tag {
        sel := rel.selectComponentRelease("${dir.replaceAll('\\', '/')}", tag);
        io.outputLine(sel.ok, sel.hasTag, sel.component, sel.version);
      }
      vj := rel.versionsJson("${dir.replaceAll('\\', '/')}");
      io.outputLine(vj.jsonText);
    `);
    const lines = out.trimEnd().split('\n');
    assert.deepEqual(lines.slice(0, 8), [
      'true true project 0.8.0',
      'true true language 0.2.0',
      'true true scripting 0.3.0',
      'true true compiler 0.5.1',
      'true true cli 0.3.0',
      'true true formatter 0.1.0-alpha.1',
      'true true runtime 0.4.0',
      'true true igniter 0.1.0-alpha.38',
    ]);
    const parsed = JSON.parse(lines[8]!) as Record<string, string | null>;
    assert.equal(parsed['language'], '0.2.0');
    assert.equal(parsed['stdlib'], null);
  });
});

test('component changes do not require language or other component version bumps', () => {
  withReleaseCheckout({ ...baseVersions, compiler: '0.5.2' }, '0.1.0-alpha.38', dir => {
    const d = dir.replaceAll('\\', '/');
    const out = runReleaseProbe(`
      okRes := rel.selectComponentRelease("${d}", "compiler-v0.5.2");
      io.outputLine(okRes.ok, okRes.component, okRes.version);
      forBad: List<String> = ["compiler-v0.2.0", "lang-v0.5.2", "lite-v0.5.2", "script-v0.5.2"];
      loop forBad as tag {
        bad := rel.selectComponentRelease("${d}", tag);
        io.outputLine(bad.ok, bad.error);
      }
    `);
    const lines = out.trimEnd().split('\n');
    assert.equal(lines[0], 'true compiler 0.5.2');
    assert.match(lines[1]!, /^false .*compiler tag\/version mismatch/);
    assert.match(lines[2]!, /^false .*language tag\/version mismatch/);
    assert.match(lines[3]!, /^false .*project tag\/version mismatch/);
    assert.match(lines[4]!, /^false .*scripting tag\/version mismatch/);
  });
});

test('unassigned components remain unassigned until a version is explicitly recorded', () => {
  withReleaseCheckout(baseVersions, '0.1.0-alpha.38', dir => {
    const d = dir.replaceAll('\\', '/');
    const out = runReleaseProbe(`
      none := rel.selectComponentRelease("${d}", "");
      io.outputLine(none.ok, none.hasTag);
      unassigned := rel.selectComponentRelease("${d}", "std-v0.1.0");
      io.outputLine(unassigned.ok, unassigned.error);
    `);
    const lines = out.trimEnd().split('\n');
    assert.equal(lines[0], 'true false');
    assert.match(lines[1]!, /^false .*stdlib tag\/version mismatch/);
  });
  withReleaseCheckout({ ...baseVersions, stdlib: '0.1.0-alpha.1' }, '0.1.0-alpha.38', dir => {
    const out = runReleaseProbe(`
      sel := rel.selectComponentRelease("${dir.replaceAll('\\', '/')}", "std-v0.1.0-alpha.1");
      io.outputLine(sel.ok, sel.component, sel.version);
    `);
    assert.equal(out.trim(), 'true stdlib 0.1.0-alpha.1');
  });
});

test('tag and version validation rejects ambiguous streams and malformed versions', () => {
  const badTags = ['stdlib-v0.1.0', 'litelang-v0.1.0', 'litescript-v0.1.0', 'project-v0.1.0', 'v0.1.0', 'compiler-v01.2.3', 'cli-v0.1', 'lang-v0.1.0-01', 'formatter-v0.1.0/evil'];
  const tagLines = runReleaseProbe(`
    tags: List<String> = [${badTags.map(t => JSON.stringify(t)).join(', ')}];
    loop tags as t {
      r := rel.parseComponentTag(t);
      io.outputLine(r.ok, r.error);
    }
    good := rel.parseComponentTag("compiler-v1.2.3-rc.1+build.2");
    io.outputLine(good.ok, good.component, good.version);
  `).trimEnd().split('\n');
  for (let i = 0; i < badTags.length; i++) {
    assert.match(tagLines[i]!, /^false .*(unsupported release tag|invalid release version)/, badTags[i]!);
  }
  assert.equal(tagLines[badTags.length], 'true compiler 1.2.3-rc.1+build.2');

  withReleaseCheckout({ ...baseVersions, compiler: '01.2.3' }, '0.1.0', dir => {
    const out = runReleaseProbe(`r := rel.selectComponentRelease("${dir.replaceAll('\\', '/')}", ""); io.outputLine(r.ok, r.error);`);
    assert.match(out, /^false .*invalid or missing compiler/);
  });
  withReleaseCheckout({ ...baseVersions, igniter: '0.1.0' }, '0.1.0', dir => {
    const out = runReleaseProbe(`r := rel.selectComponentRelease("${dir.replaceAll('\\', '/')}", ""); io.outputLine(r.ok, r.error);`);
    assert.match(out, /^false .*unknown.*igniter/);
  });
  withReleaseCheckout({ ...baseVersions, vscode: '0.1.0-alpha.1' }, '0.1.0', dir => {
    const out = runReleaseProbe(`r := rel.selectComponentRelease("${dir.replaceAll('\\', '/')}", ""); io.outputLine(r.ok, r.error);`);
    assert.match(out, /^false .*vscode.*plain/);
  });
});

test('workflow triggers cover all distinct project and component streams and independently evolving tools', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/release.yml', import.meta.url), 'utf8');
  const triggers = [...workflow.matchAll(/^      - '([a-z]+)-v\*'$/gm)].map(match => match[1]).sort();
  const prefixes = runReleaseProbe(`
    names: List<String> = [
      "project", "language", "scripting", "compiler", "igniter", "cli",
      "formatter", "runtime", "stdlib", "builtins", "checker", "tester",
      "verifier", "benchmark", "release", "docs", "vscode", "linker", "doctor"
    ];
    loop names as n { io.outputLine(rel.componentTagPrefix(n)); }
    cur := rel.selectComponentRelease("${root.replaceAll('\\', '/')}", "");
    io.outputLine(cur.ok, cur.error);
  `).trimEnd().split('\n');
  const expectedPrefixes = prefixes.slice(0, 19).sort();
  assert.deepEqual(triggers, expectedPrefixes);
  assert.equal(prefixes[19], 'true');

  const toolPairs: readonly [string, string][] = [
    ['checker', 'check'], ['tester', 'test'], ['verifier', 'verify'],
    ['benchmark', 'bench'], ['release', 'release'], ['docs', 'docs'],
    ['builtins', 'builtins'], ['vscode', 'vscode'], ['linker', 'linker'],
  ];
  for (const [component, prefix] of toolPairs) {
    withReleaseCheckout({ ...baseVersions, [component]: '0.2.0' }, '0.1.0-alpha.38', dir => {
      const d = dir.replaceAll('\\', '/');
      const out = runReleaseProbe(`
        ok := rel.selectComponentRelease("${d}", "${prefix}-v0.2.0");
        bad := rel.selectComponentRelease("${d}", "${prefix}-v0.1.0");
        io.outputLine(ok.ok, ok.component, ok.version);
        io.outputLine(bad.ok, bad.error);
      `).trimEnd().split('\n');
      assert.equal(out[0], `true ${component} 0.2.0`);
      assert.match(out[1]!, /^false .*tag\/version mismatch/);
    });
  }
});
