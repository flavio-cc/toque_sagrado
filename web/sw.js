var CACHE = "toque-sagrado-v36";
var ARQUIVOS = ["./", "index.html", "style.css", "app.js", "verses.js", "biblia.js", "cena.js", "loja.js", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "logo.webp", "marca.webp"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }));
});
self.addEventListener("fetch", function (e) {
  // as fotos das cartas (uns 7 MB) entram no cache aos poucos, conforme aparecem
  var foto = e.request.url.indexOf("/fotos/") >= 0;
  e.respondWith(caches.match(e.request).then(function (r) {
    return r || fetch(e.request).then(function (resp) {
      if (foto && resp.ok) { var copia = resp.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copia); }); }
      return resp;
    });
  }));
});
