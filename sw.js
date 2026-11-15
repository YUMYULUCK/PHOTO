const CACHE = "photo-palette-v7-compat-1";
const CODECS_CACHE = "photo-palette-codecs-v1";
const CODECS = new Set([
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd/ffmpeg-core.js",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd/ffmpeg-core.worker.js",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd/ffmpeg-core.wasm",
  "https://cdn.jsdelivr.net/npm/libheif-js@1.18.2/libheif/libheif.js",
]);
const CORE = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./manifest-en.webmanifest", "./profiles/index.json", "./profiles/45-15.zip", "./profiles/48-12.zip", "./icon.svg", "./icons/icon-16.png", "./icons/icon-32.png", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./src/box.js", "./src/bplist.js", "./src/decode.js", "./src/exif.js", "./src/heif.js", "./src/port.js", "./src/styles.js", "./src/texture.js", "./src/zip.js", "./src/file-format.js"];
const coreUrls = new Set(CORE.map((path) => new URL(path, self.location.href).href));

for (const path of ["compat.js","compat-assets.js","compat-decode.js","compat-encoder.js","compat-encoder-worker.js"]) {
  const url = new URL("./src/"+path,self.location.href).href;
  CORE.push("./src/"+path);coreUrls.add(url);
}
function isolated(response) {
  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Opener-Policy","same-origin");
  headers.set("Cross-Origin-Embedder-Policy","require-corp");
  headers.delete("Content-Length");headers.delete("Content-Encoding");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

// Install the entire release before taking control. Bypass the HTTP cache too;
// a failed install leaves the previous worker active.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(CORE.map((path) => new Request(new URL(path, self.location.href), { cache:"reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== CODECS_CACHE && key.startsWith("photo-palette-")).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && CODECS.has(url.href)) {
    event.respondWith((async () => {
      let cache;
      try { cache = await caches.open(CODECS_CACHE); } catch { return fetch(event.request); }
      const cached = await cache.match(event.request);if(cached)return cached;
      const response = await fetch(event.request);
      if(response.ok)try { await cache.put(event.request,response.clone()); } catch { /* Processing still works if storage is full. */ }
      return response;
    })());
    return;
  }
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  url.search = "";
  if (coreUrls.has(url.href)) {
    // HTML, modules and profiles come from one installed release. Change CACHE
    // for every deployment; the service-worker update lifecycle picks it up.
    event.respondWith(caches.open(CACHE).then(async (cache) =>
      isolated((await cache.match(url.href)) || await fetch(new Request(event.request, { cache:"no-cache" })))));
    return;
  }
  event.respondWith(fetch(new Request(event.request, { cache:"no-cache" })).catch(async () => {
    // Only navigations may receive HTML, never missing JS or ZIP resources.
    if (event.request.mode === "navigate") {
      const cache = await caches.open(CACHE);
      const html = await cache.match(new URL("./index.html", self.location.href).href);
      return html ? isolated(html) : Response.error();
    }
    return Response.error();
  }));
});
