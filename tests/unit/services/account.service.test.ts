import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { accountService } from "../../../src/services/account.service";
import { accountRepository } from "../../../src/repositories/account.repository";
import { personRepository } from "../../../src/repositories/person.repository";
import {
  ForbiddenError,
  NotFoundError,
} from "../../../src/models/error.model";
import { AccountType } from "../../../src/models/account.model";

jest.mock("../../../src/repositories/account.repository");
jest.mock("../../../src/repositories/person.repository");

const mockAccountRepo = accountRepository as jest.Mocked<typeof accountRepository>;
const mockPersonRepo = personRepository as jest.Mocked<typeof personRepository>;

const mockPerson = {
  personId: 1,
  name: "John Doe",
  document: "12345678901",
  birthDate: new Date("1990-01-15"),
};

const mockAccount = {
  accountId: 1,
  personId: 1,
  balance: new Prisma.Decimal("0.00"),
  dailyWithdrawalLimit: new Prisma.Decimal("1000.00"),
  activeFlag: true,
  accountType: AccountType.CHECKING,
  createDate: new Date(),
};

describe("accountService.create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an account for an existing person", async () => {
    mockPersonRepo.findById.mockResolvedValue(mockPerson);
    mockAccountRepo.create.mockResolvedValue(mockAccount);

    const result = await accountService.create({ personId: 1 });

    expect(result).toEqual(mockAccount);
    expect(mockPersonRepo.findById).toHaveBeenCalledWith(1);
    expect(mockAccountRepo.create).toHaveBeenCalledWith({
      personId: 1,
      dailyWithdrawalLimit: 1000,
      accountType: AccountType.CHECKING,
    });
  });

  it("creates an account with custom dailyWithdrawalLimit and accountType", async () => {
    mockPersonRepo.findById.mockResolvedValue(mockPerson);
    mockAccountRepo.create.mockResolvedValue({ ...mockAccount, dailyWithdrawalLimit: new Prisma.Decimal("500.00"), accountType: AccountType.SAVINGS });

    await accountService.create({ personId: 1, dailyWithdrawalLimit: 500, accountType: AccountType.SAVINGS });

    expect(mockAccountRepo.create).toHaveBeenCalledWith({
      personId: 1,
      dailyWithdrawalLimit: 500,
      accountType: AccountType.SAVINGS,
    });
  });

  it("throws NotFoundError if person does not exist", async () => {
    mockPersonRepo.findById.mockResolvedValue(null);

    await expect(accountService.create({ personId: 99 })).rejects.toThrow(NotFoundError);
  });
});

describe("accountService.getAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns all accounts from repository", async () => {
    const accounts = [
      mockAccount,
      { ...mockAccount, accountId: 2, personId: 2, accountType: AccountType.SAVINGS },
    ];
    mockAccountRepo.findAll.mockResolvedValue(accounts);

    const result = await accountService.getAccounts();

    expect(result).toEqual(accounts);
    expect(mockAccountRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when no accounts exist", async () => {
    mockAccountRepo.findAll.mockResolvedValue([]);

    const result = await accountService.getAccounts();

    expect(result).toEqual([]);
    expect(mockAccountRepo.findAll).toHaveBeenCalledTimes(1);
  });
});

describe("accountService.getBalance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns balance view for an active account", async () => {
    mockAccountRepo.findById.mockResolvedValue(mockAccount);

    const result = await accountService.getBalance(1);

    expect(result.accountId).toBe(1);
    expect(result.balance).toBe("0.00");
    expect(result.activeFlag).toBe(true);
  });

  it("throws NotFoundError if account not found", async () => {
    mockAccountRepo.findById.mockResolvedValue(null);

    await expect(accountService.getBalance(99)).rejects.toThrow(NotFoundError);
  });
});

describe("accountService.block", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks an active account by setting activeFlag to false", async () => {
    mockAccountRepo.findById.mockResolvedValue(mockAccount);
    mockAccountRepo.setActiveFlag.mockResolvedValue({
      ...mockAccount,
      activeFlag: false,
    });

    const result = await accountService.block(1);

    expect(result.activeFlag).toBe(false);
    expect(mockAccountRepo.setActiveFlag).toHaveBeenCalledWith(1, false);
  });

  it("throws ForbiddenError if account is already blocked", async () => {
    mockAccountRepo.findById.mockResolvedValue({
      ...mockAccount,
      activeFlag: false,
    });

    await expect(accountService.block(1)).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError if account not found", async () => {
    mockAccountRepo.findById.mockResolvedValue(null);

    await expect(accountService.block(99)).rejects.toThrow(NotFoundError);
  });
});
