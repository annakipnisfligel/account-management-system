import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import { accountController } from "../../../src/controllers/account.controller";
import { accountService } from "../../../src/services/account.service";

jest.mock("../../../src/services/account.service");

const mockAccountService = accountService as jest.Mocked<typeof accountService>;

const mockAccounts = [
  {
    accountId: 1,
    personId: 1,
    balance: new Prisma.Decimal("100.00"),
    dailyWithdrawalLimit: new Prisma.Decimal("1000.00"),
    activeFlag: true,
    accountType: 1,
    createDate: new Date(),
  },
  {
    accountId: 2,
    personId: 2,
    balance: new Prisma.Decimal("250.00"),
    dailyWithdrawalLimit: new Prisma.Decimal("500.00"),
    activeFlag: true,
    accountType: 2,
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
