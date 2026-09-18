// Uses the Scramjet controller and BareMux transport APIs.
const form = document.querySelector('#address-form');
const address = document.querySelector('#address');
const status = document.querySelector('#status');
const button = document.querySelector('#go');
const home = document.querySelector('#home');
let frame;
let setup;
function target(value) {
  value = value.trim();
  if (/^https?:\/\//i.test(value)) return new URL(value).href;
  if (!/\s/.test(value) && value.includes('.')) return new URL('https://' + value).href;
  return 'https://www.google.com/search?q=' + encodeURIComponent(value);
}
async function initialize() {
  if (!navigator.serviceWorker || typeof SharedWorker === 'undefined') {
    throw new Error('This browser does not support the required features. Try current Chrome or Firefox.');
  }
  const { ScramjetController } = $scramjetLoadController();
  const proxy = new ScramjetController({files:{wasm:'/scram/scramjet.wasm.wasm',all:'/scram/scramjet.all.js',sync:'/scram/scramjet.sync.js'}});
  await proxy.init();
  await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, {once:true}));
  const connection = new BareMux.BareMuxConnection('/baremux/worker.js');
  await connection.setTransport('/libcurl/index.mjs', [{websocket:(location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/wisp/'}]);
  frame = proxy.createFrame();
  frame.frame.title = 'Proxied website';
  document.querySelector('#browser').appendChild(frame.frame);
  frame.frame.addEventListener('load', () => { status.textContent='If a site shows an error or CAPTCHA, it may be blocking the hosting server.'; });
  return proxy;
}
async function go(value) {
  button.disabled = true;
  status.textContent = 'Starting browser…';
  try {
    const url = target(value);
    if (!setup) setup = initialize().catch(error => { setup = undefined; throw error; });
    await setup;
    document.querySelector('#intro').hidden = true;
    document.querySelector('#browser').hidden = false;
    home.hidden = false;
    address.value = url;
    status.textContent = 'Loading website…';
    frame.go(url);
  } catch (error) { status.textContent = 'Unable to load: ' + error.message; }
  finally { button.disabled = false; }
}
form.addEventListener('submit', event => { event.preventDefault(); go(address.value); });
document.querySelectorAll('[data-url]').forEach(item => item.addEventListener('click', () => go(item.dataset.url)));
home.addEventListener('click', () => { if(frame) frame.frame.src='about:blank'; document.querySelector('#browser').hidden=true; document.querySelector('#intro').hidden=false; home.hidden=true; status.textContent=''; });
