import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../models/error.model";

interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code ?? "APP_ERROR",
    } satisfies ErrorResponse);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({
        error: "Record not found",
        code: "NOT_FOUND",
      } satisfies ErrorResponse);
      return;
    }

    if (err.code === "P2002") {
      res.status(409).json({
        error: "A record with the provided value already exists",
        code: "CONFLICT",
      } satisfies ErrorResponse);
      return;
    }

    if (err.code === "P2003") {
      res.status(400).json({
        error: "Foreign key constraint failed",
        code: "FOREIGN_KEY_VIOLATION",
      } satisfies ErrorResponse);
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: "Invalid data provided",
      code: "VALIDATION_ERROR",
    } satisfies ErrorResponse);
    return;
  }

  console.error("[Unhandled Error]", err);

  res.status(500).json({
    error: "An unexpected error occurred",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies ErrorResponse);
}
