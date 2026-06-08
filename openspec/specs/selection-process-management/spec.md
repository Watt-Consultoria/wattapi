# selection-process-management Specification

## Purpose
TBD - created by archiving change selection-process-module. Update Purpose after archive.
## Requirements
### Requirement: Criar processo seletivo
Usuários autenticados com role `assessor` ou `presidente` SHALL poder criar um processo seletivo informando título, `starts_at` e `ends_at`. O backend SHALL rejeitar a criação se o range sobrepõe um processo já existente.

#### Scenario: Criação bem-sucedida
- **WHEN** usuário autenticado com permissão envia `POST /selection-process` com `title`, `starts_at` e `ends_at` válidos e sem sobreposição
- **THEN** sistema retorna 201 com o processo criado

#### Scenario: Range sobreposto rejeitado
- **WHEN** usuário envia `POST /selection-process` com range que sobrepõe um processo existente
- **THEN** sistema retorna 409 Conflict

#### Scenario: Datas inválidas rejeitadas
- **WHEN** `ends_at` é anterior ou igual a `starts_at`
- **THEN** sistema retorna 400 Bad Request

#### Scenario: Usuário sem permissão
- **WHEN** usuário com role insuficiente tenta criar um processo
- **THEN** sistema retorna 403 Forbidden

### Requirement: Listar processos seletivos
Usuários autenticados SHALL poder listar todos os processos seletivos em ordem decrescente de `starts_at`.

#### Scenario: Listagem retorna todos os processos
- **WHEN** usuário autenticado envia `GET /selection-process`
- **THEN** sistema retorna 200 com array de processos ordenados por `starts_at DESC`

#### Scenario: Lista vazia
- **WHEN** nenhum processo existe
- **THEN** sistema retorna 200 com array vazio

