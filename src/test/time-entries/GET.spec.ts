import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/time-entries';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /time-entries/summary/me ─────────────────────────────────────────────

describe('GET /time-entries/summary/me', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving summary with no open session', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Summary Me',
        email: `timeentries.summary.me.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string };
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('none');
      expect(Array.isArray(body.valid_sessions)).toBe(true);
      expect(typeof body.total_minutes).toBe('number');
    });

    test('Retrieving summary with an open session', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Summary Open',
        email: `timeentries.summary.open.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; elapsed_minutes: number };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('open');
      expect(typeof body.current_session.elapsed_minutes).toBe('number');
    });

    test('Retrieving summary with session of more than 8 hours', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Summary Invalid',
        email: `timeentries.summary.invalid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: consultor.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; reason: string };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('invalid');
      expect(body.current_session.reason).toBe('exceeded_max_duration');
    });

    test('Retrieving summary with valid sessions', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Summary Valid Sessions',
        email: `timeentries.summary.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      await orchestrator.database.seed.createTimeEntry({
        user_id: consultor.id,
        clocked_in_at: fiveHoursAgo.toISOString(),
        clocked_out_at: oneHourAgo.toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(body.valid_sessions).toHaveLength(1);
      expect(body.total_minutes).toBeGreaterThan(230);
      expect(body.total_minutes).toBeLessThan(250);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving summary with no open session', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Summary Me',
        email: `timeentries.summary.me.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string };
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('none');
      expect(Array.isArray(body.valid_sessions)).toBe(true);
      expect(typeof body.total_minutes).toBe('number');
    });

    test('Retrieving summary with an open session', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Summary Open',
        email: `timeentries.summary.open.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; elapsed_minutes: number };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('open');
      expect(typeof body.current_session.elapsed_minutes).toBe('number');
    });

    test('Retrieving summary with session of more than 8 hours', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Summary Invalid',
        email: `timeentries.summary.invalid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: gerente.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; reason: string };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('invalid');
      expect(body.current_session.reason).toBe('exceeded_max_duration');
    });

    test('Retrieving summary with valid sessions', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Summary Valid Sessions',
        email: `timeentries.summary.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      await orchestrator.database.seed.createTimeEntry({
        user_id: gerente.id,
        clocked_in_at: fiveHoursAgo.toISOString(),
        clocked_out_at: oneHourAgo.toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as {
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(body.valid_sessions).toHaveLength(1);
      expect(body.total_minutes).toBeGreaterThan(230);
      expect(body.total_minutes).toBeLessThan(250);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving summary with no open session', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Summary Me',
        email: `timeentries.summary.me.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string };
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('none');
      expect(Array.isArray(body.valid_sessions)).toBe(true);
      expect(typeof body.total_minutes).toBe('number');
    });

    test('Retrieving summary with an open session', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Summary Open',
        email: `timeentries.summary.open.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; elapsed_minutes: number };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('open');
      expect(typeof body.current_session.elapsed_minutes).toBe('number');
    });

    test('Retrieving summary with session of more than 8 hours', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Summary Invalid',
        email: `timeentries.summary.invalid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: diretor.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; reason: string };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('invalid');
      expect(body.current_session.reason).toBe('exceeded_max_duration');
    });

    test('Retrieving summary with valid sessions', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Summary Valid Sessions',
        email: `timeentries.summary.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      await orchestrator.database.seed.createTimeEntry({
        user_id: diretor.id,
        clocked_in_at: fiveHoursAgo.toISOString(),
        clocked_out_at: oneHourAgo.toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as {
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(body.valid_sessions).toHaveLength(1);
      expect(body.total_minutes).toBeGreaterThan(230);
      expect(body.total_minutes).toBeLessThan(250);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving summary with no open session', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Summary Me',
        email: `timeentries.summary.me.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string };
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('none');
      expect(Array.isArray(body.valid_sessions)).toBe(true);
      expect(typeof body.total_minutes).toBe('number');
    });

    test('Retrieving summary with an open session', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Summary Open',
        email: `timeentries.summary.open.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; elapsed_minutes: number };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('open');
      expect(typeof body.current_session.elapsed_minutes).toBe('number');
    });

    test('Retrieving summary with session of more than 8 hours', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Summary Invalid',
        email: `timeentries.summary.invalid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: assessor.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; reason: string };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('invalid');
      expect(body.current_session.reason).toBe('exceeded_max_duration');
    });

    test('Retrieving summary with valid sessions', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Summary Valid Sessions',
        email: `timeentries.summary.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      await orchestrator.database.seed.createTimeEntry({
        user_id: assessor.id,
        clocked_in_at: fiveHoursAgo.toISOString(),
        clocked_out_at: oneHourAgo.toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as {
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(body.valid_sessions).toHaveLength(1);
      expect(body.total_minutes).toBeGreaterThan(230);
      expect(body.total_minutes).toBeLessThan(250);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving summary with no open session', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Summary Me',
        email: `timeentries.summary.me.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string };
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('none');
      expect(Array.isArray(body.valid_sessions)).toBe(true);
      expect(typeof body.total_minutes).toBe('number');
    });

    test('Retrieving summary with an open session', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Summary Open',
        email: `timeentries.summary.open.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      await fetch(`${BASE_URL}/clock-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; elapsed_minutes: number };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('open');
      expect(typeof body.current_session.elapsed_minutes).toBe('number');
    });

    test('Retrieving summary with session of more than 8 hours', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Summary Invalid',
        email: `timeentries.summary.invalid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createTimeEntry({
        user_id: presidente.id,
        clocked_in_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as {
        current_session: { status: string; reason: string };
      };

      expect(response.status).toBe(200);
      expect(body.current_session.status).toBe('invalid');
      expect(body.current_session.reason).toBe('exceeded_max_duration');
    });

    test('Retrieving summary with valid sessions', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Summary Valid Sessions',
        email: `timeentries.summary.valid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      await orchestrator.database.seed.createTimeEntry({
        user_id: presidente.id,
        clocked_in_at: fiveHoursAgo.toISOString(),
        clocked_out_at: oneHourAgo.toISOString(),
      });

      const response = await fetch(`${BASE_URL}/summary/me`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as {
        valid_sessions: unknown[];
        total_minutes: number;
      };

      expect(body.valid_sessions).toHaveLength(1);
      expect(body.total_minutes).toBeGreaterThan(230);
      expect(body.total_minutes).toBeLessThan(250);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve summary without token returns 401', async () => {
      const response = await fetch(`${BASE_URL}/summary/me`);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /time-entries/summary/:userId ───────────────────────────────────────

describe('GET /time-entries/summary/:userId', () => {
  describe('Authenticated CONSULTOR', () => {
    test("Trying to retrieve another user's summary", async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Summary Forbidden',
        email: `timeentries.summary.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other Summary',
        email: `timeentries.summary.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/summary/${other.id}`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test("Trying to retrieve another user's summary", async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Summary Forbidden',
        email: `timeentries.summary.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other Summary',
        email: `timeentries.summary.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/summary/${other.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test("Trying to retrieve another user's summary", async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Summary Forbidden',
        email: `timeentries.summary.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other Summary',
        email: `timeentries.summary.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/summary/${other.id}`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving summary for another user', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Summary By User',
        email: `timeentries.summary.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Summary',
        email: `timeentries.summary.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/summary/${target.id}`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as { min_hours_met: unknown };

      expect(response.status).toBe(200);
      expect(typeof body.min_hours_met).toBe('boolean');
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving summary for another user', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Summary By User',
        email: `timeentries.summary.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Summary Pres',
        email: `timeentries.summary.pres.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/summary/${target.id}`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve summary', async () => {
      const response = await fetch(
        `${BASE_URL}/summary/00000000-0000-0000-0000-000000000001`,
      );
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /time-entries ────────────────────────────────────────────────────────

describe('GET /time-entries', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to time entries', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor List Forbidden',
        email: `timeentries.list.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to time entries', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente List Forbidden',
        email: `timeentries.list.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Attempting to time entries', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor List Forbidden',
        email: `timeentries.list.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving time entries', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor List Entries',
        email: `timeentries.list.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const user = await orchestrator.database.seed.createUser({
        username: 'Member User',
        email: `timeentries.list.member.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const timeEntry = {
        user_id: user.id,
        clocked_in_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        clocked_out_at: new Date(Date.now()).toISOString(),
      };
      await orchestrator.database.seed.createTimeEntry(timeEntry);

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as {
        week_start: unknown;
        week_end: unknown;
        min_week_hours: unknown;
        members: { min_hours_met: unknown }[];
      };

      expect(response.status).toBe(200);
      expect(typeof body.week_start).toBe('string');
      expect(typeof body.week_end).toBe('string');
      expect(typeof body.min_week_hours).toBe('number');
      expect(Array.isArray(body.members)).toBe(true);
      body.members.forEach((m) => {
        expect(typeof m.min_hours_met).toBe('boolean');
      });
      expect(body.members).toContainEqual({
        user_id: user.id,
        name: user.name,
        min_hours_met: false,
        total_minutes: 2,
      });
    });

    test('Retrieving time entries for a specific week', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor List Week 1',
        email: `timeentries.list.week1.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      // Last week time entry
      const user1 = await orchestrator.database.seed.createUser({
        username: 'Member User 1',
        email: `timeentries.list.member1.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const user1TimeEntry = {
        user_id: user1.id,
        clocked_in_at: new Date(
          // Seven days and 1 minute ago
          Date.now() - (7 * 24 * 60 * 60 * 1000 + 60 * 1000),
        ).toISOString(),
        clocked_out_at: new Date(
          // Seven days ago
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      await orchestrator.database.seed.createTimeEntry(user1TimeEntry);

      // Current week time entry
      const user2 = await orchestrator.database.seed.createUser({
        username: 'Member User 2',
        email: `timeentries.list.member2.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const user2TimeEntry = {
        user_id: user2.id,
        clocked_in_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        clocked_out_at: new Date(Date.now()).toISOString(),
      };
      await orchestrator.database.seed.createTimeEntry(user2TimeEntry);

      const response = await fetch(`${BASE_URL}?week=1`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      const body = (await response.json()) as {
        week_start: unknown;
        week_end: unknown;
        min_week_hours: unknown;
        members: {
          user_id: string;
          name: string;
          min_hours_met: boolean;
          total_minutes: number;
        }[];
      };

      expect(body.members).toContainEqual({
        user_id: user1.id,
        name: user1.name,
        min_hours_met: false,
        total_minutes: 1,
      });
      expect(body.members).toContainEqual({
        user_id: user2.id,
        name: user2.name,
        min_hours_met: false,
        total_minutes: 0,
      });
      expect(response.status).toBe(200);
    });

    test('Attempting to retrieve time entries with invalid week parameter', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor List Invalid Week',
        email: `timeentries.list.invalidweek.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const nonNumeric = await fetch(`${BASE_URL}?week=invalid`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const negative = await fetch(`${BASE_URL}?week=-5`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      expect(nonNumeric.status).toBe(400);
      expect(negative.status).toBe(400);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving time entries', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente List Entries',
        email: `timeentries.list.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const user = await orchestrator.database.seed.createUser({
        username: 'Member User',
        email: `timeentries.list.member.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const timeEntry = {
        user_id: user.id,
        clocked_in_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        clocked_out_at: new Date(Date.now()).toISOString(),
      };
      await orchestrator.database.seed.createTimeEntry(timeEntry);

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as {
        week_start: unknown;
        week_end: unknown;
        min_week_hours: unknown;
        members: { min_hours_met: unknown }[];
      };

      expect(response.status).toBe(200);
      expect(typeof body.week_start).toBe('string');
      expect(typeof body.week_end).toBe('string');
      expect(typeof body.min_week_hours).toBe('number');
      expect(Array.isArray(body.members)).toBe(true);
      body.members.forEach((m) => {
        expect(typeof m.min_hours_met).toBe('boolean');
      });
      expect(body.members).toContainEqual({
        user_id: user.id,
        name: user.name,
        min_hours_met: false,
        total_minutes: 2,
      });
    });

    test('Retrieving time entries for a specific week', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente List Week 1',
        email: `timeentries.list.week1.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      // Last week time entry
      const user1 = await orchestrator.database.seed.createUser({
        username: 'Member User 1',
        email: `timeentries.list.member1.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const user1TimeEntry = {
        user_id: user1.id,
        clocked_in_at: new Date(
          // Seven days and 1 minute ago
          Date.now() - (7 * 24 * 60 * 60 * 1000 + 60 * 1000),
        ).toISOString(),
        clocked_out_at: new Date(
          // Seven days ago
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      await orchestrator.database.seed.createTimeEntry(user1TimeEntry);

      // Current week time entry
      const user2 = await orchestrator.database.seed.createUser({
        username: 'Member User 2',
        email: `timeentries.list.member2.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const user2TimeEntry = {
        user_id: user2.id,
        clocked_in_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        clocked_out_at: new Date(Date.now()).toISOString(),
      };
      await orchestrator.database.seed.createTimeEntry(user2TimeEntry);

      const response = await fetch(`${BASE_URL}?week=1`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      const body = (await response.json()) as {
        week_start: unknown;
        week_end: unknown;
        min_week_hours: unknown;
        members: {
          user_id: string;
          name: string;
          min_hours_met: boolean;
          total_minutes: number;
        }[];
      };

      expect(body.members).toContainEqual({
        user_id: user1.id,
        name: user1.name,
        min_hours_met: false,
        total_minutes: 1,
      });
      expect(body.members).toContainEqual({
        user_id: user2.id,
        name: user2.name,
        min_hours_met: false,
        total_minutes: 0,
      });
      expect(response.status).toBe(200);
    });

    test('Attempting to retrieve time entries with invalid week parameter', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente List Invalid Week',
        email: `timeentries.list.invalidweek.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const nonNumeric = await fetch(`${BASE_URL}?week=invalid`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const negative = await fetch(`${BASE_URL}?week=-5`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      expect(nonNumeric.status).toBe(400);
      expect(negative.status).toBe(400);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve time entries', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
