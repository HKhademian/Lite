/** Shared component-version handling for standalone tools. */
import type { Component } from '../compiler/release-streams.ts';
import { versions } from './project.ts';

export function showToolVersion(component: Component, command: string): boolean {
  if (process.argv[2] !== '--version') return false;
  if (process.argv.length !== 3) {
    process.stderr.write(`Usage: lite ${command} --version\n`);
    process.exit(2);
  }
  process.stdout.write(`lite ${command} ${versions()[component] ?? 'unassigned'}\n`);
  process.exit(0);
}
