# ⏱ Medidor de Eficiência — MVP

Sistema web para registro de atividades diárias e análise de eficiência pessoal.
**Stack:** Node.js 20+ · TypeScript · Express · EJS (views server-side) · Prisma · PostgreSQL.
**Arquitetura:** MVC com camada auxiliar de Services (ver `medidor_eficiencia.md`).

## Como rodar

### 1. Pré-requisitos
- Node.js >= 20
- PostgreSQL rodando localmente (ou via Docker, abaixo)

```bash
# opcional: subir o banco via Docker
docker run --name medidor-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=medidor_eficiencia -p 5432:5432 -d postgres:16
```

### 2. Instalação
```bash
npm install
cp .env.example .env      # ajuste DATABASE_URL e SESSION_SECRET
npx prisma migrate dev --name init
npm run db:seed           # cria usuário demo@medidor.dev / senha12345
```

### 3. Desenvolvimento
```bash
npm run dev               # http://localhost:3000 com hot reload (tsx watch)
```

### 4. Outros comandos
| Comando | Descrição |
|---|---|
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa a build de produção |
| `npm test` | Roda os testes (vitest) |
| `npm run lint` | ESLint |
| `npm run prisma:studio` | Interface visual do banco |

## Estrutura

```
src/
├── controllers/   # Recebem requisições, validam entrada, acionam Models/Services
├── models/        # Regras de domínio + acesso a dados (via Prisma)
├── services/      # ReportService (agregações), GoogleAuthService (Fase 5)
├── middlewares/   # requireAuth (RNF02), errorHandler
├── routes/        # Mapeamento de rotas → Controller#ação (seção 4.5 da doc)
├── config/        # env (zod), database (Prisma singleton), session
├── utils/         # time (duração/UTC), validators (zod schemas)
├── types/         # Declarações de sessão e Request
└── views/         # EJS: layouts, auth, home, activities, categories, reports
prisma/            # schema.prisma (User, Category, Activity) + seed
public/            # css, js, imagens
tests/             # vitest
```

## Status do roadmap

- [x] **Fase 1 — Fundação:** setup, banco, migrations, layout base, autenticação e-mail/senha
- [x] **Fase 2 — Categorias:** CRUD completo
- [x] **Fase 3 — Atividades:** CRUD com duração calculada e filtros
- [x] **Fase 4 — Relatórios:** dias registrados, total de horas, tempo por categoria
- [ ] **Fase 5 — Login Google:** OAuth 2.0 (stub em `GoogleAuthService`)
- [ ] **Fase 6 — Qualidade:** testes BDD completos, i18n en-US (RNF04), fuso do usuário (RNF05), revisão final

## Decisões técnicas

- **Prisma + PostgreSQL:** tipagem gerada automaticamente, migrations versionadas.
- **`onDelete: Restrict` em Activity→Category:** implementa a regra 7 (bloquear exclusão de categoria com atividades) no nível do banco, além da checagem no controller.
- **`method-override`:** habilita PUT/DELETE em formulários HTML para manter as rotas RESTful da seção 4.5.
- **Zod:** validação no servidor (RNF06); validação de cliente via atributos HTML5 nos formulários.
- **Sessão em memória (dev):** para produção, trocar por `connect-pg-simple` (nota em `src/config/session.ts`).
