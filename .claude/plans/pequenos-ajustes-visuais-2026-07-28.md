# Plan: Pequenos ajustes visuais (cores, legibilidade, espaçamento)

**Date:** 2026-07-28
**Status:** concluído — Fases 1-6 implementadas, cada uma em branch própria (`style/paleta-sepia`,
`style/fonte-handlee`, `style/tamanho-fonte`, `style/links-login`,
`style/espacamento-relatorio`), mescladas sem conflito numa branch de integração
(`style/integracao-visual`) só pra validação cruzada da Fase 6 — nenhuma delas mesclada em
`master` ainda. Build/testes/lint verdes na integração; screenshot de `/`, `/login`, `/register`,
`/activities`, `/categories`, `/reports` (claro/escuro) sem regressão. `CLAUDE.md` atualizado com
os valores finais.

## Goal

Cinco ajustes visuais pontuais no app interno (não a landing page): paleta mais confortável para
a vista, links de login mais visíveis, uma fonte de corpo mais legível (mesmo estilo manuscrito),
parágrafos um pouco maiores, e espaçamento corrigido em `/reports`.

## Escopo

### Dentro do escopo
- Tokens de cor (`oklch()`) em `tokens.css` — ajuste de valores existentes, sem trocar o
  mecanismo de tema claro/escuro.
- Cor/peso/tratamento dos links em `/login` (e `/register`, `/forgot-password`, que reusam as
  mesmas classes `.auth-footer`/`.field-hint`).
- Troca da fonte de corpo (`--font-body`, hoje `Patrick Hand`) por outra fonte manuscrita/casual
  do Google Fonts mais legível em tamanho de texto corrido — mantendo `Architects Daughter`
  (`--font-display`) e `Kalam` (`--font-accent`) a menos que o usuário peça trocar todas.
- `--text-base`/`--text-sm` em `tokens.css` (escala de tamanho de fonte usada em parágrafos/corpo
  em todo o app).
- Espaçamento entre seções em `src/views/reports/index.ejs` (`<h2>` sem margem colunder contra os
  cards adjacentes — ver diagnóstico na Fase 5).

### Fora do escopo
- Landing page pública (`src/views/marketing/*`) — já teve rodada própria de ajustes nesta sessão.
- Repaleta completa/nova identidade de cor — isso é ajuste dos valores já existentes, não um
  redesign.
- Trocar `Architects Daughter`/`Kalam` ou o mecanismo de bordas à mão (`sketch-edge`) — fora do
  pedido.
- Animações/micro-interações — não foi pedido nesta rodada (já coberto por
  `ui-refinement-2026-07-23.md`, concluído).

## Diagnóstico já levantado (antes de planejar as fases)

- **Links do login:** `a { color: var(--accent-blue); }` é a única regra de cor pros links dentro
  de `.field-hint` (esqueci-minha-senha, `text-xs` 13px) e `.auth-footer` (criar conta,
  `text-sm` 15px) — o parágrafo ao redor é `--ink-soft`, mas o `<a>` em si sempre usa
  `--accent-blue` puro, sem peso/sublinhado extra. Em `/login` não há navbar nem `.card`
  ao redor — o link fica sozinho sobre o fundo quadriculado (`--paper` + grid), sem o contraste
  adicional que o `--surface` de um card daria em outras telas.
- **Espaçamento em `/reports`:** `h1, h2, h3, h4 { margin: 0; ... }` é reset global
  (`components.css:17`, usado propositalmente em `.card-title` etc.). Em
  `src/views/reports/index.ejs`, os dois `<h2>` de seção ("tempo por categoria" e "valor por
  categoria") herdam esse `margin: 0`. O card que envolve `.bars` (linha 44) não tem
  `margin-bottom` próprio, então o segundo `<h2>` ("valor por categoria", linha 61) fica colado
  na borda inferior desse card, sem respiro — diferente do primeiro `<h2>`, que tem espaço porque
  `.report-cards` (linha 205, em `styles.css`) já define `margin: 1rem 0 1.5rem`.

## Fases

### Fase 1: Paleta mais confortável para a vista
**Objetivo:** reduzir o "peso"/contraste agressivo da paleta atual sem descaracterizar o tema
"Caderno de Esboço".

**Passos:**
1. Gerar 2-3 variações candidatas dos tokens-base (`--paper`, `--ink`, `--surface`,
   `--surface-alt`) nos dois temas — ex.: `--paper` levemente menos claro/brilhante,
   `--ink` levemente menos que preto-puro — sem tocar nos 4 acentos (`--accent-*`) ainda.
2. Renderizar comparação visual lado a lado (Artifact HTML ou screenshots Chrome headless) em
   `/`, `/activities`, `/reports`, claro e escuro, igual ao padrão já usado nesta sessão para
   decisões subjetivas (ex.: `scale` do filtro de borda).
3. Aplicar somente a variação escolhida pelo usuário.

**Files Touched:** `public/css/tokens.css`
**Verify:** `npm run build && npm test && npm run lint` + screenshots claro/escuro de `/`,
`/activities`, `/reports`.
**Done When:** usuário aprova uma variação específica a partir da comparação.

**Replanning triggers:**
- Se a variação escolhida quebrar contraste mínimo AA em algum par texto/fundo já existente —
  reavaliar antes de aplicar.

---

### Fase 2: Fonte de corpo mais legível
**Objetivo:** trocar `--font-body` (`Patrick Hand`) por uma fonte do Google Fonts do mesmo estilo
manuscrito/casual, porém com leitura corrida mais fácil.

**Passos:**
1. Selecionar 3 candidatas (ex.: `Shantell Sans`, `Neucha`, `Handlee`) mantendo a família
   "manuscrito legível", não "letra de forma".
2. Comparação visual lado a lado (parágrafo de exemplo pt-BR, tamanho `--text-base` atual) nas 3
   candidatas + a atual, claro e escuro.
3. Trocar `@import` e `--font-body` em `tokens.css` pela escolhida; conferir métricas
   (`line-height` pode precisar de ajuste fino se a fonte nova for mais alta/baixa que Patrick
   Hand).

**Files Touched:** `public/css/tokens.css`
**Verify:** `npm run build && npm test && npm run lint` + screenshot de `/login`, `/activities`,
`/reports`, `/categories` (claro/escuro) confirmando que nenhum texto quebra layout (botões,
badges, campos).
**Done When:** usuário aprova a fonte a partir da comparação; nenhuma regressão visual nas
páginas verificadas.

**Replanning triggers:**
- Se a fonte escolhida não tiver os pesos/caracteres acentuados (áéíóú, ç) necessários pro pt-BR —
  descartar candidata.

---

### Fase 3: Aumentar fonte de parágrafos
**Objetivo:** parágrafos/corpo de texto um pouco maiores, mantendo a regra de nunca ficar abaixo
de 15px (`CLAUDE.md`).

**Passos:**
1. Aumentar `--text-base` (hoje 18px) em ~1-2px; avaliar se `--text-sm` (hoje 15px, o piso) também
   precisa subir 1px ou fica no piso.
2. Checar telas com texto mais denso (`/activities`, `/categories`, formulários) pra confirmar que
   nada quebra linha de forma feia ou estoura botões/badges de tamanho fixo.

**Files Touched:** `public/css/tokens.css`
**Verify:** `npm run build && npm test && npm run lint` + screenshot de `/activities`,
`/categories`, `/reports`, formulários de nova atividade/categoria.
**Done When:** parágrafos visivelmente maiores, sem overflow/quebra de layout em nenhuma página
verificada.

**Dependências:** depende da Fase 2 (a fonte final influencia o tamanho ideal).

---

### Fase 4: Visibilidade dos links de login
**Objetivo:** o link de "esqueci minha senha" e "criar conta" (`/login`, reusado em
`/register`/`/forgot-password`) ficarem claramente visíveis contra o fundo quadriculado.

**Passos:**
1. Com a paleta final da Fase 1 aplicada, reconferir contraste de `--accent-blue` sobre `--paper`
   nesses links.
2. Reforçar o tratamento visual do link nesses dois pontos especificamente (`.field-hint a`,
   `.auth-footer a`) — ex.: peso de fonte maior, sublinhado, ou uma cor de acento com mais
   contraste — sem alterar a cor global de `<a>` usada no resto do app (escopo pedido foi
   "página de login", não o sistema de link inteiro).
3. Comparação visual antes/depois (claro/escuro).

**Files Touched:** `public/css/components.css` (ou `styles.css`, onde `.field-hint`/`.auth-footer`
já estão definidos)
**Verify:** `npm run build && npm test && npm run lint` + screenshot de `/login`, `/register`,
`/forgot-password` (claro/escuro).
**Done When:** usuário aprova o tratamento a partir da comparação.

**Dependências:** depende da paleta final da Fase 1.

---

### Fase 5: Espaçamento em `/reports`
**Objetivo:** corrigir a falta de respiro entre o `<h2>` "valor por categoria" e o card anterior
(diagnóstico já confirmado acima).

**Passos:**
1. Adicionar espaçamento escopado aos `<h2>` de seção de `/reports` (ex.: classe
   `.report-section-heading` com `margin: 2rem 0 1rem`) — não alterar o reset global
   `h1,h2,h3,h4 { margin:0 }`, usado de propósito em `.card-title` e outros lugares.
2. Aplicar a classe nos dois `<h2>` de `src/views/reports/index.ejs` (linhas 40 e 61).
3. Reconferir espaçamento também acima do primeiro `<h2>` (hoje coberto pelo
   `margin-bottom` de `.report-cards`) pra manter consistência entre as duas seções.

**Files Touched:** `src/views/reports/index.ejs`, `public/css/styles.css`
**Verify:** `npm run build && npm test && npm run lint` + screenshot de `/reports` com e sem dados
(claro/escuro).
**Done When:** as duas seções de `/reports` têm o mesmo respiro visual acima/abaixo, sem
regressão nas outras páginas que usam `.card-title`/h1-h4 (reset intacto).

---

### Fase 6: Validação cruzada
**Objetivo:** garantir que a combinação de paleta + fonte + tamanho + espaçamento não regrediu
contraste (WCAG AA), tema escuro, ou layout em nenhuma tela já revisada nesta sessão.

**Passos:**
1. Checar contraste texto/fundo nos pares alterados, nos dois temas.
2. Screenshot final de `/`, `/login`, `/register`, `/forgot-password`, `/activities`,
   `/categories`, `/reports` — claro e escuro.
3. Atualizar `CLAUDE.md` (seção "Identidade visual") com os valores finais escolhidos (paleta,
   fonte, tamanhos) e o motivo, seguindo a convenção já estabelecida no arquivo.

**Files Touched:** `CLAUDE.md` (só esta fase edita o arquivo de convenções)
**Verify:** `npm run build && npm test && npm run lint` + screenshots.
**Done When:** nenhuma regressão encontrada; `CLAUDE.md` reflete os valores finais.

## Dependências e suposições

- Fases 1-4 envolvem decisão subjetiva do usuário (paleta, fonte, tratamento de link) — cada uma
  gera comparação visual antes de aplicar, seguindo o padrão já validado nesta sessão (não ajustar
  às cegas).
- Cada fase em branch própria, baseada em `master`, sem merge automático (convenção já
  estabelecida — ver memória `feedback_separate_branches`).
- Fase 5 (espaçamento) é independente das demais e pode ser feita em qualquer ordem/isoladamente.

## Notas

- Este plano é sobre o app interno (pós-login); a landing pública já foi tratada em
  `home-landing-page-2026-07-27.md` e não faz parte deste escopo.
- "Cores mais confortáveis" e "fonte mais legível" são pedidos subjetivos — a Fase 1/2 existem
  para produzir opções concretas pro usuário escolher, não para eu decidir sozinho um valor final.
