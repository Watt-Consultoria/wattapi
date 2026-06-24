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

const BASE_URL = 'http://localhost:3001/internal/daily-job';
const INTERNAL_SECRET =
  process.env.INTERNAL_JOB_SECRET ?? 'test-internal-secret';

type DailyJobResponse = {
  notifications_created: number;
};

type AlreadyRanResponse = {
  message: string;
};

type NotificationBody = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  origin: string;
};

function todayInSP(): string {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  });
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
  await orchestrator.email.deleteAllEmails();
});

describe('POST /internal/daily-job', () => {
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

    test('With correct X-Internal-Secret and no activities', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as DailyJobResponse;

      expect(response.status).toBe(200);
      expect(body.notifications_created).toBe(0);
    });
  });

  describe('Execution', () => {
    test('With activities scheduled for today', async () => {
      await orchestrator.database.clear();
      await orchestrator.email.deleteAllEmails();

      const ts = Date.now();

      const user = await orchestrator.database.seed.createUser({
        username: `Daily Job User ${ts}`,
        email: `internal.daily.user.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      await orchestrator.database.seed.createActivity({
        user_id: user.id,
        name: 'Reunião de equipe',
        description: 'Reunião semanal do time',
        date: todayInSP(),
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowInSP = tomorrow.toLocaleDateString('sv-SE', {
        timeZone: 'America/Sao_Paulo',
      });

      await orchestrator.database.seed.createActivity({
        user_id: user.id,
        name: 'Atividade de amanhã',
        date: tomorrowInSP,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as DailyJobResponse;

      expect(response.status).toBe(200);
      expect(body.notifications_created).toBe(1);

      const notificationsResponse = await fetch(
        'http://localhost:3001/notifications',
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const notifications =
        (await notificationsResponse.json()) as NotificationBody[];

      expect(notificationsResponse.status).toBe(200);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe(
        'Atividade agendada para hoje: Reunião de equipe',
      );
      expect(notifications[0].origin).toBe('automatic');
    });

    test('With no activities scheduled for today', async () => {
      await orchestrator.database.clear();
      await orchestrator.email.deleteAllEmails();

      const ts = Date.now();

      const user = await orchestrator.database.seed.createUser({
        username: `Daily Job Empty ${ts}`,
        email: `internal.daily.empty.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayInSP = yesterday.toLocaleDateString('sv-SE', {
        timeZone: 'America/Sao_Paulo',
      });

      await orchestrator.database.seed.createActivity({
        user_id: user.id,
        name: 'Atividade de ontem',
        date: yesterdayInSP,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as DailyJobResponse;

      expect(response.status).toBe(200);
      expect(body.notifications_created).toBe(0);
    });

    test('Second call on the same day', async () => {
      await orchestrator.database.clear();
      await orchestrator.email.deleteAllEmails();

      await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as AlreadyRanResponse;

      expect(response.status).toBe(409);
      expect(body.message).toBe('Daily job has already been run today');
    });
  });
});
