import { prisma } from "../config/prisma";
import { PersonModel } from "../models/person.model";
  
export const personRepository = {
  // Find a person by id
  async findById(personId: number): Promise<PersonModel | null> {
    return prisma.person.findUnique({ where: { personId } });
  },
};
