import orchestrator from '../../lib/orchestrator';
import { StatusResponse } from './status.service';

const STATUS_URL = 'http://localhost:3001/status';

describe('GET /status', () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
  });

  it('should return HTTP 200', async () => {
    const res = await fetch(STATUS_URL);
    expect(res.status).toBe(200);
  });

  it('should return Content-Type application/json', async () => {
    const res = await fetch(STATUS_URL);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('should return the correct response shape', async () => {
    const res = await fetch(STATUS_URL);
    const body = (await res.json()) as StatusResponse;
    expect(body).toHaveProperty('updated_at');
    expect(body).toHaveProperty([
      'dependencies',
      'database',
      'max_connections',
    ]);
    expect(body).toHaveProperty([
      'dependencies',
      'database',
      'opened_connections',
    ]);
    expect(typeof body.updated_at).toBe('string');
    expect(typeof body.dependencies.database.max_connections).toBe('number');
    expect(typeof body.dependencies.database.opened_connections).toBe('number');
  });

  it('should return updated_at as a valid ISO 8601 date string', async () => {
    const res = await fetch(STATUS_URL);
    const { updated_at } = (await res.json()) as StatusResponse;
    expect(new Date(updated_at).toISOString()).toBe(updated_at);
  });

  it('should return max_connections as a positive integer', async () => {
    const res = await fetch(STATUS_URL);
    const { max_connections } = ((await res.json()) as StatusResponse)
      .dependencies.database;
    expect(Number.isInteger(max_connections)).toBe(true);
    expect(max_connections).toBeGreaterThan(0);
  });

  it('should return opened_connections as a non-negative integer', async () => {
    const res = await fetch(STATUS_URL);
    const { opened_connections } = ((await res.json()) as StatusResponse)
      .dependencies.database;
    expect(Number.isInteger(opened_connections)).toBe(true);
    expect(opened_connections).toBeGreaterThanOrEqual(0);
  });
});
