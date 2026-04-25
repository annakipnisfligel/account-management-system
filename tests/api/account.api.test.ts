import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app";
import { cleanDatabase, seedTestAccount, seedTestPerson, testPrisma } from "../setup";

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await testPrisma.$disconnect();
});

describe("GET /api/accounts", () => {
  it("returns all accounts with count", async () => {
    const personA = await seedTestPerson();
    const personB = await testPrisma.person.create({
      data: {
        name: "Another User",
        document: `${Date.now()}${Math.floor(Math.random() * 1000)}`
          .slice(-11),
        birthDate: new Date("1992-02-02"),
      },
    });

    const accountA = await seedTestAccount(personA.personId, 120);
    const accountB = await seedTestAccount(personB.personId, 450);

    const res = await request(app).get("/api/accounts");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].accountId).toBe(accountA.accountId);
    expect(res.body.data[1].accountId).toBe(accountB.accountId);
  });

  it("returns an empty list when there are no accounts", async () => {
    const res = await request(app).get("/api/accounts");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.data).toEqual([]);
  });
});

describe("POST /api/accounts", () => {
  it("creates an account for an existing person", async () => {
    const person = await seedTestPerson();

    const res = await request(app).post("/api/accounts").send({
      personId: person.personId,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.personId).toBe(person.personId);
    expect(res.body.data.activeFlag).toBe(true);
    expect(res.body.data.accountType).toBe(1);
  });

  it("creates an account with custom dailyWithdrawalLimit", async () => {
    const person = await seedTestPerson();

    const res = await request(app).post("/api/accounts").send({
      personId: person.personId,
      dailyWithdrawalLimit: 500,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.personId).toBe(person.personId);
  });

  it("returns 404 when person does not exist", async () => {
    const res = await request(app).post("/api/accounts").send({
      personId: 999999,
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid personId (non-integer)", async () => {
    const res = await request(app).post("/api/accounts").send({
      personId: "not-a-number",
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when personId is missing", async () => {
    const res = await request(app).post("/api/accounts").send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("creates an account with accountType=SAVINGS (2)", async () => {
    const person = await seedTestPerson();

    const res = await request(app).post("/api/accounts").send({
      personId: person.personId,
      accountType: 2,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.accountType).toBe(2);
  });

  it("returns 400 for invalid accountType enum value", async () => {
    const person = await seedTestPerson();

    const res = await request(app).post("/api/accounts").send({
      personId: person.personId,
      accountType: 99,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when dailyWithdrawalLimit has more than 2 decimal places", async () => {
    const person = await seedTestPerson();

    const res = await request(app).post("/api/accounts").send({
      personId: person.personId,
      dailyWithdrawalLimit: 10.123,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when dailyWithdrawalLimit is negative", async () => {
    const person = await seedTestPerson();

    const res = await request(app).post("/api/accounts").send({
      personId: person.personId,
      dailyWithdrawalLimit: -100,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/accounts/:id/balance", () => {
  it("returns balance for an account", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 250);

    const res = await request(app).get(`/api/accounts/${account.accountId}/balance`);

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe("250.00");
    expect(res.body.data.activeFlag).toBe(true);
    expect(res.body.data.accountId).toBe(account.accountId);
  });

  it("returns 404 for non-existent account", async () => {
    const res = await request(app).get("/api/accounts/999999/balance");

    expect(res.status).toBe(404);
  });

  it("returns 400 when id is non-integer (abc)", async () => {
    const res = await request(app).get("/api/accounts/abc/balance");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when id is zero", async () => {
    const res = await request(app).get("/api/accounts/0/balance");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when id is negative", async () => {
    const res = await request(app).get("/api/accounts/-1/balance");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /api/accounts/:id/block", () => {
  it("blocks an active account (sets activeFlag to false)", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId);

    const res = await request(app).patch(`/api/accounts/${account.accountId}/block`);

    expect(res.status).toBe(200);
    expect(res.body.data.activeFlag).toBe(false);
  });

  it("returns 403 if already blocked", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId);
    await testPrisma.account.update({
      where: { accountId: account.accountId },
      data: { activeFlag: false },
    });

    const res = await request(app).patch(`/api/accounts/${account.accountId}/block`);

    expect(res.status).toBe(403);
  });

  it("returns 404 if account does not exist", async () => {
    const res = await request(app).patch("/api/accounts/999999/block");

    expect(res.status).toBe(404);
  });

  it("returns 400 when id is non-integer", async () => {
    const res = await request(app).patch("/api/accounts/abc/block");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when id is zero or negative", async () => {
    const res = await request(app).patch("/api/accounts/0/block");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/accounts/:id/deposit", () => {
  it("deposits funds into an account", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 0);

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 150.5 });

    expect(res.status).toBe(200);
    expect(res.body.data.newBalance).toBe("150.50");
    expect(res.body.data.transaction.transactionType).toBe("DEPOSIT");
    expect(res.body.data.transaction.value).toBe("150.5");
  });

  it("returns 403 when account is blocked", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId);
    await testPrisma.account.update({
      where: { accountId: account.accountId },
      data: { activeFlag: false },
    });

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 100 });

    expect(res.status).toBe(403);
  });

  it("returns 400 for negative value", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId);

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: -50 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing value", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId);

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 404 when account does not exist", async () => {
    const res = await request(app)
      .post("/api/accounts/999999/deposit")
      .send({ value: 100 });

    expect(res.status).toBe(404);
  });

  it("returns 400 when id is non-integer", async () => {
    const res = await request(app)
      .post("/api/accounts/abc/deposit")
      .send({ value: 100 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when value has more than 2 decimal places", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId);

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 10.123 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when value is zero", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId);

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 0 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/accounts/:id/withdraw", () => {
  it("withdraws funds from an account", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 500);

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 200 });

    expect(res.status).toBe(200);
    expect(res.body.data.newBalance).toBe("300.00");
    expect(res.body.data.transaction.transactionType).toBe("WITHDRAWAL");
  });

  it("returns 422 when insufficient funds", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 50);

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 200 });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("UNPROCESSABLE");
  });

  it("returns 422 when value exceeds daily withdrawal limit", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 5000);
    await testPrisma.account.update({
      where: { accountId: account.accountId },
      data: { dailyWithdrawalLimit: 500 },
    });

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 1000 });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("UNPROCESSABLE");
  });

  it("returns 403 when account is blocked", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 500);
    await testPrisma.account.update({
      where: { accountId: account.accountId },
      data: { activeFlag: false },
    });

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 100 });

    expect(res.status).toBe(403);
  });

  it("returns 404 when account does not exist", async () => {
    const res = await request(app)
      .post("/api/accounts/999999/withdraw")
      .send({ value: 100 });

    expect(res.status).toBe(404);
  });

  it("returns 400 when id is non-integer", async () => {
    const res = await request(app)
      .post("/api/accounts/abc/withdraw")
      .send({ value: 100 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when value has more than 2 decimal places", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 500);

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 10.123 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when value is zero", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 500);

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 0 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("succeeds when dailyWithdrawalLimit is 0 (limit disabled)", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 500);
    await testPrisma.account.update({
      where: { accountId: account.accountId },
      data: { dailyWithdrawalLimit: 0 },
    });

    const res = await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 500 });

    expect(res.status).toBe(200);
    expect(res.body.data.newBalance).toBe("0.00");
  });

  it("accumulates multiple withdrawals towards the daily limit", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 5000);
    await testPrisma.account.update({
      where: { accountId: account.accountId },
      data: { dailyWithdrawalLimit: 300 },
    });

    // First withdrawal: 200 (total=200, within limit)
    const first = await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 200 });
    expect(first.status).toBe(200);

    // Second withdrawal: 150 (total=350, exceeds limit of 300)
    const second = await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 150 });
    expect(second.status).toBe(422);
    expect(second.body.code).toBe("UNPROCESSABLE");
  });
});

describe("GET /api/accounts/:id/statement", () => {
  it("returns all transactions for an account", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 1000);

    await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 200 });
    await request(app)
      .post(`/api/accounts/${account.accountId}/withdraw`)
      .send({ value: 100 });

    const res = await request(app).get(
      `/api/accounts/${account.accountId}/statement`
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.count).toBe(2);
  });

  it("filters transactions by period — excludes transactions outside range", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 1000);

    await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 100 });

    // Use a past date range that cannot include today's transaction
    const res = await request(app).get(
      `/api/accounts/${account.accountId}/statement?from=2000-01-01&to=2000-01-31`
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("accepts date-only filters (YYYY-MM-DD)", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 1000);

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app).get(
      `/api/accounts/${account.accountId}/statement?from=${today}&to=${today}`
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("returns transactions when from and to are the same date", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 1000);

    await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 50 });

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app).get(
      `/api/accounts/${account.accountId}/statement?from=${today}&to=${today}`
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.count).toBe(1);
  });

  it("returns 400 for invalid date format", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId);

    const res = await request(app).get(
      `/api/accounts/${account.accountId}/statement?from=not-a-date`
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent account", async () => {
    const res = await request(app).get("/api/accounts/999999/statement");

    expect(res.status).toBe(404);
  });

  it("from-only: returns transactions on or after the from date", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 1000);

    await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 50 });

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app).get(
      `/api/accounts/${account.accountId}/statement?from=${today}`
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.count).toBe(1);
  });

  it("to-only: returns transactions on or before the to date", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 1000);

    await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 75 });

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app).get(
      `/api/accounts/${account.accountId}/statement?to=${today}`
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.count).toBe(1);
  });

  it("returns 400 when from is after to", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId);

    const res = await request(app).get(
      `/api/accounts/${account.accountId}/statement?from=2026-12-31&to=2026-01-01`
    );

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when id is non-integer", async () => {
    const res = await request(app).get("/api/accounts/abc/statement");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns transactions ordered by transactionDate ascending", async () => {
    const person = await seedTestPerson();
    const account = await seedTestAccount(person.personId, 1000);

    await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 100 });
    await request(app)
      .post(`/api/accounts/${account.accountId}/deposit`)
      .send({ value: 200 });

    const res = await request(app).get(
      `/api/accounts/${account.accountId}/statement`
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const dates = res.body.data.map((t: { transactionDate: string }) => t.transactionDate);
    expect(dates[0] <= dates[1]).toBe(true);
  });
});
