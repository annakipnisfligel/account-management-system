import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AccountModel, CreateAccountRepositoryData } from "../models/account.model";

export const accountRepository = {
  // Create a new account
  async create(data: CreateAccountRepositoryData): Promise<AccountModel> {
    return prisma.account.create({ data });
  },

  // Find all accounts
  async findAll(): Promise<AccountModel[]> {
    return prisma.account.findMany({
      orderBy: { accountId: "asc" },
    });
  },

  // Find an account by id
  async findById(accountId: number): Promise<AccountModel | null> {
    return prisma.account.findUnique({ where: { accountId } });
  },

  // Set the active flag for an account
  async setActiveFlag(accountId: number, activeFlag: boolean): Promise<AccountModel> {
    return prisma.account.update({ where: { accountId }, data: { activeFlag } });
  },

  // Update the balance for an account
  async updateBalance(
    accountId: number,
    balance: Prisma.Decimal,
    tx?: Prisma.TransactionClient
  ): Promise<AccountModel> {
    const client = tx ?? prisma;
    return client.account.update({ where: { accountId }, data: { balance } });
  },

  // Find an account by id with lock
  // Used to prevent race conditions when updating the balance
  async findByIdWithLock(
    accountId: number,
    tx: Prisma.TransactionClient
  ): Promise<AccountModel | null> {
    const [account] = await tx.$queryRaw<AccountModel[]>`
      SELECT
        account_id AS "accountId",
        person_id AS "personId",
        balance,
        daily_withdrawal_limit AS "dailyWithdrawalLimit",
        active_flag AS "activeFlag",
        account_type AS "accountType",
        create_date AS "createDate"
      FROM accounts
      WHERE account_id = ${accountId}
      FOR UPDATE
    `;

    return account ?? null;
  },
};
