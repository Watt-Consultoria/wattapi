import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/time-entries';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /time-entries/clock-in ──────────────────────────────────────────────

describe('POST /time-entries/clock-in', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Clocking in', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Clock In',
        email: `timeentries.clockin.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${consultor.token}` },
        body: JSON.stringify({ clocked_in_at: '2020-01-01T00:00:00Z' }),
      });
      const body = (await response.json()) as {
        id: string;
        clocked_in_at: string;
      };

      expect(response.status).toBe(201);
      expect(typeof body.id).toBe('string');
      expect(typeof body.clocked_in_at).toBe('string');
      expect(new Date(body.clocked_in_at).getFullYear()).toBeGreaterThanOrEqual(
        2026,
      );
    });

    test('Attempting to clocking in when an open session already exists', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Double Clock In',
        email: `timeentries.clockin.double.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Clocking in', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Clock In',
        email: `timeentries.clockin.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gerente.token}` },
        body: JSON.stringify({ clocked_in_at: '2020-01-01T00:00:00Z' }),
      });
      const body = (await response.json()) as {
        id: string;
        clocked_in_at: string;
      };

      expect(response.status).toBe(201);
      expect(typeof body.id).toBe('string');
      expect(typeof body.clocked_in_at).toBe('string');
      expect(new Date(body.clocked_in_at).getFullYear()).toBeGreaterThanOrEqual(
        2026,
      );
    });

    test('Attempting to clocking in when an open session already exists', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Double Clock In',
        email: `timeentries.clockin.double.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Clocking in', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Clock In',
        email: `timeentries.clockin.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${diretor.token}` },
        body: JSON.stringify({ clocked_in_at: '2020-01-01T00:00:00Z' }),
      });
      const body = (await response.json()) as {
        id: string;
        clocked_in_at: string;
      };

      expect(response.status).toBe(201);
      expect(typeof body.id).toBe('string');
      expect(typeof body.clocked_in_at).toBe('string');
      expect(new Date(body.clocked_in_at).getFullYear()).toBeGreaterThanOrEqual(
        2026,
      );
    });

    test('Attempting to clocking in when an open session already exists', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Double Clock In',
        email: `timeentries.clockin.double.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Clocking in', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Clock In',
        email: `timeentries.clockin.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${assessor.token}` },
        body: JSON.stringify({ clocked_in_at: '2020-01-01T00:00:00Z' }),
      });
      const body = (await response.json()) as {
        id: string;
        clocked_in_at: string;
      };

      expect(response.status).toBe(201);
      expect(typeof body.id).toBe('string');
      expect(typeof body.clocked_in_at).toBe('string');
      expect(new Date(body.clocked_in_at).getFullYear()).toBeGreaterThanOrEqual(
        2026,
      );
    });

    test('Attempting to clocking in when an open session already exists', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Double Clock In',
        email: `timeentries.clockin.double.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Clocking in', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Clock In',
        email: `timeentries.clockin.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${presidente.token}` },
        body: JSON.stringify({ clocked_in_at: '2020-01-01T00:00:00Z' }),
      });
      const body = (await response.json()) as {
        id: string;
        clocked_in_at: string;
      };

      expect(response.status).toBe(201);
      expect(typeof body.id).toBe('string');
      expect(typeof body.clocked_in_at).toBe('string');
      expect(new Date(body.clocked_in_at).getFullYear()).toBeGreaterThanOrEqual(
        2026,
      );
    });

    test('Attempting to clocking in when an open session already exists', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Double Clock In',
        email: `timeentries.clockin.double.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to clock in', async () => {
      const response = await fetch(`${BASE_URL}/clock-in`, { method: 'POST' });
      expect(response.status).toBe(401);
    });
  });
});

// ─── POST /time-entries/clock-out ─────────────────────────────────────────────

describe('POST /time-entries/clock-out', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Clocking out after a valid session', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Clock Out Valid',
        email: `timeentries.clockout.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        id: string;
        clocked_in_at: string;
        clocked_out_at: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('valid');
      expect(typeof body.id).toBe('string');
      expect(typeof body.duration_minutes).toBe('number');
    });

    test('Clocking out a session older than 8h', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Clock Out Annulled',
        email: `timeentries.clockout.annulled.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: consultor.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        reason: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('annulled');
      expect(body.reason).toBe('exceeded_max_duration');
      expect(body.duration_minutes).toBeGreaterThan(480);
    });

    test('Clocking out with no open session', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Clock Out No Session',
        email: `timeentries.clockout.nosession.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Clocking out after a valid session', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Clock Out Valid',
        email: `timeentries.clockout.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        id: string;
        clocked_in_at: string;
        clocked_out_at: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('valid');
      expect(typeof body.id).toBe('string');
      expect(typeof body.duration_minutes).toBe('number');
    });

    test('Clocking out a session older than 8h', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Clock Out Annulled',
        email: `timeentries.clockout.annulled.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: gerente.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        reason: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('annulled');
      expect(body.reason).toBe('exceeded_max_duration');
      expect(body.duration_minutes).toBeGreaterThan(480);
    });

    test('Clocking out with no open session', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Clock Out No Session',
        email: `timeentries.clockout.nosession.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Clocking out after a valid session', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Clock Out Valid',
        email: `timeentries.clockout.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        id: string;
        clocked_in_at: string;
        clocked_out_at: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('valid');
      expect(typeof body.id).toBe('string');
      expect(typeof body.duration_minutes).toBe('number');
    });

    test('Clocking out a session older than 8h', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Clock Out Annulled',
        email: `timeentries.clockout.annulled.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: diretor.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        reason: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('annulled');
      expect(body.reason).toBe('exceeded_max_duration');
      expect(body.duration_minutes).toBeGreaterThan(480);
    });

    test('Clocking out with no open session', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Clock Out No Session',
        email: `timeentries.clockout.nosession.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Clocking out after a valid session', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Clock Out Valid',
        email: `timeentries.clockout.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        id: string;
        clocked_in_at: string;
        clocked_out_at: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('valid');
      expect(typeof body.id).toBe('string');
      expect(typeof body.duration_minutes).toBe('number');
    });

    test('Clocking out a session older than 8h', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Clock Out Annulled',
        email: `timeentries.clockout.annulled.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: assessor.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        reason: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('annulled');
      expect(body.reason).toBe('exceeded_max_duration');
      expect(body.duration_minutes).toBeGreaterThan(480);
    });

    test('Clocking out with no open session', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Clock Out No Session',
        email: `timeentries.clockout.nosession.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Clocking out after a valid session', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Clock Out Valid',
        email: `timeentries.clockout.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        id: string;
        clocked_in_at: string;
        clocked_out_at: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('valid');
      expect(typeof body.id).toBe('string');
      expect(typeof body.duration_minutes).toBe('number');
    });

    test('Clocking out a session older than 8h', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Clock Out Annulled',
        email: `timeentries.clockout.annulled.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: presidente.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as {
        status: string;
        reason: string;
        duration_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('annulled');
      expect(body.reason).toBe('exceeded_max_duration');
      expect(body.duration_minutes).toBeGreaterThan(480);
    });

    test('Clocking out with no open session', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Clock Out No Session',
        email: `timeentries.clockout.nosession.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/clock-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to clock out', async () => {
      const response = await fetch(`${BASE_URL}/clock-out`, { method: 'POST' });
      expect(response.status).toBe(401);
    });
  });
});
