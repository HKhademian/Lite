/** Named CI tasks executed directly by Node; workflow YAML contains no shell programs. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, run } from './project.ts';
import { prepareRelease, releaseProfile } from './release.ts';
import { selectComponentRelease } from '../compiler/release-streams.ts';
import { versions } from './project.ts';

function invoke(command: string, args: string[], cwd = root): void {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', timeout: 0 });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, 'CI task terminated by signal');
  assert.equal(result.status, 0, `CI task failed: ${command} ${args.join(' ')}`);
}
const lite = (...args: string[]) => invoke(process.execPath, ['bin/lite', ...args]);

/** Report every accepted-language failure and fail if the reviewed migration baseline changes. */
export function verifyMigration(): void {
  const expected = JSON.parse(readFileSync(join(root, 'config/ts-migration.json'), 'utf8')) as { scenarios: number; failures: string[] };
  const result = spawnSync(process.execPath, ['bin/lite', 'verify', '--all', '--no-cache'], { cwd: root, encoding: 'utf8', timeout: 120_000, maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  process.stdout.write(result.stdout); process.stderr.write(result.stderr);
  assert.equal(result.signal, null);
  const failures = result.stdout.split('\n').filter(line => line.startsWith('FAIL ')).sort();
  const count = /(?:scenario\(s\), )?(\d+) executed, \d+ cached/.exec(result.stdout);
  assert.equal(Number(count?.[1]), expected.scenarios, 'migration scenario inventory changed; review baseline');
  assert.deepEqual(failures, [...expected.failures].sort(), 'migration failures changed; review new support or regressions');
  assert.equal(result.status, failures.length ? 1 : 0);
  console.log(`Migration baseline unchanged: ${expected.scenarios - failures.length} pass; ${failures.length} accepted-language failures remain. This is not full conformance.`);
}

const taskFile = process.argv[2];
function releaseTag(): string | undefined {
  return process.env['GITHUB_EVENT_NAME'] === 'push' && process.env['GITHUB_REF_TYPE'] === 'tag'
    ? process.env['GITHUB_REF_NAME'] : undefined;
}
function releaseNeedsCompilerGates(): boolean {
  return releaseProfile(selectComponentRelease(releaseTag(), versions())) !== 'tools';
}
if (import.meta.main) {
  try {
    assert(taskFile !== undefined, 'CI task file required');
    const task = readFileSync(taskFile, 'utf8').trim();
    switch (task) {
      case 'install':
        invoke('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], join(root, 'igniter'));
        invoke('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], join(root, 'editors/vscode')); break;
      case 'check': lite('doctor'); break;
      case 'test': lite('test', '--full'); break;
      case 'editor': invoke(process.execPath, ['--test', 'editors/vscode/test/grammar.test.ts']); break;
      case 'site': invoke(process.execPath, ['--test', 'site/build.test.ts']); break;
      case 'coverage': lite('verify', '--coverage'); break;
      case 'migration': verifyMigration(); break;
      case 'release-doctor': lite('doctor'); break;
      case 'release-unit':
        invoke(process.execPath, ['--test', 'tools/docs.test.ts', 'tools/cases.test.ts', 'tools/cli.test.ts', 'tools/release.test.ts', 'compiler/scripts/release-streams.test.ts']); break;
      case 'release-editor': invoke(process.execPath, ['--test', 'editors/vscode/test/grammar.test.ts']); break;
      case 'release-regressions': if (releaseNeedsCompilerGates()) lite('test', '--full'); break;
      case 'release-coverage': if (releaseNeedsCompilerGates()) lite('verify', '--coverage'); break;
      case 'release-migration': if (releaseNeedsCompilerGates()) verifyMigration(); break;
      case 'self-host': {
        const work = mkdtempSync(join(tmpdir(), 'lite-ci-self-host-'));
        try {
          const tar = join(work, 'source.tar');
          writeFileSync(tar, run('git', ['archive', '--format=tar', 'HEAD']));
          run('tar', ['-xf', tar, '-C', work], work); rmSync(tar);
          symlinkSync(join(root, 'igniter/node_modules'), join(work, 'igniter/node_modules'));
          invoke(process.execPath, ['bin/lite', 'test', '--full'], work);
          invoke(process.execPath, ['compiler/scripts/build.ts'], work);
          invoke(process.execPath, ['compiler/scripts/self-host.ts', '--out', 'dist/ladder'], work);
          invoke(process.execPath, ['compiler/scripts/corpus-parity.ts', '--artifact', 'dist/ladder/generation-3.ts'], work);
        } finally { rmSync(work, { recursive: true, force: true }); }
        break;
      }
      case 'package': {
        prepareRelease(root, join(root, 'dist/release'), releaseTag()); break;
      }
      case 'publish': {
        assert.equal(process.env['GITHUB_EVENT_NAME'], 'push');
        assert.equal(process.env['GITHUB_REF_TYPE'], 'tag');
        const tag = process.env['GITHUB_REF_NAME']; assert(tag);
        const directory = join(root, 'dist/release');
        const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')) as { tag: string; releasedComponent: { version: string } };
        assert.equal(manifest.tag, tag);
        const args = ['release', 'create', tag, ...readdirSync(directory).map(file => join(directory, file)), '--draft', '--verify-tag', '--latest=false', '--title', tag, '--notes-file', join(directory, 'RELEASE-NOTES.md')];
        if (manifest.releasedComponent.version.includes('-')) args.push('--prerelease');
        invoke('gh', args); invoke('gh', ['release', 'edit', tag, '--draft=false', '--latest=false']); break;
      }
      default: throw new Error(`unknown CI task: ${task}`);
    }
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
