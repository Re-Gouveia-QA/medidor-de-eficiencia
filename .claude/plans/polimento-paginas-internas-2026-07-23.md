# Plan: Polimento das páginas internas (home, atividades, categorias, relatórios)

**Date:** 2026-07-23
**Status:** em andamento

## Goal

Dar a cada página interna (pós-login) um momento visual próprio e memorável, sem sair da
identidade "Caderno de Esboço" — na mesma linha do que foi feito na tela de login (título de
destaque, sublinhado à mão, entrada escalonada). Amarrar as páginas por um fio condutor único:
**cor por seção**, reaproveitando as 4 "canetas" de acento que já existem em `tokens.css` e que a
tela de login já usou nos pontos do botão do Google.

## Conceito — cor por seção

- Registrar atividade → `--accent-blue` (já é a cor do `.btn-primary`)
- Atividades (visualizar/listar) → `--accent-green`
- Relatórios → `--accent-yellow`
- Categorias → `--accent-red`

Essa cor aparece no ícone do card da home, e depois se repete no ícone do `page-header` da
página correspondente — uma "aba colorida de caderno" que ajuda a se localizar, em vez de tudo
usar `--accent-blue` uniformemente (estado atual).

## Fora do escopo

- Telas de auth (login/register/forgot/reset) — login já foi feito em sessão anterior
  (`ui/login-hero-redesign`); não mexer nas outras três sem pedido explícito.
- Repaletar os tokens de acento ou trocar fontes.
- Mudar regras de negócio/validação dos formulários.

## Fases

### Fase 1: Home (dashboard)
**Objetivo:** primeira tela pós-login com identidade própria, não só uma grade neutra.
- Saudação (`Bem-vindo(a) de volta, X`) tratada como cabeçalho de diário — mesma linguagem do
  hero de login (maior, com toque manuscrito).
- Cada um dos 4 cards do `grid-menu` ganha a cor de seção (ícone colorido, hoje todos azuis).
- Entrada escalonada dos 4 cards (`sketch-in` + `--stagger-index`, mecanismo já existente).

**Files Touched:** `src/views/home/index.ejs`, `public/css/styles.css`
**Verify:** build/testes/lint + screenshot claro/escuro de `/`.

---

### Fase 2: Formulários (nova/editar atividade, nova/editar categoria)
**Objetivo:** formulários hoje são só uma lista de campos sem nenhuma personalidade; dar entrada
escalonada e reforçar a cor de seção nos ícones/acentos já usados nesses formulários (ex.:
ícone do checkbox de "possui valor", chevron do select).
- `sketch-in` escalonado nos grupos de campo.
- Acento de cor de seção onde já existe uso de `--ink-soft`/genérico em elementos de destaque do
  formulário (sem inventar decoração nova pesada, é polimento, não redesenho estrutural).

**Files Touched:** `src/views/activities/create.ejs`, `src/views/categories/create.ejs`, `public/css/styles.css`
**Verify:** build/testes/lint + screenshot claro/escuro de `/activities/new` e `/categories/new`.

---

### Fase 3: Relatórios
**Objetivo:** os dois cards de estatística (`dias registrados`, `total de horas`) e as barras de
"tempo por categoria" ganham mais impacto — número principal com o mesmo tratamento de destaque
do título de login (sublinhado/traço à mão), e as barras de progresso preenchem com uma animação
de entrada (0% → valor real) em vez de aparecerem já cheias.
**Files Touched:** `src/views/reports/index.ejs`, `public/css/styles.css`
**Verify:** build/testes/lint + screenshot claro/escuro de `/reports`; conferir `prefers-reduced-motion`.

## Notas

- Cada fase em branch própria (`ui/polish-home`, `ui/polish-forms`, `ui/polish-reports`),
  seguindo a convenção já estabelecida nesta sessão — não mesclar sem pedido explícito.
- Reaproveitar mecanismos já existentes (`sketch-in`, `--stagger-index`, tokens de acento) em vez
  de criar novos — é polimento aditivo, não uma reconstrução.
