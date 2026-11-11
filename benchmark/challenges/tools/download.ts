/** Cached HTTP downloads shared by the four source-fetching commands. */
import { existsSync, mkdirSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
export type Job = { url: string; path: string };
export type DownloadOptions = { force?: boolean; retries?: number; timeoutMs?: number; delayMs?: number; allowMissing?: boolean; rateLimit?: boolean };
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const pause = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
export async function download(url: string, path: string, options: DownloadOptions = {}): Promise<string | undefined> {
  mkdirSync(dirname(path), { recursive: true });
  if (!options.force && existsSync(path) && statSync(path).size > 0) return path;
  let last: unknown;
  const retries = options.retries ?? 4;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (options.delayMs) await pause(options.delayMs);
      const response = await fetch(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(options.timeoutMs ?? 90000) });
      if (options.allowMissing && [404, 405].includes(response.status)) { await response.body?.cancel(); return undefined; }
      if (response.status === 429 && options.rateLimit) {
        const seconds = Number(response.headers.get('Retry-After') ?? 5), wait = Number.isFinite(seconds) && seconds >= 0 ? seconds : 5;
        await response.body?.cancel(); console.error(`  .. rate limited, sleeping ${wait}s`); await pause(wait * 1000); last = new Error('HTTP 429'); continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
      const body = new Uint8Array(await response.arrayBuffer()); if (!body.length) throw new Error('empty response');
      writeFileSync(path + '.tmp', body); renameSync(path + '.tmp', path); return path;
    } catch (error) { last = error; if (attempt + 1 < retries) await pause(1200 * (attempt + 1)); }
  }
  throw new Error(`failed to fetch ${url}: ${last instanceof Error ? last.message : String(last)}`);
}
/** Limits concurrent downloads, completes the batch, then returns failures/skipped pages. */
export async function pool(jobs: Job[], workers: number, options: DownloadOptions = {}, progressEvery = 25): Promise<{ failures: number; skipped: number }> {
  let next = 0, done = 0, failures = 0, skipped = 0;
  await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++]!;
      try { if (await download(job.url, job.path, options) === undefined) skipped++; }
      catch (error) { failures++; console.error(`  !! ${error instanceof Error ? error.message : String(error)}`); }
      done++; if (done % progressEvery === 0 || done === jobs.length) console.log(`  ${done}/${jobs.length}`);
    }
  }));
  return { failures, skipped };
}
