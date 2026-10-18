// Service worker: lets the app open without signal once it has been opened
// online at least once.
//
// Every request tries the network first, so a phone with signal always gets
// the latest files and there is no version number to bump on release. Each
// answer from the network is also saved in the cache. With no signal, or if
// the network takes longer than NETWORK_TIMEOUT_MS, the saved copy is used.
//
// Incident records are in localStorage, not in this cache, so nothing here
// touches them.

const CACHE = "injury-response";
const NETWORK_TIMEOUT_MS = 3000;

// Saved as soon as the service worker installs. Add new app files here.
const FILES = [
  "./",
  "index.html",
  "css/styles.css",
  "js/protocols/concussion.js",
  "js/walk.js",
  "js/pose.js",
  "js/assessment.js",
  "js/records.js",
  "js/reports.js",
  "js/app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  const network = fetch(request, { cache: "no-cache" }).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  });
  // Keeps the worker running so a slow download still updates the cache.
  event.waitUntil(network.catch(() => {}));
  event.respondWith(networkFirst(request, network));
});

async function networkFirst(request, network) {
  const saved = await caches.match(request);
  if (!saved) return network;
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, saved));
  return Promise.race([network.catch(() => saved), timeout]);
}
