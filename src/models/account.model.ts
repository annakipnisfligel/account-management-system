import { Prisma } from "@prisma/client";

export interface AccountModel {
  accountId: number;
  personId: number;
  balance: Prisma.Decimal;
  dailyWithdrawalLimit: Prisma.Decimal;
  activeFlag: boolean;
  accountType: number;
  createDate: Date;
}

export interface CreateAccountInput {
  personId: number;
  dailyWithdrawalLimit?: number;
  accountType?: number;
}

export interface CreateAccountRepositoryData {
  personId: number;
  dailyWithdrawalLimit: number;
  accountType: number;
}

export interface AccountBalanceView {
  accountId: number;
  balance: string;
  activeFlag: boolean;
}

export interface StatementQueryInput {
  from?: string;
  to?: string;
}
