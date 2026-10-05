const CACHE = "photo-palette-v1";
const CORE = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./profiles/index.json", "./profiles/45-15.zip", "./profiles/48-12.zip", "./icons/icon-192.png", "./icons/icon-512.png", "./src/box.js", "./src/bplist.js", "./src/decode.js", "./src/exif.js", "./src/heif.js", "./src/port.js", "./src/styles.js", "./src/texture.js", "./src/zip.js"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key.startsWith("photo-palette-")).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => { if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return; event.respondWith(fetch(event.request).then((response) => { if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())); return response; }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))); });


