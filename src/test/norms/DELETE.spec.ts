import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/norms';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── DELETE /norms/:id ────────────────────────────────────────────────────────

describe('DELETE /norms/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to delete a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Delete Norm',
        email: `norms.delete.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DC${Date.now()}`,
        description: 'Para deletar',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to delete a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Delete Norm',
        email: `norms.delete.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DC${Date.now()}`,
        description: 'Para deletar',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Attempting to delete a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Delete Norm',
        email: `norms.delete.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DC${Date.now()}`,
        description: 'Para deletar',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Deleting a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Delete Norm',
        email: `norms.delete.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DA${Date.now()}`,
        description: 'Para deletar',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(204);
    });

    test('Attempting to delete a non-existent norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Delete Norm 404',
        email: `norms.delete.assessor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Deleting a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Delete Norm',
        email: `norms.delete.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DP${Date.now()}`,
        description: 'Para deletar pelo presidente',
        severity: 'moderada',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to delete a norm', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
