import { Prisma } from "@prisma/client";

export enum AccountType {
  CHECKING = 1,
  SAVINGS = 2,
}

export interface AccountModel {
  accountId: number;
  personId: number;
  balance: Prisma.Decimal;
  dailyWithdrawalLimit: Prisma.Decimal;
  activeFlag: boolean;
  accountType: AccountType;
  createDate: Date;
}

export interface CreateAccountInput {
  personId: number;
  dailyWithdrawalLimit?: number;
  accountType?: AccountType;
}

export interface CreateAccountRepositoryData {
  personId: number;
  dailyWithdrawalLimit: number;
  accountType: AccountType;
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
