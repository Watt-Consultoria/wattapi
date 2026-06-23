## 1. Database Migrations

- [x] 1.1 Criar migration `ALTER TABLE psel_interview_bookings ADD COLUMN meet_link TEXT`
- [x] 1.2 Criar migration `CREATE TABLE psel_interview_evaluations` com: `id`, `booking_id` (FK UNIQUE → psel_interview_bookings), `evaluator_id` (FK → users), 12 colunas `SMALLINT CHECK(1–5)` para qualidades desejadas, 6 colunas `BOOLEAN` para habilidades indesejadas, `observacoes TEXT`, `created_at TIMESTAMPTZ DEFAULT NOW()`

## 2. Email Template

- [x] 2.1 Criar `InterviewMeetLinkEmail.ts` em `src/common/email/`: recebe `{ candidateName, meetLink }`, retorna subject e HTML com o link do Google Meet destacado

## 3. DTOs e Validação

- [x] 3.1 Adicionar em `src/modules/selection-process/dto/selection-process.dto.ts`:
  - Schema Zod `sendMeetLinkSchema`: `{ booking_id: z.string().regex(UUID_REGEX), meet_link: z.string().regex(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/) }`
  - Schema Zod `createInterviewEvaluationSchema`: 12 campos `z.number().int().min(1).max(5)` (proatividade, lideranca, transparencia, uniao_de_time, comunicacao, seriedade, compromisso, proposito, autoresponsabilidade, autoconfianca, responsabilidade_social, criatividade), 6 campos `z.boolean()` (procrastinacao, desinteresse, falta_de_transparencia, proposito_vago, vitimizacao, falta_de_confianca), `observacoes: z.string().optional()`
  - Interface `InterviewEvaluationRow` com todos os campos da tabela
  - Interface `InterviewEvaluationResponse` (response pública)

## 4. Testes (TDD — escrever antes da implementação, devem falhar)

Usar o skill `integration-test` para criar os arquivos de teste seguindo o padrão do projeto.

- [x] 4.1 Criar `src/test/selection-process/interviews/meet-link/POST.spec.ts` com cenários:
  - `[200]` Consultor vinculado ao booking envia link válido do Google Meet — retorna booking com meet_link preenchido
  - `[400]` Link não segue o padrão `https://meet.google.com/xxx-xxxx-xxx`
  - `[400]` `booking_id` ausente ou inválido
  - `[401]` Sem autenticação
  - `[403]` Usuário autenticado não é consultor do booking
  - `[404]` `booking_id` inexistente
  - `[409]` Booking já possui meet_link preenchido

- [x] 4.2 Criar `src/test/selection-process/interviews/evaluation/POST.spec.ts` com cenários:
  - `[201]` Consultor vinculado envia avaliação completa com todos os 18 campos + observações — retorna avaliação criada
  - `[201]` Avaliação válida sem campo `observacoes` — `observacoes` é null na resposta
  - `[400]` Nota fora do intervalo (< 1 ou > 5) em qualquer qualidade desejada
  - `[400]` Campo obrigatório ausente (qualquer qualidade ou habilidade indesejada)
  - `[401]` Sem autenticação
  - `[403]` Usuário autenticado não é consultor do booking
  - `[404]` `bookingId` (path param) inexistente
  - `[409]` Booking já possui avaliação registrada

## 5. Implementação do Service

- [x] 5.1 Adicionar helper privado `assertConsultantLinked(bookingId: string, consultantId: string): Promise<void>` em `SelectionProcessService`:
  - `SELECT id FROM psel_interview_slots WHERE booking_id = $1 AND consultant_id = $2`
  - Lança `ForbiddenException` se nenhuma linha retorna

- [x] 5.2 Implementar `sendMeetLink(dto, consultantId)` em `SelectionProcessService`:
  - Buscar booking por `dto.booking_id` → 404 se não existe
  - Chamar `assertConsultantLinked(dto.booking_id, consultantId)` → 403 se não vinculado
  - Se `booking.meet_link` já preenchido → 409
  - `UPDATE psel_interview_bookings SET meet_link = $1 WHERE id = $2 RETURNING *`
  - Buscar candidato via `booking.candidate_id`, enviar `InterviewMeetLinkEmail` (best-effort)
  - Retornar `InterviewBookingResponse` com `meet_link` incluído

- [x] 5.3 Implementar `createInterviewEvaluation(bookingId, dto, evaluatorId)` em `SelectionProcessService`:
  - Buscar booking por `bookingId` → 404 se não existe
  - Chamar `assertConsultantLinked(bookingId, evaluatorId)` → 403 se não vinculado
  - Verificar existência em `psel_interview_evaluations WHERE booking_id = $1` → 409 se existe
  - `INSERT INTO psel_interview_evaluations (...) RETURNING *`
  - Retornar `InterviewEvaluationResponse`

## 6. Controller

- [x] 6.1 Adicionar ao `SelectionProcessController`:
  - `POST /interviews/meet-link` → `sendMeetLink(dto, req.jwtData.sub)` — `ANY_AUTH`
  - `POST /interviews/:bookingId/evaluation` → `createInterviewEvaluation(bookingId, dto, req.jwtData.sub)` — `ANY_AUTH`
  - Atenção à ordem de declaração: `POST /interviews/meet-link` deve ser declarado ANTES de `POST /interviews/:bookingId/evaluation` para evitar conflito de rota

## 7. Atualizar response de booking

- [x] 7.1 Incluir `meet_link` (nullable) na interface `InterviewBookingResponse` e no método `toInterviewBookingResponse()` do service

## 8. Verificar que os testes da etapa 4 passam

- [x] 8.1 Executar `npm test` e confirmar que todos os testes dos 2 arquivos criados estão verdes

## 9. Documentação da API

- [x] 9.1 Adicionar em `API.md` as 2 novas rotas: `POST /selection-process/interviews/meet-link` e `POST /selection-process/interviews/:bookingId/evaluation` — com exemplos de request/response, regras de auth (consultor vinculado ao booking), campos da avaliação e regex de validação do Google Meet

## 10. Finalização

- [x] 10.1 Verificar ausência de erros de lint nos arquivos modificados
- [x] 10.2 Executar `npm test` e confirmar que toda a suíte passa sem regressões
