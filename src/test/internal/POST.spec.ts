import * as path from 'path';
import { config } from 'dotenv';
import orchestrator from '../orchestrator';

config({
  path: [
    path.resolve(__dirname, '../../..', '.env'),
    path.resolve(__dirname, '../../..', '.env.development'),
  ],
  quiet: true,
});

const BASE_URL = 'http://localhost:3001/internal/weekly-absence-check';
const INTERNAL_SECRET =
  process.env.INTERNAL_JOB_SECRET ?? 'test-internal-secret';

type WeeklyAbsenceCheckResponse = {
  week_start: string;
  users_checked: number;
  violations_applied: number;
};

type AlreadyRanResponse = {
  already_ran: true;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
  await orchestrator.email.deleteAllEmails();
});

// ─── POST /internal/weekly-absence-check ─────────────────────────────────────

describe('POST /internal/weekly-absence-check', () => {
  describe('Authentication', () => {
    test('Without X-Internal-Secret header', async () => {
      const response = await fetch(BASE_URL, { method: 'POST' });
      expect(response.status).toBe(401);
    });

    test('With incorrect X-Internal-Secret', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': 'wrong-secret' },
      });
      expect(response.status).toBe(401);
    });

    test('With correct X-Internal-Secret', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('First execution of the week', () => {
    test('Processes active users and applies violations for those below min hours', async () => {
      await orchestrator.database.clear();
      await orchestrator.email.deleteAllEmails();

      await orchestrator.database.seed.createNorm({
        code: 'AN07',
        description: 'Sair antes do horário previsto sem justificativa',
        severity: 'leve',
      });
      await orchestrator.database.seed.createNorm({
        code: 'AN13',
        description: 'Não cumprir a rotina de sala sem justificativa prévia',
        severity: 'moderada',
      });

      const ts = Date.now();

      // User with zero hours → should get AN13 (below half of min_week_hours)
      const memberAN13 = await orchestrator.database.seed.createUser({
        username: `Member AN13 ${ts}`,
        email: `internal.post.an13.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as WeeklyAbsenceCheckResponse;

      expect(response.status).toBe(200);
      expect(body.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.users_checked).toBeGreaterThanOrEqual(1);
      expect(body.violations_applied).toBeGreaterThanOrEqual(1);

      // Verify violation was inserted with source = 'automatic'
      const lastEmail = await orchestrator.email.waitForLastEmail();
      expect(lastEmail).not.toBeNull();
      expect(lastEmail!.recipients).toContain(memberAN13.email);
    });

    test('Inactive users are ignored', async () => {
      await orchestrator.database.clear();
      await orchestrator.email.deleteAllEmails();

      const ts = Date.now();

      // Create inactive user (mark directly via DB won't work via seed, skip for now)
      // Active user with no hours will get violation, inactive user will not
      const _inactiveUser = await orchestrator.database.seed.createUser({
        username: `Inactive User ${ts}`,
        email: `internal.post.inactive.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      // Mark them inactive
      await orchestrator.database.seed.deactivateUser(_inactiveUser.id);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as WeeklyAbsenceCheckResponse;

      expect(response.status).toBe(200);
      expect(body.users_checked).toBe(0);
      expect(body.violations_applied).toBe(0);
    });
  });

  describe('Idempotency', () => {
    test('Second call in the same week returns 200 with already_ran = true and makes no changes', async () => {
      await orchestrator.database.clear();
      await orchestrator.email.deleteAllEmails();

      // First call
      await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });

      await orchestrator.email.deleteAllEmails();

      // Second call
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as AlreadyRanResponse;

      expect(response.status).toBe(200);
      expect(body.already_ran).toBe(true);

      const emailAfterSecondCall = await orchestrator.email.waitForLastEmail();
      expect(emailAfterSecondCall).toBeNull();
    });
  });
});
