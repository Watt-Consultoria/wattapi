## 1. Database Migrations

- [x] 1.1 Criar migration `psel_interview_bookings`: `id`, `selection_process_id` (FK → selection_processes), `candidate_id` (FK → candidates, UNIQUE), `starts_at`, `ends_at`, `booked_at` (NOT NULL DEFAULT NOW()), `created_at`
- [x] 1.2 Criar migration `psel_interview_slots`: `id`, `selection_process_id` (FK → selection_processes), `consultant_id` (FK → users), `starts_at`, `ends_at`, `booking_id` (FK nullable → psel_interview_bookings), `created_at`, `UNIQUE(consultant_id, starts_at)`
- [x] 1.3 Criar migration `psel_interview_tokens`: `id`, `candidate_id` (FK → candidates), `token` (TEXT UNIQUE), `expires_at`, `created_at`

## 2. Email Templates

- [x] 2.1 Criar `InterviewBookingLinkEmail.ts` em `src/common/email/`: recebe `{ candidateName, bookingUrl }`, retorna subject e HTML com o link `FRONTEND_URL/psel/entrevistas/{token}`
- [x] 2.2 Criar `InterviewConfirmationEmail.ts` em `src/common/email/`: recebe `{ candidateName, interviewDate, interviewStartTime, interviewEndTime }` (datas/horas formatadas em BRT), retorna subject e HTML de confirmação de agendamento

## 3. DTOs e Validação

- [x] 3.1 Adicionar em `src/modules/selection-process/dto/selection-process.dto.ts`:
  - Schema Zod `createInterviewSlotsSchema`: `{ slots: z.array(z.string().datetime({ offset: true })).min(1) }`
  - Schema Zod `bookInterviewSlotSchema`: `{ starts_at: z.string().datetime({ offset: true }), token: z.string().min(1) }`
  - Schema Zod `sendInterviewLinksSchema`: `{ candidate_ids: z.array(z.string().regex(UUID_REGEX)).min(1) }`
  - Interfaces TypeScript: `InterviewSlotRow`, `InterviewBookingRow`, `InterviewTokenRow`
  - Interfaces de resposta: `InterviewSlotResponse` (para consultor — inclui booking status e candidate info), `AvailableTimeSlotResponse` (para GET público — apenas starts_at/ends_at), `InterviewBookingResponse`, `MySlotResponse`, `SendLinksResponse`

## 4. Testes (TDD — escrever antes da implementação, devem falhar)

Usar o skill `integration-test` para criar os arquivos de teste seguindo o padrão do projeto.

- [x] 4.1 Criar `src/test/selection-process/interviews/POST.spec.ts` com cenários:
  - `[201]` Usuário autenticado (qualquer role) cria lote de slots válidos
  - `[201]` Dois consultores diferentes criam slots no mesmo horário com sucesso
  - `[400]` Horário não é hora fechada (ex: 11:30 UTC)
  - `[400]` Hora BRT fora do intervalo (ex: 23:00 UTC = 20h BRT)
  - `[400]` `starts_at` no passado
  - `[400]` Array `slots` vazio
  - `[401]` Sem autenticação
  - `[404]` Nenhum processo seletivo ativo
  - Slot duplicado para mesmo consultor é ignorado (`ON CONFLICT DO NOTHING`), retorna apenas os criados

- [x] 4.2 Criar `src/test/selection-process/interviews/GET.spec.ts` com cenários:
  - `[200]` Retorna horários com ≥2 slots livres — sem consultant_id ou consultant_name
  - `[200]` Horário com apenas 1 slot livre não aparece na resposta
  - `[200]` Horário com 3 slots livres aparece (e continua aparecendo após 1 booking nele)
  - `[200]` Retorna `[]` quando todos os slots têm booking
  - `[200]` Retorna `[]` quando não há processo ativo
  - `[200]` Rota acessível sem autenticação

- [x] 4.3 Criar `src/test/selection-process/interviews/PATCH.spec.ts` com cenários:
  - `[200]` Candidato agenda com token válido e horário com ≥2 slots livres — retorna booking com starts_at/ends_at
  - `[200]` Com 3 consultores disponíveis, exatamente 2 ficam com booking_id; 1 permanece livre
  - `[400]` Body sem campo `token` ou sem `starts_at`
  - `[401]` Token inexistente
  - `[401]` Token expirado
  - `[409]` Candidato já tem entrevista agendada
  - `[409]` Horário com menos de 2 slots livres

- [x] 4.4 Criar `src/test/selection-process/interviews/slots/GET.spec.ts` com cenários:
  - `[200]` Consultor vê apenas seus próprios slots
  - `[200]` Assessor/presidente veem todos os slots de todos os consultores (inclui consultant_name)
  - `[200]` Slot com booking inclui candidate_name e candidate_email
  - `[200]` Slot sem booking retorna sem dados de candidato
  - `[401]` Sem autenticação

- [x] 4.5 Criar `src/test/selection-process/interviews/send-link/POST.spec.ts` com cenários:
  - `[200]` Admin envia links para múltiplos candidatos — token gerado com expires_at = processo.ends_at
  - `[400]` `candidate_ids` vazio
  - `[401]` Sem autenticação
  - `[403]` Role não autorizado (ex: consultor)
  - `[404]` Nenhum processo seletivo ativo
  - `[404]` candidate_id inexistente

## 5. Implementação do Service

- [x] 5.1 Implementar `createInterviewSlots(consultantId, dto)` em `SelectionProcessService`:
  - Buscar processo ativo (reusar `findActive()`)
  - Para cada `starts_at`: validar hora fechada BRT (minutos = 0, hora BRT entre 8 e 19, não no passado), computar `ends_at = starts_at + 1h`
  - INSERT com `ON CONFLICT (consultant_id, starts_at) DO NOTHING RETURNING *`
  - Retornar slots efetivamente criados como `InterviewSlotResponse[]`

- [x] 5.2 Implementar `findAvailableTimeSlots()` em `SelectionProcessService`:
  - Agrupar por `starts_at` com `HAVING COUNT(*) FILTER (WHERE booking_id IS NULL) >= 2`
  - Retornar `AvailableTimeSlotResponse[]` ordenado por `starts_at ASC`
  - Lista vazia se nenhum processo ativo

- [x] 5.3 Implementar `bookInterviewSlot(dto: { starts_at, token })` em `SelectionProcessService`:
  - Validar token em `psel_interview_tokens` (existe + `expires_at > NOW()`) → 401 se inválido
  - Verificar que candidato não tem booking existente em `psel_interview_bookings` → 409 se tem
  - Dentro de transaction:
    - `SELECT id FROM psel_interview_slots WHERE starts_at = $1 AND booking_id IS NULL FOR UPDATE`
    - Verificar count ≥ 2 → 409 "Slot is no longer available" se não
    - Sortear 2 via `ORDER BY RANDOM() LIMIT 2` sobre a lista bloqueada
    - `INSERT INTO psel_interview_bookings (...) RETURNING *`
    - `UPDATE psel_interview_slots SET booking_id = $1 WHERE id IN ($2, $3)`
  - Enviar `InterviewConfirmationEmail` ao candidato (best-effort, fora da transaction)
  - Retornar booking criado

- [x] 5.4 Implementar `getMySlots(userId, userRole)` em `SelectionProcessService`:
  - Se role é `assessor` ou `presidente`: SELECT todos os slots com JOIN em users (consultant_name) e LEFT JOIN em psel_interview_bookings e candidates (candidate_name, candidate_email)
  - Caso contrário: WHERE `consultant_id = userId`, sem consultant_name
  - Ordenar por `starts_at ASC`

- [x] 5.5 Implementar `sendInterviewLinks(dto)` em `SelectionProcessService`:
  - Buscar processo ativo → 404 se não existe
  - Para cada `candidate_id`: validar existência em `candidates` → 404 se não existe
  - Gerar token via `crypto.randomBytes(32).toString('hex')`
  - INSERT em `psel_interview_tokens` com `expires_at = processo.ends_at`
  - Enviar `InterviewBookingLinkEmail` com `bookingUrl = FRONTEND_URL/psel/entrevistas/{token}` (best-effort por candidato)
  - Retornar resultado por candidato (sucesso/falha)

## 6. Controller

- [x] 6.1 Adicionar ao `SelectionProcessController`:
  - `POST /interviews` → `createInterviewSlots(req.user.id, dto)` — `ANY_AUTH`
  - `GET /interviews` → `findAvailableTimeSlots()` — `{ mode: 'unauthenticated' }`
  - `GET /interviews/my-slots` → `getMySlots(req.user.id, req.user.role)` — `ANY_AUTH`
  - `PATCH /interviews` → `bookInterviewSlot(dto)` — `{ mode: 'unauthenticated' }`
  - `POST /interviews/send-link` → `sendInterviewLinks(dto)` — `ADMIN_ACCESS`
  - Atenção à ordem de declaração: rotas estáticas (`/my-slots`, `/send-link`) devem ser declaradas ANTES de rotas dinâmicas

## 7. Verificar que os testes da etapa 4 passam

- [x] 7.1 Executar `npm test` e confirmar que todos os testes dos 5 arquivos criados estão verdes

## 8. Documentação da API

- [x] 8.1 Adicionar em `API.md` a seção de entrevistas com as 5 rotas: `POST /selection-process/interviews`, `GET /selection-process/interviews`, `GET /selection-process/interviews/my-slots`, `PATCH /selection-process/interviews`, `POST /selection-process/interviews/send-link` — com exemplos de request/response, regras de auth e explicação do modelo de dupla de consultores

## 9. Finalização

- [x] 9.1 Verificar ausência de erros de lint nos arquivos modificados
- [x] 9.2 Executar `npm test` e confirmar que toda a suíte passa sem regressões
