## 1. Migrações SQL

- [x] 1.1 Criar migração `20260607000004_create-selection-process-stages-table.sql` com tabela `selection_process_stages` (id, selection_process_id FK, name, position, created_at; UNIQUE selection_process_id + position)
- [x] 1.2 Criar migração `20260607000005_create-candidates-table.sql` com tabela `candidates` (id, application_id UNIQUE FK, selection_process_id FK, current_stage_id FK, name, course, period, phone, email, shirt_size, status enum active|eliminated|approved DEFAULT active, created_at)

## 2. Templates de Email

- [x] 2.1 Criar `src/common/email/ApplicationApprovalEmail.ts` — "Parabéns! Você foi aprovado(a) no processo seletivo {processTitle}. Sua primeira etapa é: {stageName}. Fique atento ao seu email, mais informações chegam em breve."
- [x] 2.2 Criar `src/common/email/ApplicationRejectionEmail.ts` — "Infelizmente sua candidatura para {processTitle} não foi aprovada desta vez. Obrigado pela participação."
- [x] 2.3 Criar `src/common/email/CandidateStageAdvancedEmail.ts` — "Parabéns! Você foi aprovado(a) na etapa {currentStageName}. Sua próxima etapa é: {nextStageName}. Fique atento ao seu email."
- [x] 2.4 Criar `src/common/email/CandidateFinalApprovalEmail.ts` — "Parabéns! Você foi aprovado(a) em todas as etapas do processo seletivo {processTitle}. Em breve entraremos em contato com os próximos passos."
- [x] 2.5 Criar `src/common/email/CandidateEliminatedEmail.ts` — "Infelizmente você não foi aprovado(a) na etapa {stageName} do processo seletivo {processTitle}. Obrigado pela participação."

## 3. DTOs e Schemas Zod

- [x] 3.1 Adicionar em `src/modules/selection-process/dto/selection-process.dto.ts`:
  - `CreateStageDto` + `createStageSchema` (selection_process_id uuid, name string, position int > 0)
  - `StageRow` (tipos do banco: id, selection_process_id, name, position, created_at Date)
  - `StageResponse` (tipos da API: todos os campos como string/number)
  - `UpdateCandidateStatusDto` + `updateCandidateStatusSchema` (status: "approved" | "reproved")
  - `CandidateRow` (tipos do banco: id, application_id, selection_process_id, current_stage_id, name, course, period, phone, email, shirt_size, status, created_at Date)
  - `CandidateResponse` (tipos da API)

## 4. Testes de Integração (escrever antes da implementação — TDD)

- [x] 4.1 Criar `src/test/selection-process/stages/POST.spec.ts` seguindo o padrão do skill `integration-test`:
  - 201 criação bem-sucedida
  - 404 processo não encontrado
  - 409 posição duplicada
  - 400 campo obrigatório ausente
  - 400 position inválido (≤ 0)
  - 401 sem autenticação
  - 403 role sem permissão
- [x] 4.2 Criar `src/test/selection-process/stages/GET.spec.ts`:
  - 200 listagem sem filtro
  - 200 listagem filtrada por processo (ordenada por position)
  - 404 processo filtrado não encontrado
  - 200 lista vazia
  - 401 sem autenticação
- [x] 4.3 Criar `src/test/selection-process/candidates/GET.spec.ts`:
  - 200 listagem sem filtro
  - 200 filtrado por selection_process_id
  - 200 filtrado por stage_id
  - 404 processo filtrado não encontrado
  - 200 lista vazia
  - 401 sem autenticação
- [x] 4.4 Criar `src/test/selection-process/candidates/PATCH.spec.ts`:
  - 200 aprovação com próxima etapa (verifica current_stage_id atualizado)
  - 200 aprovação na última etapa (verifica status = 'approved')
  - 200 reprovação (verifica status = 'eliminated')
  - 409 candidato já finalizado (approved ou eliminated)
  - 404 candidato não encontrado
  - 400 status inválido
  - 401 sem autenticação
  - 403 role sem permissão
- [x] 4.5 Atualizar `src/test/selection-process/applications/PATCH.spec.ts` (ou criar se não existir):
  - 200 approved → candidato criado na etapa 1 e email enviado
  - 400 approved → sem etapas cadastradas no processo
  - 409 approved → candidato já existe (aprovação duplicada)
  - 200 reproved → email de rejeição enviado (sem criação de candidato)
  - 200 pending/waitlisted → sem side-effects

## 5. Implementação — Stages

- [x] 5.1 Adicionar `createStage(dto: CreateStageDto): Promise<StageResponse>` no `SelectionProcessService`:
  - Verificar existência do processo (404 se não encontrado)
  - INSERT em `selection_process_stages`
  - Tratar erro de unicidade (code 23505) → 409
- [x] 5.2 Adicionar `findStages(selectionProcessId?: string): Promise<StageResponse[]>` no service:
  - Se `selectionProcessId` fornecido: validar existência do processo (404)
  - SELECT com ORDER BY position ASC
- [x] 5.3 Adicionar endpoints no `SelectionProcessController`:
  - `POST /selection-process/stages` com acesso ADMIN_ACCESS
  - `GET /selection-process/stages` com acesso ANY_AUTH

## 6. Implementação — Side-effects em Applications

- [x] 6.1 Modificar `updateApplicationStatus` no service:
  - Se `status === 'approved'`: buscar etapa position=1 do processo (400 se inexistente), criar candidato com snapshot dos dados da application, enviar `ApplicationApprovalEmail`; tratar code 23505 no INSERT de candidates → 409
  - Se `status === 'reproved'`: enviar `ApplicationRejectionEmail`
  - Manter emails em bloco try/catch separado (não reverter operação principal)

## 7. Implementação — Candidates

- [x] 7.1 Adicionar `findCandidates(filters: { selectionProcessId?: string; stageId?: string }): Promise<CandidateResponse[]>` no service
- [x] 7.2 Adicionar `updateCandidateStatus(candidateId: string, dto: UpdateCandidateStatusDto): Promise<CandidateResponse>` no service:
  - Buscar candidato por id (404 se não encontrado)
  - Verificar status atual; se `eliminated` ou `approved` → 409
  - Se `approved`: buscar próxima etapa (position + 1) no mesmo processo
    - Se existe: UPDATE current_stage_id, enviar `CandidateStageAdvancedEmail`
    - Se não existe: UPDATE status = 'approved', enviar `CandidateFinalApprovalEmail`
  - Se `reproved`: UPDATE status = 'eliminated', enviar `CandidateEliminatedEmail`
- [x] 7.3 Adicionar endpoints no controller:
  - `GET /selection-process/candidates` com acesso ANY_AUTH
  - `PATCH /selection-process/candidates/:candidateId` com acesso ADMIN_ACCESS

## 8. Documentação da API

- [x] 8.1 Atualizar `API.md` com os 4 novos endpoints: POST e GET /selection-process/stages, GET /selection-process/candidates, PATCH /selection-process/candidates/:id

## 9. Verificação Final

- [x] 9.1 Executar `npm test` e garantir que todos os testes passam
- [x] 9.2 Verificar ausência de erros de lint com `rtk lint` nos arquivos modificados
