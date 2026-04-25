import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import { accountController } from "../../../src/controllers/account.controller";
import { accountService } from "../../../src/services/account.service";
import { transactionService } from "../../../src/services/transaction.service";
import { AccountType } from "../../../src/models/account.model";

jest.mock("../../../src/services/account.service");
jest.mock("../../../src/services/transaction.service");

const mockAccountService = accountService as jest.Mocked<typeof accountService>;
const mockTransactionService = transactionService as jest.Mocked<typeof transactionService>;

const mockAccounts = [
  {
    accountId: 1,
    personId: 1,
    balance: new Prisma.Decimal("100.00"),
    dailyWithdrawalLimit: new Prisma.Decimal("1000.00"),
    activeFlag: true,
    accountType: AccountType.CHECKING,
    createDate: new Date(),
  },
  {
    accountId: 2,
    personId: 2,
    balance: new Prisma.Decimal("250.00"),
    dailyWithdrawalLimit: new Prisma.Decimal("500.00"),
    activeFlag: true,
    accountType: AccountType.SAVINGS,
    createDate: new Date(),
  },
];

describe("accountController.getAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responds with accounts and count", async () => {
    const req = {} as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    mockAccountService.getAccounts.mockResolvedValue(mockAccounts);

    await accountController.getAccounts(req, res, next);

    expect(mockAccountService.getAccounts).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledWith({ data: mockAccounts, count: 2 });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when service throws", async () => {
    const req = {} as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const error = new Error("failed");

    mockAccountService.getAccounts.mockRejectedValue(error);

    await accountController.getAccounts(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("accountController.create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an account and returns 201 with data", async () => {
    const account = mockAccounts[0];
    const req = { body: { personId: 1 } } as Request;
    const status = jest.fn().mockReturnThis() as jest.Mock;
    const json = jest.fn();
    const res = { status, json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    mockAccountService.create.mockResolvedValue(account);

    await accountController.create(req, res, next);

    expect(mockAccountService.create).toHaveBeenCalledWith({ personId: 1 });
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({ data: account });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next(err) when service throws", async () => {
    const req = { body: { personId: 999 } } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const error = new Error("Person not found");

    mockAccountService.create.mockRejectedValue(error);

    await accountController.create(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("accountController.getBalance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with balance data for a valid account id", async () => {
    const balanceData = { accountId: 1, balance: new Prisma.Decimal("100.00"), activeFlag: true };
    const req = { params: { id: "1" } } as unknown as Request;
    const json = jest.fn();
    const res = { json, status: jest.fn().mockReturnThis() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    mockAccountService.getBalance.mockResolvedValue(balanceData as any);

    await accountController.getBalance(req, res, next);

    expect(mockAccountService.getBalance).toHaveBeenCalledWith(1);
    expect(json).toHaveBeenCalledWith({ data: balanceData });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-integer id (e.g. 'abc')", async () => {
    const req = { params: { id: "abc" } } as unknown as Request;
    const status = jest.fn().mockReturnThis() as jest.Mock;
    const json = jest.fn();
    const res = { status, json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await accountController.getBalance(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "VALIDATION_ERROR" })
    );
    expect(mockAccountService.getBalance).not.toHaveBeenCalled();
  });

  it("returns 400 for id zero", async () => {
    const req = { params: { id: "0" } } as unknown as Request;
    const status = jest.fn().mockReturnThis() as jest.Mock;
    const json = jest.fn();
    const res = { status, json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await accountController.getBalance(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(mockAccountService.getBalance).not.toHaveBeenCalled();
  });

  it("calls next(err) when service throws", async () => {
    const req = { params: { id: "1" } } as unknown as Request;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const error = new Error("Not found");

    mockAccountService.getBalance.mockRejectedValue(error);

    await accountController.getBalance(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("accountController.block", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with blocked account data", async () => {
    const blocked = { ...mockAccounts[0], activeFlag: false };
    const req = { params: { id: "1" } } as unknown as Request;
    const json = jest.fn();
    const res = { json, status: jest.fn().mockReturnThis() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    mockAccountService.block.mockResolvedValue(blocked);

    await accountController.block(req, res, next);

    expect(mockAccountService.block).toHaveBeenCalledWith(1);
    expect(json).toHaveBeenCalledWith({ data: blocked });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-integer id", async () => {
    const req = { params: { id: "abc" } } as unknown as Request;
    const status = jest.fn().mockReturnThis() as jest.Mock;
    const json = jest.fn();
    const res = { status, json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await accountController.block(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "VALIDATION_ERROR" })
    );
    expect(mockAccountService.block).not.toHaveBeenCalled();
  });

  it("calls next(err) on service error", async () => {
    const req = { params: { id: "1" } } as unknown as Request;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const error = new Error("Already blocked");

    mockAccountService.block.mockRejectedValue(error);

    await accountController.block(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("accountController.getStatement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with transactions and count", async () => {
    const transactions = [
      { transactionId: 1, accountId: 1, value: new Prisma.Decimal("50.00"), transactionType: "DEPOSIT", transactionDate: new Date() },
    ];
    const req = { params: { id: "1" }, query: {} } as unknown as Parameters<typeof accountController.getStatement>[0];
    const json = jest.fn();
    const res = { json, status: jest.fn().mockReturnThis() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    mockTransactionService.getStatement.mockResolvedValue(transactions as any);

    await accountController.getStatement(req, res, next);

    expect(mockTransactionService.getStatement).toHaveBeenCalledWith(1, {});
    expect(json).toHaveBeenCalledWith({ data: transactions, count: 1 });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-integer id", async () => {
    const req = { params: { id: "abc" }, query: {} } as unknown as Parameters<typeof accountController.getStatement>[0];
    const status = jest.fn().mockReturnThis() as jest.Mock;
    const json = jest.fn();
    const res = { status, json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await accountController.getStatement(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "VALIDATION_ERROR" })
    );
    expect(mockTransactionService.getStatement).not.toHaveBeenCalled();
  });

  it("calls next(err) when service throws", async () => {
    const req = { params: { id: "1" }, query: {} } as unknown as Parameters<typeof accountController.getStatement>[0];
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const error = new Error("Account not found");

    mockTransactionService.getStatement.mockRejectedValue(error);

    await accountController.getStatement(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
