import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import {
  validateBody,
  validateCreateAccount,
  validateQuery,
  validateStatementQuery,
  validateTransactionAmount,
} from "../../../src/middlewares/validate.middleware";

function createResponseMock(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
  return res;
}

describe("validate.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateBody", () => {
    it("calls next and assigns parsed body for valid payload", () => {
      const middleware = validateBody(z.object({ name: z.string() }));
      const req = { body: { name: "Alice" } } as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      middleware(req, res, next);

      expect(req.body).toEqual({ name: "Alice" });
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns 400 with details for invalid payload", () => {
      const middleware = validateBody(z.object({ name: z.string().min(2) }));
      const req = { body: { name: "" } } as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({
              field: "name",
            }),
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("validateQuery", () => {
    it("calls next and assigns parsed query for valid input", () => {
      const middleware = validateQuery(
        z.object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
      );
      const req = { query: { from: "2026-01-01" } } as unknown as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      middleware(req, res, next);

      expect(req.query).toEqual({ from: "2026-01-01" });
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns 400 when query validation fails", () => {
      const middleware = validateQuery(
        z.object({
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
      );
      const req = { query: { from: "abc" } } as unknown as Parameters<
        typeof middleware
      >[0];
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("specific validators", () => {
    it("validateCreateAccount accepts valid payload", () => {
      const req = {
        body: {
          personId: 1,
          dailyWithdrawalLimit: 100.5,
          accountType: 2,
        },
      } as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      validateCreateAccount(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("validateCreateAccount rejects missing personId", () => {
      const req = { body: {} } as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      validateCreateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "VALIDATION_ERROR" })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("validateCreateAccount rejects non-integer personId", () => {
      const req = { body: { personId: 1.5 } } as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      validateCreateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({ field: "personId" }),
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("validateCreateAccount rejects invalid accountType enum value", () => {
      const req = { body: { personId: 1, accountType: 99 } } as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      validateCreateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({ field: "accountType" }),
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("validateCreateAccount rejects dailyWithdrawalLimit with more than 2 decimal places", () => {
      const req = { body: { personId: 1, dailyWithdrawalLimit: 10.123 } } as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      validateCreateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({ field: "dailyWithdrawalLimit" }),
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("validateCreateAccount rejects negative dailyWithdrawalLimit", () => {
      const req = { body: { personId: 1, dailyWithdrawalLimit: -50 } } as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      validateCreateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({ field: "dailyWithdrawalLimit" }),
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("validateTransactionAmount rejects non-positive values", () => {
      const req = { body: { value: 0 } } as Request;
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      validateTransactionAmount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("validateStatementQuery accepts YYYY-MM-DD and rejects date-time", () => {
      const validReq = {
        query: { from: "2026-02-02", to: "2026-02-03" },
      } as unknown as Parameters<typeof validateStatementQuery>[0];
      const invalidReq = {
        query: { from: "2026-02-02T10:00:00.000Z" },
      } as unknown as Parameters<typeof validateStatementQuery>[0];
      const validRes = createResponseMock();
      const invalidRes = createResponseMock();
      const validNext = jest.fn() as NextFunction;
      const invalidNext = jest.fn() as NextFunction;

      validateStatementQuery(validReq, validRes, validNext);
      validateStatementQuery(invalidReq, invalidRes, invalidNext);

      expect(validNext).toHaveBeenCalledTimes(1);
      expect(validRes.status).not.toHaveBeenCalled();

      expect(invalidRes.status).toHaveBeenCalledWith(400);
      expect(invalidRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({
              field: "from",
              message: "must be an ISO 8601 date in YYYY-MM-DD format",
            }),
          ]),
        })
      );
      expect(invalidNext).not.toHaveBeenCalled();
    });

    it("validateStatementQuery rejects from date after to date", () => {
      const req = {
        query: { from: "2026-12-31", to: "2026-01-01" },
      } as unknown as Parameters<typeof validateStatementQuery>[0];
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      validateStatementQuery(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({
              field: "from",
              message: "from date must be less than or equal to to date",
            }),
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("validateStatementQuery accepts from date equal to to date", () => {
      const req = {
        query: { from: "2026-06-15", to: "2026-06-15" },
      } as unknown as Parameters<typeof validateStatementQuery>[0];
      const res = createResponseMock();
      const next = jest.fn() as NextFunction;

      validateStatementQuery(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
