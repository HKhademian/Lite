/** Boundary checks for behavior shared by the migrated maintenance commands. */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { round, unescapeHtml } from './common.ts';
import { download } from './download.ts';

test('challenge metadata preserves binary64 ties-to-even decimal rounding', () => {
  for (const [value, digits, expected] of [[2.5, 0, 2], [3.5, 0, 4], [1.25, 1, 1.2], [1.35, 1, 1.4], [2.675, 2, 2.67], [-2.675, 2, -2.67], [1.15, 1, 1.1]] as const) assert.equal(round(value, digits), expected);
});
test('sample HTML preserves named references, numeric replacements and unknown text', () => {
  assert.equal(unescapeHtml('&lt;x&gt; &amp; &NotEqualTilde; &#x1F642; &#128; &notit; &unknown;'), '<x> & ≂̸ 🙂 € ¬it; &unknown;');
  assert.equal(unescapeHtml('&#0; &#xD800; &#x110000; &#11;'), '\ufffd \ufffd \ufffd ');
});
test('downloads retry rate limits, publish complete files, reuse cache and admit missing optional pages', async context => {
  const directory = mkdtempSync(join(tmpdir(), 'lite-download-test-'));
  try {
    let calls = 0;
    const mocked = context.mock.method(globalThis, 'fetch', async (): Promise<Response> => ++calls === 1 ? new Response('', { status: 429, headers: { 'Retry-After': '0' } }) : new Response('complete payload'));
    const path = join(directory, 'page.html');
    assert.equal(await download('https://fixture.invalid/page', path, { retries: 2, rateLimit: true }), path);
    assert.equal(mocked.mock.callCount(), 2); assert.equal(readFileSync(path, 'utf8'), 'complete payload'); assert.equal(existsSync(path + '.tmp'), false);
    await download('https://fixture.invalid/page', path); assert.equal(mocked.mock.callCount(), 2);
    mocked.mock.mockImplementation(async () => new Response('', { status: 404 }));
    const missing = join(directory, 'missing.html'); assert.equal(await download('https://fixture.invalid/missing', missing, { allowMissing: true }), undefined); assert.equal(existsSync(missing), false);
    mocked.mock.mockImplementation(async () => new Response('', { status: 503 }));
    await assert.rejects(download('https://fixture.invalid/failing', missing, { retries: 1 }), /HTTP 503/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
