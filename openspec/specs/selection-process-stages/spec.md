# selection-process-stages Specification

## Purpose
Gerencia as etapas de um processo seletivo. Etapas são ordenadas por `position` e representam as fases pelas quais os candidatos percorrem durante o processo seletivo.

## Requirements

### Requirement: Criar etapa de processo seletivo
Usuários autenticados com role `assessor` ou `presidente` SHALL poder criar etapas de um processo seletivo via `POST /selection-process/stages`. Campos obrigatórios: `selection_process_id` (UUID), `name` (texto), `position` (int > 0). A combinação `(selection_process_id, position)` SHALL ser única.

#### Scenario: Criação bem-sucedida
- **WHEN** usuário autenticado com permissão envia POST com `selection_process_id` válido, `name` e `position` únicos para o processo
- **THEN** sistema retorna 201 com `id`, `selection_process_id`, `name`, `position` e `created_at`

#### Scenario: Processo não encontrado
- **WHEN** `selection_process_id` não corresponde a nenhum processo existente
- **THEN** sistema retorna 404 Not Found

#### Scenario: Posição duplicada no mesmo processo
- **WHEN** já existe uma etapa com o mesmo `position` no processo informado
- **THEN** sistema retorna 409 Conflict

#### Scenario: Campo obrigatório ausente
- **WHEN** body não contém `selection_process_id`, `name` ou `position`
- **THEN** sistema retorna 400 Bad Request com detalhes de validação

#### Scenario: Position inválido
- **WHEN** `position` é zero ou negativo
- **THEN** sistema retorna 400 Bad Request

### Requirement: Listar etapas de um processo
Usuários autenticados SHALL poder listar etapas via `GET /selection-process/stages`. O endpoint SHALL aceitar o query param `selection_process_id` para filtrar por processo. A resposta SHALL ser ordenada por `position` ascendente.

#### Scenario: Listagem filtrada por processo
- **WHEN** usuário autenticado envia `GET /selection-process/stages?selection_process_id={id}`
- **THEN** sistema retorna 200 com todas as etapas do processo ordenadas por position

#### Scenario: Listagem sem filtro retorna todas as etapas
- **WHEN** usuário autenticado envia `GET /selection-process/stages` sem query params
- **THEN** sistema retorna 200 com todas as etapas de todos os processos, ordenadas por position

#### Scenario: Processo filtrado não encontrado
- **WHEN** `selection_process_id` não corresponde a nenhum processo existente
- **THEN** sistema retorna 404 Not Found

#### Scenario: Lista vazia
- **WHEN** não existem etapas para o filtro aplicado
- **THEN** sistema retorna 200 com array vazio
