# Plan: Unificar o nome do app pra "Sketch your time"

**Date:** 2026-07-28
**Status:** Fases 1-2 concluídas, cada uma em branch própria
(`chore/rename-sketch-your-time-app`, `docs/rename-sketch-your-time-docs`) — build/testes/lint
verdes e nenhuma menção a "Medidor" restando fora de `node_modules`/`dist`/planos históricos.
Fase 3 (opcional, kit de design de referência) não iniciada — depende de pedido explícito, ver
Fase 3 abaixo. Branches aguardando decisão de merge.

## Goal

Hoje o nome do produto está em dois estados diferentes: as páginas públicas de marketing
(`layouts/marketing.ejs`, `partials/meta-tags.ejs`, chaves `marketing.*` de i18n) já foram
renomeadas pra "Sketch your time" numa sessão anterior; o app interno (pós-login) e a
documentação do repo ainda dizem "Medidor de Eficiência". Esta rodada unifica tudo pra
"Sketch your time".

## Levantamento (estado atual, antes de planejar)

Grep por `Medidor de Efici|>Medidor<|Sketch your time|>Sketch<` no repo (fora `node_modules`/`dist`):

**Já corretos ("Sketch your time"/"Sketch"), não mexer:**
- `src/views/layouts/marketing.ejs` (title + brand curto "Sketch")
- `src/views/partials/meta-tags.ejs` (`siteName`)
- `src/i18n/{pt-BR,en-US}.json` — `marketing.metaDescription`, `marketing.footer.copyright`

**Ainda "Medidor de Eficiência"/"Medidor" — precisam mudar:**
- `src/views/layouts/auth.ejs:6` — `<title>`
- `src/views/layouts/main.ejs:6` — `<title>`; `main.ejs:16` — texto do link da marca ("Medidor")
- `src/i18n/pt-BR.json:3,5` / `en-US.json:3,5` — `auth.login.metaDescription`,
  `auth.forgotPassword.metaDescription`
- `src/server.ts:20` — log de inicialização no terminal
- `src/services/EmailService.ts:44` — assunto do e-mail de redefinição de senha (vai pra caixa de
  entrada de usuários reais)
- `README.md:1` — título do arquivo
- `CLAUDE.md:1` — título do arquivo
- `docs/google-oauth-setup.md:36` — nome de exemplo sugerido pro OAuth client

**Fora de escopo (não são "menções do nome" no sentido pedido — são identificadores técnicos,
mudar traz risco desproporcional ao pedido):**
- `package.json`/`package-lock.json` (`"name": "medidor-de-eficiencia"`) — slug interno do pacote
  npm. Não referenciado em `railway.json` nem em nenhum script/CI por essa string, então tecnicamente
  seria uma troca simples — mas o diretório do repo e (presumivelmente) o remote git continuam se
  chamando `medidor-de-eficiencia`; trocar só o `package.json` criaria uma inconsistência nova
  (slug ≠ nome da pasta/repo) sem resolver a underlying. Decisão: **perguntar ao usuário** antes de
  tocar (ver pergunta abaixo), não incluído nas fases por padrão.
- `.env`/`.env.example` (`DATABASE_URL=...medidor_eficiencia...`) — nome do banco Postgres **real**,
  já com dados de dev. Renomear exigiria uma operação de infraestrutura (`ALTER DATABASE` ou nova
  connection string), não uma troca de texto. Fora de escopo — não tocar.
- `docs/design/kit-ui/{SKILL.md,readme.md}` — cópia de referência do kit de design original
  ("só para consulta", conforme `CLAUDE.md`), não é código do app rodando. Baixo valor/risco de
  desatualizar a cópia de origem sem necessidade — deixado de fora, mas listado como opcional
  (Fase 3) caso o usuário quEira consistência total mesmo em docs de referência.
- `.claude/plans/*.md` já existentes (ex.: `seo-meta-tags-2026-07-27.md`, que documenta a decisão
  histórica de reaproveitar o literal "Medidor de Eficiência" no `<title>` — decisão válida *na
  época*) — planos são registro histórico, não reescrever pra bater com o estado atual.

## Escopo

### Dentro do escopo
- `<title>` e texto de marca nos dois layouts internos (`auth.ejs`, `main.ejs`).
- As duas chaves de i18n de meta description que ainda citam o nome antigo (pt-BR e en-US).
- Log de boot do servidor (`server.ts`).
- Assunto do e-mail de redefinição de senha (`EmailService.ts`) — o único lugar onde o nome antigo
  chega a um usuário real fora da UI.
- Título de `README.md` e `CLAUDE.md`.
- Nome de exemplo sugerido em `docs/google-oauth-setup.md`.

### Fora do escopo
- `package.json`/`package-lock.json` (nome do pacote npm) — decisão do usuário, ver pergunta.
- Nome do banco de dados (`.env`/`.env.example`).
- Nome da pasta do repositório / remote git.
- `docs/design/kit-ui/*` (cópia de referência) — opcional, Fase 3.
- Reescrever `.claude/plans/*.md` já existentes.

## Fases

### Fase 1: App em execução (views, i18n, log de boot, e-mail)
**Objetivo:** nenhum texto que um usuário real vê (ou recebe por e-mail) ainda diz "Medidor de
Eficiência"/"Medidor".

**Passos:**
1. `src/views/layouts/auth.ejs`: `<title>` → `Sketch your time`.
2. `src/views/layouts/main.ejs`: `<title>` → `Sketch your time`; link da marca (linha 16) →
   `Sketch` (mesmo padrão curto já usado em `marketing.ejs`, por espaço no topbar).
3. `src/i18n/pt-BR.json`/`en-US.json`: `auth.login.metaDescription` e
   `auth.forgotPassword.metaDescription` trocam "Medidor de Eficiência" por "Sketch your time"
   (mantendo o resto da frase).
4. `src/server.ts:20`: mensagem de boot → `✅ Sketch your time rodando em ...`.
5. `src/services/EmailService.ts:44`: assunto do e-mail → `Redefinição de senha — Sketch your time`.

**Files Touched:** `src/views/layouts/auth.ejs`, `src/views/layouts/main.ejs`,
`src/i18n/pt-BR.json`, `src/i18n/en-US.json`, `src/server.ts`, `src/services/EmailService.ts`
**Verify:** `npm run build && npm test && npm run lint`; conferir paridade de chaves i18n (script
Node já usado nesta sessão: comparar `Object.keys()` ordenados dos dois JSON); `npm run dev` +
`curl -s localhost:3000/login | grep -i "<title>\|Sketch\|Medidor"` — não deve sobrar "Medidor".
**Done When:** grep por `Medidor` em `src/` não retorna nada fora de `node_modules`/`dist`; suíte de
testes verde (confirmado por grep prévio: nenhum teste hoje faz assert literal em "Medidor", então
nenhum teste precisa mudar nesta fase).

---

### Fase 2: Documentação do repositório
**Objetivo:** `README.md`/`CLAUDE.md`/docs de setup não confundem quem lê com o nome antigo.

**Passos:**
1. `README.md`: título do arquivo → `# ⏱ Sketch your time — MVP`.
2. `CLAUDE.md`: título do arquivo → `# CLAUDE.md — Sketch your time`.
3. `docs/google-oauth-setup.md`: nome de exemplo sugerido → `Sketch your time - Web`.

**Files Touched:** `README.md`, `CLAUDE.md`, `docs/google-oauth-setup.md`
**Verify:** grep por `Medidor` nesses 3 arquivos não retorna nada.
**Done When:** os 3 arquivos consistentes com o nome novo.

---

### Fase 3 (opcional): Cópia de referência do kit de design
**Objetivo:** só se o usuário quiser consistência total mesmo em material de referência que não
roda no app.

**Passos:** `docs/design/kit-ui/SKILL.md` e `readme.md` — trocar "Medidor de Eficiencia"/"Medidor de
Eficiência" por "Sketch your time" nas descrições.

**Files Touched:** `docs/design/kit-ui/SKILL.md`, `docs/design/kit-ui/readme.md`
**Verify:** leitura manual (são arquivos de documentação, não afetam build/testes).
**Done When:** usuário confirma que quer essa fase feita (não faz sentido rodar sem essa
confirmação, dado que é opcional por definição).

## Dependências e suposições

- Assume que "Sketch your time" (não "Sketch", nem outra variação) é o nome completo canônico —
  já usado assim em `marketing.ejs`/`meta-tags.ejs` desde a rodada anterior de SEO/landing. "Sketch"
  sozinho é só a forma curta de marca (logo/topbar), não o nome completo.
- Cada fase em branch própria, sem merge automático (convenção já estabelecida nesta sessão).

## Notas

- Pergunta em aberto pro usuário: renomear também `package.json`/`package-lock.json`
  (`"name": "medidor-de-eficiencia"`) nesta rodada? Tecnicamente seguro (nada mais no repo
  referencia essa string), mas a pasta do projeto e o repo git continuam com o nome antigo —
  decisão do usuário, não assumida por padrão.
