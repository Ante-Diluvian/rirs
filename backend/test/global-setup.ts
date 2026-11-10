import { execSync } from 'node:child_process';
import { loadTestEnv } from './test-env';

export default function globalSetup(): void {
  loadTestEnv();
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
