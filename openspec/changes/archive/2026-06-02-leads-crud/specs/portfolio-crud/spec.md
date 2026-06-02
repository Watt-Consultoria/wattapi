## ADDED Requirements

### Requirement: Listagem de itens do portfólio

O sistema SHALL expor `GET /portfolio` retornando todos os itens do portfólio de serviços da empresa, acessível a qualquer usuário autenticado.

#### Scenario: Usuário autenticado lista o portfólio

- **WHEN** `GET /portfolio` com token válido
- **THEN** o sistema SHALL retornar HTTP 200 com array de `{ id, name, description, created_at }` ordenado por `name`

#### Scenario: Usuário não autenticado tenta listar

- **WHEN** `GET /portfolio` sem token
- **THEN** o sistema SHALL retornar HTTP 401

### Requirement: Criação de item de portfólio

O sistema SHALL expor `POST /portfolio` restrito a usuários com rank >= 2 (diretor e superusers). O campo `name` SHALL ser único.

#### Scenario: Diretor cria item com sucesso

- **WHEN** `POST /portfolio` com `{ name: "Consultoria Energética", description: "..." }` e caller com rank 2
- **THEN** o sistema SHALL retornar HTTP 201 com o item criado incluindo `id` e `created_at`

#### Scenario: Gerente tenta criar item

- **WHEN** `POST /portfolio` com caller com rank 1 (gerente)
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Nome duplicado

- **WHEN** `POST /portfolio` com `name` já existente
- **THEN** o sistema SHALL retornar HTTP 409

#### Scenario: Campo name ausente

- **WHEN** `POST /portfolio` sem o campo `name`
- **THEN** o sistema SHALL retornar HTTP 400

### Requirement: Atualização de item de portfólio

O sistema SHALL expor `PATCH /portfolio/:id` restrito a usuários com rank >= 2, aceitando `name` e/ou `description` como campos opcionais.

#### Scenario: Atualização parcial com sucesso

- **WHEN** `PATCH /portfolio/:id` com `{ description: "Nova descrição" }` e caller com rank >= 2
- **THEN** o sistema SHALL retornar HTTP 200 com o item atualizado

#### Scenario: Item não encontrado

- **WHEN** `PATCH /portfolio/:id` com UUID inexistente
- **THEN** o sistema SHALL retornar HTTP 404

#### Scenario: Atualização sem campos

- **WHEN** `PATCH /portfolio/:id` com body vazio `{}`
- **THEN** o sistema SHALL retornar HTTP 400

### Requirement: Exclusão de item de portfólio

O sistema SHALL expor `DELETE /portfolio/:id` restrito a usuários com rank >= 2. A exclusão SHALL ser permanente (hard delete). Leads existentes que referenciam o nome do item em `interest_items` não são afetados — o dado é histórico em `TEXT[]`.

#### Scenario: Exclusão com sucesso

- **WHEN** `DELETE /portfolio/:id` com UUID existente e caller com rank >= 2
- **THEN** o sistema SHALL retornar HTTP 204

#### Scenario: Item não encontrado

- **WHEN** `DELETE /portfolio/:id` com UUID inexistente
- **THEN** o sistema SHALL retornar HTTP 404
