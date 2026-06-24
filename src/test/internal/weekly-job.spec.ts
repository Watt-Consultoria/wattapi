import * as path from 'path';
import { config } from 'dotenv';
import orchestrator from '../orchestrator';
import type { MeViolationsResponse } from '../../modules/violations/dto/violation.dto';

config({
  path: [
    path.resolve(__dirname, '../../..', '.env'),
    path.resolve(__dirname, '../../..', '.env.development'),
  ],
  quiet: true,
});

const BASE_URL = 'http://localhost:3001/internal/weekly-job';
const INTERNAL_SECRET =
  process.env.INTERNAL_JOB_SECRET ?? 'test-internal-secret';

type WeeklyJobResponse = {
  week_start: string;
  users_checked: number;
  violations_applied: number;
};

type AlreadyRanResponse = {
  message: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
  await orchestrator.email.deleteAllEmails();
});

describe('POST /internal/weekly-job', () => {
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

  describe('Execution', () => {
    test('With active users', async () => {
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

      const member = await orchestrator.database.seed.createUser({
        username: `Member Full Hours ${ts}`,
        email: `internal.weekly.full.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const memberAN13 = await orchestrator.database.seed.createUser({
        username: `Member AN13 ${ts}`,
        email: `internal.weekly.an13.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const memberAN07 = await orchestrator.database.seed.createUser({
        username: `Member AN07 ${ts}`,
        email: `internal.weekly.an07.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      await orchestrator.database.seed.createCurrentWeekTimeEntry({
        user_id: member.id,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as WeeklyJobResponse;

      expect(response.status).toBe(200);
      expect(body.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.users_checked).toBe(3);
      expect(body.violations_applied).toBe(2);

      const violationAN07 = await fetch('http://localhost:3001/violations/me', {
        headers: { Authorization: `Bearer ${memberAN07.token}` },
      });
      const violationAN07Body =
        (await violationAN07.json()) as MeViolationsResponse;
      expect(violationAN07Body.violations).toHaveLength(1);
      expect(violationAN07Body.violations[0]).toHaveProperty('code', 'AN07');

      const violationAN13 = await fetch('http://localhost:3001/violations/me', {
        headers: { Authorization: `Bearer ${memberAN13.token}` },
      });
      const violationAN13Body =
        (await violationAN13.json()) as MeViolationsResponse;
      expect(violationAN13Body.violations).toHaveLength(1);
      expect(violationAN13Body.violations[0]).toHaveProperty('code', 'AN13');

      const noViolation = await fetch('http://localhost:3001/violations/me', {
        headers: { Authorization: `Bearer ${member.token}` },
      });
      const noViolationBody =
        (await noViolation.json()) as MeViolationsResponse;
      expect(noViolationBody.violations).toHaveLength(0);

      const lastEmail = await orchestrator.email.waitForLastEmail();
      expect(lastEmail).not.toBeNull();
      expect(lastEmail!.recipients).toContain(memberAN13.email);
    });

    test('With inactive users', async () => {
      await orchestrator.database.clear();
      await orchestrator.email.deleteAllEmails();

      const ts = Date.now();

      const inactiveUser = await orchestrator.database.seed.createUser({
        username: `Inactive User ${ts}`,
        email: `internal.weekly.inactive.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      await orchestrator.database.seed.deactivateUser(inactiveUser.id);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as WeeklyJobResponse;

      expect(response.status).toBe(200);
      expect(body.users_checked).toBe(0);
      expect(body.violations_applied).toBe(0);
    });

    test('Second call in the same week', async () => {
      await orchestrator.database.clear();
      await orchestrator.email.deleteAllEmails();

      await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });

      await orchestrator.email.deleteAllEmails();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as AlreadyRanResponse;

      expect(response.status).toBe(409);
      expect(body.message).toBe('Weekly job has already been run this week');

      const emailAfterSecondCall = await orchestrator.email.waitForLastEmail();
      expect(emailAfterSecondCall).toBeNull();
    });
  });

  describe('Legacy endpoint removed', () => {
    test('POST /internal/weekly-absence-check returns 404', async () => {
      const response = await fetch(
        'http://localhost:3001/internal/weekly-absence-check',
        {
          method: 'POST',
          headers: { 'X-Internal-Secret': INTERNAL_SECRET },
        },
      );
      expect(response.status).toBe(404);
    });
  });
});
