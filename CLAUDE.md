# Toque Sagrado: guia para assistentes de IA

Este arquivo explica o projeto para qualquer IA (Claude, Copilot, Cursor, ChatGPT) que for mexer no código.
`AGENTS.md` aponta para cá. Leia tudo antes da primeira mudança.

## O que é o app

Toque Sagrado (em inglês, SacredTouch) é uma raspadinha de versículos. A pessoa raspa a carta com o dedo e
revela um versículo de Salmos ou Provérbios sobre uma imagem pintada. Não há aposta, prêmio nem sorteio:
o "prêmio" é a frase. Cada dia tem uma carta grátis, a pessoa pode pedir cartas extras, guardar, favoritar,
ouvir a narração, ler o capítulo inteiro e compartilhar a imagem nas redes.

- Dono: Flavio. Ele escreve em português; responda e escreva textos de interface em português do Brasil.
- Público: pessoas cristãs, uso diário, celular. Tom respeitoso, nada de linguagem de cassino.
- Domínio usado na imagem compartilhada: toquesagrado.com.
- Tradução bíblica: **Bíblia Livre (CC BY 3.0 BR)**. O crédito precisa continuar aparecendo na Coleção e no leitor.

## Estrutura do repositório

| Caminho | O que tem |
| --- | --- |
| `web/` | O app inteiro: HTML, CSS e JavaScript puro, sem build, sem framework, sem npm |
| `web/audio/cartas/<id>.mp3` | Narração de cada carta (331 arquivos, voz ElevenLabs) |
| `web/fotos/NN.webp` | 41 imagens pintadas (IA, 1080x1920) usadas como fundo das cartas, 5 ou 6 por tema |
| `web/dados/` | Base completa de Salmos e Provérbios em JSON e o LEIA-ME da fonte |
| `web/ferramentas/` | Scripts Python: gerar a base, narrar, montar o arquivo único de teste |
| `web/logo-opcoes/` | Originais do logo (desenho a lápis do Flavio) e versões tratadas |
| `app/` | Projeto Capacitor 8 que empacota `web/` como app de iPhone e Android |
| `.github/workflows/` | GitHub Actions: APK de teste do Android e compilação do iOS |

### Arquivos de `web/`

| Arquivo | Papel |
| --- | --- |
| `index.html` | Telas e folhas (sheets). Ordem dos scripts importa: `verses.js`, `cena.js`, `loja.js`, `app.js` (o `biblia.js` é carregado sob demanda pelo leitor) |
| `style.css` | Visual "papel e lápis": fundo de papel, dourado, fonte EB Garamond na interface |
| `app.js` | Toda a lógica: estado, escolha do versículo, raspagem, botões, coleção, leitor, compartilhar, limites diários, Premium |
| `cena.js` | Desenha a imagem de cada carta (foto do tema + texto; cenas procedurais em canvas só se a foto falhar) e gera a imagem de compartilhar. Expõe `window.CENA` |
| `verses.js` | **Gerado.** `window.VERSES` (331 cartas), `window.POP` (popularidade), `window.TEMAS`, `window.HUMORES` |
| `biblia.js` | **Gerado.** `window.BIBLIA`: Salmos e Provérbios completos, para o leitor de capítulo |
| `loja.js` | Anúncio premiado (AdMob) e compras (RevenueCat) via Capacitor; no navegador tudo é simulado. Expõe `window.LOJA` |
| `sw.js` | Service worker com cache offline. **Suba a versão de `CACHE` a cada mudança** em arquivos da lista. As fotos entram no cache conforme aparecem |
| `manifest.json`, `icon*`, `apple-touch-icon.png` | PWA e ícones |
| `logo.webp` | Logo mostrado no app |
| `marca.webp` | Marca d'água da imagem compartilhada (só os traços do lápis do logo) |

## Conceitos do código

### Cartas

Cada carta em `window.VERSES`:

    {"id": "sl23-1", "livro": "sl", "ref": "Salmos 23:1", "cap": 23, "temas": ["paz", "protecao"], "texto": "..."}

- `id` = livro + capítulo + versículo (`sl` Salmos, `pv` Provérbios). **Nunca mude ids existentes**: a coleção
  salva no celular das pessoas e os MP3 dependem deles.
- `temas[0]` define cor, cena e nota de personalização. Temas ficam em `window.TEMAS`.
- Para adicionar ou mudar cartas, **não edite `verses.js` à mão**: edite `CARTAS`, `RECORTES` ou `CORRECOES` em
  `web/ferramentas/gerar-base.py` e rode `python3 gerar-base.py PorBLivre.json` (fonte em
  github.com/scrollmapper/bible_databases, `formats/json/PorBLivre.json`). Depois narre as cartas novas (veja Narração).

### Estado (localStorage)

- Chave `salmos-v2` guarda `{colecao, notas, vistos, seq, dia: {data, diaria, extras, anuncios, semente}, humor}`.
- Chave `toque-premium` guarda se a pessoa é Premium (cache; no app quem manda é o RevenueCat).
- Sempre use `try/catch` em volta de localStorage (modo privado do Safari).
- Mudar o formato do estado exige migração; não troque a chave sem motivo.

### Escolha do versículo

- Carta do dia: sai das cartas com `POP >= 2`, escolhida pelo hash da data (igual para todo mundo no mesmo dia).
- Cartas extras: `escolherPersonalizada()` pondera os temas pelo humor escolhido nos chips e pelas notas
  aprendidas com o que a pessoa faz (`PESO`: ouvir 2, ler 3, compartilhar 3, favoritar 2, guardar 1, sair sem
  interagir -1), com 20% de exploração (`EXPLORACAO`) e evitando repetir as já vistas.

### Imagem única por raspada (`cena.js`)

- Cada carta aberta recebe `v.semente` (`novaSemente()` em `app.js`: número aleatório de 32 bits).
  A carta do dia guarda a semente em `estado.dia.semente`; a coleção guarda a semente de cada item.
- Fundo: `FOTOS` em `cena.js` liga cada tema às suas fotos de `web/fotos/`. `fotoDoVerso(v)` usa a semente:
  80% uma foto do tema, 20% qualquer uma das 41 (sem semente, escolhe pelo id). Na foto entram só espelho e zoom;
  o véu escuro se ajusta à claridade da foto. Só as 4 últimas fotos ficam na memória (iPhone).
  As fotos foram geradas pelo Flavio no site da ElevenLabs com os prompts de `imagens-ia/prompts.json` (arquivos do projeto).
  Para trocar ou somar fotos: WebP 1080x1920, número novo em `FOTOS`, e suba a versão do `sw.js`.
- Se a foto não carregar, cai na cena procedural: `variacao(semente)` sorteia com PRNG determinístico: cena (70% das do tema, 30% de `CENAS_EXTRAS`),
  espelho, zoom e recorte, posição do sol ou lua, tinta, neblina, raios, luzes, pássaros, brilhos, grão, vinheta
  e estilo do texto. Mesma semente = mesma imagem. Cartas antigas sem semente usam `NEUTRO` e saem como antes.
- Estilos de texto em uso: `elegante`, `script`, `impacto`. O estilo "vidro" (caixa em volta do texto) foi
  retirado a pedido do Flavio porque atrapalha a marca d'água; não volte com ele.
- Os canvas de rascunho são reaproveitados (`rascunho()`) para não estourar memória no iPhone.

### Compartilhar

- O botão abre a folha `#formato`: Feed 1080x1350 ou Story 1080x1920 (`FORMATOS` em `app.js`).
- `CENA.blob()` gera JPEG qualidade 0.92 (uns 150 KB). Enquanto gera, aparece só a animação de carregando `#preparando` (pedido do Flavio, sem texto).
- Compartilha **só a imagem**, sem texto nem link junto (o Story do Instagram falhava com texto; pedido do Flavio).
  No app usa os plugins Share e Filesystem do Capacitor (o WebView do Android não tem `navigator.share` com
  arquivos); no navegador usa `navigator.share` e, sem ele, mostra a imagem para salvar.
- Regras do Flavio para a imagem compartilhada:
  - **não mostrar o nome do app nem um selo do logo**;
  - a marca d'água são só os traços do logo, brancos e translúcidos (alfa 0.3; escuros com alfa 0.22 em fundo
    claro), grandes, atrás do texto, com a ponta do dedo logo abaixo do versículo;
  - no rodapé, pequeno, "toquesagrado.com" (no Story fica 300 px acima da borda para fugir da barra de resposta).

### Narração

- Botão redondo `#a-ouvir` sobre a imagem da carta: ícone de alto-falante dourado com anel dourado e fundo
  transparente, aparece depois de raspar. Toca `audio/cartas/<id>.mp3`.
- Voz: "Arthur Freeman" da ElevenLabs (`5lrBPYY4YvMbKHTo8kvZ`), modelo `eleven_multilingual_v2`,
  `mp3_44100_64`, speed 1.12 (o Flavio pediu 1,25x o ritmo da amostra).
- Script: `python3 web/ferramentas/narrar.py cartas 5lrBPYY4YvMbKHTo8kvZ [ids...]`. Ele pula cartas que já têm
  MP3. Precisa de `ELEVENLABS_API_KEY` no ambiente (no Claude, a chave vem de um segredo de rede do projeto).
  **Nunca coloque chaves no código nem no repositório.**
- O script troca "SENHOR" por "Senhor" e "DEUS" por "Deus" para a voz não soletrar.

### Limites diários e monetização

- Grátis: a carta do dia + 3 extras por dia (`LIMITE_EXTRAS`) + até 3 por anúncio premiado (`LIMITE_ANUNCIOS`).
- Premium: cartas ilimitadas e sem anúncios. Produtos: `premium_anual` (7 dias grátis), `premium_mensal`,
  `premium_vitalicio`; ofertas consumíveis `oferta_pequena`, `oferta_media`, `oferta_grande`.
  RevenueCat: entitlement `premium`, offerings `default` e `ofertas`.
- `MODO_TESTE = true` em `app.js` libera cartas ilimitadas para testar. Deixe `false` em produção.
- `loja.js` usa os IDs de **teste** do Google AdMob e chaves vazias do RevenueCat até as contas existirem.
  O que trocar antes de publicar está em `app/LEIA-ME.md`.
- Princípios: o versículo nunca é pago; compartilhar é sempre grátis; anúncio só quando a pessoa escolhe assistir.
  Nos textos das lojas evite "raspadinha", "prêmio", "sorte" (soam como jogo de azar).
- Narração de capítulos, temas visuais e widget estão planejados para depois.

## Como testar

- Navegador: `cd web && python3 -m http.server 8000` e abra http://localhost:8000.
- Arquivo único (tudo embutido, para mandar por link): `python3 web/ferramentas/montar-teste.py saida.html`.
  Os áudios ficam de fora e precisam estar em `audio/cartas/` ao lado do HTML; as fotos entram embutidas em 720x1280 (precisa do Pillow).
- Na Coleção, em modo navegador, há o botão "Recomeçar teste do zero" (dois toques) que apaga os dados locais.
- No navegador o anúncio é simulado (5 segundos) e a compra usa `confirm()`. No app, enquanto não houver chave do
  RevenueCat em `loja.js`, as compras também são simuladas (`LOJA.simulada`) e os anúncios são os de teste do Google.
- Teste sempre em largura de celular (390 px) e confira acentos: a fonte Cormorant Garamond posiciona mal
  ê e á, por isso a interface usa EB Garamond.

## Apps das lojas (`app/`)

- Capacitor 8.6, appId `com.toquesagrado.app`, plugins `@capacitor-community/admob`, `@capacitor/share`, `@capacitor/filesystem` (compartilhar a imagem no app) e
  `@revenuecat/purchases-capacitor`, acessados em `loja.js` por `window.Capacitor.Plugins`.
- `npm run sync` (dentro de `app/`) roda `ferramentas/copiar-web.sh`, que copia os arquivos de `web/` para
  `app/www/`, e depois `npx cap sync`. **Se criar um arquivo novo em `web/` que o app usa, inclua-o na lista do
  `copiar-web.sh`** (e na lista do `sw.js`).
- `app/www/`, `node_modules/` e as cópias geradas dentro de `android/` e `ios/` não vão para o git.
- GitHub Actions a cada push em `main` que mexa em `web/` ou `app/`:
  - `android.yml`: gera o APK de teste (artefato `toque-sagrado-android-teste`).
  - `ios.yml`: compila para o simulador sem assinatura. Assinar e enviar ao TestFlight depende da conta
    Apple Developer e de segredos do repositório (certificado, perfil, chave da API), ainda não configurados.

## Regras de trabalho

- Mantenha o estilo do código: JavaScript ES5 dentro de IIFE com `"use strict"`, `var`, nomes e comentários em
  português, sem dependências novas e sem etapa de build em `web/`.
- Depois de mudar qualquer arquivo listado em `sw.js`, suba a versão de `CACHE` (ex.: `toque-sagrado-v35` para
  `v36`), senão quem já instalou continua vendo a versão antiga.
- Logo: é o desenho a lápis do Flavio (mão apontando um versículo num livro aberto) com moldura dourada,
  original em `web/logo-opcoes/logo-final-1024.png`. **Nunca redesenhe nem gere um logo novo**; quando
  precisar de outra versão, trate a imagem original dele (recorte, cor, contraste).
- Textos bíblicos vêm só da Bíblia Livre. Não digite versículos de memória nem misture traduções.
- Não coloque segredos (chaves de API, keystore, certificados) no repositório; use os segredos do GitHub ou do
  ambiente.
- O repositório é **público**: tudo que entra aqui fica visível.
