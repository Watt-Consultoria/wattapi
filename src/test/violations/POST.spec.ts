import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/violations';

type ViolationResponse = {
  id: string;
  user_id: string;
  norm: { id: string; code: string; severity: string; points: number };
  reason: string | null;
  status: string;
  expires_at: string;
  applied_at: string;
  applied_by: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
  await orchestrator.email.deleteAllEmails();
});

// ─── POST /violations ─────────────────────────────────────────────────────────

describe('POST /violations', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to apply a violation', async () => {
      const ts = Date.now();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Post Violation',
        email: `violations.post.consultor.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Consultor Violation',
        email: `violations.post.consultor.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PC${ts}`,
        description: 'Norma consultor',
        severity: 'leve',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ user_id: target.id, norm_id: norm.id }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Applying violation to subordinate', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Post Violation',
        email: `violations.post.gerente.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Target Violation',
        email: `violations.post.gerente.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PG${ts}`,
        description: 'Norma gerente',
        severity: 'moderada',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({
          user_id: consultor.id,
          norm_id: norm.id,
          reason: 'Teste gerente',
        }),
      });
      const body = (await response.json()) as ViolationResponse;

      expect(response.status).toBe(201);
      expect(body.user_id).toBe(consultor.id);
      expect(body.norm.severity).toBe('moderada');
      expect(body.applied_by).toBe(gerente.id);

      const email = (await orchestrator.email.waitForLastEmail()) as {
        recipients: string[];
        subject: string;
        text: string;
      } | null;

      expect(email).not.toBeNull();
      expect(email!.recipients).toContain(consultor.email);
      expect(email!.subject).toContain(consultor.name);
      expect(email!.text).toContain(consultor.name);
    });

    test('Attempting to apply violation to non-subordinate', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Post Violation Cross',
        email: `violations.post.gerente.cross.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const outroSetor = await orchestrator.database.seed.createUser({
        username: 'Consultor Outro Setor Violation',
        email: `violations.post.gerente.cross.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PGC${ts}`,
        description: 'Norma cross sector',
        severity: 'leve',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ user_id: outroSetor.id, norm_id: norm.id }),
      });

      expect(response.status).toBe(403);
    });

    test('Attempting to apply violation with missing required field', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Post Violation Bad',
        email: `violations.post.gerente.bad.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          norm_id: '00000000-0000-0000-0000-000000000001' /* user_id missing */,
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to apply violation with non-existent normId', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Post Violation No Norm',
        email: `violations.post.gerente.nonorm.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor No Norm Target',
        email: `violations.post.gerente.nonorm.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({
          user_id: consultor.id,
          norm_id: 'a0000000-0000-4000-8000-000000000001',
        }),
      });

      expect(response.status).toBe(404);
    });

    test('Attempting to apply violation to inactive user', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Post Violation Inactive',
        email: `violations.post.gerente.inactive.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PGI${ts}`,
        description: 'Norma inactive',
        severity: 'leve',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({
          user_id: 'a0000000-0000-4000-8000-000000000001',
          norm_id: norm.id,
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Applying a violation', async () => {
      const ts = Date.now();
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Post Violation',
        email: `violations.post.presidente.${ts}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Presidente Violation',
        email: `violations.post.presidente.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `PP${ts}`,
        description: 'Norma presidente',
        severity: 'grave',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ user_id: target.id, norm_id: norm.id }),
      });
      const body = (await response.json()) as ViolationResponse;

      expect(response.status).toBe(201);
      expect(body.norm.severity).toBe('grave');
      expect(body.norm.points).toBe(6);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to apply a violation', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '00000000-0000-0000-0000-000000000001',
          norm_id: '00000000-0000-0000-0000-000000000001',
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
