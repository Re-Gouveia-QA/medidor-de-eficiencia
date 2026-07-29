# ⏱ Sketch your time — MVP

[![CI](https://github.com/Re-Gouveia-QA/medidor-de-eficiencia/actions/workflows/ci.yml/badge.svg)](https://github.com/Re-Gouveia-QA/medidor-de-eficiencia/actions/workflows/ci.yml)

Sistema web para registro de atividades diárias e análise de eficiência pessoal.
**Stack:** Node.js 20+ · TypeScript · Express · EJS (views server-side) · Prisma · PostgreSQL.
**Arquitetura:** MVC com camada auxiliar de Services (ver `CLAUDE.md`).

## Como rodar

### 1. Pré-requisitos
- Node.js >= 20
- PostgreSQL rodando localmente, ou via Docker (abaixo)

```bash
# opcional: subir o banco via Docker
docker-compose up -d
```

### 2. Instalação
```bash
npm install
cp .env.example .env      # ajuste DATABASE_URL (porta do docker-compose.yml) e SESSION_SECRET
npx prisma migrate dev --name init
npm run db:seed           # cria usuário demo@medidor.dev / senha12345 (admin, acessa /docs)
```

### 3. Desenvolvimento
```bash
npm run dev               # http://localhost:3000 com hot reload (tsx watch)
```

### 4. Testes
```bash
npm test                  # unitários/integração (Vitest), mocks de Prisma — não precisa de banco
npm run test:e2e          # E2E (Playwright), navegador real — ver pré-requisitos abaixo
```
A suíte E2E roda contra um banco Postgres dedicado (nunca o de dev): exige `docker-compose up -d`
e um `.env.test` na raiz (mesmas chaves do `.env.example`, com `DATABASE_URL` apontando pra um
banco cujo nome contenha `_e2e` e `NODE_ENV=test`) — detalhes em `CLAUDE.md`.

### 5. Outros comandos
| Comando | Descrição |
|---|---|
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa a build de produção |
| `npm run lint` | ESLint |
| `npm run prisma:studio` | Interface visual do banco |

## Estrutura

```
src/
├── controllers/   # Recebem requisições, validam entrada, acionam Models/Services
├── models/        # Regras de domínio + acesso a dados (via Prisma)
├── services/      # ReportService (agregações), GoogleAuthService (OAuth 2.0), EmailService (Brevo)
├── middlewares/   # requireAuth/requireAdmin (RNF02), flash, errorHandler
├── routes/        # Mapeamento de rotas → Controller#ação (seção 4.5 da doc)
├── config/        # env (zod), database (Prisma singleton), session, rateLimit
├── utils/         # time (duração/UTC), validators (zod schemas), format
├── i18n/          # pt-BR.json / en-US.json
├── types/         # Declarações de sessão e Request
└── views/         # EJS: layouts, partials, auth, home, activities, categories, reports
prisma/            # schema.prisma (User, Category, Activity, PasswordResetToken) + seed
public/            # css, js, imagens
tests/             # Vitest (unitários/integração, mocks de Prisma)
e2e/               # Playwright (E2E, navegador real, banco Postgres dedicado)
docs/              # OpenAPI (/docs, restrito a admins), setup do Google OAuth, kit de design
```

## Status do roadmap

- [x] **Fase 1 — Fundação:** setup, banco, migrations, layout base, autenticação e-mail/senha
- [x] **Fase 2 — Categorias:** CRUD completo
- [x] **Fase 3 — Atividades:** CRUD com duração calculada e filtros
- [x] **Fase 4 — Relatórios:** dias registrados, total de horas, tempo por categoria
- [x] **Fase 5 — Login Google:** OAuth 2.0 (`GET /auth/google` + `/auth/google/callback`; requer `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_CALLBACK_URL` no `.env`, ver `docs/google-oauth-setup.md`) · recuperação de senha por token único enviado por e-mail
- [x] **Fase 6 — Qualidade:** fuso do usuário (RNF05), i18n pt-BR/en-US (RNF04), responsividade, testes unitários (Vitest, convenção BDD) + E2E (Playwright), CI no GitHub Actions

## Decisões técnicas

- **Prisma + PostgreSQL:** tipagem gerada automaticamente, migrations versionadas.
- **`onDelete: Restrict` em Activity→Category:** implementa a regra 7 (bloquear exclusão de categoria com atividades) no nível do banco, além da checagem no controller.
- **`method-override`:** habilita PUT/DELETE em formulários HTML para manter as rotas RESTful da seção 4.5.
- **Zod:** validação no servidor (RNF06); validação de cliente via atributos HTML5 nos formulários.
- **Sessão:** `MemoryStore` em dev; `connect-pg-simple` em produção (mesmo Postgres do Prisma) — ver `src/config/session.ts`.
- **Testes:** Vitest para unitários/integração (mockam o Prisma, não tocam banco real); Playwright para E2E, contra um banco `_e2e` dedicado, nunca o de dev — ver `CLAUDE.md`.
