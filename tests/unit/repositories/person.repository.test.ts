import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../../src/config/prisma", () => ({
  prisma: {
    person: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma";
import { personRepository } from "../../../src/repositories/person.repository";

const mockPrisma = prisma as unknown as {
  person: {
    findUnique: ReturnType<typeof jest.fn>;
  };
};

describe("personRepository", () => {
  it("finds person by personId", async () => {
    const person = {
      personId: 9,
      name: "Jane Doe",
      document: "12345678901",
      birthDate: new Date("1990-01-01T00:00:00.000Z"),
    };
    mockPrisma.person.findUnique.mockResolvedValue(person);

    const result = await personRepository.findById(9);

    expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
      where: { personId: 9 },
    });
    expect(result).toEqual(person);
  });

  it("returns null when person is not found", async () => {
    mockPrisma.person.findUnique.mockResolvedValue(null);

    const result = await personRepository.findById(99);

    expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
      where: { personId: 99 },
    });
    expect(result).toBeNull();
  });
});
