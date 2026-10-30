# Toque Sagrado para as lojas (Capacitor)

Este projeto empacota a web app da pasta `web/` deste repositório como app de iPhone e Android.
O código do app continua todo em `web/`; aqui ficam só a configuração e os projetos nativos.

## Montar no seu computador

Precisa de Node 20+, Android Studio (para Android) e um Mac com Xcode (para iPhone).

    npm install
    npm run sync        # copia a web app para www/ e atualiza android/ e ios/
    npm run android     # abre no Android Studio
    npm run ios         # abre no Xcode (só no Mac)

## Antes de publicar: trocar os IDs de teste

| Onde | O que trocar |
| --- | --- |
| `web/loja.js` (CONFIG) | chaves públicas do RevenueCat (iOS e Android), IDs do anúncio premiado do AdMob, `anunciosDeTeste: false` |
| `android/app/src/main/AndroidManifest.xml` | `APPLICATION_ID` do AdMob (app Android) |
| `ios/App/App/Info.plist` | `GADApplicationIdentifier` do AdMob (app iOS) e a lista completa de SKAdNetwork do Google |

## Produtos para cadastrar (App Store Connect, Google Play e RevenueCat)

| ID do produto | Tipo | Preço sugerido |
| --- | --- | --- |
| premium_anual | Assinatura anual, 7 dias grátis | R$ 49,90 |
| premium_mensal | Assinatura mensal | R$ 7,90 |
| premium_vitalicio | Compra única (não consumível) | R$ 89,90 |
| oferta_pequena / oferta_media / oferta_grande | Consumível | R$ 4,90 / 9,90 / 19,90 |

No RevenueCat: entitlement `premium` ligado aos três produtos premium; offering `default` com os pacotes anual, mensal e vitalício; offering `ofertas` com as três ofertas.

No AdMob: um app para cada sistema e um bloco de anúncio do tipo "Premiado" em cada. Bloquear as categorias sensíveis (apostas, namoro, bebida, astrologia, política).
