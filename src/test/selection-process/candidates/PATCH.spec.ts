import orchestrator from '../../orchestrator';

const CANDIDATES_URL = 'http://localhost:3001/selection-process/candidates';
const STAGES_URL = 'http://localhost:3001/selection-process/stages';
const PROCESSES_URL = 'http://localhost:3001/selection-process';
const APPLICATIONS_URL = 'http://localhost:3001/selection-process/applications';

async function createProcess(
  adminToken: string,
  title = 'PS Candidates PATCH',
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

async function createCandidateViaApproval(
  adminToken: string,
  processId: string,
): Promise<string> {
  const folderUuid = crypto.randomUUID();
  const { resumePath, transcriptPath, photoPath } =
    await orchestrator.database.seed.uploadSelectionProcessFiles(folderUuid);

  const appRes = await fetch(APPLICATIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Candidato PATCH',
      course: 'Engenharia',
      period: 3,
      phone: '11999990000',
      email: `cand.patch.${Date.now()}.${crypto.randomUUID().slice(0, 8)}@example.com`,
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
  const app = (await appRes.json()) as { id: string };

  await fetch(`${APPLICATIONS_URL}/${app.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'approved' }),
  });

  const candsRes = await fetch(
    `${CANDIDATES_URL}?selection_process_id=${processId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  const cands = (await candsRes.json()) as {
    id: string;
    application_id: string;
  }[];
  const candidate = cands.find((c) => c.application_id === app.id);
  if (!candidate) throw new Error('Candidate not found after approval');
  return candidate.id;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PATCH /selection-process/candidates/:id ─────────────────────────────────

describe('PATCH /selection-process/candidates/:candidateId', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Approving a candidate with a next stage advances to next stage', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Cand PATCH Advance',
        email: `cand.patch.advance.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(admin.token, 'PS Cand Advance');
      const stage1 = await createStage(admin.token, process.id, 'Etapa 1', 1);
      const stage2 = await createStage(admin.token, process.id, 'Etapa 2', 2);
      const candidateId = await createCandidateViaApproval(
        admin.token,
        process.id,
      );

      const response = await fetch(`${CANDIDATES_URL}/${candidateId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      const body = (await response.json()) as {
        current_stage_id: string;
        status: string;
      };

      expect(response.status).toBe(200);
      expect(body.current_stage_id).toBe(stage2.id);
      expect(body.status).toBe('active');
      void stage1;
    });

    test('Approving a candidate on the last stage marks as finally approved', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Cand PATCH Final',
        email: `cand.patch.final.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS Cand Final',
      });
      await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
        name: 'Etapa Única',
      });
      const candidateId = await createCandidateViaApproval(
        admin.token,
        process.id,
      );

      const response = await fetch(`${CANDIDATES_URL}/${candidateId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      const body = (await response.json()) as { status: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe('approved');
    });

    test('Reproving a candidate marks as eliminated', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Cand PATCH Reprove',
        email: `cand.patch.reprove.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS Cand Reprove',
      });
      await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
        name: 'Etapa 1',
      });
      const candidateId = await createCandidateViaApproval(
        admin.token,
        process.id,
      );

      const response = await fetch(`${CANDIDATES_URL}/${candidateId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'reproved' }),
      });
      const body = (await response.json()) as { status: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe('eliminated');
    });

    test('Attempting to update an already finalized candidate returns 409', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Cand PATCH 409',
        email: `cand.patch.409.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess({
        title: 'PS Cand 409',
      });
      await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
        name: 'Etapa 1',
      });
      const candidateId = await createCandidateViaApproval(
        admin.token,
        process.id,
      );

      await fetch(`${CANDIDATES_URL}/${candidateId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'reproved' }),
      });

      const response = await fetch(`${CANDIDATES_URL}/${candidateId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(409);
    });

    test('Attempting to update a non-existent candidate returns 404', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Cand PATCH 404',
        email: `cand.patch.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${CANDIDATES_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${admin.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'approved' }),
        },
      );

      expect(response.status).toBe(404);
    });

    test('Attempting to update with an invalid status returns 400', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor Cand PATCH 400',
        email: `cand.patch.400.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${CANDIDATES_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${admin.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'pending' }),
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Attempting to update candidate status without permission returns 403', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cand PATCH 403',
        email: `cand.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${CANDIDATES_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'approved' }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update candidate without token returns 401', async () => {
      const response = await fetch(
        `${CANDIDATES_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
