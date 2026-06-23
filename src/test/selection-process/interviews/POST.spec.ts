import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process/interviews';

// Valid future times: 08:00 BRT = 11:00 UTC, 09:00 BRT = 12:00 UTC
const VALID_SLOT_1 = '2026-08-01T11:00:00Z';
const VALID_SLOT_2 = '2026-08-01T12:00:00Z';

type InterviewSlotResponse = {
  id: string;
  selection_process_id: string;
  consultant_id: string;
  starts_at: string;
  ends_at: string;
  booking_id: string | null;
  created_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /selection-process/interviews ──────────────────────────────────────

describe('POST /selection-process/interviews', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Creating a batch of valid interview slots', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Slots',
        email: `psel.interviews.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createSelectionProcess();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots: [VALID_SLOT_1, VALID_SLOT_2] }),
      });
      const body = (await response.json()) as InterviewSlotResponse[];

      expect(response.status).toBe(201);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
      expect(body[0].consultant_id).toBe(user.id);
      expect(body[0].starts_at).toBeDefined();
      expect(body[0].ends_at).toBeDefined();
    });

    test('Creating a slot that was already registered by the same consultant', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Slots Dup',
        email: `psel.interviews.post.consultor.dup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createSelectionProcess();

      await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots: ['2026-08-02T11:00:00Z'] }),
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slots: ['2026-08-02T11:00:00Z', '2026-08-02T14:00:00Z'],
        }),
      });
      const body = (await response.json()) as InterviewSlotResponse[];

      expect(response.status).toBe(201);
      expect(body.length).toBe(1);
      expect(body[0].starts_at).toContain('14:00');
    });

    test('Attempting to create a slot at a non-full hour', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Slots BadTime',
        email: `psel.interviews.post.consultor.badtime.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createSelectionProcess();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots: ['2026-08-01T11:30:00Z'] }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to create a slot outside the allowed business hours range', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Slots OutOfRange',
        email: `psel.interviews.post.consultor.outrange.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createSelectionProcess();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots: ['2026-08-01T23:00:00Z'] }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to create a slot in the past', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Slots Past',
        email: `psel.interviews.post.consultor.past.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createSelectionProcess();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots: ['2026-01-01T11:00:00Z'] }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to create with an empty slots array', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Slots Empty',
        email: `psel.interviews.post.consultor.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots: [] }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to create slots when no active selection process exists', async () => {
      await orchestrator.database.clear();

      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Slots No Process',
        email: `psel.interviews.post.consultor.noprocess.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots: [VALID_SLOT_1] }),
      });

      expect(response.status).toBe(404);
    });

    test('Creating slots at the same time as another consultant for the same time window', async () => {
      const consultorA = await orchestrator.database.seed.createUser({
        username: 'Consultor A POST Slots Parallel',
        email: `psel.interviews.post.consultor.a.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const consultorB = await orchestrator.database.seed.createUser({
        username: 'Consultor B POST Slots Parallel',
        email: `psel.interviews.post.consultor.b.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createSelectionProcess();

      const [resA, resB] = await Promise.all([
        fetch(BASE_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultorA.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slots: ['2026-08-04T11:00:00Z'] }),
        }),
        fetch(BASE_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultorB.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slots: ['2026-08-04T11:00:00Z'] }),
        }),
      ]);

      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Creating interview slots', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Slots',
        email: `psel.interviews.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createSelectionProcess();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots: ['2026-08-03T11:00:00Z'] }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create slots without a token', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: [VALID_SLOT_1] }),
      });

      expect(response.status).toBe(401);
    });
  });
});
