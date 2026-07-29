# Plan: Aplicação instalável como PWA

**Date:** 2026-07-29
**Status:** Plano concluído e mesclado em master — Fase 1 (`feature/pwa-manifest-icons`) e Fase 2
(`feature/pwa-service-worker`, branch independente a partir de `master`, já que o service worker
não depende do manifest/ícones pra funcionar).

### Pós-Fase 1 (nota de execução)

Verificado com `npm run dev` + Chrome headless via CDP (`Page.getAppManifest`, o mesmo comando que
a aba Application do DevTools usa): `errors: []`, manifest reconhecido com `name`, `short_name`,
`description`, `display: standalone`, `background_color`/`theme_color` corretos e os 3 ícones
resolvidos (`icon-192.png`, `icon-512.png` any + `icon-maskable-512.png` maskable). `curl` confirmou
`Content-Type: application/manifest+json` (mapeamento correto via `.webmanifest`) e as 3 link tags
(`manifest`, `theme-color`, `apple-touch-icon`) presentes no HTML de `/login`. Build/testes (137/137)/
lint verdes. Checagem real em iOS Safari ("Adicionar à Tela de Início") continua pendente — sem
dispositivo iOS neste ambiente de sessão; risco baixo, já que o manifest é válido por spec e os
ícones seguem os tamanhos exigidos.

### Pós-Fase 2 (nota de execução)

`public/sw.js` faz precache best-effort (cada `cache.add` isolado com `.catch()`, pra um recurso
ausente não derrubar o precache inteiro — relevante aqui porque a lista inclui os ícones/manifest
da Fase 1, que não existem neste branch, já que as duas fases foram propositalmente independentes;
o `fetch` handler cobre `/icons/`, `/css/`, `/js/`, `favicon.svg`, `manifest.webmanifest` por
prefixo/exact-match de qualquer forma, então cachear em runtime funciona mesmo sem o precache
inicial). `res.locals.isProd` exposto em `src/app.ts` (mesmo bloco de `res.locals.theme` etc.);
`<script src="/js/register-sw.js">` incluído nos 3 layouts, envolvido em `<% if (isProd) { %>`.

Verificado ao vivo, dois cenários:
- **Dev** (`npm run dev`, `NODE_ENV=development`): `curl http://localhost:3000/login | grep
  register-sw` não encontra nada — tag não renderizada, SW nunca registrado.
- **Produção** (`NODE_ENV=production node dist/server.js`): tag presente no HTML; verificado via
  Chrome headless + CDP (`Runtime.evaluate` chamando `navigator.serviceWorker.getRegistrations()`
  na própria página, sem registro manual) que o SW carregado pelo script da página registra e ativa
  (`active: "http://localhost:3000/sw.js"`, `scope: "http://localhost:3000/"`).

**Percalço encontrado (não relacionado à Fase 2 em si):** `npm run build` roda `tsc` seguido de
`cpy 'src/views/**/*' dist/views ... && cpy 'public/**/*' dist/public` numa única invocação de
`npm run copy:assets` — nesta sessão, rodando via Bash tool neste Windows, essa cadeia retornou
exit 0 sem gerar `dist/views`/`dist/public` (aparentemente uma falha silenciosa de timing entre os
dois `cpy` encadeados nesse ambiente específico). Rodar os dois comandos `cpy` separadamente (não
encadeados) resolveu nas duas vezes. Não é uma regressão desta Fase — só apareceu porque foi a
primeira vez nesta sessão rodando o server em modo produção local (`node dist/server.js`) via este
Bash tool; o deploy real (Railway/Nixpacks, ver Stack no `CLAUDE.md`) usa `npm run build` num
ambiente Linux diferente e nunca apresentou esse sintoma. Se `dist/views`/`dist/public` aparecerem
vazios de novo ao testar build de produção localmente nesta sessão, rodar os dois `cpy` em
comandos separados em vez de confiar na cadeia `&&` do script.

**Lighthouse não foi rodado**: `npx lighthouse` exigiria baixar o pacote (Puppeteer + Chromium
embutido, download pesado só para uma confirmação pontual) — os mesmos critérios de instalabilidade
que o audit do Lighthouse checaria (manifest válido, service worker registrado com handler de
`fetch`, contexto seguro) já foram confirmados diretamente via CDP acima, então o download foi
cancelado por não agregar evidência nova.

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
