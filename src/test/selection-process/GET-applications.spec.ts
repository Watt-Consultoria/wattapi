import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process/applications';
const PROCESSES_URL = 'http://localhost:3001/selection-process';

async function createActiveProcess(
  adminToken: string,
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
    body: JSON.stringify({
      title: 'PS Ativo',
      starts_at: starts,
      ends_at: ends,
    }),
  });
  return res.json() as Promise<{ id: string }>;
}

async function submitApplication(email: string) {
  const folderUuid = crypto.randomUUID();
  const { resumePath, transcriptPath, photoPath } =
    await orchestrator.database.seed.uploadSelectionProcessFiles(folderUuid);

  return fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Candidato Teste',
      course: 'Engenharia',
      period: 3,
      phone: '11999990000',
      email,
      instagram: '@candidato',
      how_heard: 'Redes sociais',
      motivation: 'Quero crescer',
      why_watt: 'Empresa incrível',
      shirt_size: 'G',
      resume_path: resumePath,
      transcript_path: transcriptPath,
      photo_path: photoPath,
    }),
  });
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /selection-process/applications ─────────────────────────────────────

describe('GET /selection-process/applications', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing all applications returns them with signed URLs', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor GET Apps Setup',
        email: `ps.get.apps.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await createActiveProcess(admin.token);
      await submitApplication(`candidato.get.${Date.now()}@example.com`);

      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Apps',
        email: `ps.get.apps.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as Array<{
        id: string;
        resume_signed_url: string;
        transcript_signed_url: string;
        photo_signed_url: string;
      }>;

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].resume_signed_url).toBeDefined();
      expect(body[0].transcript_signed_url).toBeDefined();
      expect(body[0].photo_signed_url).toBeDefined();
    });

    test('Filtering applications by selection_process_id', async () => {
      await orchestrator.database.clear();

      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor GET Apps Filter',
        email: `ps.get.apps.filter.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createActiveProcess(admin.token);
      await submitApplication(`candidato.filter.${Date.now()}@example.com`);

      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Apps Filter',
        email: `ps.get.apps.filter.user.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}?selection_process_id=${process.id}`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const body = (await response.json()) as unknown[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    test('Filtering by a non-existent selection_process_id returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Apps 404',
        email: `ps.get.apps.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}?selection_process_id=00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

      expect(response.status).toBe(404);
    });

    test('Listing applications returns empty array when none exist', async () => {
      await orchestrator.database.clear();

      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Apps Empty',
        email: `ps.get.apps.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as unknown[];

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to list applications without a token', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
