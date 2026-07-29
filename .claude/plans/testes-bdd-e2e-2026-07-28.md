# Plan: Testes BDD (unitários) + E2E (Playwright)

**Date:** 2026-07-28
**Status:** Fase 1 concluída (convenção documentada + `activities.routes.test.ts` migrado, 23/23
testes passando, mesma cobertura, só reorganização). Fase 2 concluída (Playwright + banco `_e2e`
funcionando, smoke spec passando 2x seguidas contra `localhost:5433/medidor_eficiencia_e2e`,
servidor de teste isolado na porta 3100 — confirmado que não colide com o servidor de dev na 3000
nem com o banco de dev, mesmo os dois rodando ao mesmo tempo). Fase 3 concluída (`e2e/auth.spec.ts`,
4/4 cenários: login válido, senha errada, guarda de rota sem sessão, logout). Fase 4 concluída
(`e2e/categories.spec.ts`, 5/5 cenários: criar, editar, criar com valor numérico, exclusão
bloqueada por atividade vinculada — regra 7 — e exclusão sem vínculo). Fase 5 concluída
(`e2e/activities.spec.ts`, 4/4 cenários: registrar com valor+descrição — card compacto, modal com
valor por último —, editar, iniciar em andamento com badge, finalizar com detalhes regra 9). Fase 6
concluída (`e2e/reports.spec.ts`, 2/2: período padrão = mês corrente, filtro recalcula dias/horas/
categoria; `e2e/theme.spec.ts`, 2/2: alterna tema e persiste após reload via cookie). Fase 7
concluída (`CLAUDE.md` documenta `npm run test:e2e` + pré-requisitos; confirmado que `npm test` e
`npm run test:e2e` rodam de forma independente, sem overlap de arquivos). **Plano concluído e
mesclado em `master`** — 137 testes unitários (Vitest, convenção BDD) + 22 testes E2E (Playwright)
cobrindo autenticação, categorias, atividades (incl. o modal de detalhes), relatórios e tema.

**Nota operacional:** o Docker Desktop já parou uma vez no meio da Fase 4 (container `medidor-db`
inacessível) — checar `docker ps` antes de rodar `npm run test:e2e` se aparecer `AggregateError`
sem detalhe no `global-setup`.

## Goal

Adotar uma convenção BDD (Dado/Quando/Então) legível nos testes unitários existentes (Vitest,
sem trocar de runner) e introduzir uma primeira camada de testes E2E de ponta a ponta (Playwright,
navegador real) cobrindo os fluxos "golden path" do app — nenhum dos dois existe hoje de forma
formal.

## Levantamento (estado atual)

- **Unitários hoje:** 137 testes em 15 arquivos (`tests/`), Vitest + `supertest`, mocks de
  Prisma via `vi.mock('../../src/models/...')`. Cobertura já é boa e referencia as regras de
  negócio no nome do `it(...)` (ex.: `"regra 9"`, `"RF12"`), mas em `describe`/`it` plano — sem
  estrutura Dado/Quando/Então. Confirmado por leitura de `tests/time.test.ts`,
  `tests/models/{Category,Activity}Model.test.ts`, `tests/routes/{auth,categories,activities}.routes.test.ts`,
  `tests/routes/{docs,guards}.routes.test.ts`, `tests/services/ReportService.test.ts`: as regras 1-12
  do `CLAUDE.md` já têm pelo menos um teste cobrindo o caminho feliz e o de erro — **não há gap de
  cobertura de regra de negócio a fechar**, isso é puramente sobre estrutura/legibilidade.
- **E2E hoje:** não existe nenhum. A única verificação em navegador real usada nesta sessão foi
  ad-hoc (scripts Node com CDP direto, escritos e descartados a cada verificação manual) — não há
  suíte persistida, config ou script `npm run`.
- **Banco de testes:** `docker-compose.yml` já sobe um Postgres local pra dev; não existe hoje um
  banco/schema dedicado a testes (unitários usam mocks, não tocam o banco real). E2E precisa de um
  banco de verdade (não dá pra mockar Prisma num teste de navegador) — vai precisar de um
  `DATABASE_URL` próprio (schema separado, ex. `medidor_eficiencia_e2e`), migrado e limpo entre
  execuções, pra não sujar os dados de dev/seed.

## Decisão de implementação

- **BDD unitário = convenção de nomenclatura/estrutura em cima do Vitest já existente**, não uma
  ferramenta nova (Gherkin/Cucumber descartado — decisão do usuário: evitar um segundo test
  runner/config). Trocar `describe`/`it` planos por `describe('Dado ...', () => { describe('Quando
  ...', () => { it('Então ...') }) })`.
- **Sem migração em massa dos 15 arquivos existentes** (violaria o portão anti-rewrite: >5
  arquivos, puramente mecânico, baixo valor). Em vez disso: documentar a convenção + aplicar como
  exemplo em 1 arquivo já familiar (`tests/routes/activities.routes.test.ts`, área mexida
  nesta sessão). Arquivos futuros seguem a convenção; migração dos demais fica fora de escopo
  (mencionado nas Notas, não implementado aqui).
- **E2E com Playwright** (decisão do usuário): builda sobre CDP, TypeScript nativo, um único
  config, roda contra o app real (`npm run dev`) — mesma tecnologia já usada manualmente nesta
  sessão pra verificação visual, agora persistida como suíte.
- Specs de Playwright vivem em `e2e/` (não em `tests/`), extensão `.spec.ts` — evita colisão com o
  glob `tests/**/*.test.ts` do `vitest.config.ts`, dois runners não se pisam.
- E2E não reaproveita o usuário seed (`demo@medidor.dev`) pra não colidir com uso manual/dev
  simultâneo do banco de dev — cria e limpa seu próprio usuário/categoria/atividades por execução,
  contra um banco/schema `_e2e` dedicado.

## Escopo

### Dentro do escopo
- Convenção Dado/Quando/Então documentada (seção nova em `CLAUDE.md`, bullet de Testes) + 1 arquivo
  exemplo migrado (`tests/routes/activities.routes.test.ts`).
- Setup do Playwright: config, `npm run test:e2e`, banco `_e2e` dedicado (migrate + limpeza),
  helper de login E2E.
- Specs E2E cobrindo golden paths: autenticação, CRUD de categorias (+ exclusão bloqueada, regra
  7), CRUD de atividades + modal de detalhes (feature desta sessão), atividade em andamento
  (iniciar/finalizar com detalhes, regras 9/10), relatórios (filtro de período), tema claro/escuro
  (persistência via cookie).

### Fora do escopo
- Migrar os 14 arquivos de teste unitário restantes pra Dado/Quando/Então (mecânico, baixo valor,
  viola o portão anti-rewrite — fazer sob demanda, arquivo por arquivo, se/quando forem tocados
  por outro motivo).
- E2E de login via Google OAuth real (exigiria conta/credencial real do Google só pra teste — fora
  de escopo; a rota já tem cobertura unitária mockando `google-auth-library`).
- CI (GitHub Actions/pipeline) rodando os testes automaticamente — este repo não tem CI hoje
  (`.github/workflows` não existe); adicionar isso é uma decisão separada, não implícita neste
  plano.
- Testes de acessibilidade automatizados (axe-core etc.) — mencionado como possível extensão futura,
  não implementado aqui.

## Fases

### Fase 1: Convenção BDD + exemplo
**Objetivo:** convenção documentada e demonstrada em um arquivo real, sem tocar os outros 14.

**Passos:**
1. `CLAUDE.md`: adicionar à seção de Convenções (ou uma nova subseção em Stack/Testes) a
   convenção Dado/Quando/Então — nomear em português, `describe('Dado <estado>', ...)` >
   `describe('Quando <ação>', ...)` > `it('Então <resultado>', ...)`; nested só até onde ajuda
   legibilidade (não forçar 3 níveis pra um teste trivial de uma linha).
2. Reescrever `tests/routes/activities.routes.test.ts` nessa estrutura, mantendo os mocks e
   asserts atuais (é reorganização de `describe`/`it`, não reescrita de lógica de teste).

**Files Touched:** `CLAUDE.md`, `tests/routes/activities.routes.test.ts`
**Verify:** `npm test -- activities.routes.test.ts`
**Done When:** os 315 linhas do arquivo compilam/passam com a nova estrutura aninhada; nenhuma
asserção mudou de comportamento, só a organização.

---

### Fase 2: Setup do Playwright + banco `_e2e`
**Objetivo:** infraestrutura de E2E rodando (1 smoke spec), antes de escrever os golden paths.

**Passos:**
1. `npm install -D @playwright/test` + `npx playwright install chromium` (só Chromium — sem
   Firefox/WebKit, escopo do projeto é web comum, não cross-browser).
2. `playwright.config.ts` (raiz): `testDir: './e2e'`, `webServer` apontando pro `npm run dev` (ou
   `npm run build && npm start`) contra a `DATABASE_URL` de teste, `baseURL:
   'http://localhost:3000'`.
3. `.env.test` (novo, fora do git — adicionar ao `.gitignore` se ainda não estiver coberto por
   `.env*`): `DATABASE_URL` apontando pro schema `medidor_eficiencia_e2e` no mesmo Postgres do
   `docker-compose.yml`.
4. `e2e/global-setup.ts`: roda `prisma migrate deploy` contra a `DATABASE_URL` de teste e limpa as
   tabelas (`TRUNCATE ... CASCADE` ou `deleteMany` em cascata) antes da suíte — idempotente entre
   execuções.
5. `e2e/helpers/auth.ts`: cria um usuário de teste direto via Prisma (bcrypt da senha) + helper
   `login(page, user)` que preenche `/login` — reaproveita o padrão de `tests/helpers/auth.ts`
   (mas de verdade pelo navegador, não mock).
6. `e2e/smoke.spec.ts`: 1 teste mínimo (`/login` carrega, título correto) só pra validar que o
   pipeline inteiro (banco `_e2e` + server + browser) funciona antes de investir nos golden paths.
7. `package.json`: script `"test:e2e": "playwright test"`.

**Files Touched:** `package.json`, `playwright.config.ts` (novo), `.env.test` (novo, git-ignored),
`e2e/global-setup.ts` (novo), `e2e/helpers/auth.ts` (novo), `e2e/smoke.spec.ts` (novo)
**Verify:** `npm run test:e2e -- smoke.spec.ts`
**Done When:** o smoke spec passa contra um Postgres local rodando (`docker-compose up -d`),
sem tocar o banco de dev.

**Replanning triggers:**
- Se não houver Postgres local disponível pra rodar um schema `_e2e` (ambiente CI-less, só
  produção) → replanejar pra um banco efêmero (ex. Testcontainers) antes de prosseguir.

---

### Fase 3: E2E — Autenticação e guarda de rotas
**Objetivo:** golden path de login/logout + redirecionamento de rota protegida.

**Passos:**
1. `e2e/auth.spec.ts`: login com credenciais válidas → chega na home; login com senha errada →
   mensagem de erro (flash); acessar `/activities` deslogado → redireciona pra `/login`; logout →
   volta a exigir login.

**Files Touched:** `e2e/auth.spec.ts` (novo)
**Verify:** `npm run test:e2e -- auth.spec.ts`
**Done When:** os 4 cenários acima passam.

---

### Fase 4: E2E — Categorias (CRUD + exclusão bloqueada)
**Objetivo:** golden path de categorias, incluindo a regra de negócio 5/7 (bloqueio de exclusão).

**Passos:**
1. `e2e/categories.spec.ts`: criar categoria → aparece na listagem; editar → reflete a mudança;
   criar categoria com valor numérico habilitado (`possuiValor`); tentar excluir categoria com
   atividade vinculada → bloqueada com mensagem; excluir categoria sem vínculo → some da lista.

**Files Touched:** `e2e/categories.spec.ts` (novo)
**Verify:** `npm run test:e2e -- categories.spec.ts`
**Done When:** os cenários acima passam, cada um limpando o próprio estado (não depende de ordem
entre specs).

---

### Fase 5: E2E — Atividades (CRUD + modal de detalhes + em andamento)
**Objetivo:** golden path de atividades, incluindo o modal de detalhes e "finalizar com detalhes"
(features desta sessão).

**Passos:**
1. `e2e/activities.spec.ts`: registrar atividade → aparece na listagem compacta (sem
   valor/descrição visíveis no card); clicar no item (não em editar/excluir) → abre o modal com
   nome/categoria/data/descrição/valor (valor por último); `Escape` fecha e devolve o foco;
   iniciar atividade em andamento → badge "em andamento"; finalizar com detalhes (descrição +
   valor) → grava e aparece corretamente no modal.

**Files Touched:** `e2e/activities.spec.ts` (novo)
**Verify:** `npm run test:e2e -- activities.spec.ts`
**Done When:** os cenários acima passam nos dois temas não é necessário (E2E funcional, não
visual) — só o tema padrão (claro).

---

### Fase 6: E2E — Relatórios e tema
**Objetivo:** golden path de relatórios (regra 7: período padrão = mês corrente) e persistência do
cookie de tema.

**Passos:**
1. `e2e/reports.spec.ts`: acessar `/reports` sem filtro → mostra o mês corrente; aplicar filtro de
   período → recalcula dias/horas/categoria.
2. `e2e/theme.spec.ts`: alternar sol/lua → `<html data-theme="dark">` aplicado e persiste após
   reload (cookie `theme`).

**Files Touched:** `e2e/reports.spec.ts` (novo), `e2e/theme.spec.ts` (novo)
**Verify:** `npm run test:e2e -- reports.spec.ts theme.spec.ts`
**Done When:** os cenários acima passam.

---

### Fase 7: Wiring final
**Objetivo:** deixar a suíte E2E documentada e fácil de rodar por qualquer um, sem se misturar ao
`npm test` (Vitest).

**Passos:**
1. `CLAUDE.md`: documentar `npm run test:e2e` (pré-requisito: `docker-compose up -d` + `.env.test`
   configurado) ao lado de `npm test`/`npm run lint` na seção de Stack.
2. Confirmar que `vitest.config.ts` (`include: ['tests/**/*.test.ts']`) não pega os arquivos de
   `e2e/*.spec.ts` e que `playwright.config.ts` não pega `tests/*.test.ts` — rodar os dois
   comandos e checar que cada um só reporta os arquivos do seu próprio diretório.

**Files Touched:** `CLAUDE.md`
**Verify:** `npm test && npm run test:e2e`
**Done When:** os dois comandos rodam de forma independente, sem overlap de arquivos.

## Dependências e suposições

- Assume Postgres local via `docker-compose.yml` disponível pra rodar o schema `_e2e` (ver
  replanning trigger da Fase 2).
- Cada fase em branch própria, sem merge automático (convenção já estabelecida nesta sessão).
- Fases 3-6 (specs E2E) são independentes entre si depois que a Fase 2 (setup) existir — podem ser
  reordenadas ou paralelizadas se preferir, mas cada uma assume que a anterior já validou a
  infraestrutura básica.

## Notas

- Migração dos 14 arquivos de teste unitário restantes pra Dado/Quando/Então fica em aberto,
  arquivo por arquivo, conforme forem tocados por outros motivos — não uma tarefa própria deste
  plano (evita rewrite mecânico de baixo valor).
- Se no futuro fizer sentido formalizar em Gherkin/Cucumber de verdade (arquivos `.feature` lidos
  por não-devs), isso é um plano novo, não uma extensão deste — decisão consciente de não introduzir
  esse runner agora.
