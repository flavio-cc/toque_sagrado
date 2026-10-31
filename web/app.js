(function () {
  "use strict";

  // Modo de teste: cartas ilimitadas. Para voltar ao limite diário, use false.
  var MODO_TESTE = false;
  var LIMITE_EXTRAS = 3;   // cartas extras grátis por dia
  var LIMITE_ANUNCIOS = 3; // cartas a mais por dia, uma por anúncio premiado assistido
  var EXPLORACAO = 0.2;
  var PESO = { ouvir: 2, ler: 3, compartilhar: 3, favoritar: 2, guardar: 1, saiu: -1 };

  // ---------- estado local ----------
  var CHAVE = "salmos-v2";
  function carregar() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; }
  }
  var estado = Object.assign(
    { colecao: {}, notas: {}, vistos: {}, seq: { ultimo: null, n: 0 }, dia: { data: null, diaria: false, extras: 0 }, humor: null },
    carregar()
  );
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* sem armazenamento */ }
  }

  function hoje() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function virarDia() {
    var h = hoje();
    if (estado.dia.data !== h) {
      estado.dia = { data: h, diaria: false, extras: 0, anuncios: 0 };
      estado.humor = null;
      salvar();
    }
  }

  // ---------- seleção do versículo ----------
  function hashTexto(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function popDe(v) { return (window.POP && window.POP[v.id]) || 1; }
  // A carta do dia sai dos versículos mais lidos nos rankings públicos.
  function cartaDoDia() {
    var populares = window.VERSES.filter(function (v) { return popDe(v) >= 2; });
    return populares[hashTexto(hoje()) % populares.length];
  }
  var LIVROS = { sl: "Salmos", pv: "Provérbios" };
  function nomeLivro(v) { return LIVROS[v.livro] || "Salmos"; }
  function temaDe(v) { return window.TEMAS[v.temas[0]] || window.TEMAS.gratidao; }
  function notaDe(v) {
    return v.temas.reduce(function (s, t) { return s + (estado.notas[t] || 0); }, 0);
  }
  function temasDoHumor() {
    var h = window.HUMORES.filter(function (x) { return x.id === estado.humor; })[0];
    return h ? h.temas : [];
  }
  function escolherPersonalizada() {
    var todos = window.VERSES;
    var naoVistos = todos.filter(function (v) { return !estado.vistos[v.id]; });
    if (!naoVistos.length) { estado.vistos = {}; naoVistos = todos.slice(); }
    // 20% das cartas vêm de qualquer tema, para o jogador descobrir coisas novas
    if (Math.random() < EXPLORACAO) return naoVistos[Math.floor(Math.random() * naoVistos.length)];
    var humor = temasDoHumor();
    var pesos = naoVistos.map(function (v) {
      var combina = v.temas.filter(function (t) { return humor.indexOf(t) >= 0; }).length;
      var nota = Math.max(-2, Math.min(6, notaDe(v) * 0.5));
      return Math.max(0.2, 1 + 2 * combina + nota + 0.4 * (popDe(v) - 1));
    });
    var total = pesos.reduce(function (a, b) { return a + b; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < naoVistos.length; i++) {
      r -= pesos[i];
      if (r <= 0) return naoVistos[i];
    }
    return naoVistos[naoVistos.length - 1];
  }
  function registrar(v, tipo) {
    v.temas.forEach(function (t) { estado.notas[t] = (estado.notas[t] || 0) + PESO[tipo]; });
    salvar();
  }

  // ---------- telas ----------
  var $ = function (id) { return document.getElementById(id); };
  var telas = ["hoje", "colecao"];
  function mostrar(nome) {
    telas.forEach(function (t) { $("tela-" + t).hidden = t !== nome; });
    $("aba-hoje").classList.toggle("on", nome === "hoje");
    $("aba-colecao").classList.toggle("on", nome === "colecao");
    window.scrollTo(0, 0);
  }

  function atualizarSequencia() {
    var n = estado.seq.n || 0;
    $("seq").textContent = n;
    $("seq-rotulo").textContent = n === 1 ? "dia seguido" : "dias seguidos";
  }
  function contarDia() {
    var h = hoje();
    if (estado.seq.ultimo === h) return;
    var ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    var o = ontem.getFullYear() + "-" + String(ontem.getMonth() + 1).padStart(2, "0") + "-" + String(ontem.getDate()).padStart(2, "0");
    estado.seq.n = estado.seq.ultimo === o ? estado.seq.n + 1 : 1;
    estado.seq.ultimo = h;
    salvar();
    atualizarSequencia();
  }

  function saudar() {
    var d = new Date(), hora = d.getHours();
    $("saudacao").textContent = hora < 12 ? "Bom dia." : hora < 18 ? "Boa tarde." : "Boa noite.";
    var txt;
    try { txt = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); } catch (e) { txt = ""; }
    $("data").textContent = txt;
  }

  function humorAtual() {
    return window.HUMORES.filter(function (x) { return x.id === estado.humor; })[0];
  }
  function paraQuem(h) {
    var r = h.rotulo.toLowerCase();
    return /^preciso /.test(r) ? "Para quem precisa " + r.replace(/^preciso /, "") : "Para quem está " + r;
  }
  function montarHumores() {
    var c = $("humores");
    c.innerHTML = "";
    window.HUMORES.forEach(function (h) {
      var b = document.createElement("button");
      b.textContent = h.rotulo;
      b.classList.toggle("on", estado.humor === h.id);
      b.onclick = function () {
        estado.humor = estado.humor === h.id ? null : h.id;
        salvar();
        montarHumores();
        atualizarExtra();
      };
      c.appendChild(b);
    });
  }

  // ---------- cartas extras: grátis, por anúncio ou Premium ----------
  function ilimitado() { return MODO_TESTE || window.LOJA.premium(); }
  function gratisRestantes() { return ilimitado() ? Infinity : LIMITE_EXTRAS - estado.dia.extras; }
  function anunciosRestantes() { return LIMITE_ANUNCIOS - (estado.dia.anuncios || 0); }
  function atualizarExtra() {
    var gratis = gratisRestantes(), anuncios = anunciosRestantes(), h = humorAtual();
    var porAnuncio = gratis <= 0 && anuncios > 0;
    $("btn-carta-extra").disabled = gratis <= 0 && anuncios <= 0;
    $("titulo-extra").textContent = porAnuncio ? "Assistir a um anúncio e ganhar uma carta"
      : gratis <= 0 && anuncios <= 0 ? "Volte amanhã para novas cartas" : "Outra carta para você";
    $("sub-extra").textContent = gratis <= 0 && anuncios <= 0 ? "A carta do dia de amanhã já está esperando"
      : porAnuncio ? (anuncios === 1 ? "Resta 1 hoje" : "Restam " + anuncios + " hoje")
      : h ? paraQuem(h).replace(/^Para/, "Escolhida para")
      : window.LOJA.premium() ? "Ilimitadas com o Premium"
      : MODO_TESTE ? "Ilimitadas (modo de teste)"
      : gratis + (gratis === 1 ? " carta grátis hoje" : " cartas grátis hoje");
    $("link-premium").hidden = ilimitado() || gratis > 0;
  }

  // ---------- raspar ----------
  var atual = null, ehDiaria = false, revelado = false, canvas, ctx, pintando = false, ultimoCheque = 0, abertoEm = 0;

  // Cada raspada sorteia uma semente: ela decide a cena, as cores e os detalhes da imagem,
  // então é muito difícil duas pessoas verem a mesma. A carta do dia guarda a sua até virar o dia.
  function novaSemente() {
    var n = new Uint32Array(1);
    try { crypto.getRandomValues(n); } catch (e) { n[0] = Math.random() * 4294967296; }
    return (n[0] ^ Date.now()) >>> 0;
  }
  function abrirCarta(v, dica, diaria, jaAberta) {
    pararAudio(); $("a-ouvir").style.opacity = "";
    // carta da coleção já vem com a semente guardada, para abrir com a mesma imagem
    var sem = v.semente != null ? v.semente : diaria ? (estado.dia.semente = estado.dia.semente || novaSemente()) : novaSemente();
    v = Object.assign({}, v, { semente: sem });
    atual = v; ehDiaria = !!diaria; revelado = false; abertoEm = Date.now();
    estado.vistos[v.id] = true; salvar();
    $("dica-carta").textContent = dica;
    $("v-texto").textContent = v.texto;
    $("v-ref").textContent = v.ref;
    $("acoes").hidden = true;
    $("instr").hidden = false;
    // a camada volta coberta na hora, sem o fade: com o fade, a imagem nova aparecia por um instante
    document.body.classList.add("sem-anim");
    $("raspa").classList.remove("fim");
    $("carta-papel").classList.remove("revelada");
    void $("raspa").offsetWidth;
    $("selo").textContent = nomeLivro(v) + " · " + temaDe(v).nome;
    atualizarBotoes();
    mostrar("hoje");
    desenharCamada();
    window.CENA.desenhar($("cena"), v);
    if (jaAberta) revelar();
    setTimeout(function () { document.body.classList.remove("sem-anim"); }, 50);
  }

  // Camada de raspar: folha de ouro com hachura de lápis, como o desenho do logo.
  function desenharCamada() {
    canvas = $("raspa");
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = canvas.offsetWidth, h = canvas.offsetHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#ecd394"); g.addColorStop(.35, "#c99b3e"); g.addColorStop(.6, "#e3c379"); g.addColorStop(1, "#a97c22");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(70,48,14,.16)";
    for (var x = -h; x < w; x += 4) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke(); }
    ctx.strokeStyle = "rgba(70,48,14,.09)";
    for (x = 0; x < w + h; x += 7) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x - h, 0); ctx.stroke(); }
    for (var i = 0; i < 260; i++) {
      ctx.fillStyle = "rgba(255,250,230," + (Math.random() * 0.3) + ")";
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    ctx.strokeStyle = "rgba(255,248,225,.6)"; ctx.lineWidth = 1.2;
    ctx.strokeRect(12.5, 12.5, w - 25, h - 25);
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(58,38,8,.78)";
    ctx.font = 'italic 500 34px "EB Garamond", Georgia, serif';
    ctx.textBaseline = "middle";
    ctx.fillText("Raspe aqui", w / 2, h / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
  }

  function ponto(e) {
    var r = canvas.getBoundingClientRect();
    var dpr = canvas.width / (canvas.offsetWidth || r.width);
    return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr, dpr: dpr };
  }
  var anterior = null;
  function riscar(e) {
    if (!pintando || revelado) return;
    var p = ponto(e);
    ctx.lineWidth = 44 * p.dpr; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(anterior ? anterior.x : p.x, anterior ? anterior.y : p.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    anterior = p;
    faiscar(e);
    var agora = Date.now();
    if (agora - ultimoCheque > 120) { ultimoCheque = agora; conferir(); }
  }
  var ultimaFaisca = 0;
  function faiscar(e) {
    var agora = Date.now();
    if (agora - ultimaFaisca < 45) return;
    ultimaFaisca = agora;
    var el = document.createElement("span"), box = $("carta").getBoundingClientRect();
    el.className = "faisca";
    el.style.left = (e.clientX - box.left + (Math.random() * 20 - 10)) + "px";
    el.style.top = (e.clientY - box.top + (Math.random() * 20 - 10)) + "px";
    el.style.setProperty("--dx", (Math.random() * 50 - 25) + "px");
    el.style.setProperty("--dy", (20 + Math.random() * 40) + "px");
    $("carta").appendChild(el);
    setTimeout(function () { el.remove(); }, 750);
  }
  function conferir() {
    var w = canvas.width, h = canvas.height, passo = 12;
    var dados = ctx.getImageData(0, 0, w, h).data;
    var limpos = 0, total = 0;
    for (var y = 0; y < h; y += passo) {
      for (var x = 0; x < w; x += passo) {
        total++;
        if (dados[(y * w + x) * 4 + 3] < 40) limpos++;
      }
    }
    if (limpos / total >= 0.6) revelar();
  }
  function revelar() {
    if (revelado) return;
    revelado = true;
    canvas.classList.add("fim");
    $("carta-papel").classList.add("revelada");
    $("instr").hidden = true;
    $("acoes").hidden = false;
    if (ehDiaria && !estado.dia.diaria) { estado.dia.diaria = true; salvar(); }
    contarDia();
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function atualizarBotoes() {
    var item = estado.colecao[atual.id];
    $("a-guardar").classList.toggle("on", !!item);
    $("a-guardar").querySelector("span").textContent = item ? "Guardado" : "Guardar";
    $("a-fav").classList.toggle("on", !!(item && item.fav));
    $("a-fav").querySelector("span").textContent = item && item.fav ? "Favorito" : "Favoritar";
  }
  function guardar() {
    if (!estado.colecao[atual.id]) { estado.colecao[atual.id] = { ts: Date.now(), fav: false, semente: atual.semente }; registrar(atual, "guardar"); }
    atualizarBotoes();
  }
  function favoritar() {
    guardar();
    var item = estado.colecao[atual.id];
    if (!item.fav) { item.fav = true; registrar(atual, "favoritar"); }
    atualizarBotoes();
  }

  // ---------- ouvir ----------
  // Narração pré-gravada de cada carta (voz Arthur Freeman, ElevenLabs), em audio/cartas/<id>.mp3.
  var audio = null;
  function rotuloOuvir(tocando) {
    $("a-ouvir").classList.toggle("on", tocando);
    $("a-ouvir").querySelector("span").textContent = tocando ? "Pausar" : "Ouvir";
  }
  function pararAudio() {
    if (audio) { audio.pause(); audio = null; }
    rotuloOuvir(false);
  }
  function ouvir() {
    if (audio) return pararAudio();
    audio = new Audio("audio/cartas/" + atual.id + ".mp3");
    audio.onended = pararAudio;
    audio.onerror = function () { pararAudio(); $("a-ouvir").querySelector("span").textContent = "Áudio indisponível"; $("a-ouvir").style.opacity = ".5"; };
    audio.play().then(function () { registrar(atual, "ouvir"); }, function () { pararAudio(); });
    rotuloOuvir(true);
  }

  // ---------- compartilhar como imagem ----------
  // Feed: 4:5, o maior espaço no feed do Instagram e do Facebook. Story: 9:16, para Stories, Status do WhatsApp e Reels.
  var FORMATOS = { feed: [1080, 1350], story: [1080, 1920] };
  function gerarImagem(formato) {
    var t = FORMATOS[formato] || FORMATOS.feed;
    return window.CENA.blob(atual, t[0], t[1]);
  }
  function mostrarImagem(blob) {
    var url = URL.createObjectURL(blob);
    $("img-salmo").src = url;
    $("sobre").hidden = false;
  }
  function compartilhar() { $("formato").hidden = false; }
  // No app das lojas o WebView do Android não tem navigator.share com arquivos:
  // grava a imagem no cache do app e abre o compartilhamento do sistema pelos plugins do Capacitor.
  function compartilharNativo(blob, formato) {
    var Cap = window.Capacitor, P = Cap && Cap.isNativePlatform && Cap.isNativePlatform() && Cap.Plugins;
    if (!P || !P.Share || !P.Filesystem) return false;
    var leitor = new FileReader();
    leitor.onload = function () {
      P.Filesystem.writeFile({ path: "versiculo-" + formato + ".jpg", data: String(leitor.result).split(",")[1], directory: "CACHE" })
        .then(function (r) { return P.Share.share({ files: [r.uri], dialogTitle: "Compartilhar versículo" }); })
        .catch(function (err) {
          // a pessoa fechar a lista de apps também cai aqui; só mostra a imagem se foi erro de verdade
          if (!/cancel/i.test(String(err && (err.message || err)))) mostrarImagem(blob);
        });
    };
    leitor.onerror = function () { mostrarImagem(blob); };
    leitor.readAsDataURL(blob);
    return true;
  }
  function compartilharComo(formato) {
    $("formato").hidden = true;
    // só a imagem, sem texto: o Story do Instagram recusa imagem com texto junto (pedido do Flavio)
    gerarImagem(formato).then(function (blob) {
      registrar(atual, "compartilhar");
      if (compartilharNativo(blob, formato)) return;
      var arquivo = new File([blob], "versiculo-" + formato + ".jpg", { type: "image/jpeg" });
      var pode = false;
      try { pode = !!(navigator.canShare && navigator.canShare({ files: [arquivo] })); } catch (e) { pode = false; }
      if (!pode) return mostrarImagem(blob);
      // se o compartilhamento do sistema falhar, mostra a imagem para salvar
      navigator.share({ files: [arquivo] }).catch(function (err) {
        if (!err || err.name !== "AbortError") mostrarImagem(blob);
      });
    });
  }
  $("f-feed").onclick = function () { compartilharComo("feed"); };
  $("f-story").onclick = function () { compartilharComo("story"); };
  $("fechar-formato").onclick = function () { $("formato").hidden = true; };
  $("fechar-sobre").onclick = function () { $("sobre").hidden = true; };

  // ---------- leitor do capítulo inteiro ----------
  var leitura = null;
  function carregarBiblia() {
    if (window.BIBLIA) return Promise.resolve(window.BIBLIA);
    return new Promise(function (ok, erro) {
      var s = document.createElement("script");
      s.src = "biblia.js";
      s.onload = function () { ok(window.BIBLIA); };
      s.onerror = erro;
      document.head.appendChild(s);
    });
  }
  function versosDaCarta(v) {
    var m = /:(\d+)(?:-(\d+))?$/.exec(v.ref);
    var ini = m ? +m[1] : 0, fim = m && m[2] ? +m[2] : ini;
    return { ini: ini, fim: fim };
  }
  function abrirLeitor(v) {
    var marca = versosDaCarta(v);
    leitura = { livro: v.livro || "sl", cap: v.cap || v.salmo, ini: marca.ini, fim: marca.fim };
    $("leitor").hidden = false;
    $("leitor-titulo").textContent = nomeLivro(v) + " " + leitura.cap;
    $("leitor-texto").textContent = "Carregando…";
    carregarBiblia().then(mostrarCapitulo, function () {
      $("leitor-texto").textContent = "Não foi possível abrir o texto agora.";
    });
  }
  function mostrarCapitulo() {
    var livro = window.BIBLIA[leitura.livro], caps = livro.caps, c = caps[leitura.cap - 1];
    $("leitor-titulo").textContent = livro.nome + " " + leitura.cap;
    $("leitor-ant").disabled = leitura.cap <= 1;
    $("leitor-prox").disabled = leitura.cap >= caps.length;
    var caixa = $("leitor-texto"), alvo = null;
    caixa.innerHTML = "";
    if (c[0]) {
      var t = document.createElement("p"); t.className = "leitor-sobrescrito"; t.textContent = c[0];
      caixa.appendChild(t);
    }
    c[1].forEach(function (texto, i) {
      var n = i + 1, p = document.createElement("p"), num = document.createElement("sup");
      num.textContent = n;
      p.appendChild(num);
      p.appendChild(document.createTextNode(" " + texto));
      if (n >= leitura.ini && n <= leitura.fim) { p.className = "destaque"; alvo = alvo || p; }
      caixa.appendChild(p);
    });
    caixa.scrollTop = 0;
    if (alvo) setTimeout(function () { caixa.scrollTop = Math.max(0, alvo.offsetTop - caixa.offsetTop - 60); }, 0);
  }
  function mudarCapitulo(d) {
    leitura.cap += d; leitura.ini = leitura.fim = 0;
    mostrarCapitulo();
  }
  $("leitor-ant").onclick = function () { mudarCapitulo(-1); };
  $("leitor-prox").onclick = function () { mudarCapitulo(1); };
  $("leitor-fechar").onclick = function () { $("leitor").hidden = true; };

  // ---------- coleção ----------
  function mostrarColecao() {
    var ids = Object.keys(estado.colecao);
    var l = $("lista"); l.innerHTML = "";
    if (!ids.length) {
      l.innerHTML = '<p class="vazio">Nada guardado ainda. Raspe uma carta e toque em Guardar.</p>';
    }
    ids.sort(function (a, b) { return estado.colecao[b].ts - estado.colecao[a].ts; });
    mostrar("colecao");
    ids.forEach(function (id) {
      var v = window.VERSES.filter(function (x) { return x.id === id; })[0];
      if (!v) return;
      // a miniatura usa a semente guardada, para ser a mesma imagem que a pessoa raspou
      if (estado.colecao[id].semente != null) v = Object.assign({}, v, { semente: estado.colecao[id].semente });
      var d = document.createElement("div");
      d.className = "item";
      d.setAttribute("role", "button"); d.tabIndex = 0;
      d.onclick = function () { abrirCarta(v, "Da sua coleção", false, true); };
      var t = document.createElement("p"); t.className = "t"; t.textContent = v.texto;
      var r = document.createElement("p"); r.className = "r";
      r.textContent = v.ref + (estado.colecao[id].fav ? "  ♥" : "");
      var th = document.createElement("canvas"); th.className = "mini";
      var txt = document.createElement("div"); txt.className = "txt";
      txt.appendChild(t); txt.appendChild(r);
      d.appendChild(th); d.appendChild(txt); l.appendChild(d);
      window.CENA.desenhar(th, v, { largura: 216, altura: 288 });
    });
  }

  // ---------- ligações ----------
  function abrirExtra() {
    // trocar de carta em menos de 3 s sem guardar conta como sinal negativo
    if (atual && !ehDiaria && Date.now() - abertoEm < 3000 && !estado.colecao[atual.id]) registrar(atual, "saiu");
    var h = humorAtual();
    abrirCarta(escolherPersonalizada(), h ? paraQuem(h) : "Uma carta para você");
    atualizarExtra();
  }
  $("btn-carta-extra").onclick = function () {
    virarDia();
    if (gratisRestantes() > 0) { estado.dia.extras++; salvar(); return abrirExtra(); }
    if (anunciosRestantes() <= 0) return atualizarExtra();
    // o anúncio só passa quando a pessoa escolhe, e a carta só vem se ela assistir até o fim
    $("btn-carta-extra").disabled = true;
    window.LOJA.assistirAnuncio().then(function (ganhou) {
      if (ganhou) { estado.dia.anuncios = (estado.dia.anuncios || 0) + 1; salvar(); abrirExtra(); }
      atualizarExtra();
    }, atualizarExtra);
  };
  $("link-premium").onclick = abrirPremium;
  $("btn-premium").onclick = abrirPremium;
  $("a-ouvir").onclick = ouvir;
  $("a-guardar").onclick = guardar;
  $("a-fav").onclick = favoritar;
  $("a-compartilhar").onclick = compartilhar;
  $("a-ler").onclick = function () { registrar(atual, "ler"); abrirLeitor(atual); };

  $("aba-hoje").onclick = function () { mostrar("hoje"); };
  $("aba-colecao").onclick = mostrarColecao;
  $("aba-leitura").onclick = function () {
    // com a carta ainda coberta, não entrega o versículo: abre onde parou ou no Salmo 1
    if (revelado) return abrirLeitor(atual);
    if (!leitura) leitura = { livro: "sl", cap: 1, ini: 0, fim: 0 };
    $("leitor").hidden = false;
    $("leitor-texto").textContent = "Carregando…";
    carregarBiblia().then(mostrarCapitulo, function () {
      $("leitor-texto").textContent = "Não foi possível abrir o texto agora.";
    });
  };

  var cv = $("raspa");
  cv.addEventListener("pointerdown", function (e) { pintando = true; anterior = null; cv.setPointerCapture(e.pointerId); riscar(e); });
  cv.addEventListener("pointermove", riscar);
  function soltar() { pintando = false; anterior = null; if (!revelado && ctx) conferir(); }
  cv.addEventListener("pointerup", soltar);
  cv.addEventListener("pointercancel", soltar);

  // ---------- Premium e ofertas ----------
  function botaoProduto(item, classe) {
    var b = document.createElement("button");
    b.className = classe + (item.destaque ? " destaque" : "");
    b.innerHTML = "<strong></strong><span></span><small></small>";
    b.querySelector("strong").textContent = item.titulo;
    b.querySelector("span").textContent = item.preco;
    b.querySelector("small").textContent = item.detalhe || "";
    b.onclick = function () {
      window.LOJA.comprar(item).then(function (ok) {
        if (!ok) return;
        if (/^oferta/.test(item.id)) $("premium-aviso").textContent = "Obrigado pela sua oferta. Que Deus abençoe você.";
        montarPremium();
      }, function () { $("premium-aviso").textContent = "Não foi possível concluir a compra agora."; });
    };
    return b;
  }
  function montarPremium() {
    var tem = window.LOJA.premium();
    $("premium-ativo").hidden = !tem;
    $("planos").hidden = tem;
    var p = $("planos"); p.innerHTML = "";
    var lista = window.LOJA.produtos("premium");
    if (!lista.length) p.innerHTML = '<p class="premium-nota">Os planos não carregaram. Confira a internet e tente de novo.</p>';
    lista.forEach(function (it) { p.appendChild(botaoProduto(it, "plano")); });
    var o = $("ofertas"); o.innerHTML = "";
    window.LOJA.produtos("oferta").forEach(function (it) { o.appendChild(botaoProduto(it, "oferta")); });
    $("gerenciar").href = window.LOJA.linkAssinaturas();
    $("gerenciar").hidden = !tem || window.LOJA.simulada;
    $("simular-sem-premium").hidden = !tem || !window.LOJA.simulada;
    atualizarExtra();
  }
  function abrirPremium() {
    $("premium-aviso").textContent = "";
    montarPremium();
    $("premium").hidden = false;
  }
  $("fechar-premium").onclick = function () { $("premium").hidden = true; };
  $("restaurar").onclick = function () {
    window.LOJA.restaurar().then(function (tem) {
      $("premium-aviso").textContent = tem ? "Premium restaurado." : "Nenhuma compra encontrada nesta conta.";
      montarPremium();
    });
  };
  $("simular-sem-premium").onclick = function () { window.LOJA.simularPremium(false); montarPremium(); };
  window.LOJA.aoMudar(function () { atualizarExtra(); if (!$("premium").hidden) montarPremium(); });

  // ---------- recomeçar (só no modo de teste) ----------
  // Apaga coleção, sequência, humor e preferências; pede um segundo toque para confirmar.
  function recomecar() {
    try { localStorage.removeItem(CHAVE); localStorage.removeItem("toque-premium"); } catch (e) { /* sem armazenamento */ }
    location.reload();
  }
  // no link de teste (navegador) o botão aparece sempre; no app das lojas, só no modo de teste
  if (MODO_TESTE || window.LOJA.simulada) {
    var br = $("btn-recomecar"), armado = null;
    br.hidden = false;
    br.onclick = function () {
      if (armado) return recomecar();
      br.textContent = "Toque de novo para apagar tudo";
      armado = setTimeout(function () { armado = null; br.textContent = "Recomeçar teste do zero"; }, 4000);
    };
  }

  // ---------- início ----------
  window.LOJA.iniciar().then(atualizarExtra);
  virarDia();
  saudar();
  montarHumores();
  atualizarSequencia();
  atualizarExtra();
  // se a carta do dia já foi raspada hoje, ela abre revelada, sem animação
  abrirCarta(cartaDoDia(), "Carta do dia · grátis", true, estado.dia.diaria);
  // a camada usa as fontes do título; redesenha quando chegarem, se ninguém começou a raspar
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!revelado && !pintando) desenharCamada(); });

  // exposto para testes
  window.__salmos = { escolherPersonalizada: escolherPersonalizada, estado: estado };
})();
