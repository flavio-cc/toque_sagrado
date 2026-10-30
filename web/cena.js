// Desenha a carta de cada versículo: um cenário pintado em canvas + texto em um de 4 estilos.
// O mesmo código gera a carta na tela e a imagem de compartilhar.
(function () {
  "use strict";

  function semente(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function aleatorio(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- fontes ----------
  var FONTES = [
    'italic 500 40px "Playfair Display"',
    '40px "Great Vibes"',
    '40px "Bebas Neue"',
    'italic 600 40px "Cormorant Garamond"',
    '600 30px "Montserrat"'
  ];
  var promessaFontes = null;
  function carregarFontes() {
    if (promessaFontes) return promessaFontes;
    if (!document.fonts || !document.fonts.load) { promessaFontes = Promise.resolve(); return promessaFontes; }
    var todas = Promise.all(FONTES.map(function (f) { return document.fonts.load(f, "Aa"); })).catch(function () {});
    var limite = new Promise(function (ok) { setTimeout(ok, 3000); });
    promessaFontes = Promise.race([todas, limite]);
    return promessaFontes;
  }
  var SERIF = '"Playfair Display", Georgia, serif';
  var CORM = '"Cormorant Garamond", Georgia, serif';
  var SCRIPT = '"Great Vibes", "Brush Script MT", cursive';
  var IMPACTO = '"Bebas Neue", Impact, "Arial Narrow", sans-serif';
  var SANS = '"Montserrat", system-ui, sans-serif';

  // ---------- peças de desenho ----------
  function grad(c, x0, y0, x1, y1, paradas) {
    var g = c.createLinearGradient(x0, y0, x1, y1);
    paradas.forEach(function (p) { g.addColorStop(p[0], p[1]); });
    return g;
  }
  function brilho(c, x, y, r, rgb, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(" + rgb + "," + a + ")");
    g.addColorStop(0.4, "rgba(" + rgb + "," + (a * 0.35) + ")");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function disco(c, x, y, r, cor) { c.fillStyle = cor; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  function cordilheira(c, w, h, y0, amp, freq, cor, seed, pico) {
    var rng = aleatorio(seed), ph = rng() * 20, ph2 = rng() * 20;
    c.beginPath(); c.moveTo(0, h);
    for (var x = 0; x <= w; x += 3) {
      var t = x * freq + ph;
      var y = pico
        ? y0 - Math.abs(Math.sin(t)) * amp - Math.abs(Math.sin(t * 2.7 + ph2)) * amp * 0.35
        : y0 + Math.sin(t) * amp + Math.sin(t * 2.1 + ph2) * amp * 0.45;
      c.lineTo(x, y);
    }
    c.lineTo(w, h); c.closePath(); c.fillStyle = cor; c.fill();
  }
  function nuvem(c, x, y, tam, alfa, rng, rgb) {
    for (var i = 0; i < 7; i++) {
      var px = x + (rng() - 0.5) * tam * 1.6, py = y + (rng() - 0.5) * tam * 0.35, r = tam * (0.3 + rng() * 0.35);
      var g = c.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, "rgba(" + rgb + "," + alfa + ")");
      g.addColorStop(1, "rgba(" + rgb + ",0)");
      c.fillStyle = g; c.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }
  function raios(c, ox, oy, w, h, n, alfa) {
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 0.9 + 0.1, a1 = a0 + 0.05 + (i % 3) * 0.02, L = Math.max(w, h) * 1.6;
      c.fillStyle = "rgba(255,255,255," + (alfa * (0.5 + (i % 4) / 4)) + ")";
      c.beginPath(); c.moveTo(ox, oy);
      c.lineTo(ox + Math.cos(a0) * L, oy + Math.sin(a0) * L);
      c.lineTo(ox + Math.cos(a1) * L, oy + Math.sin(a1) * L);
      c.closePath(); c.fill();
    }
  }

  // ---------- cenários ----------
  var CENAS = {
    amanhecer: {
      escuro: 0.22,
      desenhar: function (c, w, h, seed, p) {
        c.fillStyle = grad(c, 0, 0, 0, h, [[0, "#27356f"], [0.45, "#c46f8c"], [0.75, "#f6a46b"], [1, "#ffd9a0"]]);
        c.fillRect(0, 0, w, h);
        var sx = w * (0.5 + p.dx), sy = h * (0.62 + p.dy);
        brilho(c, sx, sy, h * 0.55, "255,224,160", 0.9);
        disco(c, sx, sy, h * 0.05, "#fff2c8");
        cordilheira(c, w, h, h * 0.66, h * 0.03, 0.004, "rgba(150,110,160,.85)", seed + 1);
        cordilheira(c, w, h, h * 0.73, h * 0.035, 0.005, "#6a5088", seed + 2);
        cordilheira(c, w, h, h * 0.82, h * 0.04, 0.004, "#2d2a55", seed + 3);
        cordilheira(c, w, h, h * 0.92, h * 0.03, 0.006, "#161a3a", seed + 4);
      }
    },
    montanha: {
      escuro: 0.18,
      desenhar: function (c, w, h, seed, p) {
        c.fillStyle = grad(c, 0, 0, 0, h, [[0, "#1c1233"], [0.4, "#8a2f4a"], [0.7, "#e8643a"], [1, "#ffb35a"]]);
        c.fillRect(0, 0, w, h);
        var sx = w * (0.65 + p.dx), sy = h * (0.55 + p.dy);
        brilho(c, sx, sy, h * 0.6, "255,170,90", 0.85);
        disco(c, sx, sy, h * 0.06, "#ffe2a8");
        cordilheira(c, w, h, h * 0.68, h * 0.17, 0.0045, "rgba(110,45,70,.92)", seed + 1, true);
        cordilheira(c, w, h, h * 0.79, h * 0.14, 0.0065, "#3a1b3f", seed + 2, true);
        cordilheira(c, w, h, h * 0.91, h * 0.10, 0.009, "#150c26", seed + 3, true);
      }
    },
    noite: {
      escuro: 0.05,
      desenhar: function (c, w, h, seed, p) {
        var rng = aleatorio(seed);
        c.fillStyle = grad(c, 0, 0, 0, h, [[0, "#03050f"], [0.55, "#141c4d"], [1, "#3b3f8f"]]);
        c.fillRect(0, 0, w, h);
        for (var i = 0; i < 1100; i++) { // via láctea
          var t = rng(), dx = (rng() + rng() + rng() - 1.5) * w * 0.22, dy = (rng() + rng() + rng() - 1.5) * h * 0.09;
          disco(c, t * w + dx, h * 0.68 - t * h * 0.5 + dy, 0.6 + rng() * 1.6, "rgba(205,215,255," + (0.04 + rng() * 0.2) + ")");
        }
        for (var s = 0; s < 300; s++) {
          var x = rng() * w, y = rng() * h * 0.78, r = 0.5 + rng() * rng() * 2.6;
          disco(c, x, y, r, "rgba(255,255,255," + (0.45 + rng() * 0.55) + ")");
          if (r > 2) brilho(c, x, y, r * 6, "200,215,255", 0.35);
        }
        var lx = w * (0.78 - Math.abs(p.dx)), ly = h * (0.18 + p.dy);
        brilho(c, lx, ly, h * 0.16, "255,240,200", 0.5);
        disco(c, lx, ly, h * 0.035, "#fff5d6");
        disco(c, lx + h * 0.016, ly - h * 0.006, h * 0.032, "#1a2257");
        cordilheira(c, w, h, h * 0.82, h * 0.10, 0.006, "#0a0f2a", seed + 1, true);
        cordilheira(c, w, h, h * 0.92, h * 0.06, 0.010, "#050816", seed + 2, true);
      }
    },
    mar: {
      escuro: 0.4,
      desenhar: function (c, w, h, seed, p) {
        var rng = aleatorio(seed), hz = h * 0.6, sx = w * (0.5 + p.dx), sy = hz + h * Math.min(0, p.dy);
        c.fillStyle = grad(c, 0, 0, 0, hz, [[0, "#5f9fd2"], [0.65, "#f0c4a4"], [1, "#fde0b8"]]);
        c.fillRect(0, 0, w, hz);
        brilho(c, sx, sy, h * 0.45, "255,226,170", 0.9);
        c.save(); c.beginPath(); c.rect(0, 0, w, hz); c.clip();
        disco(c, sx, sy, h * 0.045, "#fff1c9");
        c.restore();
        for (var n = 0; n < 6; n++) {
          nuvem(c, rng() * w, h * (0.08 + rng() * 0.34), w * (0.18 + rng() * 0.14), 0.3, rng, "255,255,255");
        }
        c.fillStyle = grad(c, 0, hz, 0, h, [[0, "#f2c79a"], [0.25, "#4f88b8"], [1, "#1c4064"]]);
        c.fillRect(0, hz, w, h - hz);
        for (var i = 0; i < 70; i++) { // reflexo do sol
          var y = hz + 6 + i * h * 0.0058, larg = (30 + i * 7) * (w / 1080) * (0.6 + rng() * 0.8);
          c.fillStyle = "rgba(255,230,170," + Math.max(0, 0.7 - i * 0.01) + ")";
          c.fillRect(sx - larg / 2, y, larg, Math.max(2, h * 0.0016));
        }
        for (var j = 0; j < 90; j++) {
          c.fillStyle = "rgba(255,255,255," + (0.03 + rng() * 0.07) + ")";
          c.fillRect(rng() * w, hz + rng() * (h - hz), 30 + rng() * 120, 2);
        }
      }
    },
    lago: {
      escuro: 0.18,
      desenhar: function (c, w, h, seed, p) {
        var hz = h * 0.6;
        c.fillStyle = grad(c, 0, 0, 0, hz, [[0, "#2a2a62"], [0.55, "#9a6fc9"], [1, "#f5b8c4"]]);
        c.fillRect(0, 0, w, hz);
        brilho(c, w * (0.3 + p.dx), h * (0.38 + p.dy), h * 0.3, "255,225,200", 0.7);
        var picos = function () {
          cordilheira(c, w, hz, hz - 2, h * 0.14, 0.005, "#40336f", seed + 1, true);
          cordilheira(c, w, hz, hz, h * 0.07, 0.008, "#251f4d", seed + 2, true);
        };
        picos();
        c.fillStyle = grad(c, 0, hz, 0, h, [[0, "#b8809f"], [0.4, "#4b3b80"], [1, "#16133a"]]);
        c.fillRect(0, hz, w, h - hz);
        c.save();
        c.beginPath(); c.rect(0, hz, w, h - hz); c.clip();
        c.translate(0, hz * 2); c.scale(1, -1); c.globalAlpha = 0.5;
        picos();
        c.restore();
        var rng = aleatorio(seed);
        for (var i = 0; i < 80; i++) {
          c.fillStyle = "rgba(255,255,255," + (0.03 + rng() * 0.08) + ")";
          c.fillRect(rng() * w, hz + rng() * (h - hz), 40 + rng() * 160, 2);
        }
      }
    },
    nuvens: {
      escuro: 0.44,
      desenhar: function (c, w, h, seed, p) {
        var rng = aleatorio(seed);
        c.fillStyle = grad(c, 0, 0, 0, h, [[0, "#4f9ae6"], [0.5, "#e9a0c8"], [1, "#ffe0a0"]]);
        c.fillRect(0, 0, w, h);
        brilho(c, w * (0.2 + p.dx), h * (0.08 + p.dy), h * 0.5, "255,255,230", 0.8);
        raios(c, w * (0.2 + p.dx), h * (0.08 + p.dy), w, h, 14, 0.09);
        for (var i = 0; i < 30; i++) {
          var y = h * (0.12 + i / 30 * 0.8);
          nuvem(c, rng() * w, y, w * (0.16 + rng() * 0.2), 0.45 + (i / 30) * 0.2, rng, i > 18 ? "255,214,230" : "255,255,255");
        }
      }
    },
    caminho: {
      escuro: 0.38,
      desenhar: function (c, w, h, seed, p) {
        var rng = aleatorio(seed), hz = h * 0.58;
        c.fillStyle = grad(c, 0, 0, 0, hz, [[0, "#6fb9e6"], [0.7, "#fff0b8"], [1, "#ffe7a8"]]);
        c.fillRect(0, 0, w, hz + 4);
        var sx = w * (0.72 + p.dx * 0.6), sy = h * (0.34 + p.dy);
        raios(c, sx, sy, w, h, 12, 0.08);
        brilho(c, sx, sy, h * 0.45, "255,244,190", 0.95);
        disco(c, sx, sy, h * 0.04, "#fffbe0");
        cordilheira(c, w, h, hz, h * 0.03, 0.004, "#9cc98a", seed + 1);
        cordilheira(c, w, h, hz + h * 0.05, h * 0.03, 0.005, "#6ea65a", seed + 2);
        c.fillStyle = grad(c, 0, hz + h * 0.06, 0, h, [[0, "#5e9f45"], [1, "#2b622b"]]);
        c.fillRect(0, hz + h * 0.07, w, h);
        for (var t = 0; t < 7; t++) { // árvores distantes
          var tx = w * (0.05 + rng() * 0.9), ty = hz + h * 0.02, tr = h * (0.015 + rng() * 0.018);
          if (Math.abs(tx - w * 0.55) < w * 0.12) continue;
          c.fillStyle = "#2f5f2c"; c.fillRect(tx - 1.5, ty, 3, tr * 1.2);
          disco(c, tx, ty - tr * 0.2, tr, "#2f6a2d");
        }
        c.beginPath(); // caminho
        c.moveTo(w * 0.22, h); c.quadraticCurveTo(w * 0.66, h * 0.8, w * 0.545, hz + h * 0.06);
        c.lineTo(w * 0.565, hz + h * 0.06); c.quadraticCurveTo(w * 0.86, h * 0.8, w * 0.8, h);
        c.closePath();
        c.fillStyle = grad(c, 0, hz, 0, h, [[0, "#fbefc4"], [1, "#caa862"]]); c.fill();
        for (var f = 0; f < 120; f++) { // flores e capim
          var fx = rng() * w, fy = h * (0.72 + rng() * 0.28);
          var cores = ["#fff", "#ffd54f", "#ff8fb1", "#c8a0ff"];
          disco(c, fx, fy, 2 + (fy / h) * 4, cores[f % 4]);
        }
      }
    },
    campo: {
      escuro: 0.4,
      desenhar: function (c, w, h, seed, p) {
        var rng = aleatorio(seed), hz = h * 0.6;
        c.fillStyle = grad(c, 0, 0, 0, h, [[0, "#f3b85c"], [0.5, "#fbe3a0"], [1, "#fff3d6"]]);
        c.fillRect(0, 0, w, h);
        brilho(c, w * (0.5 + p.dx), h * (0.48 + p.dy), h * 0.7, "255,236,170", 0.95);
        raios(c, w * (0.5 + p.dx), h * (0.48 + p.dy), w, h, 16, 0.05);
        cordilheira(c, w, h, hz, h * 0.025, 0.004, "#d9a64a", seed + 1);
        c.fillStyle = grad(c, 0, hz, 0, h, [[0, "#e0b050"], [1, "#8a5f1c"]]);
        c.fillRect(0, hz + h * 0.02, w, h);
        var cores = ["#f2c14e", "#e0a82e", "#fbd978", "#c98a1c"];
        for (var i = 0; i < 900; i++) { // trigo
          var p = rng(), y = hz + h * 0.03 + p * p * (h - hz), x = rng() * w, L = (30 + p * 150) * (h / 1350), vento = (rng() - 0.35) * L * 0.4;
          c.strokeStyle = cores[i % 4]; c.lineWidth = 1 + p * 3;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + vento * 0.2, y - L * 0.5, x + vento, y - L); c.stroke();
          disco(c, x + vento, y - L, 1.5 + p * 3, "#f8d56b");
        }
        for (var b = 0; b < 18; b++) disco(c, rng() * w, rng() * h * 0.6, 12 + rng() * 40, "rgba(255,245,200," + (0.05 + rng() * 0.1) + ")");
      }
    }
  };

  var CENAS_POR_TEMA = {
    paz: ["mar", "lago"], forca: ["montanha", "amanhecer"], gratidao: ["campo", "amanhecer"],
    protecao: ["noite", "montanha"], louvor: ["nuvens", "amanhecer"], esperanca: ["caminho", "amanhecer"],
    consolo: ["lago", "noite"], sabedoria: ["caminho", "campo"]
  };
  // cenas a mais que combinam com cada tema, sorteadas só nas cartas com semente própria
  var CENAS_EXTRAS = {
    paz: ["nuvens", "campo"], forca: ["noite", "mar"], gratidao: ["caminho", "nuvens"],
    protecao: ["lago", "amanhecer"], louvor: ["campo", "mar"], esperanca: ["campo", "nuvens"],
    consolo: ["mar", "amanhecer"], sabedoria: ["montanha", "lago"]
  };
  // cada raspada traz v.semente (sorteada no app); cartas antigas sem ela continuam como eram
  function temSemente(v) { return typeof v.semente === "number"; }
  function cenaDoVerso(v) {
    var lista = CENAS_POR_TEMA[v.temas[0]] || ["amanhecer"];
    if (!temSemente(v)) return lista[semente("c" + v.id) % lista.length];
    lista = lista.concat(CENAS_EXTRAS[v.temas[0]] || []);
    var r = aleatorio(v.semente ^ 0x51ED27)();
    // as cenas principais do tema saem em 70% das vezes
    return r < 0.7 ? lista[Math.floor(r / 0.7 * 2)] : lista[2 + Math.floor((r - 0.7) / 0.3 * (lista.length - 2))];
  }
  var ESTILOS = ["elegante", "script", "impacto", "vidro"];
  function estiloDoVerso(v) {
    var h = temSemente(v) ? semente("e" + v.semente) : semente("e" + v.id);
    var e = ESTILOS[h % ESTILOS.length], n = v.texto.length;
    // o estilo "vidro" (texto numa caixa) saiu: a caixa cobria a marca d'água da imagem compartilhada
    if (e === "vidro") e = ["elegante", "script", "impacto"][(h >>> 8) % 3];
    if ((e === "script" && n > 115) || (e === "impacto" && n > 150)) e = "elegante";
    return e;
  }

  // ---------- variações da raspada ----------
  // Tudo sai da semente: a mesma semente redesenha sempre a mesma imagem (coleção, compartilhar).
  var TINTAS = ["255,170,90", "255,120,150", "120,200,255", "170,120,255", "90,220,180", "255,215,120", "255,140,90", "140,170,255"];
  var NEUTRO = { dx: 0, dy: 0, espelho: false, zoom: 1, ox: 0, oy: 0, tinta: null };
  function variacao(seed) {
    var r = aleatorio(seed ^ 0x9E3779B9), z = 1 + r() * 0.18;
    return {
      dx: (r() - 0.5) * 0.36, dy: (r() - 0.6) * 0.14,
      espelho: r() < 0.5, zoom: z, ox: r() * (z - 1), oy: r() * (z - 1),
      tinta: [TINTAS[Math.floor(r() * TINTAS.length)], TINTAS[Math.floor(r() * TINTAS.length)], 0.3 + r() * 0.35, r() * Math.PI],
      neblina: r() < 0.35 ? 0.45 + r() * 0.3 : 0, raios: r() < 0.3, luzes: r() < 0.4 ? 12 + Math.floor(r() * 30) : 0,
      passaros: r() < 0.35 ? 3 + Math.floor(r() * 7) : 0, brilhos: r() < 0.3 ? 10 + Math.floor(r() * 25) : 0,
      grao: 0.03 + r() * 0.05, vinheta: 0.15 + r() * 0.35, r: r
    };
  }
  function tingir(b, w, h, t) {
    // tinta em "soft-light": muda a hora do dia sem apagar o desenho
    var ang = t[3], cx = w / 2, cy = h / 2, L = Math.max(w, h) / 2;
    var g = b.createLinearGradient(cx - Math.cos(ang) * L, cy - Math.sin(ang) * L, cx + Math.cos(ang) * L, cy + Math.sin(ang) * L);
    g.addColorStop(0, "rgba(" + t[0] + "," + t[2] + ")"); g.addColorStop(1, "rgba(" + t[1] + "," + t[2] + ")");
    b.save(); b.globalCompositeOperation = "soft-light"; b.fillStyle = g; b.fillRect(0, 0, w, h); b.restore();
  }
  function enfeitar(b, w, h, s, p) {
    var r = p.r, i;
    if (p.neblina) {
      var y = h * (0.55 + r() * 0.3);
      b.fillStyle = grad(b, 0, y - h * 0.12, 0, y + h * 0.12, [[0, "rgba(255,250,240,0)"], [0.5, "rgba(255,250,240," + p.neblina * 0.5 + ")"], [1, "rgba(255,250,240,0)"]]);
      b.fillRect(0, y - h * 0.12, w, h * 0.24);
    }
    if (p.raios) raios(b, w * (0.15 + r() * 0.7), -h * 0.05, w, h, 10 + Math.floor(r() * 8), 0.05 + r() * 0.04);
    for (i = 0; i < p.luzes; i++) { // luzes flutuando, fora de foco
      var lr = (6 + r() * 26) * s;
      brilho(b, r() * w, r() * h, lr * 3, "255,240,200", 0.25 + r() * 0.3);
      disco(b, r() * w, r() * h, lr * 0.25, "rgba(255,250,230," + (0.2 + r() * 0.3) + ")");
    }
    if (p.passaros) {
      var bx = w * (0.15 + r() * 0.6), by = h * (0.12 + r() * 0.25);
      b.strokeStyle = "rgba(25,20,35,.7)"; b.lineCap = "round";
      for (i = 0; i < p.passaros; i++) {
        var px = bx + (r() - 0.3) * w * 0.3, py = by + (r() - 0.5) * h * 0.08, a = (7 + r() * 9) * s;
        b.lineWidth = Math.max(1.2, a * 0.22);
        b.beginPath(); b.moveTo(px - a, py - a * 0.3); b.quadraticCurveTo(px - a * 0.4, py - a * 0.6, px, py);
        b.quadraticCurveTo(px + a * 0.4, py - a * 0.6, px + a, py - a * 0.3); b.stroke();
      }
    }
    for (i = 0; i < p.brilhos; i++) { // cintilações em cruz
      var cx = r() * w, cy = r() * h * 0.6, t = (4 + r() * 10) * s;
      b.fillStyle = "rgba(255,255,255," + (0.4 + r() * 0.5) + ")";
      b.fillRect(cx - t, cy - t * 0.08, t * 2, t * 0.16); b.fillRect(cx - t * 0.08, cy - t, t * 0.16, t * 2);
      brilho(b, cx, cy, t * 1.5, "255,255,255", 0.4);
    }
    var n = Math.round(w * h / 500); // grão de papel
    for (i = 0; i < n; i++) {
      b.fillStyle = r() < 0.5 ? "rgba(255,255,255," + p.grao + ")" : "rgba(0,0,0," + p.grao + ")";
      b.fillRect(r() * w, r() * h, 1.5 * s + 0.5, 1.5 * s + 0.5);
    }
    var v = b.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0," + p.vinheta + ")");
    b.fillStyle = v; b.fillRect(0, 0, w, h);
  }
  // Telas de rascunho reaproveitadas: o Safari do iPhone tem um teto de memória para canvas
  // e, passado o teto, telas novas saem em branco (a marca d'água era a primeira a sumir).
  var rascunhos = {};
  function rascunho(nome, w, h) {
    var t = rascunhos[nome] || (rascunhos[nome] = document.createElement("canvas"));
    if (t.width !== w || t.height !== h) { t.width = w; t.height = h; } else t.getContext("2d").clearRect(0, 0, w, h);
    var c = t.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
    return t;
  }
  function pintarCena(b, cena, w, h, s, seed, p) {
    if (p.zoom === 1 && !p.espelho) return cena.desenhar(b, w, h, seed, p);
    var tela = rascunho("cena", w, h);
    cena.desenhar(tela.getContext("2d"), w, h, seed, p);
    b.save();
    if (p.espelho) { b.translate(w, 0); b.scale(-1, 1); }
    b.drawImage(tela, -p.ox * w, -p.oy * h, w * p.zoom, h * p.zoom);
    b.restore();
  }

  // ---------- texto ----------
  function quebrar(c, texto, larg) {
    var palavras = texto.split(" "), linhas = [], l = "";
    palavras.forEach(function (p) {
      var t = l ? l + " " + p : p;
      if (c.measureText(t).width > larg && l) { linhas.push(l); l = p; } else { l = t; }
    });
    if (l) linhas.push(l);
    return linhas;
  }
  function ajustar(c, texto, fonte, larg, altMax, tamMax, tamMin, lh) {
    var tam = tamMax, linhas;
    for (; tam >= tamMin; tam -= 2) {
      c.font = fonte(tam);
      linhas = quebrar(c, texto, larg);
      if (linhas.length * tam * lh <= altMax) break;
    }
    return { tam: Math.max(tam, tamMin), linhas: linhas };
  }
  function espacado(c, txt, x, y, esp, alinhar) {
    var larg = 0, i, m = [];
    for (i = 0; i < txt.length; i++) { m[i] = c.measureText(txt[i]).width; larg += m[i] + esp; }
    larg -= esp;
    var px = alinhar === "centro" ? x - larg / 2 : x;
    c.textAlign = "left";
    for (i = 0; i < txt.length; i++) { c.fillText(txt[i], px, y); px += m[i] + esp; }
    return larg;
  }
  function sombra(c, s, a) { c.shadowColor = "rgba(0,0,0," + (a || 0.5) + ")"; c.shadowBlur = 18 * s; c.shadowOffsetY = 3 * s; }
  function semSombra(c) { c.shadowColor = "transparent"; c.shadowBlur = 0; c.shadowOffsetY = 0; }
  function retArred(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function ornamento(c, cx, y, s, cor) {
    c.strokeStyle = cor; c.lineWidth = 2 * s;
    c.beginPath(); c.moveTo(cx - 150 * s, y); c.lineTo(cx - 28 * s, y); c.moveTo(cx + 28 * s, y); c.lineTo(cx + 150 * s, y); c.stroke();
    c.fillStyle = cor; c.font = (30 * s) + "px " + SERIF; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("✦", cx, y + 1 * s); c.textBaseline = "alphabetic";
  }

  var TEXTO = {
    elegante: function (c, w, h, s, v) {
      var larg = w * 0.78;
      var r = ajustar(c, v.texto, function (t) { return "italic 500 " + t + "px " + SERIF; }, larg, h * 0.46, 76 * s, 36 * s, 1.34);
      var altura = r.linhas.length * r.tam * 1.34, topo = h * 0.5 - altura / 2 - 20 * s;
      sombra(c, s);
      c.fillStyle = "#fff"; c.textAlign = "center"; c.font = "italic 500 " + r.tam + "px " + SERIF;
      r.linhas.forEach(function (l, i) { c.fillText(l, w / 2, topo + (i + 0.8) * r.tam * 1.34); });
      semSombra(c);
      ornamento(c, w / 2, topo - 56 * s, s, "rgba(255,236,190,.95)");
      c.font = "600 " + 32 * s + "px " + SANS; c.fillStyle = "#ffe9b8";
      espacado(c, v.ref.toUpperCase(), w / 2, topo + altura + 64 * s, 6 * s, "centro");
    },
    script: function (c, w, h, s, v) {
      var larg = w * 0.8;
      var r = ajustar(c, v.texto, function (t) { return t + "px " + SCRIPT; }, larg, h * 0.46, 112 * s, 62 * s, 1.2);
      var altura = r.linhas.length * r.tam * 1.2, topo = h * 0.5 - altura / 2 - 24 * s;
      sombra(c, s, 0.55);
      c.fillStyle = "#fff"; c.textAlign = "center"; c.font = r.tam + "px " + SCRIPT;
      r.linhas.forEach(function (l, i) { c.fillText(l, w / 2, topo + (i + 0.85) * r.tam * 1.2); });
      semSombra(c);
      c.font = "italic 600 " + 54 * s + "px " + CORM; c.fillStyle = "#ffe2a0"; c.textAlign = "center";
      c.fillText("— " + v.ref + " —", w / 2, topo + altura + 56 * s);
    },
    impacto: function (c, w, h, s, v) {
      var x = w * 0.11, larg = w * 0.78;
      var r = ajustar(c, v.texto.toUpperCase(), function (t) { return t + "px " + IMPACTO; }, larg, h * 0.5, 132 * s, 56 * s, 1.02);
      var altura = r.linhas.length * r.tam * 1.02, topo = h * 0.52 - altura / 2 - 30 * s;
      c.fillStyle = "#ffd770"; c.fillRect(x - 36 * s, topo + 6 * s, 8 * s, altura + 6 * s);
      sombra(c, s, 0.55);
      c.fillStyle = "#fff"; c.textAlign = "left"; c.font = r.tam + "px " + IMPACTO;
      r.linhas.forEach(function (l, i) { c.fillText(l, x, topo + (i + 0.88) * r.tam * 1.02); });
      semSombra(c);
      c.font = "600 " + 30 * s + "px " + SANS;
      var tw = 0, i; for (i = 0; i < v.ref.length; i++) tw += c.measureText(v.ref[i].toUpperCase()).width + 5 * s;
      var yChip = topo + altura + 40 * s;
      c.fillStyle = "#ffd770"; retArred(c, x, yChip, tw + 48 * s, 62 * s, 8 * s); c.fill();
      c.fillStyle = "#2a1c05"; espacado(c, v.ref.toUpperCase(), x + 24 * s, yChip + 41 * s, 5 * s, "esq");
    },
    vidro: function (c, w, h, s, v, base) {
      var pw = w * 0.84, pad = 64 * s, larg = pw - pad * 2;
      var r = ajustar(c, v.texto, function (t) { return "italic 600 " + t + "px " + CORM; }, larg, h * 0.44, 88 * s, 40 * s, 1.28);
      var altura = r.linhas.length * r.tam * 1.28, ph = altura + pad * 2 + 120 * s;
      var px = (w - pw) / 2, py = h * 0.5 - ph / 2;
      c.save();
      retArred(c, px, py, pw, ph, 36 * s); c.clip();
      try { c.filter = "blur(" + 18 * s + "px)"; c.drawImage(base, 0, 0); c.filter = "none"; } catch (e) { /* sem desfoque */ }
      c.fillStyle = "rgba(255,255,255,.16)"; c.fillRect(px, py, pw, ph);
      c.fillStyle = "rgba(10,12,35,.28)"; c.fillRect(px, py, pw, ph);
      c.restore();
      c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 2 * s; retArred(c, px, py, pw, ph, 36 * s); c.stroke();
      c.fillStyle = "#ffe2a0"; c.font = "700 " + 150 * s + "px " + SERIF; c.textAlign = "left";
      c.fillText("“", px + pad * 0.8, py + pad + 70 * s);
      c.fillStyle = "#fff"; c.font = "italic 600 " + r.tam + "px " + CORM; c.textAlign = "center";
      var topo = py + pad + 70 * s;
      r.linhas.forEach(function (l, i) { c.fillText(l, w / 2, topo + (i + 0.8) * r.tam * 1.28); });
      c.font = "600 " + 28 * s + "px " + SANS; c.fillStyle = "#ffe9b8";
      espacado(c, v.ref.toUpperCase(), w / 2, py + ph - pad * 0.85, 6 * s, "centro");
    }
  };

  // ---------- marca d'água ----------
  var PONTA_DO_DEDO = { x: 0.60, y: 0.63 }; // posição da unha no desenho do logo (0 a 1)
  function limitesDoTexto(antes, depois, w, h) {
    var x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (var y = 0; y < h; y += 3) {
      for (var x = 0; x < w; x += 3) {
        var k = (y * w + x) * 4;
        if (Math.abs(antes[k] - depois[k]) + Math.abs(antes[k + 1] - depois[k + 1]) + Math.abs(antes[k + 2] - depois[k + 2]) > 60) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    return x1 > x0 ? { x0: x0, x1: x1, y0: y0, y1: y1 } : null;
  }
  // Só os traços do desenho, grandes e translúcidos. A ponta do dedo fica logo abaixo do texto,
  // apontando para o versículo; em fundo claro o traço vira escuro.
  function desenharMarca(c, b, w, h, s, caixa) {
    var lado = 760 * s;
    var alvoX = caixa ? (caixa.x0 + caixa.x1) / 2 : w / 2;
    var alvoY = caixa ? Math.min(caixa.y1 + 26 * s, h - 60 * s) : h * 0.62;
    var mx = alvoX - lado * PONTA_DO_DEDO.x, my = alvoY - lado * PONTA_DO_DEDO.y;
    // claridade do fundo onde a marca vai ficar
    var rx = Math.max(0, Math.round(mx)), ry = Math.max(0, Math.round(my));
    var rw = Math.max(1, Math.min(w, Math.round(mx + lado)) - rx), rh = Math.max(1, Math.min(h, Math.round(my + lado)) - ry);
    var px = b.getImageData(rx, ry, rw, rh).data, soma = 0, n = 0;
    for (var i = 0; i < px.length; i += 4 * 37) { soma += 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; n++; }
    var claro = soma / n > 150;
    var tinta = rascunho("tinta", Math.round(lado), Math.round(lado));
    var t = tinta.getContext("2d");
    t.drawImage(imagemMarca, 0, 0, tinta.width, tinta.height);
    if (claro) { t.globalCompositeOperation = "source-in"; t.fillStyle = "#2a2018"; t.fillRect(0, 0, tinta.width, tinta.height); }
    c.save();
    // em fundos com muito desenho (montanhas, ondas) a marca precisa de um pouco mais de força para aparecer
    var vari = 0, n2 = 0, med = soma / n;
    for (var j = 0; j < px.length; j += 4 * 37) { var l = 0.3 * px[j] + 0.59 * px[j + 1] + 0.11 * px[j + 2]; vari += (l - med) * (l - med); n2++; }
    var agitado = Math.sqrt(vari / n2) > 28;
    c.globalAlpha = claro ? 0.22 : agitado ? 0.4 : 0.3;
    c.drawImage(tinta, mx, my, lado, lado);
    c.restore();
  }

  // ---------- desenho completo ----------
  function desenharSync(canvas, v, w, h, marca) {
    canvas.width = w; canvas.height = h;
    var c = canvas.getContext("2d"), s = w / 1080;
    var cena = CENAS[cenaDoVerso(v)], estilo = estiloDoVerso(v);
    var base = rascunho("base", w, h);
    var b = base.getContext("2d");
    var seed = temSemente(v) ? v.semente >>> 0 : semente(v.id), p = temSemente(v) ? variacao(seed) : NEUTRO;
    pintarCena(b, cena, w, h, s, seed, p);
    if (p.tinta) { tingir(b, w, h, p.tinta); enfeitar(b, w, h, s, p); }
    // véu para dar leitura ao texto
    b.fillStyle = grad(b, 0, 0, 0, h, [[0, "rgba(0,0,0," + (cena.escuro * 0.5) + ")"], [0.5, "rgba(0,0,0," + (cena.escuro + 0.06) + ")"], [1, "rgba(0,0,0," + (cena.escuro + 0.2) + ")"]]);
    b.fillRect(0, 0, w, h);
    c.drawImage(base, 0, 0);
    if (marca && imagemMarca && imagemMarca.complete && imagemMarca.naturalWidth) {
      // desenha o texto uma vez só para medir onde ele ficou, e depois põe a marca por baixo dele
      var antes = c.getImageData(0, 0, w, h).data;
      TEXTO[estilo](c, w, h, s, v, base);
      var caixa = limitesDoTexto(antes, c.getImageData(0, 0, w, h).data, w, h);
      c.drawImage(base, 0, 0);
      desenharMarca(c, b, w, h, s, caixa);
    }
    TEXTO[estilo](c, w, h, s, v, base);
    if (marca) rodape(c, w, h, s);
  }
  // endereço do site no rodapé da imagem de compartilhar; no Story fica acima da barra de resposta do Instagram
  var SITE = "toquesagrado.com";
  function rodape(c, w, h, s) {
    var y = h - (h / w > 1.6 ? 300 : 52) * s;
    c.save();
    c.font = "600 " + 24 * s + "px " + SANS;
    sombra(c, s * 0.6, 0.6);
    c.fillStyle = "rgba(255,255,255,.78)";
    espacado(c, SITE, w / 2, y, 4 * s, "centro");
    c.restore();
  }
  // desenha no canvas na tela (mede o elemento) ou em tamanho dado
  function desenhar(canvas, v, opcoes) {
    opcoes = opcoes || {};
    return carregarFontes().then(function () {
      var w = opcoes.largura, h = opcoes.altura;
      if (!w) {
        var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = Math.max(2, Math.round(r.width * dpr)); h = Math.max(2, Math.round(r.height * dpr));
      }
      desenharSync(canvas, v, w, h, opcoes.marca);
    });
  }
  // desenho do logo usado como marca d'água na imagem de compartilhar
  var imagemMarca = null, promessaMarca = null;
  function carregarMarca() {
    if (promessaMarca) return promessaMarca;
    promessaMarca = new Promise(function (ok) {
      imagemMarca = new Image();
      imagemMarca.onload = imagemMarca.onerror = function () { ok(); };
      imagemMarca.src = window.MARCA_SRC || "marca.webp";
      setTimeout(ok, 3000);
    });
    return promessaMarca;
  }
  // JPEG por padrão: com a textura de papel o PNG fica várias vezes maior, e as redes recomprimem de todo jeito
  function blob(v, largura, altura, tipo) {
    tipo = tipo || "image/jpeg";
    var cv = document.createElement("canvas");
    return carregarMarca().then(function () {
      return desenhar(cv, v, { largura: largura, altura: altura, marca: true });
    }).then(function () {
      // devolve a memória da tela grande assim que a imagem fica pronta
      return new Promise(function (ok) { cv.toBlob(function (bl) { cv.width = cv.height = 0; ok(bl); }, tipo, 0.92); });
    });
  }

  window.CENA = { desenhar: desenhar, blob: blob, cenas: Object.keys(CENAS), estilos: ESTILOS, variacao: variacao, cenaDoVerso: cenaDoVerso, estiloDoVerso: estiloDoVerso, desenharSync: desenharSync, carregarFontes: carregarFontes, CENAS: CENAS };
})();
