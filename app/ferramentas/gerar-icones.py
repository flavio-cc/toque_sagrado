# Gera os ícones e as telas de abertura do Android e do iPhone a partir do logo final do Flavio.
# Uso (dentro de app/): python3 ferramentas/gerar-icones.py .
import glob, sys
from PIL import Image, ImageDraw
R = sys.argv[1]
logo = Image.open(R + "/../web/logo-opcoes/logo-final-1024.png").convert("RGBA")
OURO = (222, 185, 95, 255); PAPEL = (0xef, 0xe5, 0xcf, 255)
cheio = Image.new("RGBA", logo.size, OURO); cheio.alpha_composite(logo)   # cantos transparentes viram dourado
res = R + "/android/app/src/main/res/"
TAM = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for d, k in TAM.items():
    n = int(48 * k)
    logo.resize((n, n), Image.LANCZOS).save(res + "mipmap-%s/ic_launcher.png" % d)
    m = Image.new("RGBA", (n, n), (0, 0, 0, 0)); mask = Image.new("L", (n * 4, n * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, n * 4 - 1, n * 4 - 1), fill=255)
    m.paste(cheio.resize((n, n), Image.LANCZOS), (0, 0), mask.resize((n, n), Image.LANCZOS))
    m.save(res + "mipmap-%s/ic_launcher_round.png" % d)
    f = int(108 * k); v = int(72 * k)          # camada de 108dp; a parte visível é a central de 72dp
    fg = Image.new("RGBA", (f, f), (0, 0, 0, 0))
    fg.paste(cheio.resize((v, v), Image.LANCZOS), ((f - v) // 2, (f - v) // 2))
    fg.save(res + "mipmap-%s/ic_launcher_foreground.png" % d)
open(res + "values/ic_launcher_background.xml", "w").write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#DEB95F</color>\n</resources>\n')
cheio.convert("RGB").save(R + "/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
# telas de abertura: papel com o logo no centro
def splash(w, h, out):
    s = Image.new("RGBA", (w, h), PAPEL); n = int(min(w, h) * 0.38)
    s.alpha_composite(logo.resize((n, n), Image.LANCZOS), ((w - n) // 2, (h - n) // 2))
    s.convert("RGB").save(out)
for p in glob.glob(res + "drawable*/splash.png") + glob.glob(R + "/ios/App/App/Assets.xcassets/Splash.imageset/*.png"):
    w, h = Image.open(p).size; splash(w, h, p)
