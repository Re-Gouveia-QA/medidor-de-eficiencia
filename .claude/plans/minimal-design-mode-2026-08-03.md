# Plan: Modo de design minimalista (alternativa ao "Caderno de Esboço", habilitada por default)

**Date:** 2026-08-03
**Status:** Fase 0 concluída (commit `3316e21`, branch `feature/minimal-design-mode`) — direção "Grade" escolhida via comparação em Artifact (Big Shoulders Text, geometria quase reta, borda fina). Fases 1-3 pendentes.

## Goal

Adicionar um segundo modo visual — minimalista, sem os efeitos de "traço à mão" — alternável pelo usuário (mesmo padrão do toggle de tema claro/escuro), com o minimalista sendo o estado **padrão** para qualquer sessão sem cookie definido (ou seja, todo usuário atual, já que o cookie ainda não existe).

## Scope

### In-Scope
- Novo cookie/atributo de "modo de design" (`design`: `sketch` | `minimal`), lido no servidor e aplicado em `<html>`, espelhando exatamente o mecanismo já existente do cookie `theme` (`src/app.ts`, `readThemeCookie`).
- Default (cookie ausente) = `minimal`. Isso cobre todos os usuários existentes automaticamente — não requer migração de dados, é só a ausência do cookie sendo interpretada como minimalista em vez de sketch.
- Botão de alternância no topbar autenticado (`layouts/main.ejs`), mesmo padrão visual/JS dos toggles de tema/idioma já existentes.
- Um novo arquivo CSS aditivo (`public/css/minimal.css`), carregado depois de `styles.css` nos dois layouts, com todas as regras escopadas por `html:not([data-design="sketch"])` — ou seja, **nenhuma regra existente em `tokens.css`/`components.css`/`styles.css` é removida ou reescrita**, só neutralizada condicionalmente quando não em modo sketch.
- Neutralização especificamente de: bordas/preenchimento "à mão" (`.sketch-edge::before`, filtro SVG `feDisplacementMap`), animação de tremor no hover (`.sketch-wobble`), entrada animada escalonada (`.sketch-in`), textura de grade de caderno no `body`, distorção "rabiscada" dos ícones (filtro inline `url(#sketch-rough-icon)`, via `!important` — é `style=""` inline, precisa dessa especificidade pra vencer), fontes decorativas (Handlee/Architects Daughter/Kalam) e a geometria orgânica dos tokens de raio (`--radius-blob` etc.) — trocando por uma tipografia/geometria limpa a decidir na Fase 0 (ver Notas).
- Cobertura visual de todas as páginas autenticadas (home nos dois estados, atividades, categorias, relatórios), páginas de auth (login/registro/recuperação de senha) e a landing pública.
- Atualização da seção "Identidade visual" do `CLAUDE.md` documentando o novo modo/default.

### Out-of-Scope
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

### Phase 2: Auth pages + landing pública

**Objective:** Garantir que login/registro/recuperação de senha e a home pública (visitante não autenticado) também respeitam o modo escolhido — essas páginas usam `layouts/auth.ejs` (sem topbar/toggle, só leem o cookie) ou a landing dentro de `layouts/main.ejs`.

**Steps:**
1. Verificar `/login`, `/register`, `/forgot-password`, `/reset-password/:token` em minimal (claro/escuro).
2. Verificar a landing pública (`marketing/landing.ejs`, visitante deslogado) em minimal — provavelmente precisa de ajustes extras em `minimal.css` pros elementos só dela (hero, watermark, carrossel de post-its, `.marketing-feature`).
3. Confirmar que sketch mode (cookie setado manualmente) ainda renderiza essas mesmas páginas sem regressão.

**Files Touched:** `public/css/minimal.css`

**Verify:** `npm run build && npm test && npm run lint` + CDP visual nas rotas de auth e na landing, minimal e sketch, claro e escuro.

**Done When:** todas as páginas de auth + landing corretas em minimal; sketch sem regressão visual perceptível.

**Time:** ~1h30

### Phase 3: Regressão final + documentação

**Objective:** Fechar o trabalho com confirmação formal de que (a) o default realmente mudou pra todo mundo e (b) sketch continua 100% funcional pra quem trocar de volta.

**Steps:**
1. Sessão totalmente limpa (sem nenhum cookie) → confirmar minimal em qualquer rota.
2. Alternar explicitamente pra sketch → comparar contra screenshots/estado já verificados nesta sessão (ex. o card de início rápido da home) pra garantir zero regressão pixel-a-pixel relevante.
3. Atualizar `CLAUDE.md`, seção "Identidade visual": documentar o novo cookie/atributo `design`, o default minimal, e onde vive o override (`public/css/minimal.css`), seguindo o mesmo estilo de nota já usado pra tema/idioma.

**Files Touched:** `CLAUDE.md`

**Verify:** `npm run build && npm test && npm run lint` completo; passe final de CDP cobrindo pelo menos home + 1 página interna + 1 página de auth, nos 4 combos.

**Done When:** os 137+ testes passam, lint limpo, e a checagem manual confirma default minimal + sketch preservado.

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
