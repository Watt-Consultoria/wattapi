# selection-process-applications Specification

## Purpose
TBD - created by archiving change selection-process-module. Update Purpose after archive.
## Requirements
### Requirement: Submeter candidatura pública
Qualquer usuário (sem autenticação) SHALL poder submeter uma candidatura ao processo seletivo atualmente ativo via `POST /selection-process/applications`. O sistema SHALL validar: existência de processo ativo, unicidade de email por processo, e existência dos três arquivos no Supabase Storage.

Campos obrigatórios: `name`, `course`, `period` (int > 0), `phone`, `email`, `instagram`, `how_heard`, `motivation`, `why_watt`, `shirt_size` (enum: P | M | G | GG | XG), `resume_path`, `transcript_path`, `photo_path`.

Os paths de arquivo SHALL seguir o formato `{uuid}/{tipo}.{ext}` onde tipo é `resume`, `transcript` ou `photo`.

#### Scenario: Submissão bem-sucedida
- **WHEN** candidato envia POST com todos os campos válidos, processo ativo existe, arquivos existem no Storage e email não foi usado nesse processo
- **THEN** sistema retorna 201 com `id` e `created_at` da candidatura

#### Scenario: Nenhum processo ativo
- **WHEN** não existe processo seletivo ativo no momento da submissão
- **THEN** sistema retorna 404 Not Found

#### Scenario: Email duplicado no mesmo processo
- **WHEN** candidato envia email já cadastrado no processo ativo
- **THEN** sistema retorna 409 Conflict

#### Scenario: Arquivo não encontrado no Storage
- **WHEN** um dos paths enviados não corresponde a um arquivo existente no bucket `selection-process-files`
- **THEN** sistema retorna 400 Bad Request indicando qual arquivo está ausente

#### Scenario: Campo obrigatório ausente
- **WHEN** body não contém um ou mais campos obrigatórios
- **THEN** sistema retorna 400 Bad Request com detalhes de validação Zod

#### Scenario: Period inválido
- **WHEN** `period` é zero ou negativo
- **THEN** sistema retorna 400 Bad Request

#### Scenario: Shirt size inválido
- **WHEN** `shirt_size` não é um dos valores: P, M, G, GG, XG
- **THEN** sistema retorna 400 Bad Request

### Requirement: Listar candidaturas
Qualquer usuário autenticado SHALL poder listar candidaturas via `GET /selection-process/applications`. Por padrão retorna todas as candidaturas de todos os processos. O endpoint SHALL aceitar o query param `selection_process_id` para filtrar por processo. A resposta SHALL incluir URLs assinadas (TTL 1h) para os três arquivos de cada candidatura.

#### Scenario: Listagem sem filtro retorna todas as candidaturas
- **WHEN** usuário autenticado com permissão envia `GET /selection-process/applications` sem query params
- **THEN** sistema retorna 200 com todas as candidaturas de todos os processos, cada uma com `resume_signed_url`, `transcript_signed_url` e `photo_signed_url`

#### Scenario: Listagem filtrada por processo
- **WHEN** usuário envia `GET /selection-process/applications?selection_process_id={id}`
- **THEN** sistema retorna 200 apenas com candidaturas do processo especificado

#### Scenario: Processo filtrado não encontrado
- **WHEN** `selection_process_id` não corresponde a nenhum processo existente
- **THEN** sistema retorna 404 Not Found

#### Scenario: Lista vazia
- **WHEN** não existem candidaturas (ou nenhuma para o filtro aplicado)
- **THEN** sistema retorna 200 com array vazio

### Requirement: Atualizar status de candidatura
Usuários autenticados com role `assessor` ou `presidente` SHALL poder atualizar o status de uma candidatura via `PATCH /selection-process/applications/:applicationId`. Valores válidos: `pending`, `approved`, `reproved`, `waitlisted`.

Ao atualizar para `approved`:
- O sistema SHALL verificar se existe etapa com `position = 1` para o processo seletivo da candidatura; se não existir, retorna 400 Bad Request
- O sistema SHALL criar um registro em `candidates` com snapshot dos campos `name`, `course`, `period`, `phone`, `email`, `shirt_size`, `selection_process_id` e `application_id`, com `current_stage_id` apontando para a etapa 1
- O sistema SHALL enviar email de aprovação ao candidato com o nome do processo seletivo e o nome da primeira etapa
- Se já existir candidato para esta candidatura, o sistema retorna 409 Conflict (aprovação duplicada)

Ao atualizar para `reproved`:
- O sistema SHALL enviar email de rejeição ao candidato

Para `pending` e `waitlisted`: comportamento de apenas atualizar o campo, sem side-effects.

#### Scenario: Status atualizado para approved com sucesso
- **WHEN** usuário autenticado com permissão envia PATCH com `status: "approved"`, processo tem etapa 1, e candidatura ainda não foi aprovada antes
- **THEN** sistema retorna 200 com a candidatura atualizada, candidato é criado na etapa 1 e email de aprovação é enviado

#### Scenario: Aprovação sem etapas cadastradas
- **WHEN** usuário tenta aprovar candidatura mas o processo seletivo não possui etapas
- **THEN** sistema retorna 400 Bad Request indicando que etapas devem ser criadas antes de aprovar candidaturas

#### Scenario: Aprovação duplicada
- **WHEN** usuário tenta aprovar candidatura que já gerou um candidato anteriormente
- **THEN** sistema retorna 409 Conflict

#### Scenario: Status atualizado para reproved com sucesso
- **WHEN** usuário envia PATCH com `status: "reproved"`
- **THEN** sistema retorna 200 com a candidatura atualizada e email de rejeição é enviado ao candidato

#### Scenario: Status atualizado para pending ou waitlisted
- **WHEN** usuário envia PATCH com `status: "pending"` ou `"waitlisted"`
- **THEN** sistema retorna 200 com a candidatura atualizada, sem criação de candidato e sem envio de email

#### Scenario: Status inválido
- **WHEN** `status` não é um dos valores permitidos
- **THEN** sistema retorna 400 Bad Request

#### Scenario: Candidatura não encontrada
- **WHEN** `:applicationId` não existe
- **THEN** sistema retorna 404 Not Found

