const CACHE = "photo-palette-v6-picker-1";
const CORE = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./manifest-en.webmanifest", "./profiles/index.json", "./profiles/45-15.zip", "./profiles/48-12.zip", "./icon.svg", "./icons/icon-16.png", "./icons/icon-32.png", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./src/box.js", "./src/bplist.js", "./src/decode.js", "./src/exif.js", "./src/heif.js", "./src/port.js", "./src/styles.js", "./src/texture.js", "./src/zip.js", "./src/file-format.js"];
const coreUrls = new Set(CORE.map((path) => new URL(path, self.location.href).href));

// Install the entire release before taking control. Bypass the HTTP cache too;
// a failed install leaves the previous worker active.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(CORE.map((path) => new Request(new URL(path, self.location.href), { cache:"reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key.startsWith("photo-palette-")).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  url.search = "";
  if (coreUrls.has(url.href)) {
    // HTML, modules and profiles come from one installed release. Change CACHE
    // for every deployment; the service-worker update lifecycle picks it up.
    event.respondWith(caches.open(CACHE).then(async (cache) =>
      (await cache.match(url.href)) || fetch(new Request(event.request, { cache:"no-cache" }))));
    return;
  }
  event.respondWith(fetch(new Request(event.request, { cache:"no-cache" })).catch(async () => {
    // Only navigations may receive HTML, never missing JS or ZIP resources.
    if (event.request.mode === "navigate") {
      const cache = await caches.open(CACHE);
      return (await cache.match(new URL("./index.html", self.location.href).href)) || Response.error();
    }
    return Response.error();
  }));
});
