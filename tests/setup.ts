import { PrismaClient } from "@prisma/client";
import { AccountType } from "../src/models/account.model";

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL_TEST ??
        "postgresql://postgres:postgres@localhost:5433/account_management_db_test?schema=public",
    },
  },
});

export async function cleanDatabase() {
  await testPrisma.transaction.deleteMany();
  await testPrisma.account.deleteMany();
  await testPrisma.person.deleteMany();
}

export async function seedTestPerson() {
  return testPrisma.person.create({
    data: {
      name: "Test User",
      document: `${Date.now()}`.slice(0, 11),
      birthDate: new Date("1990-01-01"),
    },
  });
}

export async function seedTestAccount(personId: number, balance = 0) {
  return testPrisma.account.create({
    data: {
      personId,
      balance,
      dailyWithdrawalLimit: 1000,
      accountType: AccountType.CHECKING,
    },
  });
}
