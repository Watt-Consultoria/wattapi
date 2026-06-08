# selection-process-candidates Specification

## ADDED Requirements

### Requirement: Listar candidatos
Usuários autenticados SHALL poder listar candidatos via `GET /selection-process/candidates`. O endpoint SHALL aceitar query params opcionais `selection_process_id` e `stage_id` para filtragem. A resposta SHALL incluir todos os campos do candidato incluindo `current_stage_id` e `status`.

#### Scenario: Listagem sem filtro retorna todos os candidatos
- **WHEN** usuário autenticado envia `GET /selection-process/candidates` sem query params
- **THEN** sistema retorna 200 com todos os candidatos de todos os processos ordenados por `created_at` DESC

#### Scenario: Listagem filtrada por processo
- **WHEN** usuário envia `GET /selection-process/candidates?selection_process_id={id}`
- **THEN** sistema retorna 200 apenas com candidatos do processo especificado

#### Scenario: Listagem filtrada por etapa
- **WHEN** usuário envia `GET /selection-process/candidates?stage_id={id}`
- **THEN** sistema retorna 200 apenas com candidatos que estão na etapa especificada

#### Scenario: Processo filtrado não encontrado
- **WHEN** `selection_process_id` não corresponde a nenhum processo existente
- **THEN** sistema retorna 404 Not Found

#### Scenario: Lista vazia
- **WHEN** não existem candidatos para o filtro aplicado
- **THEN** sistema retorna 200 com array vazio

### Requirement: Avançar ou eliminar candidato
Usuários autenticados com role `assessor` ou `presidente` SHALL poder aprovar ou reprovar um candidato via `PATCH /selection-process/candidates/:candidateId` com body `{ "status": "approved" | "reproved" }`.

Ao aprovar (`approved`):
- Se existir próxima etapa (position + 1): o candidato avança para ela e continua com status `active`; um email de avanço de etapa SHALL ser enviado ao candidato com o nome da etapa atual e da próxima
- Se não existir próxima etapa (última etapa): o candidato recebe status `approved` (aprovação final); um email de aprovação final SHALL ser enviado

Ao reprovar (`reproved`):
- O candidato recebe status `eliminated`; `current_stage_id` permanece como registro histórico
- Um email de eliminação SHALL ser enviado ao candidato com o nome da etapa em que foi reprovado

O endpoint SHALL retornar 409 Conflict se o candidato já tiver status `eliminated` ou `approved`.

#### Scenario: Aprovação com próxima etapa
- **WHEN** usuário aprova candidato que está em uma etapa não-final
- **THEN** sistema atualiza `current_stage_id` para a próxima etapa (position + 1), mantém status `active`, envia email de avanço e retorna 200 com candidato atualizado

#### Scenario: Aprovação na última etapa
- **WHEN** usuário aprova candidato que está na última etapa do processo (sem próxima)
- **THEN** sistema atualiza status para `approved`, mantém `current_stage_id` na última etapa, envia email de aprovação final e retorna 200

#### Scenario: Reprovação em etapa
- **WHEN** usuário reprova candidato com status `active`
- **THEN** sistema atualiza status para `eliminated`, envia email de eliminação com nome da etapa e retorna 200

#### Scenario: Candidato já finalizado
- **WHEN** candidato já tem status `eliminated` ou `approved` e recebe novo PATCH
- **THEN** sistema retorna 409 Conflict

#### Scenario: Candidato não encontrado
- **WHEN** `:candidateId` não existe
- **THEN** sistema retorna 404 Not Found

#### Scenario: Status inválido
- **WHEN** body contém `status` diferente de `approved` ou `reproved`
- **THEN** sistema retorna 400 Bad Request
