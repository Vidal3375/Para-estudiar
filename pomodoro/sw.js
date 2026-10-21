const CACHE = "pomodoro-v3";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./favicon-32.png", "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "./sonidos/campanilla.mp3", "./sonidos/cuenco.mp3", "./sonidos/pajaros.mp3", "./sonidos/gotas.mp3", "./sonidos/campanillas-viento.mp3"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
