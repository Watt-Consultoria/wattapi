import orchestrator from '../../../orchestrator';

const BASE_URL =
  'http://localhost:3001/selection-process/interviews/evaluations';

type InterviewEvaluationWithCandidateResponse = {
  id: string;
  booking_id: string;
  evaluator_id: string;
  candidate_id: string;
  candidate_name: string;
  proatividade: number;
  lideranca: number;
  transparencia: number;
  uniao_de_time: number;
  comunicacao: number;
  seriedade: number;
  compromisso: number;
  proposito: number;
  autoresponsabilidade: number;
  autoconfianca: number;
  responsabilidade_social: number;
  criatividade: number;
  procrastinacao: boolean;
  desinteresse: boolean;
  falta_de_transparencia: boolean;
  proposito_vago: boolean;
  vitimizacao: boolean;
  falta_de_confianca: boolean;
  observacoes: string | null;
  created_at: string;
};

const validEvaluation = {
  proatividade: 4,
  lideranca: 3,
  transparencia: 5,
  uniao_de_time: 4,
  comunicacao: 3,
  seriedade: 5,
  compromisso: 4,
  proposito: 3,
  autoresponsabilidade: 5,
  autoconfianca: 4,
  responsabilidade_social: 3,
  criatividade: 5,
  procrastinacao: false,
  desinteresse: false,
  falta_de_transparencia: false,
  proposito_vago: false,
  vitimizacao: false,
  falta_de_confianca: false,
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /selection-process/interviews/evaluations ───────────────────────────

describe('GET /selection-process/interviews/evaluations', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retorna lista de avaliações com dados do candidato', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Eval List 200',
      });
      const [consultor1, consultor2] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor Eval List 200 A',
          email: `psel.evallist.c1.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Eval List 200 B',
          email: `psel.evallist.c2.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
      ]);
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2025-01-01T11:00:00Z',
      });
      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor1.id,
          starts_at: '2025-01-01T11:00:00Z',
          booking_id: booking.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor2.id,
          starts_at: '2025-01-01T11:00:00Z',
          booking_id: booking.id,
        }),
      ]);

      await fetch(
        `http://localhost:3001/selection-process/interviews/${booking.id}/evaluation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor1.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validEvaluation),
        },
      );

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor1.token}` },
      });
      const body =
        (await response.json()) as InterviewEvaluationWithCandidateResponse[];

      expect(response.status).toBe(200);
      expect(body.length).toBeGreaterThanOrEqual(1);

      const evaluation = body.find((e) => e.booking_id === booking.id);
      expect(evaluation).toBeDefined();
      expect(evaluation!.candidate_id).toBe(candidate.id);
      expect(evaluation!.candidate_name).toBe('Candidato Eval List 200');
      expect(evaluation!.evaluator_id).toBe(consultor1.id);
      expect(evaluation!.proatividade).toBe(4);
    });

    test('Filtra avaliações por selection_process_id e retorna só as do processo', async () => {
      await orchestrator.database.clear();

      const [process1, process2] = await Promise.all([
        orchestrator.database.seed.createSelectionProcess(),
        orchestrator.database.seed.createSelectionProcess(),
      ]);
      const [stage1, stage2] = await Promise.all([
        orchestrator.database.seed.createProcessStage({
          selection_process_id: process1.id,
        }),
        orchestrator.database.seed.createProcessStage({
          selection_process_id: process2.id,
        }),
      ]);
      const [candidate1, candidate2] = await Promise.all([
        orchestrator.database.seed.createCandidate({
          selection_process_id: process1.id,
          stage_id: stage1.id,
          name: 'Candidato Filtro P1',
        }),
        orchestrator.database.seed.createCandidate({
          selection_process_id: process2.id,
          stage_id: stage2.id,
          name: 'Candidato Filtro P2',
        }),
      ]);
      const [consultor1, consultor2, consultor3, consultor4] =
        await Promise.all([
          orchestrator.database.seed.createUser({
            username: 'Consultor Filtro P1 A',
            email: `psel.evalfiltro.p1a.${Date.now()}@watt-test.com`,
            password: '',
            role: 'consultor',
            sector: 'projetos',
          }),
          orchestrator.database.seed.createUser({
            username: 'Consultor Filtro P1 B',
            email: `psel.evalfiltro.p1b.${Date.now()}@watt-test.com`,
            password: '',
            role: 'consultor',
            sector: 'projetos',
          }),
          orchestrator.database.seed.createUser({
            username: 'Consultor Filtro P2 A',
            email: `psel.evalfiltro.p2a.${Date.now()}@watt-test.com`,
            password: '',
            role: 'consultor',
            sector: 'projetos',
          }),
          orchestrator.database.seed.createUser({
            username: 'Consultor Filtro P2 B',
            email: `psel.evalfiltro.p2b.${Date.now()}@watt-test.com`,
            password: '',
            role: 'consultor',
            sector: 'projetos',
          }),
        ]);

      const [booking1, booking2] = await Promise.all([
        orchestrator.database.seed.createInterviewBooking({
          selection_process_id: process1.id,
          candidate_id: candidate1.id,
          starts_at: '2025-01-01T11:00:00Z',
        }),
        orchestrator.database.seed.createInterviewBooking({
          selection_process_id: process2.id,
          candidate_id: candidate2.id,
          starts_at: '2025-01-01T12:00:00Z',
        }),
      ]);

      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process1.id,
          consultant_id: consultor1.id,
          starts_at: '2025-01-01T11:00:00Z',
          booking_id: booking1.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process1.id,
          consultant_id: consultor2.id,
          starts_at: '2025-01-01T11:00:00Z',
          booking_id: booking1.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process2.id,
          consultant_id: consultor3.id,
          starts_at: '2025-01-01T12:00:00Z',
          booking_id: booking2.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process2.id,
          consultant_id: consultor4.id,
          starts_at: '2025-01-01T12:00:00Z',
          booking_id: booking2.id,
        }),
      ]);

      const evalUrl = 'http://localhost:3001/selection-process/interviews';
      await Promise.all([
        fetch(`${evalUrl}/${booking1.id}/evaluation`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor1.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validEvaluation),
        }),
        fetch(`${evalUrl}/${booking2.id}/evaluation`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor3.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validEvaluation),
        }),
      ]);

      const response = await fetch(
        `${BASE_URL}?selection_process_id=${process1.id}`,
        { headers: { Authorization: `Bearer ${consultor1.token}` } },
      );
      const body =
        (await response.json()) as InterviewEvaluationWithCandidateResponse[];

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].booking_id).toBe(booking1.id);
      expect(body[0].candidate_name).toBe('Candidato Filtro P1');
    });

    test('Retorna lista vazia quando não há avaliações', async () => {
      await orchestrator.database.clear();

      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Eval Empty',
        email: `psel.evalempty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body: unknown = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('Unauthenticated user', () => {
    test('Tentativa sem token retorna 401', async () => {
      const response = await fetch(BASE_URL);

      expect(response.status).toBe(401);
    });
  });
});
