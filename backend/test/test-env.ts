import { existsSync } from 'node:fs';

// e2e testi praznijo tabele, zato tečejo samo na bazi z imenom *_test
export function loadTestEnv(): void {
  for (const file of ['.env.test', '../.env.test']) {
    if (existsSync(file)) process.loadEnvFile(file);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'e2e testi potrebujejo DATABASE_URL testne baze, npr. v .env.test v korenu repozitorija.',
    );
  }
  const database = new URL(url).pathname.slice(1);
  if (!database.endsWith('_test')) {
    throw new Error(
      `e2e testi tečejo samo na bazi, katere ime se konča z _test. DATABASE_URL kaže na "${database}".`,
    );
  }
}
