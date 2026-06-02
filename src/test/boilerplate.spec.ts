// @ts-nocheck — this is a template file, not a runnable test
/* eslint-disable */
// INTEGRATION TEST BOILERPLATE
// ─────────────────────────────────────────────────────────────────────────────
//
// File location:  src/test/<resource>/<METHOD>.spec.ts
//   <resource>  — plural noun matching the route (users, activities, routine…)
//   <METHOD>    — HTTP verb in uppercase (GET, POST, PATCH, DELETE, PUT)
//
// One file per HTTP method. Exception: GET /resource and GET /resource/:id live
// in the same GET.spec.ts under separate top-level describe blocks.
//
// Multiple route groups in one file (e.g. GET /activities and GET /activities/me)
// are separated with banner comments:
//   "// ─── GET /activities ──────────────────────────────────────────────────"
//
// ─────────────────────────────────────────────────────────────────────────────

import orchestrator from '../orchestrator';

// Base URL for every request in this file — no trailing slash.
const BASE_URL = 'http://localhost:3001/<resource>';

// If the route accepts a body, define a shared valid payload here.
// This makes the "missing field" / "invalid value" tests easy to write.
const validPayload = {
  field_one: 'value',
  field_two: 123,
};

// ─────────────────────────────────────────────────────────────────────────────
// File-level setup: runs once before all tests in this file.
// NEVER put afterAll cleanup here — cleanup is always done at the START of
// the next run, not the end of this one.
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── <METHOD> <route> ─────────────────────────────────────────────────────────

describe('<METHOD> <route>', () => {
  // ── Who is acting? ───────────────────────────────────────────────────────
  // Include a describe block for every role. If a role behaves identically
  // to another, still write the block — it documents the intent.
  // Never omit a role, if a role is not allowed to perform the action, write a test for that too (see "Forbidden" test below).

  describe('Authenticated CONSULTOR', () => {
    // Happy path — the main success scenario for this role.
    test('<what this role is allowed to do>', async () => {
      // 1. Seed — create the minimum data this test needs.
      //    Always use unique emails: role.action.${Date.now()}@watt-test.com
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor <Action>',
        email: `<resource>.<method>.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      // 2. Act — make the HTTP request.
      const response = await fetch(BASE_URL, {
        method: '<METHOD>',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(validPayload),
      });
      const body = (await response.json()) as { id: string; user_id: string };

      // 3. Assert — verify the HTTP status and the response shape.
      expect(response.status).toBe(200 /* or 201 / 204 */);
      expect(body.user_id).toBe(user.id);
    });

    // Validation error — required field missing or invalid value.
    // Place these under the role that triggered them (or PRESIDENTE if
    // validation is role-independent — avoids repeating in every block).
    test('Attempting to <action> with a missing required field', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor <Action> Bad Input',
        email: `<resource>.<method>.consultor.bad.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: '<METHOD>',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ field_one: 'value' /* field_two missing */ }),
      });
      expect(response.status).toBe(400);
    });

    // Forbidden — accessing a resource the user does not own or cannot see.
    // Only include when the route actually enforces ownership/scope per role.
    test("Attempting to <action> on another user's resource", async () => {
      const _owner = await orchestrator.database.seed.createUser({
        username: 'Resource Owner',
        email: `<resource>.<method>.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor <Action> Forbidden',
        email: `<resource>.<method>.consultor.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      // Seed a resource belonging to `owner`
      // const resource = await orchestrator.database.seed.create<Resource>({ user_id: owner.id });

      const response = await fetch(`${BASE_URL}/<resource-id>`, {
        method: '<METHOD>',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });

    // Not found — valid UUID that does not exist.
    // Use the canonical zero-padded sentinel: 00000000-0000-0000-0000-000000000001
    test('Attempting to <action> a non-existent resource', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor <Action> 404',
        email: `<resource>.<method>.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('<what this role is allowed to do>', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente <Action>',
        email: `<resource>.<method>.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: '<METHOD>',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('<what this role is allowed to do>', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor <Action>',
        email: `<resource>.<method>.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: '<METHOD>',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('<what this role is allowed to do>', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor <Action>',
        email: `<resource>.<method>.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: '<METHOD>',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('<what this role is allowed to do>', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente <Action>',
        email: `<resource>.<method>.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: '<METHOD>',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  // Unauthenticated — always present; any protected route must return 401
  // when no Authorization header is provided.
  describe('Unauthenticated user', () => {
    test('Attempting to <action> without a token', async () => {
      const response = await fetch(BASE_URL, {
        method: '<METHOD>',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });
      expect(response.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONVENTIONS QUICK-REFERENCE
// ─────────────────────────────────────────────────────────────────────────────
//
// STRUCTURE
//   • One HTTP method per file.  GET /resource and GET /resource/:id share
//     a file; POST, PATCH, DELETE each get their own.
//   • Every test is fully self-contained: seed → act → assert inside the
//     test() body. No shared outer beforeAll seeds.
//   • Exception: a describe-scoped beforeAll is fine when multiple sibling
//     tests share a user they do NOT mutate.
//
// EMAILS
//   • Must be unique per test: role.action.${Date.now()}@watt-test.com
//   • Two tests creating the same email in one file will collide.
//
// MANDATORY SCENARIOS (apply when the route supports them)
//   • 200/201/204  Happy path for every permitted role
//   • 400          Invalid or missing required field in the request body
//   • 401          Request without an Authorization header
//   • 403          Role that is not allowed to perform the action
//   • 404          Valid UUID that does not exist in the database
//   • 409          Uniqueness conflict on creation/update
//
// ORCHESTRATOR
//   • Import exclusively from '../orchestrator' (never ../../lib/orchestrator)
//   • orchestrator.database.seed.createUser({ username, email, password:'', role, sector? })
//   • orchestrator.database.seed.createActivity({ user_id, name?, date?, … })
//   • orchestrator.database.seed.createNotification({ user_id, title?, … })
//   • orchestrator.database.seed.createRoutineSlot({ user_id, day?, hour? })
//   • orchestrator.database.seed.createTimeEntry({ user_id, clocked_in_at?, clocked_out_at? })
//   • orchestrator.database.seed.createReimbursement({ user_id, title?, amount_cents?, … })
//   • orchestrator.database.seed.uploadFile(userId, filename) → storagePath
//
// SECTORS (valid values for `sector` in createUser)
//   comercial | projetos | institucional | executivo | financeiro | rh
//
// ROLES
//   consultor | gerente | diretor | assessor | presidente
