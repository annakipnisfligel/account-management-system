import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  let john = await prisma.person.findFirst({
    where: { document: "12345678901" },
  });

  if (!john) {
    john = await prisma.person.create({
      data: {
        name: "John Doe",
        document: "12345678901",
        birthDate: new Date("1990-01-15"),
      },
    });
  }
  console.log(`Person: ${john.name} (personId: ${john.personId})`);

  let johnAccount = await prisma.account.findFirst({
    where: { personId: john.personId, accountType: 1 },
  });

  if (!johnAccount) {
    johnAccount = await prisma.account.create({
      data: {
        personId: john.personId,
        balance: 0,
        dailyWithdrawalLimit: 1000,
        activeFlag: true,
        accountType: 1,
      },
    });
  }
  console.log(
    `Account: accountId=${johnAccount.accountId}, personId=${johnAccount.personId}, balance=${johnAccount.balance}`
  );

  let jane = await prisma.person.findFirst({
    where: { document: "98765432100" },
  });

  if (!jane) {
    jane = await prisma.person.create({
      data: {
        name: "Jane Smith",
        document: "98765432100",
        birthDate: new Date("1985-06-20"),
      },
    });
  }
  console.log(`Person: ${jane.name} (personId: ${jane.personId})`);

  let janeAccount = await prisma.account.findFirst({
    where: { personId: jane.personId, accountType: 1 },
  });

  if (!janeAccount) {
    janeAccount = await prisma.account.create({
      data: {
        personId: jane.personId,
        balance: 500,
        dailyWithdrawalLimit: 2000,
        activeFlag: true,
        accountType: 1,
      },
    });
  }
  console.log(
    `Account: accountId=${janeAccount.accountId}, personId=${janeAccount.personId}, balance=${janeAccount.balance}`
  );

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
