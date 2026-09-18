// Based on MercuryWorkshop/Scramjet-App (AGPL-3.0); see LICENSE.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { server as wisp, logging } from '@mercuryworkshop/wisp-js/server';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { scramjetPath } from '@mercuryworkshop/scramjet/path';
import { libcurlPath } from '@mercuryworkshop/libcurl-transport';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';

const root = fileURLToPath(new URL('.', import.meta.url));
logging.set_level(logging.NONE);
Object.assign(wisp.options, {
  allow_udp_streams: false,
  allow_private_ips: false,
  allow_loopback_ips: false,
  allow_direct_ip: false,
  stream_limit_per_host: 24,
  stream_limit_total: 64,
  port_whitelist: [80, 443],
  // This deployment supports the requested sites, not arbitrary TCP destinations.
  hostname_whitelist: [/^(?:[a-z0-9-]+\.)*(?:google\.com|gstatic\.com|googleusercontent\.com|googleapis\.com|youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|googlevideo\.com|ggpht\.com|example\.com)$/i],
});

const app = Fastify({
  serverFactory: handler => createServer((req, res) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    handler(req, res);
  }).on('upgrade', (req, socket, head) => {
    if (req.url !== '/wisp/') { socket.destroy(); return; }
    let origin;
    try { origin = new URL(req.headers.origin); } catch { socket.destroy(); return; }
    if (origin.host !== req.headers.host) { socket.destroy(); return; }
    wisp.routeRequest(req, socket, head);
  }),
});
await app.register(fastifyStatic, { root: scramjetPath, prefix: '/scram/' });
await app.register(fastifyStatic, { root: libcurlPath, prefix: '/libcurl/', decorateReply: false });
await app.register(fastifyStatic, { root: baremuxPath, prefix: '/baremux/', decorateReply: false });
app.get('/', (_req, reply) => reply.header('Cache-Control', 'no-store').sendFile('index.html', root));
for (const file of ['app.js', 'sw.js', 'style.css', 'LICENSE']) {
  app.get('/' + file, (_req, reply) => reply.header('Cache-Control', 'no-cache').sendFile(file, root));
}
app.get('/health', () => 'ok');
app.get('/view', (_req, reply) => reply.redirect('/'));
app.setNotFoundHandler((_req, reply) => reply.code(404).send('Page not found. Return to the homepage.'));
await app.listen({ port: Number(process.env.PORT || 8080), host: process.env.HOST || '0.0.0.0' });
console.log('Simple Proxy 2 is ready.');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await app.close(); process.exit(0); });
