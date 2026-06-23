import orchestrator from '../../../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process/interviews/meet-link';

const VALID_MEET_LINK = 'https://meet.google.com/abc-defg-hij';

type InterviewBookingResponse = {
  id: string;
  selection_process_id: string;
  candidate_id: string;
  starts_at: string;
  ends_at: string;
  booked_at: string;
  meet_link: string | null;
  created_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /selection-process/interviews/meet-link ─────────────────────────────

describe('POST /selection-process/interviews/meet-link', () => {
  describe('Authenticated CONSULTOR vinculado ao booking', () => {
    test('Envia link do Google Meet válido e retorna booking atualizado', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Meet Link',
      });
      const [consultor1, consultor2] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor Meet Link 1',
          email: `psel.meetlink.consultor1.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Meet Link 2',
          email: `psel.meetlink.consultor2.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
      ]);
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2027-01-01T11:00:00Z',
      });
      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor1.id,
          starts_at: '2027-01-01T11:00:00Z',
          booking_id: booking.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor2.id,
          starts_at: '2027-01-01T11:00:00Z',
          booking_id: booking.id,
        }),
      ]);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor1.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          meet_link: VALID_MEET_LINK,
        }),
      });
      const body = (await response.json()) as InterviewBookingResponse;

      expect(response.status).toBe(200);
      expect(body.id).toBe(booking.id);
      expect(body.meet_link).toBe(VALID_MEET_LINK);
    });

    test('Tentativa de enviar link inválido (não segue padrão Google Meet) retorna 400', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Meet Link Bad Format',
        email: `psel.meetlink.consultor.badformat.${Date.now()}@watt-test.com`,
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
          booking_id: '00000000-0000-0000-0000-000000000001',
          meet_link: 'https://zoom.us/j/123456789',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Tentativa de enviar sem booking_id retorna 400', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Meet Link No BookingId',
        email: `psel.meetlink.consultor.nobooking.${Date.now()}@watt-test.com`,
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
        body: JSON.stringify({ meet_link: VALID_MEET_LINK }),
      });

      expect(response.status).toBe(400);
    });

    test('Tentativa de enviar para booking inexistente retorna 404', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Meet Link 404',
        email: `psel.meetlink.consultor.404.${Date.now()}@watt-test.com`,
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
          booking_id: '00000000-0000-0000-0000-000000000001',
          meet_link: VALID_MEET_LINK,
        }),
      });

      expect(response.status).toBe(404);
    });

    test('Tentativa de enviar link para booking que já tem meet_link retorna 409', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Meet Link 409',
      });
      const [consultor1, consultor2] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor Meet Link 409 A',
          email: `psel.meetlink.409.c1.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Meet Link 409 B',
          email: `psel.meetlink.409.c2.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
      ]);
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2027-01-01T12:00:00Z',
      });
      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor1.id,
          starts_at: '2027-01-01T12:00:00Z',
          booking_id: booking.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor2.id,
          starts_at: '2027-01-01T12:00:00Z',
          booking_id: booking.id,
        }),
      ]);

      await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor1.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          meet_link: VALID_MEET_LINK,
        }),
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor1.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          meet_link: VALID_MEET_LINK,
        }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated CONSULTOR não vinculado ao booking', () => {
    test('Tentativa de enviar link sem ser consultor do booking retorna 403', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Meet Link 403',
      });
      const [consultor1, consultor2, outsider] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor Meet Link Owner A',
          email: `psel.meetlink.403.c1.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Meet Link Owner B',
          email: `psel.meetlink.403.c2.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor Meet Link Outsider',
          email: `psel.meetlink.403.outsider.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        }),
      ]);
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2027-01-01T13:00:00Z',
      });
      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor1.id,
          starts_at: '2027-01-01T13:00:00Z',
          booking_id: booking.id,
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consultor2.id,
          starts_at: '2027-01-01T13:00:00Z',
          booking_id: booking.id,
        }),
      ]);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${outsider.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          meet_link: VALID_MEET_LINK,
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Tentativa de enviar link sem token retorna 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: '00000000-0000-0000-0000-000000000001',
          meet_link: VALID_MEET_LINK,
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
