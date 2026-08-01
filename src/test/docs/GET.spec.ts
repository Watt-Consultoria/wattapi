import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/docs';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

// ─── GET /docs ──────────────────────────────────────────────────────────────

describe('GET /docs', () => {
  describe('Unauthenticated user', () => {
    test('Serves Swagger UI without requiring authentication', async () => {
      const response = await fetch(BASE_URL);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(body).toContain('swagger-ui');
      expect(body).not.toContain('WattAPI — Documentação');
    });
  });
});

// ─── GET /docs-json ─────────────────────────────────────────────────────────

type OpenApiOperation = {
  description?: string;
  security?: Array<Record<string, unknown>>;
};
type OpenApiDocument = {
  openapi: string;
  paths: Record<string, Record<string, OpenApiOperation>>;
};

describe('GET /docs-json', () => {
  describe('Unauthenticated user', () => {
    test('Serves the OpenAPI document as valid JSON with known routes', async () => {
      const response = await fetch(`${BASE_URL}-json`);
      const body = (await response.json()) as OpenApiDocument;

      expect(response.status).toBe(200);
      expect(body.openapi).toMatch(/^3\./);
      expect(body.paths['/users']).toBeDefined();
      expect(body.paths['/auth/me']).toBeDefined();
    });

    test('Injects the RoutePolicy authorization rule into a role-restricted operation', async () => {
      const response = await fetch(`${BASE_URL}-json`);
      const body = (await response.json()) as OpenApiDocument;

      const deleteUser = body.paths['/users/{user_id}']?.delete;
      expect(deleteUser?.description).toContain('assessor');
      expect(deleteUser?.description).toContain('presidente');
    });

    test('Declares a bearer security requirement on authenticated operations so "try it out" attaches the token', async () => {
      const response = await fetch(`${BASE_URL}-json`);
      const body = (await response.json()) as OpenApiDocument;

      const getUsers = body.paths['/users']?.get;
      expect(getUsers?.security).toEqual([{ bearer: [] }]);
    });

    test('Does not declare a security requirement on unauthenticated operations', async () => {
      const response = await fetch(`${BASE_URL}-json`);
      const body = (await response.json()) as OpenApiDocument;

      const vapidPublicKey =
        body.paths['/push-subscriptions/vapid-public-key']?.get;
      expect(vapidPublicKey?.security ?? []).toHaveLength(0);
    });
  });
});
