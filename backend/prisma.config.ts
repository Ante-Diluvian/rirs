import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 ne bere .env sama, ta pa je v korenu repozitorija
for (const file of ['.env', '../.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.DATABASE_URL },
});
