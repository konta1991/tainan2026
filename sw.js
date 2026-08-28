/* 旅先の弱い電波でも開けるように、同一オリジンの資産をキャッシュする（network-first）。 */
const CACHE = "tainan2026-v4";
const CORE = ["./", "./index.html", "./style.css", "./app.js", "./data.js", "./geo.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // 外部（地図タイル・天気API・CDN）はネットワーク優先、失敗時キャッシュ
  if (url.origin !== location.origin) {
    e.respondWith(fetch(e.request).then(r => { if (r.ok && (url.hostname.includes("unpkg.com") || url.hostname.includes("fonts."))) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(m => m || caches.match("./index.html"))));
});
