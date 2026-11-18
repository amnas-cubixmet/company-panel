/* global self, caches */
const prefix = 'cubixgear-shell-';
const current = prefix + '__CUBIXGEAR_VERSION__';
const assets = new Set(__CUBIXGEAR_ASSETS__);
const privatePath = /^\/(?:api|auth|login|signup|forgot-password|reset-password|set-password|setup-password|magic-link|media|uploads)(?:\/|$)/i;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(current);
    try {
      await cache.addAll([...assets].map(url => new Request(url, { cache: 'reload', credentials: 'omit' })));
    } catch (error) {
      await caches.delete(current);
      throw error;
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const oldCaches = (await caches.keys()).filter(key => key.startsWith(prefix) && key !== current);
    // Keep one previous build for lazy routes in tabs still running that version.
    await Promise.all(oldCaches.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || privatePath.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    if (/\/(?:[^/]+\.[^/]+)$/.test(url.pathname) ||
        [...url.searchParams.keys()].some(key => /token|password|secret|code/i.test(key))) return;
    event.respondWith((async () => (await (await caches.open(current)).match('/index.html')) || fetch(request))());
    return;
  }
  if (!url.search && (assets.has(url.pathname) || /^\/assets\/[\w./-]+$/.test(url.pathname))) {
    event.respondWith((async () =>
      (await (await caches.open(current)).match(url.pathname)) ||
      (url.pathname.startsWith('/assets/') && await caches.match(url.pathname, { ignoreSearch: false })) ||
      fetch(request))());
  }
});
