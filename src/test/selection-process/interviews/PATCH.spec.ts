import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process/interviews';

type InterviewBookingResponse = {
  id: string;
  selection_process_id: string;
  candidate_id: string;
  starts_at: string;
  ends_at: string;
  booked_at: string;
  created_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PATCH /selection-process/interviews ─────────────────────────────────────

describe('PATCH /selection-process/interviews', () => {
  describe('Candidate with a valid booking token', () => {
    test('Booking a slot when exactly 2 consultants are free at the requested time', async () => {
      await orchestrator.database.clear();

      const [consA, consB] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A PATCH Book',
          email: `psel.patch.book.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B PATCH Book',
          email: `psel.patch.book.b.${Date.now()}@watt-test.com`,
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
      const tokenRecord = await orchestrator.database.seed.createInterviewToken(
        {
          candidate_id: candidate.id,
        },
      );

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: '2027-02-01T11:00:00Z',
      });
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consB.id,
        starts_at: '2027-02-01T11:00:00Z',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: '2027-02-01T11:00:00Z',
          token: tokenRecord.token,
        }),
      });
      const body = (await response.json()) as InterviewBookingResponse;

      expect(response.status).toBe(200);
      expect(body.id).toBeDefined();
      expect(body.candidate_id).toBe(candidate.id);
      expect(body.starts_at).toBeDefined();
      expect(body.ends_at).toBeDefined();
    });

    test('Booking a slot when 3 consultants are free at the requested time', async () => {
      await orchestrator.database.clear();

      const [consA, consB, consC] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A PATCH Three',
          email: `psel.patch.three.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B PATCH Three',
          email: `psel.patch.three.b.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor C PATCH Three',
          email: `psel.patch.three.c.${Date.now()}@watt-test.com`,
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
      const tokenRecord = await orchestrator.database.seed.createInterviewToken(
        {
          candidate_id: candidate.id,
        },
      );

      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consA.id,
          starts_at: '2027-02-02T11:00:00Z',
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consB.id,
          starts_at: '2027-02-02T11:00:00Z',
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consC.id,
          starts_at: '2027-02-02T11:00:00Z',
        }),
      ]);

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: '2027-02-02T11:00:00Z',
          token: tokenRecord.token,
        }),
      });
      const body = (await response.json()) as InterviewBookingResponse;

      expect(response.status).toBe(200);
      expect(body.id).toBeDefined();

      // Verify via GET that the slot no longer appears (2 of 3 consultants booked, only 1 free — below the ≥2 threshold)
      const getResponse = await fetch(BASE_URL);
      const slots = (await getResponse.json()) as { starts_at: string }[];
      const slot = slots.find((s) => s.starts_at.includes('2027-02-02T11'));
      expect(slot).toBeUndefined();
    });

    test('Booking a slot triggers email and in-app notification to the assigned consultants', async () => {
      await orchestrator.database.clear();
      await orchestrator.email.deleteAllEmails();

      const [consA, consB] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A PATCH Notify',
          email: `psel.patch.notify.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B PATCH Notify',
          email: `psel.patch.notify.b.${Date.now()}@watt-test.com`,
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
        name: 'Candidato Notify Test',
      });
      const tokenRecord = await orchestrator.database.seed.createInterviewToken(
        { candidate_id: candidate.id },
      );
      await Promise.all([
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consA.id,
          starts_at: '2027-03-01T14:00:00Z',
        }),
        orchestrator.database.seed.createInterviewSlot({
          selection_process_id: process.id,
          consultant_id: consB.id,
          starts_at: '2027-03-01T14:00:00Z',
        }),
      ]);

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: '2027-03-01T14:00:00Z',
          token: tokenRecord.token,
        }),
      });
      expect(response.status).toBe(200);

      // Give async email/notification sends time to complete
      await new Promise((r) => setTimeout(r, 500));

      // Both consultants receive an email
      const emails = await orchestrator.email.getAllEmails();
      const allRecipients = emails.flatMap((e) => e.recipients);
      expect(allRecipients).toContain(consA.email);
      expect(allRecipients).toContain(consB.email);

      // Both consultants have a notification
      const [notifResA, notifResB] = await Promise.all([
        fetch('http://localhost:3001/notifications', {
          headers: { Authorization: `Bearer ${consA.token}` },
        }),
        fetch('http://localhost:3001/notifications', {
          headers: { Authorization: `Bearer ${consB.token}` },
        }),
      ]);
      const notificationsA = (await notifResA.json()) as { title: string }[];
      const notificationsB = (await notifResB.json()) as { title: string }[];
      expect(
        notificationsA.some((n) => n.title === 'Nova entrevista agendada'),
      ).toBe(true);
      expect(
        notificationsB.some((n) => n.title === 'Nova entrevista agendada'),
      ).toBe(true);
    });

    test('Attempting to book a slot with fewer than 2 free consultants at the requested time', async () => {
      await orchestrator.database.clear();

      const consA = await orchestrator.database.seed.createUser({
        username: 'Consultor A PATCH OneFree',
        email: `psel.patch.onefree.a.${Date.now()}@watt-test.com`,
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
      });
      const tokenRecord = await orchestrator.database.seed.createInterviewToken(
        {
          candidate_id: candidate.id,
        },
      );

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: '2027-02-05T11:00:00Z',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: '2027-02-05T11:00:00Z',
          token: tokenRecord.token,
        }),
      });

      expect(response.status).toBe(409);
    });

    test('Attempting to book when already holding an active booking for this process', async () => {
      await orchestrator.database.clear();

      const [consA, consB] = await Promise.all([
        orchestrator.database.seed.createUser({
          username: 'Consultor A PATCH AlreadyBooked',
          email: `psel.patch.already.a.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'projetos',
        }),
        orchestrator.database.seed.createUser({
          username: 'Consultor B PATCH AlreadyBooked',
          email: `psel.patch.already.b.${Date.now()}@watt-test.com`,
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

      // Create an existing booking for this candidate
      await orchestrator.database.seed.createInterviewBooking({
        selection_process_id: process.id,
        candidate_id: candidate.id,
        starts_at: '2027-02-03T11:00:00Z',
      });

      const tokenRecord = await orchestrator.database.seed.createInterviewToken(
        {
          candidate_id: candidate.id,
        },
      );

      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consA.id,
        starts_at: '2027-02-04T11:00:00Z',
      });
      await orchestrator.database.seed.createInterviewSlot({
        selection_process_id: process.id,
        consultant_id: consB.id,
        starts_at: '2027-02-04T11:00:00Z',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: '2027-02-04T11:00:00Z',
          token: tokenRecord.token,
        }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('Candidate without a valid booking token', () => {
    test('Attempting to book without the token field', async () => {
      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starts_at: '2027-02-01T11:00:00Z' }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to book without the starts_at field', async () => {
      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'some-token' }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to book with a non-existent token', async () => {
      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: '2027-02-01T11:00:00Z',
          token: 'nonexistent-token-that-does-not-exist',
        }),
      });

      expect(response.status).toBe(401);
    });

    test('Attempting to book with an expired token', async () => {
      await orchestrator.database.clear();

      const process = await orchestrator.database.seed.createSelectionProcess();
      const stage = await orchestrator.database.seed.createProcessStage({
        selection_process_id: process.id,
      });
      const candidate = await orchestrator.database.seed.createCandidate({
        selection_process_id: process.id,
        stage_id: stage.id,
      });
      const expiredToken =
        await orchestrator.database.seed.createInterviewToken({
          candidate_id: candidate.id,
          expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
        });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: '2027-02-01T11:00:00Z',
          token: expiredToken.token,
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
