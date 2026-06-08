import orchestrator from '../../orchestrator';

const STAGES_URL = 'http://localhost:3001/selection-process/stages';
const PROCESSES_URL = 'http://localhost:3001/selection-process';

async function createProcess(adminToken: string): Promise<{ id: string }> {
  const now = new Date();
  const starts = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const ends = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(PROCESSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'PS Stages POST',
      starts_at: starts,
      ends_at: ends,
    }),
  });
  return res.json() as Promise<{ id: string }>;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /selection-process/stages ──────────────────────────────────────────

describe('POST /selection-process/stages', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Creating a stage successfully', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage POST',
        email: `stage.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(admin.token);

      const response = await fetch(STAGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selection_process_id: process.id,
          name: 'Entrevista',
          position: 1,
        }),
      });
      const body = (await response.json()) as {
        id: string;
        selection_process_id: string;
        name: string;
        position: number;
        created_at: string;
      };

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.selection_process_id).toBe(process.id);
      expect(body.name).toBe('Entrevista');
      expect(body.position).toBe(1);
      expect(body.created_at).toBeDefined();
    });

    test('Attempting to create a stage for a non-existent process', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage POST 404',
        email: `stage.post.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(STAGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selection_process_id: '00000000-0000-0000-0000-000000000001',
          name: 'Dinâmica',
          position: 1,
        }),
      });

      expect(response.status).toBe(404);
    });

    test('Attempting to create a stage with a duplicate position', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage POST 409',
        email: `stage.post.409.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS Stage POST 409',
      });

      await fetch(STAGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selection_process_id: process.id,
          name: 'Etapa 1',
          position: 1,
        }),
      });

      const response = await fetch(STAGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selection_process_id: process.id,
          name: 'Outra Etapa',
          position: 1,
        }),
      });

      expect(response.status).toBe(409);
    });

    test('Attempting to create a stage with missing required field', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage POST 400 Missing',
        email: `stage.post.400missing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(STAGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Etapa sem processo', position: 1 }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to create a stage with invalid position (zero)', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage POST 400 Position',
        email: `stage.post.400pos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(admin.token);

      const response = await fetch(STAGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selection_process_id: process.id,
          name: 'Etapa Inválida',
          position: 0,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Attempting to create a stage without permission', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Stage POST 403 Setup',
        email: `stage.post.403setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(admin.token);

      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stage POST 403',
        email: `stage.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(STAGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selection_process_id: process.id,
          name: 'Etapa Forbidden',
          position: 1,
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a stage without token', async () => {
      const response = await fetch(STAGES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection_process_id: '00000000-0000-0000-0000-000000000001',
          name: 'Etapa',
          position: 1,
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
