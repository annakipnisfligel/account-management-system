import { Prisma } from "@prisma/client";
import { describe, expect, it, jest } from "@jest/globals";
import { AccountType } from "../../../src/models/account.model";
 
jest.mock("../../../src/config/prisma", () => ({
  prisma: {
    account: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
 
import { prisma } from "../../../src/config/prisma";
import { accountRepository } from "../../../src/repositories/account.repository";
 
const mockPrisma = prisma as unknown as {
  account: {
    create: ReturnType<typeof jest.fn>;
    findMany: ReturnType<typeof jest.fn>;
    findUnique: ReturnType<typeof jest.fn>;
    update: ReturnType<typeof jest.fn>;
  };
};
 
describe("accountRepository", () => {
  it("creates account using prisma.account.create", async () => {
    const createDate = new Date("2026-01-01T00:00:00.000Z");
    const created = {
      accountId: 1,
      personId: 2,
      balance: new Prisma.Decimal("0"),
      dailyWithdrawalLimit: new Prisma.Decimal("1000.00"),
      activeFlag: true,
      accountType: AccountType.CHECKING,
      createDate,
    };
    mockPrisma.account.create.mockResolvedValue(created);
 
    const result = await accountRepository.create({
      personId: 2,
      dailyWithdrawalLimit: 1000,
      accountType: AccountType.CHECKING,
    });
 
    expect(mockPrisma.account.create).toHaveBeenCalledWith({
      data: {
        personId: 2,
        dailyWithdrawalLimit: 1000,
        accountType: AccountType.CHECKING,
      },
    });
    expect(result).toEqual(created);
  });
 
  it("finds all accounts ordered by accountId asc", async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);

    const result = await accountRepository.findAll();

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      orderBy: { accountId: "asc" },
    });
    expect(result).toEqual([]);
  });
 
  it("finds account by id", async () => {
    mockPrisma.account.findUnique.mockResolvedValue(null);
 
    await accountRepository.findById(10);
 
    expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
      where: { accountId: 10 },
    });
  });
 
  it("updates active flag by account id", async () => {
    const updated = { accountId: 3, activeFlag: false };
    mockPrisma.account.update.mockResolvedValue(updated);
 
    await accountRepository.setActiveFlag(3, false);
 
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { accountId: 3 },
      data: { activeFlag: false },
    });
  });
 
  it("updates balance using default prisma client when tx is not provided", async () => {
    const balance = new Prisma.Decimal("200.00");
    mockPrisma.account.update.mockResolvedValue({ accountId: 3, balance });
 
    await accountRepository.updateBalance(3, balance);
 
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { accountId: 3 },
      data: { balance },
    });
  });
 
  it("updates balance using transaction client when tx is provided", async () => {
    const balance = new Prisma.Decimal("150.00");
    const txUpdate = jest.fn() as ReturnType<typeof jest.fn>;
    txUpdate.mockResolvedValue({ accountId: 5, balance });
    const tx = {
      account: {
        update: txUpdate,
      },
    } as unknown as Prisma.TransactionClient;
 
    await accountRepository.updateBalance(5, balance, tx);
 
    expect(txUpdate).toHaveBeenCalledWith({
      where: { accountId: 5 },
      data: { balance },
    });
    expect(mockPrisma.account.update).not.toHaveBeenCalledWith({
      where: { accountId: 5 },
      data: { balance },
    });
  });
});

describe("accountRepository.findByIdWithLock", () => {
  it("returns null when no account is found", async () => {
    const queryRaw = jest.fn(async () => [] as never[]);
    const tx = {
      $queryRaw: queryRaw,
    } as unknown as Prisma.TransactionClient;

    const result = await accountRepository.findByIdWithLock(1, tx);

    expect(result).toBeNull();
  });

  it("maps locked row to AccountModel", async () => {
    const rowDate = new Date("2026-01-01T00:00:00.000Z");
    const row = {
      accountId: 10,
      personId: 20,
      balance: new Prisma.Decimal("100.50"),
      dailyWithdrawalLimit: new Prisma.Decimal("500.00"),
      activeFlag: true,
      accountType: AccountType.CHECKING,
      createDate: rowDate,
    };
    const queryRaw = jest.fn(async () => [
      row,
    ]);
    const tx = {
      $queryRaw: queryRaw,
    } as unknown as Prisma.TransactionClient;

    const result = await accountRepository.findByIdWithLock(10, tx);

    expect(result).toEqual(row);
  });
});
