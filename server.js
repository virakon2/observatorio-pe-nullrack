import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import handler from './api/check.js';

const root = dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.css', ['app.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/domains.json', ['domains.json', 'application/json; charset=utf-8']]
]);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/check') {
    res.status = code => { res.statusCode = code; return res; };
    res.json = value => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); };
    req.query = Object.fromEntries(url.searchParams);
    return handler(req, res);
  }
  const file = files.get(url.pathname);
  if (!file) { res.writeHead(404); res.end('No encontrado'); return; }
  try {
    res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    res.end(await readFile(join(root, file[0])));
  } catch {
    res.writeHead(500); res.end('Error interno');
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));
