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

## Regras de negócio críticas (seção 5 da documentação)

1. Senha mínima de 8 caracteres, armazenada apenas como hash bcrypt (RNF01).
2. `duracao_min` é SEMPRE calculada pelo sistema (`utils/time.ts`), nunca vinda do formulário.
3. Hora de fim deve ser posterior à hora de início (validado em `calcDurationMin`).
4. Nome de categoria é único por usuário (constraint `@@unique([userId, nome])` no Prisma).
5. Exclusão de categoria com atividades vinculadas é BLOQUEADA (checagem no controller + `onDelete: Restrict` no banco). Não alterar para cascade.
6. Conta Google: `google_id` preenchido, `senha_hash` nulo; se o e-mail já existir como conta local, vincular ao mesmo usuário (`UserModel.findOrCreateFromGoogle`).
7. Relatório: período padrão = mês corrente; "dia registrado" = dia com ao menos uma atividade.
8. Datas/horários armazenados em UTC (RNF05); exibição no fuso do usuário ainda pendente (Fase 6).
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
- [ ] Fase 6 — Qualidade (testes BDD da seção 6 da doc, i18n en-US — RNF04, exibição no fuso do usuário — RNF05, revisão de responsividade)

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