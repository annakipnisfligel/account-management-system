import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../../../src/models/error.model";
import { errorMiddleware } from "../../../src/middlewares/error.middleware";

function createResponseMock(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
}

function createKnownPrismaError(
  code: string,
  meta?: Record<string, unknown>
): Prisma.PrismaClientKnownRequestError {
  const err = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype
  ) as Prisma.PrismaClientKnownRequestError;
  Object.assign(err, { code, meta });
  return err;
}

function createValidationPrismaError(): Prisma.PrismaClientValidationError {
  return Object.create(
    Prisma.PrismaClientValidationError.prototype
  ) as Prisma.PrismaClientValidationError;
}

describe("errorMiddleware", () => {
  const req = {} as Request;
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns app error status and code", () => {
    const res = createResponseMock();
    const err = new AppError(422, "bad input", "UNPROCESSABLE");

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: "bad input",
      code: "UNPROCESSABLE",
    });
  });

  it("handles Prisma P2025 as not found", () => {
    const res = createResponseMock();
    const err = createKnownPrismaError("P2025");

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Record not found",
      code: "NOT_FOUND",
    });
  });

  it("handles Prisma P2002 unique constraint with target fields", () => {
    const res = createResponseMock();
    const err = createKnownPrismaError("P2002", { target: ["document"] });

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "A record with the provided value already exists",
      code: "CONFLICT",
    });
  });

  it("handles Prisma P2003 as foreign key violation", () => {
    const res = createResponseMock();
    const err = createKnownPrismaError("P2003");

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Foreign key constraint failed",
      code: "FOREIGN_KEY_VIOLATION",
    });
  });

  it("handles Prisma validation errors", () => {
    const res = createResponseMock();
    const err = createValidationPrismaError();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid data provided",
      code: "VALIDATION_ERROR",
    });
  });

  it("returns 500 for unknown errors", () => {
    const res = createResponseMock();
    const err = new Error("unexpected");
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    errorMiddleware(err, req, res, next);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[Unhandled Error]", err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "An unexpected error occurred",
      code: "INTERNAL_SERVER_ERROR",
    });

    consoleErrorSpy.mockRestore();
  });
});
