## ADDED Requirements

### Requirement: Criar ciclo
O sistema SHALL permitir que superusers criem um novo ciclo via `POST /gamification/cycles`. Só pode existir um ciclo ativo (sem `ended_at`) por vez.

#### Scenario: Criação bem-sucedida
- **WHEN** superuser faz `POST /gamification/cycles` com `{ "name": "1º Semestre 2026" }` e nenhum ciclo ativo existe
- **THEN** sistema cria o ciclo com `started_at = now()` e `ended_at = null` e retorna o ciclo criado

#### Scenario: Já existe ciclo ativo
- **WHEN** superuser faz `POST /gamification/cycles` e já existe um ciclo com `ended_at IS NULL`
- **THEN** sistema retorna `409 Conflict`

#### Scenario: Não-superuser tenta criar
- **WHEN** usuário sem role assessor/presidente faz `POST /gamification/cycles`
- **THEN** sistema retorna `403 Forbidden`

---

### Requirement: Encerrar ciclo
O sistema SHALL permitir que superusers encerrem o ciclo ativo via `PATCH /gamification/cycles/:id/close`. O encerramento é bloqueado se houver submissões pendentes.

#### Scenario: Encerramento bem-sucedido
- **WHEN** superuser faz `PATCH /gamification/cycles/:id/close` e não há submissões `pending`
- **THEN** sistema define `ended_at = now()` no ciclo e retorna o ciclo atualizado

#### Scenario: Submissões pendentes bloqueiam encerramento
- **WHEN** superuser faz `PATCH /gamification/cycles/:id/close` e existem submissões com `status = 'pending'`
- **THEN** sistema retorna `409 Conflict` com mensagem indicando submissões pendentes

#### Scenario: Ciclo já encerrado
- **WHEN** superuser tenta fechar um ciclo que já possui `ended_at` preenchido
- **THEN** sistema retorna `409 Conflict`

---

### Requirement: Consultar ciclo ativo
O sistema SHALL permitir que qualquer usuário autenticado consulte o ciclo ativo via `GET /gamification/cycles/active`.

#### Scenario: Ciclo ativo existe
- **WHEN** usuário autenticado faz `GET /gamification/cycles/active`
- **THEN** sistema retorna o ciclo com `ended_at = null`

#### Scenario: Nenhum ciclo ativo
- **WHEN** usuário autenticado faz `GET /gamification/cycles/active` e nenhum ciclo está aberto
- **THEN** sistema retorna `404 Not Found`

---

### Requirement: Listar todos os ciclos
O sistema SHALL permitir que qualquer usuário autenticado consulte o histórico de ciclos via `GET /gamification/cycles`.

#### Scenario: Listagem de ciclos
- **WHEN** usuário autenticado faz `GET /gamification/cycles`
- **THEN** sistema retorna todos os ciclos ordenados por `started_at DESC`
