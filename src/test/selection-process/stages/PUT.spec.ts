import orchestrator from '../../orchestrator';

const STAGES_URL = 'http://localhost:3001/selection-process/stages';
const PROCESSES_URL = 'http://localhost:3001/selection-process';

async function createProcess(
  adminToken: string,
  title = 'PS Stages PUT',
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
): Promise<{ id: string; name: string; position: number }> {
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
  return res.json() as Promise<{ id: string; name: string; position: number }>;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PUT /selection-process/stages/:stageId ───────────────────────────────────

describe('PUT /selection-process/stages/:stageId', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Renaming a stage without changing position', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage PUT Rename',
        email: `stage.put.rename.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(admin.token);
      const stage = await createStage(admin.token, process.id, 'Entrevista', 1);

      const response = await fetch(`${STAGES_URL}/${stage.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Entrevista Técnica' }),
      });
      const body = (await response.json()) as {
        id: string;
        name: string;
        position: number;
      };

      expect(response.status).toBe(200);
      expect(body.id).toBe(stage.id);
      expect(body.name).toBe('Entrevista Técnica');
      expect(body.position).toBe(1);
    });

    test('Moving a stage to a free position (no conflict)', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage PUT Move',
        email: `stage.put.move.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS PUT Move',
      });
      const stage = await createStage(admin.token, process.id, 'Dinâmica', 1);

      const response = await fetch(`${STAGES_URL}/${stage.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position: 3 }),
      });
      const body = (await response.json()) as { position: number };

      expect(response.status).toBe(200);
      expect(body.position).toBe(3);
    });

    test('Swapping positions of two existing stages', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage PUT Swap',
        email: `stage.put.swap.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS PUT Swap',
      });
      const stage1 = await createStage(admin.token, process.id, 'Etapa 1', 1);
      const stage2 = await createStage(admin.token, process.id, 'Etapa 2', 2);

      // Move stage1 to position 2 → should swap with stage2
      const response = await fetch(`${STAGES_URL}/${stage1.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position: 2 }),
      });
      const body = (await response.json()) as { id: string; position: number };

      expect(response.status).toBe(200);
      expect(body.id).toBe(stage1.id);
      expect(body.position).toBe(2);

      // Verify stage2 is now at position 1
      const listRes = await fetch(
        `${STAGES_URL}?selection_process_id=${process.id}`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );
      const stages = (await listRes.json()) as {
        id: string;
        position: number;
      }[];
      const updatedStage2 = stages.find((s) => s.id === stage2.id);
      expect(updatedStage2?.position).toBe(1);
    });

    test('Attempting to update a non-existent stage returns 404', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage PUT 404',
        email: `stage.put.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${STAGES_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${admin.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Fantasma' }),
        },
      );

      expect(response.status).toBe(404);
    });

    test('Attempting to update with invalid position returns 400', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage PUT 400',
        email: `stage.put.400.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${STAGES_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${admin.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ position: 0 }),
        },
      );

      expect(response.status).toBe(400);
    });

    test('Attempting to update with empty body returns 400', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage PUT 400 Empty',
        email: `stage.put.400empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${STAGES_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${admin.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Attempting to update stage without permission returns 403', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stage PUT 403',
        email: `stage.put.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${STAGES_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Forbidden' }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update stage without token returns 401', async () => {
      const response = await fetch(
        `${STAGES_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'No Token' }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});

// ─── POST /selection-process/stages com shift=true ───────────────────────────

describe('POST /selection-process/stages with shift=true', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Inserting a stage at an occupied position shifts existing stages', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage POST Shift',
        email: `stage.post.shift.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS POST Shift',
      });
      const s1 = await createStage(admin.token, process.id, 'Etapa 1', 1);
      const s2 = await createStage(admin.token, process.id, 'Etapa 2', 2);
      const s3 = await createStage(admin.token, process.id, 'Etapa 3', 3);

      // Insert new stage at position 2 with shift — s2 and s3 should move to 3 and 4
      const response = await fetch(STAGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selection_process_id: process.id,
          name: 'Dinâmica',
          position: 2,
          shift: true,
        }),
      });
      const newStage = (await response.json()) as {
        id: string;
        position: number;
      };

      expect(response.status).toBe(201);
      expect(newStage.position).toBe(2);

      const listRes = await fetch(
        `${STAGES_URL}?selection_process_id=${process.id}`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );
      const stages = (await listRes.json()) as {
        id: string;
        position: number;
      }[];

      const byId = Object.fromEntries(stages.map((s) => [s.id, s.position]));
      expect(byId[s1.id]).toBe(1);
      expect(byId[s2.id]).toBe(3);
      expect(byId[s3.id]).toBe(4);
      expect(byId[newStage.id]).toBe(2);
    });
  });
});
