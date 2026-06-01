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
    await retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch('http://localhost:3001/status');

      if (response.status !== 200) {
        throw Error();
      }
    }
  }
}

async function seedDatabase() {
  return seedUsers(getPool());
}

async function clearDatabase(): Promise<void> {
  await clearUsers(getPool());
}

async function clearTransactionalData(): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM activities');
  await pool.query('DELETE FROM time_entries');
  await pool.query('DELETE FROM routine_slots');
  await pool.query('DELETE FROM reimbursements');
}

async function clearTimeEntries(): Promise<void> {
  await getPool().query('DELETE FROM time_entries');
}

async function end(): Promise<void> {
  await pool?.end();
  pool = null;
}

export default {
  waitForAllServices,
  seedDatabase,
  clearDatabase,
  clearTransactionalData,
  clearTimeEntries,
  end,
};
