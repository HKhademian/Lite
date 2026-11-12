#!/usr/bin/env node
/** Serve dist/site/ locally with no external dependencies. */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';

const root = dirname(import.meta.dirname);
const siteDir = join(root, 'dist', 'site');
const brandDir = join(root, 'brand');
const port = Number(process.env['PORT'] ?? '8080');

const mimeTypes: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

if (!existsSync(siteDir)) {
  console.error('dist/site/ does not exist. Run `./site/build.ts` first.');
  process.exit(1);
}

function serveFile(res: import('node:http').ServerResponse, filePath: string): void {
  const mime = mimeTypes[extname(filePath)] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
  res.end(readFileSync(filePath));
}

const server = createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0] ?? '/';

  if (urlPath === '/studio' || urlPath === '/studio/' || urlPath === '/brand' || urlPath === '/brand/') {
    const studio = join(brandDir, 'investigation', 'studio.html');
    if (existsSync(studio) && statSync(studio).isFile()) {
      res.writeHead(302, { Location: '/brand/investigation/studio.html', 'Cache-Control': 'no-store' });
      res.end();
      return;
    }
  }

  if (urlPath.startsWith('/brand/')) {
    const rel = normalize(urlPath.slice('/brand/'.length)).replace(/^(\.\.(\/|\\|$))+/, '');
    const target = resolve(brandDir, rel);
    if (target.startsWith(brandDir) && existsSync(target) && statSync(target).isFile()) {
      serveFile(res, target);
      return;
    }
  }

  const safePath = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  let target = join(siteDir, safePath);
  if (existsSync(target) && statSync(target).isDirectory()) {
    target = join(target, 'index.html');
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Not Found\n');
    return;
  }
  serveFile(res, target);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving Lite site at http://127.0.0.1:${String(port)}/`);
  if (existsSync(join(brandDir, 'investigation', 'studio.html'))) {
    console.log(`Brand studio (local): http://127.0.0.1:${String(port)}/brand/`);
  }
});
