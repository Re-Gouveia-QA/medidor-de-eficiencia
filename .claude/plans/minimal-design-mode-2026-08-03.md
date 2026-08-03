# Plan: Modo de design minimalista (alternativa ao "Caderno de Esboço", habilitada por default)

**Date:** 2026-08-03
**Status:** Fases 0-1 concluídas (commits `3316e21`, `cf8617d`, `05b2ffa`, branch `feature/minimal-design-mode`) — direção "Grade" escolhida via comparação em Artifact (Big Shoulders Text, geometria quase reta, borda fina). **Escopo corrigido em 2026-08-03: o toggle é exclusivo das páginas internas autenticadas — Fase 2 (auth + landing pública) cancelada, ver seção Scope.** Fase 3 (renumerada, ver abaixo) pendente.

## Goal

Adicionar um segundo modo visual — minimalista, sem os efeitos de "traço à mão" — alternável pelo usuário (mesmo padrão do toggle de tema claro/escuro), com o minimalista sendo o estado **padrão** para qualquer sessão sem cookie definido (ou seja, todo usuário atual, já que o cookie ainda não existe).

## Scope

### In-Scope
- Novo cookie/atributo de "modo de design" (`design`: `sketch` | `minimal`), lido no servidor e aplicado em `<html>`, espelhando exatamente o mecanismo já existente do cookie `theme` (`src/app.ts`, `readThemeCookie`).
- Default (cookie ausente) = `minimal`. Isso cobre todos os usuários existentes automaticamente — não requer migração de dados, é só a ausência do cookie sendo interpretada como minimalista em vez de sketch.
- Botão de alternância no topbar autenticado (`layouts/main.ejs`), mesmo padrão visual/JS dos toggles de tema/idioma já existentes.
- Um novo arquivo CSS aditivo (`public/css/minimal.css`), carregado depois de `styles.css` nos dois layouts, com todas as regras escopadas por `html:not([data-design="sketch"])` — ou seja, **nenhuma regra existente em `tokens.css`/`components.css`/`styles.css` é removida ou reescrita**, só neutralizada condicionalmente quando não em modo sketch.
- Neutralização especificamente de: bordas/preenchimento "à mão" (`.sketch-edge::before`, filtro SVG `feDisplacementMap`), animação de tremor no hover (`.sketch-wobble`), entrada animada escalonada (`.sketch-in`), textura de grade de caderno no `body`, distorção "rabiscada" dos ícones (filtro inline `url(#sketch-rough-icon)`, via `!important` — é `style=""` inline, precisa dessa especificidade pra vencer), fontes decorativas (Handlee/Architects Daughter/Kalam) e a geometria orgânica dos tokens de raio (`--radius-blob` etc.) — trocando por uma tipografia/geometria limpa a decidir na Fase 0 (ver Notas).
- Cobertura visual de todas as páginas autenticadas internas (home nos dois estados, atividades, categorias, relatórios) — `currentUser` truthy em `layouts/main.ejs`.
- Atualização da seção "Identidade visual" do `CLAUDE.md` documentando o novo modo/default.

### Out-of-Scope
- **Páginas de auth (login/registro/recuperação de senha, `layouts/auth.ejs`) e a landing pública (`layouts/marketing.ejs`) — decisão explícita do usuário (2026-08-03): o toggle é só pras páginas internas autenticadas.** Essas páginas permanecem sempre no design "Caderno de Esboço" original, independente do cookie `design` — `layouts/auth.ejs` nunca leu/lê o cookie, e `layouts/main.ejs` só linka `minimal.css`/renderiza o atributo `data-design` quando `currentUser` existe. (A Fase 2 original deste plano cobria essas páginas — cancelada; ver Fase 2 abaixo.)
- Trocar a paleta de cores (`--paper`/`--ink`/`--accent-*`) — o minimalista reaproveita os mesmos tokens oklch já testados nos dois temas; só a geometria/tipografia/efeitos mudam. Se o usuário quiser uma paleta neutra separada depois, é um pedido novo.
- `/docs` (Swagger admin) — já tem CSP/estilo próprios, fora do design system.
- Qualquer novo controle de admin para forçar o modo de outros usuários (isso é por sessão/cookie do próprio visitante, igual tema/idioma).
- Remover o modo sketch do código (ele continua existindo, só deixa de ser o default).

## Phases

### Phase 0: Infraestrutura do toggle + validação numa página só

**Objective:** Provar o mecanismo (cookie → atributo → CSS condicional) numa superfície pequena antes de propagar pro resto do app — é a página mais complexa (2 variantes: card "ao vivo" e formulário de início) e a mais testada nesta sessão.

**Steps:**
1. Produzir um Artifact comparando 2-3 direções minimalistas lado a lado (tipografia — provavelmente stack nativo `-apple-system/Segoe UI/Roboto` sem novo webfont, já que "minimalista" pede sair do caminho em vez de escolher outra fonte decorativa; geometria de raio/borda; tratamento de sombra) e confirmar a direção com o usuário antes de aplicar amplamente — mesmo padrão já usado neste projeto para decisões de fonte/paleta (ver notas em `tokens.css`).
2. `src/app.ts`: adicionar `readDesignCookie(req)` (mesmo formato de `readThemeCookie`), default `'minimal'`; setar `res.locals.design`.
3. `src/views/layouts/main.ejs` e `src/views/layouts/auth.ejs`: renderizar `data-design="sketch"` em `<html>` quando aplicável (ausente = minimal), mesmo padrão de `data-theme="dark"`.
4. `src/views/layouts/main.ejs`: novo botão `#designToggle` no topbar (mesma classe-base `icon-btn sketch-edge sketch-hover btn-secondary` + par de ícones trocados por CSS, igual sol/lua).
5. `public/js/design-toggle.js` (novo): mesmo padrão de `theme-toggle.js` — troca atributo + grava cookie `design=sketch|minimal; path=/; max-age=31536000; samesite=lax`.
6. `public/css/minimal.css` (novo): regras de neutralização escopadas em `html:not([data-design="sketch"])`, aplicando a direção escolhida no passo 1.
7. `src/i18n/pt-BR.json` e `src/i18n/en-US.json`: nova chave de aria-label do botão (`layout.designToggleAriaLabel` ou similar).
8. `src/views/partials/icon.ejs`: adicionar os 2 paths de ícone do toggle (mesmo esquema de `sun`/`moon`, adicionados fora do catálogo original do kit).

**Files Touched:** `src/app.ts`, `src/views/layouts/main.ejs`, `src/views/layouts/auth.ejs`, `public/css/minimal.css` (novo), `public/js/design-toggle.js` (novo), `src/views/partials/icon.ejs`, `src/i18n/pt-BR.json`, `src/i18n/en-US.json`

**Verify:** `npm run build && npm test && npm run lint` + checagem visual via CDP em `/` nas 4 combinações (minimal/sketch × claro/escuro) — confirmar que uma sessão sem cookie nenhum renderiza minimal.

**Done When:** as 4 combinações renderizam corretamente na home (card "ao vivo" E formulário de início), build/test/lint verdes, sessão sem cookie = minimal.

**Time:** ~3h

**Replanning triggers:**
- Gate de prototipagem: se a abordagem (override condicional num arquivo CSS só, sem tocar nos 3 arquivos existentes) expuser >3 pontos de atrito reais (ex.: cascata/especificidade não fecha em algum componente, filtro do ícone precisa de mais que `!important`) ou exigir >2 gambiarras temporárias → parar, reavaliar vs. abordagem alternativa (ex.: inverter qual modo é o "base" no CSS) antes de continuar pras próximas fases.
- Se a direção do Artifact (passo 1) não for aprovada de primeira, iterar ali mesmo antes de tocar em código.

### Phase 1: Rollout visual — páginas autenticadas internas

**Objective:** Cobrir atividades, categorias e relatórios com o mesmo tratamento, corrigindo o que a base da Fase 0 não pegou (badges, modal de detalhe, toast de confirmação, gráfico de barras do relatório).

**Steps:**
1. Percorrer `/activities`, `/activities/new`, `/activities/:id/edit`, `/categories`, `/categories/new`, `/categories/:id/edit`, `/reports` em modo minimal (claro e escuro).
2. Ajustar `public/css/minimal.css` (só esse arquivo) para qualquer componente que ainda pareça "sketch" (ex.: `.badge::before` sombra de adesivo, `.activity-detail-modal-card`, `.confirm-toast`, barras de `.bars`/`.bar-fill`).

**Files Touched:** `public/css/minimal.css`

**Verify:** `npm run build && npm test && npm run lint` + CDP visual em todas as rotas listadas acima, modo minimal, claro e escuro.

**Done When:** nenhuma página autenticada mostra borda tremida/filtro rabiscado/animação de tremor em modo minimal; sketch continua idêntico ao atual quando selecionado explicitamente.

**Time:** ~2h

**Replanning triggers:**
- Se algum componente precisar de mudança estrutural no HTML (não só CSS) para ficar limpo em modo minimal → replanejar esse componente como sub-tarefa própria antes de seguir.

### Phase 2: ~~Auth pages + landing pública~~ — CANCELADA (2026-08-03)

Escopo original: estender o toggle pras páginas de auth (`layouts/auth.ejs`) e pra landing pública (`layouts/marketing.ejs`). O usuário decidiu explicitamente que a mudança é só pras páginas internas autenticadas — essas duas superfícies ficam de fora por completo, sempre no sketch original. Correção já aplicada (não fazia parte de nenhum commit anterior, então não há revert de código — só a reversão do `data-design`/`<link>` de `minimal.css` que tinham sido adicionados a `layouts/auth.ejs` na Fase 0, feita junto com esta atualização do plano):
- `src/views/layouts/main.ejs`: `<link rel="stylesheet" href="/css/minimal.css">` e o atributo `data-design` no `<html>` agora só renderizam quando `currentUser` existe — cobre tanto o app autenticado (queria) quanto exclui a landing pública (`layouts/marketing.ejs`, layout separado, nunca teve esses trechos) e o branch anônimo de fallback do próprio `main.ejs` (páginas de erro deslogadas).
- `src/views/layouts/auth.ejs`: revertido para o estado pré-Fase 0 (sem `data-design`, sem `<link>` de `minimal.css`).

**Files Touched:** `src/views/layouts/main.ejs`, `src/views/layouts/auth.ejs`

**Verify:** `npm run build && npm test && npm run lint` + CDP confirmando que `/login`, `/register` e a landing pública continuam sketch mesmo com o cookie `design=minimal` setado manualmente.

### Phase 3: Regressão final + documentação

**Objective:** Fechar o trabalho com confirmação formal de que (a) o default realmente mudou pra todo mundo e (b) sketch continua 100% funcional pra quem trocar de volta.

**Steps:**
1. Sessão totalmente limpa (sem nenhum cookie) → confirmar minimal em qualquer rota.
2. Alternar explicitamente pra sketch → comparar contra screenshots/estado já verificados nesta sessão (ex. o card de início rápido da home) pra garantir zero regressão pixel-a-pixel relevante.
3. Atualizar `CLAUDE.md`, seção "Identidade visual": documentar o novo cookie/atributo `design`, o default minimal, e onde vive o override (`public/css/minimal.css`), seguindo o mesmo estilo de nota já usado pra tema/idioma.

**Files Touched:** `CLAUDE.md`

**Verify:** `npm run build && npm test && npm run lint` completo; passe final de CDP cobrindo home + 1 página interna nos 4 combos (minimal/sketch × claro/escuro), mais confirmação de que `/login` e a landing pública nunca mudam (sempre sketch, mesmo com `design=minimal`/`design=sketch` setado manualmente).

**Done When:** os 137+ testes passam, lint limpo, checagem manual confirma default minimal + sketch preservado nas páginas internas, e auth/landing comprovadamente imunes ao cookie `design`.

**Time:** ~1h

## Dependencies & Assumptions

- **Assunção de design (a confirmar na Fase 0, passo 1):** minimalista reaproveita os tokens de cor atuais (oklch, paper/ink/accent-*) — só tipografia, raio/borda e efeitos mudam. Tipografia provável: stack nativo do sistema (sem novo import de Google Fonts), já que "sair do caminho" é o ponto do minimalismo aqui — diferente da diretriz geral de evitar fontes genéricas, que vale pro modo sketch/identidade principal, não pra um modo explicitamente pedido como minimalista.
- **Sem mudança de schema/banco** — tudo é cookie de sessão do navegador, mesmo mecanismo não-httpOnly de `theme`/`locale`/`tz`.
- **Sem novos testes automatizados** — o mecanismo de tema/idioma equivalente também não tem cobertura Vitest hoje (é camada de view/CSS); verificação é build/test/lint (regressão) + CDP visual manual, consistente com o resto desta sessão.
- Depende de nada externo — todo o trabalho é local ao repo.

## Notes

- Arquitetura escolhida (aditiva, um arquivo novo com seletor `:not([data-design="sketch"])`) em vez de inverter os 3 arquivos CSS existentes: motivo é reduzir a superfície de risco — `tokens.css`/`components.css`/`styles.css` continuam intocados, então o modo sketch (agora "legado" mas não removido) não corre risco de regressão por causa desta mudança.
- 20 dos 23 arquivos de view usam `.sketch-edge`/`.sketch-hover`/`.sketch-in`, mas como são só nomes de classe (não IDs nem estilos inline por elemento), a neutralização acontece inteira via CSS — nenhuma dessas 20 views precisa ser editada.
- Ícone usa `filter` como atributo `style=""` inline (alta especificidade) — override em `minimal.css` precisa de `!important`; é um caso legítimo (sobrescrever inline de fora, não brigar com a própria cascata), mesmo padrão já usado no bloco `prefers-reduced-motion` de `tokens.css`.
