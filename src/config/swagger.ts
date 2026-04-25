import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Account Management API",
      version: "1.0.0",
      description:
        "A REST API for banking account management. Supports account creation, deposits, withdrawals, blocking, and transaction statements.",
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: "Local development server",
      },
    ],
    tags: [
      {
        name: "Accounts",
        description: "Account lifecycle management",
      },
      {
        name: "Transactions",
        description: "Deposit and withdrawal operations",
      },
    ],
    components: {
      schemas: {
        Account: {
          type: "object",
          properties: {
            accountId: { type: "integer", example: 1 },
            personId: { type: "integer", example: 1 },
            balance: { type: "string", example: "100.00" },
            dailyWithdrawalLimit: { type: "string", example: "1000.00" },
            activeFlag: { type: "boolean", example: true },
            accountType: { type: "integer", example: 1 },
            createDate: { type: "string", format: "date-time" },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            transactionId: { type: "integer", example: 1 },
            accountId: { type: "integer", example: 1 },
            value: { type: "string", example: "100.00" },
            transactionDate: { type: "string", format: "date-time" },
            transactionType: { type: "string", enum: ["DEPOSIT", "WITHDRAWAL"] },
          },
        },
        Person: {
          type: "object",
          properties: {
            personId: { type: "integer", example: 1 },
            name: { type: "string", example: "John Doe" },
            document: { type: "string", example: "12345678901" },
            birthDate: { type: "string", format: "date" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
