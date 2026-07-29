# Plan: CI com GitHub Actions (lint + build + testes unitários)

**Date:** 2026-07-29
**Status:** Fase 1 concluída. `.github/workflows/ci.yml` criado; validação local com env vars
dummy (sem `.env` real, `env -i`) encontrou uma dependência oculta real de Postgres alcançável em
`tests/routes/auth.routes.test.ts` (3 testes que fazem `GET /` após login não mockavam
`ActivityModel`/`CategoryModel`, então `HomeController` batia num Prisma Client de verdade — só
não quebrava localmente porque o Postgres de dev sempre estava no ar). Corrigido adicionando os
mocks que faltavam com defaults (`findInProgress` → `null`, `listByUser` → `[]`). 137/137 passam
tanto com env isolado (`env -i` + vars dummy) quanto no ambiente normal de dev. Fase 2 concluída:
merge em `master` + push, 1 execução real verde no GitHub Actions (run 30457176454, ~1min10s).
**Ajuste pós-plano:** trigger trocado de `push:master` + `pull_request` pra só `pull_request` com
destino `master` (pedido do usuário) — passa a rodar só em PR, não mais em todo push direto.

## Goal

Ter um workflow do GitHub Actions que roda `lint`, `build` e os testes unitários (Vitest) em todo
push/PR, como gate de qualidade — sem mexer no deploy (Railway já auto-deploya via sua própria
integração com o GitHub) nem incluir a suíte E2E (Playwright, criada em
`.claude/plans/testes-bdd-e2e-2026-07-28.md`) por enquanto.

## Levantamento (estado atual)

- Não existe `.github/workflows/` no repo hoje — nenhum CI configurado.
- `package.json` já tem os 3 comandos que o CI vai rodar: `npm run lint` (`eslint src --ext .ts`),
  `npm run build` (`tsc` + copy de assets), `npm test` (`vitest run`).
- Confirmado por leitura de `tests/services/ReportService.test.ts` e
  `tests/models/CategoryModel.test.ts`: os testes unitários fazem `vi.mock('../../src/config/database')`
  — o Prisma Client real (`src/config/database.ts`) nunca é instanciado/consultado nesses testes.
  `new PrismaClient()` também não conecta eagerly (conecta só na primeira query). Ou seja: **o CI
  não precisa de um Postgres de verdade** pra `lint`/`build`/`test` — só precisa que
  `src/config/env.ts` (validado com Zod no boot de qualquer import de `src/app.ts`) não rejeite a
  ausência das variáveis obrigatórias: `DATABASE_URL` (string não-vazia, não precisa ser
  alcançável) e `SESSION_SECRET` (mín. 16 caracteres) — bastam valores dummy setados como `env:` do
  job, sem banco real nem `docker-compose up`.
- Deploy já é automático hoje via Railway/Nixpacks (integração própria Railway↔GitHub, fora do
  GitHub Actions) — confirmado com o usuário que o CD **não** entra neste plano.
- Suíte E2E (Playwright, `e2e/`) confirmada com o usuário como **fora de escopo** deste CI por
  enquanto — precisa de Postgres (serviço) + download do Chromium, roda bem mais lento; pode virar
  um job separado depois, sob demanda.

## Decisão de implementação

- Um único workflow, um único job (`test`), rodando em `ubuntu-latest`: checkout → setup-node (20.x,
  cache npm) → `npm ci` → `npm run lint` → `npm run build` → `npm test`.
- Variáveis de ambiente do job são valores dummy fixos no YAML (não secrets do GitHub) — não são
  credenciais reais, só precisam satisfazer o schema Zod de `env.ts`.
- Triggers: `pull_request` com destino `master` (ajustado depois — pedido explícito do usuário pra
  rodar só em PR, não mais em todo push direto a `master`).

## Escopo

### Dentro do escopo
- `.github/workflows/ci.yml`: lint + build + testes unitários em push/PR.
- Validação local de que as env vars dummy bastam (sem `.env` real carregado).
- Confirmar 1 execução real e verde no GitHub Actions após o push.

### Fora do escopo
- Deploy/CD via GitHub Actions (Railway já cobre isso — decisão do usuário).
- Suíte E2E (Playwright) no CI (decisão do usuário — fica manual/local por enquanto).
- Branch protection exigindo o check antes de merge (mudança de configuração do repositório no
  GitHub, não um arquivo — fica como sugestão manual pro usuário, não implementado aqui).
- Matriz de múltiplas versões de Node (projeto já fixa `engines.node: >=20`, uma versão só basta).
- Dependabot/scanning de segurança (fora do pedido).

## Fases

### Fase 1: Workflow de CI
**Objetivo:** `.github/workflows/ci.yml` criado e validado localmente (mesmos comandos, env vars
dummy, sem `.env` real).

**Passos:**
1. Criar `.github/workflows/ci.yml` com o job único descrito acima.
2. Validar localmente: rodar `npm run lint && npm run build && npm test` numa sessão de shell só
   com as env vars dummy exportadas (sem o `.env` real do projeto carregado), pra garantir que não
   há dependência oculta de alguma variável de dev.

**Files Touched:** `.github/workflows/ci.yml` (novo)
**Verify:** `npm run lint && npm run build && npm test` (localmente, com env vars dummy)
**Done When:** os 3 comandos passam localmente sem o `.env` de dev carregado; YAML sem erro de
sintaxe óbvio (revisão manual, já que não há `actionlint` instalado).

---

### Fase 2: Confirmar no GitHub Actions
**Objetivo:** 1 execução real do workflow, verde, no repositório remoto.

**Passos:**
1. Push da branch pro GitHub (**pede confirmação explícita antes de executar** — ação visível/
   compartilhada).
2. Checar a execução (`gh run list`/`gh run watch` ou a aba Actions) até concluir.

**Files Touched:** nenhum (só o push do que a Fase 1 já criou)
**Verify:** `gh run list --branch <branch> --limit 1` mostra `conclusion: success`
**Done When:** 1 execução real aparece verde no GitHub.

## Dependências e suposições

- Assume `gh` CLI disponível pra checar o status da execução (senão, checar manualmente pela UI).
- Cada fase em branch própria, sem merge/push automático (convenção já estabelecida nesta sessão).

## Notas

- Deploy e E2E ficaram fora deliberadamente (perguntado ao usuário) — não expandir o escopo sem
  pedir de novo.
