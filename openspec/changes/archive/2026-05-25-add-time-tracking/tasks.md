## 1. Migration — criar tabela `time_entries`

- [x] 1.1 Criar migration `<timestamp>_create-time-entries-table.sql` em `src/database/supabase/migrations/` com a tabela `time_entries` e o índice parcial `one_open_session_per_user`

---

## 2. Estrutura do módulo

- [x] 2.1 Criar `src/modules/time-tracking/time-tracking.module.ts`
- [x] 2.2 Criar `src/modules/time-tracking/time-tracking.controller.ts`
- [x] 2.3 Criar `src/modules/time-tracking/time-tracking.service.ts`
- [x] 2.4 Criar `src/modules/time-tracking/dto/` com os tipos de request/response
- [x] 2.5 Registrar `TimeTrackingModule` em `src/app.module.ts`

---

## 3. TDD — escrever testes antes da implementação

- [x] 3.1 Criar `src/modules/time-tracking/time-tracking.service.spec.ts` com testes para:
  - `clockIn`: sucesso, 409 sessão aberta
  - `clockOut`: válida (≤ 8h), anulada (> 8h), 409 sem sessão aberta
  - `getSummary`: `current_session` nos três estados, filtragem de sessões válidas, cálculo de `total_minutes`
- [x] 3.2 Criar `src/modules/time-tracking/time-tracking.controller.spec.ts` com testes para:
  - Verificar que `POST /time-tracking/clock-in` retorna 201 no sucesso e 409 na duplicata
  - Verificar que `POST /time-tracking/clock-out` retorna 200 com `status: 'valid'` ou `status: 'annulled'` e 409 sem sessão
  - Verificar que `GET /time-tracking/summary` retorna 200 para o próprio usuário, 403 para outro sem permissão, 200 para superusuário
- [x] 3.3 Confirmar que todos os testes falham (RED) antes de implementar

---

## 4. Implementação — service

- [x] 4.1 Implementar `clockIn(userId: string)`:
  - Verificar sessão aberta (SELECT WHERE user_id AND clocked_out_at IS NULL)
  - Se existir: throw `ConflictException`
  - Inserir nova row e retornar `{ id, clocked_in_at }`
- [x] 4.2 Implementar `clockOut(userId: string)`:
  - Buscar sessão aberta
  - Se não existir: throw `ConflictException`
  - Calcular `duration_minutes = EXTRACT(EPOCH FROM now() - clocked_in_at) / 60`
  - Se `duration_minutes > 480`: `is_valid = FALSE, annulled_reason = 'exceeded_max_duration'`; senão: `is_valid = TRUE`
  - Atualizar row com `clocked_out_at = now()`, `is_valid`, `annulled_reason`, `updated_at`
  - Retornar response com `status: 'valid'` ou `status: 'annulled'`
- [x] 4.3 Implementar `getSummary(requesterId: string, targetUserId: string)`:
  - Calcular `week_start = date_trunc('week', now())` e `week_end = week_start + 7 days`
  - Query sessões válidas: `WHERE user_id = targetUserId AND is_valid = TRUE AND clocked_in_at >= week_start AND clocked_in_at < week_end`
  - Calcular `total_minutes` como soma das durações
  - Buscar sessão aberta e calcular estado de `current_session` (none / open / invalid) com base em `now() - clocked_in_at`
  - Retornar shape completo

---

## 5. Implementação — controller

- [x] 5.1 Implementar `POST /time-tracking/clock-in` com `@RoutePolicy({ access: { mode: 'authenticated' } })`
- [x] 5.2 Implementar `POST /time-tracking/clock-out` com `@RoutePolicy({ access: { mode: 'authenticated' } })`
- [x] 5.3 Implementar `GET /time-tracking/summary` com:
  - `@RoutePolicy({ access: { mode: 'authenticated' } })`
  - Leitura de `?user_id` do query param
  - Verificação: se `user_id` presente e diferente do próprio, checar rank >= 3; senão 403
  - Delegar ao service com o `targetUserId` correto

---

## 6. Verificação

- [x] 6.1 Rodar `npm test` — todos os testes novos devem passar (GREEN)
- [x] 6.2 Rodar `npm run lint` — sem erros nos arquivos modificados
- [x] 6.3 Testar manualmente os três endpoints via REST client:
  - Clock-in → clock-out dentro de 8h → summary mostra sessão válida
  - Clock-in → clock-out após simular 8h+ (ajustar `clocked_in_at` no banco) → response `annulled`
  - Summary com sessão aberta → verificar os três estados de `current_session`
  - Summary com `user_id` de outro usuário como não-superusuário → 403
  - Summary com `user_id` de outro usuário como superusuário → 200
