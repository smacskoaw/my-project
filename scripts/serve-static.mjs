import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
const root = path.resolve('out');
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);
      if (base && pathname === base) {
        res.writeHead(302, { Location: base + '/' });
        res.end();
        return;
      }
      if (base && !pathname.startsWith(base + '/')) throw new Error('not-found');
      pathname = pathname.slice(base.length);
      let file = path.resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) throw new Error('not-found');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  })
  .listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Static preview ready'));
