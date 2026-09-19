import http from 'node:http';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('./index.html', import.meta.url));
const retiredWorker = readFileSync(new URL('./sw.js', import.meta.url));
const server = http.createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache');
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let body;
  if (path === '/' || path === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    body = page;
  } else if (path === '/health') {
    res.setHeader('Content-Type', 'application/json');
    body = '{"status":"ok","site":"Vennela Farming"}';
  } else if (path === '/sw.js') {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    body = retiredWorker;
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    body = 'Not found';
  }
  res.end(req.method === 'HEAD' ? undefined : body);
});
server.on('upgrade', (_req, socket) => {
  socket.end('HTTP/1.1 410 Gone\r\nConnection: close\r\n\r\n');
});
server.listen(Number(process.env.PORT || 8083), process.env.HOST || '0.0.0.0', () => {
  console.log('Vennela Farming is ready');
});
