## ADDED Requirements

### Requirement: Submeter comprovante de tarefa
O sistema SHALL permitir que qualquer usuário autenticado submeta um comprovante de conclusão de tarefa via `POST /gamification/submissions`. O arquivo deve ter sido previamente enviado ao Supabase Storage bucket `gamification-proofs`.

#### Scenario: Submissão bem-sucedida
- **WHEN** usuário autenticado faz `POST /gamification/submissions` com `task_id`, `description` e `file_path` válidos, e o arquivo existe no Storage
- **THEN** sistema cria a submissão com `status = 'pending'`, snapshot de `house_id` e `cycle_id` do ciclo ativo, e retorna a submissão criada

#### Scenario: Usuário sem casa atribuída
- **WHEN** usuário com `house_id = null` tenta submeter
- **THEN** sistema retorna `400 Bad Request` com mensagem indicando que o usuário não está atribuído a uma casa

#### Scenario: Nenhum ciclo ativo
- **WHEN** usuário tenta submeter e não há ciclo com `ended_at IS NULL`
- **THEN** sistema retorna `400 Bad Request` com mensagem indicando ausência de ciclo ativo

#### Scenario: Tarefa inativa
- **WHEN** usuário tenta submeter uma tarefa com `is_active = false`
- **THEN** sistema retorna `400 Bad Request`

#### Scenario: Arquivo não encontrado no Storage
- **WHEN** usuário envia `file_path` que não existe no bucket `gamification-proofs`
- **THEN** sistema retorna `400 Bad Request`

#### Scenario: Mesma tarefa submetida múltiplas vezes
- **WHEN** usuário submete a mesma `task_id` mais de uma vez
- **THEN** sistema aceita cada submissão independentemente (sem restrição de unicidade)

---

### Requirement: Listar submissões
O sistema SHALL permitir que usuários autenticados consultem submissões via `GET /gamification/submissions`. Usuários comuns veem apenas as próprias; superusers podem filtrar por status e ver todas.

#### Scenario: Usuário comum consulta as próprias submissões
- **WHEN** usuário comum faz `GET /gamification/submissions`
- **THEN** sistema retorna apenas submissões com `user_id` igual ao do caller, com signed URL do comprovante

#### Scenario: Superuser consulta todas as submissões pendentes
- **WHEN** superuser faz `GET /gamification/submissions?status=pending`
- **THEN** sistema retorna todas as submissões com `status = 'pending'`, com signed URL do comprovante

#### Scenario: Superuser consulta submissões de um usuário específico
- **WHEN** superuser faz `GET /gamification/submissions?user_id=<uuid>`
- **THEN** sistema retorna submissões filtradas pelo usuário especificado

---

### Requirement: Revisar submissão
O sistema SHALL permitir que superusers aprovem ou rejeitem uma submissão pendente via `PATCH /gamification/submissions/:id/review`.

#### Scenario: Aprovação bem-sucedida
- **WHEN** superuser faz `PATCH /gamification/submissions/:id/review` com `{ "status": "approved" }`
- **THEN** sistema atualiza `status = 'approved'`, define `reviewed_by` e `reviewed_at`, e retorna a submissão atualizada

#### Scenario: Rejeição com motivo
- **WHEN** superuser faz `PATCH /gamification/submissions/:id/review` com `{ "status": "rejected", "rejection_reason": "Comprovante ilegível" }`
- **THEN** sistema atualiza `status = 'rejected'`, salva `rejection_reason`, e retorna a submissão atualizada

#### Scenario: Submissão já revisada
- **WHEN** superuser tenta revisar uma submissão com `status != 'pending'`
- **THEN** sistema retorna `409 Conflict`

#### Scenario: Não-superuser tenta revisar
- **WHEN** usuário comum faz `PATCH /gamification/submissions/:id/review`
- **THEN** sistema retorna `403 Forbidden`

#### Scenario: Submissão inexistente
- **WHEN** superuser faz `PATCH /gamification/submissions/:id/review` com id inválido
- **THEN** sistema retorna `404 Not Found`
