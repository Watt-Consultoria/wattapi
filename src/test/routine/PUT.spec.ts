import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/routine';
const SETTINGS_URL = 'http://localhost:3001/settings';

const FULL_SLOTS = {
  mon: Array(14).fill(true) as boolean[],
  tue: Array(14).fill(true) as boolean[],
  wed: Array(14).fill(true) as boolean[],
  thu: Array(14).fill(true) as boolean[],
  fri: Array(14).fill(true) as boolean[],
  sat: Array(14).fill(false) as boolean[],
  sun: Array(14).fill(false) as boolean[],
};

const EMPTY_SLOTS = {
  mon: Array(14).fill(false) as boolean[],
  tue: Array(14).fill(false) as boolean[],
  wed: Array(14).fill(false) as boolean[],
  thu: Array(14).fill(false) as boolean[],
  fri: Array(14).fill(false) as boolean[],
  sat: Array(14).fill(false) as boolean[],
  sun: Array(14).fill(false) as boolean[],
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PUT /routine', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Saving a valid routine for the first time', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PUT Routine',
        email: `routine.put.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      expect(response.status).toBe(200);
    });

    test('Updating an existing routine', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PUT Replace',
        email: `routine.put.replace.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      // First save: FULL_SLOTS — mon all true
      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      // Second save: mon all false, tue-fri all true (56 slots) — replaces first
      const replacementSlots = {
        ...FULL_SLOTS,
        mon: Array(14).fill(false) as boolean[],
      };
      const res2 = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ slots: replacementSlots }),
      });
      expect(res2.status).toBe(200);

      const getResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await getResponse.json()) as {
        slots: Record<string, boolean[]> | null;
      };

      expect(body.slots).not.toBeNull();
      // mon was all-true in first PUT; after replacement it must be all-false
      expect(body.slots!.mon).toEqual(Array(14).fill(false));
      // tue remains all-true from replacement
      expect(body.slots!.tue).toEqual(Array(14).fill(true));
    });

    test('Attempting to save a routine with missing day', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PUT Missing Day',
        email: `routine.put.missingday.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const { mon: _mon, ...missingMon } = FULL_SLOTS;

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ slots: missingMon }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to save a routine below min_availability_hours', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Set Min Hours',
        email: `routine.put.minsetpres.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Below Min',
        email: `routine.put.belowmin.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 20 }),
      });

      const fewSlots = {
        ...EMPTY_SLOTS,
        mon: [
          true,
          true,
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
      };
      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ slots: fewSlots }),
      });
      const body = (await response.json()) as { message: string };

      expect(response.status).toBe(400);
      expect(body.message).toContain('5h');
      expect(body.message).toContain('20h');

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 0 }),
      });
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Saving a valid routine for the first time', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente PUT Routine',
        email: `routine.put.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      expect(response.status).toBe(200);
    });

    test('Updating an existing routine', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente PUT Replace',
        email: `routine.put.replace.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      // First save: FULL_SLOTS — mon all true
      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      // Second save: mon all false, tue-fri all true (56 slots) — replaces first
      const replacementSlots = {
        ...FULL_SLOTS,
        mon: Array(14).fill(false) as boolean[],
      };
      const res2 = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ slots: replacementSlots }),
      });
      expect(res2.status).toBe(200);

      const getResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await getResponse.json()) as {
        slots: Record<string, boolean[]> | null;
      };

      expect(body.slots).not.toBeNull();
      // mon was all-true in first PUT; after replacement it must be all-false
      expect(body.slots!.mon).toEqual(Array(14).fill(false));
      // tue remains all-true from replacement
      expect(body.slots!.tue).toEqual(Array(14).fill(true));
    });

    test('Attempting to save a routine with missing day', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente PUT Missing Day',
        email: `routine.put.missingday.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const { mon: _mon, ...missingMon } = FULL_SLOTS;

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ slots: missingMon }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to save a routine below min_availability_hours', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Set Min Hours',
        email: `routine.put.minsetpres.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente Below Min',
        email: `routine.put.belowmin.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 20 }),
      });

      const fewSlots = {
        ...EMPTY_SLOTS,
        mon: [
          true,
          true,
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
      };
      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ slots: fewSlots }),
      });
      const body = (await response.json()) as { message: string };

      expect(response.status).toBe(400);
      expect(body.message).toContain('5h');
      expect(body.message).toContain('20h');

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 0 }),
      });
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Saving a valid routine for the first time', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor PUT Routine',
        email: `routine.put.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      expect(response.status).toBe(200);
    });

    test('Updating an existing routine', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor PUT Replace',
        email: `routine.put.replace.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      // First save: FULL_SLOTS — mon all true
      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      // Second save: mon all false, tue-fri all true (56 slots) — replaces first
      const replacementSlots = {
        ...FULL_SLOTS,
        mon: Array(14).fill(false) as boolean[],
      };
      const res2 = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ slots: replacementSlots }),
      });
      expect(res2.status).toBe(200);

      const getResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await getResponse.json()) as {
        slots: Record<string, boolean[]> | null;
      };

      expect(body.slots).not.toBeNull();
      // mon was all-true in first PUT; after replacement it must be all-false
      expect(body.slots!.mon).toEqual(Array(14).fill(false));
      // tue remains all-true from replacement
      expect(body.slots!.tue).toEqual(Array(14).fill(true));
    });

    test('Attempting to save a routine with missing day', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor PUT Missing Day',
        email: `routine.put.missingday.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const { mon: _mon, ...missingMon } = FULL_SLOTS;

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ slots: missingMon }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to save a routine below min_availability_hours', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Set Min Hours',
        email: `routine.put.minsetpres.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Below Min',
        email: `routine.put.belowmin.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 20 }),
      });

      const fewSlots = {
        ...EMPTY_SLOTS,
        mon: [
          true,
          true,
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
      };
      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ slots: fewSlots }),
      });
      const body = (await response.json()) as { message: string };

      expect(response.status).toBe(400);
      expect(body.message).toContain('5h');
      expect(body.message).toContain('20h');

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 0 }),
      });
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Saving a valid routine for the first time', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor PUT Routine',
        email: `routine.put.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      expect(response.status).toBe(200);
    });

    test('Updating an existing routine', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor PUT Replace',
        email: `routine.put.replace.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      // First save: FULL_SLOTS — mon all true
      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      // Second save: mon all false, tue-fri all true (56 slots) — replaces first
      const replacementSlots = {
        ...FULL_SLOTS,
        mon: Array(14).fill(false) as boolean[],
      };
      const res2 = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ slots: replacementSlots }),
      });
      expect(res2.status).toBe(200);

      const getResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await getResponse.json()) as {
        slots: Record<string, boolean[]> | null;
      };

      expect(body.slots).not.toBeNull();
      // mon was all-true in first PUT; after replacement it must be all-false
      expect(body.slots!.mon).toEqual(Array(14).fill(false));
      // tue remains all-true from replacement
      expect(body.slots!.tue).toEqual(Array(14).fill(true));
    });

    test('Attempting to save a routine with missing day', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor PUT Missing Day',
        email: `routine.put.missingday.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      const { mon: _mon, ...missingMon } = FULL_SLOTS;

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ slots: missingMon }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to save a routine below min_availability_hours', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Set Min Hours',
        email: `routine.put.minsetpres.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Below Min',
        email: `routine.put.belowmin.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 20 }),
      });

      const fewSlots = {
        ...EMPTY_SLOTS,
        mon: [
          true,
          true,
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
      };
      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ slots: fewSlots }),
      });
      const body = (await response.json()) as { message: string };

      expect(response.status).toBe(400);
      expect(body.message).toContain('5h');
      expect(body.message).toContain('20h');

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 0 }),
      });
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Saving a valid routine for the first time', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente PUT Routine',
        email: `routine.put.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      expect(response.status).toBe(200);
    });

    test('Updating an existing routine', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente PUT Replace',
        email: `routine.put.replace.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      // First save: FULL_SLOTS — mon all true
      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });

      // Second save: mon all false, tue-fri all true (56 slots) — replaces first
      const replacementSlots = {
        ...FULL_SLOTS,
        mon: Array(14).fill(false) as boolean[],
      };
      const res2 = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ slots: replacementSlots }),
      });
      expect(res2.status).toBe(200);

      const getResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await getResponse.json()) as {
        slots: Record<string, boolean[]> | null;
      };

      expect(body.slots).not.toBeNull();
      // mon was all-true in first PUT; after replacement it must be all-false
      expect(body.slots!.mon).toEqual(Array(14).fill(false));
      // tue remains all-true from replacement
      expect(body.slots!.tue).toEqual(Array(14).fill(true));
    });

    test('Attempting to save a routine with missing day', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente PUT Missing Day',
        email: `routine.put.missingday.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const { mon: _mon, ...missingMon } = FULL_SLOTS;

      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ slots: missingMon }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to save a routine below min_availability_hours', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Set Min Hours',
        email: `routine.put.minsetpres.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 20 }),
      });

      const fewSlots = {
        ...EMPTY_SLOTS,
        mon: [
          true,
          true,
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
      };
      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ slots: fewSlots }),
      });
      const body = (await response.json()) as { message: string };

      expect(response.status).toBe(400);
      expect(body.message).toContain('5h');
      expect(body.message).toContain('20h');

      await fetch(SETTINGS_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 0 }),
      });
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to save routine without token returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: FULL_SLOTS }),
      });
      expect(response.status).toBe(401);
    });
  });
});
