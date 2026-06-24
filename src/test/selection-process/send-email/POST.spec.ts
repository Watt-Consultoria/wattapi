import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process/send-email';

type SendEmailResult = { successes: number; errors: number };

const VALID_BODY = {
  subject: 'Comunicado do processo seletivo',
  html: '<p>Olá!</p>',
  plain_text: 'Olá!',
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /selection-process/send-email ──────────────────────────────────────

describe('POST /selection-process/send-email', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Sending email to multiple candidates returns successes count', async () => {
      await orchestrator.database.clear();

      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Send Email',
        email: `psel.sendemail.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const [candidateA, candidateB] = await Promise.all([
        orchestrator.database.seed.createCandidate({
          selection_process_id: process.id,
          stage_id: stage.id,
          name: 'Candidato A Send Email',
        }),
        orchestrator.database.seed.createCandidate({
          selection_process_id: process.id,
          stage_id: stage.id,
          name: 'Candidato B Send Email',
        }),
      ]);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assessor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_ids: [candidateA.id, candidateB.id],
          ...VALID_BODY,
        }),
      });
      const body = (await response.json()) as SendEmailResult;

      expect(response.status).toBe(200);
      expect(typeof body.successes).toBe('number');
      expect(typeof body.errors).toBe('number');
      expect(body.successes + body.errors).toBe(2);
    });

    test('Sending email to a non-existent candidate returns 404', async () => {
      await orchestrator.database.clear();

      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Send Email Not Found',
        email: `psel.sendemail.assessor.notfound.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assessor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_ids: ['00000000-0000-0000-0000-000000000001'],
          ...VALID_BODY,
        }),
      });

      expect(response.status).toBe(404);
    });

    test('Requesting with empty candidate_ids returns 400', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Send Email Empty',
        email: `psel.sendemail.assessor.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assessor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidate_ids: [], ...VALID_BODY }),
      });

      expect(response.status).toBe(400);
    });

    test('Requesting with missing required field returns 400', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Send Email Missing Field',
        email: `psel.sendemail.assessor.missing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assessor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_ids: ['00000000-0000-0000-0000-000000000001'],
          subject: 'Assunto',
          // missing html and plain_text
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Presidente can send emails to candidates', async () => {
      await orchestrator.database.clear();

      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Send Email',
        email: `psel.sendemail.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_ids: [candidate.id],
          ...VALID_BODY,
        }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Attempting to send email without permission returns 403', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Send Email Forbidden',
        email: `psel.sendemail.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_ids: ['00000000-0000-0000-0000-000000000001'],
          ...VALID_BODY,
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to send email without a token returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_ids: ['00000000-0000-0000-0000-000000000001'],
          ...VALID_BODY,
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
