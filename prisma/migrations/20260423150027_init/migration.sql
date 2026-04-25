-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "persons" (
    "person_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("person_id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "account_id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "daily_withdrawal_limit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "active_flag" BOOLEAN NOT NULL DEFAULT true,
    "account_type" INTEGER NOT NULL DEFAULT 1,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "transaction_id" SERIAL NOT NULL,
    "account_id" INTEGER NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_type" "TransactionType" NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- Seed required initial person (assignment requirement)
INSERT INTO "persons" ("name", "document", "birth_date")
VALUES ('Default Person', '00000000001', DATE '1990-01-01');

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("person_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Performance: Optimized lookups for transaction statements
CREATE INDEX "transactions_account_id_date_idx" ON "transactions"("account_id", "transaction_date");
