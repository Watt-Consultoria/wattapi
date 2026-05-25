# WattAPI

API REST da **Watt Consultoria**, Empresa Júnior de Engenharia Elétrica. Desenvolvida com [NestJS](https://nestjs.com/) e [Supabase](https://supabase.com/), fornece o backend centralizado para gerenciamento de membros e operações internas da EJ.

## Visão geral

A API expõe endpoints para autenticação, gerenciamento de usuários e monitoramento de saúde do serviço. O controle de acesso é baseado em JWT e em uma hierarquia de cargos interna, onde cada cargo possui um nível de permissão diferente.

### Hierarquia de cargos

| Cargo      | Rank |
| ---------- | ---- |
| Consultor  | 0    |
| Gerente    | 1    |
| Diretor    | 2    |
| Assessor   | 3    |
| Presidente | 4    |

Cargos com rank ≥ 3 (Assessor e Presidente) são considerados **superusuários** e possuem acesso irrestrito às operações administrativas.

## Endpoints

### Status

- `GET /status` — verifica a saúde da API e da conexão com o banco de dados. Público.

### Autenticação

- `GET /auth/me` — retorna os dados do usuário autenticado. Requer JWT válido.

### Usuários

- `POST /users` — cria o perfil de um novo membro (requer conta já existente na camada de autenticação do Supabase).
- `GET /users` — lista todos os usuários ativos. Requer autenticação.
- `GET /users/:user_id` — retorna um usuário específico. Requer autenticação.
- `PATCH /users/:user_id` — atualiza dados de um usuário. Membros comuns só editam o próprio perfil (campos limitados); superusuários editam qualquer perfil.
- `DELETE /users/:user_id` — desativa um usuário. Requer rank ≥ 3.

## Stack

- **Runtime:** Node.js
- **Framework:** NestJS 11
- **Banco de dados:** PostgreSQL via Supabase (local com Supabase CLI)
- **Autenticação:** JWT + Supabase Auth
- **Validação:** Zod
- **Testes:** Jest + Supertest

## Configuração local

### Pré-requisitos

- Node.js
- Docker (para o Supabase local)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Instalação

```bash
npm install
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`. As variáveis necessárias incluem as credenciais do Supabase local e a chave secreta do JWT.

### Executar em desenvolvimento

```bash
# Sobe o banco, aplica as migrations e inicia a API em modo watch
npm run start:dev
```

### Migrations

```bash
# Criar uma nova migration
npm run services:migration:create <nome>

# Aplicar migrations pendentes
npm run services:migration:up

# Resetar o banco (reaplica todas as migrations)
npm run services:db:reset
```

## Testes

```bash
# Todos os testes (sobe o banco automaticamente)
npm test

# Testes em modo watch (sem subir serviços)
npm run test:watch

# Cobertura
npm run test:cov
```

## Build para produção

```bash
npm run build
npm run start:prod
```

## Licença

Uso interno — Watt Consultoria.
