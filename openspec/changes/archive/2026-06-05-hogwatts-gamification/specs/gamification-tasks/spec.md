## ADDED Requirements

### Requirement: Criar tarefa
O sistema SHALL permitir que superusers criem tarefas via `POST /gamification/tasks` com título, descrição e valor em pontos.

#### Scenario: Criação bem-sucedida
- **WHEN** superuser faz `POST /gamification/tasks` com `{ "title": "...", "description": "...", "points": 50 }`
- **THEN** sistema cria a tarefa com `is_active = true` e retorna a tarefa criada

#### Scenario: Pontos inválidos
- **WHEN** superuser faz `POST /gamification/tasks` com `points <= 0`
- **THEN** sistema retorna `400 Bad Request`

#### Scenario: Não-superuser tenta criar
- **WHEN** usuário sem role assessor/presidente faz `POST /gamification/tasks`
- **THEN** sistema retorna `403 Forbidden`

---

### Requirement: Editar tarefa
O sistema SHALL permitir que superusers editem título, descrição, pontos e status ativo/inativo de uma tarefa via `PATCH /gamification/tasks/:id`.

#### Scenario: Edição bem-sucedida
- **WHEN** superuser faz `PATCH /gamification/tasks/:id` com campos parciais válidos
- **THEN** sistema atualiza apenas os campos enviados e retorna a tarefa atualizada

#### Scenario: Tarefa inexistente
- **WHEN** superuser faz `PATCH /gamification/tasks/:id` com id inválido
- **THEN** sistema retorna `404 Not Found`

---

### Requirement: Listar tarefas
O sistema SHALL permitir que qualquer usuário autenticado liste as tarefas via `GET /gamification/tasks`. Por padrão retorna apenas tarefas ativas; superusers podem filtrar com `?include_inactive=true`.

#### Scenario: Listagem padrão (usuário comum)
- **WHEN** usuário autenticado faz `GET /gamification/tasks`
- **THEN** sistema retorna apenas tarefas com `is_active = true`

#### Scenario: Listagem com inativas (superuser)
- **WHEN** superuser faz `GET /gamification/tasks?include_inactive=true`
- **THEN** sistema retorna todas as tarefas independente de `is_active`

#### Scenario: Usuário comum tenta incluir inativas
- **WHEN** usuário comum faz `GET /gamification/tasks?include_inactive=true`
- **THEN** sistema retorna apenas tarefas ativas (parâmetro ignorado silenciosamente)
