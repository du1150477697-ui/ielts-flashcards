/* IELTS flashcards PWA service worker */
const CACHE = "flashcards-v3";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isIcon(url) {
  return /icon-\d+\.png$|apple-touch-icon\.png$|manifest\.webmanifest$/.test(url.pathname);
}

function isAppShell(url) {
  const p = url.pathname.replace(/\/+$/, "");
  return p.endsWith("/ielts-flashcards") || p.endsWith("/index.html") || /\/ielts-flashcards\/?$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Icons / manifest: cache-first
  if (isIcon(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // HTML / app shell: network-first, fallback cache (stale-while-revalidate-ish)
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html") || isAppShell(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((c) => c || caches.match(req)))
    );
    return;
  }
});
