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

const validPayload = {
  code: 'AN99',
  description: 'Norma de teste',
  severity: 'leve',
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /norms ──────────────────────────────────────────────────────────────

describe('POST /norms', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to create a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Post Norm',
        email: `norms.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ ...validPayload, code: `AC${Date.now()}` }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to create a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Post Norm',
        email: `norms.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ ...validPayload, code: `AG${Date.now()}` }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Attempting to create a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Post Norm',
        email: `norms.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ ...validPayload, code: `AD${Date.now()}` }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Creating a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Post Norm',
        email: `norms.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const code = `AA${Date.now()}`;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          code,
          description: 'Norma criada por assessor',
          severity: 'moderada',
        }),
      });
      const body = (await response.json()) as NormResponse;

      expect(response.status).toBe(201);
      expect(body.code).toBe(code);
      expect(body.severity).toBe('moderada');
    });

    test('Attempting to create norm with duplicate code', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Post Norm Dup',
        email: `norms.post.assessor.dup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const code = `DUP${Date.now()}`;

      await orchestrator.database.seed.createNorm({
        code,
        description: 'Original',
        severity: 'leve',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          code,
          description: 'Duplicata',
          severity: 'leve',
        }),
      });

      expect(response.status).toBe(409);
    });

    test('Attempting to create norm with missing required field', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Post Norm Bad',
        email: `norms.post.assessor.bad.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          code: 'XX01' /* description and severity missing */,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a norm', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Post Norm',
        email: `norms.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const code = `AP${Date.now()}`;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          code,
          description: 'Norma criada pelo presidente',
          severity: 'grave',
        }),
      });
      const body = (await response.json()) as NormResponse;

      expect(response.status).toBe(201);
      expect(body.severity).toBe('grave');
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a norm', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(401);
    });
  });
});
