import orchestrator from '../../orchestrator';

const STAGES_URL = 'http://localhost:3001/selection-process/stages';
const PROCESSES_URL = 'http://localhost:3001/selection-process';

async function createProcess(
  adminToken: string,
  title = 'PS Stages GET',
): Promise<{ id: string }> {
  const now = new Date();
  const starts = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const ends = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(PROCESSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, starts_at: starts, ends_at: ends }),
  });
  return res.json() as Promise<{ id: string }>;
}

async function createStage(
  adminToken: string,
  selectionProcessId: string,
  name: string,
  position: number,
): Promise<{ id: string }> {
  const res = await fetch(STAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      selection_process_id: selectionProcessId,
      name,
      position,
    }),
  });
  return res.json() as Promise<{ id: string }>;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /selection-process/stages ───────────────────────────────────────────

describe('GET /selection-process/stages', () => {
  describe('Authenticated user', () => {
    test('Listing stages without filter returns all stages ordered by position', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stages GET All',
        email: `stages.get.all.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(admin.token, 'PS GET All Stages');
      await createStage(admin.token, process.id, 'Etapa 2', 2);
      await createStage(admin.token, process.id, 'Etapa 1', 1);

      const response = await fetch(STAGES_URL, {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      const body = (await response.json()) as { position: number }[];

      expect(response.status).toBe(200);
      expect(body.length).toBeGreaterThanOrEqual(2);
      const positions = body.map((s) => s.position);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    test('Listing stages filtered by selection_process_id', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stages GET Filtered',
        email: `stages.get.filtered.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const p1 = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS GET Filter A',
      });
      const p2 = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS GET Filter B',
      });
      await createStage(admin.token, p1.id, 'Etapa A1', 1);
      await createStage(admin.token, p2.id, 'Etapa B1', 1);

      const response = await fetch(
        `${STAGES_URL}?selection_process_id=${p1.id}`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );
      const body = (await response.json()) as {
        id: string;
        selection_process_id: string;
        name: string;
        position: number;
      }[];

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].selection_process_id).toBe(p1.id);
      expect(body[0].name).toBe('Etapa A1');
    });

    test('Returning 404 when filtering by non-existent process', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stages GET 404',
        email: `stages.get.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${STAGES_URL}?selection_process_id=00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );

      expect(response.status).toBe(404);
    });

    test('Returning empty array when process has no stages', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stages GET Empty',
        email: `stages.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS GET Empty Stages',
      });

      const response = await fetch(
        `${STAGES_URL}?selection_process_id=${process.id}`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );
      const body = (await response.json()) as unknown[];

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to list stages without token', async () => {
      const response = await fetch(STAGES_URL);

      expect(response.status).toBe(401);
    });
  });
});
