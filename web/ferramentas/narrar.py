# Narra os versículos com uma voz da ElevenLabs e salva os MP3 em audio/.
# A chave vem do Network secret do projeto (o proxy põe o cabeçalho xi-api-key em api.elevenlabs.io);
# fora do Claude, defina ELEVENLABS_API_KEY.
#
# Uso:
#   python3 ferramentas/narrar.py vozes                    # lista vozes masculinas graves em português da biblioteca
#   python3 ferramentas/narrar.py amostras ID1 ID2 ...     # Salmo 23:1-4 com cada voz, em audio/amostras/
#   python3 ferramentas/narrar.py cartas ID                # as 331 cartas com a voz escolhida, em audio/cartas/
#   python3 ferramentas/narrar.py cartas ID sl23-1 pv3-5   # só algumas cartas (para refazer)
# Cartas já narradas são puladas; apague o MP3 para refazer.
import json, os, pathlib, re, sys, time, urllib.error, urllib.parse, urllib.request

raiz = pathlib.Path(__file__).resolve().parent.parent
API = "https://api.elevenlabs.io/v1"
MODELO = "eleven_multilingual_v2"
VOZ_PADRAO = "5lrBPYY4YvMbKHTo8kvZ"  # Arthur Freeman, escolhida em 30/10/2026
FORMATO = "mp3_44100_64"  # voz mono a 64 kbps: boa qualidade, uns 8 KB por segundo
AJUSTES = {"stability": 0.55, "similarity_boost": 0.8, "style": 0.15, "use_speaker_boost": True, "speed": 1.12}  # 1,25x o ritmo das amostras, pedido do Flavio


def cabecalhos():
    h = {"Content-Type": "application/json"}
    if os.environ.get("ELEVENLABS_API_KEY"):
        h["xi-api-key"] = os.environ["ELEVENLABS_API_KEY"]
    return h


def pedir(caminho, dados=None, consulta=None):
    url = API + caminho + ("?" + urllib.parse.urlencode(consulta) if consulta else "")
    corpo = json.dumps(dados).encode() if dados is not None else None
    req = urllib.request.Request(url, data=corpo, headers=cabecalhos())
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if e.code == 429 and tentativa < 3:  # muitos pedidos seguidos: espera e tenta de novo
                time.sleep(5 * (tentativa + 1))
                continue
            sys.exit("ElevenLabs respondeu %d: %s" % (e.code, msg[:400]))


def para_fala(texto):
    # "SENHOR" em maiúsculas pode sair soletrado
    texto = re.sub(r"\bSENHOR\b", "Senhor", texto)
    return re.sub(r"\bDEUS\b", "Deus", texto)


def narrar(voz, texto, destino):
    audio = pedir("/text-to-speech/" + voz, {"text": para_fala(texto), "model_id": MODELO, "voice_settings": AJUSTES},
                  {"output_format": FORMATO})
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(audio)


def cartas():
    texto = (raiz / "verses.js").read_text(encoding="utf-8")
    m = re.search(r"window\.VERSES\s*=\s*(\[.*?\]);", texto, re.S)
    return json.loads(m.group(1))


def cmd_vozes():
    r = json.loads(pedir("/shared-voices", consulta={"language": "pt", "gender": "male", "page_size": 60, "sort": "usage_character_count_1y"}))
    for v in r.get("voices", []):
        print("%-22s %-28s %-10s %-12s %s" % (v["voice_id"], v.get("name", "")[:28], v.get("age", ""), v.get("accent", ""),
                                              (v.get("description") or "")[:70].replace("\n", " ")))


def cmd_amostras(vozes):
    salmo = json.loads((raiz / "dados" / "salmos-proverbios.json").read_text(encoding="utf-8"))
    vs = salmo["livros"][0]["capitulos"][22]["versiculos"][:4]
    texto = "Salmo vinte e três. " + " ".join(vs)
    for voz in vozes:
        destino = raiz / "audio" / "amostras" / ("salmo23-" + voz + ".mp3")
        narrar(voz, texto, destino)
        print("ok", destino.relative_to(raiz))


def cmd_cartas(voz, ids):
    lista = [c for c in cartas() if not ids or c["id"] in ids]
    total = sum(len(c["texto"]) for c in lista)
    print(len(lista), "cartas,", total, "caracteres")
    for i, c in enumerate(lista, 1):
        destino = raiz / "audio" / "cartas" / (c["id"] + ".mp3")
        if destino.exists():
            continue
        narrar(voz, c["texto"], destino)
        print("%d/%d %s" % (i, len(lista), c["id"]))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__ or "veja o topo do arquivo")
    acao = sys.argv[1]
    if acao == "vozes":
        cmd_vozes()
    elif acao == "amostras" and len(sys.argv) > 2:
        cmd_amostras(sys.argv[2:])
    elif acao == "cartas" and len(sys.argv) > 2:
        cmd_cartas(sys.argv[2], set(sys.argv[3:]))
    else:
        sys.exit("Uso: narrar.py vozes | amostras ID... | cartas ID [ids...]")
