import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/violations';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
  await orchestrator.email.deleteAllEmails();
});

// ─── DELETE /violations/:id ───────────────────────────────────────────────────

describe('DELETE /violations/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to cancel a violation', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Cancel Own',
        email: `violations.delete.gerente.own.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cancel Own Target',
        email: `violations.delete.gerente.own.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DGO${ts}`,
        description: 'Norma delete gerente',
        severity: 'leve',
      });

      const violation = await orchestrator.database.seed.createViolation({
        user_id: gerente.id,
        norm_id: norm.id,
        applied_by: gerente.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Canceling their own created violation', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Cancel Own',
        email: `violations.delete.gerente.own.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cancel Own Target',
        email: `violations.delete.gerente.own.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DGO${ts}`,
        description: 'Norma delete gerente',
        severity: 'leve',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: gerente.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      expect(response.status).toBe(204);
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

    test('Attempting to cancel a violation created by an superior', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Cancel Forbidden',
        email: `violations.delete.gerente.forbidden.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cancel Forbidden Target',
        email: `violations.delete.gerente.forbidden.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Cancel Forbidden',
        email: `violations.delete.gerente.forbidden.pres.${ts}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DGF${ts}`,
        description: 'Norma delete forbidden',
        severity: 'grave',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: presidente.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      expect(response.status).toBe(403);
    });

    test('Attempting to cancel an already cancelled violation', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Cancel Already',
        email: `violations.delete.gerente.already.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cancel Already Target',
        email: `violations.delete.gerente.already.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DGA${ts}`,
        description: 'Norma already cancelled',
        severity: 'leve',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: gerente.id,
        cancelled_at: new Date().toISOString(),
        cancelled_by: gerente.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      expect(response.status).toBe(409);
    });

    test('Attempting to cancel a non-existent violation', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Cancel 404',
        email: `violations.delete.gerente.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
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

  describe('Authenticated DIRETOR', () => {
    test("Canceling subordinate's violations", async () => {
      const ts = Date.now();
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor Cancel By Assessor',
        email: `violations.delete.assessor.${ts}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Cancel By Diretor',
        email: `violations.delete.diretor.gerente.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cancel By Pres',
        email: `violations.delete.presidente.consultor.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DPA${ts}`,
        description: 'Norma presidente cancel',
        severity: 'moderada',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: gerente.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      expect(response.status).toBe(204);
    });

    test('Attempting to cancel a violation created by an superior', async () => {
      const ts = Date.now();
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor Cancel Forbidden',
        email: `violations.delete.diretor.forbidden.${ts}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cancel Forbidden Target',
        email: `violations.delete.diretor.forbidden.target.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Cancel Forbidden',
        email: `violations.delete.diretor.forbidden.pres.${ts}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DGF${ts}`,
        description: 'Norma delete forbidden',
        severity: 'grave',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: presidente.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test("Canceling subordinate's violations", async () => {
      const ts = Date.now();
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Cancel By Pres',
        email: `violations.delete.assessor.${ts}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'executivo',
      });
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor Cancel By Assessor',
        email: `violations.delete.presidente.diretor.${ts}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cancel By Pres',
        email: `violations.delete.presidente.consultor.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DPA${ts}`,
        description: 'Norma presidente cancel',
        severity: 'moderada',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: diretor.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test("Canceling subordinate's violations", async () => {
      const ts = Date.now();
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Cancel Any',
        email: `violations.delete.presidente.${ts}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Cancel By Pres',
        email: `violations.delete.presidente.gerente.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cancel By Pres',
        email: `violations.delete.presidente.consultor.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `DPA${ts}`,
        description: 'Norma presidente cancel',
        severity: 'moderada',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: gerente.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to cancel a violation', async () => {
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
