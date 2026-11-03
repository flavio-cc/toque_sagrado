# Produtos e assinaturas na Google Play — passo a passo

Registro de como cadastrar as assinaturas e os produtos do Toque Sagrado no Play Console
(app `com.toquesagrado.app`, nome na loja "Toque Sagrado: Versículos"). Os IDs abaixo são os que o
`web/loja.js` e o RevenueCat esperam: **não mude nenhum ID**, a Play não deixa alterar nem reaproveitar.

## Situação

| ID | Tipo | Plano base / oferta | Preço (BRL) | Situação |
| --- | --- | --- | --- | --- |
| `premium_anual` | Assinatura | plano `anual` (anual, renovação automática) + oferta `teste-gratis-7d` | 49,90 | Ativo, oferta ativa |
| `premium_mensal` | Assinatura | plano `mensal` (mensal, renovação automática) | 7,90 | Ativo |
| `premium_vitalicio` | Produto único, não consumível | opção de compra `vitalicio` (Comprar) | 89,90 | Ativo |
| `oferta_pequena` | Produto único, consumível | opção de compra `pequena` (Comprar) | 4,90 | Ativo |
| `oferta_media` | Produto único, consumível | opção de compra `media` (Comprar) | 9,90 | Ativo |
| `oferta_grande` | Produto único, consumível | opção de compra `grande` (Comprar) | 19,90 | Ativo |

Cadastrados em 03/11/2026. Todos ficaram disponíveis em 174–178 países e regiões, com preços convertidos
automaticamente pela Play a partir do valor em BRL.

Todas entram no entitlement `premium` do RevenueCat, exceto as três ofertas (consumíveis, só doação, sem
liberar nada). Offerings do RevenueCat: `default` (anual, mensal, vitalício) e `ofertas` (as três ofertas).

## Antes de começar

- O app precisa ter pelo menos uma versão enviada a alguma faixa (já feito: teste interno, versão 10038).
  Sem isso, a página de produtos fica bloqueada.
- O perfil de pagamentos (comerciante) precisa estar ativo: Play Console > Configurações > Perfil de pagamentos.
- A conta está no Canadá, então a moeda padrão dos diálogos de preço é **CAD**. Sempre troque para **BRL**.
- O painel do navegador do Claude é estreito: alguns menus abrem como "folha" no rodapé e escondem opções.
  Se um menu parecer ter só uma opção, role a página para o campo ficar no alto da tela e abra de novo.

## 1. Assinatura anual (`premium_anual`) — feita

1. Monetizar com a Play > Produtos > **Assinaturas** > **Criar assinatura**.
2. ID do produto: `premium_anual`. Nome: `Toque Sagrado Premium Anual`. **Criar**.
3. Na página da assinatura: **Adicionar plano base**.
   - ID do plano base: `anual`.
   - Tipo: **Renovação automática**. Período de faturamento: **Anual** (fica no fim da lista; role o menu).
   - Período de carência: deixe o sugerido (14 dias). Retenção de conta: automática.
   - Mudanças de plano: "Cobrar na próxima data de faturamento". Reassinar: Permitir.
4. Preço e disponibilidade > **Definir preços**:
   - Marque a caixa do cabeçalho (seleciona as 178 regiões) > **Definir preço**.
   - Moeda **BRL**, valor `49.90` > **Atualizar**. A Play converte para as outras moedas.
   - A Play "arredonda" o Brasil para 49,99. Busque "Brazil" no campo de busca (Enter), clique no lápis
     da linha, apague e digite `49.90` > **Salvar**.
5. **Salvar** (fica como rascunho) e depois **Ativar**. Status: Ativo.
6. Teste grátis: volte à assinatura > **Adicionar oferta** > plano `anual` > **Adicionar oferta**.
   - ID da oferta: `teste-gratis-7d`.
   - Critério de qualificação: **Aquisição de novos clientes** (está dentro do submenu "Novos e atuais
     assinantes") > Direito: **Nunca teve esta assinatura**.
   - **Adicionar fase** > Tipo **Teste gratuito** > Duração `7` **Dias** > **Aplicar**.
   - **Salvar** e depois **Ativar**.

## 2. Assinatura mensal (`premium_mensal`) — feita

1. Assinaturas > **Criar assinatura**. ID: `premium_mensal`. Nome: `Toque Sagrado Premium Mensal`. **Criar**.
2. **Adicionar plano base**: ID `mensal`, **Renovação automática**, período **Mensal** (já vem marcado),
   carência sugerida (7 dias).
3. Definir preços para todas as regiões em BRL `7.90`; confira o Brasil e corrija para 7,90 se vier arredondado.
4. **Salvar** > **Ativar**. Sem oferta de teste grátis (o teste fica só no anual).

## 3. Produtos únicos (vitalício e ofertas) — feitos

Na Play nova não existe mais a escolha "consumível / não consumível" no cadastro: todo produto único é igual
lá. Quem decide é o app: o vitalício nunca é "consumido" (fica para sempre), e as ofertas são consumidas
logo após a compra para poderem ser compradas de novo. O RevenueCat faz isso sozinho quando o produto não
está ligado a nenhum entitlement (ofertas) e o marca como não consumível quando está (vitalício).

Passo a passo, igual para os quatro:

1. Monetizar com a Play > Produtos > **Produtos únicos** > **Criar produto único**.
2. Etapa 1, detalhes do produto: ID, nome e descrição (tabela abaixo). A descrição precisa de 50+ caracteres
   para aparecer em todas as vitrines da Play. Ícone: opcional (não enviado). **Próximo**.
3. Etapa 2, opção de compra: ID da opção (tabela), tipo **Comprar** (Buy). A primeira opção fica marcada
   como "compatível com versões anteriores", que é a que o RevenueCat e a biblioteca de faturamento usam.
4. Disponibilidade e preços > **Definir preços** (seta) > **Editar preços em massa** > marque a caixa do
   cabeçalho (todas as regiões) > **Continuar** > moeda **BRL** > valor > **Aplicar**.
   - O campo de valor às vezes ignora a primeira digitação logo após trocar a moeda: confira e digite de novo.
5. Busque "Brazil", clique no lápis do preço e corrija o arredondamento da Play (veja abaixo) > **Salvar**.
6. **Ativar**.

| ID | Opção | Nome | Descrição | Preço |
| --- | --- | --- | --- | --- |
| `premium_vitalicio` | `vitalicio` | Toque Sagrado Premium Vitalício | Acesso Premium para sempre com um único pagamento, sem renovação e sem limites diários. | 89,90 |
| `oferta_pequena` | `pequena` | Oferta pequena | Uma oferta de carinho para apoiar o Toque Sagrado e ajudar a manter o app no ar. | 4,90 |
| `oferta_media` | `media` | Oferta média | Uma oferta para ajudar a manter o Toque Sagrado e levar a Palavra a mais pessoas. | 9,90 |
| `oferta_grande` | `grande` | Oferta generosa | Uma oferta generosa para levar o Toque Sagrado mais longe e manter o app no ar. | 19,90 |

Evite "prêmio", "sorte" e "raspadinha" nos nomes e descrições (regra da loja do projeto).

## 4. Arredondamento de preço da Play

Ao definir o preço em massa, a Play "arredonda" para um valor terminado em 9 também no Brasil. Aconteceu em
todos os seis: 49,90→49,99; 7,90→7,99; 89,90→89,99; 4,90→4,89; 9,90→9,99; 19,90→19,99. Em todos, o Brasil
foi corrigido à mão para o valor certo. Os outros países ficaram com o valor convertido pela Play (por exemplo,
anual: US$ 8,99, CA$ 12,99, € 9,99). Para mudar um preço depois: abra o produto ou o plano base, procure o
país e edite pelo lápis. Mudar o preço de uma assinatura não afeta quem já assina, a menos que você escolha
migrar os assinantes.

## 5. RevenueCat — feito em 03/11/2026, menos a conta de serviço

- Projeto **Toque Sagrado**, app Play Store **Toque Sagrado (Android)**, pacote `com.toquesagrado.app`.
- Produtos cadastrados à mão (a importação automática precisa da conta de serviço):
  `premium_anual:anual` e `premium_mensal:mensal` (assinaturas), `premium_vitalicio` (não consumível),
  `oferta_pequena`, `oferta_media` e `oferta_grande` (consumíveis).
- Entitlement `premium` ligado a anual, mensal e vitalício. As ofertas não liberam nada.
- Offering `default` com os pacotes `$rc_annual`, `$rc_lifetime` e `$rc_monthly`, nessa ordem. O app destaca o
  `$rc_annual`.
- Offering `ofertas` com os pacotes `oferta_pequena`, `oferta_media` e `oferta_grande`.
- A chave pública `goog_...` está em `web/loja.js` (a partir da 1.0.39). Ela foi feita para ficar no app; as
  chaves **secretas** do RevenueCat nunca vão para o repositório.
- Falta: conta de serviço do Google Cloud com acesso ao Play Console, e o envio do arquivo `.json` em
  RevenueCat > Apps > Toque Sagrado (Android) > Service Account Credentials JSON. Quem baixa e envia o
  arquivo é o dono da conta; ele é secreto e não vai para o repositório. Sem isso, o RevenueCat não confirma
  as compras.

## 6. Depois do cadastro

1. Conta de serviço (item acima).
2. Trocar em `web/loja.js` os IDs de anúncio de teste pelos reais e subir a versão em `web/versao.js`.
   Cadastrar o segredo `ADMOB_APP_ID` no GitHub.
3. **Teste de licença**: Play Console > Configurações > Teste de licença, incluir as contas da lista
   "htd teste" para comprar sem cobrança real.
4. Testar compra de cada produto no app instalado pelo teste interno.
