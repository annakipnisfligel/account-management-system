import { Prisma, TransactionType } from "@prisma/client";

export interface TransactionModel {
  transactionId: number;
  accountId: number;
  value: Prisma.Decimal;
  transactionDate: Date;
  transactionType: TransactionType;
}

export interface TransactionAmountInput {
  value: number;
}

export interface CreateTransactionData {
  accountId: number;
  value: Prisma.Decimal;
  transactionType: TransactionType;
}

export interface StatementFilter {
  accountId: number;
  from?: Date;
  to?: Date;
}

export interface TransactionResult {
  transaction: TransactionModel;
  newBalance: string;
}
