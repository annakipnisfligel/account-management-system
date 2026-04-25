# Architecture

This document describes the internal architecture of the Account Management System API — a production-style TypeScript REST API for bank account management.

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Directory Layout](#directory-layout)
- [Request Lifecycle](#request-lifecycle)
- [Middleware Pipeline](#middleware-pipeline)
- [Validation](#validation)
- [Error Handling](#error-handling)
- [Database Access](#database-access)
- [Concurrency & Row-Level Locking](#concurrency--row-level-locking)
- [Business Rules](#business-rules)
- [Configuration](#configuration)
- [Docker Infrastructure](#docker-infrastructure)
- [Testing Strategy](#testing-strategy)

---

## High-Level Overview

```
Client
  │
  ▼
Express (app.ts)
  │
  ├── Middleware: JSON parsing, Swagger UI, health check
  │
  ├── Routes (account.routes.ts)
  │     │
  │     ├── Zod validation middleware
  │     │
  │     ├── Controllers ──▶ Services ──▶ Repositories ──▶ Prisma ──▶ PostgreSQL
  │     │
  │     └── (errors bubble up via next())
  │
  └── Error middleware (catches all, returns JSON)
```

The app follows a strict **layered architecture**: Routes → Controllers → Services → Repositories → Database. Each layer has a single responsibility and only calls the layer directly below it.

| Layer | Responsibility |
|---|---|
| **Routes** | Map HTTP verbs/paths to controller methods; attach validation middleware |
| **Controllers** | Parse HTTP input (params, body, query), call services, format HTTP output |
| **Services** | Business logic, orchestration, transaction boundaries |
| **Repositories** | Database access (Prisma ORM + raw SQL where needed) |

---

## Directory Layout

```
src/
  app.ts                          Express app factory (no listen)
  server.ts                       Entry point: DB connect, listen, graceful shutdown
  config/
    env.ts                        Environment variable loading (dotenv)
    prisma.ts                     PrismaClient singleton
    swagger.ts                    OpenAPI/Swagger spec configuration
  routes/
    account.routes.ts             All route definitions (accounts + transactions)
  controllers/
    account.controller.ts         HTTP handling for account endpoints
    transaction.controller.ts     HTTP handling for deposit/withdraw
  services/
    account.service.ts            Account business logic
    transaction.service.ts        Transaction logic (locking, daily limits)
  repositories/
    account.repository.ts         DB access for accounts (includes SELECT FOR UPDATE)
    transaction.repository.ts     DB access for transactions
    person.repository.ts          DB access for persons
  middlewares/
    error.middleware.ts            Global error handler
    validate.middleware.ts         Zod validation middleware factories
  models/
    account.model.ts              Account interfaces and DTOs
    transaction.model.ts          Transaction interfaces and DTOs
    person.model.ts               Person interface
    error.model.ts                Domain error classes

prisma/
  schema.prisma                   Database schema
  migrations/                     Prisma-managed migrations
  seed.ts                         Dev seed data (two persons + accounts)

tests/
  api/                            Integration tests (real HTTP + real DB)
  unit/                           Unit tests (fully mocked)
  setup.ts                        Test DB helpers (clean, seed)
  jest.setup.ts                   Sets DATABASE_URL for test DB

scripts/
  migrate-test-db.cjs             Applies Prisma migrations to test DB
```

---

## Request Lifecycle

Example: `POST /api/accounts/:id/withdraw`

```
1. Express receives request
2. express.json() parses body
3. Router matches POST /:id/withdraw
4. validateTransactionAmount middleware runs Zod on req.body
     └─ Fails? → 400 { error, code: "VALIDATION_ERROR", details }
5. transactionController.withdraw parses req.params.id
     └─ Invalid? → 400
6. transactionService.withdraw opens a Prisma transaction:
     a. SELECT ... FOR UPDATE (row lock on account)
     b. Check activeFlag → ForbiddenError if blocked
     c. Check balance ≥ value → UnprocessableError if insufficient
     d. Aggregate today's withdrawals → UnprocessableError if limit exceeded
     e. UPDATE balance
     f. INSERT transaction record
7. Controller sends 201 + transaction JSON
     └─ Error thrown? → next(err) → errorMiddleware → JSON error response
```

---

## Middleware Pipeline

Middleware is registered in `app.ts` in this exact order:

| Order | Middleware | Purpose |
|---|---|---|
| 1 | `express.json()` | Parse JSON request bodies |
| 2 | `express.urlencoded()` | Parse URL-encoded bodies |
| 3 | `GET /health` | Health check endpoint |
| 4 | Swagger UI + JSON spec | `GET /api/docs`, `GET /api/docs.json` |
| 5 | `accountRoutes` | All `/api/accounts/*` routes |
| 6 | 404 handler | Catches unmatched routes |
| 7 | `errorMiddleware` | Global error handler (must be last) |

Within routes, **Zod validation middleware** runs before controllers (e.g. `validateCreateAccount`, `validateTransactionAmount`, `validateStatementQuery`).

---

## Validation

Validation uses **Zod** schemas with two middleware factories:

- **`validateBody(schema)`** — parses `req.body`; replaces it with the parsed result on success.
- **`validateQuery(schema)`** — parses `req.query`; merges parsed result back onto `req.query`.

On failure, both return `400` with a structured response:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "value", "message": "Expected number, received string" }
  ]
}
```

Key schemas:

| Schema | Used on | Rules |
|---|---|---|
| `createAccountSchema` | `POST /accounts` | `personId` required int; optional `dailyWithdrawalLimit`, `accountType` |
| `transactionAmountSchema` | `POST /:id/deposit`, `POST /:id/withdraw` | `value` positive number, max 2 decimal places |
| `statementQuerySchema` | `GET /:id/statement` | Optional `from`/`to` as `YYYY-MM-DD` strings |

Account ID in path params is validated inline in controllers (integer, positive) rather than through Zod.

---

## Error Handling

### Domain Errors (`models/error.model.ts`)

All custom errors extend `AppError`:

| Class | Status | Code |
|---|---|---|
| `AppError` | configurable | configurable |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `UnprocessableError` | 422 | `UNPROCESSABLE` |

### Error Middleware (`middlewares/error.middleware.ts`)

Catches all errors from `next(err)`:

| Error type | Response |
|---|---|
| `AppError` | `err.statusCode` + `{ error, code }` |
| Prisma `P2025` | 404 `NOT_FOUND` |
| Prisma `P2002` | 409 `CONFLICT` |
| Prisma `P2003` | 400 `VALIDATION_ERROR` |
| Prisma validation error | 400 `VALIDATION_ERROR` |
| Everything else | 500 `INTERNAL_SERVER_ERROR` (logged, generic message to client) |

This ensures no raw stack traces or internal details leak to clients.

---

## Database Access

### Prisma Client Singleton (`config/prisma.ts`)

A single `PrismaClient` instance per process. In development, stored on `globalThis` to survive hot-reloads without creating multiple connections. Logging is verbose in development (`query`, `error`, `warn`) and minimal in production (`error` only).

### Repository Pattern

Repositories are thin wrappers over Prisma. Every method that participates in a transaction accepts an optional `tx: Prisma.TransactionClient` parameter, falling back to the singleton client:

```typescript
async function updateBalance(id: number, balance: Decimal, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  return client.account.update({ where: { accountId: id }, data: { balance } });
}
```

### Raw SQL

`accountRepository.findByIdWithLock` uses `$queryRaw` for `SELECT ... FOR UPDATE`, which Prisma's query builder doesn't support. Column names are mapped from snake_case to camelCase via `AS` aliases in the query itself.

---

## Concurrency & Row-Level Locking

Financial operations (deposit, withdraw) must be safe under concurrent access. The design uses **PostgreSQL row-level locks inside Prisma interactive transactions**:

```
prisma.$transaction(async (tx) => {
  // 1. Acquire row lock
  const account = await accountRepository.findByIdWithLock(id, tx);
  //    ↳ SELECT ... FROM accounts WHERE account_id = $1 FOR UPDATE

  // 2. All checks run under lock (balance, active flag, daily limit)

  // 3. Mutate
  await accountRepository.updateBalance(id, newBalance, tx);
  await transactionRepository.create({ ... }, tx);
});
```

This guarantees:
- **No lost updates** — concurrent withdrawals cannot both read the same balance.
- **No TOCTOU races** — `activeFlag` and balance are checked after the lock is held.
- **Serialized daily limit checks** — the aggregate query runs inside the same transaction.

---

## Business Rules

### Deposits
- Account must exist and be active (checked under row lock).
- Value must be positive with at most 2 decimal places.
- Balance is incremented atomically.

### Withdrawals
- Account must exist and be active (checked under row lock).
- Value must be positive with at most 2 decimal places.
- Balance must be sufficient (`balance >= value`).
- **Daily withdrawal limit**: if `dailyWithdrawalLimit > 0`, the sum of today's withdrawals (including the new one) must not exceed the limit. "Today" is defined as midnight-to-midnight local time.

### Account Blocking
- Sets `activeFlag = false`.
- Blocked accounts reject all deposits and withdrawals.
- Blocking is idempotent at the DB level but returns 403 if already blocked.

### Statements
- Returns all transactions for an account, optionally filtered by `from` and `to` dates (`YYYY-MM-DD`).
- Date filtering uses `>=` and `<=` boundaries.

---

## Configuration

| File | What it provides |
|---|---|
| `config/env.ts` | Loads `.env` via `dotenv/config`. Exports `env.port`, `env.nodeEnv`, `env.databaseUrl`. |
| `config/prisma.ts` | PrismaClient singleton with environment-aware logging. |
| `config/swagger.ts` | OpenAPI 3.0 spec: metadata, server URL (port from env), JSDoc-sourced route docs. |
| `.env` / `.env.example` | `PORT`, `NODE_ENV`, `DATABASE_URL`. `.env.example` committed; `.env` git-ignored. |

`server.ts` is the entry point — it connects to the database, starts listening, and registers `SIGTERM`/`SIGINT` handlers for graceful shutdown (close server, disconnect Prisma).

---

## Docker Infrastructure

`docker-compose.yml` provides two isolated PostgreSQL 16 containers:

| Service | Host Port | Database | Purpose |
|---|---|---|---|
| `postgres` | 5434 | `account_management_db` | Development |
| `postgres_test` | 5433 | `account_management_db_test` | Integration tests |

Both use `postgres:16-alpine`, credentials `postgres/postgres`, named volumes for persistence, and `pg_isready` health checks.

The application itself runs on the host (Node.js) — there is no app container. This keeps the dev loop fast (no image rebuilds).

---

## Testing Strategy

### Two test tiers

| Tier | Location | Database | What it verifies |
|---|---|---|---|
| **Unit** | `tests/unit/` | None (fully mocked) | Service logic, controller input/output, middleware behavior, repository method calls |
| **Integration (API)** | `tests/api/` | Real (test DB on port 5433) | Full HTTP request → DB → response cycle |

### Unit tests

- Each layer is tested in isolation. Dependencies are replaced with `jest.mock()`.
- Repository tests mock `PrismaClient` methods to verify correct Prisma calls and argument shapes.
- Service tests mock repositories and verify business rules (locking, limits, errors).
- Controller tests mock services and verify HTTP status codes, response bodies, and `next()` calls.
- Middleware tests use mock `req`/`res`/`next` objects.

### Integration tests

- Use **Supertest** against the real Express `app` (imported from `app.ts`).
- `tests/jest.setup.ts` overrides `DATABASE_URL` to point at the test DB before any module loads.
- `tests/setup.ts` provides `cleanDatabase()` (truncates all tables) and seed helpers.
- `beforeEach` cleans the DB so each test starts from a known state.

### Test DB migration

`npm test` automatically runs `scripts/migrate-test-db.cjs` before Jest. This applies Prisma migrations to the test database using the same URL convention as `jest.setup.ts`. Unit-only runs (`npm run test:unit`) skip this step since they don't touch the database.

### Jest configuration

- `ts-jest` with a dedicated `tsconfig.test.json`.
- `--runInBand` to avoid DB race conditions between API tests.
- `--forceExit` to handle Prisma's open connection handles.
- Path alias `@/` maps to `src/`.
- Coverage excludes `server.ts` (entry point with side effects).
