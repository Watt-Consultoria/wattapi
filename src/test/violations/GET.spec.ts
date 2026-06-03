import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/violations';

type ViolationStatus = 'active' | 'cancelled' | 'expired';
type NormSeverity = 'leve' | 'moderada' | 'grave' | 'desligamento';

type ViolationItem = {
  id: string;
  user_id: string;
  norm: {
    id: string;
    code: string;
    description: string;
    severity: NormSeverity;
    points: number;
  };
  reason: string | null;
  status: ViolationStatus;
  expires_at: string;
  cancelled_at: string | null;
  applied_at: string;
  created_at: string;
  applied_by?: string;
};

type ViolationSummary = {
  score: number;
  active_leves: number;
  active_moderadas: number;
  active_graves: number;
  active_desligamentos: number;
  at_risk: boolean;
};

type MemberViolationsResponse = {
  user_id: string;
  violations: ViolationItem[];
  summary: ViolationSummary;
};

type MeViolationsResponse = {
  violations: ViolationItem[];
  summary: ViolationSummary;
};

type ViolationWithAppliedBy = ViolationItem & { applied_by: string };

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
  await orchestrator.email.deleteAllEmails();
});

// ─── GET /violations/me ───────────────────────────────────────────────────────

describe('GET /violations/me', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving own violations', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Me Violations',
        email: `violations.get.me.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Me Violations',
        email: `violations.get.me.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const norm = await orchestrator.database.seed.createNorm({
        code: `ME${Date.now()}`,
        description: 'Norma para GET /me',
        severity: 'leve',
      });

      // Ativa
      await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: assessor.id,
        reason: 'Teste me',
      });

      // Cancelada
      await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: assessor.id,
        cancelled_at: new Date().toISOString(),
        cancelled_by: assessor.id,
      });

      const response = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as MeViolationsResponse;

      expect(response.status).toBe(200);
      expect(body.violations).toHaveLength(2);
      expect(body.violations[0].user_id).toBe(consultor.id);
      expect(body.violations[0].applied_by).toBeUndefined();
      expect(body.violations[0].status).toBe('active');
      expect(body.violations[1].status).toBe('cancelled');
      expect(body.summary.active_leves).toBe(1);
      expect(body.summary.score).toBe(1);
      expect(body.summary.at_risk).toBe(false);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to view own violations without a token', async () => {
      const response = await fetch(`${BASE_URL}/me`);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /violations ──────────────────────────────────────────────────────────

describe('GET /violations', () => {
  describe('Authenticated GERENTE', () => {
    test('Retrieving violations of subordinates', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Violations',
        email: `violations.get.gerente.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const subordinado = await orchestrator.database.seed.createUser({
        username: 'Consultor Subordinado Violations',
        email: `violations.get.consultor.sub.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const outroSetor = await orchestrator.database.seed.createUser({
        username: 'Consultor Outro Setor Violations',
        email: `violations.get.consultor.other.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Violations Gerente Test',
        email: `violations.get.assessor.gt.${ts}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `GV${ts}`,
        description: 'Norma gerente',
        severity: 'leve',
      });
      await orchestrator.database.seed.createViolation({
        user_id: subordinado.id,
        norm_id: norm.id,
        applied_by: assessor.id,
      });
      await orchestrator.database.seed.createViolation({
        user_id: outroSetor.id,
        norm_id: norm.id,
        applied_by: assessor.id,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as MemberViolationsResponse[];

      expect(response.status).toBe(200);
      const ids = body.map((m) => m.user_id);
      expect(ids).toContain(subordinado.id);
      expect(ids).not.toContain(outroSetor.id);
    });

    test('Retrieving violations filtered by subordinate userId', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Filter Violations',
        email: `violations.get.gerente.filter.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Filter Violations',
        email: `violations.get.consultor.filter.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}?user_id=${consultor.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as MemberViolationsResponse[];

      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].user_id).toBe(consultor.id);
    });

    test('Retrieving violations filtered by non subordinate userId', async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Forbidden Filter',
        email: `violations.get.gerente.forbidden.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const outroSetor = await orchestrator.database.seed.createUser({
        username: 'Consultor Outside Hierarchy',
        email: `violations.get.consultor.outside.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}?user_id=${outroSetor.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving all violations', async () => {
      const ts = Date.now();
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente All Violations',
        email: `violations.get.presidente.${ts}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const consultorA = await orchestrator.database.seed.createUser({
        username: 'Consultor A All Violations',
        email: `violations.get.consultor.a.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const consultorB = await orchestrator.database.seed.createUser({
        username: 'Consultor B All Violations',
        email: `violations.get.consultor.b.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as MemberViolationsResponse[];

      expect(response.status).toBe(200);
      const ids = body.map((m) => m.user_id);
      expect(ids).toContain(consultorA.id);
      expect(ids).toContain(consultorB.id);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to list violations', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /violations/:id ──────────────────────────────────────────────────────

describe('GET /violations/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving own violation', async () => {
      const ts = Date.now();
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Get By Id',
        email: `violations.get.id.assessor.${ts}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Get By Id',
        email: `violations.get.id.consultor.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `GID${ts}`,
        description: 'Get by ID',
        severity: 'moderada',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: assessor.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ViolationWithAppliedBy;

      expect(response.status).toBe(200);
      expect(body.id).toBe(violation.id);
      expect(body.applied_by).toBe(assessor.id);
    });

    test('Attempting to retrieve another user violation', async () => {
      const ts = Date.now();
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Get Id Forbidden',
        email: `violations.get.id.assessor.forbidden.${ts}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const owner = await orchestrator.database.seed.createUser({
        username: 'Consultor Owner Get Id',
        email: `violations.get.id.owner.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const caller = await orchestrator.database.seed.createUser({
        username: 'Consultor Caller Forbidden',
        email: `violations.get.id.caller.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `GIF${ts}`,
        description: 'Forbidden get',
        severity: 'leve',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: owner.id,
        norm_id: norm.id,
        applied_by: assessor.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        headers: { Authorization: `Bearer ${caller.token}` },
      });

      expect(response.status).toBe(403);
    });

    test('Attempting to retrieve a non-existent violation', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Get Id 404',
        email: `violations.get.id.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE', () => {
    test("Retrieving own subordinate's violations", async () => {
      const ts = Date.now();
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Get Id Superior',
        email: `violations.get.id.gerente.${ts}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Get Id By Gerente',
        email: `violations.get.id.consultor.gerente.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Get Id By Gerente',
        email: `violations.get.id.assessor.gerente.${ts}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const norm = await orchestrator.database.seed.createNorm({
        code: `GGR${ts}`,
        description: 'Gerente superior',
        severity: 'leve',
      });
      const violation = await orchestrator.database.seed.createViolation({
        user_id: consultor.id,
        norm_id: norm.id,
        applied_by: assessor.id,
      });

      const response = await fetch(`${BASE_URL}/${violation.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as ViolationWithAppliedBy;

      expect(response.status).toBe(200);
      expect(body.applied_by).toBe(assessor.id);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to view a violation', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
      );
      expect(response.status).toBe(401);
    });
  });
});
