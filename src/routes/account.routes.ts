import { Router } from "express";
import { accountController } from "../controllers/account.controller";
import { transactionController } from "../controllers/transaction.controller";
import {
  validateCreateAccount,
  validateStatementQuery,
  validateTransactionAmount,
} from "../middlewares/validate.middleware";

const router = Router();

router.get("/", accountController.getAccounts);

router.post("/", validateCreateAccount, accountController.create);

router.get("/:id/balance", accountController.getBalance);

router.patch("/:id/block", accountController.block);

router.post(
  "/:id/deposit",
  validateTransactionAmount,
  transactionController.deposit
);

router.post(
  "/:id/withdraw",
  validateTransactionAmount,
  transactionController.withdraw
);

router.get(
  "/:id/statement",
  validateStatementQuery,
  accountController.getStatement
);

export default router;
