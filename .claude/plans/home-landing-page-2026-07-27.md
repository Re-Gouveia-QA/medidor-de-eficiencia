# Plan: Home pública — explicação do app + maneiras criativas de usar

**Date:** 2026-07-27 (Fase 1 concluída em 2026-07-27)
**Status:** ativo — Fase 1 concluída em `feature/home-landing-page`, não mesclada em `master`
ainda (mesma convenção: push/merge só mediante pedido explícito).

Fase 1: rota dividida em `src/routes/index.ts` (dois handlers em `GET /`: o primeiro checa
`req.session.userId` e já responde com `LandingController.show` se não houver sessão, senão
`next()` pro handler existente `requireAuth + HomeController.index`, intocado). `LandingController`
novo (estende `BaseController`, mesmo padrão dos demais) + `layouts/marketing.ejs` (topbar próprio
com toggle de tema/idioma — reaproveita `theme-toggle.js`/`locale-toggle.js` sem mudança — e
CTAs "Entrar"/"Criar conta") + `marketing/landing.ejs` esqueleto (só o título, via
`marketing.hero.title`, que as próximas fases reaproveitam).

**Efeito colateral esperado, não uma regressão:** 2 testes pré-existentes assumiam que `GET /`
sem sessão sempre redirecionava pro `/login` (302) — `tests/routes/guards.routes.test.ts`
(removido `/` da lista `rotasProtegidas`, com comentário explicando por quê) e
`tests/routes/auth.routes.test.ts` (`POST /logout` verificava `GET /` pós-logout redirecionando;
ajustado pra esperar 200, já que agora mostra a landing pública). Ambos os ajustes só atualizam a
expectativa pra refletir o comportamento intencional desta fase, não escondem uma falha real.

Testes novos em `tests/routes/home.routes.test.ts` (3 casos: sem sessão mostra a landing em
pt-BR, sem sessão + cookie `locale=en-US` mostra em inglês, com sessão continua mostrando o
dashboard de sempre). Verificado ao vivo (dev server + curl, mesma técnica das fases anteriores)
nos dois idiomas.

Build/lint verdes; testes 129/132 (as 3 falhas são as mesmas de sempre — `GET /` autenticado via
Google/login real, precisa de Postgres local, Docker Desktop indisponível nesta sessão — não
regressão; note que essas 3 usam uma rota diferente da que essa fase mexeu, é o *dashboard*
autenticado que falha por causa do banco, não a landing pública nova).

## Goal

Dar ao app uma home pública de verdade: visitante sem sessão que acessa `/` hoje é redirecionado
direto pro `/login` (sem contexto nenhum sobre o que o produto faz); usuário autenticado continua
vendo o dashboard normal em `/`. A nova home explica o produto e apresenta usos criativos
concretos, amarrados a funcionalidades reais (não é só cópia de marketing genérica).

## Decisões (confirmadas com o usuário)

- **Rota:** `/` fica pública quando deslogado (mostra a nova home explicativa); autenticado
  continua vendo o dashboard existente em `/`, sem nenhuma mudança de comportamento pra quem já
  está logado.
- **Estética:** dentro da identidade "Caderno de Esboço" já existente (mesmos tokens/fontes/
  mecanismos: `sketch-edge`, `sketch-in`, `--stagger-index`, `--tilt`, sublinhado à mão), mas a
  expressão mais ousada disso até agora no app — tipografia em escala de hero, mais movimento,
  composição mais assimétrica do que qualquer página interna. Não é uma peça de marketing à parte
  com identidade própria.

## Scope

### In-Scope
- Nova rota pública em `/` (só quando deslogado) — dashboard autenticado em `/` não muda.
- Novo `LandingController` + view + layout próprio (`layouts/marketing.ejs`), com topbar próprio
  (marca + toggle de tema/idioma + "Entrar"/"Criar conta", em vez de docs/logout do `main.ejs`).
- Seções: hero (proposta de valor + CTA), "o que é o app" (atividades/categorias/relatórios),
  "maneiras criativas de usar" (5-6 casos de uso concretos amarrados a features reais: valor por
  categoria, duração padrão, atividade em andamento, relatório valor x tempo), CTA final.
- Scroll reveal simples (IntersectionObserver, JS puro) pras seções abaixo da dobra — reaproveita
  a animação `sketch-in`/`--stagger-index` já existente, só troca o gatilho (hoje dispara no
  carregamento da página; passa a disparar ao entrar na viewport).
- i18n completo (pt-BR/en-US) via `t()`, mesmo mecanismo já usado no resto do app.
- Ajuste em `public/robots.txt`/`public/sitemap.xml` (do plano de SEO já mesclado): `/` passa a
  ser uma página pública de valor real pra indexação — hoje só `/login`/`/register`/
  `/forgot-password` estão liberadas.
- `description`/meta tags próprias da nova home (reaproveitando `meta-tags.ejs` já existente).

### Out-of-Scope
- Qualquer mudança no dashboard autenticado (`HomeController.index`, `home/index.ejs`) — fica
  exatamente como está.
- Blog, changelog público, páginas de pricing/planos (não existe modelo de cobrança no app).
- Depoimentos/prova social (não há usuários reais pra citar).
- Vídeo/demo interativo — só texto + composição visual estática/animada em CSS.
- Scroll-driven site completo estilo `video-to-website` (pin de seção, marquee horizontal, GSAP)
  — o projeto não tem GSAP nem build step de frontend; o scroll reveal fica limitado a
  IntersectionObserver + CSS, no espírito do resto do app.

## Phases

### Phase 1: Split de rota (`/` público vs autenticado) + esqueleto
**Objetivo:** provar a divisão de rota sem investir no design ainda — dashboard autenticado não
pode quebrar.

**Steps:**
1. `src/routes/index.ts`: antes de `routes.get('/', requireAuth, HomeController.index)`, adicionar
   `routes.get('/', (req, res, next) => { if (req.session.userId) return next(); return
   LandingController.show(req, res); })` — Express permite múltiplos handlers pro mesmo path;
   sessão ativa cai pro handler existente (`next()`), sem sessão renderiza a landing. Não mexe em
   `requireAuth`/`HomeController` (só usados por autenticado, no segundo handler).
2. `src/controllers/LandingController.ts` (novo): `show` renderiza `marketing/landing` com
   `layout: 'layouts/marketing'`, título/description via `res.locals.t`.
3. `src/views/layouts/marketing.ejs` (novo, esqueleto mínimo): `<html lang>`/tema/meta-tags iguais
   a `auth.ejs`, topbar simples (marca + "Entrar"/"Criar conta"), `<%- body %>`.
4. `src/views/marketing/landing.ejs` (novo, esqueleto): só um `<h1>` de placeholder, pra validar o
   roteamento.

**Files Touched:** `src/routes/index.ts`, `src/controllers/LandingController.ts`,
`src/views/layouts/marketing.ejs`, `src/views/marketing/landing.ejs`,
`tests/routes/home.routes.test.ts` (novo caso: `GET /` sem sessão → 200 + landing; `GET /` com
sessão → comportamento atual inalterado)
**Verify:** `npm run build && npm test && npm run lint`
**Done When:** suíte verde incluindo os 2 casos novos; `curl` sem cookie de sessão em `/` retorna
200 com o esqueleto da landing, com sessão retorna o dashboard de sempre.

**Replanning triggers:**
- Se o branching de rota exigir tocar em `requireAuth`/`redirectIfAuthenticated` além do previsto
  (nenhuma mudança neles é esperada) — sinal de que o design da Fase 1 está errado, reavaliar
  antes de seguir.

---

### Phase 2: Topbar da landing + hero
**Objetivo:** primeira impressão — proposta de valor clara, CTA visível, expressão tipográfica
mais ousada que qualquer página interna hoje.

**Steps:**
1. `layouts/marketing.ejs`: topbar completo — marca, toggle de tema (`theme-toggle.js`, já
   existente), toggle de idioma (`locale-toggle.js`, já existente), botões "Entrar" (`btn-ghost`
   ou `btn-secondary`) e "Criar conta" (`btn-primary`) linkando pra `/login`/`/register`.
2. `marketing/landing.ejs`: seção hero — headline em escala maior que `.auth-title`/
   `.home-greeting` de hoje (novo token de tamanho se necessário, ex. `--text-hero` em
   `tokens.css`), sublinhado à mão (reaproveita o path SVG de `.title-underline`), subheadline,
   CTA duplo ("Criar conta grátis" primário + "Já tenho conta" secundário).
3. Chaves i18n novas (`marketing.hero.*`) em `pt-BR.json`/`en-US.json`.

**Files Touched:** `src/views/layouts/marketing.ejs`, `src/views/marketing/landing.ejs`,
`public/css/tokens.css` (só se precisar de um tamanho novo), `public/css/components.css` (estilos
da landing, ou novo `public/css/marketing.css` importado em `styles.css` se o volume justificar),
`src/i18n/pt-BR.json`, `src/i18n/en-US.json`
**Verify:** `npm run build && npm test && npm run lint`; `npm run dev` + `curl` pra conferir texto
renderizado nos dois idiomas (mesma técnica usada nas fases do RNF04/SEO).
**Done When:** hero renderiza com CTA funcional (linka pra `/login`/`/register` reais), i18n
paridade 1:1 confirmada por script.

---

### Phase 3: Seção "o que é o app"
**Objetivo:** explicar as 3 funcionalidades centrais (atividades, categorias, relatórios) de forma
concreta, não abstrata.

**Steps:**
1. `marketing/landing.ejs`: 3 blocos (um por funcionalidade), reaproveitando os mesmos ícones já
   usados no menu da home autenticada (`plus`/`tag`/`star` ou equivalentes de `icon.ejs`) — mesma
   cor de seção já estabelecida em `polimento-paginas-internas` (`--accent-blue`/`--accent-green`/
   `--accent-yellow`), pra já criar familiaridade com quem depois entra logado.
2. `public/js/scroll-reveal.js` (novo): `IntersectionObserver` que adiciona a classe `sketch-in`
   (com `--stagger-index` por item) quando a seção entra na viewport, em vez de disparar só no
   carregamento — reaproveita a animação existente, só muda o gatilho. Cai pra "sempre visível,
   sem animação" se `IntersectionObserver` não existir (feature detection) ou se
   `prefers-reduced-motion` estiver ativo (já tratado globalmente em `tokens.css`, mas o JS não
   deve nem tentar animar nesse caso).
3. Chaves i18n novas (`marketing.whatIsIt.*`).

**Files Touched:** `src/views/marketing/landing.ejs`, `public/js/scroll-reveal.js` (novo),
`src/i18n/pt-BR.json`, `src/i18n/en-US.json`
**Verify:** `npm run build && npm test && npm run lint`
**Done When:** as 3 seções renderizam com o conteúdo certo; `scroll-reveal.js` não quebra quando
`prefers-reduced-motion: reduce` (checar a media query já existe, só confirmar que o JS não força
inline styles que a ignorem).

---

### Phase 4: Seção "maneiras criativas de usar"
**Objetivo:** o coração do pedido do usuário — casos de uso concretos que mostram elasticidade do
app além do óbvio ("registrar meu trabalho").

**Steps:**
1. Escrever 5-6 casos de uso curtos (título + 1-2 frases cada), todos amarrados a uma feature real
   do app pra não soarem genéricos:
   - Freelancer cobrando por projeto → categoria com `possuiValor` (valor por hora/entrega).
   - Estudante organizando matérias → categorias por disciplina + `tempoDesejadoMin` (meta diária).
   - Orçamento doméstico informal → `valor`/`valorPadrao` em categorias tipo "Mercado"/"Lazer" (o
     app não é um app financeiro, mas o campo de valor já serve pra isso sem mudar nada).
   - Rotina de exercício → `duracaoPadraoMin` (academia sempre 1h) + relatório de dias registrados.
   - Hábito/streak (leitura, prática de instrumento, etc.) → "dias registrados" do relatório como
     contador de consistência.
   - Foco/deep work vs. reuniões → atividade "em andamento" pra cronometrar em tempo real +
     categorias separando os dois tipos de tempo.
2. Layout em cards (reaproveita `.card`/`.sketch-edge`/`.sketch-in`/`.sketch-hover` já existentes),
   grade responsiva, cada card com ícone + título + descrição curta.
3. Chaves i18n novas (`marketing.useCases.*`).

**Files Touched:** `src/views/marketing/landing.ejs`, `src/i18n/pt-BR.json`, `src/i18n/en-US.json`
**Verify:** `npm run build && npm test && npm run lint`
**Done When:** 5-6 cards renderizados, cada um citando uma feature real e verificável no código
(não uma promessa vazia), paridade i18n confirmada.

**Replanning triggers:**
- Se o usuário quiser trocar algum caso de uso por outro específico (ele conhece melhor o público
  real do app) — ajustar conteúdo, não a estrutura.

---

### Phase 5: CTA final + robots.txt/sitemap + validação cruzada
**Objetivo:** fechar o loop com SEO (que já assumia só `/login`/`/register` como entrada) e validar
a landing inteira, dois idiomas, dois temas.

**Steps:**
1. `marketing/landing.ejs`: seção de CTA final (repete "Criar conta grátis").
2. `public/robots.txt`: adicionar `Allow: /` (hoje só libera `/login`/`/register`/
   `/forgot-password`) — a home pública passa a ter valor real de SEO.
3. `public/sitemap.xml`: adicionar `<url><loc>.../</loc></url>`.
4. `LandingController.show`: description própria via `t('marketing.metaDescription')` (não usar o
   fallback genérico de `meta.defaultDescription`, já que agora existe uma home real com conteúdo
   próprio pra descrever).
5. Rodar `npm run dev` + `curl` nos dois idiomas (mesma técnica das fases anteriores) — confirmar
   `lang`, títulos, hero, as 3 seções e os CTAs traduzidos corretamente; verificar visualmente
   (`Read` da página renderizada, se possível, ou ao menos a estrutura HTML) que não há elemento
   quebrado.

**Files Touched:** `src/views/marketing/landing.ejs`, `public/robots.txt`, `public/sitemap.xml`,
`src/controllers/LandingController.ts`, `src/i18n/pt-BR.json`, `src/i18n/en-US.json`
**Verify:** `npm run build && npm test && npm run lint`; `curl` nos dois idiomas; paridade i18n via
script (mesmo padrão das fases anteriores).
**Done When:** build/testes/lint verdes; `/` deslogado mostra a landing completa nos dois idiomas;
`/` logado continua mostrando o dashboard sem nenhuma regressão; `robots.txt`/`sitemap.xml`
atualizados.

## Dependencies & Assumptions

- Depende do partial `meta-tags.ejs` e do helper `res.locals.appUrl`/`res.locals.t`/
  `res.locals.locale` já existentes (planos de SEO e i18n, ambos já mesclados em `master`).
- Assume que não há ferramenta de browser real neste ambiente de sessão — validação visual fica
  limitada a `curl`/inspeção de HTML, mesma limitação documentada em todos os planos anteriores.
  Recomendado uma checagem visual real (dois temas, dois idiomas) antes de considerar a home
  100% pronta.

## Notes

- Cada fase em branch própria (`feature/home-landing-page` ou uma por fase, a definir no início da
  execução — mesma convenção da sessão), não mesclar sem pedido explícito.
- Interação com `.claude/plans/seo-meta-tags-2026-07-27.md` (já mesclado): este plano só amplia o
  que já existe (`/` some do `Disallow` geral do `robots.txt`, ganha entrada no `sitemap.xml`) —
  não refaz nada da Fase 1-5 daquele plano.
