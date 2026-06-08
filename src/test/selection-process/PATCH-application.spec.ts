import orchestrator from '../orchestrator';

const APPLICATIONS_URL = 'http://localhost:3001/selection-process/applications';
const CANDIDATES_URL = 'http://localhost:3001/selection-process/candidates';
const STAGES_URL = 'http://localhost:3001/selection-process/stages';
const PROCESSES_URL = 'http://localhost:3001/selection-process';

async function createActiveProcess(
  adminToken: string,
  title = 'PS PATCH App',
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
  name = 'Etapa 1',
  position = 1,
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
      name: 'Candidato PATCH',
      course: 'Administração',
      period: 4,
      phone: '11988880000',
      email,
      instagram: '@candidatopatch',
      how_heard: 'Instagram',
      motivation: 'Desenvolvimento pessoal',
      why_watt: 'Cultura organizacional forte',
      shirt_size: 'P',
      resume_path: resumePath,
      transcript_path: transcriptPath,
      photo_path: photoPath,
    }),
  });
  return res.json() as Promise<{ id: string }>;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PATCH /selection-process/applications/:id ────────────────────────────────

describe('PATCH /selection-process/applications/:applicationId', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Approving application creates candidate in stage 1 and sends email', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH App Approved',
        email: `ps.patch.app.approved.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createActiveProcess(admin.token);
      const stage = await createStage(admin.token, process.id);
      const appEmail = `candidato.approve.${Date.now()}@example.com`;
      await orchestrator.email.deleteAllEmails();
      const app = await submitApplication(appEmail);

      const response = await fetch(`${APPLICATIONS_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      const body = (await response.json()) as { id: string; status: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe('approved');

      const candsRes = await fetch(
        `${CANDIDATES_URL}?selection_process_id=${process.id}`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );
      const candidates = (await candsRes.json()) as {
        current_stage_id: string;
        email: string;
      }[];
      expect(candidates.length).toBe(1);
      expect(candidates[0].current_stage_id).toBe(stage.id);
      expect(candidates[0].email).toBe(appEmail);

      const email = await orchestrator.email.waitForLastEmail();
      expect(email).not.toBeNull();
      expect(email!.recipients).toContain(appEmail);
    });

    test('Approving application without stages returns 400', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH App No Stages',
        email: `ps.patch.app.nostages.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await orchestrator.database.seed.createSelectionProcess({
        title: 'PS No Stages',
      });
      const app = await submitApplication(
        `candidato.nostages.${Date.now()}@example.com`,
      );

      const response = await fetch(`${APPLICATIONS_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(400);
    });

    test('Approving application twice returns 409', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH App Dup',
        email: `ps.patch.app.dup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const processDup =
        await orchestrator.database.seed.createSelectionProcess({
          title: 'PS App Dup',
        });
      await orchestrator.database.seed.createProcessStage({
        selection_process_id: processDup.id,
      });
      const app = await submitApplication(
        `candidato.dup.approve.${Date.now()}@example.com`,
      );

      await fetch(`${APPLICATIONS_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      const response = await fetch(`${APPLICATIONS_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(409);
    });

    test('Reproving application sends rejection email without creating candidate', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH App Reprove',
        email: `ps.patch.app.reprove.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const processReprove =
        await orchestrator.database.seed.createSelectionProcess({
          title: 'PS App Reprove',
        });
      const appEmail = `candidato.reprove.${Date.now()}@example.com`;
      await orchestrator.email.deleteAllEmails();
      const app = await submitApplication(appEmail);

      const response = await fetch(`${APPLICATIONS_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'reproved' }),
      });
      const body = (await response.json()) as { status: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe('reproved');

      const candsRes = await fetch(
        `${CANDIDATES_URL}?selection_process_id=${processReprove.id}`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );
      const candidates = (await candsRes.json()) as unknown[];
      expect(candidates).toEqual([]);

      const email = await orchestrator.email.waitForLastEmail();
      expect(email).not.toBeNull();
      expect(email!.recipients).toContain(appEmail);
    });

    test('Setting application to pending has no side effects', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH App Pending',
        email: `ps.patch.app.pending.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const processPending =
        await orchestrator.database.seed.createSelectionProcess({
          title: 'PS App Pending',
        });
      await orchestrator.email.deleteAllEmails();
      const app = await submitApplication(
        `candidato.pending.${Date.now()}@example.com`,
      );

      const pendingRes = await fetch(`${APPLICATIONS_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'pending' }),
      });

      expect(pendingRes.status).toBe(200);

      const candsRes = await fetch(
        `${CANDIDATES_URL}?selection_process_id=${processPending.id}`,
        { headers: { Authorization: `Bearer ${admin.token}` } },
      );
      const candidates = (await candsRes.json()) as unknown[];
      expect(candidates).toEqual([]);
    });

    test('Attempting to update with an invalid status', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH App Bad Status',
        email: `ps.patch.app.badstatus.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await createActiveProcess(admin.token);
      const app = await submitApplication(
        `candidato.patch.bad.${Date.now()}@example.com`,
      );

      const response = await fetch(`${APPLICATIONS_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'invalid_status' }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to update a non-existent application', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH App 404',
        email: `ps.patch.app.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${APPLICATIONS_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${admin.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'reproved' }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Updating application status to pending', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Pres Setup',
        email: `ps.patch.pres.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await createActiveProcess(admin.token);
      const app = await submitApplication(
        `candidato.patch.pres.${Date.now()}@example.com`,
      );

      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente PATCH App',
        email: `ps.patch.app.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(`${APPLICATIONS_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'pending' }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Attempting to update application status without permission', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Forbidden Setup',
        email: `ps.patch.forbidden.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await createActiveProcess(admin.token);
      const app = await submitApplication(
        `candidato.patch.forbidden.${Date.now()}@example.com`,
      );

      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH Forbidden',
        email: `ps.patch.consultor.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${APPLICATIONS_URL}/${app.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update application status without a token', async () => {
      const response = await fetch(
        `${APPLICATIONS_URL}/00000000-0000-0000-0000-000000000001`,
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
