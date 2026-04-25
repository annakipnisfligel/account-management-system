import { NextFunction, Request, Response } from "express";
import { z, ZodSchema } from "zod";
import {
  AccountType,
  CreateAccountInput,
  StatementQueryInput,
} from "../models/account.model";
import { TransactionAmountInput } from "../models/transaction.model";

// Validates that a number has at most 2 decimal places without floating-point
// ambiguity by checking the string representation.
const atMostTwoDecimals = z
  .number()
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(String(v)), {
    message: "must have at most 2 decimal places",
  });

// Validate the create account request body
const createAccountSchema = z.object({
  personId: z
    .number({ required_error: "personId is required" })
    .int({ message: "personId must be an integer" })
    .positive({ message: "personId must be a positive number" }),
  dailyWithdrawalLimit: atMostTwoDecimals
    .pipe(z.number().positive({ message: "dailyWithdrawalLimit must be a positive number" }))
    .optional(),
  accountType: z
    .nativeEnum(AccountType, {
      message: `accountType must be one of: ${Object.entries(AccountType)
        .filter(([k]) => isNaN(Number(k)))
        .map(([k, v]) => `${v} (${k})`)
        .join(", ")}`,
    })
    .optional(),
});

// Validate the transaction amount request body
const transactionAmountSchema = z.object({
  value: atMostTwoDecimals.pipe(
    z.number({ required_error: "value is required" }).positive({ message: "value must be a positive number" })
  ),
});

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "must be an ISO 8601 date in YYYY-MM-DD format",
});

const statementQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
  })
  .refine(
    ({ from, to }) => !from || !to || from <= to,
    { message: "from date must be less than or equal to to date", path: ["from"] }
  );

// Validate the request body using the provided schema
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: result.error.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// Validate the request query using the provided schema
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: result.error.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
        })),
      });
      return;
    }
    // Merge parsed fields back onto req.query so multiple validateQuery
    // middlewares on the same route do not clobber each other's fields.
    Object.assign(req.query, result.data);
    next();
  };
}

// Validate the create account request body
export const validateCreateAccount = validateBody<CreateAccountInput>(
  createAccountSchema
);

// Validate the transaction amount request body
export const validateTransactionAmount =
  validateBody<TransactionAmountInput>(transactionAmountSchema);

// Validate the statement query request query
export const validateStatementQuery = validateQuery<StatementQueryInput>(
  statementQuerySchema
);
