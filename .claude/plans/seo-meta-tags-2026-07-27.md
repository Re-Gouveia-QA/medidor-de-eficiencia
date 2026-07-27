# Plan: Meta tags — SEO, redes sociais e divulgação

**Date:** 2026-07-27 (Fase 1 concluída em 2026-07-27)
**Status:** ativo — Fase 1 concluída em `feature/seo-meta-tags`, não mesclada em `master` ainda
(mesma convenção: push/merge só mediante pedido explícito).

Fase 1: `src/views/partials/meta-tags.ejs` criado e incluído nos dois layouts —
`main.ejs` sempre com `noindex: true` (hardcoded no include, não uma flag por controller, já que
toda página desse layout exige `requireAuth`), `auth.ejs` sem `noindex` (indexável, default
`false`). Helper `buildAppUrl(path)` extraído pra `src/config/env.ts` (era inline em
`AuthController.forgotPassword`, agora reaproveitado também aqui via `res.locals.appUrl`, exposto
pelo middleware global em `app.ts`). Chave `meta.defaultDescription` nova em
`pt-BR.json`/`en-US.json`.

Desvio pequeno do desenho original: **não** foi criada uma chave `meta.siteName` traduzível — o
nome do produto já era um literal hardcoded (`"Medidor de Eficiência"`) nas tags `<title>` dos
dois layouts antes desta fase, então o partial reaproveita o mesmo literal em vez de introduzir
uma segunda fonte de verdade pro nome do app que poderia divergir do `<title>`.

Verificado com o dev server rodando (`npm run dev` + `curl`, mesma técnica do RNF04): `GET /login`
mostra `description`/OG/Twitter preenchidos e **sem** `<meta name="robots">` (página pública,
indexável) — confirmado por inspeção do HTML retornado. O caminho `noindex: true` (páginas
internas) não pôde ser exercitado ao vivo nesta sessão (login com o usuário seed falha com 500 —
Postgres/Docker Desktop indisponível, mesma limitação já registrada em várias fases do RNF04), mas
é o mesmo bloco condicional do partial já exercitado no caminho `false`, então o risco é baixo;
recomenda-se uma checagem visual real assim que o Postgres local estiver disponível.

`og:image`/`twitter:image` apontam pra `/og-image.png`, que ainda não existe como arquivo (Fase 4)
— referência válida, só 404 até lá; não bloqueia esta fase.

Build/lint verdes; testes 127/130 (mesmas 3 falhas de `GET /` sem Postgres local acessível — não
regressão, mesma causa documentada em todo o resto da sessão).

## Goal

Dar ao app metadados corretos de SEO/social (title, description, Open Graph, Twitter Card,
robots, favicon, sitemap) sem expor dados privados: a maior parte do app exige login
(`requireAuth`), então só `/login` e `/register` (e, com ressalva de segurança, `/forgot-password`)
são realmente públicas e valem divulgação orgânica.

## Decisões (confirmadas com o usuário)

- **Indexação:** permitir indexar só as páginas públicas; páginas internas (`/`, `/activities`,
  `/categories`, `/reports`) recebem `<meta name="robots" content="noindex, nofollow">` — defesa em
  profundidade, já que um crawler sem sessão não passa do redirect pro login mesmo assim.
- **OG image:** gerar uma imagem estática 1200×630 agora (estilo "Caderno de Esboço"), não um
  placeholder.
- **Favicon:** gerar a partir da identidade visual existente (tokens de cor + linguagem dos ícones
  de `icon.ejs`), não deixar em aberto.

## Scope

### In-Scope
- Partial `meta-tags.ejs` reaproveitado pelos dois layouts (`main.ejs`/`auth.ejs`): description,
  canonical, Open Graph, Twitter Card, robots.
- `description` por página só nas 4 páginas públicas de auth (login/register/forgot/reset) — as
  páginas internas usam uma description padrão (não vale tocar em
  Home/Activity/Category/ReportController só por isso).
- `favicon.svg` novo, ligado nos dois layouts.
- `og-image.png` (1200×630) estático, gerado uma única vez.
- `public/robots.txt` e `public/sitemap.xml` estáticos.
- Textos de meta tag (description das páginas de auth, description padrão) entram nos dicionários
  de i18n já existentes (`src/i18n/pt-BR.json`/`en-US.json`), reaproveitando `t()` — já disponível
  globalmente via middleware em `app.ts` (`res.locals.t`), mesmo nas rotas públicas de auth.

### Out-of-Scope
- Traduzir o resto do conteúdo de `auth/*.ejs` (labels, mensagens de erro/flash) — isso é a Fase 1
  do plano `.claude/plans/i18n-en-us-2026-07-24.md`, não deste plano. Aqui só as chaves de meta tag
  usam `t()` nessas views.
- `favicon.ico`/PNG rasterizado para navegadores muito antigos — só SVG (`public/favicon.svg`),
  suportado por Chrome/Firefox/Edge e Safari 16+. Decisão de escopo, não pendência: reabrir só se um
  navegador alvo real não suportar.
- `description` custom por atividade/categoria/relatório individual (ex.: relatório de um mês
  específico) — sem valor de SEO já que são páginas com `noindex`.
- Validar rendering real em Facebook Sharing Debugger / Twitter Card Validator (exige deploy
  público) — verificação manual pendente, mesma limitação já registrada em outros planos (sem
  ferramenta de browser/rede neste ambiente de sessão).

## Phases

### Phase 1: Partial de meta tags + wiring nos layouts
**Objetivo:** infraestrutura única reaproveitada pelas duas famílias de página (auth e app).

**Steps:**
1. `src/app.ts`: expor um helper `res.locals.appUrl(path)` (ou variável `res.locals.baseUrl`) que
   monta URL absoluta reaproveitando o mesmo fallback já usado em `AuthController.ts:115`
   (`env.APP_URL ?? \`http://localhost:${env.PORT}\``) — não duplicar a lógica, extrair pra
   `src/config/env.ts` ou `src/utils/` e importar dos dois lugares.
2. `src/views/partials/meta-tags.ejs` (novo): recebe locals `description` (opcional, cai pro
   `t('meta.defaultDescription')`), `noindex` (boolean, default `false`), `ogImage` (opcional, cai
   pra `/og-image.png`). Renderiza: `<meta name="description">`, `<link rel="canonical">`,
   `<meta property="og:type|title|description|url|image|site_name|locale">`,
   `<meta name="twitter:card" content="summary_large_image">` +
   `twitter:title|description|image`, e `<meta name="robots" content="noindex, nofollow">` só
   quando `noindex` for true.
3. `src/views/layouts/main.ejs`: incluir o partial no `<head>` passando `noindex: true` sempre
   (toda página que usa este layout já exige `requireAuth`, não precisa de flag por controller).
4. `src/views/layouts/auth.ejs`: incluir o partial no `<head>` sem `noindex` (default `false`) e
   passando `description` quando a view fornecer.
5. `src/i18n/pt-BR.json` / `en-US.json`: chave `meta.defaultDescription` (uma frase curta,
   ~150 caracteres, descrevendo o produto) + `meta.siteName` ("Medidor de Eficiência").

**Files Touched:** `src/app.ts`, `src/config/env.ts` (ou novo `src/utils/url.ts`),
`src/views/partials/meta-tags.ejs`, `src/views/layouts/main.ejs`, `src/views/layouts/auth.ejs`,
`src/i18n/pt-BR.json`, `src/i18n/en-US.json`
**Verify:** `npm run build && npm test && npm run lint`
**Done When:** `curl -s http://localhost:3000/login | grep -i 'og:title\|robots'` mostra as tags
esperadas (indexável); `curl -s http://localhost:3000/` (sem sessão, redireciona pro login) e, com
sessão, mostra `noindex`.

**Replanning triggers:**
- Se `res.locals.appUrl` colidir com algo já existente em `res.locals` (checar antes de nomear).

---

### Phase 2: Description por página nas rotas públicas de auth
**Objetivo:** cada página pública tem title/description próprios (melhor preview em busca/social)
em vez do fallback genérico.

**Steps:**
1. `src/i18n/pt-BR.json`/`en-US.json`: chaves `auth.login.metaDescription`,
   `auth.register.metaDescription`, `auth.forgotPassword.metaDescription` (a página de reset não
   precisa de description própria — não é uma página de entrada por busca, ver Phase 4/robots).
2. `AuthController.showLogin/showRegister/showForgotPassword`: passar
   `description: t(...)` (via `res.locals.t`, já disponível no controller através de
   `res.locals` — usar `res.locals.t` dentro do controller, não importar `createTranslator` de
   novo) nas chamadas de `res.render`.

**Files Touched:** `src/controllers/AuthController.ts`, `src/i18n/pt-BR.json`, `src/i18n/en-US.json`
**Verify:** `npm run build && npm test && npm run lint`
**Done When:** `view-source` de `/login` e `/register` mostra `description`/`og:description`
diferentes um do outro e do fallback genérico.

---

### Phase 3: Favicon
**Objetivo:** ícone de aba consistente com a identidade "Caderno de Esboço".

**Steps:**
1. `public/favicon.svg`: marca simples (monograma "M" ou um ícone do catálogo de `icon.ejs`, ex.
   `clock`/`star`) em `--ink`/`--accent-blue` sobre fundo `--paper` — sem o filtro de turbulência
   SVG (`sketch-rough-*`), que não faz sentido em um ícone renderizado a poucos pixels na aba do
   navegador.
2. `src/views/layouts/main.ejs` e `auth.ejs`: `<link rel="icon" href="/favicon.svg"
   type="image/svg+xml">` no `<head>`.

**Files Touched:** `public/favicon.svg`, `src/views/layouts/main.ejs`, `src/views/layouts/auth.ejs`
**Verify:** `npm run dev` + abrir qualquer página, checar o ícone na aba do navegador.
**Done When:** favicon aparece na aba em pelo menos um navegador testável nesta sessão.

---

### Phase 4: Imagem de preview social (OG image)
**Objetivo:** preview visual ao compartilhar um link do app (WhatsApp, Twitter/X, LinkedIn,
Facebook) — esses crawlers não renderizam SVG em `og:image`, por isso precisa ser um raster.

**Steps:**
1. `scripts/generate-og-image.ps1` (novo, não é dependência de runtime nem de build do app — script
   de geração de asset, rodado uma vez e re-rodável se o texto/cores mudarem): usa
   `System.Drawing` (já disponível via .NET no Windows, sem instalar pacote novo) pra desenhar um
   PNG 1200×630 — fundo `--paper`, título "Medidor de Eficiência" em destaque, subtítulo curto —
   nas cores/tema claro do design system (valores hardcoded no script, não lidos de `tokens.css`,
   já que é `oklch()` e `System.Drawing` não entende esse espaço de cor — converter manualmente
   pros RGB aproximados usados hoje).
2. Rodar o script uma vez, versionar `public/og-image.png` gerado.
3. Confirmar que `meta-tags.ejs` (Phase 1) já aponta `og:image`/`twitter:image` pra
   `<%= appUrl('/og-image.png') %>` (URL absoluta — obrigatório para OG, crawlers não resolvem
   caminho relativo).

**Files Touched:** `scripts/generate-og-image.ps1` (novo), `public/og-image.png` (novo, binário)
**Verify:** abrir `public/og-image.png` localmente (dimensões 1200×630) + `curl -I
http://localhost:3000/og-image.png` retorna 200.
**Done When:** imagem existe, dimensões corretas, `og:image`/`twitter:image` resolvem pra URL
absoluta válida.

**Replanning triggers:**
- Se o resultado do `System.Drawing` ficar visualmente ruim demais (fontes manuscritas do projeto —
  Patrick Hand/Architects Daughter — não são fontes do sistema Windows por padrão, então o texto no
  PNG vai sair numa fonte genérica, não a do design system): aceitável para uma v1 (é só o preview
  de compartilhamento, não a UI real), mas se o usuário achar ruim ao ver o resultado, considerar
  instalar as fontes localmente antes de gerar, ou aceitar o visual mais neutro.

---

### Phase 5: `robots.txt` + `sitemap.xml`
**Objetivo:** guiar crawlers explicitamente, e blindar a URL de reset de senha (contém token) de
qualquer indexação acidental.

**Steps:**
1. `public/robots.txt`: `Allow: /login`, `Allow: /register`, `Allow: /forgot-password`;
   `Disallow: /reset-password/` (contém token no path — nunca deve ser crawleada/indexada, mesmo
   sendo tecnicamente pública antes da validação do token), `Disallow: /activities`,
   `Disallow: /categories`, `Disallow: /reports`, `Disallow: /health`; `Sitemap:` apontando pra
   `sitemap.xml`.
2. `public/sitemap.xml`: só `/login` e `/register` (as únicas páginas de entrada com valor de SEO
   real) — URLs absolutas via o mesmo `appUrl()` da Phase 1, mas como é um arquivo estático (não
   EJS), gerar com o valor de `APP_URL`/fallback localhost no momento do build ou deixar
   documentado que a URL de produção precisa ser hardcoded manualmente aqui (arquivo estático não
   tem acesso a `env` em runtime) — decisão simples: hardcode a URL de produção quando o domínio
   estiver definido; até lá, usar `http://localhost:3000` como placeholder documentado.

**Files Touched:** `public/robots.txt` (novo), `public/sitemap.xml` (novo)
**Verify:** `curl http://localhost:3000/robots.txt` e `curl http://localhost:3000/sitemap.xml`
retornam os arquivos; `npm test` continua verde (garantir que nenhuma rota de teste colide com os
novos arquivos estáticos).
**Done When:** os dois arquivos são servidos por `express.static` sem precisar de rota nova.

## Dependencies & Assumptions

- Assume que o domínio de produção real ainda não está decidido — `sitemap.xml`/`APP_URL` usam
  `localhost` como placeholder até o usuário informar o domínio final; revisar antes do primeiro
  deploy com o domínio definitivo.
- Depende de `src/app.ts` já expor `res.locals.t`/`res.locals.locale` globalmente (confirmado —
  linhas 107-109 do arquivo atual), então nenhuma mudança de middleware é necessária além do
  helper de URL da Phase 1.

## Notes

- Cada fase em branch própria, seguindo a convenção já estabelecida
  ([[feedback_separate_branches]]) — não mesclar sem pedido explícito.
- Interação com `.claude/plans/i18n-en-us-2026-07-24.md`: este plano usa `t()` só para as novas
  chaves de meta tag; não antecipa nem substitui a Fase 1 daquele plano (tradução completa das
  views de auth).
