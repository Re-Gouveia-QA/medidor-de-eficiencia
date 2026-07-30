# Plan: Corrige botões do topbar cortados em telas mobile estreitas

**Date:** 2026-07-30
**Status:** concluído em `fix/topbar-overflow-mobile` (não mesclado — merge só mediante pedido
explícito). Sem overflow horizontal confirmado em 320/360/375px após o fix real (mesma medição
`document.body.scrollWidth`/`clientWidth` usada na investigação). Build, 137/137 testes e lint
verdes.

## Goal

Impedir que os ícones do topbar autenticado (`.topbar-actions`, usado em todas as páginas internas
via `main.ejs`) sejam empurrados pra fora da viewport em telas mobile estreitas, cortando o último
botão (geralmente o de logout).

## Root cause (já encontrado e validado empiricamente via CDP, sem precisar do agente `tracer`)

`public/css/styles.css:18`: `.topbar-actions { display: flex; align-items: center; gap: 16px; }` —
sem nenhum ajuste pra mobile. Isso é usado tanto por `main.ejs` (páginas internas: até 4 ícones —
docs [só admin], idioma, tema, logout) quanto por `marketing.ejs`, mas **só o topbar de marketing**
já tinha um ajuste mobile (`styles.css:727-729`, `@media max-width: 560px`, reduz gap pra 8px e
esconde um botão secundário). O topbar autenticado nunca recebeu o equivalente.

Reproduzido ao vivo (Chrome headless + CDP, emulação de dispositivo, login como `demo@medidor.dev`
— usuário admin, portanto o cenário de 4 botões): em `/activities` a 320px de largura (iPhone SE /
Android compacto — a faixa mais estreita realista hoje), `.topbar-actions` mede 216px (4×42px +
3×16px de gap) e não cabe ao lado da marca "Sketch" (~93px) dentro dos 320px - 32px de padding
disponíveis. Resultado medido: `document.body.scrollWidth (340px) > document.body.clientWidth
(320px)`, e o botão de logout (o mais à direita, `.btn-danger`) fica com metade fora da tela —
confirmado visualmente (captura de tela em anexo à investigação, não commitada).

**Fix candidato validado empiricamente antes de tocar no arquivo** (injeção de `<style>` via CDP
na página já rodando, sem editar CSS ainda): reduzir `.topbar-actions { gap }` pra 8px nessa mesma
media query já existente (mesmo valor já usado por `.marketing-topbar .topbar-actions`) resolve o
overflow em 320px, 360px e 375px (`hasHorizontalOverflow: false` nos três, medido via
`document.body.scrollWidth`) — sem precisar de `flex-wrap` como rede de segurança adicional (testado
e funciona, mas o `gap: 8px` sozinho já é suficiente pra faixa realista de larguras de tela hoje;
`flex-wrap` ficaria como opção se um 5º botão for adicionado no futuro e o gap sozinho não bastar
mais — não implementar preventivamente sem necessidade real).

## Scope

### In-Scope
- `.topbar-actions { gap: 8px; }` dentro do `@media (max-width: 560px)` já existente em
  `styles.css` (mesmo breakpoint usado por todo o resto do ajuste mobile do arquivo) — regra geral,
  não escopada só a `.marketing-topbar`, cobrindo também o topbar autenticado de `main.ejs`.

### Out-of-Scope
- Auditoria geral de todos os breakpoints/elementos do app em busca de outros possíveis cortes —
  fora do que foi concretamente encontrado e reproduzido nesta investigação; revisitar só se um
  outro caso específico for reportado.
- `flex-wrap` como rede de segurança adicional — testado e funcional, mas não necessário pra
  resolver o caso real reproduzido; não adicionar complexidade especulativa sem um 5º botão real
  que volte a estourar o espaço.

## Phases

### Phase 1: Reduz gap do topbar-actions em mobile
**Objetivo:** os 3-4 ícones do topbar cabem numa linha só ao lado da marca em qualquer largura de
tela mobile realista, sem cortar nenhum.

**Steps:**
1. `public/css/styles.css`, dentro do bloco `@media (max-width: 560px)` (linha ~707), adicionar
   `.topbar-actions { gap: 8px; }` — antes da regra mais específica `.marketing-topbar
   .topbar-actions { gap: 8px; }` já existente (mesmo valor, sem conflito; a específica continua
   redundante mas inofensiva pra marketing, e a nova regra geral passa a cobrir `main.ejs` também).

**Files Touched:** `public/css/styles.css`
**Verify:** `npm run dev` + Chrome DevTools/CDP com emulação de dispositivo em 320px/360px/375px,
logado em `/activities` — checar `document.body.scrollWidth <= document.body.clientWidth` (sem
overflow horizontal) e captura visual confirmando os 4 ícones do topbar totalmente visíveis.
**Done When:** nenhum overflow horizontal medido nas 3 larguras testadas, e captura visual confirma
os botões (incluindo o de logout) inteiramente dentro da viewport.
**Time:** 15min

**Replanning triggers:**
- Se um botão adicional for adicionado ao topbar autenticado no futuro e `gap: 8px` sozinho não for
  mais suficiente pra caber em 320px — nesse caso, reavaliar `flex-wrap` como solução estrutural.

## Dependências e suposições

- Assume que 320px é a largura mínima realista a suportar (iPhone SE 1ª/2ª geração, Android
  compacto) — não há indicação de suporte a telas ainda mais estreitas no projeto.

## Notes

- Achado à parte descartado como não-bug: o CTA "Criar conta" do topbar da landing page (`/`) foi
  a suspeita inicial (citada pelo usuário como exemplo), mas a inspeção visual + `getBoundingClientRect()`
  mostrou que **esse botão específico já está corretamente posicionado**, com margem adequada em
  320px/375px — o `.marketing-topbar` já tinha seu próprio ajuste mobile (gap 8px, botão secundário
  escondido). O bug real estava no topbar **autenticado** (`main.ejs`), não no de marketing.
