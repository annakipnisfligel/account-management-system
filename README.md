# Account Management System API

A production-style TypeScript REST API for bank account management built with Node.js, Express, Prisma, and PostgreSQL.

Supports account creation, balance queries, deposits, withdrawals, account blocking, and transaction statements with optional period filtering.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js 18+ | LTS, async/await native support |
| Language | TypeScript (strict mode) | Type safety across all layers |
| Framework | Express.js | Minimal and flexible; architecture decisions visible in code |
| ORM | Prisma | Strong TypeScript integration, `Decimal` money type, migration support |
| Database | PostgreSQL | ACID transactions mandatory for financial operations |
| Validation | Zod | TypeScript-first runtime validation at the request boundary |
| Testing | Jest + Supertest | Unit tests (mocked) + integration tests (real HTTP + real DB) |
| Documentation | Swagger / OpenAPI 3.0 | Interactive UI, machine-readable contract |
| Containerization | Docker + Docker Compose | One-command setup, reproducible environments |

---

## Quickstart — Docker (recommended)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- [Node.js 18+](https://nodejs.org/) and npm

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd account-management-system
npm install
```

### 2. Configure environment

Copy the provided example file and adjust if needed:

```bash
cp .env.example .env
```

The defaults match the Docker setup below and work out of the box:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/account_management_db?schema=public"
```

### 3. Start the databases

```bash
docker compose up -d
```

This starts two isolated PostgreSQL containers:

| Container | Port | Database | Purpose |
|---|---|---|---|
| `account_management_db` | `5434` | `account_management_db` | Development |
| `account_management_db_test` | `5433` | `account_management_db_test` | Integration tests |

Wait for the health checks to pass (a few seconds), then verify:

```bash
docker compose ps
```

Both services should show `healthy`.

### 4. Run migrations and seed data

```bash
npx prisma migrate deploy
npm run prisma:seed
```

The seed script creates two persons and their accounts for local exploration:

| Person | document | personId | accountId | balance | dailyWithdrawalLimit |
|---|---|---|---|---|---|
| John Doe | `12345678901` | 1 | 1 | 0.00 | 1000.00 |
| Jane Smith | `98765432100` | 2 | 2 | 500.00 | 2000.00 |

> IDs may differ if you have run migrations before. Check the seed output for the actual values.

### 5. Start the server

```bash
npm run dev
```

The server starts on **http://localhost:3000**.

### 6. Explore the API

| URL | Description |
|---|---|
| http://localhost:3000/api/docs | Swagger interactive UI |
| http://localhost:3000/api/docs.json | Raw OpenAPI JSON spec |
| http://localhost:3000/health | Health check |

---

## Project Structure

```
src/
  app.ts                        # Express app setup and middleware wiring
  server.ts                     # Entry point: DB connection, graceful shutdown
  config/
    env.ts                      # Environment variable loading and normalization
    prisma.ts                   # Prisma singleton client
    swagger.ts                  # OpenAPI spec configuration
  routes/
    account.routes.ts           # All route definitions (accounts + transactions)
  controllers/
    account.controller.ts       # HTTP in/out for account endpoints
    transaction.controller.ts   # HTTP in/out for deposit/withdraw endpoints
  services/
    account.service.ts          # Account business logic
    transaction.service.ts      # Transaction logic (row locking, daily limit)
  repositories/
    account.repository.ts       # DB access for accounts (SELECT FOR UPDATE)
    transaction.repository.ts   # DB access for transactions
    person.repository.ts        # DB access for persons
  middlewares/
    error.middleware.ts         # Global error handler: maps all errors to JSON
    validate.middleware.ts      # Zod validation middleware (body + query)
  models/
    account.model.ts            # Account interfaces and DTOs
    transaction.model.ts        # Transaction interfaces and DTOs
    person.model.ts             # Person interface
    error.model.ts              # Domain error classes

prisma/
  schema.prisma                 # Database schema (Person, Account, Transaction)
  migrations/                   # Prisma-managed migration files
  seed.ts                       # Seeds two persons and accounts for local dev

tests/
  api/
    account.api.test.ts         # Integration tests: real HTTP against test DB
  unit/
    controllers/                # Unit tests for account and transaction controllers
    services/                   # Unit tests for account and transaction services
    repositories/               # Unit tests for all repository methods
    middlewares/                # Unit tests for validate and error middleware
    models/                     # Unit tests for domain error classes
  setup.ts                      # Test DB helpers: clean, seed test data
  jest.setup.ts                 # Sets DATABASE_URL before modules load
```

---

## Database Schema

```
persons
  person_id    SERIAL PK
  name         TEXT NOT NULL
  document     TEXT NOT NULL UNIQUE    (CPF / SSN)
  birth_date   DATE NOT NULL

accounts
  account_id             SERIAL PK
  person_id              INT FK → persons.person_id
  balance                DECIMAL(15,2) DEFAULT 0
  daily_withdrawal_limit DECIMAL(15,2) DEFAULT 0
  active_flag            BOOLEAN DEFAULT true
  account_type           INT DEFAULT 1
  create_date            TIMESTAMP DEFAULT now()

transactions
  transaction_id    SERIAL PK
  account_id        INT FK → accounts.account_id
  value             DECIMAL(15,2)
  transaction_date  TIMESTAMP DEFAULT now()
  transaction_type  ENUM(DEPOSIT, WITHDRAWAL)
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/accounts` | List all accounts |
| `POST` | `/api/accounts` | Create a new account |
| `GET` | `/api/accounts/:id/balance` | Get current balance |
| `PATCH` | `/api/accounts/:id/block` | Block an account |
| `POST` | `/api/accounts/:id/deposit` | Deposit funds |
| `POST` | `/api/accounts/:id/withdraw` | Withdraw funds |
| `GET` | `/api/accounts/:id/statement` | Transaction statement |
| `GET` | `/health` | Health check |

The statement endpoint accepts `?from=YYYY-MM-DD&to=YYYY-MM-DD` for period filtering.

### Response shape — list endpoints

```json
{
  "data": [...],
  "count": 2
}
```

### Error response shape

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request body or query params |
| 403 | `FORBIDDEN` | Account is blocked |
| 404 | `NOT_FOUND` | Account or person not found |
| 409 | `CONFLICT` | Unique constraint violation |
| 422 | `UNPROCESSABLE` | Insufficient funds or daily limit exceeded |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

---

## API Usage Examples

### Create an account

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"personId": 1}'
```

With optional fields:

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"personId": 1, "dailyWithdrawalLimit": 500.00, "accountType": 2}'
```

### Get balance

```bash
curl http://localhost:3000/api/accounts/1/balance
```

### Deposit

```bash
curl -X POST http://localhost:3000/api/accounts/1/deposit \
  -H "Content-Type: application/json" \
  -d '{"value": 250.00}'
```

### Withdraw

```bash
curl -X POST http://localhost:3000/api/accounts/1/withdraw \
  -H "Content-Type: application/json" \
  -d '{"value": 100.00}'
```

### Block an account

```bash
curl -X PATCH http://localhost:3000/api/accounts/1/block
```

### Get full transaction statement

```bash
curl "http://localhost:3000/api/accounts/1/statement"
```

### Get statement filtered by period

```bash
curl "http://localhost:3000/api/accounts/1/statement?from=2024-01-01&to=2024-12-31"
```

---

## Running Tests

API and full-suite tests use the isolated test database on port `5433` (`account_management_db_test` from `docker compose`).

### All tests

```bash
npm test
```

Before Jest runs, `npm test` automatically applies Prisma migrations to the test database (`npm run test:migrate`, same URL as `tests/jest.setup.ts`). You can override the URL with `DATABASE_URL_TEST`. The test Postgres container must be running (`docker compose up -d`).

### Unit tests only (no database required)

```bash
npm run test:unit
```

Unit tests mock all repository calls and test service, controller, middleware, and model logic in isolation. No database connection needed. This script does **not** run migrations.

### Integration / API tests

```bash
npm run test:api
```

This runs migrations against the test DB, then executes only `tests/api`. Alternatively:

```bash
npm test -- tests/api
```

Integration tests spin up the real Express app and issue HTTP requests via Supertest against the test database. Each test cleans the database before running to guarantee isolation.

### Test coverage

```bash
npm test -- --coverage
```

Coverage reports are written to `coverage/`. Open `coverage/lcov-report/index.html` in a browser for the full line-by-line view.

---

## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled production server |
| `npm test` | Run all tests |
| `npm run test:unit` | Unit tests only |
| `npx prisma migrate deploy` | Apply migrations to the database |
| `npm run prisma:migrate` | Create and apply a new migration (dev) |
| `npm run prisma:seed` | Run the seed script |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:studio` | Open Prisma Studio GUI |

---

## Architecture

### Layered architecture

```
HTTP Request
     │
     ▼
[ Route ]  ← Zod validation middleware runs here
     │
     ▼
[ Controller ]  ← HTTP in/out only; no business logic
     │
     ▼
[ Service ]  ← Business rules, orchestration
     │
     ▼
[ Repository ]  ← Database access only
     │
     ▼
[ Prisma / PostgreSQL ]
```

### Resilience and failure handling

| Scenario | Implementation |
|---|---|
| Concurrent withdrawals | `SELECT ... FOR UPDATE` row lock inside `prisma.$transaction` |
| `activeFlag` race condition | Re-checked under lock inside the transaction, not before it |
| Decimal precision | All monetary math uses `Prisma.Decimal`; never JavaScript `number` |
| Input precision | Zod validates at most 2 decimal places via string-representation check |
| Insufficient funds | Service checks balance before write; returns `422` |
| Daily withdrawal limit | Aggregates today's withdrawals under the same row lock; returns `422` |
| Blocked account | `activeFlag` enforced inside the DB transaction; returns `403` |
| Record not found | `NotFoundError` → `404` via global error middleware |
| Duplicate document | Prisma P2002 → `409` via global error middleware |
| Validation failure | Zod middleware returns `400` with per-field detail array |
| Unhandled errors | Global error middleware logs and returns `500`; stack never exposed |
| Graceful shutdown | `SIGTERM`/`SIGINT` handlers close HTTP server then disconnect Prisma |

### Why SERIAL / integer IDs instead of UUIDs

The schema uses auto-incrementing integer PKs (`SERIAL`) because the assignment explicitly defines `accountId Numeric`, `personId Numeric`, and `transactionId Numeric` as the entity field types.

### Why `Decimal` for money

All balance, withdrawal-limit, and transaction-value fields are `Decimal(15,2)` in PostgreSQL and `Prisma.Decimal` in TypeScript. JavaScript's native `number` type is IEEE 754 floating-point — unsuitable for financial arithmetic. Every monetary operation (add, subtract, compare) goes through `Prisma.Decimal` methods.

---

## Stopping and cleaning up

Stop containers:

```bash
docker compose down
```

Stop containers and remove all data volumes:

```bash
docker compose down -v
```
