import * as jwt from 'jsonwebtoken';
import orchestrator from '../../lib/orchestrator';
import type { SeedUser } from '../../lib/seed';

const BASE_URL = 'http://localhost:3001/routine';
const JWT_SECRET =
  process.env.JWT_SECRET ??
  'your-super-secret-jwt-key-with-at-least-32-characters';

function authHeaders(userId: string) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET);
  return { Authorization: `Bearer ${token}` };
}

// seededUsers indices:
// [0] ana.silva      — consultor, comercial
// [1] carlos.santos  — gerente,   projetos
// [2] maria.oliveira — diretor,   executivo
// [3] joao.assessor  — assessor,  institucional
// [4] lucia.pres     — presidente,executivo
// [6] paulo.projetos — consultor, projetos

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

let seededUsers: SeedUser[] = [];

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  seededUsers = await orchestrator.seedDatabase();
});

afterAll(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.end();
});

// ─── PUT /routine ────────────────────────────────────────────────────────────

describe('PUT /routine', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(BASE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: FULL_SLOTS }),
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 400 when a day key is missing', async () => {
    const { mon: _mon, ...missingMon } = FULL_SLOTS;
    const res = await fetch(BASE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[0].id),
      },
      body: JSON.stringify({ slots: missingMon }),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 when a day array has wrong length', async () => {
    const badSlots = { ...FULL_SLOTS, mon: [true, false] };
    const res = await fetch(BASE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[0].id),
      },
      body: JSON.stringify({ slots: badSlots }),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 when total available slots is below min_availability_hours', async () => {
    // Set min_availability_hours = 20 via settings
    await fetch('http://localhost:3001/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].id), // presidente (superuser)
      },
      body: JSON.stringify({ min_availability_hours: 20 }),
    });

    // FULL_SLOTS has mon-fri all true (14 * 5 = 70 slots) — well above 20
    // But let's send a minimal routine with only 5 slots (mon first 5 hours)
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
    const res = await fetch(BASE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[0].id),
      },
      body: JSON.stringify({ slots: fewSlots }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('5h');
    expect(body.message).toContain('20h');

    // Reset min_availability_hours to 0
    await fetch('http://localhost:3001/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].id),
      },
      body: JSON.stringify({ min_availability_hours: 0 }),
    });
  });

  it('should return HTTP 200 and persist a valid routine', async () => {
    const res = await fetch(BASE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[0].id),
      },
      body: JSON.stringify({ slots: FULL_SLOTS }),
    });
    expect(res.status).toBe(200);
  });

  it('should replace the previous routine on a second PUT', async () => {
    // First save: all true
    await fetch(BASE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[1].id),
      },
      body: JSON.stringify({ slots: FULL_SLOTS }),
    });

    // Second save: all false
    const res2 = await fetch(BASE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[1].id),
      },
      body: JSON.stringify({ slots: EMPTY_SLOTS }),
    });
    expect(res2.status).toBe(200);

    const getRes = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[1].id),
    });
    const body = (await getRes.json()) as { slots: null };
    // All slots false → no rows in DB → null (same semantic as "no routine")
    expect(body.slots).toBeNull();
  });
});

// ─── GET /routine ─────────────────────────────────────────────────────────────

describe('GET /routine', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(401);
  });

  it('should return { slots: null } when routine is not configured', async () => {
    // assessor hasn't saved a routine yet
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[3].id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slots: null };
    expect(body.slots).toBeNull();
  });

  it('should return the saved routine as a boolean grid', async () => {
    // seededUsers[0] saved FULL_SLOTS above
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slots: typeof FULL_SLOTS };
    expect(body.slots).not.toBeNull();
    expect(body.slots.mon).toHaveLength(14);
    expect(body.slots.sat).toEqual(Array(14).fill(false));
    expect(body.slots.mon).toEqual(Array(14).fill(true));
  });
});

// ─── GET /routine/summary ─────────────────────────────────────────────────────

describe('GET /routine/summary', () => {
  const SUMMARY_URL = `${BASE_URL}/summary`;

  beforeAll(async () => {
    // paulo.projetos (consultor, projetos) saves a routine with mon[0]=true (08h)
    const pauloSlots = {
      ...EMPTY_SLOTS,
      mon: [
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
        false,
        false,
        false,
        false,
      ],
    };
    await fetch(BASE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[6].id),
      },
      body: JSON.stringify({ slots: pauloSlots }),
    });
  });

  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(SUMMARY_URL);
    expect(res.status).toBe(401);
  });

  it('should return HTTP 403 when caller is consultor', async () => {
    const res = await fetch(SUMMARY_URL, {
      headers: authHeaders(seededUsers[0].id), // consultor
    });
    expect(res.status).toBe(403);
  });

  it('should return empty availability and unconfigured when caller has no subordinates in sector', async () => {
    // diretor in executivo — no gerentes/consultores in executivo sector in seed
    const res = await fetch(SUMMARY_URL, {
      headers: authHeaders(seededUsers[2].id), // diretor, executivo
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      availability: Record<string, unknown>;
      unconfigured: unknown[];
    };
    expect(Object.keys(body.availability)).toHaveLength(0);
    expect(body.unconfigured).toHaveLength(0);
  });

  it('should return slots with subordinates for gerente in projetos', async () => {
    // carlos (gerente, projetos) should see paulo (consultor, projetos) at mon/08h
    const res = await fetch(SUMMARY_URL, {
      headers: authHeaders(seededUsers[1].id), // gerente, projetos
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      availability: Record<
        string,
        Record<
          string,
          Array<{ id: string; name: string; role: string; sector: string }>
        >
      >;
      unconfigured: Array<{ id: string }>;
    };
    expect(body.availability.mon).toBeDefined();
    expect(body.availability.mon['8']).toBeDefined();
    const users = body.availability.mon['8'];
    expect(users.some((u) => u.id === seededUsers[6].id)).toBe(true);
    const paulo = users.find((u) => u.id === seededUsers[6].id)!;
    expect(paulo.name).toBe('Paulo Projetos');
    expect(paulo.role).toBe('consultor');
    expect(paulo.sector).toBe('projetos');
    // paulo has a routine → unconfigured should not include him
    expect(body.unconfigured.some((u) => u.id === seededUsers[6].id)).toBe(
      false,
    );
  });

  it('should not include consultores from other sectors for gerente', async () => {
    // ana.silva (consultor, comercial) should NOT appear in carlos (gerente, projetos) summary
    const res = await fetch(SUMMARY_URL, {
      headers: authHeaders(seededUsers[1].id),
    });
    const body = (await res.json()) as {
      availability: Record<string, Record<string, Array<{ id: string }>>>;
      unconfigured: Array<{ id: string }>;
    };
    const allInAvailability = Object.values(body.availability)
      .flatMap((hourMap) => Object.values(hourMap))
      .flat();
    expect(allInAvailability.some((u) => u.id === seededUsers[0].id)).toBe(
      false,
    );
    expect(body.unconfigured.some((u) => u.id === seededUsers[0].id)).toBe(
      false,
    );
  });

  it('should include users from all sectors for assessor', async () => {
    // joao assessor (assessor, institucional) should see paulo (projetos) at mon/08h
    const res = await fetch(SUMMARY_URL, {
      headers: authHeaders(seededUsers[3].id), // assessor
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      availability: Record<string, Record<string, Array<{ id: string }>>>;
      unconfigured: Array<{ id: string }>;
    };
    const allInAvailability = Object.values(body.availability)
      .flatMap((hourMap) => Object.values(hourMap))
      .flat();
    expect(allInAvailability.some((u) => u.id === seededUsers[6].id)).toBe(
      true,
    );
  });

  it('should list subordinates without configured routine in unconfigured field', async () => {
    // joao assessor sees all roles across sectors
    // carlos.santos (gerente, projetos) saved EMPTY_SLOTS → no DB rows → no routine
    const res = await fetch(SUMMARY_URL, {
      headers: authHeaders(seededUsers[3].id), // assessor
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      availability: Record<string, unknown>;
      unconfigured: Array<{
        id: string;
        name: string;
        role: string;
        sector: string;
      }>;
    };
    expect(body.unconfigured.some((u) => u.id === seededUsers[1].id)).toBe(
      true,
    );
    const carlos = body.unconfigured.find((u) => u.id === seededUsers[1].id)!;
    expect(carlos.name).toBe('Carlos Santos');
    expect(carlos.role).toBe('gerente');
    expect(carlos.sector).toBe('projetos');
  });
});

// ─── GET /routine/:userId ─────────────────────────────────────────────────────

describe('GET /routine/:userId', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`);
    expect(res.status).toBe(401);
  });

  it('should return HTTP 200 — gerente views consultor in same sector', async () => {
    // carlos (gerente, projetos) → paulo (consultor, projetos)
    const res = await fetch(`${BASE_URL}/${seededUsers[6].id}`, {
      headers: authHeaders(seededUsers[1].id),
    });
    expect(res.status).toBe(200);
  });

  it('should return HTTP 403 — gerente views consultor in different sector', async () => {
    // carlos (gerente, projetos) → ana (consultor, comercial)
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      headers: authHeaders(seededUsers[1].id),
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 403 — consultor views another consultor', async () => {
    // ana (consultor, comercial) → paulo (consultor, projetos)
    const res = await fetch(`${BASE_URL}/${seededUsers[6].id}`, {
      headers: authHeaders(seededUsers[0].id),
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 200 — assessor views diretor in any sector', async () => {
    // joao (assessor, institucional) → maria (diretor, executivo)
    const res = await fetch(`${BASE_URL}/${seededUsers[2].id}`, {
      headers: authHeaders(seededUsers[3].id),
    });
    expect(res.status).toBe(200);
  });

  it('should return HTTP 200 — user views own routine via :userId', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      headers: authHeaders(seededUsers[0].id),
    });
    expect(res.status).toBe(200);
  });

  it('should return { slots: null } when target has no routine', async () => {
    // assessor never saved a routine
    const res = await fetch(`${BASE_URL}/${seededUsers[3].id}`, {
      headers: authHeaders(seededUsers[4].id), // presidente
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slots: null };
    expect(body.slots).toBeNull();
  });

  it('should return HTTP 404 for non-existent userId', async () => {
    const res = await fetch(
      `${BASE_URL}/00000000-0000-0000-0000-000000000000`,
      { headers: authHeaders(seededUsers[4].id) },
    );
    expect(res.status).toBe(404);
  });

  it('should return the correct routine shape for an authorized request', async () => {
    // paulo (consultor, projetos) has a routine saved — carlos (gerente, projetos) can view it
    const res = await fetch(`${BASE_URL}/${seededUsers[6].id}`, {
      headers: authHeaders(seededUsers[1].id),
    });
    const body = (await res.json()) as {
      slots: Record<string, boolean[]> | null;
    };
    expect(body).toHaveProperty('slots');
    if (body.slots !== null) {
      expect(body.slots).toHaveProperty('mon');
      expect(body.slots.mon).toHaveLength(14);
    }
  });
});
