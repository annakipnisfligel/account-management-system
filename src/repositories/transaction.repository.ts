import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import {
  CreateTransactionData,
  StatementFilter,
  TransactionModel,
} from "../models/transaction.model";

export const transactionRepository = {
  // Create a new transaction
  async create(
    data: CreateTransactionData,
    tx?: Prisma.TransactionClient
  ): Promise<TransactionModel> {
    const client = tx ?? prisma;
    return client.transaction.create({ data });
  },

  // Find transactions by account id
  async findByAccountId(
    filter: StatementFilter
  ): Promise<TransactionModel[]> {
    const { accountId, from, to } = filter;

    const where: Prisma.TransactionWhereInput = { accountId };

    // Add date filters if provided
    if (from || to) {
      where.transactionDate = {};
      if (from) {
        where.transactionDate.gte = from;
      }
      if (to) {
        where.transactionDate.lte = to;
      }
    }

    return prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: "asc" },
    });
  },
};
