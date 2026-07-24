# Plan: Relatório — gráfico de linha (Valor x Tempo) por categoria

**Date:** 2026-07-24
**Status:** concluído — Fases 1-4 implementadas em `feature/report-value-line-chart` e mescladas em
`master` (commits `0853b79`, `8f5ead3`, `a78ccff`, `ed4dd6e`; merge `e7f6223`). Build/testes/lint
verdes em cada etapa (123/123 testes na suíte completa). Duas iterações além do escopo original
das 4 fases, a pedido do usuário, também na mesma branch: marcações de eixo X (dd/MM) e tooltip
custom no estilo "Caderno de Esboço" no hover/foco de cada ponto (substituindo o `<title>` nativo
do navegador cogitado na Fase 3). Security review (`/security-review`) no diff mesclado não
encontrou vulnerabilidades. Checagem visual manual em navegador (claro/escuro, dados reais) segue
pendente — não foi possível nas sessões em que isso foi implementado por indisponibilidade
momentânea do Postgres local (Docker Desktop); recomendado antes de considerar a feature 100%
validada, mas não bloqueia o que já foi mesclado.

## Goal

Em `/reports`, exibir um gráfico de linha "Valor x Tempo" para cada categoria com
`possuiValor = true`, um ponto por atividade (não agregado por dia), plotando as atividades
registradas no período filtrado que têm `valor` preenchido.

## Scope

### In-Scope
- Novo método `ReportService.buildValueSeries(userId, period)` — uma série por categoria com
  `possuiValor = true` que tenha ao menos uma atividade com `valor` não nulo no período.
- Helper puro de geometria SVG (`src/utils/chart.ts`) pra converter pontos `{x: Date, y: number}`
  em coordenadas de um `<polyline>`/`<circle>` dentro de um viewBox fixo — sem lib de gráfico nova
  (repo não usa Chart.js/D3/canvas; tudo hoje é EJS + CSS/SVG server-rendered, ver `.bars`/
  `.stat-underline` em `reports/index.ejs`).
- `ReportController.index` passa a nova série pra view, junto de `formatNumber`/`formatTime`
  (mesmo padrão já usado em `ActivityController`).
- Nova seção em `reports/index.ejs`: um card por categoria com valor, título (nome da categoria +
  `valorLabel`), SVG de linha com pontos clicáveis/hover (`<title>` nativo do SVG pra tooltip,
  sem JS novo) e eixo Y com mínimo/máximo formatados via `formatNumber`.
- CSS novo (`.line-chart` e afins) em `styles.css`, seguindo a mesma convenção visual dos
  `.report-card`/`.bars` existentes (cor da categoria, `sketch-edge`, `sketch-in` escalonado).
- Testes: `ReportService.buildValueSeries` (filtragem por `possuiValor`/`valor` não nulo/período)
  e o helper de geometria (`src/utils/chart.ts`) — casos normais, 1 ponto único, todos os valores
  iguais (evitar divisão por zero na normalização).

### Out-of-Scope
- Múltiplas categorias sobrepostas no mesmo gráfico (decidido: um gráfico por categoria).
- Agregação por dia/média (decidido: um ponto por atividade, valor bruto).
- Zoom/pan/interatividade JS além do `<title>` nativo do SVG.
- Exportar o gráfico como imagem/PDF.
- Mudar a query/agregação existente de "tempo por categoria" (`ReportService.build`) — a nova
  série é um método adicional, não substitui a atual.
- Nenhuma migration nova — schema já tem tudo necessário (`Activity.valor`,
  `Category.possuiValor/valorLabel`).

## Phases

### Phase 1: `ReportService.buildValueSeries`
**Objetivo:** dado userId + período, retornar os pontos (atividade → valor) agrupados por
categoria, só para categorias com `possuiValor = true` e atividades com `valor` preenchido.

**Steps:**
1. Em `src/services/ReportService.ts`, adicionar interfaces `ValueSeriesPoint { atividadeId,
   nome, data, horaInicio, valor }` e `CategoryValueSeries { categoryId, categoria, cor,
   valorLabel, pontos: ValueSeriesPoint[] }`.
2. Novo método `buildValueSeries(userId, { inicio, fim }): Promise<CategoryValueSeries[]>` —
   `this.db.activity.findMany` com `where: this.scopeToUser(userId, { data: {gte, lte}, valor: {
   not: null }, category: { possuiValor: true } })`, `select: { id, nome, data, horaInicio, valor,
   categoryId, category: { nome, cor, valorLabel } }`, `orderBy: [{ categoryId: 'asc' }, {
   horaInicio: 'asc' }]`.
3. Agrupar em `Map<categoryId, CategoryValueSeries>` (mesmo padrão do `Map` já usado em `build()`
   pra `porCategoria`), convertendo `Decimal` de `valor` pra `number` (`.toNumber()` ou
   `Number(valor)` — conferir como `formatNumber`/outros pontos do código já lidam com `Decimal`
   do Prisma antes de escolher).
4. Retornar array ordenado (ex.: por nome da categoria, ou pela ordem de primeira ocorrência —
   decidir na implementação, não é uma regra de negócio documentada).

**Files Touched:** `src/services/ReportService.ts`, `tests/services/ReportService.test.ts`
**Verify:** `npm test -- ReportService.test.ts`
**Done When:** teste cobre — categoria sem `possuiValor` fica de fora; atividade com `valor` nulo
fica de fora; atividades fora do período ficam de fora; pontos vêm ordenados por `horaInicio`
dentro da categoria.
**Time:** ~1h

**Replanning triggers:**
- Se `Decimal` do Prisma exigir tratamento diferente do que `formatNumber` já faz (ex.: perda de
  precisão ao converter), ajustar o helper de formatação antes de seguir pra Phase 3.

---

### Phase 2: Wiring no controller
**Objetivo:** `ReportController.index` busca a nova série e passa pra view.

**Steps:**
1. Em `src/controllers/ReportController.ts`, importar `formatNumber` (`utils/format`) e
   `formatTimeInZone` (`utils/time`), mesmo padrão de `ActivityController.ts`.
2. Chamar `ReportService.buildValueSeries(req.currentUser!.id, periodo)` junto de `build()`
   (`Promise.all` pra não serializar as duas queries).
3. Passar `seriesValor`, `formatNumber`, `formatTime: (d) => formatTimeInZone(d, req.userTimezone)`
   pro `res.render('reports/index', ...)`.

**Files Touched:** `src/controllers/ReportController.ts`
**Verify:** `npm run build && npm test -- reports.routes.test.ts`
**Done When:** rota `/reports` continua respondendo 200 com os novos dados nos locals da view
(conferir via teste de rota existente, sem precisar de teste novo nesta fase).
**Time:** ~20min

---

### Phase 3: Helper de geometria SVG + view
**Objetivo:** renderizar o gráfico de linha em `reports/index.ejs` sem lib de gráfico nova.

**Steps:**
1. Criar `src/utils/chart.ts` com `buildLineChartGeometry(pontos: {x: number; y: number}[],
   { width, height, padding }): { points: string; circles: {x: number; y: number}[]; minY:
   number; maxY: number }` — normaliza `y` (valor) pro range `[padding, height - padding]` e `x`
   (índice ou timestamp) pro range `[padding, width - padding]`. Tratar os dois casos-limite:
   1 ponto só (sem `polyline`, só o círculo) e todos os `y` iguais (evitar `/0` na normalização —
   centralizar verticalmente nesse caso).
2. Em `src/controllers/ReportController.ts` (ou dentro da própria view via função importada —
   decidir na implementação qual fica mais simples; a view já recebe `formatNumber` como função,
   então passar `buildLineChartGeometry` do mesmo jeito é consistente), gerar a geometria por
   categoria antes de renderizar.
3. Em `src/views/reports/index.ejs`, adicionar seção "Valor por categoria" depois de "Tempo por
   categoria": um `card sketch-edge sketch-in` por `CategoryValueSeries`, com:
   - título (nome da categoria + `valorLabel`), cor de acento = cor da categoria (`d.cor`, mesma
     lógica ortogonal já documentada no CLAUDE.md — não forçar pra paleta de 4 acentos).
   - `<svg class="line-chart" viewBox="0 0 W H">` com `<polyline>` (stroke = cor da categoria) +
     `<circle>` por ponto, cada `<circle>` com `<title><%= formatNumber(p.valor) %> em
     <%= formatTime(p.horaInicio) %></title>` pra tooltip nativo (sem JS).
   - rótulos de mínimo/máximo do eixo Y (`formatNumber`).
   - estado vazio: se nenhuma categoria tiver série (todas vazias), mensagem `muted` igual ao
     padrão já usado em "Nenhuma atividade registrada no período selecionado."
4. CSS novo em `public/css/styles.css` (seção "Relatórios", perto de `.bars`): `.line-chart`
   (svg responsivo, `width: 100%; height: auto`), `.line-chart polyline` (`fill: none;
   stroke-width`), `.line-chart circle` (raio fixo, `fill` = cor da categoria), reaproveitar
   `sketch-in`/`--stagger-index` pra entrada escalonada dos cards novos, igual ao padrão já
   documentado no CLAUDE.md pra `reports/index.ejs`.

**Files Touched:** `src/utils/chart.ts` (novo), `src/controllers/ReportController.ts`,
`src/views/reports/index.ejs`, `public/css/styles.css`, `tests/utils/chart.test.ts` (novo)
**Verify:** `npm run build && npm test -- chart.test.ts && npm run lint`
**Done When:** `tests/utils/chart.test.ts` cobre 1 ponto, valores iguais e caso normal (≥2 pontos
distintos); build/lint verdes.
**Time:** ~2h

**Replanning triggers:**
- Se o eixo X precisar refletir proporcionalmente o tempo real entre atividades (não só a ordem)
  e isso complicar a geometria além do estimado, isolar essa decisão e confirmar com o usuário
  antes de seguir — foi definido "um ponto por atividade" mas não foi definido se o espaçamento
  no eixo X é uniforme (por índice) ou proporcional à data/hora real. **Assumir espaçamento
  proporcional à `horaInicio` real (não uniforme por índice)**, por ser mais fiel ao "Tempo" do
  título do gráfico — mas está sinalizado aqui porque não foi perguntado explicitamente.

---

### Phase 4: Checagem visual + testes de rota
**Objetivo:** confirmar que a nova seção não quebra o layout existente e funciona nos dois temas.

**Steps:**
1. `npm run dev`, logar com o usuário seed (`demo@medidor.dev` / `senha12345`, já tem categorias
   de exemplo — conferir se alguma tem `possuiValor = true`; senão, ajustar uma via
   `prisma studio` só para o teste manual, não como parte do seed).
2. Checar `/reports` com: (a) categoria com várias atividades com valor, (b) categoria com
   `possuiValor` mas nenhuma atividade com valor no período (estado vazio), (c) categoria com uma
   única atividade com valor (1 ponto, sem linha).
3. Conferir tema claro/escuro e `prefers-reduced-motion` (a entrada `sketch-in` dos novos cards
   deve respeitar o interruptor geral já existente em `tokens.css`).
4. Estender `tests/routes/reports.routes.test.ts` com um caso que verifica a presença dos dados de
   série no response (ou HTML) quando existe categoria com `possuiValor` e atividades com valor.

**Files Touched:** `tests/routes/reports.routes.test.ts`
**Verify:** `npm run build && npm test && npm run lint`
**Done When:** suíte completa verde; checagem visual manual documentada aqui (ou no PR) como feita.
**Time:** ~45min

## Dependencies & Assumptions

- Nenhuma dependência nova (sem Chart.js/D3) — decisão herdada do padrão atual do repo
  (server-rendered EJS + CSS/SVG puro).
- Assume-se espaçamento do eixo X proporcional à `horaInicio` real das atividades, não por índice
  (sinalizado como ponto a confirmar na Phase 3 se a complexidade da geometria crescer).
- `Activity.valor` só é considerado quando não nulo — atividades de categorias com `possuiValor`
  mas sem valor preenchido (regra 9: `valorPadrao` só é sugestão no form, não é gravado
  automaticamente pelo `ActivityModel`) não entram no gráfico.

## Notes

- Branch própria (`feature/report-value-line-chart` ou similar), seguindo a convenção já
  estabelecida de não empilhar mudanças de escopos diferentes numa mesma branch.
- Reaproveitar padrões já existentes (`sketch-in`, `--stagger-index`, `formatNumber`,
  `formatTimeInZone`, `<title>` SVG nativo pra tooltip) em vez de introduzir lib nova — é uma
  feature aditiva sobre a página de relatórios já existente, não um redesenho.
