// Lembrete diário: notificação local, agendada no próprio celular. Não usa servidor nem internet.
// Vem ligado às 07:00; a permissão é pedida depois da primeira carta raspada. A pessoa pode trocar o horário ou desligar.
// No navegador (link de teste) a escolha fica guardada, mas só toca no app das lojas.
(function () {
  "use strict";

  var Cap = window.Capacitor;
  var nativo = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var LN = nativo && Cap.Plugins.LocalNotifications;
  var CHAVE = "toque-lembrete";
  var CANAL = "lembrete";
  // um aviso diário (ID 7100); 7101–7107 eram os avisos por dia da semana da 1.0.40 e são cancelados; 7199 é o teste
  var ID = 7100, ID_TESTE = 7199, IDS_ANTIGOS = [7101, 7102, 7103, 7104, 7105, 7106, 7107];
  var TITULO = "Sua carta do dia chegou";
  var TEXTOS = [
    "Respire fundo e descubra o versículo de hoje.",
    "Um versículo de Salmos ou Provérbios espera por você.",
    "Separe um minuto: há uma palavra para o seu dia.",
    "Toque, revele e guarde o versículo de hoje.",
    "Sua sequência continua hoje. Venha ver sua carta.",
    "Uma palavra de Provérbios ou Salmos para começar bem.",
    "A carta de hoje já está pronta para você."
  ];

  // pedido: a permissão já foi pedida uma vez (não insistimos ao abrir o app)
  var pref = { ativo: true, hora: "07:00", pedido: false };
  try { pref = Object.assign(pref, JSON.parse(localStorage.getItem(CHAVE)) || {}); } catch (e) { /* sem armazenamento */ }
  function guardar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(pref)); } catch (e) { /* sem armazenamento */ }
  }

  function cancelar() {
    if (!LN) return Promise.resolve();
    var lista = [ID].concat(IDS_ANTIGOS).map(function (id) { return { id: id }; });
    return LN.cancel({ notifications: lista }).catch(function () {});
  }
  function liberado() {
    if (!LN) return Promise.resolve(true);
    return LN.checkPermissions().then(function (p) { return p.display === "granted"; }).catch(function () { return false; });
  }
  function permitir() {
    if (!LN) return Promise.resolve(true);
    pref.pedido = true; guardar();
    return liberado().then(function (sim) {
      if (sim) return true;
      return LN.requestPermissions().then(function (r) { return r.display === "granted"; });
    }).catch(function () { return false; });
  }
  function criarCanal() {
    if (!LN.createChannel) return Promise.resolve();
    return LN.createChannel({ id: CANAL, name: "Lembrete diário", description: "Aviso da carta do dia", importance: 4 }).catch(function () {});
  }
  // o texto muda a cada vez que o app abre e reagenda
  function textoDoDia() {
    return TEXTOS[Math.floor(Date.now() / 86400000) % TEXTOS.length];
  }
  // Alarme comum que acorda o celular (allowWhileIdle): sem ele, o Android segura o aviso até a tela acender.
  // Não pedimos "alarmes exatos" (o manifesto tira a permissão); o Android pode atrasar o aviso até 1 hora.
  function aviso(id, texto, schedule) {
    return { id: id, title: TITULO, body: texto, channelId: CANAL, smallIcon: "ic_stat_lembrete", iconColor: "#a97c22",
      isExactNotification: false, schedule: schedule };
  }
  function agendar() {
    if (!LN) return Promise.resolve();
    var partes = pref.hora.split(":");
    return criarCanal().then(cancelar).then(function () {
      return LN.schedule({ notifications: [
        aviso(ID, textoDoDia(), { on: { hour: +partes[0], minute: +partes[1], second: 0 }, allowWhileIdle: true })
      ] });
    });
  }

  // Liga (ou troca o horário). Resolve com { ok, motivo }: motivo "negado" quando a pessoa não deu permissão.
  function ligar(hora) {
    if (/^\d{2}:\d{2}$/.test(hora || "")) pref.hora = hora;
    return permitir().then(function (sim) {
      if (!sim) { pref.ativo = false; guardar(); return { ok: false, motivo: "negado" }; }
      pref.ativo = true; guardar();
      return agendar().then(function () { return { ok: true }; }, function () { return { ok: false, motivo: "erro" }; });
    });
  }
  function desligar() {
    pref.ativo = false; guardar();
    return cancelar();
  }
  // aviso de teste daqui a 5 segundos, para a pessoa ver como chega
  function testar() {
    if (!LN) return Promise.resolve({ ok: false, motivo: "navegador" });
    return permitir().then(function (sim) {
      if (!sim) return { ok: false, motivo: "negado" };
      return criarCanal().then(function () {
        return LN.schedule({ notifications: [
          aviso(ID_TESTE, "Assim chega o seu lembrete diário.", { at: new Date(Date.now() + 5000), allowWhileIdle: true })
        ] });
      }).then(function () { return { ok: true }; }, function () { return { ok: false, motivo: "erro" }; });
    });
  }
  // chamado depois da primeira carta raspada: pede a permissão uma vez e agenda o lembrete que já vem ligado
  function primeiraCarta() {
    if (!LN || !pref.ativo || pref.pedido) return Promise.resolve();
    return permitir().then(function (sim) {
      if (sim) return agendar();
      pref.ativo = false; guardar();
    }).catch(function () {});
  }

  // ao abrir o app, refaz o agendamento (cobre atualização do app e o texto do dia), sem pedir permissão de novo
  if (LN && pref.ativo) liberado().then(function (sim) { if (sim) agendar(); }).catch(function () {});

  window.LEMBRETE = {
    nativo: !!LN,
    ativo: function () { return pref.ativo; },
    hora: function () { return pref.hora; },
    ligar: ligar,
    desligar: desligar,
    testar: testar,
    primeiraCarta: primeiraCarta
  };
})();
