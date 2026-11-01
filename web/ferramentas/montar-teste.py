# Junta o app num arquivo HTML único (CSS, scripts, Bíblia e logo embutidos) para o link de teste.
# Uso: python3 ferramentas/montar-teste.py saida.html
import base64, pathlib, re, sys

raiz = pathlib.Path(__file__).resolve().parent.parent
html = (raiz / "index.html").read_text(encoding="utf-8")
ler = lambda nome: (raiz / nome).read_text(encoding="utf-8")

fontes = re.search(r'<link rel="stylesheet" href="https://fonts[^>]+>', html).group(0)
corpo = html.split("<body>", 1)[1].split("</body>", 1)[0]
logo = "data:image/webp;base64," + base64.b64encode((raiz / "logo.webp").read_bytes()).decode()
corpo = corpo.replace('src="logo.webp"', 'src="' + logo + '"')
marca = "data:image/webp;base64," + base64.b64encode((raiz / "marca.webp").read_bytes()).decode()
# fotos das cartas em versão menor (720x1280) para o arquivo único não passar de uns 10 MB
import io, json
from PIL import Image
fotos = {}
for f in sorted((raiz / "fotos").glob("*.webp")):
    b = io.BytesIO()
    Image.open(f).convert("RGB").resize((720, 1280), Image.LANCZOS).save(b, "WEBP", quality=70)
    fotos[f.stem] = "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()
corpo = corpo.replace('<script src="cena.js"></script>', '<script>window.MARCA_SRC = "' + marca + '";\nwindow.FOTOS_SRC = ' + json.dumps(fotos) + ';</script>\n<script src="cena.js"></script>')

def script(nome):
    return "<script>\n" + ler(nome).replace("</script", "<\\/script") + "\n</script>"

corpo = corpo.replace('<script src="app.js"></script>', script("biblia.js") + "\n" + script("versao.js") + "\n" + script("app.js"))
for nome in ("verses.js", "cena.js", "loja.js"):
    corpo = corpo.replace('<script src="%s"></script>' % nome, script(nome))

saida = "<title>Toque Sagrado</title>\n" + fontes + "\n<style>\n" + ler("style.css") + "\n</style>\n" + corpo
pathlib.Path(sys.argv[1]).write_text(saida, encoding="utf-8")
print(len(saida.encode()), "bytes")
