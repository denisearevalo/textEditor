const { warmStrategyCache } = require("workbox-recipes");
const { CacheFirst } = require("workbox-strategies");
const { registerRoute } = require("workbox-routing");
const { CacheableResponsePlugin } = require("workbox-cacheable-response");
const { ExpirationPlugin } = require("workbox-expiration");
const { precacheAndRoute } = require("workbox-precaching/precacheAndRoute");
const CACHE_NAME = "cache-v8";
const CACHED_URLS = [
  "./dist/index.html",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/codemirror.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/codemirror.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/mode/javascript/javascript.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/theme/monokai.min.css",
  "./dist/assets/icons/",
];

self.addEventListener("install", (e) =>
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHED_URLS))
  )
);

self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keyList) =>
        Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  )
);

self.addEventListener("fetch", (e) =>
  e.respondWith(
    caches.match(e.request).then(()=> 
    fetch(e.request).then(response =>
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(e.request, response.clone());
      }).then(()=>{
        return response;
      })
    )
  ))
);

precacheAndRoute(self.__WB_MANIFEST);

const pageCache = new CacheFirst({
  cacheName: "page-cache",
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
    new ExpirationPlugin({
      maxAgeSeconds: 30 * 24 * 60 * 60,
    }),
  ],
});

warmStrategyCache({
  urls: ["/index.html", "/"],
  strategy: pageCache,
});

registerRoute(({ request }) => request.mode === "navigate", pageCache);

// TODO: Implement asset caching
registerRoute(
  // ({ request }) => request.destination === "image",
  ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
  new CacheFirst({
    cacheName: "asset-cache",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);
