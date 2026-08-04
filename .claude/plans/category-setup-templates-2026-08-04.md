# Plan: Modelos prontos de setup (categorias automáticas por caso de uso)

**Date:** 2026-08-04
**Status:** Plano concluído e mergeado (2026-08-04, PR #10, commit `54bee4e` em `master`, Fases 0-4). Fase 0: presets + sanity test. Fase 1: `SetupController` + rotas + testes de rota. Fase 2: i18n completo + verificação visual (2 modos de design × 2 idiomas). Fase 3: botão "Usar um modelo pronto" em `/categories` + card de destaque na home quando `categorias.length === 0`, regressão end-to-end com usuário genuinamente novo. Fase 4: modal de tutorial no primeiro acesso (`setupTutorialSeen` cookie, mesmo padrão de `theme`/`design`). **Refinamento pós-merge (2026-08-04, branch `feature/setup-templates-refinement`)** — ver seção "Refinamento — terminologia e conteúdo" abaixo.

## Goal

Reduzir a fricção do primeiro uso: em vez de o usuário precisar criar cada categoria manualmente do zero, ele escolhe um "modelo" pronto para o seu caso de uso (estudante, concurseiro, gestão financeira pessoal, academia, diário pessoal) e o sistema cria as categorias automaticamente, com uma explicação simples de como usar aquele modelo antes de aplicá-lo.

## Scope

### In-Scope
- 5 modelos (presets) iniciais, definidos como configuração estática no código (sem novo model/migration — são dados do sistema, não do usuário): **Estudante**, **Concurseiro**, **Gestão financeira pessoal**, **Academia**, **Diário pessoal**.
- Tela de escolha de modelo (`/categories/setup`): grid de cards, um por preset, com título e descrição curta.
- Tela de detalhe/confirmação (`/categories/setup/:presetId`): explicação simples de "como usar" esse modelo + lista das categorias que serão criadas (nome, cor, badges de meta/duração/valor — reaproveitando o visual já usado em `categories/index.ejs`) + botão para aplicar.
- Aplicação (`POST /categories/setup/:presetId`): cria as categorias do preset para o usuário autenticado via `CategoryModel.create` já existente. Categorias cujo nome colida com uma já existente do usuário (regra 6, `@@unique([userId, nome])`) são puladas silenciosamente (mantém a existente) em vez de abortar tudo — o preset é best-effort, não transacional.
- Dois pontos de entrada: botão "Usar um modelo pronto" em `/categories` (ao lado de "Nova categoria", sempre visível) e um card de destaque na home quando o usuário ainda não tem nenhuma categoria (`categorias.length === 0`).
- Modal de tutorial no primeiro acesso: quando a home é exibida com `categorias.length === 0` (mesmo sinal do card acima) e o usuário ainda não dispensou o modal antes, mostra automaticamente um modal explicando a existência dos modelos prontos, com atalho direto pra `/categories/setup`.
- i18n completo (pt-BR + en-US) para toda a copy nova da feature (títulos/descrições dos presets, textos de "como usar", botões).
- Cobertura de teste (Vitest, rotas) do fluxo aplicar-modelo, incluindo o caso de nome duplicado sendo pulado sem quebrar a request.

### Out-of-Scope
- Presets customizados pelo usuário (salvar seu próprio conjunto de categorias como modelo) — feature separada, não pedida agora.
- Edição/gestão dos presets via UI ou banco — são código estático; mudar um preset é um deploy, não uma ação de admin.
- Forçar o fluxo de setup durante o cadastro (wizard obrigatório pós-registro) — o usuário não pediu isso; o setup fica descoberível, não obrigatório.
- Desfazer/reverter um preset aplicado — o usuário pode excluir as categorias manualmente depois (sujeito à regra 5: bloqueado se já houver atividades vinculadas).
- Tradução dos nomes/descrições das categorias criadas (`Category.nome`/`descricao`) — ficam em pt-BR literal, mesmo padrão de `prisma/seed.ts` (são dados do usuário, editáveis por ele depois, não strings de interface).

## Phases

### Phase 0: Dados dos presets + sanity test

**Objective:** Definir o conteúdo dos 5 modelos como configuração estática, validada por um teste simples — é a base de que todas as fases seguintes dependem, e o único lugar onde um erro de digitação (ex.: hex inválido) passaria despercebido, já que presets não passam pelo `categorySchema` (são criados programaticamente, não vêm de um form).

**Steps:**
1. Criar `src/config/categoryPresets.ts` exportando `CategoryPreset[]` e `findCategoryPreset(id)`. Cada preset tem `id` (kebab-case), `titleKey`/`descriptionKey`/`usageKey` (chaves de i18n, resolvidas depois via `t()` — mesmo padrão de `validators.ts`, que guarda chave e não texto) e `categorias: CategoryPresetCategory[]` (mesmo shape de `CategoryCreateInput` do `CategoryModel`).
2. Conteúdo dos 5 presets (nome/cor/flags — texto final de título/descrição/uso fica na Fase 2, junto do i18n):
   - **estudante**: Aulas (`#2563EB`), Estudo e Revisão (`#16A34A`, `tempoDesejadoMin: 120`), Trabalhos e Provas (`#F59E0B`), Leitura (`#9333EA`, `duracaoPadraoMin: 30`).
   - **concurseiro**: Teoria (`#0D9488`, `tempoDesejadoMin: 90`), Revisão (`#2563EB`, `tempoDesejadoMin: 60`), Questões (`#DC2626`, `tempoDesejadoMin: 60`), Redação (`#9333EA`, `duracaoPadraoMin: 60`), Simulado (`#F59E0B`).
   - **financas-pessoais**: Receitas (`#16A34A`, `possuiValor: true`, `valorLabel: 'Valor recebido (R$)'`), Contas fixas (`#DC2626`, `possuiValor: true`, `valorLabel: 'Valor pago (R$)'`), Compras e lazer (`#F59E0B`, `possuiValor: true`, `valorLabel: 'Valor gasto (R$)'`), Poupança e investimentos (`#0D9488`, `possuiValor: true`, `valorLabel: 'Valor investido (R$)'`).
   - **academia**: Musculação (`#2563EB`, `duracaoPadraoMin: 60`), Cardio (`#DC2626`, `duracaoPadraoMin: 30`), Alongamento e mobilidade (`#16A34A`, `duracaoPadraoMin: 15`), Aula em grupo (`#9333EA`, `duracaoPadraoMin: 45`).
   - **diario-pessoal**: Reflexão do dia (`#2563EB`, `duracaoPadraoMin: 10`), Gratidão (`#F59E0B`, `duracaoPadraoMin: 5`), Humor e emoções (`#9333EA`, `duracaoPadraoMin: 5`), Metas e planejamento (`#16A34A`, `duracaoPadraoMin: 10`).
3. `tests/config/categoryPresets.test.ts` (novo): valida que todo preset tem `id` único, `categorias.length > 0`, todo `cor` bate no regex `/^#[0-9A-Fa-f]{6}$/` (mesmo regex de `validators.ts`), e nomes de categoria únicos dentro do mesmo preset (senão a criação em loop da Fase 1 silenciosamente "pularia" uma por colisão consigo mesma).

**Files Touched:** `src/config/categoryPresets.ts` (novo), `tests/config/categoryPresets.test.ts` (novo)

**Verify:** `npm run build && npm test && npm run lint`

**Done When:** os 5 presets estão definidos com o conteúdo acima, o teste de sanity passa.

**Time:** ~1h

---

### Phase 1: Backend — controller, rotas, aplicação do preset

**Objective:** Fluxo funcional ponta a ponta (ainda sem views finais bonitas) — escolher, ver e aplicar um preset, com o caso de nome duplicado coberto por teste.

**Steps:**
1. `src/controllers/SetupController.ts` (novo, estende `BaseController` por uniformidade com os demais): `index` (renderiza lista de presets), `show` (busca preset por `req.params.presetId` via `findCategoryPreset`; 404 lógico → flash + redirect pra `/categories/setup` se não existir), `apply` (POST: itera `preset.categorias`, chama `CategoryModel.create(userId, categoria)` por item dentro de `try/catch` — colisão de nome único, regra 6, cai no `catch` e é contada como "pulada", sem interromper o loop; ao final, flash de sucesso com contagem de criadas/puladas, redirect pra `/categories`).
2. `src/routes/category.routes.ts`: adicionar `GET /setup`, `GET /setup/:presetId`, `POST /setup/:presetId` — inseridas antes de `GET /:id/edit` (mesma convenção já usada com `/new`: rotas literais antes de rotas com parâmetro).
3. `tests/routes/categorySetup.routes.test.ts` (novo, BDD Dado/Quando/Então, mockando `CategoryModel` como em `tests/routes/categories.routes.test.ts`): cobre `GET /categories/setup` (200, lista os 5 presets), `GET /categories/setup/:id` inválido (redirect + flash de erro), `POST /categories/setup/:id` válido (chama `CategoryModel.create` uma vez por categoria do preset, redirect pra `/categories`), e o caso em que `CategoryModel.create` rejeita para uma das categorias (simula nome duplicado) — confirma que as demais ainda são criadas e a resposta continua 302 normal, não 500.

**Files Touched:** `src/controllers/SetupController.ts` (novo), `src/routes/category.routes.ts`, `tests/routes/categorySetup.routes.test.ts` (novo)

**Verify:** `npm run build && npm test && npm run lint`

**Done When:** os 3 endpoints funcionam via curl/teste automatizado; nome duplicado não derruba a aplicação do preset.

**Time:** ~2h

---

### Phase 2: Views + i18n

**Objective:** Interface real das duas telas novas, seguindo o design system existente (`sketch-edge`, cards, badges reaproveitados de `categories/index.ejs`), com todo texto passando por `t()`.

**Steps:**
1. `src/views/categories/setup-index.ejs` (novo): `partials/page-header` (`backHref: '/categories'`) + `grid-menu` de cards (mesmo padrão visual de `home/index.ejs`), um por preset — título + descrição curta — link para `/categories/setup/<id>`.
2. `src/views/categories/setup-show.ejs` (novo): `page-header` (`backHref: '/categories/setup'`), bloco de texto "Como usar" (explicação simples do preset), lista somente-leitura das categorias que serão criadas (reaproveita a estrutura visual de card de `categories/index.ejs` — cor + nome + badges de meta/duração/valor, sem botões de editar/excluir), form `POST` com botão primário "Aplicar este modelo".
3. `src/i18n/pt-BR.json` e `src/i18n/en-US.json`: chaves novas — `categories.setup.entryButton`, `categories.setup.index.title`, `categories.setup.index.subtitle`, `categories.setup.notFound`, `categories.setup.applied` (`{{created}}`/`{{skipped}}`), `categories.setup.show.usageHeading`, `categories.setup.show.categoriesHeading`, `categories.setup.show.applyButton`, `categories.setup.show.backToList`, mais `title`/`description`/`usage` por preset (`categories.setup.estudante.*`, `categories.setup.concurseiro.*`, `categories.setup.financasPessoais.*`, `categories.setup.academia.*`, `categories.setup.diarioPessoal.*` — 3 chaves × 5 presets = 15 chaves, espelhadas nos dois arquivos).
4. Texto de "como usar" por preset (1-3 frases, resumo do que vai em `usageKey`):
   - Estudante: registrar aulas/estudo/trabalhos/leitura por atividade; a meta diária de "Estudo e Revisão" mostra se bateu o tempo pretendido.
   - Concurseiro: separar teoria, revisão e questões pra enxergar o equilíbrio da preparação antes de cada sessão de estudo.
   - Gestão financeira pessoal: cada entrada/gasto vira uma atividade com valor preenchido; os relatórios por período mostram pra onde o dinheiro foi.
   - Academia: registrar cada treino na categoria certa; as durações padrão já sugerem a hora de fim.
   - Diário pessoal: usar a descrição da atividade pra escrever livremente; as 4 categorias separam reflexão, gratidão, humor e planejamento.

**Files Touched:** `src/views/categories/setup-index.ejs` (novo), `src/views/categories/setup-show.ejs` (novo), `src/i18n/pt-BR.json`, `src/i18n/en-US.json`

**Verify:** `npm run build && npm test && npm run lint` + checagem visual via CDP em `/categories/setup` e `/categories/setup/estudante` (mobile, os 2 temas × 2 modos de design — sketch e minimal, já que a feature entra em página interna autenticada coberta pelo modo minimalista existente).

**Done When:** as duas telas renderizam corretamente nos 4 combos tema×design, sem string de i18n faltando (chave aparecendo crua) em nenhum dos 2 idiomas.

**Time:** ~2h30

---

### Phase 3: Pontos de entrada + regressão final

**Objective:** Tornar a feature descobrível e fechar com validação de ponta a ponta.

**Steps:**
1. `src/views/categories/index.ejs`: botão secundário "Usar um modelo pronto" (`href="/categories/setup"`) ao lado do botão primário "Nova categoria" existente no `page-header`.
2. `src/views/home/index.ejs`: quando `categorias.length === 0` (branch onde hoje nada é renderizado além do menu-grade), adicionar um card de destaque convidando para `/categories/setup`, com um link secundário pra criar categoria manualmente (`/categories/new`) — não remover a opção manual, só dar um atalho mais visível pro caso comum de usuário novo.
3. `src/i18n/pt-BR.json`/`en-US.json`: chaves do card da home (`home.emptyState.heading`, `.description`, `.setupButton`, `.manualButton`).
4. Regressão completa: criar um usuário novo (via UI, não seed) sem categorias, confirmar que o card aparece na home, aplicar cada um dos 5 presets uma vez (em usuários/sessões diferentes ou limpando categorias entre testes) e conferir em `/categories` que as categorias e badges aparecem como esperado.

**Files Touched:** `src/views/categories/index.ejs`, `src/views/home/index.ejs`, `src/i18n/pt-BR.json`, `src/i18n/en-US.json`

**Verify:** `npm run build && npm test && npm run lint` + fluxo manual completo via CDP (usuário novo → home mostra CTA → escolhe preset → vê explicação → aplica → `/categories` reflete as categorias criadas) em pelo menos 1 combo de tema/design; suíte E2E (`npm run test:e2e`) se houver tempo, já que é um fluxo novo ponta a ponta.

**Done When:** os 137+ testes (contando os novos) passam, lint limpo, os 5 presets aplicáveis de ponta a ponta sem erro, card da home some assim que o usuário tem ao menos 1 categoria.

**Time:** ~1h30

### Phase 4: Modal de tutorial no primeiro acesso

**Objective:** Dar ao usuário novo uma explicação ativa (não só descobrível) da feature de modelos, sem depender de banco novo — reaproveitando o mesmo sinal (`categorias.length === 0`) já usado no card da Fase 3, mais um cookie de "já visto" no mesmo padrão dos cookies existentes (`theme`/`design`/`locale`/`tz`).

**Steps:**
1. `src/app.ts`: adicionar `hasSetupTutorialSeenCookie(req): boolean` (mesmo formato de leitura manual de cookie das funções já existentes no arquivo — `readThemeCookie` etc. — sem cookie-parser) e setar `res.locals.setupTutorialSeen` no mesmo middleware global que já seta `res.locals.theme`/`res.locals.design`. Cookie `setupTutorialSeen=1`, não-httpOnly, `path=/; max-age=31536000; samesite=lax` (mesmo padrão de escrita client-side dos outros).
2. `src/views/partials/setup-tutorial-modal.ejs` (novo): dialog modal reaproveitando a estrutura visual já existente em `partials/activity-detail-modal.ejs`/`.activity-detail-modal` (CSS) — overlay com scrim, card `sketch-edge`, header com botão fechar — mas como componente próprio (`.setup-tutorial-modal`, novo bloco de CSS copiado/adaptado desse já existente, não uma renomeação genérica dele: o projeto já tem 2 overlays paralelos independentes, `confirm-toast` e `activity-detail-modal`; seguir o mesmo precedente em vez de forçar uma abstração compartilhada nova). Conteúdo: título + parágrafo curto explicando os modelos prontos, lista dos 5 casos de uso (ícone + `t('categories.setup.<preset>.title')`, reaproveitando as chaves de i18n já criadas na Fase 2 — sem duplicar texto), botão primário "Ver modelos" (`href="/categories/setup"`) e botão secundário "Agora não" (fecha sem navegar).
3. `public/js/setup-tutorial-modal.js` (novo, mesmo padrão IIFE de `activity-detail-modal.js`): ao carregar, se o elemento existir no DOM, adiciona `.is-visible` imediatamente (a decisão de mostrar já foi tomada no servidor — sem precisa de um trigger de clique, diferente do modal de detalhe de atividade). Fecha (X, clique no scrim, tecla Escape) e clique no botão "Ver modelos" **ambos** gravam o cookie `setupTutorialSeen=1` antes de esconder/navegar — inclusive o link "Ver modelos", que é uma navegação real (não pode depender de `preventDefault`; grava o cookie de forma síncrona no `click` e deixa a navegação seguir normalmente), senão voltar da tela de modelos sem aplicar nenhum preset faria o modal reaparecer.
4. `src/views/home/index.ejs`: `<% if (categorias.length === 0 && !setupTutorialSeen) { %><%- include('../partials/setup-tutorial-modal') %><% } %>` logo no topo do arquivo, com `<script src="/js/setup-tutorial-modal.js"></script>` dentro do mesmo bloco condicional — mesmo padrão já usado nesse arquivo pra `in-progress-timer.js` (script incluído condicionalmente na própria view, não sempre carregado via `layouts/main.ejs`).
5. `src/i18n/pt-BR.json`/`en-US.json`: `home.setupTutorial.title`, `.description`, `.primaryButton`, `.secondaryButton`, `.closeAriaLabel` (os 5 casos de uso reaproveitam `categories.setup.<preset>.title` da Fase 2, sem chave nova).
6. `tests/routes/home.routes.test.ts`: estender (não criar arquivo novo — já cobre `GET /` autenticado) com 2 casos: `CategoryModel.listByUser` mockado retornando `[]` → resposta contém `setupTutorialModal`/o texto do título; mesmo cenário mas com `.set('Cookie', 'setupTutorialSeen=1')` → resposta NÃO contém o modal. Um terceiro caso com categorias não-vazias já é implicitamente coberto pelos testes existentes desse arquivo (nunca deveriam conter o modal).

**Files Touched:** `src/app.ts`, `src/views/partials/setup-tutorial-modal.ejs` (novo), `public/js/setup-tutorial-modal.js` (novo), `public/css/components.css`, `src/views/home/index.ejs`, `src/i18n/pt-BR.json`, `src/i18n/en-US.json`, `tests/routes/home.routes.test.ts`

**Verify:** `npm run build && npm test && npm run lint` + checagem visual via CDP: sessão nova sem cookies → modal aparece na home; clicar "Ver modelos" → cookie gravado + navega pra `/categories/setup`; voltar pra home → modal não reaparece; testar nos 2 modos de design (sketch/minimal) já que é conteúdo novo em página interna autenticada.

**Done When:** modal aparece exatamente uma vez por navegador (até ser dispensado de qualquer forma), nunca aparece pra quem já tem categoria, funciona nos 2 temas × 2 modos de design, testes cobrindo presença/ausência passam.

**Time:** ~2h

## Dependencies & Assumptions

- Sem migration/model novo — presets são configuração estática (`src/config/categoryPresets.ts`), categorias criadas usam o `CategoryModel.create` já existente, sem mudança de schema.
- Aplicação de preset é best-effort por categoria (não transacional): colisão de nome único (regra 6) pula só aquele item. Assumido que isso é aceitável porque o próprio `CategoryController.store` já trata colisão de nome da mesma forma (flash + não quebra a request).
- Cores dos presets reaproveitam a paleta livre de categoria (regra 6 do CLAUDE.md — cor de categoria é escolha do usuário, não uma das 4 "canetas" do sistema) — os hex acima são só sugestões iniciais, o usuário pode editar a cor de qualquer categoria criada pelo preset depois, normalmente.
- Textos de "como usar" (Fase 2) são um resumo direto do que a categoria já comunica pelos próprios nomes/badges — não é onboarding extenso, é a "explicação simples" pedida.

- **Cookie, não coluna no banco, pra "modal já visto" (Fase 4):** mesma decisão já tomada pra tema/design/idioma/fuso — evita migration, e o app já aceita o trade-off de preferência-por-navegador (não por conta) nesses 4 casos existentes. Se o usuário trocar de navegador/limpar cookies, o modal reaparece — considerado aceitável, mesmo comportamento que já existe pra tema/design hoje.

## Notes

- 5 presets cobrem exatamente os 5 casos de uso citados pelo usuário: estudantes, concurseiros, gestão financeira pessoal, academia, diário pessoal. Novos presets no futuro são só mais entradas em `categoryPresets.ts` — a estrutura de dados já suporta N presets sem mudança de código.
- O card de "gestão financeira pessoal" reaproveita um caso de uso já citado na landing pública (`marketing.useCases.budget`, "Orçamento doméstico informal") — o preset dá a esse caso de uso um caminho de setup de verdade, não só menção em copy de marketing.

## Refinamento — terminologia e conteúdo (2026-08-04, pós-merge)

Feedback do usuário depois do merge da PR #10, branch `feature/setup-templates-refinement`:

- **Terminologia**: "modelo"/"template" trocado por "modo de uso" em toda a copy de interface (botões, títulos, mensagens) — chaves de i18n mantidas com o mesmo nome (`categories.setup.*`), só os valores mudaram, pra não gerar churn desnecessário em identificadores internos. Título da tela de escolha virou a pergunta direta pedida pelo usuário ("Pra que você gostaria de usar o app?" / subtítulo "Qual das opções abaixo melhor se encaixa no seu contexto?"). Nomes das categorias criadas no banco continuam em pt-BR literal (fora do escopo desta mudança — ver Notes acima).
- **Opção "Quero construir algo do zero"**: 6º card em `/categories/setup`, mesmo estilo dos 5 presets, mas linkando direto pra `/categories/new` (criação manual) em vez de `/categories/setup/:id`. Chave nova `categories.setup.index.fromScratch.*` (pt-BR/en-US).
- **Espaçamento**: `setup-index.ejs` e `setup-show.ejs` nunca tinham sido envolvidos em `<div class="page-header">` (só chamavam `partials/page-header` direto) — diferente de `categories/index.ejs`/`activities/index.ejs`, que sempre tiveram esse wrapper. Sem ele, faltava o `margin-bottom: 1.25rem` de `.page-header` entre o título e o conteúdo seguinte (bug real de espaçamento, não só percepção). Corrigido envolvendo os dois arquivos no wrapper. Mesmo problema entre o card "Como usar" e o heading "Categorias que serão criadas" em `setup-show.ejs` (h1-h4 zeram `margin` por padrão, ver CLAUDE.md) — resolvido com `.setup-section-heading` (`margin: 2rem 0 1rem`), mesma receita de `.report-section-heading` mas como classe própria (aquela é intencionalmente escopada só a `/reports`). `.setup-apply-form` (`margin-top: 2rem`) separa o botão de aplicar do grid de categorias acima.
- **Conteúdo dos presets**: categorias de cada preset mantidas como estavam (já razoavelmente bem estruturadas pro caso de uso — concurseiro em particular já espelha o ciclo real de estudo: teoria/revisão/questões/redação/simulado). O que estava raso era o texto de "como usar" (Fase 2), reduzido a 1 frase — reescrito nos 5 presets como um guia mais completo (2-3 frases): explica o papel de cada categoria, dá uma dica concreta de uso do dia a dia, e fecha com o que observar no relatório depois de um tempo de uso. Julgamento: não reestruturar os conjuntos de categoria em si, já que nenhum tinha problema óbvio de design — se o usuário queria uma revisão mais profunda do *conjunto de categorias*, não só do texto, é um pedido a mais.

**Files Touched:** `src/i18n/pt-BR.json`, `src/i18n/en-US.json`, `src/views/categories/setup-index.ejs`, `src/views/categories/setup-show.ejs`, `public/css/styles.css`, `tests/routes/home.routes.test.ts`

**Verify:** `npm run build && npm test && npm run lint` (151 testes) + verificação visual via CDP com usuário novo (registro real): título/subtítulo novos, 6 cards em `/categories/setup` (5 presets + "do zero" com `href="/categories/new"`), espaçamento visivelmente corrigido nas duas telas, texto de uso mais longo renderizando sem chave crua.

**Done When:** feito — build/test/lint verdes, checagem visual confirmou os 4 pontos do pedido.
