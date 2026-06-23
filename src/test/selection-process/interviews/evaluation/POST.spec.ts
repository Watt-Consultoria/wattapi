import orchestrator from '../../../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process/interviews';

type InterviewEvaluationResponse = {
  id: string;
  booking_id: string;
  evaluator_id: string;
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
  observacoes: 'Candidato demonstrou boa comunicação e proatividade.',
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /selection-process/interviews/:bookingId/evaluation ─────────────────

describe('POST /selection-process/interviews/:bookingId/evaluation', () => {
  describe('Authenticated CONSULTOR vinculado ao booking', () => {
    test('Submete avaliação completa com todos os campos e retorna 201', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Evaluation 201',
      });
      const [consultor1, consultor2] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation 201 A',
          email: `psel.eval.consultor1.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation 201 B',
          email: `psel.eval.consultor2.${Date.now()}@watt-test.com`,
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

      const response = await fetch(`${BASE_URL}/${booking.id}/evaluation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor1.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validEvaluation),
      });
      const body = (await response.json()) as InterviewEvaluationResponse;

      expect(response.status).toBe(201);
      expect(body.booking_id).toBe(booking.id);
      expect(body.evaluator_id).toBe(consultor1.id);
      expect(body.proatividade).toBe(4);
      expect(body.criatividade).toBe(5);
      expect(body.procrastinacao).toBe(false);
      expect(body.observacoes).toBe(
        'Candidato demonstrou boa comunicação e proatividade.',
      );
    });

    test('Submete avaliação válida sem observacoes e retorna 201 com observacoes null', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Evaluation No Notes',
      });
      const [consultor1, consultor2] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation No Notes A',
          email: `psel.eval.nonotes.c1.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation No Notes B',
          email: `psel.eval.nonotes.c2.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
      ]);
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2025-01-01T12:00:00Z',
      });
      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor1.id,
          starts_at: '2025-01-01T12:00:00Z',
          booking_id: booking.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor2.id,
          starts_at: '2025-01-01T12:00:00Z',
          booking_id: booking.id,
        }),
      ]);

      const { observacoes: _omit, ...evaluationWithoutNotes } = validEvaluation;

      const response = await fetch(`${BASE_URL}/${booking.id}/evaluation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor1.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluationWithoutNotes),
      });
      const body = (await response.json()) as InterviewEvaluationResponse;

      expect(response.status).toBe(201);
      expect(body.observacoes).toBeNull();
    });

    test('Tentativa de enviar nota fora do intervalo (> 5) retorna 400', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Evaluation Bad Score',
        email: `psel.eval.badscore.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/evaluation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...validEvaluation, proatividade: 6 }),
        },
      );

      expect(response.status).toBe(400);
    });

    test('Tentativa de enviar nota abaixo do mínimo (< 1) retorna 400', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Evaluation Score Zero',
        email: `psel.eval.scorezero.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/evaluation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...validEvaluation, lideranca: 0 }),
        },
      );

      expect(response.status).toBe(400);
    });

    test('Tentativa de enviar sem campo obrigatório retorna 400', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Evaluation Missing Field',
        email: `psel.eval.missingfield.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const { criatividade: _omit, ...withoutCriatividade } = validEvaluation;

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/evaluation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(withoutCriatividade),
        },
      );

      expect(response.status).toBe(400);
    });

    test('Tentativa de avaliar antes do início da entrevista retorna 400', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Evaluation Future',
      });
      const [consultor1, consultor2] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation Future A',
          email: `psel.eval.future.c1.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation Future B',
          email: `psel.eval.future.c2.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
      ]);
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2030-01-01T11:00:00Z',
      });
      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor1.id,
          starts_at: '2030-01-01T11:00:00Z',
          booking_id: booking.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor2.id,
          starts_at: '2030-01-01T11:00:00Z',
          booking_id: booking.id,
        }),
      ]);

      const response = await fetch(`${BASE_URL}/${booking.id}/evaluation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor1.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validEvaluation),
      });

      expect(response.status).toBe(400);
    });

    test('Tentativa de avaliar booking inexistente retorna 404', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Evaluation 404',
        email: `psel.eval.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/evaluation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validEvaluation),
        },
      );

      expect(response.status).toBe(404);
    });

    test('Tentativa de avaliar booking que já possui avaliação retorna 409', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Evaluation 409',
      });
      const [consultor1, consultor2] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation 409 A',
          email: `psel.eval.409.c1.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation 409 B',
          email: `psel.eval.409.c2.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
      ]);
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2025-01-01T13:00:00Z',
      });
      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor1.id,
          starts_at: '2025-01-01T13:00:00Z',
          booking_id: booking.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor2.id,
          starts_at: '2025-01-01T13:00:00Z',
          booking_id: booking.id,
        }),
      ]);

      await fetch(`${BASE_URL}/${booking.id}/evaluation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor1.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validEvaluation),
      });

      const response = await fetch(`${BASE_URL}/${booking.id}/evaluation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor1.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validEvaluation),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated CONSULTOR não vinculado ao booking', () => {
    test('Tentativa de avaliar sem ser consultor do booking retorna 403', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Evaluation 403',
      });
      const [consultor1, consultor2, outsider] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation 403 A',
          email: `psel.eval.403.c1.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation 403 B',
          email: `psel.eval.403.c2.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Evaluation Outsider',
          email: `psel.eval.403.outsider.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        }),
      ]);
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2025-01-01T14:00:00Z',
      });
      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor1.id,
          starts_at: '2025-01-01T14:00:00Z',
          booking_id: booking.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor2.id,
          starts_at: '2025-01-01T14:00:00Z',
          booking_id: booking.id,
        }),
      ]);

      const response = await fetch(`${BASE_URL}/${booking.id}/evaluation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${outsider.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validEvaluation),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Tentativa de avaliar sem token retorna 401', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/evaluation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validEvaluation),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
