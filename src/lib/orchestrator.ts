import * as path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import retry from 'async-retry';
import { clearUsers, seedUsers } from './seed';

config({
  path: path.resolve(__dirname, '../..', '.env.development'),
  quiet: true,
});

function getDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined');
  return process.env.DATABASE_URL;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: getDatabaseUrl() });
  return pool;
}

async function waitForAllServices() {
  await waitForWebServer();

  async function waitForWebServer() {
    process.stdout.write('Waiting for web server to be ready');

    await retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      process.stdout.write('.');
      const response = await fetch('http://localhost:3000/status');

      if (response.status !== 200) {
        throw Error();
      }
      process.stdout.write(' Web server is ready!\n');
    }
  }
}

async function seedDatabase() {
  return seedUsers(getPool());
}

async function clearDatabase(): Promise<void> {
  await clearUsers(getPool());
}

export default {
  waitForAllServices,
  seedDatabase,
  clearDatabase,
};
