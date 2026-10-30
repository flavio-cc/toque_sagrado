# Toque Sagrado

Raspadinha de versículos (Salmos e Provérbios, Bíblia Livre) com narração e imagem única a cada carta.

| Pasta | O que tem |
| --- | --- |
| `web/` | O app em si (HTML, CSS e JS sem build), as cartas, a Bíblia, os áudios e as ferramentas |
| `app/` | Projeto Capacitor que empacota `web/` como app de iPhone e Android (veja `app/LEIA-ME.md`) |
| `.github/workflows/` | Geração automática dos apps na nuvem |

## Gerar os apps

A cada mudança em `web/` ou `app/` na branch `main`, o GitHub Actions:

- **Android:** gera um APK de teste. Baixe em Actions > Android > a execução mais recente > Artifacts.
- **iOS:** compila o app num Mac da nuvem (simulador, sem assinatura) para garantir que o projeto está certo.
  Instalar no iPhone e enviar para a App Store precisa da conta Apple Developer.

Também dá para rodar na mão em Actions > (workflow) > Run workflow.

## Testar no navegador

    cd web && python3 -m http.server 8000

Ou gere o arquivo único de teste com `python3 web/ferramentas/montar-teste.py saida.html`.

Texto bíblico: Bíblia Livre (CC BY).
