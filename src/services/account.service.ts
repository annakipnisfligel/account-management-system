import { ForbiddenError, NotFoundError } from "../models/error.model";
import {
  AccountBalanceView,
  AccountModel,
  CreateAccountInput,
} from "../models/account.model";
import { accountRepository } from "../repositories/account.repository";
import { personRepository } from "../repositories/person.repository";

export const accountService = {
  // Create a new account
  async create(input: CreateAccountInput): Promise<AccountModel> {
    const person = await personRepository.findById(input.personId);
    if (!person) {
      throw new NotFoundError("Person", String(input.personId));
    }
    
    return accountRepository.create({
      personId: input.personId,
      dailyWithdrawalLimit: input.dailyWithdrawalLimit ?? 1000,
      accountType: input.accountType ?? 1,
    });
  },

  // Get all accounts
  async getAccounts(): Promise<AccountModel[]> {
    return accountRepository.findAll();
  },

  // Get the balance for an account
  async getBalance(accountId: number): Promise<AccountBalanceView> {
    const account = await accountRepository.findById(accountId);
    if (!account) throw new NotFoundError("Account", String(accountId));

    return {
      accountId: account.accountId,
      balance: account.balance.toFixed(2),
      activeFlag: account.activeFlag,
    };
  },

  // Block an account
  async block(accountId: number): Promise<AccountModel> {
    const account = await accountRepository.findById(accountId);
    if (!account) throw new NotFoundError("Account", String(accountId));

    // Check if the account is already blocked
    if (!account.activeFlag) {
      throw new ForbiddenError("Account is already blocked");
    }

    return accountRepository.setActiveFlag(accountId, false);
  },
};
