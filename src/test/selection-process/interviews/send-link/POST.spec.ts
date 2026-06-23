import orchestrator from '../../../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process/interviews/send-link';

type SendLinksResult = { candidate_id: string; success: boolean };

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /selection-process/interviews/send-link ─────────────────────────────

describe('POST /selection-process/interviews/send-link', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Sending interview links to multiple candidates', async () => {
      await orchestrator.database.clear();

      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Send Link',
        email: `psel.sendlink.assessor.${Date.now()}@watt-test.com`,
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
          name: 'Candidato A Send Link',
        }),
        orchestrator.database.seed.createCandidate({
          selection_process_id: process.id,
          stage_id: stage.id,
          name: 'Candidato B Send Link',
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
        }),
      });
      const body = (await response.json()) as SendLinksResult[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
      expect(body.every((r) => r.success === true)).toBe(true);
    });

    test('Attempting to send with empty candidate_ids returns 400', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Send Link Empty',
        email: `psel.sendlink.assessor.empty.${Date.now()}@watt-test.com`,
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
        body: JSON.stringify({ candidate_ids: [] }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to send when no active process exists returns 404', async () => {
      await orchestrator.database.clear();

      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Send Link No Process',
        email: `psel.sendlink.assessor.noprocess.${Date.now()}@watt-test.com`,
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
        }),
      });

      expect(response.status).toBe(404);
    });

    test('Attempting to send to a non-existent candidate returns 404', async () => {
      await orchestrator.database.clear();

      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Send Link No Candidate',
        email: `psel.sendlink.assessor.nocandidate.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await orchestrator.database.seed.createSelectionProcess();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assessor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_ids: ['00000000-0000-0000-0000-000000000001'],
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Presidente can send interview links', async () => {
      await orchestrator.database.clear();

      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Send Link',
        email: `psel.sendlink.presidente.${Date.now()}@watt-test.com`,
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
        body: JSON.stringify({ candidate_ids: [candidate.id] }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Attempting to send interview links without permission returns 403', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Send Link Forbidden',
        email: `psel.sendlink.consultor.${Date.now()}@watt-test.com`,
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
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to send interview links without permission returns 403', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Send Link Forbidden',
        email: `psel.sendlink.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gerente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_ids: ['00000000-0000-0000-0000-000000000001'],
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to send interview links without a token returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_ids: ['00000000-0000-0000-0000-000000000001'],
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
