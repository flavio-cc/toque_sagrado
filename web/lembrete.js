// Lembrete diário: notificação local, agendada no próprio celular. Não usa servidor nem internet.
// No navegador (link de teste) a escolha fica guardada, mas só toca no app das lojas.
(function () {
  "use strict";

  var Cap = window.Capacitor;
  var nativo = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var LN = nativo && Cap.Plugins.LocalNotifications;
  var CHAVE = "toque-lembrete";
  var CANAL = "lembrete";
  // um aviso por dia da semana (1 = domingo), cada um com um texto; os IDs não mudam entre versões
  var BASE_ID = 7100;
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

  var pref = { ativo: false, hora: "07:00" };
  try { pref = Object.assign(pref, JSON.parse(localStorage.getItem(CHAVE)) || {}); } catch (e) { /* sem armazenamento */ }
  function guardar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(pref)); } catch (e) { /* sem armazenamento */ }
  }

  function ids() {
    return TEXTOS.map(function (_, i) { return { id: BASE_ID + i + 1 }; });
  }
  function cancelar() {
    if (!LN) return Promise.resolve();
    return LN.cancel({ notifications: ids() }).catch(function () {});
  }
  function permitir() {
    if (!LN) return Promise.resolve(true);
    return LN.checkPermissions().then(function (p) {
      if (p.display === "granted") return true;
      return LN.requestPermissions().then(function (r) { return r.display === "granted"; });
    }).catch(function () { return false; });
  }
  function agendar() {
    if (!LN) return Promise.resolve();
    var partes = pref.hora.split(":"), hora = +partes[0], minuto = +partes[1];
    var canal = LN.createChannel
      ? LN.createChannel({ id: CANAL, name: "Lembrete diário", description: "Aviso da carta do dia", importance: 3 }).catch(function () {})
      : Promise.resolve();
    return canal.then(cancelar).then(function () {
      return LN.schedule({
        notifications: TEXTOS.map(function (texto, i) {
          return {
            id: BASE_ID + i + 1, title: TITULO, body: texto, channelId: CANAL,
            // alarme comum, sem pedir "alarmes exatos": alguns minutos de diferença não atrapalham um lembrete
            isExactNotification: false,
            schedule: { on: { weekday: i + 1, hour: hora, minute: minuto } }
          };
        })
      });
    });
  }

  // Liga (ou troca o horário). Resolve com { ok, motivo }: motivo "negado" quando a pessoa não deu permissão.
  function ligar(hora) {
    if (/^\d{2}:\d{2}$/.test(hora || "")) pref.hora = hora;
    return permitir().then(function (sim) {
      if (!sim) return { ok: false, motivo: "negado" };
      pref.ativo = true; guardar();
      return agendar().then(function () { return { ok: true }; }, function () { return { ok: false, motivo: "erro" }; });
    });
  }
  function desligar() {
    pref.ativo = false; guardar();
    return cancelar();
  }

  // ao abrir o app, refaz o agendamento (cobre atualização do app e textos novos), sem pedir permissão de novo
  if (LN && pref.ativo) LN.checkPermissions().then(function (p) { if (p.display === "granted") agendar(); }).catch(function () {});

  window.LEMBRETE = {
    nativo: !!LN,
    ativo: function () { return pref.ativo; },
    hora: function () { return pref.hora; },
    ligar: ligar,
    desligar: desligar
  };
})();
