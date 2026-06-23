import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process/interviews';

type AvailableSlot = { starts_at: string; ends_at: string };

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /selection-process/interviews ───────────────────────────────────────

describe('GET /selection-process/interviews', () => {
  describe('Unauthenticated user', () => {
    test('Listing available slots when 2 consultants share the same time window', async () => {
      await orchestrator.database.clear();

      const [consA, consB] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A GET Two Free',
          email: `psel.get.twofree.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B GET Two Free',
          email: `psel.get.twofree.b.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        }),
      ]);
      const process = await orchestrator.database.seed.createSelectionProcess();

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: '2027-01-10T11:00:00Z',
      });
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consB.id,
        starts_at: '2027-01-10T11:00:00Z',
      });

      const response = await fetch(BASE_URL);
      const body = (await response.json()) as AvailableSlot[];

      expect(response.status).toBe(200);
      const slot = body.find((s) => s.starts_at.includes('2027-01-10T11'));
      expect(slot).toBeDefined();
      expect(slot).not.toHaveProperty('consultant_id');
      expect(slot).not.toHaveProperty('consultant_name');
      expect(slot!.ends_at).toBeDefined();
    });

    test('Listing available slots when only 1 consultant is registered for a time window', async () => {
      await orchestrator.database.clear();

      const consA = await orchestrator.database.seed.createUser({
        username: 'Consultor A GET One Free',
        email: `psel.get.onefree.a.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const process = await orchestrator.database.seed.createSelectionProcess();

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: '2027-01-11T11:00:00Z',
      });

      const response = await fetch(BASE_URL);
      const body = (await response.json()) as AvailableSlot[];

      expect(response.status).toBe(200);
      const slot = body.find((s) => s.starts_at.includes('2027-01-11T11'));
      expect(slot).toBeUndefined();
    });

    test('Listing available slots when 1 of 3 consultants at a slot already has a booking', async () => {
      await orchestrator.database.clear();

      const [consA, consB, consC] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A GET Three',
          email: `psel.get.three.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B GET Three',
          email: `psel.get.three.b.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor C GET Three',
          email: `psel.get.three.c.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'marketing',
        }),
      ]);
      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
      });
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2027-01-12T11:00:00Z',
      });

      // Slot A is booked; B and C are free
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: '2027-01-12T11:00:00Z',
        booking_id: booking.id,
      });
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consB.id,
        starts_at: '2027-01-12T11:00:00Z',
      });
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consC.id,
        starts_at: '2027-01-12T11:00:00Z',
      });

      const response = await fetch(BASE_URL);
      const body = (await response.json()) as AvailableSlot[];

      expect(response.status).toBe(200);
      const slot = body.find((s) => s.starts_at.includes('2027-01-12T11'));
      expect(slot).toBeDefined();
    });

    test('Listing available slots when all consultants at every slot already have bookings', async () => {
      await orchestrator.database.clear();

      const [consA, consB] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A GET All Booked',
          email: `psel.get.allbooked.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B GET All Booked',
          email: `psel.get.allbooked.b.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        }),
      ]);
      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
      });
      const booking = await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2027-01-13T11:00:00Z',
      });

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: '2027-01-13T11:00:00Z',
        booking_id: booking.id,
      });
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consB.id,
        starts_at: '2027-01-13T11:00:00Z',
        booking_id: booking.id,
      });

      const response = await fetch(BASE_URL);
      const body = (await response.json()) as AvailableSlot[];

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });

    test('Listing available slots when no active selection process exists', async () => {
      await orchestrator.database.clear();

      const response = await fetch(BASE_URL);
      const body = (await response.json()) as AvailableSlot[];

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });

    test('Slots starting within 24 hours are not returned', async () => {
      await orchestrator.database.clear();

      const [consA, consB] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A Soon',
          email: `psel.get.soon.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B Soon',
          email: `psel.get.soon.b.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        }),
      ]);
      const process = await orchestrator.database.seed.createSelectionProcess();

      // Slot 23 hours from now (within the 24h cutoff)
      const soonStart = new Date(Date.now() + 23 * 60 * 60 * 1000);
      soonStart.setUTCMinutes(0, 0, 0);
      const soonStartIso = soonStart.toISOString();

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: soonStartIso,
      });
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consB.id,
        starts_at: soonStartIso,
      });

      const response = await fetch(BASE_URL);
      const body = (await response.json()) as AvailableSlot[];

      expect(response.status).toBe(200);
      const soonSlot = body.find(
        (s) => s.starts_at === soonStart.toISOString(),
      );
      expect(soonSlot).toBeUndefined();
    });
  });
});
