// Loja: anúncio premiado (AdMob) e compras (RevenueCat) no app das lojas.
// No navegador (link de teste) tudo é simulado, para dar para testar o fluxo inteiro.
(function () {
  "use strict";

  // IDs públicos das contas. Falta a chave iOS do RevenueCat (appl_...).
  var CONFIG = {
    revenuecat: { ios: "", android: "goog_YxOLXwlgaTenLSJEUsNGWYuciZE" },  // chaves públicas do projeto no RevenueCat (appl_..., goog_...)
    admob: {
      ios: "ca-app-pub-4222726497664516/2862928403",     // bloco premiado "Carta extra" (iOS)
      android: "ca-app-pub-4222726497664516/8433598094"  // bloco premiado "Carta extra" (Android)
    },
    anunciosDeTeste: false,                        // true volta aos modos de teste do AdMob e mostra diagnósticos
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
  var anunciosProntos = null;  // promessa do consentimento e do AdMob.initialize; o anúncio espera por ela

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
  // Nomes curtos nossos no lugar do título da loja (a Play manda "Nome (Nome do app)").
  var NOMES = {
    "$rc_annual": { titulo: "Anual", detalhe: "Por ano" },
    "$rc_lifetime": { titulo: "Vitalício", detalhe: "Pagamento único" },
    "$rc_monthly": { titulo: "Mensal", detalhe: "Por mês" }
  };
  // dias do período grátis da assinatura (7 no anual), lidos da loja; 0 se não houver
  function diasGratis(prod) {
    var f = prod.defaultOption && prod.defaultOption.freePhase, p = f && f.billingPeriod;
    if (p) return p.value * (p.unit === "WEEK" ? 7 : p.unit === "MONTH" ? 30 : p.unit === "DAY" ? 1 : 0);
    var i = prod.introPrice;
    if (i && i.price === 0) return i.periodNumberOfUnits * (i.periodUnit === "WEEK" ? 7 : i.periodUnit === "MONTH" ? 30 : i.periodUnit === "DAY" ? 1 : 0);
    return 0;
  }
  function converter(lista, destaque) {
    return (lista || []).map(function (p) {
      var prod = p.product || {}, nome = NOMES[p.identifier], preco = prod.priceString || "";
      var titulo = nome ? nome.titulo : (prod.title || p.identifier).replace(/\s*\([^)]*\)\s*$/, "");
      var detalhe = nome ? nome.detalhe : "";
      var dias = diasGratis(prod);
      if (dias && p.identifier === "$rc_annual") detalhe = dias + " dias grátis, depois " + preco + " por ano";
      else if (dias) detalhe = dias + " dias grátis";
      return { id: p.identifier, titulo: titulo, preco: preco, detalhe: detalhe, destaque: p.identifier === destaque, pacote: p };
    });
  }

  // ---------- início ----------
  function iniciar() {
    if (!nativo) return Promise.resolve();
    var passos = [];
    if (AdMob) {
      passos.push(anunciosProntos =
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
  // Resolve true só se a pessoa assistiu até o fim e ganhou a carta; false se ela fechou antes.
  // Rejeita se o vídeo não veio: falhou ao carregar ou ao abrir, ou não abriu em 25 segundos (sem internet, sem anúncio).
  // A Apple pede o aviso de rastreamento perto do anúncio, não ao abrir o app. O sistema só mostra uma vez.
  function pedirRastreamento() {
    if (plataforma !== "ios" || !AdMob.requestTrackingAuthorization) return Promise.resolve();
    return AdMob.requestTrackingAuthorization().catch(function () {});
  }
  function assistirAnuncio() {
    if (!nativo || !AdMob) return anuncioSimulado();
    // espera o AdMob iniciar, mas no máximo 8 segundos (se o início travar, tenta assim mesmo)
    var iniciado = Promise.race([anunciosProntos || Promise.resolve(), new Promise(function (ok) { setTimeout(ok, 8000); })]);
    return iniciado.then(pedirRastreamento).then(function () {
      return new Promise(function (ok, erro) {
        var ganhou = false, acabou = false, ouvintes = [];
        function fim(r, motivo) {
          if (acabou) return;
          acabou = true;
          clearTimeout(espera);
          ouvintes.forEach(function (o) {
            try { if (o && o.then) o.then(function (h) { h.remove(); }); else if (o && o.remove) o.remove(); } catch (e) { /* já removido */ }
          });
          if (r === null) erro(new Error(motivo || "indisponível")); else ok(r);
        }
        var espera = setTimeout(function () { fim(null, "demorou demais"); }, 25000);
        function ouvir(evento, f) {
          try { ouvintes.push(AdMob.addListener(evento, f)); } catch (e) { /* plugin sem o evento */ }
        }
        ouvir("onRewardedVideoAdShowed", function () { clearTimeout(espera); });
        ouvir("onRewardedVideoAdReward", function () { ganhou = true; });
        ouvir("onRewardedVideoAdDismissed", function () { fim(ganhou); });
        function falha(etapa) {
          return function (e) { fim(null, etapa + (e && (e.code !== undefined || e.message) ? ": " + [e.code, e.message].join(" ") : "")); };
        }
        ouvir("onRewardedVideoAdFailedToLoad", falha("não carregou"));
        ouvir("onRewardedVideoAdFailedToShow", falha("não abriu"));
        AdMob.prepareRewardVideoAd({ adId: CONFIG.admob[plataforma], isTesting: CONFIG.anunciosDeTeste })
          .then(function () { return AdMob.showRewardVideoAd(); })
          .then(function () { ganhou = true; })
          .catch(falha("erro"));
      });
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
    anunciosDeTeste: CONFIG.anunciosDeTeste,
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
