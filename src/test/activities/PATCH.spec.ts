import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/activities';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PATCH /activities/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Updating own activity', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH Activity',
        email: `activities.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: consultor.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ name: 'Nome atualizado' }),
      });
      const body = (await response.json()) as { name: string };

      expect(response.status).toBe(200);
      expect(body.name).toBe('Nome atualizado');
    });

    test('Attempting to update with empty body', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH Empty',
        email: `activities.patch.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: consultor.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to update non-existent activity', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH 404',
        email: `activities.patch.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${consultor.token}`,
          },
          body: JSON.stringify({ name: 'X' }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Updating own activity', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente PATCH Activity',
        email: `activities.patch.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: gerente.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ name: 'Nome atualizado' }),
      });
      const body = (await response.json()) as { name: string };

      expect(response.status).toBe(200);
      expect(body.name).toBe('Nome atualizado');
    });

    test("Attempting to update another user's activity", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Activity Owner',
        email: `activities.patch.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente PATCH Forbidden',
        email: `activities.patch.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ name: 'Tentativa' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Updating own activity', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor PATCH Activity',
        email: `activities.patch.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: diretor.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ name: 'Nome atualizado' }),
      });
      const body = (await response.json()) as { name: string };

      expect(response.status).toBe(200);
      expect(body.name).toBe('Nome atualizado');
    });

    test("Attempting to update another user's activity", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Activity Owner',
        email: `activities.patch.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor PATCH Forbidden',
        email: `activities.patch.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ name: 'Tentativa' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Updating own activity', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor PATCH Activity',
        email: `activities.patch.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: assessor.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ name: 'Nome atualizado' }),
      });
      const body = (await response.json()) as { name: string };

      expect(response.status).toBe(200);
      expect(body.name).toBe('Nome atualizado');
    });

    test("Attempting to update another user's activity", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Activity Owner',
        email: `activities.patch.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor PATCH Forbidden',
        email: `activities.patch.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'projetos',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ name: 'Tentativa' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Updating own activity', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente PATCH Activity',
        email: `activities.patch.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: presidente.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ name: 'Nome atualizado' }),
      });
      const body = (await response.json()) as { name: string };

      expect(response.status).toBe(200);
      expect(body.name).toBe('Nome atualizado');
    });

    test("Attempting to update another user's activity", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Activity Owner',
        email: `activities.patch.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente PATCH Forbidden',
        email: `activities.patch.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'projetos',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ name: 'Tentativa' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update an activity without token', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Novo nome' }),
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
