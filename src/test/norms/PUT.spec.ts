import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/norms';

type NormResponse = {
  id: string;
  code: string;
  description: string;
  severity: 'leve' | 'moderada' | 'grave' | 'desligamento';
  created_at: string;
  updated_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PUT /norms/:id ───────────────────────────────────────────────────────────

describe('PUT /norms/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to update a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Put Norm',
        email: `norms.put.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PC${Date.now()}`,
        description: 'Original',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'Atualizada' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to update a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Put Norm',
        email: `norms.put.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PC${Date.now()}`,
        description: 'Original',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'Atualizada' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Attempting to update a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Put Norm',
        email: `norms.put.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PC${Date.now()}`,
        description: 'Original',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'Atualizada' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Updating a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Put Norm',
        email: `norms.put.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PA${Date.now()}`,
        description: 'Descrição original',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'Descrição atualizada' }),
      });
      const body = (await response.json()) as NormResponse;

      expect(response.status).toBe(200);
      expect(body.description).toBe('Descrição atualizada');
      expect(body.code).toBe(norm.code);
    });

    test('Code field is ignored on update', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Put Norm Code',
        email: `norms.put.assessor.code.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const originalCode = `PC2${Date.now()}`;
      const norm = await orchestrator.database.seed.createNorm({
        code: originalCode,
        description: 'Original',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ code: 'CHANGED', description: 'Atualizada' }),
      });
      const body = (await response.json()) as NormResponse;

      expect(response.status).toBe(200);
      expect(body.code).toBe(originalCode);
    });

    test('Attempting to update a non-existent norm returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Put Norm 404',
        email: `norms.put.assessor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ description: 'Atualizada' }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Updating severity of a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Put Norm',
        email: `norms.put.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PP${Date.now()}`,
        description: 'Norma',
        severity: 'leve',
      });

      const response = await fetch(`${BASE_URL}/${norm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ severity: 'grave' }),
      });
      const body = (await response.json()) as NormResponse;

      expect(response.status).toBe(200);
      expect(body.severity).toBe('grave');
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update a norm', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Atualizada' }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
