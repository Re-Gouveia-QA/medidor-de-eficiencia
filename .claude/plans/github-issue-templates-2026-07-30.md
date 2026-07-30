# Plan: Templates de issue do GitHub

**Date:** 2026-07-30
**Status:** concluído em `chore/github-issue-templates` (não mesclado — merge só mediante pedido
explícito). Sintaxe dos 3 arquivos validada com `npx js-yaml`.

## Goal

Dar estrutura mínima às issues abertas no repositório (bug/feature) via GitHub Issue Forms (YAML),
pra facilitar triagem e desenvolvimento contínuo sem depender de descrição livre.

## Levantamento (estado atual)

- `.github/` só tem `workflows/ci.yml` — nenhum template de issue, nenhum `PULL_REQUEST_TEMPLATE.md`,
  nenhum `CONTRIBUTING.md`/`CODEOWNERS`.
- Repositório de dono único (Renan Gouveia) sem canais externos (Discord/fórum) — `config.yml` não
  precisa de `contact_links`, só desabilitar issue em branco pra forçar o uso de um template.
- Convenção do projeto: commits, planos e `CLAUDE.md` estão todos em pt-BR — os templates seguem o
  mesmo idioma.
- GitHub Issue Forms (`.yml`, não `.md`) são o formato atual recomendado (campos estruturados,
  validação de obrigatoriedade nativa do GitHub) — preferido a templates markdown antigos.

## Scope

### In-Scope
- `.github/ISSUE_TEMPLATE/bug_report.yml` — campos: o que aconteceu, passos pra reproduzir,
  comportamento esperado, ambiente (navegador/SO), checagem de duplicidade.
- `.github/ISSUE_TEMPLATE/feature_request.yml` — campos: problema/motivação, solução proposta,
  alternativas consideradas.
- `.github/ISSUE_TEMPLATE/config.yml` — `blank_issues_enabled: false` (força escolher um template).

### Out-of-Scope
- `PULL_REQUEST_TEMPLATE.md` — não foi pedido; escopo desta issue é só templates de *issue*.
- `CONTRIBUTING.md`/`CODEOWNERS` — fora do pedido, dono único do repo.
- Template de "chore"/"tech debt" separado — bug + feature cobrem o fluxo real hoje; adicionar um
  terceiro template só se o uso mostrar necessidade (evitar template não usado).
- Automação de labels/projeto (GitHub Actions pra auto-adicionar a um Project board) — fora do
  pedido.

## Phases

### Phase 1: Templates de issue
**Objetivo:** qualquer issue nova (bug ou feature) nasce com campos estruturados em vez de uma
caixa de texto em branco.

**Steps:**
1. `.github/ISSUE_TEMPLATE/bug_report.yml`: `name: "🐛 Relatório de bug"`, `labels: [bug]`, campos
   obrigatórios (`O que aconteceu?`, `Passos para reproduzir`, `Comportamento esperado`) + campo
   opcional (`Ambiente` — navegador/SO/dispositivo).
2. `.github/ISSUE_TEMPLATE/feature_request.yml`: `name: "✨ Sugestão de feature"`,
   `labels: [enhancement]`, campos (`Problema/motivação`, `Solução proposta`,
   `Alternativas consideradas` opcional).
3. `.github/ISSUE_TEMPLATE/config.yml`: `blank_issues_enabled: false`.

**Files Touched:** `.github/ISSUE_TEMPLATE/bug_report.yml` (novo),
`.github/ISSUE_TEMPLATE/feature_request.yml` (novo), `.github/ISSUE_TEMPLATE/config.yml` (novo)
**Verify:** `npx -y js-yaml .github/ISSUE_TEMPLATE/bug_report.yml`,
`npx -y js-yaml .github/ISSUE_TEMPLATE/feature_request.yml`,
`npx -y js-yaml .github/ISSUE_TEMPLATE/config.yml` (parse sem erro — sanity check de sintaxe,
sem precisar adicionar `js-yaml` como dependência do projeto).
**Done When:** os 3 arquivos existem, `js-yaml` confirma sintaxe válida nos 3, e uma revisão visual
confirma que cada campo tem `id`/`label`/`required` coerentes com o schema de GitHub Issue Forms.
**Time:** 30min

**Replanning triggers:**
- Nenhum esperado — mudança puramente de configuração do GitHub, sem código de app envolvido.

## Dependências e suposições

- Assume que o repositório já está hospedado no GitHub (`Re-Gouveia-QA/medidor-de-eficiencia`,
  confirmado pelo remote `origin` já usado no plano de CI) — Issue Forms só têm efeito lá, não em
  outro host git.
- Sem dependência de fases anteriores (`.github/workflows/ci.yml` não interage com issue templates).

## Notes

- Se o volume de issues justificar no futuro, revisar se vale um terceiro template (ex.: dúvida/
  suporte) — decisão adiada, não antecipar sem uso real.
