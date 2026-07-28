# Plan: Atividade em andamento (registro rápido + card na home)

**Date:** 2026-07-23 · **Estendido:** 2026-07-28 (Fases 6-8)
**Status:** Fases 1-5 concluídas e mescladas em `master` (`feat(schema)` → `feat(model)` →
`feat(controller)` → `feat(views)` → `feat(reports)`, mais um `feat(home): cronômetro ao vivo e
polimento` posterior — tudo já em `master`). Fases 6-8 (abaixo) são uma extensão pedida em
2026-07-28: opção "finalizar com detalhes" (descrição + valor) na hora de encerrar a atividade em
andamento — ainda não iniciadas.

## Goal

Usuário pode iniciar 1 atividade que está realizando agora (nome + categoria, sem hora de fim
ainda) direto pela home. Enquanto ela não é finalizada, a home mostra um card com o nome da
atividade e um botão "Finalizar"; ao finalizar, o sistema grava a hora de fim (agora) e calcula a
duração normalmente — a atividade passa a existir como uma `Activity` comum, aparecendo em
`/activities` e nos relatórios como qualquer outra.

## Decisão de modelagem

Uma atividade "em andamento" é a MESMA `Activity` já existente, só que com `horaFim`/`duracaoMin`
ainda nulos — não é uma tabela/entidade separada. Motivo: reaproveita listagem, edição, exclusão e
o isolamento por usuário (RF12) já implementados; evita duplicar o conceito de "atividade" em duas
tabelas que precisariam ser sincronizadas na hora de finalizar.

**Regra nova:** no máximo 1 atividade em andamento por usuário por vez ("Usuário pode registrar 1
atividade que está realizando"). Enforced na camada de aplicação (checagem antes do insert no
Model/Controller) — **não** um índice único parcial no Postgres. Um índice parcial (`WHERE
hora_fim IS NULL`) seria mais robusto contra corrida, mas o Prisma schema DSL não expressa índice
parcial sem editar a migration SQL gerada manualmente; dado que é um app de uso pessoal (sem
concorrência real do mesmo usuário em paralelo), a checagem em app é suficiente para a v1. Fica
como possível endurecimento futuro, não bloqueia esta entrega.

## Escopo

### Dentro do escopo
- Migration: `Activity.horaFim` e `Activity.duracaoMin` passam a nullable.
- Iniciar atividade: nome + categoria (data = hoje, horaInicio = agora, ambos implícitos — não
  pedidos ao usuário). Formulário compacto embutido na própria home (não é uma página nova).
- Finalizar: botão no card da home → grava horaFim = agora, calcula duracaoMin (reaproveita
  `calcDurationMin`), a atividade vira uma `Activity` completa normal.
- Bloqueio de um segundo "iniciar" enquanto já existe uma em andamento (flash de erro).
- `/activities` (listagem) e o formulário de editar não podem quebrar ao encontrar uma atividade
  com `horaFim`/`duracaoMin` nulos (hoje os dois assumem que sempre existem).
- Relatórios (`ReportService`) excluem atividades ainda em andamento do total (duração desconhecida
  até finalizar).

### Fora do escopo
- Múltiplas atividades em andamento simultâneas.
- Índice único parcial no Postgres (ver "Decisão de modelagem").
- Editar nome/categoria de uma atividade em andamento antes de finalizar (o form de editar já
  existente continua funcionando, mas não é o foco aqui).
- Notificações/lembretes de atividade em andamento (fora do MVP, já listado em CLAUDE.md).

## Fases

### Fase 1: Migration (schema)
**Passos:** tornar `horaFim DateTime?` e `duracaoMin Int?` no `prisma/schema.prisma`; rodar
`npx prisma migrate dev --name activity_em_andamento`.

**Files Touched:** `prisma/schema.prisma`, `prisma/migrations/<nova pasta>/migration.sql` (gerado)
**Verify:** `npx prisma migrate dev --name activity_em_andamento && npm run build`
**Done When:** migration aplicada localmente sem erro; `npx prisma generate` reflete os campos
opcionais no client tipado.

---

### Fase 2: Model + validação
**Passos:**
1. `ActivityModel`: adicionar `findInProgress(userId)` (findFirst com `horaFim: null`),
   `startInProgress(userId, { nome, categoryId, timezone })` (grava `data`=hoje e `horaInicio`=agora
   no fuso do usuário, `horaFim`/`duracaoMin`=null) e `finish(id, userId, timezone)` (busca a
   atividade, calcula `horaFim`=agora e `duracaoMin` via `calcDurationMin`, `updateMany`).
2. `validators.ts`: novo `startActivitySchema` (`nome`, `categoryId` apenas).

**Files Touched:** `src/models/ActivityModel.ts`, `src/utils/validators.ts`,
`tests/models/ActivityModel.test.ts`
**Verify:** `npx vitest run tests/models/ActivityModel.test.ts`
**Done When:** testes cobrindo `findInProgress`/`startInProgress`/`finish` (incluindo o caso de
`finish` chamado numa atividade que não existe/não é do usuário) passam.

---

### Fase 3: Controller + rotas
**Passos:**
1. `ActivityController`: `startInProgress` (valida com `startActivitySchema`, RF12 via
   `resolveOwnedCategory` já existente, bloqueia se já houver uma em andamento — flash de erro e
   redirect pra home) e `finish` (chama `ActivityModel.finish`, flash de sucesso, redirect pra
   home).
2. `activity.routes.ts`: `POST /activities/start` → `startInProgress`; `POST
   /activities/:id/finish` → `finish`.

**Files Touched:** `src/controllers/ActivityController.ts`, `src/routes/activity.routes.ts`,
`tests/routes/activities.routes.test.ts`
**Verify:** `npx vitest run tests/routes/activities.routes.test.ts`
**Done When:** rota de start bloqueia segunda atividade em andamento (teste cobrindo isso); rota de
finish 404/erro tratado se a atividade não pertence ao usuário ou não existe.

---

### Fase 4: Views
**Passos:**
1. `HomeController`: busca `emAndamento = ActivityModel.findInProgress(userId)` e, só quando não
   houver uma em andamento, `categorias = CategoryModel.listByUser(userId)` (pro formulário rápido).
2. `home/index.ejs`: se `emAndamento`, mostra card com nome + form `POST
   /activities/:id/finish` (botão "Finalizar"); senão, mostra form compacto (nome + select de
   categoria) `POST /activities/start` — ou, se `categorias.length === 0`, mensagem convidando a
   criar uma categoria primeiro (mesmo padrão já usado em `ActivityController.create`).
3. `activities/index.ejs`: linha de horário/duração vira "Em andamento" (badge) quando `horaFim`
   for nulo, em vez de chamar `formatTime`/`formatMinutes` com `null` (quebraria hoje).
4. `activities/create.ejs` (tela de editar): `value` do campo `horaFim` usa `''` quando
   `atividade.horaFim` for nulo, em vez de chamar `formatTime(null)`.

**Files Touched:** `src/controllers/HomeController.ts`, `src/views/home/index.ejs`,
`src/views/activities/index.ejs`, `src/views/activities/create.ejs`
**Verify:** `npm run dev` + checagem manual (iniciar uma atividade pela home, ver o card, finalizar,
ver ela aparecer em `/activities` com duração calculada); screenshot claro/escuro do card na home.
**Done When:** nenhuma quebra ao renderizar `/activities` ou o form de editar com uma atividade em
andamento na lista.

---

### Fase 5: Relatórios + validação final
**Passos:** `ReportService.build` filtra `horaFim: { not: null }` na query e usa `a.duracaoMin ?? 0`
na soma (defensivo, já que o filtro garante não-nulo em runtime mas o tipo do Prisma continua
`number | null`).

**Files Touched:** `src/services/ReportService.ts`, `tests/services/ReportService.test.ts`
**Verify:** `npm run build && npx vitest run && npm run lint`
**Done When:** build/testes/lint completos (todos os arquivos tocados nas 5 fases) verdes; uma
atividade em andamento não aparece nos totais de `/reports` até ser finalizada.

## Notas

- Cada fase em branch própria, seguindo a convenção já estabelecida nesta sessão
  ([[feedback_separate_branches]]) — não mesclar sem pedido explícito.
- `combineDateTime`/`calcDurationMin`/`formatTimeInZone` (já existentes em `utils/time.ts`) são
  reaproveitados sem alteração; "agora" para `horaInicio`/`horaFim` usa o fuso do usuário
  (`req.userTimezone`, já disponível em todo controller autenticado).
- Replanning trigger: se o usuário pedir múltiplas atividades em andamento simultâneas, isso muda
  a Fase 3 (checagem de "já existe uma") e a Fase 4 (home precisaria de uma lista, não 1 card) —
  replanejar essas duas fases antes de implementar.

---

## Extensão 2026-07-28 — Finalizar com detalhes

### Goal

Ao finalizar a atividade em andamento, o usuário pode opcionalmente informar `descricao` e (só se
a categoria tiver `possuiValor = true`) `valor` — hoje `finish` só grava `horaFim`/`duracaoMin`, os
outros dois campos da `Activity` ficam sempre nulos numa atividade iniciada pela home.

### Estado atual (levantado antes de planejar)

- `Activity.descricao`/`Activity.valor` já existem no schema (nullable) — **sem migration
  necessária**, são as mesmas colunas usadas pelo formulário completo de nova atividade.
- `ActivityModel.findInProgress` (`src/models/ActivityModel.ts:95`) só seleciona
  `category: { nome, cor }` — falta `possuiValor`/`valorLabel`/`valorPadrao` pra decidir se mostra
  o campo de valor e qual o rótulo/padrão (regra 9, mesma lógica já usada em
  `ActivityController.store`).
- `ActivityModel.finish(id, userId)` (linha 133) grava só `horaFim`/`duracaoMin`; não aceita
  campos extras nem inclui a categoria na query.
- `ActivityController.finish` (`src/controllers/ActivityController.ts:136`) não lê `req.body` —
  só chama `ActivityModel.finish(id, userId)` e redireciona.
- Rota já existe: `POST /activities/:id/finish` (`src/routes/activity.routes.ts:13`) — **não
  precisa de rota nova**, só passa a aceitar um body opcional.
- `home/index.ejs` (linha 17-21) renderiza o form de "Finalizar" sem nenhum campo — só o botão.
- `validators.ts` já tem o padrão exato a reaproveitar: `activitySchema.descricao`/`.valor`
  (linha 63-64) usam `z.string().trim().optional().or(z.literal(''))` e
  `z.coerce.number().positive().optional().or(z.literal(''))`.

### Decisão de UX

Botão "Finalizar" atual continua 1-clique (submit vazio, comportamento inalterado). Um segundo
controle "Finalizar com detalhes" abre um `<details>/<summary>` nativo (sem JS novo, sem modal —
menor unidade que resolve) com `descricao` (textarea) e, só quando
`emAndamento.category.possuiValor` for `true` (decidido no servidor, já que a categoria da
atividade em andamento é fixa — diferente do form de nova atividade, que tem `<select>` e por isso
precisa de JS pra alternar o campo), o campo `valor`. Os dois campos ficam **dentro do mesmo
`<form>`** que já existe — não é um form novo, só ganha campos extras e um botão de submit
alternativo (ou o mesmo botão, já que ambos batem no mesmo endpoint).

### Fase 6: Model + validação
**Objetivo:** `ActivityModel.finish` aceita e persiste `descricao`/`valor` opcionais, aplicando a
regra 9 (valor padrão da categoria quando não informado) igual a `store`.

**Passos:**
1. `validators.ts`: novo `finishDetailsSchema` — `descricao`/`valor` no mesmo formato de
   `activitySchema` (linhas 63-64), ambos opcionais (form pode vir totalmente vazio, do botão
   "Finalizar" rápido).
2. `ActivityModel.findInProgress`: incluir `possuiValor: true, valorLabel: true, valorPadrao: true`
   no `select` de `category`.
3. `ActivityModel.finish(id, userId, extra?: { descricao?: string; valor?: number })`: buscar a
   atividade já incluindo `category: { select: { possuiValor, valorPadrao } }`; se
   `extra.valor` não vier e `category.possuiValor && category.valorPadrao != null`, usa o padrão
   (mesmo cálculo de `store`); grava `descricao`/`valor` junto com `horaFim`/`duracaoMin` no
   `updateMany`.

**Files Touched:** `src/utils/validators.ts`, `src/models/ActivityModel.ts`,
`tests/models/ActivityModel.test.ts`
**Verify:** `npx vitest run tests/models/ActivityModel.test.ts`
**Done When:** teste cobrindo `finish` com `descricao`/`valor` informados (persistidos), `finish`
sem `valor` numa categoria com `valorPadrao` (aplica o padrão) e `finish` sem nenhum extra
(comportamento atual inalterado — `descricao`/`valor` continuam nulos).

---

### Fase 7: Controller
**Objetivo:** `ActivityController.finish` valida e repassa os campos opcionais.

**Passos:**
1. `finish`: `parseOrRedirect(req, res, finishDetailsSchema, '/')` (erro de validação — ex.: valor
   negativo — volta pra home com flash, mesmo padrão de `store`/`update`); passa o resultado como
   `extra` pra `ActivityModel.finish`.

**Files Touched:** `src/controllers/ActivityController.ts`, `tests/routes/activities.routes.test.ts`
**Verify:** `npx vitest run tests/routes/activities.routes.test.ts`
**Done When:** teste cobrindo finish com `descricao`/`valor` no body (repassados ao Model) e finish
com valor inválido (flash de erro, redirect pra home, Model não chamado).

---

### Fase 8: View + i18n + validação final
**Objetivo:** UI do `<details>` no card da home; validação cruzada.

**Passos:**
1. `home/index.ejs`: dentro do `<form action=".../finish">` existente, adicionar
   `<details class="in-progress-details">` com `<summary>` ("Finalizar com detalhes") + campo
   `descricao` (textarea, reaproveitando `activities.form.descriptionLabel`/`descriptionPlaceholder`)
   + campo `valor` **só se** `emAndamento.category.possuiValor` (label = `category.valorLabel` ou
   `common.valueLabelDefault`, mesmo padrão de `activities/create.ejs`).
2. i18n (`pt-BR.json`/`en-US.json`): nova chave pro texto do `<summary>` (ex.:
   `home.inProgress.detailsToggle`); reaproveitar as chaves já existentes de descrição/valor —
   não duplicar.
3. Estilo: `<details>`/`<summary>` herdam tipografia normal do body; se o contraste com
   `.sketch-edge` do card ficar estranho, um ajuste mínimo de `margin`/`padding` em
   `public/css/styles.css` (sem novo componente).

**Files Touched:** `src/views/home/index.ejs`, `src/i18n/pt-BR.json`, `src/i18n/en-US.json`,
possivelmente `public/css/styles.css`
**Verify:** `npm run build && npx vitest run && npm run lint` + `npm run dev`, checagem manual
contra o banco de dev: iniciar atividade numa categoria com `possuiValor`, finalizar com detalhes
preenchendo descrição e valor, conferir em `/activities` que ambos aparecem; repetir numa categoria
sem `possuiValor` (campo de valor não deve aparecer); finalizar rápido (sem abrir os detalhes)
continua funcionando igual a hoje.
**Done When:** build/testes/lint verdes; os três cenários manuais acima conferidos, claro/escuro.

### Notas da extensão

- Sem migration — `descricao`/`valor` já são colunas nullable de `Activity`.
- Sem rota nova — mesmo `POST /activities/:id/finish`, só com body opcional.
- Cada fase em branch própria, mesma convenção do restante do plano.
- Replanning trigger: se o usuário quiser que o campo de valor apareça mesmo sem
  `possuiValor` (ex.: valor "livre" em qualquer categoria), isso muda a Fase 6 (regra 9 deixaria de
  ser condição pra aceitar `valor`) e a Fase 8 (campo sempre visível) — replanejar antes.
