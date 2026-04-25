import { Request, Response, NextFunction } from "express";
import { transactionService } from "../services/transaction.service";
import { TransactionAmountInput } from "../models/transaction.model";

export const transactionController = {
  /**
   * @swagger
   * /api/accounts/{id}/deposit:
   *   post:
   *     summary: Deposit funds into an account
   *     tags: [Transactions]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - value
   *             properties:
   *               value:
   *                 type: number
   *                 minimum: 0.01
   *                 example: 100.00
   *     responses:
   *       200:
   *         description: Deposit successful
   *       403:
   *         description: Account is blocked
   *       404:
   *         description: Account not found
   */
  async deposit(
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
      const input = req.body as TransactionAmountInput;
      const result = await transactionService.deposit(accountId, input);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * @swagger
   * /api/accounts/{id}/withdraw:
   *   post:
   *     summary: Withdraw funds from an account
   *     tags: [Transactions]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - value
   *             properties:
   *               value:
   *                 type: number
   *                 minimum: 0.01
   *                 example: 50.00
   *     responses:
   *       200:
   *         description: Withdrawal successful
   *       403:
   *         description: Account is blocked
   *       404:
   *         description: Account not found
   *       422:
   *         description: Insufficient funds or daily limit exceeded
   */
  async withdraw(
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
      const input = req.body as TransactionAmountInput;
      const result = await transactionService.withdraw(accountId, input);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
};
