# Plan: Refino visual — leitura, bordas e micro-interações

**Date:** 2026-07-23
**Status:** concluído — Fases 1-4 implementadas cada uma em branch própria (`ui/legibilidade-tipografica`, `ui/refino-bordas`, `ui/micro-interacoes`, `ui/espacamento`) e mescladas em `master`; Fase 5 (validação cruzada) executada durante o merge: build/testes/lint verdes (104/104), screenshots claro/escuro de `/login`, `/categories`, `/activities`, `/reports` sem regressão visual. Safari/iOS não testado manualmente (sem dispositivo disponível nesta sessão) — mecanismo do filtro (`url(#id)` real no HTML, não data-URI) não foi tocado pelas Fases 3/4, só o `scale` na Fase 2, então o fix permanece estruturalmente intacto.

## Goal

Refinar o design system "Caderno de Esboço" existente (não substituí-lo): texto mais legível, bordas mais elegantes, mais micro-interações de animação, e uma sensação geral "menos barulhenta" (minimalismo-lite) — mantendo a identidade de caderno desenhado à mão (fontes manuscritas, bordas onduladas via filtro SVG).

## Escopo

### Dentro do escopo
- Tipografia: ajustes de `line-height`, espaçamento entre linhas/parágrafos, tamanhos dentro da escala de tokens já existente (`--text-*` em `tokens.css`) para melhorar legibilidade — sem trocar as fontes (`Patrick Hand`/`Architects Daughter`/`Kalam` continuam).
- Bordas: refinar o filtro de turbulência SVG (`partials/svg-filters.ejs`, atualmente `scale: 7`), `--border-w`, e os tokens de `--radius-*` pra uma linha à mão mais elegante/menos "ruidosa".
- Animações: reaproveitar `@keyframes sketch-in` (definido em `tokens.css`, **não usado em nenhum lugar hoje** — achado durante o levantamento) para entrada de cards/itens de lista; revisar amplitude/duração do tremor de hover (`sketch-wobble`, `--tilt: -1deg`) pra algo mais sutil; adicionar feedback de micro-interação (estado `:active` em botões, entrada de flash messages).
- Espaçamento: revisão de `padding`/`gap` em `.card`, `.field`, `.badge-row` etc. pra uma sensação menos densa (minimalismo-lite).

### Fora do escopo
- Trocar as fontes manuscritas por uma fonte sans-serif convencional — mudaria a identidade visual do produto (o usuário confirmou: refinar o esboço atual, não pivotar pra um visual flat).
- Remover o filtro de bordas onduladas (`sketch-rough-edge`) por completo.
- Redesenho estrutural de componentes (o kit-ui de referência em `docs/design/kit-ui/`) — isso é refino, não reconstrução.
- Repaleta de cores (tokens `oklch` de acento) — não foi pedido, escopo separado se necessário.

## Fases

### Fase 1: Legibilidade tipográfica
**Objetivo:** texto mais fácil de ler sem trocar a identidade tipográfica.

**Passos:**
1. Revisar `line-height` (já `1.5` no `body` via `reset.css`) para títulos/labels/badges — hoje sem `line-height` explícito em `h1-h4`/`.field-label`/`.badge`, herdam do body; avaliar se precisam de um valor próprio.
2. Revisar `letter-spacing: 0.03em` em `strong, b` (`components.css:19`) — confirmar se ajuda ou atrapalha a leitura da fonte manuscrita.
3. Conferir contraste de `--ink-soft` sobre `--paper`/`--surface` nos dois temas (`tokens.css`) — usado em texto secundário (`.muted`, `.field-label`, `.field-helper`).

**Files Touched:** `public/css/tokens.css`, `public/css/components.css`
**Verify:** `npm run dev` + captura de tela (Chrome headless, mesma técnica já usada nesta sessão) comparando antes/depois em `/activities` e `/reports`; checagem de contraste (ex.: DevTools ou script simples de contraste WCAG).
**Done When:** texto de corpo e secundário legível nas duas telas, sem regressão de contraste (mínimo AA) em nenhum dos dois temas.

---

### Fase 2: Refino das bordas à mão
**Objetivo:** bordas onduladas mais elegantes, menos "carregadas".

**Passos:**
1. Testar variações de `feTurbulence`/`feDisplacementMap` em `#sketch-rough-edge` (`src/views/partials/svg-filters.ejs`, hoje `baseFrequency="0.018 0.05" numOctaves="2" seed="7"` → `scale="7"`) — sem aplicar direto, gerar comparação visual antes (mesma técnica da sessão anterior: screenshot headless Chrome ou Artifact side-by-side) já que "elegante" é subjetivo e o valor atual (`scale: 7`) foi calibrado deliberadamente contra a supressão visual do `border-radius`.
2. Revisar `--border-w` (`2.5px`) e o `inset: -3px` do `.sketch-edge::before` — avaliar uma borda ligeiramente mais fina/discreta.
3. Revisar os tokens `--radius-blob`/`--radius-sm`/`--radius-pill` para formas menos assimétricas, se for essa a direção de "elegante".

**Files Touched:** `src/views/partials/svg-filters.ejs`, `public/css/tokens.css`
**Verify:** comparação visual (screenshot antes/depois, luz e escuro) antes de aplicar qualquer valor final — não aplicar às cegas.
**Done When:** usuário aprova um valor específico a partir da comparação (mesmo fluxo de "Teste e mostre antes" → "Implemente a X" já usado nesta sessão para o `scale`).

**Replanning triggers:**
- Se a mudança de bordas afetar legibilidade de ícones (`#sketch-rough-icon`, escala diferente) — reavaliar em conjunto.

---

### Fase 3: Micro-interações e animação
**Objetivo:** mais feedback de interação, mantendo sutileza.

**Passos:**
1. Aplicar `@keyframes sketch-in` (hoje morto no CSS) à entrada de cards/itens de lista em `activities/index.ejs`, `categories/index.ejs`, `reports/index.ejs` — com pequeno stagger entre itens, se viável só em CSS (`animation-delay` via `nth-child`) sem JS novo.
2. Revisar amplitude (`--tilt: -1deg`) e duração (`0.5s`) do `sketch-wobble` para algo mais sutil, se for essa a direção.
3. Adicionar feedback de `:active` (pressionado) em `.btn`/`.icon-btn` — hoje só há estado de hover/focus.
4. Confirmar que `prefers-reduced-motion: reduce` desativa/reduz as animações novas e existentes (checar se já existe essa media query em `tokens.css`/`reset.css` — se não existir, é requisito de acessibilidade a adicionar aqui, dado que este é o momento em que animação está sendo expandida).

**Files Touched:** `public/css/tokens.css`, `public/css/components.css`, `src/views/activities/index.ejs`, `src/views/categories/index.ejs`, `src/views/reports/index.ejs`
**Verify:** `npm run dev`, checagem manual nas páginas de listagem (entrada, hover, clique) + emulação de `prefers-reduced-motion: reduce` no DevTools.
**Done When:** animações de entrada/hover/clique visíveis e sutis; `prefers-reduced-motion` respeitado.

---

### Fase 4: Espaçamento (minimalismo-lite)
**Objetivo:** sensação menos densa/carregada, sem virar um layout flat genérico.

**Passos:**
1. Revisar `padding` de `.card` (hoje `22px`), `gap` de `.card-footer`/`.badge-row`/`.field` — mais "respiro" onde fizer sentido.
2. Levantar elementos visuais redundantes nas páginas principais (`home/index.ejs`, `activities/index.ejs`, `categories/index.ejs`) — bordas/badges/ícones duplicados ou desnecessários.

**Files Touched:** `public/css/components.css`, possivelmente `src/views/home/index.ejs`, `src/views/activities/index.ejs`, `src/views/categories/index.ejs`
**Verify:** comparação visual antes/depois nas páginas revisadas.
**Done When:** usuário aprova a sensação de espaçamento nas páginas-chave.

---

### Fase 5: Validação cruzada
**Objetivo:** garantir que o refino não regrediu nada já corrigido nesta sessão (Safari, tema escuro, acessibilidade).

**Passos:**
1. Reconferir o fix de filtro SVG via `url(#id)` (não voltar a data-URI) em qualquer ajuste do Fase 2.
2. Reconferir tema escuro contra todos os tokens alterados.
3. Reconferir contraste, `prefers-reduced-motion`, e `outline`/`focus-visible` (ajustes de acessibilidade já feitos anteriormente) continuam intactos.

**Files Touched:** nenhum (validação)
**Verify:** screenshots Chrome headless (claro/escuro), teste manual em Safari/iOS se disponível, checagem de acessibilidade (contraste, motion, foco).
**Done When:** nenhuma regressão encontrada frente ao estado atual committado.

## Dependências e suposições

- Fases 2 e 3 (bordas, tremor) tocam valores já calibrados deliberadamente e documentados no `CLAUDE.md` (`scale: 7`, `--tilt: -1deg`) — mudá-los aqui é intencional, pedido explicitamente pelo usuário nesta rodada; `CLAUDE.md` deve ser atualizado com os novos valores ao final (mesmo padrão das atualizações anteriores).
- Assume que "minimalismo" = refinar o esboço atual (confirmado pelo usuário) — não pivotar pra um visual flat/convencional.

## Estado atual

Nenhuma fase iniciada. Levantamento inicial já feito: `@keyframes sketch-in` existe mas está morto (não referenciado em nenhuma classe usada), é o hook mais barato pra Fase 3.

## Notas

- Fases 2 e 3 (bordas, animação) devem seguir o padrão já validado nesta sessão: gerar comparação visual (screenshot Chrome headless ou Artifact) **antes** de aplicar qualquer valor final, não ajustar às cegas — foi assim que o `scale: 7` das bordas foi decidido da última vez.
- Ao final, atualizar `CLAUDE.md` (seção de identidade visual) com os novos valores e o motivo da mudança, seguindo a convenção já estabelecida no arquivo.
