# Plan: Modal de detalhes da atividade (lista de `/activities`)

**Date:** 2026-07-28
**Status:** draft

## Goal

Hoje cada item de `/activities` mostra tudo inline no card: nome, data, horário/duração (ou badge
"em andamento"), categoria, e — quando existirem — a linha de valor e a descrição completa (sem
truncar). Descrição ficou mais provável de ser longa desde a Fase 8 de
`.claude/plans/atividade-em-andamento-2026-07-23.md` (campo "finalizar com detalhes"), o que deixa
a lista mais poluída/alta do que precisa pra um simples scan visual. Um botão "ver detalhes" abre
um modal com a informação completa; o card em si fica só com o essencial pra identificar a
atividade de relance.

## Levantamento (estado atual)

- `src/views/activities/index.ejs` (linhas 41-74): cada `<li class="list-item">` já tem acesso a
  `a` (a atividade, com `a.category` incluído via `ActivityModel.listByUser`) — todo dado
  necessário pro modal já está disponível no `forEach`, sem precisar de rota/endpoint novo.
- O projeto já resolveu exatamente esse tipo de problema (overlay + JS sem inline script, CSP
  `script-src-attr 'none'`) pro toast de confirmação de exclusão: `partials/confirm-toast.ejs` +
  `public/js/confirm-submit.js` — um único elemento de overlay incluído uma vez, delegação de
  evento por `data-*`/classe, focus trap, `Escape` fecha, foco volta pro elemento que abriu.
  Reaproveitar o mesmo padrão de interação (não a mesma aparência — confirm-toast é um "toast" no
  rodapé sem scrim; o modal de detalhes é centralizado, com scrim, mais parecido com um dialog de
  verdade).
- Ícone `eye` já existe no catálogo (`partials/icon.ejs`) — serve pro botão "ver detalhes" sem
  precisar desenhar um novo. Ícone `x` já existe pro botão de fechar do modal.
- Nenhum teste hoje faz assert do HTML renderizado de `GET /activities` além de status
  code/redirects (confirmado por grep em `tests/routes/activities.routes.test.ts`) — simplificar o
  card não quebra nenhum teste existente.

## Decisão de implementação

Sem rota/endpoint novo e sem duplicar dados via `data-*` attributes (frágil pra texto livre como
`descricao`, que pode ter aspas/quebras de linha). Em vez disso: cada `<li>` ganha um
`<template class="activity-detail-template">` irmão, com o HTML completo de detalhe já renderizado
pelo EJS (mesma interpolação segura que o resto da view, sem escaping manual extra). O JS, ao
clicar no botão "ver detalhes" daquele item, pega o `<template>` mais próximo
(`closest('.list-item').querySelector(...)`), clona o `.content` pro corpo do modal e exibe —
sem precisar casar por `id`, sem chamada de rede.

## Escopo

### Dentro do escopo
- Botão "ver detalhes" (ícone `eye`) em `.actions`, ao lado de editar/excluir.
- Modal centralizado com scrim (`partials/activity-detail-modal.ejs`, novo) + JS dedicado
  (`public/js/activity-detail-modal.js`, novo) — mesmo padrão de acessibilidade do
  confirm-toast (focus trap, `Escape`, foco de volta ao gatilho), aparência própria (dialog
  centralizado, não toast de rodapé).
- Card simplificado: remove a linha de valor e a linha de descrição do `<li>` — essas duas
  passam a existir só dentro do `<template>` (conteúdo do modal). Card mantém: cor da categoria,
  nome, data, horário/duração (ou badge "em andamento"), nome da categoria.
- i18n: rótulos novos (botão "ver detalhes", título do modal, botão fechar) nos dois dicionários.

### Fora do escopo
- Editar a atividade a partir do modal (o botão de editar continua levando pra
  `/activities/:id/edit` como hoje; o modal é só leitura).
- Aplicar o mesmo modal em outro lugar (ex.: relatório) — só a listagem de `/activities` por
  enquanto.
- Paginação/lazy-loading da lista (fora do pedido, e o `<template>` por item não piora isso: não
  duplica pro DOM visível, só existe quando clonado pro modal).

## Fases

### Fase 1: Modal (partial + JS + CSS) e wiring na lista
**Objetivo:** infraestrutura do modal funcionando, ainda com o card no estado atual (sem remover
valor/descrição do card nesta fase — validar o modal isoladamente primeiro).

**Passos:**
1. `src/views/partials/activity-detail-modal.ejs` (novo): container `role="dialog"
   aria-modal="true"` com scrim, título, corpo vazio (`.activity-detail-body`, alvo do clone),
   botão fechar (ícone `x`).
2. `src/views/activities/index.ejs`: incluir o partial uma vez (fora do `<ul>`); em cada `<li>`,
   adicionar o botão "ver detalhes" (`icon-btn sketch-edge sketch-hover btn-secondary
   js-view-activity-details`, ícone `eye`) em `.actions`, e um `<template
   class="activity-detail-template">` irmão com o detalhe completo (nome, categoria com cor, data,
   horário/duração ou badge, valor quando houver, descrição quando houver).
3. `public/js/activity-detail-modal.js` (novo): delegação de clique em
   `.js-view-activity-details` → localiza o `<template>` mais próximo → clona `.content` pro
   `.activity-detail-body` → mostra o modal (`classList.add('is-visible')`, mesmo `Escape`/focus
   trap/retorno de foco do `confirm-submit.js`, adaptado pro botão fechar em vez de
   confirmar/cancelar).
4. `public/css/styles.css` ou `components.css`: `.activity-detail-modal` (scrim `position: fixed;
   inset: 0` + card centralizado, `is-visible` controla opacidade/`pointer-events`, mesma
   transição suave do confirm-toast) — visual próprio (scrim + centralizado), não uma cópia do
   toast.
5. `src/views/layouts/main.ejs`: incluir `public/js/activity-detail-modal.js` (só quando a página
   for `/activities` — ou incluir sempre, já que o script já faz early-return se o container não
   existir na página, mesmo padrão de `confirm-submit.js`).
6. i18n: `activities.index.viewDetailsAriaLabel`, `activities.index.detailModal.title` (ou similar
   — nomear conforme as chaves já existentes em `activities.index.*`), `activities.index.detailModal.closeAriaLabel`.

**Files Touched:** `src/views/partials/activity-detail-modal.ejs` (novo),
`src/views/activities/index.ejs`, `public/js/activity-detail-modal.js` (novo),
`public/css/components.css`, `src/views/layouts/main.ejs`, `src/i18n/pt-BR.json`,
`src/i18n/en-US.json`
**Verify:** `npm run build && npm test && npm run lint`; `npm run dev` + verificação manual
(headless Chrome, mesma técnica já usada nesta sessão): clicar "ver detalhes" abre o modal com os
dados certos daquele item específico (testar com pelo menos 2 atividades diferentes, uma com
valor+descrição e uma sem), `Escape` fecha, foco volta pro botão que abriu, Tab não escapa do
modal enquanto aberto.
**Done When:** modal funcional nos dois temas (claro/escuro), teclado-only funcional, nenhuma
regressão nos testes existentes.

---

### Fase 2: Simplificar o card
**Objetivo:** o card só mostra o essencial; valor/descrição só existem no modal.

**Passos:**
1. `src/views/activities/index.ejs`: remover as linhas de valor (`a.category.possuiValor && a.valor
   != null`) e descrição (`a.descricao`) do `<div class="list-item-body">` visível — esse
   conteúdo já foi movido pro `<template>` na Fase 1, então aqui é só remoção, não duplicação.

**Files Touched:** `src/views/activities/index.ejs`
**Verify:** `npm run build && npm test && npm run lint` + captura de tela antes/depois de
`/activities` (claro/escuro) com atividades que têm valor/descrição, confirmando que sumiram do
card mas continuam aparecendo no modal.
**Done When:** card visualmente mais compacto; nenhuma informação perdida (tudo que saiu do card
está no modal).

## Dependências e suposições

- Assume que "ver detalhes" fica sempre visível por item (mesmo quando a atividade não tem
  valor/descrição pra mostrar) — mais simples e previsível que esconder o botão condicionalmente;
  reavaliar se o usuário achar redundante nesses casos.
- Cada fase em branch própria, sem merge automático (convenção já estabelecida nesta sessão).

## Notas

- Reaproveita o padrão de acessibilidade já validado em `confirm-submit.js`
  (focus trap, `Escape`, retorno de foco) — não reinventar essa lógica.
- `<template>` por item não é enviado "escondido mas visível" — `<template>` nativo do HTML nunca
  renderiza seu conteúdo no DOM até ser clonado via JS, então não afeta layout/scroll da lista.
