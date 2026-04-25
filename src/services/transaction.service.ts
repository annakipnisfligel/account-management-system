import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ForbiddenError, NotFoundError, UnprocessableError } from "../models/error.model";
import { StatementQueryInput } from "../models/account.model";
import {
  TransactionAmountInput,
  TransactionModel,
  TransactionResult,
} from "../models/transaction.model";
import { accountRepository } from "../repositories/account.repository";
import { transactionRepository } from "../repositories/transaction.repository";

export const transactionService = {
  // Deposit money into an account
  async deposit(
    accountId: number,
    input: TransactionAmountInput
  ): Promise<TransactionResult> {
    return prisma.$transaction(async (tx) => {
      const account = await accountRepository.findByIdWithLock(accountId, tx);
      if (!account) throw new NotFoundError("Account", String(accountId));

      // Re-check activeFlag under lock to eliminate race conditions
      if (!account.activeFlag) {
        throw new ForbiddenError("Account is blocked. No transactions are allowed.");
      }

      // Get the value of the transaction
      const value = new Prisma.Decimal(input.value);

      // Update the balance of the account
      const newBalance = account.balance.add(value);

      await accountRepository.updateBalance(accountId, newBalance, tx);

      // Create a new transaction
      const transaction = await transactionRepository.create(
        {
          accountId,
          value,
          transactionType: TransactionType.DEPOSIT,
        },
        tx
      );

      return { transaction, newBalance: newBalance.toFixed(2) };
    });
  },

  // Withdraw money from an account
  async withdraw(
    accountId: number,
    input: TransactionAmountInput
  ): Promise<TransactionResult> {
    return prisma.$transaction(async (tx) => {
      const account = await accountRepository.findByIdWithLock(accountId, tx);
      if (!account) throw new NotFoundError("Account", String(accountId));

      // Re-check activeFlag under lock to eliminate race conditions
      if (!account.activeFlag) {
        throw new ForbiddenError("Account is blocked. No transactions are allowed.");
      }

      // Get the value of the transaction
      const value = new Prisma.Decimal(input.value);

      // Check if the account has sufficient funds
      if (account.balance.lessThan(value)) {
        throw new UnprocessableError("Insufficient funds");
      }

      // Check if the daily withdrawal limit is set
      if (account.dailyWithdrawalLimit.greaterThan(0)) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Get the aggregated daily withdrawal limit
        const aggregate = await tx.transaction.aggregate({
          where: {
            accountId,
            transactionType: TransactionType.WITHDRAWAL,
            transactionDate: { gte: todayStart },
          },
          _sum: { value: true },
        });

        // Get the already withdrawn amount
        const alreadyWithdrawn =
          aggregate._sum.value ?? new Prisma.Decimal(0);

        // Check if the aggregated daily withdrawal limit is exceeded
        if (alreadyWithdrawn.add(value).greaterThan(account.dailyWithdrawalLimit)) {
          throw new UnprocessableError(
            `Daily withdrawal limit of ${account.dailyWithdrawalLimit.toFixed(2)} exceeded`
          );
        }
      }

      // Update the balance of the account
      const newBalance = account.balance.sub(value);

      await accountRepository.updateBalance(accountId, newBalance, tx);

      // Create a new transaction
      const transaction = await transactionRepository.create(
        {
          accountId,
          value,
          transactionType: TransactionType.WITHDRAWAL,
        },
        tx
      );

      return { transaction, newBalance: newBalance.toFixed(2) };
    });
  },

  // Get the statement for an account
  // Returns the transactions for an account within a given date range (if provided)
  async getStatement(
    accountId: number,
    query: StatementQueryInput
  ): Promise<TransactionModel[]> {
    const account = await accountRepository.findById(accountId);
    if (!account) throw new NotFoundError("Account", String(accountId));

    return transactionRepository.findByAccountId({
      accountId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  },
};
