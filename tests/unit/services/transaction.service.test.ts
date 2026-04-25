import { Prisma, TransactionType } from "@prisma/client";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { transactionService } from "../../../src/services/transaction.service";
import { accountRepository } from "../../../src/repositories/account.repository";
import { transactionRepository } from "../../../src/repositories/transaction.repository";
import { ForbiddenError, NotFoundError, UnprocessableError } from "../../../src/models/error.model";
import { prisma } from "../../../src/config/prisma";

jest.mock("../../../src/repositories/account.repository");
jest.mock("../../../src/repositories/transaction.repository");
jest.mock("../../../src/config/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

const mockAccountRepo = accountRepository as jest.Mocked<typeof accountRepository>;
const mockTransactionRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockAccount = {
  accountId: 1,
  personId: 1,
  balance: new Prisma.Decimal("500.00"),
  dailyWithdrawalLimit: new Prisma.Decimal("1000.00"),
  activeFlag: true,
  accountType: 1,
  createDate: new Date(),
};

const mockTransaction = {
  transactionId: 1,
  accountId: 1,
  value: new Prisma.Decimal("100.00"),
  transactionDate: new Date(),
  transactionType: TransactionType.DEPOSIT,
};

// Builds a fake tx client that stubs the aggregate call to return zero-sum
function makeTxWithAggregate(aggregateSum: Prisma.Decimal = new Prisma.Decimal("0")) {
  const aggregateMock = jest.fn() as ReturnType<typeof jest.fn>;
  aggregateMock.mockResolvedValue({ _sum: { value: aggregateSum } });
  return {
    transaction: { aggregate: aggregateMock },
  };
}

describe("transactionService.deposit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.$transaction as ReturnType<typeof jest.fn>).mockImplementation(
      (fn: unknown) => (fn as (tx: unknown) => Promise<unknown>)({})
    );
  });

  it("deposits value and returns new balance", async () => {
    mockAccountRepo.findByIdWithLock.mockResolvedValue(mockAccount);
    mockAccountRepo.updateBalance.mockResolvedValue({
      ...mockAccount,
      balance: new Prisma.Decimal("600.00"),
    });
    mockTransactionRepo.create.mockResolvedValue(mockTransaction);

    const result = await transactionService.deposit(1, { value: 100 });

    expect(result.newBalance).toBe("600.00");
    expect(mockTransactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: TransactionType.DEPOSIT,
        accountId: 1,
      }),
      expect.anything()
    );
  });

  it("throws NotFoundError when account not found", async () => {
    mockAccountRepo.findByIdWithLock.mockResolvedValue(null);

    await expect(transactionService.deposit(99, { value: 100 })).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when account is blocked", async () => {
    mockAccountRepo.findByIdWithLock.mockResolvedValue({ ...mockAccount, activeFlag: false });

    await expect(transactionService.deposit(1, { value: 100 })).rejects.toThrow(ForbiddenError);
  });
});

describe("transactionService.withdraw", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.$transaction as ReturnType<typeof jest.fn>).mockImplementation(
      (fn: unknown) => (fn as (tx: unknown) => Promise<unknown>)(makeTxWithAggregate())
    );
  });

  it("withdraws value and returns new balance", async () => {
    mockAccountRepo.findByIdWithLock.mockResolvedValue(mockAccount);
    mockAccountRepo.updateBalance.mockResolvedValue({
      ...mockAccount,
      balance: new Prisma.Decimal("400.00"),
    });
    mockTransactionRepo.create.mockResolvedValue({
      ...mockTransaction,
      transactionType: TransactionType.WITHDRAWAL,
      value: new Prisma.Decimal("100.00"),
    });

    const result = await transactionService.withdraw(1, { value: 100 });

    expect(result.newBalance).toBe("400.00");
    expect(mockTransactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ transactionType: TransactionType.WITHDRAWAL }),
      expect.anything()
    );
  });

  it("throws UnprocessableError when balance is insufficient", async () => {
    mockAccountRepo.findByIdWithLock.mockResolvedValue({
      ...mockAccount,
      balance: new Prisma.Decimal("50.00"),
    });

    await expect(transactionService.withdraw(1, { value: 200 })).rejects.toThrow(UnprocessableError);
  });

  it("throws UnprocessableError when aggregate daily limit is exceeded", async () => {
    // Already withdrew 800 today; trying to withdraw 300 more exceeds 1000 limit
    (mockPrisma.$transaction as ReturnType<typeof jest.fn>).mockImplementation(
      (fn: unknown) =>
        (fn as (tx: unknown) => Promise<unknown>)(
          makeTxWithAggregate(new Prisma.Decimal("800.00"))
        )
    );
    mockAccountRepo.findByIdWithLock.mockResolvedValue({
      ...mockAccount,
      balance: new Prisma.Decimal("5000.00"),
      dailyWithdrawalLimit: new Prisma.Decimal("1000.00"),
    });

    await expect(transactionService.withdraw(1, { value: 300 })).rejects.toThrow(UnprocessableError);
  });

  it("throws ForbiddenError when account is blocked", async () => {
    mockAccountRepo.findByIdWithLock.mockResolvedValue({ ...mockAccount, activeFlag: false });

    await expect(transactionService.withdraw(1, { value: 50 })).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when account not found", async () => {
    mockAccountRepo.findByIdWithLock.mockResolvedValue(null);

    await expect(transactionService.withdraw(99, { value: 50 })).rejects.toThrow(NotFoundError);
  });
});

describe("transactionService.getStatement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns transactions for an account", async () => {
    mockAccountRepo.findById.mockResolvedValue(mockAccount);
    mockTransactionRepo.findByAccountId.mockResolvedValue([mockTransaction]);

    const result = await transactionService.getStatement(1, {});

    expect(result).toHaveLength(1);
    expect(mockTransactionRepo.findByAccountId).toHaveBeenCalledWith({
      accountId: 1,
      from: undefined,
      to: undefined,
    });
  });

  it("filters by period when from/to are provided", async () => {
    mockAccountRepo.findById.mockResolvedValue(mockAccount);
    mockTransactionRepo.findByAccountId.mockResolvedValue([]);

    await transactionService.getStatement(
      1,
      { from: "2024-01-01", to: "2024-12-31" }
    );

    expect(mockTransactionRepo.findByAccountId).toHaveBeenCalledWith({
      accountId: 1,
      from: new Date("2024-01-01"),
      to: new Date("2024-12-31"),
    });
  });

  it("throws NotFoundError when account not found", async () => {
    mockAccountRepo.findById.mockResolvedValue(null);

    await expect(transactionService.getStatement(99, {})).rejects.toThrow(NotFoundError);
  });
});
