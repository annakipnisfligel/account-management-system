import { Prisma, TransactionType } from "@prisma/client";
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../src/config/prisma", () => ({
  prisma: {
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma";
import { transactionRepository } from "../../../src/repositories/transaction.repository";

const mockPrisma = prisma as unknown as {
  transaction: {
    create: ReturnType<typeof jest.fn>;
    findMany: ReturnType<typeof jest.fn>;
  };
};

describe("transactionRepository", () => {
  it("uses default prisma client when tx is not provided", async () => {
    const txRecord = {
      transactionId: 1,
      accountId: 1,
      value: "10.00",
      transactionDate: new Date(),
      transactionType: "DEPOSIT",
    };
    mockPrisma.transaction.create.mockImplementation(async () => txRecord);

    await transactionRepository.create({
      accountId: 1,
      value: new Prisma.Decimal("10.00"),
      transactionType: TransactionType.DEPOSIT,
    });

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
      data: {
        accountId: 1,
        value: new Prisma.Decimal("10.00"),
        transactionType: TransactionType.DEPOSIT,
      },
    });
  });

  it("applies from/to filters in statement query", async () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-01-31");
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await transactionRepository.findByAccountId({ accountId: 9, from, to });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        accountId: 9,
        transactionDate: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { transactionDate: "asc" },
    });
  });

  it("uses transaction client when provided to create", async () => {
    const txCreate = jest.fn() as ReturnType<typeof jest.fn>;
    txCreate.mockResolvedValue({
      transactionId: 2,
      accountId: 7,
      value: "20.00",
      transactionDate: new Date("2026-02-01T00:00:00.000Z"),
      transactionType: TransactionType.WITHDRAWAL,
    });
    const tx = {
      transaction: {
        create: txCreate,
      },
    } as unknown as Prisma.TransactionClient;

    await transactionRepository.create(
      {
        accountId: 7,
        value: new Prisma.Decimal("20.00"),
        transactionType: TransactionType.WITHDRAWAL,
      },
      tx
    );

    expect(txCreate).toHaveBeenCalledWith({
      data: {
        accountId: 7,
        value: new Prisma.Decimal("20.00"),
        transactionType: TransactionType.WITHDRAWAL,
      },
    });
  });

  it("queries by account id without date filter when from and to are absent", async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await transactionRepository.findByAccountId({ accountId: 15 });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
      where: { accountId: 15 },
      orderBy: { transactionDate: "asc" },
    });
    expect(result).toEqual([]);
  });

  it("applies only from filter when to is absent", async () => {
    const from = new Date("2026-03-01T00:00:00.000Z");
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await transactionRepository.findByAccountId({ accountId: 12, from });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        accountId: 12,
        transactionDate: { gte: from },
      },
      orderBy: { transactionDate: "asc" },
    });
  });

  it("applies only to filter when from is absent", async () => {
    const to = new Date("2026-03-31T23:59:59.000Z");
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await transactionRepository.findByAccountId({ accountId: 12, to });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        accountId: 12,
        transactionDate: { lte: to },
      },
      orderBy: { transactionDate: "asc" },
    });
  });
});
