# selection-process-applications Delta Specification

## MODIFIED Requirements

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
