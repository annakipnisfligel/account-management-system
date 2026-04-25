import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import { transactionController } from "../../../src/controllers/transaction.controller";
import { transactionService } from "../../../src/services/transaction.service";

jest.mock("../../../src/services/transaction.service");

const mockTransactionService =
  transactionService as jest.Mocked<typeof transactionService>;

describe("transactionController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deposit", () => {
    it("calls deposit service and returns result", async () => {
      const req = {
        params: { id: "42" },
        body: { value: 100 },
      } as unknown as Request;
      const json = jest.fn();
      const res = { json } as unknown as Response;
      const next = jest.fn() as NextFunction;
      const result = {
        transaction: { transactionId: 1 },
        newBalance: "300.00",
      };

      mockTransactionService.deposit.mockResolvedValue(
        result as Awaited<ReturnType<typeof transactionService.deposit>>
      );

      await transactionController.deposit(req, res, next);

      expect(mockTransactionService.deposit).toHaveBeenCalledWith(42, { value: 100 });
      expect(json).toHaveBeenCalledWith({ data: result });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 400 for non-integer account id", async () => {
      const req = {
        params: { id: "abc" },
        body: { value: 100 },
      } as unknown as Request;
      const json = jest.fn();
      const status = jest.fn().mockReturnThis();
      const res = { json, status } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await transactionController.deposit(req, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(mockTransactionService.deposit).not.toHaveBeenCalled();
    });

    it("calls next when deposit service throws", async () => {
      const req = {
        params: { id: "42" },
        body: { value: 100 },
      } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;
      const error = new Error("blocked");

      mockTransactionService.deposit.mockRejectedValue(error);

      await transactionController.deposit(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("withdraw", () => {
    it("calls withdraw service and returns result", async () => {
      const req = {
        params: { id: "7" },
        body: { value: 50 },
      } as unknown as Request;
      const json = jest.fn();
      const res = { json } as unknown as Response;
      const next = jest.fn() as NextFunction;
      const result = {
        transaction: { transactionId: 2 },
        newBalance: "150.00",
      };

      mockTransactionService.withdraw.mockResolvedValue(
        result as Awaited<ReturnType<typeof transactionService.withdraw>>
      );

      await transactionController.withdraw(req, res, next);

      expect(mockTransactionService.withdraw).toHaveBeenCalledWith(7, { value: 50 });
      expect(json).toHaveBeenCalledWith({ data: result });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 400 for non-integer account id", async () => {
      const req = {
        params: { id: "x" },
        body: { value: 50 },
      } as unknown as Request;
      const json = jest.fn();
      const status = jest.fn().mockReturnThis();
      const res = { json, status } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await transactionController.withdraw(req, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(mockTransactionService.withdraw).not.toHaveBeenCalled();
    });

    it("calls next when withdraw service throws", async () => {
      const req = {
        params: { id: "7" },
        body: { value: 50 },
      } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;
      const error = new Error("insufficient funds");

      mockTransactionService.withdraw.mockRejectedValue(error);

      await transactionController.withdraw(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
