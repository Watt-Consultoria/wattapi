import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/almoxarifado/material';

interface AlmoxarifadoMaterialResponse {
  id: string;
  nome: string;
  descricao: string;
  quantidade_estoque: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

function validBody() {
  return {
    nome: 'Furadeira de Impacto',
    descricao: 'Furadeira de impacto Bosch 750W',
    quantidade_estoque: 5,
    observacoes: 'Em bom estado',
  };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /almoxarifado/material ───────────────────────────────────────────

describe('POST /almoxarifado/material', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to create a material as consultor', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Create Material',
        email: `almoxarifado.material.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody()),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Creating a material', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Create Material',
        email: `almoxarifado.material.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody()),
      });
      const body = (await response.json()) as AlmoxarifadoMaterialResponse;

      expect(response.status).toBe(201);
      expect(body.nome).toBe('Furadeira de Impacto');
      expect(body.quantidade_estoque).toBe(5);
      expect(body.observacoes).toBe('Em bom estado');
    });

    test('Attempting to create a material with a missing required field', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Create Material Missing Field',
        email: `almoxarifado.material.post.gerente.missing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const { nome: _nome, ...bodyWithoutNome } = validBody();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(bodyWithoutNome),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a material with negative quantidade_estoque', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Create Material Negative Stock',
        email: `almoxarifado.material.post.gerente.negative.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ ...validBody(), quantidade_estoque: -1 }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Creating a material', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Diretor Create Material',
        email: `almoxarifado.material.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody()),
      });
      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Creating a material', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Material',
        email: `almoxarifado.material.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody()),
      });
      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a material', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Presidente Create Material',
        email: `almoxarifado.material.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody()),
      });
      expect(response.status).toBe(201);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a material without a token', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody()),
      });
      expect(response.status).toBe(401);
    });
  });
});
