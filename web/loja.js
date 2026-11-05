// Loja: anúncio premiado (AdMob) e compras (RevenueCat) no app das lojas.
// No navegador (link de teste) tudo é simulado, para dar para testar o fluxo inteiro.
(function () {
  "use strict";

  // Preencher quando as contas existirem. Os anúncios usam os IDs de teste do Google até lá.
  var CONFIG = {
    revenuecat: { ios: "", android: "" },          // chaves públicas do projeto no RevenueCat (appl_..., goog_...)
    admob: {
      ios: "ca-app-pub-3940256099942544/1712485313",     // anúncio premiado de teste (Google)
      android: "ca-app-pub-3940256099942544/5224354917"  // anúncio premiado de teste (Google)
    },
    anunciosDeTeste: true,                         // false só quando os IDs reais estiverem acima
    direito: "premium",                            // entitlement no RevenueCat
    pacotesPremium: "default",                     // offering com anual, vitalício e mensal
    pacotesOferta: "ofertas"                       // offering com as três ofertas (consumíveis)
  };

  // Preços de exemplo para o modo navegador; no app vêm da loja, já na moeda da pessoa.
  var SIMULADO = {
    premium: [
      { id: "anual", titulo: "Anual", preco: "R$ 49,90", detalhe: "7 dias grátis, depois R$ 49,90 por ano", destaque: true },
      { id: "vitalicio", titulo: "Vitalício", preco: "R$ 89,90", detalhe: "Pagamento único" },
      { id: "mensal", titulo: "Mensal", preco: "R$ 7,90", detalhe: "Por mês" }
    ],
    oferta: [
      { id: "oferta_pequena", titulo: "Oferta", preco: "R$ 4,90" },
      { id: "oferta_media", titulo: "Oferta", preco: "R$ 9,90" },
      { id: "oferta_grande", titulo: "Oferta", preco: "R$ 19,90" }
    ]
  };

  var Cap = window.Capacitor;
  var nativo = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var plataforma = nativo ? Cap.getPlatform() : "web";
  var AdMob = nativo && Cap.Plugins.AdMob;
  var Purchases = nativo && Cap.Plugins.Purchases;
  // Sem chave do RevenueCat (APK de teste), as compras são simuladas como no navegador.
  var simulada = !Purchases || !CONFIG.revenuecat[plataforma];
  // No app das lojas sem chave do RevenueCat, o Premium fica escondido (versão 1 grátis, só com anúncios).
  // A loja da Apple recusa compra simulada. No navegador a simulação continua para testar.
  var vendas = !nativo || !simulada;
  var CHAVE = "toque-premium";
  var premium = false;
  try { premium = localStorage.getItem(CHAVE) === "1"; } catch (e) { /* sem armazenamento */ }
  var aoMudar = [];
  var pacotes = { premium: [], oferta: [] };

  function definirPremium(sim) {
    sim = !!sim;
    try { localStorage.setItem(CHAVE, sim ? "1" : "0"); } catch (e) { /* sem armazenamento */ }
    if (sim === premium) return;
    premium = sim;
    aoMudar.forEach(function (f) { f(premium); });
  }
  function lerCliente(info) {
    var c = info && (info.customerInfo || info);
    definirPremium(!!(c && c.entitlements && c.entitlements.active && c.entitlements.active[CONFIG.direito]));
  }
  function converter(lista, destaque) {
    return (lista || []).map(function (p) {
      var prod = p.product || {};
      return { id: p.identifier, titulo: prod.title || p.identifier, preco: prod.priceString || "", detalhe: prod.description || "",
        destaque: p.identifier === destaque, pacote: p };
    });
  }

  // ---------- início ----------
  function iniciar() {
    if (!nativo) return Promise.resolve();
    var passos = [];
    if (AdMob) {
      passos.push(
        // formulário de consentimento (quando a lei exige) antes de iniciar os anúncios;
        // o aviso de rastreamento da Apple só aparece quando a pessoa escolhe assistir ao primeiro anúncio
        Promise.resolve()
          .then(function () { return AdMob.requestConsentInfo ? AdMob.requestConsentInfo() : null; })
          .then(function (c) { if (c && c.isConsentFormAvailable && c.status === "REQUIRED") return AdMob.showConsentForm(); })
          .catch(function () {})
          .then(function () { return AdMob.initialize({ initializeForTesting: CONFIG.anunciosDeTeste }); })
          .catch(function () {})
      );
    }
    if (!simulada) {
      passos.push(
        Purchases.configure({ apiKey: CONFIG.revenuecat[plataforma] })
          .then(function () { return Purchases.getCustomerInfo(); }).then(lerCliente)
          .then(function () { return Purchases.getOfferings(); })
          .then(function (o) {
            var todos = (o && o.all) || {};
            var p = todos[CONFIG.pacotesPremium] || (o && o.current);
            var f = todos[CONFIG.pacotesOferta];
            if (p) pacotes.premium = converter(p.availablePackages, "$rc_annual");
            if (f) pacotes.oferta = converter(f.availablePackages);
          })
          .catch(function () {})
      );
      if (Purchases.addCustomerInfoUpdateListener) Purchases.addCustomerInfoUpdateListener(lerCliente);
    }
    return Promise.all(passos);
  }

  // ---------- anúncio premiado ----------
  // Resolve true só se a pessoa assistiu até o fim e ganhou a carta.
  // A Apple pede o aviso de rastreamento perto do anúncio, não ao abrir o app. O sistema só mostra uma vez.
  function pedirRastreamento() {
    if (plataforma !== "ios" || !AdMob.requestTrackingAuthorization) return Promise.resolve();
    return AdMob.requestTrackingAuthorization().catch(function () {});
  }
  function assistirAnuncio() {
    if (!nativo || !AdMob) return anuncioSimulado();
    return pedirRastreamento().then(function () { return mostrarAnuncio(); });
  }
  function mostrarAnuncio() {
    return new Promise(function (ok) {
      var ganhou = false, ouvintes = [];
      function fim(r) {
        ouvintes.forEach(function (o) { o.then ? o.then(function (h) { h.remove(); }) : o.remove(); });
        ok(r);
      }
      ouvintes.push(AdMob.addListener("onRewardedVideoAdReward", function () { ganhou = true; }));
      ouvintes.push(AdMob.addListener("onRewardedVideoAdDismissed", function () { fim(ganhou); }));
      ouvintes.push(AdMob.addListener("onRewardedVideoAdFailedToLoad", function () { fim(false); }));
      AdMob.prepareRewardVideoAd({ adId: CONFIG.admob[plataforma], isTesting: CONFIG.anunciosDeTeste })
        .then(function () { return AdMob.showRewardVideoAd(); })
        .then(function () { ganhou = true; })
        .catch(function () { fim(false); });
    });
  }
  function anuncioSimulado() {
    return new Promise(function (ok) {
      var d = document.createElement("div");
      d.className = "anuncio-simulado";
      d.innerHTML = '<div><strong>Anúncio de teste</strong><p>No app das lojas, aqui passa um anúncio de verdade.</p><span>5</span>' +
        '<button class="link">Fechar sem ganhar</button></div>';
      document.body.appendChild(d);
      var n = 5, t = setInterval(function () {
        n--; d.querySelector("span").textContent = n;
        if (n <= 0) { clearInterval(t); d.remove(); ok(true); }
      }, 1000);
      d.querySelector("button").onclick = function () { clearInterval(t); d.remove(); ok(false); };
    });
  }

  // ---------- compras ----------
  function produtos(tipo) {
    if (simulada) return SIMULADO[tipo];
    return pacotes[tipo];
  }
  // Resolve true se a compra deu certo; false se a pessoa desistiu.
  function comprar(item) {
    if (simulada) {
      return new Promise(function (ok) {
        var sim = window.confirm("Compra simulada (versão de teste): " + item.titulo + " por " + item.preco + ". Confirmar?");
        if (sim && /^oferta/.test(item.id) === false) definirPremium(true);
        ok(sim);
      });
    }
    if (!item.pacote) return Promise.resolve(false);
    return Purchases.purchasePackage({ aPackage: item.pacote })
      .then(function (r) { lerCliente(r); return true; })
      .catch(function (e) {
        // código 1 = a pessoa cancelou na tela da loja
        if (e && (e.userCancelled || String(e.code) === "1")) return false;
        throw e;
      });
  }
  function restaurar() {
    if (simulada) return Promise.resolve(premium);
    return Purchases.restorePurchases().then(function (r) { lerCliente(r); return premium; });
  }
  // gerenciar ou cancelar a assinatura fica na loja; o link abre a página certa de cada sistema
  function linkAssinaturas() {
    return plataforma === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions";
  }

  window.LOJA = {
    nativo: nativo,
    plataforma: plataforma,
    simulada: simulada,
    vendas: vendas,
    iniciar: iniciar,
    premium: function () { return premium; },
    aoMudar: function (f) { aoMudar.push(f); },
    assistirAnuncio: assistirAnuncio,
    produtos: produtos,
    comprar: comprar,
    restaurar: restaurar,
    linkAssinaturas: linkAssinaturas,
    // só para o link de teste e o APK de teste
    simularPremium: function (sim) { if (simulada) definirPremium(sim); }
  };
})();
