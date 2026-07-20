# CLAUDE.md — Medidor de Eficiência

Contexto para o Claude Code. Leia também `medidor_eficiencia.md` (documentação completa do MVP) antes de tarefas de arquitetura ou novas features.

## O que é o projeto

Sistema web para registro de atividades diárias e análise de eficiência pessoal. O usuário registra atividades (nome, categoria, data, hora início/fim, descrição), organiza-as em categorias próprias (nome, cor, meta opcional) e visualiza relatórios por período: dias registrados, total de horas e distribuição de tempo por categoria.

## Stack

- **Runtime:** Node.js >= 20, TypeScript strict (CommonJS, target ES2022)
- **Web:** Express 4 + EJS server-side com `express-ejs-layouts` (MVC clássico, sem SPA)
- **Banco:** PostgreSQL via Prisma (`prisma/schema.prisma` é a fonte de verdade dos Models)
- **Validação:** Zod no servidor (`src/utils/validators.ts`) + atributos HTML5 no cliente (RNF06)
- **Sessão:** `express-session` (memória em dev; produção deve migrar para `connect-pg-simple`)
- **Segurança:** `helmet` (cabeçalhos/CSP), `express-rate-limit` (rate limit), `express-async-errors` (encaminha erros de rotas async para o errorHandler)
- **Testes:** Vitest (`tests/`)
- **Dev:** `npm run dev` (tsx watch) · **Build:** `npm run build` · **Testes:** `npm test` · **Lint:** `npm run lint`

## Arquitetura (MVC + Services)

```
src/
├── controllers/   # Finos: validam entrada (Zod), acionam Models/Services, renderizam Views
├── models/        # Regras de domínio + acesso a dados via Prisma (UserModel, CategoryModel, ActivityModel)
├── services/      # ReportService (agregações de relatório), GoogleAuthService (OAuth 2.0 com google-auth-library)
├── middlewares/   # requireAuth/requireAdmin (RNF02), flash (substitui connect-flash), errorHandler
├── routes/        # Mapeamento rota → Controller#ação (seguir seção 4.5 da documentação)
├── config/        # env (validado com Zod no boot), database (Prisma singleton), session
├── utils/         # time.ts (duração/UTC), validators.ts (schemas Zod)
├── types/         # session.d.ts (userId/userName), express.d.ts (currentUser)
└── views/         # EJS: layouts/, partials/, auth/, home/, activities/, categories/, reports/
```

- Controllers não contêm SQL nem HTML.
- Todo acesso a dados é escopado por `userId` — nunca expor dados de outro usuário (RF12).
- Formulários HTML usam `method-override` (`?_method=PUT|DELETE`) para manter rotas RESTful.

## Identidade visual

Design system **"Caderno de Esboço"** — interface com aparência de caderno de rascunho quadriculado desenhado à mão (bordas onduladas, leve inclinação em cards, tremor sutil no hover). Fonte de referência: `docs/design/kit-ui/` (cópia do kit de design do produto — componentes React/JSX, guidelines e um mockup estático em `ui_kits/medidor-eficiencia/`, só para **consulta**; a integração real no app é CSS puro + EJS, sem React nem build step).

- **Tipografia**: `Patrick Hand` (corpo), `Architects Daughter` (títulos/display), `Kalam` (destaques) — Google Fonts, carregadas em `public/css/tokens.css`. Corpo nunca abaixo de 15px (`--text-sm`).
- **Cores**: tokens `oklch()` em `tokens.css` — `--paper`/`--ink` (base) + 4 "canetas" de acento: `--accent-blue` (ações/primário), `--accent-green` (sucesso), `--accent-red` (erro/perigo), `--accent-yellow` (aviso). Tema escuro via `[data-theme="dark"]` na tag `<html>`. Nunca usar hexadecimal fixo fora dos tokens — para tons neutros (ex.: ícone da lua) usar `--ink-soft`, não inventar um cinza literal. `--on-accent` é a cor de texto/ícone sobre um fundo "sólido" de acento (`.btn-primary`/`.btn-danger`) — sempre clara, fixa nos dois temas; não usar `--paper` para isso (no tema escuro `--paper` vira a cor de fundo da página, ou seja, escura). Por isso no tema escuro `--accent-blue`/`--accent-red`/`--accent-green` (a variante "cheia", não a `-soft`) ficam próximas da mesma faixa de luminosidade do tema claro em vez de mais claras — um botão sólido claro com texto claro (`--on-accent`) teria contraste ruim. `:root` define `color-scheme: light` e `[data-theme="dark"]` redefine para `color-scheme: dark` — sem isso, controles nativos do navegador (ícone de calendário/relógio de `input type="date|time"`, popup de `<option>` do `<select>`) continuam renderizados no esquema claro do SO mesmo com o app em tema escuro (ícone preto ilegível, options claras). `.select option` também fixa `background`/`color` explícitos para os navegadores que respeitam essas propriedades no popup.
- **Cor de categoria é livre** (regra 6 — usuário escolhe via `<input type="color">`) e é **ortogonal** à paleta de 4 acentos do sistema: `.color-dot`/`.bar-fill` usam a cor bruta salva pelo usuário, não `--accent-*`. Não forçar categorias para a paleta fechada.
- **Efeito "traço à mão"**: classe `.sketch-edge` (borda com filtro SVG `feTurbulence`/`feDisplacementMap`, referenciado via `url(#sketch-rough-edge)` em `tokens.css`) em todo componente interativo. Os ícones (`icon.ejs`, quando `rough` não é `false`) usam o mesmo tipo de filtro via `url(#sketch-rough-icon)`. Os dois `<filter>` reais vivem em `partials/svg-filters.ejs` (um `<svg width="0" height="0">` oculto, incluído uma única vez em cada layout — `main.ejs` e `auth.ejs`). **Não voltar a usar `filter: url("data:image/svg+xml,...")` inline** (era a abordagem original): Safari/WebKit não resolve filtro SVG referenciado via data URI no CSS — em vez de só ignorar o filtro, o elemento inteiro some. Foi exatamente esse bug que fez os ícones não aparecerem no Safari/iOS. Por isso o filtro precisa ser um `<filter>` de verdade no HTML da página (mesmo documento), referenciado por `#id` — funciona em todos os browsers, inclusive Safari. Consequência: a CSP global em `src/app.ts` **não precisa mais** de `data:` em `style-src` (já removido) — não reintroduzir sem necessidade nova. `.sketch-hover` anima um tremor **só no `::before`** (a moldura), nunca no elemento real — se a rotação for aplicada ao elemento real, o texto/ícone gira junto e borra durante a animação (já aconteceu, não reintroduzir). A animação roda em loop (`infinite`) enquanto durar o hover/focus — sem isso ela termina em 0.5s e o elemento "endireita" mesmo com o mouse ainda em cima. Amplitude (`--tilt`) já foi ajustada pra cima e pra baixo várias vezes a pedido do usuário; valor atual **-1deg** — mudar só se pedido de novo, não "otimizar" sozinho.
- **Crescimento de `.icon-btn` no hover**: `transition: transform` simples no elemento real (`scale()`, sem rotação — por isso não borra), somado ao wobble do `::before` acima. Não voltar a usar `@keyframes` com `rotate()` no elemento real desse componente.
- **`.btn-primary` não balança** (`animation: none` no `::before` em hover/focus, sobrescrevendo o wobble padrão de `.sketch-hover`) — pedido explícito porque o CTA principal balançando o tempo todo distraía mais do que ajudava; ainda cresce (`scale()`) e ganha sombra no `::before`. `.icon-btn`/`.badge`/demais `sketch-hover` continuam balançando normalmente — a supressão é só para `.btn-primary`.
- **Sombra sólida** (não-blur, ex.: `.badge`, `.btn-primary:hover`) tem que ir no `::before`, nunca no elemento real — é o `::before` que tem o `border-radius`; sombra no elemento real (sem raio) sai com cantos quadrados, destoando do contorno arredondado.
- **Componentes** (`public/css/components.css`, portado de `docs/design/kit-ui/components.css` com ajustes): `.btn` (`btn-primary|secondary|ghost|danger`, `btn-sm|lg`), `.icon-btn` (48px, ícone 20px — usar sempre esse tamanho em ações de lista, não 16px), `.field`/`.input-wrap`/`.input`/`.select`, `.check-row`/`.check-box`, `.card`/`.card-title`/`.card-heading`/`.card-footer`, `.badge`/`.badge-blue|green|yellow|red|neutral` (sombra "adesivo descolado" no `::before`), `.alert`/`.alert-success|error` (mensagens flash). `.btn-primary`/`.btn-danger` (e seu `:hover`/`:focus-visible`) fixam `color: var(--on-accent)` de propósito — sem isso, a regra `a:hover` (mais específica) deixa o texto ilegível sobre o fundo colorido em botões que são `<a>`; usar `--on-accent` (não `--paper`) é o que garante contraste nos dois temas (ver nota em "Cores" acima). `reset.css` (importado antes de tokens/components em `styles.css`) zera aparência nativa de `<button>`/`<input>` — é o que faz `.icon-btn`/`.btn-danger` funcionarem em cima de um `<button>` sem fundo/borda cinza do navegador vazando; qualquer botão novo deve ficar por baixo dele. **Toast de confirmação** (`partials/confirm-toast.ejs`, incluído uma única vez em `layouts/main.ejs`, controlado por `public/js/confirm-submit.js`) substitui o `window.confirm()` nativo: formulários com `class="js-confirm-submit" data-confirm="..."` (exclusão de atividade/categoria) têm o `submit` interceptado, mostram o toast (`.confirm-toast.is-visible`, `role="alertdialog"`) e só reenviam o form via `HTMLFormElement.prototype.submit.call(form)` (não dispara `submit` de novo, evita loop) se o usuário clicar em "Confirmar". Não voltar a usar `confirm()`/`onsubmit` — quebraria a CSP (`script-src-attr 'none'`) e já causou um XSS armazenado antes (ver seção Segurança).
- **Ícones**: partial `views/partials/icon.ejs` (SVG inline; a maioria dos paths vem de `docs/design/kit-ui/components/icons/Icon.jsx`, mas `sun`/`moon` foram adicionados ali mesmo, fora do catálogo original, para o toggle de tema) — uso: `<%- include('partials/icon', { name: 'trash', size: 20 }) %>`. Sol usa `--accent-yellow`, lua usa `--ink-soft` (ver exemplo em `layouts/main.ejs`). Nunca usar emoji ou biblioteca de ícones externa (regra de conteúdo do kit: "sem emoji em mensagens de sistema").
- **Layout — sem sidebar**: `layouts/main.ejs` usa um topbar fino (marca + botão de tema sol/lua + docs-se-admin + sair, todos com as mesmas classes `icon-btn sketch-edge sketch-hover` + `btn-secondary`/`btn-danger` — não deixar nenhum desses sem uma dessas duas classes de cor, senão ele "perde" o padrão visual dos outros), igual em toda página logada; a navegação entre Atividades/Categorias/Relatórios acontece pelo menu-grade da home (`/`), não por um nav persistente. Cada página interna usa `partials/page-header.ejs` (`{ title, backHref }`) para o título + botão "Voltar" (`.back-btn`, seta esquerda, encolhe sutilmente no hover — não usa `.sketch-hover`/wobble, é um efeito próprio). `backHref` é sempre o fallback: o clique tenta primeiro `public/js/back-button.js` (compara `document.referrer` com a URL atual — só usa `history.back()` se o referrer for de uma página *diferente*; isso evita que ações que recarregam a própria página, como o filtro de `/activities`, façam o botão voltar para o filtro anterior em vez do menu). Convenção de `backHref`: páginas de listagem (`/activities`, `/categories`, `/reports`) voltam para `/`; formulários (`new`/`edit`) voltam para a respectiva listagem. Todo o conteúdo é centralizado em coluna única (`max-width: 640px`, mobile-first) — não recriar o layout de dashboard largo com sidebar.
- **Tema**: persistido via **cookie** `theme` (não `httpOnly`, setado por `public/js/theme-toggle.js` no clique), lido no servidor em `app.ts` (`readThemeCookie`) e usado para renderizar `<html data-theme="dark">` já no HTML enviado — não em `localStorage` + script no `<head>` (abordagem antiga, trocada porque o tema podia não persistir entre navegações). Não reintroduzir um `theme-init.js`/localStorage: a fonte de verdade é o cookie lido no servidor.
- **Valores numéricos** (`Activity.valor`, `Category.valorPadrao`) são exibidos formatados em pt-BR via `src/utils/format.ts#formatNumber` (vírgula decimal, 2 casas) — nunca usar em `value=""` de `<input type="number">` (que exige ponto decimal), só em texto de exibição.
- Nenhum `<script>` inline nem atributo `onclick`/`onsubmit` — JS de página é sempre arquivo estático em `public/js/` (exigência da CSP `script-src 'self'` / `script-src-attr 'none'`, ver seção Segurança).

## Regras de negócio críticas (seção 5 da documentação)

1. Senha mínima de 8 caracteres, armazenada apenas como hash bcrypt (RNF01).
2. `duracao_min` é SEMPRE calculada pelo sistema (`utils/time.ts`), nunca vinda do formulário.
3. Hora de fim deve ser posterior à hora de início (validado em `calcDurationMin`).
4. Nome de categoria é único por usuário (constraint `@@unique([userId, nome])` no Prisma).
5. Exclusão de categoria com atividades vinculadas é BLOQUEADA (checagem no controller + `onDelete: Restrict` no banco). Não alterar para cascade.
6. Conta Google: `google_id` preenchido, `senha_hash` nulo; se o e-mail já existir como conta local, vincular ao mesmo usuário (`UserModel.findOrCreateFromGoogle`).
7. Relatório: período padrão = mês corrente; "dia registrado" = dia com ao menos uma atividade.
8. Datas/horários armazenados em UTC (RNF05). Fuso do usuário detectado via `Intl.DateTimeFormat().resolvedOptions().timeZone` (`public/js/timezone.js`), persistido em cookie `tz` (mesmo padrão não-httpOnly do cookie `theme`) e lido/validado no servidor (`readTimezoneCookie`/`isValidTimeZone` em `app.ts`, com fallback pra UTC se o cookie estiver ausente ou for inválido) — disponível como `req.userTimezone`. `utils/time.ts#combineDateTime(dateISO, timeHHmm, timezone)` converte o horário local digitado (`horaInicio`/`horaFim`) pro instante UTC correspondente ao gravar; `formatTimeInZone` faz o caminho inverso pra exibir. Limitação conhecida (documentada no docstring de `combineDateTime`): correção de offset é feita em uma única passada via `Intl`, sem tzdb completa — imprecisa numa janela de ~1h, duas vezes por ano, ao redor de uma transição de horário de verão (não afeta o Brasil, que não tem mais DST desde 2019). O campo `Activity.data` (dia do calendário) e os limites de período do relatório (`ReportService.defaultPeriod`, "mês corrente") continuam em UTC puro, sem conversão de fuso — decisão de escopo, não pendência.
9. Categoria pode habilitar um valor numérico (`possuiValor` + `valorLabel` + `valorPadrao` opcional) para referência de métricas (ex.: custo de passagem em "Deslocamento", valor de depósito em "Poupança"). Ao registrar uma atividade sem informar o valor, usa-se `valorPadrao` da categoria quando definido; o campo `Activity.valor` só é relevante quando `category.possuiValor = true`.
10. Categoria pode ter `duracaoPadraoMin` opcional (ex.: Lazer sempre 1h). Isso apenas sugere a hora de fim no formulário (`horaInicio + duracaoPadraoMin`) — não força a duração; `duracaoMin` continua sempre calculado de hora início/fim (regra 5).
11. `User.isAdmin` restringe o acesso a `/docs` (documentação Swagger/OpenAPI): `requireAdmin` (em `middlewares/requireAuth.ts`) roda depois de `requireAuth` e bloqueia não-administradores redirecionando para `/` com flash de erro. O status é copiado para `req.session.isAdmin` no login (local, registro e Google) — não há UI para promover usuários; isso é feito diretamente no banco (`UPDATE users SET is_admin = true` ou `prisma studio`).

## Segurança e confiabilidade

- **CSP restritiva (helmet):** `script-src 'self'` e `script-src-attr 'none'` — proibido usar `<script>` inline ou atributos `onclick`/`onsubmit` etc. em views. JS de página fica em `public/js/*.js` (ver `activity-form.js`, `category-form.js`); dados do servidor para esses scripts vão em atributos `data-*`, nunca interpolados dentro de `<script>` ou de um atributo de evento (isso já causou um XSS armazenado via nome de categoria — corrigido trocando `onsubmit` por `data-confirm` + `public/js/confirm-submit.js`, delegado no layout).
- **`/docs` tem CSP própria (desabilitada)** — Swagger UI depende de recursos que a política padrão bloquearia; isso só se aplica àquela rota, já restrita a admins.
- **Rate limit (`src/config/rateLimit.ts`):** `globalLimiter` (300 req/15min por IP, toda a app) + `authLimiter` (10 req/15min por IP, aplicado a `POST /login`, `POST /register` e `GET /auth/google/callback`) contra força bruta/spam. Ambos são desabilitados quando `NODE_ENV=test` (`skip`), senão os testes de rota se bloqueiam entre si.
- **`app.set('trust proxy', 1)` só em produção** (`isProd`) — necessário para o rate limit e o cookie `secure` enxergarem o IP/protocolo reais atrás de um proxy/load balancer; não habilitar em dev (permitiria spoofing de IP via `X-Forwarded-For`).
- **`express-async-errors`** (importado no topo de `app.ts`) — sem isso, uma exceção em um controller `async` sem try/catch (ex.: data inválida em `?inicio=`) vira uma rejeição de Promise não tratada que o Express 4 não captura, travando a requisição e podendo derrubar o processo Node inteiro (unhandled rejection). Com o import, todo erro assíncrono de rota cai no `errorHandler` normalmente. `server.ts` ainda tem um `process.on('unhandledRejection', ...)` como rede de segurança.
- **RF12 (isolamento por usuário):** ao aceitar um `categoryId` vindo do formulário (`ActivityController.store` E `update`), sempre validar com `CategoryModel.findById(categoryId, userId)` antes de gravar — sem isso, um usuário pode associar sua atividade à categoria de outro usuário e vazar `nome`/`cor`/`valorLabel` dela nos próprios relatórios/listagens.
- **`connect-flash` foi removido** (abandonado desde 2014, usa a API depreciada `util.isArray`) e substituído por `src/middlewares/flash.ts`, com a mesma assinatura (`req.flash(type, msg)` / `req.flash(type)`).

## Status do roadmap

- [x] Fase 1 — Fundação (setup, banco, layout base, auth e-mail/senha)
- [x] Fase 2 — Categorias (CRUD completo)
- [x] Fase 3 — Atividades (CRUD, duração calculada, filtros por período/categoria)
- [x] Fase 4 — Relatórios (dias registrados, total de horas, tempo por categoria)
- [x] Fase 5 — Login Google OAuth 2.0 (`GET /auth/google` inicia o consent screen, `GET /auth/google/callback` troca o code e autentica via `UserModel.findOrCreateFromGoogle`; requer `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_CALLBACK_URL` configurados — sem isso, o botão "Entrar com Google" mostra erro amigável)
- [ ] Fase 6 — Qualidade: [x] exibição no fuso do usuário (RNF05, ver regra 8), [x] revisão de responsividade · pendente: testes BDD da seção 6 da doc (obs.: `medidor_eficiencia.md` não está no repo — precisa ser localizado/reconstruído antes de escrever os testes), i18n en-US (RNF04)

## Convenções

- Idioma da interface e das mensagens de erro/feedback: **português (pt-BR)**.
- Nomes de código (variáveis, funções, arquivos) em inglês ou pt-BR conforme já existente no arquivo — manter consistência local, não renomear em massa.
- Mensagens flash: `req.flash('success' | 'error', mensagem)`, exibidas pelo partial `views/partials/flash.ejs`.
- Novas rotas privadas devem passar pelo middleware `requireAuth`.
- Toda nova regra de validação entra em `src/utils/validators.ts` (Zod) — não validar inline no controller.
- Migrations: sempre via `npx prisma migrate dev --name <descricao>`; nunca editar o banco manualmente.
- Antes de finalizar qualquer tarefa: `npm run build && npm test && npm run lint` devem passar.

## Fora do escopo do MVP (não implementar sem alinhamento)

App mobile nativo, dashboards customizáveis, anexos de arquivos, compartilhamento de relatórios, notificações/lembretes.

## Credenciais de desenvolvimento

Seed (`npm run db:seed`): usuário `demo@medidor.dev` / senha `senha12345` (administrador — `isAdmin = true`, acessa `/docs`), com 5 categorias de exemplo.