/** Interpreter-independent identities and measurement helpers. */
import { createHash } from 'node:crypto';

/** SHA-256 as lowercase hex, without the `sha256:` prefix. */
export function hashBytes(input: string | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Finds artifact nondeterminism markers: an ISO timestamp or any forbidden host
 * path. Callers pass temporary/repository roots they expect never to be emitted.
 */
export function nondeterminismReasons(artifact: string, forbidden: readonly string[] = []): readonly string[] {
  const reasons: string[] = [];
  if (/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\b/.test(artifact)) {
    reasons.push('timestamp');
  }
  for (const value of forbidden) {
    if (value.length > 0 && artifact.includes(value)) reasons.push(`absolute path: ${value}`);
  }
  return reasons;
}

/** Runs an action several times and returns its best wall time and values. */
export function benchmark<T>(action: () => T, iterations = 3): Readonly<{ bestMs: number; values: readonly T[] }> {
  const values: T[] = [];
  let bestMs = Number.POSITIVE_INFINITY;
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    values.push(action());
    const elapsed = performance.now() - started;
    if (elapsed < bestMs) bestMs = elapsed;
  }
  return { bestMs, values };
}
