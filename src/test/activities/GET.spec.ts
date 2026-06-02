import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/activities';

type ActivityBody = {
  id: string;
  user_id: string;
  name: string;
  date: string;
  time_start: string;
  time_end: string;
  priority: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /activities ──────────────────────────────────────────────────────────

describe('GET /activities', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving own activities', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Activities',
        email: `activities.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const otherUser = await orchestrator.database.seed.createUser({
        username: 'Other User Activities',
        email: `activities.get.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createActivity({
        user_id: consultor.id,
      });
      await orchestrator.database.seed.createActivity({
        user_id: otherUser.id,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((a) => expect(a.user_id).toBe(consultor.id));
    });

    test('Retrieving activities by exact date', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Date Filter',
        email: `activities.get.datefilter.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createActivity({
        user_id: consultor.id,
        date: '2026-01-15',
      });

      const response = await fetch(`${BASE_URL}?date=2026-01-15`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      body.forEach((a) => expect(a.date).toBe('2026-01-15'));
    });

    test('Retrieving activities by date range with from/to', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Range Filter',
        email: `activities.get.range.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createActivity({
        user_id: consultor.id,
        date: '2026-06-10',
      });

      const response = await fetch(
        `${BASE_URL}?from=2026-06-01&to=2026-06-30`,
        {
          headers: { Authorization: `Bearer ${consultor.token}` },
        },
      );
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      body.forEach((a) => {
        expect(a.date >= '2026-06-01').toBe(true);
        expect(a.date <= '2026-06-30').toBe(true);
      });
    });

    test('Retrieving activities by date outside range', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor No Range',
        email: `activities.get.norange.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createActivity({
        user_id: consultor.id,
      });

      const response = await fetch(`${BASE_URL}?date=1999-01-01`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      expect(body).toHaveLength(0);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving activities of one subordinate', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Activities',
        email: `activities.get.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const subordinate = await orchestrator.database.seed.createUser({
        username: 'Subordinate Projetos',
        email: `activities.get.gerente.sub.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: subordinate.id,
        date: '2026-07-01',
      });

      const response = await fetch(`${BASE_URL}?id=${subordinate.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      body.forEach((a) => expect(a.user_id).toBe(subordinate.id));
      expect(body.some((a) => a.id === activity.id)).toBe(true);
    });

    test('Retrieving activities of an not subordinate', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Cross Sector',
        email: `activities.get.gerente.cross.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const outsideUser = await orchestrator.database.seed.createUser({
        username: 'User Other Sector',
        email: `activities.get.gerente.outside.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createActivity({
        user_id: outsideUser.id,
      });

      const response = await fetch(`${BASE_URL}?id=${outsideUser.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      expect(body).toHaveLength(0);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving all users activities', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor GET Activities',
        email: `activities.get.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const userA = await orchestrator.database.seed.createUser({
        username: 'User A Activities',
        email: `activities.get.assessor.usera.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const userB = await orchestrator.database.seed.createUser({
        username: 'User B Activities',
        email: `activities.get.assessor.userb.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createActivity({ user_id: userA.id });
      await orchestrator.database.seed.createActivity({ user_id: userB.id });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      const userIds = new Set(body.map((a) => a.user_id));
      expect(userIds.size).toBeGreaterThan(1);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving all users activities', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Activities',
        email: `activities.get.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });
      const userA = await orchestrator.database.seed.createUser({
        username: 'User A Activities',
        email: `activities.get.presidente.usera.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const userB = await orchestrator.database.seed.createUser({
        username: 'User B Activities',
        email: `activities.get.presidente.userb.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createActivity({ user_id: userA.id });
      await orchestrator.database.seed.createActivity({ user_id: userB.id });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      const userIds = new Set(body.map((a) => a.user_id));
      expect(userIds.size).toBeGreaterThan(1);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve activities', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /activities/me ───────────────────────────────────────────────────────

describe('GET /activities/me', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving own activities', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Me Activities',
        email: `activities.me.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: consultor.id,
      });

      const response = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((a) => expect(a.user_id).toBe(consultor.id));
      expect(body.some((a) => a.id === activity.id)).toBe(true);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving own activities', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Me Activities',
        email: `activities.me.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: gerente.id,
      });

      const response = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((a) => expect(a.user_id).toBe(gerente.id));
      expect(body.some((a) => a.id === activity.id)).toBe(true);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving own activities', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Me Activities',
        email: `activities.me.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: diretor.id,
      });

      const response = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((a) => expect(a.user_id).toBe(diretor.id));
      expect(body.some((a) => a.id === activity.id)).toBe(true);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving only own activities', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Me Activities',
        email: `activities.me.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other Me Activities',
        email: `activities.me.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createActivity({ user_id: other.id });

      const response = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      body.forEach((a) => expect(a.user_id).toBe(assessor.id));
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving own activities', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Me Activities',
        email: `activities.me.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: presidente.id,
      });

      const response = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as ActivityBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((a) => expect(a.user_id).toBe(presidente.id));
      expect(body.some((a) => a.id === activity.id)).toBe(true);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve own activities without token', async () => {
      const response = await fetch(`${BASE_URL}/me`);
      expect(response.status).toBe(401);
    });
  });
});
