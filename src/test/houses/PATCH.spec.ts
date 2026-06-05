import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/houses';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PATCH /users/:id/house ───────────────────────────────────────────────────

describe('PATCH /users/:id/house', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Assigns a house to a user', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const voltus = houses.find((h) => h.name === 'Voltus')!;

      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Assign House',
        email: `house.patch.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Assign',
        email: `house.patch.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/members/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ house_id: voltus.id }),
      });
      const body = (await response.json()) as { id: string; house_id: string };

      expect(response.status).toBe(200);
      expect(body.id).toBe(target.id);
      expect(body.house_id).toBe(voltus.id);
    });

    test('Returns 404 when house_id does not exist', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Assign 404 House',
        email: `house.patch.nohouse.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target 404 House',
        email: `house.patch.target.nohouse.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/members/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({
          house_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        }),
      });
      expect(response.status).toBe(404);
    });

    test('Returns 404 when user does not exist', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Assign 404 User',
        email: `house.patch.nouser.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${BASE_URL}/members/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${assessor.token}`,
          },
          body: JSON.stringify({ house_id: houses[0].id }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Assigns a house to a user', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const nexus = houses.find((h) => h.name === 'Nexus')!;

      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Assign House',
        email: `house.patch.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Presidente Assign',
        email: `house.patch.pres.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/members/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ house_id: nexus.id }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Returns 403', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Forbidden House',
        email: `house.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Consultor Forbidden',
        email: `house.patch.cons.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/members/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ house_id: houses[0].id }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const response = await fetch(
        `${BASE_URL}/members/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ house_id: houses[0].id }),
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
