# Base de Salmos e Provérbios

- **Fonte:** Bíblia Livre (BLIVRE), licença Creative Commons Atribuição 3.0 Brasil (CC BY 3.0 BR). Pode ser usada em app comercial, desde que o crédito apareça. O app mostra o crédito na tela da coleção e no leitor do capítulo.
- **Origem do arquivo:** `formats/json/PorBLivre.json` de github.com/scrollmapper/bible_databases (commit 59b18c5, 24/10/2026).
- **salmos-proverbios.json:** todos os versículos. Salmos tem 150 capítulos e 2461 versículos. Provérbios tem 31 capítulos e 915 versículos. Os títulos dos Salmos (por exemplo "Salmo de Davi") ficam no campo `titulo`. As letras hebraicas do Salmo 119 foram tiradas do texto.
- **../biblia.js:** a mesma base, em formato compacto, para o leitor dentro do app.
- **../verses.js:** as 331 cartas (252 de Salmos e 79 de Provérbios), com temas e popularidade.
- **Para mudar as cartas:** edite a lista `CARTAS` (e `RECORTES`) em `../ferramentas/gerar-base.py` e rode `python3 gerar-base.py PorBLivre.json`.
- **Ajustes feitos no texto:** correções de digitação da fonte (lista `CORRECOES`). Nas cartas também saem "(Selá)" e conectivos iniciais como "E", "Porque" e "Pois", e 22 versículos longos foram recortados (lista `RECORTES`).
