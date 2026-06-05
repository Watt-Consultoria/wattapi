import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/houses';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /houses ──────────────────────────────────────────────────────────────

describe('GET /houses', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing houses returns all 3 houses', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Houses GET',
        email: `houses.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as {
        id: string;
        name: string;
        total_points: number;
      }[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(3);
      const names = body.map((h) => h.name).sort();
      expect(names).toEqual(['Lumina', 'Nexus', 'Voltus']);
      expect(body.every((h) => typeof h.total_points === 'number')).toBe(true);
    });

    test('Houses have total_points = 0 when no active cycle exists', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Houses GET No Cycle',
        email: `houses.get.nocycle.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as { total_points: number }[];

      expect(response.status).toBe(200);
      expect(body.every((h) => h.total_points === 0)).toBe(true);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /houses/:id/members ──────────────────────────────────────────────────

describe('GET /houses/:id/members', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Returns members assigned to the house', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const lumina = houses.find((h) => h.name === 'Lumina')!;

      const member = await orchestrator.database.seed.createUser({
        username: 'Membro Lumina',
        email: `houses.members.lumina.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(member.id, lumina.id);

      const caller = await orchestrator.database.seed.createUser({
        username: 'Consultor Members GET',
        email: `houses.members.caller.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${lumina.id}/members`, {
        headers: { Authorization: `Bearer ${caller.token}` },
      });
      const body = (await response.json()) as { id: string }[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((u) => u.id === member.id)).toBe(true);
    });

    test('Returns 404 for non-existent house', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Members 404',
        email: `houses.members.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/members`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const response = await fetch(`${BASE_URL}/${houses[0].id}/members`);
      expect(response.status).toBe(401);
    });
  });
});
