import orchestrator from '../../../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process/interviews/slots';

type MySlotResponse = {
  id: string;
  selection_process_id: string;
  consultant_id: string;
  starts_at: string;
  ends_at: string;
  booking_id: string | null;
  created_at: string;
  consultant_name?: string;
  candidate_name: string | null;
  candidate_email: string | null;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /selection-process/interviews/my-slots ───────────────────────────────

describe('GET /selection-process/interviews/my-slots', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Consultant sees only their own slots', async () => {
      await orchestrator.database.clear();

      const [consA, consB] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A GET My Slots',
          email: `psel.myslots.consultor.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B GET My Slots',
          email: `psel.myslots.consultor.b.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        }),
      ]);
      const process = await orchestrator.database.seed.createSelectionProcess();

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: '2027-03-01T11:00:00Z',
      });
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consB.id,
        starts_at: '2027-03-01T11:00:00Z',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consA.token}` },
      });
      const body = (await response.json()) as MySlotResponse[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.every((s) => s.consultant_id === consA.id)).toBe(true);
      expect(body.some((s) => s.consultant_id === consB.id)).toBe(false);
    });

    test('Free slot has null candidate data', async () => {
      await orchestrator.database.clear();

      const cons = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Slot Free',
        email: `psel.myslots.free.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const process = await orchestrator.database.seed.createSelectionProcess();

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: cons.id,
        starts_at: '2027-03-02T11:00:00Z',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${cons.token}` },
      });
      const body = (await response.json()) as MySlotResponse[];

      expect(response.status).toBe(200);
      expect(body.length).toBeGreaterThan(0);
      const slot = body[0];
      expect(slot.booking_id).toBeNull();
      expect(slot.candidate_name).toBeNull();
      expect(slot.candidate_email).toBeNull();
    });

    test('Booked slot includes candidate name and email', async () => {
      await orchestrator.database.clear();

      const cons = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Slot Booked',
        email: `psel.myslots.booked.cons.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
        name: 'Candidato Entrevistado',
      });
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2027-03-03T11:00:00Z',
      });

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: cons.id,
        starts_at: '2027-03-03T11:00:00Z',
        booking_id: booking.id,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${cons.token}` },
      });
      const body = (await response.json()) as MySlotResponse[];

      expect(response.status).toBe(200);
      const slot = body.find((s) => s.booking_id === booking.id);
      expect(slot).toBeDefined();
      expect(slot!.candidate_name).toBe('Candidato Entrevistado');
      expect(slot!.candidate_email).toBe(candidate.email);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Assessor sees all slots from all consultants including consultant_name', async () => {
      await orchestrator.database.clear();

      const [consA, consB, assessor] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A GET Assessor View',
          email: `psel.myslots.assessor.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B GET Assessor View',
          email: `psel.myslots.assessor.b.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        }),
        orchestrator.database.seed.createUser({
          username: 'Assessor GET My Slots',
          email: `psel.myslots.assessor.${Date.now()}@watt-test.com`,
          password: '',
          role: 'assessor',
          sector: 'institucional',
        }),
      ]);
      const process = await orchestrator.database.seed.createSelectionProcess();

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: '2027-03-04T11:00:00Z',
      });
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consB.id,
        starts_at: '2027-03-04T11:00:00Z',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as MySlotResponse[];

      expect(response.status).toBe(200);
      const consultorIds = new Set(body.map((s) => s.consultant_id));
      expect(consultorIds.has(consA.id)).toBe(true);
      expect(consultorIds.has(consB.id)).toBe(true);
      expect(body.every((s) => s.consultant_name !== undefined)).toBe(true);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Presidente sees all slots from all consultants', async () => {
      await orchestrator.database.clear();

      const [cons, presidente] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor GET Presidente View',
          email: `psel.myslots.pres.cons.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Presidente GET My Slots',
          email: `psel.myslots.pres.${Date.now()}@watt-test.com`,
          password: '',
          role: 'presidente',
          sector: 'executivo',
        }),
      ]);
      const process = await orchestrator.database.seed.createSelectionProcess();

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: cons.id,
        starts_at: '2027-03-05T11:00:00Z',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as MySlotResponse[];

      expect(response.status).toBe(200);
      expect(body.some((s) => s.consultant_id === cons.id)).toBe(true);
      expect(body.every((s) => s.consultant_name !== undefined)).toBe(true);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to list slots without a token returns 401', async () => {
      const response = await fetch(BASE_URL);

      expect(response.status).toBe(401);
    });
  });
});
