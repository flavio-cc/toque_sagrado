# Publicar o Toque Sagrado na Google Play (com monetização)

Passo a passo para o Flavio. O que é código já está pronto no repositório; o que falta são contas, cadastros e
segredos, que só o dono das contas pode fazer. Siga na ordem: cada etapa usa o que a anterior gera.

| # | Etapa | Onde | Gera |
| --- | --- | --- | --- |
| 1 | Conta de desenvolvedor | play.google.com/console | Acesso ao Play Console |
| 2 | Chave de envio | Seu computador | `envio.jks` + senhas (segredos do GitHub) |
| 3 | Política de privacidade e app-ads.txt | GitHub Pages (pasta `docs/`) | URL da política |
| 4 | App e perfil de pagamentos | Play Console | App `com.toquesagrado.app` |
| 5 | Produtos e assinaturas | Play Console | `premium_*` e `oferta_*` |
| 6 | RevenueCat | app.revenuecat.com | Chave `goog_...` |
| 7 | AdMob | admob.google.com | ID do app e do bloco premiado |
| 8 | Trocar os IDs de teste | `web/loja.js` + segredos | App pronto para a loja |
| 9 | Primeiro envio e teste fechado | GitHub Actions + Play Console | 12 testadores por 14 dias |
| 10 | Produção | Play Console | App publicado |

## 1. Conta de desenvolvedor

- Crie em play.google.com/console com a conta Google que vai ser dona do app. Taxa única de US$ 25.
- Escolha **conta pessoal** (ou organização, se tiver CNPJ e D-U-N-S). A Google pede documento e verificação do celular.
- Conta pessoal nova precisa de **teste fechado com pelo menos 12 testadores por 14 dias seguidos** antes de liberar
  produção (etapa 9). Já vá juntando 12+ pessoas com conta Google (família, igreja, amigos).

## 2. Chave de envio (upload key)

A Google assina o app final (Play App Signing); você só assina o envio. Gere uma vez, guarde em lugar seguro
(pendrive + nuvem pessoal) e **nunca coloque no repositório** (o `.gitignore` já bloqueia `*.jks`).

No PowerShell, numa pasta fora do repositório (o `keytool` vem com o Java):

    keytool -genkeypair -v -keystore envio.jks -alias envio -keyalg RSA -keysize 4096 -validity 10000

Ele pede uma senha e seus dados (nome, cidade, "BR"). Depois converta para texto:

    [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\envio.jks")) | Set-Clipboard

No GitHub: repositório > Settings > Secrets and variables > Actions > New repository secret:

| Segredo | Valor |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | o texto copiado acima |
| `ANDROID_KEYSTORE_SENHA` | a senha do keystore |
| `ANDROID_KEY_ALIAS` | `envio` |
| `ANDROID_KEY_SENHA` | a senha da chave (a mesma, se você só apertou Enter) |

## 3. Política de privacidade e app-ads.txt

A política fica no GitHub Pages, servida da pasta `docs/`:

- GitHub > repositório > Settings > Pages > Source "Deploy from a branch", branch com a pasta `docs/`, `/docs`.
  O endereço fica **https://flavio-cc.github.io/toque_sagrado/privacidade.html** (é o link que o app abre no Premium).
- Crie a caixa de e-mail **app@toquesagrado.com** na Hostinger (a política cita esse e-mail) ou troque o e-mail no arquivo.
- O `app-ads.txt` do AdMob precisa ficar na raiz do domínio do site informado na Play (toquesagrado.com, na
  Hostinger). Depois da etapa 7, crie-o lá com a linha que o AdMob mostrar, no formato
  `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`.

## 4. Criar o app no Play Console

- Criar app: nome **Toque Sagrado**, idioma português (Brasil), **App**, **Gratuito**.
- Configurações > Perfil de pagamentos: crie o perfil de comerciante (dados bancários). Sem ele não dá para vender.
- Painel > "Configurar o app", responda tudo:

| Item | Resposta |
| --- | --- |
| Política de privacidade | https://flavio-cc.github.io/toque_sagrado/privacidade.html |
| Acesso ao app | Todas as funções disponíveis sem login |
| Anúncios | **Sim, contém anúncios** |
| Classificação de conteúdo | Categoria "Todos os outros tipos de app"; tudo Não, exceto compra de bens digitais: Sim (feito: Brasil 14+, demais Livre/3+) |
| Público-alvo | 13 anos ou mais (não marque menores de 13: evita as regras do programa Famílias) |
| App de notícias | Não |
| Segurança dos dados | Veja a tabela abaixo |
| ID de publicidade | Sim, usado para publicidade |
| Categoria | Livros e referências (ou Estilo de vida) |
| E-mail de contato | app@toquesagrado.com |

Segurança dos dados (Data safety):

| Pergunta | Resposta |
| --- | --- |
| Coleta ou compartilha dados? | Sim |
| Criptografados em trânsito? | Sim |
| Pessoa pode pedir exclusão? | Sim (pelo e-mail de contato) |
| Identificadores do dispositivo ou outros IDs | Coletado e compartilhado; finalidade: publicidade, análise; opcional não (AdMob) |
| Histórico de compras | Coletado; finalidade: funcionalidade do app (RevenueCat / Play) |
| Interações no app, diagnóstico | Coletado pelo AdMob; publicidade, análise |
| Local, contatos, fotos, áudio, dados pessoais | Não |

## 5. Produtos e assinaturas

Monetizar > Produtos. O Play Console só libera esta tela depois que um AAB com a permissão de cobrança for enviado
(etapa 9, faixa de teste interno). Se a tela estiver bloqueada, faça o primeiro envio interno e volte aqui.

| ID | Tipo no Play | Configuração |
| --- | --- | --- |
| `premium_anual` | Assinatura | Plano base `anual`, renovação automática anual, R$ 49,90. Oferta: teste grátis de 7 dias, para novos assinantes |
| `premium_mensal` | Assinatura | Plano base `mensal`, renovação mensal, R$ 7,90 |
| `premium_vitalicio` | Produto no app (não consumível) | R$ 89,90 |
| `oferta_pequena` | Produto no app | R$ 4,90 |
| `oferta_media` | Produto no app | R$ 9,90 |
| `oferta_grande` | Produto no app | R$ 19,90 |

Nomes e descrições: evite "raspadinha", "prêmio", "sorte". Ex.: "Premium anual: cartas extras ilimitadas e sem anúncios".

## 6. RevenueCat

- Crie conta em app.revenuecat.com, projeto "Toque Sagrado", app Google Play com pacote `com.toquesagrado.app`.
- Ligue o RevenueCat ao Play: siga o guia deles para criar a **conta de serviço** no Google Cloud e dar acesso no
  Play Console (Usuários e permissões). Esse JSON também serve para o envio automático (etapa 9).
- Products: importe os seis IDs. Entitlement `premium` com `premium_anual`, `premium_mensal`, `premium_vitalicio`.
- Offerings: `default` (atual) com os pacotes anual, mensal e vitalício; `ofertas` com as três ofertas.
- Copie a **chave pública do Google** (`goog_...`) em Project settings > API keys.

## 7. AdMob

- admob.google.com > Apps > Adicionar app > Android > já publicado? "Não" por enquanto.
- Configurações do app: anote o **ID do app** (`ca-app-pub-...~...`).
- Blocos de anúncios > **Premiado** (recompensa: 1 carta). Anote o **ID do bloco** (`ca-app-pub-.../...`).
- Privacidade e mensagens: crie a mensagem de consentimento (GDPR/LGPD); o app já mostra o formulário.
- Controles de bloqueio > categorias sensíveis: bloqueie apostas, namoro, bebidas alcoólicas, astrologia/esoterismo,
  política e religião (concorrentes ou contrárias).
- Ligue o pagamento do AdMob (dados fiscais e bancários).

## 8. Trocar os IDs de teste

Peça ao Claude ("troque os IDs de teste pelos reais") ou faça você, num commit só, subindo a versão em `web/versao.js`:

- `web/loja.js` (CONFIG): `revenuecat.android` = `goog_...`; `admob.android` = ID do bloco premiado;
  `anunciosDeTeste: false`. (As chaves do RevenueCat e IDs do AdMob são públicos por natureza; podem ficar no código.)
- Segredo do GitHub `ADMOB_APP_ID` = ID do app AdMob (`...~...`). O `build.gradle` coloca no manifesto.
- Confira `MODO_TESTE = false` em `web/app.js`.

O workflow **Android Play** recusa montar o AAB se algo disso ainda estiver com valor de teste.

## 9. Primeiro envio e teste fechado

1. Com os 4 segredos da chave cadastrados, todo push no branch `google-play` que mexa em `web/` ou `app/` gera o AAB
   da faixa `internal` (com os IDs de teste, se os reais ainda não existirem). Baixe em Actions > **Android Play** >
   a execução mais recente > artefato `toque-sagrado-play-aab`. (O botão Run workflow só aparece quando o arquivo do
   workflow estiver no `main`; até lá, uma execução que falhou pode ser repetida com "Re-run jobs".)
2. O **primeiro** AAB precisa ir pelo site: Play Console > Testar e lançar > Teste interno > Criar versão > enviar o
   `.aab`. Aceite o Play App Signing. Adicione seu e-mail como testador e instale pelo link de teste.
3. Teste no celular: compra de assinatura com a conta de teste de licença (Configurações > Teste de licença: inclua
   seu e-mail, aí a compra não cobra de verdade), restaurar compras, anúncio premiado, compartilhar.
4. Teste fechado (faixa `alpha`): crie a lista com os 12+ testadores, publique a versão e peça que instalem e
   **mantenham o app instalado por 14 dias**. Use o app de verdade nesse período e corrija o que aparecer.
5. Opcional, envio automático: crie o segredo `PLAY_SERVICE_ACCOUNT_JSON` com o JSON da conta de serviço (com
   permissão de "Lançar apps"). A partir daí o workflow já envia para a faixa escolhida.

Cada novo envio precisa de versão maior em `web/versao.js` (ela vira o `versionCode`).

## 10. Produção

- Depois dos 14 dias, o Play Console libera "Solicitar acesso à produção" (perguntas sobre o teste). A análise leva
  alguns dias.
- Ficha da loja (Crescimento > Presença na loja) com os textos abaixo, ícone 512x512 (`web/icon-512.png`),
  imagem de destaque 1024x500 e de 2 a 8 capturas de tela de celular (9:16).
- Produção > Criar versão (ou workflow com faixa `production`, que cria um rascunho), lançamento gradual de 20%,
  depois 100%.
- Volte ao AdMob e ligue o app à ficha da Play para o app-ads.txt ser verificado.

## Textos da ficha da loja

**Nome (30):** Toque Sagrado: Versículos

**Descrição curta (80):** Revele um versículo de Salmos ou Provérbios por dia, com imagem e narração.

**Descrição completa:**

    Toque Sagrado é um jeito simples e bonito de começar o dia com a Palavra.

    Toque a carta com o dedo e revele um versículo de Salmos ou Provérbios sobre uma imagem pintada à mão para cada tema: paz, gratidão, força, sabedoria, proteção e muito mais.

    • Uma carta do dia, igual para todos, para meditar junto
    • Cartas extras que aprendem com o que toca o seu coração
    • Narração de cada versículo em português
    • Leia o capítulo inteiro sem sair do app
    • Guarde e favorite na sua Coleção
    • Compartilhe a imagem no Instagram, WhatsApp e Stories
    • Funciona sem internet depois de aberto

    A carta do dia, a narração, a coleção e o compartilhar são grátis para sempre. Com o Premium você tem cartas extras ilimitadas e nenhum anúncio, e ajuda a manter o projeto.

    Texto bíblico: Bíblia Livre (CC BY 3.0 BR).

Palavras a evitar em todos os textos e imagens da loja: raspadinha, prêmio, sorte, sorteio, jogo, ganhar.
