'use strict';
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns').promises;
const { load } = require('cheerio');

const MAX_BYTES = 5 * 1024 * 1024;
let active = 0;
let requests = 0;
setInterval(() => { requests = 0; }, 60000).unref();

// Resolve only IPv4 and pin the checked address to prevent DNS rebinding.
function publicAddress(ip) {
  const [a, b, c] = ip.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

async function fetchPage(input, redirects = 0) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port))) {
    throw new Error('Use a public HTTP or HTTPS website on its normal port.');
  }
  const addresses = await dns.lookup(url.hostname, { family: 4, all: true });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) {
    throw new Error('Local and private network addresses are not supported.');
  }
  const address = addresses[0].address;
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {
      agent: false,
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [{ address, family: 4 }]);
        else callback(null, address, 4);
      },
      headers: { 'User-Agent': 'SimpleWebProxy/1.0', 'Accept-Encoding': 'identity' }
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.destroy();
        if (redirects >= 5) return reject(new Error('This website redirected too many times.'));
        let next;
        try { next = new URL(response.headers.location, url); }
        catch { return reject(new Error('Invalid redirect.')); }
        resolve(fetchPage(next, redirects + 1));
        return;
      }
      const parts = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          reject(new Error('This file exceeds the 5 MB limit.'));
          response.destroy();
        } else parts.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ url, status: response.statusCode,
        type: String(response.headers['content-type'] || 'text/plain').split(';')[0],
        body: Buffer.concat(parts) }));
    });
    const timer = setTimeout(() => request.destroy(new Error('The website took too long to respond.')), 20000);
    request.on('close', () => clearTimeout(timer));
    request.on('error', reject);
  });
}

function proxied(value, base) {
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) ? '/view?url=' + encodeURIComponent(url.href) : '#';
  } catch { return '#'; }
}

function rewriteCss(css, base) {
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi,
    (_match, _quote, url) => `url("${proxied(url, base)}")`)
    .replace(/@import\s+(['"])(.*?)\1/gi,
      (_match, _quote, url) => `@import "${proxied(url, base)}"`);
}

function rewriteHtml(html, base) {
  const $ = load(html);
  const baseHref = $('base[href]').first().attr('href');
  if (baseHref) { try { base = new URL(baseHref, base); } catch {} }
  $('script, iframe, frame, frameset, object, embed, base, meta, template, svg, math').remove();
  $('*').each((_i, el) => {
    for (const attr of Object.keys(el.attribs || {})) {
      if (/^on/i.test(attr) || ['srcdoc', 'srcset', 'ping', 'integrity', 'nonce', 'action', 'formaction', 'target', 'download'].includes(attr)) {
        $(el).removeAttr(attr);
      }
    }
    for (const attr of ['href', 'src', 'poster', 'background']) {
      const value = $(el).attr(attr);
      if (value && !value.startsWith('#')) $(el).attr(attr, proxied(value, base));
    }
    if ($(el).attr('style')) $(el).attr('style', rewriteCss($(el).attr('style'), base));
  });
  $('link').each((_i, el) => { if ($(el).attr('rel') !== 'stylesheet') $(el).remove(); });
  $('style').each((_i, el) => $(el).text(rewriteCss($(el).text(), base)));
  $('input, button, select, textarea').attr('disabled', 'disabled');
  $('head').prepend('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">');
  $('body').prepend('<div style="padding:12px;background:#172033;color:white;font:14px system-ui"><a href="/" style="color:white">← New website</a> · Basic view: scripts and forms are disabled.</div>');
  return $.html();
}

const home = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simple Proxy</title>
<style>body{margin:0;background:#101725;color:#eef3ff;font:17px system-ui;display:grid;min-height:100vh;place-items:center}main{max-width:660px;padding:32px;width:calc(100% - 64px)}h1{font-size:clamp(36px,7vw,58px);margin:14px 0}p{color:#abb8d0;line-height:1.6}form{display:flex;gap:10px;margin:28px 0}input{min-width:0;flex:1;padding:17px;border:1px solid #41516b;border-radius:12px;background:#1c283b;color:white;font:inherit}button{padding:16px 24px;border:0;border-radius:12px;background:#9cf0cd;color:#10281f;font-weight:700;font-size:16px}small{color:#abb8d0}label{display:block}.tag{color:#9cf0cd;font-size:13px;letter-spacing:2px}a{color:#9cf0cd}</style>
<main><span class="tag">SIMPLE WEB PROXY</span><h1>A simpler view of the web.</h1><p>Enter a website address to load its basic pages through this server.</p><label for="url">Website address</label><form action="/view" method="get"><input id="url" name="url" placeholder="https://example.com" required maxlength="2048" autocomplete="off"><button>Go →</button></form><small>For text, images, and links. Sign-ins, videos, and apps that need JavaScript aren’t supported. Requests are limited to 5 MB each.</small><p><a href="/view?url=https%3A%2F%2Fexample.com">Try an example →</a></p></main></html>`;

function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') { res.writeHead(405).end('Only GET is supported.'); return; }
    const route = new URL(req.url, 'http://localhost');
    if (route.pathname === '/health') { res.end('ok'); return; }
    if (route.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(home); return; }
    if (route.pathname !== '/view') { res.writeHead(404).end('Not found'); return; }
    if (active >= 8 || ++requests > 300) { res.writeHead(429).end('Busy right now. Try again in a minute.'); return; }
    active++;
    try {
      let input = route.searchParams.get('url') || '';
      if (!input || input.length > 2048) throw new Error('Enter a website address.');
      if (!/^[a-z][a-z0-9+.-]*:/i.test(input)) input = 'https://' + input;
      const page = await fetchPage(input);
      let body = page.body;
      let type = page.type;
      res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
      if (type === 'text/html' || type === 'application/xhtml+xml') {
        body = rewriteHtml(body.toString('utf8'), page.url); type = 'text/html; charset=utf-8';
      } else if (type === 'text/css') {
        body = rewriteCss(body.toString('utf8'), page.url); type += '; charset=utf-8';
      } else if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/x-icon', 'font/woff', 'font/woff2', 'text/plain'].includes(type)) {
        throw new Error('This content type is not supported by basic view.');
      }
      res.writeHead(page.status, { 'Content-Type': type }); res.end(body);
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to open this page. ' + error.message + '\nUse your browser’s Back button to try another address.');
    } finally { active--; }
  });
}
if (require.main === module) {
  createServer().listen(Number(process.env.PORT || 8080), process.env.HOST || '0.0.0.0', () => console.log('Simple web proxy is ready.'));
}
module.exports = { publicAddress, proxied, rewriteHtml, rewriteCss, createServer };
