# Plan: Relatório de metas atingidas

**Date:** 2026-08-19
**Status:** draft

## Goal

Mostrar em `/reports`, por categoria com meta diária definida (`Category.tempoDesejadoMin`), em
quantos dias do período selecionado a meta foi atingida — reaproveitando o padrão "X/Y" já usado
no card de dias registrados.

## Contexto (o que já existe)

- `Category.tempoDesejadoMin` (`prisma/schema.prisma`) já existe: meta diária opcional em minutos
  (rótulo no form: "Tempo desejado por dia (minutos, opcional)",
  `categories.form.goalTimeLabel` em `src/i18n/*.json`). Capturado no CRUD de categoria, mas nunca
  lido em nenhum outro lugar do código (só grava/edita) — **relatório de metas não existe ainda**.
- `/reports` já tem dois relatórios lado a lado no mesmo padrão (`ReportService.build` +
  `buildValueSeries`, chamados em paralelo por `ReportController.index`, cada um com sua seção na
  view): tempo por categoria (barras) e valor por categoria (gráfico de linha, regra 9). O novo
  relatório de metas segue o mesmo padrão — um terceiro método de serviço, chamado no mesmo
  `Promise.all`, com sua própria seção na view.
- "Dia registrado" (regra 8) já é tratado como o dia civil em `Activity.data` (UTC puro, sem
  conversão de fuso — decisão de escopo documentada em CLAUDE.md regra 8) — o novo relatório usa a
  mesma base (`data`), não `horaInicio`, por consistência com `ReportService.build`.

## Decisão de design (assumida, não confirmada com o usuário)

"Meta atingida" = por dia do período, soma da duração das atividades daquela categoria naquele dia
≥ `tempoDesejadoMin`. O relatório mostra, por categoria com meta definida: `diasComMeta / diasNoPeriodo`
(mesmo denominador do card "dias registrados" já existente — `diasNoPeriodo`, não os dias em que a
categoria teve alguma atividade, para manter leitura consistente com o resto da página).
Categorias com meta definida mas nenhuma atividade no período aparecem com `0/diasNoPeriodo`, não
somem da lista (usuário vê a meta batida em 0 dias, não fica sem sinal nenhum).

**Replanning trigger:** se o usuário quiser outro critério (ex.: meta semanal/mensal agregada em
vez de diária, ou percentual médio de cumprimento em vez de contagem de dias), phases 1-2 mudam de
fórmula mas não de estrutura — revisar antes de implementar se esse não for o critério esperado.

## Scope

### In-Scope
- `ReportService.buildGoals(userId, periodo)`: novo método, mesmo padrão de `build`/`buildValueSeries`.
- `ReportController.index`: inclui a chamada no `Promise.all` existente, passa o resultado pra view.
- `reports/index.ejs`: nova seção "Metas atingidas" entre "Tempo por categoria" e "Valor por
  categoria" (reaproveita `.card`/`.bars`/`.bar-track`/`.bar-fill`/`.color-dot`/`.sketch-in` já
  existentes — sem CSS novo).
- Chaves i18n novas em `src/i18n/pt-BR.json` e `src/i18n/en-US.json` (mantendo paridade, já 100%
  entre os dois arquivos hoje).
- Testes: `tests/services/ReportService.test.ts` (unitário, BDD Dado/Quando/Então) e
  `tests/routes/reports.routes.test.ts` (rota, mesmo padrão dos testes existentes ali).

### Out-of-Scope
- Mudar a fórmula de "meta atingida" para semanal/mensal (documentado como replanning trigger acima).
- Editar `tempoDesejadoMin` a partir da tela de relatórios — só leitura.
- Notificações/lembretes de meta (fora do MVP, ver CLAUDE.md "Fora do escopo").
- Metas para `valorPadrao`/`possuiValor` (regra 9) — só tempo (regra do `tempoDesejadoMin`).

## Phases

### Phase 1: `ReportService.buildGoals`
**Objetivo:** calcular, por categoria com meta, os dias do período em que a meta foi atingida.

**Steps:**
1. `src/services/ReportService.ts`: adicionar interface `CategoryGoalProgress` (`categoryId`,
   `categoria`, `cor`, `metaMin`, `metaFormatada`, `diasComMeta`, `diasNoPeriodo`, `percentual`).
2. Adicionar `buildGoals(userId: string, { inicio, fim }: ReportPeriod): Promise<CategoryGoalProgress[]>`:
   - Busca categorias do usuário com `tempoDesejadoMin: { not: null }` (`this.db.category.findMany`,
     `this.scopeToUser`).
   - Se nenhuma, retorna `[]` sem consultar atividades (evita query desnecessária).
   - Busca atividades do período (mesmo filtro de `build`: `horaFim: { not: null }`) restritas às
     categorias encontradas (`categoryId: { in: [...] }`), selecionando `data`, `duracaoMin`, `categoryId`.
   - Para cada categoria: agrupa duração por dia (`Map<string dia ISO, number min>`), conta quantos
     dias têm total ≥ `tempoDesejadoMin`.
   - `diasNoPeriodo`: mesmo cálculo já usado em `build` (`Math.floor((fim-inicio)/86_400_000)+1`) —
     extrair para uma função privada/exportada pequena se preferir não duplicar a conta, mas duplicar
     a única linha é aceitável dado o tamanho (decisão local, não introduzir abstração maior por isso).
   - Ordena por `percentual` desc (categorias com melhor cumprimento primeiro).
3. `tests/services/ReportService.test.ts`: novo `describe('buildGoals (meta diária por categoria)', ...)`
   estrutura BDD Dado/Quando/Então, cobrindo: where inclui userId + `tempoDesejadoMin: { not: null }`;
   retorna `[]` sem chamar `activity.findMany` quando não há categoria com meta; agrupa duração por
   dia corretamente (dia com meta batida + dia com meta não batida na mesma categoria); categoria
   com meta e zero atividades no período aparece com `diasComMeta: 0`.

**Files Touched:** `src/services/ReportService.ts`, `tests/services/ReportService.test.ts`
**Verify:** `npm test -- ReportService.test.ts`
**Done When:** testes novos verdes, `npm run build` sem erro de tipo.
**Time:** 45min

**Replanning triggers:**
- Se `this.db.category` não existir no mock/tipo esperado por `BaseModel` (confirmar assinatura
  antes de escrever — mesma classe já usada por `CategoryModel`, mas `ReportService` hoje só usa
  `this.db.activity`).

### Phase 2: Controller + View + i18n
**Objetivo:** expor o relatório de metas na página `/reports`.

**Steps:**
1. `src/controllers/ReportController.ts`: adicionar `ReportService.buildGoals(req.currentUser!.id, periodo)`
   ao `Promise.all` existente (junto de `build`/`buildValueSeries`), passar `metas` pro `res.render`.
2. `src/views/reports/index.ejs`: nova seção entre a de tempo por categoria e a de valor por
   categoria — `<h2 class="report-section-heading">` + lista `.card`/`.bars`/`.bar-track`/`.bar-fill`
   igual à seção de tempo por categoria, trocando o texto do `.bar-label` por
   `"{{diasComMeta}}/{{diasNoPeriodo}} dias · meta {{metaFormatada}}/dia"` (chave i18n com
   interpolação, mesmo padrão de `reports.chart.ariaLabel`); estado vazio (`metas.length === 0`)
   com mensagem própria.
3. `src/i18n/pt-BR.json` e `src/i18n/en-US.json`: adicionar (mantendo paridade):
   - `reports.goalsHeading` ("Metas atingidas" / "Goals achieved")
   - `reports.goalsEmpty` ("Nenhuma categoria com meta diária definida." / "No category with a daily goal set.")
   - `reports.goals.progressLabel` (interpolação `{{diasComMeta}}`, `{{diasNoPeriodo}}`, `{{metaFormatada}}`)

**Files Touched:** `src/controllers/ReportController.ts`, `src/views/reports/index.ejs`,
`src/i18n/pt-BR.json`, `src/i18n/en-US.json`
**Verify:** `npm run build && npm run lint`
**Done When:** `/reports` renderiza a nova seção sem erro (checar manualmente com `npm run dev` +
uma categoria de seed com `tempoDesejadoMin` — seed atual tem 5 categorias de exemplo, confirmar
se alguma já tem meta ou ajustar uma via UI pra testar).
**Time:** 40min

**Replanning triggers:**
- Se nenhuma categoria do seed tiver `tempoDesejadoMin`, criar/editar uma manualmente via UI antes
  de validar visualmente (não editar o seed script pra isso, é só pra teste manual local).

### Phase 3: Testes de rota
**Objetivo:** cobrir a nova seção no nível de rota, mesmo padrão dos testes já existentes no arquivo.

**Steps:**
1. `tests/routes/reports.routes.test.ts`: `vi.mock` já cobre `ReportService` inteiro — adicionar
   `vi.mocked(ReportService.buildGoals).mockResolvedValue([])` no `beforeEach` (mesmo padrão de
   `buildValueSeries` hoje) e testes específicos: (a) exibe progresso quando há categoria com meta
   (`res.text` contém nome da categoria + "3/31" etc.); (b) exibe mensagem vazia quando `buildGoals`
   retorna `[]`.

**Files Touched:** `tests/routes/reports.routes.test.ts`
**Verify:** `npm test -- reports.routes.test.ts`
**Done When:** todos os testes do arquivo passam, incluindo os novos.
**Time:** 20min

## Dependencies & Assumptions

- Depende só de código já existente (`Category.tempoDesejadoMin`, `BaseModel.scopeToUser`,
  `formatMinutes`) — nenhuma migration nova.
- Assume que "meta diária" (não semanal/mensal) é o critério certo, dado que é como o campo já é
  rotulado no form de categoria hoje ("Tempo desejado **por dia**").

## Notes

- Nome do relatório na UI ("Metas atingidas") é uma sugestão — ajustar a chave i18n se o usuário
  preferir outro texto, sem impacto na estrutura das phases.
