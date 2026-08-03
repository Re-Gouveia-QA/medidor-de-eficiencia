# Plan: Toggle mobile no topbar + limpeza visual de formulários e listagens

**Date:** 2026-08-03
**Status:** Plano concluído — 4 fases. Fase 3 (`feature/mobile-filters-stack`, PR #4) e Fase 4
(`feature/required-field-indicator`, PR #5) já mescladas em `master`. Fase 1
(`feature/mobile-nav-toggle`, PR #6) e Fase 2 (`feature/form-cards`) com PR aberto, aguardando
revisão/merge.

## Goal

Melhorar a experiência mobile do app: um toggle (hamburguer) que recolhe as ações do topbar
autenticado numa tela estreita, disposição mais "limpa" nos formulários e filtros, e duas melhorias
pontuais de UX (indicador de campo obrigatório) — sem alterar nenhuma regra de negócio, rota ou
comportamento em desktop.

## Investigação (estado atual)

- **Topbar autenticado** (`src/views/layouts/main.ejs:15-36`): marca "Sketch" + até 4
  `.icon-btn` (`docs` [só admin], idioma, tema, logout) dentro de `.topbar-actions`
  (`display:flex; gap:16px`, reduzido pra `8px` no mobile em `styles.css:715` — fix de overflow já
  concluído em `fix-topbar-overflow-mobile-2026-07-30.md`). Cabe sem cortar hoje, mas continua uma
  fileira de ícones sem hierarquia — o pedido agora é reduzir isso a um único toggle no mobile, não
  só garantir que caiba.
- **Topbar de marketing** (`src/views/layouts/marketing.ejs:13-28`) reusa a MESMA classe
  `.topbar-actions`, mas com conteúdo diferente: idioma, tema, e dois CTAs de conversão (`Entrar`/
  `Criar conta` — `.btn-secondary`/`.btn-primary`, texto, não só ícone). Já tem tratamento mobile
  próprio (`styles.css:730-736`: esconde `Entrar`, encolhe `Criar conta`). **Não** faz sentido
  esconder esses CTAs atrás de um toggle — são a ação principal de conversão da landing page, não
  ações secundárias de configuração. Por isso o toggle deste plano é escopado só ao topbar
  autenticado (`main.ejs`); o de marketing fica como está.
- **Risco identificado (importante):** `.topbar-actions` é uma classe COMPARTILHADA pelos dois
  layouts. Se as regras novas de colapso (`display:none` + painel `position:absolute`) forem
  escritas em cima do seletor genérico `.topbar-actions`, elas vazam pro topbar de marketing também
  — como lá não existe nenhum botão de toggle nem JS pra abrir o painel, os CTAs de conversão
  (`Entrar`/`Criar conta`) simplesmente desapareceriam no mobile, sem forma de reabrir. Mitigação:
  todo o CSS novo do painel colapsável usa `#topbarActions` (ID novo, exclusivo do `main.ejs`), nunca
  a classe `.topbar-actions` sozinha — a classe e suas regras existentes (inclusive as de marketing)
  continuam intocadas. **Confirmado por CDP na Fase 1: marketing/mobile não foi afetado.**
- **Formulários de atividade/categoria** (`src/views/activities/create.ejs`,
  `src/views/categories/create.ejs`): o `<form class="form form-narrow">` fica solto direto sobre o
  papel quadriculado da página, sem nenhum agrupamento visual — diferente de quase todo outro
  conteúdo do app (cards da home, cards de categoria, cards de relatório), que usa `.card.sketch-edge`
  (borda "à mão", fundo `--surface`) pra se destacar do fundo. É a inconsistência mais concreta
  encontrada pra "disposição mais clean".
- **Formulários de auth** (login/registro/esqueci-senha/redefinir-senha) **já** vivem dentro de
  `.card.sketch-edge.auth-card` (`src/views/layouts/auth.ejs:13`) — já têm o agrupamento visual que
  falta nos outros dois formulários. Não precisam do mesmo tratamento; nenhuma mudança de layout
  proposta pra eles. **Achado durante a implementação da Fase 2:** o `<form class="form ...">` de
  cada página de auth é filho DIRETO de `<main class="card sketch-edge auth-card">` — ou seja,
  `.auth-card` também é um caso de ".card > .form", igual ao padrão novo introduzido nesta fase. Por
  isso a regra de CSS que zera o `margin-top` duplicado (Phase 2) foi escrita contra uma classe
  dedicada (`.form-card`), não contra o seletor genérico `.card > .form` — sem isso, o merge de auth
  perderia 1rem de respiro acima do formulário sem nenhum pedido nesse sentido. Confirmado por CDP:
  `.auth-card > form.form` mede `margin-top: 16px` (inalterado) depois do fix de escopo.
- **Filtros de atividades** (`src/views/activities/index.ejs:8-36`, `.filters` em
  `styles.css:232-234`): `display:flex; flex-wrap:wrap; align-items:end` com 3 campos + botão. Sem
  nenhum ajuste dentro do `@media (max-width: 560px)` já existente — em telas estreitas os campos
  quebram linha de forma desalinhada (cada `.field` só tão largo quanto o conteúdo). Nenhuma outra
  página tem um formulário de filtro comparável (relatórios usa período fixo, categorias não tem
  filtro) — escopo fica só em `activities/index.ejs`.
- **Indicador de campo obrigatório:** nenhum formulário do app marca visualmente campos
  obrigatórios (só o atributo HTML `required`, sem sinal visual antes do submit). Levantamento por
  formulário:
  - `activities/create.ejs`: obrigatórios = nome, categoria, data, hora início, hora fim；
    opcionais = descrição, valor. **Mistura real** → marcador visual agrega informação.
  - `categories/create.ejs`: obrigatório = só nome; opcionais = descrição, cor (sempre tem valor
    default, nunca vazia), tempo desejado, duração padrão, valor. **Mistura real** → mesmo caso.
  - Formulários de auth (login/registro/esqueci-senha/redefinir-senha): **100% dos campos são
    `required`** (conferido nos 4 arquivos) — marcar "obrigatório" quando não existe nenhum campo
    opcional pra contrastar não agrega sinal nenhum, só ruído visual. Por isso o indicador fica
    escopado às páginas de atividade/categoria, não em auth.

## Scope

### In-Scope
- Toggle (hamburguer) no topbar autenticado (`main.ejs`) que recolhe docs/idioma/tema/logout num
  painel dropdown, visível só em mobile (mesmo breakpoint `560px` já usado no resto do CSS
  responsivo); desktop continua exatamente como está hoje (sem toggle, ações sempre visíveis).
- Novo ícone de menu (hamburguer) no catálogo de `partials/icon.ejs`.
- Envolver os formulários de atividade e categoria (criar/editar, mesmo template pros dois casos)
  num `.card.sketch-edge` — mesmo tratamento visual já usado em todo o resto do app.
- Empilhar os filtros de `/activities` em coluna no mobile (em vez de quebrar linha
  desalinhado).
- Indicador visual (asterisco) nos rótulos de campo obrigatório em `activities/create.ejs` e
  `categories/create.ejs`.

### Out-of-Scope
- Qualquer mudança no topbar de marketing (`marketing.ejs`) — já tem tratamento mobile próprio e
  os CTAs não devem ficar atrás de um toggle (ver Investigação acima).
- Mudanças em formulários de auth — já vivem num card, e marcar "obrigatório" não agrega nada
  quando 100% dos campos já são obrigatórios.
- Reestruturar a navegação por menu-grade da home (fora do pedido; a home continua sendo o hub de
  navegação, o toggle do topbar é só pras ações secundárias de configuração/sessão).
- Rótulos de texto visíveis dentro do painel mobile (ex.: "Documentação", "Sair" por extenso) — o
  painel reusa os mesmos `.icon-btn` com `aria-label` que já existem, só reflui de linha horizontal
  pra coluna vertical. Adicionar texto visível exigiria novas chaves de i18n em 2 idiomas × 4 itens;
  revisitar só se o ícone sozinho no painel se mostrar confuso em uso real.
- Validação client-side customizada (mensagens de erro em tempo real, etc.) — o indicador de
  obrigatório é só visual (asterisco), a validação nativa do HTML5 continua sendo a única.

## Phases

### Phase 1: Toggle mobile no topbar autenticado — CONCLUÍDA (PR #6 aberto)
**Objetivo:** em telas ≤560px, o topbar autenticado mostra só marca + 1 botão de menu; clicar
revela docs/idioma/tema/logout num painel; desktop não muda em nada.

**Steps:**
1. `src/views/partials/icon.ejs`: adicionar `'menu': 'M4 6h16M4 12h16M4 18h16'` ao `ICON_PATHS`
   (3 linhas horizontais, mesmo estilo de traço dos demais ícones).
2. `src/views/layouts/main.ejs`: adicionar um `<button id="navToggle" class="icon-btn sketch-edge
   sketch-hover btn-secondary nav-toggle" aria-label="..." aria-expanded="false"
   aria-controls="topbarActions">` (ícone `menu`) entre a marca e `.topbar-actions`; dar
   `id="topbarActions"` à div existente de `.topbar-actions` (mantém a classe, só adiciona o id).
3. `public/js/nav-toggle.js` (novo, mesmo estilo de `theme-toggle.js`/`marketing-navbar.js` —
   IIFE, `if (!btn) return`, sem dependência externa): no clique do `#navToggle`, alterna a classe
   `is-open` em `#topbarActions` e sincroniza `aria-expanded`; fecha ao clicar fora do painel ou
   pressionar Escape.
4. `public/css/styles.css`:
   - Fora do media query (regra base, perto da linha 18): `.nav-toggle { display: none; }` —
     escondido por padrão (desktop nunca vê o botão).
   - Dentro do `@media (max-width: 560px)` já existente (linha ~707): `.topbar { position:
     relative; }` (âncora pro painel absoluto), `.nav-toggle { display: inline-flex; }`,
     `#topbarActions { display: none; position: absolute; top: 100%; right: 16px; margin-top: 8px;
     padding: 14px; flex-direction: column; align-items: stretch; gap: 16px; z-index: 30; }` e
     `#topbarActions.is-open { display: flex; }`. **Usar `#topbarActions` (id), nunca a classe
     `.topbar-actions` sozinha** — ver risco de contaminação do topbar de marketing na Investigação.
   - `#topbarActions` já ganha a moldura "à mão" (borda + fundo `--surface`) de graça, porque a
     div continua com a classe `sketch-edge` (nova, adicionar ao markup do passo 2) — nenhum CSS
     extra de card necessário.
5. `src/i18n/pt-BR.json` e `src/i18n/en-US.json`: adicionar `layout.navToggleAriaLabel`
   (ex.: pt-BR "Abrir menu"; en-US "Open menu") ao lado das outras chaves `layout.*AriaLabel`.
6. `src/views/layouts/main.ejs`: incluir `<script src="/js/nav-toggle.js"></script>` junto dos
   demais scripts no fim do body.

**Files Touched:** `src/views/partials/icon.ejs`, `src/views/layouts/main.ejs`,
`public/js/nav-toggle.js` (novo), `public/css/styles.css`, `src/i18n/pt-BR.json`,
`src/i18n/en-US.json`
**Verify:** `npm run build && npm test && npm run lint`; Chrome DevTools/CDP com emulação mobile
(320/360/375px) confirmando: topbar mostra só marca + botão menu; clique abre o painel com os 4
itens funcionando (tema/idioma/docs/logout); clique fora ou Escape fecha; em 768px+ o botão de menu
não aparece e as ações continuam inline como hoje. Confirmar também que `/` (marketing, deslogado)
não é afetada — nenhum toggle novo lá, CTAs continuam visíveis no mobile como antes.
**Done When:** build/testes/lint verdes; nenhuma regressão visual/funcional no topbar de marketing;
painel mobile abre/fecha corretamente e é navegável por teclado (Tab alcança o botão, Enter/Espaço
ativa, Escape fecha).
**Time:** 45min

**Resultado real:** feito em `feature/mobile-nav-toggle` (commit `674a569` + `ae71fee`, gap do
painel aumentado de 10px pra 16px depois de feedback visual). CDP confirmou: 320px com painel
escondido por padrão, abre no clique com os 4 itens visíveis e dentro da viewport, fecha em clique
fora/Escape; 1024px sem toggle (ações sempre inline, `position: relative` da regra mobile não se
aplica); marketing/320px deslogado sem hamburguer e sem alteração nos CTAs existentes. Build,
137/137 testes e lint verdes.

**Replanning triggers:**
- Se o painel absoluto colidir com outro elemento posicionado (ex.: skip-link) em algum navegador
  testado — ajustar `z-index`/posição em vez de redesenhar o mecanismo. (Não ocorreu.)

### Phase 2: Formulários de atividade/categoria dentro de um card — CONCLUÍDA (PR aberto)
**Objetivo:** os formulários de criar/editar atividade e categoria ganham o mesmo agrupamento
visual ("card de caderno") já usado no resto do app, em vez de flutuar soltos sobre o papel.

**Steps:**
1. `src/views/activities/create.ejs`: envolver o `<form id="activityForm" ... class="form
   form-narrow" ...>` numa `<div class="card sketch-edge form-narrow form-card">`, movendo a classe
   `form-narrow` (max-width + centralização) da `<form>` pra essa nova div; a `<form>` interna fica
   só com `class="form"`.
2. `src/views/categories/create.ejs`: mesma mudança (`<div class="card sketch-edge form-narrow
   form-card">` envolvendo o `<form class="form category-form">`).
3. `public/css/styles.css`: `.form-card > .form { margin-top: 0; }` — sem isso, o `margin-top: 1rem`
   próprio de `.form` (pensado pra um form solto logo abaixo do page-header) soma com o
   `padding: 26px` do `.card`, deixando um respiro exagerado acima do primeiro campo. **Classe
   dedicada `.form-card`, não o seletor genérico `.card > .form`** — ver achado na Investigação
   acima: `.auth-card` (auth.ejs) também é um `.card` com um `.form` como filho direto, e o seletor
   genérico zeraria o respiro de lá também, fora do escopo desta fase.
4. `public/css/styles.css`: `.form-card { margin-top: 1.5rem; }` — respiro entre o título da
   página (page-header) e o topo do card, adicionado depois de feedback visual (sem isso o card
   ficava colado no título).

**Files Touched:** `src/views/activities/create.ejs`, `src/views/categories/create.ejs`,
`public/css/styles.css`
**Verify:** `npm run build && npm test && npm run lint`; visual no Chrome (desktop + emulação
mobile 320/375px) nas 4 rotas (`/activities/new`, `/activities/:id/edit`, `/categories/new`,
`/categories/:id/edit`) confirmando o card visível, sem respiro duplicado no topo, animação
`sketch-in` dos campos internos intacta.
**Done When:** as 4 páginas mostram o formulário dentro do card, build/testes/lint verdes, sem
regressão visual nas outras páginas que usam `.card` (home, categorias, relatórios).
**Time:** 20min

**Resultado real:** feito em `feature/form-cards` (commit `c1dc6cd` + `9a9c112`, margem superior do
card adicionada depois de feedback visual). CDP confirmou: `/activities/new` e `/categories/new`
com `.form-card > .form` medindo `margin-top: 0px` (sem gap duplicado); `/activities/:id/edit`
renderiza os dados existentes corretamente dentro do card; `/login` — fora do escopo desta fase —
manteve `margin-top: 16px` no formulário, confirmando que a regra escopada por classe não vazou pro
auth-card. Build, 137/137 testes e lint verdes.

**Replanning triggers:**
- Se `.card > .form` afetar algum outro `.form` aninhado em `.card` que já exista (ex.:
  `in-progress-card.form` na home, que já é ao mesmo tempo `.card` e `.form` no MESMO elemento, não
  um `.form` filho de um `.card` — o seletor `.card > .form` não bate nesse caso, mas confirmar
  visualmente na home mesmo assim). (Mitigado preventivamente ao usar `.form-card` em vez do
  seletor genérico — ver Investigação.)

### Phase 3: Filtros de atividades empilhados no mobile — CONCLUÍDA (mesclada, PR #4)
**Objetivo:** em telas ≤560px, os filtros de `/activities` (período + categoria + botão) empilham
em coluna cheia, em vez de quebrar linha de forma desalinhada.

**Steps:**
1. `public/css/styles.css`, dentro do `@media (max-width: 560px)` existente: `.filters {
   flex-direction: column; align-items: stretch; }` e `.filters button[type="submit"] { width:
   100%; justify-content: center; }`.

**Files Touched:** `public/css/styles.css`
**Verify:** `npm run build && npm test && npm run lint`; CDP mobile (320/360/375px) em
`/activities` confirmando os 3 campos + botão empilhados em largura cheia, sem overflow horizontal
(`document.body.scrollWidth <= clientWidth`); desktop (768px+) inalterado (filtros continuam em
linha).
**Done When:** filtros legíveis e alinhados em coluna no mobile, sem overflow, build/testes/lint
verdes.
**Time:** 10min

**Resultado real:** feito em `feature/mobile-filters-stack` (commit `ac4e385`), mesclada em
`master` via PR #4. CDP confirmou nas 3 larguras (320/360/375px): `flexDirection: column`, os 3
campos + botão "Filtrar" com a MESMA largura entre si (largura cheia do container), sem overflow
horizontal (`bodyScrollWidth === bodyClientWidth` nas 3). Desktop (1024px): `flexDirection: row`
confirmado inalterado. Build, 137/137 testes e lint verdes.

### Phase 4: Indicador visual de campo obrigatório — CONCLUÍDA (mesclada, PR #5)
**Objetivo:** sinalizar visualmente quais campos são obrigatórios nos formulários que têm mistura
de obrigatório/opcional (atividade e categoria) — auth fica de fora (ver Investigação: 100% dos
campos lá já são obrigatórios, marcador não agregaria sinal).

**Steps:**
1. `public/css/components.css`: `.field-label.is-required::after { content: ' *'; color:
   var(--accent-red); }` (perto da regra existente de `.field-label`, linha ~103).
2. `src/views/activities/create.ejs`: adicionar `is-required` ao `class` do `<label
   class="field-label">` de nome, categoria, data, hora início e hora fim (não em descrição/valor).
3. `src/views/categories/create.ejs`: adicionar `is-required` ao `<label class="field-label">` de
   nome (único campo obrigatório do formulário).

**Files Touched:** `public/css/components.css`, `src/views/activities/create.ejs`,
`src/views/categories/create.ejs`
**Verify:** `npm run build && npm test && npm run lint`; visual no Chrome confirmando o asterisco
vermelho só nos campos obrigatórios listados acima, nos dois temas (claro/escuro).
**Done When:** asterisco visível e correto nos campos certos, build/testes/lint verdes, nenhuma
mudança em formulários de auth.
**Time:** 10min

**Resultado real:** feito em `feature/required-field-indicator` (commit `fca9011`), mesclada em
`master` via PR #5. CDP confirmou em `/activities/new`: asterisco presente em nome/categoria/data/
hora início/hora fim, ausente em descrição/valor. Em `/categories/new`: asterisco só em nome,
ausente nos demais 6 campos. Testado em tema claro e escuro. `/login` confirmado sem NENHUM
`.is-required` na página, confirmando que auth ficou intocado como planejado. Build, 137/137 testes
e lint verdes.

**Nota:** esta fase tocou os MESMOS dois arquivos de view que a Fase 2 (`activities/create.ejs`,
`categories/create.ejs`), mas em linhas diferentes (rótulos de campo, não a estrutura de wrapping
do form) — confirmado que o merge de ambas em `master` não gerou conflito de código nesses
arquivos (só no arquivo deste plano, ver nota técnica no final).

## Dependências e suposições

- Assume que o breakpoint `560px` (já usado em toda a folha de estilo pro ajuste mobile) continua
  sendo o ponto de corte certo pra esconder o topbar-actions atrás do toggle — não introduz um
  breakpoint novo.
- Assume que "toggle para navbar" se refere ao topbar autenticado (`main.ejs`), não ao de marketing
  — decisão registrada explicitamente na Investigação/Out-of-Scope, revisitar se o usuário quis
  dizer o contrário.
- As 4 fases são independentes entre si (nenhuma depende do resultado de outra) — foram
  implementadas em branches irmãs, todas a partir de `master`, sem depender uma da outra.
  **Confirmado na prática, inclusive no merge:** Fases 3 e 4 mescladas em `master` sem nenhum
  conflito de código (só no arquivo deste plano).

## Notes

- Cada fase deste plano seguiu o padrão já estabelecido nesta sessão: branch própria por fase,
  merge só mediante confirmação explícita do usuário (Fases 3 e 4 já mescladas; Fases 1 e 2 com PR
  aberto aguardando).
- Risco de contaminação do topbar de marketing (Phase 1) foi encontrado durante a investigação,
  antes de qualquer código ser escrito — mitigação (usar `#topbarActions` em vez da classe
  compartilhada) já está descrita nos Steps, e foi confirmada por CDP depois da implementação.
- Risco análogo encontrado DURANTE a implementação da Fase 2 (não na investigação inicial): o
  seletor genérico `.card > .form` bateria também em `.auth-card`, fora do escopo desta fase —
  corrigido antes de rodar qualquer verificação, usando uma classe dedicada (`.form-card`) em vez do
  seletor genérico.
- **Nota técnica sobre este arquivo de plano:** as 4 fases foram commitadas em branches separadas,
  todas criadas a partir de `master`, cada uma com sua própria cópia deste arquivo de plano
  atualizada de forma independente — como previsto, isso gerou um conflito de "add/add" (só neste
  arquivo, nunca no código) a cada merge. Esta versão consolida o estado real de todas as 4 fases
  depois dos merges de PR #4 e #5, e é a versão que deve prevalecer ao resolver o mesmo conflito nas
  Fases 1 e 2.
