var CACHE = "toque-sagrado-v32";
var ARQUIVOS = ["./", "index.html", "style.css", "app.js", "verses.js", "biblia.js", "cena.js", "loja.js", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "logo.webp", "marca.webp"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }));
});
self.addEventListener("fetch", function (e) {
  e.respondWith(caches.match(e.request).then(function (r) { return r || fetch(e.request); }));
});
