// Retire the previous proxy's service worker for returning visitors.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).map(key => caches.delete(key)));
    await self.registration.unregister();
    await self.clients.claim();
  })());
});
