import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/routine';

type RoutineBody = { slots: Record<string, boolean[]> };

const FULL_SLOTS = {
  mon: Array(14).fill(true) as boolean[],
  tue: Array(14).fill(true) as boolean[],
  wed: Array(14).fill(true) as boolean[],
  thu: Array(14).fill(true) as boolean[],
  fri: Array(14).fill(true) as boolean[],
  sat: Array(14).fill(false) as boolean[],
  sun: Array(14).fill(false) as boolean[],
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /routine ─────────────────────────────────────────────────────────────

describe('GET /routine', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving not configured routine', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Routine',
        email: `routine.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as { slots: null };

      expect(response.status).toBe(200);
      expect(body.slots).toBeNull();
    });

    test('Retrieving saved routine', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Routine Saved',
        email: `routine.get.saved.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        slots: typeof FULL_SLOTS | null;
      };

      expect(response.status).toBe(200);
      expect(body.slots).not.toBeNull();
      expect(body.slots!.mon).toHaveLength(14);
      expect(body.slots!.mon).toEqual(Array(14).fill(true));
      expect(body.slots!.sat).toEqual(Array(14).fill(false));
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving not configured routine', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente GET Routine',
        email: `routine.get.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as { slots: null };

      expect(response.status).toBe(200);
      expect(body.slots).toBeNull();
    });

    test('Retrieving saved routine', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente GET Routine Saved',
        email: `routine.get.saved.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as {
        slots: typeof FULL_SLOTS | null;
      };

      expect(response.status).toBe(200);
      expect(body.slots).not.toBeNull();
      expect(body.slots!.mon).toHaveLength(14);
      expect(body.slots!.mon).toEqual(Array(14).fill(true));
      expect(body.slots!.sat).toEqual(Array(14).fill(false));
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving not configured routine', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor GET Routine',
        email: `routine.get.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as { slots: null };

      expect(response.status).toBe(200);
      expect(body.slots).toBeNull();
    });

    test('Retrieving saved routine', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor GET Routine Saved',
        email: `routine.get.saved.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as {
        slots: typeof FULL_SLOTS | null;
      };

      expect(response.status).toBe(200);
      expect(body.slots).not.toBeNull();
      expect(body.slots!.mon).toHaveLength(14);
      expect(body.slots!.mon).toEqual(Array(14).fill(true));
      expect(body.slots!.sat).toEqual(Array(14).fill(false));
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to get routine without token returns 401', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /routine/summary ─────────────────────────────────────────────────────

describe('GET /routine/summary', () => {
  const SUMMARY_URL = `${BASE_URL}/summary`;

  describe('Authenticated CONSULTOR', () => {
    test('Attempting to retrieve summary returns 403', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Summary Forbidden',
        email: `routine.summary.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(SUMMARY_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving summary of subordinates', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Summary',
        email: `routine.summary.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const subordinate = await orchestrator.database.seed.createUser({
        username: 'Subordinate Summary',
        email: `routine.summary.sub.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const outsideUser = await orchestrator.database.seed.createUser({
        username: 'Outside Sector User',
        email: `routine.summary.outside.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: subordinate.id,
        day: 0,
        hour: 8,
      });

      const response = await fetch(SUMMARY_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as {
        availability: Record<
          string,
          Record<string, Array<{ id: string; name: string }>>
        >;
        unconfigured: Array<{ id: string }>;
      };

      expect(response.status).toBe(200);
      expect(body.availability.mon).toBeDefined();
      expect(body.availability.mon['8']).toBeDefined();
      expect(
        body.availability.mon['8'].some((u) => u.id === subordinate.id),
      ).toBe(true);
      const allInAvailability = Object.values(body.availability)
        .flatMap((hourMap) => Object.values(hourMap))
        .flat();
      expect(allInAvailability.some((u) => u.id === subordinate.id)).toBe(true);
      expect(allInAvailability.some((u) => u.id === outsideUser.id)).toBe(
        false,
      );
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving summary of subordinates', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Summary',
        email: `routine.summary.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const subordinate = await orchestrator.database.seed.createUser({
        username: 'Subordinate Summary',
        email: `routine.summary.sub.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const outsideUser = await orchestrator.database.seed.createUser({
        username: 'Outside Sector User',
        email: `routine.summary.outside.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: subordinate.id,
        day: 0,
        hour: 8,
      });

      const response = await fetch(SUMMARY_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as {
        availability: Record<
          string,
          Record<string, Array<{ id: string; name: string }>>
        >;
        unconfigured: Array<{ id: string }>;
      };

      expect(response.status).toBe(200);
      expect(body.availability.mon).toBeDefined();
      expect(body.availability.mon['8']).toBeDefined();
      expect(
        body.availability.mon['8'].some((u) => u.id === subordinate.id),
      ).toBe(true);
      const allInAvailability = Object.values(body.availability)
        .flatMap((hourMap) => Object.values(hourMap))
        .flat();
      expect(allInAvailability.some((u) => u.id === subordinate.id)).toBe(true);
      expect(allInAvailability.some((u) => u.id === outsideUser.id)).toBe(
        false,
      );
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving summary of users', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Summary',
        email: `routine.summary.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const consultorUser = await orchestrator.database.seed.createUser({
        username: 'Consultor User',
        email: `routine.summary.multi.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const diretorUser = await orchestrator.database.seed.createUser({
        username: 'Diretor User',
        email: `routine.summary.multi.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const assessorUser = await orchestrator.database.seed.createUser({
        username: 'Assessor User',
        email: `routine.summary.multi.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'projetos',
      });
      const presidenteUser = await orchestrator.database.seed.createUser({
        username: 'Presidente User',
        email: `routine.summary.multi.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const gerenteUser = await orchestrator.database.seed.createUser({
        username: 'Gerente User',
        email: `routine.summary.multi.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      for (const u of [
        consultorUser,
        diretorUser,
        assessorUser,
        presidenteUser,
        gerenteUser,
      ]) {
        await fetch(BASE_URL, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${u.token}`,
          },
          body: JSON.stringify({ slots: FULL_SLOTS }),
        });
      }

      const response = await fetch(SUMMARY_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as {
        availability: Record<string, Record<string, Array<{ id: string }>>>;
      };

      expect(response.status).toBe(200);
      const allInAvailability = Object.values(body.availability)
        .flatMap((hourMap) => Object.values(hourMap))
        .flat();

      expect(allInAvailability.some((u) => u.id === gerenteUser.id)).toBe(true);
      expect(allInAvailability.some((u) => u.id === consultorUser.id)).toBe(
        true,
      );
      expect(allInAvailability.some((u) => u.id === diretorUser.id)).toBe(true);
      expect(allInAvailability.some((u) => u.id === presidenteUser.id)).toBe(
        true,
      );
      expect(allInAvailability.some((u) => u.id === presidenteUser.id)).toBe(
        true,
      );
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve summary without token returns 401', async () => {
      const response = await fetch(SUMMARY_URL);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /routine/:userId ─────────────────────────────────────────────────────

describe('GET /routine/:userId', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving own routine', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Own Routine',
        email: `routine.byuser.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: consultor.id,
        day: 0,
        hour: 9,
      });

      const response = await fetch(`${BASE_URL}/${consultor.id}`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as RoutineBody;

      expect(response.status).toBe(200);
      expect(body.slots.mon[1]).toEqual(true);
    });

    test("Attempting to retrieve a non-subordinate's routine", async () => {
      const consultorA = await orchestrator.database.seed.createUser({
        username: 'Consultor A Routine',
        email: `routine.byuser.cna.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const consultorB = await orchestrator.database.seed.createUser({
        username: 'Consultor B Routine',
        email: `routine.byuser.cnb.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${consultorB.id}`, {
        headers: { Authorization: `Bearer ${consultorA.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test("Retrieving a subordinate's routine", async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Routine By User',
        email: `routine.byuser.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const subordinate = await orchestrator.database.seed.createUser({
        username: 'Subordinate Routine',
        email: `routine.byuser.sub.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: subordinate.id,
        day: 1,
        hour: 8,
      });

      const response = await fetch(`${BASE_URL}/${subordinate.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      const body = (await response.json()) as RoutineBody;
      expect(response.status).toBe(200);
      expect(body.slots.tue[0]).toEqual(true);
    });

    test("Attempting to retrieve a non-subordinate's routine", async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Routine Cross',
        email: `routine.byuser.gerente.cross.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other Sector Routine',
        email: `routine.byuser.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${other.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(403);
    });

    test('Retrieving own routine', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente GET Own Routine',
        email: `routine.byuser.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: gerente.id,
        day: 0,
        hour: 9,
      });

      const response = await fetch(`${BASE_URL}/${gerente.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as RoutineBody;

      expect(response.status).toBe(200);
      expect(body.slots.mon[1]).toEqual(true);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test("Retrieving a subordinate's routine", async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor GET Routine By User',
        email: `routine.byuser.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const subordinate = await orchestrator.database.seed.createUser({
        username: 'Subordinate Routine',
        email: `routine.byuser.sub.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: subordinate.id,
        day: 1,
        hour: 8,
      });

      const response = await fetch(`${BASE_URL}/${subordinate.id}`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      const body = (await response.json()) as RoutineBody;
      expect(response.status).toBe(200);
      expect(body.slots.tue[0]).toEqual(true);
    });

    test("Attempting to retrieve a non-subordinate's routine", async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor GET Routine Cross',
        email: `routine.byuser.diretor.cross.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other Sector Routine',
        email: `routine.byuser.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${other.id}`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      expect(response.status).toBe(403);
    });

    test('Retrieving own routine', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor GET Own Routine',
        email: `routine.byuser.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: diretor.id,
        day: 0,
        hour: 9,
      });

      const response = await fetch(`${BASE_URL}/${diretor.id}`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as RoutineBody;

      expect(response.status).toBe(200);
      expect(body.slots.mon[1]).toEqual(true);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test("Retrieving a user's routine", async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor GET Routine By User',
        email: `routine.byuser.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Assessor Routine',
        email: `routine.byuser.assessor.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: target.id,
        day: 1,
        hour: 8,
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as RoutineBody;

      expect(body.slots.tue[0]).toBeDefined();
      expect(response.status).toBe(200);
    });

    test('Retrieving own routine', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor GET Own Routine',
        email: `routine.byuser.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: diretor.id,
        day: 0,
        hour: 9,
      });

      const response = await fetch(`${BASE_URL}/${diretor.id}`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as RoutineBody;

      expect(response.status).toBe(200);
      expect(body.slots.mon[1]).toEqual(true);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test("Retrieving a user's routine", async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente GET Routine By User',
        email: `routine.byuser.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target presidente Routine',
        email: `routine.byuser.presidente.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'executivo',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: target.id,
        day: 1,
        hour: 8,
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as RoutineBody;

      expect(body.slots.tue[0]).toBeDefined();
      expect(response.status).toBe(200);
    });

    test("Retrieving a not configured user's routine", async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Routine No Slots',
        email: `routine.byuser.pres.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target No Slots',
        email: `routine.byuser.noslots.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as { slots: null };

      expect(response.status).toBe(200);
      expect(body.slots).toBeNull();
    });

    test("Retrieving a non-existent user's routine", async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Routine 404',
        email: `routine.byuser.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${presidente.token}` } },
      );
      expect(response.status).toBe(404);
    });

    test('Retrieving own routine', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor GET Own Routine',
        email: `routine.byuser.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      await orchestrator.database.seed.createRoutineSlot({
        user_id: assessor.id,
        day: 0,
        hour: 9,
      });

      const response = await fetch(`${BASE_URL}/${assessor.id}`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as RoutineBody;

      expect(response.status).toBe(200);
      expect(body.slots.mon[1]).toEqual(true);
    });
  });

  describe('Unauthenticated user', () => {
    test("Attempting to get a user's routine without token returns 401", async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
      );
      expect(response.status).toBe(401);
    });
  });
});
