# Plan: Aplicação instalável como PWA

**Date:** 2026-07-29
**Status:** draft

## Goal

Permitir que o usuário instale o app (ícone na tela inicial/desktop, sem chrome de navegador) via
"Adicionar à tela inicial"/"Instalar app" — sem virar um app offline completo: continua um app
server-rendered comum, só ganha manifest + ícones + um service worker mínimo que cacheia só
assets estáticos (nunca HTML/dados de usuário).

## Levantamento (estado atual)

- Não existe `manifest`/`site.webmanifest`, nenhum ícone PNG (só `public/favicon.svg`, vetorial,
  e `public/og-image.png`, 1200×630, não-quadrado — nenhum dos dois serve como ícone de app) nem
  service worker hoje. Zero infraestrutura de PWA no repo.
- `public/robots.txt`/`public/sitemap.xml` confirmam o padrão já usado no projeto: arquivos
  estáticos de config vivem soltos em `public/` e são servidos direto por `express.static`
  (`src/app.ts:89`, montado bem no início do pipeline, antes do rate limit) — sem rota dedicada.
  `manifest.webmanifest` e os ícones seguem o mesmo padrão.
- CSP (helmet, `src/app.ts:126`) usa as diretivas default + `style-src` customizado — o default já
  cobre `default-src 'self'`/`script-src 'self'`, o que já permite `manifest.webmanifest` (mesma
  origem, cai em `default-src`) e o registro do service worker (mesma origem, cai em
  `script-src`/`worker-src`, que herda de `script-src` quando não setado) sem nenhuma mudança de
  CSP.
- Os 3 layouts (`auth.ejs`, `main.ejs`, `marketing.ejs`) incluem `partials/meta-tags` uma vez cada
  no `<head>` — ponto único pra adicionar `<link rel="manifest">` + `<meta name="theme-color">`
  sem editar os 3 arquivos separadamente.
- `--paper`/`--accent-blue` (modo claro, `tokens.css`) já foram convertidos pra hex nesta sessão
  (`#FAECDA`/`#2171CC`, usados no favicon recalibrado) — mesmos valores viram
  `background_color`/`theme_color` do manifest, sem recalcular.

## Decisão de implementação

- **Ícones gerados via `scripts/generate-app-icons.ps1`** (PowerShell + `System.Drawing`), mesmo
  padrão já estabelecido em `scripts/generate-og-image.ps1` — desenha o mesmo visual do favicon
  (quadrado arredondado + "S" + traço) em 192×192 e 512×512, mais uma variante "maskable" (mesmo
  desenho com ~20% de padding de segurança nas bordas, exigido por Android/Chrome pra ícones
  adaptativos). Script committado (repetível se as cores mudarem de novo), PNGs gerados committados
  como assets estáticos normais.
- **`manifest.webmanifest`, não `manifest.json`**: `.webmanifest` já mapeia pra
  `Content-Type: application/manifest+json` no `mime-db` que o `express.static` usa por baixo dos
  panos — o tipo "correto" por spec, sem precisar de uma rota custom só pra setar o header.
- **Service worker mínimo, sem app-shell/offline completo**: só precisa satisfazer o critério de
  instalabilidade do Chrome (SW registrado com um listener de `fetch`) + cachear os assets
  estáticos (`/css/*`, `/js/*`, `/icons/*`, `favicon.svg`, o manifest) com cache-first. **Nunca
  cacheia HTML nem respostas de rota** (dados por usuário/sessão) — evita servir uma página
  autenticada desatualizada/errada offline, que seria o risco real de um SW mais "esperto".
- **Registro do SW só em produção** (`isProd`, `src/config/env.ts`): em dev, `tsx watch` já dá hot
  reload de tudo — um SW fazendo cache-first de CSS/JS criaria exatamente o tipo de "por que minha
  mudança não aparece" que `CLAUDE.md` já documenta pra i18n (dev gotcha), só que pra todo asset
  estático. Gate simples: `res.locals.isProd` setado uma vez em `src/app.ts`, script de registro
  só roda `<% if (isProd) { %>`.

## Escopo

### Dentro do escopo
- Manifest (`public/manifest.webmanifest`) + 3 ícones (192, 512, maskable-512) + link tags
  (`manifest`, `theme-color`, `apple-touch-icon`) nos 3 layouts via `partials/meta-tags.ejs`.
- Service worker mínimo (`public/sw.js`) cacheando só assets estáticos, registrado só em produção.
- Verificação via Chrome DevTools (aba Application → Manifest/Service Workers) + Lighthouse
  (critérios de instalabilidade).

### Fora do escopo
- Offline completo / cache de HTML ou de dados (fora do pedido, e arriscado pra um app com sessão/
  dados por usuário).
- Push notifications (exigiria um serviço de push próprio — não pedido).
- Ícone específico pro Windows (`browserconfig.xml`/tiles) — só o essencial cross-platform
  (Android/Chrome/iOS/Desktop).
- Background sync / atualização em segundo plano.

## Fases

### Fase 1: Manifest + ícones
**Objetivo:** critérios de instalabilidade do iOS Safari completos (manifest + ícones, iOS não
exige service worker) e metade dos critérios do Chrome/Android.

**Passos:**
1. `scripts/generate-app-icons.ps1` (novo): desenha o visual do favicon (quadrado arredondado,
   fundo `#FAECDA`, "S" `#3C291D`, traço `#2171CC`) em `public/icons/icon-192.png`,
   `public/icons/icon-512.png` e `public/icons/icon-maskable-512.png` (mesmo desenho com padding
   de segurança).
2. Rodar o script, revisar os 3 PNGs gerados (visualmente, tamanho/nitidez corretos).
3. `public/manifest.webmanifest` (novo): `name`, `short_name`, `description`, `start_url: "/"`,
   `scope: "/"`, `display: "standalone"`, `background_color: "#FAECDA"`, `theme_color: "#2171CC"`,
   `icons` (os 3 PNGs, o maskable com `purpose: "maskable"`).
4. `src/views/partials/meta-tags.ejs`: adicionar `<link rel="manifest" href="/manifest.webmanifest">`,
   `<meta name="theme-color" content="#2171CC">`, `<link rel="apple-touch-icon" href="/icons/icon-192.png">`.

**Files Touched:** `scripts/generate-app-icons.ps1` (novo), `public/icons/icon-192.png` (novo),
`public/icons/icon-512.png` (novo), `public/icons/icon-maskable-512.png` (novo),
`public/manifest.webmanifest` (novo), `src/views/partials/meta-tags.ejs`
**Verify:** `npm run dev` + DevTools → Application → Manifest (Chrome reconhece o manifest, ícones
carregam sem 404, nenhum erro de parsing).
**Done When:** o manifest aparece corretamente na aba Application do DevTools, com os 3 ícones
carregados; iOS Safari (ou emulação) mostra o nome/ícone corretos em "Adicionar à Tela de Início".

---

### Fase 2: Service worker (registro só em produção)
**Objetivo:** critérios de instalabilidade do Chrome/Android completos (prompt "Instalar app"
aparece), sem cachear nada além de assets estáticos.

**Passos:**
1. `public/sw.js` (novo): `install` faz precache de uma lista fixa (`/css/*.css` conhecidos,
   `/js/*.js` conhecidos, os 3 ícones, `favicon.svg`, `manifest.webmanifest`); `fetch` responde
   cache-first só pra requests cujo path bate com essa lista (ou prefixo `/css/`/`/js/`/`/icons/`),
   e passa direto pro `fetch()` de rede pra tudo mais (nenhum HTML, nenhuma rota da API); `activate`
   limpa caches de versões antigas (nome do cache com uma constante de versão).
2. `src/app.ts`: adicionar `res.locals.isProd = isProd` no mesmo bloco que já seta `res.locals.theme`
   etc.
3. `public/js/register-sw.js` (novo): `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`.
4. Incluir `<script src="/js/register-sw.js"></script>` nos 3 layouts (`auth.ejs`, `main.ejs`,
   `marketing.ejs`), envolvido em `<% if (isProd) { %> ... <% } %>`.

**Files Touched:** `public/sw.js` (novo), `public/js/register-sw.js` (novo), `src/app.ts`,
`src/views/layouts/auth.ejs`, `src/views/layouts/main.ejs`, `src/views/layouts/marketing.ejs`
**Verify:** `NODE_ENV=production npm run build && NODE_ENV=production node dist/server.js` local +
DevTools → Application → Service Workers (registrado, ativo) + Lighthouse PWA audit.
**Done When:** Lighthouse acusa os critérios de instalabilidade atendidos; em dev (`npm run dev`),
nenhum SW é registrado (confirmar na mesma aba do DevTools) — CSS/JS continuam sendo servidos
sempre frescos.

## Dependências e suposições

- Assume produção já roda em HTTPS (Railway) — requisito de PWA pra instalabilidade fora de
  localhost.
- Cada fase em branch própria, sem merge automático (convenção já estabelecida nesta sessão).

## Notas

- Ícones reaproveitam exatamente o visual do favicon recalibrado nesta sessão — sem inventar uma
  variante nova de marca só pro app icon.
