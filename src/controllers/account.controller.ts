import { Request, Response, NextFunction } from "express";
import { accountService } from "../services/account.service";
import {
  CreateAccountInput,
  StatementQueryInput,
} from "../models/account.model";
import { transactionService } from "../services/transaction.service";

type AccountIdParams = { id: string };
type GetStatementRequest = Request<AccountIdParams, unknown, unknown, StatementQueryInput>;

export const accountController = {
  /**
   * @swagger
   * /api/accounts:
   *   get:
   *     summary: List all accounts
   *     tags: [Accounts]
   *     responses:
   *       200:
   *         description: Accounts returned successfully
   */
  async getAccounts(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const accounts = await accountService.getAccounts();
      res.json({ data: accounts, count: accounts.length });
    } catch (err) {
      next(err);
    }
  },

  /**
   * @swagger
   * /api/accounts:
   *   post:
   *     summary: Create a new account
   *     tags: [Accounts]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - personId
   *             properties:
   *               personId:
   *                 type: integer
   *                 example: 1
   *               dailyWithdrawalLimit:
   *                 type: number
   *                 example: 1000.00
   *               accountType:
   *                 type: integer
   *                 example: 1
   *     responses:
   *       201:
   *         description: Account created successfully
   *       404:
   *         description: Person not found
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateAccountInput;
      const account = await accountService.create(input);
      res.status(201).json({ data: account });
    } catch (err) {
      next(err);
    }
  },

  /**
   * @swagger
   * /api/accounts/{id}/balance:
   *   get:
   *     summary: Get account balance
   *     tags: [Accounts]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Account balance
   *       404:
   *         description: Account not found
   */
  async getBalance(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const accountId = Number(req.params.id);
      if (!Number.isInteger(accountId) || accountId <= 0) {
        res.status(400).json({ error: "Invalid account ID", code: "VALIDATION_ERROR" });
        return;
      }
      const balance = await accountService.getBalance(accountId);
      res.json({ data: balance });
    } catch (err) {
      next(err);
    }
  },

  /**
   * @swagger
   * /api/accounts/{id}/block:
   *   patch:
   *     summary: Block an account
   *     tags: [Accounts]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Account blocked successfully
   *       403:
   *         description: Account is already blocked
   *       404:
   *         description: Account not found
   */
  async block(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = Number(req.params.id);
      if (!Number.isInteger(accountId) || accountId <= 0) {
        res.status(400).json({ error: "Invalid account ID", code: "VALIDATION_ERROR" });
        return;
      }
      const account = await accountService.block(accountId);
      res.json({ data: account });
    } catch (err) {
      next(err);
    }
  },

  /**
   * @swagger
   * /api/accounts/{id}/statement:
   *   get:
   *     summary: Get account transaction statement
   *     tags: [Accounts]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: from
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date in YYYY-MM-DD format.
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format.
   *     responses:
   *       200:
   *         description: Transaction statement
   *       404:
   *         description: Account not found
   */
  async getStatement(
    req: GetStatementRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const accountId = Number(req.params.id);
      if (!Number.isInteger(accountId) || accountId <= 0) {
        res.status(400).json({ error: "Invalid account ID", code: "VALIDATION_ERROR" });
        return;
      }
      const query = req.query;
      const transactions = await transactionService.getStatement(
        accountId,
        query
      );
      res.json({ data: transactions, count: transactions.length });
    } catch (err) {
      next(err);
    }
  },
};
