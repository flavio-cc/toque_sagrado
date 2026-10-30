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
corpo = corpo.replace('<script src="cena.js"></script>', '<script>window.MARCA_SRC = "' + marca + '";</script>\n<script src="cena.js"></script>')

def script(nome):
    return "<script>\n" + ler(nome).replace("</script", "<\\/script") + "\n</script>"

corpo = corpo.replace('<script src="app.js"></script>', script("biblia.js") + "\n" + script("app.js"))
for nome in ("verses.js", "cena.js", "loja.js"):
    corpo = corpo.replace('<script src="%s"></script>' % nome, script(nome))

saida = "<title>Toque Sagrado</title>\n" + fontes + "\n<style>\n" + ler("style.css") + "\n</style>\n" + corpo
pathlib.Path(sys.argv[1]).write_text(saida, encoding="utf-8")
print(len(saida.encode()), "bytes")
