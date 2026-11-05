#!/usr/bin/env python3
"""Preenche a página do Toque Sagrado no App Store Connect pela API (chave dos segredos do GitHub).

Faz: preço grátis e disponibilidade, categorias, nome/subtítulo/URL de privacidade, textos da versão,
prints do iPhone 6,9", nota para a revisão, versão = web/versao.js e o build mais novo dessa versão.
NÃO envia para revisão: esse clique fica com o Flavio. O telefone do contato de revisão vem do segredo
APPSTORE_REVIEW_PHONE (ou ele digita no site); a classificação etária fica para o site.

Uso: KEY_ID=... ISSUER_ID=... PRIVATE_KEY="$(cat AuthKey.p8)" python3 app-store/preencher.py
"""
import hashlib, json, os, re, sys, time
import jwt, requests

AQUI = os.path.dirname(os.path.abspath(__file__))
API = "https://api.appstoreconnect.apple.com"
BUNDLE = "com.toquesagrado.app"
T = json.load(open(os.path.join(AQUI, "textos.json"), encoding="utf-8"))
VERSAO = re.search(r'VERSAO = "([0-9.]+)"', open(os.path.join(AQUI, "..", "web", "versao.js")).read()).group(1)
falhas = []


def token():
    agora = int(time.time())
    return jwt.encode({"iss": os.environ["ISSUER_ID"], "iat": agora, "exp": agora + 1100, "aud": "appstoreconnect-v1"},
                      os.environ["PRIVATE_KEY"], algorithm="ES256", headers={"kid": os.environ["KEY_ID"], "typ": "JWT"})


def chamar(metodo, caminho, corpo=None, ok404=False):
    r = requests.request(metodo, caminho if caminho.startswith("http") else API + caminho,
                         headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"},
                         data=json.dumps(corpo) if corpo is not None else None, timeout=60)
    if ok404 and r.status_code == 404:
        return None
    if r.status_code >= 400:
        raise RuntimeError("%s %s -> %s %s" % (metodo, caminho, r.status_code, r.text[:800]))
    return r.json() if r.text else {}


def passo(nome):
    def deco(f):
        def rodar(*a):
            try:
                r = f(*a)
                print("OK   " + nome)
                return r
            except Exception as e:  # segue para os outros passos e resume no fim
                print("FALHA " + nome + ": " + str(e))
                falhas.append(nome)
        return rodar
    return deco


def todos(caminho):
    itens = []
    while caminho:
        r = chamar("GET", caminho)
        itens += r["data"]
        caminho = r.get("links", {}).get("next")
    return itens


app = chamar("GET", "/v1/apps?filter[bundleId]=" + BUNDLE)["data"][0]
APP = app["id"]
print("App:", app["attributes"]["name"], APP, "| idioma principal:", app["attributes"].get("primaryLocale"), "| versão:", VERSAO)


@passo("Direitos de conteúdo (usa texto de terceiros com licença: Bíblia Livre)")
def direitos():
    chamar("PATCH", "/v1/apps/" + APP, {"data": {"type": "apps", "id": APP,
           "attributes": {"contentRightsDeclaration": "USES_THIRD_PARTY_CONTENT"}}})


@passo("Preço grátis")
def preco():
    pontos = todos("/v1/apps/%s/appPricePoints?filter[territory]=USA&limit=200" % APP)
    zero = [p for p in pontos if float(p["attributes"]["customerPrice"]) == 0]
    chamar("POST", "/v1/appPriceSchedules", {
        "data": {"type": "appPriceSchedules", "relationships": {
            "app": {"data": {"type": "apps", "id": APP}},
            "baseTerritory": {"data": {"type": "territories", "id": "USA"}},
            "manualPrices": {"data": [{"type": "appPrices", "id": "${p1}"}]}}},
        "included": [{"type": "appPrices", "id": "${p1}", "attributes": {"startDate": None},
                      "relationships": {"appPricePoint": {"data": {"type": "appPricePoints", "id": zero[0]["id"]}}}}]})


@passo("Disponível em todos os países")
def disponibilidade():
    if chamar("GET", "/v1/apps/%s/appAvailabilityV2" % APP, ok404=True):
        print("     (já estava configurada)")
        return
    paises = todos("/v1/territories?limit=200")
    chamar("POST", "/v2/appAvailabilities", {
        "data": {"type": "appAvailabilities", "attributes": {"availableInNewTerritories": True},
                 "relationships": {"app": {"data": {"type": "apps", "id": APP}},
                                   "territoryAvailabilities": {"data": [{"type": "territoryAvailabilities", "id": "${%s}" % p["id"]} for p in paises]}}},
        "included": [{"type": "territoryAvailabilities", "id": "${%s}" % p["id"], "attributes": {"available": True},
                      "relationships": {"territory": {"data": {"type": "territories", "id": p["id"]}}}} for p in paises]})


def info_editavel():
    infos = chamar("GET", "/v1/apps/%s/appInfos" % APP)["data"]
    for i in infos:
        if i["attributes"].get("state", i["attributes"].get("appStoreState")) not in ("READY_FOR_DISTRIBUTION", "READY_FOR_SALE"):
            return i
    return infos[0]


@passo("Categorias")
def categorias():
    i = info_editavel()
    chamar("PATCH", "/v1/appInfos/" + i["id"], {"data": {"type": "appInfos", "id": i["id"], "relationships": {
        "primaryCategory": {"data": {"type": "appCategories", "id": T["categoria_principal"]}},
        "secondaryCategory": {"data": {"type": "appCategories", "id": T["categoria_secundaria"]}}}}})


@passo("Nome, subtítulo e URL de privacidade")
def info_textos():
    i = info_editavel()
    locs = chamar("GET", "/v1/appInfos/%s/appInfoLocalizations" % i["id"])["data"]
    atr = {"name": T["nome"], "subtitle": T["subtitulo"], "privacyPolicyUrl": T["url_privacidade"]}
    loc = next((l for l in locs if l["attributes"]["locale"] == T["idioma"]), None)
    if loc:
        chamar("PATCH", "/v1/appInfoLocalizations/" + loc["id"], {"data": {"type": "appInfoLocalizations", "id": loc["id"], "attributes": atr}})
    else:
        atr["locale"] = T["idioma"]
        chamar("POST", "/v1/appInfoLocalizations", {"data": {"type": "appInfoLocalizations", "attributes": atr,
               "relationships": {"appInfo": {"data": {"type": "appInfos", "id": i["id"]}}}}})


def versao_editavel():
    vs = chamar("GET", "/v1/apps/%s/appStoreVersions?filter[platform]=IOS&limit=20" % APP)["data"]
    editaveis = [v for v in vs if v["attributes"]["appStoreState"] in
                 ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY")]
    if editaveis:
        return editaveis[0]
    return chamar("POST", "/v1/appStoreVersions", {"data": {"type": "appStoreVersions",
                  "attributes": {"platform": "IOS", "versionString": VERSAO},
                  "relationships": {"app": {"data": {"type": "apps", "id": APP}}}}})["data"]


V = {}


@passo("Versão da loja = " + VERSAO + " e copyright")
def versao():
    v = versao_editavel()
    V["id"] = v["id"]
    chamar("PATCH", "/v1/appStoreVersions/" + v["id"], {"data": {"type": "appStoreVersions", "id": v["id"],
           "attributes": {"versionString": VERSAO, "copyright": T["copyright"], "releaseType": "MANUAL"}}})


def localizacao_versao():
    locs = chamar("GET", "/v1/appStoreVersions/%s/appStoreVersionLocalizations" % V["id"])["data"]
    loc = next((l for l in locs if l["attributes"]["locale"] == T["idioma"]), None)
    if loc:
        return loc["id"]
    return chamar("POST", "/v1/appStoreVersionLocalizations", {"data": {"type": "appStoreVersionLocalizations",
                  "attributes": {"locale": T["idioma"]},
                  "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": V["id"]}}}}})["data"]["id"]


@passo("Descrição, palavras-chave, texto promocional e URL de suporte")
def textos_versao():
    lid = localizacao_versao()
    V["loc"] = lid
    chamar("PATCH", "/v1/appStoreVersionLocalizations/" + lid, {"data": {"type": "appStoreVersionLocalizations", "id": lid,
           "attributes": {"description": T["descricao"], "keywords": T["palavras_chave"],
                          "promotionalText": T["texto_promocional"], "supportUrl": T["url_suporte"]}}})


def subir(conjunto, arquivo):
    caminho = os.path.join(AQUI, "prints", arquivo)
    dados = open(caminho, "rb").read()
    s = chamar("POST", "/v1/appScreenshots", {"data": {"type": "appScreenshots",
               "attributes": {"fileName": arquivo, "fileSize": len(dados)},
               "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": conjunto}}}}})["data"]
    for op in s["attributes"]["uploadOperations"]:
        pedaco = dados[op["offset"]:op["offset"] + op["length"]]
        cab = {h["name"]: h["value"] for h in op.get("requestHeaders", [])}
        r = requests.request(op["method"], op["url"], headers=cab, data=pedaco, timeout=120)
        r.raise_for_status()
    chamar("PATCH", "/v1/appScreenshots/" + s["id"], {"data": {"type": "appScreenshots", "id": s["id"],
           "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(dados).hexdigest()}}})


@passo("Prints do iPhone 6,9\"")
def prints():
    lid = V.get("loc") or localizacao_versao()
    conjuntos = chamar("GET", "/v1/appStoreVersionLocalizations/%s/appScreenshotSets" % lid)["data"]
    conjunto = None
    for tipo in ("APP_IPHONE_67", "APP_IPHONE_69"):
        c = next((c for c in conjuntos if c["attributes"]["screenshotDisplayType"] == tipo), None)
        if c:
            conjunto = c["id"]
            break
    if conjunto:  # rodar de novo substitui os prints
        for s in chamar("GET", "/v1/appScreenshotSets/%s/appScreenshots" % conjunto)["data"]:
            chamar("DELETE", "/v1/appScreenshots/" + s["id"])
    else:
        erro = None
        for tipo in ("APP_IPHONE_67", "APP_IPHONE_69"):
            try:
                conjunto = chamar("POST", "/v1/appScreenshotSets", {"data": {"type": "appScreenshotSets",
                                  "attributes": {"screenshotDisplayType": tipo},
                                  "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": lid}}}}})["data"]["id"]
                break
            except RuntimeError as e:
                erro = e
        if not conjunto:
            raise erro
    for arquivo in T["prints"]:
        subir(conjunto, arquivo)


@passo("Nota para a revisão")
def revisao():
    atr = {"notes": T["nota_revisao"], "demoAccountRequired": False,
           "contactFirstName": T["contato_nome"], "contactLastName": T["contato_sobrenome"], "contactEmail": T["contato_email"]}
    # o telefone não vai no repositório público: vem do segredo APPSTORE_REVIEW_PHONE, se existir
    if os.environ.get("REVIEW_PHONE"):
        atr["contactPhone"] = os.environ["REVIEW_PHONE"]
    d = chamar("GET", "/v1/appStoreVersions/%s/appStoreReviewDetail" % V["id"], ok404=True)
    if d and d.get("data"):
        chamar("PATCH", "/v1/appStoreReviewDetails/" + d["data"]["id"], {"data": {"type": "appStoreReviewDetails", "id": d["data"]["id"], "attributes": atr}})
    else:
        chamar("POST", "/v1/appStoreReviewDetails", {"data": {"type": "appStoreReviewDetails", "attributes": atr,
               "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": V["id"]}}}}})


@passo("Build da versão " + VERSAO)
def build():
    bs = chamar("GET", "/v1/builds?filter[app]=%s&filter[preReleaseVersion.version]=%s&filter[processingState]=VALID&sort=-uploadedDate&limit=1" % (APP, VERSAO))["data"]
    if not bs:
        raise RuntimeError("nenhum build %s pronto (VALID) ainda; rode de novo depois que a Apple processar" % VERSAO)
    b = bs[0]
    print("     build", b["attributes"]["version"])
    chamar("PATCH", "/v1/appStoreVersions/%s/relationships/build" % V["id"], {"data": {"type": "builds", "id": b["id"]}})


direitos(); preco(); disponibilidade(); categorias(); info_textos(); versao()
if V.get("id"):
    textos_versao(); prints(); revisao(); build()
B = {}


@passo("TestFlight: descrição do teste e e-mail para comentários")
def beta_textos():
    locs = chamar("GET", "/v1/apps/%s/betaAppLocalizations" % APP)["data"]
    atr = {"description": T["beta_descricao"], "feedbackEmail": T["beta_email"]}
    loc = next((l for l in locs if l["attributes"]["locale"] == T["idioma"]), None)
    if loc:
        chamar("PATCH", "/v1/betaAppLocalizations/" + loc["id"], {"data": {"type": "betaAppLocalizations", "id": loc["id"], "attributes": atr}})
    else:
        atr["locale"] = T["idioma"]
        chamar("POST", "/v1/betaAppLocalizations", {"data": {"type": "betaAppLocalizations", "attributes": atr,
               "relationships": {"app": {"data": {"type": "apps", "id": APP}}}}})


@passo("TestFlight: o que testar neste build")
def beta_build():
    bs = chamar("GET", "/v1/builds?filter[app]=%s&filter[preReleaseVersion.version]=%s&filter[processingState]=VALID&sort=-uploadedDate&limit=1" % (APP, VERSAO))["data"]
    if not bs:
        raise RuntimeError("nenhum build %s pronto" % VERSAO)
    B["id"] = bs[0]["id"]
    locs = chamar("GET", "/v1/builds/%s/betaBuildLocalizations" % B["id"])["data"]
    loc = next((l for l in locs if l["attributes"]["locale"] == T["idioma"]), None)
    if loc:
        chamar("PATCH", "/v1/betaBuildLocalizations/" + loc["id"], {"data": {"type": "betaBuildLocalizations", "id": loc["id"], "attributes": {"whatsNew": T["beta_novidades"]}}})
    else:
        chamar("POST", "/v1/betaBuildLocalizations", {"data": {"type": "betaBuildLocalizations",
               "attributes": {"locale": T["idioma"], "whatsNew": T["beta_novidades"]},
               "relationships": {"build": {"data": {"type": "builds", "id": B["id"]}}}}})


@passo("TestFlight: build nos grupos externos")
def beta_grupos():
    grupos = [g for g in chamar("GET", "/v1/apps/%s/betaGroups" % APP)["data"] if not g["attributes"].get("isInternalGroup")]
    if not grupos:
        raise RuntimeError("não há grupo externo; crie um em TestFlight > Testes externos")
    for g in grupos:
        chamar("POST", "/v1/betaGroups/%s/relationships/builds" % g["id"], {"data": [{"type": "builds", "id": B["id"]}]})
        print("     grupo:", g["attributes"]["name"])


@passo("TestFlight: enviar o build para a revisão beta")
def beta_revisao():
    subs = chamar("GET", "/v1/betaAppReviewSubmissions?filter[build]=" + B["id"])["data"]
    if subs:
        print("     já enviado:", subs[0]["attributes"].get("betaReviewState"))
        return
    chamar("POST", "/v1/betaAppReviewSubmissions", {"data": {"type": "betaAppReviewSubmissions",
           "relationships": {"build": {"data": {"type": "builds", "id": B["id"]}}}}})


beta_textos(); beta_build()
if B.get("id"):
    beta_grupos(); beta_revisao()

print()
print("Faltou: " + ", ".join(falhas) if falhas else "Tudo preenchido. Falta no site: telefone do contato (se não houver o segredo), classificação etária e Enviar para revisão.")
sys.exit(1 if falhas else 0)
