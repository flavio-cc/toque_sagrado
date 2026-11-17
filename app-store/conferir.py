#!/usr/bin/env python3
"""Confere (SÓ LEITURA) o que falta no App Store Connect antes de enviar o Toque Sagrado para revisão.

Não muda nada: só faz GET. O log do Actions é público, então não imprime telefone nem e-mail.
Uso: KEY_ID=... ISSUER_ID=... PRIVATE_KEY="$(cat AuthKey.p8)" python3 app-store/conferir.py
"""
import json, os, re, time
import jwt, requests

API = "https://api.appstoreconnect.apple.com"
BUNDLE = "com.toquesagrado.app"
AQUI = os.path.dirname(os.path.abspath(__file__))
VERSAO = re.search(r'VERSAO = "([0-9.]+)"', open(os.path.join(AQUI, "..", "web", "versao.js")).read()).group(1)
pend = []


def token():
    agora = int(time.time())
    return jwt.encode({"iss": os.environ["ISSUER_ID"], "iat": agora, "exp": agora + 1100, "aud": "appstoreconnect-v1"},
                      os.environ["PRIVATE_KEY"], algorithm="ES256", headers={"kid": os.environ["KEY_ID"], "typ": "JWT"})


def get(caminho):
    r = requests.get(caminho if caminho.startswith("http") else API + caminho,
                     headers={"Authorization": "Bearer " + token()}, timeout=60)
    if r.status_code == 404:
        return None
    if r.status_code >= 400:
        return {"erro": "%s %s" % (r.status_code, r.text[:400])}
    return r.json()


def secao(t):
    print("\n== " + t)


def falta(t):
    print("  FALTA: " + t)
    pend.append(t)


app = get("/v1/apps?filter[bundleId]=" + BUNDLE)["data"][0]
APP = app["id"]
a = app["attributes"]
secao("App")
print("  nome:", a.get("name"), "| idioma:", a.get("primaryLocale"), "| direitos de conteúdo:", a.get("contentRightsDeclaration"),
      "| versão no repositório:", VERSAO)
if not a.get("contentRightsDeclaration"):
    falta("declaração de direitos de conteúdo")

secao("Versões da loja (iOS)")
vs = get("/v1/apps/%s/appStoreVersions?filter[platform]=IOS&limit=10" % APP)["data"]
for v in vs:
    print("  ", v["attributes"]["versionString"], v["attributes"]["appStoreState"], "| lançamento:", v["attributes"].get("releaseType"),
          "| copyright:", v["attributes"].get("copyright"))
V = next((v for v in vs if v["attributes"]["appStoreState"] not in ("READY_FOR_SALE", "READY_FOR_DISTRIBUTION", "REPLACED_WITH_NEW_VERSION", "REMOVED_FROM_SALE")), None)
if not V:
    falta("não há versão em preparação")
else:
    vid = V["id"]
    if not V["attributes"].get("copyright"):
        falta("copyright")

    secao("Build escolhido para a versão " + V["attributes"]["versionString"])
    b = get("/v1/appStoreVersions/%s/build" % vid)
    if b and b.get("data"):
        ba = b["data"]["attributes"]
        print("  build", ba.get("version"), "| processamento:", ba.get("processingState"), "| expirado:", ba.get("expired"),
              "| criptografia não isenta:", ba.get("usesNonExemptEncryption"), "| enviado:", ba.get("uploadedDate"))
        pv = get("/v1/builds/%s/preReleaseVersion" % b["data"]["id"])
        if pv and pv.get("data"):
            print("  versão do build:", pv["data"]["attributes"].get("version"))
        if ba.get("usesNonExemptEncryption") is None:
            falta("conformidade de exportação (criptografia) do build")
    else:
        falta("nenhum build escolhido para a versão")

    secao("Textos da versão")
    for l in get("/v1/appStoreVersions/%s/appStoreVersionLocalizations" % vid)["data"]:
        la = l["attributes"]
        print("  [%s] descrição: %d letras | palavras-chave: %r | promocional: %d | suporte: %s | marketing: %s" % (
            la["locale"], len(la.get("description") or ""), la.get("keywords"), len(la.get("promotionalText") or ""),
            la.get("supportUrl"), la.get("marketingUrl")))
        for campo in ("description", "keywords", "supportUrl"):
            if not la.get(campo):
                falta("%s (%s)" % (campo, la["locale"]))
        conj = get("/v1/appStoreVersionLocalizations/%s/appScreenshotSets" % l["id"])["data"]
        if not conj:
            falta("prints (%s)" % la["locale"])
        for c in conj:
            shots = get("/v1/appScreenshotSets/%s/appScreenshots" % c["id"])["data"]
            estados = [ (s["attributes"].get("assetDeliveryState") or {}).get("state") for s in shots]
            print("    prints %s: %d %s" % (c["attributes"]["screenshotDisplayType"], len(shots), estados))
            if not shots or any(e != "COMPLETE" for e in estados):
                falta("prints %s incompletos" % c["attributes"]["screenshotDisplayType"])

    secao("Informações para a revisão")
    d = get("/v1/appStoreVersions/%s/appStoreReviewDetail" % vid)
    if d and d.get("data"):
        da = d["data"]["attributes"]
        for campo in ("contactFirstName", "contactLastName", "contactEmail", "contactPhone", "notes"):
            ok = bool(da.get(campo))
            print("  %s: %s" % (campo, "preenchido" if ok else "VAZIO"))
            if not ok and campo != "notes":
                falta("contato da revisão: " + campo)
        print("  conta de demonstração exigida:", da.get("demoAccountRequired"))
    else:
        falta("informações para a revisão (contato)")

    secao("Envios para revisão")
    subs = get("/v1/reviewSubmissions?filter[app]=%s&limit=10" % APP)
    for s in (subs or {}).get("data", []):
        print("  ", s["attributes"].get("state"), s["attributes"].get("submittedDate"), s["attributes"].get("platform"))
    if not (subs or {}).get("data"):
        print("  nenhum envio ainda")

secao("Builds recentes")
bs = get("/v1/builds?filter[app]=%s&sort=-uploadedDate&limit=6&include=preReleaseVersion" % APP)
pre = {i["id"]: i["attributes"].get("version") for i in bs.get("included", []) if i["type"] == "preReleaseVersions"}
for b in bs["data"]:
    ba = b["attributes"]
    pid = (b["relationships"]["preReleaseVersion"].get("data") or {}).get("id")
    print("  ", pre.get(pid), "build", ba.get("version"), ba.get("processingState"), "| expirado:", ba.get("expired"),
          "| cripto:", ba.get("usesNonExemptEncryption"), "|", ba.get("uploadedDate"))

secao("Informações do app (nome, subtítulo, privacidade, categoria, classificação)")
infos = get("/v1/apps/%s/appInfos?include=primaryCategory,secondaryCategory" % APP)
for i in infos["data"]:
    ia = i["attributes"]
    print("  estado:", ia.get("state") or ia.get("appStoreState"), "| idade:", ia.get("appStoreAgeRating"),
          "| categoria 1:", (i["relationships"]["primaryCategory"].get("data") or {}).get("id"),
          "| categoria 2:", (i["relationships"]["secondaryCategory"].get("data") or {}).get("id"))
    if not (i["relationships"]["primaryCategory"].get("data")):
        falta("categoria principal")
    for l in get("/v1/appInfos/%s/appInfoLocalizations" % i["id"])["data"]:
        la = l["attributes"]
        print("  [%s] nome: %s | subtítulo: %s | privacidade: %s" % (la["locale"], la.get("name"), la.get("subtitle"), la.get("privacyPolicyUrl")))
        if not la.get("privacyPolicyUrl"):
            falta("URL da política de privacidade (%s)" % la["locale"])
    ar = get("/v1/appInfos/%s/ageRatingDeclaration" % i["id"])
    if ar and ar.get("data"):
        at = ar["data"]["attributes"]
        nulos = [k for k, v in at.items() if v is None and not any(p in k for p in ("Override", "kidsAgeBand", "Url", "korea"))]
        print("  classificação etária: anúncios=%s | campos sem resposta: %s" % (at.get("advertising"), nulos or "nenhum"))
        if nulos:
            falta("classificação etária: " + ", ".join(nulos))
    else:
        falta("classificação etária")

secao("Preço e disponibilidade")
ps = get("/v1/apps/%s/appPriceSchedule" % APP)
print("  preço:", "configurado" if ps and ps.get("data") else "NÃO configurado")
if not (ps and ps.get("data")):
    falta("preço")
else:
    mp = get("/v1/appPriceSchedules/%s/manualPrices?include=appPricePoint,territory" % ps["data"]["id"])
    for inc in (mp or {}).get("included", []):
        if inc["type"] == "appPricePoints":
            print("  preço ao cliente:", inc["attributes"].get("customerPrice"))
av = get("/v1/apps/%s/appAvailabilityV2" % APP)
if av and av.get("data"):
    ta = get("/v2/appAvailabilities/%s/territoryAvailabilities?limit=200" % av["data"]["id"])
    n = sum(1 for t in (ta or {}).get("data", []) if t["attributes"].get("available"))
    print("  disponível em %d países | novos países automático: %s" % (n, av["data"]["attributes"].get("availableInNewTerritories")))
else:
    falta("disponibilidade por país")

secao("Compras dentro do app (Premium)")
iap = get("/v1/apps/%s/inAppPurchasesV2?limit=50" % APP)
for p in (iap or {}).get("data", []):
    print("  ", p["attributes"].get("productId"), p["attributes"].get("state"))
sg = get("/v1/apps/%s/subscriptionGroups?include=subscriptions" % APP)
for s in (sg or {}).get("included", []):
    print("  ", s["attributes"].get("productId"), s["attributes"].get("state"))
if not (iap or {}).get("data") and not (sg or {}).get("included"):
    print("  nenhuma (Premium fica escondido no iPhone sem a chave iOS do RevenueCat)")

secao("TestFlight")
for g in (get("/v1/apps/%s/betaGroups" % APP) or {}).get("data", []):
    print("  grupo:", g["attributes"]["name"], "| interno:", g["attributes"].get("isInternalGroup"))
bd = get("/v1/apps/%s/betaAppReviewDetail" % APP)

print("\n== Não dá para ver pela API: privacidade do app (coleta de dados), contratos, impostos e banco.")
print("\n== RESUMO: " + ("; ".join(pend) if pend else "nada pendente que a API mostre"))
