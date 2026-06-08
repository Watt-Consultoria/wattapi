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

function makePayload(
  resumePath: string,
  transcriptPath: string,
  photoPath: string,
  email = `candidato.${Date.now()}@example.com`,
) {
  return {
    name: 'João da Silva',
    course: 'Engenharia de Software',
    period: 5,
    phone: '11999990000',
    email,
    instagram: '@joaosilva',
    how_heard: 'Indicação de amigo',
    motivation: 'Quero aprender e crescer profissionalmente',
    why_watt: 'A Watt tem projetos incríveis e alinhados com meus valores',
    shirt_size: 'M',
    resume_path: resumePath,
    transcript_path: transcriptPath,
    photo_path: photoPath,
  };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /selection-process/applications ────────────────────────────────────

describe('POST /selection-process/applications', () => {
  describe('Unauthenticated user (public endpoint)', () => {
    test('Submitting an application successfully', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor App Setup',
        email: `ps.app.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await createActiveProcess(admin.token);

      const folderUuid = crypto.randomUUID();
      const { resumePath, transcriptPath, photoPath } =
        await orchestrator.database.seed.uploadSelectionProcessFiles(
          folderUuid,
        );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          makePayload(resumePath, transcriptPath, photoPath),
        ),
      });
      const body = (await response.json()) as {
        id: string;
        created_at: string;
      };

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.created_at).toBeDefined();
    });

    test('Attempting to submit when no active process exists', async () => {
      await orchestrator.database.clear();

      const folderUuid = crypto.randomUUID();
      const { resumePath, transcriptPath, photoPath } =
        await orchestrator.database.seed.uploadSelectionProcessFiles(
          folderUuid,
        );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          makePayload(resumePath, transcriptPath, photoPath),
        ),
      });

      expect(response.status).toBe(404);
    });

    test('Attempting to submit with a duplicate email in the same process', async () => {
      await orchestrator.database.clear();

      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor App Dup Setup',
        email: `ps.app.dup.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await createActiveProcess(admin.token);

      const email = `candidato.dup.${Date.now()}@example.com`;

      const folder1 = crypto.randomUUID();
      const files1 =
        await orchestrator.database.seed.uploadSelectionProcessFiles(folder1);

      await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          makePayload(
            files1.resumePath,
            files1.transcriptPath,
            files1.photoPath,
            email,
          ),
        ),
      });

      const folder2 = crypto.randomUUID();
      const files2 =
        await orchestrator.database.seed.uploadSelectionProcessFiles(folder2);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          makePayload(
            files2.resumePath,
            files2.transcriptPath,
            files2.photoPath,
            email,
          ),
        ),
      });

      expect(response.status).toBe(409);
    });

    test('Attempting to submit with a file not in storage', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor App NoFile Setup',
        email: `ps.app.nofile.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await createActiveProcess(admin.token);

      const fakeUuid = crypto.randomUUID();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          makePayload(
            `${fakeUuid}/resume.pdf`,
            `${fakeUuid}/transcript.pdf`,
            `${fakeUuid}/photo.jpg`,
          ),
        ),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to submit with a missing required field', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'João' }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to submit with an invalid period (zero)', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor App BadPeriod',
        email: `ps.app.badperiod.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await createActiveProcess(admin.token);

      const folderUuid = crypto.randomUUID();
      const { resumePath, transcriptPath, photoPath } =
        await orchestrator.database.seed.uploadSelectionProcessFiles(
          folderUuid,
        );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...makePayload(resumePath, transcriptPath, photoPath),
          period: 0,
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to submit with an invalid shirt size', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor App BadShirt',
        email: `ps.app.badshirt.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await createActiveProcess(admin.token);

      const folderUuid = crypto.randomUUID();
      const { resumePath, transcriptPath, photoPath } =
        await orchestrator.database.seed.uploadSelectionProcessFiles(
          folderUuid,
        );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...makePayload(resumePath, transcriptPath, photoPath),
          shirt_size: 'XXL',
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});
