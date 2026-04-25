/**
 * Applies Prisma migrations to the test database.
 * Uses the same default URL as tests/jest.setup.ts (DATABASE_URL_TEST overrides).
 */
const { execSync } = require("child_process");

const databaseUrl =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@localhost:5433/account_management_db_test?schema=public";

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
