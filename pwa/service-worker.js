// Caches only the app shell (this page + icons + the two CDN assets it
// loads) so the notebook UI itself opens instantly and still works with a
// flaky connection. It deliberately does NOT cache Firebase/MyScript/Claude
// API calls — those need a live network connection regardless.
const CACHE_NAME = 'ai-notebook-shell-v1';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js',
  'https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isShellFile = SHELL_FILES.some((f) => url.endsWith(f.replace('./', '')) || url === f);

  if (!isShellFile) return; // let everything else (Firebase, MyScript, Claude API) hit the network normally

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
