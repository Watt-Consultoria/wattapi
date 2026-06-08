import orchestrator from '../../orchestrator';

const CANDIDATES_URL = 'http://localhost:3001/selection-process/candidates';
const STAGES_URL = 'http://localhost:3001/selection-process/stages';
const PROCESSES_URL = 'http://localhost:3001/selection-process';
const APPLICATIONS_URL = 'http://localhost:3001/selection-process/applications';

async function createProcess(
  adminToken: string,
  title = 'PS Candidates GET',
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

async function submitApplication(email: string): Promise<{ id: string }> {
  const folderUuid = crypto.randomUUID();
  const { resumePath, transcriptPath, photoPath } =
    await orchestrator.database.seed.uploadSelectionProcessFiles(folderUuid);

  const res = await fetch(APPLICATIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Candidato GET',
      course: 'Engenharia',
      period: 3,
      phone: '11999990000',
      email,
      instagram: '@candidatopatch',
      how_heard: 'Instagram',
      motivation: 'Desenvolvimento pessoal',
      why_watt: 'Cultura forte',
      shirt_size: 'M',
      resume_path: resumePath,
      transcript_path: transcriptPath,
      photo_path: photoPath,
    }),
  });
  return res.json() as Promise<{ id: string }>;
}

async function approveApplication(
  adminToken: string,
  applicationId: string,
): Promise<void> {
  await fetch(`${APPLICATIONS_URL}/${applicationId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'approved' }),
  });
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /selection-process/candidates ───────────────────────────────────────

describe('GET /selection-process/candidates', () => {
  describe('Authenticated user', () => {
    test('Listing all candidates without filter', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Candidates GET All',
        email: `candidates.get.all.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(admin.token, 'PS Candidates GET All');
      const stage = await createStage(admin.token, process.id, 'Etapa 1', 1);
      const app = await submitApplication(
        `cand.get.all.${Date.now()}@example.com`,
      );
      await approveApplication(admin.token, app.id);

      const response = await fetch(CANDIDATES_URL, {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      const body = (await response.json()) as {
        id: string;
        current_stage_id: string;
      }[];

      expect(response.status).toBe(200);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body.some((c) => c.current_stage_id === stage.id)).toBe(true);
    });

    test('Listing candidates filtered by selection_process_id', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Candidates GET Filtered',
        email: `candidates.get.filtered.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      // Seed p2 first so p1 (seeded second) has higher starts_at and becomes active
      const p2 = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS Cands Filter B',
      });
      await orchestrator.database.seed.createProcessStage({
        selection_process_id: p2.id,
        name: 'Etapa B1',
      });
      const p1 = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS Cands Filter A',
      });
      await orchestrator.database.seed.createProcessStage({
        selection_process_id: p1.id,
        name: 'Etapa A1',
      });

      const app1 = await submitApplication(
        `cand.filtered.p1.${Date.now()}@example.com`,
      );
      await approveApplication(admin.token, app1.id);

      const response = await fetch(
        `${CANDIDATES_URL}?selection_process_id=${p1.id}`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );
      const body = (await response.json()) as {
        selection_process_id: string;
      }[];

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].selection_process_id).toBe(p1.id);
    });

    test('Listing candidates filtered by stage_id', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Candidates GET By Stage',
        email: `candidates.get.stage.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS Cands By Stage',
      });
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
        name: 'Etapa 1',
      });

      const app = await submitApplication(
        `cand.stage.${Date.now()}@example.com`,
      );
      await approveApplication(admin.token, app.id);

      const response = await fetch(`${CANDIDATES_URL}?stage_id=${stage.id}`, {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      const body = (await response.json()) as {
        current_stage_id: string;
      }[];

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].current_stage_id).toBe(stage.id);
    });

    test('Returning 404 when filtering by non-existent process', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Candidates GET 404',
        email: `candidates.get.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${CANDIDATES_URL}?selection_process_id=00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );

      expect(response.status).toBe(404);
    });

    test('Returning empty array when no candidates match filter', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Candidates GET Empty',
        email: `candidates.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS Cands Empty',
      });
      await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
        name: 'Etapa 1',
      });

      const response = await fetch(
        `${CANDIDATES_URL}?selection_process_id=${process.id}`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );
      const body = (await response.json()) as unknown[];

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to list candidates without token', async () => {
      const response = await fetch(CANDIDATES_URL);

      expect(response.status).toBe(401);
    });
  });
});
