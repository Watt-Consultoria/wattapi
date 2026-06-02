import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/users';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('DELETE /users/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Trying to delete a user', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor DELETE',
        email: `users.delete.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other DELETE',
        email: `users.delete.consultor.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${other.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Trying to delete a user', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente DELETE',
        email: `users.delete.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other DELETE',
        email: `users.delete.consultor.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${other.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to delete a user', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'DIRETOR DELETE',
        email: `users.delete.DIRETOR.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other DELETE',
        email: `users.delete.consultor.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${other.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to delete a user', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { method: 'DELETE' },
      );
      expect(response.status).toBe(401);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Deleting another user', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor DELETE',
        email: `users.delete.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target DELETE',
        email: `users.delete.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      expect(response.status).toBe(204);
      const text = await response.text();
      expect(text).toBe('');

      const getResponse = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(getResponse.status).toBe(404);
    });

    test('Attempting to delete oneself', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Self Delete',
        email: `users.delete.selfdelete.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${assessor.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(response.status).toBe(403);
    });

    test('Attempting to delete a non-existent user', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor 404 Delete',
        email: `users.delete.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${assessor.token}` },
        },
      );
      expect(response.status).toBe(404);
    });

    test('Attempting to delete a higher role user', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Role Delete',
        email: `users.delete.roledelete.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Role Delete',
        email: `users.delete.target.roledelete.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Deleting another user', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente DELETE',
        email: `users.delete.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target DELETE',
        email: `users.delete.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      expect(response.status).toBe(204);
      const text = await response.text();
      expect(text).toBe('');

      const getResponse = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      expect(getResponse.status).toBe(404);
    });

    test('Attempting to delete oneself', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Self Delete',
        email: `users.delete.selfdelete.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${presidente.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      expect(response.status).toBe(403);
    });

    test('Attempting to delete a non-existent user', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente 404 Delete',
        email: `users.delete.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${presidente.token}` },
        },
      );
      expect(response.status).toBe(404);
    });
  });
});
