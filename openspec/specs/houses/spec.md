## ADDED Requirements

### Requirement: Listar casas
O sistema SHALL retornar as 3 casas (Lumina, Voltus, Nexus) com a pontuação total de cada uma no ciclo ativo, se houver. Qualquer usuário autenticado pode consultar.

#### Scenario: Listagem com ciclo ativo
- **WHEN** usuário autenticado faz `GET /houses`
- **THEN** sistema retorna as 3 casas com `total_points` calculado das submissões aprovadas no ciclo ativo

#### Scenario: Listagem sem ciclo ativo
- **WHEN** usuário autenticado faz `GET /houses` e não há ciclo ativo
- **THEN** sistema retorna as 3 casas com `total_points: 0`

---

### Requirement: Atribuir membro a uma casa
O sistema SHALL permitir que superusers (assessor ou presidente) atribuam qualquer usuário a uma das 3 casas via `PATCH /users/:id/house`. Um usuário pode ser movido de casa a qualquer momento.

#### Scenario: Atribuição bem-sucedida
- **WHEN** superuser faz `PATCH /users/:id/house` com `{ "house_id": "<uuid>" }` válido
- **THEN** sistema atualiza `users.house_id` e retorna o usuário atualizado

#### Scenario: House inexistente
- **WHEN** superuser faz `PATCH /users/:id/house` com `house_id` que não existe
- **THEN** sistema retorna `404 Not Found`

#### Scenario: Usuário inexistente
- **WHEN** superuser faz `PATCH /users/:id/house` com `id` de usuário que não existe
- **THEN** sistema retorna `404 Not Found`

#### Scenario: Não-superuser tenta atribuir
- **WHEN** usuário com role `consultor`, `gerente` ou `diretor` faz `PATCH /users/:id/house`
- **THEN** sistema retorna `403 Forbidden`

---

### Requirement: Consultar membros de uma casa
O sistema SHALL permitir que qualquer usuário autenticado consulte os membros de uma casa específica via `GET /houses/:id/members`.

#### Scenario: Listagem de membros
- **WHEN** usuário autenticado faz `GET /houses/:id/members`
- **THEN** sistema retorna lista de usuários com `house_id` igual ao id informado

#### Scenario: Casa inexistente
- **WHEN** usuário autenticado faz `GET /houses/:id/members` com id inválido
- **THEN** sistema retorna `404 Not Found`
