import { PrismaPg } from '@prisma/adapter-pg';

export const DB_SCHEMA = 'librarium';

export function createPrismaAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({
    connectionString,
    // adapter ne upošteva ?schema= iz URL, surovi SQL pa ga potrebuje
    options: `-c search_path=${DB_SCHEMA}`,
  });
}
