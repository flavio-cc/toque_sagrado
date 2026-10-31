#!/bin/sh
# Copia a web app (pasta web/ do repositório) para www/, que é o que vai dentro do app.
# Uso: sh ferramentas/copiar-web.sh && npx cap sync
set -e
cd "$(dirname "$0")/.."
WEB=../web
rm -rf www && mkdir -p www/audio
for f in index.html style.css app.js verses.js biblia.js cena.js loja.js manifest.json icon.svg icon-192.png icon-512.png apple-touch-icon.png logo.webp marca.webp; do
  cp "$WEB/$f" www/
done
cp -r "$WEB/audio/cartas" www/audio/
cp -r "$WEB/fotos" www/
echo "www pronto: $(du -sh www | cut -f1)"
