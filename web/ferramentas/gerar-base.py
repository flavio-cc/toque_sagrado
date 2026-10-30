#!/usr/bin/env python3
"""Gera a base de Salmos e Provérbios do Toque Sagrado.

Fonte: Bíblia Livre (PorBLivre), licença Creative Commons Atribuição 3.0 Brasil,
copiada de github.com/scrollmapper/bible_databases (formats/json/PorBLivre.json).

Uso: python3 gerar-base.py /caminho/PorBLivre.json
Saídas (na pasta do app):
  dados/salmos-proverbios.json  base completa, todos os versículos
  biblia.js                     a mesma base, compacta, para o leitor dentro do app
  verses.js                     as cartas (versículos escolhidos, com temas)
"""
import json, re, sys, os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTE = "Bíblia Livre"
LICENCA = "Creative Commons Atribuição 3.0 Brasil (CC BY 3.0 BR)"
CREDITO = "Texto bíblico: Bíblia Livre, CC BY 3.0 BR. Pequenos ajustes de digitação e de recorte para as cartas."

LIVROS = [("sl", "Psalms", "Salmos"), ("pv", "Proverbs", "Provérbios")]

# Erros de digitação da fonte, corrigidos na base e nas cartas.
CORRECOES = {
    ("pv", 3, 6): [("em todas os teus", "em todos os teus")],
    ("sl", 34, 18): [("sava os", "salva os")],
    ("sl", 32, 8): [("e de ensinarei", "e te ensinarei")],
    ("sl", 20, 4): [("ele de a ti", "ele dê a ti")],
    ("sl", 90, 12): [("Ensina -nos", "Ensina-nos")],
    ("sl", 111, 10): [("todos o que", "todos os que")],
    ("pv", 1, 7): [("principio", "princípio")],
    ("pv", 22, 1): [("o o ouro", "o ouro")],
    ("pv", 29, 25): [("no senhor", "no SENHOR")],
    ("sl", 19, 7): [("e da sabedoria", "e dá sabedoria")],
    ("sl", 31, 19): [("Como é grade", "Como é grande")],
    ("sl", 33, 20): [("nossa socorro", "nosso socorro")],
    ("sl", 33, 22): [("SENOR", "SENHOR")],
    ("sl", 40, 16): [("se alegrem-se", "se alegrem")],
    ("pv", 12, 18): [("do sábios", "dos sábios")],
}

INICIO_TITULO = re.compile(r"^(Salmo|Cântico|Canção|Masquil|Mictão|Oração|Instrução|Memorial|Para o regente|Ao regente|Para o mestre|Ao mestre|Hino|Lamentação|Salmo-cântico)", re.I)
LETRA_119 = re.compile(r"^([A-ZÁÉÍÓÚÂÊÔ][a-záéíóúâêôãõç\-]{0,8}):\s*")


def limpar(livro, cap, v, texto):
    titulo = None
    texto = texto.strip()
    if livro == "sl" and cap == 119:
        texto = LETRA_119.sub("", texto)
    if livro == "sl" and v == 1 and INICIO_TITULO.match(texto) and ":" in texto:
        titulo, texto = texto.split(":", 1)
        titulo, texto = titulo.strip(), texto.strip()
    for velho, novo in CORRECOES.get((livro, cap, v), []):
        texto = texto.replace(velho, novo)
    texto = re.sub(r"\s+", " ", texto)
    texto = re.sub(r"([.;!?:])([A-ZÁÉÍÓÚÂÊÔ])", r"\1 \2", texto)
    return titulo, texto


def carregar(caminho):
    d = json.load(open(caminho, encoding="utf-8"))
    base = {}
    for cod, nome_en, nome in LIVROS:
        livro = next(b for b in d["books"] if b["name"] == nome_en)
        caps = []
        for c in livro["chapters"]:
            titulo, vs = None, []
            for x in c["verses"]:
                t, texto = limpar(cod, c["chapter"], x["verse"], x["text"])
                titulo = titulo or t
                vs.append(texto)
            caps.append({"cap": c["chapter"], "titulo": titulo, "versiculos": vs})
        base[cod] = {"nome": nome, "capitulos": caps}
    return base


# ---------- cartas ----------
# (livro, capítulo, versículo inicial, versículo final, temas, popularidade 1-3)
# Popularidade: Bible Gateway 2024/2025, YouVersion 2024, Logos 2024, topverses.com.
# Temas: paz, forca, gratidao, protecao, louvor, esperanca, consolo, sabedoria.
CARTAS = [
    # Salmos que já estavam no app (os ids continuam iguais, para não perder coleções)
    ("sl", 23, 1, 1, ["paz", "protecao"], 3),
    ("sl", 23, 4, 4, ["protecao", "consolo"], 3),
    ("sl", 27, 1, 1, ["forca", "protecao"], 2),
    ("sl", 34, 8, 8, ["gratidao", "louvor"], 1),
    ("sl", 37, 5, 5, ["esperanca", "paz"], 2),
    ("sl", 46, 1, 1, ["protecao", "forca"], 3),
    ("sl", 46, 10, 10, ["paz"], 3),
    ("sl", 55, 22, 22, ["paz", "forca"], 1),
    ("sl", 56, 3, 3, ["protecao", "forca"], 1),
    ("sl", 91, 1, 1, ["protecao", "paz"], 3),
    ("sl", 91, 2, 2, ["protecao", "forca"], 3),
    ("sl", 91, 11, 11, ["protecao"], 3),
    ("sl", 94, 19, 19, ["consolo", "paz"], 3),
    ("sl", 100, 4, 4, ["louvor", "gratidao"], 1),
    ("sl", 103, 2, 2, ["gratidao", "louvor"], 1),
    ("sl", 118, 24, 24, ["louvor", "gratidao"], 1),
    ("sl", 119, 105, 105, ["esperanca", "forca"], 3),
    ("sl", 121, 1, 2, ["esperanca", "protecao"], 3),
    ("sl", 121, 7, 7, ["protecao", "paz"], 2),
    ("sl", 126, 5, 5, ["esperanca", "consolo"], 1),
    ("sl", 139, 14, 14, ["gratidao", "louvor"], 2),
    ("sl", 30, 5, 5, ["esperanca", "consolo"], 1),
    ("sl", 42, 11, 11, ["esperanca", "consolo"], 1),
    ("sl", 147, 3, 3, ["consolo", "esperanca"], 1),
    ("sl", 145, 18, 18, ["consolo", "paz"], 1),
    ("sl", 16, 8, 8, ["forca", "paz"], 1),
    ("sl", 28, 7, 7, ["forca", "gratidao"], 1),
    ("sl", 9, 9, 9, ["protecao", "consolo"], 1),
    ("sl", 29, 11, 11, ["paz", "forca"], 1),
    ("sl", 4, 8, 8, ["paz", "protecao"], 1),
    ("sl", 73, 26, 26, ["forca", "consolo"], 1),
    ("sl", 86, 5, 5, ["gratidao", "consolo"], 1),
    ("sl", 107, 1, 1, ["gratidao", "louvor"], 1),
    ("sl", 92, 1, 1, ["louvor", "gratidao"], 1),
    ("sl", 150, 6, 6, ["louvor"], 1),
    ("sl", 23, 2, 2, ["paz"], 3),
    ("sl", 23, 3, 3, ["paz", "forca"], 3),
    ("sl", 23, 5, 5, ["gratidao", "protecao"], 3),
    ("sl", 23, 6, 6, ["esperanca", "gratidao"], 3),
    ("sl", 91, 4, 4, ["protecao", "paz"], 3),
    ("sl", 91, 15, 15, ["protecao", "consolo"], 3),
    ("sl", 19, 1, 1, ["louvor", "gratidao"], 2),
    ("sl", 19, 14, 14, ["paz", "louvor"], 1),
    ("sl", 1, 1, 1, ["paz", "sabedoria"], 2),
    ("sl", 37, 4, 4, ["esperanca", "gratidao"], 2),
    ("sl", 103, 1, 1, ["louvor", "gratidao"], 2),
    ("sl", 24, 1, 1, ["louvor", "gratidao"], 2),
    ("sl", 51, 10, 10, ["esperanca", "consolo"], 2),
    ("sl", 119, 11, 11, ["sabedoria", "forca"], 2),
    ("sl", 121, 8, 8, ["protecao", "paz"], 1),
    ("sl", 34, 18, 18, ["consolo", "esperanca"], 1),
    ("sl", 34, 4, 4, ["protecao", "paz"], 1),
    ("sl", 32, 8, 8, ["sabedoria", "esperanca"], 1),
    ("sl", 40, 1, 1, ["esperanca", "consolo"], 1),
    # Salmos novos
    ("sl", 3, 3, 3, ["protecao", "forca"], 1),
    ("sl", 3, 5, 5, ["paz", "protecao"], 1),
    ("sl", 5, 3, 3, ["esperanca", "paz"], 1),
    ("sl", 8, 1, 1, ["louvor"], 1),
    ("sl", 16, 11, 11, ["louvor", "esperanca"], 1),
    ("sl", 18, 2, 2, ["protecao", "forca"], 1),
    ("sl", 18, 28, 28, ["esperanca", "forca"], 1),
    ("sl", 20, 4, 4, ["esperanca"], 1),
    ("sl", 25, 4, 4, ["sabedoria", "esperanca"], 1),
    ("sl", 27, 14, 14, ["esperanca", "forca"], 1),
    ("sl", 31, 24, 24, ["forca", "esperanca"], 1),
    ("sl", 32, 7, 7, ["protecao"], 1),
    ("sl", 34, 1, 1, ["louvor", "gratidao"], 1),
    ("sl", 37, 3, 3, ["esperanca", "sabedoria"], 1),
    ("sl", 37, 7, 7, ["paz"], 1),
    ("sl", 37, 23, 23, ["esperanca", "sabedoria"], 1),
    ("sl", 40, 3, 3, ["louvor"], 1),
    ("sl", 42, 1, 1, ["consolo", "esperanca"], 1),
    ("sl", 50, 15, 15, ["protecao", "consolo"], 1),
    ("sl", 57, 1, 1, ["protecao", "consolo"], 1),
    ("sl", 61, 2, 2, ["consolo", "protecao"], 1),
    ("sl", 62, 1, 1, ["paz"], 1),
    ("sl", 62, 8, 8, ["consolo", "paz"], 1),
    ("sl", 63, 1, 1, ["esperanca"], 1),
    ("sl", 63, 3, 3, ["louvor", "gratidao"], 1),
    ("sl", 68, 19, 19, ["gratidao"], 1),
    ("sl", 71, 5, 5, ["esperanca"], 1),
    ("sl", 84, 11, 11, ["protecao", "gratidao"], 1),
    ("sl", 90, 12, 12, ["sabedoria"], 1),
    ("sl", 90, 17, 17, ["forca", "esperanca"], 1),
    ("sl", 95, 1, 1, ["louvor"], 1),
    ("sl", 96, 1, 1, ["louvor"], 1),
    ("sl", 100, 5, 5, ["gratidao"], 1),
    ("sl", 103, 12, 12, ["consolo"], 1),
    ("sl", 107, 9, 9, ["gratidao", "consolo"], 1),
    ("sl", 111, 10, 10, ["sabedoria"], 1),
    ("sl", 116, 1, 1, ["gratidao"], 1),
    ("sl", 118, 6, 6, ["protecao", "forca"], 1),
    ("sl", 119, 50, 50, ["consolo"], 1),
    ("sl", 119, 114, 114, ["protecao", "esperanca"], 1),
    ("sl", 119, 130, 130, ["sabedoria"], 1),
    ("sl", 119, 165, 165, ["paz"], 1),
    ("sl", 121, 3, 3, ["protecao"], 1),
    ("sl", 127, 1, 1, ["sabedoria", "protecao"], 1),
    ("sl", 133, 1, 1, ["paz"], 1),
    ("sl", 136, 1, 1, ["gratidao"], 1),
    ("sl", 138, 3, 3, ["forca"], 1),
    ("sl", 138, 8, 8, ["esperanca"], 1),
    ("sl", 143, 8, 8, ["esperanca", "sabedoria"], 1),
    ("sl", 143, 10, 10, ["sabedoria"], 1),
    ("sl", 145, 8, 8, ["consolo"], 1),
    ("sl", 147, 5, 5, ["louvor"], 1),
    # Provérbios
    ("pv", 1, 7, 7, ["sabedoria"], 1),
    ("pv", 2, 6, 6, ["sabedoria"], 1),
    ("pv", 3, 5, 6, ["sabedoria", "paz"], 3),
    ("pv", 3, 13, 13, ["sabedoria", "gratidao"], 1),
    ("pv", 3, 24, 24, ["paz", "protecao"], 1),
    ("pv", 4, 18, 18, ["esperanca"], 1),
    ("pv", 4, 23, 23, ["sabedoria"], 3),
    ("pv", 8, 17, 17, ["esperanca"], 1),
    ("pv", 9, 10, 10, ["sabedoria"], 1),
    ("pv", 10, 12, 12, ["paz"], 1),
    ("pv", 10, 22, 22, ["gratidao"], 1),
    ("pv", 11, 2, 2, ["sabedoria"], 1),
    ("pv", 11, 25, 25, ["gratidao"], 1),
    ("pv", 12, 25, 25, ["consolo"], 1),
    ("pv", 13, 12, 12, ["esperanca"], 1),
    ("pv", 14, 29, 29, ["paz", "sabedoria"], 1),
    ("pv", 14, 30, 30, ["paz"], 1),
    ("pv", 15, 1, 1, ["paz", "sabedoria"], 2),
    ("pv", 15, 13, 13, ["gratidao"], 1),
    ("pv", 16, 3, 3, ["esperanca", "sabedoria"], 3),
    ("pv", 16, 9, 9, ["sabedoria", "esperanca"], 2),
    ("pv", 16, 24, 24, ["consolo"], 1),
    ("pv", 16, 32, 32, ["forca", "paz"], 1),
    ("pv", 17, 17, 17, ["consolo"], 1),
    ("pv", 17, 22, 22, ["gratidao", "consolo"], 2),
    ("pv", 18, 10, 10, ["protecao", "forca"], 2),
    ("pv", 18, 21, 21, ["sabedoria"], 1),
    ("pv", 18, 24, 24, ["consolo"], 1),
    ("pv", 19, 11, 11, ["paz", "sabedoria"], 1),
    ("pv", 19, 21, 21, ["sabedoria", "esperanca"], 1),
    ("pv", 22, 1, 1, ["sabedoria"], 1),
    ("pv", 22, 6, 6, ["sabedoria"], 2),
    ("pv", 23, 18, 18, ["esperanca"], 1),
    ("pv", 24, 16, 16, ["forca", "esperanca"], 1),
    ("pv", 25, 11, 11, ["sabedoria"], 1),
    ("pv", 27, 17, 17, ["sabedoria"], 2),
    ("pv", 28, 1, 1, ["forca"], 1),
    ("pv", 29, 25, 25, ["protecao"], 1),
    ("pv", 30, 5, 5, ["protecao"], 1),
    ("pv", 31, 25, 25, ["forca", "esperanca"], 2),
    ("pv", 31, 30, 30, ["sabedoria", "louvor"], 1),
    # Ampliação (2026-10-29): mais versículos que fazem sentido sozinhos, para chegar perto de 300 cartas
    ("sl", 5, 11, 11, ["louvor", "gratidao"], 1),
    ("sl", 5, 12, 12, ["protecao", "gratidao"], 1),
    ("sl", 9, 1, 1, ["louvor", "gratidao"], 1),
    ("sl", 9, 10, 10, ["protecao", "esperanca"], 1),
    ("sl", 13, 5, 5, ["esperanca", "gratidao"], 1),
    ("sl", 16, 1, 1, ["protecao", "paz"], 1),
    ("sl", 17, 8, 8, ["protecao"], 1),
    ("sl", 18, 1, 1, ["forca", "louvor"], 1),
    ("sl", 18, 30, 30, ["protecao", "sabedoria"], 1),
    ("sl", 18, 32, 32, ["forca"], 1),
    ("sl", 19, 7, 7, ["sabedoria", "consolo"], 1),
    ("sl", 19, 8, 8, ["sabedoria", "gratidao"], 1),
    ("sl", 25, 5, 5, ["sabedoria", "esperanca"], 1),
    ("sl", 25, 10, 10, ["sabedoria"], 1),
    ("sl", 27, 4, 4, ["louvor"], 1),
    ("sl", 27, 5, 5, ["protecao"], 1),
    ("sl", 27, 13, 13, ["esperanca", "consolo"], 1),
    ("sl", 29, 2, 2, ["louvor"], 1),
    ("sl", 30, 2, 2, ["gratidao", "consolo"], 1),
    ("sl", 30, 11, 11, ["consolo", "gratidao"], 1),
    ("sl", 31, 3, 3, ["protecao", "sabedoria"], 1),
    ("sl", 31, 14, 14, ["esperanca"], 1),
    ("sl", 31, 19, 19, ["gratidao"], 1),
    ("sl", 32, 1, 1, ["consolo"], 1),
    ("sl", 33, 4, 4, ["sabedoria"], 1),
    ("sl", 33, 18, 18, ["protecao"], 1),
    ("sl", 33, 20, 20, ["esperanca", "protecao"], 1),
    ("sl", 33, 22, 22, ["esperanca"], 1),
    ("sl", 34, 3, 3, ["louvor"], 1),
    ("sl", 34, 5, 5, ["gratidao", "esperanca"], 1),
    ("sl", 34, 7, 7, ["protecao"], 1),
    ("sl", 34, 10, 10, ["gratidao"], 1),
    ("sl", 34, 17, 17, ["consolo", "protecao"], 1),
    ("sl", 34, 19, 19, ["forca", "consolo"], 1),
    ("sl", 36, 5, 5, ["louvor"], 1),
    ("sl", 36, 7, 7, ["protecao", "gratidao"], 1),
    ("sl", 36, 9, 9, ["louvor"], 1),
    ("sl", 37, 24, 24, ["forca", "esperanca"], 1),
    ("sl", 37, 39, 39, ["forca"], 1),
    ("sl", 39, 7, 7, ["esperanca"], 1),
    ("sl", 40, 2, 2, ["esperanca", "forca"], 1),
    ("sl", 40, 8, 8, ["sabedoria"], 1),
    ("sl", 40, 16, 16, ["louvor"], 1),
    ("sl", 42, 5, 5, ["consolo", "esperanca"], 1),
    ("sl", 42, 8, 8, ["consolo", "paz"], 1),
    ("sl", 43, 5, 5, ["consolo", "esperanca"], 1),
    ("sl", 46, 7, 7, ["protecao"], 1),
    ("sl", 47, 1, 1, ["louvor"], 1),
    ("sl", 51, 12, 12, ["consolo"], 1),
    ("sl", 51, 17, 17, ["consolo"], 1),
    ("sl", 54, 4, 4, ["forca"], 1),
    ("sl", 55, 16, 16, ["protecao"], 1),
    ("sl", 55, 17, 17, ["esperanca"], 1),
    ("sl", 56, 4, 4, ["protecao", "forca"], 1),
    ("sl", 56, 8, 8, ["consolo"], 1),
    ("sl", 57, 7, 7, ["forca", "louvor"], 1),
    ("sl", 57, 10, 10, ["louvor"], 1),
    ("sl", 59, 16, 16, ["louvor", "protecao"], 1),
    ("sl", 59, 17, 17, ["forca", "louvor"], 1),
    ("sl", 61, 1, 1, ["consolo"], 1),
    ("sl", 61, 3, 3, ["protecao"], 1),
    ("sl", 62, 2, 2, ["protecao", "paz"], 1),
    ("sl", 62, 5, 5, ["paz", "esperanca"], 1),
    ("sl", 63, 7, 7, ["gratidao", "protecao"], 1),
    ("sl", 63, 8, 8, ["forca", "consolo"], 1),
    ("sl", 66, 20, 20, ["gratidao"], 1),
    ("sl", 67, 1, 1, ["gratidao"], 1),
    ("sl", 68, 5, 5, ["consolo"], 1),
    ("sl", 69, 30, 30, ["louvor", "gratidao"], 1),
    ("sl", 71, 3, 3, ["protecao"], 1),
    ("sl", 71, 14, 14, ["esperanca"], 1),
    ("sl", 73, 23, 23, ["consolo"], 1),
    ("sl", 73, 24, 24, ["sabedoria"], 1),
    ("sl", 73, 25, 25, ["paz"], 1),
    ("sl", 73, 28, 28, ["esperanca"], 1),
    ("sl", 84, 1, 1, ["louvor"], 1),
    ("sl", 84, 5, 5, ["forca"], 1),
    ("sl", 84, 10, 10, ["louvor"], 1),
    ("sl", 85, 8, 8, ["paz"], 1),
    ("sl", 85, 10, 10, ["paz"], 1),
    ("sl", 86, 7, 7, ["consolo"], 1),
    ("sl", 86, 11, 11, ["sabedoria"], 1),
    ("sl", 86, 12, 12, ["louvor"], 1),
    ("sl", 89, 1, 1, ["louvor"], 1),
    ("sl", 89, 15, 15, ["louvor"], 1),
    ("sl", 90, 1, 1, ["protecao"], 1),
    ("sl", 90, 2, 2, ["louvor"], 1),
    ("sl", 90, 14, 14, ["gratidao"], 1),
    ("sl", 91, 5, 5, ["protecao", "paz"], 1),
    ("sl", 91, 9, 9, ["protecao"], 1),
    ("sl", 91, 14, 14, ["protecao"], 1),
    ("sl", 92, 4, 4, ["gratidao"], 1),
    ("sl", 92, 12, 12, ["esperanca"], 1),
    ("sl", 94, 18, 18, ["forca", "consolo"], 1),
    ("sl", 94, 22, 22, ["protecao"], 1),
    ("sl", 95, 6, 6, ["louvor"], 1),
    ("sl", 97, 11, 11, ["esperanca"], 1),
    ("sl", 98, 1, 1, ["louvor"], 1),
    ("sl", 100, 1, 1, ["louvor"], 1),
    ("sl", 100, 3, 3, ["gratidao"], 1),
    ("sl", 103, 8, 8, ["consolo"], 1),
    ("sl", 103, 11, 11, ["gratidao"], 1),
    ("sl", 103, 13, 13, ["consolo"], 1),
    ("sl", 104, 24, 24, ["louvor"], 1),
    ("sl", 104, 33, 33, ["louvor"], 1),
    ("sl", 105, 4, 4, ["forca"], 1),
    ("sl", 106, 1, 1, ["gratidao"], 1),
    ("sl", 107, 29, 29, ["paz"], 1),
    ("sl", 112, 1, 1, ["sabedoria"], 1),
    ("sl", 112, 7, 7, ["paz"], 1),
    ("sl", 113, 3, 3, ["louvor"], 1),
    ("sl", 115, 1, 1, ["louvor"], 1),
    ("sl", 116, 7, 7, ["paz"], 1),
    ("sl", 117, 2, 2, ["gratidao"], 1),
    ("sl", 118, 1, 1, ["gratidao"], 1),
    ("sl", 118, 5, 5, ["consolo"], 1),
    ("sl", 118, 8, 8, ["protecao"], 1),
    ("sl", 118, 14, 14, ["forca"], 1),
    ("sl", 119, 18, 18, ["sabedoria"], 1),
    ("sl", 119, 28, 28, ["consolo"], 1),
    ("sl", 119, 68, 68, ["sabedoria"], 1),
    ("sl", 119, 71, 71, ["sabedoria"], 1),
    ("sl", 119, 76, 76, ["consolo"], 1),
    ("sl", 119, 89, 89, ["esperanca"], 1),
    ("sl", 119, 97, 97, ["sabedoria"], 1),
    ("sl", 119, 103, 103, ["gratidao"], 1),
    ("sl", 121, 5, 5, ["protecao"], 1),
    ("sl", 124, 8, 8, ["protecao"], 1),
    ("sl", 125, 1, 1, ["forca"], 1),
    ("sl", 125, 2, 2, ["protecao"], 1),
    ("sl", 126, 3, 3, ["gratidao"], 1),
    ("sl", 127, 2, 2, ["paz"], 1),
    ("sl", 130, 5, 5, ["esperanca"], 1),
    ("sl", 138, 7, 7, ["forca"], 1),
    ("sl", 139, 1, 1, ["consolo"], 1),
    ("sl", 139, 9, 10, ["protecao"], 1),
    ("sl", 139, 23, 23, ["sabedoria"], 1),
    ("sl", 141, 3, 3, ["sabedoria"], 1),
    ("sl", 143, 1, 1, ["consolo"], 1),
    ("sl", 145, 3, 3, ["louvor"], 1),
    ("sl", 145, 9, 9, ["gratidao"], 1),
    ("sl", 145, 14, 14, ["consolo"], 1),
    ("sl", 146, 5, 5, ["esperanca"], 1),
    ("sl", 146, 8, 8, ["consolo"], 1),
    ("sl", 147, 11, 11, ["esperanca"], 1),
    ("sl", 149, 4, 4, ["gratidao"], 1),
    ("pv", 3, 3, 3, ["sabedoria"], 1),
    ("pv", 3, 7, 7, ["sabedoria"], 1),
    ("pv", 3, 26, 26, ["protecao"], 1),
    ("pv", 3, 27, 27, ["sabedoria"], 1),
    ("pv", 4, 7, 7, ["sabedoria"], 1),
    ("pv", 4, 26, 26, ["sabedoria"], 1),
    ("pv", 8, 11, 11, ["sabedoria"], 1),
    ("pv", 10, 9, 9, ["sabedoria"], 1),
    ("pv", 10, 19, 19, ["sabedoria", "paz"], 1),
    ("pv", 11, 14, 14, ["sabedoria"], 1),
    ("pv", 11, 17, 17, ["sabedoria"], 1),
    ("pv", 12, 18, 18, ["sabedoria"], 1),
    ("pv", 13, 20, 20, ["sabedoria"], 1),
    ("pv", 15, 15, 15, ["gratidao"], 1),
    ("pv", 15, 16, 16, ["paz"], 1),
    ("pv", 15, 22, 22, ["sabedoria"], 1),
    ("pv", 15, 23, 23, ["sabedoria"], 1),
    ("pv", 15, 30, 30, ["gratidao"], 1),
    ("pv", 16, 7, 7, ["paz"], 1),
    ("pv", 16, 16, 16, ["sabedoria"], 1),
    ("pv", 16, 20, 20, ["sabedoria"], 1),
    ("pv", 17, 9, 9, ["paz"], 1),
    ("pv", 17, 27, 27, ["paz", "sabedoria"], 1),
    ("pv", 18, 15, 15, ["sabedoria"], 1),
    ("pv", 19, 17, 17, ["gratidao"], 1),
    ("pv", 19, 20, 20, ["sabedoria"], 1),
    ("pv", 20, 22, 22, ["paz"], 1),
    ("pv", 21, 21, 21, ["sabedoria"], 1),
    ("pv", 21, 23, 23, ["sabedoria"], 1),
    ("pv", 22, 4, 4, ["sabedoria"], 1),
    ("pv", 22, 9, 9, ["gratidao"], 1),
    ("pv", 27, 1, 1, ["sabedoria"], 1),
    ("pv", 27, 2, 2, ["sabedoria"], 1),
    ("pv", 27, 9, 9, ["consolo"], 1),
    ("pv", 28, 13, 13, ["consolo"], 1),
    ("pv", 29, 11, 11, ["paz"], 1),
    ("pv", 31, 10, 10, ["louvor"], 1),
    ("pv", 31, 26, 26, ["sabedoria"], 1),
]

# Recortes para a carta: versículos longos ganham um trecho que faz sentido sozinho.
# (livro, cap, v) -> texto da carta. A base completa continua com o versículo inteiro.
RECORTES = {
    ("sl", 8, 1): "Ah DEUS, nosso Senhor, quão glorioso é o teu nome sobre toda a terra!",
    ("sl", 18, 2): "O SENHOR é minha rocha, e minha fortaleza, e meu libertador, meu Deus, meu rochedo, em quem confio.",
    ("sl", 28, 7): "O SENHOR é a minha força e meu escudo; meu coração confiou nele, e foi socorrido.",
    ("sl", 30, 5): "O choro fica pela noite, mas a alegria vem pela manhã.",
    ("sl", 37, 7): "Descansa-te no SENHOR, e espera por ele.",
    ("sl", 40, 3): "Pôs em minha boca uma canção nova, um louvor para nosso Deus.",
    ("sl", 42, 11): "Por que estás abatida, minha alma? E por que te inquietas em mim? Espera em Deus; porque eu ainda o louvarei.",
    ("sl", 46, 10): "Ficai quietos, e sabei que eu sou Deus.",
    ("sl", 57, 1): "Minha alma confia em ti, e eu me refugio sob a sombra de tuas asas, até que os meus problemas passem de mim.",
    ("sl", 63, 1): "Deus, tu és meu Deus. Eu te busco ao amanhecer; minha alma tem sede de ti.",
    ("sl", 90, 17): "Que o agrado do SENHOR nosso Deus seja sobre nós; e confirma as obras de nossas mãos.",
    ("sl", 111, 10): "O temor ao SENHOR é o princípio da sabedoria; inteligentes são todos os que isto praticam.",
    ("sl", 138, 8): "O SENHOR fará por completo o que ele tem para mim; ó SENHOR, tua bondade dura para sempre.",
    ("pv", 18, 24): "Há um amigo mais chegado que um irmão.",
    ("sl", 84, 10): "Porque melhor é um dia nos teus pátios, do que mil fora.",
    ("sl", 85, 8): "Escutarei o que o Deus, o SENHOR, falar, pois ele falará de paz ao seu povo.",
    ("sl", 98, 1): "Cantai ao SENHOR uma canção nova, porque ele fez maravilhas.",
    ("sl", 127, 2): "Assim ele dá sono a quem ele ama.",
    ("sl", 138, 7): "Enquanto ando no meio da angústia, tu me vivificas.",
    ("sl", 139, 9): "Se eu tomasse as asas do amanhecer, e morasse nos limites do mar, até ali tua mão me guiaria, e tua mão direita me seguraria.",
    ("pv", 24, 16): "O justo cai sete vezes, e se levanta.",
    ("pv", 28, 1): "Os justos são confiantes como um leão.",
}


def texto_da_carta(texto):
    """Deixa o trecho pronto para ficar sozinho numa carta."""
    texto = texto.replace(" (Selá)", "").strip()
    m = re.match(r"^(E|Porque|Pois|Mas) (.)", texto)
    if m:
        texto = m.group(2).upper() + texto[m.end():]
    texto = re.sub(r"[;:,]$", ".", texto)
    return texto

TEMAS = {
    "paz":       {"nome": "Paz",       "foil": ["#a9e3df", "#4aa3a8"], "papel": "#eefaf8", "acento": "#1f6f74"},
    "forca":     {"nome": "Força",     "foil": ["#f6b36a", "#c4562b"], "papel": "#fff3e8", "acento": "#a8431d"},
    "gratidao":  {"nome": "Gratidão",  "foil": ["#f6d98a", "#c99a2e"], "papel": "#fff8e4", "acento": "#7a5d1c"},
    "protecao":  {"nome": "Proteção",  "foil": ["#a5b8f5", "#4a62c4"], "papel": "#eef1ff", "acento": "#2c3f99"},
    "louvor":    {"nome": "Louvor",    "foil": ["#f7b5cc", "#d4607f"], "papel": "#fff0f5", "acento": "#a03a5a"},
    "esperanca": {"nome": "Esperança", "foil": ["#b9e39c", "#5e9f45"], "papel": "#f1faea", "acento": "#3f7a2a"},
    "consolo":   {"nome": "Consolo",   "foil": ["#d3bff5", "#8a68c9"], "papel": "#f5f0ff", "acento": "#5e429a"},
    "sabedoria": {"nome": "Sabedoria", "foil": ["#c9d6e3", "#5f7a94"], "papel": "#f0f4f8", "acento": "#3d5873"},
}

HUMORES = [
    {"id": "cansado", "rotulo": "Cansado", "emoji": "😮‍💨", "temas": ["paz", "forca"]},
    {"id": "ansioso", "rotulo": "Ansioso", "emoji": "😟", "temas": ["paz", "protecao"]},
    {"id": "triste", "rotulo": "Triste", "emoji": "😢", "temas": ["consolo", "esperanca"]},
    {"id": "grato", "rotulo": "Grato", "emoji": "🙏", "temas": ["gratidao", "louvor"]},
    {"id": "alegre", "rotulo": "Alegre", "emoji": "😊", "temas": ["louvor", "gratidao"]},
    {"id": "forca", "rotulo": "Preciso de força", "emoji": "💪", "temas": ["forca", "protecao"]},
    {"id": "indeciso", "rotulo": "Indeciso", "emoji": "🤔", "temas": ["sabedoria", "esperanca"]},
    {"id": "irritado", "rotulo": "Irritado", "emoji": "😤", "temas": ["paz", "sabedoria"]},
]


def montar_cartas(base):
    cartas, vistos = [], set()
    for livro, cap, v1, v2, temas, pop in CARTAS:
        cid = "%s%d-%d" % (livro, cap, v1)
        assert cid not in vistos, cid
        vistos.add(cid)
        vs = base[livro]["capitulos"][cap - 1]["versiculos"]
        texto = texto_da_carta(RECORTES.get((livro, cap, v1)) or " ".join(vs[v1 - 1:v2]))
        ref = "%s %d:%d" % (base[livro]["nome"], cap, v1) + ("-%d" % v2 if v2 != v1 else "")
        cartas.append({"id": cid, "livro": livro, "ref": ref, "cap": cap, "temas": temas, "texto": texto, "pop": pop})
    return cartas


def js(nome, valor):
    return "window.%s = %s;\n" % (nome, json.dumps(valor, ensure_ascii=False, indent=2))


def main():
    base = carregar(sys.argv[1])
    completo = {"fonte": FONTE, "licenca": LICENCA, "credito": CREDITO,
                "livros": [dict(id=k, **base[k]) for k, _, _ in LIVROS]}
    os.makedirs(os.path.join(RAIZ, "dados"), exist_ok=True)
    with open(os.path.join(RAIZ, "dados", "salmos-proverbios.json"), "w", encoding="utf-8") as f:
        json.dump(completo, f, ensure_ascii=False, indent=1)

    compacto = {k: {"nome": base[k]["nome"], "caps": [[c["titulo"], c["versiculos"]] for c in base[k]["capitulos"]]}
                for k, _, _ in LIVROS}
    with open(os.path.join(RAIZ, "biblia.js"), "w", encoding="utf-8") as f:
        f.write("// Salmos e Provérbios completos. %s\n// Gerado por ferramentas/gerar-base.py; não editar à mão.\n" % CREDITO)
        f.write("window.BIBLIA = " + json.dumps(compacto, ensure_ascii=False, separators=(",", ":")) + ";\n")

    cartas = montar_cartas(base)
    pop = {c["id"]: c.pop("pop") for c in cartas}
    with open(os.path.join(RAIZ, "verses.js"), "w", encoding="utf-8") as f:
        f.write("// Cartas do Toque Sagrado: versículos de Salmos e Provérbios, com tema.\n")
        f.write("// %s\n// Gerado por ferramentas/gerar-base.py; para mudar as cartas, edite a lista CARTAS lá.\n" % CREDITO)
        f.write("window.VERSES = [\n" + ",\n".join("  " + json.dumps(c, ensure_ascii=False) for c in cartas) + "\n];\n\n")
        f.write("// Popularidade (3 = mais lido): Bible Gateway 2024/2025, YouVersion 2024, Logos 2024, topverses.com.\n")
        f.write("window.POP = " + json.dumps({k: v for k, v in pop.items() if v > 1}, ensure_ascii=False) + ";\n\n")
        f.write("// Visual de cada tema: cor da camada de raspar, do papel e do destaque.\n" + js("TEMAS", TEMAS) + "\n")
        f.write("// Humor do dia -> temas que ele puxa.\n" + js("HUMORES", HUMORES))

    n = {k: sum(len(c["versiculos"]) for c in base[k]["capitulos"]) for k in base}
    print("versículos:", n, "| cartas:", len(cartas), {k: sum(c["livro"] == k for c in cartas) for k in base})
    for c in cartas:
        if len(c["texto"]) > 170:
            print("LONGA", len(c["texto"]), c["ref"], c["texto"])


if __name__ == "__main__":
    main()
